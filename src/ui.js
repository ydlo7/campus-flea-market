/* ===== ui.js · 通用 UI 工具 ===== */
(function () {
  const CFM = (window.CFM = window.CFM || {});

  const esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* ---------- icons (stroke, currentColor) ---------- */
  const ICONS = {
    search: '<circle cx="11" cy="11" r="7"/><path d="M20.5 20.5L16.6 16.6"/>',
    back: '<path d="M14.5 5.5L8 12l6.5 6.5"/>',
    chevron: '<path d="M9.5 5.5L16 12l-6.5 6.5"/>',
    chevronDown: '<path d="M5.5 9.5L12 16l6.5-6.5"/>',
    home: '<path d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1v-9.5z"/>',
    chat: '<path d="M21 11.5a8 8 0 0 1-11.6 7.2L4 20l1.3-4.2A8 8 0 1 1 21 11.5z"/>',
    user: '<circle cx="12" cy="8" r="3.6"/><path d="M4.8 20.2c.6-3.6 3.6-5.6 7.2-5.6s6.6 2 7.2 5.6"/>',
    plus: '<path d="M12 5.5v13M5.5 12h13"/>',
    heart: '<path d="M12 20s-7.2-4.3-7.2-9.2A4.1 4.1 0 0 1 12 8.2a4.1 4.1 0 0 1 7.2 2.6C19.2 15.7 12 20 12 20z"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    camera: '<path d="M4 8.5h3l1.4-2h7.2l1.4 2h3v10H4z"/><circle cx="12" cy="13" r="3.2"/>',
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><path d="M4 16l4.5-4.5 3 3 2.5-2.5L20 17"/><circle cx="9" cy="9.5" r="1.3"/>',
    send: '<path d="M4 12l16-7-7 16-2.2-6.8z"/>',
    tag: '<path d="M11 3.5H20v9l-9.4 9.4a1.5 1.5 0 0 1-2.2 0l-6.8-6.8a1.5 1.5 0 0 1 0-2.2L11 3.5z"/><circle cx="16.5" cy="7.5" r="1.3"/>',
    clock: '<circle cx="12" cy="12" r="8.4"/><path d="M12 7.5V12l3 1.8"/>',
    pin: '<path d="M12 21s6.5-6 6.5-10.5a6.5 6.5 0 1 0-13 0C5.5 15 12 21 12 21z"/><circle cx="12" cy="10.4" r="2.4"/>',
    shield: '<path d="M12 3.5l7 2.6v6c0 4.2-2.9 7.4-7 8.9-4.1-1.5-7-4.7-7-8.9v-6l7-2.6z"/><path d="M9 12l2.2 2.2L15.2 10"/>',
    edit: '<path d="M16.5 4.5l3 3L9 18l-4 1 1-4L16.5 4.5z"/>',
    trash: '<path d="M5 7h14M9.5 7V4.8h5V7M6.5 7l1 13h9l1-13"/>',
    bell: '<path d="M6.5 10a5.5 5.5 0 0 1 11 0c0 4 1.5 5.5 1.5 5.5H5S6.5 14 6.5 10z"/><path d="M10 19a2 2 0 0 0 4 0"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    qr: '<rect x="4" y="4" width="6" height="6" rx="1.4"/><rect x="14" y="4" width="6" height="6" rx="1.4"/><rect x="4" y="14" width="6" height="6" rx="1.4"/><path d="M14 14h2.5v2.5H14zM17.5 17.5H20V20h-2.5z"/>',
    order: '<path d="M6 3.5h9l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z"/><path d="M8.5 9.5h7M8.5 13.5h7M8.5 17h4"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',
    swap: '<path d="M7 8h11l-3-3M17 16H6l3 3"/>',
    eye: '<path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.6"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    help: '<circle cx="12" cy="12" r="8.4"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .9-1 1.6v.3"/><circle cx="12" cy="16.6" r=".9" fill="currentColor" stroke="none"/>',
    bag: '<path d="M5.5 8h13l-1 12h-11z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
    wallet: '<rect x="3.5" y="6.5" width="17" height="12" rx="3"/><path d="M15 12.5h3.5"/>',
    notification: '<path d="M6.5 10a5.5 5.5 0 0 1 11 0c0 4 1.5 5.5 1.5 5.5H5S6.5 14 6.5 10z"/><path d="M10 19a2 2 0 0 0 4 0"/>',
  };

  function icon(name, size, cls) {
    const s = size || 20;
    return `<svg class="ic ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  }
  function iconFill(name, size, cls) {
    const s = size || 20;
    return `<svg class="ic ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  }

  /* ---------- format ---------- */
  function money(n) {
    const v = Number(n) || 0;
    return Number.isInteger(v) ? String(v) : v.toFixed(2);
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function timeShort(ts) {
    const d = new Date(ts);
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function dayKey(ts) {
    const d = new Date(ts);
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }
  function timeAgo(ts) {
    const diff = Date.now() - ts;
    if (diff < 60e3) return '刚刚';
    if (diff < 3600e3) return Math.floor(diff / 60e3) + ' 分钟前';
    const d = new Date(ts), now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return timeShort(ts);
    const y = new Date(now.getTime() - 86400e3);
    if (d.toDateString() === y.toDateString()) return '昨天 ' + timeShort(ts);
    if (d.getFullYear() === now.getFullYear()) return `${d.getMonth() + 1}-${d.getDate()}`;
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  function fullTime(ts) {
    const d = new Date(ts);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function mmss(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    return pad(Math.floor(s / 60)) + ':' + pad(s % 60);
  }

  /* ---------- toast ---------- */
  let toastTimer = null;
  function toast(msg, ms) {
    const wrap = $('#toast');
    if (!wrap) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 240);
    }, ms || 1900);
  }

  /* ---------- sheet ---------- */
  function sheet(opts) {
    const root = $('#sheet-root');
    const wrap = document.createElement('div');
    wrap.className = 'sheet-wrap';
    wrap.innerHTML =
      `<div class="sheet-mask"></div>` +
      `<div class="sheet">` +
      `<div class="sheet-grab"></div>` +
      (opts.title ? `<div class="sheet-title">${esc(opts.title)}</div>` : '') +
      (opts.desc ? `<div class="sheet-desc">${esc(opts.desc)}</div>` : '') +
      `<div class="sheet-body">${opts.body || ''}</div>` +
      (opts.actions
        ? `<div class="sheet-actions">${opts.actions
            .map((a) => `<button class="btn ${a.variant || ''}" data-sheet-act="${a.key}">${esc(a.label)}</button>`)
            .join('')}</div>`
        : '') +
      `</div>`;
    root.appendChild(wrap);
    const close = () => {
      wrap.querySelector('.sheet').style.animation = 'sheetUp .2s reverse ease-in forwards';
      root.style.zIndex = '';
      setTimeout(() => wrap.remove(), 190);
    };
    wrap.querySelector('.sheet-mask').addEventListener('click', () => {
      if (opts.maskClose !== false) close();
    });
    if (opts.autoClose !== false) {
      wrap.querySelectorAll('[data-sheet-act]').forEach((b) => {
        b.addEventListener('click', () => {
          if (!opts.onAction || opts.onAction(b.dataset.sheetAct) !== false) close();
        });
      });
    }
    return { el: wrap, close };
  }

  /* ---------- sheet with form fields (promise) ---------- */
  function sheetForm(opts) {
    return new Promise((resolve) => {
      const body = (opts.fields || [])
        .map((f) => {
          if (f.type === 'select') {
            const opts2 = (f.options || [])
              .map((o) => `<button type="button" class="chip ${o === f.value ? 'on' : ''}" data-val="${esc(o)}">${esc(o)}</button>`)
              .join('');
            return `<div class="fld"><label>${esc(f.label)}</label><div class="chips small" style="padding:0;flex-wrap:wrap" data-fld="${f.key}">${opts2}</div></div>`;
          }
          if (f.type === 'textarea') {
            return `<div class="fld"><label>${esc(f.label)}</label><textarea data-fld="${f.key}" rows="3" placeholder="${esc(f.placeholder || '')}">${esc(f.value || '')}</textarea></div>`;
          }
          return `<div class="fld"><label>${esc(f.label)}</label><input data-fld="${f.key}" type="${f.type || 'text'}" inputmode="${f.type === 'number' ? 'decimal' : 'text'}" placeholder="${esc(f.placeholder || '')}" value="${esc(f.value == null ? '' : f.value)}"></div>`;
        })
        .join('');

      const s = sheet({
        title: opts.title,
        desc: opts.desc,
        body,
        actions: [
          { key: 'cancel', label: '取消', variant: 'ghost' },
          { key: 'ok', label: opts.okText || '确定', variant: opts.danger ? 'danger' : 'primary' },
        ],
        autoClose: false,
      });
      const el = s.el;

      el.addEventListener('click', (e) => {
        const c = e.target.closest('.chip[data-val]');
        if (c && c.parentElement.classList.contains('chips')) {
          c.parentElement.querySelectorAll('.chip').forEach((x) => x.classList.remove('on'));
          c.classList.add('on');
        }
      });

      el.querySelector('[data-sheet-act="cancel"]').addEventListener('click', () => {
        s.close();
        resolve(null);
      });
      el.querySelector('[data-sheet-act="ok"]').addEventListener('click', () => {
        const vals = {};
        (opts.fields || []).forEach((f) => {
          const box = el.querySelector(`[data-fld="${f.key}"]`);
          if (!box) return;
          if (f.type === 'select') {
            const on = box.querySelector('.chip.on');
            vals[f.key] = on ? on.dataset.val : f.value || '';
          } else {
            vals[f.key] = (box.value || '').trim();
          }
        });
        s.close();
        resolve(vals);
      });

      const first = el.querySelector('input,textarea');
      if (first) setTimeout(() => first.focus(), 260);
    });
  }

  /* ---------- confirm ---------- */
  function confirmSheet(opts) {
    return new Promise((resolve) => {
      const s = sheet({
        title: opts.title,
        desc: opts.text,
        body: '',
        actions: [
          { key: 'cancel', label: opts.cancelText || '再想想', variant: 'ghost' },
          { key: 'ok', label: opts.okText || '确定', variant: opts.danger ? 'danger' : 'primary' },
        ],
        autoClose: false,
      });
      s.el.querySelector('[data-sheet-act="cancel"]').onclick = () => { s.close(); resolve(false); };
      s.el.querySelector('[data-sheet-act="ok"]').onclick = () => { s.close(); resolve(true); };
    });
  }

  /* ---------- avatar / images ---------- */
  function initials(name) {
    const n = String(name || '?').trim();
    return n.slice(0, 1);
  }
  function avatar(user, size, cls) {
    const s = size || 20;
    const c = cls ? ` class="${cls}"` : '';
    if (user && user.avatar) {
      return `<img${c} src="${user.avatar}" style="width:${s}px;height:${s}px;border-radius:50%;object-fit:cover" alt="">`;
    }
    return `<span${c} style="width:${s}px;height:${s}px;border-radius:50%;background:#F1F1EE;display:grid;place-items:center;font-size:${Math.round(s * 0.46)}px;color:#8B8D93">${esc(initials(user && user.nick))}</span>`;
  }

  function readImage(file, max) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => {
        const img = new Image();
        img.onload = () => {
          const limit = max || 820;
          const scale = Math.min(1, limit / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(img.width * scale));
          c.height = Math.max(1, Math.round(img.height * scale));
          const ctx = c.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(img, 0, 0, c.width, c.height);
          resolve({ data: c.toDataURL('image/jpeg', 0.74), w: c.width, h: c.height });
        };
        img.onerror = () => reject(new Error('图片解析失败'));
        img.src = fr.result;
      };
      fr.onerror = () => reject(new Error('读取失败'));
      fr.readAsDataURL(file);
    });
  }

  function pickImage(max) {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      document.body.appendChild(input);
      let done = false;
      input.addEventListener('change', async () => {
        done = true;
        const f = input.files && input.files[0];
        input.remove();
        if (!f) return resolve(null);
        try {
          const r = await readImage(f, max);
          resolve(r);
        } catch (e) {
          toast('图片处理失败，换一张试试');
          resolve(null);
        }
      });
      input.click();
      setTimeout(() => {
        if (!done) { /* 用户可能取消，浏览器无事件 */ }
      }, 1000);
    });
  }

  const debounce = (fn, ms) => {
    let t = null;
    return function () {
      const args = arguments;
      clearTimeout(t);
      t = setTimeout(() => fn.apply(null, args), ms || 220);
    };
  };

  CFM.ui = { esc, $, $$, icon, iconFill, money, timeShort, timeAgo, fullTime, mmss, dayKey, pad, toast, sheet, sheetForm, confirmSheet, avatar, readImage, pickImage, debounce };
})();
