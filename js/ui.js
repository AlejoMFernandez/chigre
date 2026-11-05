/* Chigre · interacción general (intro, barra, entradas, arrastre, mazo). Sin dependencias. */
(function () {
  'use strict';
  var d = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var celu = function () { return window.innerWidth < 900; };
  var barra = $('#barra');
  var hero = $('.hero');

  /* ---------- intro: el cartel se prende ---------- */
  function esperar(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function listoHero() {
    var img = $('.hero__foto img');
    var fuentes = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    var foto = img && !img.complete ? new Promise(function (r) { img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }); }) : Promise.resolve();
    return Promise.race([Promise.all([fuentes, foto]), esperar(2200)]);
  }
  function abrirPagina() {
    barra.classList.add('entra');
    hero && hero.classList.add('visto');
  }
  async function intro() {
    var el = $('.intro');
    if (!d.classList.contains('con-intro') || !el) { abrirPagina(); return; }
    var rapido = celu();
    barra.classList.add('entra');
    barra.style.transition = 'none';
    await esperar(rapido ? 120 : 260);
    el.classList.add('prende');
    await Promise.all([esperar(rapido ? 680 : 900), listoHero()]);
    // la caja viaja hasta el logo de la barra
    var caja = $('.intro__caja', el);
    var logo = $('.barra__logo');
    var rc = caja.getBoundingClientRect(), rl = logo.getBoundingClientRect();
    var anchoLogo = rc.width * 0.72;
    var s = rl.width / anchoLogo;
    var tx = (rl.left + rl.width / 2) - (rc.left + rc.width / 2 * s);
    var ty = (rl.top + rl.height / 2) - (rc.top + rc.height / 2 * s);
    el.classList.add('vuela');
    caja.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + s + ')';
    caja.style.backgroundColor = 'transparent';
    caja.style.boxShadow = 'none';
    await esperar(rapido ? 460 : 640);
    hero && hero.classList.add('visto');
    el.classList.add('abre');
    await esperar(rapido ? 520 : 640);
    d.classList.remove('con-intro');
    barra.style.transition = '';
    el.remove();
  }
  intro().catch(function () { d.classList.remove('con-intro'); abrirPagina(); });

  /* ---------- barra sólida + copa que se llena ---------- */
  var copa = $('.copita');
  var tick = false;
  function alScroll() {
    tick = false;
    var y = window.scrollY;
    barra.classList.toggle('solida', y > 24);
    d.classList.toggle('pasa-hero', y > window.innerHeight * 0.75);
    if (copa) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      copa.style.setProperty('--lleno', max > 0 ? Math.min(1, y / max).toFixed(3) : 0);
    }
  }
  var tScroll = 0;
  window.addEventListener('scroll', function () {
    if (!tick) { tick = true; requestAnimationFrame(alScroll); }
    d.classList.add('scrolleando'); clearTimeout(tScroll); tScroll = setTimeout(function () { d.classList.remove('scrolleando'); }, 1400);
  }, { passive: true });
  alScroll();

  /* ---------- menú del celu ---------- */
  var bm = $('.barra__menu'), menu = $('#menu');
  var scrollY0 = 0;
  function cerrarMenu() {
    if (menu.hidden) return;
    menu.hidden = true; bm.setAttribute('aria-expanded', 'false'); bm.setAttribute('aria-label', 'Abrir menú');
    d.classList.remove('menu-abierto');
    document.body.style.position = ''; document.body.style.top = ''; document.body.style.width = '';
    window.scrollTo(0, scrollY0);
  }
  function abrirMenu() {
    scrollY0 = window.scrollY;
    menu.hidden = false; bm.setAttribute('aria-expanded', 'true'); bm.setAttribute('aria-label', 'Cerrar menú');
    d.classList.add('menu-abierto');
    document.body.style.position = 'fixed'; document.body.style.top = (-scrollY0) + 'px'; document.body.style.width = '100%';
  }
  bm && bm.addEventListener('click', function () { menu.hidden ? abrirMenu() : cerrarMenu(); });
  menu && menu.addEventListener('click', function (e) {
    var a = e.target.closest('a'); if (!a) return;
    e.preventDefault(); var href = a.getAttribute('href');
    cerrarMenu();
    var dest = $(href); if (dest) setTimeout(function () { dest.scrollIntoView({ behavior: 'smooth' }); }, 30);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrarMenu(); });
  window.addEventListener('resize', function () { if (!celu()) cerrarMenu(); });

  /* ---------- entradas al scrollear ---------- */
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('visto'); io.unobserve(e.target); } });
  }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' }) : null;
  function observar(root) {
    $$('.ent, .foto-ent', root).forEach(function (el) {
      if (el.closest('.hero')) return;
      if (io) io.observe(el); else el.classList.add('visto');
    });
  }
  observar(document);
  window.ChigreObservar = observar;

  /* ---------- arrastrar con el mouse (desde cualquier parte: fotos, textos o botones) ---------- */
  function arrastre(el) {
    if (!el || el.__arrastre) return; el.__arrastre = true;
    var x0 = 0, s0 = 0, activo = false, movio = false, vel = 0, ult = 0, tUlt = 0, raf = 0;
    el.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      if (el.scrollWidth <= el.clientWidth + 2) return;
      activo = true; movio = false; x0 = e.clientX; s0 = el.scrollLeft; ult = e.clientX; tUlt = performance.now(); vel = 0;
      cancelAnimationFrame(raf);
      e.preventDefault();
    });
    window.addEventListener('pointermove', function (e) {
      if (!activo) return;
      var dx = e.clientX - x0;
      if (!movio && Math.abs(dx) > 5) { movio = true; el.classList.add('arrastrando'); el.style.scrollSnapType = 'none'; el.style.scrollBehavior = 'auto'; }
      if (movio) {
        el.scrollLeft = s0 - dx;
        var t = performance.now(); vel = (e.clientX - ult) / Math.max(1, t - tUlt); ult = e.clientX; tUlt = t;
      }
    });
    window.addEventListener('pointerup', function () {
      if (!activo) return; activo = false;
      el.classList.remove('arrastrando');
      if (movio) {
        // inercia suave
        var v = vel * 16;
        (function paso() { if (Math.abs(v) < 0.4) { el.style.scrollSnapType = ''; el.style.scrollBehavior = ''; return; } el.scrollLeft -= v; v *= 0.92; raf = requestAnimationFrame(paso); })();
        var bloquear = function (ev) { ev.stopPropagation(); ev.preventDefault(); };
        el.addEventListener('click', bloquear, { capture: true, once: true });
        setTimeout(function () { el.removeEventListener('click', bloquear, { capture: true }); }, 60);
      }
    });
    el.addEventListener('dragstart', function (e) { e.preventDefault(); });
  }
  $$('[data-arrastre]').forEach(arrastre);
  window.ChigreArrastre = arrastre;

  /* ---------- mazo de fotos del lugar (celu) ---------- */
  var mazo = $('[data-mazo]');
  if (mazo) {
    var fotos = [
      ['img/fachada-s.webp', 'La esquina', '55% 25%'], ['img/salon-s.webp', 'El salón', '50% 50%'], ['img/ambar-s.webp', 'Ámbar', '50% 40%'],
      ['img/barra-s.webp', 'La barra', '50% 50%'], ['img/equipo-s.webp', 'El equipo', '50% 50%'], ['img/esquina-s.webp', 'De noche', '40% 55%']
    ];
    mazo.innerHTML = fotos.map(function (f, i) {
      return '<figure class="mazo__c" style="--r:' + ((i % 2 ? 1 : -1) * (1.5 + (i % 3))) + 'deg;z-index:' + (fotos.length - i) + '"><img src="' + f[0] + '" alt="' + f[1] + '" width="700" height="875" loading="lazy" style="object-position:' + f[2] + '"><figcaption>' + f[1] + '</figcaption></figure>';
    }).join('') + '<p class="mazo__ayuda">Deslizá o tocá para pasar las fotos</p>';
    var cartas = $$('.mazo__c', mazo);
    var orden = cartas.slice();
    function reapilar() { orden.forEach(function (c, i) { c.style.zIndex = orden.length - i; }); }
    function pasar(c, dir) {
      c.style.setProperty('--tx', (dir * 120) + '%');
      c.style.opacity = '0';
      setTimeout(function () { orden.push(orden.shift()); reapilar(); c.style.transition = 'none'; c.style.setProperty('--tx', '0'); c.style.opacity = '1'; void c.offsetWidth; c.style.transition = ''; }, 320);
    }
    var x0 = 0, y0 = 0, act = null, dx = 0, mov = false;
    mazo.addEventListener('pointerdown', function (e) {
      var c = e.target.closest('.mazo__c'); if (!c || c !== orden[0]) return;
      act = c; x0 = e.clientX; y0 = e.clientY; dx = 0; mov = false; c.classList.add('arrastra');
      c.setPointerCapture && c.setPointerCapture(e.pointerId);
    });
    mazo.addEventListener('pointermove', function (e) {
      if (!act) return; dx = e.clientX - x0;
      if (Math.abs(dx) > 6) mov = true;
      act.style.setProperty('--tx', dx + 'px');
    });
    function soltar() {
      if (!act) return; var c = act; act = null; c.classList.remove('arrastra');
      if (!mov || Math.abs(dx) > 70) pasar(c, dx < 0 ? -1 : 1); else c.style.setProperty('--tx', '0');
    }
    mazo.addEventListener('pointerup', soltar);
    mazo.addEventListener('pointercancel', function () { if (act) { act.classList.remove('arrastra'); act.style.setProperty('--tx', '0'); act = null; } });
  }
})();
