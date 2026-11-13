/* ===== app.js · 启动 ===== */
(function () {
  const CFM = window.CFM;
  const { esc, toast, sheet, confirmSheet } = CFM.ui;
  const S = CFM.store;

  function guideBody() {
    const step = (n, t, d) =>
      `<div class="guide-step"><span class="n">${n}</span><span><b style="color:var(--ink);font-weight:500">${t}</b><br>${d}</span></div>`;
    return `
      <div class="guide-h">完整交易闭环</div>
      ${step('1', '逛逛 / 搜索', '分类、关键词、价格排序，点开商品详情')}
      ${step('2', '聊一聊 · 报价', '聊天窗口右上角「报价」，可出价、还价')}
      ${step('3', '接受 → 生成订单', '卖家点「接受」，商品变「已预订」，订单为「待付款」')}
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
      <div style="font-size:12.5px;color:var(--ink2);line-height:1.9">点右上角头像 → 切换演示账号，换成「陈一鸣」，就能接收报价、发收款码、确认收款。</div>
      <div style="text-align:center;margin-top:16px">
        <button data-act="app.reset" style="font-size:12px;color:#B4B6BB;text-decoration:underline">重置全部演示数据</button>
      </div>`;
  }

  CFM.actions['app.guide'] = () => {
    sheet({
      title: '这是怎么运转的',
      desc: '一个可以完整跑通的校园二手交易原型。',
      body: guideBody(),
      actions: [{ key: 'ok', label: '开始逛逛', variant: 'primary' }],
    });
  };

  CFM.actions['app.reset'] = async () => {
    document.querySelectorAll('.sheet-wrap').forEach((x) => x.remove());
    const ok = await confirmSheet({ title: '重置演示数据', text: '会清空发布、收藏、聊天和订单记录，恢复到初始状态。', okText: '重置', danger: true });
    if (!ok) return;
    S.reset();
    CFM.router.stack = [{ name: S.isLogged() ? 'home' : 'auth', params: {} }];
    CFM.router.render();
    toast('已恢复到初始演示数据');
  };

  function boot() {
    S.load();
    S.tick();
    CFM.router.start();

    /* 调试入口：?p=detail&id=p_mouse */
    let qs = null;
    try {
      qs = new URLSearchParams(location.search);
    } catch (e) {
      qs = null;
    }
    if (qs && qs.get('p')) {
      const id = qs.get('id');
      CFM.router.stack = [{ name: 'home', params: {} }];
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

    /* 超时自动取消 */
    setInterval(() => {
      if (S.tick()) {
        const cur = CFM.router.current();
        if (['order', 'messages', 'mine'].indexOf(cur.name) >= 0) CFM.router.refresh();
      }
    }, 4000);

    /* 首次引导 */
    if (!S.db.meta.seenGuide && !skipGuide) {
      S.db.meta.seenGuide = true;
      S.save();
      setTimeout(() => {
        if (CFM.router.current().name === 'home') CFM.actions['app.guide']();
      }, 600);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
