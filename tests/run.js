/**
 * 业务与渲染回归测试
 * 运行：npm test   （或 node tests/run.js）
 *
 * 覆盖：商品查询 → 收藏/降价提醒 → 议价下单 → 收款凭证 → 交货确认
 *       → 超时取消 → 手动取消 → 发布编辑 → 全页面渲染 → 状态机渲染
 */
const { installStubs, loadApp, describe, ok, summary } = require('./harness');

installStubs();
const CFM = loadApp();
const S = CFM.store;

/* ---------------- 1 ---------------- */
describe('[1] 种子数据');
S.load();
ok('数据库加载成功', !!S.me());
ok('当前用户为林小满', S.me() && S.me().nick === '林小满');
ok('演示商品不少于 12 件', S.db.products.length >= 12);
ok('演示会话不少于 3 个', S.db.chats.length >= 3);

/* ---------------- 2 ---------------- */
describe('[2] 商品查询：分类 / 搜索 / 排序');
ok(
  '分类筛选只返回该分类',
  S.products({ category: '图书教材', status: ['on_sale'] }).every((p) => p.category === '图书教材')
);
ok('关键词可命中标题或描述', S.products({ q: '台灯' }).length >= 1);
const asc = S.products({ sort: '价格↑' });
ok('价格升序有效', asc[0].price <= asc[asc.length - 1].price);
ok(
  '首页列表不含已售出',
  S.products({ status: ['on_sale', 'reserved'] }).every((p) => p.status !== 'sold')
);

/* ---------------- 3 ---------------- */
describe('[3] 收藏与降价提醒');
S.toggleFav('p_mouse');
ok('收藏成功', S.isFav('p_mouse'));
S.switchUser('u_chen');
S.updateProduct('p_mouse', { price: 55 }); // 卖家降价
S.switchUser('u_me');
const drops = S.notices().filter((n) => n.type === 'price_drop');
ok('降价生成通知', drops.some((n) => n.productId === 'p_mouse' && n.text.indexOf('¥55') >= 0));
ok('收藏时记录了历史价格', S.favList().some((x) => x.product.id === 'p_mouse' && x.fav.priceAtFav === 65));

/* ---------------- 4 ---------------- */
describe('[4] 议价与下单');
const chat = S.ensureChat('p_math');
ok('会话按「商品 + 买家」唯一', !!chat && chat.buyerId === 'u_me' && chat.sellerId === 'u_zhang');
const quote = S.sendQuote(chat.id, 20, '书我有旧版了，20 可以吗');
ok('报价以 pending 状态入栈', quote && quote.type === 'quote' && quote.status === 'pending');

S.switchUser('u_zhang');
const order = S.respondQuote(chat.id, quote.id, true);
ok('接受报价生成订单', !!order && order.amount === 20 && order.status === 'pending_pay');
ok('商品自动变为已预订', S.product('p_math').status === 'reserved');
ok('聊天内出现订单卡片', S.chat(chat.id).messages.some((m) => m.type === 'order'));

/* ---------------- 5 ---------------- */
describe('[5] 收款码与支付凭证');
S.sendQR(chat.id);
ok('收款码消息入栈', S.chat(chat.id).messages.some((m) => m.type === 'qr'));

S.switchUser('u_me');
ok('买家上传凭证成功', S.uploadProof(order.id, 'data:image/jpeg;base64,AAA'));
ok('订单流转到待确认收款', S.order(order.id).status === 'pending_confirm');
ok('卖家收到待确认通知', S.db.notices.some((n) => n.userId === 'u_zhang' && n.orderId === order.id));

S.switchUser('u_zhang');
ok('卖家确认收款', S.confirmPayment(order.id) && S.order(order.id).status === 'pending_delivery');

/* ---------------- 6 ---------------- */
describe('[6] 交货与双方确认');
S.sendDelivery(chat.id, { delivery: '校内面交', location: '图书馆一楼', time: '11 月 14 日 18:30' });
ok('交货信息回写到订单', S.order(order.id).location === '图书馆一楼');
ok('卖家确认交付', S.confirmReceipt(order.id) && S.order(order.id).sellerConfirmed);
ok('仅一方确认时订单未完成', S.order(order.id).status === 'pending_delivery');

S.switchUser('u_me');
ok('买家确认收货', S.confirmReceipt(order.id));
ok('双方确认后订单完成', S.order(order.id).status === 'completed');
ok('商品自动变为已售出', S.product('p_math').status === 'sold');

/* ---------------- 7 ---------------- */
describe('[7] 预订超时自动取消');
S.switchUser('u_me');
const c2 = S.ensureChat('p_ukulele');
const q2 = S.sendQuote(c2.id, 70);
S.switchUser('u_su');
const o2 = S.respondQuote(c2.id, q2.id, true);
o2.expiresAt = Date.now() - 1000;
ok('订单生成后商品被锁定', S.product('p_ukulele').status === 'reserved');
ok('tick 触发超时取消', S.tick() && S.order(o2.id).status === 'cancelled');
ok('商品回到在售', S.product('p_ukulele').status === 'on_sale');

/* ---------------- 8 ---------------- */
describe('[8] 主动取消订单');
S.switchUser('u_me');
const c3 = S.ensureChat('p_badminton');
const q3 = S.sendQuote(c3.id, 100);
S.switchUser('u_zhang');
const o3 = S.respondQuote(c3.id, q3.id, true);
ok('订单创建成功', o3.status === 'pending_pay');
S.cancelOrder(o3.id, '买家临时不要了');
ok('订单状态变为已取消', S.order(o3.id).status === 'cancelled');
ok('商品重新回到在售', S.product('p_badminton').status === 'on_sale');

/* ---------------- 9 ---------------- */
describe('[9] 发布 / 编辑 / 上下架');
S.switchUser('u_me');
const before = S.db.products.length;
const np = S.createProduct({
  title: '测试商品 九成新',
  price: 12,
  category: '其他',
  condition: '九成新',
  desc: '测试',
  images: ['x'],
  delivery: ['校内面交'],
});
ok('发布成功且默认在售', S.db.products.length === before + 1 && np.status === 'on_sale');
S.updateProduct(np.id, { title: '测试商品（改名）', price: 10 });
ok('编辑生效', S.product(np.id).title === '测试商品（改名）' && S.product(np.id).price === 10);
S.setProductStatus(np.id, 'off');
ok('下架生效', S.product(np.id).status === 'off');

/* ---------------- 10 ---------------- */
describe('[10] 页面渲染');
const renders = [
  ['auth 登录页', () => CFM.pages.auth.render({})],
  ['home 首页', () => CFM.pages.home.render({})],
  ['detail 商品详情', () => CFM.pages.detail.render({ id: 'p_mouse' })],
  ['detail 自己的商品', () => CFM.pages.detail.render({ id: 'p_mine1' })],
  ['publish 发布页', () => {
    CFM.pages.publish.render({});
    return CFM.pages.publish.render({});
  }],
  ['publish 编辑模式', () => CFM.pages.publish.render({ id: 'p_mine1' })],
  ['messages 会话列表', () => CFM.pages.messages.render({})],
  ['messages 聊天（含各类卡片）', () => CFM.pages.messages.render({ id: S.chatsOf()[0].id })],
  ['order 已完成订单', () => CFM.pages.order.render({ id: 'o_demo1' })],
  ['order 待付款订单', () => CFM.pages.order.render({ id: o2.id })],
  ['order 待确认收款（含凭证）', () => CFM.pages.order.render({ id: 'o_demo2' })],
  ['mine 我的', () => CFM.pages.mine.render({})],
  ['favorites 收藏', () => CFM.pages.favorites.render({})],
  ['notices 通知', () => CFM.pages.notices.render({})],
  ['qrcode 收款码', () => CFM.pages.qrcode.render({})],
  ['profile 他人主页', () => CFM.pages.profile.render({ id: 'u_chen' })],
];
renders.forEach(([name, fn]) => {
  let html = '';
  let err = null;
  try {
    html = fn();
  } catch (e) {
    err = e;
  }
  ok(`${name}${err ? ' → ' + err.message : ''}`, !err && typeof html === 'string' && html.length > 30);
});

/* ---------------- 11 ---------------- */
describe('[11] 订单状态机渲染覆盖');
['pending_pay', 'pending_confirm', 'pending_delivery', 'completed', 'cancelled'].forEach((st) => {
  const o = S.db.orders[0];
  const backup = o.status;
  o.status = st;
  let html = '';
  let err = null;
  try {
    html = CFM.pages.order.render({ id: o.id });
  } catch (e) {
    err = e;
  }
  o.status = backup;
  ok(`状态 ${st} 可正常渲染`, !err && /class="btn|steps/.test(html));
  if (st === 'pending_delivery' || st === 'completed') {
    ok(`  └ 展示双方确认区块`, html.indexOf('confirm-row') > 0);
  }
});

/* ---------------- 12 ---------------- */
describe('[12] 未读与已读');
S.switchUser('u_zhang');
ok('卖家存在未读消息', S.unreadTotal() > 0);
const cc = S.chatsOf()[0];
S.markRead(cc.id);
ok('进入会话后未读清零', (S.chat(cc.id).unread['u_zhang'] || 0) === 0);

/* ---------------- 13 ---------------- */
describe('[13] 埋点与漏斗');
const A = CFM.analytics;
S.bumpView('p_mouse');
ok('详情曝光事件已记录', A.count('product_view') >= 1);
ok(
  '交易全链路事件齐全',
  ['quote_sent', 'order_created', 'proof_uploaded', 'payment_confirmed', 'order_completed'].every(
    (k) => A.count(k) >= 1
  )
);
ok('取消/超时事件已记录', A.count('order_cancelled') >= 1 && A.count('order_expired') >= 1);
const rows = A.funnel();
ok('漏斗返回 7 个环节', rows.length === 7);
ok('漏斗首环节为曝光', rows[0].事件 === 'product_view');
A.track('not_registered_event', { foo: 1 });
ok('未注册事件被丢弃', A.count('not_registered_event') === 0);
const pub = A.all().find((e) => e.e === 'order_created');
ok('事件带会话与用户标识', !!pub && !!pub.s && !!pub.u);

process.exit(summary() ? 0 : 1);
