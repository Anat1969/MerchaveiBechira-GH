// שכבת תנועה: לכל פרק פרמטר אחד שנבחן, והתנועה משתנה לפי הערך שלו בכל מרחב.
const SEF = [[.5,.08],[.75,.2],[.25,.2],[.75,.42],[.25,.42],[.5,.52],[.75,.68],[.25,.68],[.5,.8],[.5,.95]];
const GAS = { he: [4, 1], ne: [20, 2], ar: [40, 3], kr: [84, 4], xe: [131, 5], rn: [222, 6], og: [294, 7] }; // מסה אטומית, סדר

export function attachFx(host, mode, o = {}) {
  const cv = document.createElement('canvas');
  cv.className = 'fx';
  host.appendChild(cv);
  const ctx = cv.getContext('2d');
  const col = o.color || '#ffffff';
  const id = o.id || '';
  const dna = o.dna || [3, 3, 3, 3, 3];
  let w = 0, h = 0;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const parts = Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random(), v: .2 + Math.random() * .8, s: Math.random() }));
  function size() {
    const r = host.getBoundingClientRect(); w = r.width; h = r.height;
    cv.width = Math.max(1, w * dpr); cv.height = Math.max(1, h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  size();
  const ro = new ResizeObserver(size); ro.observe(host);
  const t0 = performance.now();
  let drawn = false;
  function frame(now) {
    if (!host.isConnected) { ro.disconnect(); return; }
    requestAnimationFrame(frame);
    if (document.body.classList.contains('still') && drawn) return;
    drawn = true;
    const t = (now - t0) / 1000;
    ctx.clearRect(0, 0, w, h);
    if (o.solo) {
      const g = ctx.createRadialGradient(w * .5, h * .45, 10, w * .5, h * .5, Math.max(w, h) * .7);
      g.addColorStop(0, '#2a2824'); g.addColorStop(1, '#0d0d0c'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
    (D[mode] || D.wind)(t);
  }
  // ---------- כלים ----------
  const st = (a = .85, lw = 2) => { ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = lw; };
  const glowOn = (c = col, b = 14) => { ctx.shadowColor = c; ctx.shadowBlur = b; };
  const glowOff = () => { ctx.shadowBlur = 0; };
  // מד הפרמטר: שם, ערך, ופס יחסי. תמיד באותו מקום.
  function gauge(name, value, frac) {
    const x = w - 14, y = 14, bw = Math.min(170, w * .4);
    ctx.fillStyle = 'rgba(0,0,0,.42)'; ctx.fillRect(x - bw - 12, y - 4, bw + 12, 44);
    ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.font = '600 11px Assistant, sans-serif';
    ctx.fillText(name, x - 6, y + 10);
    ctx.fillStyle = '#fff'; ctx.font = '800 14px Assistant, sans-serif'; ctx.fillText(value, x - 6, y + 26);
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(x - bw - 6, y + 33, bw, 3);
    ctx.fillStyle = col; ctx.fillRect(x - 6 - bw * Math.max(.04, Math.min(1, frac)), y + 33, bw * Math.max(.04, Math.min(1, frac)), 3);
  }
  const ring = (x, y, r, a, lw = 1.5) => { st(a, lw); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke(); };
  const dots = (fn, n = 80) => parts.slice(0, n).forEach(fn);

  const D = {
    // ---------- גלי מוח: התדר האמיתי, יחסית ----------
    wave(t) {
      const hz = o.hz || 10, cycles = Math.max(1, hz / 2), base = h * .78, amp = h * .07;
      glowOn(); st(.95, 2.5); ctx.beginPath();
      for (let x = 0; x <= w; x += 2) { const y = base + amp * Math.sin((x / w) * cycles * Math.PI * 2 - t * Math.min(10, 1 + hz / 5)); x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke(); glowOff();
      gauge('תדר המוח', `${hz} Hz · ${Math.round(cycles)} מחזורים`, Math.log(hz) / Math.log(60));
    },
    // ---------- תווים: אורך הגל קובע את גודל החדר ----------
    string(t) {
      const hz = o.hz || 261.63, lam = 343 / hz, n = Math.max(1, Math.round(hz / 261.63 * 3));
      const base = h * .5, amp = h * .2 * Math.cos(t * hz / 60);
      glowOn(); st(.9, 2); ctx.beginPath();
      for (let x = 0; x <= w; x += 2) { const y = base + amp * Math.sin((x / w) * n * Math.PI); x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke(); glowOff();
      const bl = (lam / 1.4) * (w - 40);
      st(.9, 3); ctx.beginPath(); ctx.moveTo(w - 20, h - 26); ctx.lineTo(w - 20 - bl, h - 26); ctx.stroke();
      [w - 20, w - 20 - bl].forEach(x => { ctx.beginPath(); ctx.moveTo(x, h - 32); ctx.lineTo(x, h - 20); ctx.stroke(); });
      gauge('אורך הגל', `λ ${lam.toFixed(2)} מ׳`, lam / 1.4);
    },
    // ---------- גזים: צבע הפליטה, ומסה שקובעת ריחוף או שקיעה ----------
    glow(t) {
      const c = o.glow || col, [m, k] = GAS[id] || [40, 3], p = .6 + .4 * Math.sin(t * (3 - k * .3));
      ctx.globalCompositeOperation = 'screen';
      const g = ctx.createRadialGradient(w * .5, h * .55, 0, w * .5, h * .55, Math.max(w, h) * .6);
      g.addColorStop(0, hexA(c, .6 * p)); g.addColorStop(1, hexA(c, 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      const dir = k <= 3 ? -1 : 1, speed = .02 + (8 - k) * .012;
      dots((q, i) => {
        const y = (((q.y + dir * t * speed * q.v) % 1) + 1) % 1 * h, x = q.x * w + Math.sin(t + i) * 10;
        ctx.fillStyle = hexA(c, .55 + .45 * Math.sin(t * 2 + i)); ctx.beginPath(); ctx.arc(x, y, 1 + k * .45 * q.s + 1, 0, 7); ctx.fill();
      }, 20 + k * 14);
      ctx.globalCompositeOperation = 'source-over';
      gauge('מסה אטומית', `${m} · ${k <= 3 ? 'מרחף' : 'שוקע'}`, m / 294);
    },
    // ---------- פסיכולוגיה: הגוף בתוך המרחב ----------
    psy(t) {
      if (id === 'ptsd') {
        const cx = w / 2, cy = h / 2, R = Math.min(w, h) * .42, a = t * .9;
        ring(cx, cy, R, .5); ring(cx, cy, R * .6, .3);
        const g = ctx.createConicGradient ? ctx.createConicGradient(a, cx, cy) : null;
        if (g) { g.addColorStop(0, hexA(col, .55)); g.addColorStop(.12, hexA(col, 0)); g.addColorStop(1, hexA(col, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill(); }
        gauge('ראות', '360° · אפס פינות עיוורות', 1); return;
      }
      if (id === 'social') {
        const k = (Math.sin(t * .5) + 1) / 2;
        ctx.fillStyle = `rgba(20,20,30,${.25 + .35 * k})`; ctx.fillRect(0, 0, w / 2, h);
        st(.7, 1); ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke();
        gauge('פרטיות', 'רואה החוצה, לא נראה', .8); return;
      }
      if (id === 'mirror') {
        st(.9, 2); ctx.beginPath(); ctx.moveTo(w / 2, h * .05); ctx.lineTo(w / 2, h * .95); ctx.stroke();
        const y = h * .5 + Math.sin(t) * h * .2;
        [w / 2 - 60, w / 2 + 60].forEach(x => { ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fill(); });
        gauge('חוץ מול פנים', 'זהים', .5); return;
      }
      const inS = id === 'panic' ? 4 : 4, holdS = id === 'panic' ? 7 : 2, outS = id === 'panic' ? 8 : 4, cyc = inS + holdS + outS;
      const ph = t % cyc, k = ph < inS ? ph / inS : ph < inS + holdS ? 1 : 1 - (ph - inS - holdS) / outS;
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * (.18 + .3 * k), w / 2, h / 2, Math.max(w, h) * .75);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${.7 - .4 * k})`); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ring(w / 2, h / 2, Math.min(w, h) * (.12 + .18 * k), .8, 2);
      gauge('קצב נשימה', `${inS}-${holdS}-${outS} · ${ph < inS ? 'שאיפה' : ph < inS + holdS ? 'עצירה' : 'נשיפה'}`, k);
    },
    // ---------- פילוסופיה ----------
    threshold(t) {
      if (id === 'baudrillard') {
        for (let i = 0; i < 6; i++) { const s = 1 - i * .14 + Math.sin(t) * .02; st(.7 - i * .1, 1.5); ctx.strokeRect(w / 2 - w * s / 2.4, h / 2 - h * s / 2.4, w * s / 1.2, h * s / 1.2); }
        gauge('עותק של עותק', 'אין מקור', .9); return;
      }
      if (id === 'hegel') {
        const k = (Math.sin(t * .5) + 1) / 2, x1 = w * (.2 + .25 * k), x2 = w * (.8 - .25 * k);
        [[x1, '#f5c26b'], [x2, '#8fb3ff']].forEach(([x, c]) => { const g = ctx.createRadialGradient(x, h / 2, 0, x, h / 2, w * .3); g.addColorStop(0, hexA(c, .55)); g.addColorStop(1, hexA(c, 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); });
        gauge('תזה ואנטיתזה', k > .85 ? 'סינתזה' : 'מתקרבות', k); return;
      }
      const k = (Math.sin(t * .4) + 1) / 2, dw = w * (.015 + .08 * k);
      const g = ctx.createLinearGradient(w / 2 - dw, 0, w / 2 + dw, 0);
      g.addColorStop(0, 'rgba(255,245,220,0)'); g.addColorStop(.5, `rgba(255,245,220,${.35 + .3 * k})`); g.addColorStop(1, 'rgba(255,245,220,0)');
      ctx.fillStyle = g; ctx.fillRect(w / 2 - dw, h * .05, dw * 2, h * .9);
      gauge('הפתח אל האופק', id === 'heidegger' ? 'נסגר ונפתח: סופיות' : 'סף', k);
    },
    // ---------- יסודות ----------
    prime(t) {
      const s = Math.min(w, h) * .55, x = (w - s) / 2, y = (h - s) / 2;
      st(.9, 2); ctx.strokeRect(x, y, s, s);
      ctx.fillStyle = 'rgba(255,240,200,.95)'; ctx.fillRect(x + s * .45, y + s - 3, s * .1, 6);
      const r = s * (.18 + .04 * Math.sin(t * 1.2)), g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, r * 2.4);
      g.addColorStop(0, 'rgba(255,236,190,.9)'); g.addColorStop(1, 'rgba(255,236,190,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(w / 2, h / 2, r * 2.4, 0, 7); ctx.fill();
      gauge('חלוקה', 'מתחלק רק בעצמו: 1', .1);
    },
    fractal(t) {
      const depth = 5, k = (Math.sin(t * .5) + 1) / 2;
      st(.85, 1);
      const rec = (x, y, s, d) => { if (d > depth) return; ctx.strokeRect(x, y, s, s); const n = s / 3; if (d < depth * (.4 + .6 * k)) { rec(x, y, n, d + 1); rec(x + 2 * n, y + 2 * n, n, d + 1); rec(x + n, y + n, n, d + 1); } };
      const s = Math.min(w, h) * .7; rec((w - s) / 2, (h - s) / 2, s, 0);
      gauge('עומק החזרה', `${Math.round(depth * (.4 + .6 * k))} רמות`, k);
    },
    saudade(t) {
      const y = h * .55, k = (Math.sin(t * .3) + 1) / 2;
      const g = ctx.createLinearGradient(0, y - 40, 0, y + 40); g.addColorStop(0, 'rgba(255,214,150,0)'); g.addColorStop(.5, `rgba(255,214,150,${.25 + .35 * k})`); g.addColorStop(1, 'rgba(255,214,150,0)');
      ctx.fillStyle = g; ctx.fillRect(0, y - 40, w, 80);
      gauge('המרחק לאופק', 'תמיד רחוק', .95);
    },
    // ---------- אמונה: כיוון, מרכז ומעבר ----------
    axis(t) {
      const cx = w / 2, cy = h * .55;
      if (id === 'islam') {
        dots((q, i) => { const a = q.x * 7, r = (1 - ((t * .15 * q.v + q.s) % 1)) * Math.max(w, h) * .6; ctx.fillStyle = 'rgba(255,246,208,.8)'; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1.6, 0, 7); ctx.fill(); }, 90);
        gauge('כיוון', 'הכול נאסף למרכז אחד', 1); return;
      }
      if (id === 'hinduism') {
        for (let i = 0; i < 6; i++) ring(cx, cy, ((t * 30 + i * 40) % 240), .7 - ((t * 30 + i * 40) % 240) / 340);
        gauge('מעבר', 'מים במרכז המנדלה', .6); return;
      }
      if (id === 'buddhism') {
        ring(cx, cy, Math.min(w, h) * .3, .5); const a = t * .5;
        glowOn('#fff6d0', 16); ctx.fillStyle = '#fff6d0'; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * Math.min(w, h) * .3, cy + Math.sin(a) * Math.min(w, h) * .3, 6, 0, 7); ctx.fill(); glowOff();
        gauge('הקפה', 'סביב הריק', (a % 6.28) / 6.28); return;
      }
      const p = (t * .12) % 1;
      if (id === 'judaism') {
        st(.6, 1.5); for (let i = 0; i < 7; i++) { const x = w * .15 + i * w * .1, y = h * .85 - i * h * .08; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w * .1, y); ctx.lineTo(x + w * .1, y - h * .08); ctx.stroke(); }
        const i = Math.floor(p * 7); glowOn('#fff6d0', 18); ctx.fillStyle = '#fff6d0'; ctx.beginPath(); ctx.arc(w * .2 + i * w * .1, h * .83 - i * h * .08, 6, 0, 7); ctx.fill(); glowOff();
        gauge('עלייה', `מדרגה ${i + 1} מתוך 7`, (i + 1) / 7); return;
      }
      st(.45, 1); ctx.beginPath(); ctx.moveTo(w, cy); ctx.lineTo(0, cy); ctx.stroke();
      glowOn('#fff6d0', 18); ctx.fillStyle = '#fff6d0'; ctx.beginPath(); ctx.arc(w - p * w, cy, 6, 0, 7); ctx.fill(); glowOff();
      gauge('ציר', 'מן הסף אל האור', p);
    },
    // ---------- שפה: מצפן ----------
    compass(t) {
      const cx = w * .16, cy = h * .3, r = Math.min(w, h) * .12, ang = ((hashN(id) % 360) * Math.PI) / 180 + Math.sin(t * .4) * .08;
      st(.85, 1.3); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke();
      ['צ', 'מז', 'ד', 'מע'].forEach((d, i) => { const a = -Math.PI / 2 + i * Math.PI / 2; ctx.fillStyle = '#fff'; ctx.font = '700 11px Assistant'; ctx.textAlign = 'center'; ctx.fillText(d, cx + Math.cos(a) * (r + 12), cy + Math.sin(a) * (r + 12) + 4); });
      glowOn(); st(1, 3); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r); ctx.stroke(); glowOff();
      gauge('הכיוון שהמילה מסמנת', o.sub || '', .5);
    },
    tree(t) {
      const ox = w * .05, oy = h * .1, sw = Math.min(w * .25, h * .32), sh = h * .8;
      const P = SEF.map(([x, y]) => [ox + x * sw, oy + y * sh]);
      st(.4, 1);
      [[0,1],[0,2],[1,2],[1,3],[2,4],[3,4],[3,5],[4,5],[3,6],[4,7],[5,6],[5,7],[6,7],[6,8],[7,8],[8,9],[0,5],[5,8]].forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(...P[a]); ctx.lineTo(...P[b]); ctx.stroke(); });
      P.forEach((p, i) => { const on = i === (o.idx ?? -1); if (on) glowOn(col, 20); ctx.fillStyle = on ? col : 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(p[0], p[1], on ? 8 + Math.sin(t * 3) * 2 : 4, 0, 7); ctx.fill(); glowOff(); });
      gauge('הספירה בעץ', `${(o.idx ?? -1) + 1} מתוך 10`, ((o.idx ?? 0) + 1) / 10);
    },
    number(t) {
      const n = o.n || 1, cx = w * .5, cy = h * .5, r = Math.min(w, h) * .3;
      glowOn(col, 16); st(.95, 2.5); ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * .12); ctx.beginPath();
      if (n === 1) { ctx.arc(0, 0, 9, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); }
      else if (n === 2) { ctx.moveTo(-r, -10); ctx.lineTo(r, -10); ctx.moveTo(-r, 10); ctx.lineTo(r, 10); ctx.stroke(); }
      else if (n === 10) { ctx.arc(0, 0, r, 0, 7); ctx.stroke(); }
      else if (n === 8) { for (let a = 0; a <= 6.3; a += .05) { const d = 1 + Math.sin(a) ** 2, x = r * Math.cos(a) / d, y = r * Math.sin(a) * Math.cos(a) / d; a ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
      else if (n === 7 || n === 9) { for (let a = 0; a < 12; a += .1) { const rr = r * a / 12; a ? ctx.lineTo(rr * Math.cos(a), rr * Math.sin(a)) : ctx.moveTo(0, 0); } ctx.stroke(); }
      else { for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / n; i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.stroke(); }
      ctx.restore(); glowOff();
      gauge('המספר כצורה', `${n}`, n / 10);
    },
    // ---------- אקלים: לפי התופעה ----------
    climate(t) {
      const g = o.g, mv = dna[3];
      if (g === 'שמש') {
        const a = Math.PI * (.15 + .7 * ((t * .05) % 1)), sx = w / 2 - Math.cos(a) * w * .45, sy = h * .9 - Math.sin(a) * h * .75;
        const gr = ctx.createLinearGradient(sx, sy, w / 2, h); gr.addColorStop(0, 'rgba(255,226,160,.6)'); gr.addColorStop(1, 'rgba(255,226,160,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(w * .35, h); ctx.lineTo(w * .65, h); ctx.fill();
        glowOn('#ffd98a', 30); ctx.fillStyle = '#ffe3a6'; ctx.beginPath(); ctx.arc(sx, sy, 9, 0, 7); ctx.fill(); glowOff();
        gauge('מסלול השמש', `${Math.round(a * 180 / Math.PI)}°`, a / Math.PI); return;
      }
      if (g === 'לחות') {
        const k = (Math.sin(t * .4) + 1) / 2;
        for (let i = 0; i < 4; i++) { const y = h * (.4 + i * .15) + Math.sin(t * .3 + i) * 10; const gr = ctx.createLinearGradient(0, y - 40, 0, y + 40); gr.addColorStop(0, 'rgba(240,245,250,0)'); gr.addColorStop(.5, `rgba(240,245,250,${.15 + .25 * k})`); gr.addColorStop(1, 'rgba(240,245,250,0)'); ctx.fillStyle = gr; ctx.fillRect(0, y - 40, w, 80); }
        gauge('לחות יחסית', `${Math.round(40 + 45 * k)}%`, .4 + .45 * k); return;
      }
      if (g === 'אבק') {
        dots((q) => { const y = ((q.y + t * .02 * q.v) % 1) * h, x = q.x * w + Math.sin(t * .5 + q.s * 9) * 14; ctx.fillStyle = `rgba(255,236,200,${.3 + .5 * q.s})`; ctx.beginPath(); ctx.arc(x, y, .8 + q.s * 1.6, 0, 7); ctx.fill(); }, 130);
        gauge('שקיעת חלקיקים', 'האבק כותב', .5); return;
      }
      if (g === 'צליל') {
        for (let i = 0; i < 7; i++) { const r = (t * 50 + i * 45) % 320; ring(w / 2, h * .6, r, Math.max(0, .8 - r / 340), 2); }
        gauge('הד', mv >= 4 ? 'מתפזר' : 'נבלע', mv / 5); return;
      }
      if (g === 'גרדיאנט') {
        const k = (t * .08) % 1, gr = ctx.createLinearGradient(0, 0, w, 0);
        gr.addColorStop(Math.max(0, k - .3), hexA(col, 0)); gr.addColorStop(k, hexA(col, .45)); gr.addColorStop(Math.min(1, k + .3), hexA(col, 0));
        ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
        gauge('מעבר הדרגתי', `${Math.round(k * 100)}%`, k); return;
      }
      D.wind(t, mv);
      gauge('מהירות הרוח', `תנועה ${mv} מתוך 5`, mv / 5);
    },
    wind(t, mv = 3) {
      ctx.lineCap = 'round';
      parts.forEach((q, i) => {
        const x = (((q.x - t * .025 * mv * q.v) % 1) + 1) % 1 * w, y = q.y * h + Math.sin(t * q.v + i) * 10;
        ctx.strokeStyle = `rgba(255,255,255,${.2 + .4 * q.s})`; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 10 + 14 * mv * q.v, y); ctx.stroke();
      });
    },
    // ---------- כוחות: התופעה הפיזיקלית ----------
    flow(t) {
      const mv = dna[3];
      if (id === 'venturi') {
        st(.5, 1); for (let i = 0; i < 9; i++) { const y0 = h * (.1 + i * .1); ctx.beginPath(); for (let x = 0; x <= w; x += 6) { const k = Math.exp(-(((x / w) - .5) ** 2) / .03); const y = h / 2 + (y0 - h / 2) * (1 - .6 * k); x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
        dots((q) => { const x = ((q.x + t * .06 * q.v) % 1) * w; const k = Math.exp(-(((x / w) - .5) ** 2) / .03); const y = h / 2 + (q.y * h - h / 2) * (1 - .6 * k); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(x, y, 1.5 + k, 0, 7); ctx.fill(); }, 70);
        gauge('האצה בצוואר', 'יחס 1:2 עד 1:3', .7); return;
      }
      if (['drip', 'nightrad', 'tension', 'capillarity', 'hygro'].includes(id)) {
        dots((q) => { const y = ((q.y + t * .12 * q.v) % 1) * h, x = q.x * w; ctx.strokeStyle = 'rgba(210,235,255,.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 8); ctx.stroke(); }, 50);
        gauge('מים', id === 'capillarity' ? 'עולים בחומר' : 'טיפה אחר טיפה', .5); return;
      }
      if (id === 'resonance') { for (let i = 0; i < 6; i++) { const r = (t * 60 + i * 50) % 300; ring(w * .5, h * .6, r, Math.max(0, .8 - r / 320), 2); } gauge('תהודה', 'נשברת בחריצים', .4); return; }
      if (['uv', 'diffuse'].includes(id)) {
        const k = (t * .08) % 1, gr = ctx.createLinearGradient(0, 0, w, 0);
        gr.addColorStop(Math.max(0, k - .3), 'rgba(255,240,210,0)'); gr.addColorStop(k, 'rgba(255,240,210,.45)'); gr.addColorStop(Math.min(1, k + .3), 'rgba(255,240,210,0)');
        ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
        gauge(id === 'uv' ? 'דהייה עונתית' : 'ריכוך סנוור', `${Math.round(k * 100)}%`, k); return;
      }
      dots((q, i) => { const y = (((q.y - t * .04 * mv * q.v) % 1) + 1) % 1 * h, x = q.x * w + Math.sin(t * .8 + y / 40) * 12; ctx.fillStyle = `rgba(255,250,235,${.25 + .45 * q.s})`; ctx.beginPath(); ctx.arc(x, y, 1 + q.s * 1.6, 0, 7); ctx.fill(); }, 110);
      gauge(id === 'stack' ? 'אוויר חם עולה' : 'זרימה', `תנועה ${mv} מתוך 5`, mv / 5);
    },
  };
  requestAnimationFrame(frame);
}

function hashN(s) { return [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7); }
export function hexA(hex, a) {
  const h = String(hex).replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
}
