'use strict';
/* HAEON prototype commerce. No real accounts, orders, or payment are created. */
(() => {
  const CATALOG = Object.freeze({
    '750': {name:'해온 750ml', tag:'SIGNATURE YAKJU', price:38000, volume:'750ml', alc:'15%', image:'experience/750ml.png', description:'함께 나누는 저녁을 위한 넉넉한 한 병.',explain:'강화도 쌀의 부드러운 곡물 풍미에 배와 매실의 산뜻함, 국화와 누룩의 은은한 여운이 겹쳐집니다.'},
    '375': {name:'해온 375ml', tag:'SIGNATURE YAKJU', price:22000, volume:'375ml', alc:'15%', image:'experience/375ml.png', description:'작은 식탁에 어울리는 한 병의 여유.',explain:'해온의 풍미를 조금 더 가볍게 경험할 수 있도록 구성한 소용량 제품 콘셉트입니다.'},
    'gift': {name:'해온 Gift Package', tag:'GIFT EDITION', price:58000, volume:'750ml + 백자잔 2개', alc:'15%', image:'experience/750ml_set.png', description:'소중한 사람에게 전하는 자연의 온기.',explain:'해온 약주와 두 개의 잔을 함께 구성한 선물 콘셉트입니다. 실제 포장 구성과 가격은 추후 확정됩니다.'},
    'mini': {name:'해온 미니 세트', tag:'MINI GIFT EDITION', price:42000, volume:'100ml × 4병 + 전용 잔 2개 (시안 구성)', alc:'15% (시안)', image:'experience/100ml_set.png', description:'작은 병에 담은 해온의 여유, 함께 나누는 선물.', explain:'해온을 100ml 미니어처 네 병에 담고 전용 잔을 함께 구성한 선물세트 디자인입니다. 실제 구성, 도수, 가격과 판매 일정은 운영 전 확정해야 합니다.'}
  });
  const STORAGE_KEY='haeon-demo-cart-v1';
  const won = amount => '₩'+amount.toLocaleString('ko-KR');
  let storageAvailable = true;
  function getCart() {
    try {
      const source=JSON.parse(sessionStorage.getItem(STORAGE_KEY)||'{}');
      const safe={};
      if(source && typeof source==='object') Object.keys(CATALOG).forEach(id=>{const q=Number(source[id]);if(CATALOG[id].price!==null&&Number.isInteger(q)&&q>0) safe[id]=Math.min(q,99)});
      return safe;
    } catch(e){storageAvailable=false;return window.haeonDemoCart||{};}
  }
  function saveCart(cart){
    try{sessionStorage.setItem(STORAGE_KEY,JSON.stringify(cart));storageAvailable=true;}
    catch(e){storageAvailable=false;window.haeonDemoCart=cart;}
    renderAll();
  }
  const totalQuantity = cart => Object.values(cart).reduce((a,b)=>a+b,0);
  const subtotal = cart => Object.entries(cart).reduce((sum,[id,q])=>sum+(CATALOG[id].price||0)*q,0);
  const toast = message => {
    if(typeof showToast==='function'){showToast(message);return;}
    const node=document.querySelector('.toast');if(node){node.textContent=message;node.classList.add('visible');window.setTimeout(()=>node.classList.remove('visible'),3500)}
  };
  const productsFromCart = cart => Object.entries(cart).map(([id,q])=>({id,q,product:CATALOG[id]}));
  function lineHTML(id,q,{editable=true}={}){
    const p=CATALOG[id];
    return `<article class="commerce-cart-line" data-cart-id="${id}">
      <a class="commerce-cart-line__img" href="product-detail.html?id=${id}"><img src="assets/images/${p.image}" alt="${p.name}"></a>
      <div><a href="product-detail.html?id=${id}" class="commerce-cart-line__name">${p.name}</a><p class="commerce-cart-line__detail">${p.volume} · ${p.alc} (예시)</p>
      ${editable?`<div class="commerce-cart-line__tools"><div class="commerce-stepper"><button type="button" data-cart-minus="${id}" aria-label="${p.name} 수량 감소">−</button><output>${q}</output><button type="button" data-cart-plus="${id}" aria-label="${p.name} 수량 증가">＋</button></div><button type="button" class="commerce-cart-line__remove" data-cart-remove="${id}">삭제</button></div>`:`<p class="commerce-cart-line__detail">수량 ${q}개</p>`}</div>
      <strong class="commerce-cart-line__price">${p.price===null?'가격 미정':won(p.price*q)}</strong></article>`;
  }
  function renderAll(){
    const cart=getCart();
    document.querySelectorAll('[data-cart-count]').forEach(el=>el.textContent=String(totalQuantity(cart)));
    document.querySelectorAll('[data-subtotal],[data-total]').forEach(el=>el.textContent=won(subtotal(cart)));
    const fallback=`<div class="commerce-empty"><h2>장바구니가 비어 있습니다.</h2><p>해온의 컬렉션을 둘러보세요.</p><a class="commerce-primary commerce-link-button" href="shop.html">쇼핑 계속하기 ↗</a></div>`;
    const list=productsFromCart(cart).map(({id,q})=>lineHTML(id,q)).join('');
    const cartPage=document.querySelector('#cart-page-items');if(cartPage)cartPage.innerHTML=list||fallback;
    const drawer=document.querySelector('#commerce-cart-content');if(drawer)drawer.innerHTML=list||fallback;
    const checkout=document.querySelector('#checkout-items');if(checkout)checkout.innerHTML=productsFromCart(cart).map(({id,q})=>lineHTML(id,q,{editable:false})).join('')||fallback;
    document.querySelectorAll('[data-cart-required]').forEach(el=>el.disabled=totalQuantity(cart)===0);
  }
  function adjust(id,delta){if(!CATALOG[id])return;const cart=getCart();const next=Math.max(0,Math.min(99,(cart[id]||0)+delta));if(next)cart[id]=next;else delete cart[id];saveCart(cart)}
  function add(id,qty){if(!CATALOG[id]||CATALOG[id].price===null)return;const cart=getCart();cart[id]=Math.min(99,(cart[id]||0)+qty);saveCart(cart);toast(`${CATALOG[id].name} 상품이 장바구니에 담겼습니다. (시연용)`);openDrawer()}
  function initDrawer(){
    const drawer=document.createElement('dialog');drawer.className='commerce-cart-dialog';drawer.id='commerce-cart-drawer';drawer.setAttribute('aria-labelledby','commerce-cart-title');
    drawer.innerHTML=`<div class="commerce-cart-dialog__inner"><div class="commerce-cart-dialog__head"><h2 id="commerce-cart-title">장바구니 <span data-cart-count>0</span></h2><button type="button" data-cart-close aria-label="장바구니 닫기">×</button></div><div class="commerce-cart-dialog__content" id="commerce-cart-content"></div><div class="commerce-cart-dialog__footer"><div class="commerce-summary-line"><span>상품 합계</span><strong data-subtotal>₩0</strong></div><p class="commerce-helper">배송비 미정 · 결제 불가한 포트폴리오용 장바구니입니다.</p><a href="cart.html" class="commerce-primary commerce-link-button">장바구니 전체 보기 ↗</a><a href="checkout.html" class="commerce-secondary commerce-link-button">주문 내용 확인</a></div></div>`;
    document.body.appendChild(drawer);
    drawer.querySelector('[data-cart-close]').addEventListener('click',()=>drawer.close());
    drawer.addEventListener('click',e=>{if(e.target===drawer)drawer.close()});
    drawer.addEventListener('close',()=>{const target=document.querySelector('[data-cart-open]');if(target)target.focus({preventScroll:true})});
  }
  function openDrawer(){const drawer=document.querySelector('#commerce-cart-drawer');if(drawer&&!drawer.open){renderAll();drawer.showModal()}}
  function initProductDetail(){
    const el=document.querySelector('[data-product-detail]');if(!el)return;
    let id=new URLSearchParams(location.search).get('id')||'750';if(!CATALOG[id])id='750';
    const p=CATALOG[id];let qty=1;
    const setText=(sel,value)=>{const node=document.querySelector(sel);if(node)node.textContent=value};
    setText('#pd-name',p.name);setText('#pd-tag',p.tag);setText('#product-crumb',p.name);setText('#pd-price',p.price===null?'출시 준비 중 · 가격 미정':won(p.price)+' (예시)');setText('#pd-desc',p.description);setText('#pd-volume',p.volume);setText('#pd-alc',p.alc+' (예시)');setText('#pd-explain',p.explain);
    const img=document.querySelector('#pd-image');if(img){img.src='assets/images/'+p.image;img.alt=p.name+' 제품 이미지'}
    document.querySelector('title').textContent=p.name+' | HAEON';
    const updateQty=()=>setText('#pd-quantity',String(qty));
    document.querySelector('[data-quantity-minus]').addEventListener('click',()=>{qty=Math.max(1,qty-1);updateQty()});
    document.querySelector('[data-quantity-plus]').addEventListener('click',()=>{qty=Math.min(99,qty+1);updateQty()});
    const addButton=document.querySelector('#pd-add');if(p.price===null){addButton.disabled=true;addButton.textContent='판매 준비 중 · 상세정보 안내';const qtyControls=document.querySelector('.commerce-purchase-controls');if(qtyControls)qtyControls.hidden=true;}else{addButton.addEventListener('click',()=>add(id,qty));}
    const related=document.querySelector('#pd-related');if(related)related.innerHTML=Object.entries(CATALOG).filter(([pid])=>pid!==id).map(([pid,item])=>`<a href="product-detail.html?id=${pid}" class="commerce-small-product"><img src="assets/images/${item.image}" alt=""><div><strong>${item.name}</strong><span>${item.price===null?'가격 미정':won(item.price)}</span></div></a>`).join('');
  }
  function initAccount(){
    const tabs=[...document.querySelectorAll('[data-auth-tab]')];if(!tabs.length)return;
    function selectTab(name){
      tabs.forEach(t=>{const is=t.dataset.authTab===name;t.setAttribute('aria-selected',String(is));t.tabIndex=is?0:-1});
      document.querySelector('#demo-login').hidden=name!=='login';document.querySelector('#demo-register').hidden=name!=='register';
    }
    tabs.forEach(tab=>tab.addEventListener('click',()=>selectTab(tab.dataset.authTab)));
    selectTab(new URLSearchParams(location.search).get('mode')==='signup'?'register':'login');
    document.querySelector('#demo-login').addEventListener('submit',event=>{event.preventDefault();event.target.reset();toast('로그인 화면 시연입니다. 실제 계정 인증은 진행되지 않았습니다.')});
    document.querySelector('#demo-register').addEventListener('submit',event=>{
      event.preventDefault();const form=event.target;const p1=form.elements.namedItem('password').value;const p2=form.elements.namedItem('password-confirm').value;
      if(p1!==p2){toast('비밀번호 확인 값이 일치하지 않습니다.');form.elements.namedItem('password-confirm').focus();return}
      form.reset();toast('회원가입 양식 확인 완료. 계정은 생성되지 않았습니다.');
    });
  }
  document.addEventListener('click',event=>{
    const open=event.target.closest('[data-cart-open]');if(open){openDrawer();return}
    const product=event.target.closest('[data-product-link]');if(product){location.href='product-detail.html?id='+encodeURIComponent(product.dataset.productLink);return}
    const plus=event.target.closest('[data-cart-plus]');if(plus){adjust(plus.dataset.cartPlus,1);return}
    const minus=event.target.closest('[data-cart-minus]');if(minus){adjust(minus.dataset.cartMinus,-1);return}
    const remove=event.target.closest('[data-cart-remove]');if(remove){const cart=getCart();delete cart[remove.dataset.cartRemove];saveCart(cart)}
  });
  function initCheckout(){
    const button=document.querySelector('#checkout-preview');if(!button)return;
    const demoDialog=document.querySelector('#checkout-demo-dialog');
    document.querySelector('#checkout-demo-close').addEventListener('click',()=>demoDialog.close());
    demoDialog.addEventListener('close',()=>button.focus());
    button.addEventListener('click',()=>{
      if(!totalQuantity(getCart())){toast('장바구니가 비어 있습니다.');return}
      if(!document.querySelector('#checkout-adult').checked){toast('시연용 연령 확인 안내를 먼저 확인해 주세요.');return}
      if(!document.querySelector('#checkout-form').reportValidity())return;
      document.querySelector('#checkout-demo-dialog').showModal();
    });
  }
  initDrawer();initProductDetail();initCheckout();renderAll();
})();
