import truckParts from './race/truck.json';
import * as T from 'three';
import {cameraStudy} from './camera-rig.js';
import {addSculptLights} from './sculpt-studio.js';
import {ball,mesh,clay} from './character-volume.js';
const el=id=>document.getElementById(id),stage=el('stage'),scene=new T.Scene();
const renderer=new T.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.toneMapping=T.ACESFilmicToneMapping;stage.append(renderer.domElement);addSculptLights(scene);
const camera=new T.OrthographicCamera(-2,2,2,-2,.1,30);
// Seaside toy circuit: the pickup runs along the foreground, below the spectators.
const mint=clay('#80beb7'),cream=clay('#ffe7b0'),red=clay('#bd5849'),road=clay('#71878a');
function block(parent,mat,x,y,z,w,h,d){
 return mesh(parent,new T.BoxGeometry(w,h,d),mat,x,y,z);
}
block(scene,mint,0,-.22,-2.6,14,.15,5);
block(scene,cream,0,-.08,.08,5.45,.16,2.05);
block(scene,road,0,.009,.78,6,.018,.65);
for(let i=-7;i<8;i++)block(scene,i%2?red:cream,i*.39,.027,.46,.39,.045,.075);
for(let i=0;i<8;i++)for(let j=0;j<2;j++)
 block(scene,(i+j)%2?cream:road,.97+j*.08,.022,.5+i*.08,.08,.01,.08);
for(const [x,y,z,w] of [[-1.52,2.22,-2.7,.42],[.94,2.35,-3,.47],[-.48,2.54,-3,.30]]){
 ball(scene,cream,x,y,z,w,.095,.10);ball(scene,cream,x-.06,y+.065,z,w*.52,.13,.13);
}
for(const x of [-2.3,-1.85,1.8,2.3]){
 mesh(scene,new T.CylinderGeometry(.019,.025,1.59,12),cream,x,.79,-.9);
 const flag=block(scene,x<0?red:mint,x+.13,1.47,-.9,.27,.16,.025);flag.rotation.z=-.09;
}
const actors=[false,true].map(yi=>{
 const {root}=cameraStudy(yi);root.position.x=yi?.78:-.78;root.rotation.y=yi?-.22:.22;scene.add(root);
 return {palm:root.getObjectByName(yi?'R_Arm':'L_Arm'),head:root.getObjectByName('Head'),arm:root.getObjectByName(yi?'R_Shoulder':'L_Shoulder')};
});
const truck=new T.Group(),wheels=[];scene.add(truck);truck.scale.setScalar(.28);truck.rotation.y=Math.PI/2;
for(const [name,[offset,parts]] of Object.entries(truckParts)){
 const part=new T.Group();part.position.fromArray(offset);truck.add(part);if(name.startsWith('wheel'))wheels.push(part);
 for(const [color,coords,indices] of parts){
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(coords.map(v=>v/1000),3));geo.setIndex(indices);geo.computeVertexNormals();mesh(part,geo,clay(color));
 }
}
const pennant=new T.Group();scene.add(pennant);pennant.position.set(1.42,.55,.12);
mesh(pennant,new T.CylinderGeometry(.015,.019,.87,12),cream,0,.43,0);
for(let x=0;x<4;x++)for(let y=0;y<3;y++)block(pennant,(x+y)%2?road:cream,.045+x*.08,.68+y*.08,0,.081,.081,.018);
function pose(t){
 const ease=T.MathUtils.smoothstep,go=ease(t,1.8,6.6),cheer=ease(t,4.4,5.65)-ease(t,7.7,9.2);
 // Return behind the stage while out of frame.
 truck.position.set(-2.75+5.65*go,.019,.78);truck.visible=t<7;
 wheels.forEach(w=>w.rotation.x=go*65);
 actors.forEach(({head,arm},i)=>{
  head.rotation.set(.14-.10*cheer,-.35+.69*(go-ease(t,7.6,9.4)),0);
  arm.rotation.set(-.18-.39*cheer,0,(i?1:-1)*(.32+.45*cheer));
 });
 const palm=actors[1].palm;palm.updateWorldMatrix(true,false);
 palm.getVertexPosition(palm.geometry.attributes.position.count-1,pennant.position);
 palm.localToWorld(pennant.position);
 pennant.rotation.z=.12+cheer*(.23+.30*Math.sin(7*t));
 const line=t<1.85?'发车前，两位裁判屏住了呼吸。':t<4.4?'红色小车沿着海岸线冲了过来。':t<7?'冲线！一二摇起了方格旗。':'布布宣布：今天的冠军只有巴掌大。';
 if(el('line').textContent!==line)el('line').textContent=line;
}
let t=0,last,playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,drag;
function play(v){playing=v;el('play').textContent=v?'暂停':'播放';}play(playing);
el('play').onclick=()=>play(!playing);el('time').oninput=e=>{play(false);t=9.6*e.target.value/1000;};
stage.onpointerdown=e=>{drag=[e.clientX,+el('angle').value];stage.setPointerCapture(e.pointerId);};
stage.onpointermove=e=>{if(drag)el('angle').value=drag[1]+(e.clientX-drag[0])*.15;};stage.onlostpointercapture=()=>drag=null;
new ResizeObserver(()=>{const w=stage.clientWidth,h=stage.clientHeight;camera.left=-1.96;camera.right=1.96;camera.top=1.96*h/w;camera.bottom=-camera.top;camera.updateProjectionMatrix();renderer.setSize(w,h,false);}).observe(stage);
renderer.setAnimationLoop(now=>{if(playing){t=(t+Math.min((now-(last??now))/1000,.1))%9.6;el('time').value=t/9.6*1000;}last=now;pose(t);const a=T.MathUtils.degToRad(+el('angle').value);camera.position.set(6*Math.sin(a),2.35,6*Math.cos(a));camera.lookAt(0,1.03,0);renderer.render(scene,camera);});
