/* Librarium Esotericum search widget v4 — shadow DOM, Hostinger-safe */
(function () {
  'use strict';

  const DEFAULT_INDEX_URL = 'https://joedub67.github.io/librarium-search-assets/librarium-index.json.gz';
  const DEFAULT_INDEX_JS_URL = 'https://joedub67.github.io/librarium-search-assets/librarium-index.js';
  const MAX_RESULTS = 80;
  const CACHE_KEY = '__LE_SEARCH_INDEX_V4__';

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function bytesToText(buffer) {
    return new TextDecoder('utf-8').decode(buffer);
  }

  async function loadGzipJson(url) {
    const resp = await fetch(url, { cache: 'force-cache', mode: 'cors' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);

    // GitHub Pages serves .gz as application/gzip without Content-Encoding, so we decompress.
    if ('DecompressionStream' in window) {
      try {
        const stream = resp.body.pipeThrough(new DecompressionStream('gzip'));
        return JSON.parse(await new Response(stream).text());
      } catch (err) {
        // Some hosts transparently decompress. Fall through and try plain text.
      }
    }

    const buffer = await resp.arrayBuffer();
    const text = bytesToText(buffer);
    if (text.trim().charAt(0) === '{') return JSON.parse(text);
    throw new Error('Browser cannot decompress gzip index');
  }

  function loadScriptIndex(url) {
    return new Promise((resolve, reject) => {
      if (window.__LE_INDEX__ && window.__LE_INDEX__.items) return resolve(window.__LE_INDEX__);
      const s = document.createElement('script');
      s.src = url;
      s.async = true;
      s.onload = () => {
        if (window.__LE_INDEX__ && window.__LE_INDEX__.items) resolve(window.__LE_INDEX__);
        else reject(new Error('script index loaded but window.__LE_INDEX__ missing'));
      };
      s.onerror = () => reject(new Error('failed to load script index'));
      document.head.appendChild(s);
    });
  }

  async function getIndex(indexUrl, jsUrl) {
    if (window[CACHE_KEY]) return window[CACHE_KEY];
    try {
      window[CACHE_KEY] = await loadGzipJson(indexUrl);
    } catch (gzipErr) {
      console.warn('[Librarium Search] gzip index failed, trying JS fallback:', gzipErr);
      window[CACHE_KEY] = await loadScriptIndex(jsUrl);
    }

    const index = window[CACHE_KEY];
    for (const item of index.items) {
      item._q = ((item.f || '') + ' ' + (item.p || '') + ' ' + (item.e || '')).toLowerCase();
    }
    return index;
  }

  function typeLabel(t) {
    if (!t) return 'file';
    if (t === 'document') return 'PDF';
    if (t === 'text') return 'TEXT';
    if (t === 'archive') return 'ARCHIVE';
    if (t === 'audio') return 'AUDIO';
    if (t === 'video') return 'VIDEO';
    if (t === 'image') return 'IMAGE';
    return String(t).toUpperCase();
  }

  function renderShell(shadow, defaultSection) {
    shadow.innerHTML = `
      <style>
        :host { all: initial; display: block; contain: content; }
        .le-box, .le-box * { box-sizing: border-box; }
        .le-box {
          --gold: #c9b987;
          --gold-soft: #98865e;
          --cream: #e7ddc2;
          --muted: #756b5a;
          --ink: rgba(8, 8, 13, 0.88);
          --line: rgba(201, 185, 135, 0.22);
          --hover: rgba(201, 185, 135, 0.075);
          width: min(760px, 100%);
          margin: 28px auto;
          padding: 0 10px;
          color: var(--gold);
          font-family: Georgia, 'Times New Roman', serif;
          text-align: left;
        }
        .le-panel {
          border: 1px solid var(--line);
          border-radius: 12px;
          background: linear-gradient(180deg, rgba(8,8,14,.90), rgba(8,8,14,.78));
          box-shadow: 0 18px 45px rgba(0,0,0,.34);
          overflow: hidden;
          backdrop-filter: blur(2px);
        }
        .le-top {
          display: grid;
          grid-template-columns: 1fr minmax(165px, 245px);
          gap: 0;
          border-bottom: 1px solid var(--line);
        }
        .le-searchline {
          display: flex;
          align-items: center;
          min-width: 0;
          background: rgba(0,0,0,.16);
        }
        .le-icon {
          width: 17px;
          height: 17px;
          margin-left: 16px;
          color: var(--muted);
          flex: 0 0 auto;
        }
        .le-input {
          width: 100%;
          min-width: 0;
          border: 0 !important;
          outline: 0 !important;
          box-shadow: none !important;
          background: transparent !important;
          color: var(--cream) !important;
          font: 15px/1.3 Georgia, 'Times New Roman', serif !important;
          padding: 15px 14px 14px 10px !important;
          appearance: none;
        }
        .le-input::placeholder { color: rgba(152,134,94,.62); opacity: 1; }
        .le-select-wrap { position: relative; border-left: 1px solid var(--line); }
        .le-select {
          width: 100%;
          height: 100%;
          border: 0 !important;
          outline: 0 !important;
          border-radius: 0 !important;
          color: var(--gold) !important;
          background: rgba(0,0,0,.28) !important;
          font: 12px/1.2 Georgia, 'Times New Roman', serif !important;
          padding: 0 34px 0 13px !important;
          appearance: none;
          -webkit-appearance: none;
          cursor: pointer;
        }
        .le-select-wrap::after {
          content: '⌄';
          position: absolute;
          right: 13px;
          top: 50%;
          transform: translateY(-58%);
          color: var(--muted);
          pointer-events: none;
          font-size: 16px;
        }
        .le-select option { background: #101018; color: var(--cream); }
        .le-meta {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          padding: 9px 14px;
          color: var(--muted);
          font-size: 11px;
          letter-spacing: .02em;
          border-bottom: 1px solid rgba(201,185,135,.11);
          min-height: 33px;
        }
        .le-count { white-space: nowrap; }
        .le-body { max-height: 430px; overflow: auto; }
        .le-empty {
          padding: 28px 18px 31px;
          text-align: center;
          color: var(--muted);
          font-style: italic;
          font-size: 13px;
        }
        .le-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 10px 14px;
          padding: 10px 14px 9px;
          border-bottom: 1px solid rgba(201,185,135,.09);
          background: transparent;
          transition: background .12s ease;
        }
        .le-row:hover { background: var(--hover); }
        .le-name {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--cream);
          font-size: 13px;
          line-height: 1.35;
        }
        .le-path {
          grid-column: 1 / -1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: rgba(117,107,90,.88);
          font-size: 10px;
          line-height: 1.2;
          margin-top: -5px;
        }
        .le-badge {
          align-self: start;
          color: #a99458;
          border: 1px solid rgba(169,148,88,.22);
          background: rgba(169,148,88,.08);
          border-radius: 999px;
          padding: 3px 7px 2px;
          font-size: 9px;
          line-height: 1;
          letter-spacing: .06em;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .le-error { color: #c7826f; }
        mark { background: rgba(201,185,135,.18); color: #fff2c7; padding: 0 1px; border-radius: 2px; }
        @media (max-width: 620px) {
          .le-box { margin: 18px auto; padding: 0 4px; }
          .le-top { grid-template-columns: 1fr; }
          .le-select-wrap { border-left: 0; border-top: 1px solid var(--line); height: 42px; }
          .le-meta { flex-direction: column; gap: 3px; }
          .le-body { max-height: 360px; }
          .le-path { display: none; }
        }
      </style>
      <div class="le-box">
        <div class="le-panel">
          <div class="le-top">
            <label class="le-searchline" title="Search the Librarium catalog">
              <svg class="le-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>
              <input class="le-input" type="search" autocomplete="off" spellcheck="false" placeholder="Search 79,445 books…">
            </label>
            <div class="le-select-wrap"><select class="le-select" aria-label="Collection"><option value="">All Collections</option></select></div>
          </div>
          <div class="le-meta"><span class="le-status">Loading index…</span><span class="le-count"></span></div>
          <div class="le-body"><div class="le-empty">Loading the catalogue.</div></div>
        </div>
      </div>`;
  }

  function highlight(text, query) {
    const safe = escapeHtml(text);
    if (!query || query.length < 2) return safe;
    const words = query.split(/\s+/).filter(Boolean).slice(0, 4).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (!words.length) return safe;
    return safe.replace(new RegExp('(' + words.join('|') + ')', 'ig'), '<mark>$1</mark>');
  }

  function initWidget(host) {
    if (host.dataset.leReady === '1') return;
    host.dataset.leReady = '1';

    const indexUrl = host.getAttribute('data-index-url') || DEFAULT_INDEX_URL;
    const jsUrl = host.getAttribute('data-index-js-url') || DEFAULT_INDEX_JS_URL;
    const defaultSection = host.getAttribute('data-default-section') || '';
    const shadow = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
    renderShell(shadow, defaultSection);

    const input = shadow.querySelector('.le-input');
    const select = shadow.querySelector('.le-select');
    const status = shadow.querySelector('.le-status');
    const count = shadow.querySelector('.le-count');
    const body = shadow.querySelector('.le-body');

    let index = null;
    let timer = null;

    function setEmpty(message) {
      body.innerHTML = '<div class="le-empty">' + escapeHtml(message) + '</div>';
    }

    function sectionSize(section) {
      if (!index) return 0;
      return section ? ((index.sections[section] && index.sections[section].n) || 0) : index.items.length;
    }

    function updateStatus(shown, total) {
      const section = select.value;
      const sectionText = section ? section : 'all collections';
      const sectionN = sectionSize(section).toLocaleString();
      status.textContent = sectionN + ' items in ' + sectionText;
      count.textContent = typeof shown === 'number'
        ? (total > shown ? shown + ' of ' + total.toLocaleString() + ' matches' : total.toLocaleString() + ' matches')
        : '';
    }

    function renderResults(items, total, q) {
      if (!q) {
        updateStatus();
        setEmpty('Start typing to search the catalogue.');
        return;
      }
      if (!items.length) {
        updateStatus(0, 0);
        setEmpty('No matches found. Try a broader term.');
        return;
      }
      body.innerHTML = items.map(item => (
        '<div class="le-row">' +
          '<div class="le-name" title="' + escapeHtml(item.f) + '">' + highlight(item.f, q) + '</div>' +
          '<div class="le-badge">' + escapeHtml(typeLabel(item.t)) + '</div>' +
          '<div class="le-path" title="' + escapeHtml(item.p) + '">' + highlight(item.p, q) + '</div>' +
        '</div>'
      )).join('');
      updateStatus(items.length, total);
    }

    function runSearch() {
      if (!index) return;
      const q = input.value.trim().toLowerCase();
      const terms = q.split(/\s+/).filter(Boolean);
      const section = select.value;
      let matches = [];

      if (terms.length) {
        for (const item of index.items) {
          if (section && item.s !== section) continue;
          let ok = true;
          for (const term of terms) {
            if (item._q.indexOf(term) === -1) { ok = false; break; }
          }
          if (ok) {
            matches.push(item);
            if (matches.length >= MAX_RESULTS) {
              // Continue counting cheaply enough? Not worth making the browser sweat.
              // We count total below only when capped is hit.
            }
          }
        }
      }

      const total = matches.length;
      renderResults(matches.slice(0, MAX_RESULTS), total, q);
    }

    function scheduleSearch() {
      clearTimeout(timer);
      timer = setTimeout(runSearch, 120);
    }

    input.addEventListener('input', scheduleSearch);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        clearTimeout(timer);
        runSearch();
        const first = body.querySelector('.le-row');
        if (first) first.scrollIntoView({ block: 'nearest' });
      }
      if (event.key === 'Escape') {
        input.value = '';
        clearTimeout(timer);
        runSearch();
      }
    });
    select.addEventListener('change', () => {
      clearTimeout(timer);
      runSearch();
    });

    getIndex(indexUrl, jsUrl).then((loaded) => {
      index = loaded;
      const sections = Object.keys(index.sections || {}).sort();
      select.innerHTML = '<option value="">All Collections</option>';
      for (const section of sections) {
        const opt = document.createElement('option');
        opt.value = section;
        opt.textContent = section + ' (' + ((index.sections[section] && index.sections[section].n) || 0).toLocaleString() + ')';
        select.appendChild(opt);
      }
      if (defaultSection && sections.indexOf(defaultSection) !== -1) select.value = defaultSection;
      updateStatus();
      setEmpty('Start typing to search the catalogue.');
    }).catch((err) => {
      console.error('[Librarium Search] failed:', err);
      status.innerHTML = '<span class="le-error">Search index failed to load</span>';
      count.textContent = '';
      setEmpty('The catalogue could not be loaded.');
    });
  }

  function initAll() {
    document.querySelectorAll('.le-search:not([data-le-ready="1"])').forEach(initWidget);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll);
  else initAll();

  if ('MutationObserver' in window) {
    new MutationObserver(initAll).observe(document.documentElement, { childList: true, subtree: true });
  }
})();
