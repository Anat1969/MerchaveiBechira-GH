import { BOOK, CHAPTERS, NARRATIVES } from '../data/book.js';
import { attachFx } from './fx.js';

// ---------- אינדקס ----------
const ALL = [];
CHAPTERS.forEach(ch => ch.items.forEach((it, i) => { it.ch = ch; it.i = i; ALL.push(it); }));
const BYID = Object.fromEntries(ALL.map(it => [it.id, it]));
const CH = Object.fromEntries(CHAPTERS.map(c => [c.id, c]));
const DIMS = BOOK.dims;
const app = document.getElementById('app');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const src = id => `img/${id}.jpg`;
const hash = s => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const avg = items => DIMS.map((_, d) => items.reduce((s, it) => s + it.dna[d], 0) / items.length);
const dist = (a, b) => Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));
const word = (d, v) => v >= 4 ? DIMS[d].hi : v <= 2 ? DIMS[d].lo : 'איזון';

function resonances(it, n = 3) {
  return ALL.filter(o => o.ch !== it.ch)
    .map(o => ({ o, d: dist(it.dna, o.dna) + (hash(it.id + o.id) % 100) / 1000 }))
    .sort((a, b) => a.d - b.d).slice(0, n).map(({ o, d }) => {
      const same = DIMS.map((_, k) => k).filter(k => it.dna[k] === o.dna[k] && it.dna[k] !== 3);
      const rule = same.length ? same.slice(0, 3).map(k => word(k, it.dna[k])).join(', ') : 'פרופיל קרוב בכל חמשת הממדים';
      return { o, d, rule };
    });
}

// ---------- רכיבים ----------
function live(srcId, mode, opt = {}) {
  const el = document.createElement('div');
  el.className = 'live';
  const h = hash(srcId || mode);
  el.style.setProperty('--ox', `${20 + h % 60}%`);
  el.style.setProperty('--oy', `${20 + (h >> 3) % 60}%`);
  el.style.setProperty('--dx', `${(h % 5) - 2}%`);
  el.style.setProperty('--dy', `${((h >> 2) % 5) - 2}%`);
  el.style.setProperty('--kbdur', `${18 + h % 10}s`);
  if (srcId) {
    el.innerHTML = `<img class="blurbg" src="${src(srcId)}" alt="" aria-hidden="true"><img src="${src(srcId)}" alt="${esc(opt.alt || '')}" loading="lazy">`;
    if (opt.contain) el.classList.add('contain');
  }
  el.insertAdjacentHTML('beforeend', '<div class="grain"></div>');
  if (mode) requestAnimationFrame(() => attachFx(el, mode, { ...opt, solo: !srcId }));
  return el;
}

function dnaBlock(vals, color, title = 'ה-DNA של המרחב') {
  return `<div><h3>${title}</h3><p class="why">קריאה פרשנית של העורך, 1 עד 5. לא מדידה.</p>
  <div class="dna" style="--c:${color}">${DIMS.map((d, i) => `
    <div class="r"><b>${d.k}</b><div class="track"><i style="width:${(vals[i] / 5) * 100}%"></i></div><span class="v">${(+vals[i]).toFixed(vals[i] % 1 ? 1 : 0)}</span></div>
    <div class="ends"><span>${d.lo}</span><span>${d.hi}</span></div>`).join('')}</div></div>`;
}

function fxOpts(ch, it) {
  const o = { color: ch.color, name: it?.name };
  if (it?.hz) o.hz = it.hz;
  if (it?.glow) o.glow = it.glow;
  if (ch.id === 'sefirot' && it) o.idx = it.i;
  if (ch.id === 'numbers' && it) o.n = it.i + 1;
  return o;
}
function fxMode(ch, it) {
  if (it?.id === 'prime') return 'prime';
  if (it?.id === 'fractal') return 'fractal';
  return ch.motion;
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toast.k); toast.k = setTimeout(() => t.classList.remove('on'), 2200);
}

// ---------- שער ----------
function viewHome() {
  const featured = ['p084', 'p045', 'p033'];
  app.innerHTML = `
  <section class="view home">
    <div class="hero">
      <div class="hero-text reveal">
        <div class="kicker">${BOOK.author} · ${BOOK.date} · גיליון 1</div>
        <h1>${BOOK.title}</h1>
        <p class="thesis">${BOOK.thesis}</p>
        <p class="insight"><span class="mk">${BOOK.insight}</span></p>
        <div class="dims">${DIMS.map(d => `<span>${d.k}</span>`).join('')}</div>
        <p class="meta">12 תחומים · ${ALL.length} מרחבים · ספר מגזינים על אדריכלות ובינה מלאכותית</p>
        <div class="row">
          <a class="btn" href="#/c/yesodot">לפתוח את הספר</a>
          <a class="btn ghost" href="#/atlas">לראות את כל המרחבים יחד</a>
        </div>
      </div>
      <div class="hero-art" id="heroArt"></div>
    </div>
    <div class="shelf">
      <div class="shelf-head"><h2>12 עדשות, שאלה אחת</h2><span class="muted small">${BOOK.question}</span></div>
      <div class="chapters">${CHAPTERS.map(c => `
        <a class="ch-card" href="#/c/${c.id}" style="--c:${c.color}" title="${esc(c.thesis)}">
          <img src="${src(c.cover)}" alt="" loading="lazy"><div class="shade"></div><div class="band"></div>
          <div class="t"><div class="num">${c.n}</div><div class="lens">${c.lens}</div><div class="ttl">${c.title}</div></div>
        </a>`).join('')}</div>
    </div>
  </section>`;
  const art = document.getElementById('heroArt');
  const modes = ['threshold', 'glow', 'string'];
  featured.forEach((f, i) => art.appendChild(live(f, modes[i], { color: '#f2d544', glow: '#5a6cff', hz: 440, alt: 'מתוך הספר' })));
  art.insertAdjacentHTML('beforeend', '<div class="cap">מתוך הספר: נצח, קסנון, לה</div>');
}

// ---------- פרק ----------
function viewChapter(cid, iid) {
  const ch = CH[cid] || CHAPTERS[0];
  const it = iid ? BYID[iid] : null;
  const seq = [];
  CHAPTERS.forEach(c => { seq.push({ c, it: null }); c.items.forEach(x => seq.push({ c, it: x })); });
  const pos = seq.findIndex(s => s.c === ch && s.it === it);
  const prev = seq[pos - 1], next = seq[pos + 1];
  const href = s => s ? (s.it ? `#/c/${s.c.id}/${s.it.id}` : `#/c/${s.c.id}`) : '#/';
  const lab = s => s ? (s.it ? s.it.name : `פרק ${s.c.n}: ${s.c.title}`) : 'לשער';
  const first = !document.querySelector('.chapter') || document.querySelector('.chapter').dataset.ch !== ch.id;

  let groups = [{ g: null, items: ch.items }];
  if (ch.groups) groups = ch.groups.map(g => ({ g, items: ch.items.filter(x => x.g === g) }));

  const tocHTML = `
    <div class="toc-head">
      <select id="chSel" aria-label="בחירת פרק">${CHAPTERS.map(c => `<option value="${c.id}" ${c === ch ? 'selected' : ''}>${c.n}. ${c.lens}: ${c.title}</option>`).join('')}</select>
      <div class="sortnote">מסודר לפי סדר הספר${ch.groups ? ', ומקובץ לפי תופעה' : ''}</div>
    </div>
    <div class="toc-list">
      <a href="#/c/${ch.id}" class="intro ${!it ? 'on' : ''}"><span class="th">${ch.n}</span><span><span class="nm">שער הפרק</span><span class="sb">${ch.lens}</span></span></a>
      ${groups.map(gr => `${gr.g ? `<div class="toc-group">${gr.g}</div>` : ''}${gr.items.map(x => `
        <a href="#/c/${ch.id}/${x.id}" class="${x === it ? 'on' : ''}">
          <span class="th" style="${x.img ? `background-image:url(${src(x.img)})` : `background:${ch.color}`}"></span>
          <span><span class="nm">${esc(x.name)}</span><span class="sb">${esc(x.sub)}</span></span>
        </a>`).join('')}`).join('')}
    </div>`;

  const copy = it ? `
    <div class="crumb">פרק ${ch.n} · ${ch.lens} · ${ch.title}</div>
    <h1>${esc(it.name)}</h1>
    <div class="sub"><span class="lat">${esc(it.sub)}</span></div>
    <p class="ins"><span class="mk">${esc(it.insight)}</span></p>
    <div><div class="lab">המרחב</div><p>${esc(it.space)}</p></div>
    ${it.quote ? (it.haiku ? `<div><div class="lab">הייקו מתוך הספר</div><div class="haiku">${esc(it.quote).replace(/ \/ /g, '\n')}</div></div>`
      : `<blockquote class="quote">${esc(it.quote)}<cite>מתוך "${BOOK.title}", ${BOOK.date}</cite></blockquote>`) : ''}
    ${it.tip ? `<div class="tip"><b>טיפ ביצוע:</b> ${esc(it.tip)}</div>` : ''}
    <p class="muted small">${it.img ? `התמונה: עמוד ${parseInt(it.img.slice(1), 10)} בספר המקורי, הדמיית AI.` : 'איור תנועה שנבנה בקוד: לרעיון הזה אין תמונה בספר.'}</p>`
    : `
    <div class="crumb">פרק ${ch.n} · ${ch.lens}</div>
    <h1>${esc(ch.title)}</h1>
    <p class="ins"><span class="mk">${esc(ch.thesis)}</span></p>
    <p>${esc(ch.lead)}</p>
    <blockquote class="quote">${esc(ch.quote)}<cite>מתוך "${BOOK.title}", ${BOOK.date}</cite></blockquote>
    <div><div class="lab">בפרק</div><p>${ch.items.length} מרחבים${ch.groups ? ` בשש תופעות: ${ch.groups.join(', ')}` : ''}. בוחרים מהרשימה, או "הבא".</p></div>`;

  const vals = it ? it.dna : avg(ch.items);
  const res = it ? resonances(it) : [];
  const chRes = !it ? CHAPTERS.filter(c => c !== ch).map(c => ({ c, d: dist(avg(c.items), vals) })).sort((a, b) => a.d - b.d)[0] : null;
  const sideHTML = `
    ${dnaBlock(vals, ch.color, it ? 'ה-DNA של המרחב' : 'ה-DNA הממוצע של הפרק')}
    ${it ? `<div><h3>תהודות מתחומים אחרים</h3><p class="why">הכלל: אותו DNA בשפה אחרת. התובנה: אותו חדר מופיע בכמה תחומים. היישום: להציב אותם זה מול זה בתערוכה.</p>
      <div class="res">${res.map(r => `
        <a href="#/c/${r.o.ch.id}/${r.o.id}" style="--c:${r.o.ch.color}">
          <span class="th" style="${r.o.img ? `background-image:url(${src(r.o.img)})` : `background:${r.o.ch.color}`}"></span>
          <span><span class="ch">${r.o.ch.lens}</span><div class="nm">${esc(r.o.name)}</div><div class="rule">משותף: ${esc(r.rule)}</div></span>
        </a>`).join('')}</div></div>`
      : `<div><h3>הפרק הקרוב ביותר</h3><p class="why">לפי מרחק בין ה-DNA הממוצע.</p>
      <div class="res"><a href="#/c/${chRes.c.id}" style="--c:${chRes.c.color}"><span class="th" style="background-image:url(${src(chRes.c.cover)})"></span>
      <span><span class="ch">${chRes.c.lens}</span><div class="nm">${chRes.c.title}</div><div class="rule">${esc(chRes.c.thesis)}</div></span></a></div></div>`}
    <div><a class="btn ghost" href="#/studio/${it ? it.id : ch.items[0].id}">לבנות את החדר בתלת־ממד</a></div>
    <div class="mini-legend"><span><i style="background:${ch.color}"></i>צבע הפרק: ${ch.lens}</span><span><i style="background:var(--marker)"></i>מרקר: התובנה</span><a href="#/legend" class="small">למקרא המלא</a></div>`;

  if (first) {
    app.innerHTML = `
    <section class="view chapter" data-ch="${ch.id}" style="--c:${ch.color}">
      <aside class="toc" id="toc"></aside>
      <div class="stage">
        <div class="spread"><div id="art" class="live"></div><article class="copy" id="copy"></article></div>
        <div class="pager">
          <a class="btn ghost prev" id="prevB"></a>
          <div class="pos"><span id="posT"></span><div class="bar-pos"><i id="posI"></i></div></div>
          <a class="btn ghost next" id="nextB"></a>
        </div>
      </div>
      <aside class="side" id="side"></aside>
    </section>`;
    document.getElementById('toc').addEventListener('change', e => { if (e.target.id === 'chSel') location.hash = `#/c/${e.target.value}`; });
  }
  document.getElementById('toc').innerHTML = tocHTML;
  const copyEl = document.getElementById('copy');
  copyEl.innerHTML = copy; copyEl.scrollTop = 0;
  copyEl.classList.remove('flash'); void copyEl.offsetWidth; copyEl.classList.add('flash');
  document.getElementById('side').innerHTML = sideHTML;
  const old = document.getElementById('art');
  const imgId = it ? it.img : ch.cover;
  const nl = live(imgId, fxMode(ch, it), { ...fxOpts(ch, it), alt: it ? it.name : ch.title });
  nl.id = 'art'; old.replaceWith(nl);
  const nb = document.getElementById('nextB'), pb = document.getElementById('prevB');
  nb.href = href(next); nb.textContent = `הבא: ${lab(next)}`; nb.title = lab(next);
  pb.href = href(prev); pb.textContent = `הקודם: ${lab(prev)}`; pb.title = lab(prev);
  [nb, pb].forEach(b => { b.style.overflow = 'hidden'; b.style.whiteSpace = 'nowrap'; b.style.textOverflow = 'ellipsis'; b.style.display = 'block'; b.style.textAlign = 'center'; });
  document.getElementById('posT').textContent = `${pos + 1} מתוך ${seq.length}`;
  document.getElementById('posI').style.width = `${((pos + 1) / seq.length) * 100}%`;
  const on = document.querySelector('.toc a.on');
  if (on) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  viewChapter.keys = { next: href(next), prev: href(prev) };
}

// ---------- אטלס ----------
const atlasState = { x: 1, y: 0, off: new Set(), sel: null };
function viewAtlas(sel) {
  if (sel) atlasState.sel = sel;
  app.innerHTML = `
  <section class="view atlas">
    <div class="atlas-main">
      <h1 id="atlasTitle"></h1>
      <p class="lead">כל נקודה היא מרחב מהספר. הצבע הוא התחום. נקודות קרובות הן אותו חדר בשפות שונות.</p>
      <div class="filters">
        <button class="chip ${atlasState.off.size ? '' : 'on'}" data-all="1">הכול</button>
        ${CHAPTERS.map(c => `<button class="chip ${atlasState.off.has(c.id) ? '' : 'on'}" data-ch="${c.id}" style="--c:${c.color}"><i></i>${c.lens}</button>`).join('')}
        <span class="sep"></span>
        <label class="small">ציר אופקי <select id="ax">${DIMS.map((d, i) => `<option value="${i}" ${i === atlasState.x ? 'selected' : ''}>${d.k}</option>`).join('')}</select></label>
        <label class="small">ציר אנכי <select id="ay">${DIMS.map((d, i) => `<option value="${i}" ${i === atlasState.y ? 'selected' : ''}>${d.k}</option>`).join('')}</select></label>
      </div>
      <div class="plot" id="plot"><div class="tipbox" id="tipbox"></div></div>
      <div class="plot-note">מה נמדד: ערך ה-DNA הפרשני (1 עד 5) בשני הממדים שנבחרו. נקודות באותו ערך פוזרו מעט כדי שייראו. הצבע: התחום, לפי המקרא.</div>
    </div>
    <aside class="side" id="aside"></aside>
  </section>`;
  const plot = document.getElementById('plot');
  function render() {
    if (!plot.isConnected) return;
    const { x, y, off } = atlasState;
    const vis = ALL.filter(it => !off.has(it.ch.id));
    // תובנה מחושבת: הפינה שבה נפגשים הכי הרבה תחומים
    const corners = [[1, 2, 1, 2], [4, 5, 4, 5], [4, 5, 1, 2], [1, 2, 4, 5]].map(([a, b, c, d]) => {
      const inn = vis.filter(it => it.dna[x] >= a && it.dna[x] <= b && it.dna[y] >= c && it.dna[y] <= d);
      return { a, c, inn, chs: [...new Set(inn.map(i => i.ch.lens))] };
    }).sort((p, q) => q.chs.length - p.chs.length || q.inn.length - p.inn.length);
    const top = corners[0];
    const dx = top.a > 3 ? DIMS[x].hi : DIMS[x].lo, dy = top.c > 3 ? DIMS[y].hi : DIMS[y].lo;
    document.getElementById('atlasTitle').innerHTML = top.inn.length
      ? `ב<span class="mk">${dx} וב${dy}</span> נפגשים ${top.chs.length} תחומים`
      : 'בחרו תחומים להצגה';
    const r = plot.getBoundingClientRect(), W = Math.max(300, r.width), H = Math.max(240, r.height);
    const P = 36, sx = v => P + (v - .5) / 5 * (W - P * 2), sy = v => H - P - (v - .5) / 5 * (H - P * 2);
    const jit = (id, k) => ((hash(id + k) % 1000) / 1000 - .5) * .62;
    const hi = new Set(top.inn.map(i => i.id));
    const sel = atlasState.sel && BYID[atlasState.sel];
    const linked = sel ? new Set(resonances(sel).map(q => q.o.id)) : new Set();
    plot.querySelector('svg')?.remove();
    plot.insertAdjacentHTML('afterbegin', `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="פיזור המרחבים">
      <g class="axis">
        ${[1, 2, 3, 4, 5].map(v => `<line x1="${sx(v)}" x2="${sx(v)}" y1="${P / 2}" y2="${H - P}" /><line x1="${P}" x2="${W - P / 2}" y1="${sy(v)}" y2="${sy(v)}" />`).join('')}
        <text x="${W - P}" y="${H - 8}" text-anchor="end">${DIMS[x].k}: ${DIMS[x].hi} ←</text>
        <text x="${P}" y="${H - 8}" text-anchor="start">→ ${DIMS[x].lo}</text>
        <text x="${P - 6}" y="${P / 2 + 4}" text-anchor="end" transform="rotate(-90 ${P - 6} ${P / 2 + 4})">${DIMS[y].k}: ${DIMS[y].hi}</text>
      </g>
      <rect x="${sx(top.a - .5)}" y="${sy(top.c + 1.5)}" width="${sx(top.a + 1.5) - sx(top.a - .5)}" height="${sy(top.c - .5) - sy(top.c + 1.5)}" fill="var(--marker)" opacity=".45"/>
      ${sel ? [...linked].map(id => { const o = BYID[id]; return `<line x1="${sx(sel.dna[x] + jit(sel.id, 'x'))}" y1="${sy(sel.dna[y] + jit(sel.id, 'y'))}" x2="${sx(o.dna[x] + jit(o.id, 'x'))}" y2="${sy(o.dna[y] + jit(o.id, 'y'))}" stroke="#111" stroke-width="1.2" stroke-dasharray="3 3"/>`; }).join('') : ''}
      ${vis.map(it => `<circle class="dot ${it === sel || linked.has(it.id) ? 'hl' : ''}" data-id="${it.id}" cx="${sx(it.dna[x] + jit(it.id, 'x'))}" cy="${sy(it.dna[y] + jit(it.id, 'y'))}" r="${it === sel ? 9 : hi.has(it.id) ? 6.5 : 5}" fill="${it.ch.color}" opacity="${sel && it !== sel && !linked.has(it.id) ? .35 : .9}"/>`).join('')}
    </svg>`);
    side();
  }
  function side() {
    const el = document.getElementById('aside');
    const it = atlasState.sel && BYID[atlasState.sel];
    if (!it) {
      el.innerHTML = `<div><h3>איך קוראים</h3><p class="why">לוחצים על נקודה: נפתח המרחב, וקווים מקווקווים מחברים אותו לשלוש התהודות שלו.</p></div>
      <div><h3>הגילוי</h3><p style="margin:0">הממדים של הספר חוזרים בכל התחומים. השינה העמוקה, התו הנמוך והגבורה יושבים באותה פינה.</p></div>
      <div class="mini-legend">${CHAPTERS.map(c => `<span><i style="background:${c.color}"></i>${c.lens}: ${c.title}</span>`).join('')}</div>`;
      return;
    }
    el.innerHTML = `<div style="--c:${it.ch.color}">
      ${it.img ? `<div class="live" style="height:180px"><img src="${src(it.img)}" alt="${esc(it.name)}"></div>` : ''}
      <div class="small" style="color:${it.ch.color};font-weight:800;margin-top:10px">${it.ch.lens} · ${it.ch.title}</div>
      <h2 style="margin:2px 0 4px;font-family:var(--serif);font-size:28px">${esc(it.name)}</h2>
      <p style="margin:0 0 8px"><span class="mk">${esc(it.insight)}</span></p>
      <p style="margin:0;font-size:14px">${esc(it.space)}</p></div>
      ${dnaBlock(it.dna, it.ch.color)}
      <div><h3>תהודות</h3><div class="res">${resonances(it).map(r => `<a href="#/atlas/${r.o.id}" style="--c:${r.o.ch.color}"><span class="th" style="${r.o.img ? `background-image:url(${src(r.o.img)})` : `background:${r.o.ch.color}`}"></span><span><span class="ch">${r.o.ch.lens}</span><div class="nm">${esc(r.o.name)}</div><div class="rule">משותף: ${esc(r.rule)}</div></span></a>`).join('')}</div></div>
      <a class="btn" href="#/c/${it.ch.id}/${it.id}">לקרוא בספר</a>`;
  }
  render();
  const tip = document.getElementById('tipbox');
  plot.addEventListener('mousemove', e => {
    const d = e.target.closest('.dot');
    if (!d) { tip.style.display = 'none'; return; }
    const it = BYID[d.dataset.id], r = plot.getBoundingClientRect();
    tip.innerHTML = `<b>${esc(it.name)}</b><br><span style="color:${it.ch.color};font-weight:700">${it.ch.lens}</span> · ${esc(it.insight)}`;
    tip.style.display = 'block';
    tip.style.left = `${Math.min(r.width - 230, e.clientX - r.left + 12)}px`;
    tip.style.top = `${e.clientY - r.top + 12}px`;
  });
  plot.addEventListener('click', e => { const d = e.target.closest('.dot'); if (d) { location.hash = `#/atlas/${d.dataset.id}`; } });
  document.querySelector('.filters').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    if (b.dataset.all) atlasState.off.clear();
    else { const id = b.dataset.ch; atlasState.off.has(id) ? atlasState.off.delete(id) : atlasState.off.add(id); }
    viewAtlas();
  });
  document.getElementById('ax').onchange = e => { atlasState.x = +e.target.value; render(); };
  document.getElementById('ay').onchange = e => { atlasState.y = +e.target.value; render(); };
  new ResizeObserver(() => render()).observe(plot);
}

// ---------- סטודיו ----------
async function viewStudio(iid) {
  const it = BYID[iid] || BYID.prime;
  const ch = it.ch;
  const [L, M, O, T, Hh] = it.dna;
  const lightW = ['אור עמום של חריץ יחיד', 'אור דמדומים רך', 'אור מאוזן', 'אור יום בהיר', 'אור צהריים מלא ופתוח'][L - 1];
  const massW = ['מבנה מרחף וקל', 'שלד דק וקל', 'קירות במשקל בינוני', 'קירות אבן עבים', 'מסה כבדה של בטון ואדמה דחוסה'][M - 1];
  const openW = ['סגור ומוגן', 'פתח צר אחד', 'פתחים מאוזנים', 'חזית פתוחה', 'פתוח לאופק מכל הצדדים'][O - 1];
  const moveW = ['שקט ועומד', 'קצב איטי', 'מקצב מתון', 'מסלול זורם', 'תנועה רציפה ומושכת'][T - 1];
  const heatW = ['גוונים קרירים', 'אפור קריר', 'ניטרלי', 'גוונים חמים', 'חום של עץ ואדמה'][Hh - 1];
  const distill = `${it.name}: ${it.insight}`;
  const prompt = `${it.space} ${lightW}, ${massW}, ${openW}, ${moveW}, ${heatW}. דמות אנושית אחת לקנה מידה, ללא קישוט.`;
  const en = `Documentary realism, Professional architecture photography, 1:1 --ar 1:1 --style raw --no text, words, writing, frame divisions`;
  app.innerHTML = `
  <section class="view studio" style="--c:${ch.color}">
    <aside class="toc">
      <div class="toc-head">
        <select id="stCh" aria-label="בחירת פרק">${CHAPTERS.map(c => `<option value="${c.id}" ${c === ch ? 'selected' : ''}>${c.n}. ${c.lens}</option>`).join('')}</select>
        <div class="sortnote">בוחרים מרחב, והחדר נבנה מה-DNA שלו</div>
      </div>
      <div class="toc-list">${ch.items.map(x => `<a href="#/studio/${x.id}" class="${x === it ? 'on' : ''}"><span class="th" style="${x.img ? `background-image:url(${src(x.img)})` : `background:${ch.color}`}"></span><span><span class="nm">${esc(x.name)}</span><span class="sb">${esc(x.sub)}</span></span></a>`).join('')}</div>
    </aside>
    <div class="three" id="three">
      <div class="hud">
        <div><h2>${esc(it.name)}</h2><div class="rule">החדר נבנה מחמשת הממדים: גובה מהפתיחות, עובי קיר מהמסה, פתחים מהאור, מקצב עמודים מהתנועה, וגוון מהחום.</div></div>
        <div class="tools">
          <button class="btn ghost" id="glb">הורדת מודל GLB</button>
          <button class="btn ghost" id="png">צילום PNG</button>
          <a class="btn ghost" href="#/c/${ch.id}/${it.id}">למרחב בספר</a>
        </div>
      </div>
      <div class="status" id="st">טוען מנוע תלת־ממד…</div>
    </div>
    <aside class="side">
      ${dnaBlock(it.dna, ch.color, 'ה-DNA שבונה את החדר')}
      <div><h3>פרומפט למידג׳רני</h3>
        <div class="prompt" id="pr"><b>${esc(distill)}</b><br>${esc(prompt)}<span class="en">${en}</span></div>
        <button class="btn ghost" id="cp" style="margin-top:6px">העתקה</button></div>
      <div><h3>מסלול להמחשה ראלית ופוטוגנית</h3>
        <ol class="steps">
          <li><span><b>מסה:</b> מורידים את ה-GLB מכאן. זה קנה המידה, הפתחים והקצב.</span></li>
          <li><span><b>מודל פרמטרי:</b> Rhino עם Grasshopper, או Blender עם Geometry Nodes. כל ממד הופך לפרמטר.</span></li>
          <li><span><b>חומרים:</b> טקסטורות PBR חופשיות מ-Poly Haven ו-ambientCG (רישיון CC0).</span></li>
          <li><span><b>אור:</b> מפת HDRI אמיתית לשעה ולמקום, ורינדור ב-Blender Cycles, D5 או Twinmotion.</span></li>
          <li><span><b>צילום:</b> עדשה 24 מ״מ, גובה עין 1.6 מ׳, אנכים ישרים. כמו צילום אדריכלות.</span></li>
          <li><span><b>מהספר לתלת־ממד:</b> מודל image-to-3D (כמו TRELLIS או Tripo) מתמונת הספר, וניקוי ב-Blender. לתצוגה חיה: Gaussian Splatting.</span></li>
        </ol></div>
      <div class="std"><b>על מה זה נשען:</b> המודל נשמר בתקן glTF 2.0 של Khronos, עם חומרי PBR (metallic-roughness), כך שהוא נפתח בכל תוכנה.<br><b>איך בודקים אמינות:</b> מעמידים את הרינדור ליד תמונת הספר באותה זווית, ובודקים יחס פתחים, כיוון אור וקנה מידה של הדמות.</div>
    </aside>
  </section>`;
  document.getElementById('stCh').onchange = e => { location.hash = `#/studio/${CH[e.target.value].items[0].id}`; };
  document.getElementById('cp').onclick = () => {
    navigator.clipboard?.writeText(`${distill}\n${prompt}\n${en}`).then(() => toast('הפרומפט הועתק'), () => toast('ההעתקה נחסמה בדפדפן'));
  };
  try {
    const { buildRoom } = await import('./studio.js');
    const room = buildRoom(document.getElementById('three'), it, ch.color);
    document.getElementById('st').textContent = 'גוררים לסיבוב, גלגלת לזום';
    document.getElementById('glb').onclick = () => room.exportGLB(`${it.id}.glb`).then(() => toast('המודל ירד'));
    document.getElementById('png').onclick = () => { room.snapshot(`${it.id}.png`); toast('הצילום ירד'); };
  } catch (err) {
    document.getElementById('st').textContent = 'מנוע התלת־ממד לא נטען. בדקו חיבור לרשת ורעננו.';
    console.error(err);
  }
}

// ---------- נרטיבים ----------
function viewNarratives() {
  const pick = {
    translator: ['prime', 'gevurah', 'gamma', 'hygge'],
    spectrum: [...ALL].filter(i => i.img).sort((a, b) => a.dna[1] - b.dna[1]).filter((_, i, a) => i % Math.floor(a.length / 4) === 0).slice(0, 4).map(i => i.id),
    rooms: ['social', 'delta', 'heidegger', 'fa'],
    witness: ['saltline', 'capillarity', 'saltcrystal', 'uv'],
    'ai-artist': ['mirror', 'n1', 'keter', 'og'],
  };
  app.innerHTML = `
  <section class="view narr">
    <div class="narr-head">
      <h1>חמישה ספרים<br>שמסתתרים בספר אחד</h1>
      <p>כאמן בינה: חמישה קונספטים להוצאת ספר, סדרת מגזין ותערוכה. כל קונספט נשען על מה שכבר קיים בספר, ומציע צורה אחרת לקרוא אותו. <span class="mk">הספר הוא מאגר. הנרטיב הוא הבחירה.</span></p>
    </div>
    <div class="narr-grid">${NARRATIVES.map(n => `
      <article class="n-card" style="--c:${n.color}">
        <div class="strip">${(pick[n.id] || []).map(id => { const it = BYID[id]; return `<div title="${esc(it.name)}" style="${it.img ? `background-image:url(${src(it.img)})` : `background:${it.ch.color}`}"></div>`; }).join('')}</div>
        <div class="in">
          <div class="fmt">${n.format}</div>
          <h2>${n.name}</h2>
          <p class="line"><span class="mk">${n.line}</span></p>
          <p>${n.body}</p>
          <ul>${n.parts.map(p => `<li>${p}</li>`).join('')}</ul>
          <div class="proof"><b>למה זה עובד:</b> ${n.proof}</div>
        </div>
      </article>`).join('')}</div>
    <div class="pub">
      <div><h3>1. הספר המקורי</h3><p>189 עמודי קנבה. המאגר: טקסט, הדמיות, טבלאות.</p></div>
      <div><h3>2. הספר החי</h3><p>האפליקציה הזו: זיקוק, תנועה, אטלס ותהודות.</p></div>
      <div><h3>3. גיליון ראשון</h3><p>בוחרים נרטיב אחד, 24 עמודים, ומדפיסים מהאפליקציה ב-A4.</p></div>
      <div><h3>4. תערוכה</h3><p>החדרים מהסטודיו הופכים למודלים מודפסים, וההדמיות לקירות.</p></div>
    </div>
  </section>`;
}

// ---------- מקרא ----------
function viewLegend() {
  const motions = { fractal: 'פרקטל שמתפצל', threshold: 'סף אור שנפתח', breath: 'נשימה: 4 שניות פנימה, 6 החוצה', wave: 'גל מוח בתדר האמיתי, יחסית', string: 'מיתר עומד לפי תדר התו', glow: 'זוהר בצבע קו הפליטה', axis: 'נקודת אור שנעה לאורך ציר', compass: 'מצפן של כיוונים מוחלטים', tree: 'עץ הספירות, הספירה הנוכחית מודגשת', number: 'הצורה של המספר', wind: 'זרם רוח', flow: 'זרימה עולה' };
  app.innerHTML = `
  <section class="view legend">
    <h1>מקרא</h1>
    <p class="intro">סימן אחד, משמעות אחת, בכל מסך. <span class="mk">צבע הוא תחום. מרקר הוא תובנה. פס הוא ממד.</span></p>
    <div class="lg-grid">
      <div class="lg"><h2>צבע: התחום</h2><p class="why">כל פרק מקבל צבע אחד. הוא חוזר בפס של הכרטיס, בנקודה באטלס ובקו הציטוט.</p>
        <div class="swatches">${CHAPTERS.map(c => `<a href="#/c/${c.id}" style="--c:${c.color}"><i></i>${c.n}. ${c.lens}</a>`).join('')}</div></div>
      <div class="lg"><h2>DNA: חמישה ממדים</h2><p class="why">כל מרחב מתורגם לחמישה ממדים, מ-1 עד 5. זו קריאה פרשנית שלי כעורך, לא מדידה.</p>
        ${dnaBlock([3, 3, 3, 3, 3], '#141414', 'דוגמה')}
        <div class="signs">${DIMS.map(d => `<div><b>${d.k}</b><span class="ex">${d.lo} ← → ${d.hi}</span></div>`).join('')}</div></div>
      <div class="lg"><h2>טקסט: חמישה פורמטים</h2><p class="why">כל סוג מידע נראה תמיד אותו דבר.</p>
        <div class="signs">
          <div><b>תובנה</b><span class="ex"><span class="mk">עד 8 מילים, במרקר</span></span></div>
          <div><b>המרחב</b><span class="ex">משפט אחד: חומר, אור, פתח</span></div>
          <div><b>ציטוט</b><span class="ex" style="border-right:3px solid #7a1f2b;padding-right:8px;font-family:var(--serif)">מילה במילה מהספר</span></div>
          <div><b>הייקו</b><span class="ex" style="font-family:var(--serif)">שלוש שורות</span></div>
          <div><b>טיפ ביצוע</b><span class="ex tip" style="padding:4px 8px"><b>ירוק:</b> מה עושים</span></div>
        </div></div>
      <div class="lg"><h2>תנועה: מה היא מסבירה</h2><p class="why">התנועה על התמונה אינה קישוט. היא מראה את המנגנון של הפרק.</p>
        <div class="signs">${CHAPTERS.map(c => `<div><b style="color:${c.color}">${c.lens}</b><span class="ex">${motions[c.motion]}</span></div>`).join('')}</div></div>
      <div class="lg"><h2>תהודה: הקשר בין מרחבים</h2><p class="why">שלושת המרחבים הקרובים ביותר מתחומים אחרים, לפי מרחק אוקלידי בין ה-DNA.</p>
        <div class="signs"><div><b>הכלל</b><span class="ex">אותו DNA בשפה אחרת</span></div><div><b>התובנה</b><span class="ex">אותו חדר חוזר בכמה תחומים</span></div><div><b>היישום</b><span class="ex">להציב אותם זה מול זה בתערוכה</span></div></div></div>
      <div class="lg"><h2>על מה הספר נשען</h2><p class="why">עובדה, הערכה והנחה, בנפרד.</p>
        <div class="signs">
          <div><b>עובדה</b><span class="ex">טקסט, ציטוטים ותדרים: מתוך הספר. אורכי הגל: מהירות קול 343 מ׳ לשנייה חלקי התדר.</span></div>
          <div><b>עובדה</b><span class="ex">טווחי גלי המוח: הטווחים המקובלים במחקר EEG, בקירוב.</span></div>
          <div><b>הערכה</b><span class="ex">ערכי ה-DNA והתהודות: פרשנות של העורך.</span></div>
          <div><b>מגבלה</b><span class="ex">התמונות נחתכו מתצוגות קנבה ברוחב 376 פיקסלים והוגדלו. מקור ברזולוציה מלאה יחליף אותן בלי שינוי קוד.</span></div>
        </div></div>
    </div>
  </section>`;
}

// ---------- ניתוב ----------
function route() {
  const [, a, b, c] = (location.hash || '#/').split('/');
  document.querySelectorAll('.nav a').forEach(n => n.classList.toggle('on', n.dataset.nav === (a || 'home')));
  if (a !== 'c') document.querySelector('.chapter')?.remove();
  if (a === 'c') viewChapter(b, c);
  else if (a === 'atlas') viewAtlas(b);
  else if (a === 'studio') viewStudio(b);
  else if (a === 'narratives') viewNarratives();
  else if (a === 'legend') viewLegend();
  else viewHome();
  if (a !== 'c') window.scrollTo(0, 0);
  const t = a === 'c' ? (BYID[c]?.name || CH[b]?.title) : { atlas: 'אטלס', studio: 'סטודיו', narratives: 'נרטיבים', legend: 'מקרא' }[a];
  document.title = t ? `${t} · מרחבי בחירה` : 'מרחבי בחירה';
}
window.addEventListener('hashchange', route);
document.addEventListener('keydown', e => {
  if (!viewChapter.keys || !document.querySelector('.chapter') || e.target.closest('select,input,textarea')) return;
  if (e.key === 'ArrowLeft') location.hash = viewChapter.keys.next;
  if (e.key === 'ArrowRight') location.hash = viewChapter.keys.prev;
});

// ---------- תפריט הלוגו ----------
const logo = document.getElementById('logoBtn'), menu = document.getElementById('menu');
logo.onclick = e => { e.stopPropagation(); menu.hidden = !menu.hidden; logo.setAttribute('aria-expanded', String(!menu.hidden)); };
document.addEventListener('click', () => { menu.hidden = true; logo.setAttribute('aria-expanded', 'false'); });
menu.addEventListener('click', e => {
  const act = e.target.dataset.act;
  if (act === 'print') window.print();
  if (act === 'link') navigator.clipboard?.writeText(location.href).then(() => toast('הקישור הועתק'), () => toast('ההעתקה נחסמה בדפדפן'));
  if (act === 'motion') { const s = document.body.classList.toggle('still'); e.target.textContent = s ? 'הפעלת תנועה' : 'עצירת תנועה'; toast(s ? 'התנועה נעצרה' : 'התנועה חזרה'); }
});

route();
