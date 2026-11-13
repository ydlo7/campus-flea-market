/**
 * 数据库：Node 内置 SQLite（node:sqlite，Node >= 22.5）
 * 数据文件：server/data/cfm.db
 */
const fs = require('fs');
const path = require('path');

let DatabaseSync;
try {
  ({ DatabaseSync } = require('node:sqlite'));
} catch (e) {
  console.error(
    '\n[启动失败] 当前 Node 版本不支持内置 SQLite（node:sqlite，需要 Node >= 22.5）。\n' +
      '请升级 Node 后重试，或执行：node --experimental-sqlite server/index.js\n'
  );
  process.exit(1);
}

const DATA_DIR = path.join(__dirname, 'data');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (
  k TEXT PRIMARY KEY,
  v TEXT
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  nick TEXT NOT NULL,
  phone TEXT UNIQUE,
  pwd TEXT,
  salt TEXT,
  school TEXT,
  campus TEXT,
  major TEXT,
  student_no TEXT,
  verified INTEGER DEFAULT 0,
  avatar TEXT,
  qr_image TEXT,
  bio TEXT,
  created_at INTEGER
);
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL,
  title TEXT NOT NULL,
  price REAL NOT NULL,
  orig_price REAL,
  category TEXT,
  condition TEXT,
  description TEXT,
  images TEXT,
  ratio REAL DEFAULT 1,
  delivery TEXT,
  status TEXT DEFAULT 'on_sale',
  views INTEGER DEFAULT 0,
  created_at INTEGER,
  sold_at INTEGER
);
CREATE TABLE IF NOT EXISTS favorites (
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  price_at_fav REAL,
  ts INTEGER,
  PRIMARY KEY (user_id, product_id)
);
CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  buyer_id TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  created_at INTEGER,
  last_ts INTEGER
);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  from_id TEXT,
  type TEXT NOT NULL,
  payload TEXT,
  ts INTEGER
);
CREATE TABLE IF NOT EXISTS chat_reads (
  chat_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  last_read_at INTEGER,
  PRIMARY KEY (chat_id, user_id)
);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  no TEXT,
  product_id TEXT NOT NULL,
  chat_id TEXT,
  buyer_id TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  amount REAL,
  delivery TEXT,
  location TEXT,
  time TEXT,
  status TEXT,
  created_at INTEGER,
  expires_at INTEGER,
  buyer_confirmed INTEGER DEFAULT 0,
  seller_confirmed INTEGER DEFAULT 0,
  proof TEXT,
  cancel_reason TEXT,
  timeline TEXT
);
CREATE TABLE IF NOT EXISTS notices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT,
  title TEXT,
  text TEXT,
  product_id TEXT,
  order_id TEXT,
  ts INTEGER,
  "read" INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id, ts);
CREATE INDEX IF NOT EXISTS idx_notices_user ON notices(user_id, ts);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(buyer_id, seller_id);
`;

function open(file) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(file || path.join(DATA_DIR, 'cfm.db'));
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);

  const api = {
    raw: db,
    all(sql, params) {
      return db.prepare(sql).all(...(params || []));
    },
    get(sql, params) {
      return db.prepare(sql).get(...(params || [])) || null;
    },
    run(sql, params) {
      return db.prepare(sql).run(...(params || []));
    },
    exec(sql) {
      db.exec(sql);
    },
    tx(fn) {
      db.exec('BEGIN');
      try {
        const r = fn();
        db.exec('COMMIT');
        return r;
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
    /** 每次写操作后 +1，前端轮询该值判断是否需要刷新 */
    bump() {
      api.run("UPDATE meta SET v = CAST(CAST(v AS INTEGER) + 1 AS TEXT) WHERE k = 'version'");
    },
    version() {
      const row = api.get("SELECT v FROM meta WHERE k = 'version'");
      return row ? Number(row.v) : 0;
    },
    getMeta(key, fallback) {
      const row = api.get('SELECT v FROM meta WHERE k = ?', [key]);
      return row ? row.v : fallback;
    },
    setMeta(key, value) {
      api.run('INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v', [key, String(value)]);
    },
    close() {
      db.close();
    },
  };

  if (!api.get("SELECT v FROM meta WHERE k = 'version'")) {
    api.run("INSERT INTO meta (k, v) VALUES ('version', '1')");
  }
  return api;
}

module.exports = { open, DATA_DIR };
