/* FITNESS GYM - Admin products & gallery manager */
(() => {
  const storeEl = id => document.getElementById(id);

  const storeEsc = v =>
    String(v ?? '').replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m]));

  const storeMoney = n =>
    `₪${Number(n || 0).toLocaleString('en-US')}`;

  const STORAGE_BUCKET = 'gym-images';

  let products = [];
  let gallery = [];

  /* =========================
     تحميل المنتجات والمعرض
  ========================= */

  async function loadStore() {
    // تحميل المنتجات بشكل مستقل
    const productsResult = await supabaseClient
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (productsResult.error) {
      throw productsResult.error;
    }

    products = productsResult.data || [];

    renderProducts();

    // تحميل المعرض بشكل مستقل
    // حتى لا يمنع خطأ gallery ظهور المنتجات
    const galleryResult = await supabaseClient
      .from('gallery')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (galleryResult.error) {
      console.error(
        'Gallery load error:',
        galleryResult.error
      );

      gallery = [];
    } else {
      gallery = galleryResult.data || [];
    }

    renderGallery();
  }

  /* =========================
     معاينة الصور
  ========================= */

  function preview(inputId, previewId) {
    const input = storeEl(inputId);
    const box = storeEl(previewId);

    if (!box) return;

    const url =
      input?.value?.trim() || '';

    box.innerHTML = url
      ? `
        <img
          src="${storeEsc(url)}"
          alt="معاينة"
          onerror="this.style.display='none'"
        >
      `
      : '';
  }

  function previewFile(fileInputId, previewId) {
    const input = storeEl(fileInputId);
    const box = storeEl(previewId);
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

    box.innerHTML = `
      <img
        src="${url}"
        alt="معاينة"
      >
    `;
  }

  /* =========================
     رفع الصور إلى Supabase
  ========================= */

  async function uploadImage(file, folder) {
    if (!file) return '';

    if (!file.type.startsWith('image/')) {
      throw new Error(
        'الملف المختار ليس صورة.'
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error(
        'حجم الصورة أكبر من 5MB.'
      );
    }

    const ext =
      (
        file.name.split('.').pop() || 'jpg'
      )
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '') || 'jpg';

    const uniqueId =
      typeof crypto !== 'undefined' &&
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : Math.random()
            .toString(36)
            .slice(2);

    const path =
      `${folder}/${Date.now()}-${uniqueId}.${ext}`;

    const uploadResult =
      await supabaseClient
        .storage
        .from(STORAGE_BUCKET)
        .upload(
          path,
          file,
          {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type
          }
        );

    if (uploadResult.error) {
      throw uploadResult.error;
    }

    const publicResult =
      supabaseClient
        .storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(path);

    if (!publicResult?.data?.publicUrl) {
      throw new Error(
        'تعذر إنشاء رابط الصورة.'
      );
    }

    return publicResult.data.publicUrl;
  }

  /* =========================
     عرض المنتجات
  ========================= */

  function renderProducts() {
    const body =
      storeEl('productsAdminBody');

    if (!body) return;

    const q =
      (
        storeEl('productSearch')?.value ||
        ''
      )
        .toLowerCase()
        .trim();

    const rows =
      products.filter(p =>
        `${p.name || ''} ${p.category || ''}`
          .toLowerCase()
          .includes(q)
      );

    body.innerHTML =
      rows
        .map(p => `
          <tr>

            <td>
              ${
                p.image_url
                  ? `
                    <img
                      class="admin-thumb"
                      src="${storeEsc(p.image_url)}"
                      alt=""
                      onerror="this.style.opacity=.25"
                    >
                  `
                  : '—'
              }
            </td>

            <td>
              <b>${storeEsc(p.name)}</b>
              <small>
                ${storeEsc(p.category || '')}
              </small>
            </td>

            <td>
              ${storeMoney(p.price)}
            </td>

            <td>
              ${Number(p.stock || 0)}
            </td>

            <td>
              <span
                class="status-pill ${p.active ? 'on' : 'off'}"
              >
                ${p.active ? 'ظاهر' : 'مخفي'}
              </span>
            </td>

            <td>
              <div class="mini-row">

                <button
                  class="mini edit"
                  type="button"
                  onclick="editProduct('${storeEsc(p.id)}')"
                >
                  تعديل
                </button>

                <button
                  class="mini"
                  type="button"
                  onclick="toggleProduct('${storeEsc(p.id)}')"
                >
                  ${p.active ? 'إخفاء' : 'إظهار'}
                </button>

                <button
                  class="mini danger"
                  type="button"
                  onclick="deleteProduct('${storeEsc(p.id)}')"
                >
                  حذف
                </button>

              </div>
            </td>

          </tr>
        `)
        .join('') ||

      `
        <tr>
          <td
            colspan="6"
            class="empty"
          >
            لا توجد منتجات
          </td>
        </tr>
      `;
  }

  /* =========================
     عرض المعرض
  ========================= */

  function renderGallery() {
    const body =
      storeEl('galleryAdminBody');

    if (!body) return;

    body.innerHTML =
      gallery
        .map(g => `
          <tr>

            <td>
              ${
                g.image_url
                  ? `
                    <img
                      class="admin-thumb"
                      src="${storeEsc(g.image_url)}"
                      alt=""
                      onerror="this.style.opacity=.25"
                    >
                  `
                  : '—'
              }
            </td>

            <td>
              ${storeEsc(
                g.title || 'بدون عنوان'
              )}
            </td>

            <td>
              ${Number(g.sort_order || 0)}
            </td>

            <td>
              <span
                class="status-pill ${g.active ? 'on' : 'off'}"
              >
                ${g.active ? 'ظاهر' : 'مخفي'}
              </span>
            </td>

            <td>
              <div class="mini-row">

                <button
                  class="mini edit"
                  type="button"
                  onclick="editGallery('${storeEsc(g.id)}')"
                >
                  تعديل
                </button>

                <button
                  class="mini"
                  type="button"
                  onclick="toggleGallery('${storeEsc(g.id)}')"
                >
                  ${g.active ? 'إخفاء' : 'إظهار'}
                </button>

                <button
                  class="mini danger"
                  type="button"
                  onclick="deleteGallery('${storeEsc(g.id)}')"
                >
                  حذف
                </button>

              </div>
            </td>

          </tr>
        `)
        .join('') ||

      `
        <tr>
          <td
            colspan="5"
            class="empty"
          >
            لا توجد صور في المعرض
          </td>
        </tr>
      `;
  }

  /* =========================
     إعادة ضبط نموذج المنتج
  ========================= */

  function resetProductForm() {
    storeEl('productAdminForm')?.reset();

    if (storeEl('productActive')) {
      storeEl('productActive').checked = true;
    }

    const id = storeEl('productId');
    const title = storeEl('productFormTitle');
    const save = storeEl('productSaveBtn');
    const cancel = storeEl('productCancelBtn');
    const previewBox = storeEl('productPreview');

    if (id) id.value = '';

    if (title) {
      title.textContent = 'إضافة منتج';
    }

    if (save) {
      save.textContent = 'حفظ المنتج';
    }

    if (cancel) {
      cancel.hidden = true;
    }

    if (previewBox) {
      previewBox.innerHTML = '';
    }
  }

  /* =========================
     إعادة ضبط نموذج المعرض
  ========================= */

  function resetGalleryForm() {
    storeEl('galleryAdminForm')?.reset();

    if (storeEl('galleryActive')) {
      storeEl('galleryActive').checked = true;
    }

    if (storeEl('gallerySortOrder')) {
      storeEl('gallerySortOrder').value = 0;
    }

    const id = storeEl('galleryId');
    const title = storeEl('galleryFormTitle');
    const save = storeEl('gallerySaveBtn');
    const cancel = storeEl('galleryCancelBtn');
    const previewBox = storeEl('galleryPreview');

    if (id) id.value = '';

    if (title) {
      title.textContent =
        'إضافة صورة للمعرض';
    }

    if (save) {
      save.textContent = 'حفظ الصورة';
    }

    if (cancel) {
      cancel.hidden = true;
    }

    if (previewBox) {
      previewBox.innerHTML = '';
    }
  }

  /* =========================
     تعديل منتج
  ========================= */

  window.editProduct = id => {
    const p =
      products.find(x => x.id === id);

    if (!p) return;

    storeEl('productId').value = p.id;
    storeEl('productName').value =
      p.name || '';

    storeEl('productDescription').value =
      p.description || '';

    storeEl('productPrice').value =
      p.price ?? 0;

    storeEl('productStock').value =
      p.stock ?? 0;

    storeEl('productCategory').value =
      p.category || '';

    storeEl('productImageUrl').value =
      p.image_url || '';

    storeEl('productActive').checked =
      !!p.active;

    storeEl('productFormTitle').textContent =
      'تعديل المنتج';

    storeEl('productSaveBtn').textContent =
      'حفظ التعديلات';

    storeEl('productCancelBtn').hidden =
      false;

    preview(
      'productImageUrl',
      'productPreview'
    );

    storeEl('productName')?.focus();
  };

  /* =========================
     تعديل صورة المعرض
  ========================= */

  window.editGallery = id => {
    const g =
      gallery.find(x => x.id === id);

    if (!g) return;

    storeEl('galleryId').value = g.id;

    storeEl('galleryTitle').value =
      g.title || '';

    storeEl('galleryImageUrl').value =
      g.image_url || '';

    storeEl('gallerySortOrder').value =
      g.sort_order ?? 0;

    storeEl('galleryActive').checked =
      !!g.active;

    storeEl('galleryFormTitle').textContent =
      'تعديل صورة المعرض';

    storeEl('gallerySaveBtn').textContent =
      'حفظ التعديلات';

    storeEl('galleryCancelBtn').hidden =
      false;

    preview(
      'galleryImageUrl',
      'galleryPreview'
    );

    storeEl('galleryTitle')?.focus();
  };

  /* =========================
     إظهار / إخفاء منتج
  ========================= */

  window.toggleProduct = async id => {
    const p =
      products.find(x => x.id === id);

    if (!p) return;

    const result =
      await supabaseClient
        .from('products')
        .update({
          active: !p.active
        })
        .eq('id', id);

    if (result.error) {
      alert(
        `تعذر تغيير حالة المنتج: ${
          result.error.message || ''
        }`
      );
      return;
    }

    p.active = !p.active;

    renderProducts();
  };

  /* =========================
     إظهار / إخفاء صورة
  ========================= */

  window.toggleGallery = async id => {
    const g =
      gallery.find(x => x.id === id);

    if (!g) return;

    const result =
      await supabaseClient
        .from('gallery')
        .update({
          active: !g.active
        })
        .eq('id', id);

    if (result.error) {
      alert(
        `تعذر تغيير حالة الصورة: ${
          result.error.message || ''
        }`
      );
      return;
    }

    g.active = !g.active;

    renderGallery();
  };

  /* =========================
     حذف منتج
  ========================= */

  window.deleteProduct = async id => {
    if (!confirm('هل تريد حذف المنتج؟')) {
      return;
    }

    const result =
      await supabaseClient
        .from('products')
        .delete()
        .eq('id', id);

    if (result.error) {
      alert(
        `تعذر حذف المنتج: ${
          result.error.message || ''
        }`
      );
      return;
    }

    products =
      products.filter(p => p.id !== id);

    renderProducts();
  };

  /* =========================
     حذف صورة المعرض
  ========================= */

  window.deleteGallery = async id => {
    if (!confirm('هل تريد حذف صورة المعرض؟')) {
      return;
    }

    const result =
      await supabaseClient
        .from('gallery')
        .delete()
        .eq('id', id);

    if (result.error) {
      alert(
        `تعذر حذف الصورة: ${
          result.error.message || ''
        }`
      );
      return;
    }

    gallery =
      gallery.filter(g => g.id !== id);

    renderGallery();
  };

  /* =========================
     حفظ المنتج
  ========================= */

  storeEl('productAdminForm')
    ?.addEventListener(
      'submit',
      async e => {
        e.preventDefault();

        const btn =
          storeEl('productSaveBtn');

        if (!btn) return;

        btn.disabled = true;
        btn.textContent =
          'جاري الحفظ...';

        const id =
          storeEl('productId')?.value || '';

        try {
          let imageUrl =
            storeEl('productImageUrl')
              ?.value
              ?.trim() || '';

          const file =
            storeEl('productImageFile')
              ?.files?.[0];

          if (file) {
            btn.textContent =
              'جاري رفع الصورة...';

            imageUrl =
              await uploadImage(
                file,
                'products'
              );
          }

          if (!imageUrl) {
            throw new Error(
              'اختر صورة أو أدخل رابط صورة.'
            );
          }

          const payload = {
            name:
              storeEl('productName')
                ?.value
                ?.trim() || '',

            description:
              storeEl('productDescription')
                ?.value
                ?.trim() || '',

            price:
              Number(
                storeEl('productPrice')
                  ?.value || 0
              ),

            stock:
              Number(
                storeEl('productStock')
                  ?.value || 0
              ),

            category:
              storeEl('productCategory')
                ?.value
                ?.trim() || '',

            image_url: imageUrl,

            active:
              !!storeEl('productActive')
                ?.checked
          };

          let result;

          if (id) {
            result =
              await supabaseClient
                .from('products')
                .update(payload)
                .eq('id', id)
                .select()
                .single();
          } else {
            result =
              await supabaseClient
                .from('products')
                .insert(payload)
                .select()
                .single();
          }

          if (result.error) {
            throw result.error;
          }

          /*
            بعد الحفظ نعيد قراءة المنتجات من Supabase
            للتأكد من ظهور المنتج الجديد مباشرة.
          */
          const productsReload =
            await supabaseClient
              .from('products')
              .select('*')
              .order(
                'created_at',
                { ascending: false }
              );

          if (productsReload.error) {
            throw productsReload.error;
          }

          products =
            productsReload.data || [];

          resetProductForm();

          renderProducts();

          alert(
            id
              ? 'تم تحديث المنتج.'
              : 'تمت إضافة المنتج.'
          );

        } catch (err) {
          console.error(
            'Product save error:',
            err
          );

          alert(
            `تعذر حفظ المنتج: ${
              err.message ||
              'خطأ غير معروف'
            }`
          );

        } finally {
          btn.disabled = false;

          if (
            !storeEl('productId')?.value
          ) {
            btn.textContent =
              'حفظ المنتج';
          }
        }
      }
    );

  /* =========================
     حفظ صورة المعرض
  ========================= */

  storeEl('galleryAdminForm')
    ?.addEventListener(
      'submit',
      async e => {
        e.preventDefault();

        const btn =
          storeEl('gallerySaveBtn');

        if (!btn) return;

        btn.disabled = true;
        btn.textContent =
          'جاري الحفظ...';

        const id =
          storeEl('galleryId')?.value ||
          '';

        try {
          let imageUrl =
            storeEl('galleryImageUrl')
              ?.value
              ?.trim() || '';

          const file =
            storeEl('galleryImageFile')
              ?.files?.[0];

          if (file) {
            btn.textContent =
              'جاري رفع الصورة...';

            imageUrl =
              await uploadImage(
                file,
                'gallery'
              );
          }

          if (!imageUrl) {
            throw new Error(
              'اختر صورة أو أدخل رابط صورة.'
            );
          }

          const payload = {
            title:
              storeEl('galleryTitle')
                ?.value
                ?.trim() || '',

            image_url:
              imageUrl,

            sort_order:
              Number(
                storeEl('gallerySortOrder')
                  ?.value || 0
              ),

            active:
              !!storeEl('galleryActive')
                ?.checked
          };

          let result;

          if (id) {
            result =
              await supabaseClient
                .from('gallery')
                .update(payload)
                .eq('id', id)
                .select()
                .single();
          } else {
            result =
              await supabaseClient
                .from('gallery')
                .insert(payload)
                .select()
                .single();
          }

          if (result.error) {
            throw result.error;
          }

          /*
            إعادة تحميل المعرض من Supabase
            بعد الحفظ.
          */
          const galleryReload =
            await supabaseClient
              .from('gallery')
              .select('*')
              .order(
                'sort_order',
                { ascending: true }
              )
              .order(
                'created_at',
                { ascending: false }
              );

          if (galleryReload.error) {
            throw galleryReload.error;
          }

          gallery =
            galleryReload.data || [];

          resetGalleryForm();

          renderGallery();

          alert(
            id
              ? 'تم تحديث الصورة.'
              : 'تمت إضافة الصورة للمعرض.'
          );

        } catch (err) {
          console.error(
            'Gallery save error:',
            err
          );

          alert(
            `تعذر حفظ الصورة: ${
              err.message ||
              'خطأ غير معروف'
            }`
          );

        } finally {
          btn.disabled = false;

          if (
            !storeEl('galleryId')?.value
          ) {
            btn.textContent =
              'حفظ الصورة';
          }
        }
      }
    );

  /* =========================
     البحث والمعاينة
  ========================= */

  storeEl('productSearch')
    ?.addEventListener(
      'input',
      renderProducts
    );

  storeEl('productImageUrl')
    ?.addEventListener(
      'input',
      () =>
        preview(
          'productImageUrl',
          'productPreview'
        )
    );

  storeEl('galleryImageUrl')
    ?.addEventListener(
      'input',
      () =>
        preview(
          'galleryImageUrl',
          'galleryPreview'
        )
    );

  storeEl('productImageFile')
    ?.addEventListener(
      'change',
      () =>
        previewFile(
          'productImageFile',
          'productPreview'
        )
    );

  storeEl('galleryImageFile')
    ?.addEventListener(
      'change',
      () =>
        previewFile(
          'galleryImageFile',
          'galleryPreview'
        )
    );

  storeEl('productCancelBtn')
    ?.addEventListener(
      'click',
      resetProductForm
    );

  storeEl('galleryCancelBtn')
    ?.addEventListener(
      'click',
      resetGalleryForm
    );

  /* =========================
     تشغيل إدارة المتجر
  ========================= */

  async function bootStore() {
    if (!storeEl('tab-store')) {
      return;
    }

    try {
      await requireAdmin();
      await loadStore();

    } catch (e) {
      console.error(
        'Store boot error:',
        e
      );

      alert(
        `تعذر تحميل المنتجات والمعرض: ${
          e.message ||
          'خطأ غير معروف'
        }`
      );
    }
  }

  bootStore();

})();
