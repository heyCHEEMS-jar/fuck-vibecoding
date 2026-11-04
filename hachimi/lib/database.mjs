import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  createSessionToken,
  hashKey,
  hashPassword,
  hashSessionToken,
  verifyPassword,
} from './security.mjs';
import { createDefaultSave, sanitizeSave } from './game-data.mjs';

export function openDatabase(filename) {
  mkdirSync(dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT NOT NULL,
      username_norm TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activation_keys (
      id INTEGER PRIMARY KEY,
      code_hash TEXT NOT NULL UNIQUE,
      code_hint TEXT NOT NULL,
      batch TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      redeemed_at INTEGER,
      redeemed_by INTEGER REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS saves (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      payload TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);
  `);
  return db;
}

export function insertActivationKeys(db, codes, pepper, batch = 'manual') {
  const statement = db.prepare(`
    INSERT INTO activation_keys (code_hash, code_hint, batch, created_at)
    VALUES (?, ?, ?, ?)
  `);
  const now = Date.now();
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const code of codes) {
      statement.run(hashKey(code, pepper), code.slice(-4), batch, now);
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function registerUser(db, { username, password, activationKey, save }, options) {
  const usernameNorm = username.normalize('NFKC').toLocaleLowerCase('zh-CN');
  const codeHash = hashKey(activationKey, options.keyPepper);
  const now = Date.now();
  const { salt, digest } = hashPassword(password);
  const safeSave = sanitizeSave(save ?? createDefaultSave());

  db.exec('BEGIN IMMEDIATE');
  try {
    const key = db.prepare(`
      SELECT id FROM activation_keys
      WHERE code_hash = ? AND redeemed_at IS NULL
    `).get(codeHash);
    if (!key) throw Object.assign(new Error('激活码无效或已使用'), { status: 409 });

    const result = db.prepare(`
      INSERT INTO users (username, username_norm, password_hash, password_salt, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(username, usernameNorm, digest, salt, now);
    const userId = Number(result.lastInsertRowid);

    db.prepare(`
      UPDATE activation_keys SET redeemed_at = ?, redeemed_by = ? WHERE id = ?
    `).run(now, userId, key.id);
    db.prepare(`
      INSERT INTO saves (user_id, payload, updated_at) VALUES (?, ?, ?)
    `).run(userId, JSON.stringify(safeSave), now);

    const session = createSession(db, userId, options.sessionDays);
    db.exec('COMMIT');
    return { user: { id: userId, username }, save: safeSave, session };
  } catch (error) {
    db.exec('ROLLBACK');
    if (String(error.message).includes('users.username_norm')) {
      throw Object.assign(new Error('用户名已被使用'), { status: 409 });
    }
    throw error;
  }
}

export function loginUser(db, username, password, sessionDays) {
  const usernameNorm = username.normalize('NFKC').toLocaleLowerCase('zh-CN');
  const user = db.prepare(`
    SELECT id, username, password_hash, password_salt
    FROM users WHERE username_norm = ?
  `).get(usernameNorm);

  if (!user || !verifyPassword(password, user.password_salt, user.password_hash)) {
    throw Object.assign(new Error('用户名或密码错误'), { status: 401 });
  }

  const row = db.prepare('SELECT payload FROM saves WHERE user_id = ?').get(user.id);
  return {
    user: { id: Number(user.id), username: user.username },
    save: row ? sanitizeSave(JSON.parse(row.payload)) : createDefaultSave(),
    session: createSession(db, Number(user.id), sessionDays),
  };
}

function createSession(db, userId, sessionDays) {
  const token = createSessionToken();
  const now = Date.now();
  const expiresAt = now + sessionDays * 86_400_000;
  db.prepare(`
    INSERT INTO sessions (token_hash, user_id, expires_at, created_at)
    VALUES (?, ?, ?, ?)
  `).run(hashSessionToken(token), userId, expiresAt, now);
  return { token, expiresAt };
}

export function getSession(db, token) {
  if (!token) return null;
  const row = db.prepare(`
    SELECT users.id, users.username, saves.payload
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    LEFT JOIN saves ON saves.user_id = users.id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?
  `).get(hashSessionToken(token), Date.now());
  if (!row) return null;
  return {
    user: { id: Number(row.id), username: row.username },
    save: row.payload ? sanitizeSave(JSON.parse(row.payload)) : createDefaultSave(),
  };
}

export function saveGame(db, userId, save) {
  const safeSave = sanitizeSave(save);
  db.prepare(`
    INSERT INTO saves (user_id, payload, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at
  `).run(userId, JSON.stringify(safeSave), Date.now());
  return safeSave;
}

export function deleteSession(db, token) {
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashSessionToken(token));
}

export function clearExpiredSessions(db) {
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());
}
