// בדיקת עשן: כל מסך נטען בלי שגיאות ובלי גלילה רוחבית, במחשב ובנייד.
// הרצה: python3 -m http.server 8765 &  ואז  node tests/smoke.cjs
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8765/';
const routes = ['', 'c/math', 'c/math/golden', 'studio/delta?dna=1,5,1,1,3', 'c/frequencies/theta', 'c/gases/xe', 'c/climate/saltline', 'atlas', 'atlas/delta', 'studio/gevurah', 'narratives', 'legend', 'pages/28', 'c/words/saudade', 'c/math/integral'];
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  let fail = 0;
  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const p = await b.newPage({ viewport: vp });
    const errs = [];
    p.on('pageerror', e => errs.push(String(e)));
    p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|pollinations/.test(m.text())) errs.push(m.text()); });
    for (const r of routes) {
      await p.goto(BASE + '#/' + r); await p.waitForTimeout(r.startsWith('studio') ? 3000 : 800);
      const ov = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      const txt = await p.evaluate(() => document.getElementById('app').innerText.length);
      const ok = !ov && txt > 50;
      if (!ok) fail++;
      console.log(`${vp.width} ${r || 'home'} ${ok ? 'ירוק' : 'נכשל'}${ov ? ' (גלילה רוחבית)' : ''}`);
    }
    if (errs.length) { fail++; console.log('שגיאות:', errs); }
  }
  await b.close();
  process.exit(fail ? 1 : 0);
})();
