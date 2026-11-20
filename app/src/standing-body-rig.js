import * as T from 'three';

const hipY=.374, segment=.145;
function joint(parent,name,position){
 const b=new T.Bone();b.name=name;b.position.fromArray(position);parent.add(b);return b;
}
export function bindStandingBody(actor,chains){
 const root=actor.root,old=chains[0].arm.skeleton;
 const pelvis=joint(root,'Pelvis',[0,hipY,0]);
 const spine=joint(pelvis,'Spine',[0,.09,0]);
 const chest=joint(spine,'Chest',[0,.10,0]);
 const neck=joint(chest,'Head',[0,.077,0]);
 const tail=joint(pelvis,'Tail',[0,.235-hipY,-.265]);
 root.updateMatrixWorld(true);
 chest.attach(old.bones[0]);neck.attach(actor.headRig);tail.attach(root.getObjectByName('tail'));
 const bones=[...old.bones,pelvis,spine,chest,neck,tail];
 const legs=[-1,1].map(sign=>{
  const side=sign<0?'L_':'R_';
  const hip=joint(pelvis,side+'Hip',[sign*.26,0,.033]);
  const knee=joint(hip,side+'Knee',[0,-segment,0]);
  const ankle=joint(knee,side+'Ankle',[0,-segment,0]);bones.push(hip,knee,ankle);
  return [hip,knee,ankle];
 });
 root.updateMatrixWorld(true);
 const original=root.getObjectByName('standing-body'),g=original.geometry.clone(),p=g.attributes.position;
 const index=[],weights=[],smooth=T.MathUtils.smoothstep;
 for(let i=0;i<p.count;i++){
  const y=p.getY(i),x=p.getX(i),leg=legs[x<0?0:1];
  // Fade leg influence across the groin and into the abdomen on each side.
  const side=smooth(Math.abs(x),.025,.195);
  if(y<.445){
   // Short, thick legs need a broad compression zone. The sole and pelvis
   // carry most of the mass while the knee guides the front silhouette.
   const rise=smooth(y,.025,.425);
   const bend=4*rise*(1-rise)*side;
   const thigh=bend*.18*smooth(y,.10,.34);
   const shin=bend*.18*(1-smooth(y,.10,.34));
   const sole=side*(1-rise)*(1-thigh-shin);
   index.push(...[leg[2],leg[1],leg[0],pelvis].map(b=>bones.indexOf(b)));
   weights.push(sole,shin,thigh,1-sole-shin-thigh);
  }else{
   const upper=smooth(y,.445,.54),top=smooth(y,.54,.635);
   index.push(...[pelvis,spine,chest,pelvis].map(b=>bones.indexOf(b)));
   weights.push(1-upper,upper-top,top,0);
  }
 }
 g.setAttribute('skinIndex',new T.Uint16BufferAttribute(index,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
 const body=new T.SkinnedMesh(g,original.material);body.name=original.name;body.castShadow=body.receiveShadow=true;
 root.remove(original);root.add(body);root.updateMatrixWorld(true);
 const skeleton=new T.Skeleton(bones);
 for(const m of [body,...chains.map(chain=>chain.arm)])m.bind(skeleton);
 old.dispose();
 return old.bones[0];
}

export function squatClip(){
 const tracks=[],times=[],heights=[],angles=[];
 // Bake the closed-chain solution densely enough for linear GLB keyframes.
 for(let i=0;i<=48;i++){
  const t=i/48,a=.67*Math.sin(Math.PI*t)**2;times.push(2.4*t);angles.push(a);heights.push(0,hipY-2*segment*(1-Math.cos(a)),0);
 }
 tracks.push(new T.VectorKeyframeTrack('Pelvis.position',times,heights));
 function rotate(name,factor){
  const values=[];
  for(const angle of angles)values.push(Math.sin(angle*factor/2),0,0,Math.cos(angle*factor/2));
  tracks.push(new T.QuaternionKeyframeTrack(name+'.quaternion',times,values));
 }
 for(const side of ['L_','R_']){rotate(side+'Hip',-1);rotate(side+'Knee',2);rotate(side+'Ankle',-1);}
 rotate('Spine',.09);rotate('Chest',.065);rotate('Head',-.135);rotate('Tail',-.18);
 return new T.AnimationClip('ShallowSquat',2.4,tracks);
}
