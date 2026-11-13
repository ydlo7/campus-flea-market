/* ===== app.js · 启动、轮询同步、首次引导 ===== */
(function () {
  const CFM = window.CFM;
  const { icon, esc, toast, sheet, confirmSheet } = CFM.ui;
  const S = CFM.store;

  function guideBody() {
    const step = (n, t, d) =>
      `<div class="guide-step"><span class="n">${n}</span><span><b style="color:var(--ink);font-weight:500">${t}</b><br>${d}</span></div>`;
    return `
      <div class="guide-h">完整交易闭环</div>
      ${step('1', '逛逛 / 搜索', '分类、关键词、价格排序，点开商品详情')}
      ${step('2', '两种成交方式', '「立即购买」按标价下单，或者「聊一聊」报价砍价')}
      ${step('3', '生成订单', '报价被接受 / 立即购买后，商品变「已预订」，订单为「待付款」')}
      ${step('4', '收款码 · 凭证', '卖家发「收款码」，买家扫码转账后上传截图')}
      ${step('5', '确认收款 → 待交货', '卖家在聊天或订单页点「确认收款」')}
      ${step('6', '交货 · 双方确认', '线下交货，双方各自「确认收货 / 确认交付」')}
      <div class="guide-h">规则</div>
      <div style="font-size:12.5px;color:var(--ink2);line-height:1.9">
        · 商品：在售 → 已预订 → 已售出，任意阶段可下架<br>
        · 订单：待付款 → 待确认收款 → 待交货 → 已完成，任一阶段可取消<br>
        · 预订后 15 分钟未付款，订单自动取消，商品回到在售<br>
        · 收藏的商品被降价，「通知」里会提醒
      </div>
      <div class="guide-h">想体验卖家视角</div>
      <div style="font-size:12.5px;color:var(--ink2);line-height:1.9">点右上角头像 → 切换演示账号，换成「陈一鸣」，就能接收报价、发收款码、确认收款。</div>`;
  }

  CFM.actions['app.guide'] = () => {
    sheet({
      title: '这是怎么运转的',
      desc: '数据存在服务端 SQLite，换浏览器登录同一个账号能看到同一份数据。',
      body: guideBody(),
      actions: [{ key: 'ok', label: '开始逛逛', variant: 'primary' }],
    });
  };

  CFM.actions['app.reset'] = async () => {
    document.querySelectorAll('.sheet-wrap').forEach((x) => x.remove());
    const ok = await confirmSheet({
      title: '重置演示数据',
      text: '会清空所有发布、收藏、聊天和订单，恢复到初始状态（所有演示账号密码都是 123456）。',
      okText: '重置',
      danger: true,
    });
    if (!ok) return;
    try {
      await S.resetDemo();
    } catch (e) {
      return toast(e.message);
    }
    await S.logout();
    CFM.router.stack = [{ name: 'auth', params: {} }];
    CFM.router.render();
    toast('已恢复初始数据，请重新登录');
  };

  function showBootError(err) {
    const view = document.getElementById('view');
    view.innerHTML = `
      <div class="wrap mid">
        <div class="empty" style="padding-top:120px">
          <b>连不上后端服务</b>
          <div style="line-height:2">
            ${esc(err.message || '未知错误')}<br>
            请在项目目录执行 <code style="background:#F5F4F0;padding:2px 6px;border-radius:4px">npm start</code>，<br>
            然后访问 <code style="background:#F5F4F0;padding:2px 6px;border-radius:4px">http://localhost:3000</code>
          </div>
        </div>
      </div>`;
    document.body.classList.add('logged-out');
  }

  async function boot() {
    try {
      await S.init();
    } catch (e) {
      showBootError(e);
      return;
    }

    /* 调试/演示入口：?as=u_me 直接以某个演示账号登录 */
    let qs = null;
    try {
      qs = new URLSearchParams(location.search);
    } catch (e) {
      qs = null;
    }
    if (!S.isLogged() && qs && qs.get('as')) {
      try {
        await S.switchUser(qs.get('as'));
      } catch (e) {
        /* 忽略，落到登录页 */
      }
    }

    CFM.router.start();

    /* 调试入口：?p=detail&id=p_mouse */
    if (qs && qs.get('p') && S.isLogged()) {
      const id = qs.get('id');
      CFM.router.go(qs.get('p'), id ? { id } : {});
    }
    const skipGuide = !!(qs && qs.get('guide') === '0');

    /* 顶栏搜索 */
    const q = document.getElementById('hq');
    if (q) {
      const run = CFM.ui.debounce(() => {
        if (CFM.pages.home) CFM.pages.home.setQuery(q.value.trim());
      }, 200);
      q.addEventListener('input', run);
      q.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (CFM.pages.home) CFM.pages.home.setQuery(q.value.trim());
        }
      });
    }

    /* 倒计时 */
    setInterval(() => {
      document.querySelectorAll('[data-countdown]').forEach((el) => {
        const left = Number(el.dataset.countdown) - Date.now();
        el.textContent = left > 0 ? '剩余 ' + CFM.ui.mmss(left) : '正在取消…';
      });
    }, 1000);

    /* 轮询：服务端版本变了就重新拉快照（多浏览器/多标签同步） */
    setInterval(async () => {
      if (!S.isLogged()) return;
      const el = document.activeElement;
      if (el && /INPUT|TEXTAREA|SELECT/.test(el.tagName)) return;
      try {
        const v = await S.checkVersion();
        if (v > S.version()) {
          await S.sync();
          const cur = CFM.router.current();
          if (['home', 'mine', 'messages', 'order', 'favorites', 'notices', 'profile'].indexOf(cur.name) >= 0) {
            CFM.router.refresh();
          }
        }
      } catch (e) {
        /* 网络抖动忽略 */
      }
    }, 4000);

    /* 首次引导 */
    if (!S.isLogged()) return;
    let seen = false;
    try {
      seen = localStorage.getItem('cfm.seenGuide') === '1';
    } catch (e) {}
    if (!seen && !skipGuide) {
      try {
        localStorage.setItem('cfm.seenGuide', '1');
      } catch (e) {}
      setTimeout(() => {
        if (CFM.router.current().name === 'home') CFM.actions['app.guide']();
      }, 600);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
