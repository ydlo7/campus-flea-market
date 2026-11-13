/* ===== 页面：发布 / 编辑商品 ===== */
(function () {
  const CFM = window.CFM;
  const { icon, esc } = CFM.ui;
  const S = CFM.store;

  let st = null;
  let editingId = null;

  function blank() {
    return { title: '', price: '', category: '数码电子', condition: '九成新', desc: '', delivery: ['校内面交'], images: [], ratio: 1 };
  }
  function fromProduct(p) {
    return {
      title: p.title,
      price: String(p.price),
      category: p.category,
      condition: p.condition,
      desc: p.desc || '',
      delivery: (p.delivery || []).slice(),
      images: (p.images || []).slice(),
      ratio: p.ratio || 1,
    };
  }

  CFM.pages.publish = {
    render(params) {
      const isEdit = !!params.id;
      if (isEdit) {
        const p = S.product(params.id);
        if (!p) return `<div class="wrap"><div class="empty"><b>商品不存在</b></div></div>`;
        if (editingId !== p.id) {
          editingId = p.id;
          st = fromProduct(p);
        }
      } else if (editingId !== null || !st) {
        editingId = null;
        st = blank();
      }

      const cats = ['数码电子', '图书教材', '宿舍好物', '服饰鞋包', '运动户外', '文体乐器', '其他'];

      return `
      <div class="wrap narrow">
        <div class="page-head">
          <a class="back" data-act="nav.back">${icon('back', 13)} 返回</a>
          <h1>${editingId ? '编辑商品' : '发布闲置'}</h1>
        </div>

        <div class="form">
          <div class="frow">
            <label>图片</label>
            <div class="fmain">
              <div class="uploader">
                ${st.images
                  .map(
                    (src, i) => `<div class="upl">
                      <img src="${src}" alt="">
                      ${i === 0 ? '<div class="cover">封面</div>' : ''}
                      <button class="x" data-act="pub.delImage" data-i="${i}" aria-label="删除">${icon('close', 10)}</button>
                    </div>`
                  )
                  .join('')}
                ${st.images.length < 4
                  ? `<button class="upl-add" data-act="pub.addImage">${icon('plus', 16)}<span style="margin-left:4px">添加</span></button>`
                  : ''}
              </div>
              <div class="hint">最多 4 张，第一张作为封面；建议实拍，别用网图</div>
            </div>
          </div>

          <div class="frow">
            <label>标题</label>
            <div class="fmain">
              <input class="inp" id="fTitle" maxlength="30" placeholder="品牌型号 + 成色，例：罗技 G102 鼠标 九成新" value="${esc(st.title)}">
              <div class="counter"><span id="cTitle">${st.title.length}</span>/30</div>
            </div>
          </div>

          <div class="frow">
            <label>价格</label>
            <div class="fmain">
              <div class="price-inp">
                <span>¥</span>
                <input class="inp" id="fPrice" type="number" min="0" step="1" placeholder="0" value="${esc(st.price)}">
              </div>
              <div class="hint">只接受校内面交或快递，价格就是你的心理底价</div>
            </div>
          </div>

          <div class="frow">
            <label>分类</label>
            <div class="fmain">
              <select class="sel" id="fCat">
                ${cats.map((c) => `<option value="${c}" ${st.category === c ? 'selected' : ''}>${c}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="frow">
            <label>成色</label>
            <div class="fmain">
              <select class="sel" id="fCond">
                ${S.CONDITIONS.map((c) => `<option value="${c}" ${st.condition === c ? 'selected' : ''}>${c}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="frow">
            <label>交货方式</label>
            <div class="fmain">
              <div class="checks">
                ${S.DELIVERIES.map(
                  (d) => `<label><input type="checkbox" data-deliv="${d}" ${st.delivery.indexOf(d) >= 0 ? 'checked' : ''}> ${d}</label>`
                ).join('')}
              </div>
              <div class="hint">可多选，至少选一项</div>
            </div>
          </div>

          <div class="frow">
            <label>描述</label>
            <div class="fmain">
              <textarea class="ta" id="fDesc" maxlength="300" placeholder="入手时间、使用情况、瑕疵、赠品、可议价空间…写清楚更容易成交">${esc(st.desc)}</textarea>
              <div class="counter"><span id="cDesc">${st.desc.length}</span>/300</div>
            </div>
          </div>

          <div class="form-foot">
            <a class="link" data-act="nav.back">取消</a>
            <button class="btn primary" data-act="pub.submit">${editingId ? '保存修改' : '发布'}</button>
          </div>
        </div>
      </div>`;
    },
    mount() {
      const t = document.getElementById('fTitle');
      const p = document.getElementById('fPrice');
      const d = document.getElementById('fDesc');
      const cat = document.getElementById('fCat');
      const cond = document.getElementById('fCond');
      if (t) {
        t.addEventListener('input', () => {
          st.title = t.value;
          const c = document.getElementById('cTitle');
          if (c) c.textContent = t.value.length;
        });
      }
      if (p) p.addEventListener('input', () => (st.price = p.value));
      if (d) {
        d.addEventListener('input', () => {
          st.desc = d.value;
          const c = document.getElementById('cDesc');
          if (c) c.textContent = d.value.length;
        });
      }
      if (cat) cat.addEventListener('change', () => (st.category = cat.value));
      if (cond) cond.addEventListener('change', () => (st.condition = cond.value));
      document.querySelectorAll('[data-deliv]').forEach((cb) =>
        cb.addEventListener('change', () => {
          const v = cb.dataset.deliv;
          const i = st.delivery.indexOf(v);
          if (cb.checked && i < 0) st.delivery.push(v);
          if (!cb.checked && i >= 0) st.delivery.splice(i, 1);
        })
      );
    },
  };

  function sync() {
    const t = document.getElementById('fTitle');
    const p = document.getElementById('fPrice');
    const d = document.getElementById('fDesc');
    const cat = document.getElementById('fCat');
    const cond = document.getElementById('fCond');
    if (t) st.title = t.value;
    if (p) st.price = p.value;
    if (d) st.desc = d.value;
    if (cat) st.category = cat.value;
    if (cond) st.condition = cond.value;
  }

  CFM.actions['pub.addImage'] = async () => {
    sync();
    if (st.images.length >= 4) return CFM.ui.toast('最多 4 张图');
    const r = await CFM.ui.pickImage(900);
    if (!r) return;
    st.images.push(r.data);
    if (st.images.length === 1 && r.w && r.h) st.ratio = Math.max(0.66, Math.min(1.3, r.w / r.h));
    CFM.router.refresh();
  };
  CFM.actions['pub.delImage'] = (el) => {
    sync();
    st.images.splice(Number(el.dataset.i), 1);
    CFM.router.refresh();
  };
  CFM.actions['pub.submit'] = () => {
    sync();
    if (!st.title.trim() || st.title.trim().length < 4) return CFM.ui.toast('标题至少 4 个字');
    const price = Number(st.price);
    if (!price || price <= 0) return CFM.ui.toast('填一个有效价格');
    if (!st.delivery.length) return CFM.ui.toast('至少选择一种交货方式');
    if (!st.images.length) return CFM.ui.toast('至少上传一张图片');

    const payload = {
      title: st.title.trim(),
      price,
      category: st.category,
      condition: st.condition,
      desc: st.desc.trim(),
      delivery: st.delivery.slice(),
      images: st.images.slice(),
      ratio: st.ratio,
    };

    if (editingId) {
      const id = editingId;
      S.updateProduct(id, payload);
      editingId = null;
      st = null;
      CFM.ui.toast('已保存');
      CFM.router.back();
      const cur = CFM.router.current();
      if (cur && cur.name === 'detail' && cur.params.id === id) CFM.router.refresh();
      return;
    }
    const p = S.createProduct(payload);
    st = null;
    editingId = null;
    if (!p) return CFM.ui.toast('发布失败，请重试');
    CFM.ui.toast('发布成功');
    CFM.router.replace('detail', { id: p.id });
  };
})();
