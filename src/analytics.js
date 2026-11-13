/**
 * analytics.js · 埋点采集与漏斗计算
 *
 * 设计要点：
 * 1. 事件注册表（REGISTRY）即「埋点文档」，未注册的事件会被直接丢弃，从源头杜绝乱埋
 * 2. 属性按白名单过滤，避免把聊天内容、手机号等敏感字段带进埋点
 * 3. 采集点集中在 store 层（业务唯一写入口），页面只负责 page_view
 * 4. 数据落在本地，`CFM.analytics.report()` 可在控制台直接看漏斗
 */
(function () {
  const CFM = (window.CFM = window.CFM || {});
  const KEY = 'cfm.events.v1';
  const MAX = 500; // 本地只留最近 500 条，避免占用 localStorage 配额
  const SESSION = 's_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  /** 事件注册表：事件名 → 允许的属性 + 业务含义 */
  const REGISTRY = {
    page_view: { props: ['page'], desc: '页面浏览（漏斗外层）' },
    product_view: { props: ['product_id', 'category', 'price', 'status'], desc: '商品详情曝光' },
    search: { props: ['keyword_len', 'category', 'result_count'], desc: '搜索行为（不采集关键词原文）' },
    favorite_toggle: { props: ['product_id', 'on'], desc: '收藏开关' },
    chat_open: { props: ['chat_id', 'product_id'], desc: '进入会话（首次发起）' },
    quote_sent: { props: ['chat_id', 'product_id', 'price', 'from_price'], desc: '买家/卖家出价' },
    quote_responded: { props: ['chat_id', 'accept'], desc: '卖家接受/拒绝报价' },
    order_created: { props: ['order_id', 'product_id', 'amount'], desc: '订单生成' },
    proof_uploaded: { props: ['order_id', 'amount', 'duration_ms'], desc: '买家上传支付凭证' },
    payment_confirmed: { props: ['order_id', 'amount', 'duration_ms'], desc: '卖家确认收款' },
    receipt_confirmed: { props: ['order_id', 'role'], desc: '单方确认收货/交付' },
    order_completed: { props: ['order_id', 'amount', 'duration_ms'], desc: '双方确认，交易完成' },
    order_cancelled: { props: ['order_id', 'stage', 'reason_len'], desc: '主动取消' },
    order_expired: { props: ['order_id', 'stage'], desc: '超时未付款自动取消' },
    product_published: { props: ['product_id', 'category', 'price', 'images'], desc: '发布商品' },
  };

  let queue = [];
  try {
    queue = JSON.parse(localStorage.getItem(KEY) || '[]') || [];
  } catch (e) {
    queue = [];
  }

  function flush() {
    try {
      localStorage.setItem(KEY, JSON.stringify(queue));
    } catch (e) {
      /* 配额满时静默失败，不影响业务 */
    }
  }

  function track(name, props) {
    const def = REGISTRY[name];
    if (!def) {
      console.warn('[track] 未在注册表中的事件，已丢弃:', name);
      return null;
    }
    const payload = {};
    def.props.forEach((k) => {
      if (props && props[k] !== undefined) payload[k] = props[k];
    });

    const me = CFM.store && CFM.store.me ? CFM.store.me() : null;
    const ev = { e: name, t: Date.now(), s: SESSION, u: me ? me.id : null, p: payload };

    queue.push(ev);
    if (queue.length > MAX) queue = queue.slice(-MAX);
    flush();

    if (window.__CFM_DEBUG__) console.debug('[track]', name, payload);
    return ev;
  }

  function count(name) {
    return queue.filter((e) => e.e === name).length;
  }

  /** 交易主漏斗：曝光 → 会话 → 报价 → 订单 → 凭证 → 收款 → 完成 */
  function funnel() {
    const steps = [
      ['product_view', '商品详情曝光'],
      ['chat_open', '发起会话'],
      ['quote_sent', '发送报价'],
      ['order_created', '生成订单'],
      ['proof_uploaded', '上传凭证'],
      ['payment_confirmed', '确认收款'],
      ['order_completed', '交易完成'],
    ];
    const base = count('product_view');
    let prev = null;
    return steps.map(([key, label]) => {
      const n = count(key);
      const row = {
        环节: label,
        事件: key,
        次数: n,
        占曝光: base ? ((n / base) * 100).toFixed(1) + '%' : '—',
        环节转化: prev === null ? '—' : prev ? ((n / prev) * 100).toFixed(1) + '%' : '—',
      };
      prev = n;
      return row;
    });
  }

  CFM.analytics = {
    REGISTRY,
    track,
    count,
    funnel,
    /** 控制台里直接看漏斗，PM/面试演示用 */
    report() {
      const rows = funnel();
      if (console.table) console.table(rows);
      else console.log(rows);
      return rows;
    },
    all() {
      return queue.slice();
    },
    reset() {
      queue = [];
      flush();
    },
    session: SESSION,
  };
})();
