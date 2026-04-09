// ── Paper configurations (pixels at 96dpi) ────────────────────────────────────
const PAPER = {
  'letter-landscape': { w: 1056, h: 816,  css: '11in 8.5in',  label: 'Letter — Landscape' },
  'letter-portrait':  { w: 816,  h: 1056, css: '8.5in 11in',  label: 'Letter — Portrait'  },
  'a4-landscape':     { w: 1123, h: 794,  css: '297mm 210mm', label: 'A4 — Landscape'      },
  'a4-portrait':      { w: 794,  h: 1123, css: '210mm 297mm', label: 'A4 — Portrait'       }
};

// ── Page type definitions ─────────────────────────────────────────────────────
const PAGE_TYPES = {
  'baptismal':  { label: 'Baptismal Certificate', templateKey: 'baptismal',  pageIdx: 0, defaultPaper: 'letter-landscape' },
  'dedication': { label: 'Dedication Certificate', templateKey: 'dedication', pageIdx: 0, defaultPaper: 'letter-portrait'  }
};

// ── Form schemas ──────────────────────────────────────────────────────────────
const FORM_SCHEMAS = {
  baptismal: [
    { title: 'Recipient', fields: [
      { key:'recipientName', label:'Full Name',   type:'text', placeholder:'e.g., Juan Dela Cruz' },
      { key:'birthPlace',    label:'Birth Place', type:'text', placeholder:'e.g., Tagum City, Davao del Norte' },
      { key:'birthDate',     label:'Birth Date',  type:'text', placeholder:'e.g., December 27, 1998' }
    ]},
    { title: 'Baptism Details', fields: [
      { key:'baptismDay',   label:'Day (ordinal)',   type:'text', placeholder:'e.g., 8th', hint:'Include ordinal suffix (st, nd, rd, th)' },
      { key:'baptismMonth', label:'Month',           type:'text', placeholder:'e.g., June' },
      { key:'baptismYear',  label:'Year (2 digits)', type:'text', placeholder:'e.g., 25', maxlength:2 }
    ]},
    { title: 'Officials', fields: [
      { key:'secretaryName', label:'Church Secretary', type:'text' },
      { key:'councilName',   label:'Church Council',   type:'text' },
      { key:'pastorName',    label:'Minister / Pastor', type:'text' }
    ]},
    { title: 'Church Info', fields: [
      { key:'churchName',    label:'Church Name',    type:'text' },
      { key:'churchAddress', label:'Church Address', type:'text' }
    ]}
  ],
  dedication: [
    { title: 'Officials', fields: [
      { key:'secretaryName', label:'Church Secretary', type:'text' },
      { key:'councilName',   label:'Church Council',   type:'text' },
      { key:'pastorName',    label:'Minister / Pastor', type:'text' }
    ]},
    { title: 'Church Info', fields: [
      { key:'churchName',    label:'Church Name',    type:'text' },
      { key:'churchAddress', label:'Church Address', type:'text' }
    ]},
    { title: 'Sponsors', fields: [
      { key:'sponsors', label:'Sponsor Names (one per line)', type:'textarea', rows:12,
        placeholder:'Enter each sponsor name on a new line\n\nExample:\nJohn Doe\nJane Smith' }
    ]}
  ]
};

// ── App state ─────────────────────────────────────────────────────────────────
const App = {
  settings: {},
  templates: {},
  pages: [],          // builder pages
  paperKey: 'letter-landscape',
  currentPageIdx: -1  // builder selected page
};

// ── Boot ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadGlobalData();
  initNav();
  initModal();
  // Init modules that depend on loaded data
  window.templateEditorInit?.();
});

async function loadGlobalData() {
  const [settings, templates] = await Promise.all([
    fetch('/api/settings').then(r => r.json()),
    fetch('/api/templates').then(r => r.json())
  ]);
  App.settings = settings;
  App.templates = templates;
}

// ── Tab navigation ─────────────────────────────────────────────────────────────
function initNav() {
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('view-' + btn.dataset.tab).classList.add('active');

      // Notify modules of tab activation
      if (btn.dataset.tab === 'templates') window.templateEditorActivated?.();
      if (btn.dataset.tab === 'builder') window.builderActivated?.();
    });
  });
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function initModal() {
  document.getElementById('addPageBtn').addEventListener('click', () =>
    document.getElementById('addPageModal').classList.add('open'));
  document.getElementById('cancelAddPage').addEventListener('click', () =>
    document.getElementById('addPageModal').classList.remove('open'));
  document.getElementById('addPageModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) e.currentTarget.classList.remove('open');
  });
}

// ── Certificate rendering engine ──────────────────────────────────────────────
function renderCertPage(containerEl, pageTemplate, certData) {
  const w = containerEl.offsetWidth;
  const h = containerEl.offsetHeight;

  containerEl.innerHTML = '';

  if (pageTemplate.background) {
    containerEl.style.backgroundImage = `url('${pageTemplate.background}')`;
    containerEl.style.backgroundSize  = '100% 100%';
    containerEl.style.backgroundRepeat = 'no-repeat';
    containerEl.style.backgroundColor = 'transparent';
  } else {
    containerEl.style.backgroundImage  = 'none';
    containerEl.style.backgroundColor  = pageTemplate.backgroundColor || '#fff';
  }

  // Build substitution dictionary
  const subs = buildSubs(certData);

  pageTemplate.fields.forEach(field => {
    if (field.visible === false) return;

    const el = document.createElement('div');
    el.className = 'cert-field';
    el.style.left  = field.x + '%';
    el.style.top   = field.y + '%';
    el.style.width = field.width + '%';
    el.style.textAlign   = field.align || 'left';
    el.style.fontFamily  = field.fontFamily || 'Arial, sans-serif';
    el.style.fontWeight  = field.fontWeight || 'normal';
    el.style.fontStyle   = field.fontStyle  || 'normal';
    el.style.fontSize    = field.fontSize + 'px';
    el.style.color       = field.color || '#000';
    el.style.lineHeight  = field.lineHeight || '1.4';
    el.style.letterSpacing = field.letterSpacing || 'normal';
    el.style.overflow    = 'visible';

    if (field.fieldType === 'text') {
      const value = getFieldValue(field, subs);
      if (field.borderBottom) {
        el.style.borderBottom = '1.5px solid ' + (field.color || '#333');
        el.style.paddingBottom = '1px';
      }
      if (field.textDecoration) el.style.textDecoration = field.textDecoration;
      el.textContent = value;

      if (field.autoSize && value) {
        containerEl.appendChild(el);
        autoSizeEl(el, field.fontSize, field.minFontSize || 8, w * field.width / 100, field.fontFamily);
        return; // already appended
      }

    } else if (field.fieldType === 'paragraph') {
      let html = field.template || field.staticValue || '';
      html = substituteTpl(html, subs);
      el.style.whiteSpace = 'pre-wrap';
      el.innerHTML = html;

    } else if (field.fieldType === 'sponsors') {
      const raw = subs[field.dataKey] || subs.sponsors || '';
      const names = raw.split('\n').map(n => n.trim()).filter(Boolean);
      renderSponsors(el, names);
    }

    containerEl.appendChild(el);
  });
}

function buildSubs(certData) {
  const s = App.settings;
  return {
    // settings defaults
    nationalHQ:    s.nationalHQ    || '',
    districtOffice:s.districtOffice|| '',
    denomination:  s.denomination  || '',
    // cert data with settings fallbacks
    secretaryName: certData.secretaryName || s.defaultSecretary || '',
    councilName:   certData.councilName   || s.defaultCouncil   || '',
    pastorName:    certData.pastorName    || s.defaultPastor    || '',
    churchName:    certData.churchName    || s.churchName       || '',
    churchAddress: certData.churchAddress || s.churchAddress    || '',
    // all other cert data
    ...certData
  };
}

function getFieldValue(field, subs) {
  if (field.type === 'static') return field.staticValue || '';
  if (field.dataKey) return subs[field.dataKey] || '';
  if (field.settingsKey) return subs[field.settingsKey] || '';
  return '';
}

function substituteTpl(html, subs) {
  return html.replace(/\{\{(\w+)\}\}/g, (_, k) => subs[k] || '______');
}

function autoSizeEl(el, maxPx, minPx, containerWidthPx, fontFamily) {
  el.style.whiteSpace = 'nowrap';
  let size = maxPx;
  el.style.fontSize = size + 'px';
  // Use scrollWidth vs offsetWidth to detect overflow
  while (el.scrollWidth > (containerWidthPx + 2) && size > minPx) {
    size -= 0.5;
    el.style.fontSize = size + 'px';
  }
}

function renderSponsors(el, names) {
  el.style.border  = '1.5px solid #333';
  el.style.padding = '8px 6px';
  el.style.display = 'grid';
  el.style.gridTemplateColumns = '1fr 1fr 1fr';
  el.style.gap = '2px 10px';
  el.style.boxSizing = 'border-box';

  const perCol = Math.ceil(names.length / 3);
  const cols = [
    names.slice(0, perCol),
    names.slice(perCol, perCol * 2),
    names.slice(perCol * 2)
  ];

  cols.forEach((col, ci) => {
    const colDiv = document.createElement('div');
    colDiv.style.display = 'flex';
    colDiv.style.flexDirection = 'column';
    colDiv.style.gap = '3px';

    if (ci === 1 && names.length > 0) {
      const hdr = document.createElement('div');
      hdr.textContent = 'SPONSORS';
      hdr.style.cssText = 'font-weight:700;text-align:center;font-size:inherit;margin-bottom:4px;';
      colDiv.appendChild(hdr);
    }

    const align = ci === 0 ? 'left' : ci === 1 ? 'center' : 'right';
    col.forEach(name => {
      const d = document.createElement('div');
      d.textContent = name;
      d.style.textAlign = align;
      d.style.fontSize  = 'inherit';
      colDiv.appendChild(d);
    });
    el.appendChild(colDiv);
  });
}

// ── Scale a certificate container to fill available space ─────────────────────
function scaleCertToFit(wrapEl, certEl, paperKey) {
  const p = PAPER[paperKey] || PAPER['letter-landscape'];
  certEl.style.width  = p.w + 'px';
  certEl.style.height = p.h + 'px';

  const availW = wrapEl.offsetWidth  - 48;
  const availH = wrapEl.offsetHeight - 48;
  const scale  = Math.min(availW / p.w, availH / p.h, 1);

  certEl.style.transform = `scale(${scale})`;
  certEl.style.transformOrigin = 'top left';

  // Size the wrap to match scaled dimensions so scrollbars appear correctly
  wrapEl.style.minWidth  = Math.ceil(p.w * scale + 48) + 'px';
  wrapEl.style.minHeight = Math.ceil(p.h * scale + 48) + 'px';
}

// ── Print ─────────────────────────────────────────────────────────────────────
function doPrint() {
  if (App.pages.length === 0) { showToast('Add at least one page first.', 'error'); return; }

  const p = PAPER[App.paperKey];

  // Set @page size
  let styleEl = document.getElementById('print-page-size');
  if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = 'print-page-size'; document.head.appendChild(styleEl); }
  styleEl.textContent = `@page { size: ${p.css}; margin: 0; }`;

  const printArea = document.getElementById('printArea');
  printArea.innerHTML = '';

  App.pages.forEach(page => {
    const pt = PAGE_TYPES[page.type];
    if (!pt) return;
    const tpl = App.templates[pt.templateKey];
    if (!tpl) return;
    const pageTpl = tpl.pages[pt.pageIdx];
    if (!pageTpl) return;

    const pageEl = document.createElement('div');
    pageEl.className = 'print-page';
    pageEl.style.width  = p.w + 'px';
    pageEl.style.height = p.h + 'px';
    pageEl.style.position = 'relative';
    pageEl.style.overflow = 'hidden';
    pageEl.style.webkitPrintColorAdjust = 'exact';
    pageEl.style.printColorAdjust = 'exact';

    // Set background before appending
    if (pageTpl.background) {
      pageEl.style.backgroundImage  = `url('${pageTpl.background}')`;
      pageEl.style.backgroundSize   = '100% 100%';
      pageEl.style.backgroundRepeat = 'no-repeat';
    } else {
      pageEl.style.backgroundColor = pageTpl.backgroundColor || '#fff';
    }

    printArea.appendChild(pageEl);
    renderCertPage(pageEl, pageTpl, page.data || {});
  });

  setTimeout(() => window.print(), 300);
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast visible' + (type ? ' toast-' + type : '');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.classList.remove('visible'); }, 3000);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function debounce(fn, ms) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
function uid() { return Math.random().toString(36).slice(2, 9); }
function deepClone(o) { return JSON.parse(JSON.stringify(o)); }
