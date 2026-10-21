/* EXPERIENCE layout-only enhancement. Real purchases are not enabled. */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-experience-pending]').forEach(button => {
    button.addEventListener('click', () => {
      if (typeof showToast === 'function') {
        showToast('해온 미니 세트의 상품 상세 화면은 준비 중입니다. 실제 구매와 결제는 진행되지 않습니다.');
      }
    });
  });
});
