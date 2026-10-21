'use strict';

// Each enhancement is optional: content and navigation links remain normal HTML.
function initHeader() {
  const header = document.querySelector('.site-header');
  const update = () => header.classList.toggle('scrolled', window.scrollY > 45);
  update();
  window.addEventListener('scroll', update, {passive: true});
}

function initMenu() {
  const menu = document.querySelector('#site-menu');
  const trigger = document.querySelector('.menu-toggle');
  if (!menu || !trigger) return;
  trigger.addEventListener('click', () => {
    menu.showModal(); // Native dialog traps focus and supports Escape.
    trigger.setAttribute('aria-expanded', 'true');
    trigger.setAttribute('aria-label', '전체 메뉴 닫기');
  });
  document.querySelector('.menu-close').addEventListener('click', () => menu.close());
  menu.addEventListener('close', () => {
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-label', '전체 메뉴 열기');
    trigger.focus({preventScroll: true});
  });
}

let toastTimer;
function showToast(message) {
  const toast = document.querySelector('.toast');
  toast.textContent = message;
  toast.classList.add('visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('visible'), 4200);
}

function initLanguage() {
  const toggle = document.querySelector('.language-toggle');
  const options = document.querySelector('#language-options');
  if (!toggle || !options) return;
  const close = () => { options.hidden = true; toggle.setAttribute('aria-expanded', 'false'); };
  toggle.addEventListener('click', () => {
    options.hidden = !options.hidden;
    toggle.setAttribute('aria-expanded', String(!options.hidden));
  });
  options.addEventListener('click', event => {
    const option = event.target.closest('[data-language]');
    if (!option) return;
    if (option.dataset.language === 'en') showToast('영문 페이지는 준비 중입니다. 현재 한국어로 이용하실 수 있습니다.');
    close(); toggle.focus();
  });
  document.addEventListener('click', event => { if (!event.target.closest('.language')) close(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !options.hidden) { close(); toggle.focus(); }
  });
}

function initReveal() {
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.documentElement.classList.add('motion-ready');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, {threshold: 0.08});
  document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
}

function initImageFallbacks() {
  document.querySelectorAll('img').forEach(image => {
    const fallback = () => {
      image.classList.add('image-unavailable');
      // Keep the image dimensions and accessible alternative text intact.
      image.parentElement.classList.add('has-image-fallback');
    };
    image.addEventListener('error', fallback);
    image.addEventListener('load', () => image.classList.remove('image-unavailable'));
    if (image.complete && image.naturalWidth === 0) fallback();
  });
}

function initProducts() {
  const dialog = document.querySelector('.product-dialog');
  if (!dialog) return;
  const products = {
    '750': {name:'해온 750ml',volume:'750 ml',price:'₩ 38,000',description:'함께 나누는 저녁을 위한 넉넉한 한 병.',image:'experience/haeon-bottle.png'},
    '375': {name:'해온 375ml',volume:'375 ml',price:'₩ 22,000',description:'작은 식탁에 어울리는 한 병의 여유.',image:'experience/haeon-bottle.png'},
    'gift': {name:'해온 Gift Package',volume:'750 ml + 백자잔 2개',price:'₩ 58,000',description:'소중한 사람에게 전하는 자연의 온기.',image:'experience/shop.jpg'}
  };
  let opener;
  document.querySelectorAll('[data-product]').forEach(button => {
    button.addEventListener('click', () => {
      const product = products[button.dataset.product];
      if (!product) return;
      opener = button;
      document.querySelector('#product-title').textContent = product.name;
      document.querySelector('#product-volume').textContent = product.volume;
      document.querySelector('#product-price').textContent = product.price;
      document.querySelector('#product-description').textContent = product.description;
      const image = document.querySelector('#product-modal-image');
      image.src = 'assets/images/' + product.image;
      image.alt = product.name + ' 제품 이미지';
      dialog.showModal();
    });
  });
  dialog.querySelectorAll('.product-close').forEach(button => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', event => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => opener?.focus({preventScroll:true}));
}

initHeader();
initStoryDropdown();
initMenu();
initLanguage();
initReveal();
initImageFallbacks();
initProducts();
document.querySelectorAll('[data-info]').forEach(button => button.addEventListener('click', () => showToast(button.dataset.info)));

// STORY dropdown: hover and keyboard focus on desktop; first tap opens on touch.
function initStoryDropdown() {
  const menu = document.querySelector('.story-menu');
  if (!menu) return;
  const trigger = menu.querySelector('.story-menu__trigger');
  const touchMode = window.matchMedia('(hover: none), (pointer: coarse)');
  const setOpen = (open) => {
    menu.classList.toggle('is-open', open);
    trigger.setAttribute('aria-expanded', String(open));
  };
  const isOpen = () => menu.classList.contains('is-open');

  trigger.addEventListener('click', event => {
    if (!touchMode.matches) return; // Desktop click still opens brand.html.
    event.preventDefault();
    const willOpen = !isOpen();
    setOpen(willOpen);
    if (!willOpen) trigger.blur();
  });
  menu.addEventListener('mouseenter', () => {
    if (!touchMode.matches) setOpen(true);
  });
  menu.addEventListener('mouseleave', () => {
    if (!touchMode.matches && !menu.contains(document.activeElement)) setOpen(false);
  });
  menu.addEventListener('focusin', () => {
    if (!touchMode.matches) setOpen(true);
  });
  menu.addEventListener('focusout', () => {
    requestAnimationFrame(() => {
      if (!menu.contains(document.activeElement) && !menu.matches(':hover')) setOpen(false);
    });
  });
  document.addEventListener('click', event => {
    if (!menu.contains(event.target)) {
      setOpen(false);
      if (touchMode.matches && menu.contains(document.activeElement)) document.activeElement.blur();
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && (isOpen() || menu.contains(document.activeElement))) {
      setOpen(false);
      trigger.focus();
      // :focus-within normally displays the submenu; exit the menu on Escape.
      trigger.blur();
    }
  });
}

