import { BOOK, CHAPTERS, NARRATIVES } from '../data/book.js';
import { attachFx, hexA } from './fx.js';

// ---------- מרחבים שנוספו על ידי הקורא (נשמרים בדפדפן) ----------
const LS = 'mb.custom.v1';
const loadCustom = () => { try { return JSON.parse(localStorage.getItem(LS) || '{}'); } catch { return {}; } };
const saveCustom = d => { try { localStorage.setItem(LS, JSON.stringify(d)); return true; } catch { return false; } };
const CUSTOM = loadCustom();
CHAPTERS.forEach(ch => (CUSTOM[ch.id] || []).forEach(it => ch.items.push({ ...it, custom: true })));

// ---------- אינדקס ----------
const ALL = [];
function reindex() {
  ALL.length = 0;
  CHAPTERS.forEach(ch => ch.items.forEach((it, i) => { it.ch = ch; it.i = i; it.page = /^p\d+$/.test(it.img || '') ? parseInt(it.img.slice(1), 10) : null; ALL.push(it); }));
}
reindex();
const BYID = () => Object.fromEntries(ALL.map(it => [it.id, it]));
let byId = BYID();
const CH = Object.fromEntries(CHAPTERS.map(c => [c.id, c]));
const DIMS = BOOK.dims;
const app = document.getElementById('app');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const src = id => !id ? '' : /^(https?:|data:)/.test(id) ? id : `img/${id}.jpg`;
const pageSrc = n => `pages/p${String(n).padStart(3, '0')}.jpg`;
const hash = s => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const avg = items => DIMS.map((_, d) => items.reduce((s, it) => s + it.dna[d], 0) / items.length);
const dist = (a, b) => Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));
const word = (d, v) => v >= 4 ? DIMS[d].hi : v <= 2 ? DIMS[d].lo : 'איזון';
const thumbStyle = (it, ch = it.ch) => it.img ? `background-image:url('${src(it.img)}')` : `background:${ch.color}`;

function resonances(it, n = 3) {
  return ALL.filter(o => o.ch !== it.ch)
    .map(o => ({ o, d: dist(it.dna, o.dna) + (hash(it.id + o.id) % 100) / 1000 }))
    .sort((a, b) => a.d - b.d).slice(0, n).map(({ o, d }) => {
      const same = DIMS.map((_, k) => k).filter(k => it.dna[k] === o.dna[k] && it.dna[k] !== 3);
      const rule = same.length ? same.slice(0, 3).map(k => word(k, it.dna[k])).join(', ') : 'פרופיל קרוב בכל חמשת הממדים';
      return { o, d, rule };
    });
}

// ---------- תמונה חיה: בפרופורציה שלה, בלי חיתוך, לחיצה מגדילה ----------
function live(srcId, mode, opt = {}) {
  const el = document.createElement('div');
  el.className = 'live';
  if (srcId) {
    el.innerHTML = `<img class="blurbg" src="${src(srcId)}" alt="" aria-hidden="true"><img class="main" src="${src(srcId)}" alt="${esc(opt.alt || '')}">`;
    el.classList.add('zoomable'); el.title = 'לחיצה מגדילה';
    el.addEventListener('click', () => lightbox({ img: src(srcId), title: opt.alt, page: opt.page, color: opt.color }));
  }
  el.insertAdjacentHTML('beforeend', '<div class="grain"></div>');
  if (mode) requestAnimationFrame(() => attachFx(el, mode, { ...opt, solo: !srcId }));
  return el;
}

// ---------- תיבת הגדלה ----------
function lightbox({ img, title, page, color, html }) {
  document.querySelector('.lb')?.remove();
  const lb = document.createElement('div');
  lb.className = 'lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true');
  lb.style.setProperty('--c', color || '#141414');
  lb.innerHTML = `<div class="lb-in">
    <div class="lb-bar"><b>${esc(title || '')}</b>
      <span class="lb-tools">${page ? `<button class="lnk" data-page="${page}">הדף המקורי בספר (עמ׳ ${page})</button>` : ''}
      <button class="x" aria-label="סגירה" title="סגירה (Esc)">✕</button></span></div>
    <div class="lb-body">${html || `<img src="${img}" alt="${esc(title || '')}">`}</div></div>`;
  document.body.appendChild(lb);
  const close = () => { lb.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  lb.addEventListener('click', e => {
    if (e.target === lb || e.target.closest('.x')) close();
    const p = e.target.closest('[data-page]');
    if (p) { const n = +p.dataset.page; lb.querySelector('.lb-body').innerHTML = `<img class="pg" src="${pageSrc(n)}" alt="עמוד ${n}">`; p.remove(); lb.querySelector('.lb-bar b').textContent = `${title || ''} · עמוד ${n} בספר המקורי`; }
  });
  const im = lb.querySelector('.lb-body img');
  if (im) im.onload = () => im.style.setProperty('--nw', im.naturalWidth);
}

// ---------- גרף עכביש: המרחב ותהודותיו ----------
function radar(series, size = 220) {
  const c = size / 2, R = size / 2 - 30, n = DIMS.length;
  const pt = (k, v) => { const a = -Math.PI / 2 + k * 2 * Math.PI / n; return [c + Math.cos(a) * R * v / 5, c + Math.sin(a) * R * v / 5]; };
  const poly = vals => vals.map((v, k) => pt(k, v).join(',')).join(' ');
  return `<svg class="radar" viewBox="0 0 ${size} ${size}" role="img" aria-label="גרף עכביש של חמשת הממדים">
    ${[1, 2, 3, 4, 5].map(l => `<polygon points="${poly(Array(n).fill(l))}" fill="none" stroke="#e6e2da" stroke-width="${l === 5 ? 1.2 : .8}"/>`).join('')}
    ${DIMS.map((d, k) => { const [x, y] = pt(k, 5), [lx, ly] = pt(k, 6.15); return `<line x1="${c}" y1="${c}" x2="${x}" y2="${y}" stroke="#e6e2da"/><text x="${lx}" y="${ly + 4}" text-anchor="middle" class="rl">${d.k}</text>`; }).join('')}
    ${series.slice().reverse().map(s => `<polygon points="${poly(s.vals)}" fill="${hexA(s.color, s.main ? .28 : .14)}" stroke="${s.color}" stroke-width="${s.main ? 2.4 : 1.4}" ${s.main ? '' : 'stroke-dasharray="4 3"'}/>`).join('')}
  </svg>`;
}

function fxOpts(ch, it) {
  const o = { color: ch.color, name: it?.name, id: it?.id, dna: it?.dna, sub: it?.sub, g: it?.g, alt: it ? it.name : ch.title, page: it ? it.page : null };
  if (it?.hz) o.hz = it.hz;
  if (it?.glow) o.glow = it.glow;
  if (ch.id === 'sefirot' && it) o.idx = it.i;
  if (ch.id === 'numbers' && it) o.n = it.i + 1;
  return o;
}
function fxMode(ch, it) {
  if (it?.id === 'prime') return 'prime';
  if (it?.id === 'fractal') return 'fractal';
  if (it?.id === 'saudade') return 'saudade';
  return ch.motion;
}
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toast.k); toast.k = setTimeout(() => t.classList.remove('on'), 2200);
}

// ---------- שער ----------
function viewHome() {
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
          <a class="btn primary" href="#/c/yesodot">לפתוח את הספר</a>
          <a class="btn" href="#/atlas">כל המרחבים יחד</a>
          <a class="btn" href="#/pages/1">דפי הספר המקורי</a>
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
  [['p084', 'axis', { id: 'christianity', alt: 'נצח' }], ['p045', 'glow', { id: 'xe', glow: '#5a6cff', alt: 'קסנון' }], ['p033', 'string', { hz: 440, alt: 'לה' }]]
    .forEach(([f, m, o]) => art.appendChild(live(f, m, { color: '#f2d544', page: parseInt(f.slice(1), 10), ...o })));
}

// ---------- פרק ----------
function viewChapter(cid, iid) {
  const ch = CH[cid] || CHAPTERS[0];
  const it = iid ? byId[iid] : null;
  const seq = [];
  CHAPTERS.forEach(c => { seq.push({ c, it: null }); c.items.forEach(x => seq.push({ c, it: x })); });
  const pos = seq.findIndex(s => s.c === ch && s.it === it);
  const prev = seq[pos - 1], next = seq[pos + 1];
  const href = s => s ? (s.it ? `#/c/${s.c.id}/${s.it.id}` : `#/c/${s.c.id}`) : '#/';
  const lab = s => s ? (s.it ? s.it.name : `פרק ${s.c.n}: ${s.c.title}`) : 'לשער';
  const first = !document.querySelector('.chapter') || document.querySelector('.chapter').dataset.ch !== ch.id;
  let groups = [{ g: null, items: ch.items.filter(x => !x.custom) }];
  if (ch.groups) groups = ch.groups.map(g => ({ g, items: ch.items.filter(x => x.g === g && !x.custom) }));
  const mine = ch.items.filter(x => x.custom);
  if (mine.length) groups.push({ g: 'נוספו על ידך', items: mine });

  const tocHTML = `
    <div class="toc-head">
      <select id="chSel" aria-label="בחירת פרק">${CHAPTERS.map(c => `<option value="${c.id}" ${c === ch ? 'selected' : ''}>${c.n}. ${c.lens}: ${c.title}</option>`).join('')}</select>
      <div class="sortnote">${ch.items.length} מרחבים, לפי סדר הספר${ch.groups ? ', מקובצים לפי תופעה' : ''}</div>
    </div>
    <div class="toc-list">
      <a href="#/c/${ch.id}" class="intro ${!it ? 'on' : ''}"><span class="th">${ch.n}</span><span><span class="nm">שער הפרק</span><span class="sb">${ch.lens}</span></span></a>
      ${groups.map(gr => `${gr.g ? `<div class="toc-group">${gr.g}</div>` : ''}${gr.items.map(x => `
        <a href="#/c/${ch.id}/${x.id}" class="${x === it ? 'on' : ''}">
          <span class="th" style="${thumbStyle(x, ch)}"><i class="no">${x.i + 1}</i></span>
          <span><span class="nm">${esc(x.name)}</span><span class="sb">${esc(x.sub)}</span></span>
        </a>`).join('')}`).join('')}
      ${ch.closed ? `<div class="closed-note">סדרה סגורה: ${ch.items.length} פריטים בטבע, אין מה להוסיף.</div>` : `<button class="add-btn" id="addBtn">הוספת מרחב לפרק</button>`}
    </div>`;

  const copy = it ? `
    <div class="crumb">פרק ${ch.n} · ${ch.lens} · מרחב ${it.i + 1} מתוך ${ch.items.length}</div>
    <h1>${esc(it.name)}</h1>
    <div class="sub"><span class="lat">${esc(it.sub)}</span></div>
    <p class="ins"><span class="mk">${esc(it.insight)}</span></p>
    <div><div class="lab">המרחב</div><p>${esc(it.space)}</p></div>
    ${it.quote ? (it.haiku ? `<div><div class="lab">הייקו מתוך הספר</div><div class="haiku">${esc(it.quote).replace(/ \/ /g, '\n')}</div></div>`
      : `<blockquote class="quote">${esc(it.quote)}<cite>${it.custom ? 'נוסף על ידך' : `מתוך "${BOOK.title}", ${BOOK.date}`}</cite></blockquote>`) : ''}
    ${it.tip ? `<div class="tip"><b>טיפ ביצוע:</b> ${esc(it.tip)}</div>` : ''}
    <div class="meta-row">
      ${it.page ? `<button class="lnk" data-page="${it.page}">הדף המקורי בספר · עמ׳ ${it.page}</button>` : ''}
      <span class="muted small">${it.page ? 'הדמיית AI מתוך הספר' : it.custom ? 'נוסף על ידך' : 'הדמיית מודל שנבנה מה-DNA'}</span>
      ${it.custom ? `<button class="lnk" id="delCustom">מחיקת המרחב</button>` : ''}
    </div>`
    : `
    <div class="crumb">פרק ${ch.n} · ${ch.lens}</div>
    <h1>${esc(ch.title)}</h1>
    <p class="ins"><span class="mk">${esc(ch.thesis)}</span></p>
    <p>${esc(ch.lead)}</p>
    <blockquote class="quote">${esc(ch.quote)}<cite>מתוך "${BOOK.title}", ${BOOK.date}</cite></blockquote>
    <div class="meta-row"><button class="lnk" data-page="${parseInt(ch.cover.slice(1), 10)}">שער הפרק בספר המקורי</button></div>`;

  const vals = it ? it.dna : avg(ch.items);
  const res = it ? resonances(it) : [];
  const chRes = !it ? CHAPTERS.filter(c => c !== ch).map(c => ({ c, d: dist(avg(c.items), vals) })).sort((a, b) => a.d - b.d)[0] : null;
  const series = [{ vals, color: ch.color, main: true }, ...res.map(r => ({ vals: r.o.dna, color: r.o.ch.color }))];
  const sideHTML = `
    <div><h3>${it ? 'ה-DNA של המרחב, ותהודותיו' : 'ה-DNA הממוצע של הפרק'}</h3>
      <p class="why">קו מלא: ${it ? 'המרחב' : 'הפרק'}. קו מקווקו: מרחבים קרובים מתחומים אחרים, בצבע התחום שלהם. קריאה פרשנית, 1 עד 5.</p>
      ${radar(series)}
      <div class="dna-nums">${DIMS.map((d, k) => `<span><b>${d.k}</b> ${(+vals[k]).toFixed(vals[k] % 1 ? 1 : 0)}</span>`).join('')}</div></div>
    ${it ? `<div><h3>תהודות מתחומים אחרים</h3>
      <div class="res">${res.map(r => `
        <a href="#/c/${r.o.ch.id}/${r.o.id}" style="--c:${r.o.ch.color}">
          <span class="th" style="${thumbStyle(r.o)}"></span>
          <span><span class="ch">${r.o.ch.lens}</span><div class="nm">${esc(r.o.name)}</div><div class="rule">משותף: ${esc(r.rule)}</div></span>
        </a>`).join('')}</div>
      <p class="why">הכלל: אותו DNA בשפה אחרת. התובנה: אותו חדר חוזר בכמה תחומים. היישום: להציב אותם זה מול זה.</p></div>`
      : `<div><h3>הפרק הקרוב ביותר</h3>
      <div class="res"><a href="#/c/${chRes.c.id}" style="--c:${chRes.c.color}"><span class="th" style="background-image:url(${src(chRes.c.cover)})"></span>
      <span><span class="ch">${chRes.c.lens}</span><div class="nm">${chRes.c.title}</div><div class="rule">${esc(chRes.c.thesis)}</div></span></a></div></div>`}
    <div class="side-actions"><a class="btn" href="#/studio/${it ? it.id : ch.items[0].id}">החדר בתלת־ממד</a><a class="btn" href="#/atlas/${it ? it.id : ''}">באטלס</a></div>`;

  if (first) {
    app.innerHTML = `
    <section class="view chapter" data-ch="${ch.id}" style="--c:${ch.color}">
      <aside class="toc" id="toc"></aside>
      <div class="stage">
        <div class="spread"><div id="art" class="live"></div><article class="copy" id="copy"></article></div>
        <div class="pager">
          <a class="btn quiet prev" id="prevB"></a>
          <div class="pos"><span id="posT"></span><div class="bar-pos"><i id="posI"></i></div></div>
          <a class="btn quiet next" id="nextB"></a>
        </div>
      </div>
      <aside class="side" id="side"></aside>
    </section>`;
    const sec = app.querySelector('.chapter');
    sec.addEventListener('change', e => { if (e.target.id === 'chSel') location.hash = `#/c/${e.target.value}`; });
    sec.addEventListener('click', e => {
      const p = e.target.closest('[data-page]');
      if (p) lightbox({ img: pageSrc(+p.dataset.page), title: `עמוד ${p.dataset.page} בספר המקורי` });
      if (e.target.id === 'addBtn') addExample(CH[sec.dataset.ch]);
      if (e.target.id === 'delCustom') delCustom(location.hash.split('/')[3]);
    });
  }
  document.getElementById('toc').innerHTML = tocHTML;
  const copyEl = document.getElementById('copy');
  copyEl.innerHTML = copy; copyEl.scrollTop = 0;
  copyEl.classList.remove('flash'); void copyEl.offsetWidth; copyEl.classList.add('flash');
  document.getElementById('side').innerHTML = sideHTML;
  const imgId = it ? it.img : ch.cover;
  const nl = live(imgId, fxMode(ch, it), { ...fxOpts(ch, it), page: it ? it.page : parseInt(ch.cover.slice(1), 10) });
  nl.id = 'art'; document.getElementById('art').replaceWith(nl);
  const nb = document.getElementById('nextB'), pb = document.getElementById('prevB');
  nb.href = href(next); nb.textContent = `הבא: ${lab(next)}`; nb.title = lab(next);
  pb.href = href(prev); pb.textContent = `הקודם: ${lab(prev)}`; pb.title = lab(prev);
  document.getElementById('posT').textContent = `${pos + 1} מתוך ${seq.length}`;
  document.getElementById('posI').style.width = `${((pos + 1) / seq.length) * 100}%`;
  document.querySelector('.toc a.on')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  viewChapter.keys = { next: href(next), prev: href(prev) };
}

// ---------- הוספת מרחב ----------
function enPrompt(name, space, dna) {
  const [L, M, O, T, H] = dna;
  const w = [['dim single light slit', 'soft dusk light', 'balanced daylight', 'bright daylight', 'full open midday light'][L - 1],
    ['floating light structure', 'thin light frame', 'medium walls', 'thick stone walls', 'heavy rammed earth and concrete mass'][M - 1],
    ['enclosed protected room', 'one narrow opening', 'balanced openings', 'open facade', 'open to the horizon on all sides'][O - 1],
    ['still and silent', 'slow rhythm', 'calm rhythm', 'flowing path', 'continuous movement'][T - 1],
    ['cool tones', 'cool grey', 'neutral', 'warm tones', 'warm wood and earth'][H - 1]];
  return `Architectural living space embodying "${name}": ${space}. ${w.join(', ')}. one human figure for scale, no decoration. Documentary realism, Professional architecture photography, 1:1`;
}
function addExample(ch) {
  const id = `u${Date.now().toString(36)}`;
  lightbox({ title: `מרחב חדש בפרק ${ch.n}: ${ch.title}`, color: ch.color, html: `
    <form class="addf" id="addf" style="--c:${ch.color}">
      <div class="addf-cols">
        <div class="addf-fields">
          <label>שם המושג<input name="name" required maxlength="40" placeholder="למשל: מדבר שקט"></label>
          <label>תובנה (עד 8 מילים)<input name="insight" required maxlength="60" placeholder="משפט אחד שמזקק את המושג"></label>
          <label>המרחב (עד 20 מילים)<textarea name="space" required maxlength="160" rows="3" placeholder="חומר, אור, פתח, תנועה"></textarea></label>
          <label>ציטוט או הייקו (רשות)<input name="quote" maxlength="120"></label>
          <div class="sliders">${DIMS.map((d, k) => `<label class="sl"><span>${d.k}</span><small>${d.lo}</small><input type="range" min="1" max="5" value="3" name="d${k}"><small>${d.hi}</small><b>3</b></label>`).join('')}</div>
        </div>
        <div class="addf-out">
          <div class="lab">פרומפט למידג׳רני, מתעדכן תוך כדי</div>
          <div class="prompt" id="addPr"></div>
          <div class="row"><button type="button" class="btn" id="cpPr">העתקת הפרומפט</button><button type="button" class="btn" id="genImg">יצירת תמונה</button></div>
          <div class="gen" id="genBox"><span class="muted small">התמונה תופיע כאן. נוצרת בשירות החינמי Pollinations, בלי מפתח, ולוקחת כ-20 שניות.</span></div>
          <div class="row end"><button class="btn primary" type="submit">שמירה בפרק</button></div>
          <p class="muted small">נשמר בדפדפן הזה בלבד. אפשר להעביר בייצוא מהמקרא.</p>
        </div>
      </div>
    </form>` });
  const f = document.getElementById('addf'), pr = document.getElementById('addPr');
  let imgUrl = '';
  const read = () => ({ name: f.name.value.trim(), insight: f.insight.value.trim(), space: f.space.value.trim(), quote: f.quote.value.trim(), dna: DIMS.map((_, k) => +f[`d${k}`].value) });
  const upd = () => { const v = read(); f.querySelectorAll('.sl').forEach((s, k) => s.querySelector('b').textContent = v.dna[k]); pr.innerHTML = `<b>${esc(v.name || 'המושג')}: ${esc(v.insight || '')}</b><span class="en">${esc(enPrompt(v.name || 'concept', v.space || '', v.dna))} --ar 1:1 --style raw --no text, words, writing, frame divisions</span>`; };
  f.addEventListener('input', upd); upd();
  document.getElementById('cpPr').onclick = () => navigator.clipboard?.writeText(pr.innerText).then(() => toast('הפרומפט הועתק'), () => toast('ההעתקה נחסמה בדפדפן'));
  document.getElementById('genImg').onclick = () => {
    const v = read(); if (!v.name || !v.space) { toast('קודם שם ומרחב'); return; }
    imgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enPrompt(v.name, v.space, v.dna))}?width=768&height=768&nologo=true&seed=${hash(id) % 9999}`;
    const box = document.getElementById('genBox'); box.innerHTML = '<span class="muted small">יוצר תמונה…</span>';
    const im = new Image(); im.alt = v.name; im.onload = () => { box.innerHTML = ''; box.appendChild(im); }; im.onerror = () => { box.innerHTML = '<span class="small" style="color:var(--bad)">השירות לא החזיר תמונה. אפשר להעתיק את הפרומפט ולהריץ במידג׳רני.</span>'; imgUrl = ''; }; im.src = imgUrl;
  };
  f.addEventListener('submit', e => {
    e.preventDefault(); const v = read();
    const item = { id, ...v, sub: 'נוסף על ידך', img: imgUrl || null, custom: true };
    (CUSTOM[ch.id] ||= []).push(item); saveCustom(CUSTOM);
    ch.items.push(item); reindex(); byId = BYID();
    document.querySelector('.lb')?.remove(); toast('המרחב נשמר בפרק');
    location.hash = `#/c/${ch.id}/${id}`;
  });
}
function delCustom(id) {
  const it = byId[id]; if (!it?.custom || !confirm(`למחוק את "${it.name}"?`)) return;
  const ch = it.ch; ch.items.splice(ch.items.indexOf(it), 1);
  CUSTOM[ch.id] = (CUSTOM[ch.id] || []).filter(x => x.id !== id); saveCustom(CUSTOM);
  reindex(); byId = BYID(); location.hash = `#/c/${ch.id}`; toast('נמחק');
}

// ---------- אטלס ----------
const atlasState = { x: 1, y: 0, z: 2, on: new Set(), mode: 'solo', sel: null, d3: false };
function viewAtlas(sel) {
  if (sel !== undefined) atlasState.sel = sel || null;
  const S = atlasState;
  app.innerHTML = `
  <section class="view atlas">
    <div class="atlas-main">
      <h1 id="atlasTitle"></h1>
      <div class="filters">
        <span class="seg" role="group" aria-label="אופן הבחירה"><button class="${S.mode === 'solo' ? 'on' : ''}" data-mode="solo" title="לחיצה על תחום מציגה רק אותו">בודד</button><button class="${S.mode === 'add' ? 'on' : ''}" data-mode="add" title="לחיצה מוסיפה או מורידה תחום">הוספה</button><button data-reset="1" title="כל התחומים">איפוס</button></span>
        ${CHAPTERS.map(c => `<button class="chip ${!S.on.size || S.on.has(c.id) ? 'on' : ''}" data-ch="${c.id}" style="--c:${c.color}"><i></i>${c.lens}</button>`).join('')}
      </div>
      <div class="axes">
        <label>ציר אופקי <select id="ax">${DIMS.map((d, i) => `<option value="${i}" ${i === S.x ? 'selected' : ''}>${d.k}</option>`).join('')}</select></label>
        <label>ציר אנכי <select id="ay">${DIMS.map((d, i) => `<option value="${i}" ${i === S.y ? 'selected' : ''}>${d.k}</option>`).join('')}</select></label>
        <label class="${S.d3 ? '' : 'dim'}">ציר עומק <select id="az">${DIMS.map((d, i) => `<option value="${i}" ${i === S.z ? 'selected' : ''}>${d.k}</option>`).join('')}</select></label>
        <span class="seg"><button class="${S.d3 ? '' : 'on'}" data-d3="0">מישור</button><button class="${S.d3 ? 'on' : ''}" data-d3="1">מרחב</button></span>
      </div>
      <div class="plot" id="plot"><div class="tipbox" id="tipbox"></div></div>
      <div class="plot-note">כל עיגול הוא מרחב. הצבע: התחום. עיגולים שקופים: איפה שהם נחפפים, מרחבים מתחומים שונים יוצרים "חדר" משותף. מה נמדד: ה-DNA הפרשני, 1 עד 5.</div>
    </div>
    <aside class="side" id="aside"></aside>
  </section>`;
  const plot = document.getElementById('plot');
  const vis = () => ALL.filter(it => !S.on.size || S.on.has(it.ch.id));
  function headline() {
    const { x, y } = S, v = vis();
    const corners = [[1, 2, 1, 2], [4, 5, 4, 5], [4, 5, 1, 2], [1, 2, 4, 5]].map(([a, b, c, d]) => {
      const inn = v.filter(it => it.dna[x] >= a && it.dna[x] <= b && it.dna[y] >= c && it.dna[y] <= d);
      return { a, c, inn, chs: [...new Set(inn.map(i => i.ch.lens))] };
    }).sort((p, q) => q.chs.length - p.chs.length || q.inn.length - p.inn.length);
    const top = corners[0];
    const dx = top.a > 3 ? DIMS[x].hi : DIMS[x].lo, dy = top.c > 3 ? DIMS[y].hi : DIMS[y].lo;
    document.getElementById('atlasTitle').innerHTML = top.inn.length ? `<span class="mk">${dx} ו${dy}</span>: כאן נפגשים ${top.chs.length} תחומים` : 'בחרו תחומים להצגה';
    return top;
  }
  async function render() {
    if (!plot.isConnected) return;
    const top = headline();
    plot.querySelector('svg')?.remove(); plot.querySelector('canvas')?.remove();
    const sel = S.sel && byId[S.sel];
    const linked = sel ? new Set(resonances(sel).map(q => q.o.id)) : new Set();
    if (S.d3) {
      const { buildAtlas3D } = await import('./atlas3d.js');
      buildAtlas3D(plot, vis(), { x: S.x, y: S.y, z: S.z, dims: DIMS, sel: S.sel, linked, onPick: id => { location.hash = `#/atlas/${id}`; } });
      side(); return;
    }
    const r = plot.getBoundingClientRect(), W = Math.max(300, r.width), H = Math.max(260, r.height);
    const P = 54, sx = v => P + (v - .5) / 5 * (W - P * 1.5), sy = v => H - P - (v - .5) / 5 * (H - P * 1.5);
    const jit = (id, k) => ((hash(id + k) % 1000) / 1000 - .5) * .7;
    const cell = Math.min((W - P * 1.5) / 5, (H - P * 1.5) / 5);
    const rad = Math.max(12, cell * .2);
    plot.insertAdjacentHTML('afterbegin', `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="פיזור המרחבים">
      <g class="axis">
        ${[1, 2, 3, 4, 5].map(v => `<line x1="${sx(v)}" x2="${sx(v)}" y1="${P / 2}" y2="${H - P}" /><line x1="${P}" x2="${W - P / 2}" y1="${sy(v)}" y2="${sy(v)}" /><text class="tk" x="${sx(v)}" y="${H - P + 18}" text-anchor="middle">${v}</text><text class="tk" x="${P - 10}" y="${sy(v) + 4}" text-anchor="end">${v}</text>`).join('')}
        <text class="ax" x="${W - P / 2}" y="${H - 10}" text-anchor="end">${DIMS[S.x].k}: ${DIMS[S.x].lo} ← → ${DIMS[S.x].hi}</text>
        <text class="ax" x="16" y="${H / 2}" text-anchor="middle" transform="rotate(-90 16 ${H / 2})">${DIMS[S.y].k}: ${DIMS[S.y].lo} ← → ${DIMS[S.y].hi}</text>
      </g>
      <rect x="${sx(top.a - .5)}" y="${sy(top.c + 1.5)}" width="${sx(top.a + 1.5) - sx(top.a - .5)}" height="${sy(top.c - .5) - sy(top.c + 1.5)}" fill="var(--marker)" opacity=".35"/>
      <g style="mix-blend-mode:multiply">${vis().map(it => {
        const hl = it === sel || linked.has(it.id), dim = sel && !hl;
        return `<circle class="dot" data-id="${it.id}" cx="${sx(it.dna[S.x] + jit(it.id, 'x'))}" cy="${sy(it.dna[S.y] + jit(it.id, 'y'))}" r="${it === sel ? rad * 1.5 : hl ? rad * 1.25 : rad}" fill="${it.ch.color}" fill-opacity="${dim ? .08 : hl ? .5 : .26}" stroke="${it.ch.color}" stroke-opacity="${dim ? .2 : .85}" stroke-width="${hl ? 2.5 : 1.2}"/>`;
      }).join('')}</g>
      ${sel ? [sel, ...[...linked].map(id => byId[id])].map(o => `<text class="lbl" x="${sx(o.dna[S.x] + jit(o.id, 'x'))}" y="${sy(o.dna[S.y] + jit(o.id, 'y')) - rad * 1.5 - 6}" text-anchor="middle">${esc(o.name)}</text>`).join('') : ''}
    </svg>`);
    side();
  }
  function side() {
    const el = document.getElementById('aside');
    const it = S.sel && byId[S.sel];
    if (!it) {
      el.innerHTML = `<div><h3>איך קוראים</h3><p class="why">לוחצים על עיגול: נפתח המרחב, ושלושת המרחבים הקרובים לו מתחומים אחרים מודגשים, עם השם שלהם.</p></div>
      <div><h3>הגילוי</h3><p style="margin:0">הממדים חוזרים בכל התחומים. השינה העמוקה, התו הנמוך והגבורה יושבים באותה פינה.</p></div>
      <div class="mini-legend">${CHAPTERS.map(c => `<span><i style="background:${c.color}"></i>${c.lens}: ${c.title}</span>`).join('')}</div>`;
      return;
    }
    const res = resonances(it);
    el.innerHTML = `<div style="--c:${it.ch.color}">
      ${it.img ? `<div class="live zoomable side-img" data-img="${it.img}"><img class="blurbg" src="${src(it.img)}" alt=""><img class="main" src="${src(it.img)}" alt="${esc(it.name)}"></div>` : ''}
      <div class="small" style="color:${it.ch.color};font-weight:800;margin-top:10px">${it.ch.lens} · מרחב ${it.i + 1}</div>
      <h2 class="side-h">${esc(it.name)}</h2>
      <p style="margin:0 0 8px"><span class="mk">${esc(it.insight)}</span></p>
      <p style="margin:0;font-size:14px">${esc(it.space)}</p></div>
      <div><h3>העכביש: המרחב ותהודותיו</h3>${radar([{ vals: it.dna, color: it.ch.color, main: true }, ...res.map(r => ({ vals: r.o.dna, color: r.o.ch.color }))])}</div>
      <div><h3>תהודות</h3><div class="res">${res.map(r => `<a href="#/atlas/${r.o.id}" style="--c:${r.o.ch.color}"><span class="th" style="${thumbStyle(r.o)}"></span><span><span class="ch">${r.o.ch.lens}</span><div class="nm">${esc(r.o.name)}</div><div class="rule">משותף: ${esc(r.rule)}</div></span></a>`).join('')}</div></div>
      <div class="side-actions"><a class="btn" href="#/c/${it.ch.id}/${it.id}">לקרוא בספר</a><a class="btn" href="#/atlas/">ניקוי בחירה</a></div>`;
    el.querySelector('.side-img')?.addEventListener('click', () => lightbox({ img: src(it.img), title: it.name, page: it.page, color: it.ch.color }));
  }
  render();
  const tip = document.getElementById('tipbox');
  plot.addEventListener('mousemove', e => {
    const d = e.target.closest?.('.dot');
    if (!d) { tip.style.display = 'none'; return; }
    const it = byId[d.dataset.id], r = plot.getBoundingClientRect();
    tip.innerHTML = `<b>${esc(it.name)}</b><br><span style="color:${it.ch.color};font-weight:700">${it.ch.lens}</span> · ${esc(it.insight)}`;
    tip.style.display = 'block';
    tip.style.left = `${Math.min(r.width - 230, e.clientX - r.left + 14)}px`;
    tip.style.top = `${e.clientY - r.top + 14}px`;
  });
  plot.addEventListener('click', e => { const d = e.target.closest?.('.dot'); if (d) location.hash = `#/atlas/${d.dataset.id}`; });
  app.querySelector('.atlas-main').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.mode) { S.mode = b.dataset.mode; }
    else if (b.dataset.reset) { S.on.clear(); }
    else if (b.dataset.d3) { S.d3 = b.dataset.d3 === '1'; }
    else if (b.dataset.ch) {
      const id = b.dataset.ch;
      if (S.mode === 'solo') S.on = (S.on.size === 1 && S.on.has(id)) ? new Set() : new Set([id]);
      else { if (!S.on.size) S.on = new Set(CHAPTERS.map(c => c.id)); S.on.has(id) ? S.on.delete(id) : S.on.add(id); if (S.on.size === CHAPTERS.length) S.on.clear(); }
    } else return;
    viewAtlas();
  });
  ['ax', 'ay', 'az'].forEach((k, i) => { document.getElementById(k).onchange = e => { S[['x', 'y', 'z'][i]] = +e.target.value; render(); }; });
  let rt; new ResizeObserver(() => { if (!S.d3) { clearTimeout(rt); rt = setTimeout(render, 60); } }).observe(plot);
}

// ---------- סטודיו ----------
async function viewStudio(iid) {
  const it = byId[iid] || byId.prime;
  const ch = it.ch;
  const distill = `${it.name}: ${it.insight}`;
  const en = `${enPrompt(it.name, it.space, it.dna)} --ar 1:1 --style raw --no text, words, writing, frame divisions`;
  app.innerHTML = `
  <section class="view studio" style="--c:${ch.color}">
    <aside class="toc">
      <div class="toc-head">
        <select id="stCh" aria-label="בחירת פרק">${CHAPTERS.map(c => `<option value="${c.id}" ${c === ch ? 'selected' : ''}>${c.n}. ${c.lens}</option>`).join('')}</select>
        <div class="sortnote">בוחרים מרחב, והחדר נבנה מה-DNA שלו</div>
      </div>
      <div class="toc-list">${ch.items.map(x => `<a href="#/studio/${x.id}" class="${x === it ? 'on' : ''}"><span class="th" style="${thumbStyle(x, ch)}"><i class="no">${x.i + 1}</i></span><span><span class="nm">${esc(x.name)}</span><span class="sb">${esc(x.sub)}</span></span></a>`).join('')}</div>
    </aside>
    <div class="three" id="three">
      <div class="hud">
        <div><h2>${esc(it.name)}</h2><div class="rule">גובה מהפתיחות, עובי קיר מהמסה, פתחים ושמיים מהאור, מקצב עמודים מהתנועה, גוון מהחום.</div></div>
      </div>
      <div class="viewbar" id="viewbar"></div>
      <div class="status" id="st">טוען מנוע תלת־ממד…</div>
    </div>
    <aside class="side">
      <div><h3>ה-DNA שבונה את החדר</h3>${radar([{ vals: it.dna, color: ch.color, main: true }])}</div>
      <div><h3>מצב תצוגה</h3>
        <div class="seg wide" id="realSeg"><button class="on" data-real="1">ראליסטי</button><button data-real="0">מודל לבן</button></div>
        <label class="ctxsel">סביבה <select id="ctxSel"></select></label></div>
      <div class="row"><button class="btn" id="glb">הורדת GLB</button><button class="btn" id="png">צילום PNG</button><a class="btn" href="#/c/${ch.id}/${it.id}">למרחב בספר</a></div>
      <div><h3>פרומפט למידג׳רני</h3>
        <div class="prompt"><b>${esc(distill)}</b><span class="en">${esc(en)}</span></div>
        <button class="btn" id="cp" style="margin-top:6px">העתקה</button></div>
      <details class="pipe"><summary>מסלול להמחשה ראלית ופוטוגנית</summary>
        <ol class="steps">
          <li><span><b>מסה:</b> מורידים את ה-GLB מכאן. זה קנה המידה, הפתחים והקצב.</span></li>
          <li><span><b>מודל פרמטרי:</b> Rhino עם Grasshopper, או Blender עם Geometry Nodes.</span></li>
          <li><span><b>חומרים:</b> טקסטורות PBR חופשיות מ-Poly Haven ו-ambientCG (CC0).</span></li>
          <li><span><b>אור:</b> HDRI אמיתי לשעה ולמקום, ורינדור ב-Blender Cycles, D5 או Twinmotion.</span></li>
          <li><span><b>צילום:</b> עדשה 24 מ״מ, גובה עין 1.6 מ׳, אנכים ישרים.</span></li>
          <li><span><b>מהספר לתלת־ממד:</b> image-to-3D (TRELLIS, Tripo) מתמונת הספר, וניקוי ב-Blender.</span></li>
        </ol>
        <div class="std"><b>על מה זה נשען:</b> glTF 2.0 של Khronos, חומרי PBR. <b>אמינות:</b> משווים את הרינדור לתמונת הספר באותה זווית: יחס פתחים, כיוון אור וקנה מידה.</div>
      </details>
    </aside>
  </section>`;
  document.getElementById('stCh').onchange = e => { location.hash = `#/studio/${CH[e.target.value].items[0].id}`; };
  document.getElementById('cp').onclick = () => navigator.clipboard?.writeText(`${distill}\n${en}`).then(() => toast('הפרומפט הועתק'), () => toast('ההעתקה נחסמה בדפדפן'));
  try {
    const { buildRoom, CONTEXTS } = await import('./studio.js');
    const room = buildRoom(document.getElementById('three'), it, ch.color, { view: viewStudio.view || 'axo' });
    window.__room = room;
    document.getElementById('st').textContent = 'גוררים לסיבוב, גלגלת לזום';
    const vb = document.getElementById('viewbar');
    vb.innerHTML = Object.entries(room.views).map(([k, n]) => `<button data-v="${k}" class="${k === (viewStudio.view || 'axo') ? 'on' : ''}">${n}</button>`).join('');
    vb.onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; viewStudio.view = b.dataset.v; room.view(b.dataset.v); vb.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); };
    const cs = document.getElementById('ctxSel');
    cs.innerHTML = Object.entries(CONTEXTS).map(([k, n]) => `<option value="${k}" ${k === room.context ? 'selected' : ''}>${n}</option>`).join('');
    cs.onchange = () => room.setContext(cs.value);
    document.getElementById('realSeg').onclick = e => { const b = e.target.closest('[data-real]'); if (!b) return; room.setRealistic(b.dataset.real === '1'); e.currentTarget.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); };
    document.getElementById('glb').onclick = () => room.exportGLB(`${it.id}.glb`).then(() => toast('המודל ירד'));
    document.getElementById('png').onclick = () => { room.snapshot(`${it.id}.png`); toast('הצילום ירד'); };
  } catch (err) {
    document.getElementById('st').textContent = 'מנוע התלת־ממד לא נטען. רעננו את הדף.';
    console.error(err);
  }
}

// ---------- דפי הספר המקורי ----------
function viewPages(n) {
  n = Math.min(189, Math.max(1, +n || 1));
  const owners = ALL.filter(it => it.page === n);
  const chOwner = CHAPTERS.find(c => parseInt(c.cover.slice(1), 10) === n);
  app.innerHTML = `
  <section class="view pages">
    <div class="pg-stage">
      <a class="btn quiet pg-prev" href="#/pages/${Math.max(1, n - 1)}">הקודם</a>
      <figure class="a4"><img src="${pageSrc(n)}" alt="עמוד ${n} בספר המקורי"><figcaption>עמוד ${n} מתוך 189 · "${BOOK.title}", ${BOOK.date}</figcaption></figure>
      <a class="btn quiet pg-next" href="#/pages/${Math.min(189, n + 1)}">הבא</a>
    </div>
    <aside class="side">
      <div><h3>הדפים המקוריים</h3><p class="why">כמו שהם בספר, עם הקומפוזיציה והתמונות. תצוגת קנבה ברוחב 376 פיקסלים.</p></div>
      ${owners.length || chOwner ? `<div><h3>בספר החי</h3><div class="res">${owners.map(o => `<a href="#/c/${o.ch.id}/${o.id}" style="--c:${o.ch.color}"><span class="th" style="${thumbStyle(o)}"></span><span><span class="ch">${o.ch.lens}</span><div class="nm">${esc(o.name)}</div></span></a>`).join('')}${chOwner ? `<a href="#/c/${chOwner.id}" style="--c:${chOwner.color}"><span class="th" style="background-image:url(${src(chOwner.cover)})"></span><span><span class="ch">שער פרק</span><div class="nm">${chOwner.title}</div></span></a>` : ''}</div></div>` : ''}
      <div><h3>קפיצה לפרק</h3><div class="jump">${CHAPTERS.map(c => `<a href="#/pages/${Math.min(...c.items.filter(i => i.page).map(i => i.page), parseInt(c.cover.slice(1), 10))}" style="--c:${c.color}"><i></i>${c.n}. ${c.lens}</a>`).join('')}</div></div>
      <div class="row"><a class="btn" href="${pageSrc(n)}" target="_blank" rel="noopener">פתיחת העמוד בלשונית</a></div>
    </aside>
    <div class="strip" id="strip">${Array.from({ length: 189 }, (_, i) => `<a href="#/pages/${i + 1}" class="${i + 1 === n ? 'on' : ''}" title="עמוד ${i + 1}"><img loading="lazy" src="${pageSrc(i + 1)}" alt=""></a>`).join('')}</div>
  </section>`;
  app.querySelector('.a4 img').addEventListener('click', () => lightbox({ img: pageSrc(n), title: `עמוד ${n} בספר המקורי` }));
  document.querySelector('.strip a.on')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  viewPages.keys = { next: `#/pages/${Math.min(189, n + 1)}`, prev: `#/pages/${Math.max(1, n - 1)}` };
}

// ---------- נרטיבים ----------
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
    <div class="narr-head">
      <h1>חמישה ספרים<br>שמסתתרים בספר אחד</h1>
      <p>כאמן בינה: חמישה קונספטים להוצאת ספר, סדרת מגזין ותערוכה. כל קונספט נשען על מה שכבר קיים בספר, ומציע צורה אחרת לקרוא אותו. <span class="mk">הספר הוא מאגר. הנרטיב הוא הבחירה.</span></p>
    </div>
    <div class="narr-grid">${NARRATIVES.map(n => `
      <article class="n-card" style="--c:${n.color}">
        <div class="strip4">${(pick[n.id] || []).map(id => { const it = byId[id]; return it ? `<button data-id="${id}" title="${esc(it.name)}" style="${thumbStyle(it)}"></button>` : ''; }).join('')}</div>
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
      <div><h3>1. הספר המקורי</h3><p>189 עמודי קנבה. <a href="#/pages/1">לדפים</a></p></div>
      <div><h3>2. הספר החי</h3><p>זיקוק, תנועה, אטלס ותהודות.</p></div>
      <div><h3>3. גיליון ראשון</h3><p>נרטיב אחד, 24 עמודים, הדפסה ב-A4 מהאפליקציה.</p></div>
      <div><h3>4. תערוכה</h3><p>החדרים מהסטודיו הופכים למודלים מודפסים, וההדמיות לקירות.</p></div>
    </div>
  </section>`;
  app.querySelector('.narr-grid').addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (!b) return; const it = byId[b.dataset.id]; lightbox({ img: src(it.img), title: `${it.name} · ${it.ch.lens}`, page: it.page, color: it.ch.color }); });
}

// ---------- מקרא ----------
function viewLegend() {
  const motions = { fractal: 'עומק החזרה של הפרקטל', threshold: 'הסף: פתח, עותק או סינתזה', psy: 'קצב נשימה, ראות או פרטיות, לפי המרחב', wave: 'גל מוח בתדר האמיתי, יחסית', string: 'מיתר עומד, וסרגל אורך גל במטרים', glow: 'צבע הפליטה, ומסה אטומית: מרחף או שוקע', axis: 'כיוון: עלייה, ציר, מרכז, מנדלה או הקפה', compass: 'הכיוון שהמילה מסמנת', tree: 'עץ הספירות, הספירה הנוכחית מודגשת', number: 'הצורה של המספר', climate: 'לפי התופעה: רוח, שמש, לחות, אבק, צליל, גרדיאנט', flow: 'התופעה הפיזיקלית: עלייה, האצה, טפטוף, תהודה' };
  const count = Object.values(CUSTOM).reduce((s, a) => s + a.length, 0);
  app.innerHTML = `
  <section class="view legend">
    <h1>מקרא</h1>
    <p class="intro">סימן אחד, משמעות אחת, בכל מסך. <span class="mk">צבע הוא תחום. מרקר הוא תובנה. עכביש הוא DNA.</span></p>
    <div class="lg-grid">
      <div class="lg"><h2>צבע: התחום</h2><p class="why">כל פרק מקבל צבע אחד. הוא חוזר בכרטיס, בעיגול באטלס, בעכביש ובקו הציטוט. קישור לתחום אחר מקבל את הצבע שלו, שקוף.</p>
        <div class="swatches">${CHAPTERS.map(c => `<a href="#/c/${c.id}" style="--c:${c.color}"><i></i>${c.n}. ${c.lens}</a>`).join('')}</div></div>
      <div class="lg"><h2>DNA: עכביש של חמישה ממדים</h2><p class="why">קו מלא הוא המרחב. קו מקווקו הוא תהודה מתחום אחר, בצבע שלו. 1 עד 5, קריאה פרשנית.</p>
        ${radar([{ vals: byId.delta.dna, color: byId.delta.ch.color, main: true }, { vals: byId.do.dna, color: byId.do.ch.color }, { vals: byId.gevurah.dna, color: byId.gevurah.ch.color }], 230)}
        <p class="why">דוגמה: דלתא, ובקו מקווקו דו וגבורה.</p></div>
      <div class="lg"><h2>טקסט: חמישה פורמטים</h2><p class="why">כל סוג מידע נראה תמיד אותו דבר.</p>
        <div class="signs">
          <div><b>תובנה</b><span class="ex"><span class="mk">עד 8 מילים, במרקר</span></span></div>
          <div><b>המרחב</b><span class="ex">משפט אחד: חומר, אור, פתח</span></div>
          <div><b>ציטוט</b><span class="ex" style="border-right:3px solid #7a1f2b;padding-right:8px;font-family:var(--serif)">מילה במילה מהספר</span></div>
          <div><b>הייקו</b><span class="ex" style="font-family:var(--serif)">שלוש שורות</span></div>
          <div><b>טיפ ביצוע</b><span class="ex tip" style="padding:4px 8px"><b>ירוק:</b> מה עושים</span></div>
        </div></div>
      <div class="lg"><h2>תנועה: הפרמטר שנבחן</h2><p class="why">בפינת כל תמונה: שם הפרמטר, הערך שלו במרחב הזה, ופס יחסי. הערך משתנה בין מרחב למרחב.</p>
        <div class="signs">${CHAPTERS.map(c => `<div><b style="color:${c.color}">${c.lens}</b><span class="ex">${motions[c.motion]}</span></div>`).join('')}</div></div>
      <div class="lg"><h2>על מה הספר נשען</h2><p class="why">עובדה, הערכה ומגבלה, בנפרד.</p>
        <div class="signs">
          <div><b>עובדה</b><span class="ex">טקסט, ציטוטים ותדרים: מתוך הספר. אורך גל: 343 מ׳ לשנייה חלקי התדר.</span></div>
          <div><b>עובדה</b><span class="ex">מסות אטומיות של הגזים: מהטבלה המחזורית, מעוגלות.</span></div>
          <div><b>הערכה</b><span class="ex">ערכי ה-DNA והתהודות: פרשנות של העורך.</span></div>
          <div><b>מגבלה</b><span class="ex">התמונות המקוריות בספר הן קבצי 640 פיקסלים. כאן הן מוצגות מתצוגת קנבה, בפרופורציה המלאה ובלי חיתוך.</span></div>
        </div></div>
      <div class="lg"><h2>מרחבים שהוספת</h2><p class="why">${count ? `${count} מרחבים שמורים בדפדפן הזה.` : 'עוד לא הוספת מרחבים. מוסיפים מתוך פרק פתוח.'}</p>
        <div class="row"><button class="btn" id="expJ" ${count ? '' : 'disabled'}>ייצוא JSON</button><label class="btn">ייבוא JSON<input type="file" id="impJ" accept="application/json" hidden></label></div></div>
    </div>
  </section>`;
  document.getElementById('expJ').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(CUSTOM, null, 2)], { type: 'application/json' })); a.download = 'merchavei-bechira-custom.json'; a.click(); };
  document.getElementById('impJ').onchange = async e => { try { const d = JSON.parse(await e.target.files[0].text()); Object.entries(d).forEach(([k, arr]) => { if (!CH[k]) return; arr.forEach(x => { if (!byId[x.id]) { (CUSTOM[k] ||= []).push(x); CH[k].items.push({ ...x, custom: true }); } }); }); saveCustom(CUSTOM); reindex(); byId = BYID(); toast('יובא'); viewLegend(); } catch { toast('הקובץ לא תקין'); } };
}

// ---------- ניתוב ----------
function route() {
  const [, a, b, c] = (location.hash || '#/').split('/');
  document.querySelectorAll('.nav a').forEach(n => n.classList.toggle('on', n.dataset.nav === (a || 'home')));
  document.querySelector('.lb')?.remove();
  if (a !== 'c') document.querySelector('.chapter')?.remove();
  if (a === 'c') viewChapter(b, c);
  else if (a === 'atlas') viewAtlas(b || '');
  else if (a === 'studio') viewStudio(b);
  else if (a === 'narratives') viewNarratives();
  else if (a === 'legend') viewLegend();
  else if (a === 'pages') viewPages(b);
  else viewHome();
  if (a !== 'c') window.scrollTo(0, 0);
  const t = a === 'c' ? (byId[c]?.name || CH[b]?.title) : { atlas: 'אטלס', studio: 'סטודיו', narratives: 'נרטיבים', legend: 'מקרא', pages: 'דפי הספר' }[a];
  document.title = t ? `${t} · מרחבי בחירה` : 'מרחבי בחירה';
}
window.addEventListener('hashchange', route);
document.addEventListener('keydown', e => {
  if (document.querySelector('.lb') || e.target.closest('select,input,textarea')) return;
  const k = document.querySelector('.chapter') ? viewChapter.keys : document.querySelector('.pages') ? viewPages.keys : null;
  if (!k) return;
  if (e.key === 'ArrowLeft') location.hash = k.next;
  if (e.key === 'ArrowRight') location.hash = k.prev;
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
