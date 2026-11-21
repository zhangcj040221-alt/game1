import './race.js';
const first=document.querySelector('.first'),card=first.querySelector('.card');
for(const id of ['a','b']){
 document.getElementById(id).onclick=()=>{
  first.dataset.selected=id;
  document.getElementById('a').setAttribute('aria-pressed',id==='a');
  document.getElementById('b').setAttribute('aria-pressed',id==='b');
  update();
 };
}
const narrow=matchMedia('(max-width: 699px)');
function update(){
 const thick=narrow.matches&&first.dataset.selected==='b';
 card.classList.toggle('thick',thick);card.classList.toggle('thin',!thick);
 first.querySelector('figcaption').textContent=thick?'B · 软陶厚框':'A · 薄边画窗';
}
narrow.addEventListener('change',update);
const mirror=document.getElementById('mirror'),angle=document.getElementById('angle');
let start;
mirror.onpointerdown=e=>{start=[e.clientX,+angle.value];mirror.setPointerCapture(e.pointerId);};
mirror.onpointermove=e=>{if(start)angle.value=start[1]+(e.clientX-start[0])*.15;};
mirror.onlostpointercapture=()=>start=null;
