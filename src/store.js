/**
 * 客户端 store：服务端快照的本地缓存 + API 调用
 *
 * 读：全部同步，直接读内存快照，页面渲染不用等网络
 * 写：一律走 /api，成功后用服务端返回的最新快照整体替换缓存
 */
(function () {
  const CFM = window.CFM;
  const api = CFM.api;

  const ORDER_TTL = 15 * 60 * 1000;
  const PRODUCT_STATE = { on_sale: '在售', reserved: '已预订', sold: '已售出', off: '已下架' };
  const ORDER_STEPS = ['待付款', '待确认收款', '待交货', '已完成'];
  const ORDER_STEP_INDEX = { pending_pay: 0, pending_confirm: 1, pending_delivery: 2, completed: 3 };
  const CATEGORIES = ['全部', '数码电子', '图书教材', '宿舍好物', '服饰鞋包', '运动户外', '文体乐器', '其他'];
  const CONDITIONS = ['全新', '几乎全新', '九成新', '八成新', '七成新', '有使用痕迹'];
  const DELIVERIES = ['校内面交', '宿舍楼下', '自提', '快递邮寄'];

  let st = { me: null, users: [], products: [], chats: [], orders: [], favorites: [], notices: [], version: 0 };
  const idx = { users: new Map(), products: new Map(), chats: new Map(), orders: new Map() };

  function rebuild() {
    Object.keys(idx).forEach((k) => idx[k].clear());
    (st.users || []).forEach((u) => idx.users.set(u.id, u));
    (st.products || []).forEach((p) => idx.products.set(p.id, p));
    (st.chats || []).forEach((c) => idx.chats.set(c.id, c));
    (st.orders || []).forEach((o) => idx.orders.set(o.id, o));
  }

  function apply(snap) {
    if (!snap) return;
    st = snap;
    rebuild();
  }

  /* ---------------- 读 ---------------- */
  const me = () => st.me;
  const isLogged = () => !!st.me;
  const user = (id) => idx.users.get(id) || null;
  const product = (id) => idx.products.get(id) || null;
  const chat = (id) => idx.chats.get(id) || null;
  const order = (id) => idx.orders.get(id) || null;

  function products(opts) {
    const o = opts || {};
    let list = (st.products || []).slice();
    if (o.sellerId) list = list.filter((p) => p.sellerId === o.sellerId);
    if (o.status) {
      const set = Array.isArray(o.status) ? o.status : [o.status];
      list = list.filter((p) => set.indexOf(p.status) >= 0);
    }
    if (o.category && o.category !== '全部') list = list.filter((p) => p.category === o.category);
    if (o.q) {
      const q = String(o.q).trim().toLowerCase();
      if (q) {
        list = list.filter((p) => ((p.title || '') + ' ' + (p.desc || '') + ' ' + (p.category || '') + ' ' + (p.condition || '')).toLowerCase().indexOf(q) >= 0);
      }
    }
    const sort = o.sort || '综合';
    if (sort === '价格↑') list.sort((a, b) => a.price - b.price);
    else if (sort === '价格↓') list.sort((a, b) => b.price - a.price);
    else if (sort === '最新') list.sort((a, b) => b.createdAt - a.createdAt);
    else list.sort((a, b) => b.views * 0.4 + b.createdAt / 1e10 - (a.views * 0.4 + a.createdAt / 1e10));
    return list;
  }

  function sellerStats(sellerId) {
    const all = (st.products || []).filter((p) => p.sellerId === sellerId);
    return {
      onSale: all.filter((p) => p.status === 'on_sale' || p.status === 'reserved').length,
      sold: all.filter((p) => p.status === 'sold').length,
      total: all.length,
    };
  }

  function chatsOf() {
    const id = me() && me().id;
    if (!id) return [];
    return (st.chats || []).filter((c) => c.buyerId === id || c.sellerId === id).sort((a, b) => (b.lastTs || 0) - (a.lastTs || 0));
  }

  function otherOf(c) {
    const my = me();
    if (!c) return null;
    if (!my) return user(c.sellerId);
    return user(c.buyerId === my.id ? c.sellerId : c.buyerId);
  }

  function lastText(c) {
    const list = c.messages || [];
    const m = list[list.length - 1];
    if (!m) return '还没有消息';
    if (m.type === 'text') return m.text;
    if (m.type === 'image') return '[图片]';
    if (m.type === 'quote') return `[报价] ¥${m.price}`;
    if (m.type === 'delivery') return '[交货信息] ' + (m.delivery || '');
    if (m.type === 'qr') return '[收款码] 请扫码转账';
    if (m.type === 'proof') return '[支付凭证] 已上传';
    if (m.type === 'order') return '[订单] 订单已生成';
    if (m.type === 'system') return m.text;
    return '';
  }

  function ordersOf(userId, role) {
    const id = userId || (me() && me().id);
    if (!id) return [];
    return (st.orders || [])
      .filter((o) => (role === 'buy' ? o.buyerId === id : role === 'sell' ? o.sellerId === id : o.buyerId === id || o.sellerId === id))
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  function activeOrderOfChat(chatId) {
    return (st.orders || []).find(
      (o) => o.chatId === chatId && ['pending_pay', 'pending_confirm', 'pending_delivery'].indexOf(o.status) >= 0
    ) || null;
  }

  function activeOrderOfProduct(productId) {
    return (st.orders || []).find(
      (o) => o.productId === productId && ['pending_pay', 'pending_confirm', 'pending_delivery'].indexOf(o.status) >= 0
    ) || null;
  }

  function roleIn(o) {
    const my = me();
    if (!my || !o) return null;
    if (o.buyerId === my.id) return 'buyer';
    if (o.sellerId === my.id) return 'seller';
    return null;
  }

  function isFav(productId) {
    const my = me();
    return !!(my && (st.favorites || []).some((f) => f.productId === productId && f.userId === my.id));
  }
  function favList() {
    const my = me();
    if (!my) return [];
    return (st.favorites || [])
      .filter((f) => f.userId === my.id)
      .map((f) => ({ fav: f, product: product(f.productId) }))
      .filter((x) => x.product);
  }
  function favCount(productId) {
    const p = product(productId);
    return p ? p.favCount || 0 : 0;
  }

  function notices() {
    return st.notices || [];
  }
  function unreadNotices() {
    return notices().filter((n) => !n.read).length;
  }
  function unreadTotal() {
    return chatsOf().reduce((n, c) => n + (c.unread || 0), 0);
  }

  /* ---------------- 写（统一走 API） ---------------- */
  async function call(method, path, body) {
    const r = await api.req(method, path, body);
    if (r && r.snapshot) apply(r.snapshot);
    return r;
  }

  async function init() {
    if (!api.hasToken()) return false;
    try {
      const snap = await api.get('/api/snapshot');
      apply(snap);
      return true;
    } catch (e) {
      if (e.status === 401) {
        api.setToken('');
        return false;
      }
      throw e;
    }
  }

  async function sync() {
    const snap = await api.get('/api/snapshot');
    apply(snap);
    return snap;
  }

  async function checkVersion() {
    const r = await api.get('/api/version');
    return r.version;
  }

  async function login(phone, pwd) {
    const r = await api.post('/api/auth/login', { phone, pwd });
    api.setToken(r.token);
    apply(r.snapshot);
    return r;
  }

  async function register(data) {
    const r = await api.post('/api/auth/register', data);
    api.setToken(r.token);
    apply(r.snapshot);
    return r;
  }

  async function logout() {
    try {
      await api.post('/api/auth/logout');
    } catch (e) {
      /* ignore */
    }
    api.setToken('');
    apply({ me: null, users: [], products: [], chats: [], orders: [], favorites: [], notices: [], version: 0 });
  }

  async function switchUser(userId) {
    const r = await api.post('/api/demo/switch', { userId });
    api.setToken(r.token);
    apply(r.snapshot);
    return r;
  }

  const updateMe = (patch) => call('PATCH', '/api/profile', patch);
  const createProduct = (data) => call('POST', '/api/products', data);
  const updateProduct = (id, patch) => call('PATCH', '/api/products/' + id, patch);
  const setProductStatus = (id, status) => call('POST', '/api/products/' + id + '/status', { status });
  const deleteProduct = (id) => call('DELETE', '/api/products/' + id);
  const bumpView = (id) => call('POST', '/api/products/' + id + '/view');
  const toggleFav = (id) => call('POST', '/api/favorites/' + id + '/toggle');
  const ensureChat = (productId) => call('POST', '/api/chats', { productId });
  const sendMessage = (chatId, msg) => call('POST', '/api/chats/' + chatId + '/messages', msg);
  const respondQuote = (chatId, msgId, accept) => call('POST', '/api/chats/' + chatId + '/quotes/' + msgId + '/respond', { accept });
  const uploadProof = (orderId, url) => call('POST', '/api/orders/' + orderId + '/proof', { url });
  const confirmPayment = (orderId) => call('POST', '/api/orders/' + orderId + '/confirm-payment');
  const confirmReceipt = (orderId) => call('POST', '/api/orders/' + orderId + '/confirm-receipt');
  const cancelOrder = (orderId) => call('POST', '/api/orders/' + orderId + '/cancel');
  const readNotices = () => call('POST', '/api/notices/read');
  const buyNow = (productId) => call('POST', '/api/products/' + productId + '/buy');
  const resetDemo = () => call('POST', '/api/demo/reset');

  async function markRead(chatId) {
    const c = chat(chatId);
    if (c) c.unread = 0;
    try {
      await api.post('/api/chats/' + chatId + '/read');
    } catch (e) {
      /* 忽略已读失败 */
    }
  }

  /* 上传：把压缩后的 dataURL 换成服务器 URL */
  async function upload(dataUrl) {
    const r = await api.post('/api/upload', { data: dataUrl });
    return r.url;
  }

  CFM.store = {
    ORDER_TTL,
    ORDER_STEPS,
    ORDER_STEP_INDEX,
    PRODUCT_STATE,
    CATEGORIES,
    CONDITIONS,
    DELIVERIES,
    // 读
    me,
    isLogged,
    users: () => st.users || [],
    version: () => st.version || 0,
    user,
    product,
    chat,
    order,
    products,
    sellerStats,
    chatsOf,
    otherOf,
    lastText,
    ordersOf,
    activeOrderOfChat,
    activeOrderOfProduct,
    roleIn,
    isFav,
    favList,
    favCount,
    notices,
    unreadNotices,
    unreadTotal,
    // 写
    init,
    sync,
    checkVersion,
    login,
    register,
    logout,
    switchUser,
    updateMe,
    createProduct,
    updateProduct,
    setProductStatus,
    deleteProduct,
    bumpView,
    toggleFav,
    ensureChat,
    sendMessage,
    respondQuote,
    uploadProof,
    confirmPayment,
    confirmReceipt,
    cancelOrder,
    readNotices,
    buyNow,
    resetDemo,
    markRead,
    upload,
    apply,
  };
})();
