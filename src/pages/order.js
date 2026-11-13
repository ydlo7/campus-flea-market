/* ===== 页面：订单 ===== */
(function () {
  const CFM = window.CFM;
  const { icon, esc, money, fullTime, mmss, timeShort, toast, confirmSheet } = CFM.ui;
  const S = CFM.store;

  const STATUS_TEXT = {
    pending_pay: '待付款',
    pending_confirm: '待确认收款',
    pending_delivery: '待交货',
    completed: '已完成',
    cancelled: '已取消',
  };

  CFM.pages.order = {
    render(params) {
      const o = S.order(params.id);
      if (!o) return `<div class="wrap"><div class="empty"><b>订单不存在</b></div></div>`;

      const me = S.me();
      const role = S.roleIn(o);
      const p = S.product(o.productId);
      const buyer = S.user(o.buyerId);
      const seller = S.user(o.sellerId);
      const idx = S.ORDER_STEP_INDEX[o.status];
      const cancelled = o.status === 'cancelled';
      const completed = o.status === 'completed';

      const steps = S.ORDER_STEPS.map((s, i) => {
        let cls = '';
        if (!cancelled) {
          if (i < idx) cls = 'done';
          else if (i === idx) cls = completed ? 'done' : 'cur';
        }
        return `<div class="step ${cls}"><div class="d">${i < idx || completed ? icon('check', 10) : i + 1}</div><div class="l">${s}</div></div>`;
      }).join('');

      const findTime = (kw) => {
        const it = o.timeline.slice().reverse().find((t) => t.text.indexOf(kw) >= 0);
        return it ? fullTime(it.t).slice(5, 16) : '';
      };
      const confRow = (u, label, done, okText, kw) => `
        <div class="confirm-row">
          ${CFM.ui.avatar(u, 26)}
          <div>
            <div class="cn">${label} · ${esc((u && u.nick) || '')}</div>
            <div class="cs">${done ? okText + (findTime(kw) ? ' · ' + findTime(kw) : '') : '等待' + label + okText.replace('已确认', '确认')}</div>
          </div>
          <span class="cf ${done ? 'ok' : ''}">${done ? '已确认' : '待确认'}</span>
        </div>`;

      /* ---- 底部操作 ---- */
      let note = '';
      let acts = '';
      const chatLink = o.chatId ? `<button class="btn line" data-act="order.chat" data-id="${o.chatId}">联系对方</button>` : '';

      if (cancelled) {
        note = esc(o.cancelReason || '订单已取消') + ' · 商品已重新上架';
        acts = `${chatLink}<button class="btn line" data-act="order.rebuy" data-id="${o.productId}">查看商品</button>`;
      } else if (completed) {
        note = '双方已确认，交易完成';
        acts = `<button class="btn primary" data-act="order.chat" data-id="${o.chatId}">再次联系</button>`;
      } else if (o.status === 'pending_pay') {
        if (role === 'buyer') {
          note = '转账后上传支付截图，卖家确认收款后即可交货';
          acts = `<button class="btn line" data-act="order.cancel" data-id="${o.id}">取消订单</button>
                  <button class="btn line" data-act="order.askQR" data-id="${o.id}">催一下收款码</button>
                  <button class="btn primary" data-act="order.upload" data-id="${o.id}">上传支付凭证</button>`;
        } else {
          note = '买家付款后需要你确认收款';
          acts = `<button class="btn line" data-act="order.cancel" data-id="${o.id}">取消订单</button>
                  <button class="btn primary" data-act="order.sendQR" data-id="${o.id}">发送收款码</button>`;
        }
      } else if (o.status === 'pending_confirm') {
        if (role === 'seller') {
          note = '核对买家转账金额后再确认收款';
          acts = `<button class="btn line" data-act="order.cancel" data-id="${o.id}">取消订单</button>
                  <button class="btn primary" data-act="order.confirmPay" data-id="${o.id}">确认收款</button>`;
        } else {
          note = '等待卖家确认收款';
          acts = `<button class="btn line" data-act="order.cancel" data-id="${o.id}">取消订单</button>`;
        }
      } else if (o.status === 'pending_delivery') {
        const mineDone = role === 'buyer' ? o.buyerConfirmed : o.sellerConfirmed;
        note = mineDone ? '你已确认，等待对方确认' : role === 'buyer' ? '见面验货后再确认收货' : '把商品交给买家后再确认交付';
        acts = mineDone
          ? chatLink
          : `<button class="btn primary" data-act="order.confirmReceipt" data-id="${o.id}">${role === 'buyer' ? '确认收货' : '确认交付'}</button>`;
      }

      return `
      <div class="wrap mid">
        <div class="page-head">
          <a class="back" data-act="nav.back">${icon('back', 13)} 返回</a>
          <h1>订单详情</h1>
        </div>

        <div class="opage" style="padding-top:0">
          <div class="ohead">
            <div>
              <h1>${STATUS_TEXT[o.status]}</h1>
              <div class="ono">${esc(o.no)} · ${role === 'buyer' ? '我是买家' : '我是卖家'} · ${fullTime(o.createdAt)}</div>
            </div>
            <span class="sp"></span>
            ${o.status === 'pending_pay' ? `<span class="countdown" data-countdown="${o.expiresAt}">剩余 ${mmss(o.expiresAt - Date.now())}</span>` : ''}
          </div>

          <div class="steps">${steps}</div>

          <div class="panel">
              <div class="prod" data-act="order.rebuy" data-id="${o.productId}" style="cursor:pointer">
                <img src="${p ? p.images[0] : ''}" alt="">
                <div class="pm">
                  <div class="pt">${esc(p ? p.title : '商品已删除')}</div>
                  <div class="pp">¥${money(o.amount)}</div>
                </div>
                <span style="font-size:12.5px;color:var(--ink3)">查看商品 →</span>
              </div>
          </div>

          <div class="panel">
            <div class="panel-t"><span>交易信息</span><span>买卖双方 · ${esc((buyer && buyer.nick) || '')} / ${esc((seller && seller.nick) || '')}</span></div>
            <div class="rows">
              <div class="row"><span class="k">成交价</span><span class="v hl">¥${money(o.amount)}</span></div>
              <div class="row"><span class="k">交货方式</span><span class="v">${esc(o.delivery || '待约定')}</span></div>
              <div class="row"><span class="k">交货地点</span><span class="v">${esc(o.location || '待约定')}</span></div>
              <div class="row"><span class="k">交货时间</span><span class="v">${esc(o.time || '待约定')}</span></div>
            </div>
          </div>

          ${o.status === 'pending_delivery' || completed
            ? `<div class="panel">
                 <div class="panel-t"><span>双方确认</span><span>${completed ? '双方已确认，交易完成' : '两人都确认后订单自动完成'}</span></div>
                 ${confRow(buyer, '买家', o.buyerConfirmed, '已确认收货', '买家已确认收货')}
                 ${confRow(seller, '卖家', o.sellerConfirmed, '已确认交付', '卖家已确认交付')}
               </div>`
            : ''}

          <div class="panel">
            <div class="panel-t">
              <span>支付凭证</span>
              <span>${o.proof ? '已上传 · ' + (findTime('凭证') || timeShort(Date.now())) : '未上传'}</span>
            </div>
            ${o.proof
              ? `<div class="proof">
                   <img src="${o.proof}" alt="支付凭证">
                   <div class="pn">买家已上传转账截图<br>卖家确认收款后订单进入「待交货」<br>${o.status === 'pending_confirm' ? '当前等待卖家核对确认' : ''}</div>
                 </div>`
              : role === 'buyer' && !cancelled && (o.status === 'pending_pay' || o.status === 'pending_confirm')
              ? `<button class="proof-add" data-act="order.upload" data-id="${o.id}">${icon('camera', 17)} 上传支付截图</button>`
              : `<div class="pn" style="font-size:12.5px;color:var(--ink3)">买家还没有上传凭证</div>`}
          </div>

          <div class="panel">
            <div class="panel-t"><span>交易进度</span></div>
            ${o.timeline
              .slice()
              .reverse()
              .map((t) => `<div class="tl"><span class="t">${fullTime(t.t).slice(5, 16)}</span><span>${esc(t.text)}</span></div>`)
              .join('')}
          </div>

          <div class="oact">
            <span class="onote">${note}</span>
            ${acts}
          </div>
        </div>
      </div>`;
    },
  };

  CFM.actions['order.upload'] = async (el) => {
    const r = await CFM.ui.pickImage(1000);
    if (!r) return;
    try {
      const url = await S.upload(r.data);
      await S.uploadProof(el.dataset.id, url);
      toast('凭证已上传，等待卖家确认收款');
      CFM.router.refresh();
    } catch (e) {
      toast(e.message);
    }
  };

  CFM.actions['order.confirmPay'] = async (el) => {
    try {
      await S.confirmPayment(el.dataset.id);
      toast('已确认收款，请按约定交货');
      CFM.router.refresh();
    } catch (e) {
      toast(e.message);
    }
  };

  CFM.actions['order.confirmReceipt'] = async (el) => {
    const o = S.order(el.dataset.id);
    const role = S.roleIn(o);
    const ok = await confirmSheet({
      title: role === 'buyer' ? '确认收货' : '确认交付',
      text: role === 'buyer' ? '确认已经拿到商品并且没问题？双方都确认后订单完成，不可撤销。' : '确认已把商品交给买家？双方都确认后订单完成。',
      okText: '确认',
    });
    if (!ok) return;
    try {
      const r = await S.confirmReceipt(el.dataset.id);
      toast(r.order.status === 'completed' ? '交易完成，商品已售出' : '已确认，等待对方确认');
      CFM.router.refresh();
    } catch (e) {
      toast(e.message);
    }
  };

  CFM.actions['order.cancel'] = async (el) => {
    const o = S.order(el.dataset.id);
    const role = S.roleIn(o);
    const ok = await confirmSheet({
      title: '取消订单',
      text: role === 'buyer' ? '取消后商品会重新回到在售，卖家可能卖给别人。' : '取消后商品会重新上架，买家需要重新报价。',
      okText: '确认取消',
      danger: true,
    });
    if (!ok) return;
    try {
      await S.cancelOrder(el.dataset.id);
      toast('订单已取消，商品已重新上架');
      CFM.router.refresh();
    } catch (e) {
      toast(e.message);
    }
  };

  CFM.actions['order.chat'] = (el) => {
    const id = el.dataset.id;
    if (!id) return toast('该订单没有关联会话');
    CFM.router.go('messages', { id });
  };

  CFM.actions['order.sendQR'] = async (el) => {
    const o = S.order(el.dataset.id);
    if (!o.chatId) return toast('没有关联会话');
    try {
      await S.sendMessage(o.chatId, { type: 'qr' });
      toast('收款码已发送到聊天');
      CFM.router.go('messages', { id: o.chatId });
    } catch (e) {
      toast(e.message);
    }
  };

  CFM.actions['order.askQR'] = async (el) => {
    const o = S.order(el.dataset.id);
    if (!o.chatId) return toast('没有关联会话');
    try {
      await S.sendMessage(o.chatId, { type: 'text', text: '我已经准备好付款啦，麻烦发一下收款码～' });
      toast('已提醒卖家发送收款码');
      CFM.router.go('messages', { id: o.chatId });
    } catch (e) {
      toast(e.message);
    }
  };

  CFM.actions['order.rebuy'] = (el) => CFM.router.go('detail', { id: el.dataset.id });
})();
