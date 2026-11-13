import * as THREE from 'three';
import {character,materials} from './character-volume.js';
import * as previous from './character-volume-r06.js';
import {addSculptLights} from './sculpt-studio.js';
export async function renderColourStudy(renderer){
 const c=character(false),head=c.headRig.children[0];head.removeFromParent();
 const original=new Map();head.traverse(o=>{if(o.isMesh)original.set(o,o.material);});
 const camera=new THREE.OrthographicCamera(-.84,.84,.70,-.70,.1,20),yaw=THREE.MathUtils.degToRad(36.8),pitch=THREE.MathUtils.degToRad(1.4);
 camera.position.set(6*Math.sin(yaw)*Math.cos(pitch),6*Math.sin(pitch),6*Math.cos(yaw)*Math.cos(pitch));camera.lookAt(0,0,0);camera.updateMatrixWorld();
 const ray=new THREE.Raycaster(new THREE.Vector3(0,.18,2),new THREE.Vector3(0,0,-1));head.updateMatrixWorld(true);
 const samplePoint=ray.intersectObject(head,false)[0].point.clone().project(camera);
 const cases=[{id:'legacy',label:'① R06 底色＋原灯光',old:true,legacy:true},{id:'light-only',label:'② 只改成中性灯光',old:true},{id:'revised',label:'③ R07 底色＋中性灯光'},{id:'albedo',label:'④ R07 纯底色（无光照）',flat:true}];
 const host=document.querySelector('#colour-study-views'),report=[];
 const mapping=new Map([[materials.bubu,previous.materials.bubu],[materials.yellow,previous.materials.yellow],[materials.earDark,previous.materials.dark]]);
 const saved={exposure:renderer.toneMappingExposure,mapping:renderer.toneMapping};
 for(const entry of cases){
  const temporary=[];
  for(const [object,mat] of original){
   object.material=entry.old?(mapping.get(mat)||mat):mat;
   if(entry.flat){object.material=new THREE.MeshBasicMaterial({color:mat.color});temporary.push(object.material);}
  }
  const scene=new THREE.Scene();scene.background=new THREE.Color('#f0ece6');scene.add(head);if(!entry.flat)addSculptLights(scene,entry.legacy);
  renderer.toneMapping=entry.flat?THREE.NoToneMapping:THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=entry.legacy?1.08:1;
  renderer.setPixelRatio(1);renderer.setSize(360,300,false);renderer.render(scene,camera);
  const img=new Image();img.src=renderer.domElement.toDataURL('image/png');img.alt=entry.label;img.dataset.colour=entry.id;await img.decode();
  const canvas=document.createElement('canvas');canvas.width=360;canvas.height=300;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
  const x=Math.round((samplePoint.x*.5+.5)*360),y=Math.round((-.5*samplePoint.y+.5)*300),data=ctx.getImageData(x-4,y-4,9,9).data;
  const rgb=[0,1,2].map(channel=>Array.from({length:81},(_,i)=>data[i*4+channel]).sort((a,b)=>a-b)[40]);
  const figure=document.createElement('figure'),caption=document.createElement('figcaption');caption.textContent=entry.label;
  const detail=document.createElement('small');detail.textContent=`底色 ${entry.old?'#D99A68':'#CE7C4E'} · 额头采样 RGB ${rgb.join(' / ')}`;caption.append(detail);figure.append(img,caption);host.append(figure);
  report.push({id:entry.id,albedo:entry.old?'#d99a68':'#ce7c4e',foreheadMedianRGB:rgb,flat:!!entry.flat,legacyLights:!!entry.legacy});
  for(const mat of temporary)mat.dispose();
 }
 for(const [object,mat] of original)object.material=mat;
 renderer.toneMapping=saved.mapping;renderer.toneMappingExposure=saved.exposure;
 return report;
}
