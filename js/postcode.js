'use strict';
(() => {
  const button = document.querySelector('#postcode-search');
  if (!button) return;
  const panel = document.querySelector('#postcode-panel');
  const embed = document.querySelector('#postcode-embed');
  const status = document.querySelector('#postcode-status');
  let loading;
  const api = () => window.kakao?.Postcode || window.daum?.Postcode;
  function loadAPI() {
    if (api()) return Promise.resolve(api());
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const fail = () => { clearTimeout(timer); script.remove(); loading = null; reject(new Error('postcode unavailable')); };
      const timer = setTimeout(fail, 12000);
      script.src = 'https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
      script.onload = () => { if (!api()) { fail(); return; } clearTimeout(timer); resolve(api()); };
      script.onerror = fail;
      document.head.appendChild(script);
    });
    return loading;
  }
  function closeSearch() {
    panel.hidden = true;
    embed.replaceChildren();
    button.setAttribute('aria-expanded', 'false');
  }
  document.querySelector('#postcode-close').addEventListener('click', () => {
    closeSearch();
    button.focus();
  });
  button.addEventListener('click', async () => {
    button.disabled = true;
    status.textContent = '주소 검색을 불러오는 중입니다.';
    try {
      const Postcode = await loadAPI();
      panel.hidden = false;
      embed.replaceChildren();
      button.setAttribute('aria-expanded', 'true');
      new Postcode({
        width: '100%', height: '100%',
        oncomplete(data) {
          const road = data.userSelectedType === 'R';
          let address = road ? data.roadAddress : data.jibunAddress;
          address = address || data.address;
          const extras = [];
          if (road && /[동로가]$/.test(data.bname || '')) extras.push(data.bname);
          if (road && data.apartment === 'Y' && data.buildingName) extras.push(data.buildingName);
          if (extras.length) address += ' (' + extras.join(', ') + ')';
          document.querySelector('#order-postcode').value = data.zonecode;
          document.querySelector('#order-address').value = address;
          const detail = document.querySelector('#order-address-detail');
          detail.value = '';
          closeSearch();
          status.textContent = '주소를 입력했습니다. 동·호수 등 상세주소를 입력해 주세요.';
          detail.focus();
        }
      }).embed(embed);
      status.textContent = '도로명, 지번 또는 건물명으로 검색해 주세요. 검색이 되지 않으면 주소를 직접 입력할 수 있습니다.';
      panel.scrollIntoView({ block: 'center', behavior: 'smooth' });
    } catch (error) {
      closeSearch();
      status.textContent = '주소 검색을 불러오지 못했습니다. 인터넷 연결을 확인하고 다시 시도하거나 우편번호와 주소를 직접 입력해 주세요.';
    } finally {
      button.disabled = false;
    }
  });
})();
