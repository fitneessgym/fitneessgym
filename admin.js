$('customerForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = $('customerName').value.trim();
  const phone = $('customerPhone').value.trim();
  const plan = $('customerPlan').value;
  const total = Number($('customerTotal').value || 0);
  const paid = Number($('customerPaid').value || 0);
  const start = $('customerStart').value || null;
  const end = $('customerEnd').value || null;

  if (!name || !phone) {
    alert('أدخل اسم العميل ورقم الهاتف.');
    return;
  }

  if (paid > total) {
    alert('المبلغ المدفوع لا يمكن أن يكون أكبر من الإجمالي.');
    return;
  }

  try {
    // إنشاء ID قبل الإرسال إلى Supabase
    const customerId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'CUS-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);

    // التأكد من عدم وجود عميل بنفس الاسم
    const { data: existing, error: checkError } =
      await window.supabaseClient
        .from('customers')
        .select('id')
        .ilike('name', name)
        .limit(1);

    if (checkError) {
      console.error(checkError);
      alert('تعذر التحقق من العميل. تأكد من اتصال Supabase.');
      return;
    }

    if (existing && existing.length > 0) {
      alert('يوجد عميل آخر بنفس الاسم.');
      return;
    }

    // حفظ العميل مع ID
    const { data, error } = await window.supabaseClient
      .from('customers')
      .insert([
        {
          id: customerId,
          name: name,
          phone: phone,
          plan: plan,
          total: total,
          paid: paid,
          start: start,
          end: end
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase customer insert error:', error);
      alert('تعذر حفظ العميل:\n' + error.message);
      return;
    }

    console.log('Customer saved:', data);

    e.target.reset();

    alert('تم حفظ العميل بنجاح.');

    // تحديث الجدول
    if (typeof loadCustomers === 'function') {
      await loadCustomers();
    }

    if (typeof render === 'function') {
      await render();
    }

  } catch (error) {
    console.error(error);
    alert('حدث خطأ غير متوقع أثناء حفظ العميل.');
  }
});
