/* FITNESS GYM - Admin data layer
   Uses Supabase instead of localStorage.
*/
if (typeof protectAdminPage === 'function' && !protectAdminPage()) {
  throw new Error('Unauthorized');
}

(() => {
  "use strict";

  const supabase = window.supabaseClient;
  if (!supabase) {
    alert("تعذر الاتصال بقاعدة البيانات. تأكد من تحميل supabase-config.js.");
    throw new Error("Supabase client is missing");
  }

  const $ = (id) => document.getElementById(id);
  const money = (n) => `₪${Number(n || 0).toLocaleString('en-US')}`;
  const today = () => new Date().toISOString().slice(0, 10);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[m]));

  let customers = [];
  let invoices = [];
  let payments = [];

  const errorText = (error) => error?.message || error?.details || "خطأ غير معروف";

  async function loadAll() {
    const [cRes, iRes, pRes] = await Promise.all([
      supabase.from('customers').select('*').order('name', { ascending: true }),
      supabase.from('invoices').select('*').order('date', { ascending: false }),
      supabase.from('payments').select('*').order('date', { ascending: false })
    ]);

    if (cRes.error) throw new Error("customers: " + errorText(cRes.error));
    if (iRes.error) throw new Error("invoices: " + errorText(iRes.error));
    if (pRes.error) throw new Error("payments: " + errorText(pRes.error));

    customers = cRes.data || [];
    invoices = iRes.data || [];
    payments = pRes.data || [];
  }

  function getCustomer(id) {
    return customers.find(c => String(c.id) === String(id));
  }

  function debt(c) {
    return Math.max(0, Number(c.total || 0) - Number(c.paid || 0));
  }

  function duplicateName(name, excludeId) {
    const target = name.trim().toLocaleLowerCase();
    return customers.some(c =>
      String(c.id) !== String(excludeId || '') &&
      String(c.name || '').trim().toLocaleLowerCase() === target
    );
  }

  function fillSelects() {
    const opts = customers.map(c =>
      `<option value="${esc(c.id)}">${esc(c.name)} — ${esc(c.phone)}</option>`
    ).join('') || '<option value="">لا يوجد عملاء</option>';

    ['debtCustomer','paymentCustomer','invoiceCustomer'].forEach(id => {
      const el = $(id);
      if (el) el.innerHTML = opts;
    });
  }

  function renderCustomers() {
    const body = $('customersBody');
    if (!body) return;
    const q = ($('customerSearch')?.value || '').trim().toLocaleLowerCase();

    body.innerHTML = customers
      .filter(c => `${c.name || ''} ${c.phone || ''}`.toLocaleLowerCase().includes(q))
      .map(c => `
        <tr>
          <td><b>${esc(c.name)}</b><small>${esc(c.phone)}</small></td>
          <td>${esc(c.plan || '')}</td>
          <td>${money(c.total)}</td>
          <td>${money(c.paid)}</td>
          <td>${money(debt(c))}</td>
          <td>${esc(c.start || '—')}<br>${esc(c.end || '—')}</td>
          <td><button class="mini danger" onclick="deleteCustomer('${esc(c.id)}')">حذف</button></td>
        </tr>
      `).join('') || '<tr><td colspan="7" class="empty">لا يوجد عملاء بعد</td></tr>';
  }

  function renderDebts() {
    const body = $('debtsBody');
    if (!body) return;
    body.innerHTML = customers.filter(debt).map(c => `
      <tr>
        <td><b>${esc(c.name)}</b></td>
        <td>${esc(c.phone)}</td>
        <td>${money(c.total)}</td>
        <td>${money(c.paid)}</td>
        <td class="debt-cell">${money(debt(c))}</td>
        <td><button class="mini" onclick="quickPay('${esc(c.id)}')">تسديد</button></td>
      </tr>
    `).join('') || '<tr><td colspan="6" class="empty">لا توجد ديون حالياً 🎉</td></tr>';
  }

  function renderInvoices() {
    const body = $('invoicesBody');
    if (!body) return;
    body.innerHTML = invoices.map(i => {
      const c = getCustomer(i.customer_id);
      return `
        <tr>
          <td>${esc(i.id)}</td>
          <td>${c ? esc(c.name) : '—'}</td>
          <td>${esc(i.type || '')}</td>
          <td>${money(i.amount)}</td>
          <td>${esc(i.date || '—')}</td>
          <td><button class="mini danger" onclick="deleteInvoice('${esc(i.id)}')">حذف</button></td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="6" class="empty">لا توجد فواتير بعد</td></tr>';
  }

  function render() {
    const totalDebt = customers.reduce((s, c) => s + debt(c), 0);
    const totalPaid = customers.reduce((s, c) => s + Number(c.paid || 0), 0);
    const totalInvoices = invoices.reduce((s, i) => s + Number(i.amount || 0), 0);

    if ($('statCustomers')) $('statCustomers').textContent = customers.length;
    if ($('statInvoices')) $('statInvoices').textContent = money(totalInvoices);
    if ($('statDebts')) $('statDebts').textContent = money(totalDebt);
    if ($('statPaid')) $('statPaid').textContent = money(totalPaid);

    renderCustomers();
    renderDebts();
    renderInvoices();
    fillSelects();
    if (window.renderProducts) window.renderProducts();
  }

  async function refresh() {
    try {
      await loadAll();
      render();
    } catch (e) {
      console.error(e);
      alert("تعذر تحميل بيانات لوحة الإدارة:\n\n" + errorText(e));
    }
  }

  const customerForm = $('customerForm');
  if (customerForm) customerForm.addEventListener('submit', async e => {
    e.preventDefault();

    const name = $('customerName').value.trim();
    const phone = $('customerPhone').value.trim();
    const total = Number($('customerTotal').value || 0);
    const paid = Number($('customerPaid').value || 0);

    if (!name || !phone) return alert('أدخل اسم العميل ورقم الهاتف.');
    if (duplicateName(name)) return alert('يوجد عميل آخر بنفس الاسم.');
    if (paid > total) return alert('المبلغ المدفوع لا يمكن أن يكون أكبر من الإجمالي.');

    const payload = {
      name, phone,
      plan: $('customerPlan').value,
      total, paid,
      start: $('customerStart').value || null,
      end: $('customerEnd').value || null
    };

    const { error } = await supabase.from('customers').insert(payload);
    if (error) return alert("تعذر حفظ العميل:\n\n" + errorText(error));

    e.target.reset();
    await refresh();
    alert('تم حفظ العميل بنجاح.');
  });

  const debtForm = $('debtForm');
  if (debtForm) debtForm.addEventListener('submit', async e => {
    e.preventDefault();

    const customerId = $('debtCustomer').value;
    const amount = Number($('debtAmount').value || 0);
    const c = getCustomer(customerId);

    if (!c) return alert('اختر عميلاً.');
    if (amount <= 0) return alert('أدخل قيمة الدين.');

    const newTotal = Number(c.total || 0) + amount;

    const customerUpdate = await supabase
      .from('customers')
      .update({ total: newTotal })
      .eq('id', customerId);

    if (customerUpdate.error)
      return alert("تعذر تحديث دين العميل:\n\n" + errorText(customerUpdate.error));

    const invoice = await supabase.from('invoices').insert({
      customer_id: customerId,
      amount,
      type: 'دين',
      date: $('debtDate').value || today(),
      note: $('debtNote').value.trim() || null
    });

    if (invoice.error)
      return alert("تم تحديث الدين، لكن تعذر تسجيل الفاتورة:\n\n" + errorText(invoice.error));

    e.target.reset();
    await refresh();
    alert('تمت إضافة الدين.');
  });

  const paymentForm = $('paymentForm');
  if (paymentForm) paymentForm.addEventListener('submit', async e => {
    e.preventDefault();

    const customerId = $('paymentCustomer').value;
    const amount = Number($('paymentAmount').value || 0);
    const c = getCustomer(customerId);

    if (!c) return alert('اختر عميلاً.');
    if (amount <= 0 || amount > debt(c)) return alert('قيمة الدفعة غير صحيحة.');

    const newPaid = Number(c.paid || 0) + amount;

    const customerUpdate = await supabase
      .from('customers')
      .update({ paid: newPaid })
      .eq('id', customerId);

    if (customerUpdate.error)
      return alert("تعذر حفظ الدفعة:\n\n" + errorText(customerUpdate.error));

    const payment = await supabase.from('payments').insert({
      customer_id: customerId,
      amount,
      date: today(),
      note: $('paymentNote').value.trim() || null
    });

    if (payment.error)
      return alert("تم تحديث المدفوع، لكن تعذر تسجيل حركة الدفعة:\n\n" + errorText(payment.error));

    e.target.reset();
    await refresh();
    alert('تم تسجيل الدفعة.');
  });

  const invoiceForm = $('invoiceForm');
  if (invoiceForm) invoiceForm.addEventListener('submit', async e => {
    e.preventDefault();

    const customerId = $('invoiceCustomer').value;
    const amount = Number($('invoiceAmount').value || 0);
    const c = getCustomer(customerId);

    if (!c) return alert('اختر عميلاً.');

    const { error } = await supabase.from('invoices').insert({
      customer_id: customerId,
      amount,
      type: $('invoiceType').value,
      date: $('invoiceDate').value || today(),
      note: $('invoiceNote').value.trim() || null
    });

    if (error) return alert("تعذر إصدار الفاتورة:\n\n" + errorText(error));

    e.target.reset();
    $('invoiceDate').value = today();
    await refresh();
    alert('تم إصدار الفاتورة.');
  });

  if ($('customerSearch')) $('customerSearch').addEventListener('input', renderCustomers);

  $('invoiceDate') && ($('invoiceDate').value = today());

  document.querySelectorAll('.dash-tab').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.dash-tab').forEach(x => x.classList.remove('active'));
      document.querySelectorAll('.dash-panel').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      const panel = $('tab-' + b.dataset.tab);
      if (panel) panel.classList.add('active');
      if (b.dataset.tab === 'store' && window.renderProducts) window.renderProducts();
    });
  });

  window.quickPay = id => {
    document.querySelector('[data-tab="debts"]')?.click();
    if ($('paymentCustomer')) $('paymentCustomer').value = id;
    $('paymentAmount')?.focus();
  };

  window.openPaymentForm = () => document.querySelector('[data-tab="debts"]')?.click();

  window.deleteCustomer = async id => {
    if (!confirm('حذف العميل وكل فواتيره ودفعاته؟')) return;

    const p1 = await supabase.from('payments').delete().eq('customer_id', id);
    if (p1.error) return alert("تعذر حذف دفعات العميل:\n\n" + errorText(p1.error));

    const p2 = await supabase.from('invoices').delete().eq('customer_id', id);
    if (p2.error) return alert("تعذر حذف فواتير العميل:\n\n" + errorText(p2.error));

    const p3 = await supabase.from('customers').delete().eq('id', id);
    if (p3.error) return alert("تعذر حذف العميل:\n\n" + errorText(p3.error));

    await refresh();
  };

  window.deleteInvoice = async id => {
    if (!confirm('حذف الفاتورة؟')) return;

    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) return alert("تعذر حذف الفاتورة:\n\n" + errorText(error));

    await refresh();
  };

  window.exportData = async () => {
    const payload = { customers, invoices, payments };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'fitness-gym-data.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  refresh();
})();
