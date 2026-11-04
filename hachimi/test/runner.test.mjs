import assert from 'node:assert/strict'
import test from 'node:test'
import { Runner, INFINITE_TARGET_MASS } from '../public/runner.js'

let frameId = 0
const frames = new Map()
globalThis.window = { devicePixelRatio: 1, addEventListener() {}, removeEventListener() {} }
globalThis.requestAnimationFrame = (callback) => {
  frames.set(++frameId, callback)
  return frameId
}
globalThis.cancelAnimationFrame = (id) => frames.delete(id)

function fixture(t, options = {}) {
  const texts = []
  const ctx = new Proxy({
    fillText(text) { texts.push(text) },
    createLinearGradient() { return { addColorStop() {} } }
  }, { get: (target, name) => target[name] ?? (() => {}) })
  const canvas = {
    getContext: () => ctx,
    getBoundingClientRect: () => ({ width: 640, height: 720, left: 0, top: 0 }),
    addEventListener() {},
    removeEventListener() {}
  }
  const results = []
  const updates = []
  const infinite = options.infinite ?? true
  const runner = new Runner(canvas, {
    animal: { id: 'hachimi', emoji: '🐱', color: '#df8b4c' },
    seed: 'regression',
    heroImage: null,
    onReady() {},
    onMessage() {},
    onUpdate: (state) => updates.push(state),
    onFinish: (result) => results.push(result),
    ...options,
    chapter: {
      id: infinite ? 'infinite' : 'home',
      infinite,
      items: [{ name: '鱼干', emoji: '🐟', size: 1, color: '#f2c66d' }],
      boss: { name: '冰箱', emoji: '🧊' },
      ...options.chapter
    }
  })
  runner.start()
  const startup = frames.get(runner.startFrameId)
  frames.delete(runner.startFrameId)
  startup()
  t.after(() => {
    runner.stop()
    frames.clear()
  })
  return { runner, results, updates, texts }
}

function begin(runner) {
  runner.countdown = 0
  runner.elapsed = 3
  runner.beginRound()
}

function pair(runner, firstMass = 1, secondMass = 1) {
  const first = runner.player
  const second = runner.actors[1]
  Object.assign(first, { x: 1000, y: 1000, mass: firstMass, invincibleUntil: 0 })
  Object.assign(second, { x: 1040, y: 1000, mass: secondMass, invincibleUntil: 0 })
  runner.actors = [first, second]
  return [first, second]
}

function food(runner, size = 1, offset = 0) {
  return {
    id: `food-${offset}`,
    emoji: '🐟',
    size,
    radius: 16 + Math.sqrt(size) * 10,
    x: runner.player.x + offset,
    y: runner.player.y,
    done: false
  }
}

test('同体型玩家和人机可重叠，不产生位置和速度推挤', (t) => {
  const { runner } = fixture(t)
  begin(runner)
  const [first, second] = pair(runner)
  first.vx = 100
  second.vx = -100
  runner.resolveActorCollisions()
  assert.equal(first.x, 1000)
  assert.equal(second.x, 1040)
  assert.equal(first.vx, 100)
  assert.equal(second.vx, -100)
  assert.equal(first.alive, true)
  assert.equal(second.alive, true)
})

test('中心完全重合时仍保持自由重叠', (t) => {
  const { runner } = fixture(t)
  begin(runner)
  const [first, second] = pair(runner)
  second.x = first.x
  runner.resolveActorCollisions()
  assert.equal(first.x, second.x)
  assert.equal(first.y, second.y)
  assert.equal(first.alive, true)
  assert.equal(second.alive, true)
})

test('八只同体型动物可以重叠，不会被互相挤开', (t) => {
  const { runner } = fixture(t)
  begin(runner)
  for (const actor of runner.actors) Object.assign(actor, { x: 1000, y: 1000, mass: 1, invincibleUntil: 0 })
  runner.resolveActorCollisions()
  for (const actor of runner.actors) {
    assert.equal(actor.x, 1000)
    assert.equal(actor.y, 1000)
    assert.equal(actor.alive, true)
  }
})

test('未达到吞噬体型门槛时同样可以自由重叠', (t) => {
  const { runner } = fixture(t)
  begin(runner)
  const [first, second] = pair(runner, 1.34, 1)
  second.x = first.x
  runner.resolveActorCollisions()
  assert.equal(first.x, second.x)
  assert.equal(first.alive, true)
  assert.equal(second.alive, true)
})

test('持续相向移动可以穿过同体型动物', (t) => {
  const { runner } = fixture(t)
  begin(runner)
  const [first, second] = pair(runner)
  second.bot = false
  runner.spawnClock = Infinity
  first.input = { x: 1, y: 0, strength: 1 }
  second.input = { x: -1, y: 0, strength: 1 }
  for (let frame = 0; frame < 180; frame += 1) runner.update(1 / 60)
  assert.ok(first.x > second.x)
  assert.equal(first.alive, true)
  assert.equal(second.alive, true)
})

test('体型达到 1.35 倍仍需深入覆盖才能吞噬，复活重置体型', (t) => {
  const { runner } = fixture(t)
  begin(runner)
  const [first, second] = pair(runner, 6, 4)
  const minimum = runner.actorRadius(first) + runner.actorRadius(second)
  second.x = first.x + minimum - 1
  runner.resolveActorCollisions()
  assert.equal(second.alive, true)
  second.x = first.x + 30
  runner.resolveActorCollisions()
  assert.equal(second.alive, false)
  assert.equal(second.respawnAt, runner.elapsed + 3)
  assert.equal(second.mass, 1)
  assert.equal(first.mass, 7.2)
  runner.respawnActor(second)
  assert.equal(second.alive, true)
  assert.equal(second.mass, 1)
})

test('保护期不能吞噬，也不会发生实体推挤', (t) => {
  const { runner } = fixture(t)
  begin(runner)
  const [first, second] = pair(runner, 2, 1)
  second.invincibleUntil = 10
  runner.resolveActorCollisions()
  assert.equal(first.x, 1000)
  assert.equal(second.x, 1040)
  assert.equal(second.alive, true)
})

test('人机不再远离更大玩家，而是继续争抢食物', (t) => {
  const { runner } = fixture(t)
  begin(runner)
  const [player, bot] = pair(runner, 2, 1)
  player.x = bot.x + 60
  const object = { ...food(runner), id: 'target-food', x: bot.x + 200, y: bot.y }
  runner.objects = [object]
  runner.rebuildObjectGrid()
  runner.updateBotInput(bot)
  assert.equal(bot.targetId, 'target-food')
  assert.ok(bot.input.x > 0)
})

test('无限竞技物品尺寸不随玩家体型变化', (t) => {
  const { runner } = fixture(t, { chapter: { items: [{ emoji: '🪑', size: 3 }] } })
  runner.findSpawnPoint = () => ({ x: 500, y: 500 })
  runner.spawnObject()
  const first = runner.objects[0]
  runner.player.mass = 200
  runner.spawnObject()
  const second = runner.objects[1]
  assert.equal(first.size, 3)
  assert.equal(second.size, 3)
  assert.equal(second.radius, first.radius)
})

test('哈气降低吞噬需求，不改变物品固定显示尺寸', (t) => {
  const { runner } = fixture(t)
  begin(runner)
  const object = food(runner, 2)
  const radius = object.radius
  runner.objects = [object]
  runner.rebuildObjectGrid()
  runner.energy = 100
  runner.releaseHiss()
  assert.equal(object.size, 1)
  assert.equal(object.radius, radius)
  assert.equal(object.cracked, true)
})

for (const [id, emoji] of [
  ['penguin', '🐧'], ['raccoon', '🦝'], ['dog', '🐶'], ['duck', '🦆'],
  ['rabbit', '🐰'], ['pig', '🐷'], ['bear', '🐻']
]) {
  test(`${id} 没有图片资源时仍能绘制并连续运行`, (t) => {
    const { runner, texts } = fixture(t, { animal: { id, emoji, color: '#71899a' } })
    begin(runner)
    for (let i = 0; i < 5; i += 1) assert.doesNotThrow(() => runner.frame(runner.lastFrame + 16))
    assert.ok(texts.includes(emoji))
    assert.ok(runner.playTime > 0)
    assert.equal(runner.running, true)
  })
}

test('缺失和未加载的玩家图片都可以回退到动物绘制', (t) => {
  const { runner } = fixture(t)
  for (const image of [undefined, { complete: false }, { complete: true, naturalWidth: 0 }]) {
    runner.heroImage = image
    assert.doesNotThrow(() => runner.draw())
  }
})

test('无限竞技吃物品达到目标后立即结算，结果保留精确用时', (t) => {
  const { runner, results } = fixture(t)
  begin(runner)
  assert.equal(runner.targetMass, INFINITE_TARGET_MASS)
  runner.playTime = 65.432
  runner.player.mass = INFINITE_TARGET_MASS - .1
  runner.eatObject(runner.player, food(runner))
  assert.equal(runner.running, false)
  assert.equal(results.length, 1)
  assert.equal(results[0].won, true)
  assert.equal(results[0].seconds, 65.43)
  assert.equal(results[0].milliseconds, 65432)
  assert.equal(results[0].bossesCleared, 0)
  runner.finish(false)
  assert.equal(results.length, 1)
})

test('吞噬人机达到目标后也会立即结算', (t) => {
  const { runner, results } = fixture(t)
  begin(runner)
  const [player, bot] = pair(runner, INFINITE_TARGET_MASS - .5, 2)
  runner.consumeActor(player, bot)
  assert.equal(results.length, 1)
  assert.equal(results[0].won, true)
  assert.equal(runner.running, false)
})

test('哈气达到目标后不再吞噬剩余物品', (t) => {
  const { runner, results } = fixture(t)
  begin(runner)
  runner.player.mass = INFINITE_TARGET_MASS - .1
  runner.energy = 100
  const first = food(runner)
  const second = food(runner, 1, 20)
  runner.objects = [first, second]
  runner.rebuildObjectGrid()
  runner.releaseHiss()
  assert.equal(results.length, 1)
  assert.equal(results[0].won, true)
  assert.equal(first.done, true)
  assert.equal(second.done, false)
})

test('只有玩家达标会结束，人机达标不会结束', (t) => {
  const { runner, results } = fixture(t)
  begin(runner)
  const bot = runner.actors[1]
  bot.mass = INFINITE_TARGET_MASS - .1
  runner.eatObject(bot, food(runner))
  assert.ok(bot.mass >= INFINITE_TARGET_MASS)
  assert.equal(results.length, 0)
  assert.equal(runner.running, true)
})

test('竞技进度反映固定体型目标，不在整数体型处重置', (t) => {
  const { runner, updates } = fixture(t)
  begin(runner)
  runner.actors = [runner.player]
  runner.player.mass = (1 + INFINITE_TARGET_MASS) / 2
  runner.update(0)
  assert.equal(updates.at(-1).bossHealth, 50)
  runner.player.mass = INFINITE_TARGET_MASS - 1
  runner.update(0)
  assert.ok(updates.at(-1).bossHealth > 50)
  assert.match(updates.at(-1).bossName, new RegExp(`×${INFINITE_TARGET_MASS}`))
})

test('计时排除开局倒计时，并独立于物理帧时长上限', (t) => {
  const { runner, updates, results } = fixture(t)
  runner.update(2)
  assert.equal(runner.playTime, 0)
  runner.update(1)
  assert.equal(runner.playTime, 0)
  assert.equal(runner.roundStarted, true)
  runner.update(.04, 1.234)
  assert.equal(runner.playTime, 1.234)
  assert.equal(updates.at(-1).seconds, 1.234)
  runner.finish(false)
  assert.equal(results[0].seconds, 1.23)
  assert.equal(results[0].milliseconds, 1234)
})

test('竞技目标可配置，主线不会因为体型达标提前结束', (t) => {
  const competitive = fixture(t, { chapter: { targetMass: 5 } })
  begin(competitive.runner)
  competitive.runner.player.mass = 4.9
  competitive.runner.eatObject(competitive.runner.player, food(competitive.runner))
  assert.equal(competitive.results[0].won, true)

  const story = fixture(t, { infinite: false })
  begin(story.runner)
  story.runner.player.mass = 4.9
  story.runner.eatObject(story.runner.player, food(story.runner))
  assert.equal(story.results.length, 0)
  assert.equal(story.runner.running, true)
})
