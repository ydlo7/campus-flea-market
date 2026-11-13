/**
 * REST 路由
 * 约定：所有写操作成功后都会返回最新 snapshot，前端直接替换本地缓存
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, 'uploads');
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

function saveDataUrl(dataUrl) {
  const m = /^data:(image\/(png|jpeg|jpg|webp|svg\+xml));base64,(.+)$/i.exec(String(dataUrl || ''));
  if (!m) {
    const e = new Error('图片格式不支持');
    e.status = 400;
    throw e;
  }
  const buf = Buffer.from(m[3], 'base64');
  if (buf.length > MAX_IMAGE_BYTES) {
    const e = new Error('图片太大了（上限 2MB）');
    e.status = 413;
    throw e;
  }
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const ext = m[2].toLowerCase() === 'jpeg' ? 'jpg' : m[2].toLowerCase().replace('svg+xml', 'svg');
  const name = crypto.randomBytes(8).toString('hex') + '.' + ext;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
  return '/uploads/' + name;
}

module.exports = function createRoutes(domain) {
  const routes = [];
  const add = (method, pattern, fn, opts) => {
    const keys = [];
    const re = new RegExp(
      '^' +
        pattern.replace(/:[a-zA-Z]+/g, (k) => {
          keys.push(k.slice(1));
          return '([^/]+)';
        }) +
        '$'
    );
    routes.push({ method, re, keys, fn, auth: !opts || opts.auth !== false });
  };

  const wrap = (fn) => (ctx) => {
    const extra = fn(ctx) || {};
    const asUser = extra.userId || (ctx.user ? ctx.user.id : null);
    delete extra.userId;
    return Object.assign({}, extra, { snapshot: domain.snapshot(asUser) });
  };

  /* ---------------- 认证 ---------------- */
  add(
    'POST',
    '/api/auth/login',
    wrap(({ body }) => {
      const r = domain.login(body.phone, body.pwd);
      return { token: r.token, userId: r.userId };
    }),
    { auth: false }
  );

  add(
    'POST',
    '/api/auth/register',
    wrap(({ body }) => {
      const r = domain.register(body);
      return { token: r.token, userId: r.userId };
    }),
    { auth: false }
  );

  add('POST', '/api/auth/logout', wrap(() => ({ ok: true })));

  add('GET', '/api/auth/me', wrap(({ user }) => ({ me: domain.user(user.id) })));

  add(
    'POST',
    '/api/demo/switch',
    wrap(({ body }) => {
      const r = domain.switchDemo(body.userId);
      return { token: r.token, userId: r.userId };
    }),
    { auth: false }
  );

  add('POST', '/api/demo/reset', wrap(() => ({ reset: domain.resetDemo() })));

  /* ---------------- 快照 ---------------- */
  add('GET', '/api/snapshot', ({ user }) => domain.snapshot(user.id));
  add('GET', '/api/version', () => ({ version: domain.version() }), { auth: false });

  /* ---------------- 上传 ---------------- */
  add('POST', '/api/upload', ({ body }) => ({ url: saveDataUrl(body.data) }));

  /* ---------------- 商品 ---------------- */
  add('POST', '/api/products', wrap(({ user, body }) => ({ product: domain.createProduct(user.id, body) })));
  add('PATCH', '/api/products/:id', wrap(({ user, params, body }) => ({ product: domain.updateProduct(user.id, params.id, body) })));
  add('POST', '/api/products/:id/status', wrap(({ user, params, body }) => ({ product: domain.setProductStatus(user.id, params.id, body.status) })));
  add('DELETE', '/api/products/:id', wrap(({ user, params }) => ({ deleted: domain.deleteProduct(user.id, params.id) })));
  add('POST', '/api/products/:id/view', wrap(({ params }) => ({ product: domain.viewProduct(params.id) })));
  add('POST', '/api/products/:id/buy', wrap(({ user, params }) => ({ orderId: domain.buyNow(user.id, params.id) })));

  /* ---------------- 收藏 ---------------- */
  add('POST', '/api/favorites/:id/toggle', wrap(({ user, params }) => domain.toggleFavorite(user.id, params.id)));

  /* ---------------- 会话 ---------------- */
  add('POST', '/api/chats', wrap(({ user, body }) => ({ chat: domain.ensureChat(user.id, body.productId) })));
  add('POST', '/api/chats/:id/messages', wrap(({ user, params, body }) => ({ message: domain.sendMessage(user.id, params.id, body) })));
  add('POST', '/api/chats/:id/read', wrap(({ user, params }) => ({ read: domain.readChat(user.id, params.id) })));
  add('POST', '/api/chats/:id/quotes/:msgId/respond', wrap(({ user, params, body }) => domain.respondQuote(user.id, params.id, params.msgId, !!body.accept)));

  /* ---------------- 订单 ---------------- */
  add('POST', '/api/orders/:id/proof', wrap(({ user, params, body }) => ({ order: domain.uploadProof(user.id, params.id, body.url) })));
  add('POST', '/api/orders/:id/confirm-payment', wrap(({ user, params }) => ({ order: domain.confirmPayment(user.id, params.id) })));
  add('POST', '/api/orders/:id/confirm-receipt', wrap(({ user, params }) => ({ order: domain.confirmReceipt(user.id, params.id) })));
  add('POST', '/api/orders/:id/cancel', wrap(({ user, params }) => ({ order: domain.cancelOrder(user.id, params.id) })));

  /* ---------------- 通知与资料 ---------------- */
  add('POST', '/api/notices/read', wrap(({ user }) => ({ read: domain.readNotices(user.id) })));
  add('PATCH', '/api/profile', wrap(({ user, body }) => ({ user: domain.updateProfile(user.id, body) })));

  function match(method, pathname) {
    for (const r of routes) {
      if (r.method !== method) continue;
      const m = r.re.exec(pathname);
      if (!m) continue;
      const params = {};
      r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
      return { route: r, params };
    }
    return null;
  }

  return { match, routes, saveDataUrl };
};
