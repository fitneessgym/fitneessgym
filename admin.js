/* FITNESS GYM - Admin dashboard (Supabase)
   Customers + debts + payments + invoices.
   Product/gallery management is handled by admin-store.js.
*/

let db = { customers: [], invoices: [] };

const money = n => `₪${Number(n || 0).toLocaleString('en-US')}`;
const today = () => new Date().toISOString().slice(0, 10);
const $ = id => document.getElementById(id);

const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
}[m]));

function customerById(id) {
  return db.customers.find(c => c.id === id);
}

function normalizeName(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase();
}

function findCustomerByName(name, exceptId = '') {
  const normalized = normalizeName(name);
  if (!normalized) return null;
  return db.customers.find(c => c.id !== exceptId && normalizeName(c.name) === normalized) || null;
}

async function loadCustomers() {
  const { data, error } = await supabaseClient
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  db.customers = (data || []).map(c => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    plan: c.plan,
    total: Number(c.total || 0),
    paid: Number(c.paid || 0),
    start: c.start || '',
    end: c.end || ''
  }));
}

async function loadInvoices() {
  const { data, error } = await supabaseClient
    .from('invoices')
    .select('*')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;

  db.invoices = (data || []).map(i => ({
    id: i.id,
    customerId: i.customer_id,
    amount: Number(i.amount || 0),
    type: i.type,
    date: i.date || '',
    note: i.note || ''
  }));
}

async function loadDB() {
  // Load each table independently so an error in invoices does not hide customers.
  let customersError = null;
  let invoicesError = null;

  try {
    await loadCustomers();
  } catch (e) {
    customersError = e;
    console.error('Customers load error:', e);
    db.customers = [];
  }

  try {
    await loadInvoices();
  } catch (e) {
    invoicesError = e;
    console.error('Invoices load error:', e);
    db.invoices = [];
  }

  if (customersError) throw customersError;
  if (invoicesError) {
    // Keep the customer screen usable even if invoices has a temporary/RLS issue.
    console.warn('Invoices could not be loaded. Customer data is still available.');
  }
}

async function saveCustomer(c) {
  const { error } = await supabaseClient
    .from('customers')
    .upsert({
      id: c.id,
      name: c.name,
      phone: c.phone,
      plan: c.plan,
      total: c.total,
      paid: c.paid,
      start: c.start || null,
      end: c.end || null
    }, { onConflict: 'id' });

  if (error) throw error;
}

async function saveInvoice(i) {
  const { error } = await supabaseClient
    .from('invoices')
    .upsert({
      id: i.id,
      customer_id: i.customerId,
      amount: i.amount,
      type: i.type,
      date: i.date,
      note: i.note || ''
    }, { onConflict: 'id' });

  if (error) throw error;
}

async function deleteInvoiceRemote(id) {
  const { error } = await supabaseClient
    .from('invoices')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

async function deleteCustomerRemote(id) {
  const { error } = await supabaseClient
    .from('customers')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

function setBusy(form, busy, text) {
  const btn = form?.querySelector('button[type="submit"]');
  if (!btn) return;
  btn.disabled = busy;
  btn.textContent = busy ? text : (btn.dataset.defaultText || 'حفظ');
}

function initDefaultButtonText() {
  document.querySelectorAll('button[type="submit"]').forEach(btn => {
    btn.dataset.defaultText = btn.textContent;
  });
}

/* =========================
   تبويبات لوحة التحكم
========================= */

document.querySelectorAll('.dash-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.dash-tab').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.dash-panel').forEach(x => x.classList.remove('active'));

    btn.classList.add('active');
    const panel = $('tab-' + btn.dataset.tab);
    if (panel) panel.classList.add('active');
  });
});

/* =========================
   إضافة عميل
========================= */

$('customerForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.currentTarget;

  const name = $('customerName')?.value.trim() || '';
  const phone = $('customerPhone')?.value.trim() || '';
  const total = Number($('customerTotal')?.value || 0);
  const paid = Number($('customerPaid')?.value || 0);

  if (!name) {
    alert('أدخل اسم العميل.');
    return;
  }

  // منع تكرار اسم العميل (مع تجاهل اختلاف المسافات وحالة الأحرف).
  const duplicate = findCustomerByName(name);
  if (duplicate) {
    alert(`لا يمكن إضافة العميل. الاسم موجود مسبقاً: ${duplicate.name}`);
    return;
  }

  if (paid < 0 || total < 0) {
    alert('القيم المالية يجب أن تكون صفر أو أكبر.');
    return;
  }

  if (paid > total) {
    alert('المبلغ المدفوع لا يمكن أن يكون أكبر من الإجمالي.');
    return;
  }

  const c = {
    id: crypto.randomUUID(),
    name,
    phone,
    plan: $('customerPlan')?.value || 'شهري',
    total,
    paid,
    start: $('customerStart')?.value || '',
    end: $('customerEnd')?.value || ''
  };

  setBusy(form, true, 'جاري الحفظ...');

  try {
    await saveCustomer(c);
    db.customers.unshift(c);
    form.reset();
    renderDashboard();
    alert('تم حفظ العميل في قاعدة البيانات.');
  } catch (err) {
    console.error(err);
    alert(`تعذر حفظ العميل: ${err.message || 'خطأ غير معروف'}`);
  } finally {
    setBusy(form, false);
  }
});

$('customerSearch')?.addEventListener('input', renderCustomers);

/* =========================
   تسجيل دفعة
========================= */

$('paymentForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.currentTarget;

  const c = customerById($('paymentCustomer')?.value);
  const amount = Number($('paymentAmount')?.value || 0);

  if (!c) {
    alert('اختر عميلاً أولاً.');
    return;
  }

  if (amount <= 0) {
    alert('أدخل قيمة دفعة صحيحة.');
    return;
  }

  const remaining = Math.max(0, c.total - c.paid);
  if (amount > remaining) {
    alert('قيمة الدفعة أكبر من الدين المتبقي.');
    return;
  }

  const oldPaid = c.paid;
  const invoice = {
    id: 'INV-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    customerId: c.id,
    amount,
    type: 'دفعة',
    date: today(),
    note: $('paymentNote')?.value.trim() || ''
  };

  c.paid += amount;
  setBusy(form, true, 'جاري الحفظ...');

  try {
    await saveCustomer(c);
    await saveInvoice(invoice);
    db.invoices.unshift(invoice);
    form.reset();
    renderDashboard();
    alert('تم تسجيل الدفعة.');
  } catch (err) {
    c.paid = oldPaid;
    try { await saveCustomer(c); } catch (_) {}
    console.error(err);
    alert(`تعذر تسجيل الدفعة: ${err.message || 'خطأ غير معروف'}`);
  } finally {
    setBusy(form, false);
  }
});

/* =========================
   إضافة دين على عميل
========================= */

$('debtForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.currentTarget;

  const c = customerById($('debtCustomer')?.value);
  const amount = Number($('debtAmount')?.value || 0);

  if (!c) {
    alert('اختر عميلاً أولاً.');
    return;
  }

  if (amount <= 0) {
    alert('أدخل قيمة دين صحيحة.');
    return;
  }

  const oldTotal = c.total;
  c.total += amount;

  const invoice = {
    id: 'DEBT-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    customerId: c.id,
    amount,
    type: 'دين',
    date: $('debtDate')?.value || today(),
    note: $('debtNote')?.value.trim() || ''
  };

  setBusy(form, true, 'جاري حفظ الدين...');

  try {
    await saveCustomer(c);
    try {
      await saveInvoice(invoice);
    } catch (invoiceError) {
      c.total = oldTotal;
      try { await saveCustomer(c); } catch (_) {}
      throw invoiceError;
    }

    db.invoices.unshift(invoice);
    form.reset();
    if ($('debtDate')) $('debtDate').value = today();
    renderDashboard();
    alert('تمت إضافة الدين على العميل بنجاح.');
  } catch (err) {
    console.error(err);
    alert(`تعذر إضافة الدين: ${err.message || 'خطأ غير معروف'}`);
  } finally {
    setBusy(form, false);
  }
});

/* =========================
   إصدار فاتورة
========================= */

$('invoiceForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.currentTarget;

  const c = customerById($('invoiceCustomer')?.value);
  const amount = Number($('invoiceAmount')?.value || 0);

  if (!c) {
    alert('اختر عميلاً أولاً.');
    return;
  }

  if (amount <= 0) {
    alert('أدخل قيمة فاتورة صحيحة.');
    return;
  }

  const invoice = {
    id: 'INV-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    customerId: c.id,
    amount,
    type: $('invoiceType')?.value || 'فاتورة',
    date: $('invoiceDate')?.value || today(),
    note: $('invoiceNote')?.value.trim() || ''
  };

  setBusy(form, true, 'جاري الإصدار...');

  try {
    await saveInvoice(invoice);
    db.invoices.unshift(invoice);
    form.reset();
    if ($('invoiceDate')) $('invoiceDate').value = today();
    renderDashboard();
    alert('تم إصدار الفاتورة.');
  } catch (err) {
    console.error(err);
    alert(`تعذر إصدار الفاتورة: ${err.message || 'خطأ غير معروف'}`);
  } finally {
    setBusy(form, false);
  }
});

/* =========================
   عرض العملاء
========================= */

function renderCustomers() {
  const q = ($('customerSearch')?.value || '').trim().toLocaleLowerCase();
  const body = $('customersBody');
  if (!body) return;

  body.innerHTML = db.customers
    .filter(c => (`${c.name} ${c.phone}`).toLocaleLowerCase().includes(q))
    .map(c => `
      <tr>
        <td><b>${esc(c.name)}</b><small>${esc(c.phone)}</small></td>
        <td>${esc(c.plan)}</td>
        <td>${money(c.total)}</td>
        <td>${money(c.paid)}</td>
        <td class="debt-cell">${money(Math.max(0, c.total - c.paid))}</td>
        <td>${c.start || '—'}<br>${c.end || '—'}</td>
        <td><button class="mini danger" onclick="deleteCustomer('${esc(c.id)}')">حذف</button></td>
      </tr>
    `)
    .join('') || `
      <tr><td colspan="7" class="empty">لا يوجد عملاء بعد</td></tr>
    `;
}

/* =========================
   عرض الديون
========================= */

function renderDebts() {
  const body = $('debtsBody');
  if (!body) return;

  body.innerHTML = db.customers
    .filter(c => c.total - c.paid > 0)
    .map(c => `
      <tr>
        <td><b>${esc(c.name)}</b></td>
        <td>${esc(c.phone)}</td>
        <td>${money(c.total)}</td>
        <td>${money(c.paid)}</td>
        <td class="debt-cell">${money(c.total - c.paid)}</td>
        <td><button class="mini" onclick="quickPay('${esc(c.id)}')">تسديد</button></td>
      </tr>
    `)
    .join('') || `
      <tr><td colspan="6" class="empty">لا توجد ديون حالياً 🎉</td></tr>
    `;
}

/* =========================
   عرض الفواتير
========================= */

function renderInvoices() {
  const body = $('invoicesBody');
  if (!body) return;

  body.innerHTML = db.invoices
    .map(i => {
      const c = customerById(i.customerId);
      return `
        <tr>
          <td>${esc(i.id)}</td>
          <td>${c ? esc(c.name) : '—'}</td>
          <td>${esc(i.type)}</td>
          <td>${money(i.amount)}</td>
          <td>${i.date || '—'}</td>
          <td><button class="mini danger" onclick="deleteInvoice('${esc(i.id)}')">حذف</button></td>
        </tr>
      `;
    })
    .join('') || `
      <tr><td colspan="6" class="empty">لا توجد فواتير بعد</td></tr>
    `;
}

/* =========================
   لوحة التحكم
========================= */

function renderDashboard() {
  const debt = db.customers.reduce((s, c) => s + Math.max(0, c.total - c.paid), 0);
  const paid = db.customers.reduce((s, c) => s + c.paid, 0);
  const inv = db.invoices.reduce((s, i) => s + Number(i.amount || 0), 0);

  if ($('statCustomers')) $('statCustomers').textContent = db.customers.length;
  if ($('statInvoices')) $('statInvoices').textContent = money(inv);
  if ($('statDebts')) $('statDebts').textContent = money(debt);
  if ($('statPaid')) $('statPaid').textContent = money(paid);

  renderCustomers();
  renderDebts();
  renderInvoices();
  fillCustomerSelects();
}

function fillCustomerSelects() {
  const options = db.customers
    .map(c => `<option value="${esc(c.id)}">${esc(c.name)} — ${esc(c.phone)}</option>`)
    .join('');

  if ($('paymentCustomer')) {
    $('paymentCustomer').innerHTML = options || '<option value="">لا يوجد عملاء</option>';
  }

  if ($('invoiceCustomer')) {
    $('invoiceCustomer').innerHTML = options || '<option value="">لا يوجد عملاء</option>';
  }

  if ($('debtCustomer')) {
    $('debtCustomer').innerHTML = options || '<option value="">لا يوجد عملاء</option>';
  }
}

/* =========================
   الدفع السريع
========================= */

function openPaymentForm() {
  $('[data-tab="debts"]')?.click();
  $('paymentCustomer')?.focus();
}

function quickPay(id) {
  $('[data-tab="debts"]')?.click();
  if ($('paymentCustomer')) $('paymentCustomer').value = id;
  $('paymentAmount')?.focus();
}

/* =========================
   حذف عميل
========================= */

async function deleteCustomer(id) {
  if (!confirm('حذف العميل وكل فواتيره من قاعدة البيانات؟')) return;

  try {
    await deleteCustomerRemote(id);
    db.customers = db.customers.filter(c => c.id !== id);
    db.invoices = db.invoices.filter(i => i.customerId !== id);
    renderDashboard();
  } catch (e) {
    console.error(e);
    alert(`تعذر حذف العميل: ${e.message || 'خطأ غير معروف'}`);
  }
}

/* =========================
   حذف فاتورة
========================= */

async function deleteInvoice(id) {
  if (!confirm('حذف هذه الفاتورة من قاعدة البيانات؟')) return;

  try {
    await deleteInvoiceRemote(id);
    db.invoices = db.invoices.filter(i => i.id !== id);
    renderDashboard();
  } catch (e) {
    console.error(e);
    alert(`تعذر حذف الفاتورة: ${e.message || 'خطأ غير معروف'}`);
  }
}

/* =========================
   تصدير البيانات
========================= */

function exportData() {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'fitness-gym-data.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

$('logoutBtn')?.addEventListener('click', logoutAdmin);

if ($('invoiceDate')) $('invoiceDate').value = today();
if ($('debtDate')) $('debtDate').value = today();

/* =========================
   تشغيل لوحة التحكم
========================= */

async function boot() {
  const admin = await requireAdmin();
  if (!admin) return;

  initDefaultButtonText();

  try {
    await loadDB();
    renderDashboard();
  } catch (e) {
    console.error(e);
    alert(`تعذر تحميل العملاء من قاعدة البيانات: ${e.message || 'تأكد من Supabase وRLS.'}`);
  }
}

boot();
