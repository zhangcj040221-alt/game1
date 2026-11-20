import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {character,geometries,bodyVolume,volume,clay,mesh} from './character-volume.js';

import {bindStandingArms} from './standing-arm-rig.js';

import {bindStandingBody,squatClip} from './standing-body-rig.js';

export function cameraStudy(){
 geometries.head??=volume();geometries.body??=bodyVolume();
 const actor=character(false,{pose:'standing'}), root=actor.root;
 root.name='Bubu';root.position.y=-new T.Box3().setFromObject(root,true).min.y;
 const tracks=[],times=[0,.35,1.75,2.35];
 const chains=bindStandingArms(actor);
 const upper=bindStandingBody(actor,chains);
 for(const {bones,joints,sign} of chains){
  const directions=[[sign*.64,-.53,.55],[-sign*.08,.04,1],[-sign*.63,.16,.76]];
  const restShoulder=bones[0].position,forward=restShoulder.clone();
  forward.z+=.042;
  tracks.push(new T.VectorKeyframeTrack(bones[0].name+'.position',times,
   [...restShoulder.toArray(),...restShoulder.toArray(),...forward.toArray(),...forward.toArray()]));
  // A small pad compression at closure gives the wrist a flatter contact face.
  tracks.push(new T.VectorKeyframeTrack(bones[2].name+'.scale',[0,1.05,1.75,2.35],
   [1,1,1,1,1,1,.84,1.03,1.03,.84,1.03,1.03]));
  let parentRotation=new T.Quaternion();
  bones.forEach((bone,i)=>{
   const rest=joints[i+1].clone().sub(joints[i]).normalize();
   const target=new T.Vector3(...directions[i]).normalize();
   const worldRotation=new T.Quaternion().setFromUnitVectors(rest,target);
   // Roll around the pad's own axis without moving its contact point.
   if(i===2)worldRotation.premultiply(new T.Quaternion().setFromAxisAngle(target,sign*.32));
   const dest=parentRotation.clone().invert().multiply(worldRotation);
   const id=new T.Quaternion(),mid=id.clone().slerp(dest,[.70,.48,.24][i]);
   tracks.push(new T.QuaternionKeyframeTrack(bone.name+'.quaternion',[0,.35,1.05,1.75,2.35],
    [...id.toArray(),...id.toArray(),...mid.toArray(),...dest.toArray(),...dest.toArray()]));
   parentRotation=worldRotation;
  });
 }
 const prop=new T.Group();prop.name='Camera';upper.add(prop);
 const width=.58945;
 mesh(prop,new RoundedBoxGeometry(width,.239,.111,4,.034),clay('#e9aeb6'));
 const lens=mesh(prop,new T.CylinderGeometry(.073,.081,.035,40),clay('#a7d1d4'),0,.006,.065);lens.rotation.x=Math.PI/2;
 mesh(prop,new RoundedBoxGeometry(.048,.038,.009,3,.008),clay('#403837'),-width*.32,.068,.056);
 const z=.364,hold=[0,.516,z],away=[0,.427,z+.56];
 prop.position.fromArray(away);prop.scale.setScalar(0);
 tracks.push(new T.VectorKeyframeTrack('Camera.position',times,[...away,...away,...hold,...hold]));
 tracks.push(new T.VectorKeyframeTrack('Camera.scale',[0,.35,.85,2.35],[0,0,0,0,0,0,1,1,1,1,1,1]));
 return {root,clip:new T.AnimationClip('HoldCamera',2.35,tracks),squat:squatClip()};
}
