/* ===== store.js · 数据层 & 业务规则 ===== */
(function () {
  const CFM = window.CFM;
  const KEY = 'cfm.db.v3';
  const ORDER_TTL = 15 * 60 * 1000; // 预订后 15 分钟未付款自动取消

  const ORDER_STEPS = ['待付款', '待确认收款', '待交货', '已完成'];
  const ORDER_STEP_INDEX = { pending_pay: 0, pending_confirm: 1, pending_delivery: 2, completed: 3 };
  const PRODUCT_STATE = { on_sale: '在售', reserved: '已预订', sold: '已售出', off: '已下架' };
  const CATEGORIES = ['全部', '数码电子', '图书教材', '宿舍好物', '服饰鞋包', '运动户外', '文体乐器', '其他'];
  const CONDITIONS = ['全新', '几乎全新', '九成新', '八成新', '七成新', '有使用痕迹'];
  const DELIVERIES = ['校内面交', '宿舍楼下', '自提', '快递邮寄'];

  let db = null;

  const uid = (p) => p + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 6);
  const pad = (n) => (n < 10 ? '0' + n : '' + n);

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) db = JSON.parse(raw);
    } catch (e) {
      db = null;
    }
    if (!db || !db.users || !db.users.length) {
      db = CFM.seed();
      persist();
    }
  }
  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
      return true;
    } catch (e) {
      CFM.ui.toast('本地存储空间已满，请删除部分图片后重试');
      return false;
    }
  }
  function save() {
    persist();
  }
  function reset() {
    db = CFM.seed();
    persist();
  }

  /* ---------------- user ---------------- */
  function me() {
    return db.users.find((u) => u.id === db.session.userId) || null;
  }
  function user(id) {
    return db.users.find((u) => u.id === id) || null;
  }
  function isLogged() {
    return !!me();
  }
  function login(phone, pwd) {
    const u = db.users.find((x) => x.phone === phone.trim());
    if (!u) return { ok: false, msg: '该手机号还没有注册' };
    if (u.pwd !== pwd) return { ok: false, msg: '密码不正确' };
    db.session.userId = u.id;
    save();
    return { ok: true, user: u };
  }
  function register(data) {
    if (db.users.some((u) => u.phone === data.phone)) return { ok: false, msg: '手机号已注册，直接登录吧' };
    const palette = [
      ['🌱', '#DFF3E4', '#B9E3C6'],
      ['🍊', '#FFE9DA', '#FFCDB0'],
      ['🫐', '#E2E8FA', '#C2CEF0'],
      ['🌸', '#FBE6EC', '#F2CAD8'],
      ['🐣', '#FFF3D6', '#FFE1A8'],
    ];
    const p = palette[db.users.length % palette.length];
    const u = {
      id: uid('u_'),
      nick: data.nick,
      phone: data.phone,
      pwd: data.pwd,
      school: data.school || '湖南大学',
      campus: data.campus || '南校区',
      major: data.major || '',
      studentNo: data.studentNo || '',
      verified: !!data.studentNo,
      avatar: CFM.avatarPic(p[0], p[1], p[2]),
      qrImage: null,
      bio: '',
      createdAt: Date.now(),
    };
    db.users.push(u);
    db.session.userId = u.id;
    save();
    return { ok: true, user: u };
  }
  function logout() {
    db.session.userId = null;
    save();
  }
  function switchUser(id) {
    if (!user(id)) return;
    db.session.userId = id;
    save();
  }
  function updateMe(patch) {
    const u = me();
    if (!u) return;
    Object.assign(u, patch);
    save();
  }

  /* ---------------- product ---------------- */
  function products(opts) {
    const o = opts || {};
    let list = db.products.slice();
    if (o.sellerId) list = list.filter((p) => p.sellerId === o.sellerId);
    if (o.status) {
      const st = Array.isArray(o.status) ? o.status : [o.status];
      list = list.filter((p) => st.indexOf(p.status) >= 0);
    }
    if (o.category && o.category !== '全部') list = list.filter((p) => p.category === o.category);
    if (o.q) {
      const q = o.q.trim().toLowerCase();
      if (q) {
        list = list.filter((p) => {
          const s = (p.title + ' ' + p.desc + ' ' + p.category + ' ' + (p.condition || '')).toLowerCase();
          return s.indexOf(q) >= 0;
        });
      }
    }
    const sort = o.sort || '综合';
    if (sort === '价格↑') list.sort((a, b) => a.price - b.price);
    else if (sort === '价格↓') list.sort((a, b) => b.price - a.price);
    else if (sort === '最新') list.sort((a, b) => b.createdAt - a.createdAt);
    else list.sort((a, b) => (b.views || 0) * 0.4 + (b.createdAt / 1e10) - ((a.views || 0) * 0.4 + a.createdAt / 1e10));
    return list;
  }
  function product(id) {
    return db.products.find((p) => p.id === id) || null;
  }
  function createProduct(data) {
    const u = me();
    if (!u) return null;
    const p = {
      id: uid('p_'),
      sellerId: u.id,
      title: data.title,
      price: Number(data.price),
      origPrice: data.origPrice || null,
      category: data.category,
      condition: data.condition,
      desc: data.desc,
      images: data.images && data.images.length ? data.images : [CFM.pic('🛍️', '#F0EEE8', '#DCD7CA')],
      ratio: data.ratio || 1,
      delivery: data.delivery && data.delivery.length ? data.delivery : ['校内面交'],
      status: 'on_sale',
      views: 0,
      createdAt: Date.now(),
    };
    db.products.unshift(p);
    save();
    return p;
  }
  function updateProduct(id, patch) {
    const p = product(id);
    if (!p) return null;
    const oldPrice = p.price;
    Object.assign(p, patch);
    // 降价提醒：收藏过的其他用户收到通知
    if (patch.price != null && Number(patch.price) < Number(oldPrice)) {
      db.favorites
        .filter((f) => f.productId === id && f.userId !== p.sellerId)
        .forEach((f) => {
          addNotice(f.userId, {
            type: 'price_drop',
            title: '收藏的商品降价了',
            text: `「${p.title}」从 ¥${oldPrice} 降到 ¥${p.price}`,
            productId: p.id,
          });
        });
    }
    save();
    return p;
  }
  function setProductStatus(id, status) {
    const p = product(id);
    if (!p) return;
    p.status = status;
    if (status === 'sold') p.soldAt = Date.now();
    save();
  }
  function bumpView(id) {
    const p = product(id);
    if (!p) return;
    p.views = (p.views || 0) + 1;
    save();
  }
  function sellerStats(sellerId) {
    const all = db.products.filter((p) => p.sellerId === sellerId);
    return {
      onSale: all.filter((p) => p.status === 'on_sale' || p.status === 'reserved').length,
      sold: all.filter((p) => p.status === 'sold').length,
      total: all.length,
    };
  }

  /* ---------------- favorite ---------------- */
  function isFav(productId, userId) {
    const uid2 = userId || (me() && me().id);
    return db.favorites.some((f) => f.productId === productId && f.userId === uid2);
  }
  function toggleFav(productId) {
    const u = me();
    if (!u) return false;
    const i = db.favorites.findIndex((f) => f.productId === productId && f.userId === u.id);
    const p = product(productId);
    if (i >= 0) {
      db.favorites.splice(i, 1);
      save();
      return false;
    }
    db.favorites.unshift({ userId: u.id, productId, priceAtFav: p ? p.price : 0, ts: Date.now() });
    save();
    return true;
  }
  function favList() {
    const u = me();
    if (!u) return [];
    return db.favorites
      .filter((f) => f.userId === u.id)
      .map((f) => ({ fav: f, product: product(f.productId) }))
      .filter((x) => x.product);
  }
  function favCount(productId) {
    return db.favorites.filter((f) => f.productId === productId).length;
  }

  /* ---------------- chat ---------------- */
  function chatsOf(userId) {
    const id = userId || (me() && me().id);
    return db.chats
      .filter((c) => c.buyerId === id || c.sellerId === id)
      .sort((a, b) => (b.lastTs || 0) - (a.lastTs || 0));
  }
  function chat(id) {
    return db.chats.find((c) => c.id === id) || null;
  }
  function ensureChat(productId, buyerId) {
    const p = product(productId);
    if (!p) return null;
    const bid = buyerId || (me() && me().id);
    if (bid === p.sellerId) return null;
    let c = db.chats.find((x) => x.productId === productId && x.buyerId === bid);
    if (!c) {
      c = {
        id: uid('c_'),
        productId,
        buyerId: bid,
        sellerId: p.sellerId,
        createdAt: Date.now(),
        lastTs: Date.now(),
        unread: {},
        messages: [],
      };
      db.chats.unshift(c);
      save();
    }
    return c;
  }
  function otherOf(c) {
    const my = me();
    if (!my) return user(c.sellerId);
    return user(c.buyerId === my.id ? c.sellerId : c.buyerId);
  }
  function pushMsg(chatId, msg) {
    const c = chat(chatId);
    if (!c) return null;
    const m = Object.assign({ id: uid('m_'), ts: Date.now() }, msg);
    c.messages.push(m);
    c.lastTs = m.ts;
    c.unread = c.unread || {};
    const to = m.from === c.buyerId ? c.sellerId : c.buyerId;
    if (msg.type === 'system') {
      // 系统消息不计未读
    } else {
      c.unread[to] = (c.unread[to] || 0) + 1;
    }
    save();
    return m;
  }
  function sendText(chatId, text) {
    const u = me();
    if (!u || !text.trim()) return null;
    return pushMsg(chatId, { from: u.id, type: 'text', text: text.trim() });
  }
  function sendImage(chatId, dataUrl) {
    const u = me();
    if (!u) return null;
    return pushMsg(chatId, { from: u.id, type: 'image', image: dataUrl });
  }
  function markRead(chatId) {
    const c = chat(chatId);
    const u = me();
    if (!c || !u) return;
    c.unread = c.unread || {};
    if (c.unread[u.id]) {
      c.unread[u.id] = 0;
      save();
    }
  }
  function unreadTotal() {
    const u = me();
    if (!u) return 0;
    let n = 0;
    db.chats.forEach((c) => {
      if (c.buyerId === u.id || c.sellerId === u.id) n += (c.unread && c.unread[u.id]) || 0;
    });
    return n;
  }
  function lastText(c) {
    const last = c.messages[c.messages.length - 1];
    if (!last) return '还没有消息';
    if (last.type === 'text') return last.text;
    if (last.type === 'image') return '[图片]';
    if (last.type === 'quote') return `[报价] ¥${last.price}`;
    if (last.type === 'delivery') return '[交货信息] ' + (last.delivery || '');
    if (last.type === 'qr') return '[收款码] 请扫码转账';
    if (last.type === 'proof') return '[支付凭证] 已上传';
    if (last.type === 'order') return '[订单] 订单已生成';
    if (last.type === 'system') return last.text;
    return '';
  }

  /* ---------------- quote ---------------- */
  function sendQuote(chatId, price, note) {
    const u = me();
    const c = chat(chatId);
    if (!u || !c) return null;
    const p = product(c.productId);
    if (!p) return null;
    if (activeOrderOfChat(chatId)) {
      CFM.ui.toast('已有进行中的订单，先去订单页处理吧');
      return null;
    }
    if (p.status !== 'on_sale') {
      CFM.ui.toast('商品当前不可交易');
      return null;
    }
    return pushMsg(chatId, { from: u.id, type: 'quote', price: Number(price), note: note || '', status: 'pending' });
  }
  function respondQuote(chatId, msgId, accept) {
    const u = me();
    const c = chat(chatId);
    if (!u || !c) return null;
    const m = c.messages.find((x) => x.id === msgId);
    if (!m || m.type !== 'quote' || m.status !== 'pending') return null;
    if (m.from === u.id) return null;
    const p = product(c.productId);
    if (!p) return null;

    if (!accept) {
      m.status = 'rejected';
      pushMsg(chatId, { type: 'system', text: '报价已拒绝，可以继续聊聊' });
      return null;
    }
    if (p.status !== 'on_sale') {
      CFM.ui.toast('商品已被预订或售出');
      return null;
    }
    m.status = 'accepted';
    const order = createOrder(c, m.price);
    pushMsg(chatId, { type: 'system', text: `卖家接受报价 ¥${m.price}，订单已生成（待付款）` });
    pushMsg(chatId, { type: 'order', orderId: order.id });
    return order;
  }
  function createOrder(c, amount) {
    const p = product(c.productId);
    const seq = ++db.meta.orderSeq;
    const d = new Date();
    const no = 'FM' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + pad(seq).slice(-4);
    const order = {
      id: uid('o_'),
      no,
      productId: c.productId,
      chatId: c.id,
      buyerId: c.buyerId,
      sellerId: c.sellerId,
      amount: Number(amount),
      delivery: '',
      location: '',
      time: '',
      status: 'pending_pay',
      createdAt: Date.now(),
      expiresAt: Date.now() + ORDER_TTL,
      buyerConfirmed: false,
      sellerConfirmed: false,
      proof: null,
      timeline: [{ t: Date.now(), text: '买家出价，卖家接受，订单生成' }],
    };
    db.orders.unshift(order);
    p.status = 'reserved';
    save();
    return order;
  }

  /* ---------------- delivery / qr ---------------- */
  function sendDelivery(chatId, info) {
    const u = me();
    const c = chat(chatId);
    if (!u || !c) return null;
    const m = pushMsg(chatId, {
      from: u.id,
      type: 'delivery',
      delivery: info.delivery,
      location: info.location,
      time: info.time,
    });
    const o = activeOrderOfChat(chatId);
    if (o) {
      o.delivery = info.delivery;
      o.location = info.location;
      o.time = info.time;
      o.timeline.push({ t: Date.now(), text: `双方确认交货信息：${info.delivery} · ${info.location}` });
      save();
    }
    return m;
  }
  function sendQR(chatId) {
    const u = me();
    const c = chat(chatId);
    if (!u || !c) return null;
    const o = activeOrderOfChat(chatId);
    const amount = o ? o.amount : product(c.productId).price;
    return pushMsg(chatId, {
      from: u.id,
      type: 'qr',
      image: u.qrImage || CFM.makeQR(u.id + u.nick, '#1F2937'),
      amount,
      orderId: o ? o.id : null,
    });
  }

  /* ---------------- order ---------------- */
  function order(id) {
    return db.orders.find((o) => o.id === id) || null;
  }
  function ordersOf(userId, role) {
    const id = userId || (me() && me().id);
    let list = db.orders.filter((o) => (role === 'buy' ? o.buyerId === id : role === 'sell' ? o.sellerId === id : o.buyerId === id || o.sellerId === id));
    return list.sort((a, b) => b.createdAt - a.createdAt);
  }
  function orderOfProduct(productId, statusArr) {
    const st = statusArr || ['pending_pay', 'pending_confirm', 'pending_delivery'];
    return db.orders.find((o) => o.productId === productId && st.indexOf(o.status) >= 0) || null;
  }
  function activeOrderOfChat(chatId) {
    return db.orders.find((o) => o.chatId === chatId && ['pending_pay', 'pending_confirm', 'pending_delivery'].indexOf(o.status) >= 0) || null;
  }
  function activeOrderOfProduct(productId) {
    return orderOfProduct(productId);
  }
  function roleIn(o) {
    const u = me();
    if (!u) return null;
    if (o.buyerId === u.id) return 'buyer';
    if (o.sellerId === u.id) return 'seller';
    return null;
  }
  function uploadProof(orderId, dataUrl) {
    const o = order(orderId);
    const u = me();
    if (!o || !u || o.buyerId !== u.id) return false;
    if (o.status !== 'pending_pay' && o.status !== 'pending_confirm') return false;
    o.proof = dataUrl;
    o.status = 'pending_confirm';
    o.timeline.push({ t: Date.now(), text: '买家已上传支付凭证' });
    if (o.chatId) {
      pushMsg(o.chatId, { type: 'proof', from: u.id, image: dataUrl, orderId: o.id });
      pushMsg(o.chatId, { type: 'system', text: '买家已上传支付凭证，等待卖家确认收款' });
    }
    addNotice(o.sellerId, { type: 'order', title: '买家已上传支付凭证', text: `订单 ${o.no} 等待你确认收款`, orderId: o.id, productId: o.productId });
    save();
    return true;
  }
  function confirmPayment(orderId) {
    const o = order(orderId);
    const u = me();
    if (!o || !u || o.sellerId !== u.id || o.status !== 'pending_confirm') return false;
    o.status = 'pending_delivery';
    o.timeline.push({ t: Date.now(), text: '卖家已确认收款，等待线下交货' });
    if (o.chatId) {
      pushMsg(o.chatId, { type: 'system', text: '卖家已确认收款，请按约定时间地点交货' });
    }
    addNotice(o.buyerId, { type: 'order', title: '卖家已确认收款', text: `订单 ${o.no} 已确认收款，等待线下交货`, orderId: o.id, productId: o.productId });
    save();
    return true;
  }
  function confirmReceipt(orderId) {
    const o = order(orderId);
    const u = me();
    if (!o || !u) return false;
    const role = roleIn(o);
    if (!role || o.status !== 'pending_delivery') return false;
    if (role === 'buyer') o.buyerConfirmed = true;
    else o.sellerConfirmed = true;
    o.timeline.push({ t: Date.now(), text: role === 'buyer' ? '买家已确认收货' : '卖家已确认交付' });
    if (o.buyerConfirmed && o.sellerConfirmed) {
      o.status = 'completed';
      o.timeline.push({ t: Date.now(), text: '双方确认完成，交易结束' });
      const p = product(o.productId);
      if (p) {
        p.status = 'sold';
        p.soldAt = Date.now();
      }
      if (o.chatId) pushMsg(o.chatId, { type: 'system', text: '交易完成，商品已售出 🎉' });
      addNotice(o.buyerId, { type: 'order', title: '交易完成', text: `订单 ${o.no} 已完成，感谢使用`, orderId: o.id, productId: o.productId });
      addNotice(o.sellerId, { type: 'order', title: '交易完成', text: `订单 ${o.no} 已完成，商品已售出`, orderId: o.id, productId: o.productId });
    } else {
      if (o.chatId) pushMsg(o.chatId, { type: 'system', text: role === 'buyer' ? '买家已确认收货，等待卖家确认交付' : '卖家已确认交付，等待买家确认收货' });
    }
    save();
    return true;
  }
  function cancelOrder(orderId, reason) {
    const o = order(orderId);
    if (!o) return false;
    if (['completed', 'cancelled'].indexOf(o.status) >= 0) return false;
    o.status = 'cancelled';
    o.cancelReason = reason || '双方协商取消';
    o.cancelledAt = Date.now();
    o.timeline.push({ t: Date.now(), text: '订单取消：' + (reason || '双方协商取消') });
    const p = product(o.productId);
    if (p && p.status === 'reserved') {
      p.status = 'on_sale';
    }
    if (o.chatId) pushMsg(o.chatId, { type: 'system', text: '订单已取消，商品重新回到在售' });
    save();
    return true;
  }
  function tick() {
    let changed = false;
    db.orders.forEach((o) => {
      if (o.status === 'pending_pay' && o.expiresAt && Date.now() > o.expiresAt) {
        o.status = 'cancelled';
        o.cancelReason = '预订超时未付款，已自动取消';
        o.cancelledAt = Date.now();
        o.timeline.push({ t: Date.now(), text: '预订超时未付款，订单自动取消' });
        const p = product(o.productId);
        if (p && p.status === 'reserved') p.status = 'on_sale';
        if (o.chatId) pushMsg(o.chatId, { type: 'system', text: '预订超时未付款，订单已自动取消，商品回到在售' });
        addNotice(o.buyerId, { type: 'order', title: '订单已自动取消', text: `订单 ${o.no} 超时未付款`, orderId: o.id, productId: o.productId });
        changed = true;
      }
    });
    if (changed) save();
    return changed;
  }

  /* ---------------- notices ---------------- */
  function addNotice(userId, data) {
    if (!userId) return;
    db.notices.unshift(Object.assign({ id: uid('n_'), userId, ts: Date.now(), read: false }, data));
    if (db.notices.length > 60) db.notices.length = 60;
    persist();
  }
  function notices() {
    const u = me();
    if (!u) return [];
    return db.notices.filter((n) => n.userId === u.id);
  }
  function unreadNotices() {
    return notices().filter((n) => !n.read).length;
  }
  function readNotices() {
    notices().forEach((n) => (n.read = true));
    save();
  }

  /* ---------------- export ---------------- */
  CFM.store = {
    ORDER_STEPS,
    ORDER_STEP_INDEX,
    PRODUCT_STATE,
    CATEGORIES,
    CONDITIONS,
    DELIVERIES,
    ORDER_TTL,
    get db() {
      return db;
    },
    load,
    save,
    reset,
    me,
    user,
    isLogged,
    login,
    register,
    logout,
    switchUser,
    updateMe,
    products,
    product,
    createProduct,
    updateProduct,
    setProductStatus,
    bumpView,
    sellerStats,
    isFav,
    toggleFav,
    favList,
    favCount,
    chatsOf,
    chat,
    ensureChat,
    otherOf,
    pushMsg,
    sendText,
    sendImage,
    markRead,
    unreadTotal,
    lastText,
    sendQuote,
    respondQuote,
    sendDelivery,
    sendQR,
    order,
    ordersOf,
    orderOfProduct,
    activeOrderOfChat,
    activeOrderOfProduct,
    roleIn,
    uploadProof,
    confirmPayment,
    confirmReceipt,
    cancelOrder,
    tick,
    addNotice,
    notices,
    unreadNotices,
    readNotices,
  };
})();
