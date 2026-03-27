// Hamburger menu
const nav = document.querySelector('nav');
const hamburger = document.querySelector('.nav-hamburger');
hamburger.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  hamburger.setAttribute('aria-expanded', open);
});
document.querySelectorAll('nav ul a').forEach(link => {
  link.addEventListener('click', () => {
    nav.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
  });
});

// Nav scrolled state (muda visual ao rolar)
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// Animações de entrada — mais rápidas e com stagger limitado
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.opacity = '1';
      e.target.style.transform = 'translateY(0)';
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.06 });

// Lightbox
(function () {
  const overlay  = document.getElementById('lightbox');
  const lbImg    = document.getElementById('lb-img');
  const btnClose = document.getElementById('lb-close');
  const btnPrev  = document.getElementById('lb-prev');
  const btnNext  = document.getElementById('lb-next');

  const items = Array.from(document.querySelectorAll('.g-item img'));
  let current = 0;

  function open(index) {
    current = index;
    show(current);
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function show(index) {
    const img = items[index];
    lbImg.classList.add('loading');
    lbImg.onload = () => lbImg.classList.remove('loading');
    lbImg.src = img.src;
    lbImg.alt = img.alt;
    btnPrev.style.display = items.length > 1 ? '' : 'none';
    btnNext.style.display = items.length > 1 ? '' : 'none';
  }

  function prev() { current = (current - 1 + items.length) % items.length; show(current); }
  function next() { current = (current + 1) % items.length; show(current); }

  // Abrir ao clicar em qualquer foto da galeria
  items.forEach((img, i) => {
    img.closest('.g-item').style.cursor = 'zoom-in';
    img.closest('.g-item').addEventListener('click', () => open(i));
  });

  btnClose.addEventListener('click', close);
  btnPrev.addEventListener('click', (e) => { e.stopPropagation(); prev(); });
  btnNext.addEventListener('click', (e) => { e.stopPropagation(); next(); });

  // Fechar ao clicar no fundo
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  // Teclado
  document.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('open')) return;
    if (e.key === 'Escape')      close();
    if (e.key === 'ArrowLeft')   prev();
    if (e.key === 'ArrowRight')  next();
  });

  // Swipe no mobile
  let touchX = 0;
  overlay.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  overlay.addEventListener('touchend', (e) => {
    const diff = touchX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) diff > 0 ? next() : prev();
  });
})();

document.querySelectorAll('.srv-card, .testi-card, .g-item, .wa-card').forEach((el, i) => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(16px)';
  const delay = Math.min(i * 0.04, 0.28); // stagger máximo de 0.28s
  el.style.transition = `opacity .28s ${delay}s ease, transform .28s ${delay}s ease`;
  observer.observe(el);
});
