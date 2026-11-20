import * as THREE from 'three';
import {character,geometries,volume,bodyVolume,clay,ball,mesh} from './character-volume.js';
import {addSculptLights} from './sculpt-studio.js';

const stage=document.querySelector('#stage'), slider=document.querySelector('#yaw');
function start(){
 const renderer=new THREE.WebGLRenderer({antialias:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;
 renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;
 stage.append(renderer.domElement);
 const scene=new THREE.Scene();scene.background=new THREE.Color('#d8e8de');
 const key=addSculptLights(scene);key.castShadow=true;key.shadow.mapSize.set(1024,1024);
 Object.assign(key.shadow.camera,{left:-3,right:3,top:4,bottom:-2});key.shadow.normalBias=.012;
 const tableau=new THREE.Group();scene.add(tableau);
 const plinth=mesh(tableau,new THREE.CylinderGeometry(1,1,.18,96),clay('#e7c897'),0,-.09,0);
 plinth.scale.set(1.95,1,.91);
 mesh(tableau,new THREE.BoxGeometry(18,.12,14),clay('#c9d8c8'),0,-.24,0);
 // Distant hills and clouds form separate parallax layers behind the figures.
 const hill=clay('#93bbaa'),cloud=clay('#fff5de');
 for(const [x,y,z,w,h] of [[-2,.20,-2.3,2.4,.88],[1.6,.15,-2.8,2.8,1.13]]){
  ball(tableau,hill,x,y,z,w,h,.24);
 }
 for(const [x,y] of [[-1.6,2.54],[1.64,2.26]]){
  ball(tableau,cloud,x,y,-2.4,.49,.104,.09);
  ball(tableau,cloud,x-.09,y+.07,-2.4,.23,.14,.10);
 }
 geometries.head=volume();geometries.body=bodyVolume();
 const pair=new THREE.Group();tableau.add(pair);
 const yi=character(true),bu=character(false,{pose:'standing'});
 for(const [actor,x,turn] of [[yi,-.86,.16],[bu,.86,-.16]]){
  pair.add(actor.root);actor.root.rotation.y=turn;
  actor.root.position.set(x,-new THREE.Box3().setFromObject(actor.root,true).min.y,0);
 }
 const stand=new THREE.Group();tableau.add(stand);stand.position.z=.19;
 mesh(stand,new THREE.CylinderGeometry(.115,.151,.17,40),clay('#c1865e'),0,.085,0);
 mesh(stand,new THREE.CylinderGeometry(.022,.029,2.19,24),clay('#a88354'),0,1.24,0);
 const rotor=new THREE.Group();stand.add(rotor);rotor.position.set(0,2.33,.046);
 const colors=['#d8806e','#e5b858','#70ac9d','#94b4cc'];
 for(let i=0;i<4;i++){
  const blade=new THREE.Group();blade.rotation.z=i*Math.PI/2;rotor.add(blade);
  // Two facets share the crease of each folded paper sail.
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,.32,.29,0,.08,.33,.085,-.075,.235,-.012],3));
  g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();
  const mat=clay(colors[i]);mat.side=THREE.DoubleSide;mesh(blade,g,mat);
 }
 ball(rotor,clay('#edce8b'),0,0,.052,.055,.055,.044);
 const camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,30);
 let yaw=0,time=0,last=performance.now(),playing=!matchMedia('(prefers-reduced-motion: reduce)').matches;
 const play=document.querySelector('#play');
 function updateButton(){play.textContent=playing?'暂停风车':'启动风车';play.setAttribute('aria-pressed',playing);}
 updateButton();play.onclick=()=>{playing=!playing;updateButton();};
 function setYaw(value){yaw=THREE.MathUtils.clamp(Math.round(value),-20,20);slider.value=yaw;document.querySelector('#degrees').value=yaw+'°';}
 slider.oninput=()=>setYaw(+slider.value);
 let drag;stage.onpointerdown=e=>{drag=[e.clientX,yaw];stage.setPointerCapture(e.pointerId);};
 stage.onpointermove=e=>{if(drag)setYaw(drag[1]+(e.clientX-drag[0])*64/stage.clientWidth);};
 stage.onlostpointercapture=()=>{drag=null;};
 function pose(t){
  rotor.rotation.z=t*.95+.16*Math.sin(t*1.5);
  for(const [i,c] of [yi,bu].entries()){
   c.headRig.rotation.y=(i?-1:1)*(.06+.023*Math.sin(t*1.5));
   c.setBlink(Math.min(1,Math.abs((t+i*1.7)%4.7-.25)/.085));
  }
 }
 function resize(){const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);
  camera.left=-1.86;camera.right=1.86;camera.top=1.86*h/w;camera.bottom=-camera.top;camera.updateProjectionMatrix();}
 new ResizeObserver(resize).observe(stage);resize();
 function frame(now){if(playing)time+=Math.min((now-last)/1000,.1);last=now;pose(time);
  const a=THREE.MathUtils.degToRad(yaw);camera.position.set(6*Math.sin(a),2.15,6*Math.cos(a));camera.lookAt(0,1.15,0);
  renderer.render(scene,camera);requestAnimationFrame(frame);}
 // Positive world-space clearances certify separation irrespective of camera yaw.
 function clearance(t){pose(t);const boxes=[yi.root,bu.root,stand.children[0],stand.children[1],rotor].map(o=>new THREE.Box3().setFromObject(o,true));
  const [l,r,base,pole,fan]=boxes;return Math.min(r.min.x-l.max.x,...[base,pole].flatMap(b=>[b.min.x-l.max.x,r.min.x-b.max.x]),fan.min.y-Math.max(l.max.y,r.max.y));}
 window.__breeze={clearance};document.querySelector('#loading').remove();requestAnimationFrame(frame);
}
try{start();}catch(error){document.querySelector('#loading').textContent='请用支持 WebGL 的浏览器打开卡面';console.error(error);}
