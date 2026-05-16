/* ===============================================================
   Shifu Ventures — Copy Editor (single-editor variant)
   ---------------------------------------------------------------
   Walks the visible-text DOM on each page, registers entries with
   the backend, and lets a visitor draft alternative copy via a
   double-click popup. Each entry can carry many "options"; the
   visitor picks one with a radio button and the page renders that
   option in place of the original (the original text is preserved
   in data-copy-original and is never overwritten in storage).

   Edit mode is ON by default. The toolbar pill toggles it OFF.
   Selected (non-original) text gets a soft green tint via CSS so
   the visitor can see at a glance what they've changed.

   The "log" is an on-demand Markdown export from the master list —
   only entries that have at least one drafted option are included.
   =============================================================== */
(function () {
  'use strict';

  // ----------------------------------------------------------
  // CONFIG
  // ----------------------------------------------------------
  const POLL_MS = 5000;
  const STORAGE_EDIT_MODE = 'sv_ce_edit_mode';
  const SAVE_DEBOUNCE_MS = 600;
  const REGISTER_CHUNK = 100;

  const INLINE_FORMATTING = new Set([
    'EM', 'STRONG', 'B', 'I', 'U', 'S', 'CODE', 'SUP', 'SUB', 'MARK',
    'BR', 'TIME', 'ABBR', 'KBD', 'VAR', 'Q', 'CITE', 'DFN', 'SMALL', 'WBR'
  ]);
  const NO_TEXT_INLINE = new Set([
    'SVG', 'IMG', 'PICTURE', 'SOURCE', 'CANVAS', 'VIDEO', 'AUDIO', 'IFRAME',
    'INPUT', 'TEXTAREA', 'SELECT', 'OPTION', 'OPTGROUP', 'HR'
  ]);
  const SKIP_TAGS = new Set([
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'HEAD', 'META', 'LINK', 'TITLE'
  ]);

  // ----------------------------------------------------------
  // STATE
  // ----------------------------------------------------------
  const elementsById = new Map();
  let entriesById = new Map();
  let editMode = localStorage.getItem(STORAGE_EDIT_MODE) !== '0';
  let currentPopupId = null;
  let pollTimer = null;
  let inFlightFetchPromise = null;
  let offlineMode = false;   // flips true if /api/copy is unreachable

  // ----------------------------------------------------------
  // UTILS
  // ----------------------------------------------------------
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function debounce(fn, wait) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }
  function fmtDate(ms) {
    if (!ms) return '—';
    return new Date(ms).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  }
  function toast(msg, ms = 1800) {
    let el = document.querySelector('.ce-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'ce-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('ce-show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('ce-show'), ms);
  }

  // ----------------------------------------------------------
  // API
  // ----------------------------------------------------------
  async function apiCall(method, op, payload) {
    const init = { method, headers: { 'Content-Type': 'application/json' } };
    if (method === 'POST') init.body = JSON.stringify({ op, ...payload });
    const r = await fetch('/api/copy', init);
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      throw new Error(`/api/copy ${r.status}: ${text}`);
    }
    return r.json();
  }
  async function apiGet() {
    const r = await fetch('/api/copy');
    if (!r.ok) throw new Error('GET /api/copy ' + r.status);
    return r.json();
  }
  async function apiRegister(entries) {
    // Chunk the register so no single POST is huge.
    let totalAdded = 0;
    for (let i = 0; i < entries.length; i += REGISTER_CHUNK) {
      const slice = entries.slice(i, i + REGISTER_CHUNK);
      const { added } = await apiCall('POST', 'register', { entries: slice });
      totalAdded += added || 0;
    }
    return totalAdded;
  }
  const apiAddOption    = (id, text)           => apiCall('POST', 'add-option', { id, text });
  const apiEditOption   = (id, optionId, text) => apiCall('POST', 'edit-option', { id, optionId, text });
  const apiDeleteOption = (id, optionId)       => apiCall('POST', 'delete-option', { id, optionId });
  const apiSelect       = (id, optionId)       => apiCall('POST', 'select', { id, optionId });

  // ----------------------------------------------------------
  // DOM SCAN — assign stable copy IDs to every visible-text leaf
  // ----------------------------------------------------------
  function hasNonWhitespaceTextSibling(el) {
    const parent = el.parentNode;
    if (!parent) return false;
    for (const n of parent.childNodes) {
      if (n === el) continue;
      if (n.nodeType === 3 && n.textContent && n.textContent.trim()) return true;
    }
    return false;
  }
  function isInlinish(el) {
    const tag = el.tagName;
    if (INLINE_FORMATTING.has(tag)) return true;
    if (NO_TEXT_INLINE.has(tag)) return (el.textContent || '').trim().length === 0;
    if (tag === 'SPAN' || tag === 'A' || tag === 'BUTTON' || tag === 'LABEL') {
      return hasNonWhitespaceTextSibling(el);
    }
    return false;
  }
  function isLeafTextContainer(el) {
    if (SKIP_TAGS.has(el.tagName)) return false;
    if (el.closest('#copy-editor-root')) return false;
    if (el.closest('[data-no-edit]')) return false;
    if (el.closest('script, style, noscript, template')) return false;
    const text = (el.textContent || '').trim();
    if (!text) return false;
    for (const child of el.children) {
      if (!isInlinish(child)) return false;
    }
    return true;
  }
  function pageSlug() {
    // /investors.html → "investors"; / → "home"; /about.html → "about"
    const path = location.pathname || '/';
    if (path === '/' || /\/index\.html?$/.test(path)) return 'home';
    const m = path.match(/\/([^\/]+?)(?:\.html?)?$/);
    return m ? m[1] : 'unknown';
  }
  function sectionSlug(el) {
    // Walk up looking for an explicit section id, then a [data-section-id],
    // then a [class*="section"] root, falling back to a hint from nav/footer.
    let p = el;
    while (p && p !== document.body) {
      const id = p.id || '';
      const cls = p.className && typeof p.className === 'string' ? p.className : '';
      if (p.getAttribute && p.getAttribute('data-section-id')) {
        return p.getAttribute('data-section-id');
      }
      if (id && /section|hero|footer|nav/i.test(id)) return id.replace(/^section-?/, '');
      if (p.tagName === 'SECTION' && id) return id;
      if (p.tagName === 'HEADER') return 'header';
      if (p.tagName === 'FOOTER') return 'footer';
      if (p.tagName === 'NAV') return 'nav';
      // Section classes that show up across the site.
      const cm = cls.match(/(?:^|\s)(section[_-][\w-]+|inv-[a-z][\w-]*|hero[\w-]*)/i);
      if (cm) return cm[1].replace(/^section[_-]/, '');
      p = p.parentElement;
    }
    return 'misc';
  }
  function scanDOM() {
    const counters = Object.create(null);
    const found = [];
    const candidates = [];
    const candidateSet = new WeakSet();
    const all = document.body.querySelectorAll('*');
    for (const el of all) {
      if (isLeafTextContainer(el)) {
        candidates.push(el);
        candidateSet.add(el);
      }
    }
    const outermost = [];
    for (const el of candidates) {
      let p = el.parentElement, nested = false;
      while (p) { if (candidateSet.has(p)) { nested = true; break; } p = p.parentElement; }
      if (!nested) outermost.push(el);
    }
    const page = pageSlug();
    for (const el of outermost) {
      const text = (el.textContent || '').trim();
      if (!text) continue;
      const section = sectionSlug(el);
      const tag = el.tagName.toLowerCase();
      const key = `${page}__${section}__${tag}`;
      const idx = counters[key] || 0;
      counters[key] = idx + 1;
      const id = `${page}__${section}__${tag}__${idx}`;
      el.setAttribute('data-copy-id', id);
      el.setAttribute('data-copy-original', text);
      elementsById.set(id, el);
      found.push({ id, page, section, tag, originalText: text });
    }
    return found;
  }

  // ----------------------------------------------------------
  // STATE → DOM
  // ----------------------------------------------------------
  function selectedTextFor(entry) {
    if (!entry || !entry.selectedOptionId) return null;
    const opt = (entry.options || []).find(o => o.id === entry.selectedOptionId);
    return opt && opt.text ? opt.text : null;
  }
  function applyStateToDOM() {
    elementsById.forEach((el, id) => {
      const entry = entriesById.get(id);
      const live = selectedTextFor(entry);
      const original = el.getAttribute('data-copy-original') || '';
      const target = live != null ? live : original;
      if (el.textContent !== target) el.textContent = target;
      const hasOptions = !!(entry && entry.options && entry.options.length);
      const isSelected = !!(entry && entry.selectedOptionId);
      el.setAttribute('data-ce-status',
        isSelected ? 'selected' :
        hasOptions ? 'drafted' : 'untouched');
    });
  }

  // ----------------------------------------------------------
  // TOOLBAR
  // ----------------------------------------------------------
  function renderToolbar() {
    let bar = document.querySelector('#copy-editor-root .ce-toolbar');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'ce-toolbar';
      document.getElementById('copy-editor-root').appendChild(bar);
    }
    const drafted = countDrafted();
    bar.innerHTML = `
      <button class="ce-pill ${editMode ? 'ce-active' : ''}" data-action="toggle-edit"
              title="${editMode ? 'Click to turn edit mode OFF' : 'Click to turn edit mode ON'}">
        <span class="ce-dot"></span>${editMode ? 'Edit ON · double-click any copy' : 'Edit OFF'}
      </button>
      <button class="ce-pill ce-pill-icon" data-action="open-master"
              title="Master list — ${entriesById.size} entries, ${drafted} drafted"
              aria-label="Open master list">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="8" y1="6" x2="20" y2="6"></line>
          <line x1="8" y1="12" x2="20" y2="12"></line>
          <line x1="8" y1="18" x2="20" y2="18"></line>
          <circle cx="4" cy="6" r="1"></circle>
          <circle cx="4" cy="12" r="1"></circle>
          <circle cx="4" cy="18" r="1"></circle>
        </svg>
        <span class="ce-pill-count">${drafted}</span>
      </button>`;
    bar.onclick = e => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      if (action === 'toggle-edit') toggleEditMode();
      else if (action === 'open-master') openMasterList();
    };
  }
  function countDrafted() {
    let n = 0;
    entriesById.forEach(e => { if (e.options && e.options.length) n++; });
    return n;
  }
  function toggleEditMode() {
    editMode = !editMode;
    localStorage.setItem(STORAGE_EDIT_MODE, editMode ? '1' : '0');
    document.body.classList.toggle('ce-edit-mode', editMode);
    renderToolbar();
    toast(editMode ? 'Edit mode ON · double-click any copy' : 'Edit mode OFF');
  }

  // ----------------------------------------------------------
  // CLICK / DBLCLICK
  // ----------------------------------------------------------
  function attachClickSuppress() {
    document.body.addEventListener('click', e => {
      if (!editMode) return;
      const el = e.target.closest('[data-copy-id]');
      if (!el) return;
      if (el.closest('#copy-editor-root')) return;
      // Don't suppress clicks on form controls / scroll-anchored buttons that
      // are themselves the copy element (rare case).
      e.preventDefault();
      e.stopImmediatePropagation();
    }, true);
  }
  function attachDblclick() {
    document.body.addEventListener('dblclick', e => {
      if (!editMode) return;
      const el = e.target.closest('[data-copy-id]');
      if (!el) return;
      if (el.closest('#copy-editor-root')) return;
      e.preventDefault();
      e.stopPropagation();
      window.getSelection && window.getSelection().removeAllRanges();
      openPopup(el.getAttribute('data-copy-id'));
    }, true);
  }

  // ----------------------------------------------------------
  // POPUP — edit one entry's options
  // ----------------------------------------------------------
  function openPopup(id) {
    const entry = entriesById.get(id);
    if (!entry) {
      toast("That copy isn't synced yet — try again in a second.");
      return;
    }
    currentPopupId = id;
    const root = document.getElementById('copy-editor-root');
    let backdrop = root.querySelector('.ce-backdrop[data-kind="popup"]');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'ce-backdrop';
      backdrop.setAttribute('data-kind', 'popup');
      root.appendChild(backdrop);
      backdrop.addEventListener('click', e => { if (e.target === backdrop) closePopup(); });
      document.addEventListener('keydown', escClose);
    }
    backdrop.innerHTML = renderPopup(entry);
    wirePopup(backdrop, entry);
  }
  function escClose(e) {
    if (e.key === 'Escape' && currentPopupId) closePopup();
  }
  function closePopup() {
    currentPopupId = null;
    const bd = document.querySelector('#copy-editor-root .ce-backdrop[data-kind="popup"]');
    if (bd) bd.remove();
    document.removeEventListener('keydown', escClose);
  }
  function renderPopup(entry) {
    const optsHtml = (entry.options || []).map(opt => {
      const checked = entry.selectedOptionId === opt.id;
      return `
        <div class="ce-option-row${checked ? ' ce-option-row-selected' : ''}" data-option-id="${escapeHtml(opt.id)}">
          <label class="ce-radio-label" title="Show this option on the page">
            <input type="radio" name="ce-select" class="ce-radio" ${checked ? 'checked' : ''}
                   data-option-id="${escapeHtml(opt.id)}">
            <span class="ce-radio-pill"></span>
          </label>
          <textarea class="ce-option-text" rows="2"
                    data-option-id="${escapeHtml(opt.id)}"
                    placeholder="Type your alternative copy here…">${escapeHtml(opt.text || '')}</textarea>
          <button class="ce-option-delete" data-option-id="${escapeHtml(opt.id)}"
                  title="Delete this option" aria-label="Delete option">×</button>
        </div>`;
    }).join('');
    return `
      <div class="ce-popup" role="dialog" aria-label="Edit copy">
        <div class="ce-popup-head">
          <div class="ce-popup-crumbs">${escapeHtml(entry.page)} · ${escapeHtml(entry.section)}</div>
          <button class="ce-popup-close" data-action="close" aria-label="Close popup">✕</button>
        </div>
        <div class="ce-original-strip">
          <span class="ce-original-tag">Original copy <em>(kept untouched)</em></span>
          <span class="ce-original-text">${escapeHtml(entry.originalText)}</span>
        </div>
        <div class="ce-options-wrap">
          <div class="ce-options-head">
            <span>Your alternatives</span>
            <span class="ce-options-hint">Pick one with the radio · the page will show it</span>
          </div>
          <div class="ce-options" data-options>${optsHtml}</div>
          <div class="ce-options-actions">
            <button class="ce-add-option" data-action="add-option">+ Add option</button>
            <button class="ce-clear-select" data-action="clear-select"
                    ${entry.selectedOptionId ? '' : 'disabled'}>
              Restore original
            </button>
          </div>
        </div>
        <div class="ce-popup-foot">
          <span class="ce-popup-saving" data-saving></span>
        </div>
      </div>`;
  }
  function wirePopup(backdrop, entry) {
    const close = () => closePopup();
    backdrop.querySelector('[data-action="close"]').onclick = close;
    const setSaving = state => {
      const el = backdrop.querySelector('[data-saving]');
      if (!el) return;
      if (state === 'saving') el.textContent = 'saving…';
      else if (state === 'saved') {
        el.textContent = 'saved';
        clearTimeout(setSaving._t);
        setSaving._t = setTimeout(() => { el.textContent = ''; }, 1500);
      }
      else el.textContent = '';
    };
    const refreshFromEntry = nextEntry => {
      entriesById.set(nextEntry.id, nextEntry);
      applyStateToDOM();
      renderToolbar();
      backdrop.innerHTML = renderPopup(nextEntry);
      wirePopup(backdrop, nextEntry);
    };
    // Add option
    const addBtn = backdrop.querySelector('[data-action="add-option"]');
    if (addBtn) addBtn.onclick = async () => {
      try {
        setSaving('saving');
        const { entry: next } = await apiAddOption(entry.id, '');
        setSaving('saved');
        refreshFromEntry(next);
        const last = backdrop.querySelector('.ce-options .ce-option-row:last-child .ce-option-text');
        if (last) last.focus();
      } catch (err) {
        console.error(err);
        toast('Could not add option — check connection.');
        setSaving('');
      }
    };
    // Clear selection (restore original)
    const clearBtn = backdrop.querySelector('[data-action="clear-select"]');
    if (clearBtn) clearBtn.onclick = async () => {
      try {
        setSaving('saving');
        const { entry: next } = await apiSelect(entry.id, null);
        setSaving('saved');
        refreshFromEntry(next);
      } catch (err) {
        console.error(err);
        toast('Could not restore original.');
        setSaving('');
      }
    };
    // Radios — select an option
    backdrop.querySelectorAll('input.ce-radio').forEach(r => {
      r.addEventListener('change', async () => {
        try {
          setSaving('saving');
          const { entry: next } = await apiSelect(entry.id, r.getAttribute('data-option-id'));
          setSaving('saved');
          refreshFromEntry(next);
        } catch (err) {
          console.error(err);
          toast('Could not select option.');
          setSaving('');
        }
      });
    });
    // Textareas — auto-save (debounced)
    backdrop.querySelectorAll('textarea.ce-option-text').forEach(ta => {
      const optionId = ta.getAttribute('data-option-id');
      const saver = debounce(async () => {
        try {
          setSaving('saving');
          const { entry: next } = await apiEditOption(entry.id, optionId, ta.value);
          setSaving('saved');
          // Update local map without full re-render (preserve caret).
          entriesById.set(next.id, next);
          applyStateToDOM();
          renderToolbar();
        } catch (err) {
          console.error(err);
          toast('Save failed.');
          setSaving('');
        }
      }, SAVE_DEBOUNCE_MS);
      ta.addEventListener('input', saver);
    });
    // Delete option
    backdrop.querySelectorAll('button.ce-option-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        const optionId = btn.getAttribute('data-option-id');
        try {
          setSaving('saving');
          const { entry: next } = await apiDeleteOption(entry.id, optionId);
          setSaving('saved');
          refreshFromEntry(next);
        } catch (err) {
          console.error(err);
          toast('Delete failed.');
          setSaving('');
        }
      });
    });
  }

  // ----------------------------------------------------------
  // MASTER LIST
  // ----------------------------------------------------------
  let masterFilters = { q: '', page: '', status: '' };

  function openMasterList() {
    const root = document.getElementById('copy-editor-root');
    let bd = root.querySelector('.ce-backdrop[data-kind="master"]');
    if (!bd) {
      bd = document.createElement('div');
      bd.className = 'ce-backdrop';
      bd.setAttribute('data-kind', 'master');
      root.appendChild(bd);
      bd.addEventListener('click', e => { if (e.target === bd) closeMasterList(); });
      document.addEventListener('keydown', escMaster);
    }
    bd.innerHTML = renderMasterShell();
    wireMaster(bd);
    renderMasterRows(bd);
  }
  function escMaster(e) {
    if (e.key === 'Escape' && document.querySelector('#copy-editor-root .ce-backdrop[data-kind="master"]')) {
      closeMasterList();
    }
  }
  function closeMasterList() {
    const bd = document.querySelector('#copy-editor-root .ce-backdrop[data-kind="master"]');
    if (bd) bd.remove();
    document.removeEventListener('keydown', escMaster);
  }
  function statusFor(e) {
    if (!e) return 'untouched';
    if (e.selectedOptionId) return 'selected';
    if (e.options && e.options.length) return 'drafted';
    return 'untouched';
  }
  function renderMasterShell() {
    const pages = Array.from(new Set(Array.from(entriesById.values()).map(e => e.page))).sort();
    return `
      <div class="ce-master" role="dialog" aria-label="Master copy list">
        <div class="ce-master-header">
          <h2>Master list <span class="ce-master-sub">unique changes only</span></h2>
          <div class="ce-master-controls">
            <input type="search" placeholder="Search original or options…" data-q value="${escapeHtml(masterFilters.q)}">
            <select data-page-filter>
              <option value="">All pages</option>
              ${pages.map(p => `<option value="${escapeHtml(p)}" ${masterFilters.page === p ? 'selected' : ''}>${escapeHtml(p)}</option>`).join('')}
            </select>
            <select data-status-filter>
              <option value="">All statuses</option>
              <option value="selected" ${masterFilters.status === 'selected' ? 'selected' : ''}>Selected (on the page)</option>
              <option value="drafted" ${masterFilters.status === 'drafted' ? 'selected' : ''}>Drafted (no selection)</option>
              <option value="untouched" ${masterFilters.status === 'untouched' ? 'selected' : ''}>Untouched</option>
            </select>
            <button class="ce-pill ce-export-btn" data-action="export-md" title="Download markdown of all unique changes">
              ⬇ Export changes
            </button>
            <button class="ce-pill ce-master-close-btn" data-action="close-master">✕ Close</button>
          </div>
        </div>
        <div class="ce-master-body" data-master-body></div>
      </div>`;
  }
  function wireMaster(bd) {
    bd.querySelector('[data-q]').addEventListener('input', e => {
      masterFilters.q = e.target.value.toLowerCase();
      renderMasterRows(bd);
    });
    bd.querySelector('[data-page-filter]').addEventListener('change', e => {
      masterFilters.page = e.target.value;
      renderMasterRows(bd);
    });
    bd.querySelector('[data-status-filter]').addEventListener('change', e => {
      masterFilters.status = e.target.value;
      renderMasterRows(bd);
    });
    bd.querySelector('[data-action="close-master"]').onclick = closeMasterList;
    bd.querySelector('[data-action="export-md"]').onclick = () => {
      const a = document.createElement('a');
      a.href = '/api/copy?format=md';
      a.download = 'copy-changes.md';
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast('Downloading changes…');
    };
  }
  function renderMasterRows(bd) {
    const body = bd.querySelector('[data-master-body]');
    let rows = Array.from(entriesById.values());
    if (masterFilters.page) rows = rows.filter(r => r.page === masterFilters.page);
    if (masterFilters.status) rows = rows.filter(r => statusFor(r) === masterFilters.status);
    if (masterFilters.q) {
      const q = masterFilters.q;
      rows = rows.filter(r => {
        const hay = [r.originalText, ...(r.options || []).map(o => o.text), r.id, r.page, r.section];
        return hay.some(x => x && String(x).toLowerCase().includes(q));
      });
    }
    if (!rows.length) {
      body.innerHTML = '<div class="ce-empty">No entries match those filters.</div>';
      return;
    }
    rows.sort((a, b) => {
      // Selected first, then drafted, then untouched. Within a status,
      // alpha by page → section → id so the list reads predictably.
      const orderA = statusFor(a) === 'selected' ? 0 : statusFor(a) === 'drafted' ? 1 : 2;
      const orderB = statusFor(b) === 'selected' ? 0 : statusFor(b) === 'drafted' ? 1 : 2;
      if (orderA !== orderB) return orderA - orderB;
      if (a.page !== b.page) return a.page < b.page ? -1 : 1;
      if (a.section !== b.section) return a.section < b.section ? -1 : 1;
      return a.id < b.id ? -1 : 1;
    });
    body.innerHTML = `
      <table>
        <thead>
          <tr>
            <th style="width:170px">Page · Section</th>
            <th>Original</th>
            <th>Selected option</th>
            <th style="width:110px">Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => {
            const st = statusFor(r);
            const sel = (r.options || []).find(o => o.id === r.selectedOptionId);
            return `
              <tr class="ce-row" data-jump="${escapeHtml(r.id)}">
                <td>
                  <span class="ce-page-tag">${escapeHtml(r.page)}</span>
                  <span class="ce-section-tag">${escapeHtml(r.section)} · ${escapeHtml(r.tag || '')}</span>
                </td>
                <td class="ce-col-orig">${escapeHtml(r.originalText || '')}</td>
                <td class="ce-col-sel">${
                  sel ? escapeHtml(sel.text)
                      : (r.options && r.options.length
                          ? '<span class="ce-muted">' + r.options.length + ' option' + (r.options.length === 1 ? '' : 's') + ', none picked</span>'
                          : '<span class="ce-muted">—</span>')
                }</td>
                <td><span class="ce-status-pill ce-status-${st}">${st}</span></td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>`;
    body.querySelectorAll('tr.ce-row').forEach(tr => {
      tr.onclick = () => {
        const id = tr.getAttribute('data-jump');
        closeMasterList();
        jumpToAndOpen(id);
      };
    });
  }
  function jumpToAndOpen(id) {
    const el = elementsById.get(id);
    const entry = entriesById.get(id);
    if (!entry) return;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const prevBg = el.style.background;
      el.style.transition = 'background 0.6s ease';
      el.style.background = 'rgba(245, 110, 56, 0.18)';
      setTimeout(() => { el.style.background = prevBg; }, 1200);
    }
    setTimeout(() => openPopup(id), 220);
  }

  // ----------------------------------------------------------
  // POLLING
  // ----------------------------------------------------------
  async function _doFetchAndApply() {
    const { entries } = await apiGet();
    const next = new Map();
    for (const e of entries) next.set(e.id, e);
    entriesById = next;
    applyStateToDOM();
    renderToolbar();
    const bd = document.querySelector('#copy-editor-root .ce-backdrop[data-kind="master"]');
    if (bd) renderMasterRows(bd);
  }
  function pollFetch() {
    if (offlineMode) return Promise.resolve();
    if (inFlightFetchPromise) return inFlightFetchPromise;
    inFlightFetchPromise = _doFetchAndApply()
      .catch(err => console.warn('pollFetch failed:', err))
      .finally(() => { inFlightFetchPromise = null; });
    return inFlightFetchPromise;
  }
  function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(pollFetch, POLL_MS);
  }

  // ----------------------------------------------------------
  // BOOT
  // ----------------------------------------------------------
  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else { fn(); }
  }

  ready(async () => {
    // Defer one tick so any inline page scripts that mutate the DOM
    // on load have a chance to finish before we walk it. setTimeout(0)
    // instead of rAF because rAF gets throttled in some preview /
    // background-tab environments.
    await new Promise(r => setTimeout(r, 0));
    const root = document.createElement('div');
    root.id = 'copy-editor-root';
    document.body.appendChild(root);

    const found = scanDOM();
    document.body.classList.toggle('ce-edit-mode', editMode);
    renderToolbar();
    attachClickSuppress();
    attachDblclick();

    try {
      // Register only entries the server doesn't know yet.
      const existingResp = await apiGet();
      const existing = new Map();
      for (const e of (existingResp.entries || [])) existing.set(e.id, e);
      const fresh = found.filter(e => !existing.has(e.id));
      if (fresh.length) await apiRegister(fresh);
      await _doFetchAndApply();
      startPolling();
    } catch (err) {
      console.warn('Copy editor offline:', err);
      offlineMode = true;
      toast('Copy editor offline — set Upstash env vars to enable saves.', 4000);
    }
  });
})();
