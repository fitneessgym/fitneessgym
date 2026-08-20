(() => {
  "use strict";
  if (typeof protectAdminPage === 'function' && !protectAdminPage()) return;

  const supabase = window.supabaseClient;
  if (!supabase) { alert('تعذر الاتصال بقاعدة البيانات.'); return; }

  const $=id=>document.getElementById(id);
  const money=n=>`₪${Number(n||0).toLocaleString('en-US')}`;
  const today=()=>new Date().toISOString().slice(0,10);
  const cid=()=>`CUS-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
  const iid=()=>`INV-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  const pid=()=>`PAY-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  const fullName=c=>[c?.first_name,c?.second_name,c?.last_name].filter(Boolean).join(' ') || c?.name || '—';
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const waNumber=v=>{let d=String(v||'').replace(/\D/g,'');if(d.startsWith('00'))d=d.slice(2);if(d.startsWith('0'))d='970'+d.slice(1);return d;};
  const waLink=(phone,text)=>'https://wa.me/'+waNumber(phone)+'?text='+encodeURIComponent(text);
  const invoiceMessage=(i,c)=>['فاتورة FITNESS GYM 🧾','', 'رقم الفاتورة: '+i.id,'العميل: '+(c?.name||'—'),'النوع: '+(i.type||'—'),'المبلغ: '+money(i.amount),'التاريخ: '+(i.date||'—'), i.note ? 'الوصف: '+i.note : '', '', 'شكرًا لتعاملكم مع FITNESS GYM 💪'].filter(Boolean).join('\n');
  const customerMessage=c=>['مرحبًا '+(c?.name||'')+' 👋','معك FITNESS GYM.','كيف يمكننا مساعدتك اليوم؟ 💪'].join('\n');
  let customers=[],invoices=[],payments=[],workoutLogs=[],workouts=[],nutritionProfiles=[],customerNutrition=[];

  const getCustomer=id=>customers.find(c=>String(c.id)===String(id));
  const debt=c=>Math.max(0,Number(c.total||0)-Number(c.paid||0));

  async function loadData(){
    const results=await Promise.all([
      supabase.from('customers').select('*').order('created_at',{ascending:false}),
      supabase.from('invoices').select('*').order('date',{ascending:false}),
      supabase.from('payments').select('*').order('date',{ascending:false}),
      supabase.from('workout_logs').select('*').order('workout_date',{ascending:false}).order('created_at',{ascending:false}),
      supabase.from('site_settings').select('data').eq('id',1).maybeSingle(),
      supabase.from('customer_nutrition_profiles').select('*').order('updated_at',{ascending:false}),
      supabase.from('customer_nutrition').select('*')
    ]);
    const [c,i,p,w,st,n,cn]=results;
    if(c.error) throw c.error; if(i.error) throw i.error; if(p.error) throw p.error; if(w.error) throw w.error;
    if(n.error && n.error.code!=='42P01') throw n.error;
    if(cn.error && cn.error.code!=='42P01') throw cn.error;
    customers=c.data||[]; invoices=i.data||[]; payments=p.data||[]; workoutLogs=w.data||[]; nutritionProfiles=n.data||[]; customerNutrition=cn.data||[];
    workouts=Array.isArray(st?.data?.workouts)?st.data.workouts:[];
  }

  function fillSelects(){
    const opts=customers.map(c=>`<option value="${esc(c.id)}">${esc(fullName(c))} — ${esc(c.phone)}</option>`).join('')||'<option value="">لا يوجد عملاء</option>';
    ['debtCustomer','paymentCustomer','invoiceCustomer','logCustomer','logFilterCustomer'].forEach(id=>{if($(id)) $(id).innerHTML=opts;});
  }

  function renderCustomers(){
    const body=$('customersBody'); if(!body)return;
    const q=($('customerSearch')?.value||'').trim().toLocaleLowerCase();
    body.innerHTML=customers.filter(c=>`${fullName(c)} ${c.phone||''}`.toLocaleLowerCase().includes(q)).map(c=>`
      <tr><td><b>${esc(fullName(c))}</b><small>${esc(c.phone)}</small></td>
      <td>${esc(c.plan||'')}</td><td>${money(c.total)}</td><td>${money(c.paid)}</td><td>${money(debt(c))}</td>
      <td>${esc(c.start||'—')}<br>${esc(c.end||'—')}</td>
      <td><button class="mini" type="button" onclick="openPlayerWorkoutLog('${esc(c.id)}')">تمارينه</button> <button class="mini" type="button" onclick="setPlayerPin('${esc(c.id)}')">PIN</button> <button class="mini" type="button" onclick="messageCustomerWhatsApp('${esc(c.id)}')">واتساب</button> <button class="mini danger" type="button" onclick="deleteCustomer('${esc(c.id)}')">حذف</button></td></tr>`).join('')
      ||'<tr><td colspan="7" class="empty">لا يوجد عملاء بعد</td></tr>';
  }

  function renderDebts(){
    const body=$('debtsBody'); if(!body)return;
    body.innerHTML=customers.filter(c=>debt(c)>0).map(c=>`
      <tr><td><b>${esc(fullName(c))}</b></td><td>${esc(c.phone)}</td><td>${money(c.total)}</td><td>${money(c.paid)}</td><td class="debt-cell">${money(debt(c))}</td>
      <td><button class="mini" type="button" onclick="quickPay('${esc(c.id)}')">تسديد</button></td></tr>`).join('')
      ||'<tr><td colspan="6" class="empty">لا توجد ديون حالياً 🎉</td></tr>';
  }

  function renderInvoices(){
    const body=$('invoicesBody'); if(!body)return;
    body.innerHTML=invoices.map(i=>{
      const c=getCustomer(i.customer_id);
      return `<tr><td>${esc(i.id)}</td><td>${c?esc(c.name):'—'}</td><td>${esc(i.type||'')}</td><td>${money(i.amount)}</td><td>${esc(i.date||'—')}</td>
      <td><button class="mini" type="button" onclick="sendInvoiceWhatsApp('${esc(i.id)}')">واتساب</button> <button class="mini danger" type="button" onclick="deleteInvoice('${esc(i.id)}')">حذف</button></td></tr>`;
    }).join('')||'<tr><td colspan="6" class="empty">لا توجد فواتير بعد</td></tr>';
  }

  function render(){
    const d=customers.reduce((s,c)=>s+debt(c),0);
    const p=customers.reduce((s,c)=>s+Number(c.paid||0),0);
    const inv=invoices.reduce((s,i)=>s+Number(i.amount||0),0);
    if($('statCustomers'))$('statCustomers').textContent=customers.length;
    if($('statInvoices'))$('statInvoices').textContent=money(inv);
    if($('statDebts'))$('statDebts').textContent=money(d);
    if($('statPaid'))$('statPaid').textContent=money(p);
    renderCustomers();renderDebts();renderInvoices();renderWorkoutLogs();renderNutrition();fillSelects();fillWorkoutSelect();fillNutritionSelects();
    window.renderProducts?.();
  }

  function fillWorkoutSelect(){
    const opts=workouts.map((w,i)=>`<option value="${i}">${esc(w.day||'')} — ${esc(w.title||'تمرين')}</option>`).join('')||'<option value="">لا توجد تمارين في المكتبة — اكتب اسم التمرين أسفل القائمة</option>';
    if($('logWorkout'))$('logWorkout').innerHTML=opts;
    if($('logFilterCustomer')){
      const current=$('logFilterCustomer').value;
      $('logFilterCustomer').innerHTML='<option value="">كل اللاعبين</option>'+customers.map(c=>`<option value="${esc(c.id)}">${esc(fullName(c))}</option>`).join('');
      $('logFilterCustomer').value=current;
    }
  }
  function renderWorkoutLogs(){
    const body=$('workoutLogsBody'); if(!body)return;
    const cidFilter=$('logFilterCustomer')?.value||''; const dateFilter=$('logFilterDate')?.value||'';
    const rows=workoutLogs.filter(l=>(!cidFilter||String(l.customer_id)===String(cidFilter))&&(!dateFilter||l.workout_date===dateFilter));
    body.innerHTML=rows.map(l=>{const c=getCustomer(l.customer_id);return `<tr><td><b>${esc(fullName(c))}</b></td><td>${esc(l.workout_title)}<small>${esc(l.workout_day||'')}</small></td><td>${esc(l.workout_date||'')}</td><td>${esc(l.sets_completed)}</td><td>${esc(l.reps||'—')}</td><td>${Number(l.weight||0)?esc(l.weight)+' كغ':'—'}</td><td>${esc(l.duration||'—')}</td><td>${esc(l.notes||'—')}</td><td><button class="mini danger" type="button" onclick="deleteWorkoutLog('${esc(l.id)}')">حذف</button></td></tr>`}).join('')||'<tr><td colspan="9" class="empty">لا يوجد سجل تمارين بعد.</td></tr>';
  }
  window.openPlayerWorkoutLog=id=>{document.querySelector('[data-tab="workouts"]')?.click();if($('logFilterCustomer')){$('logFilterCustomer').value=id;renderWorkoutLogs();}if($('logCustomer'))$('logCustomer').value=id;};
  window.setPlayerPin=async id=>{
    const c=getCustomer(id); if(!c)return;
    const pin=prompt('أدخل PIN جديد للاعب '+fullName(c)+' (4 إلى 12 رقمًا):','');
    if(pin===null)return;
    if(!/^\d{4,12}$/.test(pin.trim()))return alert('الـPIN يجب أن يكون من 4 إلى 12 رقمًا.');
    const {error}=await supabase.rpc('set_player_pin',{p_customer_id:id,p_pin:pin.trim()});
    if(error)return alert('تعذر حفظ PIN اللاعب:\n\n'+(error.message||error.details||''));
    alert('تم تحديث PIN اللاعب. أعطه للاعب ليستخدمه مع رقم هاتفه.');
    await refresh();
  };
  window.deleteWorkoutLog=async id=>{if(!confirm('حذف سجل التمرين؟'))return;const {error}=await supabase.from('workout_logs').delete().eq('id',id);if(error)return alert('تعذر حذف السجل:\n\n'+(error.message||error.details||''));await refresh();};

  function fillNutritionSelects(){
    const opts='<option value="">اختر اللاعب</option>'+customers.map(c=>`<option value="${esc(c.id)}">${esc(fullName(c))} — ${esc(c.phone)}</option>`).join('');
    if($('nutritionCustomer')) $('nutritionCustomer').innerHTML=opts;
    if($('nutritionFilterCustomer')) $('nutritionFilterCustomer').innerHTML='<option value="">كل اللاعبين</option>'+customers.map(c=>`<option value="${esc(c.id)}">${esc(fullName(c))}</option>`).join('');
  }
  function goalLabel(g){return ({build:'بناء عضل',cardio:'كارديو / لياقة',cut:'تنشيف / خسارة دهون'})[g]||g||'—';}
  function renderNutrition(){
    const body=$('nutritionBody'); if(!body)return;
    const filter=$('nutritionFilterCustomer')?.value||'';
    const rows=customers.filter(c=>!filter||String(c.id)===String(filter)).map(c=>{
      const p=nutritionProfiles.find(x=>String(x.customer_id)===String(c.id))||{};
      const n=customerNutrition.find(x=>String(x.customer_id)===String(c.id))||{};
      return {c,p,n};
    }).filter(x=>Object.keys(x.p).length||Object.keys(x.n).length);
    body.innerHTML=rows.map(({c,p,n})=>{
      const calories=n.daily_calories ?? p.target_calories ?? 0;
      const protein=n.protein_g ?? p.protein_g ?? 0;
      const carbs=n.carbs_g ?? p.carbs_g ?? 0;
      const fats=n.fat_g ?? n.fats_g ?? p.fats_g ?? 0;
      const goal=n.fitness_goal ?? n.goal ?? p.goal;
      return `<tr><td><b>${esc(fullName(c))}</b></td><td>${Math.round(p.bmr||0)}</td><td>${Math.round(p.tdee||0)}</td><td><b>${Math.round(calories)}</b></td><td>${esc(goalLabel(goal))}</td><td>${Math.round(protein)}غ</td><td>${Math.round(carbs)}غ</td><td>${Math.round(fats)}غ</td></tr>`;
    }).join('')||'<tr><td colspan="8" class="empty">لا توجد ملفات تغذية بعد.</td></tr>';
  }
  $('nutritionCustomer')?.addEventListener('change',()=>{
    const p=nutritionProfiles.find(x=>String(x.customer_id)===String($('nutritionCustomer').value)); if(!p)return;
    $('nutritionSex').value=p.sex||'male'; $('nutritionAge').value=p.age||''; $('nutritionWeight').value=p.weight||''; $('nutritionHeight').value=p.height||''; $('nutritionActivity').value=p.activity_level||1.55; $('nutritionBody').value=p.body_type||'mesomorph'; $('nutritionGoal').value=p.goal||'build';
  });
  $('nutritionFilterCustomer')?.addEventListener('change',renderNutrition);
  $('nutritionForm')?.addEventListener('submit',async e=>{
    e.preventDefault();
    const customerId=$('nutritionCustomer').value, sex=$('nutritionSex').value, age=Number($('nutritionAge').value), weight=Number($('nutritionWeight').value), height=Number($('nutritionHeight').value), activity=Number($('nutritionActivity').value), bodyType=$('nutritionBody').value, goal=$('nutritionGoal').value;
    if(!getCustomer(customerId)||!age||!weight||!height)return alert('أدخل اللاعب والعمر والوزن والطول.');
    const bmr=10*weight+6.25*height-5*age+(sex==='male'?5:-161); const tdee=bmr*activity; let target=tdee;
    if(goal==='build') target=tdee+250; else if(goal==='cut') target=tdee*0.8; else if(goal==='cardio') target=tdee*0.95;
    const protein=Math.max(1.6*weight,0), fats=Math.max(0.7*weight,0), carbs=Math.max((target-protein*4-fats*9)/4,0);
    const payload={customer_id:customerId,sex,age,weight,height,body_type:bodyType,goal,activity_level:activity,bmr,tdee,target_calories:target,protein_g:protein,carbs_g:carbs,fats_g:fats};
    // Save through a protected RPC so RLS/upsert schema-cache differences cannot block the nutrition profile.
    const {error}=await supabase.rpc('save_player_nutrition',{
      p_customer_id:customerId, p_sex:sex, p_age:age, p_weight:weight, p_height:height,
      p_body_type:bodyType, p_goal:goal, p_activity_level:activity, p_bmr:bmr, p_tdee:tdee,
      p_target_calories:target, p_protein_g:protein, p_carbs_g:carbs, p_fats_g:fats
    });
    if(error)return alert('تعذر حفظ ملف السعرات:\n\n'+(error.message||error.details||''));
    await refresh(); $('nutritionCustomer').value=customerId; alert('تم حساب وحفظ السعرات للاعب بنجاح.');
  });

  async function refresh(){try{await loadData();render();}catch(e){console.error(e);alert('تعذر تحميل بيانات الإدارة:\\n\\n'+(e.message||e.details||'خطأ غير معروف'));}}

  $('customerForm')?.addEventListener('submit',async e=>{
    e.preventDefault();
    const first=$('customerFirstName').value.trim(),second=$('customerSecondName').value.trim(),last=$('customerLastName').value.trim(),phone=$('customerPhone').value.trim();
    const name=[first,second,last].join(' ').trim();
    const total=Number($('customerTotal').value||0),paid=Number($('customerPaid').value||0);
    if(!first||!second||!last||!phone)return alert('أدخل الاسم الأول والثاني والأخير ورقم الهاتف.');
    if(paid>total)return alert('المبلغ المدفوع لا يمكن أن يكون أكبر من الإجمالي.');
    if(customers.some(c=>fullName(c).trim().toLocaleLowerCase()===name.toLocaleLowerCase()))return alert('يوجد لاعب آخر بنفس الاسم.');
    const pin=$('customerPin').value.trim(); if(!/^\d{4,12}$/.test(pin))return alert('PIN اللاعب يجب أن يكون من 4 إلى 12 رقمًا.');
    const customerId=cid();
    const payload={id:customerId,name,first_name:first,second_name:second,last_name:last,phone,plan:$('customerPlan').value,total,paid,start:$('customerStart').value||null,end:$('customerEnd').value||null};
    const {error}=await supabase.from('customers').insert(payload);
    if(error)return alert('تعذر حفظ العميل:\n\n'+(error.message||error.details||''));
    const {error:pinError}=await supabase.rpc('set_player_pin',{p_customer_id:customerId,p_pin:pin});
    if(pinError){await supabase.from('customers').delete().eq('id',customerId);return alert('تم إلغاء حفظ العميل لأن PIN لم يُحفظ:\n\n'+(pinError.message||pinError.details||''));}
    e.target.reset();await refresh();alert('تم حفظ العميل وPIN بنجاح.');
  });

  $('logWorkout')?.addEventListener('change',()=>{
    const wi=$('logWorkout').value==='' ? -1 : Number($('logWorkout').value);
    const w=wi>=0?workouts[wi]:null;
    if(!w)return;
    if($('logCustomTitle')) $('logCustomTitle').value=w.title||'';
    if($('logDay') && !$('logDay').value) $('logDay').value=w.day||'';
    if($('logSets') && !$('logSets').value) $('logSets').value=w.sets||'';
    if($('logReps') && !$('logReps').value) $('logReps').value=w.reps||'';
  });

  $('workoutLogForm')?.addEventListener('submit',async e=>{
    e.preventDefault();
    const customerId=$('logCustomer').value;
    const customTitle=$('logCustomTitle')?.value.trim()||'';
    const wi=$('logWorkout').value==='' ? -1 : Number($('logWorkout').value);
    const w=wi>=0?workouts[wi]:null;
    const title=customTitle || w?.title || '';
    const day=$('logDay')?.value.trim() || w?.day || '';
    if(!getCustomer(customerId))return alert('اختر اللاعب.');
    if(!title)return alert('اكتب اسم التمرين أولًا.');
    const sets=Math.max(0,Number($('logSets').value||0)), weight=Math.max(0,Number($('logWeight').value||0));
    const payload={customer_id:customerId,workout_title:title,workout_day:day,workout_date:$('logDate').value||today(),sets_completed:sets,reps:$('logReps').value.trim(),weight,notes:$('logNotes').value.trim()}; // V10: use only core columns known to exist; duration is optional and is not sent
    const {error}=await supabase.from('workout_logs').insert(payload);
    if(error)return alert('تعذر حفظ تمرين اللاعب:\n\n'+(error.message||error.details||''));
    e.target.reset();
    $('logDate').value=today();
    await refresh();
    $('logCustomer').value=customerId;
    alert('تمت إضافة التمرين للاعب مباشرة. سيظهر في بوابة اللاعب عند تسجيل الدخول من جديد.');

  });

  $('debtForm')?.addEventListener('submit',async e=>{
    e.preventDefault();
    const customerId=$('debtCustomer').value,amount=Number($('debtAmount').value||0),c=getCustomer(customerId);
    if(!c)return alert('اختر عميلاً.'); if(amount<=0)return alert('أدخل قيمة الدين.');
    const {error:u}=await supabase.from('customers').update({total:Number(c.total||0)+amount}).eq('id',customerId);
    if(u)return alert('تعذر تحديث الدين:\\n\\n'+(u.message||u.details||''));
    const {error:i}=await supabase.from('invoices').insert({id:iid(),customer_id:customerId,amount,type:'دين',date:$('debtDate').value||today(),note:$('debtNote').value.trim()||''});
    if(i)return alert('تم تحديث الدين لكن تعذر تسجيل الفاتورة:\\n\\n'+(i.message||i.details||''));
    e.target.reset();await refresh();alert('تمت إضافة الدين.');
  });

  $('paymentForm')?.addEventListener('submit',async e=>{
    e.preventDefault();
    const customerId=$('paymentCustomer').value,amount=Number($('paymentAmount').value||0),c=getCustomer(customerId);
    if(!c)return alert('اختر عميلاً.');
    if(amount<=0||amount>debt(c))return alert('قيمة الدفعة غير صحيحة.');
    const {error:u}=await supabase.from('customers').update({paid:Number(c.paid||0)+amount}).eq('id',customerId);
    if(u)return alert('تعذر تحديث المدفوع:\\n\\n'+(u.message||u.details||''));
    const {error:p}=await supabase.from('payments').insert({id:pid(),customer_id:customerId,amount,date:today(),note:$('paymentNote').value.trim()||''});
    if(p)return alert('تم تحديث المدفوع لكن تعذر تسجيل الدفعة:\\n\\n'+(p.message||p.details||''));
    e.target.reset();await refresh();alert('تم تسجيل الدفعة.');
  });

  $('invoiceForm')?.addEventListener('submit',async e=>{
    e.preventDefault();
    const customerId=$('invoiceCustomer').value,amount=Number($('invoiceAmount').value||0);
    if(!getCustomer(customerId))return alert('اختر عميلاً.');
    const {error}=await supabase.from('invoices').insert({id:iid(),customer_id:customerId,amount,type:$('invoiceType').value,date:$('invoiceDate').value||today(),note:$('invoiceNote').value.trim()||''});
    if(error)return alert('تعذر إصدار الفاتورة:\\n\\n'+(error.message||error.details||''));
    e.target.reset();$('invoiceDate').value=today();await refresh();alert('تم إصدار الفاتورة.');
  });

  $('customerSearch')?.addEventListener('input',renderCustomers);
  $('logFilterCustomer')?.addEventListener('change',renderWorkoutLogs);
  $('logFilterDate')?.addEventListener('change',renderWorkoutLogs);
  if($('logDate'))$('logDate').value=today();
  if($('invoiceDate'))$('invoiceDate').value=today();

  document.querySelectorAll('.dash-tab').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('.dash-tab').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.dash-panel').forEach(x=>x.classList.remove('active'));
    btn.classList.add('active');$('tab-'+btn.dataset.tab)?.classList.add('active');
    if(btn.dataset.tab==='store')window.renderProducts?.();
  }));

  window.quickPay=id=>{document.querySelector('[data-tab="debts"]')?.click();if($('paymentCustomer'))$('paymentCustomer').value=id;$('paymentAmount')?.focus();};

  window.messageCustomerWhatsApp=id=>{
    const c=getCustomer(id);
    if(!c)return alert('لم يتم العثور على العميل.');
    if(!waNumber(c.phone))return alert('رقم هاتف العميل غير صالح.');
    window.open(waLink(c.phone,customerMessage(c)),'_blank');
  };

  window.sendInvoiceWhatsApp=id=>{
    const i=invoices.find(x=>String(x.id)===String(id));
    const c=i?getCustomer(i.customer_id):null;
    if(!i)return alert('لم يتم العثور على الفاتورة.');
    if(!c)return alert('لم يتم العثور على العميل المرتبط بالفاتورة.');
    if(!waNumber(c.phone))return alert('رقم هاتف العميل غير صالح.');
    window.open(waLink(c.phone,invoiceMessage(i,c)),'_blank');
  };

  window.deleteCustomer=async id=>{
    if(!confirm('حذف العميل وكل فواتيره ودفعاته؟'))return;
    const {error}=await supabase.from('customers').delete().eq('id',id);
    if(error)return alert('تعذر حذف العميل:\\n\\n'+(error.message||error.details||''));
    await refresh();
  };

  window.deleteInvoice=async id=>{
    if(!confirm('حذف الفاتورة؟'))return;
    const {error}=await supabase.from('invoices').delete().eq('id',id);
    if(error)return alert('تعذر حذف الفاتورة:\\n\\n'+(error.message||error.details||''));
    await refresh();
  };

  window.exportData=async()=>{
    const blob=new Blob([JSON.stringify({customers,invoices,payments,workoutLogs},null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='fitness-gym-data.json';a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  };

  refresh();
})();
