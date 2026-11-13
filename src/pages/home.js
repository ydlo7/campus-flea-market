/* ===== 页面：逛逛（首页） ===== */
(function () {
  const CFM = window.CFM;
  const { icon, iconFill, esc, money, avatar } = CFM.ui;
  const S = CFM.store;

  const state = { q: '', cat: '全部', sort: '综合' };

  function card(p) {
    const seller = S.user(p.sellerId) || { nick: '同学' };
    const fav = S.isFav(p.id);
    return `
      <article class="pcard" data-act="home.open" data-id="${p.id}">
        <div class="ph">
          <img src="${p.images[0]}" alt="${esc(p.title)}" loading="lazy">
          ${p.status === 'reserved' ? '<div class="flag">已预订</div>' : ''}
          <button class="fav ${fav ? 'on' : ''}" data-act="fav.toggle" data-id="${p.id}" aria-label="收藏">
            ${fav ? iconFill('heart', 14) : icon('heart', 14)}
          </button>
        </div>
        <div class="pb">
          <div class="pt">${esc(p.title)}</div>
          <div class="pp"><b>¥${money(p.price)}</b>${p.origPrice ? `<s>¥${money(p.origPrice)}</s>` : ''}</div>
          <div class="pm"><span>${esc(p.condition || '')}</span><i></i><span>${esc(seller.nick)}</span></div>
        </div>
      </article>`;
  }

  function list() {
    return S.products({ q: state.q, category: state.cat, sort: state.sort, status: ['on_sale', 'reserved'] });
  }

  function gridHTML() {
    const arr = list();
    if (!arr.length) {
      return `<div class="empty" style="grid-column:1/-1">
        <b>没有找到相关的闲置</b>换个关键词，或者自己发一个
      </div>`;
    }
    return arr.map(card).join('');
  }

  CFM.pages.home = {
    render() {
      const n = list().length;
      return `
      <div class="wrap">
        <div class="filter">
          <button class="cat ${state.cat === '全部' ? 'on' : ''}" data-act="home.cat" data-cat="全部">全部</button>
          ${S.CATEGORIES.filter((c) => c !== '全部')
            .map((c) => `<button class="cat ${state.cat === c ? 'on' : ''}" data-act="home.cat" data-cat="${c}">${c}</button>`)
            .join('')}
          <span class="sp"></span>
          <div class="sortbar">
            ${['综合', '最新', '价格↑', '价格↓']
              .map(
                (s) =>
                  `<button class="${state.sort === s ? 'on' : ''}" data-act="home.sort" data-sort="${s}">${s.replace('↑', ' ↑').replace('↓', ' ↓')}</button>`
              )
              .join('')}
            <span class="cnt" id="cnt">${n} 件在售</span>
          </div>
        </div>
        <div class="grid" id="grid">${gridHTML()}</div>
      </div>`;
    },
    mount() {
      const q = document.getElementById('hq');
      if (q && q.value !== state.q) q.value = state.q;
    },
    /** 顶栏搜索把它当远程输入框 */
    setQuery(v) {
      state.q = v;
      if (CFM.router.current().name !== 'home') {
        CFM.router.stack = [{ name: 'home', params: {} }];
        CFM.router.render();
        return;
      }
      const g = document.getElementById('grid');
      const c = document.getElementById('cnt');
      const arr = list();
      if (g) g.innerHTML = gridHTML();
      if (c) c.textContent = arr.length + ' 件在售';
    },
  };

  CFM.actions['home.cat'] = (el) => {
    state.cat = el.dataset.cat;
    CFM.router.refresh();
  };
  CFM.actions['home.sort'] = (el) => {
    state.sort = el.dataset.sort;
    CFM.router.refresh();
  };
  CFM.actions['home.open'] = (el) => {
    S.bumpView(el.dataset.id).catch(() => {});
    CFM.router.go('detail', { id: el.dataset.id });
  };

  CFM.actions['fav.toggle'] = async (el, e) => {
    e.stopPropagation();
    try {
      const r = await S.toggleFav(el.dataset.id);
      const on = !!(r && r.on);
      CFM.ui.toast(on ? '已收藏，降价会提醒你' : '已取消收藏');
      el.classList.toggle('on', on);
      el.innerHTML = on ? iconFill('heart', 14) : icon('heart', 14);
      if (CFM.router.current().name !== 'home') CFM.router.refresh();
    } catch (err) {
      CFM.ui.toast(err.message);
    }
  };
})();
