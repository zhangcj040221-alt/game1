import * as THREE from 'three';
import { CanvasFallback } from './canvas-fallback.js';

const stage = document.querySelector('#stage');
const opts = Object.fromEntries(['motion','depth','particles','foil'].map(k => [k, document.getElementById(k).checked]));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let paused = reduced, time = 0, last = performance.now(), ready = false;
let renderer, scene, camera, card, foil, shooting, dust, cast;
const characters = [], depthLayers = [], target = new THREE.Vector2(), angle = new THREE.Vector2();
const random = (() => { let s=17011; return () => ((s=Math.imul(s,1664525)+1013904223|0)>>>0)/4294967296; })();
const message = (s) => { const el=document.querySelector('#message');el.textContent=s;el.classList.add('show');clearTimeout(message.timer);message.timer=setTimeout(()=>el.classList.remove('show'),2200); };
function rounded(w,h,r) { const s=new THREE.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s; }
function canvasTexture(w,h,draw) { const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return tex; }
function layer(w,h,tex,x,y,z) {const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}));m.position.set(x,y,z);card.add(m);depthLayers.push({obj:m,z});return m;}
function star(ctx,x,y,r,color='#f2dfab') {ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x,y-r);ctx.quadraticCurveTo(x+r*.18,y-r*.18,x+r,y);ctx.quadraticCurveTo(x+r*.18,y+r*.18,x,y+r);ctx.quadraticCurveTo(x-r*.18,y+r*.18,x-r,y);ctx.quadraticCurveTo(x-r*.18,y-r*.18,x,y-r);ctx.fill();}
function skyTexture() {return canvasTexture(1024,1536,(c,w,h)=>{
 const grad=c.createLinearGradient(0,0,w*.8,h);grad.addColorStop(0,'#101c42');grad.addColorStop(.46,'#263b64');grad.addColorStop(1,'#596774');c.fillStyle=grad;c.fillRect(0,0,w,h);
 const haze=c.createRadialGradient(650,450,0,650,450,620);haze.addColorStop(0,'#91c6d820');haze.addColorStop(1,'#688bce00');c.fillStyle=haze;c.fillRect(0,0,w,h);
 for(let i=0;i<9000;i++){c.fillStyle=`rgba(205,225,255,${random()*.045})`;c.fillRect(random()*w,random()*h,random()*1.5+.5,1);}
 for(let i=0;i<95;i++){const x=80+random()*864,y=200+random()*700,r=.8+random()*2;c.fillStyle=`rgba(242,230,194,${.25+random()*.65})`;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
 const constellation=[[150,460],[265,370],[380,435],[474,305],[575,370]];c.strokeStyle='#d1dce533';c.lineWidth=1.1;c.beginPath();constellation.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();constellation.forEach(([x,y])=>star(c,x,y,5));
 c.strokeStyle='#b6c8e414';c.lineWidth=1;c.beginPath();c.ellipse(520,650,390,490,-.2,0,Math.PI*2);c.stroke();
 c.strokeStyle='#dbc39388';c.lineWidth=2;c.strokeRect(35,35,w-70,h-70);c.strokeStyle='#dbc39330';c.strokeRect(47,47,w-94,h-94);
 c.textAlign='center';c.fillStyle='#d9cca9';c.font='16px serif';c.fillText('YI-ER  &  BU-BU',512,105);star(c,512,146,7);
 c.fillStyle='#f0e4c8';c.font='48px "Songti SC", "Noto Serif CJK SC", "Card CJK", serif';c.fillText('一起看星星',512,1358);c.fillStyle='#bdc6d4';c.font='15px serif';c.fillText('EVERY STAR IS BETTER WITH YOU',512,1403);
 c.font='13px serif';c.fillStyle='#b6a882';c.fillText('STARRY MOMENTS    /    NO. 001',512,1470);
});}
function groundTexture(front=false) {return canvasTexture(1024,520,(c,w,h)=>{
 const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,front?'#324c56':'#455d6c');g.addColorStop(1,front?'#182f3d':'#2b445a');c.fillStyle=g;c.beginPath();c.moveTo(0,front?190:160);c.bezierCurveTo(220,front?70:90,620,front?150:10,1024,front?90:180);c.lineTo(w,h);c.lineTo(0,h);c.fill();
 if(front){for(let i=0;i<85;i++){let x=random()*w,y=210+random()*230;c.strokeStyle='#9ba88225';c.lineWidth=1;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x-4,y-10,x-9,y-17);c.stroke();}for(let i=0;i<12;i++){let x=80+random()*850,y=250+random()*70;star(c,x,y,2,'#e6dba572');}}
});}
const textureLoader = new THREE.TextureLoader();
async function character(name,x,phase) {
 const base = `${import.meta.env.BASE_URL}characters/b-approved/`;
 const response = await fetch(base+name+'.json');if(!response.ok)throw new Error('角色素材加载失败');
 const asset=await response.json(),unit=.00192,originX=asset.anchor[0],originY=asset.anchor[1],pivotY=asset.headPivot[1];
 const root=new THREE.Group();root.position.set(x,-1.39,.42);card.add(root);depthLayers.push({obj:root,z:.42});
 const head=new THREE.Group();head.position.y=(originY-pivotY)*unit;root.add(head);
 const eyeY=(asset.eyeCentres[0][1]+asset.eyeCentres[1][1])/2;
 const eyeGroup=new THREE.Group();eyeGroup.position.y=(pivotY-eyeY)*unit;head.add(eyeGroup);
 for(const part of asset.layers){
  const tex=await textureLoader.loadAsync(base+part.file);tex.colorSpace=THREE.SRGBColorSpace;
  const [left,top,right,bottom]=part.bbox,w=right-left,h=bottom-top;
  const isEye=part.name.includes('眼'),isHead=part.name.includes('头部')||part.name.includes('耳')||part.name.includes('脸红')||part.name.includes('嘴巴')||part.name.includes('颈带')||part.name.includes('领结');
  const parent=isEye?eyeGroup:isHead?head:root,oy=isEye?eyeY:isHead?pivotY:originY;
  const z=part.order*.004;
  const material=new THREE.MeshBasicMaterial({map:tex,transparent:true,alphaTest:.025,depthWrite:true});
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w*unit,h*unit),material);mesh.name=part.name;
  mesh.position.set(((left+right)/2-originX)*unit,(oy-(top+bottom)/2)*unit,z);parent.add(mesh);
 }
 root.rotation.z=name==='yier'?-.018:.018;
 const eyeProbePoints=asset.eyeCentres.map(([x,y])=>new THREE.Vector3((x-originX)*unit,(eyeY-y)*unit,asset.layers.find(p=>p.name.includes(x<originX?'左眼':'右眼')).order*.004));
 const mouthProbePoint=new THREE.Vector3((asset.mouthCentre[0]-originX)*unit,(pivotY-asset.mouthCentre[1])*unit,asset.layers.find(p=>p.name.includes('嘴巴')).order*.004);
 characters.push({root,head,eyeGroup,eyeProbePoints,mouthProbePoint,phase,baseY:root.position.y,baseRot:root.rotation.z,layers:asset.layers.length});
 return root;
}
function eyeSamples(){
 if(renderer.isFallback)return [];
 renderer.render(scene,camera);const gl=renderer.getContext();const size=renderer.getDrawingBufferSize(new THREE.Vector2());
 return characters.flatMap(c=>c.eyeProbePoints.map(v=>{const point=c.eyeGroup.localToWorld(v.clone()).project(camera);const pixel=new Uint8Array(4);gl.readPixels(Math.round((point.x*.5+.5)*size.x),Math.round((point.y*.5+.5)*size.y),1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);return [...pixel];}));
}
function mouthSamples(){
 if(renderer.isFallback)return [];
 renderer.render(scene,camera);const gl=renderer.getContext(),size=renderer.getDrawingBufferSize(new THREE.Vector2());
 return characters.map(c=>{const p=c.head.localToWorld(c.mouthProbePoint.clone()).project(camera),x=Math.round((p.x*.5+.5)*size.x),y=Math.round((p.y*.5+.5)*size.y),data=new Uint8Array(36);gl.readPixels(x-1,y-1,3,3,gl.RGBA,gl.UNSIGNED_BYTE,data);return Array.from({length:9},(_,i)=>[...data.slice(i*4,i*4+4)]).sort((a,b)=>a[0]-b[0])[0];});
}
function makeDust(){const geo=new THREE.BufferGeometry(),pos=[],seeds=[];for(let i=0;i<48;i++){pos.push((random()-.5)*2.8,-1.05+random()*2.7,.25+random()*.45);seeds.push(random()*10);}geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
 const tex=canvasTexture(64,64,c=>{const g=c.createRadialGradient(32,32,0,32,32,30);g.addColorStop(0,'#fff3cd');g.addColorStop(.15,'#e5d5a4aa');g.addColorStop(1,'#e5d5a400');c.fillStyle=g;c.fillRect(0,0,64,64);});
 const pts=new THREE.Points(geo,new THREE.PointsMaterial({map:tex,size:.065,transparent:true,opacity:.65,depthWrite:false,blending:THREE.AdditiveBlending}));card.add(pts);return {pts,base:pos.slice(),seeds};}
function makeFoil(){const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{angle:{value:angle},strength:{value:1}},vertexShader:'varying vec2 p; void main(){p=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec2 p;uniform vec2 angle;uniform float strength;void main(){vec2 uv=p/vec2(3.32,5.)+.5;float edge=smoothstep(.455,.49,max(abs(uv.x-.5),abs(uv.y-.5)));float sweep=pow(max(0.,1.-abs(uv.x*.75+uv.y*.38-.55-angle.y*2.-angle.x)),9.);vec3 color=.55+.45*cos(vec3(0.,2.,4.)+uv.x*6.+uv.y*4.+angle.y*12.);gl_FragColor=vec4(color,sweep*(.06+edge*.55)*strength);}`});const m=new THREE.Mesh(new THREE.ShapeGeometry(rounded(3.32,5,.16)),mat);m.position.z=.025;card.add(m);return mat;}
function wish(){if(!ready)return;if(paused){message('先继续播放，再许一个愿望');return;}shooting.age=0;shooting.line.visible=true;message('愿你想见的人，也在看这片星空。');}
function resize(){const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.fov=37;camera.position.z=Math.max(8.6,3.85/camera.aspect);camera.updateProjectionMatrix();}
function frame(now){requestAnimationFrame(frame);if(!ready)return;const dt=Math.min((now-last)/1000,.04);last=now;if(!paused)time+=dt;
 angle.lerp(target,1-Math.exp(-dt*7));card.rotation.x=angle.x;card.rotation.y=angle.y;
 for(const l of depthLayers)l.obj.position.z=opts.depth?l.z:.05+l.z*.08;
 characters.forEach(c=>{const a=opts.motion?1:0;c.root.position.y=c.baseY+Math.sin(time*1.45+c.phase)*.009*a;c.root.rotation.z=c.baseRot+Math.sin(time*.65+c.phase)*.006*a;c.head.rotation.z=Math.sin(time*.72+c.phase)*.007*a;c.head.rotation.x=0;const beat=(time+c.phase)%5.4;const blink=beat<.19?Math.max(.08,Math.abs(beat-.095)/.095):1;c.eyeGroup.scale.y=opts.motion?blink:1;});
 dust.pts.visible=opts.particles;const data=dust.pts.geometry.attributes.position.array;for(let i=0;i<48;i++){data[i*3]=dust.base[i*3]+Math.sin(time*.3+dust.seeds[i])*.035;data[i*3+1]=dust.base[i*3+1]+Math.sin(time*.45+dust.seeds[i])*.07;data[i*3+2]=opts.depth?dust.base[i*3+2]:.09;}dust.pts.geometry.attributes.position.needsUpdate=true;dust.pts.material.opacity=.46+Math.sin(time*.8)*.12;
 if(!paused&&opts.particles&&shooting.age>2&&time-shooting.last>13){shooting.age=0;shooting.last=time;}
 if(!paused)shooting.age+=dt;shooting.line.visible=opts.particles&&shooting.age<1.3;
 if(shooting.line.visible){const t=shooting.age,head=new THREE.Vector3(1.12-t*1.5,1.7-t*.65,.3);const arr=shooting.line.geometry.attributes.position;arr.setXYZ(0,head.x,head.y,head.z);arr.setXYZ(1,head.x+.38,head.y+.17,head.z);arr.needsUpdate=true;shooting.line.material.opacity=Math.sin(Math.min(1,t/1.3)*Math.PI)*.85;}
 foil.uniforms.strength.value=opts.foil?1:0;renderer.render(scene,camera);
}
async function init(){
 await document.fonts.load('16px "Card CJK"');
 try { renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'}); } catch { renderer=new CanvasFallback(); const tag=document.createElement('small');tag.className='fallback-note';tag.textContent='兼容预览 · WebGL 不可用';stage.append(tag); }renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;stage.append(renderer.domElement);scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(37,1,.1,100);camera.position.set(0,0,8.6);
 card=new THREE.Group();scene.add(card);scene.add(new THREE.AmbientLight('#d1ddff',2));const light=new THREE.DirectionalLight('#ffe6b6',4);light.position.set(-3,4,6);scene.add(light);
 const edge=new THREE.Mesh(new THREE.ExtrudeGeometry(rounded(3.38,5.06,.17),{depth:.06,bevelEnabled:true,bevelThickness:.025,bevelSize:.025,bevelSegments:3,steps:1}),new THREE.MeshStandardMaterial({color:'#8b805f',metalness:.75,roughness:.36}));edge.position.z=-.12;card.add(edge);
 const art=new THREE.Mesh(new THREE.ShapeGeometry(rounded(3.32,5,.16)),new THREE.MeshBasicMaterial({map:skyTexture()}));
 // ShapeGeometry coordinates are world-sized; normalize UVs for the printed card.
 const uv=art.geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,(uv.getX(i)+1.66)/3.32,(uv.getY(i)+2.5)/5);card.add(art);cast=art;
 const moonTex=canvasTexture(320,320,c=>{const g=c.createRadialGradient(160,160,20,160,160,150);g.addColorStop(0,'#ead9a535');g.addColorStop(1,'#ead9a500');c.fillStyle=g;c.fillRect(0,0,320,320);c.fillStyle='#f3dfae';c.beginPath();c.arc(160,160,47,0,Math.PI*2);c.fill();c.globalCompositeOperation='destination-out';c.beginPath();c.arc(180,144,43,0,Math.PI*2);c.fill();});layer(1.5,1.5,moonTex,.75,1.24,.12);
 layer(3.06,1.42,groundTexture(false),0,-1.04,.18);
 const contact=canvasTexture(256,64,c=>{const g=c.createRadialGradient(128,32,2,128,32,108);g.addColorStop(0,'#06162666');g.addColorStop(1,'#06162600');c.fillStyle=g;c.fillRect(0,0,256,64);});
 layer(.82,.14,contact,-.61,-1.39,.26);layer(.82,.14,contact,.61,-1.39,.26);
 await Promise.all([character('yier',-.61,0),character('bubu',.61,2.6)]);
 layer(2.72,.23,groundTexture(true),0,-1.58,.32);
 const caption=canvasTexture(1024,250,(c,w,h)=>{const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#1c304a');g.addColorStop(1,'#19263e');c.fillStyle=g;c.fillRect(0,0,w,h);c.fillStyle='#b5a476';c.fillRect(0,0,w,2);c.textAlign='center';c.fillStyle='#f0e4c8';c.font='45px "Songti SC", "Noto Serif CJK SC", "Card CJK", serif';c.fillText('一起看星星',512,92);c.fillStyle='#aebaca';c.font='14px serif';c.fillText('EVERY STAR IS BETTER WITH YOU',512,137);c.fillStyle='#ad9d7d';c.font='12px serif';c.fillText('STARRY MOMENTS    /    NO. 001',512,204);});layer(2.72,.66,caption,0,-1.94,.34);
 dust=makeDust();foil=makeFoil();const geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]);const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:'#fff1bf',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));card.add(line);shooting={line,age:4,last:0};
 resize();new ResizeObserver(resize).observe(stage);document.querySelector('#loading').remove();ready=true;window.__card={getState:()=>({ready,paused,time,options:{...opts},angle:angle.toArray(),characters:characters.length,art:'B-approved-layered-01',layers:characters.map(c=>c.layers),renderer:renderer.isFallback?'canvas-fallback':'webgl'}),...(new URLSearchParams(location.search).has('qa')?{eyeSamples,mouthSamples}:{}),wish};
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();message('画面暂时中断，请刷新页面恢复星空');});
 let down=null,moved=false;const ray=new THREE.Raycaster();
 stage.addEventListener('pointerdown',e=>{const r=stage.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);if(!ray.intersectObject(cast).length)return;down={x:e.clientX,y:e.clientY,id:e.pointerId};moved=false;stage.setPointerCapture(e.pointerId);});
 stage.addEventListener('pointermove',e=>{if(!down||down.id!==e.pointerId)return;const dx=e.clientX-down.x,dy=e.clientY-down.y;moved ||= Math.hypot(dx,dy)>7;target.set(THREE.MathUtils.clamp(dy*.003,-.18,.18),THREE.MathUtils.clamp(dx*.0035,-.25,.25));});
 function release(e){if(!down||down.id!==e.pointerId)return;if(e.type==='pointerup'&&!moved)wish();down=null;target.set(0,0);}
 stage.addEventListener('pointerup',release);stage.addEventListener('pointercancel',release);stage.addEventListener('lostpointercapture',release);
 stage.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();wish();}if(e.key.startsWith('Arrow')){e.preventDefault();target.set(e.key==='ArrowUp'?-.15:e.key==='ArrowDown'?.15:0,e.key==='ArrowLeft'?-.2:e.key==='ArrowRight'?.2:0);setTimeout(()=>target.set(0,0),450);}});
 document.addEventListener('visibilitychange',()=>{last=performance.now();});
}
for(const key of Object.keys(opts))document.getElementById(key).addEventListener('change',e=>{opts[key]=e.target.checked;});
document.querySelector('#wish').addEventListener('click',wish);
function syncPause(){const b=document.querySelector('#pause');b.textContent=paused?'继续看星星':'暂停这一刻';b.setAttribute('aria-pressed',String(paused));}syncPause();
document.querySelector('#pause').addEventListener('click',()=>{paused=!paused;syncPause();});
requestAnimationFrame(frame);
init().catch(err=>{console.error(err);document.querySelector('#loading').textContent='星空未能点亮，请刷新重试或换用 Safari / Chrome。';document.querySelector('#loading').style.padding='0 30px';});
