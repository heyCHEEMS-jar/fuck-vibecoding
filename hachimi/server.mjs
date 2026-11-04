import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  clearExpiredSessions,
  deleteSession,
  getSession,
  loginUser,
  openDatabase,
  registerUser,
  saveGame,
} from './lib/database.mjs';
import { isValidKeyFormat } from './lib/security.mjs';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC = resolve(ROOT, 'public');
const STATIC_FILES = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/runner.js', ['runner.js', 'text/javascript; charset=utf-8']],
  ['/assets/dewdrop.svg', ['assets/dewdrop.svg', 'image/svg+xml']],
  ['/assets/dewdrop-back.svg', ['assets/dewdrop-back.svg', 'image/svg+xml']],
  ['/assets/rainpuff.svg', ['assets/rainpuff.svg', 'image/svg+xml']],
  ['/assets/rainpuff-back.svg', ['assets/rainpuff-back.svg', 'image/svg+xml']],
  ['/assets/emberbubble.svg', ['assets/emberbubble.svg', 'image/svg+xml']],
  ['/assets/emberbubble-back.svg', ['assets/emberbubble-back.svg', 'image/svg+xml']],
  ['/assets/hachimi.svg', ['assets/hachimi.svg', 'image/svg+xml']],
  ['/assets/hachimi-hiss.svg', ['assets/hachimi-hiss.svg', 'image/svg+xml']],
  ['/assets/hachimi-back.svg', ['assets/hachimi-back.svg', 'image/svg+xml']],
  ['/assets/outfit-frog.svg', ['assets/outfit-frog.svg', 'image/svg+xml']],
  ['/assets/outfit-frog-back.svg', ['assets/outfit-frog-back.svg', 'image/svg+xml']],
  ['/assets/outfit-sleep.svg', ['assets/outfit-sleep.svg', 'image/svg+xml']],
  ['/assets/outfit-sleep-back.svg', ['assets/outfit-sleep-back.svg', 'image/svg+xml']],
  ['/assets/outfit-office.svg', ['assets/outfit-office.svg', 'image/svg+xml']],
  ['/assets/outfit-office-back.svg', ['assets/outfit-office-back.svg', 'image/svg+xml']],
  ['/favicon.svg', ['favicon.svg', 'image/svg+xml']],
  ['/favicon.ico', ['favicon.svg', 'image/svg+xml']],
]);
const USERNAME_PATTERN = /^[\p{L}\p{N}_-]{3,24}$/u;

function sendJson(response, status, data, headers = {}) {
  const body = JSON.stringify(data);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    ...headers,
  });
  response.end(body);
}

function securityHeaders() {
  return {
    'Content-Security-Policy': "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };
}

function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').flatMap((part) => {
    const index = part.indexOf('=');
    if (index < 0) return [];
    return [[part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())]];
  }));
}

async function readJson(request, maximum = 128 * 1024) {
  if (!String(request.headers['content-type'] ?? '').startsWith('application/json')) {
    throw Object.assign(new Error('请求必须使用 JSON'), { status: 415 });
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maximum) throw Object.assign(new Error('请求内容过大'), { status: 413 });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    throw Object.assign(new Error('JSON 格式错误'), { status: 400 });
  }
}

function validateCredentials(body, needsKey = false) {
  const username = String(body.username ?? '').trim().normalize('NFKC');
  const password = String(body.password ?? '');
  if (!USERNAME_PATTERN.test(username)) {
    throw Object.assign(new Error('用户名需为 3–24 位中文、字母、数字、下划线或短横线'), { status: 400 });
  }
  if (password.length < 8 || password.length > 128) {
    throw Object.assign(new Error('密码需为 8–128 位'), { status: 400 });
  }
  if (needsKey && !isValidKeyFormat(body.activationKey)) {
    throw Object.assign(new Error('激活码格式不正确'), { status: 400 });
  }
  return { username, password };
}

function sessionCookie(session, secure) {
  const maxAge = Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000));
  return `sid=${encodeURIComponent(session.token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}

function clearCookie(secure) {
  return `sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`;
}

function assertSameOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return;
  try {
    if (new URL(origin).host !== request.headers.host) {
      throw Object.assign(new Error('跨站请求已拒绝'), { status: 403 });
    }
  } catch (error) {
    if (error.status) throw error;
    throw Object.assign(new Error('请求来源无效'), { status: 403 });
  }
}

function createRateLimiter({ windowMs = 60_000, maximum = 12 } = {}) {
  const entries = new Map();
  return (key) => {
    const now = Date.now();
    const entry = entries.get(key);
    if (!entry || entry.resetAt <= now) {
      entries.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }
    entry.count += 1;
    if (entry.count > maximum) {
      throw Object.assign(new Error('操作过于频繁，请稍后再试'), { status: 429 });
    }
    if (entries.size > 10_000) {
      for (const [entryKey, value] of entries) {
        if (value.resetAt <= now) entries.delete(entryKey);
      }
    }
  };
}

function clientIp(request, trustProxy) {
  if (trustProxy) {
    return String(request.headers['x-forwarded-for'] ?? '').split(',')[0].trim()
      || request.socket.remoteAddress
      || 'unknown';
  }
  return request.socket.remoteAddress || 'unknown';
}

export function createMoodServer(options = {}) {
  const config = {
    databaseFile: options.databaseFile ?? resolve(ROOT, 'data/mood-terrarium.db'),
    keyPepper: options.keyPepper ?? process.env.KEY_PEPPER ?? 'development-only-pepper-change-before-production',
    sessionDays: options.sessionDays ?? Number(process.env.SESSION_DAYS ?? 30),
    secureCookies: options.secureCookies ?? process.env.NODE_ENV === 'production',
    trustProxy: options.trustProxy ?? process.env.TRUST_PROXY === '1',
  };
  if (config.keyPepper.length < 32) throw new Error('KEY_PEPPER 至少需要 32 位');
  if (process.env.NODE_ENV === 'production' && config.keyPepper.startsWith('development-only')) {
    throw new Error('生产环境必须设置独立的 KEY_PEPPER');
  }

  const db = openDatabase(config.databaseFile);
  clearExpiredSessions(db);
  const limitAuth = createRateLimiter();

  const server = createServer(async (request, response) => {
    Object.entries(securityHeaders()).forEach(([name, value]) => response.setHeader(name, value));
    const url = new URL(request.url ?? '/', 'http://localhost');

    try {
      if (request.method === 'GET' && STATIC_FILES.has(url.pathname)) {
        const [filename, contentType] = STATIC_FILES.get(url.pathname);
        const body = await readFile(resolve(PUBLIC, filename));
        response.writeHead(200, {
          'Content-Type': contentType,
          'Content-Length': body.length,
          'Cache-Control': process.env.NODE_ENV === 'production' && filename !== 'index.html'
            ? 'public, max-age=3600'
            : 'no-cache',
        });
        response.end(body);
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/health') {
        sendJson(response, 200, { ok: true });
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/session') {
        const token = parseCookies(request.headers.cookie).sid;
        const session = getSession(db, token);
        sendJson(response, 200, session
          ? { authenticated: true, ...session }
          : { authenticated: false });
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/register') {
        assertSameOrigin(request);
        limitAuth(`register:${clientIp(request, config.trustProxy)}`);
        const body = await readJson(request);
        const credentials = validateCredentials(body, true);
        const result = registerUser(db, {
          ...credentials,
          activationKey: body.activationKey,
          save: body.save,
        }, config);
        sendJson(response, 201, { user: result.user, save: result.save }, {
          'Set-Cookie': sessionCookie(result.session, config.secureCookies),
        });
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/login') {
        assertSameOrigin(request);
        limitAuth(`login:${clientIp(request, config.trustProxy)}`);
        const body = await readJson(request);
        const { username, password } = validateCredentials(body);
        const result = loginUser(db, username, password, config.sessionDays);
        sendJson(response, 200, { user: result.user, save: result.save }, {
          'Set-Cookie': sessionCookie(result.session, config.secureCookies),
        });
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/logout') {
        assertSameOrigin(request);
        const token = parseCookies(request.headers.cookie).sid;
        deleteSession(db, token);
        sendJson(response, 200, { ok: true }, { 'Set-Cookie': clearCookie(config.secureCookies) });
        return;
      }

      if (request.method === 'PUT' && url.pathname === '/api/save') {
        assertSameOrigin(request);
        const token = parseCookies(request.headers.cookie).sid;
        const session = getSession(db, token);
        if (!session) throw Object.assign(new Error('请先登录'), { status: 401 });
        const body = await readJson(request, 64 * 1024);
        const save = saveGame(db, session.user.id, body.save);
        sendJson(response, 200, { save });
        return;
      }

      sendJson(response, 404, { error: '页面不存在' });
    } catch (error) {
      const status = Number.isInteger(error.status) ? error.status : 500;
      if (status === 500) console.error(error);
      sendJson(response, status, { error: status === 500 ? '服务器暂时开小差了' : error.message });
    }
  });

  server.on('close', () => db.close());
  return { server, db, config };
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const host = process.env.HOST ?? '127.0.0.1';
  const port = Number(process.env.PORT ?? 3000);
  const { server } = createMoodServer();
  server.listen(port, host, () => {
    console.log(`情绪生态瓶已启动：http://${host}:${port}`);
  });
}
