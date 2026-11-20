import * as T from 'three';
import {cameraStudy} from './camera-rig.js';
import {addSculptLights} from './sculpt-studio.js';

const {root,clip,squat}=cameraStudy(),scene=new T.Scene(),camera=new T.OrthographicCamera(-1,1,1,-1,.1,12);
scene.background=new T.Color('#eeeae2');scene.add(root);addSculptLights(scene);
const mixer=new T.AnimationMixer(root);
let active=squat,action=mixer.clipAction(active);
action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;
const stage=document.querySelector('#stage'),pose=document.querySelector('#pose'),yaw=document.querySelector('#yaw');
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.toneMapping=T.ACESFilmicToneMapping;
stage.append(renderer.domElement);
function render(){
 action.reset().play();mixer.setTime(active.duration*Number(pose.value)/100);
 const a=T.MathUtils.degToRad(+yaw.value);camera.position.set(5*Math.sin(a),1.06,5*Math.cos(a));camera.lookAt(0,.87,0);
 const w=stage.clientWidth,h=stage.clientHeight;camera.top=1.03;camera.bottom=-1.03;camera.left=-1.03*w/h;camera.right=-camera.left;camera.updateProjectionMatrix();
 renderer.setSize(w,h,false);renderer.render(scene,camera);document.querySelector('#deg').value=yaw.value+'°';
}
const helper=new T.SkeletonHelper(root);
helper.material.depthTest=false;helper.material.depthWrite=false;helper.renderOrder=2;helper.visible=false;
scene.add(helper);
const bonesButton=document.querySelector('#bones');
bonesButton.onclick=()=>{
 helper.visible=!helper.visible;bonesButton.setAttribute('aria-pressed',helper.visible);
 bonesButton.textContent=helper.visible?'隐藏骨架':'显示骨架';render();
};
document.querySelector('#motion').onchange=e=>{
 mixer.stopAllAction();active=e.target.value==='camera'?clip:squat;
 action=mixer.clipAction(active);action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;
 pose.value=active===clip?100:50;render();
};
pose.oninput=yaw.oninput=render;new ResizeObserver(render).observe(stage);render();
document.querySelector('#save').onclick=async()=>{
 const {GLTFExporter}=await import('three/addons/exporters/GLTFExporter.js');
 const asset=cameraStudy();const bytes=await new GLTFExporter().parseAsync(asset.root,{binary:true,animations:[asset.clip,asset.squat]});
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([bytes],{type:'model/gltf-binary'}));a.download='bubu-standing-rig.glb';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
};
