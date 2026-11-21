import * as T from 'three';
import {createRaceScene} from './race-scene.js';
import {startRaceFilm} from './race-film.js';

function caption(t){
 return t<1.85?'发车前，两位裁判屏住了呼吸。':t<4.4?'红色小车沿着海岸线冲了过来。':t<7?'冲线！一二摇起了方格旗。':'布布宣布：今天的冠军只有巴掌大。';
}

function startRace(){
const el=id=>document.getElementById(id),stage=el('stage');
const renderer=new T.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.toneMapping=T.ACESFilmicToneMapping;stage.append(renderer.domElement);
const camera=new T.OrthographicCamera(-2,2,2,-2,.1,30);
const {scene,pose}=createRaceScene();
const mirror=el('mirror'),review=Boolean(mirror);
const copy=mirror?.getContext('2d');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let t=reduced && review?4.87:(review?3.6:0),last,playing=!reduced,drag;
if(review)el('time').value=Math.round(t/9.6*1000);
function play(v){playing=v;document.body.classList.toggle('playing',playing);el('play').textContent=v?'暂停':'播放';}play(playing);
el('play').onclick=()=>play(!playing);el('time').oninput=e=>{play(false);t=9.6*e.target.value/1000;};
stage.onpointerdown=e=>{drag=[e.clientX,+el('angle').value];stage.setPointerCapture(e.pointerId);};
stage.onpointermove=e=>{if(drag)el('angle').value=drag[1]+(e.clientX-drag[0])*.15;};stage.onlostpointercapture=()=>drag=null;
const resize=new ResizeObserver(()=>{const w=stage.clientWidth,h=stage.clientHeight;camera.left=-1.96;camera.right=1.96;camera.top=1.96*h/w;camera.bottom=-camera.top;camera.updateProjectionMatrix();renderer.setSize(w,h,false);});
resize.observe(stage);
renderer.domElement.addEventListener('webglcontextlost',()=>{
 renderer.setAnimationLoop(null);
 resize.disconnect();
 startRaceFilm(caption);
},{once:true});
renderer.setAnimationLoop(now=>{if(playing){t=(t+Math.min((now-(last??now))/1000,.1))%9.6;el('time').value=t/9.6*1000;}last=now;pose(t);const line=caption(t);if(el('line').textContent!==line)el('line').textContent=line;const a=T.MathUtils.degToRad(+el('angle').value);camera.position.set(6*Math.sin(a),2.35,6*Math.cos(a));camera.lookAt(0,1.03,0);renderer.render(scene,camera);
 if(copy&&mirror.clientWidth){
  const canvas=renderer.domElement;
  if(mirror.width!==canvas.width||mirror.height!==canvas.height){mirror.width=canvas.width;mirror.height=canvas.height;}
  copy.clearRect(0,0,mirror.width,mirror.height);copy.drawImage(canvas,0,0);
 }
});
}
try{
 startRace();
 document.body.classList.add('live');
}catch(error){
 startRaceFilm(caption);
 console.warn(error);
}
