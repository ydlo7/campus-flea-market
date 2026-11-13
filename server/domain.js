/**
 * 领域逻辑（服务端唯一权威）
 *
 * 所有业务规则都在这里，前端只做展示与乐观刷新：
 * - 商品：在售 → 已预订 → 已售出，可下架/上架
 * - 订单：待付款 → 待确认收款 → 待交货 → 已完成，任一方可取消，15 分钟未付款自动取消
 * - 报价被接受 / 立即购买 都会建单并锁定商品
 */
const crypto = require('crypto');
const { makeSalt, hashPassword, verifyPassword, createSession } = require('./auth');
const { pic, makeQR, avatarPic } = require('../shared/placeholder');

const ORDER_TTL = 15 * 60 * 1000;

const CATEGORIES = ['全部', '数码电子', '图书教材', '宿舍好物', '服饰鞋包', '运动户外', '文体乐器', '其他'];
const CONDITIONS = ['全新', '几乎全新', '九成新', '八成新', '七成新', '有使用痕迹'];
const DELIVERIES = ['校内面交', '宿舍楼下', '自提', '快递邮寄'];
const PRODUCT_STATE = { on_sale: '在售', reserved: '已预订', sold: '已售出', off: '已下架' };
const ORDER_STEPS = ['待付款', '待确认收款', '待交货', '已完成'];

const uid = (p) => p + crypto.randomBytes(5).toString('hex');
const pad = (n) => (n < 10 ? '0' + n : '' + n);
const now = () => Date.now();

function fail(msg, status) {
  const e = new Error(msg);
  e.status = status || 400;
  throw e;
}

/* ---------------- 行映射 ---------------- */
const parse = (s, d) => {
  try {
    return s ? JSON.parse(s) : d;
  } catch (e) {
    return d;
  }
};

const mapUser = (r) =>
  r && {
    id: r.id,
    nick: r.nick,
    school: r.school,
    campus: r.campus,
    major: r.major,
    studentNo: r.student_no || '',
    verified: !!r.verified,
    avatar: r.avatar,
    qrImage: r.qr_image,
    bio: r.bio || '',
    createdAt: r.created_at,
  };

const mapProduct = (r) => ({
  id: r.id,
  sellerId: r.seller_id,
  title: r.title,
  price: r.price,
  origPrice: r.orig_price,
  category: r.category,
  condition: r.condition,
  desc: r.description,
  images: parse(r.images, []),
  ratio: r.ratio || 1,
  delivery: parse(r.delivery, []),
  status: r.status,
  views: r.views || 0,
  createdAt: r.created_at,
  soldAt: r.sold_at || null,
});

const mapMessage = (r) => Object.assign({ id: r.id, from: r.from_id, type: r.type, ts: r.ts }, parse(r.payload, {}));

const mapOrder = (r) => ({
  id: r.id,
  no: r.no,
  productId: r.product_id,
  chatId: r.chat_id,
  buyerId: r.buyer_id,
  sellerId: r.seller_id,
  amount: r.amount,
  delivery: r.delivery || '',
  location: r.location || '',
  time: r.time || '',
  status: r.status,
  createdAt: r.created_at,
  expiresAt: r.expires_at,
  buyerConfirmed: !!r.buyer_confirmed,
  sellerConfirmed: !!r.seller_confirmed,
  proof: r.proof,
  cancelReason: r.cancel_reason || '',
  timeline: parse(r.timeline, []),
});

const mapNotice = (r) => ({
  id: r.id,
  type: r.type,
  title: r.title,
  text: r.text,
  productId: r.product_id,
  orderId: r.order_id,
  ts: r.ts,
  read: !!r.read,
});

module.exports = function createDomain(db) {
  /* ---------------- 基础查询 ---------------- */
  const user = (id) => mapUser(db.get('SELECT * FROM users WHERE id = ?', [id]));
  const product = (id) => {
    const r = db.get('SELECT * FROM products WHERE id = ?', [id]);
    return r ? mapProduct(r) : null;
  };
  const order = (id) => {
    const r = db.get('SELECT * FROM orders WHERE id = ?', [id]);
    return r ? mapOrder(r) : null;
  };
  const chatRow = (id) => db.get('SELECT * FROM chats WHERE id = ?', [id]);
  const chat = (id) => {
    const r = chatRow(id);
    if (!r) return null;
    return { id: r.id, productId: r.product_id, buyerId: r.buyer_id, sellerId: r.seller_id, createdAt: r.created_at, lastTs: r.last_ts };
  };

  const activeOrderOfChat = (chatId) => {
    const r = db.get(
      "SELECT * FROM orders WHERE chat_id = ? AND status IN ('pending_pay','pending_confirm','pending_delivery') ORDER BY created_at DESC LIMIT 1",
      [chatId]
    );
    return r ? mapOrder(r) : null;
  };
  const activeOrderOfProduct = (productId) => {
    const r = db.get(
      "SELECT * FROM orders WHERE product_id = ? AND status IN ('pending_pay','pending_confirm','pending_delivery') ORDER BY created_at DESC LIMIT 1",
      [productId]
    );
    return r ? mapOrder(r) : null;
  };

  const addNotice = (userId, data) => {
    if (!userId) return;
    db.run(
      'INSERT INTO notices (id, user_id, type, title, text, product_id, order_id, ts, "read") VALUES (?,?,?,?,?,?,?,?,0)',
      [uid('n_'), userId, data.type || 'order', data.title || '', data.text || '', data.productId || null, data.orderId || null, now()]
    );
    db.run('DELETE FROM notices WHERE user_id = ? AND id NOT IN (SELECT id FROM notices WHERE user_id = ? ORDER BY ts DESC LIMIT 60)', [userId, userId]);
  };

  const pushMessage = (chatId, fromId, type, payload) => {
    const id = uid('m_');
    const ts = now();
    db.run('INSERT INTO messages (id, chat_id, from_id, type, payload, ts) VALUES (?,?,?,?,?,?)', [
      id,
      chatId,
      fromId || null,
      type,
      JSON.stringify(payload || {}),
      ts,
    ]);
    db.run('UPDATE chats SET last_ts = ? WHERE id = ?', [ts, chatId]);
    return { id, from: fromId || null, type, ts, ...(payload || {}) };
  };

  const nextOrderNo = () => {
    const seq = Number(db.getMeta('order_seq', '1000')) + 1;
    db.setMeta('order_seq', seq);
    const d = new Date();
    return 'FM' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + String(seq).slice(-4);
  };

  /* ---------------- 订单超时（读时补偿） ---------------- */
  function tick() {
    const rows = db.all("SELECT * FROM orders WHERE status = 'pending_pay' AND expires_at IS NOT NULL AND expires_at < ?", [now()]);
    if (!rows.length) return 0;
    rows.forEach((r) => {
      const o = mapOrder(r);
      db.run("UPDATE orders SET status = 'cancelled', cancel_reason = ? WHERE id = ?", ['预订超时未付款，已自动取消', o.id]);
      const tl = o.timeline.concat([{ t: now(), text: '预订超时未付款，订单自动取消' }]);
      db.run('UPDATE orders SET timeline = ? WHERE id = ?', [JSON.stringify(tl), o.id]);
      const p = product(o.productId);
      if (p && p.status === 'reserved') db.run("UPDATE products SET status = 'on_sale' WHERE id = ?", [p.id]);
      if (o.chatId) pushMessage(o.chatId, null, 'system', { text: '预订超时未付款，订单已自动取消，商品回到在售' });
      addNotice(o.buyerId, { type: 'order', title: '订单已自动取消', text: `订单 ${o.no} 超时未付款`, orderId: o.id, productId: o.productId });
    });
    db.bump();
    return rows.length;
  }

  /* ---------------- 快照 ---------------- */
  function snapshot(userId) {
    tick();
    const users = db.all('SELECT * FROM users').map(mapUser);
    const products = db.all('SELECT * FROM products ORDER BY created_at DESC').map(mapProduct);
    const favCounts = {};
    db.all('SELECT product_id, COUNT(*) AS n FROM favorites GROUP BY product_id').forEach((r) => (favCounts[r.product_id] = r.n));
    products.forEach((p) => (p.favCount = favCounts[p.id] || 0));
    const out = { me: null, users, products, chats: [], orders: [], favorites: [], notices: [], version: db.version() };
    if (!userId) return out;

    out.me = user(userId);

    const chats = db.all('SELECT * FROM chats WHERE buyer_id = ? OR seller_id = ? ORDER BY last_ts DESC', [userId, userId]);
    out.chats = chats.map((c) => {
      const msgs = db.all('SELECT * FROM messages WHERE chat_id = ? ORDER BY ts ASC', [c.id]).map(mapMessage);
      const read = db.get('SELECT last_read_at FROM chat_reads WHERE chat_id = ? AND user_id = ?', [c.id, userId]);
      const since = read ? read.last_read_at : 0;
      const unread = msgs.filter((m) => m.ts > since && m.from !== userId && m.type !== 'system').length;
      return {
        id: c.id,
        productId: c.product_id,
        buyerId: c.buyer_id,
        sellerId: c.seller_id,
        createdAt: c.created_at,
        lastTs: c.last_ts,
        messages: msgs,
        unread,
      };
    });

    out.orders = db
      .all('SELECT * FROM orders WHERE buyer_id = ? OR seller_id = ? ORDER BY created_at DESC', [userId, userId])
      .map(mapOrder);

    out.favorites = db.all('SELECT * FROM favorites WHERE user_id = ? ORDER BY ts DESC', [userId]).map((r) => ({
      userId: r.user_id,
      productId: r.product_id,
      priceAtFav: r.price_at_fav,
      ts: r.ts,
    }));

    out.notices = db.all('SELECT * FROM notices WHERE user_id = ? ORDER BY ts DESC LIMIT 60', [userId]).map(mapNotice);
    return out;
  }

  /* ---------------- 账号 ---------------- */
  function register(data) {
    const nick = String(data.nick || '').trim();
    const phone = String(data.phone || '').trim();
    const pwd = String(data.pwd || '');
    if (!nick) fail('昵称不能为空');
    if (!/^\d{11}$/.test(phone)) fail('手机号需要 11 位');
    if (pwd.length < 6) fail('密码至少 6 位');
    if (db.get('SELECT id FROM users WHERE phone = ?', [phone])) fail('手机号已注册，直接登录吧');

    const palette = [
      ['🌱', '#DFF3E4', '#B9E3C6'],
      ['🍊', '#FFE9DA', '#FFCDB0'],
      ['🫐', '#E2E8FA', '#C2CEF0'],
      ['🌸', '#FBE6EC', '#F2CAD8'],
    ];
    const p = palette[db.get('SELECT COUNT(*) AS n FROM users').n % palette.length];
    const salt = makeSalt();
    const id = uid('u_');
    db.run(
      `INSERT INTO users (id, nick, phone, pwd, salt, school, campus, major, student_no, verified, avatar, qr_image, bio, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        nick,
        phone,
        hashPassword(pwd, salt),
        salt,
        data.school || '湖南大学',
        data.campus || '南校区',
        data.major || '',
        data.studentNo || '',
        data.studentNo ? 1 : 0,
        avatarPic(p[0], p[1], p[2]),
        null,
        '',
        now(),
      ]
    );
    db.bump();
    return { userId: id, token: createSession(db, id) };
  }

  function login(phone, pwd) {
    const row = db.get('SELECT * FROM users WHERE phone = ?', [String(phone || '').trim()]);
    if (!row) fail('该手机号还没有注册');
    if (!verifyPassword(pwd, row.salt, row.pwd)) fail('密码不正确');
    return { userId: row.id, token: createSession(db, row.id) };
  }

  function switchDemo(userId) {
    const row = db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!row) fail('演示账号不存在', 404);
    if (!row.phone || !String(row.phone).startsWith('1')) fail('该账号不支持切换');
    return { userId: row.id, token: createSession(db, row.id) };
  }

  function updateProfile(userId, patch) {
    const u = user(userId);
    if (!u) fail('用户不存在', 401);
    const nick = patch.nick !== undefined ? String(patch.nick).trim() : u.nick;
    if (!nick) fail('昵称不能为空');
    db.run('UPDATE users SET nick = ?, campus = ?, major = ?, bio = ?, qr_image = ? WHERE id = ?', [
      nick,
      patch.campus !== undefined ? patch.campus : u.campus,
      patch.major !== undefined ? patch.major : u.major,
      patch.bio !== undefined ? patch.bio : u.bio,
      patch.qrImage !== undefined ? patch.qrImage : u.qrImage,
      userId,
    ]);
    db.bump();
    return user(userId);
  }

  /* ---------------- 商品 ---------------- */
  function createProduct(userId, data) {
    const title = String(data.title || '').trim();
    const price = Number(data.price);
    if (title.length < 4) fail('标题至少 4 个字');
    if (!price || price <= 0) fail('填一个有效价格');
    const images = Array.isArray(data.images) ? data.images.slice(0, 4) : [];
    if (!images.length) fail('至少上传一张图片');
    const delivery = Array.isArray(data.delivery) && data.delivery.length ? data.delivery : ['校内面交'];

    const id = uid('p_');
    db.run(
      `INSERT INTO products (id, seller_id, title, price, orig_price, category, condition, description, images, ratio, delivery, status, views, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,'on_sale',0,?)`,
      [
        id,
        userId,
        title,
        price,
        data.origPrice ? Number(data.origPrice) : null,
        CATEGORIES.indexOf(data.category) > 0 ? data.category : '其他',
        CONDITIONS.indexOf(data.condition) >= 0 ? data.condition : '九成新',
        String(data.desc || ''),
        JSON.stringify(images),
        Number(data.ratio) || 1,
        JSON.stringify(delivery),
        now(),
      ]
    );
    db.bump();
    return product(id);
  }

  function updateProduct(userId, productId, patch) {
    const p = product(productId);
    if (!p) fail('商品不存在', 404);
    if (p.sellerId !== userId) fail('只能编辑自己的商品', 403);
    if (p.status === 'reserved') fail('商品已被预订，暂不能编辑');

    const title = patch.title !== undefined ? String(patch.title).trim() : p.title;
    const price = patch.price !== undefined ? Number(patch.price) : p.price;
    if (title.length < 4) fail('标题至少 4 个字');
    if (!price || price <= 0) fail('填一个有效价格');

    db.run(
      'UPDATE products SET title = ?, price = ?, category = ?, condition = ?, description = ?, images = ?, delivery = ? WHERE id = ?',
      [
        title,
        price,
        patch.category || p.category,
        patch.condition || p.condition,
        patch.desc !== undefined ? String(patch.desc) : p.desc,
        JSON.stringify(patch.images || p.images),
        JSON.stringify(patch.delivery || p.delivery),
        productId,
      ]
    );

    // 降价提醒
    if (price < p.price) {
      db.all('SELECT DISTINCT user_id FROM favorites WHERE product_id = ? AND user_id != ?', [productId, p.sellerId]).forEach((r) => {
        addNotice(r.user_id, {
          type: 'price_drop',
          title: '收藏的商品降价了',
          text: `「${title}」从 ¥${p.price} 降到 ¥${price}`,
          productId,
        });
      });
    }
    db.bump();
    return product(productId);
  }

  function setProductStatus(userId, productId, status) {
    const p = product(productId);
    if (!p) fail('商品不存在', 404);
    if (p.sellerId !== userId) fail('只能操作自己的商品', 403);
    if (['on_sale', 'off'].indexOf(status) < 0) fail('不支持的状态');
    if (p.status === 'reserved') fail('商品交易中，先处理订单');
    if (p.status === 'sold') fail('商品已售出');
    db.run('UPDATE products SET status = ? WHERE id = ?', [status, productId]);
    db.bump();
    return product(productId);
  }

  function deleteProduct(userId, productId) {
    const p = product(productId);
    if (!p) fail('商品不存在', 404);
    if (p.sellerId !== userId) fail('只能删除自己的商品', 403);
    if (p.status === 'reserved') fail('商品交易中，不能删除');
    db.run('DELETE FROM products WHERE id = ?', [productId]);
    db.run('DELETE FROM favorites WHERE product_id = ?', [productId]);
    db.bump();
    return true;
  }

  function viewProduct(productId) {
    db.run('UPDATE products SET views = views + 1 WHERE id = ?', [productId]);
    db.bump();
    const p = product(productId);
    return p;
  }

  /* ---------------- 收藏 ---------------- */
  function toggleFavorite(userId, productId) {
    const p = product(productId);
    if (!p) fail('商品不存在', 404);
    const has = db.get('SELECT 1 AS x FROM favorites WHERE user_id = ? AND product_id = ?', [userId, productId]);
    if (has) {
      db.run('DELETE FROM favorites WHERE user_id = ? AND product_id = ?', [userId, productId]);
      db.bump();
      return { on: false };
    }
    db.run('INSERT INTO favorites (user_id, product_id, price_at_fav, ts) VALUES (?,?,?,?)', [userId, productId, p.price, now()]);
    db.bump();
    return { on: true };
  }

  /* ---------------- 会话与消息 ---------------- */
  function ensureChat(userId, productId) {
    const p = product(productId);
    if (!p) fail('商品不存在', 404);
    if (p.sellerId === userId) fail('这是你自己发布的商品');
    const exists = db.get('SELECT * FROM chats WHERE product_id = ? AND buyer_id = ?', [productId, userId]);
    if (exists) return chat(exists.id);
    const id = uid('c_');
    db.run('INSERT INTO chats (id, product_id, buyer_id, seller_id, created_at, last_ts) VALUES (?,?,?,?,?,?)', [
      id,
      productId,
      userId,
      p.sellerId,
      now(),
      now(),
    ]);
    db.bump();
    return chat(id);
  }

  function assertMember(chatId, userId) {
    const c = chat(chatId);
    if (!c) fail('会话不存在', 404);
    if (c.buyerId !== userId && c.sellerId !== userId) fail('无权访问该会话', 403);
    return c;
  }

  function sendMessage(userId, chatId, msg) {
    const c = assertMember(chatId, userId);
    const p = product(c.productId);
    const type = msg.type || 'text';

    if (type === 'text') {
      const text = String(msg.text || '').trim();
      if (!text) fail('消息不能为空');
      if (text.length > 1000) fail('消息太长了');
      db.run('UPDATE chat_reads SET last_read_at = ? WHERE chat_id = ? AND user_id = ?', [now(), chatId, userId]);
      db.bump();
      return pushMessage(chatId, userId, 'text', { text });
    }

    if (type === 'image') {
      if (!msg.image) fail('图片不能为空');
      db.bump();
      return pushMessage(chatId, userId, 'image', { image: msg.image });
    }

    if (type === 'quote') {
      const price = Number(msg.price);
      if (!price || price <= 0) fail('填一个有效价格');
      if (activeOrderOfChat(chatId)) fail('已有进行中的订单');
      if (!p || p.status !== 'on_sale') fail('商品当前不可交易');
      db.bump();
      return pushMessage(chatId, userId, 'quote', { price, note: String(msg.note || '').slice(0, 60), status: 'pending' });
    }

    if (type === 'delivery') {
      const o = activeOrderOfChat(chatId);
      if (!o) fail('还没有进行中的订单');
      const payload = {
        delivery: String(msg.delivery || ''),
        location: String(msg.location || ''),
        time: String(msg.time || ''),
      };
      if (!payload.location) fail('写个具体地点');
      db.run('UPDATE orders SET delivery = ?, location = ?, time = ? WHERE id = ?', [payload.delivery, payload.location, payload.time, o.id]);
      const tl = o.timeline.concat([{ t: now(), text: `双方确认交货信息：${payload.delivery} · ${payload.location}` }]);
      db.run('UPDATE orders SET timeline = ? WHERE id = ?', [JSON.stringify(tl), o.id]);
      db.bump();
      return pushMessage(chatId, userId, 'delivery', payload);
    }

    if (type === 'qr') {
      const o = activeOrderOfChat(chatId);
      if (!o) fail('先生成订单再发收款码');
      const seller = user(c.sellerId);
      const image = (seller && seller.qrImage) || makeQR(c.sellerId + 'qr', '#17181A');
      db.bump();
      return pushMessage(chatId, userId, 'qr', { image, amount: o.amount, orderId: o.id });
    }

    fail('不支持的消息类型');
  }

  function respondQuote(userId, chatId, msgId, accept) {
    const c = assertMember(chatId, userId);
    const row = db.get('SELECT * FROM messages WHERE id = ? AND chat_id = ?', [msgId, chatId]);
    if (!row || row.type !== 'quote') fail('报价不存在', 404);
    const m = mapMessage(row);
    if (m.status !== 'pending') fail('该报价已处理');
    if (m.from === userId) fail('不能处理自己的报价');
    const p = product(c.productId);
    if (!p) fail('商品不存在', 404);

    if (!accept) {
      db.run('UPDATE messages SET payload = ? WHERE id = ?', [JSON.stringify({ ...m, status: 'rejected' }), msgId]);
      pushMessage(chatId, null, 'system', { text: '报价已拒绝，可以继续聊聊' });
      db.bump();
      return { accepted: false };
    }

    if (p.status !== 'on_sale') fail('商品已被预订或售出');
    db.run('UPDATE messages SET payload = ? WHERE id = ?', [JSON.stringify({ ...m, status: 'accepted' }), msgId]);
    const orderId = createOrder(c, m.price, 'quote');
    pushMessage(chatId, null, 'system', { text: `卖家接受报价 ¥${m.price}，订单已生成（待付款）` });
    pushMessage(chatId, userId, 'order', { orderId });
    db.bump();
    return { accepted: true, orderId };
  }

  /* ---------------- 建单（报价接受 / 立即购买 共用） ---------------- */
  function createOrder(c, amount, source) {
    const p = product(c.productId);
    const id = uid('o_');
    const ts = now();
    const no = nextOrderNo();
    const timeline = [
      { t: ts, text: source === 'buy' ? `买家按标价 ¥${amount} 直接下单` : '买家出价，卖家接受，订单生成' },
    ];
    db.run(
      `INSERT INTO orders (id, no, product_id, chat_id, buyer_id, seller_id, amount, delivery, location, time, status, created_at, expires_at, buyer_confirmed, seller_confirmed, proof, cancel_reason, timeline)
       VALUES (?,?,?,?,?,?,?,?,?,?,'pending_pay',?,?,0,0,NULL,NULL,?)`,
      [id, no, c.productId, c.id, c.buyerId, c.sellerId, Number(amount), '', '', '', ts, ts + ORDER_TTL, JSON.stringify(timeline)]
    );
    db.run("UPDATE products SET status = 'reserved' WHERE id = ?", [c.productId]);
    addNotice(c.sellerId, { type: 'order', title: '有新订单', text: `「${p ? p.title : '商品'}」有人下单了，金额 ¥${amount}`, orderId: id, productId: c.productId });
    db.bump();
    return id;
  }

  /** 立即购买：按标价直接建单，不需要卖家先接受报价 */
  function buyNow(userId, productId) {
    const p = product(productId);
    if (!p) fail('商品不存在', 404);
    if (p.sellerId === userId) fail('不能购买自己的商品');
    if (p.status !== 'on_sale') fail('商品当前不可购买');
    const c = ensureChat(userId, productId);
    const orderId = createOrder(c, p.price, 'buy');
    pushMessage(c.id, null, 'system', { text: `买家按标价 ¥${p.price} 直接下单，订单已生成（待付款）` });
    pushMessage(c.id, userId, 'order', { orderId });
    return orderId;
  }

  function uploadProof(userId, orderId, url) {
    const o = order(orderId);
    if (!o) fail('订单不存在', 404);
    if (o.buyerId !== userId) fail('只有买家可以上传凭证', 403);
    if (o.status !== 'pending_pay' && o.status !== 'pending_confirm') fail('当前状态不能上传凭证');
    if (!url) fail('凭证不能为空');
    db.run("UPDATE orders SET proof = ?, status = 'pending_confirm' WHERE id = ?", [url, orderId]);
    const tl = o.timeline.concat([{ t: now(), text: '买家已上传支付凭证' }]);
    db.run('UPDATE orders SET timeline = ? WHERE id = ?', [JSON.stringify(tl), orderId]);
    if (o.chatId) {
      pushMessage(o.chatId, userId, 'proof', { image: url, orderId });
      pushMessage(o.chatId, null, 'system', { text: '买家已上传支付凭证，等待卖家确认收款' });
    }
    addNotice(o.sellerId, { type: 'order', title: '买家已上传支付凭证', text: `订单 ${o.no} 等待你确认收款`, orderId, productId: o.productId });
    db.bump();
    return order(orderId);
  }

  function confirmPayment(userId, orderId) {
    const o = order(orderId);
    if (!o) fail('订单不存在', 404);
    if (o.sellerId !== userId) fail('只有卖家可以确认收款', 403);
    if (o.status !== 'pending_confirm') fail('当前状态不能确认收款');
    db.run("UPDATE orders SET status = 'pending_delivery' WHERE id = ?", [orderId]);
    const tl = o.timeline.concat([{ t: now(), text: '卖家已确认收款，等待线下交货' }]);
    db.run('UPDATE orders SET timeline = ? WHERE id = ?', [JSON.stringify(tl), orderId]);
    if (o.chatId) pushMessage(o.chatId, null, 'system', { text: '卖家已确认收款，请按约定时间地点交货' });
    addNotice(o.buyerId, { type: 'order', title: '卖家已确认收款', text: `订单 ${o.no} 已确认收款，等待线下交货`, orderId, productId: o.productId });
    db.bump();
    return order(orderId);
  }

  function confirmReceipt(userId, orderId) {
    const o = order(orderId);
    if (!o) fail('订单不存在', 404);
    const role = o.buyerId === userId ? 'buyer' : o.sellerId === userId ? 'seller' : null;
    if (!role) fail('无权操作该订单', 403);
    if (o.status !== 'pending_delivery') fail('当前状态不能确认收货');

    if (role === 'buyer') {
      if (o.buyerConfirmed) fail('你已经确认过了');
      db.run('UPDATE orders SET buyer_confirmed = 1 WHERE id = ?', [orderId]);
    } else {
      if (o.sellerConfirmed) fail('你已经确认过了');
      db.run('UPDATE orders SET seller_confirmed = 1 WHERE id = ?', [orderId]);
    }
    const tl = o.timeline.concat([{ t: now(), text: role === 'buyer' ? '买家已确认收货' : '卖家已确认交付' }]);
    db.run('UPDATE orders SET timeline = ? WHERE id = ?', [JSON.stringify(tl), orderId]);

    const updated = order(orderId);
    if (updated.buyerConfirmed && updated.sellerConfirmed) {
      db.run("UPDATE orders SET status = 'completed' WHERE id = ?", [orderId]);
      const tl2 = updated.timeline.concat([{ t: now(), text: '双方确认完成，交易结束' }]);
      db.run('UPDATE orders SET timeline = ? WHERE id = ?', [JSON.stringify(tl2), orderId]);
      db.run("UPDATE products SET status = 'sold', sold_at = ? WHERE id = ?", [now(), o.productId]);
      if (o.chatId) pushMessage(o.chatId, null, 'system', { text: '交易完成，商品已售出 🎉' });
      addNotice(o.buyerId, { type: 'order', title: '交易完成', text: `订单 ${o.no} 已完成`, orderId, productId: o.productId });
      addNotice(o.sellerId, { type: 'order', title: '交易完成', text: `订单 ${o.no} 已完成，商品已售出`, orderId, productId: o.productId });
    } else if (o.chatId) {
      pushMessage(o.chatId, null, 'system', {
        text: role === 'buyer' ? '买家已确认收货，等待卖家确认交付' : '卖家已确认交付，等待买家确认收货',
      });
    }
    db.bump();
    return order(orderId);
  }

  function cancelOrder(userId, orderId) {
    const o = order(orderId);
    if (!o) fail('订单不存在', 404);
    const role = o.buyerId === userId ? 'buyer' : o.sellerId === userId ? 'seller' : null;
    if (!role) fail('无权操作该订单', 403);
    if (o.status === 'completed') fail('订单已完成，不能取消');
    if (o.status === 'cancelled') fail('订单已取消');

    const reason = role === 'buyer' ? '买家取消订单' : '卖家取消订单';
    db.run("UPDATE orders SET status = 'cancelled', cancel_reason = ? WHERE id = ?", [reason, orderId]);
    const tl = o.timeline.concat([{ t: now(), text: '订单取消：' + reason }]);
    db.run('UPDATE orders SET timeline = ? WHERE id = ?', [JSON.stringify(tl), orderId]);
    db.run("UPDATE products SET status = 'on_sale' WHERE id = ? AND status = 'reserved'", [o.productId]);
    if (o.chatId) pushMessage(o.chatId, null, 'system', { text: '订单已取消，商品重新回到在售' });
    const other = role === 'buyer' ? o.sellerId : o.buyerId;
    addNotice(other, { type: 'order', title: '订单已取消', text: `订单 ${o.no} 已被${role === 'buyer' ? '买家' : '卖家'}取消`, orderId, productId: o.productId });
    db.bump();
    return order(orderId);
  }

  function readChat(userId, chatId) {
    assertMember(chatId, userId);
    db.run(
      'INSERT INTO chat_reads (chat_id, user_id, last_read_at) VALUES (?,?,?) ON CONFLICT(chat_id, user_id) DO UPDATE SET last_read_at = excluded.last_read_at',
      [chatId, userId, now()]
    );
    return true;
  }

  function readNotices(userId) {
    db.run('UPDATE notices SET "read" = 1 WHERE user_id = ?', [userId]);
    return true;
  }

  /** 轻量版本号：先做超时补偿，再返回全局版本 */
  function version() {
    tick();
    return db.version();
  }

  /* ---------------- 演示数据重置 ---------------- */
  function resetDemo() {
    const seed = require('./seed');
    db.tx(() => {
      ['sessions', 'notices', 'orders', 'messages', 'chat_reads', 'chats', 'favorites', 'products', 'users'].forEach((t) =>
        db.run('DELETE FROM ' + t)
      );
      seed.run(db);
    });
    db.bump();
    return true;
  }

  return {
    // meta
    ORDER_TTL,
    CATEGORIES,
    CONDITIONS,
    DELIVERIES,
    PRODUCT_STATE,
    ORDER_STEPS,
    // queries
    snapshot,
    version,
    user,
    product,
    order,
    chat,
    activeOrderOfChat,
    activeOrderOfProduct,
    tick,
    // auth
    register,
    login,
    switchDemo,
    updateProfile,
    // products
    createProduct,
    updateProduct,
    setProductStatus,
    deleteProduct,
    viewProduct,
    // favorites
    toggleFavorite,
    // chat
    ensureChat,
    sendMessage,
    respondQuote,
    readChat,
    // orders
    buyNow,
    uploadProof,
    confirmPayment,
    confirmReceipt,
    cancelOrder,
    // notices
    readNotices,
    resetDemo,
  };
};
