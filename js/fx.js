// שכבת תנועה מעל תמונה: כל פרק מקבל תנועה שמסבירה את התוכן שלו.
const SEF = [[.5,.08],[.75,.2],[.25,.2],[.75,.42],[.25,.42],[.5,.52],[.75,.68],[.25,.68],[.5,.8],[.5,.95]];

export function attachFx(host, mode, o = {}) {
  const cv = document.createElement('canvas');
  cv.className = 'fx';
  host.appendChild(cv);
  const ctx = cv.getContext('2d');
  const col = o.color || '#ffffff';
  const solo = !!o.solo;
  let w = 0, h = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
  const parts = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), v: .2 + Math.random() * .8, s: Math.random() }));
  function size() {
    const r = host.getBoundingClientRect();
    w = r.width; h = r.height;
    cv.width = Math.max(1, w * dpr); cv.height = Math.max(1, h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  size();
  const ro = new ResizeObserver(size); ro.observe(host);
  const t0 = performance.now();
  let last = 0;
  function frame(now) {
    if (!host.isConnected) { ro.disconnect(); return; }
    requestAnimationFrame(frame);
    if (document.body.classList.contains('still') && last) return;
    last = now;
    const t = (now - t0) / 1000;
    ctx.clearRect(0, 0, w, h);
    if (solo) {
      const g = ctx.createRadialGradient(w * .5, h * .45, 10, w * .5, h * .5, Math.max(w, h) * .7);
      g.addColorStop(0, '#2a2824'); g.addColorStop(1, '#0d0d0c');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
    draw[mode] ? draw[mode](t) : draw.wind(t);
  }
  const line = (a = .75, lw = 1.6) => { ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = lw; };
  const label = (txt, x, y) => { ctx.font = '600 12px Assistant, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.textAlign = 'right'; ctx.fillText(txt, x, y); };
  const draw = {
    wave(t) {
      const hz = o.hz || 10, cycles = Math.max(1, hz / 2), base = h * .82, amp = h * .05;
      ctx.shadowColor = col; ctx.shadowBlur = 12; line(.85, 2);
      ctx.beginPath();
      for (let x = 0; x <= w; x += 2) { const y = base + amp * Math.sin((x / w) * cycles * Math.PI * 2 - t * Math.min(8, 1 + hz / 6)); x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke(); ctx.shadowBlur = 0;
      label(`גל ${o.name || ''} · ${Math.round(cycles)} מחזורים ברוחב התמונה`, w - 12, base - amp - 10);
    },
    string(t) {
      const n = Math.max(1, Math.round((o.hz || 261.63) / 261.63 * 3)), base = h * .5, amp = h * .16 * Math.cos(t * 3);
      ctx.shadowColor = col; ctx.shadowBlur = 10; line(.8, 1.5);
      ctx.beginPath();
      for (let x = 0; x <= w; x += 2) { const y = base + amp * Math.sin((x / w) * n * Math.PI); x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke(); ctx.shadowBlur = 0;
      line(.35, 1); ctx.beginPath(); ctx.moveTo(0, base); ctx.lineTo(w, base); ctx.stroke();
      label(`מיתר עומד: ${n} חצאי גל. ככל שהתו גבוה, הגל קצר והחדר צר.`, w - 12, h - 14);
    },
    glow(t) {
      const c = o.glow || col, p = .55 + .45 * Math.sin(t * 1.6);
      ctx.globalCompositeOperation = 'screen';
      const g = ctx.createRadialGradient(w * .5, h * .55, 0, w * .5, h * .55, Math.max(w, h) * .55);
      g.addColorStop(0, hexA(c, .55 * p)); g.addColorStop(1, hexA(c, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      parts.slice(0, 26).forEach((q, i) => {
        const x = (q.x * w + Math.sin(t * .4 + i) * 20), y = (q.y * h + Math.cos(t * .3 + i) * 16);
        ctx.fillStyle = hexA(c, .5 + .5 * Math.sin(t * 2 + i)); ctx.beginPath(); ctx.arc(x, y, 1.5 + q.s * 2, 0, 7); ctx.fill();
      });
      ctx.globalCompositeOperation = 'source-over';
      label('הצבע: קו הפליטה של הגז', w - 12, h - 14);
    },
    breath(t) {
      const cyc = 10, ph = t % cyc, k = ph < 4 ? ph / 4 : 1 - (ph - 4) / 6;
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * (.25 + .25 * k), w / 2, h / 2, Math.max(w, h) * .75);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${.55 - .3 * k})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      label(ph < 4 ? 'שאיפה · 4 שניות' : 'נשיפה · 6 שניות', w - 12, h - 14);
    },
    fractal(t) {
      const depth = 5, k = (Math.sin(t * .5) + 1) / 2;
      line(.7, 1);
      const rec = (x, y, s, d) => { if (d > depth) return; ctx.strokeRect(x, y, s, s); const n = s / 3; if (d < depth * (0.4 + .6 * k)) { rec(x, y, n, d + 1); rec(x + 2 * n, y + 2 * n, n, d + 1); rec(x + n, y + n, n, d + 1); } };
      const s = Math.min(w, h) * .7; rec((w - s) / 2, (h - s) / 2, s, 0);
      label('כל חדר משכפל את הבית כולו', w - 12, h - 14);
    },
    prime(t) {
      const s = Math.min(w, h) * .55, x = (w - s) / 2, y = (h - s) / 2;
      line(.85, 2); ctx.strokeRect(x, y, s, s);
      ctx.fillStyle = 'rgba(255,240,200,.9)'; ctx.fillRect(x + s * .45, y + s - 3, s * .1, 6);
      const r = s * (.18 + .04 * Math.sin(t * 1.2));
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, r * 2.4);
      g.addColorStop(0, 'rgba(255,236,190,.9)'); g.addColorStop(1, 'rgba(255,236,190,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(w / 2, h / 2, r * 2.4, 0, 7); ctx.fill();
      label('חלל אחד · כניסה אחת · אור אחד', w - 12, h - 14);
    },
    threshold(t) {
      const k = (Math.sin(t * .6) + 1) / 2, dw = w * (.02 + .1 * k);
      const g = ctx.createLinearGradient(w / 2 - dw, 0, w / 2 + dw, 0);
      g.addColorStop(0, 'rgba(255,245,220,0)'); g.addColorStop(.5, `rgba(255,245,220,${.25 + .2 * k})`); g.addColorStop(1, 'rgba(255,245,220,0)');
      ctx.fillStyle = g; ctx.fillRect(w / 2 - dw, h * .05, dw * 2, h * .9);
    },
    axis(t) {
      const y = h * .62, p = (t * .12) % 1, x = w - p * w;
      line(.4, 1); ctx.beginPath(); ctx.moveTo(w, y); ctx.lineTo(0, y); ctx.stroke();
      ctx.shadowColor = '#fff6d0'; ctx.shadowBlur = 18; ctx.fillStyle = '#fff6d0';
      ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
      label('ציר אחד: מן הסף אל המוקד', w - 12, y - 12);
    },
    compass(t) {
      const cx = w * .14, cy = h * .2, r = Math.min(w, h) * .09;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.sin(t * .3) * .2);
      line(.85, 1.3); ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke();
      ['צ', 'מז', 'ד', 'מע'].forEach((d, i) => { const a = -Math.PI / 2 + i * Math.PI / 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * .2, Math.sin(a) * r * .2); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.font = '700 11px Assistant'; ctx.textAlign = 'center'; ctx.fillText(d, Math.cos(a) * (r + 12), Math.sin(a) * (r + 12) + 4); });
      ctx.restore();
    },
    tree(t) {
      const ox = w * .06, oy = h * .1, sw = Math.min(w * .22, h * .3), sh = h * .8;
      const P = SEF.map(([x, y]) => [ox + x * sw, oy + y * sh]);
      line(.35, 1);
      [[0,1],[0,2],[1,2],[1,3],[2,4],[3,4],[3,5],[4,5],[3,6],[4,7],[5,6],[5,7],[6,7],[6,8],[7,8],[8,9],[0,5],[5,8]].forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(...P[a]); ctx.lineTo(...P[b]); ctx.stroke(); });
      P.forEach((p, i) => { const on = i === (o.idx ?? -1); ctx.fillStyle = on ? hexA(col, 1) : 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(p[0], p[1], on ? 6 + Math.sin(t * 3) * 1.5 : 3.5, 0, 7); ctx.fill(); });
    },
    number(t) {
      const n = o.n || 1, cx = w * .14, cy = h * .2, r = Math.min(w, h) * .09;
      line(.9, 1.6); ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * .15);
      ctx.beginPath();
      if (n === 1) { ctx.arc(0, 0, 4, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); }
      else if (n === 2) { ctx.moveTo(-r, -6); ctx.lineTo(r, -6); ctx.moveTo(-r, 6); ctx.lineTo(r, 6); ctx.stroke(); }
      else if (n === 10) { ctx.arc(0, 0, r, 0, 7); ctx.stroke(); }
      else if (n === 8) { for (let a = 0; a <= 6.3; a += .05) { const x = r * Math.cos(a) / (1 + Math.sin(a) ** 2), y = r * Math.sin(a) * Math.cos(a) / (1 + Math.sin(a) ** 2); a ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
      else if (n === 7 || n === 9) { for (let a = 0; a < 12; a += .1) { const rr = r * a / 12; const x = rr * Math.cos(a), y = rr * Math.sin(a); a ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
      else { for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / n; i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.stroke(); }
      ctx.restore();
    },
    wind(t) {
      ctx.lineCap = 'round';
      parts.forEach((q, i) => {
        const x = ((q.x - t * .05 * q.v) % 1 + 1) % 1 * w, y = q.y * h + Math.sin(t * q.v + i) * 8;
        ctx.strokeStyle = `rgba(255,255,255,${.12 + .25 * q.s})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 18 + 30 * q.v, y); ctx.stroke();
      });
    },
    flow(t) {
      parts.forEach((q, i) => {
        const y = ((q.y - t * .04 * q.v) % 1 + 1) % 1 * h, x = q.x * w + Math.sin(t * .8 + y / 40) * 10;
        ctx.fillStyle = `rgba(255,250,235,${.15 + .35 * q.s})`; ctx.beginPath(); ctx.arc(x, y, .8 + q.s * 1.4, 0, 7); ctx.fill();
      });
    },
  };
  requestAnimationFrame(frame);
}

function hexA(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
}
