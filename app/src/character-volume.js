import bodyProfile from './body-profile-r13.json';
import headProfile from './head-profile-r20.json';
import * as THREE from 'three';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
const geometries={},unit=.0085;
const clay=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.43,metalness:0,...extra});
const materials={yier:clay('#f5eee3'),bubu:new THREE.MeshPhysicalMaterial({color:'#ce7c4e',roughness:.58,metalness:0,specularIntensity:.38}),dark:clay('#42251e',{roughness:.38}),pink:new THREE.MeshPhysicalMaterial({color:'#e99581',roughness:.83,metalness:0,specularIntensity:.12}),yellow:new THREE.MeshPhysicalMaterial({color:'#e9a32e',roughness:.83,metalness:0,specularIntensity:.12}),gold:clay('#cba86b',{metalness:.72,roughness:.29}),floor:clay('#292e4c',{roughness:.64}),back:clay('#20213e',{roughness:.65})};
// Painted facial ink stays dark under grazing light; ears and feet keep their clay finish.
materials.tongue=clay('#ec819a',{roughness:.8});
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
const ell=(x,y,z,rx,ry,rz)=>(Math.sqrt((x/rx)**2+(y/ry)**2+(z/rz)**2)-1)*Math.min(rx,ry,rz);
const blend=(a,b,k)=>{const h=Math.max(0,Math.min(1,.5+.5*(b-a)/k));return b+(a-b)*h-k*h*(1-h);};
function sculptBody(field){
 const n=104,extent=.8,effect=new MarchingCubes(n,materials.bubu,false,false,60000);
 effect.isolation=0;
 for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const px=(x/n*2-1)*extent,py=(y/n*2-1)*extent,pz=(z/n*2-1)*extent;
  effect.field[z*n*n+y*n+x]=-Math.max(field(px,py,pz),.008-py);
 }
 effect.update();const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(effect.geometry.attributes.position.array.slice(0,effect.count*3),3));g.setAttribute('normal',new THREE.Float32BufferAttribute(effect.geometry.attributes.normal.array.slice(0,effect.count*3),3));g.scale(extent,extent,extent);effect.geometry.dispose();return g;
}
function bodyVolume(){
 return sculptBody((px,py,pz)=>{
  // The upper chest keeps its round section. Below the waist the seated
  // pelvis carries its width closer to the floor, especially at the back.
  const height=(py-.31)/(py<.31?.331:.305);
  const hip=1-THREE.MathUtils.smoothstep(py,.10,.40);
  const width=.405-.045*THREE.MathUtils.clamp(height,-1,1)+.043*hip;
  const depth=.325+.035*hip;
  const vertical=height<0?height**4:height**2;
  // The abdominal arc is confined to the front. Keep the broad pelvic
  // support at the back, rounding the lower belly in towards the seat.
  const localZ=pz+.045+.02*hip;
  const centreWeight=Math.exp(-((px/.27)**2));
  const abdomen=centreWeight*(.035*Math.exp(-(((py-.225)/.155)**2))-.015*(1-THREE.MathUtils.smoothstep(py,.025,.16)));
  const sectionDepth=localZ>0?depth+abdomen:depth;
  let d=.305*(Math.sqrt((px/width)**2+(localZ/sectionDepth)**2+vertical)-1);
  for(const sign of [-1,1]){
   const l=bodyProfile.leg,a=sign*THREE.MathUtils.degToRad(l.splayDegrees),dx=px-sign*l.centreX,dz=pz-l.centreZ;
   const across=Math.cos(a)*dx-Math.sin(a)*dz,along=Math.sin(a)*dx+Math.cos(a)*dz;
   d=blend(d,ell(across,py-l.centreY,along,l.radiusX,l.radiusY,l.radiusZ),l.blend);
  }
  return d;
 });
}

// The abdomen ends above the floor. Only the two feet carry weight.
function standingVolume(){
 return sculptBody((x,y,z)=>{
  const height=(y-.39)/(y<.39?.296:.354);
  const width=.432-.055*THREE.MathUtils.clamp(height,-1,1);
  const depth=.308-.027*THREE.MathUtils.clamp(height,-1,1);
  const vertical=height<0?Math.abs(height)**2.35:height**2;
  const front=.014*Math.exp(-(((y-.29)/.145)**2));
  const torso=.296*(Math.sqrt((x/width)**2+((z+.016-front)/depth)**2+vertical)-1);
  // Move the sole a little ahead of the ankle as it takes weight.
  const toe=1-THREE.MathUtils.smoothstep(y,.035,.19);
  const leg=ell(Math.abs(x)-(.255+.013*toe),y-.131,z-(.019+.037*toe),.126,.154,.154);
  return blend(torso,leg,.095);
 });
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
// Ink, including expression variants, sits directly on the same sculpt.
function inkStroke(head,curve,width){
 const positions=[],indices=[],steps=40;
 for(let i=0;i<=steps;i++){
  const t=i/steps,v=curve.getPoint(t),n=curve.getTangent(t);
  for(const side of [-1,1]){
   const x=v.x-side*n.y*width,y=v.y+side*n.x*width;
   positions.push(x,y,faceZ(head,x,y)+.0035);
  }
  if(i<steps){const k=2*i;indices.push(k,k+2,k+1,k+1,k+2,k+3);}
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();
 const ink=mesh(head,geo,materials.ink);ink.castShadow=false;ink.receiveShadow=false;ink.userData.surfacePatch=true;
 for(const t of [0,1]){const v=curve.getPoint(t);facePatch(head,materials.ink,v.x,v.y,width);}
}
function mouth(head,open){
 const lipY=headProfile.mouthYOffset-.177;
 if(open){
  const outline=new THREE.Path();
  outline.moveTo(0,-.016);
  outline.bezierCurveTo(.023,-.039,.031,-.036,.042,-.025);
  outline.bezierCurveTo(.048,-.064,.071,-.149,0,-.151);
  outline.bezierCurveTo(-.071,-.149,-.048,-.064,-.042,-.025);
  outline.bezierCurveTo(-.031,-.036,-.023,-.039,0,-.016);
  const rim=outline.getSpacedPoints(64).slice(0,-1),positions=[],indices=[],centreY=-.082;
  const point=(x,y)=>positions.push(x,y+lipY,faceZ(head,x,y+lipY)+.0025);
  point(0,centreY);
  const geo=new THREE.BufferGeometry();
  for(const [j,scale] of [.35,.68,.86,1].entries()){
   for(const v of rim)point(v.x*scale,centreY+(v.y-centreY)*scale);
   const start=indices.length;
   for(let i=0;i<rim.length;i++){
    const a=1+j*rim.length+i,b=1+j*rim.length+(i+1)%rim.length;
    if(j===0)indices.push(0,b,a);
    else indices.push(a-rim.length,b,a,b-rim.length,b,a-rim.length);
   }
   geo.addGroup(start,indices.length-start,j===3?1:0);
  }
  geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();
  const paint=mesh(head,geo,[materials.tongue,materials.ink]);paint.castShadow=false;paint.receiveShadow=false;paint.userData.surfacePatch=true;
 }
 const points=[[-.058,0],[-.058,-.034],[-.021,-.042],[0,-.016],[.021,-.042],[.058,-.034],[.058,0]]
  .map(([x,y])=>new THREE.Vector2(x,y+lipY));
 const curve=new THREE.CurvePath();
 curve.add(new THREE.CubicBezierCurve(...points.slice(0,4)));
 curve.add(new THREE.CubicBezierCurve(...points.slice(3)));
 inkStroke(head,curve,.008);
}
// Rounded tapered paws: a broad root overlaps the torso, with a small soft fingertip.
function pawGeometry(){const g=new THREE.SphereGeometry(1,40,32),p=g.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i),t=(y+1)/2,width=.085+.022*t;p.setXYZ(i,p.getX(i)*width,y*.139,p.getZ(i)*(.092+.010*t));}g.computeVertexNormals();return g;}
function sliceBody(source,cut,below){const positions=[],normals=[],p=source.attributes.position,n=source.attributes.normal;
 for(let i=0;i<p.count;i+=3){let polygon=[0,1,2].map(j=>({p:new THREE.Vector3().fromBufferAttribute(p,i+j),n:new THREE.Vector3().fromBufferAttribute(n,i+j)})),out=[];for(let j=0;j<polygon.length;j++){const a=polygon[j],b=polygon[(j+1)%polygon.length],aIn=below?a.p.y<=cut:a.p.y>=cut,bIn=below?b.p.y<=cut:b.p.y>=cut;if(aIn)out.push(a);if(aIn!==bIn){const t=(cut-a.p.y)/(b.p.y-a.p.y);out.push({p:a.p.clone().lerp(b.p,t),n:a.n.clone().lerp(b.n,t).normalize()});}}for(let j=1;j<out.length-1;j++)for(const v of [out[0],out[j],out[j+1]]){positions.push(...v.p.toArray());normals.push(...v.n.toArray());}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));return g;
}
// Sweep elliptical sections perpendicular to the bent arm so the rounded
// palm keeps its thickness in both front and profile views.
function armVolume(sign,standing){
 const path=standing?new THREE.CubicBezierCurve3(
  new THREE.Vector3(-sign*.072,.017,-.026),
  new THREE.Vector3(sign*.008,-.046,-.014),
  new THREE.Vector3(sign*.136,-.192,.098),
  new THREE.Vector3(sign*.096,-.284,.147)
 ):new THREE.CubicBezierCurve3(
  new THREE.Vector3(-sign*.106,-.007,0),
  new THREE.Vector3(-sign*.036,-.074,.095),
  new THREE.Vector3(sign*.028,-.135,.246),
  new THREE.Vector3(-sign*.119,-.122,.338)
 );
 const rows=32,sides=48,positions=path.v0.toArray(),indices=[];
 const tangent=new THREE.Vector3(),across=new THREE.Vector3(),up=new THREE.Vector3(),centre=new THREE.Vector3();
 for(let j=1;j<rows;j++){
  const angle=Math.PI*j/rows,t=(1-Math.cos(angle))/2,radius=Math.sin(angle);
  path.getPoint(t,centre);path.getTangent(t,tangent);
  const palm=THREE.MathUtils.smoothstep(t,.45,.88);
  if(standing){
   // Keep the palm width measured across the flank as it rolls forward.
   across.set(1,0,0).addScaledVector(tangent,-tangent.x).normalize();
   up.crossVectors(tangent,across);
  }else{
   across.set(tangent.z,0,-tangent.x).normalize();up.crossVectors(tangent,across);
  }
  const width=standing?.084+.020*palm:.107+.009*palm;
  const depth=standing?.092+.038*palm:.110-.012*palm;
  for(let i=0;i<sides;i++){
   const a=2*Math.PI*i/sides;
   const side=Math.cos(a);
   const innerFlatten=standing&&sign*side<0?1-.18*palm:1;
   const x=side*radius*width*innerFlatten,y=Math.sin(a)*radius*depth;
   positions.push(centre.x+x*across.x+y*up.x,centre.y+x*across.y+y*up.y,centre.z+x*across.z+y*up.z);
  }
 }
 const tip=positions.length/3,last=tip-sides;
 positions.push(...path.v3.toArray());
 for(let i=0;i<sides;i++){
  const next=(i+1)%sides;
  indices.push(0,1+next,1+i,last+i,last+next,tip);
  for(let j=0;j<rows-2;j++){
   const a=1+j*sides+i,b=1+j*sides+next;
   indices.push(a,b,a+sides,b,b+sides,a+sides);
  }
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geo.setIndex(indices);geo.computeVertexNormals();return geo;
}
function character(yi,{openMouth=false,wink=false,pose='seated'}={}){const root=new THREE.Group(),headRig=new THREE.Group();root.add(headRig);
 const standing=pose==='standing';
 headRig.position.y=standing?1.119:1.02;
 headRig.name='head-pivot';
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
 if(wink){
  eyes[1].visible=false;
  const {x,y}=headProfile.eye;
  const corner=new THREE.Vector2(x-.037,y),path=new THREE.CurvePath();
  path.add(new THREE.LineCurve(new THREE.Vector2(x+.038,y+.028),corner));
  path.add(new THREE.LineCurve(corner,new THREE.Vector2(x+.038,y-.026)));
  inkStroke(head,path,.01);
 }
 mouth(head,openMouth);headRig.add(head);
 if(standing){
  const body=geometries.standingBody??=standingVolume();
  if(yi){
   mesh(root,geometries.standingWhite??=sliceBody(body,.081,false),skin).name='standing-body';
   mesh(root,geometries.standingShoes??=sliceBody(body,.081,true),materials.earDark).name='standing-shoes';
   const band=mesh(root,new THREE.TorusGeometry(.326,.022,12,64),materials.dark,0,.619,-.012);
   band.rotation.x=Math.PI/2;band.scale.y=.76;band.name='neckband';
   for(const sign of [-1,1]){
    const end=ball(root,materials.dark,sign*.045,.58,.254,.042,.077,.032);
    end.rotation.z=sign*.58;end.name='bow-loop';
   }
   ball(root,materials.dark,0,.613,.254,.036,.034,.033).name='bow-knot';
  }else mesh(root,body,skin).name='standing-body';
  ball(root,skin,0,.235,-.301,.084,.081,.083).name='tail';
 }else{
  mesh(root,geometries.body,skin).name='seated-chest-hips-legs';
  if(yi)for(const sign of [-1,1]){
   const f=bodyProfile.footTip,foot=ball(root,materials.earDark,sign*f.x,f.y,f.z,f.rx,f.ry,f.rz);
   foot.name='dark-foot-tip';foot.rotation.y=sign*THREE.MathUtils.degToRad(bodyProfile.leg.splayDegrees);
  }
  ball(root,skin,0,.110,-.398,.088,.083,.084).name='tail';
 }
 const arms=[];for(const sign of [-1,1]){
  const pivot=new THREE.Group();
  if(standing)pivot.position.set(sign*.307,.607,.012);
  else pivot.position.set(sign*.27,.48,.015);
  pivot.name=sign<0?'shoulder-left':'shoulder-right';root.add(pivot);
  const key=pose+'-arm-'+sign;
  const arm=mesh(pivot,geometries[key]??=armVolume(sign,standing),skin);
  arm.name=standing?'standing-paw':'forward-holding-paw';arms.push(pivot);
 }
 return {root,headRig,eyes,arms,setBlink(value){for(const e of eyes)e.userData.blink.value=value;}};
}

export {headProfile,materials,geometries,clay,ball,mesh,shapeFromPath,volume,bodyVolume,character};
