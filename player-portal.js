(() => {
  "use strict";
  const supabase = window.supabaseClient;
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const money = v => `₪${Number(v||0).toLocaleString('en-US')}`;
  const dateLabel = v => { if(!v) return '—'; try{return new Date(v+'T00:00:00').toLocaleDateString('ar-PS',{year:'numeric',month:'long',day:'numeric'});}catch(_){return v;} };
  const today = () => new Date().toISOString().slice(0,10);
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
    $('playerNutrition').innerHTML=n?`<div class="player-nutrition-grid"><div><b>${Math.round(n.bmr||0)}</b><small>BMR</small></div><div><b>${Math.round(n.tdee||0)}</b><small>TDEE</small></div><div><b>${Math.round(n.target_calories||0)}</b><small>السعرات المستهدفة</small></div><div><b>${Math.round(n.protein_g||0)}غ</b><small>بروتين</small></div><div><b>${Math.round(n.carbs_g||0)}غ</b><small>كربوهيدرات</small></div><div><b>${Math.round(n.fats_g||0)}غ</b><small>دهون</small></div></div>`:'<div class="player-empty">لم يتم حفظ ملف سعرات لك بعد.</div>';
    $('playerSummary').innerHTML=`<div><b>${upcoming.length}</b><small>تمارين قادمة</small></div><div><b>${history.length}</b><small>تمارين سابقة</small></div><div><b>${player.phone||'—'}</b><small>رقم اللاعب</small></div>`;
    loginBox.hidden=true; dash.hidden=false;
    location.hash='player-portal';
  }

  form?.addEventListener('submit',async e=>{
    e.preventDefault();
    const phone=$('playerPhone').value.trim(), pin=$('playerPin').value.trim(), msg=$('playerLoginMsg');
    if(!supabase){msg.textContent='تعذر الاتصال بقاعدة البيانات.';return;}
    msg.textContent='جاري التحقق...';
    try{
      const {data,error}=await supabase.rpc('player_login',{p_phone:phone,p_pin:pin});
      if(error)throw error;
      if(!data?.customer)throw new Error('INVALID_LOGIN');
      sessionStorage.setItem('fitness_player_session','1');
      render(data); msg.textContent=''; form.reset();
    }catch(err){console.error(err);msg.textContent='بيانات الدخول غير صحيحة أو لم يتم تفعيل حساب اللاعب بعد.';}
  });
  $('playerLogout')?.addEventListener('click',()=>{player=null;sessionStorage.removeItem('fitness_player_session');dash.hidden=true;loginBox.hidden=false;$('playerLoginMsg').textContent='تم تسجيل الخروج.';});
})();
