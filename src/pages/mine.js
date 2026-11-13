/* ===== 页面：我的 / 收藏 / 通知 / 收款码 / 个人主页 ===== */
(function () {
  const CFM = window.CFM;
  const { icon, esc, money, avatar, timeAgo, fullTime, toast, sheetForm, confirmSheet, sheet } = CFM.ui;
  const S = CFM.store;

  const state = { tab: 'products', pf: '在售', ot: 'buy' };

  const STATUS_TEXT = {
    pending_pay: '待付款',
    pending_confirm: '待确认收款',
    pending_delivery: '待交货',
    completed: '已完成',
    cancelled: '已取消',
  };
  const STATUS_COLOR = {
    pending_pay: 'var(--accent)',
    pending_confirm: 'var(--accent)',
    pending_delivery: 'var(--accent)',
    completed: 'var(--green)',
    cancelled: 'var(--ink3)',
  };

  function joinAge(ts) {
    const days = Math.max(1, Math.round((Date.now() - ts) / 86400e3));
    if (days < 30) return days + ' 天';
    if (days < 365) return Math.round(days / 30) + ' 个月';
    const y = days / 365;
    return (y < 2 ? y.toFixed(1) : Math.round(y)) + ' 年';
  }

  /* ---------------- 我的 ---------------- */
  CFM.pages.mine = {
    render() {
      const me = S.me();
      if (!me) return `<div class="wrap"><div class="empty"><b>请先登录</b></div></div>`;
      const st = S.sellerStats(me.id);
      const favs = S.favList().length;
      const buyN = S.ordersOf(me.id, 'buy').length;
      const sellN = S.ordersOf(me.id, 'sell').length;

      return `
      <div class="wrap">
        <div class="phead">
          <img class="big" src="${me.avatar}" alt="">
          <div>
            <h1>${esc(me.nick)}
              ${me.verified ? `<span class="verify">${icon('shield', 12)} 校园认证</span>` : `<span class="tag">未认证</span>`}
            </h1>
            <div class="sub">${esc(me.school || '')}${me.campus ? ' · ' + esc(me.campus) : ''}${me.major ? ' · ' + esc(me.major) : ''}${me.studentNo ? ' · 学号 ' + esc(me.studentNo) : ''}</div>
          </div>
          <span class="sp"></span>
          <div class="stats">
            <span><b>${st.onSale}</b>在售</span>
            <span><b>${st.sold}</b>已售出</span>
            <span><b>${favs}</b>收藏</span>
          </div>
          <button class="btn line sm" data-act="mine.edit">编辑资料</button>
        </div>

        <div class="tabs">
          <button class="${state.tab === 'products' ? 'on' : ''}" data-act="mine.tab" data-v="products">我的商品<span class="cnt">${st.total}</span></button>
          <button class="${state.tab === 'orders' ? 'on' : ''}" data-act="mine.tab" data-v="orders">我的订单<span class="cnt">${buyN + sellN}</span></button>
        </div>

        ${state.tab === 'products' ? productsView() : ordersView()}
      </div>`;
    },
  };

  function productsView() {
    const me = S.me();
    const map = { 在售: ['on_sale', 'reserved'], 已售: ['sold'], 下架: ['off'] };
    const list = S.products({ sellerId: me.id, status: map[state.pf] }).sort((a, b) => b.createdAt - a.createdAt);

    const grid = list.length
      ? `<div class="mgrid">${list
          .map((p) => {
            const acts =
              state.pf === '在售'
                ? `<button data-act="pub.edit" data-id="${p.id}">编辑</button><button data-act="my.off" data-id="${p.id}">下架</button>`
                : state.pf === '下架'
                ? `<button data-act="my.on" data-id="${p.id}">上架</button><button data-act="my.del" data-id="${p.id}">删除</button>`
                : `<button data-act="pub.edit" data-id="${p.id}">编辑</button>`;
            return `<div class="mitem">
              <div class="mph" data-act="my.open" data-id="${p.id}" style="cursor:pointer">
                <img src="${p.images[0]}" alt="">
                <div class="flag">${S.PRODUCT_STATE[p.status]}</div>
              </div>
              <div class="mb">
                <div class="mt">${esc(p.title)}</div>
                <div class="mp">¥${money(p.price)}</div>
                <div class="mact">${acts}</div>
              </div>
            </div>`;
          })
          .join('')}</div>`
      : `<div class="empty"><b>还没有商品</b>发布一个闲置，让它去下一个同学手里
           <div><button class="btn primary" data-act="nav.publish" style="margin-top:18px">发布闲置</button></div>
         </div>`;

    return `
      <div class="subfilter">
        ${['在售', '已售', '下架'].map((t) => `<button class="${state.pf === t ? 'on' : ''}" data-act="mine.pf" data-v="${t}">${t}</button>`).join('')}
      </div>
      ${grid}`;
  }

  function ordersView() {
    const list = S.ordersOf(S.me().id, state.ot);
    const rows = list.length
      ? `<div class="olist">${list
          .map((o) => {
            const p = S.product(o.productId);
            const other = S.user(state.ot === 'buy' ? o.sellerId : o.buyerId);
            const mine = S.roleIn(o);
            const waitMe =
              (o.status === 'pending_pay' && mine === 'buyer') ||
              (o.status === 'pending_confirm' && mine === 'seller') ||
              (o.status === 'pending_delivery' && ((mine === 'buyer' && !o.buyerConfirmed) || (mine === 'seller' && !o.sellerConfirmed)));
            return `<div class="orow" data-act="my.orderOpen" data-id="${o.id}">
              <img src="${p ? p.images[0] : ''}" alt="">
              <div class="om">
                <div class="ot">${esc(p ? p.title : '商品已删除')}</div>
                <div class="os">${state.ot === 'buy' ? '卖家' : '买家'}：${esc((other && other.nick) || '')} · ${timeAgo(o.createdAt)} · ${esc(o.no)}</div>
              </div>
              <div class="op">¥${money(o.amount)}</div>
              <div class="ob">
                <b style="color:${STATUS_COLOR[o.status]}">${STATUS_TEXT[o.status]}</b>
                <span>${waitMe ? '待我处理' : '查看详情'}</span>
              </div>
            </div>`;
          })
          .join('')}</div>`
      : `<div class="empty"><b>还没有订单</b>${state.ot === 'buy' ? '去逛逛，看看同学都在卖什么' : '把闲置发出来，会有人来问的'}</div>`;

    return `
      <div class="subfilter">
        <button class="${state.ot === 'buy' ? 'on' : ''}" data-act="mine.ot" data-v="buy">我买到的</button>
        <button class="${state.ot === 'sell' ? 'on' : ''}" data-act="mine.ot" data-v="sell">我卖出的</button>
      </div>
      ${rows}`;
  }

  CFM.actions['mine.tab'] = (el) => {
    state.tab = el.dataset.v;
    CFM.router.refresh();
  };
  CFM.actions['mine.pf'] = (el) => {
    state.pf = el.dataset.v;
    CFM.router.refresh();
  };
  CFM.actions['mine.ot'] = (el) => {
    state.ot = el.dataset.v;
    CFM.router.refresh();
  };
  CFM.actions['my.open'] = (el) => CFM.router.go('detail', { id: el.dataset.id });
  CFM.actions['my.orderOpen'] = (el) => CFM.router.go('order', { id: el.dataset.id });
  CFM.actions['pub.edit'] = (el) => CFM.router.go('publish', { id: el.dataset.id });
  CFM.actions['my.off'] = async (el) => {
    try {
      await S.setProductStatus(el.dataset.id, 'off');
      toast('已下架');
      CFM.router.refresh();
    } catch (e) {
      toast(e.message);
    }
  };
  CFM.actions['my.on'] = async (el) => {
    try {
      await S.setProductStatus(el.dataset.id, 'on_sale');
      toast('已重新上架');
      CFM.router.refresh();
    } catch (e) {
      toast(e.message);
    }
  };
  CFM.actions['my.del'] = async (el) => {
    const ok = await confirmSheet({ title: '删除商品', text: '删除后不可恢复，确定吗？', okText: '删除', danger: true });
    if (!ok) return;
    try {
      await S.deleteProduct(el.dataset.id);
      toast('已删除');
      CFM.router.refresh();
    } catch (e) {
      toast(e.message);
    }
  };

  CFM.actions['mine.edit'] = async () => {
    const me = S.me();
    const v = await sheetForm({
      title: '编辑资料',
      fields: [
        { key: 'nick', label: '昵称', value: me.nick },
        { key: 'campus', label: '校区', value: me.campus || '' },
        { key: 'major', label: '院系 / 专业', value: me.major || '' },
      ],
      okText: '保存',
    });
    if (!v) return;
    if (!v.nick) return toast('昵称不能为空');
    try {
      await S.updateMe(v);
      toast('资料已更新');
      CFM.router.refresh();
    } catch (e) {
      toast(e.message);
    }
  };

  /* ---------------- 收藏 ---------------- */
  CFM.pages.favorites = {
    render() {
      const list = S.favList();
      const rows = list.length
        ? `<div class="flist">${list
            .map(({ fav, product: p }) => {
              const dropped = p.price < fav.priceAtFav && p.status === 'on_sale';
              return `<div class="frow2" data-act="my.open" data-id="${p.id}">
                <img src="${p.images[0]}" alt="">
                <div class="fi">
                  <div class="ft">${esc(p.title)}</div>
                  <div class="fp">
                    <b>¥${money(p.price)}</b>
                    <span class="tag ${p.status === 'on_sale' ? 'ok' : ''}">${S.PRODUCT_STATE[p.status]}</span>
                    ${dropped ? `<span class="drop">比收藏时降 ¥${money(fav.priceAtFav - p.price)}</span>` : ''}
                  </div>
                </div>
                <button class="btn line sm" data-act="fav.remove" data-id="${p.id}">取消收藏</button>
              </div>`;
            })
            .join('')}</div>`
        : `<div class="empty"><b>还没有收藏</b>看到喜欢的先收藏，降价会在「消息 - 通知」里提醒你</div>`;

      return `
      <div class="wrap mid">
        <div class="page-head"><h1>我的收藏</h1><span class="small-t">${list.length} 件</span></div>
        ${rows}
        <div style="height:64px"></div>
      </div>`;
    },
  };

  CFM.actions['fav.remove'] = (el, e) => {
    e.stopPropagation();
    S.toggleFav(el.dataset.id);
    toast('已取消收藏');
    CFM.router.refresh();
  };

  /* ---------------- 通知 ---------------- */
  CFM.pages.notices = {
    render() {
      const list = S.notices();
      const rows = list.length
        ? `<div>${list
            .map((n) => {
              const act = n.orderId ? 'msg.openOrder' : n.productId ? 'msg.openProduct' : '';
              return `<div class="nrow" ${act ? `data-act="${act}" data-id="${n.orderId || n.productId}"` : ''}>
                <div class="ni">${icon(n.type === 'price_drop' ? 'down' : 'order', 15)}</div>
                <div class="nn">
                  <div class="nt">${esc(n.title)}${n.read ? '' : '<i></i>'}</div>
                  <div class="nx">${esc(n.text)}</div>
                </div>
                <div class="nc">${timeAgo(n.ts)}</div>
              </div>`;
            })
            .join('')}</div>`
        : `<div class="empty"><b>暂时没有通知</b>收藏降价、订单状态变化都会出现在这里</div>`;

      return `
      <div class="wrap mid">
        <div class="page-head">
          <a class="back" data-act="nav.back">${icon('back', 13)} 返回</a>
          <h1>通知</h1>
          <span class="sp"></span>
          ${list.length ? `<a class="link" data-act="notices.readAll">全部标为已读</a>` : ''}
        </div>
        ${rows}
        <div style="height:64px"></div>
      </div>`;
    },
  };

  CFM.actions['notices.readAll'] = async () => {
    try {
      await S.readNotices();
      toast('已全部标为已读');
      CFM.router.refresh();
    } catch (e) {
      toast(e.message);
    }
  };

  /* ---------------- 收款码 ---------------- */
  CFM.pages.qrcode = {
    render() {
      const me = S.me();
      const img = me.qrImage || CFM.makeQR(me.id + me.nick, '#17181A');
      return `
      <div class="wrap small">
        <div class="page-head">
          <a class="back" data-act="nav.back">${icon('back', 13)} 返回</a>
          <h1>收款码</h1>
        </div>
        <div class="qr-card">
          <img src="${img}" alt="收款码">
          <div class="qn">${esc(me.nick)}</div>
          <div class="qh">${me.qrImage ? '自定义收款码' : '系统生成的演示收款码'}</div>
          <div class="qa">
            <button class="btn line sm" data-act="qr.upload">上传收款码</button>
            ${me.qrImage ? `<button class="btn sm" data-act="qr.reset">恢复默认</button>` : ''}
          </div>
        </div>
        <p class="small-t" style="text-align:center;margin-top:18px;line-height:1.9">
          买家扫码转账后上传支付截图，你确认收款后订单才进入「待交货」<br>建议用微信 / 支付宝收款码，截图发在聊天里
        </p>
      </div>`;
    },
  };
  CFM.actions['qr.upload'] = async () => {
    const r = await CFM.ui.pickImage(600);
    if (!r) return;
    try {
      const url = await S.upload(r.data);
      await S.updateMe({ qrImage: url });
      toast('收款码已更新');
      CFM.router.refresh();
    } catch (e) {
      toast(e.message);
    }
  };
  CFM.actions['qr.reset'] = () => {
    S.updateMe({ qrImage: null });
    toast('已恢复默认收款码');
    CFM.router.refresh();
  };

  /* ---------------- 他人主页 ---------------- */
  CFM.pages.profile = {
    render(params) {
      const u = S.user(params.id);
      if (!u) return `<div class="wrap"><div class="empty"><b>用户不存在</b></div></div>`;
      const st = S.sellerStats(u.id);
      const list = S.products({ sellerId: u.id, status: ['on_sale', 'reserved'] }).sort((a, b) => b.createdAt - a.createdAt);

      const grid = list.length
        ? `<div class="grid">${list
            .map(
              (p) => `<article class="pcard" data-act="my.open" data-id="${p.id}">
                <div class="ph"><img src="${p.images[0]}" alt=""></div>
                <div class="pb">
                  <div class="pt">${esc(p.title)}</div>
                  <div class="pp"><b>¥${money(p.price)}</b></div>
                </div>
              </article>`
            )
            .join('')}</div>`
        : `<div class="empty"><b>TA 暂时没有在售的闲置</b></div>`;

      return `
      <div class="wrap">
        <div class="phead">
          <img class="big" src="${u.avatar}" alt="">
          <div>
            <h1>${esc(u.nick)}${u.verified ? `<span class="verify">${icon('shield', 12)} 校园认证</span>` : ''}</h1>
            <div class="sub">${esc(u.school || '')}${u.major ? ' · ' + esc(u.major) : ''} · 加入 ${joinAge(u.createdAt)}</div>
          </div>
          <span class="sp"></span>
          <div class="stats">
            <span><b>${st.onSale}</b>在售</span>
            <span><b>${st.sold}</b>已售出</span>
          </div>
        </div>
        ${grid}
        <div style="height:48px"></div>
      </div>`;
    },
  };

  /* ---------------- 切换账号 / 退出 ---------------- */
  CFM.actions['menu.switch'] = () => {
    CFM.menu.close();
    const me = S.me();
    const users = S.users().filter((u) => u.id !== me.id);
    const body = `<div class="sheet-list">
      ${users
        .map(
          (u) => `<button data-act="menu.switchTo" data-id="${u.id}">
            ${avatar(u, 30)}
            <span style="flex:1">
              <span style="display:block;font-size:13.5px;color:var(--ink)">${esc(u.nick)}</span>
              <span style="display:block;font-size:11.5px;color:var(--ink3)">${esc(u.school || '')} · 在售 ${S.sellerStats(u.id).onSale} 件</span>
            </span>
          </button>`
        )
        .join('')}
    </div>`;
    sheet({ title: '切换演示账号', desc: '切换后可以体验卖家视角：接受报价、发收款码、确认收款。', body });
  };
  CFM.actions['menu.switchTo'] = async (el) => {
    const u = S.user(el.dataset.id);
    document.querySelectorAll('.sheet-wrap').forEach((x) => x.remove());
    try {
      await S.switchUser(el.dataset.id);
      toast('已切换为「' + (u ? u.nick : '') + '」');
      CFM.router.stack = [{ name: 'home', params: {} }];
      CFM.router.render();
    } catch (e) {
      toast(e.message);
    }
  };
  CFM.actions['menu.logout'] = async () => {
    CFM.menu.close();
    const ok = await confirmSheet({ title: '退出登录', text: '数据都在服务端，下次用同一账号登录即可。', okText: '退出', danger: true });
    if (!ok) return;
    await S.logout();
    CFM.router.stack = [{ name: 'auth', params: {} }];
    CFM.router.render();
  };
})();
