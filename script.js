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

document.querySelectorAll('.srv-card, .testi-card, .g-item, .wa-card').forEach((el, i) => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(16px)';
  const delay = Math.min(i * 0.04, 0.28); // stagger máximo de 0.28s
  el.style.transition = `opacity .28s ${delay}s ease, transform .28s ${delay}s ease`;
  observer.observe(el);
});
