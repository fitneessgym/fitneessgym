document.querySelector('.menu')?.addEventListener('click',()=>{
  document.querySelector('.nav')?.classList.toggle('open');
});
document.querySelectorAll('nav a').forEach(a=>a.addEventListener('click',()=>{
  document.querySelector('.nav')?.classList.remove('open');
}));
const year=document.getElementById('year');
if(year) year.textContent=new Date().getFullYear();

function sendForm(e){
  e.preventDefault();
  const n=document.getElementById('name')?.value?.trim() || '';
  alert('شكراً '+n+'! تم استلام طلبك.');
}
