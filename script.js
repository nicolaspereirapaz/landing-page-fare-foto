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

const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.opacity = '1';
      e.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.08 });

document.querySelectorAll('.srv-card, .testi-card, .g-item, .wa-card').forEach((el, i) => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(22px)';
  el.style.transition = `opacity .5s ${i * 0.04}s ease, transform .5s ${i * 0.04}s ease`;
  observer.observe(el);
});
