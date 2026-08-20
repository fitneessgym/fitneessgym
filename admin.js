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
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const waNumber=v=>{let d=String(v||'').replace(/\D/g,'');if(d.startsWith('00'))d=d.slice(2);if(d.startsWith('0'))d='970'+d.slice(1);return d;};
  const waLink=(phone,text)=>'https://wa.me/'+waNumber(phone)+'?text='+encodeURIComponent(text);
  const invoiceMessage=(i,c)=>['فاتورة FITNESS GYM 🧾','', 'رقم الفاتورة: '+i.id,'العميل: '+(c?.name||'—'),'النوع: '+(i.type||'—'),'المبلغ: '+money(i.amount),'التاريخ: '+(i.date||'—'), i.note ? 'الوصف: '+i.note : '', '', 'شكرًا لتعاملكم مع FITNESS GYM 💪'].filter(Boolean).join('\n');
  const customerMessage=c=>['مرحبًا '+(c?.name||'')+' 👋','معك FITNESS GYM.','كيف يمكننا مساعدتك اليوم؟ 💪'].join('\n');
  let customers=[],invoices=[],payments=[];

  const getCustomer=id=>customers.find(c=>String(c.id)===String(id));
  const debt=c=>Math.max(0,Number(c.total||0)-Number(c.paid||0));

  async function loadData(){
    const [c,i,p]=await Promise.all([
      supabase.from('customers').select('*').order('created_at',{ascending:false}),
      supabase.from('invoices').select('*').order('date',{ascending:false}),
      supabase.from('payments').select('*').order('date',{ascending:false})
    ]);
    if(c.error) throw c.error;
    if(i.error) throw i.error;
    if(p.error) throw p.error;
    customers=c.data||[]; invoices=i.data||[]; payments=p.data||[];
  }

  function fillSelects(){
    const opts=customers.map(c=>`<option value="${esc(c.id)}">${esc(c.name)} — ${esc(c.phone)}</option>`).join('')||'<option value="">لا يوجد عملاء</option>';
    ['debtCustomer','paymentCustomer','invoiceCustomer'].forEach(id=>{if($(id)) $(id).innerHTML=opts;});
  }

  function renderCustomers(){
    const body=$('customersBody'); if(!body)return;
    const q=($('customerSearch')?.value||'').trim().toLocaleLowerCase();
    body.innerHTML=customers.filter(c=>`${c.name||''} ${c.phone||''}`.toLocaleLowerCase().includes(q)).map(c=>`
      <tr><td><b>${esc(c.name)}</b><small>${esc(c.phone)}</small></td>
      <td>${esc(c.plan||'')}</td><td>${money(c.total)}</td><td>${money(c.paid)}</td><td>${money(debt(c))}</td>
      <td>${esc(c.start||'—')}<br>${esc(c.end||'—')}</td>
      <td><button class="mini" type="button" onclick="messageCustomerWhatsApp('${esc(c.id)}')">واتساب</button> <button class="mini danger" type="button" onclick="deleteCustomer('${esc(c.id)}')">حذف</button></td></tr>`).join('')
      ||'<tr><td colspan="7" class="empty">لا يوجد عملاء بعد</td></tr>';
  }

  function renderDebts(){
    const body=$('debtsBody'); if(!body)return;
    body.innerHTML=customers.filter(c=>debt(c)>0).map(c=>`
      <tr><td><b>${esc(c.name)}</b></td><td>${esc(c.phone)}</td><td>${money(c.total)}</td><td>${money(c.paid)}</td><td class="debt-cell">${money(debt(c))}</td>
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
    renderCustomers();renderDebts();renderInvoices();fillSelects();
    window.renderProducts?.();
  }

  async function refresh(){try{await loadData();render();}catch(e){console.error(e);alert('تعذر تحميل بيانات الإدارة:\\n\\n'+(e.message||e.details||'خطأ غير معروف'));}}

  $('customerForm')?.addEventListener('submit',async e=>{
    e.preventDefault();
    const name=$('customerName').value.trim(),phone=$('customerPhone').value.trim();
    const total=Number($('customerTotal').value||0),paid=Number($('customerPaid').value||0);
    if(!name||!phone)return alert('أدخل اسم العميل ورقم الهاتف.');
    if(paid>total)return alert('المبلغ المدفوع لا يمكن أن يكون أكبر من الإجمالي.');
    if(customers.some(c=>String(c.name||'').trim().toLocaleLowerCase()===name.toLocaleLowerCase()))return alert('يوجد عميل آخر بنفس الاسم.');
    const payload={id:cid(),name,phone,plan:$('customerPlan').value,total,paid,start:$('customerStart').value||null,end:$('customerEnd').value||null};
    const {error}=await supabase.from('customers').insert(payload);
    if(error)return alert('تعذر حفظ العميل:\\n\\n'+(error.message||error.details||''));
    e.target.reset();await refresh();alert('تم حفظ العميل بنجاح.');
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
    const blob=new Blob([JSON.stringify({customers,invoices,payments},null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='fitness-gym-data.json';a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  };

  refresh();
})();
