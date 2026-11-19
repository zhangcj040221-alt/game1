import bodyProfile from './body-profile-r13.json';
import {addSculptLights} from './sculpt-studio.js';
import {renderColourStudy} from './colour-study.js';
import {renderHeadStudy} from './head-study.js';
import * as THREE from 'three';
import {headProfile,materials,geometries,shapeFromPath,volume,bodyVolume,character} from './character-volume.js';
const angles=[{angle:0,name:'正面',en:'FRONT / 0°',usage:true},{angle:-20,name:'左观察 20°',en:'CARD VIEW / −20°',usage:true},{angle:20,name:'右观察 20°',en:'CARD VIEW / +20°',usage:true},{angle:45,name:'三分之四视角',en:'VOLUME CHECK / 45°'},{angle:90,name:'右侧面',en:'RIGHT / 90°'},{angle:180,name:'背面',en:'BACK / 180°'}];
let spec=null;
async function baseline(name){const d=await (await fetch(`${import.meta.env.BASE_URL}characters/b-approved/${name}.json`)).json(),host=document.querySelector('#baseline-'+name);for(const l of d.layers){const img=new Image();img.src=`${import.meta.env.BASE_URL}characters/b-approved/${l.file}`;img.alt='';img.style.cssText=`left:${l.bbox[0]/960*100}%;top:${l.bbox[1]/1080*100}%;width:${(l.bbox[2]-l.bbox[0])/960*100}%;height:${(l.bbox[3]-l.bbox[1])/1080*100}%`;host.append(img);}}
function metrics(host,fullHeight,name){geometries.head.computeBoundingBox();geometries.body.computeBoundingBox();const head=geometries.head.boundingBox.getSize(new THREE.Vector3()),body=geometries.body.boundingBox.getSize(new THREE.Vector3()),norm=n=>+(n/head.x*100).toFixed(1);const values=[['总高度',norm(fullHeight)],['头部宽度',100],['头部高度',norm(head.y)],['头部厚度',norm(head.z)],['躯干宽度',norm(body.x)],['躯干高度',norm(body.y)],['躯干厚度',norm(body.z)],['耳朵厚度',norm(2*(name==='yier'?headProfile.ear.solidRadius:headProfile.ear.radius)[2])]];host.innerHTML=values.map(([label,v])=>`<div><b>${v}</b><span>${label} / 以头宽 100 归一化</span></div>`).join('');return Object.fromEntries(values);}
function studio(renderer,c){const scene=new THREE.Scene();scene.background=new THREE.Color('#f0ece6');const key=addSculptLights(scene);key.castShadow=true;key.shadow.mapSize.set(512,512);Object.assign(key.shadow.camera,{left:-1.5,right:1.5,top:2.5,bottom:-.3,near:.1,far:15});key.shadow.normalBias=.013;key.shadow.bias=-.00015;key.shadow.radius=4;
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(8,8),new THREE.ShadowMaterial({color:'#82694f',opacity:.14}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
 scene.add(c.root);scene.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(c.root);c.root.position.y=-b.min.y;const height=b.max.y-b.min.y;
 const camera=new THREE.OrthographicCamera(-.823,.823,1.075,-1.075,.1,20);camera.position.set(0,.89,6);camera.lookAt(0,.89,0);return {scene,camera,height};}
function enableStandingDownload(root,name){
 const button=document.getElementById('export-'+name);
 button.disabled=false;
 button.addEventListener('click',async()=>{
  button.disabled=true;
  try{
   const {GLTFExporter}=await import('three/addons/exporters/GLTFExporter.js');
   const bytes=await new GLTFExporter().parseAsync(root,{binary:true});
   const url=URL.createObjectURL(new Blob([bytes],{type:'model/gltf-binary'}));
   const link=document.createElement('a');link.href=url;link.download=name+'-standing-R22.glb';link.click();
   setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(error){
   console.error(error);button.textContent='重试下载站姿 GLB';
  }finally{button.disabled=false;}
 });
}
async function init(){await document.fonts.load('14px "Card CJK"');await Promise.all([baseline('yier'),baseline('bubu')]);const response=await fetch(`${import.meta.env.BASE_URL}characters/volume-r05.json`);if(!response.ok)throw Error('角色轮廓加载失败');const d=await response.json();geometries.head=volume();geometries.body=bodyVolume(shapeFromPath(d['躯干'],81.5,184),.30);
 const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(360,470,false);renderer.setPixelRatio(1.5);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
 const dimensions={},standingDimensions={};
 for(const name of ['yier','bubu']){
  for(const pose of ['seated','standing']){
   const standing=pose==='standing',c=character(name==='yier',{pose}),s=studio(renderer,c);
   const host=document.getElementById((standing?'standing-views-':'views-')+name);
   for(const a of angles){
    const figure=document.createElement('figure');figure.className='view'+(a.usage?' usage':'');
    figure.innerHTML=`<div class="view-image"></div><figcaption>${a.name}<small>${a.en}</small></figcaption>`;
    c.root.rotation.y=-a.angle*Math.PI/180;
    renderer.render(s.scene,s.camera);
    const img=new Image();img.alt=(name==='yier'?'一二':'布布')+' · '+(standing?'站姿':'坐姿')+' · '+a.name;
    img.src=renderer.domElement.toDataURL('image/png');await img.decode();
    figure.querySelector('.view-image').append(img);host.append(figure);
    if(!standing&&name==='bubu'&&a.angle===90)document.querySelector('#new-side').append(img.cloneNode());
   }
   c.root.rotation.y=0;
   if(standing){
    c.root.name=name+'-standing';
    standingDimensions[name]={height:s.height};
    enableStandingDownload(c.root,name);
   }else dimensions[name]=metrics(document.querySelector('#metrics-'+name),s.height,name);
  }
 }
 const grey=character(false),greyStudio=studio(renderer,grey),greyMaterial=new THREE.MeshStandardMaterial({color:'#b5aea5',roughness:.65});grey.root.traverse(o=>{if(o.isMesh){if(o.userData.surfacePatch)o.visible=false;else o.material=greyMaterial;}});for(const angle of [0,45,90]){grey.root.rotation.y=-angle*Math.PI/180;renderer.render(greyStudio.scene,greyStudio.camera);const figure=document.createElement('figure'),img=new Image();img.alt=`R21 灰模 ${angle}度`;img.src=renderer.domElement.toDataURL('image/png');await img.decode();figure.append(img);const label=document.createElement('figcaption');label.textContent=angle+'° / 灰模';figure.append(label);document.querySelector('#clay-views').append(figure);}
 const headStudy=await renderHeadStudy(renderer,d);const colourStudy=await renderColourStudy(renderer);renderer.dispose();spec={version:'volume-reference-R22',headStudy,colourStudy,status:'R22 自然站姿待审核，坐姿沿用 R21',cardYawDegrees:{min:-20,max:20},projection:'orthographic',poses:['seated','standing'],standingDimensions,geometrySource:'头部由照片多角度观察与独立曲面控制点构建；R05 不再作为三维截面；R21 前腹曲线与圆掌，沿用 R19 臀腿',volumeReference:'IMG_5511(1).jpeg 与 IMG_5507(2)、5508(2)、5509(2)、5510(2)：站姿观察胸腹肩手，俯视和侧躺交叉检查头部；照片不作为正交尺寸标尺',materialSource:'已确认 B 版软陶正面；当前三维灯光下的颜色是试稿',angles:angles.map(a=>({degrees:a.angle,label:a.name,cardView:!!a.usage})),dimensions,parameters:{unit:.0085,headSurfaceVersion:'independent-sections-R20',bodyProfile,bodySurface:'胸腹与双腿的连续融合体积',earHalfDepth:{yier:headProfile.ear.solidRadius[2],bubu:headProfile.ear.radius[2]},headSurface:'独立额头、侧颊、后脑和下颌截面，多角度估计机位核对',headOrigin:[81.5,89.5],bodyOrigin:[81.5,184]},pending:['头部厚度与前后弧度','臀腿连续过渡与尾巴大小','耳根、肩根连接','单腿厚度、外展与脚端贴合','正面试稿对已确认基准的贴合程度'],retained:['共用体型和眼睛嘴巴','一二深色脚端，随腿轴向外转','布布深色内耳、同色脚部','清晰圆形脸红边界']};window.__reference={getState:()=>({ready:true,viewCount:document.querySelectorAll('.view-image img').length,...spec})};}
document.querySelector('#download-spec').addEventListener('click',()=>{if(!spec)return;const blob=new Blob([JSON.stringify(spec,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='yier-bubu-volume-reference-R22.json';a.click();URL.revokeObjectURL(url);});
init().catch(e=>{console.warn(e);document.querySelectorAll('.view-image').forEach(el=>el.innerHTML='<span class="status">此浏览器暂时无法生成三维参考图。<br>请用支持 WebGL 的浏览器查看。</span>');window.__reference={getState:()=>({ready:false,error:String(e.message)})};});
