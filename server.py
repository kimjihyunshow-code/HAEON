#!/usr/bin/env python3
"""HAEON local membership server. Python 3.10+; no third-party packages.
Start: python server.py serve   |   Admin: python server.py create-admin
Shopping remains a non-paying UI demonstration, not an e-commerce backend.
"""
import argparse
import base64
from collections import defaultdict, deque
from datetime import datetime, timezone
import getpass
import hashlib
import hmac
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import mimetypes
import os
from pathlib import Path
import re
import secrets
import sqlite3
from threading import Lock
import time
from urllib.parse import urlsplit, unquote, parse_qs

HERE = Path(__file__).resolve().parent
WEBROOT = HERE / 'haeon'
DB = Path(os.environ.get('HAEON_DB_PATH', HERE / 'data' / 'members.sqlite3')).resolve()
PORT = int(os.environ.get('HAEON_PORT', '8000'))
COOKIE_SECURE = os.environ.get('HAEON_COOKIE_SECURE', '').lower() in ('true', '1', 'yes')
SESSION_AGE = 48 * 60 * 60
TERMS_VERSION = '2026-10-draft'
EMAIL_RE = re.compile(r'^[^\s@]{1,64}@[^\s@]{1,200}\.[^\s@]{2,}$')
RATELIMIT = defaultdict(deque)
RATE_LOCK = Lock()


def db_connect():
    conn = sqlite3.connect(DB, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA busy_timeout = 10000')
    conn.execute('PRAGMA foreign_keys = ON')
    return conn


def init_db():
    DB.parent.mkdir(parents=True, exist_ok=True)
    # Private by default on POSIX. Keep the data directory outside the public site.
    if os.name == 'posix':
        try: os.chmod(DB.parent, 0o700)
        except OSError: pass
    with db_connect() as conn:
        conn.executescript('''
        PRAGMA journal_mode=WAL;
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('member','admin')),
          active INTEGER NOT NULL DEFAULT 1,
          adult_self_confirmed INTEGER NOT NULL DEFAULT 0,
          terms_version TEXT NOT NULL,
          privacy_acknowledged INTEGER NOT NULL DEFAULT 0,
          marketing_consent INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sessions (
          token_hash TEXT PRIMARY KEY,
          csrf TEXT NOT NULL,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          expires_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
        CREATE INDEX IF NOT EXISTS users_created_idx ON users(id DESC);
        ''')
    if os.name == 'posix' and DB.exists():
        try: os.chmod(DB, 0o600)
        except OSError: pass


def utcstamp():
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def new_password_hash(pw):
    salt = secrets.token_bytes(16)
    hashed = hashlib.scrypt(pw.encode('utf-8'), salt=salt, n=2**14, r=8, p=1, dklen=32)
    return 'scrypt$16384$8$1$' + base64.urlsafe_b64encode(salt).decode() + '$' + base64.urlsafe_b64encode(hashed).decode()


def verify_password(pw, stored):
    try:
        algorithm, n, r, p, salt, expected = stored.split('$')
        if algorithm != 'scrypt': return False
        actual = hashlib.scrypt(pw.encode('utf-8'), salt=base64.urlsafe_b64decode(salt), n=int(n), r=int(r), p=int(p), dklen=32)
        return hmac.compare_digest(actual, base64.urlsafe_b64decode(expected))
    except (ValueError, TypeError, UnicodeError):
        return False


def issue_session(conn, user_id=None):
    token = secrets.token_urlsafe(32)
    csrf = secrets.token_urlsafe(32)
    conn.execute('INSERT INTO sessions(token_hash, csrf, user_id, expires_at) VALUES(?,?,?,?)',
                 (hashlib.sha256(token.encode()).hexdigest(), csrf, user_id, int(time.time()) + SESSION_AGE))
    return token, csrf


def acceptable_email(email):
    if not isinstance(email, str): return None
    email = email.strip().lower()
    return email if EMAIL_RE.fullmatch(email) and len(email) <= 254 else None


def rate_ok(key, max_attempts, seconds):
    now = time.monotonic()
    with RATE_LOCK:
        q = RATELIMIT[key]
        while q and q[0] <= now - seconds: q.popleft()
        if len(q) >= max_attempts: return False
        q.append(now)
        return True


def public_user(user):
    if not user: return None
    return {'id': user['id'], 'email': user['email'], 'name': user['name'], 'role': user['role']}


class Handler(BaseHTTPRequestHandler):
    server_version = 'HAEON/1.0'

    def log_message(self, fmt, *args):
        # Do not log bodies, cookie headers, or untrusted input.
        print('%s - [%s] %s' % (self.client_address[0], self.log_date_time_string(), fmt % args))

    def json_response(self, status, data, cookie=None):
        content = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(content)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('Referrer-Policy', 'same-origin')
        if cookie is not None:
            item = 'haeon_sid=' + cookie + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + str(SESSION_AGE if cookie else 0)
            if COOKIE_SECURE: item += '; Secure'
            self.send_header('Set-Cookie', item)
        self.end_headers()
        self.wfile.write(content)

    def fail(self, status, reason):
        self.json_response(status, {'ok':False, 'error':reason})

    def existing_session(self, conn):
        try:
            cookies = SimpleCookie()
            cookies.load(self.headers.get('Cookie', ''))
            token = cookies['haeon_sid'].value
            if not token or len(token) > 128:return None
        except (KeyError, ValueError): return None
        key = hashlib.sha256(token.encode()).hexdigest()
        session = conn.execute('SELECT s.*, u.email, u.name, u.role, u.active FROM sessions s LEFT JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?', (key, int(time.time()))).fetchone()
        if session and session['user_id'] is not None and session['active'] != 1: return None
        return session

    def session_data(self, conn):
        session = self.existing_session(conn)
        if session: return session, None
        token, csrf = issue_session(conn)
        conn.commit()
        session = self.existing_new_session(conn, token)
        return session, token

    def existing_new_session(self, conn, token):
        return conn.execute('SELECT * FROM sessions WHERE token_hash=?', (hashlib.sha256(token.encode()).hexdigest(),)).fetchone()

    def read_json(self):
        if self.headers.get('Content-Type', '').split(';')[0].strip().lower() != 'application/json': raise ValueError('JSON 요청만 허용합니다.')
        try: length = int(self.headers.get('Content-Length','0'))
        except ValueError: raise ValueError('요청 본문이 올바르지 않습니다.')
        if length < 1 or length > 8192: raise ValueError('요청 크기를 확인해 주세요.')
        try: data = json.loads(self.rfile.read(length))
        except (ValueError, UnicodeError): raise ValueError('요청 형식이 올바르지 않습니다.')
        if not isinstance(data, dict): raise ValueError('요청 객체가 필요합니다.')
        return data

    def csrf_valid(self, session):
        if session is None: return False
        provided = self.headers.get('X-CSRF-Token', '')
        if not isinstance(provided, str) or not hmac.compare_digest(provided, session['csrf']):return False
        origin = self.headers.get('Origin')
        if origin:
            host=self.headers.get('Host','')
            valid={f'http://{host}',f'https://{host}'}
            if origin not in valid:return False
        return True

    def do_GET(self):
        parsed = urlsplit(self.path)
        path = parsed.path
        if path.startswith('/api/'):
            try: return self.api_get(path, parse_qs(parsed.query))
            except (sqlite3.DatabaseError, OSError): return self.fail(500, '서버 오류가 발생했습니다.')
        return self.static_file(path)

    def api_get(self, path, params):
        with db_connect() as conn:
            if path == '/api/session':
                session, new_token = self.session_data(conn)
                user=None
                if session['user_id'] is not None:
                    user=conn.execute('SELECT * FROM users WHERE id=? AND active=1',(session['user_id'],)).fetchone()
                return self.json_response(200,{'ok':True,'csrf':session['csrf'],'user':public_user(user)},new_token)
            session=self.existing_session(conn)
            if path == '/api/admin/users':
                if not session or session['role'] != 'admin' or session['active'] != 1: return self.fail(403,'관리자 권한이 필요합니다.')
                query=params.get('q',[''])[0].strip()[:64]
                try: page=max(1,min(10000,int(params.get('page',['1'])[0])))
                except ValueError:page=1
                like='%' + query.replace('\\','\\\\').replace('%','\\%').replace('_','\\_')+'%'
                count=conn.execute("SELECT COUNT(*) FROM users WHERE (name LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\')", (like,like)).fetchone()[0]
                rows=conn.execute("SELECT id,name,email,role,active,adult_self_confirmed,terms_version,privacy_acknowledged,marketing_consent,created_at FROM users WHERE (name LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\') ORDER BY id DESC LIMIT 20 OFFSET ?", (like,like,(page-1)*20)).fetchall()
                return self.json_response(200,{'ok':True,'page':page,'total':count,'pageSize':20,'users':[dict(r) for r in rows]})
        return self.fail(404,'요청한 API가 없습니다.')

    def do_POST(self):
        path=urlsplit(self.path).path
        if path not in ('/api/register','/api/login','/api/logout','/api/admin/set-active'):return self.fail(404,'요청한 API가 없습니다.')
        try:
            data=self.read_json()
            with db_connect() as conn:
                session=self.existing_session(conn)
                if not self.csrf_valid(session):return self.fail(403,'보안 토큰이 유효하지 않습니다. 페이지를 새로고침하세요.')
                if path == '/api/register':return self.register(conn,session,data)
                if path == '/api/login':return self.login(conn,session,data)
                if path == '/api/logout':return self.logout(conn,session)
                if path == '/api/admin/set-active':return self.admin_update(conn,session,data)
        except ValueError as exc:return self.fail(400,str(exc))
        except sqlite3.DatabaseError:return self.fail(500,'데이터베이스 처리에 실패했습니다.')

    def replace_session(self, conn, old_session, user_id):
        conn.execute('DELETE FROM sessions WHERE token_hash=?', (old_session['token_hash'],))
        token,csrf=issue_session(conn,user_id)
        conn.commit()
        return token,csrf

    def register(self,conn,session,data):
        if session['user_id']:return self.fail(409,'이미 로그인되어 있습니다.')
        if not rate_ok(('signup',self.client_address[0]), 5, 3600):return self.fail(429,'가입 시도가 너무 많습니다. 잠시 후 다시 시도하세요.')
        name=data.get('name','')
        email=acceptable_email(data.get('email'))
        password=data.get('password')
        if not isinstance(name,str) or not (2<=len(name.strip())<=50):return self.fail(400,'이름은 2~50자로 입력해 주세요.')
        if not email:return self.fail(400,'이메일 형식을 확인해 주세요.')
        if not isinstance(password,str) or not 10 <= len(password) <= 128:return self.fail(400,'비밀번호는 10~128자로 입력해 주세요.')
        if data.get('adult') is not True or data.get('terms') is not True or data.get('privacy') is not True:return self.fail(400,'필수 확인 및 동의 항목을 확인해 주세요.')
        try:
            now=utcstamp()
            cursor=conn.execute('INSERT INTO users(email,name,password_hash,adult_self_confirmed,terms_version,privacy_acknowledged,marketing_consent,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)',
                (email,name.strip(),new_password_hash(password),1,TERMS_VERSION,1,int(data.get('marketing') is True),now,now))
            token, csrf=self.replace_session(conn,session,cursor.lastrowid)
        except sqlite3.IntegrityError:return self.fail(409,'이미 가입된 이메일입니다.')
        return self.json_response(201,{'ok':True,'csrf':csrf,'user':{'id':cursor.lastrowid,'name':name.strip(),'email':email,'role':'member'}},token)

    def login(self,conn,session,data):
        if not rate_ok(('login-ip',self.client_address[0]), 18, 600):return self.fail(429,'로그인 시도가 너무 많습니다. 잠시 후 다시 시도하세요.')
        email=acceptable_email(data.get('email'))
        password=data.get('password')
        if not email or not isinstance(password,str) or len(password)>128:return self.fail(401,'이메일 또는 비밀번호를 확인해 주세요.')
        if not rate_ok(('login-email',email), 12, 600):return self.fail(429,'로그인 시도가 너무 많습니다. 잠시 후 다시 시도하세요.')
        row=conn.execute('SELECT * FROM users WHERE email=?',(email,)).fetchone()
        if row is None or not verify_password(password,row['password_hash']):return self.fail(401,'이메일 또는 비밀번호를 확인해 주세요.')
        if row['active'] != 1:return self.fail(403,'사용할 수 없는 계정입니다. 관리자에게 문의하세요.')
        token,csrf=self.replace_session(conn,session,row['id'])
        return self.json_response(200,{'ok':True,'csrf':csrf,'user':public_user(row)},token)

    def logout(self,conn,session):
        conn.execute('DELETE FROM sessions WHERE token_hash=?',(session['token_hash'],))
        token,csrf=issue_session(conn)
        conn.commit()
        return self.json_response(200,{'ok':True,'csrf':csrf,'user':None},token)

    def admin_update(self,conn,session,data):
        if session['role'] != 'admin' or session['active'] != 1:return self.fail(403,'관리자 권한이 필요합니다.')
        user_id=data.get('userId'); active=data.get('active')
        if type(user_id) is not int or type(active) is not bool:return self.fail(400,'회원 ID와 상태값을 확인해 주세요.')
        if user_id == session['user_id']:return self.fail(400,'본인 계정의 상태는 변경할 수 없습니다.')
        row=conn.execute('SELECT role FROM users WHERE id=?',(user_id,)).fetchone()
        if not row:return self.fail(404,'회원이 존재하지 않습니다.')
        if row['role'] != 'member':return self.fail(403,'관리자 계정은 변경할 수 없습니다.')
        conn.execute('UPDATE users SET active=?, updated_at=? WHERE id=?',(int(active),utcstamp(),user_id))
        if not active:conn.execute('DELETE FROM sessions WHERE user_id=?',(user_id,))
        conn.commit()
        return self.json_response(200,{'ok':True})

    def static_file(self, path):
        # Serve only static files inside the bundled 'haeon' directory.
        try:
            name=unquote(path).lstrip('/') or 'index.html'
            if name.endswith('/'):name+='index.html'
            target=(WEBROOT/name).resolve()
            if not target.is_relative_to(WEBROOT.resolve()) or not target.is_file():return self.send_error(404)
            if target.suffix.lower() not in ('.html','.css','.js','.json','.png','.jpg','.jpeg','.webp','.svg','.gif','.ico','.mp4','.woff','.woff2','.txt'):
                return self.send_error(404)
            mime=mimetypes.guess_type(target.name)[0] or 'application/octet-stream'
            self.send_response(200)
            if target.suffix.lower() in ('.html','.css','.js','.svg','.txt'):mime+='; charset=utf-8'
            self.send_header('Content-Type',mime)
            self.send_header('Content-Length',str(target.stat().st_size))
            self.send_header('X-Content-Type-Options','nosniff')
            self.send_header('Referrer-Policy','strict-origin-when-cross-origin')
            self.send_header('X-Frame-Options','DENY')
            self.send_header('Cache-Control','no-store' if target.suffix=='.html' else 'public, max-age=3600')
            self.end_headers()
            with target.open('rb') as f:
                while block:=f.read(256*1024):self.wfile.write(block)
        except (OSError,UnicodeError):return self.send_error(404)


def create_admin():
    init_db()
    name=input('관리자 이름: ').strip()
    email=acceptable_email(input('관리자 이메일: '))
    pw=getpass.getpass('관리자 비밀번호 (10자 이상): ')
    pw2=getpass.getpass('비밀번호 확인: ')
    if not email or not 2<=len(name)<=50 or not 10<=len(pw)<=128 or pw!=pw2:
        raise SystemExit('입력 정보를 확인해 주세요. 계정을 생성하지 않았습니다.')
    now=utcstamp()
    try:
        with db_connect() as conn:
            conn.execute('INSERT INTO users (email,name,password_hash,role,active,adult_self_confirmed,terms_version,privacy_acknowledged,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
                         (email,name,new_password_hash(pw),'admin',1,1,TERMS_VERSION,1,now,now))
        print('관리자 계정이 생성되었습니다. /admin-members.html 에 로그인하여 관리할 수 있습니다.')
    except sqlite3.IntegrityError:raise SystemExit('이미 가입된 이메일입니다. 계정을 덮어쓰지 않았습니다.')


def main():
    parser=argparse.ArgumentParser(description='HAEON 회원 서비스 서버')
    parser.add_argument('command',choices=['serve','create-admin'],nargs='?',default='serve')
    parser.add_argument('--host',default='127.0.0.1')
    parser.add_argument('--port',type=int,default=PORT)
    args=parser.parse_args()
    init_db()
    if args.command=='create-admin':return create_admin()
    print(f'HAEON site: http://{args.host}:{args.port}/')
    print('실제 계정 저장 기능은 활성화되었습니다. 실제 결제/주류 본인확인은 구현되지 않았습니다.')
    with ThreadingHTTPServer((args.host,args.port),Handler) as httpd:
        try:httpd.serve_forever()
        except KeyboardInterrupt:print('\n종료합니다.')

if __name__=='__main__':main()
