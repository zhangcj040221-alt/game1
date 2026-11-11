// Software preview of the same Three.js scene when WebGL is unavailable.
// Textured geometry is projected by the real camera and drawn triangle by triangle.
import * as THREE from 'three';
export class CanvasFallback {
 constructor(){this.domElement=document.createElement('canvas');this.context=this.domElement.getContext('2d');this.ratio=1;this.isFallback=true;}
 setPixelRatio(r){this.ratio=r;}
 setSize(w,h){this.width=w;this.height=h;this.domElement.width=w*this.ratio;this.domElement.height=h*this.ratio;}
 render(scene,camera){
  const ctx=this.context,w=this.width,h=this.height,r=this.ratio;ctx.setTransform(r,0,0,r,0,0);ctx.clearRect(0,0,w,h);scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  const project=(v,obj)=>v.clone().applyMatrix4(obj.matrixWorld).project(camera);const screen=v=>[(v.x*.5+.5)*w,(-v.y*.5+.5)*h];
  const objects=[];scene.traverseVisible(o=>{if(o.isMesh||o.isPoints||o.isLine)objects.push(o);});objects.sort((a,b)=>new THREE.Vector3().setFromMatrixPosition(a.matrixWorld).z-new THREE.Vector3().setFromMatrixPosition(b.matrixWorld).z);
  for(const o of objects){const mat=o.material;if(mat.visible===false)continue;
   if(o.isPoints){const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){const s=screen(project(new THREE.Vector3().fromBufferAttribute(p,i),o));const rad=2.6;const g=ctx.createRadialGradient(...s,0,...s,rad*2);g.addColorStop(0,'#fff1c9cc');g.addColorStop(1,'#fff1c900');ctx.fillStyle=g;ctx.fillRect(s[0]-rad*2,s[1]-rad*2,rad*4,rad*4);}continue;}
   if(o.isLine){const p=o.geometry.attributes.position;const a=screen(project(new THREE.Vector3().fromBufferAttribute(p,0),o)),b=screen(project(new THREE.Vector3().fromBufferAttribute(p,1),o));ctx.strokeStyle=`rgba(255,238,190,${mat.opacity})`;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();continue;}
   if(mat.isShaderMaterial){if(!mat.uniforms.strength.value)continue;const a=mat.uniforms.angle.value;const strength=Math.min(1,Math.abs(a.x)+Math.abs(a.y))*1.8;if(strength<.01)continue;const points=[[-1.66,-2.5],[1.66,-2.5],[1.66,2.5],[-1.66,2.5]].map(([x,y])=>screen(project(new THREE.Vector3(x,y,0),o)));ctx.save();ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.clip();const grad=ctx.createLinearGradient(w*.15,0,w*.85,h);grad.addColorStop(0,'#a7c4ff00');grad.addColorStop(.35+a.y*.4,`rgba(146,204,235,${strength*.25})`);grad.addColorStop(.6,'#e9c6a700');grad.addColorStop(1,'#e9c6a700');ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);ctx.restore();continue;}
   const geo=o.geometry,p=geo.attributes.position,uv=geo.attributes.uv,index=geo.index;const image=mat.map?.image;const count=index?index.count:p.count;
   for(let j=0;j<count;j+=3){const ids=[0,1,2].map(k=>index?index.getX(j+k):j+k);const dst=ids.map(i=>screen(project(new THREE.Vector3().fromBufferAttribute(p,i),o)));
    if(image&&uv){const src=ids.map(i=>[uv.getX(i)*image.width,(1-uv.getY(i))*image.height]);this.triangle(ctx,image,src,dst);}else{ctx.fillStyle=mat.color?'#9d9476':'#243b5c';ctx.beginPath();dst.forEach((v,i)=>i?ctx.lineTo(...v):ctx.moveTo(...v));ctx.closePath();ctx.fill();}
   }
  }
 }
 triangle(ctx,img,s,d){const [s0,s1,s2]=s,[d0,d1,d2]=d;const sx1=s1[0]-s0[0],sy1=s1[1]-s0[1],sx2=s2[0]-s0[0],sy2=s2[1]-s0[1],det=sx1*sy2-sx2*sy1;if(Math.abs(det)<1e-5)return;const dx1=d1[0]-d0[0],dy1=d1[1]-d0[1],dx2=d2[0]-d0[0],dy2=d2[1]-d0[1];const a=(dx1*sy2-dx2*sy1)/det,b=(dy1*sy2-dy2*sy1)/det,c=(dx2*sx1-dx1*sx2)/det,e=(dy2*sx1-dy1*sx2)/det;
  const center=[(d0[0]+d1[0]+d2[0])/3,(d0[1]+d1[1]+d2[1])/3];const expanded=[d0,d1,d2].map(p=>{const dx=p[0]-center[0],dy=p[1]-center[1],len=Math.hypot(dx,dy);return [p[0]+dx/len*.35,p[1]+dy/len*.35];});ctx.save();ctx.beginPath();expanded.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.clip();ctx.transform(a,b,c,e,d0[0]-a*s0[0]-c*s0[1],d0[1]-b*s0[0]-e*s0[1]);ctx.drawImage(img,0,0);ctx.restore();
 }
}
