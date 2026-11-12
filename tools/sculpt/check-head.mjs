import assert from 'node:assert/strict';
import {rolldown} from 'rolldown';
import {rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import * as THREE from 'three';
const temp=resolve('node_modules/.head-check.mjs');
const build=await rolldown({input:'app/src/character-volume.js',platform:'node',external:['three',/^three\//]});await build.write({file:temp,format:'esm'});await build.close();
try{
 const m=await import(temp+'?t='+Date.now()),g=m.volume(),p=g.attributes.position,ix=g.index.array,edges=new Map();
 let signedVolume=0,minArea=Infinity;
 for(const attribute of ['position','normal'])assert(Array.from(g.attributes[attribute].array).every(Number.isFinite),`${attribute}: finite`);
 for(let i=0;i<ix.length;i+=3){
   const ids=Array.from(ix.slice(i,i+3)),[a,b,c]=ids.map(j=>new THREE.Vector3().fromBufferAttribute(p,j));
   const cross=b.clone().sub(a).cross(c.clone().sub(a));minArea=Math.min(minArea,cross.length()/2);signedVolume+=a.dot(b.clone().cross(c))/6;
   for(let j=0;j<3;j++){const u=ids[j],v=ids[(j+1)%3],key=[Math.min(u,v),Math.max(u,v)].join(':');const item=edges.get(key)||[0,0];item[0]++;item[1]+=u<v?1:-1;edges.set(key,item);}
 }
 assert(minArea>1e-10,'No collapsed crown/chin triangles');assert(signedVolume>0,'Outward orientation');
 for(const [key,[count,direction]] of edges)assert(count===2&&direction===0,`Closed oriented edge ${key}`);
 const head=new THREE.Mesh(g,new THREE.MeshBasicMaterial()),ray=new THREE.Raycaster();head.updateMatrixWorld(true);
 const surface=(x,y)=>{ray.set(new THREE.Vector3(x,y,2),new THREE.Vector3(0,0,-1));const h=ray.intersectObject(head)[0];assert(h,`Surface exists at ${x},${y}`);return h.point.z;};
 const eye=surface(0,m.headProfile.eye.y),lower=surface(0,-.24),chin=surface(0,-.38);
 assert(lower>eye&&lower-eye<.055,'Lower face projects subtly, without a muzzle ledge');assert(chin<lower,'Chin returns smoothly');
 for(const y of [-.38,-.24,0,.3])for(const x of [.15,.3])assert(Math.abs(surface(x,y)-surface(-x,y))<1e-5,'Bilateral surface symmetry');
 console.log(JSON.stringify({vertices:p.count,triangles:ix.length/3,closed:true,signedVolume,minTriangleArea:minArea,lowerFaceProjection:lower-eye},null,2));
}finally{await rm(temp,{force:true});}
