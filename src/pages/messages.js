/* ===== 页面：消息（会话列表 + 聊天） ===== */
(function () {
  const CFM = window.CFM;
  const { icon, esc, money, avatar, timeShort, timeAgo, dayKey, toast, sheetForm } = CFM.ui;
  const S = CFM.store;

  /* ---------------- 卡片 ---------------- */
  function quoteCard(m, ctx) {
    const me = S.me();
    const mine = m.from === me.id;
    const canAct = m.status === 'pending' && !mine && ctx.product && ctx.product.status === 'on_sale' && !ctx.order;
    const diff = (ctx.product ? ctx.product.price : 0) - m.price;
    return `
      <div class="cardmsg">
        <div class="cmh"><b>${mine ? '我的报价' : '对方报价'}</b><span>${timeShort(m.ts)}</span></div>
        <div class="cmb">
          <div class="qprice"><span>¥</span>${money(m.price)}</div>
          <div class="qsub">${diff > 0 ? `比标价低 ¥${money(diff)}` : diff < 0 ? `高于标价 ¥${money(-diff)}` : '与原价一致'}${m.note ? `<br>“${esc(m.note)}”` : ''}</div>
          ${canAct
            ? `<div class="qact">
                 <button class="btn line" data-act="chat.rejectQuote" data-id="${m.id}">拒绝</button>
                 <button class="btn primary" data-act="chat.acceptQuote" data-id="${m.id}">接受</button>
               </div>`
            : `<div class="qstat" style="color:${m.status === 'accepted' ? 'var(--green)' : m.status === 'rejected' ? 'var(--ink3)' : 'var(--accent)'}">
                 ${m.status === 'accepted' ? '已接受，订单已生成' : m.status === 'rejected' ? '已拒绝' : '等待对方回应'}
               </div>`}
        </div>
      </div>`;
  }

  function deliveryCard(m) {
    return `
      <div class="cardmsg">
        <div class="cmh"><b>交货信息</b><span>${timeShort(m.ts)}</span></div>
        <div class="cmb">
          <div class="kv"><span class="k">方式</span><span class="v">${esc(m.delivery || '待定')}</span></div>
          <div class="kv"><span class="k">地点</span><span class="v">${esc(m.location || '待定')}</span></div>
          <div class="kv"><span class="k">时间</span><span class="v">${esc(m.time || '待定')}</span></div>
        </div>
      </div>`;
  }

  function qrCard(m, ctx) {
    const me = S.me();
    const isBuyer = me.id === ctx.chat.buyerId;
    const o = m.orderId ? S.order(m.orderId) : null;
    let foot = '';
    if (o && o.status === 'cancelled') foot = `<div class="qstat" style="color:var(--ink3)">订单已取消</div>`;
    else if (o && o.status === 'pending_pay')
      foot = isBuyer
        ? `<div class="qact"><button class="btn primary" data-act="chat.uploadProof" data-id="${o.id}">我已付款，上传凭证</button></div>`
        : `<div class="qstat" style="color:var(--accent)">等待买家扫码转账</div>`;
    else if (o && o.status === 'pending_confirm')
      foot = isBuyer
        ? `<div class="qstat" style="color:var(--accent)">已上传凭证，等待卖家确认收款</div>`
        : `<div class="qact"><button class="btn primary" data-act="chat.confirmPay" data-id="${o.id}">确认收款</button></div>`;
    else if (o) foot = `<div class="qstat" style="color:var(--green)">已完成付款</div>`;

    return `
      <div class="cardmsg">
        <div class="cmh"><b>收款码</b><span>${timeShort(m.ts)}</span></div>
        <div class="cmb">
          <div class="qrbox">
            <img src="${m.image}" alt="收款码">
            <p>微信扫码转账 <b style="color:var(--accent);font-size:13px">¥${money(m.amount)}</b><br>备注订单后 4 位方便对账</p>
          </div>
          ${foot}
        </div>
      </div>`;
  }

  function proofCard(m, ctx) {
    const me = S.me();
    const o = m.orderId ? S.order(m.orderId) : null;
    const isSeller = me.id === ctx.chat.sellerId;
    return `
      <div class="cardmsg">
        <div class="cmh"><b>支付凭证</b><span>${timeShort(m.ts)}</span></div>
        <div class="cmb">
          <img class="proofpic" src="${m.image}" style="width:100%;border-radius:7px;border:1px solid var(--line)" alt="支付凭证">
          ${isSeller && o && o.status === 'pending_confirm'
            ? `<div class="qact"><button class="btn primary" data-act="chat.confirmPay" data-id="${o.id}">确认收款</button></div>`
            : isSeller && o && o.status !== 'pending_confirm'
            ? `<div class="qstat" style="color:var(--green)">已确认收款</div>`
            : ''}
        </div>
      </div>`;
  }

  function orderCard(m) {
    const o = S.order(m.orderId);
    if (!o) return '';
    const label = o.status === 'cancelled' ? '已取消' : o.status === 'completed' ? '已完成' : S.ORDER_STEPS[S.ORDER_STEP_INDEX[o.status]];
    const color = o.status === 'cancelled' ? 'var(--ink3)' : o.status === 'completed' ? 'var(--green)' : 'var(--accent)';
    return `
      <div class="cardmsg" data-act="chat.order" data-id="${o.id}" style="cursor:pointer">
        <div class="cmh"><b>订单</b><span>${o.no}</span></div>
        <div class="cmb">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div>
              <div style="font-size:13px">成交价 ¥${money(o.amount)}</div>
              <div style="font-size:12px;color:${color};margin-top:3px">${label}</div>
            </div>
            <span style="font-size:12.5px;color:var(--ink3)">查看 →</span>
          </div>
        </div>
      </div>`;
  }

  function msgHTML(m, ctx) {
    const me = S.me();
    if (m.type === 'system') return `<div class="sys">${esc(m.text)}</div>`;
    const mine = m.from === me.id;
    const user = S.user(m.from) || { nick: '同学' };
    let inner = '';
    if (m.type === 'text') inner = `<div class="bub">${esc(m.text)}</div>`;
    else if (m.type === 'image') inner = `<div class="bub img"><img src="${m.image}" alt=""></div>`;
    else if (m.type === 'quote') inner = quoteCard(m, ctx);
    else if (m.type === 'delivery') inner = deliveryCard(m);
    else if (m.type === 'qr') inner = qrCard(m, ctx);
    else if (m.type === 'proof') inner = proofCard(m, ctx);
    else if (m.type === 'order') inner = orderCard(m);

    return `
      <div class="mrow ${mine ? 'me' : ''}">
        ${avatar(user, 30, 'av')}
        <div class="mcol">${inner}<span class="mtime">${timeShort(m.ts)}</span></div>
      </div>`;
  }

  /* ---------------- 会话列表 ---------------- */
  function convHTML(list, activeId) {
    if (!list.length) {
      return `<div class="empty" style="padding:56px 20px"><b>还没有会话</b>在商品详情点「聊一聊」开始</div>`;
    }
    return list
      .map((c) => {
        const p = S.product(c.productId) || { title: '商品已删除', images: [CFM.pic('📦', '#EFEFEC', '#E4E4DE')], price: 0, status: 'off' };
        const other = S.otherOf(c);
        const unread = (c.unread && c.unread[(S.me() || {}).id]) || 0;
        return `
        <div class="conv ${c.id === activeId ? 'on' : ''}" data-act="msg.open" data-id="${c.id}">
          <img src="${p.images[0]}" alt="">
          <div class="cm">
            <div class="ct"><b>${esc((other && other.nick) || '同学')}</b>${unread ? `<span class="cnt">${unread > 99 ? '99+' : unread}</span>` : ''}</div>
            <div class="cl">${esc(S.lastText(c))}</div>
            <div class="cc">${esc(p.title)} · ${S.PRODUCT_STATE[p.status] || ''}</div>
          </div>
        </div>`;
      })
      .join('');
  }

  /* ---------------- 聊天面板 ---------------- */
  function chatHTML(c) {
    const me = S.me();
    const p = S.product(c.productId);
    const other = S.otherOf(c);
    const isSeller = me.id === c.sellerId;
    const o = S.activeOrderOfChat(c.id);

    let lastDay = null;
    const stream = c.messages
      .map((m) => {
        const k = dayKey(m.ts);
        let sep = '';
        if (k !== lastDay) {
          lastDay = k;
          const d = new Date(m.ts);
          sep = `<div class="day">${d.getMonth() + 1} 月 ${d.getDate()} 日 ${timeShort(m.ts)}</div>`;
        }
        return sep + msgHTML(m, { chat: c, product: p, order: o });
      })
      .join('');

    return `
      <div class="chat">
        <div class="chat-head">
          ${avatar(other, 32, 'av')}
          <div>
            <div class="ch-n">${esc((other && other.nick) || '同学')}</div>
            <a class="ch-p" data-act="chat.product" data-id="${p ? p.id : ''}">
              关于「${esc(p ? p.title : '商品已删除')}」${p ? `¥${money(p.price)} · ${S.PRODUCT_STATE[p.status]}` : ''}
            </a>
          </div>
          <span class="sp"></span>
          <button class="btn sm line" data-act="chat.quote">报价</button>
          ${isSeller ? `<button class="btn sm line" data-act="chat.qr">收款码</button>` : ''}
        </div>

        <div class="chat-msgs" id="cmsgs">
          <div class="sys">${p && p.status === 'on_sale' && !o ? '点右上角「报价」出价，卖家接受后会自动生成订单' : '交易在订单页推进：付款 → 确认收款 → 交货 → 双方确认'}</div>
          ${stream}
        </div>

        <div class="composer">
          <div class="ctools">
            <button class="iconbtn" data-act="chat.pickImage" title="发送图片">${icon('image', 18)}</button>
            <button class="iconbtn" data-act="chat.delivery" title="约定交货信息">${icon('pin', 18)}</button>
            <span class="sp"></span>
            <span class="chint">Enter 发送 · Shift + Enter 换行</span>
          </div>
          <div class="cbox">
            <textarea id="cin" rows="2" placeholder="想好再聊，别放鸽子…"></textarea>
          </div>
          <div class="crow">
            <span class="chint">${o ? '订单进行中：' + S.ORDER_STEPS[S.ORDER_STEP_INDEX[o.status]] : '线下交易，注意当面验货'}</span>
            <button class="btn primary sm" id="csend" data-act="chat.send" disabled>发送</button>
          </div>
        </div>
      </div>`;
  }

  CFM.pages.messages = {
    render(params) {
      const list = S.chatsOf();
      const activeId = params.id || (window.innerWidth > 900 && list[0] ? list[0].id : null);
      const c = activeId ? S.chat(activeId) : null;
      if (c) S.markRead(c.id);
      const notices = S.notices().length;

      return `
      <div class="msg-page ${c ? 'has-chat' : ''}">
        <aside class="conv-pane">
          <div class="conv-head">
            <b>消息</b>
            <a class="link" data-act="msg.all">通知${notices ? '（' + notices + '）' : ''}</a>
          </div>
          <div class="conv-scroll" id="convScroll">${convHTML(list, activeId)}</div>
        </aside>
        <section class="chat-pane">
          ${c ? chatHTML(c) : `<div class="chat-empty">选择左侧的会话开始聊天<br><span style="font-size:12px;color:#B4B6BB">或者去商品详情点「聊一聊」</span></div>`}
        </section>
      </div>`;
    },
    mount() {
      const box = document.getElementById('cmsgs');
      if (box) {
        const toBottom = () => { box.scrollTop = box.scrollHeight; };
        toBottom();
        requestAnimationFrame(toBottom);
        setTimeout(toBottom, 120);
        setTimeout(toBottom, 420);
      }
      const ta = document.getElementById('cin');
      const btn = document.getElementById('csend');
      if (!ta) return;
      const sync = () => {
        btn.disabled = !ta.value.trim();
        ta.style.height = 'auto';
        ta.style.height = Math.min(120, ta.scrollHeight) + 'px';
      };
      ta.addEventListener('input', sync);
      ta.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          if (ta.value.trim()) CFM.actions['chat.send']();
        }
      });
      if (window.innerWidth > 900) setTimeout(() => ta.focus(), 80);
    },
  };

  function afterSend() {
    const cur = CFM.router.current();
    if (cur.params && cur.params.id) S.markRead(cur.params.id);
    CFM.router.refresh();
    const box = document.getElementById('cmsgs');
    if (box) box.scrollTop = box.scrollHeight;
  }
  function currentChat() {
    const cur = CFM.router.current();
    const id = cur.params && cur.params.id;
    return id ? S.chat(id) : null;
  }

  /* ---------------- 动作 ---------------- */
  CFM.actions['msg.open'] = (el) => CFM.router.go('messages', { id: el.dataset.id });
  CFM.actions['msg.all'] = () => CFM.router.go('notices', {});
  CFM.actions['msg.openOrder'] = (el) => CFM.router.go('order', { id: el.dataset.id });
  CFM.actions['msg.openProduct'] = (el) => CFM.router.go('detail', { id: el.dataset.id });

  CFM.actions['chat.send'] = () => {
    const ta = document.getElementById('cin');
    const c = currentChat();
    if (!ta || !c || !ta.value.trim()) return;
    S.sendText(c.id, ta.value);
    afterSend();
  };
  CFM.actions['chat.pickImage'] = async () => {
    const c = currentChat();
    if (!c) return;
    const r = await CFM.ui.pickImage(900);
    if (!r) return;
    S.sendImage(c.id, r.data);
    afterSend();
  };
  CFM.actions['chat.quote'] = async () => {
    const c = currentChat();
    if (!c) return;
    const p = S.product(c.productId);
    if (S.activeOrderOfChat(c.id)) return toast('已有进行中的订单');
    const v = await sheetForm({
      title: '发起报价',
      desc: '标价 ¥' + money(p.price) + '。卖家接受后会自动生成订单，商品变为「已预订」。',
      fields: [{ key: 'price', label: '你的出价（元）', type: 'number', placeholder: String(p.price), value: String(p.price) }],
      okText: '发送报价',
    });
    if (!v) return;
    const price = Number(v.price);
    if (!price || price <= 0) return toast('填一个有效价格');
    S.sendQuote(c.id, price);
    afterSend();
  };
  CFM.actions['chat.qr'] = () => {
    const c = currentChat();
    if (!c) return;
    if (!S.activeOrderOfChat(c.id)) return toast('先让买家出价并生成订单，再发收款码');
    S.sendQR(c.id);
    afterSend();
  };
  CFM.actions['chat.delivery'] = async () => {
    const c = currentChat();
    if (!c) return;
    const o = S.activeOrderOfChat(c.id);
    const v = await sheetForm({
      title: '约定交货信息',
      fields: [
        { key: 'delivery', label: '交货方式', type: 'select', options: S.DELIVERIES, value: (o && o.delivery) || '校内面交' },
        { key: 'location', label: '地点', placeholder: '如：南校区 图书馆一楼大厅', value: (o && o.location) || '' },
        { key: 'time', label: '时间', placeholder: '如：11 月 14 日 18:30', value: (o && o.time) || '' },
      ],
      okText: '发送',
    });
    if (!v) return;
    if (!v.location) return toast('写个具体地点吧');
    S.sendDelivery(c.id, v);
    afterSend();
  };
  CFM.actions['chat.acceptQuote'] = (el) => {
    const c = currentChat();
    if (!c) return;
    const o = S.respondQuote(c.id, el.dataset.id, true);
    if (!o) return afterSend();
    toast('已接受报价，订单生成');
    afterSend();
    setTimeout(() => CFM.router.go('order', { id: o.id }), 500);
  };
  CFM.actions['chat.rejectQuote'] = (el) => {
    const c = currentChat();
    if (!c) return;
    S.respondQuote(c.id, el.dataset.id, false);
    toast('已拒绝该报价');
    afterSend();
  };
  CFM.actions['chat.uploadProof'] = async (el) => {
    const r = await CFM.ui.pickImage(900);
    if (!r) return;
    S.uploadProof(el.dataset.id, r.data);
    toast('凭证已上传，等待卖家确认收款');
    afterSend();
  };
  CFM.actions['chat.confirmPay'] = (el) => {
    S.confirmPayment(el.dataset.id);
    toast('已确认收款，等待线下交货');
    afterSend();
  };
  CFM.actions['chat.order'] = (el) => CFM.router.go('order', { id: el.dataset.id });
  CFM.actions['chat.product'] = (el) => {
    if (el.dataset.id) CFM.router.go('detail', { id: el.dataset.id });
  };
})();
