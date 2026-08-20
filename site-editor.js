if(!isAdminLoggedIn()){window.location.replace('admin-login.html');throw new Error('Unauthorized');}
let site=loadSiteLocal();
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
function bindSimple(){['brand','heroTag','heroTitle','heroAccent','heroText','aboutTag','aboutTitle','aboutText','galleryTitle','galleryNote','contactTag','contactTitle','contactText','phone','whatsapp','address','hours','footer'].forEach(k=>{if($(k))$(k).value=site[k]??'';});}
function renderStats(){ $('statsList').innerHTML=site.stats.map((x,i)=>`<div class="repeat-item"><div class="field-grid"><div class="field"><label>القيمة</label><input data-stat-v="${i}" value="${esc(x[0])}"></div><div class="field"><label>الوصف</label><input data-stat-l="${i}" value="${esc(x[1])}"></div></div><button class="danger-btn" onclick="removeStat(${i})">حذف</button></div>`).join(''); }
function renderFeatures(){ $('featuresList').innerHTML=site.features.map((x,i)=>`<div class="repeat-item"><input data-feature="${i}" value="${esc(x)}"><button class="danger-btn" onclick="removeFeature(${i})">حذف</button></div>`).join(''); }
function renderServices(){ $('servicesEditor').innerHTML=site.services.map((x,i)=>`<div class="repeat-item"><div class="field-grid"><div class="field"><label>رقم</label><input data-sn="${i}" value="${esc(x.n)}"></div><div class="field"><label>اسم الخدمة</label><input data-st="${i}" value="${esc(x.title)}"></div><div class="field full"><label>الوصف</label><textarea data-sx="${i}" rows="2">${esc(x.text)}</textarea></div></div><button class="danger-btn" onclick="removeService(${i})">حذف الخدمة</button></div>`).join(''); }
function renderPlans(){ $('plansEditor').innerHTML=site.plans.map((x,i)=>`<div class="repeat-item"><div class="field-grid"><div class="field"><label>اسم الاشتراك</label><input data-pt="${i}" value="${esc(x.title)}"></div><div class="field"><label>السعر</label><input data-pp="${i}" value="${esc(x.price)}"></div><div class="field"><label>الفترة</label><input data-pper="${i}" value="${esc(x.period)}"></div><div class="field"><label>الأكثر طلباً</label><select data-ph="${i}"><option value="false" ${!x.hot?'selected':''}>لا</option><option value="true" ${x.hot?'selected':''}>نعم</option></select></div></div><div class="field"><label>مزايا الاشتراك (ميزة في كل سطر)</label><textarea data-pf="${i}" rows="4">${esc((x.features||[]).join('\n'))}</textarea></div><button class="danger-btn" onclick="removePlan(${i})">حذف الاشتراك</button></div>`).join(''); }
function galleryItem(x){return typeof x==='string'?{text:x,image:'',mediaType:'image'}:{text:x?.text||'',image:x?.image||'',mediaType:x?.mediaType||inferMediaType(x?.image||'')};}
function inferMediaType(src){const v=String(src||'').toLowerCase().split('?')[0]; if(v.startsWith('data:video/'))return 'video'; if(v.startsWith('data:image/gif'))return 'gif'; if(/\.(mp4|webm|ogg|mov|m4v)$/.test(v))return 'video'; if(/\.gif$/.test(v))return 'gif'; return 'image';}
function previewGalleryMedia(i,x){const src=esc(x.image||''); if(!src)return '<div class="gallery-preview empty" data-gallery-preview="'+i+'"></div>'; if(x.mediaType==='video')return '<video class="gallery-preview" data-gallery-preview="'+i+'" src="'+src+'" muted playsinline controls></video>'; return '<img class="gallery-preview" data-gallery-preview="'+i+'" src="'+src+'" alt="'+esc(x.text)+'">';}
function renderGallery(){
 $('galleryEditor').innerHTML=site.gallery.map((raw,i)=>{
   const x=galleryItem(raw);
   return `<div class="repeat-item">
     <div class="field-grid">
       <div class="field"><label>اسم/وصف الصورة</label><input data-gallery-text="${i}" value="${esc(x.text)}" placeholder="مثال: صالة الأوزان"></div>
       <div class="field"><label>رابط الصورة (اختياري)</label><input data-gallery-url="${i}" value="${esc(x.image)}" placeholder="https://..."></div>
     </div>
     <div class="field"><label>رفع صورة / GIF / فيديو قصير</label><input data-gallery-file="${i}" type="file" accept="image/*,video/mp4,video/webm,video/ogg,video/quicktime"></div>
     ${previewGalleryMedia(i,x)}
     <div class="repeat-actions"><button class="danger-btn" onclick="removeGallery(${i})">حذف الصورة</button><button type="button" class="danger-btn" onclick="clearGalleryImage(${i})">إزالة الصورة</button></div>
   </div>`;
 }).join('');
 document.querySelectorAll('[data-gallery-file]').forEach(input=>input.addEventListener('change',()=>handleGalleryFile(input)));
 document.querySelectorAll('[data-gallery-url]').forEach(input=>input.addEventListener('input',()=>{
   const i=+input.dataset.galleryUrl; const value=input.value.trim(); site.gallery[i]={...galleryItem(site.gallery[i]),image:value,mediaType:inferMediaType(value)}; renderGalleryPreviewOnly(i);
 }));
}
function compressImage(file,maxSide=1400,quality=.82){
 return new Promise((resolve,reject)=>{
   const reader=new FileReader();
   reader.onerror=()=>reject(new Error('تعذر قراءة الصورة'));
   reader.onload=()=>{
     const img=new Image();
     img.onload=()=>{
       const scale=Math.min(1,maxSide/Math.max(img.width,img.height));
       const canvas=document.createElement('canvas'); canvas.width=Math.max(1,Math.round(img.width*scale)); canvas.height=Math.max(1,Math.round(img.height*scale));
       const ctx=canvas.getContext('2d'); ctx.drawImage(img,0,0,canvas.width,canvas.height);
       resolve(canvas.toDataURL('image/jpeg',quality));
     };
     img.onerror=()=>reject(new Error('ملف الصورة غير صالح'));
     img.src=reader.result;
   };
   reader.readAsDataURL(file);
 });
}
function renderGalleryPreviewOnly(i){
 const raw=site.gallery[i]; const x=galleryItem(raw); const holder=document.querySelector(`[data-gallery-preview="${i}"]`);
 if(!holder)return; const wrap=holder.parentElement; if(!wrap)return;
 const temp=document.createElement('div'); temp.innerHTML=previewGalleryMedia(i,x); holder.replaceWith(temp.firstElementChild);
}
function readFileData(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onerror=()=>reject(new Error('تعذر قراءة الملف'));r.onload=()=>resolve(r.result);r.readAsDataURL(file);});}
async function handleGalleryFile(input){
 const file=input.files?.[0]; if(!file)return; const i=+input.dataset.galleryFile;
 try{
   const isVideo=file.type.startsWith('video/'); const isGif=file.type==='image/gif';
   const max=isVideo?10*1024*1024:12*1024*1024;
   if(file.size>max){alert(isVideo?'حجم الفيديو كبير جدًا. اختر فيديو قصيرًا أقل من 10MB.':'حجم الصورة كبير جدًا. اختر صورة أقل من 12MB.');input.value='';return;}
   let data;
   if(isVideo||isGif){ data=await readFileData(file); } else { data=await compressImage(file); }
   collect();
   site.gallery[i]={...galleryItem(site.gallery[i]),image:data,mediaType:isVideo?'video':(isGif?'gif':'image')};
   renderGallery();
 }catch(e){alert(e.message||'تعذر رفع الملف');}
}
function renderAll(){bindSimple();renderStats();renderFeatures();renderServices();renderPlans();renderGallery();}
function collect(){
 ['brand','heroTag','heroTitle','heroAccent','heroText','aboutTag','aboutTitle','aboutText','galleryTitle','galleryNote','contactTag','contactTitle','contactText','phone','whatsapp','address','hours','footer'].forEach(k=>{if($(k))site[k]=$(k).value.trim();});
 document.querySelectorAll('[data-stat-v]').forEach(e=>site.stats[+e.dataset.statV][0]=e.value.trim());document.querySelectorAll('[data-stat-l]').forEach(e=>site.stats[+e.dataset.statL][1]=e.value.trim());
 document.querySelectorAll('[data-feature]').forEach(e=>site.features[+e.dataset.feature]=e.value.trim());
 document.querySelectorAll('[data-sn]').forEach(e=>site.services[+e.dataset.sn].n=e.value.trim());document.querySelectorAll('[data-st]').forEach(e=>site.services[+e.dataset.st].title=e.value.trim());document.querySelectorAll('[data-sx]').forEach(e=>site.services[+e.dataset.sx].text=e.value.trim());
 document.querySelectorAll('[data-pt]').forEach(e=>site.plans[+e.dataset.pt].title=e.value.trim());document.querySelectorAll('[data-pp]').forEach(e=>site.plans[+e.dataset.pp].price=e.value.trim());document.querySelectorAll('[data-pper]').forEach(e=>site.plans[+e.dataset.pper].period=e.value.trim());document.querySelectorAll('[data-ph]').forEach(e=>site.plans[+e.dataset.ph].hot=e.value==='true');document.querySelectorAll('[data-pf]').forEach(e=>site.plans[+e.dataset.pf].features=e.value.split('\n').map(x=>x.trim()).filter(Boolean));
 document.querySelectorAll('[data-gallery-text]').forEach(e=>{const i=+e.dataset.galleryText;site.gallery[i]={...galleryItem(site.gallery[i]),text:e.value.trim()};});
 document.querySelectorAll('[data-gallery-url]').forEach(e=>{const i=+e.dataset.galleryUrl;site.gallery[i]={...galleryItem(site.gallery[i]),image:e.value.trim()};});
}
$('saveBtn').onclick=async()=>{
 collect();
 try{await saveSite(site);$('saveMsg').textContent='✓ تم حفظ جميع التعديلات بنجاح.';}
 catch(e){$('saveMsg').textContent='تعذر الحفظ في قاعدة البيانات: '+(e.message||'خطأ');}
 setTimeout(()=>$('saveMsg').textContent='',5000);
};
$('previewBtn').onclick=()=>window.open('index.html','_blank');
$('logoutBtn').onclick=logoutAdmin;
document.querySelectorAll('[data-editor]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-editor]').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.editor-section').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('editor-'+b.dataset.editor).classList.add('active');});
$('addStat').onclick=()=>{collect();site.stats.push(['+0','جديد']);renderStats();};$('addFeature').onclick=()=>{collect();site.features.push('ميزة جديدة');renderFeatures();};$('addService').onclick=()=>{collect();site.services.push({n:String(site.services.length+1).padStart(2,'0'),title:'خدمة جديدة',text:'وصف الخدمة'});renderServices();};$('addPlan').onclick=()=>{collect();site.plans.push({title:'اشتراك جديد',price:'0',period:'/ شهر',features:['ميزة جديدة'],hot:false});renderPlans();};$('addGallery').onclick=()=>{collect();site.gallery.push({text:'صورة جديدة',image:''});renderGallery();};
window.removeStat=i=>{collect();site.stats.splice(i,1);renderStats();};window.removeFeature=i=>{collect();site.features.splice(i,1);renderFeatures();};window.removeService=i=>{collect();site.services.splice(i,1);renderServices();};window.removePlan=i=>{collect();site.plans.splice(i,1);renderPlans();};window.removeGallery=i=>{collect();site.gallery.splice(i,1);renderGallery();};window.clearGalleryImage=i=>{collect();site.gallery[i]={...galleryItem(site.gallery[i]),image:'',mediaType:'image'};renderGallery();};
$('exportSite').onclick=()=>{collect();const blob=new Blob([JSON.stringify(site,null,2)],{type:'application/json'}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='fitness-gym-site-settings.json';a.click();URL.revokeObjectURL(u);$('backupMsg').textContent='✓ تم تصدير الإعدادات.';};
$('importSite').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{site={...cloneDefault(),...JSON.parse(r.result)};renderAll();$('backupMsg').textContent='✓ تم استيراد الإعدادات. اضغط حفظ التغييرات.';}catch(_){$('backupMsg').textContent='تعذر قراءة الملف.';}};r.readAsText(f);};
$('resetSite').onclick=()=>{if(confirm('إرجاع جميع إعدادات الموقع للوضع الافتراضي؟')){site=cloneDefault();renderAll();$('backupMsg').textContent='تمت استعادة الإعدادات الافتراضية. اضغط حفظ التغييرات.';}};
renderAll();
