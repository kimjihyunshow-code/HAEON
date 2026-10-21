/* HAEON — TASTE in-page pairing guide: two right-side, three left-side. */
(() => {
  const guides = {
    yukhoe: {
      name: '육회', subtitle: '배의 맑은 단맛과 소고기의 감칠맛',
      paragraphs: [
        '육회는 간장이나 참기름의 양을 과하게 하지 않고, 배채와 잣을 곁들여 재료 본연의 맛을 살리는 것이 좋습니다.'
      ]
    },
    fish: {
      name: '흰살생선', subtitle: '섬세한 바다의 맛을 더욱 또렷하게',
      paragraphs: [
        '회는 간장과 와사비를 최소한으로 사용해 생선 자체의 맛을 살리는 것을 추천합니다.',
        '구이라면 양념구이보다 소금구이가 좋습니다.',
        '레몬이나 유자를 아주 조금 곁들이면 해온의 산뜻한 풍미와 잘 이어집니다.'
      ]
    },
    shabu: {
      name: '샤브샤브', subtitle: '맑고 담백한 국물에 스며드는 향',
      paragraphs: [
        '육수는 지나치게 맵거나 진하게 만들기보다 다시마·채소 중심의 맑은 육수가 잘 어울립니다.',
        '소스 역시 강한 참깨소스보다는 산뜻한 느낌의 간장 혹은 폰즈 등을 곁들이는 편이 좋습니다.'
      ]
    },
    grill: {
      name: '맥적·갈비', subtitle: '짙은 육향 사이를 가볍게 정리하는 한 잔',
      paragraphs: [
        '양념은 지나치게 달거나 맵지 않게 조절하고, 불향과 고기의 맛이 살아 있도록 굽는 편이 좋습니다.',
        '맥적에는 된장과 매실 계열의 산뜻한 맛을, 갈비에는 배의 단맛을 중심으로 조화를 느껴보세요.'
      ]
    },
    flower: {
      name: '국화전', subtitle: '같은 향을 다른 방식으로 이어가는 계절의 페어링',
      paragraphs: [
        '국화전은 반죽을 두껍게 만들거나 기름을 많이 사용하기보다, 얇고 가볍게 부쳐 꽃의 향을 살리는 것이 좋습니다.',
        '꿀이나 설탕 역시 많이 더하기보다는 은은한 단맛만 남기는 정도가 좋습니다.'
      ]
    }
  };

  const root = document.querySelector('body[data-page="taste"]');
  if (!root) return;
  const drawer = document.getElementById('taste-guide-drawer');
  const panel = drawer?.querySelector('.taste-v2-drawer__panel');
  const title = document.getElementById('taste-v2-drawer-title');
  const contents = document.getElementById('taste-v2-drawer-content');
  if (!drawer || !panel || !title || !contents) return;
  let previouslyFocused = null;
  let hideTimer = null;
  let formerOverflow = '';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const closeButton = drawer.querySelector('.taste-v2-drawer__close');
  // The last three dishes appear on the right half of the page, so their guides slide in from the left.
  const leftSideGuides = new Set(['shabu', 'grill', 'flower']);

  function openGuide(key, trigger) {
    const data = guides[key];
    if (!data) return;
    clearTimeout(hideTimer);
    previouslyFocused = trigger;
    // Select the drawer's entrance side before making it visible, avoiding a flash from the wrong edge.
    drawer.dataset.side = leftSideGuides.has(key) ? 'left' : 'right';
    title.textContent = data.name;
    contents.replaceChildren();
    const subtitle = document.createElement('h3');
    subtitle.textContent = data.subtitle;
    contents.appendChild(subtitle);
    data.paragraphs.forEach(item => {
      const p = document.createElement('p'); p.textContent = item;
      contents.appendChild(p);
    });
    drawer.hidden = false;
    formerOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      drawer.classList.add('is-open');
      closeButton.focus({preventScroll:true});
    });
  }
  function closeGuide() {
    if (drawer.hidden) return;
    drawer.classList.remove('is-open');
    document.body.style.overflow = formerOverflow;
    previouslyFocused?.focus({preventScroll:true});
    const finish = () => { drawer.hidden = true; };
    hideTimer = setTimeout(finish, reduced.matches ? 0 : 360);
  }
  document.querySelectorAll('[data-taste-tip]').forEach(button => {
    button.addEventListener('click', () => openGuide(button.dataset.tasteTip, button));
  });
  drawer.querySelectorAll('[data-taste-dismiss]').forEach(el => el.addEventListener('click',closeGuide));
  document.addEventListener('keydown', event => {
    if (drawer.hidden || !drawer.classList.contains('is-open')) return;
    if (event.key === 'Escape') { event.preventDefault(); closeGuide(); return; }
    if (event.key === 'Tab') {
      const focusable = [...panel.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter(el => !el.disabled);
      if (!focusable.length) return;
      const first=focusable[0], last=focusable[focusable.length-1];
      if (event.shiftKey && document.activeElement===first) {event.preventDefault();last.focus();}
      else if (!event.shiftKey && document.activeElement===last) {event.preventDefault();first.focus();}
    }
  });
})();
