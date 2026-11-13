/**
 * 初始演示数据
 * 直接运行 `node server/seed.js` 可重置数据库
 */
const { makeSalt, hashPassword } = require('./auth');
const { pic, avatarPic, proofPic, makeQR } = require('../shared/placeholder');

const H = 3600e3;
const DEMO_PWD = '123456';

function insertUser(db, u) {
  const salt = makeSalt();
  db.run(
    `INSERT INTO users (id, nick, phone, pwd, salt, school, campus, major, student_no, verified, avatar, qr_image, bio, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      u.id,
      u.nick,
      u.phone,
      hashPassword(DEMO_PWD, salt),
      salt,
      u.school,
      u.campus,
      u.major,
      u.studentNo || '',
      u.verified ? 1 : 0,
      u.avatar,
      null,
      u.bio || '',
      u.createdAt,
    ]
  );
}

function run(db) {
  const now = Date.now();

  /* ---------------- 用户 ---------------- */
  const users = [
    {
      id: 'u_me',
      nick: '林小满',
      phone: '13800138000',
      school: '湖南大学',
      campus: '南校区',
      major: '人工智能',
      studentNo: '2023****1024',
      verified: true,
      avatar: avatarPic('🌿', '#DFF3E4', '#B9E3C6'),
      bio: '毕业清仓中，东西都是自用的',
      createdAt: now - 40 * 24 * H,
    },
    {
      id: 'u_chen',
      nick: '陈一鸣',
      phone: '13900139001',
      school: '湖南大学',
      campus: '南校区',
      major: '计算机科学与技术',
      studentNo: '2021****0388',
      verified: true,
      avatar: avatarPic('🐳', '#DCE7F5', '#B9CDE8'),
      bio: '搬宿舍，能出就出',
      createdAt: now - 200 * 24 * H,
    },
    {
      id: 'u_su',
      nick: '苏晚',
      phone: '13700137002',
      school: '湖南大学',
      campus: '北校区',
      major: '视觉传达',
      studentNo: '2022****0771',
      verified: true,
      avatar: avatarPic('🎀', '#F7E1E8', '#EBC2D2'),
      bio: '衣服都是自己穿的，尺码都标了',
      createdAt: now - 120 * 24 * H,
    },
    {
      id: 'u_zhang',
      nick: '张野',
      phone: '13600136003',
      school: '湖南大学',
      campus: '南校区',
      major: '土木工程',
      studentNo: '2021****0512',
      verified: false,
      avatar: avatarPic('🏀', '#EFE6D6', '#D9C6A6'),
      bio: '只做面交，不放鸽子',
      createdAt: now - 60 * 24 * H,
    },
  ];
  users.forEach((u) => insertUser(db, u));

  /* ---------------- 商品 ---------------- */
  const D = ['校内面交', '宿舍楼下'];
  const products = [
    ['p_mouse', 'u_chen', '罗技 G102 二代 游戏鼠标 白色', 65, 129, '数码电子', '九成新',
      '大一下买的，用了半年多，一直很爱惜。\n左右键手感正常，滚轮不跳，RGB 灯还是好的。\n换了无线鼠标所以出，带原装盒子和数据线。',
      [pic('🖱️', '#DCE7F5', '#AFC5E2'), pic('🖱️', '#E7EEF8', '#C3D5EC')], 0.86, ['校内面交', '宿舍楼下'], 'on_sale', 148, now - 2.2 * H],
    ['p_math', 'u_zhang', '高等数学 同济第七版 上下册 + 同步辅导', 25, 78, '图书教材', '八成新',
      '上册有笔记（都是重点），下册几乎是新的。\n没有缺页、没有泡水，书角有一点卷。\n送一本习题全解，考研也能用。',
      [pic('📚', '#F3E4D2', '#DCC0A0'), pic('📖', '#F6EBDC', '#E3CBAF')], 1.12, D, 'on_sale', 96, now - 5 * H],
    ['p_fridge', 'u_chen', '桌面迷你小冰箱 6L 静音款', 120, 259, '宿舍好物', '九成新',
      '宿舍放护肤品和饮料刚好，制冷正常，声音很小不吵室友。\n毕业带不走了，20 号楼自提，可以帮忙搬下楼。',
      [pic('🧊', '#E2EEF0', '#BCD6DC')], 0.78, ['自提', '宿舍楼下'], 'on_sale', 213, now - 9 * H],
    ['p_bike', 'u_zhang', '捷安特 ATX 通勤自行车 26 寸', 380, 1280, '运动户外', '八成新',
      '骑了两年，上个月刚换的新链条和刹车皮，车况很好。\n车锁、车筐、后座都送。',
      [pic('🚲', '#E9E7DE', '#C9C5AF'), pic('🚲', '#EFEEE6', '#D3CFBA')], 0.94, D, 'on_sale', 402, now - 26 * H],
    ['p_skirt', 'u_su', '明制马面裙 藏青色 M 码 只穿过一次', 99, 268, '服饰鞋包', '几乎全新',
      '去年校庆买的，只穿过一次拍照，之后一直挂在衣柜里。\nM 码，腰围 68，长 96，身高 160-168 都能穿。',
      [pic('👗', '#F0E1E7', '#D6BCC9'), pic('🧵', '#F5E9EE', '#DEC7D2')], 1.18, D, 'on_sale', 318, now - 31 * H],
    ['p_kaoyan', 'u_chen', '考研英语一 黄皮书真题 + 恋练有词', 30, 96, '图书教材', '九成新',
      '今年刚考完，真题只做了前 5 套，后面的都是空白的。\n单词书背到第 20 单元，有铅笔勾画，可以擦掉。',
      [pic('📕', '#EDE8DB', '#D2C7AE')], 0.82, D, 'on_sale', 87, now - 48 * H],
    ['p_lamp', 'u_chen', '护眼台灯 三档调光 USB 供电', 35, 89, '宿舍好物', '九成新',
      '三档亮度，暖光和白光都有，晚上熄灯后看书不刺眼。\nUSB 供电，接充电宝也能用。',
      [pic('💡', '#F7EFD8', '#E7D5A0')], 1.0, D, 'reserved', 176, now - 54 * H],
    ['p_ukulele', 'u_su', '尤克里里 23 寸 单板 附琴包', 80, 218, '文体乐器', '八成新',
      '大一社团招新时买的，学会了几首歌就吃灰了。\n音准正常，弦是今年换的新弦。送琴包、变调夹、拨片。',
      [pic('🎸', '#F0E3D4', '#D4BBA0'), pic('🎵', '#F7EDE1', '#DFCCB4')], 0.88, D, 'on_sale', 129, now - 70 * H],
    ['p_chair', 'u_zhang', '人体工学电竞椅 网布透气款', 160, 499, '宿舍好物', '八成新',
      '宿舍桌子配的椅子太硬，自己买的。腰托和头枕都在。\n网布没有破损，气杆正常，无杂音。自提。',
      [pic('🪑', '#E6E8EC', '#C3C9D4')], 1.05, ['自提'], 'on_sale', 265, now - 90 * H],
    ['p_ipad', 'u_su', 'iPad 保护壳 + Apple Pencil 替换笔尖', 20, 68, '数码电子', '九成新',
      '壳是 10.2 寸的，带笔槽和休眠唤醒，只用了两个月就换平板了。\n笔尖是原装的一盒 4 个，还剩 3 个。',
      [pic('📱', '#E3E6EA', '#C0C7D1')], 0.74, ['校内面交'], 'on_sale', 58, now - 100 * H],
    ['p_band', 'u_chen', '小米手环 7 NFC 版 黑色', 85, 279, '数码电子', '九成新',
      '换表了所以出，屏幕没有划痕，电池健康正常，能用 10 天左右。\nNFC 刷门禁很稳，充电线和原装表带都在。',
      [pic('⌚', '#EBE3F0', '#CDC0DA')], 0.96, D, 'on_sale', 191, now - 120 * H],
    ['p_badminton', 'u_zhang', '尤尼克斯 羽毛球拍 双拍套装', 110, 320, '运动户外', '八成新',
      '两支一起出，都重新拉过线（24 磅）。\n拍框有小磕碰不影响使用，握把重新缠过。送两个拍套和 3 个球。',
      [pic('🏸', '#E3EFE4', '#BFD9C3')], 1.14, D, 'on_sale', 143, now - 140 * H],
    ['p_mine1', 'u_me', '考研政治 徐涛核心考案 + 1000 题', 28, 88, '图书教材', '九成新',
      '今年 12 月刚考完，1000 题只做了选择题前半部分。\n核心考案有荧光笔标记，都是常考的点。',
      [pic('📗', '#E6EFE2', '#C4DCC0')], 0.9, ['宿舍楼下'], 'on_sale', 42, now - 12 * H],
    ['p_mine2', 'u_me', '宿舍收纳箱 三件套 可折叠', 22, 69, '宿舍好物', '八成新',
      '搬宿舍买的，用了一学期。可折叠不占地方。\n三件一起出，颜色是灰的。',
      [pic('📦', '#EDEAE2', '#D2CCBC')], 1.0, ['宿舍楼下'], 'on_sale', 31, now - 20 * H],
    ['p_sold1', 'u_me', 'AirPods 2 代 充电盒（不含耳机）', 45, 199, '数码电子', '七成新',
      '耳机丢了，只剩盒子和线。充电正常。',
      [pic('🎧', '#E9ECEF', '#C7CDD6')], 0.8, D, 'sold', 233, now - 8 * 24 * H],
    ['p_off1', 'u_me', '机械键盘 87 键 青轴（已下架）', 130, null, '数码电子', '八成新',
      '青轴太吵被室友投诉了，先下架。',
      [pic('⌨️', '#E7EAEE', '#C6CCD5')], 1.06, D, 'off', 402, now - 10 * 24 * H],
  ];

  products.forEach((p) => {
    db.run(
      `INSERT INTO products (id, seller_id, title, price, orig_price, category, condition, description, images, ratio, delivery, status, views, created_at, sold_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], JSON.stringify(p[8]), p[9], JSON.stringify(p[10]), p[11], p[12], p[13],
        p[11] === 'sold' ? now - 3 * 24 * H : null]
    );
  });

  /* ---------------- 会话 ---------------- */
  const chats = [
    ['c_demo1', 'p_lamp', 'u_me', 'u_chen', now - 3 * H, now - 2.58 * H],
    ['c_demo2', 'p_skirt', 'u_me', 'u_su', now - 26 * H, now - 25.5 * H],
    ['c_demo3', 'p_bike', 'u_me', 'u_zhang', now - 70 * H, now - 67 * H],
  ];
  chats.forEach((c) =>
    db.run('INSERT INTO chats (id, product_id, buyer_id, seller_id, created_at, last_ts) VALUES (?,?,?,?,?,?)', c)
  );

  const msg = (chatId, from, type, payload, ts) =>
    db.run('INSERT INTO messages (id, chat_id, from_id, type, payload, ts) VALUES (?,?,?,?,?,?)', [
      'm_' + Math.random().toString(36).slice(2, 10),
      chatId,
      from,
      type,
      JSON.stringify(payload),
      ts,
    ]);

  // 台灯：完整卡片流，订单处于「待确认收款」
  msg('c_demo1', 'u_me', 'text', { text: '你好，台灯还在吗？夹床头的那个夹子确定还在吧？' }, now - 3 * H);
  msg('c_demo1', 'u_chen', 'text', { text: '在的，夹子、充电线都在。今晚我都在宿舍，可以来 9 栋楼下看货。' }, now - 2.95 * H);
  msg('c_demo1', 'u_me', 'quote', { price: 30, note: '30 可以吗，今天就能来拿', status: 'accepted' }, now - 2.9 * H);
  msg('c_demo1', null, 'system', { text: '卖家接受报价 ¥30，订单已生成（待付款）' }, now - 2.88 * H);
  msg('c_demo1', 'u_chen', 'order', { orderId: 'o_demo2' }, now - 2.88 * H);
  msg('c_demo1', 'u_chen', 'text', { text: '那你今晚 8 点来 9 栋楼下，我带下去给你试一下亮度。' }, now - 2.8 * H);
  msg('c_demo1', 'u_chen', 'delivery', { delivery: '校内面交', location: '南校区 9 栋宿舍楼下', time: '11 月 13 日 20:00' }, now - 2.79 * H);
  msg('c_demo1', 'u_chen', 'qr', { image: makeQR('u_chen-qr', '#17181A'), amount: 30, orderId: 'o_demo2' }, now - 2.7 * H);
  msg('c_demo1', 'u_me', 'text', { text: '转好啦，你看下截图 👇' }, now - 2.6 * H);
  msg('c_demo1', 'u_me', 'proof', { image: proofPic(30), orderId: 'o_demo2' }, now - 2.59 * H);
  msg('c_demo1', null, 'system', { text: '买家已上传支付凭证，等待卖家确认收款' }, now - 2.58 * H);

  // 马面裙：纯聊天
  msg('c_demo2', 'u_me', 'text', { text: '马面裙还在吗？我身高 163，穿 M 会不会短？' }, now - 26 * H);
  msg('c_demo2', 'u_su', 'text', { text: '163 穿刚好到脚踝上面一点，不短的～我 165 也穿过一次' }, now - 25.8 * H);
  msg('c_demo2', 'u_su', 'text', { text: '裙门有一点折痕，熨一下就好，可以先来看实物再决定' }, now - 25.5 * H);

  // 自行车：一来一回的还价
  msg('c_demo3', 'u_me', 'text', { text: '车锁和车筐都还在吧？周末能约看车吗' }, now - 70 * H);
  msg('c_demo3', 'u_zhang', 'text', { text: '都在，周日下午我在操场那边，到了给我发消息' }, now - 68 * H);
  msg('c_demo3', 'u_me', 'quote', { price: 300, note: '300 我今天就能来骑走', status: 'rejected' }, now - 67.6 * H);
  msg('c_demo3', 'u_zhang', 'quote', { price: 350, note: '300 有点低了，350 你直接骑走，车锁车筐都送你', status: 'pending' }, now - 67 * H);

  /* ---------------- 已读位置 ---------------- */
  const reads = [
    ['c_demo1', 'u_me', now - 2.5 * H],
    ['c_demo1', 'u_chen', now - 2.6 * H],
    ['c_demo2', 'u_me', now - 27 * H],
    ['c_demo2', 'u_su', now - 25 * H],
    ['c_demo3', 'u_me', now - 67.5 * H],
    ['c_demo3', 'u_zhang', now - 66 * H],
  ];
  reads.forEach((r) => db.run('INSERT INTO chat_reads (chat_id, user_id, last_read_at) VALUES (?,?,?)', r));

  /* ---------------- 订单 ---------------- */
  db.run(
    `INSERT INTO orders (id, no, product_id, chat_id, buyer_id, seller_id, amount, delivery, location, time, status, created_at, expires_at, buyer_confirmed, seller_confirmed, proof, cancel_reason, timeline)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      'o_demo2', 'FM202611130207', 'p_lamp', 'c_demo1', 'u_me', 'u_chen', 30, '校内面交', '南校区 9 栋宿舍楼下', '11 月 13 日 20:00',
      'pending_confirm', now - 2.88 * H, now - 2.88 * H + 15 * 60e3, 0, 0, proofPic(30), null,
      JSON.stringify([
        { t: now - 2.9 * H, text: '买家出价，卖家接受，订单生成' },
        { t: now - 2.79 * H, text: '双方确认交货信息：校内面交 · 南校区 9 栋宿舍楼下' },
        { t: now - 2.59 * H, text: '买家已上传支付凭证' },
      ]),
    ]
  );

  db.run(
    `INSERT INTO orders (id, no, product_id, chat_id, buyer_id, seller_id, amount, delivery, location, time, status, created_at, expires_at, buyer_confirmed, seller_confirmed, proof, cancel_reason, timeline)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      'o_demo1', 'FM202611100231', 'p_sold1', null, 'u_su', 'u_me', 45, '校内面交', '南校区 图书馆一楼大厅', '11 月 10 日 19:00',
      'completed', now - 3 * 24 * H, now - 3 * 24 * H + 15 * 60e3, 1, 1, null, null,
      JSON.stringify([
        { t: now - 3 * 24 * H, text: '买家出价，卖家接受，订单生成' },
        { t: now - 3 * 24 * H + 8 * 60e3, text: '买家已上传支付凭证' },
        { t: now - 3 * 24 * H + 12 * 60e3, text: '卖家已确认收款，等待线下交货' },
        { t: now - 3 * 24 * H + 55 * 60e3, text: '双方确认完成，交易结束' },
      ]),
    ]
  );

  /* ---------------- 收藏与通知 ---------------- */
  db.run('INSERT INTO favorites (user_id, product_id, price_at_fav, ts) VALUES (?,?,?,?)', ['u_me', 'p_bike', 420, now - 20 * H]);
  db.run(
    'INSERT INTO notices (id, user_id, type, title, text, product_id, order_id, ts, "read") VALUES (?,?,?,?,?,?,?,?,0)',
    ['n_demo1', 'u_me', 'price_drop', '收藏的商品降价了', '「捷安特 ATX 通勤自行车 26 寸」从 ¥420 降到 ¥380', 'p_bike', null, now - 6 * H]
  );
}

module.exports = { run, DEMO_PWD };

if (require.main === module) {
  const { open } = require('./db');
  const db = open();
  db.tx(() => {
    ['sessions', 'notices', 'orders', 'messages', 'chat_reads', 'chats', 'favorites', 'products', 'users'].forEach((t) =>
      db.run('DELETE FROM ' + t)
    );
    run(db);
  });
  db.bump();
  console.log('演示数据已写入：' + db.get('SELECT COUNT(*) AS n FROM products').n + ' 件商品');
  db.close();
}
