/* Chigre · carta, mesa servida, biblioteca de vinos, catas y horarios sobre el kit. */
import { initKit } from '../kit/kit.js?v=1';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const desk = () => window.innerWidth >= 900;
const html = document.documentElement;
const MOMENTO = html.dataset.momento || 'noche';

const ICONO_CAJON = '<svg viewBox="0 0 24 24"><path d="M3 9h18l-1.6 10.2a2 2 0 0 1-2 1.8H6.6a2 2 0 0 1-2-1.8L3 9Z"/><path d="M8 9V4h2v5M14 9V3h2v6"/></svg>';

function plantilla(pedir) {
  return (p, c) => {
    const vs = (p.variantes || []).filter((v) => v && v.precio != null);
    const precio = vs.length > 1 ? `desde ${c.money(Math.min(...vs.map((v) => v.precio)))}` : vs.length === 1 ? c.money(vs[0].precio) : (c.money(p.precio) ?? 'Consultar');
    const desc = vs.length > 1 ? [p.descripcion, vs.map((v) => `${v.nombre} ${c.money(v.precio)}`).join(' · ')].filter(Boolean).join('. ') : p.descripcion;
    const mini = p.foto ? `<img class="it-mini" src="${esc(c.asset(p.foto))}" alt="" width="56" height="56" loading="lazy">` : '';
    return `${mini}<div class="it-cuerpo"><h3 class="it-nom">${esc(p.nombre)}${p.foto ? '<span class="it-dot" aria-label="tiene foto"></span>' : ''}</h3>${desc ? `<p class="it-desc">${esc(desc)}</p>` : ''}</div>
      <div class="it-lado"><span class="it-pre">${esc(precio)}</span>${pedir && c.carrito && c.pedible(p) ? `<div data-kit-qty="${esc(p.id)}"></div>` : ''}</div>`;
  };
}

const kit = await initKit({
  config: 'cliente.json',
  carrito: { label: 'Ver el cajón', icono: ICONO_CAJON },
  cartas: {
    'carta-mediodia': { template: plantilla(true), filtro: (p) => !p.soloNoche },
    'carta-noche': { template: plantilla(true) },
    'carta-bebidas': { template: plantilla(false), pedir: false },
  },
  imagenes: { lqip: 'img/lqip.json' },
});
window.chigreKit = kit;

/* ---------- contador del cajón en la barra ---------- */
function pintarCajon(lineas) {
  const n = (lineas || []).reduce((s, l) => s + (l.cant || 0), 0);
  $$('[data-cajon-n]').forEach((el) => { el.textContent = n; });
}
document.addEventListener('kit:carrito', (e) => pintarCajon(e.detail.lineas));
try { pintarCajon(JSON.parse(localStorage.getItem(`kit:${kit.config.id}:carrito`) || '[]')); } catch (_) { /* sin storage */ }

/* ---------- horarios y "hoy" ---------- */
const DIAS = [['lun', 'Lunes'], ['mar', 'Martes'], ['mie', 'Miércoles'], ['jue', 'Jueves'], ['vie', 'Viernes'], ['sab', 'Sábado'], ['dom', 'Domingo']];
const hs = (fr) => fr.map(([a, b]) => `${a} a ${b}`).join(' y ') + '\u00a0hs';
const hoyKey = (() => { const n = kit.hoy(); const dow = new Date(n + 'T12:00:00').getDay(); return ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'][dow]; })();
function pintarHorarios() {
  const H = kit.config.horarios;
  const ul = $('[data-horarios]');
  if (ul) ul.innerHTML = DIAS.map(([k, n]) => `<li class="${k === hoyKey ? 'es-hoy' : ''}"><span>${n}</span><span>${H[k]?.length ? hs(H[k]) : 'Cerrado'}</span></li>`).join('');
  const est = kit.abierto();
  const hoyFr = H[hoyKey] || [];
  const e = $('[data-estado]');
  if (e) e.innerHTML = est.abierto ? `<span class="punto"></span>Abierto · cierra <span class="nw">${est.cierra} hs</span>` : `<span class="punto no"></span>${est.abre ? `Abrimos a las <span class="nw">${est.abre} hs</span>` : 'Hoy está cerrado'}`;
  $$('[data-hoy-horario]').forEach((el) => { el.textContent = hoyFr.length ? `Hoy: ${hs(hoyFr)}` : 'Martes a sábados, mediodía y noche'; });
  const pie = $('[data-pie-horario]');
  if (pie) pie.innerHTML = 'Martes a sábados<br>' + esc(hs(H.mar || [])) + (JSON.stringify(H.vie) !== JSON.stringify(H.mar) ? `<br>Viernes y sábados hasta las ${esc((H.vie || []).slice(-1)[0]?.[1] || '')} hs` : '');
}
pintarHorarios();

/* ---------- la carta: momento, secciones con índice, páginas cortas y foto al costado ---------- */
const reloj = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
const qMomento = new URLSearchParams(location.search).get('momento');
const kicker = $('[data-carta-kicker]');
if (kicker) kicker.textContent = qMomento ? `La carta · modo ${MOMENTO === 'noche' ? 'noche' : 'mediodía'}` : `Son las ${reloj}: te mostramos la carta ${MOMENTO === 'noche' ? 'de la noche' : 'del mediodía'}`;

let momentoActual = MOMENTO;
function verMomento(m) {
  momentoActual = m;
  $$('[data-momento-btn]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.momentoBtn === m)));
  $$('.carta__pane').forEach((p) => { p.hidden = p.dataset.pane !== m; });
  const pane = $(`.carta__pane[data-pane="${m}"]`);
  const on = pane && $('.kit-carta__panel:not([hidden])', pane);
  fotoSeccion(on);
}
$$('[data-momento-btn]').forEach((b) => b.addEventListener('click', () => verMomento(b.dataset.momentoBtn)));

const LISTA2 = new Set(['tragos', 'sinalcohol', 'copa', 'cafeteria']);
const porPagina = (cat) => (LISTA2.has(cat) ? (desk() ? 14 : 8) : (desk() ? 7 : 6));
const nombresCat = {};

function armarCarta(el) {
  if ($('.sec-cab', el)) return;
  const pedible = el.dataset.kitPedir !== 'false';
  const tabs = $$('.kit-tab', el);
  tabs.forEach((t) => {
    const panel = document.getElementById(t.getAttribute('aria-controls'));
    const n = panel ? $$('.kit-item', panel).length : 0;
    nombresCat[t.dataset.cat] = t.textContent.trim();
    if (!t.querySelector('.n')) t.insertAdjacentHTML('beforeend', `<span class="n">${n}</span>`);
  });
  $$('.kit-carta__panel', el).forEach((panel, idx) => {
    const items = $$('.kit-item', panel);
    items.forEach((it) => { if (it.dataset.photo) it.classList.add('con-mini', 'con-foto'); });
    const cat = items[0]?.dataset.cat || '';
    const nombre = tabs[idx]?.firstChild?.textContent?.trim() || '';
    const llevar = pedible && items.some((it) => it.querySelector('[data-kit-qty]'));
    panel.insertAdjacentHTML('afterbegin', `<div class="sec-cab"><span class="sec-cab__t">${esc(nombre)}</span><span class="sec-cab__n">${items.length} opciones${llevar ? '<br>también para llevar' : ''}</span></div>`);
    const pp = porPagina(cat);
    const pags = Math.ceil(items.length / pp);
    if (LISTA2.has(cat)) {
      const wrap = document.createElement('div'); wrap.className = 'lista2';
      items.forEach((it) => wrap.appendChild(it));
      panel.appendChild(wrap);
      el.classList.add('bebidas2');
    }
    const sig = tabs[idx + 1];
    const nav = document.createElement('div'); nav.className = 'pag';
    nav.innerHTML = `${pags > 1 ? `<div class="pag__nums" role="group" aria-label="Páginas de ${esc(nombre)}">${Array.from({ length: pags }, (_, i) => `<button type="button" data-pag="${i}" aria-label="Página ${i + 1}" ${i === 0 ? 'aria-current="true"' : ''}>${i + 1}</button>`).join('')}</div>` : ''}
      <button type="button" class="pag__sig" data-sig>${pags > 1 ? `Más de ${esc(nombre.toLowerCase())} →` : sig ? `Siguiente: ${esc(sig.firstChild.textContent.trim())} →` : 'Volver al principio ↑'}</button>`;
    panel.appendChild(nav);
    let pag = 0;
    const ir = (p, scroll) => {
      pag = p;
      items.forEach((it, i) => it.classList.toggle('oculto', Math.floor(i / pp) !== pag));
      $$('[data-pag]', nav).forEach((b) => b.toggleAttribute('aria-current', Number(b.dataset.pag) === pag));
      $$('[data-pag]', nav).forEach((b) => b.setAttribute('aria-current', String(Number(b.dataset.pag) === pag)));
      const ultima = pag >= pags - 1;
      $('[data-sig]', nav).textContent = !ultima ? `Más de ${nombre.toLowerCase()} →` : sig ? `Siguiente: ${sig.firstChild.textContent.trim()} →` : 'Volver al principio ↑';
      items.filter((it) => !it.classList.contains('oculto')).forEach((it, i) => { it.style.setProperty('--i', i); it.style.animation = 'none'; void it.offsetWidth; it.style.animation = ''; });
      if (scroll) subirACarta();
    };
    ir(0);
    nav.addEventListener('click', (e) => {
      const b = e.target.closest('[data-pag]');
      if (b) { ir(Number(b.dataset.pag), true); return; }
      if (e.target.closest('[data-sig]')) {
        if (pag < pags - 1) ir(pag + 1, true);
        else if (sig) { sig.click(); subirACarta(); }
        else { tabs[0]?.click(); subirACarta(); }
      }
    });
  });
  if (!el.closest('.carta__pane')?.hidden) fotoSeccion($('.kit-carta__panel:not([hidden])', el));
}
function subirACarta() {
  const g = $('.carta__grid');
  const top = g.getBoundingClientRect().top;
  if (top < 0 || top > window.innerHeight * 0.6) window.scrollTo({ top: window.scrollY + top - (desk() ? 110 : 80), behavior: 'smooth' });
}
document.addEventListener('kit:carta', (e) => { if (e.detail.el.closest('.carta')) armarCarta(e.detail.el); });
document.addEventListener('click', (e) => { const t = e.target.closest('.carta .kit-tab'); if (t) setTimeout(() => fotoSeccion(document.getElementById(t.getAttribute('aria-controls'))), 0); });

// foto del plato al costado (desktop): cambia al pasar el mouse
const fImg = $('[data-carta-foto]'), fNom = $('[data-carta-foto-nom]');
const ilus = { pizzas: 'img/margarita.webp', tapeo: 'img/empanadas2.webp', almuerzos: 'img/albondigas.webp', postres: 'img/velas.webp', cafeteria: 'img/barra-s.webp', tragos: 'img/sirviendo.webp', sinalcohol: 'img/sirviendo.webp', copa: 'img/sirviendo.webp', 'v-blancos': 'img/pared-s.webp', 'v-nre': 'img/pared-s.webp', 'v-tintos': 'img/pared-s.webp' };
const leyendas = { postres: 'Un postre y una copa también es un buen plan', cafeteria: 'La barra al mediodía', tragos: 'Con alcohol', sinalcohol: 'Sin alcohol', copa: 'Vino por copa', 'v-blancos': 'La pared de vinos', 'v-nre': 'La pared de vinos', 'v-tintos': 'La pared de vinos' };
let fotoActual = '';
function ponerFoto(src, nom) {
  if (!fImg || !src || src === fotoActual) { if (fNom && nom) fNom.textContent = nom; return; }
  fotoActual = src;
  fImg.classList.add('cambia');
  const pre = new Image(); pre.onload = pre.onerror = () => { fImg.src = src; fImg.classList.remove('cambia'); if (fNom) fNom.textContent = nom; };
  pre.src = src;
}
function fotoSeccion(panel) {
  if (!panel) return;
  if (panel.closest('.carta__pane')?.dataset.pane !== momentoActual) return;
  const it = $('.kit-item[data-photo]:not(.oculto)', panel);
  const cat = $('.kit-item', panel)?.dataset.cat;
  if (it) ponerFoto(it.dataset.photo, $('.it-nom', it)?.textContent);
  else ponerFoto(ilus[cat] || 'img/salon-s.webp', leyendas[cat] || nombresCat[cat] || '');
}
let rafF = 0;
$('.carta__cartas')?.addEventListener('pointerover', (e) => {
  if (e.pointerType !== 'mouse') return;
  const it = e.target.closest('.kit-item[data-photo]'); if (!it) return;
  cancelAnimationFrame(rafF); rafF = requestAnimationFrame(() => ponerFoto(it.dataset.photo, $('.it-nom', it)?.textContent));
});

(kit.cartas || []).forEach((c) => { if (c.el.closest('.carta') && $('.kit-carta__panel', c.el) && !$('.sec-cab', c.el)) armarCarta(c.el); });
verMomento(MOMENTO);

/* ---------- productos (para la mesa servida y la biblioteca) ---------- */
let productos = [];
async function cargarProductos() {
  try { productos = await kit.store.getProductos(); } catch (err) { console.warn('[chigre] productos', err); productos = []; }
  pintarBiblioteca(); pintarFichaMesa(pinActual, true);
}

/* ---------- la mesa servida ---------- */
const ficha = $('[data-ficha-mesa]');
const escena = $('.mesa__escena');
let pinActual = 'tabla-de-quesos';
function pintarFichaMesa(id, forzar) {
  if (!ficha || id === 'vino') return;
  if (id === pinActual && !forzar && ficha.dataset.listo) return;
  const p = productos.find((x) => x.id === id); if (!p) return;
  pinActual = id; ficha.dataset.listo = '1';
  const img = $('[data-fm-foto]', ficha);
  if (p.foto) { img.src = kit.asset(p.foto); img.style.objectFit = 'cover'; img.style.background = ''; }
  else { img.src = 'img/copa-vino.png'; img.style.objectFit = 'contain'; img.style.background = '#F1E2D3'; }
  $('[data-fm-nom]', ficha).textContent = p.nombre;
  $('[data-fm-desc]', ficha).textContent = p.descripcion || '';
  $('[data-fm-precio]', ficha).textContent = kit.money(p.precio) || 'Consultar';
  $('[data-fm-qty]', ficha).innerHTML = kit.pedible(p) ? `<span data-kit-qty="${esc(p.id)}"></span>` : '';
  kit.carrito?.sync(ficha);
  ficha.classList.remove('cambia'); void ficha.offsetWidth; ficha.classList.add('cambia');
  $$('.pin').forEach((b) => b.classList.toggle('is-on', b.dataset.pin === id));
  ubicarFicha();
}
function ubicarFicha() {
  return;
  if (!desk() || !ficha || !escena) { ficha && (ficha.style.left = ficha.style.top = ''); return; }
  const pin = $(`.pin[data-pin="${pinActual}"]`); if (!pin) return;
  const re = escena.getBoundingClientRect(), rp = pin.getBoundingClientRect();
  const w = ficha.offsetWidth || 300, h = ficha.offsetHeight || 290;
  const px = rp.left - re.left + rp.width / 2, py = rp.top - re.top + rp.height / 2;
  let x = px + 34; if (x + w > re.width) x = px - 34 - w; x = Math.max(0, Math.min(re.width - w, x));
  let y = py - h / 2; y = Math.max(-20, Math.min(re.height - h + 20, y));
  ficha.style.left = x + 'px'; ficha.style.top = y + 'px';
}
$$('.pin').forEach((b, i) => {
  b.style.setProperty('--i', i);
  const ir = () => { if (b.dataset.pin === 'vino') return; pintarFichaMesa(b.dataset.pin); };
  b.addEventListener('click', () => { if (b.dataset.pin === 'vino') { $('#vinoteca').scrollIntoView({ behavior: 'smooth' }); return; } ir(); });
  b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') ir(); });
  b.addEventListener('focus', ir);
});
window.addEventListener('resize', () => requestAnimationFrame(ubicarFicha));
// en el celu, la mesa arranca mostrando el centro
const ms = $('.mesa__scroll'); if (ms && !desk()) requestAnimationFrame(() => { ms.scrollLeft = (ms.scrollWidth - ms.clientWidth) * 0.42; });

/* ---------- la biblioteca de vinos ---------- */
const TIPOS = [['vt-blancos', 'Blancos', 'blancos', 'Blanco'], ['vt-naranjos', 'Naranjos', 'naranjos', 'Naranjo'], ['vt-rosados', 'Rosados', 'rosados', 'Rosado'], ['vt-espumantes', 'Espumantes', 'espumantes', 'Espumante'], ['vt-tintos', 'Tintos', 'tintos', 'Tinto']];
const fil = { tipo: '', cepa: '', precio: '', q: '' };
const bib = $('[data-biblioteca]');
const vf = $('[data-vt-ficha]');
let sel = null, nSel = 1;
const vinos = () => productos.filter((p) => p.categoria?.startsWith('vt-'));
const corto = (n) => { const w = n.replace(/[()]/g, '').split(/\s+/); return w[0].length < 6 && w[1] ? `${w[0]} ${w[1]}` : w[0]; };
const precioCorto = (n) => (n == null ? '—' : n.toLocaleString('es-AR'));
const hash = (s) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function pintarCepas() {
  const s = $('[data-cepa]'); if (!s) return;
  const cuenta = {}; vinos().forEach((v) => { if (v.cepa) cuenta[v.cepa] = (cuenta[v.cepa] || 0) + 1; });
  const actual = s.value;
  s.innerHTML = '<option value="">Todas las cepas</option>' + Object.entries(cuenta).sort((a, b) => b[1] - a[1]).map(([c, n]) => `<option value="${esc(c)}">${esc(c)} (${n})</option>`).join('');
  s.value = actual;
}
function pasa(v) {
  if (fil.tipo && v.categoria !== fil.tipo) return false;
  if (fil.cepa && v.cepa !== fil.cepa) return false;
  if (fil.precio) { const [a, b] = fil.precio.split('-').map(Number); if (v.precio == null || v.precio < a || v.precio > b) return false; }
  if (fil.q && !norm(`${v.nombre} ${v.bodega || ''} ${v.cepa || ''} ${v.zona || ''}`).includes(norm(fil.q))) return false;
  return true;
}
function botellaHTML(v, i, t) {
  const h = 104 + (hash(v.id) % 4) * 6;
  const off = v.disponible === false;
  return `<button type="button" class="botella t-${t[2]}${sel === v.id ? ' is-sel' : ''}${off ? ' is-off' : ''}" style="--h:${h}px;--i:${Math.min(i, 24)}" data-vino="${esc(v.id)}" aria-label="${esc(v.nombre)}, ${off ? 'sin stock' : '$' + precioCorto(v.precio)}">
    <span class="botella__cuello"></span><span class="botella__cuerpo"><span class="botella__precio">${precioCorto(v.precio)}</span><span class="botella__etq">${esc(corto(v.nombre))}</span></span></button>`;
}
function pintarBiblioteca() {
  if (!bib) return;
  const V = vinos();
  $$('[data-n]').forEach((b) => { b.textContent = V.filter((v) => v.categoria === b.dataset.n).length; });
  const tot = $('[data-total-vinos]'); if (tot) tot.textContent = V.length;
  pintarCepas();
  const grupos = TIPOS.map((t) => ({ t, items: V.filter((v) => v.categoria === t[0] && pasa(v)) })).filter((g) => g.items.length);
  bib.innerHTML = grupos.length ? grupos.map((g) => `<div class="estante">
      <div class="estante__t">${g.t[1]} <small>${g.items.length} ${g.items.length === 1 ? 'etiqueta' : 'etiquetas'}</small></div>
      <div class="estante__fila">${g.items.map((v, i) => botellaHTML(v, i, g.t)).join('')}</div><div class="estante__tabla"></div></div>`).join('')
    : '<p class="biblioteca__vacia">No hay vinos con esos filtros. Probá con otra cepa o precio.</p>';
  $$('.estante__fila', bib).forEach((f) => {
    window.ChigreArrastre && window.ChigreArrastre(f);
    const marcar = () => { f.classList.toggle('desborda', f.scrollWidth > f.clientWidth + 4); f.classList.toggle('al-final', f.scrollLeft + f.clientWidth >= f.scrollWidth - 4); };
    marcar(); f.addEventListener('scroll', marcar, { passive: true });
  });
  if (sel && !V.some((v) => v.id === sel)) sel = null;
  if (sel) pintarFichaVino(sel, false);
}
function pintarFichaVino(id, abrir = true) {
  const v = productos.find((x) => x.id === id); if (!v || !vf) return;
  if (sel !== id) nSel = 1;
  sel = id;
  $$('.botella[data-vino]', bib).forEach((b) => b.classList.toggle('is-sel', b.dataset.vino === id));
  const t = TIPOS.find((x) => x[0] === v.categoria) || TIPOS[4];
  $('[data-vt-vacia]', vf).hidden = true; $('[data-vt-llena]', vf).hidden = false;
  const bot = $('[data-vt-bot]', vf); bot.className = `botella botella--grande t-${t[2]}`;
  $('.botella__precio', bot).textContent = precioCorto(v.precio); $('.botella__etq', bot).textContent = corto(v.nombre);
  $('[data-vt-tipo]', vf).textContent = [t[3], v.cepa && v.cepa !== 'Blend' ? v.cepa : (v.cepa === 'Blend' && ['vt-tintos', 'vt-blancos'].includes(v.categoria) ? 'Blend' : '')].filter(Boolean).join(' · ');
  $('[data-vt-nom]', vf).textContent = v.nombre;
  const filas = [];
  if (v.bodega) filas.push(['Bodega', esc(v.bodega)]);
  if (v.zona) filas.push(['Zona', esc(v.zona)]);
  filas.push(['Para llevar', `<b>${esc(kit.money(v.precio) || 'Consultar')}</b>`]);
  if (v.precioMesa && v.precio && v.precioMesa > v.precio) filas.push(['En la mesa', `${esc(kit.money(v.precioMesa))} · <span class="ahorro">llevándolo ahorrás ${esc(kit.money(v.precioMesa - v.precio))}</span>`]);
  $('[data-vt-datos]', vf).innerHTML = filas.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('');
  $('[data-vt-nota]', vf).textContent = v.nota || '';
  $('[data-vt-n]', vf).textContent = nSel;
  const add = $('[data-vt-add]', vf);
  const off = v.disponible === false || !kit.pedible(v);
  add.disabled = off; add.textContent = off ? 'Sin stock por ahora' : `Al cajón · ${kit.money((v.precio || 0) * nSel)}`;
  if (abrir && !desk()) abrirHoja();
}
let velo = null, sy = 0;
function abrirHoja() {
  if (vf.classList.contains('abierta')) return;
  vf.classList.add('abierta'); html.classList.add('ficha-abierta');
  velo = document.createElement('div'); velo.className = 'vt-velo'; velo.addEventListener('click', cerrarHoja); document.body.appendChild(velo);
  sy = window.scrollY; document.body.style.position = 'fixed'; document.body.style.top = `-${sy}px`; document.body.style.width = '100%';
  $('[data-vt-cerrar]', vf).focus({ preventScroll: true });
}
function cerrarHoja() {
  if (!vf.classList.contains('abierta')) return;
  vf.classList.remove('abierta'); html.classList.remove('ficha-abierta'); velo?.remove(); velo = null;
  document.body.style.position = ''; document.body.style.top = ''; document.body.style.width = ''; window.scrollTo(0, sy);
}
bib?.addEventListener('click', (e) => { const b = e.target.closest('[data-vino]'); if (b) pintarFichaVino(b.dataset.vino); });
vf?.addEventListener('click', (e) => {
  if (e.target.closest('[data-vt-cerrar]')) { if (desk()) { sel = null; $('[data-vt-vacia]', vf).hidden = false; $('[data-vt-llena]', vf).hidden = true; $$('.botella.is-sel', bib).forEach((b) => b.classList.remove('is-sel')); } else cerrarHoja(); return; }
  if (e.target.closest('[data-vt-mas]')) { nSel = Math.min(24, nSel + 1); pintarFichaVino(sel, false); }
  if (e.target.closest('[data-vt-menos]')) { nSel = Math.max(1, nSel - 1); pintarFichaVino(sel, false); }
  const add = e.target.closest('[data-vt-add]');
  if (add && sel && !add.disabled) {
    kit.carrito.agregar(sel, nSel, { origen: add });
    add.textContent = nSel > 1 ? `¡${nSel} al cajón!` : '¡Al cajón!';
    setTimeout(() => { if (!desk()) cerrarHoja(); pintarFichaVino(sel, false); }, 900);
  }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarHoja(); });
window.addEventListener('resize', () => { if (desk()) cerrarHoja(); });
function setTipo(t) {
  fil.tipo = t;
  $$('[data-tipo]').forEach((c) => { const on = c.dataset.tipo === t; c.classList.toggle('is-on', on); c.setAttribute('aria-checked', String(on)); });
  pintarBiblioteca();
}
$$('[data-tipo]').forEach((c) => c.addEventListener('click', () => setTipo(c.dataset.tipo)));
$('[data-cepa]')?.addEventListener('change', (e) => { fil.cepa = e.target.value; pintarBiblioteca(); });
$('[data-precio]')?.addEventListener('change', (e) => { fil.precio = e.target.value; pintarBiblioteca(); });
let tq = 0; $('[data-buscar]')?.addEventListener('input', (e) => { clearTimeout(tq); tq = setTimeout(() => { fil.q = e.target.value.trim(); pintarBiblioteca(); }, 160); });
$$('[data-filtro]').forEach((a) => a.addEventListener('click', () => setTipo(a.dataset.filtro)));

/* ---------- catas ---------- */
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DSEM = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DCORTO = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const fechaCorta = (f, h) => { const d = new Date(f + 'T12:00:00'); return `${DCORTO[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}${h ? ` · ${h} hs` : ''}`; };
const fechaLarga = (f, h) => { const d = new Date(f + 'T12:00:00'); return `${DSEM[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}${h ? ` · ${h} hs` : ''}`; };
async function cupoDe(ev) {
  try { const ts = await kit.reservas.turnos(ev.fecha, 1); const t = ts.find((x) => x.hora === ev.hora); if (t) return { libres: t.libres, cap: t.capacidad || ev.cupo }; } catch (_) { /* sin dato */ }
  return { libres: ev.cupo, cap: ev.cupo };
}
async function pintarCatas() {
  const evs = kit.eventos ? kit.eventos.proximos() : [];
  const box = $('[data-catas-agenda]'); if (!box) return;
  if (!evs.length) {
    box.innerHTML = '<p class="catas__vacio">Pronto anunciamos la próxima cata. Pedí que te avisemos por WhatsApp.</p>';
    return;
  }
  const items = await Promise.all(evs.slice(0, 3).map(async (e, i) => {
    const c = await cupoDe(e);
    const d = new Date(e.fecha + 'T12:00:00');
    const pct = Math.round(((c.cap - c.libres) / c.cap) * 100);
    const lleno = c.libres <= 0;
    return { e, c, html: `<article class="cata ent${i === 0 ? ' cata--prox' : ''}" style="--d:${i}">
      <div class="cata__fecha"><span class="cata__dia">${esc(DCORTO[d.getDay()])}</span><b>${d.getDate()}</b><span class="cata__mes">${esc(MESES[d.getMonth()].slice(0, 3))}</span></div>
      <div class="cata__body">
        ${i === 0 ? '<span class="cata__tag mono">La próxima</span>' : ''}
        <h4 class="cata__nom">${esc(e.nombre)}</h4>
        ${e.descripcion ? `<p class="cata__desc">${esc(e.descripcion)}</p>` : ''}
        <p class="cata__datos mono">${esc(DSEM[d.getDay()])} · ${esc(e.hora)} hs · ${e.precio ? esc(kit.money(e.precio)) + ' por persona' : 'valor a confirmar'}</p>
        <div class="cata__cupo"><div class="cata__barra"><i style="--p:${pct}%"></i></div><span>${lleno ? '<b>Cupo completo</b>' : `Quedan <b>${c.libres}</b> de ${c.cap} lugares`}</span></div>
      </div>
      <button type="button" class="btn ${i === 0 ? 'btn--rojo' : 'btn--linea-vino'} cata__btn" data-anotar="${esc(e.id)}"${lleno ? ' disabled' : ''}>${lleno ? 'Completo' : 'Anotarme'}</button>
    </article>` };
  }));
  box.innerHTML = items.map((x) => x.html).join('');
  $$('[data-anotar]', box).forEach((b) => { const e = evs.find((x) => x.id === b.dataset.anotar); b.onclick = () => kit.reservas.abrir({ fecha: e.fecha, hora: e.hora, personas: 2 }); });
  window.ChigreObservar && window.ChigreObservar(box);
  const p = items[0];
  const hn = $('[data-cata-nombre]'), hf = $('[data-cata-fecha]');
  if (hn) hn.textContent = p.e.nombre;
  if (hf) hf.textContent = `${fechaCorta(p.e.fecha, p.e.hora)} · quedan ${p.c.libres} lugares`;
}
document.addEventListener('kit:eventos', pintarCatas);

/* ---------- reseñas (solo reales, con su puntaje) ---------- */
const RESENAS = [];
function pintarResenas() {
  const f = $('[data-resenas]'); if (!f) return;
  if (!RESENAS.length) { $('#resenas')?.remove(); return; }
  f.innerHTML = RESENAS.map((r) => `<article class="resena"><div class="resena__est"><span class="estrellas" aria-hidden="true">${'★'.repeat(r.estrellas)}${'☆'.repeat(5 - r.estrellas)}</span>${r.estrellas}/5${r.cuando ? ' · ' + esc(r.cuando) : ''}</div><p class="resena__txt">“${esc(r.texto)}”</p><span class="resena__aut">${esc(r.autor)}</span></article>`).join('')
    + `<a class="resena resena--cta" href="https://www.google.com/maps/search/?api=1&query=Chigre+Ramallo+2904+Saavedra" target="_blank" rel="noopener"><b>747 reseñas, 5,0 de promedio.</b><p>Leelas todas en Google Maps →</p></a>`;
}
pintarResenas();

/* ---------- arranque ---------- */
kit.store.onChange(() => { cargarProductos(); pintarCatas(); });
await cargarProductos();
pintarCatas();
window.ChigreObservar && window.ChigreObservar(document);
