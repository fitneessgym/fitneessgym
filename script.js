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
  const n=document.getElementById('contactName')?.value?.trim() || '';
  const p=document.getElementById('contactPhone')?.value?.trim() || '';
  const plan=document.getElementById('plan')?.value || '';
  const msg=document.getElementById('message')?.value?.trim() || '';
  const business=window.FITNESS_GYM_WHATSAPP || document.getElementById('whatsapp')?.textContent || '+972546700672';
  const digits=String(business).replace(/\D/g,'');
  const text=['مرحبًا FITNESS GYM 👋','أريد حجز تجربة:', '', 'الاسم: '+n,'الهاتف: '+p,'الاشتراك: '+plan, msg ? 'ملاحظات: '+msg : ''].filter(Boolean).join('\n');
  window.open('https://wa.me/'+digits+'?text='+encodeURIComponent(text),'_blank');
}
