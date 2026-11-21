import filmUrl from './race/replay.mp4';
import posterUrl from './race/finish.webp';

// One decoder drives both frames so comparing rims never restarts the finish.
export function startRaceFilm(caption) {
 const stage = document.getElementById('stage');
 const mirror = document.getElementById('mirror');
 const play = document.getElementById('play');
 const time = document.getElementById('time');
 const line = document.getElementById('line');
 const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
 const film = document.createElement('video');
 film.defaultMuted = film.muted = film.loop = film.playsInline = true;
 film.preload = 'auto';
 film.poster = posterUrl;
 film.setAttribute('aria-label', '口袋大奖赛冲线动画');
 stage.replaceChildren(film);
 stage.setAttribute('aria-label', '冲线动画回放');
 stage.onpointerdown = stage.onpointermove = stage.onlostpointercapture = null;
 document.body.classList.remove('live');
 document.body.classList.add('film');
 document.getElementById('angle').closest('label').hidden = true;

 const copy = mirror?.getContext('2d');
 function paintMirror() {
  if (!copy || !mirror.clientWidth || film.readyState < 2) return;
  if (mirror.width !== film.videoWidth || mirror.height !== film.videoHeight) {
   mirror.width = film.videoWidth;
   mirror.height = film.videoHeight;
  }
  copy.drawImage(film, 0, 0);
 }
 function progress() {
  if (!(film.duration > 0)) return;
  time.value = Math.round(1000 * film.currentTime / film.duration);
  line.textContent = caption(film.currentTime);
 }
 function state() {
  document.body.classList.toggle('playing', !film.paused);
  play.textContent = film.paused ? '播放' : '暂停';
 }
 function begin() {
  film.play().catch(state); // Mobile playback policies may require a tap.
 }
 play.onclick = () => film.paused ? begin() : film.pause();
 time.oninput = () => {
  film.pause();
  if (Number.isFinite(film.duration)) film.currentTime = film.duration * time.value / 1000;
 };
 film.addEventListener('loadedmetadata', () => {
  film.currentTime = reduced ? 4.87 : 3.6;
  if (!reduced) begin();
 }, {once:true});
 film.addEventListener('play', state);
 film.addEventListener('pause', state);
 film.addEventListener('timeupdate', progress);
 film.addEventListener('seeked', paintMirror);
 film.addEventListener('loadeddata', paintMirror);
 if ('requestVideoFrameCallback' in film) {
  function nextFrame() {
   paintMirror();
   film.requestVideoFrameCallback(nextFrame);
  }
  film.requestVideoFrameCallback(nextFrame);
 } else {
  film.addEventListener('timeupdate', paintMirror);
 }
 if (mirror) new ResizeObserver(paintMirror).observe(mirror);
 film.addEventListener('error', () => {
  line.textContent = '动画加载失败，点重试。';
  play.textContent = '重试';
  play.onclick = () => { film.load(); begin(); };
  document.body.classList.add('still');
 });
 state();
 film.src = filmUrl;
}
