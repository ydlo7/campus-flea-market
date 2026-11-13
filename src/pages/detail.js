/* ===== 页面：商品详情 ===== */
(function () {
  const CFM = window.CFM;
  const { icon, iconFill, esc, money, avatar, timeAgo } = CFM.ui;
  const S = CFM.store;

  const gal = { i: 0 };

  CFM.pages.detail = {
    render(params) {
      const p = S.product(params.id);
      if (!p) {
        return `<div class="wrap"><div class="empty"><b>商品不存在</b>可能已经被删除了</div></div>`;
      }
      gal.i = 0;
      const me = S.me();
      const mine = me && p.sellerId === me.id;
      const seller = S.user(p.sellerId) || { nick: '同学' };
      const stats = S.sellerStats(p.sellerId);
      const fav = S.isFav(p.id);
      const images = p.images && p.images.length ? p.images : [CFM.pic('🛍️', '#EFEFEC', '#E2E2DC')];
      const active = S.activeOrderOfProduct(p.id);
      const reserved = p.status === 'reserved';

      return `
      <div class="wrap">
        <div class="detail">
          <div class="gallery">
            <div class="gmain"><img id="gmain" src="${images[0]}" alt="${esc(p.title)}"></div>
            ${images.length > 1
              ? `<div class="gthumbs" id="gthumbs">
                   ${images
                     .map(
                       (src, i) =>
                         `<button class="${i === 0 ? 'on' : ''}" data-act="detail.thumb" data-i="${i}" data-src="${src}">
                            <img src="${src}" alt="">
                          </button>`
                     )
                     .join('')}
                 </div>`
              : ''}
          </div>

          <div class="dinfo">
            <a class="back" data-act="nav.back" style="display:inline-flex;align-items:center;gap:4px;font-size:12.5px;color:var(--ink3)">
              ${icon('back', 13)} 返回
            </a>

            <h1>${esc(p.title)}</h1>
            <div class="price"><b><em>¥</em>${money(p.price)}</b>${p.origPrice ? `<s>原价 ¥${money(p.origPrice)}</s>` : ''}</div>

            <div class="dmeta">
              <span class="tag">${esc(p.condition || '成色未填')}</span>
              <span class="tag">${esc(p.category)}</span>
              <span class="tag ${p.status === 'on_sale' ? 'ok' : p.status === 'reserved' ? 'warn' : ''}">${S.PRODUCT_STATE[p.status]}</span>
            </div>
            <div class="dstats">
              <span>${p.views || 0} 次浏览</span>
              <span>${S.favCount(p.id)} 人收藏</span>
              <span>${timeAgo(p.createdAt)}发布</span>
            </div>

            ${reserved ? `<div class="dsec" style="padding-top:18px;margin-top:18px"><div class="tag warn">这件商品已被预订，卖家正在和另一位同学交易</div></div>` : ''}

            <div class="dsec">
              <h3>卖家</h3>
              <div class="seller" data-act="detail.seller" data-id="${p.sellerId}" style="cursor:pointer">
                ${avatar(seller, 40)}
                <div>
                  <div class="sn">${esc(seller.nick)}
                    ${seller.verified ? `<span class="verify">${icon('shield', 11)} 校园认证</span>` : ''}
                  </div>
                  <div class="sm">${esc(seller.school || '')} · 在售 ${stats.onSale} 件 · 已售 ${stats.sold} 件</div>
                </div>
                <span class="go">查看主页 →</span>
              </div>
            </div>

            <div class="dsec">
              <h3>交货方式</h3>
              <div class="delivery">
                ${(p.delivery || []).length
                  ? p.delivery.map((d) => `<span class="tag">${esc(d)}</span>`).join('')
                  : '<span class="small-t">暂未填写</span>'}
              </div>
            </div>

            <div class="dsec">
              <h3>描述</h3>
              <p class="desc">${esc(p.desc || '卖家很懒，什么都没写。')}</p>
            </div>

            <div class="dact">
              ${mine
                ? `<button class="btn line" data-act="detail.edit" data-id="${p.id}">编辑</button>
                   <button class="btn line" data-act="${p.status === 'off' ? 'detail.on' : 'detail.off'}" data-id="${p.id}">
                     ${p.status === 'off' ? '重新上架' : '下架'}
                   </button>
                   <a class="link" data-act="nav.mine" style="margin-left:auto">管理我的商品 →</a>`
                : `<button class="iconbtn ${fav ? 'on' : ''}" data-act="fav.toggle" data-id="${p.id}" title="收藏">
                     ${fav ? iconFill('heart', 19) : icon('heart', 19)}
                   </button>
                   ${p.status === 'sold'
                     ? `<button class="btn primary" disabled>已售出</button>`
                     : active && active.status !== 'pending_pay'
                     ? `<button class="btn primary" data-act="detail.toorder" data-id="${active.id}">查看订单</button>`
                     : `<button class="btn line" data-act="detail.chat" data-id="${p.id}">聊一聊</button>
                        <button class="btn primary" data-act="detail.buy" data-id="${p.id}">立即购买</button>`}`}
            </div>
          </div>
        </div>
      </div>`;
    },
  };

  CFM.actions['detail.thumb'] = (el) => {
    const main = document.getElementById('gmain');
    if (main) main.src = el.dataset.src;
    document.querySelectorAll('#gthumbs button').forEach((b) => b.classList.remove('on'));
    el.classList.add('on');
  };
  CFM.actions['detail.chat'] = async (el) => {
    const p = S.product(el.dataset.id);
    if (!p) return;
    if (p.status === 'sold') return CFM.ui.toast('商品已售出');
    if (p.sellerId === (S.me() || {}).id) return CFM.ui.toast('这是你自己发布的商品');
    try {
      const r = await S.ensureChat(p.id);
      CFM.router.go('messages', { id: r.chat.id });
    } catch (e) {
      CFM.ui.toast(e.message);
    }
  };

  /** 立即购买：按标价直接下单 */
  CFM.actions['detail.buy'] = async (el) => {
    const p = S.product(el.dataset.id);
    if (!p) return;
    const ok = await CFM.ui.confirmSheet({
      title: '立即购买',
      text: `按标价 ¥${p.price} 下单，商品会为你保留 15 分钟，请在订单页完成转账并上传凭证。`,
      okText: '确认下单',
    });
    if (!ok) return;
    try {
      const r = await S.buyNow(p.id);
      CFM.ui.toast('下单成功，请在 15 分钟内完成付款');
      CFM.router.go('order', { id: r.orderId });
    } catch (e) {
      CFM.ui.toast(e.message);
    }
  };
  CFM.actions['detail.seller'] = (el) => CFM.router.go('profile', { id: el.dataset.id });
  CFM.actions['detail.edit'] = (el) => CFM.router.go('publish', { id: el.dataset.id });
  CFM.actions['detail.off'] = async (el) => {
    try {
      await S.setProductStatus(el.dataset.id, 'off');
      CFM.ui.toast('已下架');
      CFM.router.refresh();
    } catch (e) {
      CFM.ui.toast(e.message);
    }
  };
  CFM.actions['detail.on'] = async (el) => {
    try {
      await S.setProductStatus(el.dataset.id, 'on_sale');
      CFM.ui.toast('已重新上架');
      CFM.router.refresh();
    } catch (e) {
      CFM.ui.toast(e.message);
    }
  };
  CFM.actions['detail.toorder'] = (el) => CFM.router.go('order', { id: el.dataset.id });
})();
