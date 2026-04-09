// ── Builder module ────────────────────────────────────────────────────────────
(function () {
  let previewPageIdx = 0; // which page is currently shown in preview

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('paperSize').addEventListener('change', e => {
      App.paperKey = e.target.value;
      refreshPreview();
    });

    document.getElementById('confirmAddPage').addEventListener('click', addPage);
    document.getElementById('printBtn').addEventListener('click', doPrint);
    document.getElementById('prevPageBtn').addEventListener('click', () => navigatePreview(-1));
    document.getElementById('nextPageBtn').addEventListener('click', () => navigatePreview(1));

    window.addEventListener('resize', debounce(refreshPreview, 150));
    window.builderActivated = refreshPreview;
  });

  // ── Add page ────────────────────────────────────────────────────────────────
  function addPage() {
    const type = document.getElementById('newPageType').value;
    const page = {
      id: uid(),
      type,
      label: PAGE_TYPES[type]?.label || type,
      data: buildDefaultData(type)
    };
    App.pages.push(page);
    document.getElementById('addPageModal').classList.remove('open');

    // Auto-switch paper size to match the certificate type's default
    const defaultPaper = PAGE_TYPES[type]?.defaultPaper;
    if (defaultPaper && App.pages.length === 1) {
      App.paperKey = defaultPaper;
      document.getElementById('paperSize').value = defaultPaper;
    }

    const newIdx = App.pages.length - 1;
    selectPage(newIdx);
    renderPageList();
    previewPageIdx = newIdx;
    refreshPreview();
  }

  function buildDefaultData(type) {
    const s = App.settings;
    const base = {
      secretaryName: s.defaultSecretary || '',
      councilName:   s.defaultCouncil   || '',
      pastorName:    s.defaultPastor    || '',
      churchName:    s.churchName       || '',
      churchAddress: s.churchAddress    || '',
      baptismYear:   String(new Date().getFullYear()).slice(-2)
    };
    if (type === 'dedication') base.sponsors = '';
    return base;
  }

  // ── Page list rendering ──────────────────────────────────────────────────────
  function renderPageList() {
    const list = document.getElementById('pageList');
    list.innerHTML = '';
    App.pages.forEach((page, i) => {
      const item = document.createElement('div');
      item.className = 'page-item' + (i === App.currentPageIdx ? ' active' : '');
      item.innerHTML = `
        <div class="page-item-num">${i + 1}</div>
        <div class="page-item-info">
          <div class="page-item-type">${page.label}</div>
          <div class="page-item-sub">${getPageSubtitle(page)}</div>
        </div>
        <button class="page-item-del" title="Remove page">&times;</button>`;
      item.addEventListener('click', e => {
        if (e.target.classList.contains('page-item-del')) { deletePage(i); return; }
        selectPage(i);
        previewPageIdx = i;
        refreshPreview();
      });
      list.appendChild(item);
    });
  }

  function getPageSubtitle(page) {
    const name = page.data?.recipientName;
    return name ? name : '(no name yet)';
  }

  function deletePage(idx) {
    App.pages.splice(idx, 1);
    if (App.currentPageIdx >= App.pages.length) App.currentPageIdx = App.pages.length - 1;
    if (previewPageIdx >= App.pages.length) previewPageIdx = Math.max(0, App.pages.length - 1);
    renderPageList();
    if (App.pages.length === 0) {
      App.currentPageIdx = -1;
      document.getElementById('certForm').innerHTML = '<p class="form-empty-msg">Add a page to begin.</p>';
    } else {
      selectPage(App.currentPageIdx);
    }
    refreshPreview();
  }

  // ── Page selection & form ────────────────────────────────────────────────────
  function selectPage(idx) {
    App.currentPageIdx = idx;
    document.querySelectorAll('.page-item').forEach((el, i) =>
      el.classList.toggle('active', i === idx));
    if (idx >= 0 && idx < App.pages.length) renderForm(App.pages[idx]);
  }

  function renderForm(page) {
    const schema = FORM_SCHEMAS[page.type];
    if (!schema) { document.getElementById('certForm').innerHTML = '<p>No form available for this type.</p>'; return; }

    const form = document.getElementById('certForm');
    form.innerHTML = `<div class="form-section-title" style="font-size:13px;font-weight:700;margin-bottom:12px;">${page.label}</div>`;

    schema.forEach(section => {
      const sec = document.createElement('div');
      sec.className = 'form-section';
      sec.innerHTML = `<div class="form-section-title">${section.title}</div>`;

      section.fields.forEach(f => {
        const row = document.createElement('div');
        row.className = 'form-row';

        const label = document.createElement('label');
        label.setAttribute('for', `field-${f.key}`);
        label.textContent = f.label;
        row.appendChild(label);

        let input;
        if (f.type === 'textarea') {
          input = document.createElement('textarea');
          input.rows = f.rows || 6;
          input.className = 'form-input';
          input.placeholder = f.placeholder || '';
        } else {
          input = document.createElement('input');
          input.type = 'text';
          input.className = 'form-input';
          input.placeholder = f.placeholder || '';
          if (f.maxlength) input.maxLength = f.maxlength;
        }
        input.id = `field-${f.key}`;
        input.value = page.data?.[f.key] ?? '';

        const debouncedUpdate = debounce(() => {
          page.data[f.key] = input.value;
          renderPageList(); // update subtitle
          refreshPreview();
        }, 200);

        input.addEventListener('input', debouncedUpdate);
        row.appendChild(input);

        if (f.hint) {
          const hint = document.createElement('div');
          hint.className = 'form-hint';
          hint.textContent = f.hint;
          row.appendChild(hint);
        }

        sec.appendChild(row);
      });

      form.appendChild(sec);
    });
  }

  // ── Preview rendering ────────────────────────────────────────────────────────
  function refreshPreview() {
    updatePreviewNav();

    const certEl = document.getElementById('certPreview');
    const wrapEl = document.getElementById('certPreviewWrap');
    const container = document.getElementById('previewContainer');

    if (App.pages.length === 0 || previewPageIdx < 0) {
      certEl.style.width  = '0';
      certEl.style.height = '0';
      certEl.innerHTML = '';
      return;
    }

    const page = App.pages[previewPageIdx];
    if (!page) return;

    const pt = PAGE_TYPES[page.type];
    if (!pt) return;

    const tpl = App.templates[pt.templateKey];
    if (!tpl) return;

    const pageTpl = tpl.pages[pt.pageIdx];
    if (!pageTpl) return;

    const p = PAPER[App.paperKey];
    certEl.style.width  = p.w + 'px';
    certEl.style.height = p.h + 'px';

    const availW = container.offsetWidth  - 48;
    const availH = container.offsetHeight - 48;
    const scale  = Math.min(availW / p.w, availH / p.h, 1);

    certEl.style.transform       = `scale(${scale})`;
    certEl.style.transformOrigin = 'top left';

    wrapEl.style.width  = Math.ceil(p.w * scale) + 'px';
    wrapEl.style.height = Math.ceil(p.h * scale) + 'px';

    renderCertPage(certEl, pageTpl, page.data || {});
  }

  function updatePreviewNav() {
    const total = App.pages.length;
    document.getElementById('previewPageLabel').textContent =
      total === 0 ? '—' : `Page ${previewPageIdx + 1} of ${total}`;
    document.getElementById('prevPageBtn').disabled = previewPageIdx <= 0;
    document.getElementById('nextPageBtn').disabled = previewPageIdx >= total - 1;
  }

  function navigatePreview(dir) {
    previewPageIdx = Math.max(0, Math.min(App.pages.length - 1, previewPageIdx + dir));
    updatePreviewNav();
    refreshPreview();
  }

})();
