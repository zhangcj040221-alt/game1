import * as T from 'three';
import {cameraStudy} from './camera-rig.js';
import {addSculptLights} from './sculpt-studio.js';

const stage=document.querySelector('#stage'),time=document.querySelector('#time');
const angle=document.querySelector('#angle'),play=document.querySelector('#play');
const scene=new T.Scene(),camera=new T.OrthographicCamera(-2,2,2,-2,.1,20);
const renderer=new T.WebGLRenderer({alpha:true,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.toneMapping=T.ACESFilmicToneMapping;
stage.append(renderer.domElement);addSculptLights(scene);
const cycle=3.6;
const actors=[false,true].map((yi,i)=>{
 const {root,anticipation}=cameraStudy(yi);
 const placement=new T.Group();
 placement.position.x=yi?.79:-.79;placement.rotation.y=yi?-.44:.44;
 placement.add(root);scene.add(placement);
 const mixer=new T.AnimationMixer(root),action=mixer.clipAction(anticipation);
 action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;
 return {mixer,action,delay:.18+1.22*i};
});
const dais=new T.Mesh(new T.CylinderGeometry(1.78,1.73,.11,96),new T.MeshStandardMaterial({color:'#accabb',roughness:.96}));
dais.scale.z=.57;dais.position.y=-.055;scene.add(dais);
let elapsed=0,playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,last;
function setPlaying(value){playing=value;play.textContent=value?'暂停':'播放';}
setPlaying(playing);play.onclick=()=>setPlaying(!playing);
time.oninput=()=>{setPlaying(false);elapsed=cycle*time.value/1000;};
let drag;
stage.onpointerdown=e=>{drag={x:e.clientX,yaw:+angle.value};stage.setPointerCapture(e.pointerId);};
stage.onpointermove=e=>{if(drag)angle.value=T.MathUtils.clamp(drag.yaw+(e.clientX-drag.x)*.14,-20,20);};
stage.onpointerup=stage.onpointercancel=()=>{drag=null;};
new ResizeObserver(()=>{
 const w=stage.clientWidth,h=stage.clientHeight;
 camera.right=1.92;camera.left=-camera.right;camera.top=camera.right*h/w;camera.bottom=-camera.top;
 camera.updateProjectionMatrix();renderer.setSize(w,h,false);
}).observe(stage);
renderer.setAnimationLoop(now=>{
 if(playing){elapsed=(elapsed+Math.min((now-(last??now))/1000,.08))%cycle;time.value=elapsed/cycle*1000;}
 last=now;
 for(const {action,mixer,delay} of actors){
  action.reset().play();mixer.setTime(T.MathUtils.clamp(elapsed-delay,0,action.getClip().duration));
 }
 const yaw=T.MathUtils.degToRad(+angle.value);
 camera.position.set(5*Math.sin(yaw),1.54,5*Math.cos(yaw));camera.lookAt(0,.85,0);
 renderer.render(scene,camera);
});
