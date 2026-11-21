import './race.js';
const first=document.querySelector('.first'),card=first.querySelector('.card');
const narrow=matchMedia('(max-width: 699px)');
const medalStudy = new URLSearchParams(location.search).get('edition') === 'medal';
let selected='refined';
if (medalStudy) {
 document.querySelector('h1').textContent = '完赛纪念牌';
 document.title = '口袋大奖赛 · 完赛纪念牌';
 document.querySelector('.second .card').classList.add('refined');
 document.querySelector('.second figcaption').textContent = 'B · 上一版';
 document.getElementById('refined').textContent = '纪念牌';
 document.getElementById('original').textContent = '上一版';
}
function update(){
 const refined=!narrow.matches||selected==='refined';
 card.classList.toggle('refined',medalStudy || refined);
 card.classList.toggle('medal',medalStudy && refined);
 first.querySelector('figcaption').textContent=medalStudy ? (refined ? 'B · 完赛纪念牌' : 'B · 上一版') : (refined ? 'B · 精修款' : 'B · 原款');
 for(const id of ['refined','original']){
  document.getElementById(id).setAttribute('aria-pressed',String(id===selected));
 }
}
for(const id of ['refined','original']){
 document.getElementById(id).onclick=()=>{selected=id;update();};
}
narrow.addEventListener('change',update);
update();
const mirror=document.getElementById('mirror'),angle=document.getElementById('angle');
let start;
mirror.onpointerdown=e=>{start=[e.clientX,+angle.value];mirror.setPointerCapture(e.pointerId);};
mirror.onpointermove=e=>{if(start)angle.value=start[1]+(e.clientX-start[0])*.15;};
mirror.onlostpointercapture=()=>start=null;

if (medalStudy) {
 const syncGlint = () => card.style.setProperty('--glint', (Number(angle.value) * 4) + 'deg');
 angle.addEventListener('input', syncGlint);
 for (const surface of [document.getElementById('stage'), mirror]) {
  surface.addEventListener('pointermove', syncGlint);
 }
}
