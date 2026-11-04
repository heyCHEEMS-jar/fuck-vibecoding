const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value))
const length = (x, y) => Math.hypot(x, y)
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

export const INFINITE_TARGET_MASS = 20

function hashSeed(text) {
  let hash = 2166136261
  for (const char of String(text)) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function createRandom(seed) {
  let value = seed || 1
  return () => {
    value += 0x6d2b79f5
    let result = value
    result = Math.imul(result ^ result >>> 15, result | 1)
    result ^= result + Math.imul(result ^ result >>> 7, result | 61)
    return ((result ^ result >>> 14) >>> 0) / 4294967296
  }
}

class GameAudio {
  start() {
    const Audio = window.AudioContext || window.webkitAudioContext
    if (!Audio) return
    if (!this.ctx) {
      this.ctx = window.__hachiAudioContext || new Audio()
      window.__hachiAudioContext = this.ctx
      this.master = this.ctx.createGain()
      const compressor = this.ctx.createDynamicsCompressor()
      compressor.threshold.value = -17
      compressor.ratio.value = 6
      this.master.gain.value = .82
      this.master.connect(compressor).connect(this.ctx.destination)
      this.noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate)
      const data = this.noiseBuffer.getChannelData(0)
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1
    }
    if (this.ctx.state === 'suspended') this.ctx.resume()
  }

  tone(from, to, duration, volume, type = 'sine', delay = 0) {
    if (!this.ctx) return
    const now = this.ctx.currentTime + delay
    const oscillator = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(Math.max(30, from), now)
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, to), now + duration)
    gain.gain.setValueAtTime(.001, now)
    gain.gain.linearRampToValueAtTime(volume, now + .006)
    gain.gain.exponentialRampToValueAtTime(.001, now + duration)
    oscillator.connect(gain).connect(this.master)
    oscillator.start(now)
    oscillator.stop(now + duration + .02)
  }

  noise(duration, volume, frequency = 1800) {
    if (!this.ctx) return
    const now = this.ctx.currentTime
    const source = this.ctx.createBufferSource()
    const filter = this.ctx.createBiquadFilter()
    const gain = this.ctx.createGain()
    source.buffer = this.noiseBuffer
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(frequency, now)
    filter.frequency.exponentialRampToValueAtTime(Math.max(100, frequency * .3), now + duration)
    gain.gain.setValueAtTime(volume, now)
    gain.gain.exponentialRampToValueAtTime(.001, now + duration)
    source.connect(filter).connect(gain).connect(this.master)
    source.start(now)
    source.stop(now + duration)
  }

  eat(size, combo) {
    const lift = Math.min(combo, 35) * 6
    this.tone(220 + size * 55 + lift, 560 + size * 80 + lift, .09, .13, 'triangle')
    this.tone(650 + lift, 950 + lift, .055, .06, 'sine', .025)
  }

  hit() {
    this.noise(.16, .2, 520)
    this.tone(120, 52, .22, .24, 'square')
  }

  hiss(strength) {
    this.noise(.5, .28 + strength * .14, 2600)
    this.tone(105, 48, .42, .3, 'sawtooth')
    this.tone(190, 720, .34, .18, 'triangle', .06)
  }

  grow() {
    this.tone(220, 520, .24, .18, 'triangle')
    this.tone(440, 920, .34, .16, 'sine', .1)
    this.noise(.22, .1, 1800)
  }

  transform() {
    this.tone(330, 660, .22, .17, 'triangle')
    this.tone(495, 990, .28, .15, 'sine', .1)
    this.tone(660, 1320, .34, .12, 'sine', .2)
  }

  countdown(number) {
    this.start()
    if (number > 0) {
      this.tone(360 + (3 - number) * 80, 480 + (3 - number) * 80, .13, .16, 'square')
    } else {
      this.tone(440, 880, .24, .2, 'triangle')
      this.tone(660, 1100, .28, .13, 'sine', .08)
    }
  }

  win() {
    this.hiss(1)
    this.tone(392, 784, .4, .18, 'triangle', .14)
    this.tone(523, 1046, .5, .16, 'sine', .25)
  }
}

const forms = {
  work: { name: '社畜形态', message: '黑眼圈突然加深，吞文件更来劲了。' },
  rest: { name: '摆烂形态', message: '它决定躺着移动，撞击压力降低。' },
  food: { name: '吃货形态', message: '胃口变大，附近的小东西都被吸过来了。' }
}

const botKinds = [
  { emoji: '🐧', color: '#71899a', style: 'timid' },
  { emoji: '🦝', color: '#756c68', style: 'greedy' },
  { emoji: '🐶', color: '#b98a61', style: 'greedy' },
  { emoji: '🦆', color: '#d8aa56', style: 'angry' },
  { emoji: '🐰', color: '#c69aaa', style: 'timid' },
  { emoji: '🐷', color: '#d49b98', style: 'greedy' },
  { emoji: '🐻', color: '#8c6d54', style: 'angry' }
]

export class Runner {
  constructor(canvas, options) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.heroImage = options.heroImage
    this.outfitImage = options.outfitImage
    this.animal = options.animal
    this.chapter = options.chapter
    this.targetMass = this.chapter.targetMass ?? INFINITE_TARGET_MASS
    this.onUpdate = options.onUpdate
    this.onReady = options.onReady
    this.onMessage = options.onMessage
    this.onFinish = options.onFinish
    const seed = hashSeed(`${options.seed}-${this.chapter.id}`)
    this.random = createRandom(seed)
    this.effectRandom = createRandom(seed ^ 0x7f4a7c15)
    this.audio = new GameAudio()
    this.objects = []
    this.actors = []
    this.particles = []
    this.popups = []
    this.dust = []
    this.boundResize = () => this.resize()
    this.boundPointerDown = (event) => this.pointerDown(event)
    this.boundPointerMove = (event) => this.pointerMove(event)
    this.boundPointerUp = (event) => this.pointerUp(event)
  }

  start() {
    this.resize()
    this.starting = true
    this.running = false
    this.elapsed = 0
    this.playTime = 0
    this.score = 0
    this.combo = 0
    this.bestCombo = 0
    this.cleared = 0
    this.energy = 0
    this.pressure = 0
    this.burstTime = 0
    this.burstWorldRadius = 0
    this.dust = []
    this.spawnClock = 0
    this.countdown = 3
    this.countdownLast = 4
    this.roundStarted = false
    this.form = '普通形态'
    this.formCounts = { work: 0, rest: 0, food: 0 }
    this.mapSize = this.chapter.infinite ? 7600 : 2800
    this.camera = { x: this.mapSize / 2, y: this.mapSize / 2, scale: .86, targetScale: .86 }
    this.player = this.createActor({ id: 'player', emoji: this.animal.emoji, color: this.animal.color, bot: false, mass: 1 })
    this.player.x = this.mapSize / 2
    this.player.y = this.mapSize / 2
    this.actors.push(this.player)
    botKinds.forEach((kind, index) => {
      const bot = this.createActor({ id: `bot-${index}`, ...kind, bot: true, mass: .9 + this.random() * .35 })
      const angle = index / botKinds.length * Math.PI * 2
      const range = 230 + this.random() * 170
      bot.x = this.player.x + Math.cos(angle) * range
      bot.y = this.player.y + Math.sin(angle) * range
      this.actors.push(bot)
    })
    this.startFrameId = requestAnimationFrame(() => {
      if (!this.starting) return
      this.populate()
      this.rebuildObjectGrid()
      window.addEventListener('resize', this.boundResize)
      this.canvas.addEventListener('pointerdown', this.boundPointerDown)
      this.canvas.addEventListener('pointermove', this.boundPointerMove)
      this.canvas.addEventListener('pointerup', this.boundPointerUp)
      this.canvas.addEventListener('pointercancel', this.boundPointerUp)
      this.starting = false
      this.running = true
      this.lastFrame = performance.now()
      this.onReady?.()
      this.onMessage('按住偏移控制方向，轻点停止，双击哈气')
      this.frameId = requestAnimationFrame((time) => this.frame(time))
    })
  }

  stop() {
    if (!this.running && !this.starting) return
    this.starting = false
    this.running = false
    clearTimeout(this.singleTapTimer)
    cancelAnimationFrame(this.startFrameId)
    cancelAnimationFrame(this.frameId)
    window.removeEventListener('resize', this.boundResize)
    this.canvas.removeEventListener('pointerdown', this.boundPointerDown)
    this.canvas.removeEventListener('pointermove', this.boundPointerMove)
    this.canvas.removeEventListener('pointerup', this.boundPointerUp)
    this.canvas.removeEventListener('pointercancel', this.boundPointerUp)
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect()
    const scale = Math.min(window.devicePixelRatio || 1, 1.35)
    this.width = rect.width
    this.height = rect.height
    this.canvas.width = Math.round(rect.width * scale)
    this.canvas.height = Math.round(rect.height * scale)
    this.ctx.setTransform(scale, 0, 0, scale, 0, 0)
  }

  randomWorldPoint() {
    return { x: 120 + this.random() * (this.mapSize - 240), y: 120 + this.random() * (this.mapSize - 240) }
  }

  createActor(input) {
    const point = this.randomWorldPoint()
    return {
      id: input.id,
      emoji: input.emoji,
      color: input.color,
      style: input.style || 'player',
      bot: input.bot,
      x: point.x,
      y: point.y,
      vx: 0,
      vy: 0,
      input: { x: 0, y: 0, strength: 0 },
      mass: input.mass,
      alive: true,
      respawnAt: 0,
      invincibleUntil: 2.5,
      thinkAt: 0,
      targetId: null
    }
  }

  pointerDown(event) {
    if (!this.running || this.countdown > 0) return
    this.audio.start()
    this.dragging = true
    this.pointerStart = { x: event.clientX, y: event.clientY, time: performance.now() }
    this.pointerNow = { x: event.clientX, y: event.clientY }
    this.canvas.setPointerCapture?.(event.pointerId)
  }

  pointerMove(event) {
    if (!this.dragging) return
    this.pointerNow = { x: event.clientX, y: event.clientY }
    if (length(event.clientX - this.pointerStart.x, event.clientY - this.pointerStart.y) >= 12) {
      clearTimeout(this.singleTapTimer)
      this.lastTapAt = 0
    }
    this.updatePlayerInput()
  }

  pointerUp(event) {
    if (!this.dragging) return
    this.dragging = false
    this.canvas.releasePointerCapture?.(event.pointerId)
    const moved = length(event.clientX - this.pointerStart.x, event.clientY - this.pointerStart.y)
    const now = performance.now()
    if (moved >= 12 || now - this.pointerStart.time >= 220) return

    if (now - (this.lastTapAt || 0) < 200) {
      clearTimeout(this.singleTapTimer)
      this.lastTapAt = 0
      this.releaseHiss()
      return
    }

    this.lastTapAt = now
    clearTimeout(this.singleTapTimer)
    this.singleTapTimer = setTimeout(() => {
      if (!this.running || this.lastTapAt !== now) return
      this.lastTapAt = 0
      this.player.input = { x: 0, y: 0, strength: 0 }
      this.player.vx = 0
      this.player.vy = 0
    }, 200)
  }

  updatePlayerInput() {
    const dx = this.pointerNow.x - this.pointerStart.x
    const dy = this.pointerNow.y - this.pointerStart.y
    const size = length(dx, dy)
    if (size < 12) return
    this.player.input = { x: dx / size, y: dy / size, strength: clamp((size - 12) / 70, .25, 1) }
  }

  actorPower(actor) {
    return Math.max(1, Math.floor(actor.mass))
  }

  actorRadius(actor) {
    return 30 + Math.sqrt(actor.mass) * 13
  }

  growthNeed(actor) {
    return Math.max(1, this.actorPower(actor))
  }

  populate() {
    this.objects = []
  }

  beginRound() {
    if (this.roundStarted) return
    this.roundStarted = true
    this.roundStartedAt = this.elapsed
    if (!this.chapter.infinite) this.spawnBoss()
  }

  findSpawnPoint(safeRadius = 240) {
    const minimumRange = Math.hypot(this.width, this.height) / 2 / this.camera.scale + 140
    for (let attempt = 0; attempt < 32; attempt += 1) {
      const angle = this.random() * Math.PI * 2
      const range = minimumRange + this.random() * 720
      const point = {
        x: this.camera.x + Math.cos(angle) * range,
        y: this.camera.y + Math.sin(angle) * range
      }
      const inMap = point.x > 80 && point.x < this.mapSize - 80 && point.y > 80 && point.y < this.mapSize - 80
      const farFromActors = this.actors.every((actor) => !actor.alive || distance(actor, point) >= safeRadius)
      if (inMap && farFromActors) return point
    }
    return {
      x: this.camera.x < this.mapSize / 2 ? this.mapSize - 100 : 100,
      y: this.camera.y < this.mapSize / 2 ? this.mapSize - 100 : 100
    }
  }

  spawnObject(safeRadius = 240) {
    const playerPower = this.player ? this.actorPower(this.player) : 1
    const eligible = this.chapter.items.filter((item) => this.chapter.infinite || item.size <= Math.min(4, playerPower + 2))
    const template = eligible[Math.floor(this.random() * eligible.length)] || this.chapter.items[0]
    const size = template.size
    const point = this.findSpawnPoint(safeRadius)
    this.objects.push({ ...template, id: `item-${this.elapsed}-${this.random()}`, size, x: point.x, y: point.y, radius: 16 + Math.sqrt(size) * 10, done: false, cracked: false })
  }

  spawnBoss() {
    const point = this.findSpawnPoint(340)
    this.objects.push({ ...this.chapter.boss, id: 'boss', boss: true, size: 5, x: point.x, y: point.y, radius: 62, done: false, cracked: false })
  }

  releaseHiss() {
    if (!this.player.alive || this.energy < 22 || this.burstTime > 0) return
    const strength = this.energy / 100
    this.energy = 0
    this.burstTime = .62
    this.burstWorldRadius = (120 + strength * 250) / this.camera.scale
    this.pressure = Math.max(0, this.pressure - 10 - strength * 12)
    this.audio.hiss(strength)
    navigator.vibrate?.([28, 24, 48])
    this.popup(this.player.x, this.player.y - 60 / this.camera.scale, '哈——嘶！', '#7e5148', 21)

    for (const object of this.objectsNear(this.player, this.burstWorldRadius)) {
      if (object.done || distance(object, this.player) > this.burstWorldRadius) continue
      const power = this.actorPower(this.player)
      if (object.size <= power) this.eatObject(this.player, object, true)
      else if (object.size <= power + 2) {
        object.size -= 1
        object.cracked = true
        this.makeParticles(object.x, object.y, '#a98273', 8)
      }
      if (!this.running) return
    }

    for (const actor of this.actors) {
      if (actor === this.player || !actor.alive || distance(actor, this.player) > this.burstWorldRadius) continue
      const dx = actor.x - this.player.x
      const dy = actor.y - this.player.y
      const gap = Math.max(1, length(dx, dy))
      actor.x += dx / gap * 75
      actor.y += dy / gap * 75
    }
  }

  frame(time) {
    if (!this.running) return
    const clockDelta = Math.max(0, (time - this.lastFrame) / 1000)
    const delta = Math.min(clockDelta, .04)
    this.lastFrame = time
    this.update(delta, clockDelta)
    this.draw()
    if (this.running) this.frameId = requestAnimationFrame((next) => this.frame(next))
  }

  update(delta, clockDelta = delta) {
    this.elapsed += delta
    this.burstTime = Math.max(0, this.burstTime - delta)
    this.pressure = Math.max(0, this.pressure - delta * .28)
    if (this.countdown > 0) {
      this.countdown = Math.max(0, this.countdown - delta)
      const countdownNumber = Math.ceil(this.countdown)
      if (countdownNumber !== this.countdownLast) {
        this.countdownLast = countdownNumber
        this.audio.countdown(countdownNumber)
      }
      if (!this.countdown) this.beginRound()
      this.updateCamera(delta)
      this.updateEffects(delta)
      this.onUpdate({ score: 0, seconds: 0, combo: 0, speed: 1, energy: 0, pressure: 0, bossActive: true, bossHealth: 0, bossName: '准备开始' })
      return
    }
    this.playTime += clockDelta
    this.rebuildObjectGrid()
    for (const actor of this.actors) {
      if (!actor.alive) {
        if (this.elapsed >= actor.respawnAt) this.respawnActor(actor)
        continue
      }
      if (actor.bot) this.updateBotInput(actor)
      this.updateActor(actor, delta)
    }
    this.resolveObjectCollisions()
    if (!this.running) return
    this.resolveActorCollisions()
    if (!this.running) return

    this.objects = this.objects.filter((object) => !object.done)
    this.spawnClock -= delta
    const maximumObjects = this.chapter.infinite ? 180 : 90
    const target = Math.min(maximumObjects, Math.floor(this.playTime * 9))
    if (this.spawnClock <= 0 && this.objects.filter((object) => !object.boss).length < target) {
      this.spawnObject()
      this.spawnClock = .08
    }

    this.updateCamera(delta)
    this.updateEffects(delta)
    const power = this.actorPower(this.player)
    const progress = this.chapter.infinite
      ? clamp((this.player.mass - 1) / (this.targetMass - 1) * 100, 0, 100)
      : Math.min(92, (power - 1 + this.player.mass % 1) / 4 * 100)
    this.onUpdate({
      score: this.score,
      seconds: this.playTime,
      combo: this.combo,
      speed: Number(this.player.mass.toFixed(1)),
      energy: this.energy,
      pressure: this.pressure,
      bossActive: true,
      bossHealth: progress,
      bossName: this.chapter.infinite ? `无限竞技 · 目标体型 ×${this.targetMass}` : `变大后吞掉${this.chapter.boss.name}`
    })
    if (this.chapter.infinite && this.player.alive && this.player.mass >= this.targetMass) this.finish(true)
    else if (this.pressure >= 100) this.finish(false)
  }

  rebuildObjectGrid() {
    const cellSize = 240
    this.objectGrid = new Map()
    for (const object of this.objects) {
      if (object.done) continue
      const key = `${Math.floor(object.x / cellSize)},${Math.floor(object.y / cellSize)}`
      const cell = this.objectGrid.get(key)
      if (cell) cell.push(object)
      else this.objectGrid.set(key, [object])
    }
  }

  objectsNear(point, range) {
    const cellSize = 240
    const minimumX = Math.floor((point.x - range) / cellSize)
    const maximumX = Math.floor((point.x + range) / cellSize)
    const minimumY = Math.floor((point.y - range) / cellSize)
    const maximumY = Math.floor((point.y + range) / cellSize)
    const result = []
    for (let x = minimumX; x <= maximumX; x += 1) {
      for (let y = minimumY; y <= maximumY; y += 1) {
        const cell = this.objectGrid.get(`${x},${y}`)
        if (cell) result.push(...cell)
      }
    }
    return result
  }

  updateActor(actor, delta) {
    const baseSpeed = Math.max(70, 190 / Math.pow(Math.max(1, actor.mass), .18))
    const targetVx = actor.input.x * actor.input.strength * baseSpeed
    const targetVy = actor.input.y * actor.input.strength * baseSpeed
    actor.vx += (targetVx - actor.vx) * Math.min(1, delta * 7)
    actor.vy += (targetVy - actor.vy) * Math.min(1, delta * 7)
    actor.x = clamp(actor.x + actor.vx * delta, 40, this.mapSize - 40)
    actor.y = clamp(actor.y + actor.vy * delta, 40, this.mapSize - 40)
    this.spawnMoveDust(actor, delta)
  }

  spawnMoveDust(actor, delta) {
    const speed = Math.hypot(actor.vx, actor.vy)
    // Only puff while actually travelling, and only near the camera to keep it cheap.
    if (speed < 36 || !this.nearCamera(actor, 60)) {
      actor.dustClock = 0
      return
    }
    actor.dustClock = (actor.dustClock || 0) - delta
    if (actor.dustClock > 0) return
    actor.dustClock = clamp(.15 - speed / 1800, .055, .15)
    const directionX = actor.vx / speed
    const directionY = actor.vy / speed
    // Trail behind the moving body: opposite the velocity, with a little sideways scatter.
    const side = this.effectRandom() * 2 - 1
    const sideX = -directionY * side
    const sideY = directionX * side
    const radius = this.actorRadius(actor)
    const back = radius * (.5 + this.effectRandom() * .3)
    const push = 16 + speed * .16
    const life = .32 + this.effectRandom() * .3
    const puff = {
      x: actor.x - directionX * back + sideX * radius * .4,
      y: actor.y - directionY * back + sideY * radius * .4,
      vx: -directionX * push + sideX * 26,
      vy: -directionY * push + sideY * 26,
      size: 2.2 + this.effectRandom() * 2.8,
      color: ['#cbb896', '#d9c8a5', '#b9a98c'][Math.floor(this.effectRandom() * 3)],
      life,
      maxLife: life
    }
    this.dust.push(puff)
    if (this.dust.length > 160) this.dust.splice(0, this.dust.length - 160)
  }

  updateBotInput(bot) {
    if (this.elapsed < bot.thinkAt) return
    bot.thinkAt = this.elapsed + .28 + this.random() * .35

    const power = this.actorPower(bot)
    const food = this.objectsNear(bot, 680).filter((object) => !object.done && !object.boss && object.size <= power && distance(object, bot) < 680)
    const prey = this.actors.filter((actor) => actor.alive
      && actor !== bot
      && bot.mass >= actor.mass * 1.35
      && this.elapsed >= actor.invincibleUntil
      && distance(actor, bot) < 680)
    const target = [...food, ...prey].sort((a, b) => distance(a, bot) - distance(b, bot))[0]
    if (target) return this.aimAt(bot, target)

    const angle = this.random() * Math.PI * 2
    bot.input = { x: Math.cos(angle), y: Math.sin(angle), strength: .45 + this.random() * .45 }
  }

  aimAt(actor, target) {
    const dx = target.x - actor.x
    const dy = target.y - actor.y
    const gap = Math.max(1, length(dx, dy))
    actor.input = { x: dx / gap, y: dy / gap, strength: .65 + this.random() * .3 }
    actor.targetId = target.id
  }

  resolveObjectCollisions() {
    for (const actor of this.actors) {
      if (!actor.alive) continue
      const power = this.actorPower(actor)
      const actorRadius = this.actorRadius(actor)
      const nearby = this.objectsNear(actor, actorRadius + 100)
      for (const object of nearby) {
        if (object.done || object.boss && actor.bot) continue
        const gap = distance(actor, object)
        const touching = gap < actorRadius + object.radius
        const coversHalf = gap <= actorRadius + object.radius * .5
        if (object.size <= power && gap < actorRadius + object.radius + 8) {
          const pull = .18
          object.x += (actor.x - object.x) * pull
          object.y += (actor.y - object.y) * pull
        }
        if (object.size <= power && coversHalf) this.eatObject(actor, object)
        else if (object.size > power && touching && !actor.bot && this.elapsed > (object.hitAt || 0)) this.bumpObject(object)
        if (!this.running) return
      }
    }
  }

  resolveActorCollisions() {
    // Animals may overlap freely; this checks swallowing, not solid contact.
    for (let i = 0; i < this.actors.length; i += 1) {
      const first = this.actors[i]
      if (!first.alive) continue
      for (let j = i + 1; j < this.actors.length; j += 1) {
        if (!first.alive) break
        const second = this.actors[j]
        if (!second.alive) continue
        const gap = distance(first, second)
        const firstRadius = this.actorRadius(first)
        const secondRadius = this.actorRadius(second)
        if (gap >= firstRadius + secondRadius) continue
        const firstCanEat = this.elapsed >= first.invincibleUntil && first.mass >= second.mass * 1.35 && this.elapsed >= second.invincibleUntil
        const secondCanEat = this.elapsed >= second.invincibleUntil && second.mass >= first.mass * 1.35 && this.elapsed >= first.invincibleUntil
        if (firstCanEat && gap <= firstRadius + secondRadius * .5) this.consumeActor(first, second)
        else if (secondCanEat && gap <= secondRadius + firstRadius * .5) this.consumeActor(second, first)
        if (!this.running) return
      }
    }
  }

  eatObject(actor, object, byHiss = false) {
    if (object.done) return
    object.done = true
    const oldPower = this.actorPower(actor)
    const gain = object.size * (actor === this.player && this.form === '吃货哈基米' ? .16 : .12)
    actor.mass = this.chapter.infinite ? actor.mass + gain : Math.min(4.99, actor.mass + gain)
    if (actor === this.player || this.nearCamera(object)) this.makeParticles(object.x, object.y, object.color || '#d2c49b', object.boss ? 18 : 5)

    if (actor === this.player) {
      this.combo += 1
      this.bestCombo = Math.max(this.bestCombo, this.combo)
      this.cleared += 1
      this.score += Math.round((12 + object.size * 18) * (1 + Math.min(this.combo, 40) / 28))
      this.energy = clamp(this.energy + (object.boss ? 30 : 5 + object.size * 3), 0, 100)
      this.pressure = Math.max(0, this.pressure - .7)
      this.audio.eat(object.size, this.combo)
      if (object.category && this.formCounts[object.category] !== undefined) {
        this.formCounts[object.category] += 1
        if (this.formCounts[object.category] >= 5 && this.form !== forms[object.category].name) this.transform(object.category)
      }
      if (this.actorPower(actor) > oldPower) this.audio.grow()
      if (object.boss) {
        this.score += 1000
        this.finish(true)
      } else if (this.chapter.infinite && actor.mass >= this.targetMass) {
        this.finish(true)
      }
    }
  }

  bumpObject(object) {
    object.hitAt = this.elapsed + .7
    this.combo = 0
    this.pressure = Math.min(100, this.pressure + (object.boss ? 14 : 7))
    this.audio.hit()
    navigator.vibrate?.(20)
  }

  consumeActor(predator, victim) {
    const victimMass = victim.mass
    victim.alive = false
    victim.respawnAt = this.elapsed + 3
    victim.mass = 1
    predator.mass += Math.max(.45, victimMass * .3)
    if (predator === this.player || victim === this.player || this.nearCamera(victim)) this.makeParticles(victim.x, victim.y, victim.color, 13)
    if (predator === this.player) {
      this.score += 260
      this.energy = clamp(this.energy + 20, 0, 100)
      this.audio.eat(4, this.combo)
    }
    if (victim === this.player) {
      this.pressure = Math.min(100, this.pressure + 20)
      this.combo = 0
      this.onMessage(`被${predator.emoji}吞了！3 秒后以初始体型回来`)
      this.audio.hit()
    }
    if (predator === this.player && this.chapter.infinite && predator.mass >= this.targetMass) this.finish(true)
  }

  respawnActor(actor) {
    let point = this.randomWorldPoint()
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const nearObject = this.objects.some((object) => !object.done && distance(object, point) < 240)
      const nearActor = this.actors.some((other) => other !== actor && other.alive && distance(other, point) < 180)
      if (!nearObject && !nearActor) break
      point = this.randomWorldPoint()
    }
    actor.x = point.x
    actor.y = point.y
    actor.vx = 0
    actor.vy = 0
    actor.alive = true
    actor.invincibleUntil = this.elapsed + 3
    actor.input = { x: 0, y: 0, strength: 0 }
  }

  transform(category) {
    const next = forms[category]
    this.form = next.name
    this.formCounts = { work: 0, rest: 0, food: 0 }
    this.score += 300
    this.audio.transform()
    this.onMessage(next.message)
  }

  updateCamera(delta) {
    if (this.player.alive) {
      this.camera.x += (this.player.x - this.camera.x) * Math.min(1, delta * 5)
      this.camera.y += (this.player.y - this.camera.y) * Math.min(1, delta * 5)
    }
    let targetScale = .78
    if (this.chapter.infinite) {
      const mass = this.player.mass
      if (mass >= 160) targetScale = .32
      else if (mass >= 80) targetScale = .34
      else if (mass >= 40) targetScale = .4
      else if (mass >= 20) targetScale = .48
      else if (mass >= 10) targetScale = .57
      else if (mass >= 5) targetScale = .67
    }
    this.camera.targetScale = targetScale
    this.camera.zooming = Math.abs(this.camera.targetScale - this.camera.scale) > .012
    this.camera.scale += (this.camera.targetScale - this.camera.scale) * Math.min(1, delta * 5)
  }

  updateEffects(delta) {
    for (const particle of this.particles) {
      particle.x += particle.vx * delta
      particle.y += particle.vy * delta
      particle.life -= delta
    }
    this.particles = this.particles.filter((particle) => particle.life > 0)
    for (const puff of this.dust) {
      puff.x += puff.vx * delta
      puff.y += puff.vy * delta
      puff.vx *= Math.max(0, 1 - delta * 2.6)
      puff.vy *= Math.max(0, 1 - delta * 2.6)
      puff.life -= delta
    }
    this.dust = this.dust.filter((puff) => puff.life > 0)
    for (const popup of this.popups) {
      popup.y -= 32 / this.camera.scale * delta
      popup.life -= delta
    }
    this.popups = this.popups.filter((popup) => popup.life > 0)
  }

  nearCamera(point, extra = 160) {
    const range = Math.hypot(this.width, this.height) / 2 / this.camera.scale + extra
    return distance(point, this.camera) <= range
  }

  makeParticles(x, y, color, amount) {
    for (let i = 0; i < amount; i += 1) {
      const angle = this.effectRandom() * Math.PI * 2
      const speed = 45 + this.effectRandom() * 100
      this.particles.push({ x, y, color, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: .45 + this.effectRandom() * .3 })
    }
    if (this.particles.length > 180) this.particles.splice(0, this.particles.length - 180)
  }

  popup(x, y, text, color, size) {
    this.popups.push({ x, y, text, color, size, life: 1 })
  }

  finish(won) {
    if (!this.running) return
    const result = {
      won,
      score: Math.round(this.score),
      combo: this.bestCombo,
      cleared: this.cleared,
      seconds: Number(this.playTime.toFixed(2)),
      milliseconds: Math.round(this.playTime * 1000),
      speed: Number(this.player.mass.toFixed(1)),
      power: this.actorPower(this.player),
      form: this.form,
      bossesCleared: won && !this.chapter.infinite ? 1 : 0
    }
    if (won) this.audio.win()
    this.stop()
    this.onFinish(result)
  }

  worldToScreen(point) {
    return {
      x: (point.x - this.camera.x) * this.camera.scale + this.width / 2,
      y: (point.y - this.camera.y) * this.camera.scale + this.height / 2
    }
  }

  visible(screen, margin = 0) {
    return screen.x > -margin && screen.x < this.width + margin && screen.y > -margin && screen.y < this.height + margin
  }

  draw() {
    const ctx = this.ctx
    ctx.clearRect(0, 0, this.width, this.height)
    this.drawWorld(ctx)
    this.drawDust(ctx)
    const margin = 24 / this.camera.scale
    const left = this.camera.x - this.width / 2 / this.camera.scale - margin
    const right = this.camera.x + this.width / 2 / this.camera.scale + margin
    const top = this.camera.y - this.height / 2 / this.camera.scale - margin
    const bottom = this.camera.y + this.height / 2 / this.camera.scale + margin
    const inView = (value) => value.x >= left && value.x <= right && value.y >= top && value.y <= bottom
    const drawables = [
      ...this.objects.filter((object) => !object.done && inView(object)).map((object) => ({ type: 'object', value: object })),
      ...this.actors.filter((actor) => actor.alive && inView(actor)).map((actor) => ({ type: 'actor', value: actor }))
    ].sort((a, b) => a.value.y - b.value.y)
    for (const entry of drawables) entry.type === 'object' ? this.drawObject(ctx, entry.value) : this.drawActor(ctx, entry.value)
    this.drawEffects(ctx)
    this.drawJoystick(ctx)
    this.drawCountdown(ctx)
  }

  drawWorld(ctx) {
    const themes = {
      home: ['#d8b582', '#7e9d70'],
      office: ['#9aafb1', '#617d80'],
      monday: ['#84968a', '#52675a'],
      infinite: ['#998ab0', '#625779']
    }
    const [light, dark] = themes[this.chapter.id] || themes.home
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height)
    gradient.addColorStop(0, light)
    gradient.addColorStop(1, dark)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, this.width, this.height)

    const grid = 180
    const left = this.camera.x - this.width / 2 / this.camera.scale
    const top = this.camera.y - this.height / 2 / this.camera.scale
    const right = this.camera.x + this.width / 2 / this.camera.scale
    const bottom = this.camera.y + this.height / 2 / this.camera.scale
    ctx.strokeStyle = 'rgba(255,255,255,.1)'
    ctx.lineWidth = 1
    for (let x = Math.floor(left / grid) * grid; x < right; x += grid) {
      const screen = this.worldToScreen({ x, y: 0 })
      ctx.beginPath()
      ctx.moveTo(screen.x, 0)
      ctx.lineTo(screen.x, this.height)
      ctx.stroke()
    }
    for (let y = Math.floor(top / grid) * grid; y < bottom; y += grid) {
      const screen = this.worldToScreen({ x: 0, y })
      ctx.beginPath()
      ctx.moveTo(0, screen.y)
      ctx.lineTo(this.width, screen.y)
      ctx.stroke()
    }

    const edge = this.worldToScreen({ x: 0, y: 0 })
    ctx.strokeStyle = 'rgba(49,68,61,.42)'
    ctx.lineWidth = 5
    ctx.strokeRect(edge.x, edge.y, this.mapSize * this.camera.scale, this.mapSize * this.camera.scale)
  }

  drawObject(ctx, object) {
    const screen = this.worldToScreen(object)
    if (!this.visible(screen, 90)) return
    const playerPower = this.actorPower(this.player)
    const state = object.size <= playerPower ? 'eat' : object.size === playerPower + 1 ? 'near' : 'block'
    const colors = { eat: '#63815d', near: '#99845a', block: '#845b57' }
    const radius = object.radius * this.camera.scale
    const outlineRadius = Math.max(3, radius * .72)
    ctx.save()
    ctx.translate(screen.x, screen.y)
    ctx.strokeStyle = colors[state]
    ctx.lineWidth = outlineRadius < 5 ? 1 : Math.max(1.2, 2 * this.camera.scale)
    ctx.setLineDash(outlineRadius < 5 || state === 'eat' ? [] : [6, 4])
    ctx.beginPath()
    ctx.arc(0, 0, outlineRadius, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
    if (radius >= 9 && this.camera.scale >= .3 && !this.camera.zooming) {
      ctx.globalAlpha = 1
      ctx.fillStyle = '#31443d'
      ctx.font = `${Math.max(11, Math.round(radius * 1.35))}px "Segoe UI Emoji", sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(object.emoji, 0, 0)
    }
    ctx.restore()
  }

  drawActor(ctx, actor) {
    const screen = this.worldToScreen(actor)
    if (!this.visible(screen, 140)) return
    const radius = this.actorRadius(actor) * this.camera.scale
    const protectedActor = this.elapsed < actor.invincibleUntil
    ctx.save()
    ctx.globalAlpha = 1
    ctx.translate(screen.x, screen.y)
    if (actor !== this.player) {
      ctx.fillStyle = actor.color
      ctx.beginPath()
      ctx.arc(0, 0, radius * .82, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = 'rgba(35,52,45,.2)'
    ctx.beginPath()
    ctx.ellipse(0, radius * .6, radius * .75, radius * .2, 0, 0, Math.PI * 2)
    ctx.fill()
    if (actor === this.player && this.heroImage?.complete && this.heroImage.naturalWidth) {
      const size = radius * 2.7
      ctx.drawImage(this.heroImage, -size / 2, -size / 2, size, size)
      if (this.outfitImage?.complete && this.outfitImage.naturalWidth) ctx.drawImage(this.outfitImage, -size / 2, -size / 2, size, size)
    } else {
      // Use an opaque ink color so glyph fallbacks never inherit the translucent shadow color.
      ctx.fillStyle = '#31443d'
      const emojiSize = Math.max(18, radius * 1.65)
      ctx.font = `${emojiSize}px "Segoe UI Emoji", sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(actor.emoji, 0, 0)
    }
    if (actor !== this.player) {
      ctx.strokeStyle = actor.mass > this.player.mass * 1.35 ? 'rgba(132,91,87,.55)' : actor.mass * 1.35 < this.player.mass ? 'rgba(99,129,93,.55)' : 'rgba(255,255,255,.25)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(0, 0, radius * .95, 0, Math.PI * 2)
      ctx.stroke()
    }
    if (protectedActor) {
      ctx.strokeStyle = 'rgba(210,238,219,.7)'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.arc(0, 0, radius * 1.14, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
    }
    ctx.restore()
  }

  drawDust(ctx) {
    if (!this.dust.length) return
    for (const puff of this.dust) {
      const screen = this.worldToScreen(puff)
      if (!this.visible(screen, 24)) continue
      ctx.globalAlpha = clamp(puff.life / puff.maxLife, 0, 1) * .4
      ctx.fillStyle = puff.color
      ctx.beginPath()
      ctx.arc(screen.x, screen.y, Math.max(1.2, puff.size * this.camera.scale), 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  drawEffects(ctx) {
    if (this.burstTime > 0 && this.player.alive) {
      const screen = this.worldToScreen(this.player)
      const progress = 1 - this.burstTime / .62
      ctx.strokeStyle = `rgba(255,245,158,${1 - progress})`
      ctx.lineWidth = 17 * (1 - progress) + 3
      ctx.beginPath()
      ctx.arc(screen.x, screen.y, this.burstWorldRadius * this.camera.scale * progress, 0, Math.PI * 2)
      ctx.stroke()
    }
    for (const particle of this.particles) {
      const screen = this.worldToScreen(particle)
      if (!this.visible(screen)) continue
      ctx.globalAlpha = Math.min(1, particle.life * 2)
      ctx.fillStyle = particle.color
      ctx.beginPath()
      ctx.arc(screen.x, screen.y, Math.max(2, 4 * this.camera.scale), 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    for (const popup of this.popups) {
      const screen = this.worldToScreen(popup)
      if (!this.visible(screen)) continue
      ctx.globalAlpha = Math.min(1, popup.life * 2)
      ctx.fillStyle = popup.color
      ctx.font = `900 ${Math.max(10, popup.size * this.camera.scale)}px Microsoft YaHei, sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(popup.text, screen.x, screen.y)
    }
    ctx.globalAlpha = 1
  }

  drawCountdown(ctx) {
    if (this.countdown <= 0) return
    const number = Math.max(1, Math.ceil(this.countdown))
    const pulse = 1 + (.5 - this.countdown % 1) * .08
    ctx.save()
    ctx.translate(this.width / 2, this.height / 2)
    ctx.scale(pulse, pulse)
    ctx.fillStyle = 'rgba(255,248,223,.92)'
    ctx.strokeStyle = 'rgba(49,68,61,.72)'
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.arc(0, 0, 58, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#31443d'
    ctx.font = '900 72px Microsoft YaHei, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(number), 0, 2)
    ctx.restore()
  }

  drawJoystick(ctx) {
    if (!this.dragging || !this.pointerStart || !this.pointerNow) return
    const rect = this.canvas.getBoundingClientRect()
    const x = this.pointerStart.x - rect.left
    const y = this.pointerStart.y - rect.top
    const dx = this.pointerNow.x - this.pointerStart.x
    const dy = this.pointerNow.y - this.pointerStart.y
    const gap = Math.max(1, length(dx, dy))
    const reach = Math.min(44, gap)
    ctx.strokeStyle = 'rgba(255,248,223,.18)'
    ctx.fillStyle = 'rgba(49,68,61,.055)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(x, y, 45, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = 'rgba(255,248,223,.22)'
    ctx.beginPath()
    ctx.arc(x + dx / gap * reach, y + dy / gap * reach, 17, 0, Math.PI * 2)
    ctx.fill()
  }
}
