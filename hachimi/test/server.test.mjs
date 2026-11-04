import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { insertActivationKeys } from '../lib/database.mjs'
import { sanitizeSave } from '../lib/game-data.mjs'
import { createMoodServer } from '../server.mjs'

const pepper = 'test-pepper-with-at-least-thirty-two-characters'
const key = 'MGP-AAAA-BBBB-CCCC-DDDD'

async function request(base, path, { method = 'GET', body, cookie } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  })
  return { response, data: await response.json() }
}

test('注册、激活码、云存档和登录形成完整闭环', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'mood-terrarium-'))
  const app = createMoodServer({
    databaseFile: join(dir, 'test.db'),
    keyPepper: pepper,
    secureCookies: false
  })
  insertActivationKeys(app.db, [key], pepper, 'test')
  await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${app.server.address().port}`

  t.after(async () => {
    await new Promise((resolve) => app.server.close(resolve))
    await rm(dir, { recursive: true, force: true })
  })

  const invalid = await request(base, '/api/register', {
    method: 'POST',
    body: { username: '测试玩家', password: 'password123', activationKey: 'MGP-1111-2222-3333-4444' }
  })
  assert.equal(invalid.response.status, 409)

  const registered = await request(base, '/api/register', {
    method: 'POST',
    body: {
      username: '测试玩家',
      password: 'password123',
      activationKey: key,
      save: { glow: 42, mood: 'bright', discovered: { sunbud: 1 } }
    }
  })
  assert.equal(registered.response.status, 201)
  assert.equal(registered.data.save.glow, 42)
  const cookie = registered.response.headers.get('set-cookie').split(';')[0]

  const reused = await request(base, '/api/register', {
    method: 'POST',
    body: { username: '另一个玩家', password: 'password123', activationKey: key }
  })
  assert.equal(reused.response.status, 409)

  const saved = await request(base, '/api/save', {
    method: 'PUT',
    cookie,
    body: { save: { glow: 77, mood: 'calm', discovered: { dewdrop: 2, fake: 999 }, stats: { bestInfiniteTimeMs: 65432 } } }
  })
  assert.equal(saved.response.status, 200)
  assert.deepEqual(saved.data.save.discovered, { dewdrop: 2 })
  assert.equal(saved.data.save.stats.bestInfiniteTimeMs, 65432)

  const session = await request(base, '/api/session', { cookie })
  assert.equal(session.data.authenticated, true)
  assert.equal(session.data.save.glow, 77)
  assert.equal(session.data.save.stats.bestInfiniteTimeMs, 65432)

  const login = await request(base, '/api/login', {
    method: 'POST',
    body: { username: '测试玩家', password: 'password123' }
  })
  assert.equal(login.response.status, 200)
  assert.equal(login.data.save.glow, 77)
  assert.equal(login.data.save.stats.bestInfiniteTimeMs, 65432)
})

test('存档边界会过滤未知物种并限制数值', () => {
  const save = sanitizeSave({
    glow: Number.MAX_SAFE_INTEGER,
    hatches: -4,
    mood: 'unknown',
    discovered: { dewdrop: 2, injected: 9 },
    specimens: [{ id: 'dewdrop', rarity: 'epic' }, { id: 'injected' }]
  })
  assert.equal(save.glow, 1_000_000)
  assert.equal(save.hatches, 0)
  assert.equal(save.mood, 'calm')
  assert.deepEqual(save.discovered, { dewdrop: 2 })
  assert.equal(save.specimens.length, 1)
})

test('无限竞技最快用时兼容旧存档并过滤非法数值', () => {
  assert.equal(sanitizeSave({}).stats.bestInfiniteTimeMs, 0)
  assert.equal(sanitizeSave({ stats: { bestInfiniteTimeMs: 65432.9 } }).stats.bestInfiniteTimeMs, 65432)
  for (const value of [-10, NaN, Infinity, 'invalid']) {
    assert.equal(sanitizeSave({ stats: { bestInfiniteTimeMs: value } }).stats.bestInfiniteTimeMs, 0)
  }
  assert.equal(sanitizeSave({ stats: { bestInfiniteTimeMs: Number.MAX_SAFE_INTEGER } }).stats.bestInfiniteTimeMs, 86_400_000)
})
