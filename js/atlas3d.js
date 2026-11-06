// אטלס בתלת־ממד: קובייה (שלושה צירים מראשית אחת) או כדור (נטייה של חמשת הממדים).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const hash = s => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

function label(text, color = '#141414', size = 44, weight = 700) {
  const c = document.createElement('canvas'); const g = c.getContext('2d');
  g.font = `${weight} ${size}px Assistant, sans-serif`;
  const w = Math.ceil(g.measureText(text).width) + 24; c.width = w; c.height = size + 20;
  g.font = `${weight} ${size}px Assistant, sans-serif`; g.fillStyle = color; g.textBaseline = 'middle'; g.direction = 'rtl'; g.textAlign = 'center';
  g.fillText(text, w / 2, c.height / 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false, transparent: true }));
  s.scale.set(w / 110, c.height / 110, 1); return s;
}
function arrow(from, to, color = 0x141414, r = .05) {
  const g = new THREE.Group(), dir = to.clone().sub(from), len = dir.length();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len - .4, 12), new THREE.MeshBasicMaterial({ color }));
  shaft.position.copy(from.clone().add(dir.clone().multiplyScalar((len - .4) / 2 / len)));
  shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  const head = new THREE.Mesh(new THREE.ConeGeometry(r * 3.2, .4, 16), new THREE.MeshBasicMaterial({ color }));
  head.position.copy(to.clone().sub(dir.clone().normalize().multiplyScalar(.2)));
  head.quaternion.copy(shaft.quaternion);
  g.add(shaft, head); return g;
}

export function buildAtlas3D(host, items, o) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  host.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d2c6, 1.6));
  const dl = new THREE.DirectionalLight(0xffffff, 1.2); dl.position.set(5, 8, 6); scene.add(dl);
  const { dims, x, y, z } = o;
  const jit = (id, k) => ((hash(id + k) % 1000) / 1000 - .5);
  const pos = {};
  const S = 2.2;
  if (o.mode === 'sphere') {
    const R = 6;
    const wire = new THREE.Mesh(new THREE.SphereGeometry(R, 36, 18), new THREE.MeshBasicMaterial({ color: 0xcfc8bb, wireframe: true, transparent: true, opacity: .25 }));
    scene.add(wire);
    const anc = dims.map((_, k) => { const a = k * 2 * Math.PI / 5; return new THREE.Vector3(Math.cos(a), k % 2 ? .45 : -.45, Math.sin(a)).normalize(); });
    anc.forEach((v, k) => { scene.add(arrow(new THREE.Vector3(), v.clone().multiplyScalar(R + .6), 0x141414, .035)); const l = label(dims[k].k, '#141414', 46, 800); l.position.copy(v.clone().multiplyScalar(R + 1.4)); scene.add(l); });
    const org = new THREE.Mesh(new THREE.SphereGeometry(.22, 20, 12), new THREE.MeshBasicMaterial({ color: 0x141414 })); scene.add(org);
    const ol = label('איזון', '#141414', 36); ol.position.set(0, -.7, 0); scene.add(ol);
    items.forEach(it => {
      const m = it.dna.reduce((a, v) => a + v, 0) / 5, w = it.dna.map(v => Math.exp(1.3 * (v - m))), s = w.reduce((a, v) => a + v, 0);
      const p = anc.reduce((acc, v, k) => acc.add(v.clone().multiplyScalar(w[k] / s)), new THREE.Vector3());
      p.multiplyScalar(R * 1.5).add(new THREE.Vector3(jit(it.id, 'x'), jit(it.id, 'y'), jit(it.id, 'z')).multiplyScalar(.4));
      if (p.length() > R) p.setLength(R);
      pos[it.id] = p;
    });
  } else {
    const P = v => (v - 3) * S, lo = P(.5), hi = P(5.6);
    const O = new THREE.Vector3(lo, lo, lo);
    const grid = new THREE.Group(); scene.add(grid);
    const lm = new THREE.LineBasicMaterial({ color: 0xd8d2c6 });
    for (let v = 1; v <= 5; v++) {
      [[[P(v), lo, lo], [P(v), lo, hi]], [[lo, lo, P(v)], [hi, lo, P(v)]], [[lo, P(v), lo], [hi, P(v), lo]], [[P(v), lo, lo], [P(v), hi, lo]], [[lo, P(v), lo], [lo, P(v), hi]], [[lo, lo, P(v)], [lo, hi, P(v)]]]
        .forEach(([a, b]) => grid.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)]), lm)));
    }
    scene.add(arrow(O, new THREE.Vector3(hi + .8, lo, lo)), arrow(O, new THREE.Vector3(lo, hi + .8, lo)), arrow(O, new THREE.Vector3(lo, lo, hi + .8)));
    const org = new THREE.Mesh(new THREE.SphereGeometry(.2, 20, 12), new THREE.MeshBasicMaterial({ color: 0x141414 })); org.position.copy(O); scene.add(org);
    const ol = label('ראשית 1,1,1', '#141414', 36); ol.position.copy(O).add(new THREE.Vector3(-.6, -.7, -.6)); scene.add(ol);
    const ax = (t, p) => { const l = label(t, '#141414', 46, 800); l.position.set(...p); scene.add(l); };
    ax(`${dims[x].k}: ${dims[x].hi}`, [hi + 2.2, lo, lo]);
    ax(`${dims[y].k}: ${dims[y].hi}`, [lo, hi + 1.6, lo]);
    ax(`${dims[z].k}: ${dims[z].hi}`, [lo, lo, hi + 2.2]);
    items.forEach(it => { pos[it.id] = new THREE.Vector3(P(it.dna[x] + jit(it.id, 'x') * .6), P(it.dna[y] + jit(it.id, 'y') * .6), P(it.dna[z] + jit(it.id, 'z') * .6)); });
  }
  const meshes = [];
  const geo = new THREE.SphereGeometry(.42, 32, 20);
  items.forEach(it => {
    const hl = it.id === o.sel || o.linked.has(it.id), dim = o.sel && !hl;
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: it.ch.color, transparent: true, opacity: dim ? .1 : hl ? .78 : .38, depthWrite: false, roughness: .4 }));
    m.position.copy(pos[it.id]);
    m.scale.setScalar(it.id === o.sel ? 1.6 : hl ? 1.3 : 1);
    m.userData.id = it.id; scene.add(m); meshes.push(m);
    if (hl) { const l = label(it.name, it.ch.color, 38); l.position.copy(m.position).add(new THREE.Vector3(0, .95, 0)); scene.add(l); }
  });
  const camera = new THREE.PerspectiveCamera(40, 1, .1, 200);
  camera.position.set(14, 10, 16);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.autoRotate = !o.sel; controls.autoRotateSpeed = .5;
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
  let downAt = null;
  renderer.domElement.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; controls.autoRotate = false; });
  renderer.domElement.addEventListener('pointerup', e => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) return;
    const r = renderer.domElement.getBoundingClientRect();
    mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObjects(meshes)[0];
    if (hit) o.onPick(hit.object.userData.id);
  });
  function size() { const b = host.getBoundingClientRect(); renderer.setSize(b.width, b.height, false); renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%'; camera.aspect = b.width / Math.max(1, b.height); camera.updateProjectionMatrix(); }
  size(); const ro = new ResizeObserver(size); ro.observe(host);
  (function loop() {
    if (!renderer.domElement.isConnected) { ro.disconnect(); renderer.dispose(); return; }
    requestAnimationFrame(loop); controls.update(); renderer.render(scene, camera);
  })();
}
