let db={customers:[],invoices:[]};

const money=n=>`₪${Number(n||0).toLocaleString('en-US')}`;
const today=()=>new Date().toISOString().slice(0,10);
const $=id=>document.getElementById(id);

const esc=v=>String(v??'').replace(
  /[&<>"']/g,
  m=>({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#039;'
  }[m])
);

function customerById(id){
  return db.customers.find(c=>c.id===id);
}

async function loadDB(){
  const [customersRes,invoicesRes]=await Promise.all([
    supabaseClient
      .from('customers')
      .select('*')
      .order('created_at',{ascending:false}),

    supabaseClient
      .from('invoices')
      .select('*')
      .order('date',{ascending:false})
  ]);

  if(customersRes.error) throw customersRes.error;
  if(invoicesRes.error) throw invoicesRes.error;

  db.customers=(customersRes.data||[]).map(c=>({
    id:c.id,
    name:c.name,
    phone:c.phone,
    plan:c.plan,
    total:Number(c.total||0),
    paid:Number(c.paid||0),
    start:c.start||'',
    end:c.end||''
  }));

  db.invoices=(invoicesRes.data||[]).map(i=>({
    id:i.id,
    customerId:i.customer_id,
    amount:Number(i.amount||0),
    type:i.type,
    date:i.date||'',
    note:i.note||''
  }));
}

async function saveCustomer(c){
  const {error}=await supabaseClient
    .from('customers')
    .upsert(
      {
        id:c.id,
        name:c.name,
        phone:c.phone,
        plan:c.plan,
        total:c.total,
        paid:c.paid,
        start:c.start||null,
        end:c.end||null
      },
      {onConflict:'id'}
    );

  if(error) throw error;
}

async function saveInvoice(i){
  const {error}=await supabaseClient
    .from('invoices')
    .upsert(
      {
        id:i.id,
        customer_id:i.customerId,
        amount:i.amount,
        type:i.type,
        date:i.date,
        note:i.note||''
      },
      {onConflict:'id'}
    );

  if(error) throw error;
}

async function deleteCustomerRemote(id){
  const {error}=await supabaseClient
    .from('customers')
    .delete()
    .eq('id',id);

  if(error) throw error;
}

async function deleteInvoiceRemote(id){
  const {error}=await supabaseClient
    .from('invoices')
    .delete()
    .eq('id',id);

  if(error) throw error;
}

function setBusy(form,busy,text){
  const btn=form?.querySelector('button[type="submit"]');

  if(!btn)return;

  btn.disabled=busy;
  btn.textContent=busy
    ? text
    : btn.dataset.defaultText||'حفظ';
}

function initDefaultButtonText(){
  document
    .querySelectorAll('button[type="submit"]')
    .forEach(b=>b.dataset.defaultText=b.textContent);
}

async function boot(){
  const admin=await requireAdmin();

  if(!admin)return;

  initDefaultButtonText();

  try{
    await loadDB();
    renderDashboard();
  }
  catch(e){
    console.error(e);
    alert('تعذر الاتصال بقاعدة البيانات. تأكد من إعداد Supabase وRLS.');
  }
}

document.querySelectorAll('.dash-tab').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document
      .querySelectorAll('.dash-tab')
      .forEach(x=>x.classList.remove('active'));

    document
      .querySelectorAll('.dash-panel')
      .forEach(x=>x.classList.remove('active'));

    btn.classList.add('active');

    const panel=$('tab-'+btn.dataset.tab);

    if(panel){
      panel.classList.add('active');
    }
  });
});


/* =========================
   إضافة عميل
========================= */

$('customerForm')?.addEventListener('submit',async e=>{
  e.preventDefault();

  // مهم جداً:
  // نحفظ الفورم في متغير قبل await
  // حتى لا يصبح e.currentTarget = null
  const form=e.currentTarget;

  const total=Number($('customerTotal')?.value||0);
  const paid=Number($('customerPaid')?.value||0);

  if(paid>total){
    alert('المبلغ المدفوع لا يمكن أن يكون أكبر من الإجمالي.');
    return;
  }

  const c={
    id:crypto.randomUUID(),
    name:$('customerName')?.value.trim()||'',
    phone:$('customerPhone')?.value.trim()||'',
    plan:$('customerPlan')?.value||'',
    total,
    paid,
    start:$('customerStart')?.value||'',
    end:$('customerEnd')?.value||''
  };

  setBusy(form,true,'جاري الحفظ...');

  try{
    await saveCustomer(c);

    db.customers.unshift(c);

    form.reset();

    renderDashboard();

    alert('تم حفظ العميل في قاعدة البيانات.');
  }
  catch(err){
    console.error(err);
    alert('تعذر حفظ العميل.');
  }
  finally{
    setBusy(form,false);
  }
});


/* =========================
   البحث عن العملاء
========================= */

$('customerSearch')?.addEventListener(
  'input',
  renderCustomers
);


/* =========================
   تسجيل دفعة
========================= */

$('paymentForm')?.addEventListener('submit',async e=>{
  e.preventDefault();

  // إصلاح مشكلة currentTarget بعد await
  const form=e.currentTarget;

  const c=customerById(
    $('paymentCustomer')?.value
  );

  const amount=Number(
    $('paymentAmount')?.value||0
  );

  if(!c){
    alert('اختر عميلاً أولاً.');
    return;
  }

  if(amount<=0){
    alert('أدخل قيمة دفعة صحيحة.');
    return;
  }

  if(c.paid+amount>c.total){
    alert('قيمة الدفعة أكبر من الدين المتبقي.');
    return;
  }

  const oldPaid=c.paid;

  c.paid+=amount;

  const invoice={
    id:'INV-'+Date.now(),
    customerId:c.id,
    amount,
    type:'دفعة',
    date:today(),
    note:$('paymentNote')?.value.trim()||''
  };

  setBusy(form,true,'جاري الحفظ...');

  try{
    await saveCustomer(c);

    await saveInvoice(invoice);

    db.invoices.unshift(invoice);

    form.reset();

    renderDashboard();

    alert('تم تسجيل الدفعة.');
  }
  catch(err){
    c.paid=oldPaid;

    console.error(err);

    alert('تعذر تسجيل الدفعة.');
  }
  finally{
    setBusy(form,false);
  }
});


/* =========================
   إصدار فاتورة
========================= */

$('invoiceForm')?.addEventListener('submit',async e=>{
  e.preventDefault();

  // إصلاح مشكلة currentTarget بعد await
  const form=e.currentTarget;

  const c=customerById(
    $('invoiceCustomer')?.value
  );

  const amount=Number(
    $('invoiceAmount')?.value||0
  );

  if(!c){
    alert('اختر عميلاً أولاً.');
    return;
  }

  if(amount<=0){
    alert('أدخل قيمة فاتورة صحيحة.');
    return;
  }

  const invoice={
    id:'INV-'+Date.now(),
    customerId:c.id,
    amount,
    type:$('invoiceType')?.value||'فاتورة',
    date:$('invoiceDate')?.value||today(),
    note:$('invoiceNote')?.value.trim()||''
  };

  setBusy(form,true,'جاري الإصدار...');

  try{
    await saveInvoice(invoice);

    db.invoices.unshift(invoice);

    form.reset();

    if($('invoiceDate')){
      $('invoiceDate').value=today();
    }

    renderDashboard();

    alert('تم إصدار الفاتورة.');
  }
  catch(err){
    console.error(err);

    alert('تعذر إصدار الفاتورة.');
  }
  finally{
    setBusy(form,false);
  }
});


/* =========================
   عرض العملاء
========================= */

function renderCustomers(){

  const q=(
    $('customerSearch')?.value||''
  ).toLowerCase();

  const body=$('customersBody');

  if(!body)return;

  body.innerHTML=db.customers
    .filter(c=>
      (c.name+' '+c.phone)
      .toLowerCase()
      .includes(q)
    )
    .map(c=>`
      <tr>
        <td>
          <b>${esc(c.name)}</b>
          <small>${esc(c.phone)}</small>
        </td>

        <td>${esc(c.plan)}</td>

        <td>${money(c.total)}</td>

        <td>${money(c.paid)}</td>

        <td class="debt-cell">
          ${money(Math.max(0,c.total-c.paid))}
        </td>

        <td>
          ${c.start||'—'}
          <br>
          ${c.end||'—'}
        </td>

        <td>
          <button
            class="mini danger"
            onclick="deleteCustomer('${c.id}')">
            حذف
          </button>
        </td>
      </tr>
    `)
    .join('') ||
    `
      <tr>
        <td colspan="7" class="empty">
          لا يوجد عملاء بعد
        </td>
      </tr>
    `;
}


/* =========================
   عرض الديون
========================= */

function renderDebts(){

  const body=$('debtsBody');

  if(!body)return;

  body.innerHTML=db.customers
    .filter(c=>c.total-c.paid>0)
    .map(c=>`
      <tr>
        <td>
          <b>${esc(c.name)}</b>
        </td>

        <td>${esc(c.phone)}</td>

        <td>${money(c.total)}</td>

        <td>${money(c.paid)}</td>

        <td class="debt-cell">
          ${money(c.total-c.paid)}
        </td>

        <td>
          <button
            class="mini"
            onclick="quickPay('${c.id}')">
            تسديد
          </button>
        </td>
      </tr>
    `)
    .join('') ||
    `
      <tr>
        <td colspan="6" class="empty">
          لا توجد ديون حالياً 🎉
        </td>
      </tr>
    `;
}


/* =========================
   عرض الفواتير
========================= */

function renderInvoices(){

  const body=$('invoicesBody');

  if(!body)return;

  body.innerHTML=db.invoices
    .map(i=>{

      const c=customerById(i.customerId);

      return `
        <tr>
          <td>${esc(i.id)}</td>

          <td>
            ${c?esc(c.name):'—'}
          </td>

          <td>${esc(i.type)}</td>

          <td>${money(i.amount)}</td>

          <td>${i.date||'—'}</td>

          <td>
            <button
              class="mini danger"
              onclick="deleteInvoice('${i.id}')">
              حذف
            </button>
          </td>
        </tr>
      `;
    })
    .join('') ||
    `
      <tr>
        <td colspan="6" class="empty">
          لا توجد فواتير بعد
        </td>
      </tr>
    `;
}


/* =========================
   لوحة التحكم
========================= */

function renderDashboard(){

  const debt=db.customers.reduce(
    (s,c)=>s+Math.max(0,c.total-c.paid),
    0
  );

  const paid=db.customers.reduce(
    (s,c)=>s+c.paid,
    0
  );

  const inv=db.invoices.reduce(
    (s,i)=>s+Number(i.amount||0),
    0
  );

  if($('statCustomers')){
    $('statCustomers').textContent=db.customers.length;
  }

  if($('statInvoices')){
    $('statInvoices').textContent=money(inv);
  }

  if($('statDebts')){
    $('statDebts').textContent=money(debt);
  }

  if($('statPaid')){
    $('statPaid').textContent=money(paid);
  }

  renderCustomers();
  renderDebts();
  renderInvoices();
  fillCustomerSelects();
}


/* =========================
   قوائم العملاء
========================= */

function fillCustomerSelects(){

  const options=db.customers
    .map(c=>`
      <option value="${esc(c.id)}">
        ${esc(c.name)} — ${esc(c.phone)}
      </option>
    `)
    .join('');

  if($('paymentCustomer')){
    $('paymentCustomer').innerHTML=
      options||
      '<option value="">لا يوجد عملاء</option>';
  }

  if($('invoiceCustomer')){
    $('invoiceCustomer').innerHTML=
      options||
      '<option value="">لا يوجد عملاء</option>';
  }
}


/* =========================
   الدفع السريع
========================= */

function openPaymentForm(){

  $('[data-tab="debts"]')?.click();

  $('paymentCustomer')?.focus();
}

function quickPay(id){

  $('[data-tab="debts"]')?.click();

  if($('paymentCustomer')){
    $('paymentCustomer').value=id;
  }

  $('paymentAmount')?.focus();
}


/* =========================
   حذف عميل
========================= */

async function deleteCustomer(id){

  if(!confirm(
    'حذف العميل وكل فواتيره من قاعدة البيانات؟'
  )){
    return;
  }

  try{

    await deleteCustomerRemote(id);

    db.customers=db.customers.filter(
      c=>c.id!==id
    );

    db.invoices=db.invoices.filter(
      i=>i.customerId!==id
    );

    renderDashboard();
  }
  catch(e){

    console.error(e);

    alert('تعذر حذف العميل.');
  }
}


/* =========================
   حذف فاتورة
========================= */

async function deleteInvoice(id){

  if(!confirm(
    'حذف هذه الفاتورة من قاعدة البيانات؟'
  )){
    return;
  }

  try{

    await deleteInvoiceRemote(id);

    db.invoices=db.invoices.filter(
      i=>i.id!==id
    );

    renderDashboard();
  }
  catch(e){

    console.error(e);

    alert('تعذر حذف الفاتورة.');
  }
}


/* =========================
   تصدير البيانات
========================= */

function exportData(){

  const blob=new Blob(
    [JSON.stringify(db,null,2)],
    {type:'application/json'}
  );

  const url=URL.createObjectURL(blob);

  const a=document.createElement('a');

  a.href=url;
  a.download='fitness-gym-data.json';

  document.body.appendChild(a);

  a.click();

  a.remove();

  URL.revokeObjectURL(url);
}


/* =========================
   تسجيل الخروج
========================= */

$('logoutBtn')?.addEventListener(
  'click',
  logoutAdmin
);


/* =========================
   تاريخ الفاتورة
========================= */

if($('invoiceDate')){
  $('invoiceDate').value=today();
}


/* =========================
   تشغيل لوحة التحكم
========================= */

boot();