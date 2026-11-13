/**
 * API 集成测试：起一个真实服务（临时数据库），用 fetch 走完整交易流程
 * 运行：node tests/api.spec.js
 */
const os = require('os');
const path = require('path');
const fs = require('fs');

const { createServer } = require('../server');

const PNG_1PX =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) {
    pass++;
    console.log('  \u2713 ' + name);
  } else {
    fail++;
    console.log('  \u2717 ' + name + (extra ? '  → ' + extra : ''));
  }
}
function describe(t) {
  console.log('\n' + t);
}

(async () => {
  const dbFile = path.join(os.tmpdir(), 'cfm-test-' + Date.now() + '.db');
  const server = createServer({ file: dbFile });
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  async function api(method, p, body, token) {
    const res = await fetch(base + p, {
      method,
      headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}),
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let data = null;
    try {
      data = await res.json();
    } catch (e) {}
    return { status: res.status, data };
  }

  try {
    /* ---------------- 1 ---------------- */
    describe('[1] 服务与静态资源');
    const health = await api('GET', '/api/health');
    ok('健康检查', health.status === 200 && health.data.ok);
    const page = await fetch(base + '/');
    ok('首页可访问', page.status === 200 && (await page.text()).indexOf('<title>') >= 0);
    const css = await fetch(base + '/assets/styles.css');
    ok('静态资源可访问', css.status === 200);

    /* ---------------- 2 ---------------- */
    describe('[2] 登录与鉴权');
    const guarded = await api('GET', '/api/snapshot');
    ok('未登录访问快照返回 401', guarded.status === 401);

    const badLogin = await api('POST', '/api/auth/login', { phone: '13800138000', pwd: 'wrong' });
    ok('密码错误被拒绝', badLogin.status === 400);

    const login = await api('POST', '/api/auth/login', { phone: '13800138000', pwd: '123456' });
    ok('演示账号登录成功', login.status === 200 && !!login.data.token);
    const me = login.data.snapshot.me;
    ok('快照返回当前用户', me && me.nick === '林小满');
    ok('不泄露密码散列', !('pwd' in me) && !('salt' in me));
    ok('种子数据完整', login.data.snapshot.products.length >= 12);
    const tokenA = login.data.token;

    /* ---------------- 3 ---------------- */
    describe('[3] 上传与发布商品');
    const up = await api('POST', '/api/upload', { data: PNG_1PX }, tokenA);
    ok('图片上传返回 URL', up.status === 200 && /^\/uploads\/.+\.png$/.test(up.data.url));
    const imgUrl = up.data.url;

    const badPublish = await api('POST', '/api/products', { title: '短', price: 10, images: [imgUrl] }, tokenA);
    ok('标题过短被拒绝', badPublish.status === 400);

    const created = await api(
      'POST',
      '/api/products',
      { title: '测试用闲置 · 九成新台灯', price: 42, category: '宿舍好物', condition: '九成新', desc: '接口测试创建', images: [imgUrl], delivery: ['校内面交'] },
      tokenA
    );
    ok('发布成功', created.status === 200 && created.data.product.status === 'on_sale');
    const newProduct = created.data.product;
    ok('图片存为服务器 URL', newProduct.images[0] === imgUrl);
    ok('快照里能查到新商品', created.data.snapshot.products.some((p) => p.id === newProduct.id));

    /* ---------------- 4 ---------------- */
    describe('[4] 搜索与筛选（前端在快照上做）');
    const snap = (await api('GET', '/api/snapshot', undefined, tokenA)).data;
    const hit = snap.products.filter((p) => (p.title + p.desc).indexOf('台灯') >= 0);
    ok('关键词能匹配到商品', hit.length >= 2);
    const byCat = snap.products.filter((p) => p.category === '图书教材');
    ok('按分类可筛选', byCat.length >= 2);
    const sorted = snap.products.slice().sort((a, b) => a.price - b.price);
    ok('价格排序可用', sorted[0].price <= sorted[sorted.length - 1].price);

    /* ---------------- 5 ---------------- */
    describe('[5] 收藏');
    const fav1 = await api('POST', `/api/favorites/${newProduct.id}/toggle`, {}, tokenA);
    ok('收藏成功', fav1.status === 200 && fav1.data.on === true);
    const favProd = fav1.data.snapshot.products.find((p) => p.id === newProduct.id);
    ok('收藏计数 +1', favProd.favCount === 1);
    const fav2 = await api('POST', `/api/favorites/${newProduct.id}/toggle`, {}, tokenA);
    ok('取消收藏', fav2.data.on === false);

    /* ---------------- 6 ---------------- */
    describe('[6] 私聊与报价');
    const loginB = await api('POST', '/api/auth/login', { phone: '13900139001', pwd: '123456' });
    const tokenB = loginB.data.token;
    const meB = loginB.data.snapshot.me;
    ok('第二个账号登录', meB && meB.nick === '陈一鸣');

    const selfChat = await api('POST', '/api/chats', { productId: newProduct.id }, tokenA);
    ok('不能和自己聊天', selfChat.status === 400);

    const chatRes = await api('POST', '/api/chats', { productId: newProduct.id }, tokenB);
    ok('会话创建成功', chatRes.status === 200 && !!chatRes.data.chat.id);
    const chatId = chatRes.data.chat.id;

    const textMsg = await api('POST', `/api/chats/${chatId}/messages`, { type: 'text', text: '这个还在吗？' }, tokenB);
    ok('发送文字消息', textMsg.status === 200 && textMsg.data.message.type === 'text');

    const quote = await api('POST', `/api/chats/${chatId}/messages`, { type: 'quote', price: 35 }, tokenB);
    ok('发送报价', quote.status === 200 && quote.data.message.price === 35);

    const selfAccept = await api('POST', `/api/chats/${chatId}/quotes/${quote.data.message.id}/respond`, { accept: true }, tokenB);
    ok('不能接受自己的报价', selfAccept.status === 400);

    const accepted = await api('POST', `/api/chats/${chatId}/quotes/${quote.data.message.id}/respond`, { accept: true }, tokenA);
    ok('卖家接受报价并建单', accepted.status === 200 && !!accepted.data.orderId);
    const orderId = accepted.data.orderId;

    const afterAccept = accepted.data.snapshot.products.find((p) => p.id === newProduct.id);
    ok('商品变为已预订', afterAccept.status === 'reserved');
    ok('订单金额为报价', accepted.data.snapshot.orders.find((o) => o.id === orderId).amount === 35);

    const dupQuote = await api('POST', `/api/chats/${chatId}/messages`, { type: 'quote', price: 30 }, tokenB);
    ok('进行中订单时不能再报价', dupQuote.status === 400);

    /* ---------------- 7 ---------------- */
    describe('[7] 付款与履约');
    const proofUpload = await api('POST', '/api/upload', { data: PNG_1PX }, tokenB);
    const proof = await api('POST', `/api/orders/${orderId}/proof`, { url: proofUpload.data.url }, tokenB);
    ok('买家上传凭证', proof.status === 200 && proof.data.order.status === 'pending_confirm');

    const payByBuyer = await api('POST', `/api/orders/${orderId}/confirm-payment`, {}, tokenB);
    ok('买家不能确认收款', payByBuyer.status === 403);

    const paid = await api('POST', `/api/orders/${orderId}/confirm-payment`, {}, tokenA);
    ok('卖家确认收款', paid.status === 200 && paid.data.order.status === 'pending_delivery');

    const buyerConfirm = await api('POST', `/api/orders/${orderId}/confirm-receipt`, {}, tokenB);
    ok('买家确认收货', buyerConfirm.status === 200 && buyerConfirm.data.order.buyerConfirmed === true);
    ok('单方确认后订单未完成', buyerConfirm.data.order.status === 'pending_delivery');

    const sellerConfirm = await api('POST', `/api/orders/${orderId}/confirm-receipt`, {}, tokenA);
    ok('双方确认后订单完成', sellerConfirm.data.order.status === 'completed');
    ok('商品自动变为已售出', sellerConfirm.data.snapshot.products.find((p) => p.id === newProduct.id).status === 'sold');

    /* ---------------- 8 ---------------- */
    describe('[8] 立即购买');
    const p2 = await api(
      'POST',
      '/api/products',
      { title: '立即购买测试 · 高数教材', price: 18, category: '图书教材', condition: '八成新', desc: 'buy now', images: [imgUrl], delivery: ['校内面交'] },
      tokenA
    );
    const pid2 = p2.data.product.id;

    const selfBuy = await api('POST', `/api/products/${pid2}/buy`, {}, tokenA);
    ok('不能购买自己的商品', selfBuy.status === 400);

    const buy = await api('POST', `/api/products/${pid2}/buy`, {}, tokenB);
    ok('按标价下单成功', buy.status === 200 && !!buy.data.orderId);
    const buyOrder = buy.data.snapshot.orders.find((o) => o.id === buy.data.orderId);
    ok('订单金额等于标价', buyOrder.amount === 18);
    ok('商品被锁定为已预订', buy.data.snapshot.products.find((p) => p.id === pid2).status === 'reserved');
    ok('自动生成会话消息', buy.data.snapshot.chats.some((c) => c.id === buyOrder.chatId));

    /* ---------------- 9 ---------------- */
    describe('[9] 取消与超时');
    const cancel = await api('POST', `/api/orders/${buy.data.orderId}/cancel`, {}, tokenB);
    ok('买家取消订单', cancel.status === 200 && cancel.data.order.status === 'cancelled');
    ok('商品回到在售', cancel.data.snapshot.products.find((p) => p.id === pid2).status === 'on_sale');

    const tick = server.domain.tick();
    ok('超时补偿可调用', typeof tick === 'number');

    /* ---------------- 10 ---------------- */
    describe('[10] 权限与边界');
    const otherEdit = await api('PATCH', `/api/products/${pid2}`, { title: '别人改的标题' }, tokenB);
    ok('不能编辑他人商品', otherEdit.status === 403);

    const resold = await api('POST', `/api/products/${newProduct.id}/buy`, {}, tokenB);
    ok('已售出商品不能再买', resold.status === 400);

    const offline = await api('POST', `/api/products/${pid2}/buy`, {}, 'invalid-token');
    ok('无效令牌被拒绝', offline.status === 401);

    /* ---------------- 11 ---------------- */
    describe('[11] 数据持久化');
    const before = (await api('GET', '/api/snapshot', undefined, tokenA)).data.products.length;
    ok('服务端已落库', before >= 14);
  } catch (e) {
    fail++;
    console.error('\n测试执行异常：', e);
  } finally {
    server.close();
    try {
      server.db && server.db.close();
    } catch (e) {}
    ['', '-wal', '-shm'].forEach((s) => {
      const f = dbFile + s;
      if (fs.existsSync(f)) fs.unlinkSync(f);
    });
  }

  console.log('\n' + '='.repeat(46));
  console.log(`  ${pass} passed, ${fail} failed`);
  console.log('='.repeat(46) + '\n');
  process.exit(fail ? 1 : 0);
})();
