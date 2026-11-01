const stage = document.querySelector('#stage');
const poster = document.querySelector('#poster');
const status = document.querySelector('#status');
const front = document.querySelector('#front');
const motionButton = document.querySelector('#motion');
const upgrade = document.querySelector('#upgrade');
const retry = document.querySelector('#retry');
let failed = false;
let renderer;
let timer = setTimeout(() => fail('加载超时，当前显示静态预览。可以重新加载。'), 25000);
function fail(message) {
  failed = true;
  clearTimeout(timer);
  if (renderer) { renderer.setAnimationLoop(null); renderer.domElement.hidden = true; }
  poster.hidden = false;
  status.textContent = message;
  for (const button of [front, motionButton, upgrade]) button.disabled = true;
  retry.hidden = false;
}
retry.onclick = () => location.reload();
poster.onerror = () => { status.textContent = '静态预览未能加载，请检查网络后重新加载。'; retry.hidden = false; };
try {
  const [T, { GLTFLoader }, { RoomEnvironment }] = await Promise.all([
    import('three'), import('three/addons/loaders/GLTFLoader.js'),
    import('three/addons/environments/RoomEnvironment.js')
  ]);
  if (failed) throw new Error('Load timed out');
  renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'default' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
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
  room.dispose();
  pmrem.dispose();
  scene.add(new T.HemisphereLight(0xffefd9, 0x51405a, 2));
  const key = new T.DirectionalLight(0xffddae, 3.5);
  key.position.set(-3, 5, 8); scene.add(key);
  const fill = new T.DirectionalLight(0xcbd9ff, 1.8);
  fill.position.set(4, 1, 5); scene.add(fill);
  const gltf = await new GLTFLoader().loadAsync('./assets/chef_bu.glb');
  if (failed) { renderer.dispose(); throw new Error('Load timed out'); }
  const card = new T.Group();
  const model = gltf.scene;
  // Blender XY card with +Z front -> glTF XZ card -> upright XY card.
  model.rotation.x = Math.PI / 2;
  // Exported scene lights must not compete with the viewer lighting.
  model.traverse(object => { if (object.isLight || object.isCamera) object.visible = false; });
  model.updateMatrixWorld(true);
  const bounds = new T.Box3().setFromObject(model);
  if (bounds.isEmpty()) throw new Error('Empty model');
  const center = bounds.getCenter(new T.Vector3());
  model.position.sub(center);
  card.add(model); scene.add(card);
  const size = bounds.getSize(new T.Vector3());
  // Depth contributes to framing when the card is tilted.
  function resize() {
    const width = Math.max(stage.clientWidth, 1), height = Math.max(stage.clientHeight, 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const tan = Math.tan(T.MathUtils.degToRad(camera.fov / 2));
    camera.position.set(0, 0, Math.max((size.y + size.z * .4) / (2 * tan), (size.x + size.z * .7) / (2 * tan * camera.aspect)) * 1.2 + size.z / 2);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();
  let tx = 0, ty = 0, dragging = false, pointerId = null;
  let startX = 0, startY = 0, startRX = 0, startRY = 0;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let motion = !reducedMotion.matches, time = 0, burst = 0, last = 0;
  const food = [];
  model.traverse(object => {
    if (/Flying.ingredient/i.test(object.name)) food.push({ object, base: object.position.clone(), phase: food.length * .7 });
  });
  function updateMotion() {
    motionButton.textContent = '轻动态：' + (motion ? '开' : '关');
    motionButton.setAttribute('aria-pressed', String(motion));
  }
  motionButton.onclick = () => { motion = !motion; updateMotion(); };
  reducedMotion.addEventListener('change', event => { if (event.matches) { motion = false; updateMotion(); } });
  stage.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    dragging = true; pointerId = event.pointerId;
    startX = event.clientX; startY = event.clientY; startRX = tx; startRY = ty;
    stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener('pointermove', event => {
    if (!dragging || event.pointerId !== pointerId) return;
    tx = T.MathUtils.clamp(startRX + (event.clientX - startX) / stage.clientWidth * 1.8, -.65, .65);
    ty = T.MathUtils.clamp(startRY + (event.clientY - startY) / stage.clientHeight * .9, -.28, .28);
  });
  function release() { dragging = false; pointerId = null; }
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);
  stage.addEventListener('lostpointercapture', release);
  front.onclick = () => { release(); tx = ty = 0; };
  upgrade.onclick = () => {
    if (reducedMotion.matches) { status.textContent = '已开启减少动态效果，金光演出已简化。'; return; }
    burst = 1.4; stage.classList.remove('burst');
    void stage.offsetWidth; stage.classList.add('burst');
  };
  clearTimeout(timer);
  poster.hidden = true;
  renderer.domElement.hidden = false;
  for (const button of [front, motionButton, upgrade]) button.disabled = false;
  updateMotion();
  status.textContent = '拖动查看真实层次 · 当前为已有模型接入版，美术仍在打磨';
  renderer.setAnimationLoop(now => {
    if (document.hidden) { last = now; return; }
    const dt = last ? Math.min((now - last) / 1000, .05) : 0; last = now;
    if (motion) time += dt;
    card.rotation.y = T.MathUtils.damp(card.rotation.y, tx, 9, dt);
    card.rotation.x = T.MathUtils.damp(card.rotation.x, ty, 9, dt);
    card.position.y = motion ? Math.sin(time * 1.2) * .04 : 0;
    for (const item of food) {
      item.object.position.copy(item.base);
      if (motion) item.object.position.z += Math.sin(time * 2.5 + item.phase) * .12;
    }
    burst = Math.max(0, burst - dt);
    renderer.toneMappingExposure = 1.1 + Math.sin(burst / 1.4 * Math.PI) * .5;
    renderer.render(scene, camera);
  });
} catch (error) {
  console.error('Chef Bu viewer:', error);
  if (!failed) fail('暂时无法打开三维卡，当前显示静态预览。请检查网络或 WebGL 支持。');
}
