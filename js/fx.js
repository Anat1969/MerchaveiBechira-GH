// שכבת תנועה: אנימציה אחת לכל פרק, זהה בכל המרחבים שלו.
// רק ערך הפרמטר משתנה (o.frac בין 0 ל-1, ו-o.sv הערך עצמו), כדי שהמנעד ייקרא.
const SEF = [[.5,.08],[.75,.2],[.25,.2],[.75,.42],[.25,.42],[.5,.52],[.75,.68],[.25,.68],[.5,.8],[.5,.95]];

export function attachFx(host, mode, o = {}) {
  const cv = document.createElement('canvas');
  cv.className = 'fx';
  host.appendChild(cv);
  const ctx = cv.getContext('2d');
  const col = o.color || '#ffffff';
  let state = { ...o };
  let w = 0, h = 0;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const parts = Array.from({ length: 160 }, () => ({ x: Math.random(), y: Math.random(), v: .2 + Math.random() * .8, s: Math.random() }));
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
    if (state.solo) {
      const g = ctx.createRadialGradient(w * .5, h * .45, 10, w * .5, h * .5, Math.max(w, h) * .7);
      g.addColorStop(0, '#26241f'); g.addColorStop(1, '#0c0c0b'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
    (D[mode] || D.climate)(t, state);
    if (state.gauge !== false) gauge(state);
  }
  const st = (a = .85, lw = 2) => { ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = lw; };
  const glowOn = (c = col, b = 14) => { ctx.shadowColor = c; ctx.shadowBlur = b; };
  const glowOff = () => { ctx.shadowBlur = 0; };
  const ring = (x, y, r, a, lw = 1.5) => { st(a, lw); ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, 7); ctx.stroke(); };
  function gauge(s) {
    if (!s.label) return;
    const x = w - 14, y = 14, bw = Math.min(190, w * .42), f = Math.max(.03, Math.min(1, s.frac ?? .5));
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x - bw - 12, y - 4, bw + 12, 46);
    ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,255,255,.72)'; ctx.font = '600 11px Assistant, sans-serif';
    ctx.fillText(s.label, x - 6, y + 10);
    ctx.fillStyle = '#fff'; ctx.font = '800 15px Assistant, sans-serif'; ctx.fillText(s.valueText || '', x - 6, y + 27);
    ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(x - bw - 6, y + 35, bw, 3);
    ctx.fillStyle = col; ctx.fillRect(x - 6 - bw * f, y + 35, bw * f, 3);
  }
  const D = {
    // מתמטיקה: חלוקה של ריבוע. מספר החלוקות הוא המספר שמאחורי המרחב.
    math(t, s) {
      const f = s.frac ?? .5, depth = 1 + Math.round(f * 5), side = Math.min(w, h) * .62, x0 = (w - side) / 2, y0 = (h - side) / 2;
      st(.85, 1.4);
      const k = (Math.sin(t * .6) + 1) / 2;
      const rec = (x, y, sz, d, horiz) => {
        ctx.strokeRect(x, y, sz.w, sz.h);
        if (d >= depth * (.5 + .5 * k)) return;
        const r = 1 / 1.618;
        if (horiz) { const a = sz.w * r; rec(x, y, { w: a, h: sz.h }, d + 1, !horiz); }
        else { const a = sz.h * r; rec(x, y + sz.h - a, { w: sz.w, h: a }, d + 1, !horiz); }
      };
      rec(x0, y0, { w: side, h: side }, 1, true);
      glowOn('#fff3c4', 22); ctx.fillStyle = 'rgba(255,243,196,.9)'; ctx.beginPath(); ctx.arc(x0 + side * .3, y0 + side * .7, 3 + depth, 0, 7); ctx.fill(); glowOff();
    },
    // פילוסופיה: סף אור. רוחב הסף הוא הפתיחות.
    threshold(t, s) {
      const f = s.frac ?? .5, k = (Math.sin(t * .5) + 1) / 2, dw = w * (.01 + .16 * f) * (.85 + .15 * k);
      const g = ctx.createLinearGradient(w / 2 - dw, 0, w / 2 + dw, 0);
      g.addColorStop(0, 'rgba(255,245,220,0)'); g.addColorStop(.5, `rgba(255,245,220,${.35 + .3 * k})`); g.addColorStop(1, 'rgba(255,245,220,0)');
      ctx.fillStyle = g; ctx.fillRect(w / 2 - dw, h * .05, dw * 2, h * .9);
    },
    // פסיכולוגיה: נשימה. משך המחזור משתנה, הצורה זהה.
    psy(t, s) {
      const cyc = 4 + (1 - (s.frac ?? .5)) * 8, ph = (t % cyc) / cyc, k = ph < .4 ? ph / .4 : 1 - (ph - .4) / .6;
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * (.16 + .3 * k), w / 2, h / 2, Math.max(w, h) * .75);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${.72 - .4 * k})`); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ring(w / 2, h / 2, Math.min(w, h) * (.1 + .2 * k), .85, 2);
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = '700 12px Assistant'; ctx.textAlign = 'center'; ctx.fillText(ph < .4 ? 'שאיפה' : 'נשיפה', w / 2, h / 2 + 4);
    },
    // תדרים: גל המוח, מספר המחזורים יחסי לתדר.
    wave(t, s) {
      const hz = s.sv || 10, cycles = Math.max(1, hz / 2), base = h * .78, amp = h * .07;
      glowOn(); st(.95, 2.5); ctx.beginPath();
      for (let x = 0; x <= w; x += 2) { const y = base + amp * Math.sin((x / w) * cycles * Math.PI * 2 - t * Math.min(10, 1 + hz / 5)); x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke(); glowOff();
    },
    // תווים: מיתר עומד וסרגל אורך גל.
    string(t, s) {
      const hz = s.sv || 261.63, lam = 343 / hz, n = Math.max(1, Math.round(hz / 261.63 * 3)), base = h * .5, amp = h * .2 * Math.cos(t * hz / 60);
      glowOn(); st(.9, 2); ctx.beginPath();
      for (let x = 0; x <= w; x += 2) { const y = base + amp * Math.sin((x / w) * n * Math.PI); x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke(); glowOff();
      const bl = (lam / 1.4) * (w - 40);
      st(.9, 3); ctx.beginPath(); ctx.moveTo(w - 20, h - 26); ctx.lineTo(w - 20 - bl, h - 26); ctx.stroke();
      [w - 20, w - 20 - bl].forEach(x => { ctx.beginPath(); ctx.moveTo(x, h - 32); ctx.lineTo(x, h - 20); ctx.stroke(); });
      ctx.fillStyle = '#fff'; ctx.font = '700 12px Assistant'; ctx.textAlign = 'center'; ctx.fillText(`λ ${lam.toFixed(2)} מ׳`, w - 20 - bl / 2, h - 34);
    },
    // גזים: זוהר בצבע הפליטה. גז קל עולה, כבד שוקע.
    glow(t, s) {
      const c = s.glow || col, f = s.frac ?? .5, dir = f < .4 ? -1 : 1, speed = .015 + (1 - f) * .06;
      ctx.globalCompositeOperation = 'screen';
      const p = .6 + .4 * Math.sin(t * 2);
      const g = ctx.createRadialGradient(w * .5, h * .55, 0, w * .5, h * .55, Math.max(w, h) * .6);
      g.addColorStop(0, hexA(c, .6 * p)); g.addColorStop(1, hexA(c, 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      parts.slice(0, 30 + Math.round(f * 90)).forEach((q, i) => {
        const y = (((q.y + dir * t * speed * q.v) % 1) + 1) % 1 * h, x = q.x * w + Math.sin(t + i) * 10;
        ctx.fillStyle = hexA(c, .55 + .45 * Math.sin(t * 2 + i)); ctx.beginPath(); ctx.arc(x, y, 1.2 + f * 3 * q.s, 0, 7); ctx.fill();
      });
      ctx.globalCompositeOperation = 'source-over';
    },
    // אמונה: קווים שמתכנסים למוקד. מידת ההתכנסות היא המוגנות.
    axis(t, s) {
      const f = s.frac ?? .5, cx = w / 2, cy = h * .55, n = 40;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2, R = Math.max(w, h) * .7, p = ((t * .12 + i / n) % 1);
        const r = R * (1 - p) * (.3 + .7 * f) + R * (1 - f) * .3;
        ctx.fillStyle = 'rgba(255,246,208,.8)'; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1.8, 0, 7); ctx.fill();
      }
      glowOn('#fff6d0', 26); ctx.fillStyle = '#fff6d0'; ctx.beginPath(); ctx.arc(cx, cy, 4 + f * 6, 0, 7); ctx.fill(); glowOff();
    },
    // שפה: מצפן. הכיוון שהמילה מסמנת.
    compass(t, s) {
      const cx = w * .16, cy = h * .3, r = Math.min(w, h) * .12, ang = -Math.PI / 2 + (s.frac ?? .5) * Math.PI * 2 + Math.sin(t * .4) * .06;
      st(.85, 1.3); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke();
      ['צ', 'מז', 'ד', 'מע'].forEach((d, i) => { const a = -Math.PI / 2 + i * Math.PI / 2; ctx.fillStyle = '#fff'; ctx.font = '700 11px Assistant'; ctx.textAlign = 'center'; ctx.fillText(d, cx + Math.cos(a) * (r + 12), cy + Math.sin(a) * (r + 12) + 4); });
      glowOn(); st(1, 3); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r); ctx.stroke(); glowOff();
    },
    // ספירות: עץ החיים, הספירה הנוכחית מודגשת.
    tree(t, s) {
      const idx = Math.round((s.frac ?? 0) * 9), ox = w * .05, oy = h * .1, sw = Math.min(w * .25, h * .32), sh = h * .8;
      const P = SEF.map(([x, y]) => [ox + x * sw, oy + y * sh]);
      st(.4, 1);
      [[0,1],[0,2],[1,2],[1,3],[2,4],[3,4],[3,5],[4,5],[3,6],[4,7],[5,6],[5,7],[6,7],[6,8],[7,8],[8,9],[0,5],[5,8]].forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(...P[a]); ctx.lineTo(...P[b]); ctx.stroke(); });
      P.forEach((p, i) => { const on = i === idx; if (on) glowOn(col, 20); ctx.fillStyle = on ? col : 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(p[0], p[1], on ? 8 + Math.sin(t * 3) * 2 : 4, 0, 7); ctx.fill(); glowOff(); });
    },
    // מספרים: מצולע עם n צלעות.
    number(t, s) {
      const n = Math.max(1, Math.round(s.sv || 1)), cx = w * .5, cy = h * .5, r = Math.min(w, h) * .3;
      glowOn(col, 16); st(.95, 2.5); ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * .12); ctx.beginPath();
      if (n === 1) { ctx.arc(0, 0, 9, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); }
      else if (n === 2) { ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.stroke(); }
      else { const m = n === 10 ? 64 : n; for (let i = 0; i <= m; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / m; i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.stroke(); }
      ctx.restore(); glowOff();
    },
    // סביבה: שמש וזרם אוויר. זווית השמש מהאור, מהירות הזרם מהתנועה.
    climate(t, s) {
      const d = s.dna || [3, 3, 3, 3, 3], f = s.frac ?? .5;
      const a = Math.PI * (.15 + .7 * ((d[0] - 1) / 4)), sx = w / 2 - Math.cos(a) * w * .45, sy = h * .9 - Math.sin(a) * h * .75;
      const gr = ctx.createLinearGradient(sx, sy, w / 2, h); gr.addColorStop(0, 'rgba(255,226,160,.5)'); gr.addColorStop(1, 'rgba(255,226,160,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(w * .35, h); ctx.lineTo(w * .65, h); ctx.fill();
      glowOn('#ffd98a', 30); ctx.fillStyle = '#ffe3a6'; ctx.beginPath(); ctx.arc(sx, sy, 9, 0, 7); ctx.fill(); glowOff();
      ctx.lineCap = 'round';
      parts.forEach((q, i) => {
        const x = (((q.x - t * (.01 + f * .08) * q.v) % 1) + 1) % 1 * w, y = q.y * h + Math.sin(t * q.v + i) * 8;
        ctx.strokeStyle = `rgba(255,255,255,${.18 + .35 * q.s})`; ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 8 + 40 * f * q.v, y); ctx.stroke();
      });
    },
    // כוחות: חלקיקים שעולים בזרם. המהירות היא התנועה.
    flow(t, s) {
      const f = s.frac ?? .5;
      parts.forEach(q => {
        const y = (((q.y - t * (.01 + f * .08) * q.v) % 1) + 1) % 1 * h, x = q.x * w + Math.sin(t * .8 + y / 40) * 12;
        ctx.fillStyle = `rgba(255,250,235,${.25 + .45 * q.s})`; ctx.beginPath(); ctx.arc(x, y, 1 + q.s * 1.6, 0, 7); ctx.fill();
      });
    },
  };
  requestAnimationFrame(frame);
  return { set(patch) { state = { ...state, ...patch }; drawn = false; } };
}

export function hexA(hex, a) {
  const h = String(hex).replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
}
