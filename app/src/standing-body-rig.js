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
 const pieces=root.children.filter(o=>['standing-body','standing-shoes'].includes(o.name));
 const clothing=root.children.filter(o=>['neckband','bow-loop','bow-knot'].includes(o.name));
 for(const piece of clothing)chest.attach(piece);
 const meshes=pieces.map(original=>skinStandingPiece(original,root,bones,legs,pelvis,spine,chest));
 const skeleton=new T.Skeleton(bones);
 for(const m of [...meshes,...chains.map(chain=>chain.arm)])m.bind(skeleton);
 old.dispose();
 return old.bones[0];
}

// Evaluate the same weight field on both sides of the white-leg / dark-shoe seam.
function skinStandingPiece(original,root,bones,legs,pelvis,spine,chest){
 const g=original.geometry.clone(),p=g.attributes.position;
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
 return body;
}

// Both motions use the same planted two-link leg solution.
function plantedClip(name,duration,kneeBend,rotations){
 const tracks=[],times=[],heights=[],angles=[];
 // Bake the closed-chain solution densely enough for linear GLB keyframes.
 for(let i=0;i<=96;i++){
  const t=i/96,a=kneeBend(t);times.push(duration*t);angles.push(a);heights.push(0,hipY-2*segment*(1-Math.cos(a)),0);
 }
 tracks.push(new T.VectorKeyframeTrack('Pelvis.position',times,heights));
 function rotate(name,factor){
  const values=[];
  for(const angle of angles)values.push(Math.sin(angle*factor/2),0,0,Math.cos(angle*factor/2));
  tracks.push(new T.QuaternionKeyframeTrack(name+'.quaternion',times,values));
 }
 for(const side of ['L_','R_']){rotate(side+'Hip',-1);rotate(side+'Knee',2);rotate(side+'Ankle',-1);}
 for(const [bone,factor] of Object.entries(rotations))rotate(bone,factor);
 return new T.AnimationClip(name,duration,tracks);
}

export function squatClip(){
 return plantedClip('ShallowSquat',2.4,t=>.67*Math.sin(Math.PI*t)**2,
  {Spine:.09,Chest:.065,Head:-.135,Tail:-.18});
}

export function anticipationClip(){
 // Gather slowly, settle briefly, then release into the standing pose.
 const ease=T.MathUtils.smoothstep;
 const load=t=>.39*(ease(t,0,.52)-ease(t,.64,1));
 return plantedClip('Anticipation',1.25,load,{
  Spine:.29,Chest:.12,Head:-.22,Tail:-.20,
  L_Shoulder:.64,R_Shoulder:.64,L_Elbow:-.15,R_Elbow:-.15
 });
}
