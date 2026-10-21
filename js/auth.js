'use strict';
/* Member accounts require the bundled Python server. No client-side password storage. */
(() => {
  let csrf = '';
  let activeUser = null;
  const message = (id, text, error = false) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('is-error', error);
  };
  async function request(url, options = {}) {
    let response;
    try {
      response = await fetch(url, {
        credentials: 'same-origin',
        cache: 'no-store',
        ...options,
        headers: { 'Accept': 'application/json', ...(options.body ? { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf } : {}), ...(options.headers || {}) }
      });
    } catch (_) { throw new Error('회원 서버에 연결할 수 없습니다. python server.py serve로 사이트를 실행하세요.'); }
    const json = await response.json().catch(() => { throw new Error('회원 서버가 실행 중이지 않습니다. Live Server 대신 python server.py serve를 사용하세요.'); });
    if (!response.ok || !json.ok) throw new Error(json.error || '요청을 완료하지 못했습니다.');
    if (json.csrf) csrf = json.csrf;
    return json;
  }
  function switchAccountUser(user) {
    activeUser = user;
    const tabs = document.querySelector('.commerce-auth-tabs');
    const login = document.querySelector('#haeon-login');
    const register = document.querySelector('#haeon-register');
    const dashboard = document.querySelector('#haeon-account-dashboard');
    if (!dashboard) return;
    if (tabs) tabs.hidden = !!user;
    dashboard.hidden = !user;
    if (user) {
      if (login) login.hidden = true;
      if (register) register.hidden = true;
      document.querySelector('#haeon-account-greeting').textContent = `${user.name}님, 환영합니다.`;
      document.querySelector('#haeon-account-email').textContent = user.email;
      document.querySelector('#haeon-admin-link').hidden = user.role !== 'admin';
    } else {
      if (login) login.hidden = false;
      if (register) register.hidden = true;
    }
  }
  function accountTabs() {
    const tabs = [...document.querySelectorAll('[data-auth-tab]')];
    if (!tabs.length) return;
    const setTab = name => {
      tabs.forEach(t => {
        const on = t.dataset.authTab === name;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
      });
      document.querySelector('#haeon-login').hidden = name !== 'login';
      document.querySelector('#haeon-register').hidden = name !== 'register';
      message('haeon-auth-message', '');
    };
    tabs.forEach(tab => tab.addEventListener('click', () => setTab(tab.dataset.authTab)));
    setTab(new URLSearchParams(location.search).get('mode') === 'signup' ? 'register' : 'login');
    const submit = async (form, url, data) => {
      const button = form.querySelector('button[type=submit]');
      button.disabled = true;
      message('haeon-auth-message', '처리 중입니다…');
      try {
        const answer = await request(url, { method: 'POST', body: JSON.stringify(data) });
        form.reset();
        switchAccountUser(answer.user);
        message('haeon-auth-message', '회원가입과 로그인이 완료되었습니다.');
        if (url === '/api/login') message('haeon-auth-message', '로그인되었습니다.');
      } catch (err) { message('haeon-auth-message', err.message, true); }
      finally { button.disabled = false; }
    };
    document.querySelector('#haeon-login').addEventListener('submit', e => {
      e.preventDefault();
      const f = e.currentTarget;
      submit(f, '/api/login', { email: f.elements.namedItem('email').value, password: f.elements.namedItem('password').value });
    });
    document.querySelector('#haeon-register').addEventListener('submit', e => {
      e.preventDefault();
      const f = e.currentTarget;
      const pw = f.elements.namedItem('password').value;
      if (pw !== f.elements.namedItem('password-confirm').value) {
        message('haeon-auth-message', '비밀번호 확인 값이 다릅니다.', true);
        f.elements.namedItem('password-confirm').focus();
        return;
      }
      submit(f, '/api/register', {
        name: f.elements.namedItem('name').value,
        email: f.elements.namedItem('email').value,
        password: pw,
        adult: f.elements.namedItem('adult').checked,
        terms: f.elements.namedItem('terms').checked,
        privacy: f.elements.namedItem('privacy').checked,
        marketing: f.elements.namedItem('marketing').checked
      });
    });
    document.querySelector('#haeon-logout').addEventListener('click', async () => {
      try {
        await request('/api/logout', { method: 'POST', body: '{}' });
        switchAccountUser(null);
        setTab('login');
        message('haeon-auth-message', '로그아웃되었습니다.');
      } catch (err) { message('haeon-auth-message', err.message, true); }
    });
  }
  const adminRoot = document.querySelector('#haeon-admin-content');
  let page = 1;
  let pages = 1;
  async function refreshAdmin() {
    if (!adminRoot) return;
    const q = document.getElementById('haeon-user-search').value;
    try {
      const data = await request('/api/admin/users?' + new URLSearchParams({ q, page: String(page) }));
      pages = Math.max(1, Math.ceil(data.total / data.pageSize));
      document.getElementById('haeon-admin-count').textContent = `검색 결과 ${data.total}명`;
      document.getElementById('haeon-admin-page').textContent = `${page} / ${pages}`;
      document.getElementById('haeon-members-prev').disabled = page <= 1;
      document.getElementById('haeon-members-next').disabled = page >= pages;
      const body = document.getElementById('haeon-admin-members');
      body.replaceChildren();
      for (const user of data.users) {
        const tr = document.createElement('tr');
        const cell = value => { const td = document.createElement('td'); td.textContent = String(value); tr.appendChild(td); return td; };
        cell(user.id);
        cell(user.name);
        cell(user.email);
        cell(user.created_at);
        cell(`${user.terms_version} · 개인정보 ${user.privacy_acknowledged ? '확인' : '미확인'} · 성인 자기확인 ${user.adult_self_confirmed ? '예' : '아니오'}`);
        cell(user.marketing_consent ? '동의' : '미동의');
        cell(user.active ? '활성' : '비활성');
        const actions = document.createElement('td');
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = user.role === 'admin' ? '관리자 계정' : (user.active ? '비활성화' : '활성화');
        button.disabled = user.role === 'admin';
        button.addEventListener('click', async () => {
          const next = !user.active;
          if (!confirm(`${user.email} 계정을 ${next ? '활성화' : '비활성화'}할까요?`)) return;
          button.disabled = true;
          try {
            await request('/api/admin/set-active', { method: 'POST', body: JSON.stringify({ userId: user.id, active: next }) });
            message('haeon-admin-message', '계정 상태가 변경되었습니다.');
            await refreshAdmin();
          } catch (err) { button.disabled = false; message('haeon-admin-message', err.message, true); }
        });
        actions.appendChild(button);
        tr.appendChild(actions);
        body.appendChild(tr);
      }
    } catch (err) { message('haeon-admin-message', err.message, true); }
  }
  function initAdmin() {
    if (!adminRoot) return;
    const gate = document.querySelector('#haeon-admin-gate');
    if (!activeUser || activeUser.role !== 'admin') {
      gate.textContent = activeUser ? '관리자 계정만 접근할 수 있습니다.' : '로그인한 관리자가 필요합니다. account.html에서 로그인하세요.';
      return;
    }
    gate.hidden = true;
    adminRoot.hidden = false;
    document.getElementById('haeon-user-search-button').addEventListener('click', () => { page = 1; refreshAdmin(); });
    document.getElementById('haeon-user-search').addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); page = 1; refreshAdmin(); }
    });
    document.getElementById('haeon-members-prev').addEventListener('click', () => { page = Math.max(1, page - 1); refreshAdmin(); });
    document.getElementById('haeon-members-next').addEventListener('click', () => { page = Math.min(pages, page + 1); refreshAdmin(); });
    refreshAdmin();
  }
  async function main() {
    accountTabs();
    try {
      const session = await request('/api/session');
      csrf = session.csrf;
      switchAccountUser(session.user);
      initAdmin();
    } catch (err) {
      message('haeon-auth-message', err.message, true);
      message('haeon-admin-message', err.message, true);
      if (adminRoot) document.querySelector('#haeon-admin-gate').textContent = '회원 서버 연결이 필요합니다.';
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', main);
  else main();
})();
