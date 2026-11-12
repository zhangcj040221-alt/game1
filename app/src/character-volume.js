import * as THREE from 'three';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
const geometries={},unit=.0085;
const clay=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.43,metalness:0,...extra});
const materials={yier:clay('#f5eee3'),bubu:clay('#d99a68'),dark:clay('#42251e',{roughness:.38}),pink:clay('#efaa9c',{roughness:.48}),yellow:clay('#f0bf64',{roughness:.48}),gold:clay('#cba86b',{metalness:.72,roughness:.29}),floor:clay('#292e4c',{roughness:.64}),back:clay('#20213e',{roughness:.65})};
const sphere=new THREE.SphereGeometry(1,32,24);
function ball(parent,mat,x,y,z,sx,sy,sz){const m=new THREE.Mesh(sphere,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function mesh(parent,geo,mat,x=0,y=0,z=0){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function shapeFromPath(d,cx,cy){const doc=new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`);const shape=SVGLoader.createShapes(doc.paths[0])[0];return shape.getSpacedPoints(144).slice(0,-1).map(p=>new THREE.Vector2((p.x-cx)*unit,(cy-p.y)*unit));}
// Loft the approved R05 silhouette into a closed, rounded volume. No painted planes.
function volume(outline,depth){const n=outline.length,rings=40,positions=[],indices=[];
 for(let j=0;j<=rings;j++){const t=-Math.PI/2+j/rings*Math.PI,s=Math.pow(Math.max(.000001,Math.cos(t)),.48),z=Math.sin(t)*depth;for(const p of outline)positions.push(p.x*s,p.y*s,z);}
 for(let j=0;j<rings;j++)for(let i=0;i<n;i++){const a=j*n+i,b=j*n+(i+1)%n,c=(j+1)*n+i,d=(j+1)*n+(i+1)%n;indices.push(a,c,b,b,c,d);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
 // Normalize winding once so lighting and the front-surface raycasts agree.
 const a=new THREE.Vector3().fromBufferAttribute(g.attributes.position,n*20),normal=new THREE.Vector3().fromBufferAttribute(g.attributes.normal,n*20);if(a.dot(normal)<0){const ix=g.index.array;for(let i=0;i<ix.length;i+=3)[ix[i+1],ix[i+2]]=[ix[i+2],ix[i+1]];g.computeVertexNormals();}return g;
}
// Rounded extrusion of the exact 2D silhouette avoids pinching a concave body into a single front pole.
function bodyVolume(outline,depth){const res=64,extent=.55,radius=.10,effect=new MarchingCubes(res,materials.bubu,false,false,30000);effect.isolation=0;
 const distance=(x,y)=>{let inside=false,dist=1e6;for(let i=0,j=outline.length-1;i<outline.length;j=i++){const a=outline[i],b=outline[j],dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy)));dist=Math.min(dist,Math.hypot(x-a.x-t*dx,y-a.y-t*dy));if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside;}return inside?-dist:dist;};
 const xy=new Float32Array(res*res);for(let y=0;y<res;y++)for(let x=0;x<res;x++)xy[y*res+x]=distance((x/res*2-1)*extent,(y/res*2-1)*extent);
 for(let z=0;z<res;z++)for(let y=0;y<res;y++)for(let x=0;x<res;x++){const qx=xy[y*res+x]+radius,qz=Math.abs((z/res*2-1)*extent)-(depth-radius);const sdf=Math.hypot(Math.max(qx,0),Math.max(qz,0))+Math.min(Math.max(qx,qz),0)-radius;effect.field[z*res*res+y*res+x]=-sdf;}
 effect.update();const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(effect.geometry.attributes.position.array.slice(0,effect.count*3),3));g.setAttribute('normal',new THREE.Float32BufferAttribute(effect.geometry.attributes.normal.array.slice(0,effect.count*3),3));g.scale(extent,extent,extent);effect.geometry.dispose();return g;
}
const ray=new THREE.Raycaster();
function faceZ(head,x,y){head.updateMatrixWorld(true);ray.set(new THREE.Vector3(x,y,2),new THREE.Vector3(0,0,-1));const hit=ray.intersectObject(head,false)[0];return hit?hit.point.z:.31;}
function facePatch(head,mat,cx,cy,r){const positions=[cx,cy,faceZ(head,cx,cy)+.008],indices=[],segments=32,rings=6;for(let j=1;j<=rings;j++)for(let i=0;i<segments;i++){const a=i/segments*Math.PI*2,x=cx+Math.cos(a)*r*j/rings,y=cy+Math.sin(a)*r*j/rings;positions.push(x,y,faceZ(head,x,y)+.008);}for(let i=0;i<segments;i++)indices.push(0,1+i,1+(i+1)%segments);for(let j=1;j<rings;j++)for(let i=0;i<segments;i++){const a=1+(j-1)*segments+i,b=1+(j-1)*segments+(i+1)%segments,c=a+segments,d=b+segments;indices.push(a,c,b,b,c,d);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();const m=mesh(head,g,mat);m.castShadow=false;m.receiveShadow=false;m.userData.surfacePatch=true;return m;}
function mouth(head){const curve=new THREE.CurvePath();const points=[[-.058,-.177],[-.058,-.211],[-.021,-.219],[0,-.193],[.021,-.219],[.058,-.211],[.058,-.177]];const p=points.map(([x,y])=>new THREE.Vector3(x,y,faceZ(head,x,y)+.01));curve.add(new THREE.CubicBezierCurve3(p[0],p[1],p[2],p[3]));curve.add(new THREE.CubicBezierCurve3(p[3],p[4],p[5],p[6]));mesh(head,new THREE.TubeGeometry(curve,40,.009,8,false),materials.dark);for(const v of [p[0],p[6]])ball(head,materials.dark,...v.toArray(),.009,.009,.009);}
function character(yi){const root=new THREE.Group(),headRig=new THREE.Group();root.add(headRig);headRig.position.y=1.155;
 const skin=yi?materials.yier:materials.bubu,head=new THREE.Mesh(geometries.head,skin);head.castShadow=true;head.receiveShadow=true;
 // Build face in head-local space before mounting the head rig.
 for(const sign of [-1,1]){const e=ball(head,yi?materials.dark:skin,sign*.46,.425,-.035,.146,.146,.092);if(!yi)ball(head,materials.dark,sign*.46,.425,.043,.091,.093,.025);}
 const eyes=[];for(const sign of [-1,1]){const x=sign*.257,y=-.169,z=faceZ(head,x,y);eyes.push(ball(head,materials.dark,x,y,z+.013,.049,.051,.021));facePatch(head,yi?materials.pink:materials.yellow,sign*.445,-.324,.113);}
 mouth(head);headRig.add(head);
 mesh(root,geometries.body,skin,0,.345,0);
 const arms=[];for(const sign of [-1,1]){const pivot=new THREE.Group();pivot.position.set(sign*.385,.66,.015);root.add(pivot);const arm=mesh(pivot,new THREE.CapsuleGeometry(.073,.18,8,16),skin,0,-.142,.025);pivot.rotation.z=sign*.16;arms.push(pivot);if(yi)ball(root,materials.dark,sign*.275,.034,.055,.119,.055,.143);}
 if(yi){const band=mesh(root,new THREE.TorusGeometry(.293,.021,10,48),materials.dark,0,.654,0);band.rotation.x=Math.PI/2;band.scale.y=.72;ball(root,materials.dark,-.045,.594,.224,.049,.065,.023).rotation.z=-.4;ball(root,materials.dark,.045,.594,.224,.049,.065,.023).rotation.z=.4;ball(root,materials.dark,0,.61,.244,.028,.03,.02);}
 return {root,headRig,eyes,arms};
}

export {materials,geometries,clay,ball,mesh,shapeFromPath,volume,bodyVolume,character};
