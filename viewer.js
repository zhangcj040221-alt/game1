const $ = selector => document.querySelector(selector);
const stage = $('#stage'), card = $('#card'), poster = $('#poster'), status = $('#status');
const front = $('#front'), motion = $('#motion'), tilt = $('#tilt'), upgrade = $('#upgrade'), retry = $('#retry');
const levels = [...document.querySelectorAll('[data-level]')];
const planes = [...card.querySelectorAll('[data-depth]')];
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
let ready = false, level = 5, lightMotion = !reduce.matches, upgrading = false;
let target = { x: 0, y: 0 }, current = { x: 0, y: 0 }, frame = 0, last = 0;
let drag = null, sensor = false, orientationOrigin = null, upgradeTimer, sensorTimer;
const descriptions = ['基础卡 · 静态珍藏', '视差卡 · 拖动倾斜，感受前后层次', '动态卡 · 小厨房轻轻呼吸', '特效卡 · 蒸汽与星光环绕', '镀闪卡 · 让每一刻都闪闪发光'];
function draw() {
  const x = level === 1 ? 0 : current.x, y = level === 1 ? 0 : current.y;
  card.style.transform = `rotateX(${-y * 8}deg) rotateY(${x * 11}deg)`;
  for (const plane of planes) {
    const depth = Number(plane.dataset.depth), z = level === 1 ? 0 : Number(plane.dataset.z);
    plane.style.transform = `translate3d(${x * depth * 9}px,${y * depth * 7}px,${z}px)`;
  }
  card.style.setProperty('--shine-x', `${x * 35}%`);
}
function tick(now) {
  frame = 0;
  const dt = last ? Math.min((now - last) / 1000, .05) : 1 / 60;
  last = now;
  const amount = reduce.matches ? 1 : 1 - Math.exp(-dt * 13);
  current.x += (target.x - current.x) * amount;
  current.y += (target.y - current.y) * amount;
  if (Math.abs(current.x - target.x) < .0005) current.x = target.x;
  if (Math.abs(current.y - target.y) < .0005) current.y = target.y;
  draw();
  if (current.x !== target.x || current.y !== target.y) requestDraw();
}
function requestDraw() { if (!frame && ready && !document.hidden) frame = requestAnimationFrame(tick); }
function point(x, y) { target.x = clamp(x, -1, 1); target.y = clamp(y, -1, 1); requestDraw(); }
function reset() { drag = null; orientationOrigin = null; point(0, 0); }
function updateMotion() {
  const animate = lightMotion && !reduce.matches;
  stage.classList.toggle('is-animated', animate && level >= 3);
  stage.classList.toggle('motion-off', !animate);
  motion.textContent = '光影：' + (animate ? '开' : '关');
  motion.setAttribute('aria-pressed', String(animate));
}
function choose(next) {
  level = next; stage.dataset.level = String(level);
  for (const button of levels) button.setAttribute('aria-pressed', String(Number(button.dataset.level) === level));
  if (level === 1) { disableSensor(); reset(); }
  status.textContent = descriptions[level - 1];
  updateMotion(); requestDraw();
}
function fit() {
  // Keep enough room for the raised frame and maximum supported tilt.
  const width = Math.max(1, Math.min(stage.clientWidth * .94, stage.clientHeight * .75 * .94, 730));
  card.style.width = `${width}px`;
  requestDraw();
}
new ResizeObserver(fit).observe(stage);
for (const button of levels) button.onclick = () => choose(Number(button.dataset.level));
front.onclick = reset;
stage.addEventListener('dblclick', reset);
motion.onclick = () => { lightMotion = !lightMotion; updateMotion(); };
reduce.addEventListener('change', () => { if (reduce.matches) lightMotion = false; updateMotion(); requestDraw(); });
stage.addEventListener('pointerdown', event => {
  if (!ready || level === 1 || (event.pointerType === 'mouse' && event.button !== 0)) return;
  disableSensor();
  drag = { id: event.pointerId, x: event.clientX, y: event.clientY, tx: target.x, ty: target.y };
  stage.setPointerCapture(event.pointerId);
});
stage.addEventListener('pointermove', event => {
  if (!ready || level === 1 || sensor) return;
  if (drag && event.pointerId === drag.id) {
    point(drag.tx + (event.clientX - drag.x) / (stage.clientWidth * .38), drag.ty + (event.clientY - drag.y) / (stage.clientHeight * .4));
  } else if (!drag && event.pointerType === 'mouse') {
    const rect = stage.getBoundingClientRect();
    point((event.clientX - rect.left) / rect.width * 2 - 1, (event.clientY - rect.top) / rect.height * 2 - 1);
  }
});
function release(event) { if (drag?.id === event.pointerId) drag = null; }
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) stage.addEventListener(type, release);
stage.addEventListener('pointerleave', event => { if (!drag && event.pointerType === 'mouse' && !sensor) reset(); });
stage.addEventListener('keydown', event => {
  if (!ready || level === 1 || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
  event.preventDefault(); disableSensor();
  if (event.key === 'Home') reset();
  else point(target.x + (event.key === 'ArrowRight' ? .15 : event.key === 'ArrowLeft' ? -.15 : 0), target.y + (event.key === 'ArrowDown' ? .15 : event.key === 'ArrowUp' ? -.15 : 0));
});
function onOrientation(event) {
  if (!sensor || !ready || level === 1 || !Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) return;
  clearTimeout(sensorTimer);
  orientationOrigin ??= { beta: event.beta, gamma: event.gamma };
  const dx = (event.gamma - orientationOrigin.gamma) / 22;
  const dy = (event.beta - orientationOrigin.beta) / 22;
  // Map device axes to screen orientation, including landscape.
  const angle = (screen.orientation?.angle ?? window.orientation ?? 0) * Math.PI / 180;
  point(dx * Math.cos(angle) + dy * Math.sin(angle), dy * Math.cos(angle) - dx * Math.sin(angle));
}
function disableSensor() {
  if (!sensor) return;
  sensor = false; orientationOrigin = null; clearTimeout(sensorTimer);
  window.removeEventListener('deviceorientation', onOrientation);
  tilt.setAttribute('aria-pressed', 'false'); tilt.textContent = '手机倾斜';
}
tilt.onclick = async () => {
  if (sensor) { disableSensor(); reset(); return; }
  try {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      const permission = await DeviceOrientationEvent.requestPermission();
      if (permission !== 'granted') { status.textContent = '未开启倾斜权限，仍可拖动卡面。'; return; }
    }
    if (level === 1) choose(2);
    sensor = true; orientationOrigin = null;
    window.addEventListener('deviceorientation', onOrientation);
    tilt.setAttribute('aria-pressed', 'true'); tilt.textContent = '倾斜已开启';
    status.textContent = '以当前姿态为中心，轻轻倾斜手机；回正可重新校准。';
    sensorTimer = setTimeout(() => { if (sensor && !orientationOrigin) status.textContent = '尚未收到倾斜数据，可继续拖动；请使用支持感应的手机。'; }, 3000);
  } catch { status.textContent = '暂时无法读取设备倾斜，仍可拖动卡面。'; }
};
upgrade.onclick = () => {
  choose(5);
  if (reduce.matches) { status.textContent = '已切换镀闪卡；按减少动态偏好简化演出。'; return; }
  if (upgrading) return;
  upgrading = true; upgrade.disabled = true;
  stage.classList.remove('upgrading'); void stage.offsetWidth; stage.classList.add('upgrading');
  status.textContent = '✦ 厨师布 · 镀闪典藏';
  clearTimeout(upgradeTimer);
  upgradeTimer = setTimeout(() => {
    stage.classList.remove('upgrading'); upgrading = false; upgrade.disabled = false;
    status.textContent = descriptions[level - 1];
  }, 1800);
};
retry.onclick = () => location.reload();
poster.addEventListener('error', () => { status.textContent = '卡面未能加载，请重新加载。'; retry.hidden = false; });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (frame) cancelAnimationFrame(frame); frame = 0; }
  else { last = 0; requestDraw(); }
});
window.addEventListener('pagehide', () => { disableSensor(); clearTimeout(upgradeTimer); });
// Deterministic glints keep the composition stable across reloads.
for (let i = 0; i < 28; i++) {
  const sparkle = document.createElement('i'); sparkle.className = 'spark';
  const side = i % 2 ? .93 : .06;
  sparkle.style.cssText = `left:${(side + Math.sin(i * 2.4) * .055) * 100}%;top:${12 + (i * 31 % 75)}%;--delay:-${i * .31}s;--duration:${2.5 + i % 4 * .4}s`;
  $('#sparkles').append(sparkle);
}
try {
  await Promise.all([...card.querySelectorAll('img')].map(image => image.decode()));
  ready = true;
  poster.hidden = true; card.hidden = false;
  for (const button of [front, motion, upgrade, ...levels]) button.disabled = false;
  if ('DeviceOrientationEvent' in window && isSecureContext) tilt.disabled = false;
  else tilt.title = '当前设备或浏览器不支持倾斜感应，可拖动卡面。';
  fit(); choose(5);
} catch {
  card.hidden = true; poster.hidden = false;
  status.textContent = '图层暂未加载完整，当前显示静态卡面。'; retry.hidden = false;
}
