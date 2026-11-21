// Export the actual Three.js meshes, including surface paint, for CPU review.
import {rolldown} from 'rolldown';
import {writeFile,mkdir,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
const output=resolve(process.argv[2]||'test-results/sculpt');await mkdir(output,{recursive:true});
for(const version of ['r05','current']){
 const input=resolve(`app/src/character-volume${version==='current'?'':'-'+version}.js`);
 const build=await rolldown({input,platform:'node',external:['three',/^three\//]});
 const temp=resolve(`node_modules/.sculpt-${version}.mjs`);await build.write({file:temp,format:'esm'});await build.close();
 const model=await import(temp+'?t='+Date.now());
 const THREE=await import('three');model.geometries.head=model.volume();model.geometries.body=new THREE.SphereGeometry(.3).toNonIndexed();
 for(const name of ['bubu','yier']){const c=model.character(name==='yier'),head=c.headRig.children[0];head.removeFromParent();head.updateMatrixWorld(true);const meshes=[];
 head.traverse(o=>{if(!o.isMesh)return;const g=o.geometry.clone();g.applyMatrix4(o.matrixWorld);const p=g.attributes.position;meshes.push({name:o.name||'part',positions:Array.from(p.array),indices:g.index?Array.from(g.index.array):Array.from({length:p.count},(_,i)=>i),color:o.material.color.toArray(),roughness:o.material.roughness});g.dispose();});
 await writeFile(`${output}/${version}-${name}.json`,JSON.stringify(meshes));}
 await rm(temp);
}
console.log(output);
