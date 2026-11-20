import * as T from 'three';
import {cameraStudy} from './camera-rig.js';
import {addSculptLights} from './sculpt-studio.js';
import {ball,mesh,clay} from './character-volume.js';
const el=id=>document.getElementById(id),stage=el('stage'),scene=new T.Scene();
const renderer=new T.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.toneMapping=T.ACESFilmicToneMapping;stage.append(renderer.domElement);addSculptLights(scene);
const camera=new T.OrthographicCamera(-2,2,2,-2,.1,30);
const matte=c=>clay(c), glow=c=>new T.MeshBasicMaterial({color:c});
const pine=matte('#355c59'),distant=matte('#526d77'),wood=matte('#755448'),grass=matte('#739376');
function tree(x,z,h,material){
 mesh(scene,new T.CylinderGeometry(.06,.09,h*.7,12),wood,x,h*.29,z);
 for(let i=0;i<3;i++)mesh(scene,new T.ConeGeometry(h*(.29-i*.055),h*.53,12),material,x,h*(.34+i*.21),z);
}
for(const [x,z,h] of [[-2.5,-2,2.3],[-1.5,-2.5,1.9],[.5,-3,2.1],[1.8,-2.6,2.4],[2.6,-1,2.1],[-1.95,-.8,2.15]])tree(x,z,h,z<-1?distant:pine);
ball(scene,matte('#678d84'),0,-.38,-1.8,4,.64,1);
ball(scene,grass,0,-.24,0,2.7,.25,1.12);
const gold=glow('#ffe3a5');ball(scene,gold,-1.03,2.59,-2.8,.24,.24,.07);
for(let i=0;i<36;i++)ball(scene,gold,3.6*Math.sin(i*32.16),2.13+.95*Math.abs(Math.sin(i*3.42)),-3.3,.009+(i%3)*.004,.015,.01);
for(let i=0;i<20;i++){
 const x=(i%2?1:-1)*(1.26+.65*Math.abs(Math.sin(i*7.12))),z=.2+.58*Math.sin(i*2.7);
 const leaf=ball(scene,pine,x,.06,z,.046,.13,.031);leaf.rotation.z=.5*Math.cos(i);
}
const actors=[false,true].map(yi=>{
 const {root}=cameraStudy(yi);root.position.x=yi?.76:-.77;root.rotation.y=yi?-.33:.43;scene.add(root);
 return {root,head:root.getObjectByName('Head'),shoulders:['L_Shoulder','R_Shoulder'].map(n=>root.getObjectByName(n))};
});
const brass=matte('#bd8750'),rim=matte('#64574d');
const lx=.085,lz=.29;
mesh(scene,new T.CylinderGeometry(.13,.17,.28,20),wood,lx,.14,lz);
mesh(scene,new T.CylinderGeometry(.122,.14,.045,20),brass,lx,.31,lz);
const glass=matte('#d4b57a');const bulb=ball(scene,glass,lx,.49,lz,.104,.16,.104);
mesh(scene,new T.ConeGeometry(.145,.095,16),rim,lx,.68,lz);
for(const dx of [-.107,.107])mesh(scene,new T.CylinderGeometry(.009,.009,.31,8),brass,lx+dx,.48,lz);
const light=new T.PointLight('#ffc075',0,3);light.position.set(lx,.63,lz+.20);scene.add(light);
const flies=Array.from({length:12},()=>ball(scene,gold,0,0,0,.026,.026,.026));
const ease=T.MathUtils.smoothstep,beat=(t,a,b,c,d)=>ease(t,a,b)-ease(t,c,d);
function pose(t){
 const notice=beat(t,.2,1.6,6.9,8.8),reach=beat(t,1.7,3.35,4.3,5.65),watch=beat(t,4.1,6.4,7.7,9.3),lit=beat(t,3.15,3.65,8.25,9.5);
 actors.forEach(({head,shoulders},i)=>{
  const sign=i?-1:1;
  head.rotation.set(.13*notice-.29*watch,sign*(.16*notice+.12*watch),sign*.055*notice);
  shoulders.forEach((bone,j)=>{
   const side=j?1:-1,gesture=i&&j===0?reach:0;
   bone.rotation.set(-.22-.62*gesture,0,side*(.29+.58*gesture));
  });
 });
 glass.emissive.setHex(0xffaa39);glass.emissiveIntensity=lit*2.2;light.intensity=lit*.48;
 flies.forEach((f,i)=>{
  const p=T.MathUtils.clamp((t-3.6-i*.17)/3.3,0,1),a=i*2.4+p*4;
  f.position.set(lx+(.08+.58*p)*Math.sin(a),.64+p*(1.52+.3*Math.sin(i)),lz+.24*Math.cos(a));
  f.scale.setScalar(.021*Math.sin(Math.PI*p));
 });
 el('line').textContent=t<2?'林子里最后一盏灯，也睡着了。':t<4.2?'一二伸手，轻轻碰醒了灯芯。':t<8?'原来，灯里住着一群萤火虫。':'两个人目送最后一点光飞进林子。';
}
let t=0,last,playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,drag;
function play(v){playing=v;el('play').textContent=v?'暂停':'播放';}play(playing);
el('play').onclick=()=>play(!playing);el('time').oninput=e=>{play(false);t=9.6*e.target.value/1000;};
stage.onpointerdown=e=>{drag=[e.clientX,+el('angle').value];stage.setPointerCapture(e.pointerId);};
stage.onpointermove=e=>{if(drag)el('angle').value=drag[1]+(e.clientX-drag[0])*.15;};stage.onlostpointercapture=()=>drag=null;
new ResizeObserver(()=>{const w=stage.clientWidth,h=stage.clientHeight;camera.left=-1.96;camera.right=1.96;camera.top=1.96*h/w;camera.bottom=-camera.top;camera.updateProjectionMatrix();renderer.setSize(w,h,false);}).observe(stage);
renderer.setAnimationLoop(now=>{if(playing){t=(t+Math.min((now-(last??now))/1000,.1))%9.6;el('time').value=t/9.6*1000;}last=now;pose(t);const a=T.MathUtils.degToRad(+el('angle').value);camera.position.set(6*Math.sin(a),1.95,6*Math.cos(a));camera.lookAt(0,1.34,0);renderer.render(scene,camera);});
