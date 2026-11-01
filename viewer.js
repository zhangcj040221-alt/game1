const stage = document.querySelector('#stage');
const poster = document.querySelector('#poster');
const status = document.querySelector('#status');
const front = document.querySelector('#front');
const motionButton = document.querySelector('#motion');
const upgrade = document.querySelector('#upgrade');
const retry = document.querySelector('#retry');
const levels = [...document.querySelectorAll('[data-level]')];
let level = 5;
let failed = false;
let renderer;
let timer = setTimeout(() => fail('加载超时，当前显示静态预览。可以重新加载。'), 25000);
function fail(message) {
  failed = true;
  clearTimeout(timer);
  if (renderer) { renderer.setAnimationLoop(null); renderer.domElement.hidden = true; }
  poster.hidden = false;
  status.textContent = message;
  for (const button of [front, motionButton, upgrade, ...levels]) button.disabled = true;
  retry.hidden = false;
}
retry.onclick = () => location.reload();
poster.onerror = () => { status.textContent = '静态预览未能加载，请检查网络后重新加载。'; retry.hidden = false; };
try {
  const [T, { GLTFLoader }, { RoomEnvironment }] = await Promise.all([
    import('./vendor/engine.js'), import('./vendor/engine.js'),
    import('./vendor/engine.js')
  ]);
  if (failed) throw new Error('Load timed out');
  renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'default' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .95;
  renderer.domElement.setAttribute('aria-label', '厨师布立体卡');
  renderer.domElement.hidden = true;
  stage.prepend(renderer.domElement);
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    fail('三维显示已中断，已切换到静态预览。');
  });
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(34, 1, .1, 200);
  const pmrem = new T.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const env = pmrem.fromScene(room, .04);
  scene.environment = env.texture;
  scene.environmentIntensity = .65;
  room.dispose();
  pmrem.dispose();
  scene.add(new T.HemisphereLight(0xffefd9, 0x302039, .65));
  const key = new T.DirectionalLight(0xffcf8c, 3.0);
  key.position.set(-3, 5, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(512, 512);
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 5, bottom: -5, near: .1, far: 24 });
  key.shadow.normalBias = .025; key.shadow.bias = -.0001;
  scene.add(key);
  const fill = new T.DirectionalLight(0xaac5ff, .85);
  fill.position.set(4, 1, 5); scene.add(fill);
  const gltf = await new GLTFLoader().loadAsync('./assets/chef_bu.glb');
  if (failed) { renderer.dispose(); throw new Error('Load timed out'); }
  const card = new T.Group();
  const model = gltf.scene;
  // Blender XY card with +Z front -> glTF XZ card -> upright XY card.
  model.rotation.x = Math.PI / 2;
  // Exported scene lights must not compete with the viewer lighting.
  model.traverse(object => { if (object.isLight || object.isCamera) object.visible = false; if (object.isMesh) { object.castShadow = /Face|sleeve|paw|coat|hat|foot|Wok|tomato|Scarf|body|ear|Caramel|cotton|iron|scarf|vinyl/i.test(object.name); object.receiveShadow = true; } });
  model.updateMatrixWorld(true);
  const bounds = new T.Box3().setFromObject(model);
  if (bounds.isEmpty()) throw new Error('Empty model');
  const center = bounds.getCenter(new T.Vector3());
  model.position.sub(center);
  card.add(model); scene.add(card);
  const size = bounds.getSize(new T.Vector3());
  let dirty = true;
  // Depth contributes to framing when the card is tilted.
  function resize() {
    dirty = true;
    const width = Math.max(stage.clientWidth, 1), height = Math.max(stage.clientHeight, 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const tan = Math.tan(T.MathUtils.degToRad(camera.fov / 2));
    camera.position.set(0, 0, Math.max((size.y + size.z * .2) / (2 * tan), (size.x + size.z * .4) / (2 * tan * camera.aspect)) * 1.05 + size.z / 2);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();
  let tx = 0, ty = 0, dragging = false, pointerId = null;
  let startX = 0, startY = 0, startRX = 0, startRY = 0;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let motion = !reducedMotion.matches, time = 0, burst = 0, last = 0;
  const sparkleGeometry = new T.BufferGeometry();
  const sparklePositions = new Float32Array(96 * 3);
  const seeds = Array.from({ length: 96 }, (_, i) => ({ angle: i * 2.39996, radius: 2.7 + (i % 7) * .09, speed: .2 + (i % 5) * .035 }));
  sparkleGeometry.setAttribute('position', new T.BufferAttribute(sparklePositions, 3));
  const sparkleMaterial = new T.PointsMaterial({ color: 0xffd887, size: .045, transparent: true, opacity: .8, blending: T.AdditiveBlending, depthWrite: false });
  const sparkles = new T.Points(sparkleGeometry, sparkleMaterial);
  sparkles.frustumCulled = false;
  card.add(sparkles);
  const glow = new T.PointLight(0xffbb55, 0, 18, 2);
  glow.position.set(2, 0, 4); card.add(glow);
  function selectLevel(next) {
    level = next; dirty = true;
    for (const button of levels) button.setAttribute('aria-pressed', String(Number(button.dataset.level) === level));
    if (level === 1) { tx = ty = 0; }
    status.textContent = ['基础卡 · 正面静态展示', '立体卡 · 拖动查看模型层次', '动态卡 · 食材轻盈浮动', '特效卡 · 金色粒子环绕', '镀闪卡 · 流动金光与粒子'][level - 1];
  }
  for (const button of levels) button.onclick = () => selectLevel(Number(button.dataset.level));
  const food = [];
  model.traverse(object => {
    if (/Flying.ingredient/i.test(object.name)) food.push({ object, base: object.position.clone(), phase: food.length * .7 });
  });
  function updateMotion() {
    dirty = true;
    motionButton.textContent = '轻动态：' + (motion ? '开' : '关');
    motionButton.setAttribute('aria-pressed', String(motion));
  }
  motionButton.onclick = () => { motion = !motion; updateMotion(); };
  reducedMotion.addEventListener('change', event => { if (event.matches) { motion = false; updateMotion(); } });
  stage.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (level === 1) return;
    dragging = true; pointerId = event.pointerId;
    startX = event.clientX; startY = event.clientY; startRX = tx; startRY = ty;
    stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener('pointermove', event => {
    if (!dragging || event.pointerId !== pointerId) return;
    dirty = true;
    tx = T.MathUtils.clamp(startRX + (event.clientX - startX) / stage.clientWidth * 1.8, -.65, .65);
    ty = T.MathUtils.clamp(startRY + (event.clientY - startY) / stage.clientHeight * .9, -.28, .28);
  });
  function release() { dragging = false; pointerId = null; }
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);
  stage.addEventListener('lostpointercapture', release);
  front.onclick = () => { release(); tx = ty = 0; dirty = true; };
  upgrade.onclick = () => {
    if (reducedMotion.matches) { status.textContent = '已开启减少动态效果，金光演出已简化。'; return; }
    selectLevel(5); burst = 1.8; stage.classList.remove('burst');
    void stage.offsetWidth; stage.classList.add('burst');
  };
  clearTimeout(timer);
  poster.hidden = true;
  renderer.domElement.hidden = false;
  for (const button of [front, motionButton, upgrade, ...levels]) button.disabled = false;
  updateMotion();
  selectLevel(5);
  let frameAt = 0;
  renderer.setAnimationLoop(now => {
    if (now - frameAt < (reducedMotion.matches ? 500 : 1000 / 30)) return;
    frameAt = now;
    const activeEffects = !reducedMotion.matches && ((motion && level >= 3) || level >= 4 || burst > 0);
    const rotating = Math.abs(card.rotation.y - tx) + Math.abs(card.rotation.x - ty) > .0001;
    if (!dirty && !activeEffects && !rotating) return;
    dirty = false;
    if (document.hidden) { last = now; return; }
    const dt = last ? Math.min((now - last) / 1000, .05) : 0; last = now;
    if (!reducedMotion.matches) time += dt;
    const animated = motion && level >= 3 && !reducedMotion.matches;
    card.rotation.y = T.MathUtils.damp(card.rotation.y, tx, 9, dt);
    card.rotation.x = T.MathUtils.damp(card.rotation.x, ty, 9, dt);
    card.position.y = animated ? Math.sin(time * 1.2) * .04 : 0;
    for (const item of food) {
      item.object.position.copy(item.base);
      if (animated) item.object.position.z += Math.sin(time * 2.5 + item.phase) * .12;
    }
    burst = Math.max(0, burst - dt);
    sparkles.visible = level >= 4 && !reducedMotion.matches;
    for (let i = 0; i < seeds.length; i++) {
      const seed = seeds[i], a = seed.angle + time * seed.speed;
      sparklePositions[i * 3] = Math.cos(a) * seed.radius;
      sparklePositions[i * 3 + 1] = Math.sin(a) * 3.7;
      sparklePositions[i * 3 + 2] = Math.sin(a * 2 + seed.angle) * .8 + .8;
    }
    sparkleGeometry.attributes.position.needsUpdate = true;
    glow.intensity = level === 5 && !reducedMotion.matches ? 7 + Math.sin(time * 1.5) * 4 : 0;
    glow.position.x = Math.sin(time * .7) * 3;
    glow.position.y = Math.cos(time * .7) * 3;
    renderer.toneMappingExposure = .95 + Math.sin(burst / 1.8 * Math.PI) * .5;
    if (burst > 0) card.rotation.y += Math.sin(burst / 1.8 * Math.PI) * dt * .9;
    renderer.render(scene, camera);
  });
} catch (error) {
  console.error('Chef Bu viewer:', error);
  if (!failed) fail('暂时无法打开三维卡，当前显示静态预览。请检查网络或 WebGL 支持。');
}
