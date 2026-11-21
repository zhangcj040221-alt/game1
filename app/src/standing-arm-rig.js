import * as T from 'three';

// The standing sculpt is swept through 32 sections of 48 vertices with single end caps.
const sections=32,sides=48;
function centre(position,row){
 const result=new T.Vector3(),point=new T.Vector3();
 if(row===0||row===sections)return result.fromBufferAttribute(position,row?position.count-1:0);
 for(let i=0;i<sides;i++)result.add(point.fromBufferAttribute(position,1+(row-1)*sides+i));
 return result.divideScalar(sides);
}

export function bindStandingArms(actor){
 const base=new T.Bone();base.name='ArmRig';actor.root.add(base);
 const bones=[base];
 const chains=actor.arms.map((pivot,side)=>{
  const original=pivot.children[0],geometry=original.geometry.clone();
  geometry.translate(...pivot.position.toArray());
  const p=geometry.attributes.position;
  if(p.count!==(sections-1)*sides+2)throw new Error('Standing arm section layout changed');
  const joints=[0,15,22,32].map(row=>centre(p,row)),offset=bones.length;
  const chain=[];
  for(const [i,name] of ['Shoulder','Elbow','Wrist'].entries()){
   const bone=new T.Bone();bone.name=(side?'R':'L')+'_'+name;
   bone.position.copy(joints[i]);if(i)bone.position.sub(joints[i-1]);
   (chain[i-1]||base).add(bone);chain.push(bone);bones.push(bone);
  }
  const indices=[],weights=[];
  for(let i=0;i<p.count;i++){
   const row=i===0?0:i===p.count-1?sections:1+Math.floor((i-1)/sides);
   const shoulder=T.MathUtils.smoothstep(row,1,9);
   const elbow=T.MathUtils.smoothstep(row,11,19),wrist=T.MathUtils.smoothstep(row,19,26);
   indices.push(0,offset,offset+1,offset+2);weights.push(1-shoulder,shoulder-elbow,elbow-wrist,wrist);
  }
  geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));
  geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
  actor.root.remove(pivot);
  const arm=new T.SkinnedMesh(geometry,original.material);arm.name=(side?'R':'L')+'_Arm';
  arm.castShadow=arm.receiveShadow=true;actor.root.add(arm);
  return {bones:chain,joints,arm,sign:side?1:-1};
 });
 actor.root.updateMatrixWorld(true);
 const skeleton=new T.Skeleton(bones);
 for(const {arm} of chains)arm.bind(skeleton);
 return chains;
}
