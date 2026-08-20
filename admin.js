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


/* =========================
   تحميل البيانات
========================= */

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


/* =========================
   حفظ العميل
========================= */

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


/* =========================
   حفظ الفاتورة
========================= */

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


/* =========================
   حذف العميل من Supabase
========================= */

async function deleteCustomerRemote(id){

  const {error}=await supabaseClient
    .from('customers')
    .delete()
    .eq('id',id);

  if(error) throw error;
}


/* =========================
   حذف الفاتورة من Supabase
========================= */

async function deleteInvoiceRemote(id){

  const {error}=await supabaseClient
    .from('invoices')
    .delete()
    .eq('id',id);

  if(error) throw error;
}


/* =========================
   حالة زر الحفظ
========================= */

function setBusy(form,busy,text){

  const btn=form?.querySelector(
    'button[type="submit"]'
  );

  if(!btn)return;

  btn.disabled=busy;

  btn.textContent=busy
    ? text
    : btn.dataset.defaultText||'حفظ';
}


/* =========================
   حفظ أسماء الأزرار
========================= */

function initDefaultButtonText(){

  document
    .querySelectorAll('button[type="submit"]')
    .forEach(b=>{
      b.dataset.defaultText=b.textContent;
    });

}


/* =========================
   تشغيل لوحة التحكم
========================= */

async function boot(){

  const admin=await requireAdmin();

  if(!admin)return;

  initDefaultButtonText();

  try{

    await loadDB();

    renderDashboard();

    /*
      إنشاء واجهة إضافة الدين
      بعد تحميل البيانات
    */

    createDebtUI();

  }
  catch(e){

    console.error(e);

    alert(
      'تعذر الاتصال بقاعدة البيانات. تأكد من إعداد Supabase وRLS.'
    );

  }

}


/* =========================
   التبويبات
========================= */

document
  .querySelectorAll('.dash-tab')
  .forEach(btn=>{

    btn.addEventListener('click',()=>{

      document
        .querySelectorAll('.dash-tab')
        .forEach(x=>x.classList.remove('active'));

      document
        .querySelectorAll('.dash-panel')
        .forEach(x=>x.classList.remove('active'));

      btn.classList.add('active');

      const panel=$(
        'tab-'+btn.dataset.tab
      );

      if(panel){

        panel.classList.add('active');

      }

    });

  });


/* =========================
   تطبيع اسم العميل
========================= */

function normalizeCustomerName(name){

  return String(name||'')
    .trim()
    .replace(/\s+/g,' ')
    .toLocaleLowerCase('ar');

}


/* =========================
   التحقق من اسم العميل
========================= */

function customerNameExists(name){
