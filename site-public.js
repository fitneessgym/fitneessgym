
function publicMediaUrl(value){
 const raw=String(value??'').trim();
 if(!raw) return '';
 if(/^https?:\/\//i.test(raw) || /^(data:|blob:|\/|\.\.?\/)/i.test(raw)) return raw;
 try{
   if(window.supabaseClient && typeof window.supabaseClient.storage?.from==='function'){
     const path=raw.replace(/^site-media[\/:]/i,'');
     return window.supabaseClient.storage.from('site-media').getPublicUrl(path).data.publicUrl || raw;
   }
 }catch(e){}
 return raw;
}

function renderWorkouts(s){
 const list=document.getElementById('workoutList'), filters=document.getElementById('workoutFilters');
 const fallbackImages={
   'Bench Press':'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=85',
   'Incline Dumbbell Press':'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=85',
   'Cable Crossover':'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=85',
   'Lat Pulldown':'https://images.unsplash.com/photo-1583454110551-21f7a7f2c6f5?auto=format&fit=crop&w=900&q=85',
   'Seated Row':'https://images.unsplash.com/photo-1583454110551-21f7a7f2c6f5?auto=format&fit=crop&w=900&q=85',
   'Shoulder Press':'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=900&q=85',
   'Lateral Raise':'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=900&q=85',
   'Dumbbell Curl':'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=900&q=85',
   'Cable Pushdown':'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=85',
   'Leg Press':'https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=900&q=85',
   'Squat':'https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=900&q=85',
   'Leg Curl':'https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=900&q=85',
   'Calf Raise':'https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=900&q=85',
   'Treadmill Walk/Run':'https://images.unsplash.com/photo-1576678927484-cc907957088c?auto=format&fit=crop&w=900&q=85',
   'Bike':'https://images.unsplash.com/photo-1576678927484-cc907957088c?auto=format&fit=crop&w=900&q=85',
   'Stair Climber':'https://images.unsplash.com/photo-1576678927484-cc907957088c?auto=format&fit=crop&w=900&q=85',
   'Plank':'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=85',
   'Cable Crunch':'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=85'
 };
 if(!list)return;
 const imageMap={
   'Bench Press':'assets/workouts/02-chest-press-pec-fly.webp',
   'Incline Dumbbell Press':'assets/workouts/02-chest-press-pec-fly.webp',
   'Cable Crossover':'assets/workouts/08-cable-machine-bench.webp',
   'Lat Pulldown':'assets/workouts/01-lat-pulldown-seated-row.webp',
   'Seated Row':'assets/workouts/01-lat-pulldown-seated-row.webp',
   'Shoulder Press':'assets/workouts/06-shoulder-press-lateral-raise.webp',
   'Lateral Raise':'assets/workouts/06-shoulder-press-lateral-raise.webp',
   'Dumbbell Curl':'assets/workouts/07-bicep-curl-tricep-extension.webp',
   'Cable Pushdown':'assets/workouts/07-bicep-curl-tricep-extension.webp',
   'Leg Press':'assets/workouts/03-leg-press.webp',
   'Squat':'assets/workouts/03-leg-press.webp',
   'Leg Curl':'assets/workouts/04-leg-extension-curl.webp',
   'Calf Raise':'assets/workouts/03-leg-press.webp',
   'Cable Crunch':'assets/workouts/08-cable-machine-bench.webp',
   'Adductor / Abductor':'assets/workouts/05-adductor-abductor.webp',
   'Adductor/Abductor':'assets/workouts/05-adductor-abductor.webp'
 };
 const workouts=Array.isArray(s.workouts)?s.workouts.map(x=>({...x,image:imageMap[x.title]||publicMediaUrl(x.image)})):[];
 if(!workouts.some(x=>x.title==='Adductor / Abductor')){
   workouts.push({day:'أرجل',title:'Adductor / Abductor',muscle:'الفخذ الداخلي والخارجي',equipment:'Adductor / Abductor',sets:'3',reps:'12–15',rest:'60 ثانية',goal:'بناء',image:imageMap['Adductor / Abductor']});
 }
 const cats=['الكل',...new Set(workouts.map(x=>x.day).filter(Boolean))];
 let active='الكل';
 const esc=escSite;
 const draw=()=>{
   if(filters) filters.innerHTML=cats.map(c=>`<button type="button" class="workout-filter ${c===active?'active':''}" data-wfilter="${esc(c)}">${esc(c)}</button>`).join('');
   const visible=active==='الكل'?workouts:workouts.filter(x=>x.day===active);
   list.innerHTML=visible.map((x)=>{
     const src=x.image||fallbackImages[x.title];
     const img=src?`<img src="${esc(src)}" alt="${esc(x.title)}" loading="${i<2?'eager':'lazy'}" decoding="async" onerror="if(this.dataset.fallback && this.src!==this.dataset.fallback){this.src=this.dataset.fallback}else{this.style.display='none';this.parentElement.classList.add('image-failed')}" data-fallback="${esc(fallbackImages[x.title]||'')}">`:`<div class="workout-placeholder">🏋️</div>`;
     return `<article class="workout-card"><div class="workout-media">${img}<span class="workout-goal">${esc(x.goal||'عام')}</span></div><div class="workout-body"><span class="workout-day">${esc(x.day||'تمرين')}</span><h3>${esc(x.title||'تمرين')}</h3><p><b>العضلة:</b> ${esc(x.muscle||'—')}<br><b>الجهاز:</b> ${esc(x.equipment||'—')}</p><div class="workout-meta"><span>🔁 ${esc(x.sets||'—')} × ${esc(x.reps||'—')}</span><span>⏱ ${esc(x.rest||'—')}</span></div></div></article>`;
   }).join('') || '<p class="note">لا توجد تدريبات في هذه الفئة.</p>';
   filters?.querySelectorAll('[data-wfilter]').forEach(b=>b.addEventListener('click',()=>{active=b.dataset.wfilter;draw();}));
 };
 draw();
}
function setupCalorieCalculator(s){
 const form=document.getElementById('calorieForm'); if(!form)return;
 const result=document.getElementById('calorieResult');
 const title=document.getElementById('calorieTitle'); const note=document.getElementById('calorieNote');
 if(title&&s.calorieTitle)title.textContent=s.calorieTitle;if(note&&s.calorieNote)note.textContent=s.calorieNote;
 if(form.dataset.calReady==='1') return;
 form.dataset.calReady='1';
 form.addEventListener('submit',e=>{
   e.preventDefault();
   const sex=document.getElementById('calSex').value, age=Number(document.getElementById('calAge').value), weight=Number(document.getElementById('calWeight').value), height=Number(document.getElementById('calHeight').value), activity=Number(document.getElementById('calActivity').value), body=document.getElementById('calBody').value, goal=document.getElementById('calGoal').value;
   if(!age||!weight||!height){result.innerHTML='<div class="result-placeholder">يرجى تعبئة العمر والوزن والطول.</div>';return;}
   const bmr=10*weight+6.25*height-5*age+(sex==='male'?5:-161);
   const tdee=Math.round(bmr*activity);
   let target=tdee, label='المحافظة على الوزن';
   if(goal==='build'){target=tdee+250;label='بناء عضل مع فائض معتدل';}
   if(goal==='cut'){target=Math.round(tdee*0.80);label='تنشيف مع عجز معتدل';}
   if(goal==='cardio'){target=Math.round(tdee*0.95);label='كارديو ولياقة';}
   const range=Math.round(target*0.05);
   const bodyLabel={ectomorph:'نحيف / Ectomorph',mesomorph:'رياضي / Mesomorph',endomorph:'ممتلئ / Endomorph'}[body]||body;
   result.innerHTML=`<div class="result-main"><span>احتياجك التقديري</span><strong>${target.toLocaleString('en-US')} سعرة/اليوم</strong><small>${Math.max(0,target-range).toLocaleString('en-US')} – ${ (target+range).toLocaleString('en-US')} نطاق تقريبي</small></div><div class="result-grid"><div><b>${Math.round(bmr).toLocaleString('en-US')}</b><small>BMR</small></div><div><b>${tdee.toLocaleString('en-US')}</b><small>TDEE</small></div><div><b>${label}</b><small>الهدف</small></div><div><b>${bodyLabel}</b><small>نوع الجسم</small></div></div><p class="result-tip">ابدأ بهذا الرقم كخط أساس وراقب الوزن والأداء لمدة 2–3 أسابيع، ثم عدّل السعرات تدريجيًا حسب النتيجة.</p>`;
 });
}

function escSite(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
function renderSite(s){
 const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
 set('brandText',s.brand); set('heroTag',s.tag); set('heroTitle',s.heroTitle); set('heroAccent',s.heroAccent); set('heroText',s.heroText);
 const stats=document.getElementById('heroStats'); if(stats) stats.innerHTML=(s.stats||[]).map(x=>`<div><b>${escSite(x[0])}</b><small>${escSite(x[1])}</small></div>`).join('');
 set('aboutTag',s.aboutTag);set('aboutTitle',s.aboutTitle);set('aboutText',s.aboutText);
 const features=document.getElementById('features');if(features)features.innerHTML=(s.features||[]).map(x=>`<span>✓ ${escSite(x)}</span>`).join('');
 const services=document.getElementById('servicesList');if(services)services.innerHTML=(s.services||[]).map(x=>`<article><i>${escSite(x.n)}</i><h3>${escSite(x.title)}</h3><p>${escSite(x.text)}</p></article>`).join('');
 const plans=document.getElementById('plansList');if(plans)plans.innerHTML=(s.plans||[]).map(x=>`<article class="plan ${x.hot?'hot':''}">${x.hot?'<label>الأكثر طلباً</label>':''}<h3>${escSite(x.title)}</h3><strong>₪${escSite(x.price)}</strong><em>${escSite(x.period)}</em><ul>${(x.features||[]).map(f=>`<li>${escSite(f)}</li>`).join('')}</ul><a class="btn ${x.hot?'orange':'outline'}" href="#contact">${x.hot?'اشترك الآن':'اشترك'}</a></article>`).join('');
 renderWorkouts(s);
 setupCalorieCalculator(s);
 set('galleryTitle',s.galleryTitle);set('galleryNote',s.galleryNote);
 const gal=document.getElementById('galleryList');
 if(gal) gal.innerHTML=(s.gallery||[]).map((x,i)=>{
   const defaults=[
     'assets/gallery/gallery-1.webp',
     'assets/gallery/gallery-2.webp',
     'assets/gallery/gallery-3.webp',
     'assets/gallery/gallery-4.webp',
     'assets/gallery/gallery-5.webp'
   ];
   const item=typeof x==='string'?{text:x,image:defaults[i%defaults.length]}:{...x};
   item.image=publicMediaUrl(item.image);
   if(!item.image) item.image=defaults[i%defaults.length];
   if(!item.image) return `<div>${escSite(item.text||'')}</div>`;
   const type=item.mediaType||(/^(data:video\/)|\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(item.image)?'video':(/^(data:image\/gif)|\.gif(\?|$)/i.test(item.image)?'gif':'image'));
   if(type==='video') return `<div class="gallery-image gallery-video"><video src="${escSite(item.image)}" autoplay muted loop playsinline controls preload="metadata"></video><span class="gallery-caption">${escSite(item.text||'')}</span></div>`;
   const loading=i===0?'eager':'lazy';
   const priority=i===0?' fetchpriority="high"':'';
   return `<div class="gallery-image"><img src="${escSite(item.image)}" alt="${escSite(item.text||'FITNESS GYM')}" loading="${loading}" decoding="async"${priority} onerror="if(this.dataset.fallback && this.src!==this.dataset.fallback){this.src=this.dataset.fallback}else{this.style.display='none';this.classList.add('image-failed')}" data-fallback="${escSite(defaults[i%defaults.length])}"></div>`;
 }).join('');
 set('contactTag',s.contactTag);set('contactTitle',s.contactTitle);set('contactText',s.contactText);set('phone',s.phone);set('whatsapp',s.whatsapp);set('address',s.address);set('hours',s.hours);set('footerText',s.footer);
 const wa=document.getElementById('whatsappLink');if(wa)wa.href='https://wa.me/'+String(s.whatsapp||'').replace(/\D/g,'');
}

async function applySite(){
  // Paint cached/default content immediately; remote data loads in the background.
  const local=loadSiteLocal();
  renderSite(local);
  const remote=await fetchSiteRemote();
  if(remote){
    // Never replace a locally cached real gallery with an empty/default gallery.
    const merged={...local,...remote};
    if(!Array.isArray(remote.gallery) || remote.gallery.length===0){
      merged.gallery=Array.isArray(local.gallery)?local.gallery:merged.gallery;
    }
    renderSite(merged);
  }
}
document.addEventListener('DOMContentLoaded',()=>applySite().catch(e=>console.error(e)));
