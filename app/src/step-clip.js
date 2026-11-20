import * as T from 'three';

// Roll the character about the planted ankle, then counter-rotate the shoe.
export function stepClip(mirror){
 const tracks=new Map(),times=[],up=new T.Vector3(),euler=new T.Group().rotation,q=new T.Quaternion();
 const active=mirror?'L_':'R_',support=mirror?'R_':'L_',sign=mirror?-1:1;
 function put(key,values){
  if(!tracks.has(key))tracks.set(key,[]);
  tracks.get(key).push(...values);
 }
 function rotate(name,x,y,z){
  q.setFromEuler(euler.set(x,y,z));put(name+'.quaternion',q.toArray());
 }
 for(let frame=0;frame<=72;frame++){
  const t=frame/72,pulse=(a,b,c,d)=>T.MathUtils.smoothstep(t,a,b)-T.MathUtils.smoothstep(t,c,d);
  const shift=pulse(0,.26,.74,1),step=pulse(.16,.43,.61,.82),swing=pulse(.07,.37,.63,.94);
  const roll=sign*.28*shift;
  times.push(t*2.4);
  up.set(sign*.26,.29,0).applyAxisAngle(new T.Vector3(0,0,1),roll);
  put('Pelvis.position',[up.x-sign*.26,.084+up.y,0]);
  rotate('Pelvis',0,0,roll);
  rotate(support+'Ankle',0,0,-roll);
  rotate(active+'Hip',-.55*step,0,sign*.30*step);
  rotate(active+'Knee',.78*step,0,0);
  rotate(active+'Ankle',-.18*step,0,0);
  rotate('Spine',.09*swing,sign*.18*swing,-roll*.48);
  rotate('Head',-.05*swing,-sign*.11*swing,-roll*.30);
  rotate(support+'Shoulder',-.69*swing,0,-sign*.68*swing);
  rotate(active+'Shoulder',.32*swing,0,sign*.68*swing);
  rotate(support+'Elbow',-.25*swing,0,0);
 }
 return new T.AnimationClip('BalanceStep',2.4,[...tracks].map(([key,values])=>
  key.endsWith('.position')?new T.VectorKeyframeTrack(key,times,values):new T.QuaternionKeyframeTrack(key,times,values)));
}
