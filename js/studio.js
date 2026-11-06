// חדר תלת־ממד שנבנה מחמשת ממדי ה-DNA, בתוך סביבה, עם מבטים ומצב ראליסטי.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// ---------- טקסטורות פרוצדורליות ----------
function noiseTex(base, var1, scale = 512, kind = 'concrete') {
  const c = document.createElement('canvas'); c.width = c.height = scale;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, scale, scale);
  const img = g.getImageData(0, 0, scale, scale), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - .5) * var1;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  if (kind === 'wood') {
    for (let y = 0; y < scale; y += scale / 8) {
      g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, y, scale, 2);
      for (let k = 0; k < 18; k++) { g.strokeStyle = `rgba(60,35,15,${.05 + Math.random() * .08})`; g.beginPath(); const yy = y + Math.random() * scale / 8; g.moveTo(0, yy); g.bezierCurveTo(scale * .3, yy + 4, scale * .6, yy - 4, scale, yy + 2); g.stroke(); }
    }
  } else if (kind === 'concrete') {
    for (let k = 0; k < 60; k++) { g.fillStyle = `rgba(0,0,0,${Math.random() * .12})`; g.beginPath(); g.arc(Math.random() * scale, Math.random() * scale, Math.random() * 2.2, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(0,0,0,.08)'; g.lineWidth = 1;
    for (let x = 0; x <= scale; x += scale / 4) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, scale); g.stroke(); }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

function contextOf(item) {
  const s = `${item.name} ${item.sub} ${item.space} ${item.quote || ''}`;
  if (/ים|חוף|גל|מלח|לוג׳יה הומיית|קו מלח/.test(s)) return 'sea';
  if (/מדבר|חול|דיונ|חמסין|שרב/.test(s)) return 'desert';
  if (/עיר|רחוב|קניון|שוק|כיכר|ציבורי/.test(s)) return 'city';
  if (/הר|סלע|מצוק|טרס|ואדי/.test(s)) return 'mountain';
  if (/יער|עץ|גפנ|שדה|אחו|גן|זית|פיורד|אורן/.test(s)) return 'field';
  return item.dna[4] >= 4 ? 'desert' : item.dna[2] >= 4 ? 'sea' : 'field';
}
export const CONTEXTS = { sea: 'חוף ים', desert: 'מדבר', city: 'עיר', mountain: 'הר', field: 'שדה ועצים' };

export function buildRoom(host, item, accent, opt = {}) {
  const [L, M, O, T, H] = item.dna;
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const room = new THREE.Group(); room.name = item.id;
  const ctxGroup = new THREE.Group(); ctxGroup.name = 'context';
  scene.add(room, ctxGroup);
  let ctx = opt.context || contextOf(item);
  let realistic = opt.realistic ?? true;

  // ממדים
  const width = 9 - T * 0.9, depth = 6 + T * 2.6, height = 2.5 + O * 0.45, wall = 0.12 + M * 0.14;
  const lift = M <= 2 ? (3 - M) * 0.45 : 0;
  const cool = new THREE.Color('#a3abb0'), warm = new THREE.Color('#cfa47a');
  const tone = cool.clone().lerp(warm, (H - 1) / 4);
  const wallCol = tone.clone().multiplyScalar(1.12 - M * 0.08);

  const tConcrete = noiseTex('#' + wallCol.getHexString(), 26, 512, 'concrete'); tConcrete.repeat.set(2, 1);
  const tFloor = noiseTex('#' + tone.clone().multiplyScalar(H >= 3 ? .75 : .6).getHexString(), 30, 512, H >= 3 ? 'wood' : 'concrete'); tFloor.repeat.set(3, 3);
  const mat = {
    wall: new THREE.MeshStandardMaterial({ color: '#ffffff', map: tConcrete, roughness: 0.82 - (5 - M) * 0.04, metalness: 0 }),
    floor: new THREE.MeshStandardMaterial({ color: '#ffffff', map: tFloor, roughness: H >= 3 ? 0.55 : 0.35, metalness: 0 }),
    roof: new THREE.MeshStandardMaterial({ color: wallCol, roughness: 0.7, transparent: true, opacity: 0.16, depthWrite: false }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#dfe9ef', roughness: 0.05, transmission: 0.9, thickness: 0.05, transparent: true, opacity: 0.35 }),
    acc: new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.25, roughness: 0.45 }),
    dark: new THREE.MeshStandardMaterial({ color: '#2b2b2b', roughness: 0.9 }),
  };
  const box = (w, h, d, m, x, y, z, name = '') => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; o.name = name; room.add(o); return o;
  };

  // רצפה, תקרה
  box(width + wall * 2, 0.2, depth + wall * 2, mat.floor, 0, lift + 0.1, 0, 'floor');
  const roofY = lift + 0.2 + height + wall / 2;
  const sky = L >= 4 ? 0.35 + (L - 3) * 0.12 : L <= 2 ? 0.05 : 0.18, sw = width * sky;
  const rw = (width + wall * 2 - sw) / 2;
  const roofs = [box(rw, wall, depth + wall * 2, mat.roof, -(sw / 2 + rw / 2), roofY, 0, 'roof'), box(rw, wall, depth + wall * 2, mat.roof, sw / 2 + rw / 2, roofY, 0, 'roof')];

  function wallWithOpenings(len, axis, offset, n, openRatio) {
    const y0 = lift + 0.2, segW = len / Math.max(1, n * 2 + 1);
    const oh = height * (0.35 + openRatio * 0.55), sill = O >= 4 ? 0 : height * 0.25;
    for (let i = 0; i < n * 2 + 1; i++) {
      const c = -len / 2 + segW * (i + 0.5);
      const put = (h, y, m = mat.wall) => axis === 'x' ? box(segW, h, wall, m, c, y, offset) : box(wall, h, segW, m, offset, y, c);
      if (i % 2 === 0 || n === 0) put(height, y0 + height / 2);
      else {
        if (sill > 0) put(sill, y0 + sill / 2);
        const top = height - sill - oh;
        if (top > 0.05) put(top, y0 + sill + oh + top / 2);
        const g = put(oh, y0 + sill + oh / 2, mat.glass); g.castShadow = false; g.scale[axis === 'x' ? 'z' : 'x'] = 0.15;
      }
    }
  }
  const nOpen = Math.max(0, O - 1);
  wallWithOpenings(width + wall * 2, 'x', -depth / 2 - wall / 2, Math.min(3, nOpen), O / 5);
  wallWithOpenings(depth, 'z', width / 2 + wall / 2, Math.max(0, nOpen - 1), O / 5);
  wallWithOpenings(depth, 'z', -width / 2 - wall / 2, O >= 3 ? 1 : 0, O / 6);
  box(width + wall * 2, 0.35, wall, mat.wall, 0, lift + 0.37, depth / 2 + wall / 2, 'front-sill');

  const fins = T * 3;
  for (let i = 0; i < fins; i++) {
    const z = -depth / 2 + (depth / (fins + 1)) * (i + 1);
    box(0.14, height, 0.14, mat.wall, -width / 2 + 0.5, lift + 0.2 + height / 2, z, 'fin');
    box(0.14, height, 0.14, mat.wall, width / 2 - 0.5, lift + 0.2 + height / 2, z, 'fin');
  }
  if (lift > 0) for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, lift, 16), mat.wall);
    c.position.set(sx * width * 0.4, lift / 2, sz * depth * 0.4); c.castShadow = true; room.add(c);
  }
  // ריהוט מינימלי: מוקד, ספסל, דמות
  box(Math.min(2.4, width * 0.3), 0.45, 0.6, mat.acc, 0, lift + 0.42, -depth / 2 + 1.2, 'focus');
  box(1.8, 0.42, 0.45, mat.floor, -width * 0.22, lift + 0.41, depth * 0.05, 'bench');
  const fig = new THREE.Group(); fig.name = 'scale-figure';
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 1.1, 6, 16), mat.dark); body.position.y = 0.72; body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 14), mat.dark); head.position.y = 1.55; head.castShadow = true;
  fig.add(body, head); fig.position.set(width * 0.15, lift + 0.2, depth * 0.1); room.add(fig);

  // ---------- אור ושמיים ----------
  const hemi = new THREE.HemisphereLight(0xffffff, 0x8a7d6b, 0.35);
  const sun = new THREE.DirectionalLight(H >= 4 ? 0xffe2b8 : 0xf3f6ff, 2.2 + L * 0.5);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 90 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  const glow = new THREE.PointLight(accent, 2 + (5 - L) * 1.2, 7, 2);
  glow.position.set(0, lift + 1.2, -depth / 2 + 1.4);
  scene.add(hemi, sun, glow);
  const elev = 12 + L * 9, azim = 160 + H * 12;
  const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - elev), THREE.MathUtils.degToRad(azim));
  sun.position.copy(sunDir.clone().multiplyScalar(40)); sun.target.position.set(0, 0, 0); scene.add(sun.target);

  const skyObj = new Sky(); skyObj.scale.setScalar(4000);
  const su = skyObj.material.uniforms;
  su.turbidity.value = 4 + (5 - L) * 1.5; su.rayleigh.value = 1.2 + (H >= 4 ? 1.5 : 0.3); su.mieCoefficient.value = 0.004; su.mieDirectionalG.value = 0.8;
  su.sunPosition.value.copy(sunDir);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  // ---------- סביבה ----------
  function buildContext(kind) {
    ctxGroup.clear();
    const gcol = { sea: '#d8cdb6', desert: '#d9b98c', city: '#9a9a96', mountain: '#8f8a7d', field: '#7f9463' }[kind];
    const gtex = noiseTex(gcol, 22, 256, 'ground'); gtex.repeat.set(30, 30);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400, 1, 1), new THREE.MeshStandardMaterial({ map: gtex, roughness: 0.95 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; ctxGroup.add(ground);
    const rnd = (a, b) => a + Math.random() * (b - a);
    if (kind === 'sea') {
      const sea = new THREE.Mesh(new THREE.PlaneGeometry(600, 300), new THREE.MeshStandardMaterial({ color: '#2f6f8f', roughness: 0.12, metalness: 0.2 }));
      sea.rotation.x = -Math.PI / 2; sea.position.set(0, 0.02, -170); ctxGroup.add(sea);
    }
    if (kind === 'desert' || kind === 'mountain') {
      const geo = new THREE.PlaneGeometry(400, 400, 120, 120);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), r = Math.hypot(x, y);
        const k = Math.max(0, (r - 30) / 120);
        const h = kind === 'desert' ? (Math.sin(x * 0.06) * Math.cos(y * 0.04) + 1) * 2.2 * k : (Math.sin(x * 0.03) + Math.cos(y * 0.025) + 2) * 9 * k * k;
        p.setZ(i, h);
      }
      geo.computeVertexNormals();
      const hills = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: gtex, roughness: 0.95 }));
      hills.rotation.x = -Math.PI / 2; hills.receiveShadow = true; ctxGroup.add(hills);
    }
    if (kind === 'city') {
      const cm = new THREE.MeshStandardMaterial({ color: '#b9b7b1', roughness: 0.8 });
      for (let i = 0; i < 70; i++) {
        const a = rnd(0, Math.PI * 2), r = rnd(28, 90), h = rnd(4, 26);
        const b = new THREE.Mesh(new THREE.BoxGeometry(rnd(4, 10), h, rnd(4, 10)), cm);
        b.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r); b.castShadow = b.receiveShadow = true; ctxGroup.add(b);
      }
    }
    if (kind === 'field' || kind === 'sea' || kind === 'mountain') {
      const trunk = new THREE.MeshStandardMaterial({ color: '#5b4632', roughness: 0.9 });
      const leaf = new THREE.MeshStandardMaterial({ color: kind === 'sea' ? '#6f8a5c' : '#55703f', roughness: 0.85 });
      const n = kind === 'field' ? 40 : 14;
      for (let i = 0; i < n; i++) {
        const a = rnd(0, Math.PI * 2), r = rnd(16, 60), s = rnd(0.8, 1.6);
        const t = new THREE.Group();
        const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.18 * s, 2.2 * s, 8), trunk); tr.position.y = 1.1 * s;
        const cr = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3 * s, 1), leaf); cr.position.y = 2.8 * s;
        [tr, cr].forEach(m => { m.castShadow = true; }); t.add(tr, cr);
        t.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); ctxGroup.add(t);
      }
    }
  }
  buildContext(ctx);

  function setRealistic(on) {
    realistic = on;
    renderer.toneMappingExposure = on ? 0.55 + L * 0.06 : 0.75 + L * 0.12;
    scene.environment = on ? envTex : null;
    if (on) scene.add(skyObj); else scene.remove(skyObj);
    scene.background = on ? null : new THREE.Color('#ebe6dc');
    scene.fog = on ? new THREE.Fog(new THREE.Color('#d9dde0'), 70, 260) : null;
    hemi.intensity = on ? 0.25 : 0.45 + L * 0.1;
    mat.wall.map = on ? tConcrete : null; mat.wall.color.set(on ? '#ffffff' : wallCol); mat.wall.needsUpdate = true;
    mat.floor.map = on ? tFloor : null; mat.floor.color.set(on ? '#ffffff' : tone.clone().multiplyScalar(.7)); mat.floor.needsUpdate = true;
    ctxGroup.visible = on;
  }
  setRealistic(realistic);

  // ---------- מצלמה ומבטים ----------
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 5000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.495;
  const ctr = new THREE.Vector3(0, lift + height * 0.45, 0);
  const R = Math.max(width, depth);
  const VIEWS = {
    axo: { name: 'אקסונומטריה', pos: [R * 1.3, roofY + R * 0.95, R * 1.75], tgt: ctr, roof: .16 },
    top: { name: 'מבט על', pos: [0.01, roofY + R * 2.4, 0.01], tgt: ctr, roof: 0 },
    eye: { name: 'גובה עין, בחוץ', pos: [R * 0.4, 1.6, R * 2.2], tgt: new THREE.Vector3(0, lift + 1.4, 0), roof: 1 },
    front: { name: 'חזית', pos: [0, lift + height * 0.55, R * 1.9], tgt: ctr, roof: .16 },
    inside: { name: 'בפנים', pos: [-width * 0.36, lift + 1.6, depth * 0.46], tgt: new THREE.Vector3(width * 0.1, lift + 1.3, -depth / 2), roof: 1 },
  };
  let anim = null;
  function view(k, instant) {
    const v = VIEWS[k]; if (!v) return;
    roofs.forEach(r => { r.material.opacity = v.roof; r.material.transparent = v.roof < 1; r.material.depthWrite = v.roof >= 1; r.material.needsUpdate = true; r.visible = v.roof > 0; r.castShadow = true; });
    const from = camera.position.clone(), to = new THREE.Vector3(...v.pos);
    const tf = controls.target.clone(), tt = v.tgt.clone();
    if (instant) { camera.position.copy(to); controls.target.copy(tt); return; }
    const t0 = performance.now();
    anim = now => { const k2 = Math.min(1, (now - t0) / 900), e = 1 - Math.pow(1 - k2, 3); camera.position.lerpVectors(from, to, e); controls.target.lerpVectors(tf, tt, e); if (k2 >= 1) anim = null; };
  }
  view(opt.view || 'axo', true);

  function size() {
    const b = host.getBoundingClientRect();
    renderer.setSize(b.width, b.height, false);
    camera.aspect = b.width / Math.max(1, b.height); camera.updateProjectionMatrix();
  }
  size();
  const ro = new ResizeObserver(size); ro.observe(host);
  (function loop(now) {
    if (!host.isConnected) { ro.disconnect(); renderer.dispose(); pmrem.dispose(); return; }
    requestAnimationFrame(loop);
    if (anim) anim(now || performance.now());
    controls.update(); renderer.render(scene, camera);
  })();

  const download = (blob, name) => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  return {
    views: Object.fromEntries(Object.entries(VIEWS).map(([k, v]) => [k, v.name])),
    context: ctx,
    view,
    setRealistic,
    setContext(k) { ctx = k; buildContext(k); ctxGroup.visible = realistic; },
    exportGLB(name) {
      return new Promise((res, rej) => new GLTFExporter().parse(room, glb => { download(new Blob([glb], { type: 'model/gltf-binary' }), name); res(); }, rej, { binary: true }));
    },
    snapshot(name) { renderer.render(scene, camera); renderer.domElement.toBlob(b => download(b, name), 'image/png'); },
    dataURL() { renderer.render(scene, camera); return renderer.domElement.toDataURL('image/jpeg', 0.9); },
  };
}
