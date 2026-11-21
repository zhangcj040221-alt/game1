import './race.js';
const first=document.querySelector('.first'),card=first.querySelector('.card');
const narrow=matchMedia('(max-width: 699px)');
let selected='refined';
function update(){
 const refined=!narrow.matches||selected==='refined';
 card.classList.toggle('refined',refined);
 first.querySelector('figcaption').textContent=refined?'B · 精修款':'B · 原款';
 for(const id of ['refined','original']){
  document.getElementById(id).setAttribute('aria-pressed',String(id===selected));
 }
}
for(const id of ['refined','original']){
 document.getElementById(id).onclick=()=>{selected=id;update();};
}
narrow.addEventListener('change',update);
const mirror=document.getElementById('mirror'),angle=document.getElementById('angle');
let start;
mirror.onpointerdown=e=>{start=[e.clientX,+angle.value];mirror.setPointerCapture(e.pointerId);};
mirror.onpointermove=e=>{if(start)angle.value=start[1]+(e.clientX-start[0])*.15;};
mirror.onlostpointercapture=()=>start=null;
