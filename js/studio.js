// חדר תלת־ממד שנבנה מחמשת ממדי ה-DNA.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

export function buildRoom(host, item, accent) {
  const [L, M, O, T, H] = item.dna;
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.75 + L * 0.12;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const room = new THREE.Group(); room.name = item.id;
  scene.add(room);

  // ממדים
  const width = 9 - T * 0.9;               // תנועה גבוהה: חדר צר וארוך
  const depth = 6 + T * 2.6;
  const height = 2.5 + O * 0.45;           // פתיחות: גובה
  const wall = 0.12 + M * 0.14;            // מסה: עובי קיר
  const lift = M <= 2 ? (3 - M) * 0.45 : 0; // ריחוף: הרמה מעל הקרקע
  const cool = new THREE.Color('#9aa4ab'), warm = new THREE.Color('#c79d74');
  const tone = cool.clone().lerp(warm, (H - 1) / 4);
  const wallCol = tone.clone().multiplyScalar(1.15 - M * 0.09);
  const matWall = new THREE.MeshStandardMaterial({ color: wallCol, roughness: 0.55 + M * 0.08, metalness: 0 });
  const matFloor = new THREE.MeshStandardMaterial({ color: tone.clone().multiplyScalar(0.7), roughness: 0.75 });
  const matAcc = new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.35, roughness: 0.4 });

  const box = (w, h, d, mat, x, y, z, name) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; m.name = name || '';
    room.add(m); return m;
  };
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.22 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  // רצפה ותקרה
  box(width + wall * 2, 0.2, depth + wall * 2, matFloor, 0, lift + 0.1, 0, 'floor');
  const roofY = lift + 0.2 + height + wall / 2;
  // תקרה עם פתח אור לפי אור
  const sky = L >= 4 ? 0.35 + (L - 3) * 0.12 : L <= 2 ? 0.05 : 0.18; // יחס פתח בתקרה
  const sw = width * sky;
  // התקרה שקופה למחצה: רואים פנימה כמו במודל חתך, והצל שלה עדיין נופל
  const matRoof = new THREE.MeshStandardMaterial({ color: wallCol, roughness: 0.6, transparent: true, opacity: 0.16, depthWrite: false });
  box((width + wall * 2 - sw) / 2, wall, depth + wall * 2, matRoof, -(sw / 2 + (width + wall * 2 - sw) / 4), roofY, 0, 'roof');
  box((width + wall * 2 - sw) / 2, wall, depth + wall * 2, matRoof, (sw / 2 + (width + wall * 2 - sw) / 4), roofY, 0, 'roof');

  // קיר עם פתחים: n פתחים לאורך הקיר
  function wallWithOpenings(len, axis, offset, n, openRatio) {
    const y0 = lift + 0.2, segW = len / Math.max(1, n * 2 + 1);
    const oh = height * (0.35 + openRatio * 0.55), sill = O >= 4 ? 0 : height * 0.25;
    for (let i = 0; i < n * 2 + 1; i++) {
      const c = -len / 2 + segW * (i + 0.5);
      const solid = i % 2 === 0 || n === 0;
      const put = (h, y) => axis === 'x' ? box(segW, h, wall, matWall, c, y, offset) : box(wall, h, segW, matWall, offset, y, c);
      if (solid) put(height, y0 + height / 2);
      else {
        if (sill > 0) put(sill, y0 + sill / 2);
        const top = height - sill - oh;
        if (top > 0.05) put(top, y0 + sill + oh + top / 2);
      }
    }
  }
  const nOpen = Math.max(0, O - 1);
  wallWithOpenings(width + wall * 2, 'x', -depth / 2 - wall / 2, Math.min(3, nOpen), O / 5);      // קיר אחורי
  wallWithOpenings(depth, 'z', width / 2 + wall / 2, Math.max(0, nOpen - 1), O / 5);              // קיר ימין
  wallWithOpenings(depth, 'z', -width / 2 - wall / 2, O >= 3 ? 1 : 0, O / 6);                     // קיר שמאל
  // קיר קדמי פתוח למצלמה (חתך), עם סף נמוך
  box(width + wall * 2, 0.35, wall, matWall, 0, lift + 0.37, depth / 2 + wall / 2, 'front-sill');

  // מקצב: עמודים או סנפירים לפי תנועה
  const fins = T * 3;
  for (let i = 0; i < fins; i++) {
    const z = -depth / 2 + (depth / (fins + 1)) * (i + 1);
    box(0.12, height, 0.12, matWall, -width / 2 + 0.5, lift + 0.2 + height / 2, z, 'fin');
    box(0.12, height, 0.12, matWall, width / 2 - 0.5, lift + 0.2 + height / 2, z, 'fin');
  }
  // עמודי ריחוף
  if (lift > 0) for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, lift, 12), matWall);
    c.position.set(sx * width * 0.4, lift / 2, sz * depth * 0.4); c.castShadow = true; room.add(c);
  }
  // מוקד: אובייקט אחד בצבע הפרק
  const focus = box(Math.min(2.4, width * 0.3), 0.45, 0.6, matAcc, 0, lift + 0.42, -depth / 2 + 1.2, 'focus');
  focus.material = matAcc;
  // דמות לקנה מידה
  const fig = new THREE.Group(); fig.name = 'scale-figure';
  const mf = new THREE.MeshStandardMaterial({ color: '#2b2b2b', roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 1.4, 16), mf); body.position.y = 0.7; body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), mf); head.position.y = 1.55; head.castShadow = true;
  fig.add(body, head); fig.position.set(width * 0.15, lift + 0.2, depth * 0.1); room.add(fig);

  // אור
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7d6b, 0.35 + L * 0.1));
  const sun = new THREE.DirectionalLight(H >= 4 ? 0xffe2b8 : 0xf0f4ff, 1.2 + L * 0.5);
  sun.position.set(width * 0.6, roofY + 12, -depth * 0.2);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left = -16; sc.right = 16; sc.top = 16; sc.bottom = -16; sc.near = 1; sc.far = 60;
  sun.shadow.bias = -0.0005; scene.add(sun);
  const glow = new THREE.PointLight(accent, 2 + (5 - L) * 1.2, 7, 2);
  glow.position.set(0, lift + 1.2, -depth / 2 + 1.4); scene.add(glow);

  // מצלמה
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 300);
  const r = Math.max(width, depth) * 2.1;
  camera.position.set(r * 0.65, roofY + r * 0.45, r * 0.95);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, lift + height * 0.45, 0);
  controls.enableDamping = true; controls.autoRotate = true; controls.autoRotateSpeed = 0.6;
  controls.maxPolarAngle = Math.PI * 0.49;
  renderer.domElement.addEventListener('pointerdown', () => { controls.autoRotate = false; });

  function size() {
    const b = host.getBoundingClientRect();
    renderer.setSize(b.width, b.height, false);
    camera.aspect = b.width / Math.max(1, b.height); camera.updateProjectionMatrix();
  }
  size();
  const ro = new ResizeObserver(size); ro.observe(host);
  (function loop() {
    if (!host.isConnected) { ro.disconnect(); renderer.dispose(); return; }
    requestAnimationFrame(loop);
    if (document.body.classList.contains('still')) controls.autoRotate = false;
    controls.update(); renderer.render(scene, camera);
  })();

  const download = (blob, name) => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  return {
    exportGLB(name) {
      return new Promise((res, rej) => new GLTFExporter().parse(room, glb => { download(new Blob([glb], { type: 'model/gltf-binary' }), name); res(); }, rej, { binary: true }));
    },
    snapshot(name) {
      renderer.render(scene, camera);
      renderer.domElement.toBlob(b => download(b, name), 'image/png');
    },
  };
}
