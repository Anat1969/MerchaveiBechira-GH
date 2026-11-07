import { BOOK, CHAPTERS, NARRATIVES, FAMILIES, DIM_MODEL, CHAPTER_MODELS } from '../data/book.js';

// סדר הפרקים לפי שלוש המשפחות של הכריכה
{ const order = FAMILIES.flatMap(f => f.chapters); CHAPTERS.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id)); CHAPTERS.forEach((c, i) => { c.n = i + 1; c.family = FAMILIES.find(f => f.chapters.includes(c.id)); }); }
import { attachFx, hexA } from './fx.js';

// ================= נתונים =================
const LS = 'mb.custom.v1', LSI = 'mb.userimg.v1';
const lsGet = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(d)); } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
const CUSTOM = lsGet(LS, {});
const USERIMG = lsGet(LSI, {});
CHAPTERS.forEach(ch => (CUSTOM[ch.id] || []).forEach(it => ch.items.push({ ...it, custom: true })));

const DIMS = BOOK.dims;
const DEFAULT_DIM = { philosophy: 2, psychology: 3, faith: 2, words: 2, climate: 3, forces: 3 };
const ALL = [];
let byId = {};
function reindex() {
  ALL.length = 0;
  CHAPTERS.forEach(ch => ch.items.forEach((it, i) => {
    it.ch = ch; it.i = i;
    it.page = /^p\d+$/.test(it.img || '') ? parseInt(it.img.slice(1), 10) : null;
    ALL.push(it);
  }));
  byId = Object.fromEntries(ALL.map(it => [it.id, it]));
}
reindex();
const CH = Object.fromEntries(CHAPTERS.map(c => [c.id, c]));

// הסולם של כל פרק: הפרמטר של התורה עצמה, או הממד שמשתנה בו הכי הרבה
function scaleOf(ch) {
  const sc = ch.scale || { label: `ממד ה${DIMS[DEFAULT_DIM[ch.id] ?? 3].k}`, dim: DEFAULT_DIM[ch.id] ?? 3 };
  const val = it => sc.key === 'hz' ? it.hz : sc.key === 'mass' ? it.mass : sc.key === 'idx' ? it.i + 1 : sc.dim !== undefined ? it.dna[sc.dim] : (it.sv ?? it.i + 1);
  const vs = ch.items.map(val).filter(v => v != null);
  const min = Math.min(...vs), max = Math.max(...vs);
  const f = v => max === min ? .5 : sc.log ? (Math.log(v) - Math.log(min)) / (Math.log(max) - Math.log(min)) : (v - min) / (max - min);
  const inv = x => sc.log ? Math.exp(Math.log(min) + x * (Math.log(max) - Math.log(min))) : min + x * (max - min);
  const text = (v, it) => it?.svt ? it.svt : sc.dim !== undefined ? `${(+v).toFixed(1).replace('.0', '')} מתוך 5 · ${word(sc.dim, v)}` : `${+(+v).toFixed(v < 10 ? 2 : 0)}${sc.unit ? ' ' + sc.unit : ''}`;
  return { ...sc, val, f, inv, text, min, max };
}

// ================= כלים =================
const app = document.getElementById('app');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const lines = s => esc(s).split(/(?<=[.!?״"])\s+(?=\S)/).join('<br>');
const src = id => !id ? '' : /^(https?:|data:)/.test(id) ? id : `img/${id}.jpg`;
const pageSrc = n => `pages/p${String(n).padStart(3, '0')}.jpg`;
const hash = s => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const avg = items => DIMS.map((_, d) => items.reduce((s, it) => s + it.dna[d], 0) / items.length);
const dist = (a, b) => Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));
function word(d, v) { return v >= 4 ? DIMS[d].hi : v <= 2 ? DIMS[d].lo : 'איזון'; }
const thumbStyle = (it, ch = it.ch) => (USERIMG[it.id] || it.img) ? `background-image:url('${USERIMG[it.id] || src(it.img)}')` : `background:${ch.color}`;

// מה כל ממד אומר באדריכלות: אותן נוסחאות שבונות את החדר בסטודיו
function arch(d) {
  const [L, M, O, T, H] = d;
  const sky = L >= 4 ? 35 + (L - 3) * 12 : L <= 2 ? 5 : 18;
  return [
    `פתח תקרה ${Math.round(sky)}% מהרוחב`,
    `קיר בעובי ${Math.round((0.12 + M * 0.14) * 100)} ס״מ${M <= 2 ? ', מורם מהקרקע' : ''}`,
    `גובה ${(2.5 + O * 0.45).toFixed(1)} מ׳, ${Math.max(0, Math.round(O) - 1)} פתחים בקיר`,
    `${Math.round(T * 3)} עמודים בקצב, חדר באורך ${(6 + T * 2.6).toFixed(0)} מ׳`,
    `${['גוונים קרירים', 'אפור קריר', 'ניטרלי', 'גוונים חמים', 'עץ ואדמה'][Math.min(4, Math.max(0, Math.round(H) - 1))]}`,
  ];
}

// הרווחה של האדם: שני הממדים הבולטים של הדוגמה, ומה הם עושים לגוף ולנפש
function wellOf(dna) {
  return DIMS.map((d, k) => ({ k, v: dna[k], s: Math.abs(dna[k] - 3) })).filter(x => x.s >= 1).sort((a, b) => b.s - a.s).slice(0, 2)
    .map(x => ({ k: x.k, v: x.v, t: x.v > 3 ? DIM_MODEL[x.k].high : DIM_MODEL[x.k].low }));
}
// מה השתנה לעומת הדוגמה הקודמת בסולם של הפרק
function changeFrom(prev, it) {
  return DIMS.map((d, k) => ({ k, a: prev.dna[k], b: it.dna[k] })).filter(x => x.a !== x.b)
    .sort((x, y) => Math.abs(y.b - y.a) - Math.abs(x.b - x.a));
}
function modelBlock(ch, compact) {
  const m = CHAPTER_MODELS[ch.id]; if (!m) return '';
  return `<div class="model-b">
    <div class="lab">הפרמטרים של התחום</div>
    <div class="mparams">${m.params.map(p => `<div><b>${esc(p.n)}</b><span>${esc(p.d)}</span></div>`).join('')}</div>
    <div class="lab">איך הם הופכים לאדריכלות</div>
    <div class="mrules">${m.rules.map(([p, k, dir, why]) => `<div><b>${esc(p)}</b><i class="${dir > 0 ? 'up' : dir < 0 ? 'down' : 'eq'}">${dir > 0 ? 'עולה' : dir < 0 ? 'יורד' : 'קובע'}</i><b class="dim">${DIMS[k].k}</b><span>${esc(why)}</span></div>`).join('')}</div>
    ${compact ? '' : `<div class="lab">מה משתנה בתוך הפרק</div><p class="body">${lines(m.within)}</p>`}
    <div class="well"><div class="lab">הרווחה של האדם</div><p>${lines(m.wellbeing)}</p></div>
  </div>`;
}

function resonances(dna, exceptCh, n = 3, exceptId) {
  return ALL.filter(o => o.ch !== exceptCh && o.id !== exceptId)
    .map(o => ({ o, d: dist(dna, o.dna) + (hash(o.id) % 100) / 1000 }))
    .sort((a, b) => a.d - b.d).slice(0, n).map(({ o, d }) => {
      const same = DIMS.map((_, k) => k).filter(k => Math.round(dna[k]) === o.dna[k] && o.dna[k] !== 3);
      return { o, d, rule: same.length ? same.slice(0, 3).map(k => word(k, o.dna[k])).join(', ') : 'פרופיל קרוב בכל חמשת הממדים' };
    });
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toast.k); toast.k = setTimeout(() => t.classList.remove('on'), 2200);
}

// ================= רכיבים =================
function live(imgSrc, mode, opt = {}) {
  const el = document.createElement('div');
  el.className = 'live';
  if (imgSrc) {
    el.innerHTML = `<img class="blurbg" src="${imgSrc}" alt="" aria-hidden="true"><img class="main" src="${imgSrc}" alt="${esc(opt.alt || '')}">`;
    el.classList.add('zoomable');
    el.addEventListener('click', () => lightbox({ img: imgSrc, title: opt.alt, page: opt.page, color: opt.color }));
  }
  el.insertAdjacentHTML('beforeend', '<div class="grain"></div>');
  el.fx = attachFx(el, mode, { ...opt, solo: !imgSrc });
  return el;
}

function lightbox({ img, title, page, color, html, onClose }) {
  document.querySelector('.lb')?.remove();
  const lb = document.createElement('div');
  lb.className = 'lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true');
  lb.style.setProperty('--c', color || '#141414');
  lb.innerHTML = `<div class="lb-in">
    <div class="lb-bar"><b>${esc(title || '')}</b>
      <span class="lb-tools">${page ? `<button class="lnk" data-page="${page}">הדף המקורי בספר, עמוד ${page}</button>` : ''}
      <button class="x" data-d="סגירה. גם Esc או לחיצה ברקע">סגירה</button></span></div>
    <div class="lb-body">${html || `<img src="${img}" alt="${esc(title || '')}">`}</div></div>`;
  document.body.appendChild(lb);
  const close = () => { lb.remove(); document.removeEventListener('keydown', onKey); onClose?.(); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  lb.addEventListener('click', e => {
    if (e.target === lb || e.target.closest('.x')) close();
    const p = e.target.closest('[data-page]');
    if (p) { const n = +p.dataset.page; lb.querySelector('.lb-body').innerHTML = `<img class="pg" src="${pageSrc(n)}" alt="עמוד ${n}">`; p.remove(); lb.querySelector('.lb-bar b').textContent = `${title || ''} · עמוד ${n} בספר המקורי`; }
  });
  const im = lb.querySelector('.lb-body img');
  if (im) im.onload = () => im.style.setProperty('--nw', im.naturalWidth);
  return { close };
}

// גרף עכביש. editable: גוררים את הנקודות של הסדרה הראשית.
function radar(series, { size = 230, editable = false, labels = true } = {}) {
  const c = size / 2, R = size / 2 - 32, n = DIMS.length;
  const pt = (k, v) => { const a = -Math.PI / 2 + k * 2 * Math.PI / n; return [c + Math.cos(a) * R * v / 5, c + Math.sin(a) * R * v / 5]; };
  const poly = vals => vals.map((v, k) => pt(k, v).join(',')).join(' ');
  const main = series.find(s => s.main);
  return `<svg class="radar ${editable ? 'edit' : ''}" viewBox="0 0 ${size} ${size}" data-size="${size}" role="img" aria-label="גרף עכביש של חמשת הממדים">
    ${[1, 2, 3, 4, 5].map(l => `<polygon points="${poly(Array(n).fill(l))}" fill="none" stroke="#e6e2da" stroke-width="${l === 5 ? 1.2 : .8}"/>`).join('')}
    ${DIMS.map((d, k) => { const [x, y] = pt(k, 5), [lx, ly] = pt(k, 6.2); return `<line x1="${c}" y1="${c}" x2="${x}" y2="${y}" stroke="#e6e2da"/>${labels ? `<text x="${lx}" y="${ly + 4}" text-anchor="middle" class="rl">${d.k}</text>` : ''}`; }).join('')}
    <circle cx="${c}" cy="${c}" r="2.5" fill="#999"/>
    ${series.filter(s => !s.main).map(s => `<polygon points="${poly(s.vals)}" fill="${hexA(s.color, .1)}" stroke="${s.color}" stroke-width="1.4" stroke-dasharray="4 3"/>`).join('')}
    ${main ? `<polygon class="mainp" points="${poly(main.vals)}" fill="${hexA(main.color, .26)}" stroke="${main.color}" stroke-width="2.4"/>` : ''}
    ${editable && main ? main.vals.map((v, k) => { const [x, y] = pt(k, v); return `<circle class="hdl" data-k="${k}" cx="${x}" cy="${y}" r="8" fill="#fff" stroke="${main.color}" stroke-width="2.5"/>`; }).join('') : ''}
  </svg>`;
}
function bindRadar(svgEl, vals, color, onChange) {
  const size = +svgEl.dataset.size, c = size / 2, R = size / 2 - 32, n = DIMS.length;
  let k = null;
  const toVal = e => {
    const r = svgEl.getBoundingClientRect(), sx = size / r.width;
    const x = (e.clientX - r.left) * sx - c, y = (e.clientY - r.top) * sx - c;
    const a = -Math.PI / 2 + k * 2 * Math.PI / n;
    const proj = x * Math.cos(a) + y * Math.sin(a);
    return Math.max(1, Math.min(5, Math.round((proj / R) * 5 * 2) / 2));
  };
  svgEl.addEventListener('pointerdown', e => { const h = e.target.closest('.hdl'); if (!h) return; k = +h.dataset.k; svgEl.setPointerCapture(e.pointerId); e.preventDefault(); });
  svgEl.addEventListener('pointermove', e => { if (k === null) return; const v = toVal(e); if (v !== vals[k]) { vals[k] = v; onChange(vals.slice(), true); } });
  svgEl.addEventListener('pointerup', () => { if (k !== null) { k = null; onChange(vals.slice(), false); } });
}

// ================= סרגלי ניווט קבועים =================
const NAV = { view: 'home', ch: null, it: null, collapsed: false };
function chapterBar() {
  const el = document.getElementById('chbar');
  const i = CHAPTERS.indexOf(NAV.ch);
  const prev = CHAPTERS[(i - 1 + CHAPTERS.length) % CHAPTERS.length], next = CHAPTERS[(i + 1) % CHAPTERS.length];
  el.innerHTML = `
    <a class="step" href="${chHref(i >= 0 ? prev : CHAPTERS[CHAPTERS.length - 1])}" data-d="הפרק הקודם">‹</a>
    <div class="chs2">
      ${FAMILIES.map(f => `<span class="famrow ${NAV.ch?.family === f ? 'on' : ''}" style="grid-column: span ${f.chapters.length}" data-d="${esc(`מרחבים ${f.name}: ${f.sub}. החלוקה מהכריכה של הספר.`)}">מרחבים ${f.name} <small>${f.sub}</small></span>`).join('')}
      ${CHAPTERS.map(c => `<a href="${chHref(c)}" data-ch="${c.id}" class="${c === NAV.ch ? 'on' : ''} ${NAV.view === 'atlas' && atlasState.on.size && !atlasState.on.has(c.id) ? 'off' : ''}" style="--c:${c.color}" title="${esc(c.title)}"><b>${c.n}</b>${c.lens}</a>`).join('')}
    </div>
    <a class="step" href="${chHref(i >= 0 ? next : CHAPTERS[0])}" data-d="הפרק הבא">›</a>`;
}
function chHref(c) {
  if (NAV.view === 'studio') return `#/studio/${c.items[0].id}`;
  if (NAV.view === 'atlas') return `#/atlas/ch:${c.id}`;
  if (NAV.view === 'c' && c === NAV.ch && !NAV.it) return `#/c/${c.id}/~`;
  return `#/c/${c.id}`;
}
function exampleRow() {
  const el = document.getElementById('exrow');
  const ch = NAV.ch;
  const show = ch && (NAV.view === 'c' || NAV.view === 'studio') && !NAV.collapsed;
  el.hidden = !show;
  document.body.classList.toggle('has-ex', !!show);
  if (!show) return;
  const base = NAV.view === 'studio' ? '#/studio/' : `#/c/${ch.id}/`;
  const seq = NAV.view === 'studio' ? ch.items : [null, ...ch.items];
  const pos = seq.indexOf(NAV.it ?? null);
  const href = x => x ? base + x.id : `#/c/${ch.id}`;
  const prev = seq[pos - 1], next = seq[pos + 1];
  el.style.setProperty('--c', ch.color);
  el.innerHTML = `
    <a class="step ${pos <= 0 ? 'dis' : ''}" href="${pos > 0 ? href(prev) : '#'}" data-d="הדוגמה הקודמת">‹</a>
    <div class="exs">
      ${NAV.view === 'c' ? `<a href="#/c/${ch.id}" class="gate ${!NAV.it ? 'on' : ''}"><i>${ch.n}</i><span>שער הפרק</span></a>` : ''}
      ${ch.items.map(x => `<a href="${base}${x.id}" class="${x === NAV.it ? 'on' : ''}"><i class="th" style="${thumbStyle(x, ch)}"><b>${x.i + 1}</b></i><span>${esc(x.name)}</span></a>`).join('')}
      ${NAV.view === 'c' ? (ch.closed ? `<span class="closed" data-d="${esc(`סדרה סגורה: ${ch.items.length} פריטים בטבע, אין מה להוסיף. דוגמה: שבעה תווים בסולם.`)}">סדרה סגורה</span>` : `<button class="addx" id="addBtn" data-d="מוסיפים מושג חדש לפרק, עם פרומפט ותמונה. דוגמה: מילה מעוד שפה.">הוספת דוגמה</button>`) : ''}
    </div>
    <a class="step ${pos >= seq.length - 1 ? 'dis' : ''}" href="${pos < seq.length - 1 ? href(next) : '#'}" data-d="הדוגמה הבאה">›</a>`;
  el.querySelector('.on')?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  NAV.keys = { prev: pos > 0 ? href(prev) : null, next: pos < seq.length - 1 ? href(next) : null };
}

// ================= שער =================
function viewHome() {
  app.innerHTML = `
  <section class="view home">
    <div class="hero">
      <div class="hero-text reveal">
        <div class="kicker">${BOOK.author} · ${BOOK.date} · גיליון 1</div>
        <h1>${BOOK.title}</h1>
        <p class="thesis">${lines(BOOK.thesis)}</p>
        <p class="insight"><span class="mk">${BOOK.insight}</span></p>
        <div class="dims">${DIMS.map(d => `<span data-d="${d.lo} עד ${d.hi}">${d.k}</span>`).join('')}</div>
        <p class="meta">${CHAPTERS.length} פרקים<br>${ALL.length} דוגמאות</p>
        <div class="row">
          <a class="btn primary" href="#/c/math" data-d="מתחילים בפרק הראשון, מתמטיקה">לפתוח את הספר</a>
          <a class="btn" href="#/atlas" data-d="כל הדוגמאות על צירים משותפים">אטלס</a>
          <a class="btn" href="#/pages/1" data-d="189 העמודים כמו שהם בקנבה">דפי הספר המקורי</a>
        </div>
      </div>
      <div class="hero-art" id="heroArt"></div>
    </div>
    <div class="shelf"><div class="chapters">${CHAPTERS.map(c => `
        <a class="ch-card" href="#/c/${c.id}" style="--c:${c.color}" title="${esc(c.thesis)}">
          <img src="${src(c.cover)}" alt="" loading="lazy"><div class="shade"></div><div class="band"></div>
          <div class="t"><div class="num">${c.n}</div><div class="ttl">${c.lens}</div></div>
        </a>`).join('')}</div></div>
  </section>`;
  const art = document.getElementById('heroArt');
  [['p084', 'axis', 'נצח'], ['p045', 'glow', 'קסנון'], ['p033', 'string', 'לה']].forEach(([f, m, alt]) =>
    art.appendChild(live(src(f), m, { color: '#f2d544', glow: '#5a6cff', sv: 440, frac: .6, alt, page: parseInt(f.slice(1), 10), gauge: false })));
}

// ================= פרק: שער עם סולם התורה =================
function viewGate(ch) {
  const sc = scaleOf(ch);
  const sorted = [...ch.items].sort((a, b) => sc.val(a) - sc.val(b));
  const vs = sorted.map(sc.val);
  app.innerHTML = `
  <section class="view gate" style="--c:${ch.color}">
    <div class="dial">
      <div class="dial-stage" id="dstage"></div>
      <div class="dial-ctl">
        <div class="tool-h">הסולם של התורה: <b>${esc(sc.label)}</b></div>
        <div class="scale-wrap">
          <input type="range" id="dial" min="0" max="1000" value="0" aria-label="${esc(sc.label)}">
          <div class="ticks">${sorted.map((it, k) => `<button class="tick" data-k="${k}" style="right:${sc.f(vs[k]) * 100}%" data-d="${esc(it.name)}: ${esc(sc.text(vs[k], it))}"><i style="${thumbStyle(it, ch)}"></i></button>`).join('')}</div>
        </div>
        <div class="strips">${DIMS.map((d, k) => `<div class="strip-row"><span>${d.k}</span><div class="grad" style="background:linear-gradient(to left, ${sorted.map((it, j) => `${hexA(ch.color, .12 + it.dna[k] / 5 * .85)} ${sc.f(vs[j]) * 100}%`).join(', ')})"><i class="cursor"></i></div><em id="sv${k}"></em></div>`).join('')}</div>
        <p class="tool-note">מזיזים את הסולם.<br>כל פס הוא ממד אדריכלי, וצבעו מתחזק ככל שהערך עולה.<br>בין שתי דוגמאות, הערכים מחושבים ביניהן.</p>
      </div>
    </div>
    <article class="copy">
      <div class="crumb">פרק ${ch.n} · ${ch.lens}</div>
      <h1>${esc(ch.title)}</h1>
      <p class="ins"><span class="mk">${esc(ch.thesis)}</span></p>
      <p class="body">${lines(ch.lead)}</p>
      <blockquote class="quote">${lines(ch.quote)}<cite>${ch.id === 'math' ? 'מתוך המאמר הפותח של הספר' : `מתוך "${BOOK.title}"`}</cite></blockquote>
      ${modelBlock(ch)}
      <div class="near" id="near"></div>
      <div class="row"><a class="btn" id="toStudio" data-d="פותח את החדר שמתאים לנקודה בסולם">החדר בנקודה הזו, בתלת־ממד</a>
      <button class="btn" data-page="${parseInt(ch.cover.slice(1), 10)}" data-d="העמוד בספר המקורי">הדף בספר</button></div>
    </article>
    <aside class="side">
      <div><h3>העכביש של הפרק</h3><p class="why">קו מלא: הממוצע של הפרק.<br>מקווקו: כל דוגמה בפרק.</p>
      ${radar([{ vals: avg(ch.items), color: ch.color, main: true }, ...ch.items.map(it => ({ vals: it.dna, color: ch.color }))])}</div>
      <div><h3>הדוגמאות לפי הסולם</h3><ol class="order">${sorted.map((it, k) => `<li><a href="#/c/${ch.id}/${it.id}"><b>${esc(sc.text(vs[k], it))}</b> ${esc(it.name)}</a></li>`).join('')}</ol></div>
    </aside>
  </section>`;
  const stage = document.getElementById('dstage');
  const lv = live(null, ch.motion, { color: ch.color, label: sc.label, glow: sorted[0].glow });
  stage.appendChild(lv);
  const dial = document.getElementById('dial');
  function at(x) {
    const v = sc.inv(x);
    let j = vs.findIndex(u => u >= v); if (j <= 0) j = Math.max(1, j === -1 ? vs.length - 1 : 1);
    const a = sorted[j - 1], b = sorted[j], fa = sc.f(vs[j - 1]), fb = sc.f(vs[j]);
    const t = fb === fa ? 0 : Math.max(0, Math.min(1, (x - fa) / (fb - fa)));
    const dna = a.dna.map((p, k) => p + (b.dna[k] - p) * t);
    const near = t < .5 ? a : b;
    return { v, dna, near, t, a, b };
  }
  function upd() {
    const x = +dial.value / 1000, r = at(x);
    lv.fx.set({ sv: r.v, frac: x, dna: r.dna, valueText: sc.text(r.v, (Math.abs(sc.f(sc.val(r.near)) - x) < .01) ? r.near : null), glow: r.near.glow });
    const A = arch(r.dna);
    DIMS.forEach((d, k) => { document.getElementById(`sv${k}`).textContent = `${r.dna[k].toFixed(1)} · ${A[k]}`; });
    app.querySelectorAll('.strip-row .cursor').forEach(c => { c.style.right = `${x * 100}%`; });
    document.getElementById('near').innerHTML = `<div class="lab">הנקודה בסולם</div><p class="body">בין <a href="#/c/${ch.id}/${r.a.id}">${esc(r.a.name)}</a> ל<a href="#/c/${ch.id}/${r.b.id}">${esc(r.b.name)}</a>.<br>הקרובה ביותר: <b>${esc(r.near.name)}</b>, ${esc(r.near.insight)}</p>`;
    document.getElementById('toStudio').href = `#/studio/${r.near.id}?dna=${r.dna.map(v => Math.round(v * 2) / 2).join(',')}`;
  }
  dial.addEventListener('input', upd);
  app.querySelector('.ticks').addEventListener('click', e => { const t = e.target.closest('.tick'); if (!t) return; dial.value = sc.f(vs[+t.dataset.k]) * 1000; upd(); });
  app.querySelector('[data-page]').addEventListener('click', e => lightbox({ img: pageSrc(+e.currentTarget.dataset.page), title: 'שער הפרק בספר המקורי' }));
  // הסולם זז לאט לבד, עד שנוגעים בו
  let auto = true, x = 0;
  dial.addEventListener('pointerdown', () => { auto = false; });
  (function tick() { if (!dial.isConnected || !auto) return; x = (x + .0016) % 1.0001; dial.value = Math.round((.5 - .5 * Math.cos(x * Math.PI * 2)) * 1000); upd(); requestAnimationFrame(tick); })();
  upd();
}

// ================= פרק: דוגמה =================
function heWords(d) {
  const r = k => Math.min(4, Math.max(0, Math.round(d[k]) - 1));
  return [['חריץ אור יחיד ועמום', 'אור דמדומים רך', 'אור יום מאוזן', 'אור יום בהיר', 'אור צהריים מלא'][r(0)],
    ['מבנה מרחף וקל', 'שלד דק', 'קירות בינוניים', 'קירות אבן עבים', 'מסה כבדה של בטון ואדמה'][r(1)],
    ['חדר סגור ומוגן', 'פתח צר אחד', 'פתחים מאוזנים', 'חזית פתוחה', 'פתוח לאופק מכל צד'][r(2)],
    ['שקט ועומד', 'קצב איטי', 'קצב רגוע', 'מסלול זורם', 'תנועה רציפה'][r(3)],
    ['גוונים קרירים', 'אפור קריר', 'ניטרלי', 'גוונים חמים', 'עץ ואדמה'][r(4)]].join(', ');
}
function viewItem(ch, it) {
  const sc = scaleOf(ch), v = sc.val(it);
  const res = resonances(it.dna, ch, 3, it.id);
  const A = arch(it.dna);
  const en = `${enPrompt(it.name, it.space, it.dna)} --ar 1:1 --style raw --no text, words, writing, frame divisions`;
  const he = `${it.space} ${heWords(it.dna)}. דמות אחת לקנה מידה.`;
  const mine = USERIMG[it.id];
  app.innerHTML = `
  <section class="view item" style="--c:${ch.color}">
    <figure class="frame" id="frame" tabindex="0">
      <div class="frame-img" id="art"></div>
      <div class="frame-tools">
        <button class="btn" id="cpP" data-d="${esc(en)}">העתקת הפרומפט</button>
        <label class="btn" data-d="מעלים את התמונה שיצרתם. אפשר גם להדביק (Ctrl+V) או לגרור לתוך המסגרת">העלאת תמונה<input type="file" accept="image/*" hidden id="upl"></label>
        ${mine ? `<button class="btn" id="rmImg" data-d="מחזיר את התמונה מהספר">תמונת הספר</button>` : ''}
      </div>
      <figcaption class="frame-cap"><b>${esc(it.insight)}</b><span>${esc(he)}</span></figcaption>
    </figure>
    <article class="copy" id="copy">
      <div class="chtag"><span class="chn">פרק ${ch.n}</span><span class="chl">${ch.lens}</span><span class="fam-s">${ch.family?.name || ''}</span></div>
      <h1>${esc(it.name)}</h1>
      <div class="sub"><span class="exn">דוגמה ${it.i + 1} מתוך ${ch.items.length}</span><span class="lat">${esc(it.sub)}</span></div>
      ${it.sci ? `<div class="sci"><div class="lab">הסבר מדעי</div><p>${lines(it.sci)}</p></div>` : ''}
      <p class="ins"><span class="mk">${esc(it.insight)}</span></p>
      <div class="params">
        <div class="prm scale"><b>${esc(sc.label)}</b><span>${esc(sc.text(v, it))}</span></div>
        ${DIMS.map((d, k) => `<div class="prm"><b>${d.k}</b><span>${word(k, it.dna[k])} (${it.dna[k]})</span><em>${A[k]}</em></div>`).join('')}
      </div>
      <div><div class="lab">המרחב</div><p class="body">${lines(it.space)}</p></div>
      ${(() => { const srt = [...ch.items].sort((a, b) => sc.val(a) - sc.val(b)); const j = srt.indexOf(it); const prev = srt[j - 1]; const ch2 = prev ? changeFrom(prev, it) : [];
        const W = wellOf(it.dna);
        return `<div class="well"><div class="lab">הרווחה של האדם בחלל הזה</div>${W.length ? W.map(w => `<p><b>${DIMS[w.k].k} ${w.v > 3 ? 'גבוה' : 'נמוך'} (${w.v}):</b> ${esc(w.t)}</p>`).join('') : '<p>כל הממדים מאוזנים. חלל ניטרלי, שמתאים לשימוש מגוון.</p>'}</div>
        ${prev ? `<div class="chg"><div class="lab">מה השתנה מהדוגמה הקודמת בסולם: <a href="#/c/${ch.id}/${prev.id}">${esc(prev.name)}</a></div>${ch2.length ? ch2.map(x => `<p><b>${DIMS[x.k].k}</b> ${x.b > x.a ? 'עולה' : 'יורד'} מ-${x.a} ל-${x.b}: ${esc(arch(it.dna)[x.k])}.</p>`).join('') : '<p>אותו DNA. ההבדל הוא באופי, לא במבנה.</p>'}</div>` : `<div class="chg"><div class="lab">ההתחלה של הסולם</div><p>זו הנקודה הראשונה בסולם: ${esc(sc.label)}.</p></div>`}`; })()}
      <details class="mdet"><summary>המודל של הפרק: איך ${esc(ch.lens)} הופך לאדריכלות</summary>${modelBlock(ch, true)}</details>
      ${it.quote ? (it.haiku ? `<div><div class="lab">הייקו מתוך הספר</div><div class="haiku">${esc(it.quote).replace(/ \/ /g, '\n')}</div></div>`
        : `<blockquote class="quote">${lines(it.quote)}<cite>${it.custom ? 'נוסף על ידך' : it.src === 'new' ? 'דוגמה חדשה, לא מתוך הספר' : `מתוך "${BOOK.title}"`}</cite></blockquote>`) : ''}
      ${it.tip ? `<div class="tip"><b>טיפ ביצוע:</b> ${lines(it.tip)}</div>` : ''}
      <div class="src-row">${it.page ? `<button class="lnk" data-page="${it.page}">הדף המקורי בספר, עמוד ${it.page}</button>` : ''}<span>${mine ? 'התמונה שלך' : it.page ? 'הדמיית AI מתוך הספר' : it.custom ? 'נוסף על ידך' : 'הדמיה מהמודל התלת־ממדי'}</span>${it.custom ? `<button class="lnk" id="delCustom">מחיקת הדוגמה</button>` : ''}</div>
    </article>
    <aside class="side">
      <div><h3>העכביש: הדוגמה ותהודותיה</h3><p class="why">קו מלא: הדוגמה.<br>מקווקו: קרובות מתחומים אחרים, בצבע התחום שלהן.</p>
        ${radar([{ vals: it.dna, color: ch.color, main: true }, ...res.map(r => ({ vals: r.o.dna, color: r.o.ch.color }))])}</div>
      <div><h3>תהודות מתחומים אחרים</h3>
        <div class="res">${res.map(r => `
          <a href="#/c/${r.o.ch.id}/${r.o.id}" style="--c:${r.o.ch.color}">
            <span class="th" style="${thumbStyle(r.o)}"></span>
            <span><span class="ch">${r.o.ch.lens}</span><div class="nm">${esc(r.o.name)}</div><div class="rule">משותף: ${esc(r.rule)}</div></span>
          </a>`).join('')}</div></div>
      <div class="row"><a class="btn" href="#/studio/${it.id}" data-d="החדר שנבנה מחמשת הממדים, עם מכוונים">תלת־ממד</a><a class="btn" href="#/atlas/${it.id}" data-d="הדוגמה בין כל הדוגמאות">באטלס</a></div>
    </aside>
  </section>`;
  const img = mine || src(it.img);
  document.getElementById('art').appendChild(live(img, ch.motion, { color: ch.color, alt: it.name, page: it.page, sv: v, frac: sc.f(v), dna: it.dna, glow: it.glow, label: sc.label, valueText: sc.text(v, it) }));
  const sec = app.querySelector('.item');
  sec.addEventListener('click', e => {
    const p = e.target.closest('[data-page]');
    if (p) lightbox({ img: pageSrc(+p.dataset.page), title: `${it.name} · עמוד ${p.dataset.page}`, color: ch.color });
    if (e.target.id === 'delCustom') delCustom(it.id);
    if (e.target.id === 'rmImg') { delete USERIMG[it.id]; lsSet(LSI, USERIMG); route(); }
  });
  document.getElementById('cpP').onclick = () => navigator.clipboard?.writeText(en).then(() => toast('הפרומפט הועתק. אחרי שיוצרים, מעלים את התמונה לכאן'), () => toast('ההעתקה נחסמה בדפדפן'));
  bindDrop(document.getElementById('frame'), it);
}

function bindDrop(drop, it) {
  const take = file => {
    if (!file || !file.type.startsWith('image/')) return;
    const r = new FileReader();
    r.onload = () => {
      const im = new Image();
      im.onload = () => {
        const s = Math.min(1, 1400 / Math.max(im.width, im.height)), c = document.createElement('canvas');
        c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        USERIMG[it.id] = c.toDataURL('image/jpeg', .86);
        if (!lsSet(LSI, USERIMG)) { delete USERIMG[it.id]; toast('אין מקום בדפדפן לתמונה נוספת'); return; }
        toast('התמונה נכנסה למסגרת'); route();
      };
      im.src = r.result;
    };
    r.readAsDataURL(file);
  };
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); take(e.dataTransfer.files[0]); });
  document.addEventListener('paste', function onPaste(e) { if (!drop.isConnected) { document.removeEventListener('paste', onPaste); return; } const f = [...(e.clipboardData?.items || [])].find(x => x.type.startsWith('image/')); if (f) take(f.getAsFile()); });
  drop.querySelector('#upl')?.addEventListener('change', e => take(e.target.files[0]));
}

// ================= הוספת דוגמה =================
function enPrompt(name, space, dna) {
  const r = (k) => Math.min(4, Math.max(0, Math.round(dna[k]) - 1));
  const w = [['dim single light slit', 'soft dusk light', 'balanced daylight', 'bright daylight', 'full open midday light'][r(0)],
    ['floating light structure', 'thin light frame', 'medium walls', 'thick stone walls', 'heavy rammed earth and concrete mass'][r(1)],
    ['enclosed protected room', 'one narrow opening', 'balanced openings', 'open facade', 'open to the horizon on all sides'][r(2)],
    ['still and silent', 'slow rhythm', 'calm rhythm', 'flowing path', 'continuous movement'][r(3)],
    ['cool tones', 'cool grey', 'neutral', 'warm tones', 'warm wood and earth'][r(4)]];
  return `Architectural living space embodying "${name}": ${space}. ${w.join(', ')}. one human figure for scale, no decoration. Documentary realism, Professional architecture photography, 1:1`;
}
// מילוי מקצועי: מודל שפה חינמי (Pollinations), בלי מפתח. התוצאה מסומנת לבדיקה.
async function aiFill(ch, name) {
  const ex = ch.items.filter(x => !x.custom).slice(0, 3).map(x => ({ name: x.name, insight: x.insight, space: x.space, sci: x.sci, dna: x.dna }));
  const prompt = `אתה עורך של ספר אדריכלות מקצועי, "מרחבי בחירה". הפרק: "${ch.lens}" (${ch.thesis}).
כל דוגמה בפרק מתרגמת מושג למרחב מגורים. חמשת הממדים, 1 עד 5: אור (חושך-בהירות), מסה (ריחוף-כובד), פתיחות (מוגן-פתוח), תנועה (עצירה-זרימה), חום (קריר-חם).
דוגמאות קיימות: ${JSON.stringify(ex)}
המושג החדש: "${name}".
החזר JSON בלבד, בעברית תקינה, עם השדות: insight (תובנה, עד 8 מילים), space (תיאור המרחב האדריכלי: חומר, אור, פתח, עד 20 מילים), sci (הסבר מדעי מדויק, משפט או שניים, עם עובדה, שם או שנה), quote (משפט פואטי קצר), dna (מערך של 5 מספרים שלמים).`;
  const res = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai&json=true&seed=${Date.now() % 9999}`);
  const t = await res.text();
  const j = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
  return j;
}
function addExample(ch) {
  const id = `u${Date.now().toString(36)}`;
  lightbox({ title: `דוגמה חדשה בפרק ${ch.n}: ${ch.lens}`, color: ch.color, html: `
    <form class="addf" id="addf" style="--c:${ch.color}">
      <div class="addf-cols">
        <div>
          <label>שם המושג<span class="namerow"><input name="name" required maxlength="40" placeholder="דוגמה: אינטגרל"><button type="button" class="btn primary" id="aiFill" data-d="מודל שפה ממלא את כל השדות ברמה מקצועית, לפי הפרק. בודקים ומתקנים לפני שמירה">מילוי מקצועי</button></span></label>
          <p class="tool-note" id="aiNote">כותבים רק את שם המושג, ולוחצים "מילוי מקצועי".</p>
          <label>הסבר מדעי, משפט או שניים<textarea name="sci" maxlength="240" rows="2" placeholder="דוגמה: האינטגרל סוכם אינסוף פרוסות דקות לשלם רציף."></textarea></label>
          <label>תובנה, עד 8 מילים<input name="insight" required maxlength="60" placeholder="דוגמה: השקט הוא חומר בנייה."></label>
          <label>המרחב, עד 20 מילים<textarea name="space" required maxlength="160" rows="3" placeholder="דוגמה: חצר שקועה, קיר אבן עבה, חריץ אור אחד בצהריים."></textarea></label>
          <label>ציטוט או הייקו, רשות<input name="quote" maxlength="120"></label>
          <div class="lab">חמשת הממדים: גוררים את הנקודות בעכביש</div>
          <div id="addRadar"></div>
        </div>
        <div class="addf-out">
          <figure class="drop" id="addDrop" tabindex="0"><span>התמונה תופיע כאן.<br>מדביקים, גוררים, או יוצרים.</span><figcaption id="addCap"></figcaption></figure>
          <div class="row"><button type="button" class="btn" id="cpPr">העתקת הפרומפט</button><button type="button" class="btn" id="genImg" data-d="שירות חינמי (Pollinations), בלי מפתח, כ-20 שניות">יצירת תמונה</button></div>
          <div class="row"><button class="btn primary" type="submit">שמירה בפרק</button><button class="btn" type="button" id="cancelAdd">ביטול</button></div>
          <p class="tool-note">נשמר בדפדפן הזה בלבד.<br>מעבירים בייצוא מהמקרא.</p>
        </div>
      </div>
    </form>` });
  const f = document.getElementById('addf');
  let dna = [3, 3, 3, 3, 3], imgUrl = '';
  const drawRadar = () => {
    document.getElementById('addRadar').innerHTML = radar([{ vals: dna, color: ch.color, main: true }], { editable: true, size: 240 });
    bindRadar(document.querySelector('#addRadar svg'), dna.slice(), ch.color, (d, moving) => { dna = d; upd(); if (!moving) drawRadar(); else { const svg = document.querySelector('#addRadar svg'); const tmp = document.createElement('div'); tmp.innerHTML = radar([{ vals: dna, color: ch.color, main: true }], { editable: true, size: 240 }); svg.querySelector('.mainp').setAttribute('points', tmp.querySelector('.mainp').getAttribute('points')); svg.querySelectorAll('.hdl').forEach((h, k) => { h.setAttribute('cx', tmp.querySelectorAll('.hdl')[k].getAttribute('cx')); h.setAttribute('cy', tmp.querySelectorAll('.hdl')[k].getAttribute('cy')); }); } });
  };
  const read = () => ({ name: f.name.value.trim(), insight: f.insight.value.trim(), space: f.space.value.trim(), sci: f.sci.value.trim(), quote: f.quote.value.trim(), dna: dna.map(v => Math.round(v)) });
  const enP = () => { const v = read(); return `${enPrompt(v.name || 'concept', v.space, v.dna)} --ar 1:1 --style raw --no text, words, writing, frame divisions`; };
  const upd = () => { const v = read(); document.getElementById('addCap').innerHTML = `<b>${esc(v.insight)}</b><br><span>${esc(v.space)} ${esc(heWords(v.dna))}</span>`; document.getElementById('cpPr').dataset.d = enP(); };
  f.addEventListener('input', upd); drawRadar(); upd();
  document.getElementById('cpPr').onclick = () => navigator.clipboard?.writeText(enP()).then(() => toast('הפרומפט הועתק'), () => toast('ההעתקה נחסמה בדפדפן'));
  document.getElementById('aiFill').onclick = async () => {
    const name = f.name.value.trim(); if (!name) { toast('קודם שם המושג'); return; }
    const note = document.getElementById('aiNote'); note.textContent = 'ממלא…';
    try {
      const r = await aiFill(ch, name);
      f.insight.value = r.insight || ''; f.space.value = r.space || ''; f.sci.value = r.sci || ''; f.quote.value = r.quote || '';
      if (Array.isArray(r.dna) && r.dna.length === 5) { dna = r.dna.map(x => Math.max(1, Math.min(5, Math.round(+x) || 3))); drawRadar(); }
      upd(); note.textContent = 'מולא על ידי מודל שפה. בודקים ומתקנים לפני שמירה.';
    } catch { note.innerHTML = '<span style="color:var(--bad)">המודל לא ענה. נסו שוב, או מלאו ידנית.</span>'; }
  };
  document.getElementById('cancelAdd').onclick = () => document.querySelector('.lb')?.remove();
  const box = document.getElementById('addDrop');
  const show = u => { imgUrl = u; box.querySelector('span, img')?.remove(); const im = new Image(); im.src = u; im.alt = ''; box.prepend(im); };
  document.getElementById('genImg').onclick = () => {
    const v = read(); if (!v.name || !v.space) { toast('קודם שם ומרחב'); return; }
    const u = `https://image.pollinations.ai/prompt/${encodeURIComponent(enPrompt(v.name, v.space, v.dna))}?width=768&height=768&nologo=true&seed=${hash(id) % 9999}`;
    box.querySelector('span, img')?.remove(); box.insertAdjacentHTML('afterbegin', '<span>יוצר תמונה…</span>');
    const im = new Image(); im.onload = () => show(u); im.onerror = () => { box.querySelector('span').textContent = 'השירות לא החזיר תמונה. העתיקו את הפרומפט והריצו במידג׳רני.'; }; im.src = u;
  };
  const takeFile = file => { if (!file?.type.startsWith('image/')) return; const r = new FileReader(); r.onload = () => show(r.result); r.readAsDataURL(file); };
  box.addEventListener('dragover', e => { e.preventDefault(); box.classList.add('over'); });
  box.addEventListener('drop', e => { e.preventDefault(); box.classList.remove('over'); takeFile(e.dataTransfer.files[0]); });
  box.addEventListener('paste', e => { const x = [...e.clipboardData.items].find(i => i.type.startsWith('image/')); if (x) takeFile(x.getAsFile()); });
  f.addEventListener('submit', e => {
    e.preventDefault(); const v = read();
    const item = { id, ...v, sub: 'נוסף על ידך', img: /^https?:/.test(imgUrl) ? imgUrl : null, custom: true };
    if (imgUrl.startsWith('data:')) { USERIMG[id] = imgUrl; lsSet(LSI, USERIMG); }
    (CUSTOM[ch.id] ||= []).push(item); lsSet(LS, CUSTOM);
    ch.items.push(item); reindex();
    document.querySelector('.lb')?.remove(); toast('הדוגמה נשמרה בפרק');
    location.hash = `#/c/${ch.id}/${id}`;
  });
}
function delCustom(id) {
  const it = byId[id]; if (!it?.custom || !confirm(`למחוק את "${it.name}"?`)) return;
  const ch = it.ch; ch.items.splice(ch.items.indexOf(it), 1);
  CUSTOM[ch.id] = (CUSTOM[ch.id] || []).filter(x => x.id !== id); lsSet(LS, CUSTOM);
  delete USERIMG[id]; lsSet(LSI, USERIMG);
  reindex(); location.hash = `#/c/${ch.id}`; toast('נמחק');
}

// ================= אטלס =================
const atlasState = { x: 1, y: 0, z: 2, on: new Set(), mode: 'solo', sel: null, view: 'plane' };
const VIEWS = {
  plane: { n: 'מישור', d: 'שני ממדים על שני צירים.\nהראשית בפינה: 1,1.\nדוגמה: מסה מול אור.' },
  cube: { n: 'קובייה', d: 'שלושה ממדים בתיבה.\nגוררים לסיבוב.\nדוגמה: מסה, אור ופתיחות.' },
  circle: { n: 'מעגל', d: 'כל חמשת הממדים יחד.\nכל ממד הוא עוגן על המעגל, וכל דוגמה נמשכת לממדים החזקים שלה.\nדוגמה מאוזנת יושבת במרכז.' },
  sphere: { n: 'כדור', d: 'כמו המעגל, על כדור.\nהכיוון הוא הנטייה, המרחק מהמרכז הוא העוצמה.\nגוררים לסיבוב.' },
};
function viewAtlas(arg) {
  const S = atlasState;
  if (arg?.startsWith('ch:')) { const id = arg.slice(3); if (S.mode === 'solo') S.on = (S.on.size === 1 && S.on.has(id)) ? new Set() : new Set([id]); else { if (!S.on.size) S.on = new Set(CHAPTERS.map(c => c.id)); S.on.has(id) ? S.on.delete(id) : S.on.add(id); if (S.on.size === CHAPTERS.length) S.on.clear(); } S.sel = null; history.replaceState(null, '', '#/atlas'); chapterBar(); }
  else if (arg !== undefined) S.sel = arg || null;
  const v2 = S.view === 'plane', vx = S.view === 'plane' || S.view === 'cube';
  app.innerHTML = `
  <section class="view atlas">
    <div class="atlas-main">
      <h1 id="atlasTitle"></h1>
      <div class="tools">
        <span class="seg"><button class="${!S.on.size ? 'on' : ''}" data-all="1" data-d="כל הפרקים מוצגים">הכל</button><button class="${S.mode === 'solo' ? 'on' : ''}" data-mode="solo" data-d="לחיצה על פרק בסרגל מציגה רק אותו. לחיצה שנייה מחזירה הכל">בודד</button><button class="${S.mode === 'add' ? 'on' : ''}" data-mode="add" data-d="לחיצה על פרק בסרגל מוסיפה או מורידה אותו">הוספה</button><button data-all="1" data-d="חזרה למצב ההתחלה">איפוס</button></span>
        <span class="seg">${Object.entries(VIEWS).map(([k, v]) => `<button class="${S.view === k ? 'on' : ''}" data-view="${k}" data-d="${esc(v.d.replace(/\n/g, ' '))}">${v.n}</button>`).join('')}</span>
        ${vx ? `<label>אופקי <select id="ax">${DIMS.map((d, i) => `<option value="${i}" ${i === S.x ? 'selected' : ''}>${d.k}</option>`).join('')}</select></label>
        <label>אנכי <select id="ay">${DIMS.map((d, i) => `<option value="${i}" ${i === S.y ? 'selected' : ''}>${d.k}</option>`).join('')}</select></label>` : ''}
        ${S.view === 'cube' ? `<label>עומק <select id="az">${DIMS.map((d, i) => `<option value="${i}" ${i === S.z ? 'selected' : ''}>${d.k}</option>`).join('')}</select></label>` : ''}
      </div>
      <div class="plot" id="plot"><div class="tipbox" id="tipbox"></div></div>
      <div class="legend-row">
        <span><i class="lg-dot"></i>עיגול: דוגמה</span>
        <span><i class="lg-col"></i>צבע: הפרק</span>
        <span><i class="lg-sel"></i>עיגול גדול עם שם: הנבחרת ושלוש הקרובות לה</span>
        ${v2 ? '<span><i class="lg-zone"></i>אזור אפור: הפינה שבה נפגשים הכי הרבה פרקים</span><span><i class="lg-org"></i>ראשית הצירים: 1,1</span>' : ''}
        <span class="how">${VIEWS[S.view].d.split('\n')[0]}</span>
      </div>
    </div>
    <aside class="side" id="aside"></aside>
  </section>`;
  const plot = document.getElementById('plot');
  const vis = () => ALL.filter(it => !S.on.size || S.on.has(it.ch.id));
  const sel = S.sel && byId[S.sel];
  const linked = sel ? new Set(resonances(sel.dna, sel.ch, 3, sel.id).map(q => q.o.id)) : new Set();
  function zone() {
    const { x, y } = S, v = vis();
    return [[1, 2, 1, 2], [4, 5, 4, 5], [4, 5, 1, 2], [1, 2, 4, 5]].map(([a, b, c, d]) => {
      const inn = v.filter(it => it.dna[x] >= a && it.dna[x] <= b && it.dna[y] >= c && it.dna[y] <= d);
      return { a, c, inn, chs: [...new Set(inn.map(i => i.ch.lens))] };
    }).sort((p, q) => q.chs.length - p.chs.length || q.inn.length - p.inn.length)[0];
  }
  async function render() {
    if (!plot.isConnected) return;
    plot.querySelectorAll('svg, canvas').forEach(e => e.remove());
    const title = document.getElementById('atlasTitle');
    if (S.view === 'cube' || S.view === 'sphere') {
      title.innerHTML = S.view === 'cube' ? 'שלושה ממדים, תיבה אחת' : 'הנטייה של כל דוגמה, על כדור';
      const { buildAtlas3D } = await import('./atlas3d.js');
      buildAtlas3D(plot, vis(), { mode: S.view, x: S.x, y: S.y, z: S.z, dims: DIMS, sel: S.sel, linked, onPick: id => { location.hash = `#/atlas/${id}`; } });
      return;
    }
    const r = plot.getBoundingClientRect(), W = Math.max(300, r.width), H = Math.max(260, r.height);
    const jit = (id, k) => ((hash(id + k) % 1000) / 1000 - .5);
    const dots = [];
    let extra = '';
    if (S.view === 'plane') {
      const z = zone();
      title.innerHTML = z.inn.length ? `<span class="mk">${z.a > 3 ? DIMS[S.x].hi : DIMS[S.x].lo} ו${z.c > 3 ? DIMS[S.y].hi : DIMS[S.y].lo}</span>: כאן נפגשים ${z.chs.length} פרקים` : 'בחרו פרקים בסרגל';
      const P = 60, sx = v => P + (v - .5) / 5 * (W - P * 1.6), sy = v => H - P - (v - .5) / 5 * (H - P * 1.6);
      const rad = Math.max(12, Math.min((W - P * 1.6) / 5, (H - P * 1.6) / 5) * .19);
      vis().forEach(it => dots.push({ it, x: sx(it.dna[S.x] + jit(it.id, 'x') * .7), y: sy(it.dna[S.y] + jit(it.id, 'y') * .7), r: rad }));
      const ox = sx(.5), oy = sy(.5);
      extra = `
        <defs><marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#141414"/></marker></defs>
        <g class="axis">${[1, 2, 3, 4, 5].map(v => `<line class="g" x1="${sx(v)}" x2="${sx(v)}" y1="${sy(5.5)}" y2="${oy}"/><line class="g" x1="${ox}" x2="${sx(5.5)}" y1="${sy(v)}" y2="${sy(v)}"/><text class="tk" x="${sx(v)}" y="${oy + 18}" text-anchor="middle">${v}</text><text class="tk" x="${ox - 10}" y="${sy(v) + 4}" text-anchor="end">${v}</text>`).join('')}
          <line class="ax-l" x1="${ox}" y1="${oy}" x2="${sx(5.6)}" y2="${oy}" marker-end="url(#arr)"/><line class="ax-l" x1="${ox}" y1="${oy}" x2="${ox}" y2="${sy(5.6)}" marker-end="url(#arr)"/>
          <circle cx="${ox}" cy="${oy}" r="5" fill="#141414"/><text class="org" x="${ox - 8}" y="${oy + 34}" text-anchor="end">ראשית</text>
          <text class="ax" x="${sx(5.6)}" y="${oy + 40}" text-anchor="start">${DIMS[S.x].k}: מ${DIMS[S.x].lo} אל ${DIMS[S.x].hi}</text>
          <text class="ax" x="${ox - 30}" y="${sy(3)}" text-anchor="middle" transform="rotate(-90 ${ox - 30} ${sy(3)})">${DIMS[S.y].k}: מ${DIMS[S.y].lo} אל ${DIMS[S.y].hi}</text></g>
        <rect x="${sx(z.a - .5)}" y="${sy(z.c + 1.5)}" width="${sx(z.a + 1.5) - sx(z.a - .5)}" height="${sy(z.c - .5) - sy(z.c + 1.5)}" fill="#8a8a8a" opacity=".13"/>
        <text class="zl" x="${sx(z.a + 1.5) - 6}" y="${sy(z.c + 1.5) + 16}" text-anchor="end">אזור המפגש</text>`;
    } else {
      // מעגל: RadViz. חמישה עוגנים, וכל דוגמה נמשכת לפי עוצמת כל ממד
      title.innerHTML = '<span class="mk">כל חמשת הממדים</span>: לאן כל דוגמה נמשכת';
      const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 56;
      const anc = DIMS.map((_, k) => { const a = -Math.PI / 2 + k * 2 * Math.PI / 5; return [Math.cos(a), Math.sin(a)]; });
      vis().forEach(it => {
        const m = it.dna.reduce((a, v) => a + v, 0) / 5, w = it.dna.map(v => Math.exp(1.3 * (v - m))), s = w.reduce((a, v) => a + v, 0);
        let px = w.reduce((a, v, k) => a + v * anc[k][0], 0) / s, py = w.reduce((a, v, k) => a + v * anc[k][1], 0) / s;
        px += jit(it.id, 'x') * .06; py += jit(it.id, 'y') * .06;
        const len = Math.hypot(px, py) * 1.25, k2 = len > .96 ? .96 / len : 1;
        dots.push({ it, x: cx + px * 1.25 * k2 * R, y: cy + py * 1.25 * k2 * R, r: 13 });
      });
      extra = `<g class="axis"><circle cx="${cx}" cy="${cy}" r="${R}" fill="none" class="g"/><circle cx="${cx}" cy="${cy}" r="${R / 2}" fill="none" class="g"/>
        ${anc.map(([ax, ay], k) => `<line class="ax-l" x1="${cx}" y1="${cy}" x2="${cx + ax * R}" y2="${cy + ay * R}"/><circle cx="${cx + ax * R}" cy="${cy + ay * R}" r="6" fill="#141414"/><text class="ax" x="${cx + ax * (R + 26)}" y="${cy + ay * (R + 26) + 5}" text-anchor="middle">${DIMS[k].k}</text>`).join('')}
        <circle cx="${cx}" cy="${cy}" r="5" fill="#141414"/><text class="org" x="${cx}" y="${cy + 22}" text-anchor="middle">איזון</text></g>`;
    }
    plot.insertAdjacentHTML('afterbegin', `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="פיזור הדוגמאות">${extra}
      <g style="mix-blend-mode:multiply">${dots.map(({ it, x, y, r }) => { const hl = it === sel || linked.has(it.id), dim = sel && !hl; return `<circle class="dot" data-id="${it.id}" cx="${x}" cy="${y}" r="${it === sel ? r * 1.5 : hl ? r * 1.25 : r}" fill="${it.ch.color}" fill-opacity="${dim ? .07 : hl ? .5 : .24}" stroke="${it.ch.color}" stroke-opacity="${dim ? .18 : .85}" stroke-width="${hl ? 2.5 : 1.2}"/>`; }).join('')}</g>
      ${dots.filter(d => d.it === sel || linked.has(d.it.id)).map(d => `<text class="lbl" x="${d.x}" y="${d.y - d.r * 1.5 - 6}" text-anchor="middle">${esc(d.it.name)}</text>`).join('')}
    </svg>`);
  }
  function side() {
    const el = document.getElementById('aside');
    const it = sel;
    if (!it) {
      const shown = CHAPTERS.filter(c => !S.on.size || S.on.has(c.id));
      const g = avg(ALL);
      el.innerHTML = `<div><h3>הנטייה של כל פרק</h3><p class="why">כל קו הוא פרק אחד, בצבע שלו.<br>מוצגת הסטייה מהממוצע של כל הספר, מוגדלת פי 4: העיגול האמצעי הוא הממוצע.<br>מצמצמים בסרגל הפרקים, למעלה.</p>
        ${radar(shown.map(c => ({ vals: avg(c.items).map((v, k) => Math.max(.3, Math.min(5, 3 + (v - g[k]) * 4))), color: c.color })), { size: 260 })}
        <div class="mini-legend">${shown.map(c => `<span><i style="background:${c.color}"></i>${c.n}. ${c.lens}</span>`).join('')}</div></div>
        <div><h3>איך קוראים</h3><p class="why">לוחצים על עיגול.<br>נפתחת הדוגמה, ושלוש הקרובות לה מתחומים אחרים מקבלות שם.</p></div>`;
      return;
    }
    const res = resonances(it.dna, it.ch, 3, it.id);
    el.innerHTML = `<div style="--c:${it.ch.color}">
      ${(USERIMG[it.id] || it.img) ? `<div class="live zoomable side-img"><img class="blurbg" src="${USERIMG[it.id] || src(it.img)}" alt=""><img class="main" src="${USERIMG[it.id] || src(it.img)}" alt="${esc(it.name)}"></div>` : ''}
      <div class="crumb" style="color:${it.ch.color}">${it.ch.lens} · דוגמה ${it.i + 1}</div>
      <h2 class="side-h">${esc(it.name)}</h2>
      <p class="ins-s"><span class="mk">${esc(it.insight)}</span></p></div>
      <div><h3>העכביש: הדוגמה ותהודותיה</h3>${radar([{ vals: it.dna, color: it.ch.color, main: true }, ...res.map(r => ({ vals: r.o.dna, color: r.o.ch.color }))])}</div>
      <div><h3>תהודות</h3><div class="res">${res.map(r => `<a href="#/atlas/${r.o.id}" style="--c:${r.o.ch.color}"><span class="th" style="${thumbStyle(r.o)}"></span><span><span class="ch">${r.o.ch.lens}</span><div class="nm">${esc(r.o.name)}</div><div class="rule">משותף: ${esc(r.rule)}</div></span></a>`).join('')}</div></div>
      <div class="row"><a class="btn" href="#/c/${it.ch.id}/${it.id}">לדוגמה בספר</a><a class="btn" href="#/atlas/" data-d="סוגר את הבחירה וחוזר לתמונה הכללית">סגירת הבחירה</a></div>`;
    el.querySelector('.side-img')?.addEventListener('click', () => lightbox({ img: USERIMG[it.id] || src(it.img), title: it.name, page: it.page, color: it.ch.color }));
  }
  render(); side();
  const tip = document.getElementById('tipbox');
  plot.addEventListener('mousemove', e => {
    const d = e.target.closest?.('.dot');
    if (!d) { tip.style.display = 'none'; return; }
    const it = byId[d.dataset.id], r = plot.getBoundingClientRect();
    tip.innerHTML = `<b>${esc(it.name)}</b><br><span style="color:${it.ch.color};font-weight:700">${it.ch.lens}</span><br>${esc(it.insight)}`;
    tip.style.display = 'block'; tip.style.left = `${Math.min(r.width - 230, e.clientX - r.left + 14)}px`; tip.style.top = `${e.clientY - r.top + 14}px`;
  });
  plot.addEventListener('click', e => { const d = e.target.closest?.('.dot'); if (d) location.hash = `#/atlas/${d.dataset.id}`; });
  app.querySelector('.tools').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.mode) S.mode = b.dataset.mode;
    else if (b.dataset.all) { S.on.clear(); S.mode = 'solo'; }
    else if (b.dataset.view) S.view = b.dataset.view;
    else return;
    chapterBar(); viewAtlas();
  });
  ['ax', 'ay', 'az'].forEach((k, i) => { const el = document.getElementById(k); if (el) el.onchange = e => { S[['x', 'y', 'z'][i]] = +e.target.value; render(); }; });
  let rt; new ResizeObserver(() => { if (S.view === 'plane' || S.view === 'circle') { clearTimeout(rt); rt = setTimeout(render, 80); } }).observe(plot);
}

// ================= סטודיו: מכוונים שמשנים את המודל =================
async function viewStudio(iid, q) {
  const it = byId[iid] || byId.prime;
  const ch = it.ch;
  let dna = q.get('dna') ? q.get('dna').split(',').map(Number).slice(0, 5) : it.dna.slice();
  if (dna.length !== 5 || dna.some(isNaN)) dna = it.dna.slice();
  app.innerHTML = `
  <section class="view studio" style="--c:${ch.color}">
    <div class="three" id="three">
      <div class="hud"><h2>${esc(it.name)}</h2><div class="rule" id="rule"></div></div>
      <div class="viewbar" id="viewbar"></div>
      <div class="status" id="st">טוען מנוע תלת־ממד…</div>
    </div>
    <aside class="side">
      <div><h3>מכוונים: גוררים את נקודות העכביש</h3><p class="why">כל ממד משנה את החדר מיד.<br>דוגמה: מושכים את "מסה" למעלה, והקירות מתעבים.</p>
        <div id="rad"></div>
        <div class="params small-p" id="prm"></div>
        <div class="row"><button class="btn" id="reset" data-d="מחזיר את חמשת הממדים לערכים של ${esc(it.name)}">חזרה לדוגמה</button></div></div>
      <div><h3>הכי קרוב לחדר שבנית</h3><div class="res" id="nearR"></div></div>
      <div><h3>תצוגה</h3>
        <div class="seg wide" id="realSeg"><button class="on" data-real="1" data-d="שמיים, השתקפויות, טקסטורות וצללים רכים">ראליסטי</button><button data-real="0" data-d="מודל לבן, כמו מודל עבודה">מודל לבן</button></div>
        <label class="ctxsel">סביבה <select id="ctxSel"></select></label></div>
      <div class="row"><button class="btn" id="glb" data-d="קובץ glTF 2.0, נפתח ב-Blender, Rhino ו-SketchUp">הורדת GLB</button><button class="btn" id="png" data-d="צילום של המבט הנוכחי">צילום PNG</button></div>
      <details class="pipe"><summary>מסלול להמחשה ראלית ופוטוגנית</summary>
        <ol class="steps">
          <li><span><b>מסה:</b> מורידים GLB מכאן.</span></li>
          <li><span><b>מודל פרמטרי:</b> Rhino עם Grasshopper, או Blender עם Geometry Nodes.</span></li>
          <li><span><b>חומרים:</b> טקסטורות PBR חופשיות מ-Poly Haven ו-ambientCG.</span></li>
          <li><span><b>אור:</b> HDRI אמיתי לשעה ולמקום, ורינדור ב-Blender Cycles, D5 או Twinmotion.</span></li>
          <li><span><b>צילום:</b> עדשה 24 מ״מ, גובה עין 1.6 מ׳, אנכים ישרים.</span></li>
        </ol>
        <div class="std"><b>תקן:</b> glTF 2.0 של Khronos, חומרי PBR.<br><b>אמינות:</b> משווים את הרינדור לתמונת הספר באותה זווית.</div>
      </details>
    </aside>
  </section>`;
  let mod, room, real = true, ctx = null, view = viewStudio.view || 'axo', cam = null, tm;
  try { mod = await import('./studio.js'); } catch (err) { document.getElementById('st').textContent = 'מנוע התלת־ממד לא נטען. רעננו את הדף.'; console.error(err); return; }
  const host = document.getElementById('three');
  function build() {
    if (room) { cam = room.camState(); room.dispose(); }
    room = mod.buildRoom(host, { ...it, dna: dna.map(v => Math.max(1, Math.min(5, v))) }, ch.color, { view, realistic: real, context: ctx });
    window.__room = room;
    if (cam) room.setCam(cam);
    ctx = room.context;
  }
  function panel(full) {
    const A = arch(dna);
    document.getElementById('prm').innerHTML = DIMS.map((d, k) => `<div class="prm"><b>${d.k}</b><span>${dna[k]}</span><em>${A[k]}</em></div>`).join('');
    document.getElementById('rule').innerHTML = dist(dna, it.dna) ? 'שינית את הממדים. החדר נבנה מהערכים החדשים.' : 'החדר נבנה מחמשת הממדים של הדוגמה.';
    document.getElementById('nearR').innerHTML = resonances(dna, null, 3).map(r => `<a href="#/c/${r.o.ch.id}/${r.o.id}" style="--c:${r.o.ch.color}"><span class="th" style="${thumbStyle(r.o)}"></span><span><span class="ch">${r.o.ch.lens}</span><div class="nm">${esc(r.o.name)}</div><div class="rule">משותף: ${esc(r.rule)}</div></span></a>`).join('');
    if (full) {
      document.getElementById('rad').innerHTML = radar([{ vals: dna, color: ch.color, main: true }, ...(dist(dna, it.dna) ? [{ vals: it.dna, color: '#888' }] : [])], { editable: true, size: 250 });
      bindRadar(document.querySelector('#rad svg'), dna.slice(), ch.color, (d, moving) => {
        dna = d; panel(!moving);
        if (moving) { const tmp = document.createElement('div'); tmp.innerHTML = radar([{ vals: dna, color: ch.color, main: true }], { editable: true, size: 250 }); const svg = document.querySelector('#rad svg'); svg.querySelector('.mainp').setAttribute('points', tmp.querySelector('.mainp').getAttribute('points')); svg.querySelectorAll('.hdl').forEach((h, k) => { const n = tmp.querySelectorAll('.hdl')[k]; h.setAttribute('cx', n.getAttribute('cx')); h.setAttribute('cy', n.getAttribute('cy')); }); }
        clearTimeout(tm); tm = setTimeout(build, moving ? 220 : 0);
        history.replaceState(null, '', `#/studio/${it.id}?dna=${dna.join(',')}`);
      });
    }
  }
  build(); panel(true);
  document.getElementById('st').textContent = 'גוררים לסיבוב, גלגלת לזום';
  const vb = document.getElementById('viewbar');
  vb.innerHTML = Object.entries(room.views).map(([k, n]) => `<button data-v="${k}" class="${k === view ? 'on' : ''}">${n}</button>`).join('');
  vb.onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; view = viewStudio.view = b.dataset.v; cam = null; room.view(view); vb.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); };
  const cs = document.getElementById('ctxSel');
  cs.innerHTML = Object.entries(mod.CONTEXTS).map(([k, n]) => `<option value="${k}" ${k === ctx ? 'selected' : ''}>${n}</option>`).join('');
  cs.onchange = () => { ctx = cs.value; room.setContext(ctx); };
  document.getElementById('realSeg').onclick = e => { const b = e.target.closest('[data-real]'); if (!b) return; real = b.dataset.real === '1'; room.setRealistic(real); e.currentTarget.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); };
  document.getElementById('reset').onclick = () => { dna = it.dna.slice(); panel(true); build(); history.replaceState(null, '', `#/studio/${it.id}`); };
  document.getElementById('glb').onclick = () => room.exportGLB(`${it.id}.glb`).then(() => toast('המודל ירד'));
  document.getElementById('png').onclick = () => { room.snapshot(`${it.id}.png`); toast('הצילום ירד'); };
}

// ================= דפי הספר: רשימה בטור =================
function pageLabel(n) {
  const its = ALL.filter(it => it.page === n), c = CHAPTERS.find(c => parseInt(c.cover.slice(1), 10) === n);
  if (its.length) return { t: its.map(i => i.name).join(', '), c: its[0].ch };
  if (c) return { t: `שער: ${c.lens}`, c };
  return { t: n === 1 ? 'כריכה' : 'טקסט ומאמרים', c: null };
}
function viewPages(n) {
  n = Math.min(189, Math.max(1, +n || 1));
  const L = pageLabel(n);
  app.innerHTML = `
  <section class="view pages">
    <ol class="plist" id="plist">${Array.from({ length: 189 }, (_, i) => { const l = pageLabel(i + 1); return `<li><a href="#/pages/${i + 1}" class="${i + 1 === n ? 'on' : ''}" style="--c:${l.c?.color || '#bbb'}"><img loading="lazy" src="${pageSrc(i + 1)}" alt=""><span><b>${i + 1}</b>${esc(l.t)}</span></a></li>`; }).join('')}</ol>
    <div class="pg-stage">
      <a class="btn quiet" href="#/pages/${Math.max(1, n - 1)}" data-d="העמוד הקודם">הקודם</a>
      <figure class="a4"><img src="${pageSrc(n)}" alt="עמוד ${n} בספר המקורי"><figcaption>עמוד ${n} מתוך 189<br>${esc(L.t)}</figcaption></figure>
      <a class="btn quiet" href="#/pages/${Math.min(189, n + 1)}" data-d="העמוד הבא">הבא</a>
    </div>
    <aside class="side">
      <div class="row"><button class="btn" id="closeP" data-d="חזרה למקום שממנו נכנסת">סגירה</button></div>
      <div><h3>הדפים המקוריים</h3><p class="why">כמו שהם בספר, עם הקומפוזיציה והתמונות.<br>הרשימה מימין היא המקרא: מספר העמוד, ומה יש בו.</p></div>
      ${L.c ? `<div><h3>בספר החי</h3><div class="res">${ALL.filter(it => it.page === n).map(o => `<a href="#/c/${o.ch.id}/${o.id}" style="--c:${o.ch.color}"><span class="th" style="${thumbStyle(o)}"></span><span><span class="ch">${o.ch.lens}</span><div class="nm">${esc(o.name)}</div></span></a>`).join('') || `<a href="#/c/${L.c.id}" style="--c:${L.c.color}"><span class="th" style="background:${L.c.color}"></span><span><span class="ch">שער פרק</span><div class="nm">${L.c.lens}</div></span></a>`}</div></div>` : ''}
    </aside>
  </section>`;
  app.querySelector('.a4 img').addEventListener('click', () => lightbox({ img: pageSrc(n), title: `עמוד ${n} בספר המקורי` }));
  document.getElementById('closeP').onclick = () => { location.hash = viewPages.from || '#/'; };
  document.querySelector('.plist a.on')?.scrollIntoView({ block: 'center' });
  NAV.keys = { next: `#/pages/${Math.min(189, n + 1)}`, prev: `#/pages/${Math.max(1, n - 1)}` };
}

// ================= נרטיבים =================
function viewNarratives() {
  const pick = {
    translator: ['prime', 'gevurah', 'gamma', 'hygge'],
    spectrum: [...ALL].filter(i => i.page).sort((a, b) => a.dna[1] - b.dna[1]).filter((_, i, a) => i % Math.floor(a.length / 4) === 0).slice(0, 4).map(i => i.id),
    rooms: ['social', 'delta', 'heidegger', 'fa'],
    witness: ['saltline', 'capillarity', 'saltcrystal', 'uv'],
    'ai-artist': ['mirror', 'n1', 'keter', 'og'],
  };
  app.innerHTML = `
  <section class="view narr">
    <div class="narr-head"><h1>חמישה ספרים<br>שמסתתרים בספר אחד</h1>
      <p class="body">כאמן בינה: חמישה קונספטים להוצאת ספר, סדרת מגזין ותערוכה.<br>כל קונספט נשען על מה שכבר קיים בספר.<br><span class="mk">הספר הוא מאגר. הנרטיב הוא הבחירה.</span></p></div>
    <div class="narr-grid">${NARRATIVES.map(n => `
      <article class="n-card" style="--c:${n.color}">
        <div class="strip4">${(pick[n.id] || []).map(id => { const it = byId[id]; return it ? `<button data-id="${id}" title="${esc(it.name)}" style="${thumbStyle(it)}"></button>` : ''; }).join('')}</div>
        <div class="in"><div class="fmt">${n.format}</div><h2>${n.name}</h2>
          <p class="line"><span class="mk">${n.line}</span></p><p>${lines(n.body)}</p>
          <ul>${n.parts.map(p => `<li>${p}</li>`).join('')}</ul>
          <div class="proof"><b>למה זה עובד:</b> ${n.proof}</div></div>
      </article>`).join('')}</div>
  </section>`;
  app.querySelector('.narr-grid').addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (!b) return; const it = byId[b.dataset.id]; lightbox({ img: USERIMG[it.id] || src(it.img), title: `${it.name} · ${it.ch.lens}`, page: it.page, color: it.ch.color }); });
}

// ================= מקרא =================
function viewLegend() {
  const count = Object.values(CUSTOM).reduce((s, a) => s + a.length, 0);
  app.innerHTML = `
  <section class="view legend">
    <h1>מקרא</h1>
    <p class="intro body">סימן אחד, משמעות אחת, בכל מסך.<br><span class="mk">צבע הוא פרק. מרקר הוא תובנה. עכביש הוא DNA.</span></p>
    <div class="lg-grid">
      <div class="lg"><h2>צבע: הפרק</h2><p class="why">כל פרק מקבל צבע אחד.<br>הוא חוזר בסרגל, בעיגול באטלס, בעכביש ובקו הציטוט.<br>קישור לפרק אחר מקבל את הצבע שלו, שקוף.</p>
        <div class="swatches">${CHAPTERS.map(c => `<a href="#/c/${c.id}" style="--c:${c.color}"><i></i>${c.n}. ${c.lens}</a>`).join('')}</div></div>
      <div class="lg"><h2>עכביש: חמישה ממדים</h2><p class="why">קו מלא: הדוגמה.<br>מקווקו: תהודה מפרק אחר, בצבע שלו.<br>דוגמה: דלתא, ובמקווקו דו וגבורה.</p>
        ${radar([{ vals: byId.delta.dna, color: byId.delta.ch.color, main: true }, { vals: byId.do.dna, color: byId.do.ch.color }, { vals: byId.gevurah.dna, color: byId.gevurah.ch.color }], { size: 230 })}</div>
      <div class="lg"><h2>טקסט: פורמט לכל סוג מידע</h2><p class="why">כל סוג מידע נראה תמיד אותו דבר.</p>
        <div class="signs">
          <div><b>תובנה</b><span class="ex"><span class="mk">עד 8 מילים, במרקר</span></span></div>
          <div><b>פרמטר</b><span class="ex"><span class="prm inline"><b>אור</b><span>בהיר (4)</span></span></span></div>
          <div><b>המרחב</b><span class="ex body">משפט בכל שורה.</span></div>
          <div><b>ציטוט</b><span class="ex" style="border-right:3px solid #7a1f2b;padding-right:8px;font-family:var(--serif)">מילה במילה מהספר</span></div>
          <div><b>כלי</b><span class="ex tool-note">טקסט קטן ואפור: הסבר על הכלי, לא תוכן</span></div>
        </div></div>
      <div class="lg"><h2>תנועה: אחת לכל פרק</h2><p class="why">בכל פרק אותה אנימציה בכל הדוגמאות.<br>רק ערך הפרמטר משתנה, ולכן רואים את המנעד.<br>המד בפינה: שם הפרמטר, הערך ופס יחסי.</p>
        <div class="signs">${CHAPTERS.map(c => `<div><b style="color:${c.color}">${c.lens}</b><span class="ex">${esc(scaleOf(c).label)}</span></div>`).join('')}</div></div>
      <div class="lg"><h2>על מה הספר נשען</h2>
        <div class="signs">
          <div><b>עובדה</b><span class="ex">טקסט, ציטוטים ותדרים: מתוך הספר.<br>אורך גל: 343 מ׳ לשנייה חלקי התדר.</span></div>
          <div><b>עובדה</b><span class="ex">מסות אטומיות: מהטבלה המחזורית, מעוגלות.</span></div>
          <div><b>הערכה</b><span class="ex">ערכי ה-DNA, התהודות והתרגום לאדריכלות: פרשנות של העורך.</span></div>
          <div><b>חדש</b><span class="ex">יחס הזהב, מעגל וסימטריה שישית: דוגמאות חדשות לפרק המתמטיקה, לא מתוך הספר.</span></div>
          <div><b>מגבלה</b><span class="ex">התמונות המקוריות הן קבצי 640 פיקסלים.<br>כאן מתצוגת קנבה, בפרופורציה המלאה.</span></div>
        </div></div>
      <div class="lg"><h2>מה שהוספת</h2><p class="why">${count ? `${count} דוגמאות שמורות בדפדפן הזה.` : 'עוד לא הוספת דוגמאות.<br>מוסיפים מסרגל הדוגמאות בפרק פתוח.'}<br>${Object.keys(USERIMG).length} תמונות שלך במסגרות.</p>
        <div class="row"><button class="btn" id="expJ" ${count ? '' : 'disabled'}>ייצוא JSON</button><label class="btn">ייבוא JSON<input type="file" id="impJ" accept="application/json" hidden></label></div></div>
    </div>
  </section>`;
  document.getElementById('expJ').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(CUSTOM, null, 2)], { type: 'application/json' })); a.download = 'merchavei-bechira-custom.json'; a.click(); };
  document.getElementById('impJ').onchange = async e => { try { const d = JSON.parse(await e.target.files[0].text()); Object.entries(d).forEach(([k, arr]) => { if (!CH[k]) return; arr.forEach(x => { if (!byId[x.id]) { (CUSTOM[k] ||= []).push(x); CH[k].items.push({ ...x, custom: true }); } }); }); lsSet(LS, CUSTOM); reindex(); toast('יובא'); viewLegend(); } catch { toast('הקובץ לא תקין'); } };
}

// ================= המודל =================
function viewModel(cid) {
  const ch = CH[cid] || CH.frequencies;
  const sc = scaleOf(ch);
  const ex = [...ch.items].sort((a, b) => sc.val(a) - sc.val(b))[0];
  const m = CHAPTER_MODELS[ch.id];
  const A = arch(ex.dna), W = wellOf(ex.dna);
  const span = c => DIMS.map((_, k) => { const v = c.items.map(i => i.dna[k]); return { min: Math.min(...v), max: Math.max(...v), avg: v.reduce((a, b) => a + b, 0) / v.length }; });
  const widest = [...CHAPTERS].sort((a, b) => span(b).reduce((s, x) => s + x.max - x.min, 0) - span(a).reduce((s, x) => s + x.max - x.min, 0))[0];
  app.innerHTML = `
  <section class="view model" style="--c:${ch.color}">
    <div class="mhead">
      <h1>המודל<br><span>איך רעיון הופך לחדר, ומה החדר עושה לאדם</span></h1>
      <p class="body">כל דוגמה בספר עוברת את אותה שרשרת של שש חוליות.<br>החוליות 1 עד 3 שונות בכל פרק: לכל תחום הפרמטרים שלו.<br>החוליות 4 עד 6 משותפות לכל הספר. לכן אפשר להשוות בין תדר מוח, גז אציל ומילה ביפנית.</p>
    </div>
    <div class="chain-pick tools">דוגמה לשרשרת: <select id="mch">${CHAPTERS.map(c => `<option value="${c.id}" ${c === ch ? 'selected' : ''}>${c.n}. ${c.lens}</option>`).join('')}</select> <span>הדוגמה הראשונה בסולם: <b>${esc(ex.name)}</b></span></div>
    <ol class="chain">
      <li><i>1</i><b>משפחה</b><span>${ch.family.name}: ${ch.family.sub}</span><em>שלוש משפחות, לפי הכריכה</em></li>
      <li><i>2</i><b>פרק</b><span>${ch.lens}: ${esc(ch.title)}</span><em>העדשה: מאיזה תחום מגיע הרעיון</em></li>
      <li><i>3</i><b>פרמטרי התחום</b><span>${m.params.map(p => esc(p.n)).join(', ')}<br><b class="v">${esc(sc.label)}: ${esc(sc.text(sc.val(ex), ex))}</b></span><em>מה משתנה בין דוגמה לדוגמה, בשפת התחום</em></li>
      <li><i>4</i><b>חמשת הממדים</b><span>${DIMS.map((d, k) => `${d.k} ${ex.dna[k]}`).join(' · ')}</span><em>שפה אחת לכל הספר, 1 עד 5</em></li>
      <li><i>5</i><b>פרמטרים אדריכליים</b><span>${A.slice(0, 3).map(esc).join('<br>')}</span><em>נוסחה קבועה: כך נבנה החדר בסטודיו</em></li>
      <li><i>6</i><b>רווחה</b><span>${W.map(w => esc(w.t)).join('<br>') || 'מאוזן'}</span><em>מה החלל עושה לגוף ולנפש</em></li>
    </ol>
    <div class="mgrid">
      <div class="mcol">
        <h2>חוליות 4 עד 6: חמשת הממדים</h2>
        <p class="tool-note">כל ממד נמדד מ-1 עד 5. הערך הוא קריאה פרשנית של העורך, והתרגום לאדריכלות הוא נוסחה קבועה.</p>
        <table class="dimt"><thead><tr><th>ממד</th><th>מה הוא מודד</th><th>איך הוא נבנה</th><th>נמוך: מה זה עושה</th><th>גבוה: מה זה עושה</th></tr></thead>
        <tbody>${DIM_MODEL.map(d => `<tr><td><b>${d.k}</b></td><td>${esc(d.measures)}</td><td>${esc(d.arch)}</td><td>${esc(d.low)}</td><td>${esc(d.high)}</td></tr><tr class="srcr"><td></td><td colspan="4">על מה זה נשען: ${esc(d.src)}</td></tr>`).join('')}</tbody></table>
      </div>
      <div class="mcol">
        <h2>בין פרק לפרק, ובתוך כל פרק</h2>
        <p class="tool-note">לכל פרק ולכל ממד: הפס הוא המנעד, מהדוגמה הנמוכה לגבוהה. הנקודה היא הממוצע.<br><span class="mk">המנעד הרחב ביותר: ${widest.lens}.</span></p>
        <div class="matrix">
          <div class="mrow mh"><span></span>${DIMS.map(d => `<b>${d.k}</b>`).join('')}</div>
          ${CHAPTERS.map(c => `<a class="mrow" href="#/model/${c.id}" style="--c:${c.color}"><span>${c.n}. ${c.lens}</span>${span(c).map(x => `<i><u style="right:${(x.min - 1) / 4 * 100}%;width:${Math.max(3, (x.max - x.min) / 4 * 100)}%"></u><s style="right:${(x.avg - 1) / 4 * 100}%"></s></i>`).join('')}</a>`).join('')}
          <div class="mrow mh"><span></span>${DIMS.map(d => `<em>${d.lo} ← → ${d.hi}</em>`).join('')}</div>
        </div>
      </div>
    </div>
    <h2 class="mh2">חוליות 1 עד 3: המודל של כל פרק</h2>
    ${FAMILIES.map(f => `<div class="fam-h">מרחבים ${f.name}</div><div class="mcards">${CHAPTERS.filter(c => c.family === f).map(c => `<article class="mcard" style="--c:${c.color}"><h3><a href="#/c/${c.id}">${c.n}. ${c.lens}: ${esc(c.title)}</a></h3>${modelBlock(c)}</article>`).join('')}</div>`).join('')}
  </section>`;
  document.getElementById('mch').onchange = e => { location.hash = `#/model/${e.target.value}`; };
}

// ================= ניתוב =================
let lastHash = '#/';
function route() {
  const [path, qs] = (location.hash || '#/').split('?');
  const q = new URLSearchParams(qs || '');
  let [, a, b, c] = path.split('/');
  document.querySelector('.lb')?.remove();
  if (a === 'pages' && !lastHash.startsWith('#/pages')) viewPages.from = lastHash;
  // לחיצה שנייה על הפרק הפעיל סוגרת ופותחת את שורת הדוגמאות
  if (a === 'c' && c === '~') { NAV.collapsed = !NAV.collapsed; history.replaceState(null, '', `#/c/${b}`); c = undefined; }
  else if (a === 'c' && (b !== NAV.ch?.id)) NAV.collapsed = false;
  if (a === 'yesodot' || b === 'yesodot') b = 'math';
  NAV.view = a || 'home';
  NAV.ch = a === 'c' ? (CH[b] || CHAPTERS[0]) : a === 'studio' ? (byId[b] || byId.prime).ch : null;
  NAV.it = a === 'c' ? (byId[c] && byId[c].ch === NAV.ch ? byId[c] : null) : a === 'studio' ? (byId[b] || byId.prime) : null;
  NAV.keys = null;
  document.querySelectorAll('.nav a').forEach(n => n.classList.toggle('on', n.dataset.nav === NAV.view));
  chapterBar(); exampleRow();
  if (a === 'c') NAV.it ? viewItem(NAV.ch, NAV.it) : viewGate(NAV.ch);
  else if (a === 'atlas') viewAtlas(b || '');
  else if (a === 'studio') viewStudio(b, q);
  else if (a === 'narratives') viewNarratives();
  else if (a === 'legend') viewLegend();
  else if (a === 'pages') viewPages(b);
  else if (a === 'model') viewModel(b);
  else viewHome();
  window.scrollTo(0, 0);
  lastHash = location.hash;
  const t = a === 'c' ? (NAV.it?.name || NAV.ch.lens) : { atlas: 'אטלס', studio: 'סטודיו', narratives: 'נרטיבים', legend: 'מקרא', pages: 'דפי הספר', model: 'המודל' }[a];
  document.title = t ? `${t} · מרחבי בחירה` : 'מרחבי בחירה';
}
window.addEventListener('hashchange', route);
document.addEventListener('keydown', e => {
  if (document.querySelector('.lb') || e.target.closest('select,input,textarea')) return;
  if (e.key === 'ArrowLeft' && NAV.keys?.next) location.hash = NAV.keys.next;
  if (e.key === 'ArrowRight' && NAV.keys?.prev) location.hash = NAV.keys.prev;
});
document.getElementById('exrow').addEventListener('click', e => { if (e.target.id === 'addBtn') addExample(NAV.ch); if (e.target.closest('.step.dis')) e.preventDefault(); });

// תפריט הלוגו
const logo = document.getElementById('logoBtn'), menu = document.getElementById('menu');
logo.onclick = e => { e.stopPropagation(); menu.hidden = !menu.hidden; logo.setAttribute('aria-expanded', String(!menu.hidden)); };
document.addEventListener('click', () => { menu.hidden = true; logo.setAttribute('aria-expanded', 'false'); });
menu.addEventListener('click', e => {
  const act = e.target.dataset.act;
  if (act === 'print') window.print();
  if (act === 'link') navigator.clipboard?.writeText(location.href).then(() => toast('הקישור הועתק'), () => toast('ההעתקה נחסמה בדפדפן'));
  if (act === 'motion') { const s = document.body.classList.toggle('still'); e.target.textContent = s ? 'הפעלת תנועה' : 'עצירת תנועה'; toast(s ? 'התנועה נעצרה' : 'התנועה חזרה'); }
});

// הסבר שנפתח בתוך הכפתור, בריחוף
document.addEventListener('mouseover', e => {
  const b = e.target.closest('[data-d]'); const tip = document.getElementById('hoverTip');
  if (!b) { tip.classList.remove('on'); return; }
  tip.innerHTML = esc(b.dataset.d).replace(/\n/g, '<br>');
  const r = b.getBoundingClientRect();
  tip.classList.add('on');
  const tw = tip.offsetWidth, z = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--z')) || 1;
  tip.style.top = `${(r.bottom + 6) / z}px`;
  tip.style.left = `${Math.max(8, Math.min(innerWidth / z - tw - 8, (r.left + r.width / 2) / z - tw / 2))}px`;
});

route();
