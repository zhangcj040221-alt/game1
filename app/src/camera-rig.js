import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {character,geometries,bodyVolume,volume,clay,mesh} from './character-volume.js';

export function cameraStudy(){
 geometries.head??=volume();geometries.body??=bodyVolume();
 const actor=character(false,{pose:'standing'}), root=actor.root;
 root.name='Bubu';root.position.y=-new T.Box3().setFromObject(root,true).min.y;
 const tracks=[],times=[0,.35,1.75,2.35];
 const heldTips=[];
 actor.arms.forEach((pivot,side)=>{
  const sign=side?1:-1,old=pivot.children[0],g=old.geometry.clone(),p=g.attributes.position;
  // Each generated cross section has 48 equally spaced vertices.
  function centre(row){
   if(row===0||row===32)return new T.Vector3().fromBufferAttribute(p,row===0?0:p.count-1);
   const v=new T.Vector3();for(let i=0;i<48;i++)v.add(new T.Vector3().fromBufferAttribute(p,1+(row-1)*48+i));return v.divideScalar(48);
  }
  const rows=[0,16,23,32],joints=rows.map(centre),bones=[];
  for(const [i,name] of ['Shoulder','Elbow','Wrist'].entries()){
   const bone=new T.Bone();bone.name=(side?'R':'L')+'_'+name;
   bone.position.copy(joints[i]);if(i)bone.position.sub(joints[i-1]);
   (bones[i-1]||pivot).add(bone);bones.push(bone);
  }
  const indices=[],weights=[];
  for(let i=0;i<p.count;i++){
   const row=i===0?0:i===p.count-1?32:1+Math.floor((i-1)/48);
   const e=T.MathUtils.smoothstep(row,12,20),w=T.MathUtils.smoothstep(row,20,27);
   indices.push(0,1,2,0);weights.push(1-e,e-w,w,0);
  }
  g.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
  pivot.remove(old);const arm=new T.SkinnedMesh(g,old.material);arm.name=(side?'R':'L')+'_Arm';arm.castShadow=arm.receiveShadow=true;pivot.add(arm);
  root.updateMatrixWorld(true);arm.bind(new T.Skeleton(bones));
  const directions=[[sign*.56,-.36,.75],[-sign*.18,-.12,.98],[-sign*.70,-.05,.71]];
  let parentRotation=new T.Quaternion(),end=pivot.position.clone().add(joints[0]);
  bones.forEach((bone,i)=>{
   const segment=joints[i+1].clone().sub(joints[i]),dir=new T.Vector3(...directions[i]).normalize();
   end.addScaledVector(dir,segment.length());
   const worldRotation=new T.Quaternion().setFromUnitVectors(segment.normalize(),dir);
   const q=parentRotation.clone().invert().multiply(worldRotation);
   const id=[0,0,0,1],dest=q.toArray();
   tracks.push(new T.QuaternionKeyframeTrack(bone.name+'.quaternion',times,[...id,...id,...dest,...dest]));
   parentRotation=worldRotation;
  });
  heldTips.push(end);
 });
 const tip=heldTips[1];
 const prop=new T.Group();prop.name='Camera';root.add(prop);
 const width=tip.x*2+.032;
 mesh(prop,new RoundedBoxGeometry(width,.239,.111,4,.034),clay('#e9aeb6'));
 const lens=mesh(prop,new T.CylinderGeometry(.073,.081,.035,40),clay('#a7d1d4'),0,.006,.065);lens.rotation.x=Math.PI/2;
 mesh(prop,new RoundedBoxGeometry(.048,.038,.009,3,.008),clay('#403837'),-width*.32,.068,.056);
 const z=Math.max(.364,tip.z+.030),hold=[0,tip.y-.011,z],away=[0,tip.y-.10,z+.56];
 prop.position.fromArray(away);prop.scale.setScalar(0);
 tracks.push(new T.VectorKeyframeTrack('Camera.position',times,[...away,...away,...hold,...hold]));
 tracks.push(new T.VectorKeyframeTrack('Camera.scale',[0,.35,.85,2.35],[0,0,0,0,0,0,1,1,1,1,1,1]));
 return {root,clip:new T.AnimationClip('HoldCamera',2.35,tracks)};
}
