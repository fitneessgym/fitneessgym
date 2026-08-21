(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const money = v => `₪${Number(v||0).toLocaleString('en-US')}`;
  const dateLabel = v => { if(!v) return '—'; try{return new Date(v+'T00:00:00').toLocaleDateString('ar-PS',{year:'numeric',month:'long',day:'numeric'});}catch(_){return v;} };
  const today = () => new Date().toISOString().slice(0,10);
  // Accept local Palestinian numbers (05xxxxxxxx) and international forms (+9705xxxxxxxx / 009705xxxxxxxx).
  const normalizePhone = value => {
    let d = String(value ?? '').replace(/\D/g,'');
    if(d.startsWith('00970')) d = d.slice(5);
    else if(d.startsWith('970')) d = d.slice(3);
    if(d.startsWith('5') && d.length === 9) d = '0' + d;
    return d;
  };
  const loginBox = $('playerLoginBox'), dash = $('playerDashboard'), form = $('playerLoginForm');
  let player = null;

  function workoutCard(w, future){
    const status = future ? '<span class="player-status upcoming">قادمة</span>' : '<span class="player-status done">منجزة</span>';
    return `<article class="player-workout-card"><div class="player-workout-top"><b>${esc(w.workout_title||'تمرين')}</b>${status}</div><div class="player-workout-date">📅 ${esc(dateLabel(w.workout_date))}${w.workout_day?' • '+esc(w.workout_day):''}</div><div class="player-workout-meta"><span>🔁 ${esc(w.sets_completed||0)} جولات</span><span>♻️ ${esc(w.reps||'—')}</span><span>🏋️ ${Number(w.weight||0)?esc(w.weight)+' كغ':'—'}</span><span>⏱ ${esc(w.duration||'—')}</span></div>${w.notes?`<p class="player-workout-notes">📝 ${esc(w.notes)}</p>`:''}</article>`;
  }

  function render(data){
    player=data.customer||{};
    $('playerName').textContent = [player.first_name,player.second_name,player.last_name].filter(Boolean).join(' ') || player.name || 'اللاعب';
    $('playerMembership').textContent = `الاشتراك: ${player.plan||'—'} • من ${dateLabel(player.start)} إلى ${dateLabel(player.end)}`;
    const logs=Array.isArray(data.workouts)?data.workouts.slice().sort((a,b)=>String(a.workout_date).localeCompare(String(b.workout_date))):[];
    const now=today();
    const upcoming=logs.filter(x=>String(x.workout_date)>=now);
    const history=logs.filter(x=>String(x.workout_date)<now).sort((a,b)=>String(b.workout_date).localeCompare(String(a.workout_date)));
    $('playerUpcoming').innerHTML=upcoming.length?upcoming.map(x=>workoutCard(x,true)).join(''):'<div class="player-empty">لا توجد تدريبات قادمة مسجلة لك حاليًا.</div>';
    $('playerHistory').innerHTML=history.length?history.map(x=>workoutCard(x,false)).join(''):'<div class="player-empty">لا يوجد سجل تمارين سابق بعد.</div>';
    const n=data.nutrition||null;
    const weekly=data.weekly_plan||null;
    const nutritionHtml=n?`<div class="player-nutrition-grid"><div><b>${Math.round(n.bmr||0)}</b><small>BMR</small></div><div><b>${Math.round(n.tdee||0)}</b><small>TDEE</small></div><div><b>${Math.round(n.target_calories ?? n.daily_calories ?? 0)}</b><small>السعرات المستهدفة</small></div><div><b>${Math.round(n.protein_g||0)}غ</b><small>بروتين</small></div><div><b>${Math.round(n.carbs_g||0)}غ</b><small>كربوهيدرات</small></div><div><b>${Math.round(n.fats_g||0)}غ</b><small>دهون</small></div></div>`:'<div class="player-empty">لم يتم حفظ ملف سعرات لك بعد.</div>';
    const menuHtml=weekly&&Array.isArray(weekly.days)?`<div class="player-weekly-head"><div><b>خطة الأكل لهذا الأسبوع</b><small>الهدف: ${esc(({build:'بناء عضل',cardio:'كارديو / لياقة',cut:'تنشيف / خسارة دهون'})[weekly.goal]||weekly.goal||'—')} • نوع الجسم: ${esc(({ectomorph:'نحيف',mesomorph:'رياضي',endomorph:'ممتلئ'})[weekly.body_type]||weekly.body_type||'—')}</small><small>تتحدث تلقائيًا مع بداية كل أسبوع</small></div><span class="weekly-plan-badge">${esc(weekly.week_start||'')}</span></div><div class="player-meal-days">${weekly.days.map(d=>`<article class="player-meal-day"><h4>${esc(d.day||'اليوم')} <small>${esc(d.date||'')}</small></h4>${(Array.isArray(d.meals)?d.meals:[]).map(m=>`<div class="player-meal"><div><b>${esc(m.name||'وجبة')}</b><span>${esc(m.food||'—')}</span></div><strong>${m.calories!=null?Math.round(Number(m.calories))+' kcal':''}</strong></div>`).join('')}</article>`).join('')}</div><p class="player-food-note">الخطة عامة للتوجيه وليست بديلًا عن تقييم اختصاصي تغذية. يمكن للإدارة تعديلها أسبوعيًا حسب احتياج اللاعب.</p>`:'<div class="player-empty">لا توجد خطة أكل أسبوعية محفوظة لك حاليًا.</div>';
    $('playerNutrition').innerHTML=nutritionHtml+`<div class="player-weekly-meals">${menuHtml}</div>`;
    $('playerSummary').innerHTML=`<div><b>${upcoming.length}</b><small>تمارين قادمة</small></div><div><b>${history.length}</b><small>تمارين سابقة</small></div><div><b>${player.phone||'—'}</b><small>رقم اللاعب</small></div>`;
    loginBox.hidden=true; dash.hidden=false;
    location.hash='player-portal';
  }

  form?.addEventListener('submit',async e=>{
    e.preventDefault();
    const rawPhone=$('playerPhone').value;
    const phone=normalizePhone(rawPhone), pin=$('playerPin').value.trim(), msg=$('playerLoginMsg');
    if(!phone || !/^\d{7,15}$/.test(phone)){ msg.textContent='أدخل رقم الهاتف بشكل صحيح، مثال: 0524500450.'; return; }
    if(!/^\d{4,12}$/.test(pin)){ msg.textContent='أدخل PIN مكوّنًا من 4 إلى 12 رقمًا.'; return; }
    const supabase = window.supabaseClient;
    if(!supabase){msg.textContent='تعذر تحميل الاتصال بقاعدة البيانات. أعد تحميل الصفحة وحاول مرة أخرى.';return;}
    msg.textContent='جاري التحقق...';
    try{
      const {data,error}=await supabase.rpc('player_login',{p_phone:phone,p_pin:pin});
      if(error){
        const code=String(error.code||'');
        const message=String(error.message||'');
        if(code==='PGRST202' || /player_login/i.test(message) && /does not exist|not found|schema cache/i.test(message))
          throw new Error('PLAYER_LOGIN_RPC_MISSING');
        if(code==='42501' || /permission denied|execute/i.test(message))
          throw new Error('PLAYER_LOGIN_RPC_DENIED');
        throw error;
      }
      if(!data?.customer)throw new Error('INVALID_LOGIN');

      // The player portal must read the current nutrition record from
      // customer_nutrition. Older player_login RPCs return the legacy
      // customer_nutrition_profiles record, so merge the current values here.
      try{
        const {data:currentNutrition, error:nutritionError}=await supabase
          .from('customer_nutrition')
          .select('*')
          .eq('customer_id', String(data.customer.id))
          .maybeSingle();
        if(!nutritionError && currentNutrition){
          data.nutrition = {
            ...(data.nutrition||{}),
            bmr: currentNutrition.bmr ?? data.nutrition?.bmr,
            tdee: currentNutrition.tdee ?? data.nutrition?.tdee,
            target_calories: currentNutrition.daily_calories ?? data.nutrition?.target_calories,
            protein_g: currentNutrition.protein_g ?? data.nutrition?.protein_g,
            carbs_g: currentNutrition.carbs_g ?? data.nutrition?.carbs_g,
            fats_g: currentNutrition.fat_g ?? currentNutrition.fats_g ?? data.nutrition?.fats_g
          };
        }
      }catch(_){ /* keep legacy RPC nutrition as fallback */ }

      sessionStorage.setItem('fitness_player_session','1');
      render(data); msg.textContent=''; form.reset();
    }catch(err){
      console.error(err);
      const message=String(err?.message||'');
      msg.textContent=message.includes('TOO_MANY_PLAYER_LOGIN_ATTEMPTS')
        ? 'تم إيقاف محاولات الدخول مؤقتًا بسبب كثرة المحاولات. حاول مرة أخرى بعد 15 دقيقة.'
        : message.includes('PLAYER_LOGIN_RPC_MISSING')
        ? 'بوابة اللاعب غير مكتملة في قاعدة البيانات. يجب تشغيل قسم Player Portal من ملف supabase-schema.sql في Supabase ثم إعادة المحاولة.'
        : message.includes('PLAYER_LOGIN_RPC_DENIED')
        ? 'صلاحية تسجيل دخول اللاعب غير مفعّلة في Supabase. شغّل قسم Player Portal من ملف supabase-schema.sql ثم أعد المحاولة.'
        : 'بيانات الدخول غير صحيحة. تأكد من رقم الهاتف وPIN، وإذا كان PIN جديدًا فعيّنه من زر PIN في لوحة الإدارة.';
    }
  });
  $('playerLogout')?.addEventListener('click',()=>{player=null;sessionStorage.removeItem('fitness_player_session');dash.hidden=true;loginBox.hidden=false;$('playerLoginMsg').textContent='تم تسجيل الخروج.';});
})();
