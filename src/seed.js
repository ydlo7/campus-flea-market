/* ===== seed.js · 演示数据 ===== */
(function () {
  const CFM = window.CFM;
  const H = 3600e3;

  /** 把颜色往白色里调淡，让占位图更干净 */
  function mix(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const f = (v) => Math.round(v + (255 - v) * k);
    return `rgb(${f(r)},${f(g)},${f(b)})`;
  }

  /** 生成一张浅色底 + emoji 的占位商品图（data URI，体积极小） */
  function pic(emoji, c1, c2) {
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="${mix(c1, 0.62)}"/><stop offset="1" stop-color="${mix(c2, 0.78)}"/></linearGradient></defs>` +
      `<rect width="640" height="640" fill="url(#g)"/>` +
      `<circle cx="512" cy="128" r="150" fill="#ffffff" opacity="0.5"/>` +
      `<text x="320" y="348" font-size="158" text-anchor="middle" dominant-baseline="middle">${emoji}</text>` +
      `</svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  /** 生成一个「像二维码」的图形（用于收款码演示） */
  function makeQR(seedText, color) {
    let seed = 0;
    const str = String(seedText || 'campus-flea');
    for (let i = 0; i < str.length; i++) seed = (seed * 31 + str.charCodeAt(i)) % 99991;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const N = 25, S = 12, M = 2;
    const size = N * S + M * 2;
    let cells = '';
    const finder = (ox, oy) => {
      let s = '';
      s += `<rect x="${ox * S + M}" y="${oy * S + M}" width="${7 * S}" height="${7 * S}" fill="${color}"/>`;
      s += `<rect x="${(ox + 1) * S + M}" y="${(oy + 1) * S + M}" width="${5 * S}" height="${5 * S}" fill="#fff"/>`;
      s += `<rect x="${(ox + 2) * S + M}" y="${(oy + 2) * S + M}" width="${3 * S}" height="${3 * S}" fill="${color}"/>`;
      return s;
    };
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const inFinder =
          (x < 8 && y < 8) || (x > N - 9 && y < 8) || (x < 8 && y > N - 9);
        if (inFinder) continue;
        if (rnd() > 0.52) {
          cells += `<rect x="${x * S + M}" y="${y * S + M}" width="${S}" height="${S}" fill="${color}"/>`;
        }
      }
    }
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
      `<rect width="${size}" height="${size}" fill="#ffffff"/>${cells}` +
      finder(0, 0) + finder(N - 7, 0) + finder(0, N - 7) + `</svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  /** 生成一张「支付成功」截图效果，用作支付凭证演示 */
  function proofPic(amount) {
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="620" viewBox="0 0 420 620">` +
      `<rect width="420" height="620" fill="#F3F4F6"/>` +
      `<rect x="18" y="70" width="384" height="470" rx="22" fill="#ffffff"/>` +
      `<circle cx="210" cy="180" r="42" fill="#0FAE6E"/>` +
      `<path d="M190 180l14 14 28-30" stroke="#fff" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<text x="210" y="268" font-size="30" font-weight="700" text-anchor="middle" fill="#1B1C1F" font-family="PingFang SC,Microsoft YaHei,sans-serif">支付成功</text>` +
      `<text x="210" y="330" font-size="52" font-weight="800" text-anchor="middle" fill="#1B1C1F" font-family="PingFang SC,Microsoft YaHei,sans-serif">¥${amount}</text>` +
      `<line x1="56" y1="372" x2="364" y2="372" stroke="#ECECEF" stroke-width="2"/>` +
      `<text x="56" y="412" font-size="19" fill="#9AA0A8" font-family="PingFang SC,Microsoft YaHei,sans-serif">当前状态</text>` +
      `<text x="364" y="412" font-size="19" fill="#5C6169" text-anchor="end" font-family="PingFang SC,Microsoft YaHei,sans-serif">支付成功</text>` +
      `<text x="56" y="458" font-size="19" fill="#9AA0A8" font-family="PingFang SC,Microsoft YaHei,sans-serif">转账说明</text>` +
      `<text x="364" y="458" font-size="19" fill="#5C6169" text-anchor="end" font-family="PingFang SC,Microsoft YaHei,sans-serif">二手闲置</text>` +
      `<text x="210" y="500" font-size="16" fill="#C3C7CD" text-anchor="middle" font-family="PingFang SC,Microsoft YaHei,sans-serif">模拟凭证 · 演示数据</text>` +
      `<text x="210" y="592" font-size="17" fill="#B7BBC1" text-anchor="middle" font-family="PingFang SC,Microsoft YaHei,sans-serif">微信支付</text>` +
      `</svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function avatarPic(emoji, c1, c2) {
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160">` +
      `<defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>` +
      `<rect width="160" height="160" fill="url(#a)"/>` +
      `<text x="80" y="92" font-size="82" text-anchor="middle" dominant-baseline="middle">${emoji}</text>` +
      `</svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  CFM.pic = pic;
  CFM.makeQR = makeQR;
  CFM.proofPic = proofPic;
  CFM.avatarPic = avatarPic;

  CFM.seed = function () {
    const now = Date.now();

    const users = [
      {
        id: 'u_me',
        nick: '林小满',
        phone: '13800138000',
        pwd: '123456',
        school: '湖南大学',
        campus: '南校区',
        major: '人工智能',
        studentNo: '2023****1024',
        verified: true,
        avatar: avatarPic('🌿', '#DFF3E4', '#B9E3C6'),
        qrImage: null,
        bio: '毕业清仓中，东西都是自用的',
        createdAt: now - 40 * 24 * H,
      },
      {
        id: 'u_chen',
        nick: '陈一鸣',
        phone: '13900139001',
        pwd: '123456',
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
        pwd: '123456',
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
        pwd: '123456',
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

    const D = ['校内面交', '宿舍楼下', '快递邮寄'];
    const mk = (o) => Object.assign({ status: 'on_sale', views: 0, delivery: D, createdAt: now - 3 * H }, o);

    const products = [
      mk({
        id: 'p_mouse',
        sellerId: 'u_chen',
        title: '罗技 G102 二代 游戏鼠标 白色',
        price: 65,
        origPrice: 129,
        category: '数码电子',
        condition: '九成新',
        desc: '大一下买的，用了半年多，一直很爱惜。\n左右键手感正常，滚轮不跳，RGB 灯还是好的。\n换了无线鼠标所以出，带原装盒子和数据线。\n南校可以当面看货，试好了再付钱。',
        images: [pic('🖱️', '#DCE7F5', '#AFC5E2'), pic('🖱️', '#E7EEF8', '#C3D5EC')],
        ratio: 0.86,
        delivery: ['校内面交', '宿舍楼下'],
        createdAt: now - 2.2 * H,
        views: 148,
      }),
      mk({
        id: 'p_math',
        sellerId: 'u_zhang',
        title: '高等数学 同济第七版 上下册 + 同步辅导',
        price: 25,
        origPrice: 78,
        category: '图书教材',
        condition: '八成新',
        desc: '上册有笔记（都是重点，其实挺好用的），下册几乎是新的。\n没有缺页、没有泡水，书角有一点卷。\n送一本习题全解，考研也能用。',
        images: [pic('📚', '#F3E4D2', '#DCC0A0'), pic('📖', '#F6EBDC', '#E3CBAF')],
        ratio: 1.12,
        createdAt: now - 5 * H,
        views: 96,
      }),
      mk({
        id: 'p_fridge',
        sellerId: 'u_chen',
        title: '桌面迷你小冰箱 6L 静音款',
        price: 120,
        origPrice: 259,
        category: '宿舍好物',
        condition: '九成新',
        desc: '宿舍放护肤品和饮料刚好，制冷正常，声音很小不吵室友。\n毕业带不走了，20 号楼自提，可以帮忙搬下楼。\n箱说都在。',
        images: [pic('🧊', '#E2EEF0', '#BCD6DC')],
        ratio: 0.78,
        delivery: ['自提', '宿舍楼下'],
        createdAt: now - 9 * H,
        views: 213,
      }),
      mk({
        id: 'p_bike',
        sellerId: 'u_zhang',
        title: '捷安特 ATX 通勤自行车 26 寸',
        price: 380,
        origPrice: 1280,
        category: '运动户外',
        condition: '八成新',
        desc: '骑了两年，上个月刚换的新链条和刹车皮，车况很好。\n车锁、车筐、后座都送。\n南校操场附近的可以约看车，骑一圈再决定。',
        images: [pic('🚲', '#E9E7DE', '#C9C5AF'), pic('🚲', '#EFEEE6', '#D3CFBA')],
        ratio: 0.94,
        createdAt: now - 26 * H,
        views: 402,
      }),
      mk({
        id: 'p_skirt',
        sellerId: 'u_su',
        title: '明制马面裙 藏青色 M 码 只穿过一次',
        price: 99,
        origPrice: 268,
        category: '服饰鞋包',
        condition: '几乎全新',
        desc: '去年校庆买的，只穿过一次拍照，之后一直挂在衣柜里。\nM 码，腰围 68，长 96，身高 160-168 都能穿。\n已经洗过晾干，直接可以穿。',
        images: [pic('👗', '#F0E1E7', '#D6BCC9'), pic('🧵', '#F5E9EE', '#DEC7D2')],
        ratio: 1.18,
        createdAt: now - 31 * H,
        views: 318,
      }),
      mk({
        id: 'p_kaoyan',
        sellerId: 'u_chen',
        title: '考研英语一 黄皮书真题 + 恋练有词',
        price: 30,
        origPrice: 96,
        category: '图书教材',
        condition: '九成新',
        desc: '今年刚考完，真题只做了前 5 套，后面的都是空白的。\n单词书背到第 20 单元，有铅笔勾画，可以擦掉。\n一起打包出，不单卖。',
        images: [pic('📕', '#EDE8DB', '#D2C7AE')],
        ratio: 0.82,
        createdAt: now - 48 * H,
        views: 87,
      }),
      mk({
        id: 'p_lamp',
        sellerId: 'u_chen',
        title: '护眼台灯 三档调光 USB 供电',
        price: 35,
        origPrice: 89,
        category: '宿舍好物',
        condition: '九成新',
        desc: '三档亮度，暖光和白光都有，晚上熄灯后看书不刺眼。\nUSB 供电，接充电宝也能用。\n灯管没有发黄，夹床头的夹子也在。',
        images: [pic('💡', '#F7EFD8', '#E7D5A0')],
        ratio: 1.0,
        status: 'reserved',
        createdAt: now - 54 * H,
        views: 176,
      }),
      mk({
        id: 'p_ukulele',
        sellerId: 'u_su',
        title: '尤克里里 23 寸 单板 附琴包',
        price: 80,
        origPrice: 218,
        category: '文体乐器',
        condition: '八成新',
        desc: '大一社团招新时买的，学会了几首歌就吃灰了 😂\n音准正常，弦是今年换的新弦。\n送琴包、变调夹、拨片和一本章程谱。',
        images: [pic('🎸', '#F0E3D4', '#D4BBA0'), pic('🎵', '#F7EDE1', '#DFCCB4')],
        ratio: 0.88,
        createdAt: now - 70 * H,
        views: 129,
      }),
      mk({
        id: 'p_chair',
        sellerId: 'u_zhang',
        title: '人体工学电竞椅 网布透气款',
        price: 160,
        origPrice: 499,
        category: '宿舍好物',
        condition: '八成新',
        desc: '宿舍桌子配的椅子太硬，自己买的。腰托和头枕都在。\n网布没有破损，气杆正常，无杂音。\n自提，需要自己搬，5 楼没电梯（可帮抬）。',
        images: [pic('🪑', '#E6E8EC', '#C3C9D4')],
        ratio: 1.05,
        createdAt: now - 90 * H,
        views: 265,
      }),
      mk({
        id: 'p_ipad',
        sellerId: 'u_su',
        title: 'iPad 保护壳 + Apple Pencil 替换笔尖',
        price: 20,
        origPrice: 68,
        category: '数码电子',
        condition: '九成新',
        desc: '壳是 10.2 寸的，带笔槽和休眠唤醒，只用了两个月就换平板了。\n笔尖是原装的一盒 4 个，还剩 3 个。\n小东西，图书馆门口面交。',
        images: [pic('📱', '#E3E6EA', '#C0C7D1')],
        ratio: 0.74,
        createdAt: now - 100 * H,
        views: 58,
      }),
      mk({
        id: 'p_band',
        sellerId: 'u_chen',
        title: '小米手环 7 NFC 版 黑色',
        price: 85,
        origPrice: 279,
        category: '数码电子',
        condition: '九成新',
        desc: '换表了所以出，屏幕没有划痕，电池健康正常，能用 10 天左右。\nNFC 刷门禁很稳，充电线和原装表带都在。',
        images: [pic('⌚', '#EBE3F0', '#CDC0DA')],
        ratio: 0.96,
        createdAt: now - 120 * H,
        views: 191,
      }),
      mk({
        id: 'p_badminton',
        sellerId: 'u_zhang',
        title: '尤尼克斯 羽毛球拍 双拍套装',
        price: 110,
        origPrice: 320,
        category: '运动户外',
        condition: '八成新',
        desc: '两支一起出，都重新拉过线（24 磅）。\n拍框有小磕碰不影响使用，握把重新缠过。\n送两个拍套和 3 个球。',
        images: [pic('🏸', '#E3EFE4', '#BFD9C3')],
        ratio: 1.14,
        createdAt: now - 140 * H,
        views: 143,
      }),
      // 当前用户自己的商品
      mk({
        id: 'p_mine1',
        sellerId: 'u_me',
        title: '考研政治 徐涛核心考案 + 1000 题',
        price: 28,
        origPrice: 88,
        category: '图书教材',
        condition: '九成新',
        desc: '今年 12 月刚考完，1000 题只做了选择题前半部分。\n核心考案有荧光笔标记，都是常考的点。\n打包出，宿舍楼下自取。',
        images: [pic('📗', '#E6EFE2', '#C4DCC0')],
        ratio: 0.9,
        createdAt: now - 12 * H,
        views: 42,
      }),
      mk({
        id: 'p_mine2',
        sellerId: 'u_me',
        title: '宿舍收纳箱 三件套 可折叠',
        price: 22,
        origPrice: 69,
        category: '宿舍好物',
        condition: '八成新',
        desc: '搬宿舍买的，用了一学期。可折叠不占地方。\n三件一起出，颜色是灰的。',
        images: [pic('📦', '#EDEAE2', '#D2CCBC')],
        ratio: 1.0,
        createdAt: now - 20 * H,
        views: 31,
      }),
      // 已售出（用于展示「已售」与已完成订单）
      mk({
        id: 'p_sold1',
        sellerId: 'u_me',
        title: 'AirPods 2 代 充电盒（不含耳机）',
        price: 45,
        origPrice: 199,
        category: '数码电子',
        condition: '七成新',
        desc: '耳机丢了，只剩盒子和线。充电正常。',
        images: [pic('🎧', '#E9ECEF', '#C7CDD6')],
        ratio: 0.8,
        status: 'sold',
        createdAt: now - 8 * 24 * H,
        views: 233,
        soldAt: now - 3 * 24 * H,
      }),
      // 已下架
      mk({
        id: 'p_off1',
        sellerId: 'u_me',
        title: '机械键盘 87 键 青轴（已下架）',
        price: 130,
        category: '数码电子',
        condition: '八成新',
        desc: '青轴太吵被室友投诉了，先下架。',
        images: [pic('⌨️', '#E7EAEE', '#C6CCD5')],
        ratio: 1.06,
        status: 'off',
        createdAt: now - 10 * 24 * H,
        views: 402,
      }),
    ];

    const chats = [
      {
        id: 'c_demo1',
        productId: 'p_lamp',
        buyerId: 'u_me',
        sellerId: 'u_chen',
        createdAt: now - 3 * H,
        lastTs: now - 2.58 * H,
        unread: { u_me: 0, u_chen: 1 },
        messages: [
          { id: 'm1', from: 'u_me', type: 'text', text: '你好，台灯还在吗？夹床头的那个夹子确定还在吧？', ts: now - 3 * H },
          { id: 'm2', from: 'u_chen', type: 'text', text: '在的，夹子、充电线都在。今晚我都在宿舍，可以来 9 栋楼下看货。', ts: now - 2.95 * H },
          { id: 'm3', from: 'u_me', type: 'quote', price: 30, note: '30 可以吗，今天就能来拿', status: 'accepted', ts: now - 2.9 * H },
          { id: 'm4', from: 'u_chen', type: 'system', text: '卖家接受报价 ¥30，订单已生成（待付款）', ts: now - 2.88 * H },
          { id: 'm5', from: 'u_chen', type: 'order', orderId: 'o_demo2', ts: now - 2.88 * H },
          { id: 'm6', from: 'u_chen', type: 'text', text: '那你今晚 8 点来 9 栋楼下，我带下去给你试一下亮度。', ts: now - 2.8 * H },
          { id: 'm7', from: 'u_chen', type: 'delivery', delivery: '校内面交', location: '南校区 9 栋宿舍楼下', time: '11 月 13 日 20:00', ts: now - 2.79 * H },
          { id: 'm8', from: 'u_chen', type: 'qr', image: CFM.makeQR('u_chen-qr', '#1F2937'), amount: 30, orderId: 'o_demo2', ts: now - 2.7 * H },
          { id: 'm9', from: 'u_me', type: 'text', text: '转好啦，你看下截图 👇', ts: now - 2.6 * H },
          { id: 'm10', from: 'u_me', type: 'proof', image: proofPic(30), orderId: 'o_demo2', ts: now - 2.59 * H },
          { id: 'm11', from: 'u_me', type: 'system', text: '买家已上传支付凭证，等待卖家确认收款', ts: now - 2.58 * H },
        ],
      },
      {
        id: 'c_demo2',
        productId: 'p_skirt',
        buyerId: 'u_me',
        sellerId: 'u_su',
        createdAt: now - 26 * H,
        lastTs: now - 25.5 * H,
        unread: { u_me: 2, u_su: 0 },
        messages: [
          { id: 'm21', from: 'u_me', type: 'text', text: '马面裙还在吗？我身高 163，穿 M 会不会短？', ts: now - 26 * H },
          { id: 'm22', from: 'u_su', type: 'text', text: '163 穿刚好到脚踝上面一点，不短的～我 165 也穿过一次', ts: now - 25.8 * H },
          { id: 'm23', from: 'u_su', type: 'text', text: '裙门有一点折痕，熨一下就好，可以先来看实物再决定', ts: now - 25.5 * H },
        ],
      },
      {
        id: 'c_demo3',
        productId: 'p_bike',
        buyerId: 'u_me',
        sellerId: 'u_zhang',
        createdAt: now - 70 * H,
        lastTs: now - 68 * H,
        unread: { u_me: 1, u_zhang: 0 },
        messages: [
          { id: 'm31', from: 'u_me', type: 'text', text: '车锁和车筐都还在吧？周末能约看车吗', ts: now - 70 * H },
          { id: 'm32', from: 'u_zhang', type: 'text', text: '都在，周日下午我在操场那边，到了给我发消息', ts: now - 68 * H },
          { id: 'm33', from: 'u_me', type: 'quote', price: 300, note: '300 我今天就能来骑走', status: 'rejected', ts: now - 67.6 * H },
          { id: 'm34', from: 'u_zhang', type: 'quote', price: 350, note: '300 有点低了，350 你直接骑走，车锁车筐都送你', status: 'pending', ts: now - 67 * H },
        ],
      },
    ];

    const orders = [
      {
        id: 'o_demo2',
        no: 'FM202611130207',
        productId: 'p_lamp',
        chatId: 'c_demo1',
        buyerId: 'u_me',
        sellerId: 'u_chen',
        amount: 30,
        delivery: '校内面交',
        location: '南校区 9 栋宿舍楼下',
        time: '11 月 13 日 20:00',
        status: 'pending_confirm',
        createdAt: now - 2.88 * H,
        expiresAt: now - 2.88 * H + 15 * 60e3,
        buyerConfirmed: false,
        sellerConfirmed: false,
        proof: proofPic(30),
        timeline: [
          { t: now - 2.9 * H, text: '买家出价，卖家接受，订单生成' },
          { t: now - 2.79 * H, text: '双方确认交货信息：校内面交 · 南校区 9 栋宿舍楼下' },
          { t: now - 2.59 * H, text: '买家已上传支付凭证' },
        ],
      },
      {
        id: 'o_demo1',
        no: 'FM202611100231',
        productId: 'p_sold1',
        chatId: null,
        buyerId: 'u_su',
        sellerId: 'u_me',
        amount: 45,
        delivery: '校内面交',
        location: '南校区 图书馆一楼大厅',
        time: '11 月 10 日 19:00',
        status: 'completed',
        createdAt: now - 3 * 24 * H,
        expiresAt: now - 3 * 24 * H + 15 * 60e3,
        buyerConfirmed: true,
        sellerConfirmed: true,
        proof: null,
        timeline: [
          { t: now - 3 * 24 * H, text: '买家出价，卖家接受，订单生成' },
          { t: now - 3 * 24 * H + 8 * 60e3, text: '买家已上传支付凭证' },
          { t: now - 3 * 24 * H + 12 * 60e3, text: '卖家已确认收款，等待线下交货' },
          { t: now - 3 * 24 * H + 55 * 60e3, text: '双方确认完成，交易结束' },
        ],
      },
    ];

    return {
      v: 1,
      users,
      products,
      chats,
      orders,
      favorites: [{ userId: 'u_me', productId: 'p_bike', priceAtFav: 420, ts: now - 20 * H }],
      notices: [
        {
          id: 'n_demo1',
          userId: 'u_me',
          type: 'price_drop',
          title: '收藏的商品降价了',
          text: '「捷安特 ATX 通勤自行车 26 寸」从 ¥420 降到 ¥380',
          productId: 'p_bike',
          ts: now - 6 * H,
          read: false,
        },
      ],
      session: { userId: 'u_me' },
      meta: { orderSeq: 12, seenGuide: false },
    };
  };
})();
