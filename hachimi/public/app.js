import { Runner, INFINITE_TARGET_MASS } from './runner.js'

const hero = {
  id: 'hachimi',
  name: '哈基米',
  src: '/assets/hachimi.svg',
  hissSrc: '/assets/hachimi-hiss.svg',
  backSrc: '/assets/hachimi-back.svg',
  skill: '圆滚滚但跑得很快，最擅长把烦恼塞进肚子。',
  quip: '哈基米刚想摆帅，就被自己的大尾巴绊倒了。',
  speeches: ['哈？今天也要出门？', '摸一下可以，再摸我要哈气了。', '不是我胖，是烦恼占地方。', '哈——嘶！手拿开！']
}

const outfits = [
  { id: 'basic', animal: 'hachimi', name: '原味毛毛', level: 1, description: '什么都不穿，也是一只很有态度的哈基米。' },
  { id: 'frog', animal: 'hachimi', name: '青蛙雨衣', level: 2, src: '/assets/outfit-frog.svg', backSrc: '/assets/outfit-frog-back.svg', description: '下雨不怕，主要是帽子上的眼睛比本人精神。' },
  { id: 'sleep', animal: 'hachimi', name: '睡不醒套装', level: 3, src: '/assets/outfit-sleep.svg', backSrc: '/assets/outfit-sleep-back.svg', description: '穿着睡衣乱吃，主打一个被迫营业。' },
  { id: 'office', animal: 'hachimi', name: '摸鱼上班装', level: 4, src: '/assets/outfit-office.svg', backSrc: '/assets/outfit-office-back.svg', description: '领带是歪的，咖啡是满的，工作是不会做的。' },
  { id: 'penguin-basic', animal: 'penguin', name: '企鹅原装', level: 2, description: '黑白配色永不过时。' },
  { id: 'raccoon-basic', animal: 'raccoon', name: '浣熊原装', level: 3, description: '自带眼罩，适合偷偷乱吃。' },
  { id: 'dog-basic', animal: 'dog', name: '柴犬原装', level: 4, description: '什么都不穿也很精神。' },
  { id: 'duck-basic', animal: 'duck', name: '鸭鸭原装', level: 5, description: '走路自带摇摆。' },
  { id: 'rabbit-basic', animal: 'rabbit', name: '兔兔原装', level: 6, description: '耳朵就是最好的装饰。' },
  { id: 'pig-basic', animal: 'pig', name: '小猪原装', level: 7, description: '圆滚滚就是主打风格。' },
  { id: 'bear-basic', animal: 'bear', name: '小熊原装', level: 8, description: '看起来很稳，其实很馋。' }
]

const animals = [
  { id: 'hachimi', name: '哈基米', emoji: '🐱', color: '#df8b4c', level: 1 },
  { id: 'penguin', name: '小企鹅', emoji: '🐧', color: '#71899a', level: 2 },
  { id: 'raccoon', name: '小浣熊', emoji: '🦝', color: '#756c68', level: 3 },
  { id: 'dog', name: '柴犬', emoji: '🐶', color: '#b98a61', level: 4 },
  { id: 'duck', name: '调皮鸭', emoji: '🦆', color: '#d8aa56', level: 5 },
  { id: 'rabbit', name: '小兔子', emoji: '🐰', color: '#c69aaa', level: 6 },
  { id: 'pig', name: '小猪', emoji: '🐷', color: '#d49b98', level: 7 },
  { id: 'bear', name: '小熊', emoji: '🐻', color: '#8c6d54', level: 8 }
]

const itemSets = {
  home: [
    { name: '鱼干', emoji: '🐟', size: 1, category: 'food', color: '#f2c66d' },
    { name: '袜子', emoji: '🧦', size: 1, category: 'rest', color: '#9fc4db' },
    { name: '纸团', emoji: '🗞️', size: 1, category: 'work', color: '#ded6c6' },
    { name: '外卖盒', emoji: '🥡', size: 1, category: 'food', color: '#e9a86d' },
    { name: '拖鞋', emoji: '🩴', size: 2, category: 'rest', color: '#8fc4b1' },
    { name: '闹钟', emoji: '⏰', size: 2, category: 'work', color: '#e98773' },
    { name: '枕头', emoji: '🛏️', size: 2, category: 'rest', color: '#b6b1df' },
    { name: '咖啡', emoji: '☕', size: 2, category: 'work', color: '#b68765' },
    { name: '椅子', emoji: '🪑', size: 3, category: 'work', color: '#b47b52' },
    { name: '电风扇', emoji: '🌀', size: 3, category: 'rest', color: '#9ecbd1' },
    { name: '沙发', emoji: '🛋️', size: 4, category: 'rest', color: '#86a681' },
    { name: '冰箱', emoji: '🧊', size: 4, category: 'food', color: '#a9d4dd' }
  ],
  office: [
    { name: '咖啡', emoji: '☕', size: 1, category: 'work', color: '#b68765' },
    { name: '文件', emoji: '📄', size: 1, category: 'work', color: '#e3dbcc' },
    { name: '饭团', emoji: '🍙', size: 1, category: 'food', color: '#f0dfb7' },
    { name: '眼罩', emoji: '🥽', size: 1, category: 'rest', color: '#8fa5cf' },
    { name: '键盘', emoji: '⌨️', size: 2, category: 'work', color: '#969aa3' },
    { name: '手机', emoji: '📱', size: 2, category: 'rest', color: '#657c8e' },
    { name: '便当', emoji: '🍱', size: 2, category: 'food', color: '#e49c73' },
    { name: '办公椅', emoji: '🪑', size: 3, category: 'work', color: '#6f7d83' },
    { name: '打印机', emoji: '🖨️', size: 3, category: 'work', color: '#a7afb0' },
    { name: '零食柜', emoji: '🍪', size: 3, category: 'food', color: '#d4ad6d' },
    { name: '工位', emoji: '🖥️', size: 4, category: 'work', color: '#7596a4' },
    { name: '会议桌', emoji: '📊', size: 4, category: 'work', color: '#8f765f' }
  ],
  monday: [
    { name: '闹钟', emoji: '⏰', size: 1, category: 'work', color: '#e98773' },
    { name: '未读邮件', emoji: '📧', size: 1, category: 'work', color: '#9eb7dc' },
    { name: '早餐', emoji: '🥪', size: 1, category: 'food', color: '#e5be75' },
    { name: '被窝', emoji: '🛌', size: 2, category: 'rest', color: '#a99bcf' },
    { name: '地铁', emoji: '🚇', size: 2, category: 'work', color: '#879ba8' },
    { name: '周报', emoji: '📋', size: 2, category: 'work', color: '#d5cbb8' },
    { name: '早餐摊', emoji: '🥞', size: 3, category: 'food', color: '#e6aa69' },
    { name: '打卡机', emoji: '🕘', size: 3, category: 'work', color: '#8a9a9e' },
    { name: '会议室', emoji: '🏢', size: 4, category: 'work', color: '#78909c' },
    { name: '通勤路', emoji: '🛣️', size: 4, category: 'work', color: '#71837a' }
  ]
}

const chapters = [
  { id: 'home', name: '出租屋大扫荡', items: itemSets.home, boss: { name: '巨型冰箱', emoji: '🧊', category: 'food', color: '#9ed7df' } },
  { id: 'office', name: '办公室乱吃局', items: itemSets.office, boss: { name: '老板的工位', emoji: '🧑‍💼', category: 'work', color: '#708b96' }, full: true },
  { id: 'monday', name: '吞掉星期一', items: itemSets.monday, boss: { name: '星期一乌云', emoji: '🌩️', category: 'work', color: '#71627e' }, full: true },
  { id: 'infinite', name: '无限竞技', items: [...itemSets.home, ...itemSets.office, ...itemSets.monday], infinite: true, targetMass: INFINITE_TARGET_MASS, full: true }
]

hero.image = new Image()
hero.image.src = hero.src
hero.hissImage = new Image()
hero.hissImage.src = hero.hissSrc
hero.backImage = new Image()
hero.backImage.src = hero.backSrc
for (const outfit of outfits) {
  if (!outfit.src) continue
  outfit.image = new Image()
  outfit.image.src = outfit.src
  outfit.backImage = new Image()
  outfit.backImage.src = outfit.backSrc
}

const heroes = [hero]

const moods = new Set(['calm', 'bright', 'tired', 'restless'])
const storageKey = 'mood-terrarium-save'
const $ = (selector) => document.querySelector(selector)
const clampInt = (value, minimum, maximum) => {
  const number = Number(value)
  return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, Math.floor(number))) : minimum
}
const formatNumber = (value) => {
  const number = Math.max(0, Number(value) || 0)
  if (number < 10_000) return Math.floor(number).toString()
  if (number < 100_000_000) return `${(number / 10_000).toFixed(number < 100_000 ? 1 : 0).replace(/\.0$/, '')}万`
  return `${(number / 100_000_000).toFixed(number < 1_000_000_000 ? 1 : 0).replace(/\.0$/, '')}亿`
}
const formatMetric = (value) => Number(value) < 10_000 ? Number(value).toFixed(1) : formatNumber(value)
const formatTime = (seconds) => {
  const hundredths = Math.max(0, Math.round((Number(seconds) || 0) * 100))
  const minutes = Math.floor(hundredths / 6000)
  const remainder = Math.floor(hundredths / 100) % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}.${String(hundredths % 100).padStart(2, '0')}`
}


const elements = {
  body: document.body,
  home: $('#homeScreen'),
  run: $('#runScreen'),
  canvas: $('#gameCanvas'),
  loadingOverlay: $('#loadingOverlay'),
  glow: $('#glowCount'),
  fragments: $('#fragmentCount'),
  routeCode: $('#routeCode'),
  chapterPicker: $('#chapterPicker'),
  saveState: $('#saveState'),
  accountButton: $('#accountButton'),
  settingsButton: $('#settingsButton'),
  settingsModal: $('#settingsModal'),
  homePets: $('#homePets'),
  petSpeech: $('#petSpeech'),
  trialText: $('#trialText'),
  startButton: $('#startButton'),
  startHint: $('#startHint'),
  moodPicker: $('#moodPicker'),
  heroSelector: $('#heroSelector'),
  collectionModal: $('#collectionModal'),
  collectionList: $('#collectionList'),
  recordsModal: $('#recordsModal'),
  recordRuns: $('#recordRuns'),
  recordScore: $('#recordScore'),
  recordCombo: $('#recordCombo'),
  recordCleared: $('#recordCleared'),
  recordInfiniteTime: $('#recordInfiniteTime'),
  runScore: $('#runScore'),
  runScoreLabel: $('#runScoreLabel'),
  runCombo: $('#runCombo'),
  runSpeed: $('#runSpeed'),
  burstFill: $('#burstFill'),
  pressureFill: $('#pressureFill'),
  bossBar: $('#bossBar'),
  bossName: $('#bossName'),
  bossHealth: $('#bossHealth'),
  runMessage: $('#runMessage'),
  exitRun: $('#exitRun'),
  resultModal: $('#resultModal'),
  resultTitle: $('#resultTitle'),
  resultHero: $('#resultHero'),
  resultOutfit: $('#resultOutfit'),
  resultAnimalEmoji: $('#resultAnimalEmoji'),
  resultQuip: $('#resultQuip'),
  resultScore: $('#resultScore'),
  resultScoreLabel: $('#resultScoreLabel'),
  resultSpeed: $('#resultSpeed'),
  resultCombo: $('#resultCombo'),
  resultCleared: $('#resultCleared'),
  newFriend: $('#newFriend'),
  retryButton: $('#retryButton'),
  shareResult: $('#shareResult'),
  backHome: $('#backHome'),
  shareCanvas: $('#shareCanvas'),
  accountModal: $('#accountModal'),
  accountTitle: $('#accountTitle'),
  accountCopy: $('#accountCopy'),
  closeAccount: $('#closeAccount'),
  registerTab: $('#registerTab'),
  loginTab: $('#loginTab'),
  form: $('#accountForm'),
  keyField: $('#keyField'),
  key: $('#activationKey'),
  username: $('#username'),
  password: $('#password'),
  formError: $('#formError'),
  submitAccount: $('#submitAccount'),
  toast: $('#toast')
}

const defaultSave = () => ({
  version: 5,
  glow: 30,
  fragments: 0,
  mood: 'calm',
  selectedHero: 'hachimi',
  unlocked: ['hachimi'],
  bond: { hachimi: 0 },
  level: 1,
  xp: 0,
  outfit: 'basic',
  unlockedOutfits: ['basic'],
  animal: 'hachimi',
  unlockedAnimals: ['hachimi'],
  completedLevels: [],
  infiniteUnlocked: false,
  selectedChapter: 'home',
  stats: { runs: 0, bestScore: 0, bestCombo: 0, totalCleared: 0, bestInfiniteTimeMs: 0 },
  hatches: 0,
  pity: 0,
  discovered: { hachimi: 1 },
  specimens: [],
  lastSeen: Date.now()
})

function normalizeSave(value) {
  const source = value && typeof value === 'object' ? value : {}
  const level = clampInt(source.level || 1, 1, 100)
  const unlockedOutfits = Array.isArray(source.unlockedOutfits)
    ? source.unlockedOutfits.filter((id) => outfits.some((outfit) => outfit.id === id))
    : ['basic']
  for (const outfit of outfits) {
    if (outfit.level <= level && !unlockedOutfits.includes(outfit.id)) unlockedOutfits.push(outfit.id)
  }
  if (!unlockedOutfits.includes('basic')) unlockedOutfits.unshift('basic')
  const unlockedAnimals = Array.isArray(source.unlockedAnimals)
    ? source.unlockedAnimals.filter((id) => animals.some((animal) => animal.id === id))
    : ['hachimi']
  for (const animal of animals) {
    if (animal.level <= level && !unlockedAnimals.includes(animal.id)) unlockedAnimals.push(animal.id)
  }
  if (!unlockedAnimals.includes('hachimi')) unlockedAnimals.unshift('hachimi')
  const selectedAnimal = unlockedAnimals.includes(source.animal) ? source.animal : 'hachimi'
  const animalOutfits = outfits.filter((outfit) => outfit.animal === selectedAnimal)
  const selectedOutfit = animalOutfits.some((outfit) => outfit.id === source.outfit && unlockedOutfits.includes(outfit.id))
    ? source.outfit
    : animalOutfits[0].id
  const completedLevels = Array.isArray(source.completedLevels)
    ? [...new Set(source.completedLevels.filter((id) => ['home', 'office', 'monday'].includes(id)))]
    : []
  const infiniteUnlocked = Boolean(source.infiniteUnlocked) || ['home', 'office', 'monday'].every((id) => completedLevels.includes(id))
  const selectedChapter = chapters.some((chapter) => chapter.id === source.selectedChapter) ? source.selectedChapter : 'home'

  return {
    ...defaultSave(),
    ...source,
    version: 5,
    glow: clampInt(source.glow ?? 30, 0, 1_000_000),
    fragments: clampInt(source.fragments, 0, 1_000_000),
    mood: moods.has(source.mood) ? source.mood : 'calm',
    selectedHero: 'hachimi',
    unlocked: ['hachimi'],
    bond: { hachimi: clampInt(source.bond?.hachimi, 0, 100) },
    level,
    xp: clampInt(source.xp, 0, 1_000_000),
    outfit: selectedOutfit,
    unlockedOutfits,
    animal: selectedAnimal,
    unlockedAnimals,
    completedLevels,
    infiniteUnlocked,
    selectedChapter,
    stats: {
      runs: clampInt(source.stats?.runs ?? source.hatches, 0, 100_000),
      bestScore: clampInt(source.stats?.bestScore, 0, 100_000_000),
      bestCombo: clampInt(source.stats?.bestCombo, 0, 100_000),
      totalCleared: clampInt(source.stats?.totalCleared, 0, 10_000_000),
      bestInfiniteTimeMs: clampInt(source.stats?.bestInfiniteTimeMs, 0, 86_400_000)
    },
    discovered: { ...(source.discovered || {}), hachimi: 1 },
    specimens: Array.isArray(source.specimens) ? source.specimens : [],
    lastSeen: clampInt(source.lastSeen || Date.now(), 0, Date.now())
  }
}

function loadLocal() {
  try {
    return normalizeSave(JSON.parse(localStorage.getItem(storageKey) || '{}'))
  } catch {
    return defaultSave()
  }
}

function dailyRoute() {
  const challenge = new URLSearchParams(location.search).get('challenge')
  if (challenge && /^[A-Z0-9-]{4,20}$/.test(challenge)) return challenge
  const date = new Date()
  const stamp = `${date.getFullYear()}${date.getMonth() + 1}${date.getDate()}`
  let hash = 0
  for (const char of stamp) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return `BITE-${hash.toString(36).toUpperCase().slice(-4).padStart(4, '0')}`
}

let game = loadLocal()
let account = null
let accountMode = 'register'
let runner = null
let startingRun = false
let cloudTimer
let toastTimer
let messageTimer
let interactionTimer
let homeAudio
let lastResult = null
const routeCode = dailyRoute()

function heroById() {
  return hero
}

function animalById(id) {
  return animals.find((animal) => animal.id === id) || animals[0]
}

function outfitById(id) {
  return outfits.find((outfit) => outfit.id === id) || outfits[0]
}

function xpNeeded(level) {
  return level * 120
}

function chapterById(id) {
  return chapters.find((chapter) => chapter.id === id) || chapters[0]
}

function chapterUnlocked(id) {
  if (id === 'home') return true
  if (!account) return false
  if (id === 'office') return game.completedLevels.includes('home')
  if (id === 'monday') return game.completedLevels.includes('office')
  return game.infiniteUnlocked
}

function outfitPreview(outfit, className = 'outfit-preview') {
  const animal = animalById(outfit.animal)
  if (animal.id !== 'hachimi') {
    return `<span class="${className} emoji-outfit"><b>${animal.emoji}</b></span>`
  }
  return `<span class="${className}"><img src="${hero.src}" alt="">${outfit.src ? `<img class="pet-outfit" src="${outfit.src}" alt="">` : ''}</span>`
}

function render() {
  const selectedOutfit = outfitById(game.outfit)
  const selectedAnimal = animalById(game.animal)
  const selectedChapter = chapterById(game.selectedChapter)
  const xpNeed = game.level * 120
  elements.body.dataset.mood = game.mood
  elements.glow.textContent = formatNumber(game.glow)
  elements.fragments.textContent = formatNumber(game.fragments)
  elements.routeCode.textContent = routeCode
  elements.startHint.textContent = `${selectedChapter.name} · ${selectedAnimal.name}`

  elements.chapterPicker.querySelectorAll('[data-chapter]').forEach((button) => {
    const id = button.dataset.chapter
    const unlocked = chapterUnlocked(id)
    button.classList.toggle('active', id === selectedChapter.id)
    button.classList.toggle('locked', !unlocked)
    const small = button.querySelector('small')
    if (id === 'infinite' && small) small.textContent = game.infiniteUnlocked ? `体型 ×${INFINITE_TARGET_MASS} · 比用时` : '主线通关解锁'
    if (game.completedLevels.includes(id) && small) small.textContent = '已吞干净 ✓'
  })

  document.querySelectorAll('#moodPicker button').forEach((button) => {
    button.classList.toggle('active', button.dataset.mood === game.mood)
  })

  elements.homePets.innerHTML = selectedAnimal.id === 'hachimi'
    ? `<button class="home-pet selected" type="button" aria-label="逗逗哈基米">
        <img class="pet-base" src="${hero.src}" alt="${hero.name}">
        ${selectedOutfit.src ? `<img class="pet-outfit" src="${selectedOutfit.src}" alt="">` : ''}
      </button>`
    : `<button class="home-pet animal-pet selected" type="button" aria-label="逗逗${selectedAnimal.name}"><span class="home-animal-emoji">${selectedAnimal.emoji}</span></button>`

  elements.heroSelector.innerHTML = animals.map((animal) => {
    const unlocked = game.unlockedAnimals.includes(animal.id)
    return `<button class="hero-card ${animal.id === selectedAnimal.id ? 'active' : ''} ${unlocked ? '' : 'locked'}" data-animal="${animal.id}" type="button" aria-label="${unlocked ? animal.name : `等级 ${animal.level} 解锁${animal.name}`}" title="${animal.name}">
      <span class="animal-preview">${animal.emoji}</span><small>${unlocked ? animal.id === selectedAnimal.id ? '✓' : '' : `🔒${animal.level}`}</small>
    </button>`
  }).join('')

  elements.collectionList.innerHTML = outfits.filter((outfit) => outfit.animal === selectedAnimal.id).map((outfit) => {
    const unlocked = game.unlockedOutfits.includes(outfit.id)
    return `<article class="collection-row ${unlocked ? '' : 'locked'}">
      ${outfitPreview(outfit, 'collection-outfit')}
      <div><h3>${unlocked ? outfit.name : `Lv.${outfit.level} 神秘装扮`}</h3><p>${outfit.description}</p>
      <div class="bond"><i><b data-level="${Math.ceil(game.xp / xpNeed * 10)}"></b></i><small>${selectedAnimal.name} Lv.${game.level} · ${game.xp}/${xpNeed}</small></div></div>
      ${unlocked ? `<button data-outfit="${outfit.id}" type="button">${outfit.id === selectedOutfit.id ? '穿着中' : '换上'}</button>` : ''}
    </article>`
  }).join('')

  elements.recordRuns.textContent = formatNumber(game.stats.runs)
  elements.recordScore.textContent = formatNumber(game.stats.bestScore)
  elements.recordCombo.textContent = formatNumber(game.stats.bestCombo)
  elements.recordCleared.textContent = formatNumber(game.stats.totalCleared)
  elements.recordInfiniteTime.textContent = game.stats.bestInfiniteTimeMs
    ? formatTime(game.stats.bestInfiniteTimeMs / 1000)
    : '暂无通关纪录'

  if (account) {
    elements.saveState.textContent = '云端已同步'
    elements.accountButton.textContent = '已登'
    elements.accountButton.title = `${account.username} · 点击退出`
    elements.trialText.textContent = game.infiniteUnlocked ? `主线已通关，无限竞技达到体型 ×${INFINITE_TARGET_MASS} 即结束，用时越短越好。` : '完整版本已激活，通关三张地图即可解锁无限模式。'
  } else {
    elements.saveState.textContent = '本地试玩'
    elements.accountButton.textContent = '钥匙'
    elements.accountButton.title = '激活完整版本或登录'
    elements.trialText.textContent = '出租屋可以反复玩；按住偏移持续移动，轻点停止，双击哈气。'
  }
}

function save(sync = true) {
  game.lastSeen = Date.now()
  localStorage.setItem(storageKey, JSON.stringify(game))
  if (!account || !sync) return
  elements.saveState.textContent = '正在同步…'
  clearTimeout(cloudTimer)
  cloudTimer = setTimeout(async () => {
    try {
      const data = await api('/api/save', { method: 'PUT', body: { save: game } })
      game = normalizeSave(data.save)
      localStorage.setItem(storageKey, JSON.stringify(game))
      elements.saveState.textContent = '云端已同步'
    } catch {
      elements.saveState.textContent = '同步失败 · 已存本机'
    }
  }, 500)
}

function selectChapter(id) {
  if (!chapterUnlocked(id)) {
    if (!account) return openAccount('register')
    if (id === 'infinite') return showToast('先吞完三张主线地图')
    return showToast('先通关上一张地图')
  }
  game.selectedChapter = id
  save()
  render()
}

function selectAnimal(id) {
  const animal = animalById(id)
  if (!game.unlockedAnimals.includes(id)) return showToast(`达到 Lv.${animal.level} 才能选择${animal.name}`)
  game.animal = id
  const matchingOutfit = outfits.find((outfit) => outfit.animal === id && game.unlockedOutfits.includes(outfit.id))
  if (matchingOutfit) game.outfit = matchingOutfit.id
  elements.petSpeech.textContent = `这一局由${animal.name}出场。`
  save()
  render()
}

function selectOutfit(id) {
  const outfit = outfitById(id)
  if (!game.unlockedOutfits.includes(id)) return showToast(`达到 Lv.${outfit.level} 才能穿「${outfit.name}」`)
  game.outfit = id
  elements.petSpeech.textContent = `${outfit.name}已换好，虽然它看起来不太情愿。`
  save()
  render()
}

function openCollection() {
  render()
  elements.collectionModal.showModal()
}

function openRecords() {
  render()
  elements.recordsModal.showModal()
}

function showRunMessage(message) {
  clearTimeout(messageTimer)
  elements.runMessage.textContent = message
  elements.runMessage.classList.add('show')
  messageTimer = setTimeout(() => elements.runMessage.classList.remove('show'), 2400)
}

async function startRun() {
  if (startingRun || runner) return
  if (!chapterUnlocked(game.selectedChapter)) return selectChapter(game.selectedChapter)
  if (elements.resultModal.open) elements.resultModal.close()

  const hero = heroById()
  const selectedOutfit = outfitById(game.outfit)
  const selectedAnimal = animalById(game.animal)
  const chapter = chapterById(game.selectedChapter)
  startingRun = true
  const loadingStarted = performance.now()
  elements.home.hidden = true
  elements.run.hidden = false
  elements.loadingOverlay.hidden = false
  await Promise.all(selectedAnimal.id === 'hachimi' ? [
    hero.image.decode?.().catch(() => {}),
    selectedOutfit.image?.decode?.().catch(() => {})
  ].filter(Boolean) : [])
  await new Promise((resolve) => requestAnimationFrame(resolve))
  if (!startingRun) return
  elements.runScoreLabel.textContent = chapter.infinite ? '本局用时' : '清爽值'
  elements.runScore.classList.toggle('time-metric', chapter.infinite)
  elements.runScore.textContent = chapter.infinite ? formatTime(0) : '0'
  elements.runCombo.textContent = '0'
  elements.runSpeed.textContent = '1.0'
  elements.burstFill.dataset.level = '0'
  elements.pressureFill.dataset.level = '0'
  elements.bossHealth.dataset.level = '0'
  elements.bossBar.hidden = false
  elements.bossName.textContent = chapter.infinite ? `无限竞技 · 目标体型 ×${chapter.targetMass}` : `长大后吞掉${chapter.boss.name}`

  runner = new Runner(elements.canvas, {
    hero,
    animal: selectedAnimal,
    heroImage: selectedAnimal.id === 'hachimi' ? hero.image : null,
    outfitImage: selectedAnimal.id === 'hachimi' ? selectedOutfit.image : null,
    chapter,
    seed: routeCode,
    onReady: () => {
      const remaining = Math.max(0, 650 - (performance.now() - loadingStarted))
      setTimeout(() => {
        if (!runner) return
        runner.countdown = 3
        runner.countdownLast = 4
        startingRun = false
        elements.loadingOverlay.hidden = true
      }, remaining)
    },
    onMessage: showRunMessage,
    onUpdate: ({ score, seconds, combo, speed, energy, pressure, bossActive, bossHealth, bossName }) => {
      elements.runScore.textContent = chapter.infinite ? formatTime(seconds) : formatNumber(score)
      elements.runCombo.textContent = formatNumber(combo)
      elements.runSpeed.textContent = formatMetric(speed)
      elements.burstFill.dataset.level = String(Math.round(energy / 10))
      elements.pressureFill.dataset.level = String(Math.round(pressure / 10))
      elements.bossBar.hidden = !bossActive
      elements.bossHealth.dataset.level = String(Math.ceil(bossHealth / 10))
      elements.bossName.textContent = bossName
    },
    onFinish: finishRun
  })
  runner.start()
}

function finishRun(result) {
  runner = null
  startingRun = false
  elements.loadingOverlay.hidden = true
  elements.run.hidden = true
  elements.home.hidden = false
  const selected = heroById()
  const selectedOutfit = outfitById(game.outfit)
  const selectedAnimal = animalById(game.animal)
  const chapter = chapterById(game.selectedChapter)
  const beforeOutfits = new Set(game.unlockedOutfits)
  const infiniteWasLocked = !game.infiniteUnlocked
  const timeMs = result.milliseconds ?? Math.round(result.seconds * 1000)
  const newTimeRecord = chapter.infinite && result.won && timeMs > 0
    && (!game.stats.bestInfiniteTimeMs || timeMs < game.stats.bestInfiniteTimeMs)
  if (newTimeRecord) game.stats.bestInfiniteTimeMs = timeMs

  if (result.won && !chapter.infinite && !game.completedLevels.includes(chapter.id)) game.completedLevels.push(chapter.id)
  if (['home', 'office', 'monday'].every((id) => game.completedLevels.includes(id))) game.infiniteUnlocked = true

  game.stats.runs += 1
  game.stats.bestScore = Math.max(game.stats.bestScore, result.score)
  game.stats.bestCombo = Math.max(game.stats.bestCombo, result.combo)
  game.stats.totalCleared += result.cleared
  game.glow += Math.max(2, Math.floor(result.cleared / 9))
  game.fragments += Math.max(1, Math.floor(result.score / 450))
  game.bond.hachimi = Math.min(100, game.bond.hachimi + Math.max(2, Math.floor(result.cleared / 18)))
  game.xp += Math.max(15, Math.floor(result.score / 90))
  while (game.xp >= xpNeeded(game.level) && game.level < 100) {
    game.xp -= xpNeeded(game.level)
    game.level += 1
  }
  for (const outfit of outfits) {
    if (outfit.level <= game.level && !game.unlockedOutfits.includes(outfit.id)) game.unlockedOutfits.push(outfit.id)
  }
  for (const animal of animals) {
    if (animal.level <= game.level && !game.unlockedAnimals.includes(animal.id)) game.unlockedAnimals.push(animal.id)
  }
  const newOutfit = outfits.find((outfit) => outfit.animal === selectedAnimal.id && !beforeOutfits.has(outfit.id) && game.unlockedOutfits.includes(outfit.id)) || null
  const unlockedInfinite = infiniteWasLocked && game.infiniteUnlocked
  if (result.won && !chapter.infinite) {
    const nextIndex = chapters.findIndex((entry) => entry.id === chapter.id) + 1
    if (chapters[nextIndex] && chapterUnlocked(chapters[nextIndex].id)) game.selectedChapter = chapters[nextIndex].id
  }

  lastResult = { ...result, hero: selected, animal: selectedAnimal, outfit: selectedOutfit, newOutfit, unlockedInfinite, newTimeRecord, chapter, routeCode }
  save()
  render()
  showResult(lastResult)
}

function showResult(result) {
  elements.resultTitle.textContent = result.won
    ? result.chapter.infinite ? '无限竞技达标！' : `${result.chapter.name}通关！`
    : result.chapter.infinite ? '无限竞技 · 未达标' : '肚子被大物件撞撑了'
  const isHachimi = result.animal.id === 'hachimi'
  elements.resultHero.hidden = !isHachimi
  elements.resultOutfit.hidden = !isHachimi || !result.outfit.src
  elements.resultAnimalEmoji.hidden = isHachimi
  if (!isHachimi) elements.resultAnimalEmoji.textContent = result.animal.emoji
  if (isHachimi) elements.resultHero.src = result.hero.src
  if (isHachimi && result.outfit.src) elements.resultOutfit.src = result.outfit.src
  elements.resultQuip.textContent = result.chapter.infinite
    ? `${result.won ? `已达到目标体型 ×${result.chapter.targetMass}` : `目标体型 ×${result.chapter.targetMass} 还没到`}，用时 ${formatTime(result.seconds)}。用时越短越好！`
    : `${result.form}吞了 ${result.cleared} 件东西，用时 ${formatTime(result.seconds)}。`
  elements.resultScoreLabel.textContent = result.chapter.infinite ? result.won ? '通关用时' : '本局用时' : '清爽值'
  elements.resultScore.classList.toggle('time-metric', result.chapter.infinite)
  elements.resultScore.textContent = result.chapter.infinite ? formatTime(result.seconds) : formatNumber(result.score)
  elements.resultSpeed.textContent = formatMetric(result.speed)
  elements.resultCombo.textContent = formatNumber(result.combo)
  elements.resultCleared.textContent = formatNumber(result.cleared)
  const unlockMessage = [
    result.unlockedInfinite ? '三张主线全部通关，无限竞技模式已解锁！' : '',
    result.newOutfit ? `升级啦！衣柜解锁了「${result.newOutfit.name}」` : '',
    result.newTimeRecord ? `新的最快纪录：${formatTime(result.seconds)}！` : ''
  ].filter(Boolean).join(' ')
    || (result.won && !result.chapter.infinite ? `「${result.chapter.name}」已经被${result.animal.name}吞干净了！` : '')
  elements.newFriend.hidden = !unlockMessage
  elements.newFriend.textContent = unlockMessage
  elements.resultModal.showModal()
}

function leaveRun() {
  if (!runner || !window.confirm('现在回生态瓶？本局奖励不会结算。')) return
  runner.stop()
  runner = null
  startingRun = false
  elements.loadingOverlay.hidden = true
  elements.run.hidden = true
  elements.home.hidden = false
  showToast('吞吞团先回家歇一会儿')
}

function ensureUiAudio() {
  const Audio = window.AudioContext || window.webkitAudioContext
  if (!Audio) return null
  if (!homeAudio) {
    homeAudio = window.__hachiAudioContext || new Audio()
    window.__hachiAudioContext = homeAudio
  }
  if (homeAudio.state === 'suspended') homeAudio.resume()
  return homeAudio
}

function playUiClick() {
  const audio = ensureUiAudio()
  if (!audio) return
  const now = audio.currentTime
  const oscillator = audio.createOscillator()
  const gain = audio.createGain()
  oscillator.type = 'triangle'
  oscillator.frequency.setValueAtTime(520, now)
  oscillator.frequency.exponentialRampToValueAtTime(760, now + .045)
  gain.gain.setValueAtTime(.08, now)
  gain.gain.exponentialRampToValueAtTime(.001, now + .07)
  oscillator.connect(gain).connect(audio.destination)
  oscillator.start(now)
  oscillator.stop(now + .08)
}

function playHissSound() {
  const homeAudio = ensureUiAudio()
  if (!homeAudio) return
  const now = homeAudio.currentTime
  const duration = .72
  const buffer = homeAudio.createBuffer(1, Math.floor(homeAudio.sampleRate * duration), homeAudio.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length * .35)
  const source = homeAudio.createBufferSource()
  const filter = homeAudio.createBiquadFilter()
  const gain = homeAudio.createGain()
  source.buffer = buffer
  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(1900, now)
  filter.frequency.exponentialRampToValueAtTime(850, now + duration)
  filter.Q.value = .7
  gain.gain.setValueAtTime(.001, now)
  gain.gain.linearRampToValueAtTime(.34, now + .04)
  gain.gain.setValueAtTime(.3, now + .38)
  gain.gain.exponentialRampToValueAtTime(.001, now + duration)
  source.connect(filter).connect(gain).connect(homeAudio.destination)
  source.start(now)

  const growl = homeAudio.createOscillator()
  const growlGain = homeAudio.createGain()
  growl.type = 'sawtooth'
  growl.frequency.setValueAtTime(170, now)
  growl.frequency.exponentialRampToValueAtTime(85, now + .48)
  growlGain.gain.setValueAtTime(.16, now)
  growlGain.gain.exponentialRampToValueAtTime(.001, now + .55)
  growl.connect(growlGain).connect(homeAudio.destination)
  growl.start(now)
  growl.stop(now + .56)
}

function petSelectedHero() {
  const pet = elements.homePets.querySelector('.home-pet')
  const base = pet?.querySelector('.pet-base')
  const animal = animalById(game.animal)
  if (!pet) return
  clearTimeout(interactionTimer)
  pet.classList.remove('hissing')
  void pet.offsetWidth
  pet.classList.add('hissing')
  if (base) base.src = hero.hissSrc
  elements.petSpeech.textContent = animal.id === 'hachimi' ? '哈——嘶！再摸就要收费了！' : `${animal.name}被你逗得原地炸毛！`
  playHissSound()
  navigator.vibrate?.([28, 35, 45])
  game.bond.hachimi = Math.min(100, game.bond.hachimi + 1)
  save(false)
  interactionTimer = setTimeout(() => {
    pet.classList.remove('hissing')
    if (base) base.src = hero.src
    elements.petSpeech.textContent = animal.id === 'hachimi'
      ? hero.speeches[Math.floor(Math.random() * (hero.speeches.length - 1))]
      : `${animal.name}假装什么都没发生。`
  }, 900)
}

function openAccount(mode = 'register') {
  setAccountMode(mode)
  elements.form.reset()
  elements.formError.textContent = ''
  elements.accountModal.showModal()
}

function setAccountMode(mode) {
  accountMode = mode
  const registering = mode === 'register'
  elements.registerTab.classList.toggle('active', registering)
  elements.loginTab.classList.toggle('active', !registering)
  elements.registerTab.setAttribute('aria-selected', String(registering))
  elements.loginTab.setAttribute('aria-selected', String(!registering))
  elements.keyField.hidden = !registering
  elements.key.required = registering
  elements.password.autocomplete = registering ? 'new-password' : 'current-password'
  elements.accountTitle.textContent = registering ? '用 Key 激活' : '欢迎回到微境'
  elements.accountCopy.textContent = registering ? '保留试玩进度，解锁完整主线、无限竞技、升级换装和云存档。' : '登录后会加载你的云端哈基米，不需要 Key。'
  elements.submitAccount.textContent = registering ? '激活并保存进度' : '登录并继续玩'
  elements.formError.textContent = ''
}

async function submitAccount(event) {
  event.preventDefault()
  elements.formError.textContent = ''
  elements.submitAccount.disabled = true
  try {
    const body = { username: elements.username.value, password: elements.password.value }
    if (accountMode === 'register') {
      body.activationKey = elements.key.value
      body.save = game
    }
    const data = await api(accountMode === 'register' ? '/api/register' : '/api/login', { method: 'POST', body })
    account = data.user
    game = normalizeSave(data.save)
    applyOffline(true)
    save()
    render()
    elements.accountModal.close()
    showToast(accountMode === 'register' ? '激活成功，试玩进度已保留' : '登录成功，云端进度已加载')
  } catch (error) {
    elements.formError.textContent = error.message
  } finally {
    elements.submitAccount.disabled = false
  }
}

async function logout() {
  if (!window.confirm(`退出账号 ${account.username}？云端进度不会丢失。`)) return
  try {
    await api('/api/logout', { method: 'POST' })
  } catch {
    // 即使网络异常，也允许清除本地登录态。
  }
  account = null
  game = loadLocal()
  render()
  showToast('已退出账号')
}

function applyOffline(fullVersion) {
  const elapsed = Math.max(0, Date.now() - Number(game.lastSeen || Date.now()))
  const cap = fullVersion ? 180 : 30
  const earned = Math.min(cap, Math.floor(elapsed / 120_000))
  if (!earned) return
  game.glow += earned
  showToast(`回来啦，吞吞团捡到了 ${earned} 点微光`)
}

async function shareResult() {
  if (!lastResult) return
  const text = lastResult.chapter.infinite
    ? `我的${lastResult.animal.name}挑战「无限竞技」，${lastResult.won ? `用 ${formatTime(lastResult.seconds)} 达到目标体型 ×${lastResult.chapter.targetMass}` : `用时 ${formatTime(lastResult.seconds)}，最终体型 ×${formatMetric(lastResult.speed)}`}！ 同局挑战：${lastResult.routeCode}`
    : `我的${lastResult.animal.name}在「${lastResult.chapter.name}」吞了 ${formatNumber(lastResult.cleared)} 件东西，最终体型 ×${formatMetric(lastResult.speed)}${lastResult.won ? '，还把关底也吞了！' : '！'} 同局挑战：${lastResult.routeCode}`
  const url = `${location.origin}${location.pathname}?challenge=${encodeURIComponent(lastResult.routeCode)}`
  const canvas = elements.shareCanvas
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff8df'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#9edbc0'
  ctx.fillRect(0, 0, canvas.width, 510)
  ctx.fillStyle = '#f6d56f'
  ctx.beginPath()
  ctx.arc(890, 120, 165, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#31443d'
  ctx.font = '900 54px Microsoft YaHei, sans-serif'
  ctx.fillText('哈基米吞吞团', 80, 105)
  ctx.font = '900 82px Microsoft YaHei, sans-serif'
  ctx.fillText(lastResult.chapter.infinite ? '无限竞技 · 越快越好' : '今天也轻松了一点', 80, 665)
  ctx.font = '36px Microsoft YaHei, sans-serif'
  ctx.fillStyle = '#6d7d73'
  ctx.fillText(lastResult.chapter.infinite ? `目标体型 ×${lastResult.chapter.targetMass} · 用时 ${formatTime(lastResult.seconds)}` : lastResult.hero.quip, 80, 735, 920)
  if (lastResult.animal.id === 'hachimi' && lastResult.hero.image.complete && lastResult.hero.image.naturalWidth) {
    ctx.drawImage(lastResult.hero.image, 330, 150, 420, 420)
    if (lastResult.outfit.image?.complete && lastResult.outfit.image.naturalWidth) ctx.drawImage(lastResult.outfit.image, 330, 150, 420, 420)
  } else {
    ctx.font = '300px "Segoe UI Emoji", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(lastResult.animal.emoji, 540, 430)
    ctx.textAlign = 'left'
  }

  const stats = [
    lastResult.chapter.infinite ? [lastResult.won ? '通关用时' : '本局用时', formatTime(lastResult.seconds)] : ['清爽值', lastResult.score],
    ['最高连击', lastResult.combo],
    ['吞掉烦恼', lastResult.cleared]
  ]
  stats.forEach(([label, value], index) => {
    const x = 80 + index * 320
    ctx.fillStyle = index === 1 ? '#d9efd9' : '#ffe9a8'
    ctx.fillRect(x, 825, 280, 205)
    ctx.strokeStyle = '#31443d'
    ctx.lineWidth = 7
    ctx.strokeRect(x, 825, 280, 205)
    ctx.fillStyle = '#6d7d73'
    ctx.font = '28px Microsoft YaHei, sans-serif'
    ctx.fillText(label, x + 28, 880)
    ctx.fillStyle = '#31443d'
    ctx.font = '900 62px Microsoft YaHei, sans-serif'
    ctx.fillText(typeof value === 'string' ? value : formatNumber(value), x + 28, 970, 224)
  })
  ctx.fillStyle = '#ef765f'
  ctx.font = '900 42px Microsoft YaHei, sans-serif'
  ctx.fillText(`同路线挑战码  ${lastResult.routeCode}`, 80, 1165)
  ctx.fillStyle = '#6d7d73'
  ctx.font = '30px Microsoft YaHei, sans-serif'
  ctx.fillText(lastResult.chapter.infinite ? `吞固定大小的物品，快速长大到 ×${lastResult.chapter.targetMass}。` : '拖动乱吃，吃大以后把星期一也吞掉。', 80, 1235)

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  const file = blob ? new File([blob], '哈基米吞吞团战绩.png', { type: 'image/png' }) : null
  try {
    if (file && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: '哈基米吞吞团', text, url, files: [file] })
      return
    }
    if (navigator.share) {
      await navigator.share({ title: '哈基米吞吞团', text, url })
      return
    }
  } catch (error) {
    if (error.name === 'AbortError') return
  }

  if (navigator.clipboard) {
    await navigator.clipboard.writeText(`${text}\n${url}`)
    showToast('挑战文案和链接已复制')
  } else {
    window.prompt('复制挑战内容', `${text}\n${url}`)
  }
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: options.body ? { 'Content-Type': 'application/json' } : {},
    body: options.body ? JSON.stringify(options.body) : undefined
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || '请求失败')
  return data
}

function showToast(message) {
  clearTimeout(toastTimer)
  elements.toast.textContent = message
  elements.toast.classList.add('show')
  toastTimer = setTimeout(() => elements.toast.classList.remove('show'), 2600)
}

async function start() {
  applyOffline(false)
  render()
  try {
    const session = await api('/api/session')
    if (session.authenticated) {
      account = session.user
      game = normalizeSave(session.save)
      applyOffline(true)
      save()
      render()
    }
  } catch {
    showToast('当前为离线试玩，联网后可登录或激活')
  }

  setInterval(() => {
    const cap = account ? 300 : 80
    if (game.glow >= cap) return
    game.glow += 1
    save(false)
    elements.glow.textContent = game.glow
  }, 30_000)

  setInterval(() => {
    if (account) save()
  }, 60_000)
}

document.addEventListener('click', (event) => {
  if (event.target.closest('button')) playUiClick()
})

elements.startButton.addEventListener('click', startRun)
elements.chapterPicker.addEventListener('click', (event) => {
  const button = event.target.closest('[data-chapter]')
  if (button) selectChapter(button.dataset.chapter)
})
elements.exitRun.addEventListener('click', leaveRun)
elements.retryButton.addEventListener('click', () => {
  elements.resultModal.close()
  startRun()
})
elements.backHome.addEventListener('click', () => elements.resultModal.close())
elements.shareResult.addEventListener('click', shareResult)
elements.homePets.addEventListener('click', (event) => {
  if (event.target.closest('.home-pet')) petSelectedHero()
})
elements.heroSelector.addEventListener('click', (event) => {
  const card = event.target.closest('[data-animal]')
  if (card) selectAnimal(card.dataset.animal)
})
elements.moodPicker.addEventListener('click', (event) => {
  const button = event.target.closest('[data-mood]')
  if (!button) return
  game.mood = button.dataset.mood
  save()
  render()
})
elements.collectionList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-outfit]')
  if (!button) return
  selectOutfit(button.dataset.outfit)
  elements.collectionModal.close()
})
elements.settingsButton.addEventListener('click', () => elements.settingsModal.showModal())
$('#dockCollection').addEventListener('click', openCollection)
$('#dockRecords').addEventListener('click', openRecords)
document.querySelectorAll('[data-close]').forEach((button) => {
  button.addEventListener('click', () => document.getElementById(button.dataset.close).close())
})
elements.accountButton.addEventListener('click', () => account ? logout() : openAccount('register'))
elements.closeAccount.addEventListener('click', () => elements.accountModal.close())
elements.registerTab.addEventListener('click', () => setAccountMode('register'))
elements.loginTab.addEventListener('click', () => setAccountMode('login'))
elements.form.addEventListener('submit', submitAccount)
for (const dialog of [elements.collectionModal, elements.recordsModal, elements.settingsModal, elements.accountModal]) {
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close()
  })
}

start()
