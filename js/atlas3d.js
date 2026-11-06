// אטלס במרחב: שלושה ממדים, כדורים שקופים בצבע התחום.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const hash = s => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

function label(text, color = '#141414', size = 44) {
  const c = document.createElement('canvas'); const g = c.getContext('2d');
  g.font = `700 ${size}px Assistant, sans-serif`;
  const w = Math.ceil(g.measureText(text).width) + 24; c.width = w; c.height = size + 20;
  g.font = `700 ${size}px Assistant, sans-serif`; g.fillStyle = color; g.textBaseline = 'middle'; g.direction = 'rtl'; g.textAlign = 'center';
  g.fillText(text, w / 2, c.height / 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false, transparent: true }));
  s.scale.set(w / 110, c.height / 110, 1); return s;
}

export function buildAtlas3D(host, items, o) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  host.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d2c6, 1.6));
  const dl = new THREE.DirectionalLight(0xffffff, 1.2); dl.position.set(5, 8, 6); scene.add(dl);
  const S = 2.2, P = v => (v - 3) * S;
  // תיבת צירים
  const grid = new THREE.Group(); scene.add(grid);
  const lm = new THREE.LineBasicMaterial({ color: 0xcfc8bb });
  const ext = P(5.5);
  for (const a of [-1, 1]) for (const b of [-1, 1]) {
    const pts = [[[-ext, a * ext, b * ext], [ext, a * ext, b * ext]], [[a * ext, -ext, b * ext], [a * ext, ext, b * ext]], [[a * ext, b * ext, -ext], [a * ext, b * ext, ext]]];
    pts.forEach(([p, q]) => grid.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...p), new THREE.Vector3(...q)]), lm)));
  }
  const { dims, x, y, z } = o;
  const ax = (t, pos) => { const l = label(t, '#3a3a3a', 40); l.position.set(...pos); scene.add(l); };
  ax(`${dims[x].k}: ${dims[x].hi}`, [ext + 1.2, -ext, -ext]); ax(dims[x].lo, [-ext - .8, -ext, -ext]);
  ax(`${dims[y].k}: ${dims[y].hi}`, [-ext, ext + .8, -ext]); ax(dims[y].lo, [-ext, -ext - .6, -ext]);
  ax(`${dims[z].k}: ${dims[z].hi}`, [-ext, -ext, ext + 1.2]); ax(dims[z].lo, [-ext, -ext, -ext - .8]);

  const jit = (id, k) => ((hash(id + k) % 1000) / 1000 - .5) * .6;
  const meshes = [];
  const geo = new THREE.SphereGeometry(.42, 32, 20);
  items.forEach(it => {
    const hl = it.id === o.sel || o.linked.has(it.id), dim = o.sel && !hl;
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: it.ch.color, transparent: true, opacity: dim ? .1 : hl ? .75 : .38, depthWrite: false, roughness: .4 }));
    m.position.set(P(it.dna[x] + jit(it.id, 'x')), P(it.dna[y] + jit(it.id, 'y')), P(it.dna[z] + jit(it.id, 'z')));
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
