/**
 * 认证：口令散列（scrypt）+ 会话令牌
 */
const crypto = require('crypto');

function makeSalt() {
  return crypto.randomBytes(8).toString('hex');
}

function hashPassword(pwd, salt) {
  return crypto.scryptSync(String(pwd), salt, 32).toString('hex');
}

function verifyPassword(pwd, salt, stored) {
  const h = hashPassword(pwd, salt);
  const a = Buffer.from(h, 'hex');
  const b = Buffer.from(stored || '', 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function createSession(db, userId) {
  const token = crypto.randomBytes(24).toString('hex');
  db.run('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)', [token, userId, Date.now()]);
  return token;
}

function userByToken(db, token) {
  if (!token) return null;
  const row = db.get(
    'SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?',
    [token]
  );
  return row || null;
}

function dropSession(db, token) {
  db.run('DELETE FROM sessions WHERE token = ?', [token]);
}

module.exports = { makeSalt, hashPassword, verifyPassword, createSession, userByToken, dropSession };
