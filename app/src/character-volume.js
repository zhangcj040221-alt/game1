import headProfile from './head-profile-r07.json';
import * as THREE from 'three';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
const geometries={},unit=.0085;
const clay=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.43,metalness:0,...extra});
const materials={yier:clay('#f5eee3'),bubu:new THREE.MeshPhysicalMaterial({color:'#ce7c4e',roughness:.58,metalness:0,specularIntensity:.38}),dark:clay('#42251e',{roughness:.38}),pink:new THREE.MeshPhysicalMaterial({color:'#e99581',roughness:.83,metalness:0,specularIntensity:.12}),yellow:new THREE.MeshPhysicalMaterial({color:'#e9a32e',roughness:.83,metalness:0,specularIntensity:.12}),gold:clay('#cba86b',{metalness:.72,roughness:.29}),floor:clay('#292e4c',{roughness:.64}),back:clay('#20213e',{roughness:.65})};
// Painted facial ink stays dark under grazing light; ears and feet keep their clay finish.
materials.ink=new THREE.MeshPhysicalMaterial({color:'#301e1c',roughness:.82,metalness:0,specularIntensity:.12});
materials.earDark=new THREE.MeshPhysicalMaterial({color:'#2c2727',roughness:.60,metalness:0,specularIntensity:.30});
const sphere=new THREE.SphereGeometry(1,32,24);
function ball(parent,mat,x,y,z,sx,sy,sz){const m=new THREE.Mesh(sphere,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function mesh(parent,geo,mat,x=0,y=0,z=0){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function shapeFromPath(d,cx,cy){const doc=new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`);const shape=SVGLoader.createShapes(doc.paths[0])[0];return shape.getSpacedPoints(144).slice(0,-1).map(p=>new THREE.Vector2((p.x-cx)*unit,(cy-p.y)*unit));}
// Independent sculpting sections, inferred across supplied photo views. R05 is not an orthographic cage.
function sectionAt(y){const rows=headProfile.sections;let k=0;while(k<rows.length-2&&y>rows[k+1][0])k++;const a=rows[k],b=rows[k+1],h=b[0]-a[0],t=Math.max(0,Math.min(1,(y-a[0])/h)),result=[y];for(let c=1;c<5;c++){const slope=i=>(rows[i+1][c]-rows[i][c])/(rows[i+1][0]-rows[i][0]);const tangent=i=>{if(i===0)return slope(0);if(i===rows.length-1)return slope(i-1);const d0=slope(i-1),d1=slope(i);if(d0*d1<=0)return 0;return 2*d0*d1/(d0+d1);};result.push((2*t**3-3*t*t+1)*a[c]+(t**3-2*t*t+t)*h*tangent(k)+(-2*t**3+3*t*t)*b[c]+(t**3-t*t)*h*tangent(k+1));}const bottom=rows[0],lower=rows[1],upper=rows.at(-2),top=rows.at(-1);if(y>upper[0]||y<lower[0]){const isTop=y>upper[0],a=isTop?upper:lower,b=isTop?top:bottom,f=Math.max(0,Math.min(1,(y-b[0])/(a[0]-b[0]))),r=Math.sqrt(f),centre=(a[2]+a[3])/2*f+(b[2]+b[3])/2*(1-f),rz=(a[2]-a[3])/2*r;result[1]=a[1]*r;result[2]=centre+rz;result[3]=centre-rz;}return result;}
function volume(){
 const rows=96,segments=96,minY=headProfile.sections[0][0],maxY=headProfile.sections.at(-1)[0];
 const positions=[0,minY,headProfile.sections[0][2]],indices=[];
 // One vertex per pole, shared seam indices: closed mesh without zero-area caps.
 for(let j=1;j<rows;j++){
   const y=minY+(maxY-minY)*(1-Math.cos(Math.PI*j/rows))/2;
   const [,rx,front,back,power]=sectionAt(y);
   const t=Math.min(1,rx/.225),blend=t*t*(3-2*t);
   const side=(front+back)/2+(headProfile.sidePlaneZ-(front+back)/2)*blend;
   for(let i=0;i<segments;i++){
     const a=i/segments*Math.PI*2,co=Math.cos(a),si=Math.sin(a),q=si>=0?power:1;
     positions.push(Math.sign(co)*Math.abs(co)**q*rx,y,side+(si>=0?front-side:back-side)*Math.abs(si)**q);
   }
 }
 for(let i=0;i<segments;i++)indices.push(0,1+i,1+(i+1)%segments);
 for(let j=0;j<rows-2;j++)for(let i=0;i<segments;i++){
   const a=1+j*segments+i,b=1+j*segments+(i+1)%segments,c=a+segments,d=b+segments;
   if(Math.cos((i+.5)/segments*Math.PI*2)>=0)indices.push(a,c,b,b,c,d);
   else indices.push(a,c,d,a,d,b);
 }
 const top=positions.length/3,last=1+(rows-2)*segments;
 positions.push(0,maxY,headProfile.sections.at(-1)[2]);
 for(let i=0;i<segments;i++)indices.push(top,last+(i+1)%segments,last+i);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
 g.attributes.normal.setXYZ(0,0,-1,0);g.attributes.normal.setXYZ(top,0,1,0);
 return g;
}
// A soft union of a rounded torso and two leg volumes gives a continuous chest, belly and back.
// The frontal width and height are normalized to R05; the depth is independently designed.
function bodyVolume(){
 // Seated pelvis and forward thighs form one continuous clay surface.
 const n=80,extent=.8,effect=new MarchingCubes(n,materials.bubu,false,false,60000);effect.isolation=0;
 const ell=(x,y,z,rx,ry,rz)=>(Math.sqrt((x/rx)**2+(y/ry)**2+(z/rz)**2)-1)*Math.min(rx,ry,rz);
 const blend=(a,b,k)=>{const h=Math.max(0,Math.min(1,.5+.5*(b-a)/k));return b+(a-b)*h-k*h*(1-h);};
 for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const px=(x/n*2-1)*extent,py=(y/n*2-1)*extent,pz=(z/n*2-1)*extent;
  const trunk=ell(px,py-.32,pz+.04,.39,.29,.285),hip=ell(px,py-.165,pz+.07,.455,.17,.33);
  let d=blend(trunk,hip,.09);
  for(const sign of [-1,1])d=blend(d,ell(px-sign*.355,py-.13,pz-.22,.19,.135,.265),.085);
  effect.field[z*n*n+y*n+x]=-Math.max(d,.015-py);
 }
 effect.update();const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(effect.geometry.attributes.position.array.slice(0,effect.count*3),3));g.scale(extent,extent,extent);g.computeVertexNormals();effect.geometry.dispose();return g;
}
const ray=new THREE.Raycaster();
function faceZ(head,x,y){head.updateMatrixWorld(true);ray.set(new THREE.Vector3(x,y,2),new THREE.Vector3(0,0,-1));const hit=ray.intersectObject(head,false)[0];return hit?hit.point.z:.31;}
// Pigment meshes follow the head surface; their contours do not add button-like volume.
function facePatch(head,mat,cx,cy,rx,ry=rx){const positions=[cx,cy,faceZ(head,cx,cy)+.0025],uv=[.5,.5],indices=[],segments=48,rings=10;for(let j=1;j<=rings;j++)for(let i=0;i<segments;i++){const a=i/segments*Math.PI*2,u=Math.cos(a)*j/rings,v=Math.sin(a)*j/rings,x=cx+u*rx,y=cy+v*ry;positions.push(x,y,faceZ(head,x,y)+.0025);uv.push(.5+u*.5,.5+v*.5);}for(let i=0;i<segments;i++)indices.push(0,1+i,1+(i+1)%segments);for(let j=1;j<rings;j++)for(let i=0;i<segments;i++){const a=1+(j-1)*segments+i,b=1+(j-1)*segments+(i+1)%segments,c=a+segments,d=b+segments;indices.push(a,c,b,b,c,d);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();const m=mesh(head,g,mat);m.castShadow=false;m.receiveShadow=false;m.userData.surfacePatch=true;return m;}
// A physical circle on the cheek, not a circle in front-view screen coordinates.
function cheekPatch(head,mat,cx,cy,radius){
 head.updateMatrixWorld(true);ray.set(new THREE.Vector3(cx,cy,2),new THREE.Vector3(0,0,-1));
 const centreHit=ray.intersectObject(head,false)[0];
 if(!centreHit)throw new Error('Cheek centre missed head');
 const centre=centreHit.point,normal=(centreHit.normal||centreHit.face.normal).clone().normalize();
 const tangentX=new THREE.Vector3(0,1,0).cross(normal).normalize(),tangentY=normal.clone().cross(tangentX).normalize();
 const positions=[],normals=[],uv=[],indices=[],segments=64,rings=12;
 const add=(u,v)=>{
   const origin=centre.clone().addScaledVector(tangentX,u*radius).addScaledVector(tangentY,v*radius).addScaledVector(normal,.22);
   ray.set(origin,normal.clone().negate());const hit=ray.intersectObject(head,false)[0];
   if(!hit)throw new Error('Cheek disk missed head surface');
   const n=(hit.normal||hit.face.normal).clone().normalize();
   positions.push(...hit.point.clone().addScaledVector(n,.002).toArray());normals.push(...n.toArray());uv.push((u+1)/2,(v+1)/2);
 };
 add(0,0);for(let j=1;j<=rings;j++)for(let i=0;i<segments;i++){const a=i/segments*Math.PI*2;add(Math.cos(a)*j/rings,Math.sin(a)*j/rings);}
 for(let i=0;i<segments;i++)indices.push(0,1+i,1+(i+1)%segments);
 for(let j=1;j<rings;j++)for(let i=0;i<segments;i++){const a=1+(j-1)*segments+i,b=1+(j-1)*segments+(i+1)%segments,c=a+segments,d=b+segments;indices.push(a,c,b,b,c,d);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);
 const patch=mesh(head,g,mat);patch.name='cheek-pigment';patch.castShadow=false;patch.receiveShadow=false;patch.userData.surfacePatch=true;return patch;
}
function eye(head,x,y){const mat=materials.ink.clone(),blink={value:1};mat.onBeforeCompile=shader=>{shader.uniforms.paintBlink=blink;shader.vertexShader='varying vec2 vPaintUv;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPaintUv=uv;');shader.fragmentShader='varying vec2 vPaintUv; uniform float paintBlink;\n'+shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nvec2 paintP=(vPaintUv-.5)*2.; paintP.y/=max(.025,paintBlink); if(dot(paintP,paintP)>1.)discard;');};mat.customProgramCacheKey=()=> 'paint-eye-R03';const m=facePatch(head,mat,x,y,headProfile.eye.rx,headProfile.eye.ry);m.userData.blink=blink;return m;}
function mouth(head){const curve=new THREE.CurvePath(),points=[[-.058,-.177],[-.058,-.211],[-.021,-.219],[0,-.193],[.021,-.219],[.058,-.211],[.058,-.177]],p=points.map(([x,y])=>new THREE.Vector3(x,y+headProfile.mouthYOffset,0));curve.add(new THREE.CubicBezierCurve3(p[0],p[1],p[2],p[3]));curve.add(new THREE.CubicBezierCurve3(p[3],p[4],p[5],p[6]));const pos=[],ix=[],steps=80;for(let i=0;i<=steps;i++){const t=i/steps,v=curve.getPoint(t),n=curve.getTangent(t),nx=-n.y*.009,ny=n.x*.009;for(const side of [-1,1]){const x=v.x+nx*side,y=v.y+ny*side;pos.push(x,y,faceZ(head,x,y)+.003);}if(i<steps){const a=i*2;ix.push(a,a+1,a+2,a+1,a+3,a+2);}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(ix);g.computeVertexNormals();const m=mesh(head,g,materials.ink);m.material.side=THREE.DoubleSide;m.castShadow=false;m.receiveShadow=false;m.userData.surfacePatch=true;for(const v of [p[0],p[6]])facePatch(head,materials.ink,v.x,v.y,.009);}
// Rounded tapered paws: a broad root overlaps the torso, with a small soft fingertip.
function pawGeometry(){const g=new THREE.SphereGeometry(1,40,32),p=g.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i),t=(y+1)/2,width=.085+.022*t;p.setXYZ(i,p.getX(i)*width,y*.139,p.getZ(i)*(.092+.010*t));}g.computeVertexNormals();return g;}
function sliceBody(source,cut,below){const positions=[],normals=[],p=source.attributes.position,n=source.attributes.normal;
 for(let i=0;i<p.count;i+=3){let polygon=[0,1,2].map(j=>({p:new THREE.Vector3().fromBufferAttribute(p,i+j),n:new THREE.Vector3().fromBufferAttribute(n,i+j)})),out=[];for(let j=0;j<polygon.length;j++){const a=polygon[j],b=polygon[(j+1)%polygon.length],aIn=below?a.p.y<=cut:a.p.y>=cut,bIn=below?b.p.y<=cut:b.p.y>=cut;if(aIn)out.push(a);if(aIn!==bIn){const t=(cut-a.p.y)/(b.p.y-a.p.y);out.push({p:a.p.clone().lerp(b.p,t),n:a.n.clone().lerp(b.n,t).normalize()});}}for(let j=1;j<out.length-1;j++)for(const v of [out[0],out[j],out[j+1]]){positions.push(...v.p.toArray());normals.push(...v.n.toArray());}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));return g;
}
function character(yi){const root=new THREE.Group(),headRig=new THREE.Group();root.add(headRig);headRig.position.y=1.02;
 const skin=yi?materials.yier:materials.bubu,head=new THREE.Mesh(geometries.head,skin);head.castShadow=true;head.receiveShadow=true;
 // Build face in head-local space before mounting the head rig.
 const ep=headProfile.ear;
 for(const sign of [-1,1]){
   const [rx,ry,rz]=yi?ep.solidRadius:ep.radius;
   // The inner ear is a shallow sculpted cup. Its dark half-moon is paint,
   // and the crown occludes the base; there is no torus or separate black button.
   const frontZ=(x,y)=>{
     const shell=rz*Math.sqrt(Math.max(0,1-(x/rx)**2-(y/ry)**2));
     const q=(x/ep.cup.width)**2+((y-ep.cup.y)/ep.cup.height)**2;
     return shell-(yi?0:ep.cup.depth*Math.max(0,1-q)**2);
   };
   const geo=new THREE.SphereGeometry(1,48,36),pos=geo.attributes.position;
   for(let i=0;i<pos.count;i++){
     const x=pos.getX(i)*rx,y=pos.getY(i)*ry,z=pos.getZ(i);
     pos.setXYZ(i,x,y,z>=0?frontZ(x,y):z*rz);
   }
   geo.computeVertexNormals();const e=mesh(head,geo,yi?materials.earDark:skin);
   if(!yi){
     const shape=new THREE.Shape();
     // Full inner cup; the overlapping crown hides its base in each view.
     shape.absellipse(0,0,.084,.094,0,Math.PI*2,false,0);
     let g=new THREE.ShapeGeometry(shape,24).toNonIndexed();
     for(let pass=0;pass<2;pass++){
       const p=g.attributes.position,out=[];
       for(let i=0;i<p.count;i+=3){
         const a=new THREE.Vector3().fromBufferAttribute(p,i),b=new THREE.Vector3().fromBufferAttribute(p,i+1),c=new THREE.Vector3().fromBufferAttribute(p,i+2),ab=a.clone().lerp(b,.5),bc=b.clone().lerp(c,.5),ca=c.clone().lerp(a,.5);
         for(const v of [a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca])out.push(...v.toArray());
       }
       g.dispose();g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(out,3));
     }
     const p=g.attributes.position;
     for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i)+ep.cup.paintY;p.setXYZ(i,x,y,frontZ(x,y)+.0018);}
     g.computeVertexNormals();const dark=materials.earDark.clone();
     const patch=mesh(e,g,dark);patch.castShadow=false;patch.userData.surfacePatch=true;
   }
   e.name=yi?'solid-ear':'cupped-ear';e.position.set(sign*ep.x,ep.y,ep.z);
   e.rotation.z=-sign*ep.outwardTilt;e.rotation.y=sign*ep.yaw;
 }
 const eyes=[];for(const sign of [-1,1]){eyes.push(eye(head,sign*headProfile.eye.x,headProfile.eye.y));cheekPatch(head,yi?materials.pink:materials.yellow,sign*headProfile.blush.x,headProfile.blush.y,headProfile.blush.radius);}
 mouth(head);headRig.add(head);
 mesh(root,geometries.body,skin).name='seated-chest-hips-legs';
 if(yi)for(const sign of [-1,1]){
  const foot=ball(root,materials.earDark,sign*.355,.135,.418,.119,.119,.065);foot.name='dark-foot-tip';foot.rotation.y=sign*.16;
 }
 ball(root,skin,0,.135,-.388,.105,.103,.095).name='tail';
 const arms=[];for(const sign of [-1,1]){
  const pivot=new THREE.Group();pivot.position.set(sign*.32,.455,.13);root.add(pivot);
  const arm=ball(pivot,skin,-sign*.035,-.045,.115,.125,.104,.185);arm.rotation.y=-sign*.35;
  arm.name='forward-holding-paw';arms.push(pivot);
 }
 // Seated reference has no added bow tie. Head/body contact hides the shoulder tops.
 return {root,headRig,eyes,arms,setBlink(value){for(const e of eyes)e.userData.blink.value=value;}};
}

export {headProfile,materials,geometries,clay,ball,mesh,shapeFromPath,volume,bodyVolume,character};
