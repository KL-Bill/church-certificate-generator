// ── Template Editor module ────────────────────────────────────────────────────
(function () {
  let currentType    = 'baptismal';
  let currentPageIdx = 0;
  let selectedFieldId = null;
  let dragging = null;
  let dragOrigin = {};
  let canvasScale = 1;

  // ── History ─────────────────────────────────────────────────────────────────
  let undoStack = [];
  let redoStack = [];
  const MAX_HISTORY = 50;

  function snapshot() {
    const pageTpl = App.templates[currentType]?.pages[currentPageIdx];
    if (!pageTpl) return null;
    return {
      fields:          deepClone(pageTpl.fields),
      backgroundColor: pageTpl.backgroundColor,
      background:      pageTpl.background,
      selectedFieldId
    };
  }

  function pushHistory() {
    const s = snapshot();
    if (!s) return;
    undoStack.push(s);
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack = [];
    updateHistoryButtons();
  }

  function applySnapshot(s) {
    const pageTpl = App.templates[currentType].pages[currentPageIdx];
    pageTpl.fields          = deepClone(s.fields);
    pageTpl.backgroundColor = s.backgroundColor;
    pageTpl.background      = s.background;
    renderEditor();
    // Re-select the field that was selected at that point in history
    if (s.selectedFieldId) {
      const field = pageTpl.fields.find(f => f.id === s.selectedFieldId);
      if (field) selectField(s.selectedFieldId);
    }
  }

  function undo() {
    if (undoStack.length === 0) return;
    redoStack.push(snapshot());
    applySnapshot(undoStack.pop());
    updateHistoryButtons();
    showToast('Undo');
  }

  function redo() {
    if (redoStack.length === 0) return;
    undoStack.push(snapshot());
    applySnapshot(redoStack.pop());
    updateHistoryButtons();
    showToast('Redo');
  }

  function clearHistory() {
    undoStack = [];
    redoStack = [];
    updateHistoryButtons();
  }

  function updateHistoryButtons() {
    const u = document.getElementById('undoBtn');
    const r = document.getElementById('redoBtn');
    if (u) u.disabled = undoStack.length === 0;
    if (r) r.disabled = redoStack.length === 0;
  }

  // ── Sample data ──────────────────────────────────────────────────────────────
  const SAMPLE_DATA = {
    recipientName: 'Sample Person Name',
    birthPlace:    'Tagum City, Davao del Norte',
    birthDate:     'December 27, 1998',
    baptismDay:    '8th', baptismMonth: 'June', baptismYear: '25',
    fatherName:    'Juan dela Cruz', motherName: 'Maria dela Cruz',
    secretaryName: '', councilName: '', pastorName: '',
    churchName: '', churchAddress: '',
    sponsors: 'John Doe\nJane Smith\nBob Johnson\nAlice Brown\nCharlie Davis\nEve Wilson\nFrank Taylor\nGrace Lee\nHenry Martin\nIsabel White\nJack Thomas\nLucy Adams'
  };

  // ── Init ─────────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('tplTypeSelect').addEventListener('change', e => {
      currentType    = e.target.value;
      currentPageIdx = 0;
      clearHistory();
      populatePageSelect();
      renderEditor();
    });
    document.getElementById('tplPageSelect').addEventListener('change', e => {
      currentPageIdx = parseInt(e.target.value);
      clearHistory();
      renderEditor();
    });
    document.getElementById('uploadBgBtn').addEventListener('click', () =>
      document.getElementById('bgFileInput').click());
    document.getElementById('bgFileInput').addEventListener('change', handleBgUpload);
    document.getElementById('removeBgBtn').addEventListener('click', handleBgRemove);
    document.getElementById('saveTemplateBtn').addEventListener('click', saveTemplate);
    document.getElementById('resetTemplateBtn').addEventListener('click', resetTemplate);
    document.getElementById('undoBtn').addEventListener('click', undo);
    document.getElementById('redoBtn').addEventListener('click', redo);

    window.addEventListener('resize', debounce(renderEditor, 150));

    // Keyboard shortcuts — only active when Templates tab is visible
    document.addEventListener('keydown', e => {
      const view = document.getElementById('view-templates');
      if (!view.classList.contains('active')) return;
      // Don't intercept shortcuts while typing in an input/textarea
      if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;

      if (e.ctrlKey && !e.shiftKey && e.key === 'z') { e.preventDefault(); undo(); }
      if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); }
    });

    window.templateEditorInit = () => { populateTypeSelect(); };
    window.templateEditorActivated = () => { populateTypeSelect(); renderEditor(); };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup',   onMouseUp);
  });

  // ── Type / page selects ──────────────────────────────────────────────────────
  function populateTypeSelect() {
    if (!App.templates || Object.keys(App.templates).length === 0) return;
    const sel = document.getElementById('tplTypeSelect');
    sel.innerHTML = '';
    Object.entries(App.templates).forEach(([key, tpl]) => {
      const opt = document.createElement('option');
      opt.value = key; opt.textContent = tpl.name;
      if (key === currentType) opt.selected = true;
      sel.appendChild(opt);
    });
    currentType = sel.value || Object.keys(App.templates)[0] || '';
    populatePageSelect();
  }

  function populatePageSelect() {
    const tpl = App.templates[currentType];
    const sel = document.getElementById('tplPageSelect');
    sel.innerHTML = '';
    if (!tpl) return;
    tpl.pages.forEach((pg, i) => {
      const opt = document.createElement('option');
      opt.value = i; opt.textContent = pg.name;
      if (i === currentPageIdx) opt.selected = true;
      sel.appendChild(opt);
    });
    currentPageIdx = parseInt(sel.value) || 0;

    // Apply the template's default paper orientation
    if (tpl.defaultPaper && PAPER[tpl.defaultPaper]) {
      App.paperKey = tpl.defaultPaper;
    }
  }

  // ── Main render ──────────────────────────────────────────────────────────────
  function renderEditor() {
    if (!App.templates[currentType]) return;
    const pageTpl = App.templates[currentType].pages[currentPageIdx];
    if (!pageTpl) return;

    const wrap   = document.getElementById('tplCanvasWrap');
    const canvas = document.getElementById('tplCanvas');
    const render = document.getElementById('tplCertRender');

    const p      = PAPER[App.paperKey] || PAPER['letter-landscape'];
    const availW = wrap.offsetWidth  - 40;
    const availH = wrap.offsetHeight - 40;
    canvasScale  = Math.min(availW / p.w, availH / p.h, 1);

    canvas.style.width  = Math.round(p.w * canvasScale) + 'px';
    canvas.style.height = Math.round(p.h * canvasScale) + 'px';

    render.style.width          = p.w + 'px';
    render.style.height         = p.h + 'px';
    render.style.transform      = `scale(${canvasScale})`;
    render.style.transformOrigin= 'top left';
    render.style.position       = 'absolute';
    render.style.inset          = '0';
    render.style.overflow       = 'hidden';
    render.style.pointerEvents  = 'none';

    if (pageTpl.background) {
      render.style.backgroundImage  = `url('${pageTpl.background}')`;
      render.style.backgroundSize   = '100% 100%';
      render.style.backgroundRepeat = 'no-repeat';
    } else {
      render.style.backgroundImage  = 'none';
      render.style.backgroundColor  = pageTpl.backgroundColor || '#fff';
    }
    renderCertPage(render, pageTpl, SAMPLE_DATA);

    canvas.querySelectorAll('.field-box').forEach(el => el.remove());
    pageTpl.fields.forEach(field => createFieldBox(canvas, field));

    selectedFieldId = null;
    renderProps(null);
    updateHistoryButtons();
  }

  // ── Field boxes ──────────────────────────────────────────────────────────────
  function createFieldBox(canvas, field) {
    const box = document.createElement('div');
    box.className      = 'field-box';
    box.dataset.id     = field.id;
    box.dataset.ftype  = field.fieldType;
    box.style.left     = field.x + '%';
    box.style.top      = field.y + '%';
    box.style.width    = field.width + '%';
    box.style.minHeight = '18px';

    const lbl = document.createElement('div');
    lbl.className   = 'field-box-label';
    lbl.textContent = field.label;
    box.appendChild(lbl);

    box.addEventListener('mousedown', e => startDrag(e, box, field));
    box.addEventListener('click', e => { e.stopPropagation(); selectField(field.id); });

    canvas.appendChild(box);
    return box;
  }

  function selectField(id) {
    selectedFieldId = id;
    document.querySelectorAll('.field-box').forEach(b =>
      b.classList.toggle('selected', b.dataset.id === id));
    const pageTpl = App.templates[currentType].pages[currentPageIdx];
    const field   = pageTpl.fields.find(f => f.id === id);
    renderProps(field);
  }

  // ── Drag ─────────────────────────────────────────────────────────────────────
  function startDrag(e, box, field) {
    pushHistory(); // snapshot before drag begins
    dragging   = { box, field };
    dragOrigin = { mouseX: e.clientX, mouseY: e.clientY, fieldX: field.x, fieldY: field.y };
    e.preventDefault();
  }

  function onMouseMove(e) {
    if (!dragging) return;
    const canvas = document.getElementById('tplCanvas');
    const rect   = canvas.getBoundingClientRect();

    const dx = (e.clientX - dragOrigin.mouseX) / rect.width  * 100;
    const dy = (e.clientY - dragOrigin.mouseY) / rect.height * 100;

    const newX = Math.max(0, Math.min(100 - dragging.field.width, dragOrigin.fieldX + dx));
    const newY = Math.max(0, Math.min(95, dragOrigin.fieldY + dy));

    dragging.field.x = Math.round(newX * 10) / 10;
    dragging.field.y = Math.round(newY * 10) / 10;

    dragging.box.style.left = dragging.field.x + '%';
    dragging.box.style.top  = dragging.field.y + '%';

    if (selectedFieldId === dragging.field.id) {
      const xIn = document.getElementById('prop-x');
      const yIn = document.getElementById('prop-y');
      if (xIn) xIn.value = dragging.field.x;
      if (yIn) yIn.value = dragging.field.y;
    }
  }

  function onMouseUp() {
    if (dragging) {
      const pageTpl = App.templates[currentType].pages[currentPageIdx];
      renderCertPage(document.getElementById('tplCertRender'), pageTpl, SAMPLE_DATA);
      dragging = null;
    }
  }

  // ── Properties panel ─────────────────────────────────────────────────────────
  function renderProps(field) {
    const panel = document.getElementById('fieldProps');
    if (!field) {
      panel.innerHTML = '<p class="props-empty">Click a field on the canvas to edit its properties.</p>';
      return;
    }

    panel.innerHTML = `
      <div class="props-section-title">Identity</div>
      <div class="prop-row">
        <label>Label</label>
        <input id="prop-label" type="text" value="${esc(field.label)}">
      </div>

      <div class="props-section-title">Position &amp; Size</div>
      <div class="prop-row-inline">
        <div class="prop-row"><label>X (%)</label><input id="prop-x" type="number" step="0.5" value="${field.x}"></div>
        <div class="prop-row"><label>Y (%)</label><input id="prop-y" type="number" step="0.5" value="${field.y}"></div>
      </div>
      <div class="prop-row">
        <label>Width (%)</label>
        <input id="prop-width" type="number" step="0.5" min="1" max="100" value="${field.width}">
      </div>

      <div class="props-section-title">Typography</div>
      <div class="prop-row">
        <label>Font Family</label>
        <select id="prop-fontFamily">${fontFamilyOptions(field.fontFamily)}</select>
      </div>
      <div class="prop-row-inline">
        <div class="prop-row"><label>Size (px)</label><input id="prop-fontSize" type="number" step="1" min="6" value="${field.fontSize}"></div>
        <div class="prop-row"><label>Color</label><input id="prop-color" type="color" value="${field.color || '#000000'}"></div>
      </div>
      <div class="prop-row">
        <label>Alignment</label>
        <select id="prop-align">
          <option value="left"    ${field.align==='left'?'selected':''}>Left</option>
          <option value="center"  ${field.align==='center'?'selected':''}>Center</option>
          <option value="right"   ${field.align==='right'?'selected':''}>Right</option>
          <option value="justify" ${field.align==='justify'?'selected':''}>Justify</option>
        </select>
      </div>
      <div class="prop-row-inline">
        <div class="prop-row">
          <label>Weight</label>
          <select id="prop-fontWeight">
            <option value="normal" ${field.fontWeight==='normal'||!field.fontWeight?'selected':''}>Normal</option>
            <option value="bold"   ${field.fontWeight==='bold'?'selected':''}>Bold</option>
          </select>
        </div>
        <div class="prop-row">
          <label>Style</label>
          <select id="prop-fontStyle">
            <option value="normal" ${field.fontStyle==='normal'||!field.fontStyle?'selected':''}>Normal</option>
            <option value="italic" ${field.fontStyle==='italic'?'selected':''}>Italic</option>
          </select>
        </div>
      </div>
      <div class="prop-row">
        <label>Line Height</label>
        <input id="prop-lineHeight" type="number" step="0.1" min="0.8" max="4" value="${field.lineHeight || 1.4}">
      </div>

      ${field.type === 'static' ? `
      <div class="props-section-title">Static Value</div>
      <div class="prop-row">
        <label>Text</label>
        <textarea id="prop-staticValue" class="form-input" rows="3">${esc(field.staticValue || '')}</textarea>
      </div>` : ''}

      ${field.fieldType === 'paragraph' ? `
      <div class="props-section-title">Template</div>
      <div class="prop-row">
        <label>HTML template (use {{key}} for variables)</label>
        <textarea id="prop-template" class="form-input" rows="5">${esc(field.template || '')}</textarea>
      </div>` : ''}

      <div class="props-section-title">Extras</div>
      <div class="prop-row">
        <label><input id="prop-borderBottom" type="checkbox" ${field.borderBottom?'checked':''}> &ensp;Show bottom border (signature line)</label>
      </div>
      ${field.autoSize !== undefined ? `
      <div class="prop-row">
        <label><input id="prop-autoSize" type="checkbox" ${field.autoSize?'checked':''}> &ensp;Auto-size font to fit width</label>
      </div>
      <div class="prop-row"><label>Min Font Size (px)</label><input id="prop-minFontSize" type="number" min="6" value="${field.minFontSize || 8}"></div>
      ` : ''}
      <div class="prop-row">
        <label>Background Color (page)</label>
        <input id="prop-pageBg" type="color" value="${getCurrentPageBg()}">
      </div>
    `;

    // All text/number/select inputs push history on first focus, then mutate on input
    bindProp('prop-label',      v => field.label = v,                false);
    bindProp('prop-x',          v => { field.x = parseFloat(v); updateBoxPos(field); }, false);
    bindProp('prop-y',          v => { field.y = parseFloat(v); updateBoxPos(field); }, false);
    bindProp('prop-width',      v => { field.width = parseFloat(v); updateBoxPos(field); }, false);
    bindProp('prop-fontFamily', v => field.fontFamily = v,           true);
    bindProp('prop-fontSize',   v => field.fontSize = parseFloat(v), true);
    bindProp('prop-color',      v => field.color = v,                true);
    bindProp('prop-align',      v => field.align = v,                true);
    bindProp('prop-fontWeight', v => field.fontWeight = v,           true);
    bindProp('prop-fontStyle',  v => field.fontStyle = v,            true);
    bindProp('prop-lineHeight', v => field.lineHeight = v,           true);
    if (document.getElementById('prop-staticValue'))
      bindProp('prop-staticValue', v => field.staticValue = v, true);
    if (document.getElementById('prop-template'))
      bindProp('prop-template', v => field.template = v, true);
    if (document.getElementById('prop-minFontSize'))
      bindProp('prop-minFontSize', v => field.minFontSize = parseInt(v), true);

    // Checkboxes: push history before changing
    if (document.getElementById('prop-borderBottom'))
      document.getElementById('prop-borderBottom').addEventListener('change', e => {
        pushHistory();
        field.borderBottom = e.target.checked;
        reRenderCert();
      });
    if (document.getElementById('prop-autoSize'))
      document.getElementById('prop-autoSize').addEventListener('change', e => {
        pushHistory();
        field.autoSize = e.target.checked;
        reRenderCert();
      });
    if (document.getElementById('prop-pageBg'))
      document.getElementById('prop-pageBg').addEventListener('focus', () => pushHistory(), { once: true });
    if (document.getElementById('prop-pageBg'))
      document.getElementById('prop-pageBg').addEventListener('input', e => {
        App.templates[currentType].pages[currentPageIdx].backgroundColor = e.target.value;
        reRenderCert();
      });
  }

  // bindProp: push history once on first focus, then mutate on every input
  function bindProp(id, setter, rerender) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('focus', () => pushHistory(), { once: true });
    el.addEventListener('input', e => {
      setter(e.target.value);
      if (rerender) reRenderCert();
    });
  }

  function reRenderCert() {
    const pageTpl = App.templates[currentType].pages[currentPageIdx];
    renderCertPage(document.getElementById('tplCertRender'), pageTpl, SAMPLE_DATA);
  }

  function updateBoxPos(field) {
    const box = document.querySelector(`.field-box[data-id="${field.id}"]`);
    if (box) {
      box.style.left  = field.x + '%';
      box.style.top   = field.y + '%';
      box.style.width = field.width + '%';
    }
  }

  function getCurrentPageBg() {
    return App.templates[currentType]?.pages[currentPageIdx]?.backgroundColor || '#ffffff';
  }

  // ── Background upload / remove ────────────────────────────────────────────────
  async function handleBgUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!currentType) { showToast('No certificate type selected.', 'error'); return; }

    pushHistory();
    const fd = new FormData();
    fd.append('background', file);

    const res = await fetch(`/api/upload/${currentType}/${currentPageIdx}`, { method: 'POST', body: fd });
    if (res.ok) {
      const { url } = await res.json();
      App.templates[currentType].pages[currentPageIdx].background = url;
      renderEditor();
      showToast('Background uploaded.', 'success');
    } else {
      undoStack.pop(); // upload failed — discard the snapshot we just pushed
      updateHistoryButtons();
      showToast('Upload failed.', 'error');
    }
    e.target.value = '';
  }

  async function handleBgRemove() {
    pushHistory();
    const res = await fetch(`/api/upload/${currentType}/${currentPageIdx}`, { method: 'DELETE' });
    if (res.ok) {
      App.templates[currentType].pages[currentPageIdx].background = null;
      renderEditor();
      showToast('Background removed.');
    } else {
      undoStack.pop();
      updateHistoryButtons();
    }
  }

  // ── Save / Reset ─────────────────────────────────────────────────────────────
  async function saveTemplate() {
    const tpl = App.templates[currentType];
    const res = await fetch(`/api/templates/${currentType}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tpl)
    });
    if (res.ok) showToast('Template saved.', 'success');
    else        showToast('Save failed.',    'error');
  }

  async function resetTemplate() {
    if (!confirm(`Reset "${App.templates[currentType]?.name}" to default? This cannot be undone.`)) return;
    const res = await fetch(`/api/templates/${currentType}/reset`, { method: 'DELETE' });
    if (res.ok) {
      const templates = await fetch('/api/templates').then(r => r.json());
      App.templates = templates;
      clearHistory();
      renderEditor();
      showToast('Template reset to default.', 'success');
    } else {
      showToast('Reset failed.', 'error');
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function esc(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function fontFamilyOptions(current) {
    const fonts = [
      ["'Cinzel Decorative', serif",        "Cinzel Decorative"],
      ["'Cinzel', serif",                   "Cinzel"],
      ["'UnifrakturMaguntia', cursive",     "UnifrakturMaguntia (Old English)"],
      ["'Cormorant Garamond', serif",       "Cormorant Garamond"],
      ["Georgia, 'Times New Roman', serif", "Georgia / Times"],
      ["Arial, sans-serif",                 "Arial"],
      ["'Arial Narrow', Arial, sans-serif", "Arial Narrow"],
      ["'Roboto', sans-serif",              "Roboto"],
      ["'Times New Roman', serif",          "Times New Roman"]
    ];
    return fonts.map(([v, l]) =>
      `<option value="${v}" ${v === current ? 'selected' : ''}>${l}</option>`
    ).join('');
  }

})();
