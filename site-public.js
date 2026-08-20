function escSite(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
async function applySite(){
 const s=await loadSiteRemote();
 const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
 set('brandText',s.brand); set('heroTag',s.tag); set('heroTitle',s.heroTitle); set('heroAccent',s.heroAccent); set('heroText',s.heroText);
 const stats=document.getElementById('heroStats'); if(stats) stats.innerHTML=(s.stats||[]).map(x=>`<div><b>${escSite(x[0])}</b><small>${escSite(x[1])}</small></div>`).join('');
 set('aboutTag',s.aboutTag);set('aboutTitle',s.aboutTitle);set('aboutText',s.aboutText);
 const features=document.getElementById('features');if(features)features.innerHTML=(s.features||[]).map(x=>`<span>✓ ${escSite(x)}</span>`).join('');
 const services=document.getElementById('servicesList');if(services)services.innerHTML=(s.services||[]).map(x=>`<article><i>${escSite(x.n)}</i><h3>${escSite(x.title)}</h3><p>${escSite(x.text)}</p></article>`).join('');
 const plans=document.getElementById('plansList');if(plans)plans.innerHTML=(s.plans||[]).map(x=>`<article class="plan ${x.hot?'hot':''}">${x.hot?'<label>الأكثر طلباً</label>':''}<h3>${escSite(x.title)}</h3><strong>₪${escSite(x.price)}</strong><em>${escSite(x.period)}</em><ul>${(x.features||[]).map(f=>`<li>${escSite(f)}</li>`).join('')}</ul><a class="btn ${x.hot?'orange':'outline'}" href="#contact">${x.hot?'اشترك الآن':'اشترك'}</a></article>`).join('');
 set('galleryTitle',s.galleryTitle);set('galleryNote',s.galleryNote);
 const gal=document.getElementById('galleryList');
 if(gal) gal.innerHTML=(s.gallery||[]).map(x=>{
   const item=typeof x==='string'?{text:x}:x;
   return item.image ? `<div class="gallery-image"><img src="${escSite(item.image)}" alt="${escSite(item.text||'')}"></div>` : `<div>${escSite(item.text||'')}</div>`;
 }).join('');
 set('contactTag',s.contactTag);set('contactTitle',s.contactTitle);set('contactText',s.contactText);set('phone',s.phone);set('whatsapp',s.whatsapp);set('address',s.address);set('hours',s.hours);set('footerText',s.footer);
 const wa=document.getElementById('whatsappLink');if(wa)wa.href='https://wa.me/'+String(s.whatsapp||'').replace(/\D/g,'');
}
document.addEventListener('DOMContentLoaded',()=>applySite().catch(e=>console.error(e)));
