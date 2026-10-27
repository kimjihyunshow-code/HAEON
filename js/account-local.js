'use strict';
// Browser-only demo accounts. Local data is not a server authentication boundary.
(() => {
  const USERS = 'haeon.local.users.v1';
  const SESSION = 'haeon.local.session.v1';
  const login = document.querySelector('#haeon-login');
  const register = document.querySelector('#haeon-register');
  if (!login || !register) return;
  const tabs = [...document.querySelectorAll('[data-auth-tab]')];
  const message = (text, error = false) => {
    const el = document.querySelector('#haeon-auth-message');
    el.textContent = text;
    el.classList.toggle('is-error', error);
  };
  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (_) { throw new Error('브라우저 저장 데이터를 읽을 수 없습니다. 저장소 설정을 확인해 주세요.'); }
  }
  function users() {
    const value = read(USERS, []);
    if (!Array.isArray(value) || value.some(u => !u || typeof u.email !== 'string' || typeof u.id !== 'string' || typeof u.salt !== 'string' || typeof u.hash !== 'string')) {
      throw new Error('회원 저장 데이터가 손상되었습니다. 기존 데이터를 확인해 주세요.');
    }
    return value;
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (_) { throw new Error('저장 공간이 부족하거나 차단되어 있습니다. 브라우저 설정을 확인해 주세요.'); }
  }
  const hex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  async function passwordHash(password, salt) {
    if (!globalThis.crypto?.subtle) throw new Error('비밀번호 보호 기능을 사용할 수 없습니다. HTTPS 또는 localhost로 접속해 주세요.');
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 210000, hash: 'SHA-256' }, key, 256);
    return hex(new Uint8Array(bits));
  }
  function selectTab(name) {
    tabs.forEach(tab => {
      const selected = tab.dataset.authTab === name;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    login.hidden = name !== 'login';
    register.hidden = name !== 'register';
    message('');
  }
  function showUser(user) {
    document.querySelector('.commerce-auth-tabs').hidden = !!user;
    document.querySelector('#haeon-account-dashboard').hidden = !user;
    document.querySelector('#haeon-admin-link').hidden = true;
    if (user) {
      login.hidden = register.hidden = true;
      document.querySelector('#haeon-account-greeting').textContent = `${user.name}님, 환영합니다.`;
      document.querySelector('#haeon-account-email').textContent = user.email;
    } else selectTab('login');
  }
  function restore() {
    const session = read(SESSION, null);
    showUser(session ? users().find(u => u.id === session.userId) || null : null);
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab.dataset.authTab));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      tabs[next].click();
      tabs[next].focus();
    });
  });
  let busy = false;
  async function submit(event, signup) {
    event.preventDefault();
    const form = event.currentTarget;
    if (busy || !form.reportValidity()) return;
    const field = name => form.elements.namedItem(name);
    const email = field('email').value.trim().toLowerCase();
    const password = field('password').value;
    const button = form.querySelector('[type=submit]');
    busy = true;
    button.disabled = true;
    message('처리 중입니다…');
    try {
      let user;
      if (signup) {
        const name = field('name').value.trim();
        if (!name) throw new Error('이름을 입력해 주세요.');
        if (password.length < 10) throw new Error('비밀번호는 10자 이상 입력해 주세요.');
        if (password !== field('password-confirm').value) {
          field('password-confirm').focus();
          throw new Error('비밀번호 확인 값이 다릅니다.');
        }
        if (!['adult', 'terms', 'privacy'].every(key => field(key).checked)) throw new Error('필수 확인 및 동의 항목을 체크해 주세요.');
        if (users().some(u => u.email === email)) throw new Error('이미 가입된 이메일입니다. 로그인해 주세요.');
        const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
        const hash = await passwordHash(password, salt);
        user = { id: hex(crypto.getRandomValues(new Uint8Array(16))), name, email, salt, hash, adult: true, terms: true, privacy: true, marketing: field('marketing').checked, createdAt: new Date().toISOString() };
        const latest = users();
        if (latest.some(u => u.email === email)) throw new Error('이미 가입된 이메일입니다. 로그인해 주세요.');
        save(USERS, [...latest, user]);
      } else {
        user = users().find(u => u.email === email);
        if (!user || await passwordHash(password, user.salt) !== user.hash) throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
      }
      try { save(SESSION, { userId: user.id }); }
      catch (err) {
        if (signup) { form.reset(); selectTab('login'); throw new Error('가입은 완료되었지만 로그인 상태를 저장하지 못했습니다. 저장소 설정 확인 후 로그인해 주세요.'); }
        throw err;
      }
      login.reset();
      register.reset();
      showUser(user);
      message(signup ? '회원가입이 완료되었습니다. 환영합니다!' : '로그인되었습니다.');
    } catch (err) { message(err.message, true); }
    finally { busy = false; button.disabled = false; }
  }
  login.addEventListener('submit', event => submit(event, false));
  register.addEventListener('submit', event => submit(event, true));
  document.querySelector('#haeon-logout').addEventListener('click', () => {
    try {
      localStorage.removeItem(SESSION);
      showUser(null);
      login.reset();
      register.reset();
      message('로그아웃되었습니다.');
    } catch (_) { message('로그아웃 상태를 저장하지 못했습니다. 브라우저 설정을 확인해 주세요.', true); }
  });
  window.addEventListener('storage', event => {
    if (event.key === USERS || event.key === SESSION || event.key === null) {
      try { restore(); } catch (err) { showUser(null); message(err.message, true); }
    }
  });
  try {
    restore();
    if (!read(SESSION, null)) selectTab(new URLSearchParams(location.search).get('mode') === 'signup' ? 'register' : 'login');
  } catch (err) { message(err.message, true); }
})();
