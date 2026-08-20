/* FITNESS GYM - Admin products & gallery manager */
(() => {
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#039;'
  }[m]));
  const money = n => `₪${Number(n || 0).toLocaleString('en-US')}`;
  const STORAGE_BUCKET = 'gym-images';

  let products = [];
  let gallery = [];

  async function loadStore() {
    // تحميل المنتجات بشكل مستقل عن المعرض
    const pRes = await supabaseClient
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (pRes.error) throw pRes.error;

    products = pRes.data || [];
    renderProducts();

    // تحميل المعرض بشكل مستقل حتى لا يمنع خطأ المعرض ظهور المنتجات
    const gRes = await supabaseClient
      .from('gallery')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (gRes.error) {
      console.error('تعذر تحميل المعرض:', gRes.error);
      gallery = [];
    } else {
      gallery = gRes.data || [];
    }

    renderGallery();
  }

  function preview(inputId, previewId) {
    const url = $(inputId)?.value.trim();
    const box = $(previewId);

    if (!box) return;

    box.innerHTML = url
      ? `<img src="${esc(url)}" alt="معاينة" onerror="this.style.display='none'">`
      : '';
  }

  function previewFile(fileInputId, previewId) {
    const input = $(fileInputId);
    const box = $(previewId);
    const file = input?.files?.[0];

    if (!box || !file) return;

    if (!file.type.startsWith('image/')) {
      input.value = '';
      box.innerHTML = '';
      alert('الملف يجب أن يكون صورة.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      input.value = '';
      box.innerHTML = '';
      alert('حجم الصورة يجب ألا يتجاوز 5MB.');
      return;
    }

    const url = URL.createObjectURL(file);
    box.innerHTML = `<img src="${url}" alt="معاينة">`;
  }

  async function uploadImage(file, folder) {
    if (!file) return '';

    if (!file.type.startsWith('image/')) {
      throw new Error('الملف المختار ليس صورة.');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error('حجم الصورة أكبر من 5MB.');
    }

    const ext =
      (file.name.split('.').pop() || 'jpg')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '') || 'jpg';

    const path =
      `${folder}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const { error } = await supabaseClient
      .storage
      .from(STORAGE_BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    if (error) throw error;

    const { data } =
      supabaseClient
        .storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(path);

    if (!data?.publicUrl) {
      throw new Error('تعذر إنشاء رابط الصورة.');
    }

    return data.publicUrl;
  }

  function renderProducts() {
    const body = $('productsAdminBody');

    if (!body) return;

    const q =
      ($('productSearch')?.value || '')
        .toLowerCase()
        .trim();

    const rows = products.filter(p =>
      `${p.name || ''} ${p.category || ''}`
        .toLowerCase()
        .includes(q)
    );

    body.innerHTML =
      rows.map(p => `
        <tr>
          <td>
            ${
              p.image_url
                ? `<img class="admin-thumb" src="${esc(p.image_url)}" alt="" onerror="this.style.opacity=.25">`
                : '—'
            }
          </td>

          <td>
            <b>${esc(p.name)}</b>
            <small>${esc(p.category || '')}</small>
          </td>

          <td>${money(p.price)}</td>

          <td>${Number(p.stock || 0)}</td>

          <td>
            <span class="status-pill ${p.active ? 'on':'off'}">
              ${p.active ? 'ظاهر':'مخفي'}
            </span>
          </td>

          <td>
            <div class="mini-row">
              <button
                class="mini edit"
                type="button"
                onclick="editProduct('${p.id}')">
                تعديل
              </button>

              <button
                class="mini"
                type="button"
                onclick="toggleProduct('${p.id}')">
                ${p.active ? 'إخفاء':'إظهار'}
              </button>

              <button
                class="mini danger"
                type="button"
                onclick="deleteProduct('${p.id}')">
                حذف
              </button>
            </div>
          </td>
        </tr>
      `).join('') ||
      `<tr>
        <td colspan="6" class="empty">
          لا توجد منتجات
        </td>
      </tr>`;
  }

  function renderGallery() {
    const body = $('galleryAdminBody');

    if (!body) return;

    body.innerHTML =
      gallery.map(g => `
        <tr>
          <td>
            ${
              g.image_url
                ? `<img class="admin-thumb" src="${esc(g.image_url)}" alt="" onerror="this.style.opacity=.25">`
                : '—'
            }
          </td>

          <td>${esc(g.title || 'بدون عنوان')}</td>

          <td>${Number(g.sort_order || 0)}</td>

          <td>
            <span class="status-pill ${g.active ? 'on':'off'}">
              ${g.active ? 'ظاهر':'مخفي'}
            </span>
          </td>

          <td>
            <div class="mini-row">
              <button
                class="mini edit"
                type="button"
                onclick="editGallery('${g.id}')">
                تعديل
              </button>

              <button
                class="mini"
                type="button"
                onclick="toggleGallery('${g.id}')">
                ${g.active ? 'إخفاء':'إظهار'}
              </button>

              <button
                class="mini danger"
                type="button"
                onclick="deleteGallery('${g.id}')">
                حذف
              </button>
            </div>
          </td>
        </tr>
      `).join('') ||
      `<tr>
        <td colspan="5" class="empty">
          لا توجد صور في المعرض
        </td>
      </tr>`;
  }

  function resetProductForm() {
    $('productAdminForm')?.reset();

    if ($('productActive')) {
      $('productActive').checked = true;
    }

    $('productId').value = '';
    $('productFormTitle').textContent = 'إضافة منتج';
    $('productSaveBtn').textContent = 'حفظ المنتج';
    $('productCancelBtn').hidden = true;
    $('productPreview').innerHTML = '';
  }

  function resetGalleryForm() {
    $('galleryAdminForm')?.reset();

    if ($('galleryActive')) {
      $('galleryActive').checked = true;
    }

    $('gallerySortOrder').value = 0;
    $('galleryId').value = '';
    $('galleryFormTitle').textContent = 'إضافة صورة للمعرض';
    $('gallerySaveBtn').textContent = 'حفظ الصورة';
    $('galleryCancelBtn').hidden = true;
    $('galleryPreview').innerHTML = '';
  }

  window.editProduct = id => {
    const p = products.find(x => x.id === id);

    if (!p) return;

    $('productId').value = p.id;
    $('productName').value = p.name || '';
    $('productDescription').value = p.description || '';
    $('productPrice').value = p.price ?? 0;
    $('productStock').value = p.stock ?? 0;
    $('productCategory').value = p.category || '';
    $('productImageUrl').value = p.image_url || '';
    $('productActive').checked = !!p.active;

    $('productFormTitle').textContent = 'تعديل المنتج';
    $('productSaveBtn').textContent = 'حفظ التعديلات';
    $('productCancelBtn').hidden = false;

    preview('productImageUrl', 'productPreview');

    $('productName').focus();
  };

  window.editGallery = id => {
    const g = gallery.find(x => x.id === id);

    if (!g) return;

    $('galleryId').value = g.id;
    $('galleryTitle').value = g.title || '';
    $('galleryImageUrl').value = g.image_url || '';
    $('gallerySortOrder').value = g.sort_order ?? 0;
    $('galleryActive').checked = !!g.active;

    $('galleryFormTitle').textContent = 'تعديل صورة المعرض';
    $('gallerySaveBtn').textContent = 'حفظ التعديلات';
    $('galleryCancelBtn').hidden = false;

    preview('galleryImageUrl', 'galleryPreview');

    $('galleryTitle').focus();
  };

  window.toggleProduct = async id => {
    const p = products.find(x => x.id === id);

    if (!p) return;

    const { error } =
      await supabaseClient
        .from('products')
        .update({ active: !p.active })
        .eq('id', id);

    if (error) {
      return alert('تعذر تغيير حالة المنتج.');
    }

    p.active = !p.active;

    renderProducts();
  };

  window.toggleGallery = async id => {
    const g = gallery.find(x => x.id === id);

    if (!g) return;

    const { error } =
      await supabaseClient
        .from('gallery')
        .update({ active: !g.active })
        .eq('id', id);

    if (error) {
      return alert('تعذر تغيير حالة الصورة.');
    }

    g.active = !g.active;

    renderGallery();
  };

  window.deleteProduct = async id => {
    if (!confirm('هل تريد حذف المنتج؟')) return;

    const { error } =
      await supabaseClient
        .from('products')
        .delete()
        .eq('id', id);

    if (error) {
      return alert('تعذر حذف المنتج.');
    }

    products =
      products.filter(p => p.id !== id);

    renderProducts();
  };

  window.deleteGallery = async id => {
    if (!confirm('هل تريد حذف صورة المعرض؟')) return;

    const { error } =
      await supabaseClient
        .from('gallery')
        .delete()
        .eq('id', id);

    if (error) {
      return alert('تعذر حذف الصورة.');
    }

    gallery =
      gallery.filter(g => g.id !== id);

    renderGallery();
  };

  $('productAdminForm')?.addEventListener('submit', async e => {
    e.preventDefault();

    const btn = $('productSaveBtn');

    btn.disabled = true;
    btn.textContent = 'جاري الحفظ...';

    const id = $('productId').value;

    try {
      let imageUrl =
        $('productImageUrl').value.trim();

      const file =
        $('productImageFile')?.files?.[0];

      if (file) {
        btn.textContent = 'جاري رفع الصورة...';

        imageUrl =
          await uploadImage(file, 'products');
      }

      if (!imageUrl) {
        throw new Error(
          'اختر صورة أو أدخل رابط صورة.'
        );
      }

      const payload = {
        name: $('productName').value.trim(),
        description: $('productDescription').value.trim(),
        price: Number($('productPrice').value || 0),
        stock: Number($('productStock').value || 0),
        category: $('productCategory').value.trim(),
        image_url: imageUrl,
        active: $('productActive').checked
      };

      let res;

      if (id) {
        res =
          await supabaseClient
            .from('products')
            .update(payload)
            .eq('id', id)
            .select()
            .single();
      } else {
        res =
          await supabaseClient
            .from('products')
            .insert(payload)
            .select()
            .single();
      }

      if (res.error) {
        throw res.error;
      }

      // إعادة تحميل المنتجات من Supabase بعد الحفظ
      // للتأكد من ظهور المنتج الجديد مباشرة.
      await loadStore();

      resetProductForm();

      renderProducts();

      alert(
        id
          ? 'تم تحديث المنتج.'
          : 'تمت إضافة المنتج.'
      );

    } catch (err) {
      console.error(err);

      alert(
        `تعذر حفظ المنتج: ${
          err.message || 'خطأ غير معروف'
        }`
      );

    } finally {
      btn.disabled = false;

      if (!$('productId').value) {
        btn.textContent = 'حفظ المنتج';
      }
    }
  });

  $('galleryAdminForm')?.addEventListener('submit', async e => {
    e.preventDefault();

    const btn = $('gallerySaveBtn');

    btn.disabled = true;
    btn.textContent = 'جاري الحفظ...';

    const id = $('galleryId').value;

    try {
      let imageUrl =
        $('galleryImageUrl').value.trim();

      const file =
        $('galleryImageFile')?.files?.[0];

      if (file) {
        btn.textContent = 'جاري رفع الصورة...';

        imageUrl =
          await uploadImage(file, 'gallery');
      }

      if (!imageUrl) {
        throw new Error(
          'اختر صورة أو أدخل رابط صورة.'
        );
      }

      const payload = {
        title: $('galleryTitle').value.trim(),
        image_url: imageUrl,
        sort_order:
          Number(
            $('gallerySortOrder').value || 0
          ),
        active:
          $('galleryActive').checked
      };

      let res;

      if (id) {
        res =
          await supabaseClient
            .from('gallery')
            .update(payload)
            .eq('id', id)
            .select()
            .single();
      } else {
        res =
          await supabaseClient
            .from('gallery')
            .insert(payload)
            .select()
            .single();
      }

      if (res.error) {
        throw res.error;
      }

      if (id) {
        gallery =
          gallery.map(g =>
            g.id === id ? res.data : g
          );
      } else {
        gallery.push(res.data);
      }

      gallery.sort(
        (a, b) =>
          Number(a.sort_order || 0) -
          Number(b.sort_order || 0)
      );

      resetGalleryForm();
      renderGallery();

      alert(
        id
          ? 'تم تحديث الصورة.'
          : 'تمت إضافة الصورة للمعرض.'
      );

    } catch (err) {
      console.error(err);

      alert(
        `تعذر حفظ الصورة: ${
          err.message || 'خطأ غير معروف'
        }`
      );

    } finally {
      btn.disabled = false;

      if (!$('galleryId').value) {
        btn.textContent = 'حفظ الصورة';
      }
    }
  });

  $('productSearch')
    ?.addEventListener(
      'input',
      renderProducts
    );

  $('productImageUrl')
    ?.addEventListener(
      'input',
      () =>
        preview(
          'productImageUrl',
          'productPreview'
        )
    );

  $('galleryImageUrl')
    ?.addEventListener(
      'input',
      () =>
        preview(
          'galleryImageUrl',
          'galleryPreview'
        )
    );

  $('productImageFile')
    ?.addEventListener(
      'change',
      () =>
        previewFile(
          'productImageFile',
          'productPreview'
        )
    );

  $('galleryImageFile')
    ?.addEventListener(
      'change',
      () =>
        previewFile(
          'galleryImageFile',
          'galleryPreview'
        )
    );

  $('productCancelBtn')
    ?.addEventListener(
      'click',
      resetProductForm
    );

  $('galleryCancelBtn')
    ?.addEventListener(
      'click',
      resetGalleryForm
    );

  async function bootStore() {
    if (!$('tab-store')) return;

    try {
      await requireAdmin();
      await loadStore();

    } catch (e) {
      console.error(e);
      alert(
        'تعذر تحميل المنتجات والمعرض.'
      );
    }
  }

  bootStore();

})();
