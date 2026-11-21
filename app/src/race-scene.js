import truckParts from './race/truck.json';
import * as T from 'three';
import {cameraStudy} from './camera-rig.js';
import {addSculptLights} from './sculpt-studio.js';
import {ball,mesh,clay} from './character-volume.js';

export function createRaceScene(){
 const scene=new T.Scene();
 addSculptLights(scene);
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
  const arm=root.getObjectByName(yi?'R_Shoulder':'L_Shoulder');
  if(!yi){
   // Lower both arm roots under the jaw before animating the cheering paw.
   const arms=root.getObjectByName('ArmRig');
   arms.position.y-=.072;
   const resting=root.getObjectByName('R_Shoulder');
   resting.position.x+=.055;resting.position.z+=.062;
   resting.rotation.set(-.16,0,.34);
  }
  return {root,restShoulder:arm.position.clone(),palm:root.getObjectByName(yi?'R_Arm':'L_Arm'),head:root.getObjectByName('Head'),arm};
 });
 const truck=new T.Group(),wheels=[];scene.add(truck);truck.scale.setScalar(.28);truck.rotation.y=Math.PI/2;
 for(const [name,[offset,parts]] of Object.entries(truckParts)){
  const part=new T.Group();part.position.fromArray(offset);truck.add(part);if(name.startsWith('wheel'))wheels.push(part);
  for(const [color,coords,indices] of parts){
   const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(coords.map(v=>v/1000),3));geo.setIndex(indices);geo.computeVertexNormals();mesh(part,geo,clay(color));
  }
 }
 const pennant=new T.Group();scene.add(pennant);pennant.scale.setScalar(.68);
 mesh(pennant,new T.CylinderGeometry(.015,.019,.87,12),cream,0,.43,0);
 for(let x=0;x<4;x++)for(let y=0;y<3;y++)block(pennant,(x+y)%2?road:cream,.045+x*.08,.68+y*.08,0,.081,.081,.018);
 function pose(t){
  const ease=T.MathUtils.smoothstep,go=ease(t,1.8,6.6),cheer=ease(t,4.4,5.65)-ease(t,7.7,9.2);
  // Return behind the stage while out of frame.
  truck.position.set(-2.75+5.65*go,.019,.78);truck.visible=t<7;
  wheels.forEach(w=>w.rotation.x=go*65);
  actors.forEach(({head,arm,restShoulder},i)=>{
   head.rotation.set(.14-.10*cheer,-.35+.69*(go-ease(t,7.6,9.4)),0);
   if(i){
    arm.position.copy(restShoulder);
    arm.position.x+=.065;arm.position.y-=.052;arm.position.z+=.085;
    arm.rotation.set(-.16-.17*cheer,0,.35+.20*cheer);
   }else{
    arm.position.copy(restShoulder);
    arm.position.x-=.044;arm.position.z+=.065;
    arm.rotation.set(-.18-.18*cheer,0,-(.32+.20*cheer));
   }
  });
  const {root,palm}=actors[1];root.updateWorldMatrix(true,true);
  palm.getVertexPosition(palm.geometry.attributes.position.count-1,pennant.position);
  palm.localToWorld(pennant.position);
  pennant.rotation.set(.24,0,-.82+.14*cheer*Math.sin(7*t));
 }
 return {scene, pose};
}
