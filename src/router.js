/* ===== router.js · 页面栈与顶栏 ===== */
(function () {
  const CFM = window.CFM;
  CFM.pages = CFM.pages || {};
  CFM.actions = CFM.actions || {};

  const NAV_OF = { home: 'home', messages: 'messages', favorites: 'favorites' };

  const router = {
    stack: [],

    start() {
      this.stack = [{ name: CFM.store.isLogged() ? 'home' : 'auth', params: {} }];
      this.render(false);
    },
    go(name, params) {
      this.stack.push({ name, params: params || {} });
      this.render();
    },
    replace(name, params) {
      this.stack[this.stack.length - 1] = { name, params: params || {} };
      this.render();
    },
    back() {
      if (this.stack.length > 1) {
        this.stack.pop();
        this.render();
        return true;
      }
      return false;
    },
    current() {
      return this.stack[this.stack.length - 1];
    },
    render() {
      const cur = this.current();
      const page = CFM.pages[cur.name];
      const view = document.getElementById('view');
      if (!page) {
        view.innerHTML = '<div class="wrap"><div class="empty">页面走丢了</div></div>';
        return;
      }
      closeMenu();
      view.innerHTML = page.render(cur.params || {});
      this.syncHeader();
      window.scrollTo(0, 0);
      if (CFM.analytics) CFM.analytics.track('page_view', { page: cur.name });
      if (page.mount) {
        try {
          page.mount(cur.params || {});
        } catch (e) {
          console.error('[mount]', cur.name, e);
        }
      }
    },
    refresh() {
      const cur = this.current();
      const page = CFM.pages[cur.name];
      if (!page) return;
      const view = document.getElementById('view');
      const se = document.querySelector('.msg-page .conv-scroll') || document.querySelector('.chat-msgs');
      const st = se ? se.scrollTop : 0;
      view.innerHTML = page.render(cur.params || {});
      this.syncHeader();
      if (se) {
        const se2 = document.querySelector('.msg-page .conv-scroll') || document.querySelector('.chat-msgs');
        if (se2) se2.scrollTop = st;
      }
      if (page.mount) {
        try {
          page.mount(cur.params || {}, true);
        } catch (e) {
          console.error('[mount]', cur.name, e);
        }
      }
    },
    syncHeader() {
      const cur = this.current();
      const active = NAV_OF[cur.name];
      document.querySelectorAll('#nav a').forEach((a) => {
        a.classList.toggle('on', a.dataset.tab === active);
      });
      const me = CFM.store.me();
      document.body.classList.toggle('logged-out', !me);
      const ava = document.getElementById('userAva');
      if (ava && me) {
        ava.src = me.avatar || CFM.avatarPic('👤', '#EFEFEC', '#DCDCD7');
        ava.alt = me.nick;
      }
      const dot = document.getElementById('navDot');
      if (dot) {
        const n = CFM.store.unreadTotal() + CFM.store.unreadNotices();
        dot.hidden = !n;
      }
    },
  };

  CFM.router = router;

  /* ---- 用户菜单 ---- */
  function menuHTML() {
    const me = CFM.store.me();
    if (!me) return '';
    const n = CFM.store.unreadNotices();
    return `
      <div class="menu-user">
        <img src="${me.avatar}" alt="">
        <div><b>${CFM.ui.esc(me.nick)}</b><span>${CFM.ui.esc(me.school || '')}</span></div>
      </div>
      <div class="sep"></div>
      <button data-act="nav.mine">我的主页</button>
      <button data-act="nav.notices">通知${n ? '（' + n + '）' : ''}</button>
      <button data-act="nav.qrcode">收款码</button>
      <div class="sep"></div>
      <button data-act="menu.switch">切换演示账号</button>
      <button data-act="menu.logout">退出登录</button>`;
  }
  function closeMenu() {
    const m = document.getElementById('userMenu');
    if (m) m.classList.remove('open');
  }
  CFM.menu = { close: closeMenu };

  CFM.actions['menu.toggle'] = (el, e) => {
    e.stopPropagation();
    const m = document.getElementById('userMenu');
    m.innerHTML = menuHTML();
    m.classList.toggle('open');
  };
  document.addEventListener('click', (e) => {
    const m = document.getElementById('userMenu');
    if (m && m.classList.contains('open') && !e.target.closest('#userMenu') && !e.target.closest('#userBtn')) {
      m.classList.remove('open');
    }
  });

  /* ---- 全局点击代理 ---- */
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const fn = CFM.actions[el.dataset.act];
    if (fn) {
      e.preventDefault();
      try {
        fn(el, e);
      } catch (err) {
        console.error('[action]', el.dataset.act, err);
      }
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const sheets = document.querySelectorAll('.sheet-wrap');
      if (sheets.length) {
        sheets[sheets.length - 1].querySelector('.sheet-mask').click();
        return;
      }
      closeMenu();
    }
  });

  /* ---- 通用导航 ---- */
  CFM.actions['nav.home'] = () => {
    router.stack = [{ name: 'home', params: {} }];
    router.render();
  };
  CFM.actions['nav.tab'] = (el) => {
    const tab = el.dataset.tab;
    router.stack = [{ name: tab, params: {} }];
    router.render();
  };
  CFM.actions['nav.publish'] = () => router.go('publish', {});
  CFM.actions['nav.mine'] = () => router.go('mine', {});
  CFM.actions['nav.notices'] = () => router.go('notices', {});
  CFM.actions['nav.qrcode'] = () => router.go('qrcode', {});
  CFM.actions['nav.back'] = () => {
    if (!router.back()) {
      router.stack = [{ name: 'home', params: {} }];
      router.render();
    }
  };
})();
