/**
 * 服务端入口：静态资源 + REST API
 * 启动：npm start   （默认 http://localhost:3000）
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const { open } = require('./db');
const createDomain = require('./domain');
const createRoutes = require('./routes');
const { userByToken } = require('./auth');
const seed = require('./seed');

const ROOT = path.resolve(__dirname, '..');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const MAX_BODY = 12 * 1024 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.md': 'text/markdown; charset=utf-8',
};

function sendJSON(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('请求体过大'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (e) {
        reject(Object.assign(new Error('JSON 解析失败'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function serveStatic(req, res, pathname) {
  let file;
  if (pathname.startsWith('/uploads/')) {
    file = path.join(UPLOAD_DIR, pathname.replace('/uploads/', ''));
    if (!file.startsWith(UPLOAD_DIR)) return notFound(res);
  } else {
    file = path.join(ROOT, pathname === '/' ? 'index.html' : pathname);
    if (!file.startsWith(ROOT)) return notFound(res);
  }

  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return notFound(res);
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': st.size,
      'Cache-Control': pathname.startsWith('/uploads/') ? 'public, max-age=86400' : 'no-cache',
    });
    fs.createReadStream(file).pipe(res);
  });
}

function notFound(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 Not Found');
}

function createServer(opts) {
  const db = (opts && opts.db) || open(opts && opts.file);
  const domain = createDomain(db);
  const router = createRoutes(domain);

  // 首次启动写入演示数据
  if (!db.get('SELECT id FROM users LIMIT 1')) {
    db.tx(() => seed.run(db));
    db.bump();
    console.log('[init] 已写入演示数据');
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);

    if (!pathname.startsWith('/api/')) return serveStatic(req, res, pathname);

    try {
      if (req.method === 'GET' && pathname === '/api/health') {
        return sendJSON(res, 200, { ok: true, version: db.version() });
      }

      const hit = router.match(req.method, pathname);
      if (!hit) return sendJSON(res, 404, { error: '接口不存在' });

      const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      const user = userByToken(db, token);

      if (hit.route.auth && !user) return sendJSON(res, 401, { error: '请先登录' });

      const body = req.method === 'GET' ? {} : await readBody(req);
      const data = hit.route.fn({ req, res, db, domain, user, body, params: hit.params, query: url.searchParams });

      if (req.method === 'POST' && pathname === '/api/auth/logout') {
        db.run('DELETE FROM sessions WHERE token = ?', [token]);
      }

      return sendJSON(res, 200, Object.assign({ ok: true }, data));
    } catch (e) {
      const status = e.status || 500;
      if (status >= 500) console.error('[api]', req.method, pathname, e);
      return sendJSON(res, status, { ok: false, error: e.message || '服务异常' });
    }
  });

  server.db = db;
  server.domain = domain;
  return server;
}

function start(port) {
  const p = port || Number(process.env.PORT) || 3000;
  const server = createServer();
  server.listen(p, () => {
    const addr = server.address();
    console.log(`\n  校园跳蚤市场已启动：http://localhost:${addr.port}\n`);
  });
  return server;
}

module.exports = { createServer, start, ROOT };

if (require.main === module) start();
