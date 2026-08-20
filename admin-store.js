/* FITNESS GYM - Products / Store
   Uses Supabase instead of localStorage.
*/
(() => {
  "use strict";

  const supabase = window.supabaseClient;
  const p$ = id => document.getElementById(id);
  const money = n => `₪${Number(n || 0).toLocaleString('en-US')}`;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[m]));

  if (!supabase) {
    console.error("Supabase client is missing.");
    return;
  }

  let products = [];

  async function loadProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error(error);
      return [];
    }
    products = data || [];
    return products;
  }

  async function renderProducts() {
    const body = p$('productsBody');
    if (!body) return;

    body.innerHTML = '<tr><td colspan="6" class="empty">جاري تحميل المنتجات...</td></tr>';

    const q = (p$('productSearch')?.value || '').trim().toLocaleLowerCase();
    const arr = (await loadProducts()).filter(p =>
      `${p.name || ''} ${p.category || ''}`.toLocaleLowerCase().includes(q)
    );

    body.innerHTML = arr.map(p => `
      <tr>
        <td>${p.image ? `<img src="${esc(p.image)}" alt="" style="width:55px;height:55px;object-fit:cover;border-radius:8px">` : '—'}</td>
        <td><b>${esc(p.name)}</b><small>${esc(p.category || '')}</small></td>
        <td>${money(p.price)}</td>
        <td>${Number(p.stock || 0)}</td>
        <td>${p.active === false ? 'مخفي' : 'ظاهر'}</td>
        <td>
          <button class="mini" type="button" onclick="editProduct('${esc(p.id)}')">تعديل</button>
          <button class="mini danger" type="button" onclick="deleteProduct('${esc(p.id)}')">حذف</button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="6" class="empty">لا توجد منتجات بعد</td></tr>';
  }

  window.renderProducts = renderProducts;

  window.editProduct = async id => {
    const p = (await loadProducts()).find(x => String(x.id) === String(id));
    if (!p) return alert('لم يتم العثور على المنتج.');

    p$('productId').value = p.id;
    p$('productName').value = p.name || '';
    p$('productDescription').value = p.description || '';
    p$('productPrice').value = p.price ?? 0;
    p$('productStock').value = p.stock ?? 0;
    p$('productCategory').value = p.category || '';
    p$('productImage').value = p.image || '';
    p$('productActive').checked = p.active !== false;
    p$('productCancel').hidden = false;

    document.querySelector('[data-tab="store"]')?.click();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  window.deleteProduct = async id => {
    if (!confirm('حذف المنتج؟')) return;

    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) return alert("تعذر حذف المنتج:\n\n" + (error.message || error.details || ''));

    await renderProducts();
    alert('تم حذف المنتج.');
  };

  const form = p$('productForm');
  if (form) form.addEventListener('submit', async e => {
    e.preventDefault();

    const name = p$('productName').value.trim();
    const price = Number(p$('productPrice').value || 0);
    const stock = Number(p$('productStock').value || 0);
    const file = p$('productImageFile').files[0];
    const id = p$('productId').value.trim();

    if (!name) return alert('أدخل اسم المنتج.');
    if (price < 0 || stock < 0) return alert('السعر والكمية لا يمكن أن يكونا سالبين.');

    let image = p$('productImage').value.trim();

    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        image = reader.result;
        await save(image);
      };
      reader.readAsDataURL(file);
    } else {
      await save(image);
    }

    async function save(imageValue) {
      // IMPORTANT: the database column `id` may be UUID.
      // Never send a human-readable PROD-... value into a UUID column.
      // Supabase generates the UUID automatically when the DB default is configured.
      const payload = {
        name,
        description: p$('productDescription').value.trim(),
        price,
        stock,
        category: p$('productCategory').value.trim(),
        image: imageValue || null,
        active: p$('productActive').checked
      };

      let result;

      if (id) {
        result = await supabase.from('products').update(payload).eq('id', id);
      } else {
        result = await supabase.from('products').insert(payload);
      }

      if (result.error) {
        return alert("تعذر حفظ المنتج:\n\n" + (result.error.message || result.error.details || ''));
      }

      form.reset();
      p$('productId').value = '';
      p$('productCancel').hidden = true;

      await renderProducts();
      alert('تم حفظ المنتج بنجاح.');
    }
  });

  p$('productCancel')?.addEventListener('click', () => {
    form?.reset();
    p$('productId').value = '';
    p$('productCancel').hidden = true;
  });

  p$('productSearch')?.addEventListener('input', renderProducts);

  renderProducts();
})();
