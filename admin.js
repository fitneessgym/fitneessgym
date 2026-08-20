let db={customers:[],invoices:[]};
const money=n=>`₪${Number(n||0).toLocaleString('en-US')}`;
const today=()=>new Date().toISOString().slice(0,10);
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
function customerById(id){return db.customers.find(c=>c.id===id);}

async function loadDB(){
  const [customersRes,invoicesRes]=await Promise.all([
    supabaseClient.from('customers').select('*').order('created_at',{ascending:false}),
    supabaseClient.from('invoices').select('*').order('date',{ascending:false})
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
  const {error}=await supabaseClient.from('customers').upsert({
    id:c.id,
    name:c.name,
    phone:c.phone,
    plan:c.plan,
    total:c.total,
    paid:c.paid,
    start:c.start||null,
    end:c.end||null
  },{onConflict:'id'});

  if(error) throw error;
}

async function saveInvoice(i){
  const {error}=await supabaseClient.from('invoices').upsert({
    id:i.id,
    customer_id:i.customerId,
    amount:i.amount,
    type:i.type,
    date:i.date,
    note:i.note||''
  },{onConflict:'id'});

  if(error) throw error;
}

async function deleteCustomerRemote(id){
  const {error}=await supabaseClient.from('customers').delete().eq('id',id);
  if(error) throw error;
}

async function deleteInvoiceRemote(id){
  const {error}=await supabaseClient.from('invoices').delete().eq('id',id);
  if(error) throw error;
}

function setBusy(form,busy,text){
  const btn=form?.querySelector('button[type="submit"]');
  if(!btn)return;
  btn.disabled=busy;
  btn.textContent=busy?text:btn.dataset.defaultText||'حفظ';
}

function initDefaultButtonText(){
  document.querySelectorAll('button[type="submit"]').forEach(b=>{
    b.dataset.defaultText=b.textContent;
  });
}

async function boot(){
  const admin=await requireAdmin();
  if(!admin)return;

  initDefaultButtonText();

  try{
    await loadDB();
    renderDashboard();
  }catch(e){
    console.error(e);
    alert('تعذر الاتصال بقاعدة البيانات. تأكد من إعداد Supabase وRLS.');
  }
}

document.querySelectorAll('.dash-tab').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('.dash-tab').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.dash-panel').forEach(x=>x.classList.remove('active'));

  btn.classList.add('active');
  $('tab-'+btn.dataset.tab).classList.add('active');
}));


/* =========================
   إضافة عميل
========================= */

$('customerForm')?.addEventListener('submit',async e=>{
  e.preventDefault();

  const total=Number($('customerTotal').value||0);
  const paid=Number($('customerPaid').value||0);
  const name=$('customerName').value.trim();

  if(!name){
    alert('أدخل اسم العميل.');
    return;
  }

  if(paid>total){
    alert('المبلغ المدفوع لا يمكن أن يكون أكبر من الإجمالي.');
    return;
  }

  // منع تكرار اسم العميل
  const normalizeName=v=>
    String(v??'')
      .trim()
      .replace(/\s+/g,' ')
      .toLocaleLowerCase('ar');

  const duplicate=db.customers.find(
    x=>normalizeName(x.name)===normalizeName(name)
  );

  if(duplicate){
    alert('يوجد عميل مسجل بهذا الاسم بالفعل. لا يمكن إضافة عميل بنفس الاسم.');
    return;
  }

  const c={
    id:crypto.randomUUID(),
    name,
    phone:$('customerPhone').value.trim(),
    plan:$('customerPlan').value,
    total,
    paid,
    start:$('customerStart').value,
    end:$('customerEnd').value
  };

  setBusy(e.currentTarget,true,'جاري الحفظ...');

  try{
    await saveCustomer(c);
    db.customers.unshift(c);
    e.currentTarget.reset();
    renderDashboard();
    alert('تم حفظ العميل في قاعدة البيانات.');
  }catch(err){
    console.error(err);
    alert('تعذر حفظ العميل.');
  }finally{
    setBusy(e.currentTarget,false);
  }
});


$('customerSearch')?.addEventListener('input',renderCustomers);


/* =========================
   تسجيل دفعة
========================= */

$('paymentForm')?.addEventListener('submit',async e=>{
  e.preventDefault();

  const c=customerById($('paymentCustomer').value);
  const amount=Number($('paymentAmount').value||0);

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
    note:$('paymentNote').value.trim()
  };

  setBusy(e.currentTarget,true,'جاري الحفظ...');

  try{
    await saveCustomer(c);
    await saveInvoice(invoice);

    db.invoices.unshift(invoice);

    e.currentTarget.reset();
    renderDashboard();

    alert('تم تسجيل الدفعة.');
  }catch(err){
    c.paid=oldPaid;
    console.error(err);
    alert('تعذر تسجيل الدفعة.');
  }finally{
    setBusy(e.currentTarget,false);
  }
});


/* =========================
   إضافة دين
========================= */

function addDebtButton(){
  const debtsPanel=$('tab-debts');

  if(!debtsPanel || $('addDebtForm')) return;

  const form=document.createElement('form');

  form.id='addDebtForm';
  form.className='dash-form payment-form';

  form.innerHTML=`
    <h3>إضافة دين على عميل</h3>

    <select id="debtCustomer"></select>

    <input
      id="debtAmount"
      type="number"
      min="1"
      required
      placeholder="قيمة الدين ₪"
    >

    <input
      id="debtNote"
      placeholder="ملاحظة"
    >

    <button class="btn orange" type="submit">
      إضافة الدين
    </button>
  `;

  const paymentForm=$('paymentForm');

  if(paymentForm){
    paymentForm.parentNode.insertBefore(form,paymentForm);
  }else{
    debtsPanel.appendChild(form);
  }

  form.addEventListener('submit',async e=>{
    e.preventDefault();

    const c=customerById($('debtCustomer').value);
    const amount=Number($('debtAmount').value||0);

    if(!c){
      alert('اختر عميلاً أولاً.');
      return;
    }

    if(amount<=0){
      alert('أدخل قيمة دين صحيحة.');
      return;
    }

    const oldTotal=c.total;

    // إضافة الدين إلى إجمالي العميل
    c.total+=amount;

    const invoice={
      id:'INV-'+Date.now(),
      customerId:c.id,
      amount,
      type:'دين',
      date:today(),
      note:$('debtNote').value.trim()
    };

    setBusy(form,true,'جاري الحفظ...');

    try{
      await saveCustomer(c);
      await saveInvoice(invoice);

      db.invoices.unshift(invoice);

      form.reset();

      renderDashboard();

      alert('تم إضافة الدين بنجاح.');
    }catch(err){
      c.total=oldTotal;

      console.error(err);
      alert('تعذر إضافة الدين.');
    }finally{
      setBusy(form,false);
    }
  });

  fillDebtCustomerSelect();
}

function fillDebtCustomerSelect(){
  const select=$('debtCustomer');

  if(!select) return;

  const options=db.customers.map(c=>
    `<option value="${esc(c.id)}">
      ${esc(c.name)} — ${esc(c.phone)}
    </option>`
  ).join('');

  select.innerHTML=
    options ||
    '<option value="">لا يوجد عملاء</option>';
}


/* =========================
   الفواتير
========================= */

$('invoiceForm')?.addEventListener('submit',async e=>{
  e.preventDefault();

  const c=customerById($('invoiceCustomer').value);
  const amount=Number($('invoiceAmount').value||0);

  if(!c){
    alert('اختر عميلاً أولاً.');
    return;
  }

  const invoice={
    id:'INV-'+Date.now(),
    customerId:c.id,
    amount,
    type:$('invoiceType').value,
    date:$('invoiceDate').value||today(),
    note:$('invoiceNote').value.trim()
  };

  setBusy(e.currentTarget,true,'جاري الإصدار...');

  try{
    await saveInvoice(invoice);

    db.invoices.unshift(invoice);

    e.currentTarget.reset();
    $('invoiceDate').value=today();

    renderDashboard();

    alert('تم إصدار الفاتورة.');
  }catch(err){
    console.error(err);
    alert('تعذر إصدار الفاتورة.');
  }finally{
    setBusy(e.currentTarget,false);
  }
});


/* =========================
   العملاء
========================= */

function renderCustomers(){
  const q=($('customerSearch')?.value||'').toLowerCase();

  $('customersBody').innerHTML=
    db.customers
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
            ${c.start||'—'}<br>
            ${c.end||'—'}
          </td>

          <td>
            <button
              class="mini danger"
              onclick="deleteCustomer('${c.id}')"
            >
              حذف
            </button>
          </td>
        </tr>
      `)
      .join('') ||
      '<tr><td colspan="7" class="empty">لا يوجد عملاء بعد</td></tr>';
}


/* =========================
   الديون
========================= */

function renderDebts(){
  $('debtsBody').innerHTML=
    db.customers
      .filter(c=>c.total-c.paid>0)
      .map(c=>`
        <tr>
          <td><b>${esc(c.name)}</b></td>
          <td>${esc(c.phone)}</td>
          <td>${money(c.total)}</td>
          <td>${money(c.paid)}</td>

          <td class="debt-cell">
            ${money(c.total-c.paid)}
          </td>

          <td>
            <button
              class="mini"
              onclick="quickPay('${c.id}')"
            >
              تسديد
            </button>
          </td>
        </tr>
      `)
      .join('') ||
      '<tr><td colspan="6" class="empty">لا توجد ديون حالياً 🎉</td></tr>';
}


/* =========================
   الفواتير
========================= */

function renderInvoices(){
  $('invoicesBody').innerHTML=
    db.invoices
      .map(i=>{
        const c=customerById(i.customerId);

        return `
          <tr>
            <td>${esc(i.id)}</td>
            <td>${c?esc(c.name):'—'}</td>
            <td>${esc(i.type)}</td>
            <td>${money(i.amount)}</td>
            <td>${i.date||'—'}</td>

            <td>
              <button
                class="mini danger"
                onclick="deleteInvoice('${i.id}')"
              >
                حذف
              </button>
            </td>
          </tr>
        `;
      })
      .join('') ||
      '<tr><td colspan="6" class="empty">لا توجد فواتير بعد</td></tr>';
}


/* =========================
   لوحة التحكم
========================= */

function renderDashboard(){
  const debt=
    db.customers.reduce(
      (s,c)=>s+Math.max(0,c.total-c.paid),
      0
    );

  const paid=
    db.customers.reduce(
      (s,c)=>s+c.paid,
      0
    );

  const inv=
    db.invoices.reduce(
      (s,i)=>s+Number(i.amount||0),
      0
    );

  $('statCustomers').textContent=db.customers.length;
  $('statInvoices').textContent=money(inv);
  $('statDebts').textContent=money(debt);
  $('statPaid').textContent=money(paid);

  renderCustomers();
  renderDebts();
  renderInvoices();

  fillCustomerSelects();
  fillDebtCustomerSelect();
}


function fillCustomerSelects(){
  const options=
    db.customers
      .map(c=>
        `<option value="${esc(c.id)}">
          ${esc(c.name)} — ${esc(c.phone)}
        </option>`
      )
      .join('');

  $('paymentCustomer').innerHTML=
    options ||
    '<option value="">لا يوجد عملاء</option>';

  $('invoiceCustomer').innerHTML=
    options ||
    '<option value="">لا يوجد عملاء</option>';

  fillDebtCustomerSelect();
}


function openPaymentForm(){
  $('[data-tab="debts"]')?.click();
  $('paymentCustomer')?.focus();
}


function quickPay(id){
  $('[data-tab="debts"]')?.click();

  $('paymentCustomer').value=id;
  $('paymentAmount').focus();
}


/* =========================
   حذف عميل
========================= */

async function deleteCustomer(id){
  if(!confirm('حذف العميل وكل فواتيره من قاعدة البيانات؟'))return;

  try{
    await deleteCustomerRemote(id);

    db.customers=
      db.customers.filter(c=>c.id!==id);

    db.invoices=
      db.invoices.filter(i=>i.customerId!==id);

    renderDashboard();
  }catch(e){
    console.error(e);
    alert('تعذر حذف العميل.');
  }
}


/* =========================
   حذف فاتورة
========================= */

async function deleteInvoice(id){
  if(!confirm('حذف هذه الفاتورة من قاعدة البيانات؟'))return;

  try{
    await deleteInvoiceRemote(id);

    db.invoices=
      db.invoices.filter(i=>i.id!==id);

    renderDashboard();
  }catch(e){
    console.error(e);
    alert('تعذر حذف الفاتورة.');
  }
}


/* =========================
   تصدير البيانات
========================= */

function exportData(){
  const blob=
    new Blob(
      [JSON.stringify(db,null,2)],
      {type:'application/json'}
    );

  const url=URL.createObjectURL(blob);

  const a=document.createElement('a');

  a.href=url;
  a.download='fitness-gym-data.json';

  a.click();

  URL.revokeObjectURL(url);
}


/* =========================
   تشغيل النظام
========================= */

$('logoutBtn')?.addEventListener(
  'click',
  logoutAdmin
);

if($('invoiceDate')){
  $('invoiceDate').value=today();
}

boot();

/*
  إضافة زر ونموذج "إضافة دين"
  بعد تحميل الصفحة وقاعدة البيانات.
*/
document.addEventListener('DOMContentLoaded',()=>{
  setTimeout(()=>{
    addDebtButton();
  },500);
});
