const Core = require("../../utils/core");
const Scene = require("../../utils/scene");
const Physics = require("../../utils/physics");
const Progress = require("../../utils/progress");
const Audio = require("../../utils/audio");

const PROP_LAYOUT = Scene.PROP_LAYOUT;

function vibrate(type) {
  try {
    wx.vibrateShort({
      type,
      fail() { try { wx.vibrateShort(); } catch (_) {} }
    });
  } catch (_) {}
}

function reportEvent(name, values = {}) {
  if (!wx.reportEvent) return;
  const allowed = ["tag", "method", "props", "hits", "slams", "recycle_days", "added_day"];
  const data = {};
  allowed.forEach(key => {
    const value = values[key];
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") data[key] = value;
  });
  try { wx.reportEvent(name, data); } catch (_) {}
}

function createMiniAudio(path, volume) {
  if (!wx.createInnerAudioContext) return null;
  const context = wx.createInnerAudioContext();
  context.autoplay = false;
  context.obeyMuteSwitch = true;
  context.volume = volume;
  context.src = path;
  return {
    play() {
      try { context.stop(); context.seek(0); context.play(); } catch (_) {}
    },
    destroy() { try { context.destroy(); } catch (_) {} }
  };
}

Page({
  data: {
    phase: "write",
    note: "",
    canContinue: false,
    showNote: true,
    showPrivacy: false,
    canvasLabel: "写下烦恼，然后把物品拖进箱子"
  },

  onLoad() {
    this.audio = Audio.createPlayer(createMiniAudio, "/assets/audio/");
    this.session = new Core.RecycleSession();
    this.body = Physics.create();
    this.visualHealth = Core.MAX_HEALTH;
    this.sensor = { x: 0, y: 0, active: false };
    this.gravity = { x: 0, y: -1, z: 0 };
    this.gravityReady = false;
    this.sensorRunning = false;
    this.job = null;
    this.drag = null;
    this.dropEffect = null;
    this.frameId = null;
    this.lastFrameAt = 0;
    this.hitAt = -10000;
    this.collisionAt = -10000;
    this.collisionTier = 0;
    this.collisionPoint = null;
    this.processingStarted = 0;
    this.resultAt = 0;
    this.pageHidden = false;
    this.sceneCanvas = null;
    this.sceneContext = null;
    let stored = null;
    try { stored = wx.getStorageSync(Progress.STORAGE_KEY); } catch (_) {}
    this.progress = Progress.normalize(stored);
    reportEvent("wr_open");
  },

  onReady() {
    this.measureScene();
  },

  onResize() {
    if (!this.sceneCanvas) return;
    wx.nextTick(() => this.measureScene());
  },

  measureScene() {
    wx.createSelectorQuery().in(this).select("#scene").fields({ node: true, size: true }).exec(results => {
      const scene = results[0];
      if (!scene || !scene.node || !scene.width || !scene.height) {
        if (!this.sceneCanvas) wx.showToast({ title: "画布初始化失败", icon: "none" });
        return;
      }
      const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      const ratio = Math.min(info.pixelRatio || 1, 3);
      this.sceneCanvas = scene.node;
      this.sceneContext = this.sceneCanvas.getContext("2d");
      this.sceneWidth = scene.width;
      this.sceneHeight = scene.height;
      this.sceneCanvas.width = Math.max(1, Math.round(scene.width * ratio));
      this.sceneCanvas.height = Math.max(1, Math.round(scene.height * ratio));
      this.viewScale = Math.min(scene.width / Scene.WIDTH, scene.height / Scene.INTERACTIVE_HEIGHT);
      this.viewOffsetX = (scene.width - Scene.WIDTH * this.viewScale) / 2;
      this.viewOffsetY = (scene.height - Scene.INTERACTIVE_HEIGHT * this.viewScale) / 2;
      this.pixelScale = this.viewScale * ratio;
      this.pixelOffsetX = this.viewOffsetX * ratio;
      this.pixelOffsetY = this.viewOffsetY * ratio;
      this.drawScene();
      this.queueFrame();
    });
  },

  onShow() {
    if (!this.pageHidden) return;
    this.pageHidden = false;
    this.lastFrameAt = 0;
    this.sensor = { x: 0, y: 0, active: false };
    this.gravity = { x: 0, y: -1, z: 0 };
    this.gravityReady = false;
    if (this.session.phase === "processing") this.startSensor();
    this.queueFrame();
  },

  onHide() {
    this.pageHidden = true;
    this.stopSensor();
    this.cancelFrame();
  },

  onUnload() {
    this.stopSensor();
    this.cancelFrame();
    if (this.audio) this.audio.destroy();
    if (this.session) this.session.dispose();
  },

  onNoteInput(event) {
    try {
      const note = this.session.setNote(event.detail.value);
      this.setData({ note, canContinue: Boolean(note.trim()) });
    } catch (_) {}
  },

  finishNote() {
    if (this.session.phase !== "write" || !this.session.note.trim()) return;
    try {
      this.session.pack();
      if (this.audio) this.audio.play("paper");
      reportEvent("wr_pack", { tag: this.session.tag });
      this.setData({ phase: "pack", showNote: false, canvasLabel: "拖动物品进箱子，再把胶带拖到箱子上" });
      this.drawScene();
      this.queueFrame();
    } catch (_) {}
  },

  point(event) {
    const touch = event.touches && event.touches[0] || event.changedTouches && event.changedTouches[0];
    if (!touch || !this.sceneWidth || !this.sceneHeight) return null;
    const rawX = Number.isFinite(touch.x) ? touch.x : touch.clientX;
    const rawY = Number.isFinite(touch.y) ? touch.y : touch.clientY;
    if (!Number.isFinite(rawX) || !Number.isFinite(rawY) || !this.viewScale) return null;
    return {
      x: (rawX - this.viewOffsetX) / this.viewScale,
      y: (rawY - this.viewOffsetY) / this.viewScale,
      time: Date.now()
    };
  },

  onCanvasStart(event) {
    const point = this.point(event);
    if (!point) return;
    if (point.x > 700 && point.y < 120) {
      this.drag = { kind: "privacy", startX: point.x, startY: point.y, moved: false };
      return;
    }
    if (this.job) return;
    if (this.session.phase === "result") {
      if (this.audio) this.audio.play("ui");
      this.resetSession();
      return;
    }

    if (this.session.phase === "pack") {
      for (const item of PROP_LAYOUT) {
        if (!this.session.props.includes(item.id) && Math.hypot(point.x - item.x, point.y - item.y) < item.radius) {
          if (this.audio) this.audio.play("ui");
          this.drag = { kind: "prop", id: item.id, x: point.x, y: point.y, startX: point.x, startY: point.y };
          this.queueFrame();
          return;
        }
      }
      if (Math.hypot(point.x - 690, point.y - 1360) < 76) {
        if (this.audio) this.audio.play("ui");
        this.drag = { kind: "tape", x: point.x, y: point.y, startX: point.x, startY: point.y };
        this.queueFrame();
      }
      return;
    }

    if (this.session.phase === "processing") {
      if (!Physics.contains(this.body, point.x, point.y)) return;
      this.drag = {
        kind: "box",
        x: point.x,
        y: point.y,
        lastX: point.x,
        lastY: point.y,
        lastTime: point.time,
        vx: 0,
        vy: 0,
        moved: false,
        heldEdges: new Set()
      };
    }
  },

  onCanvasMove(event) {
    if (!this.drag) return;
    const point = this.point(event);
    if (!point) return;
    if (this.drag.kind === "privacy") {
      if (Math.hypot(point.x - this.drag.startX, point.y - this.drag.startY) > 14) this.drag.moved = true;
    } else if (this.drag.kind === "prop" || this.drag.kind === "tape") {
      this.drag.x = point.x;
      this.drag.y = point.y;
    } else if (this.drag.kind === "box") {
      const dt = Math.max(16, point.time - this.drag.lastTime) / 1000;
      const dx = point.x - this.drag.lastX;
      const dy = point.y - this.drag.lastY;
      if (Math.hypot(point.x - this.drag.x, point.y - this.drag.y) > 10) this.drag.moved = true;
      this.drag.vx = dx / dt;
      this.drag.vy = dy / dt;
      this.drag.lastX = point.x;
      this.drag.lastY = point.y;
      this.drag.lastTime = point.time;
      const impacts = Physics.moveHeld(this.body, point.x, point.y, this.drag.vx, this.drag.vy);
      const nextEdges = new Set(impacts.map(impact => impact.edge));
      impacts.forEach(impact => {
        if (!this.drag.heldEdges.has(impact.edge)) this.slamBox(impact, true);
      });
      this.drag.heldEdges = nextEdges;
    }
    this.drawScene();
    this.queueFrame();
  },

  onCanvasEnd(event) {
    if (!this.drag) return;
    const point = this.point(event) || { x: this.drag.x, y: this.drag.y, time: Date.now() };
    const drag = this.drag;
    this.drag = null;

    if (drag.kind === "privacy") {
      if (!drag.moved) {
        if (this.audio) this.audio.play("ui");
        this.setData({ showPrivacy: true });
      }
    } else if (drag.kind === "prop") {
      const accepted = point.x > 205 && point.x < 595 && point.y > 560 && point.y < 1080;
      if (accepted) {
        try { this.session.setProp(drag.id, true); } catch (_) {}
        if (this.audio) this.audio.play("paper");
        vibrate("light");
      } else if (this.audio) this.audio.play("ui");
      const item = PROP_LAYOUT.find(prop => prop.id === drag.id);
      this.dropEffect = {
        id: drag.id,
        x: point.x,
        y: point.y,
        accepted,
        target: { x: item.x, y: item.y },
        started: Date.now()
      };
    } else if (drag.kind === "tape") {
      const accepted = point.x > 210 && point.x < 600 && point.y > 560 && point.y < 1080;
      if (accepted) this.sealBox();
    } else if (drag.kind === "box") {
      if (drag.moved) {
        if (drag.heldEdges && drag.heldEdges.size) Physics.throwBody(this.body, 0, 0);
        else Physics.throwBody(this.body, drag.vx, drag.vy);
      } else this.hitBox();
    }
    this.drawScene();
    this.queueFrame();
  },

  onCanvasCancel() {
    this.drag = null;
  },

  sealBox() {
    if (this.job || this.session.phase !== "pack") return;
    try {
      this.session.seal();
      if (this.audio) this.audio.play("seal");
      vibrate("medium");
      this.startJob("seal", 720);
      this.setData({ phase: "choose", canvasLabel: "纸箱正在封装" });
    } catch (_) {}
  },

  hitBox() {
    if (this.job || this.session.phase !== "processing") return;
    if (!this.session.hit(Date.now())) return;
    this.hitAt = Date.now();
    const feedback = Core.punchFeedback(this.session.hits);
    if (this.audio) this.audio.play("tap");
    vibrate(feedback.intensity);
    if (this.session.health <= 0) this.triggerFinish();
    this.drawScene();
  },

  slamBox(impact, held = Boolean(impact && impact.held)) {
    if (this.job || this.session.phase !== "processing") return;
    const feedback = this.session.slam(impact.speed, Date.now(), held);
    if (!feedback) return;
    this.collisionAt = Date.now();
    this.collisionTier = feedback.tier;
    this.collisionPoint = {
      x: impact.edge === "left" ? 25 : impact.edge === "right" ? 775 : this.body.x,
      y: impact.edge === "top" ? 150 : impact.edge === "bottom" ? 1510 : this.body.y
    };
    if (this.audio) this.audio.play(feedback.intensity);
    vibrate(feedback.intensity);
    if (this.session.health <= 0) this.triggerFinish();
  },

  triggerFinish() {
    if (this.job) return;
    this.stopSensor();
    if (this.audio) this.audio.play("final");
    vibrate("heavy");
    this.startJob("punch-finish", 1150);
    this.setData({ canvasLabel: "最后一击，正在自动回收" });
  },

  startSensor() {
    if (this.sensorRunning || !wx.startAccelerometer || !wx.onAccelerometerChange) return;
    this.sensorRunning = true;
    this.accelerometerHandler = reading => {
      if (!reading || this.session.phase !== "processing" || this.job) return;
      const raw = {
        x: Number.isFinite(reading.x) ? reading.x : 0,
        y: Number.isFinite(reading.y) ? reading.y : 0,
        z: Number.isFinite(reading.z) ? reading.z : 0
      };
      if (!this.gravityReady) {
        this.gravity = raw;
        this.gravityReady = true;
        this.sensor.x = raw.x;
        this.sensor.y = raw.y;
        this.sensor.active = true;
        return;
      }
      const smoothing = 0.18;
      this.gravity.x += (raw.x - this.gravity.x) * smoothing;
      this.gravity.y += (raw.y - this.gravity.y) * smoothing;
      this.gravity.z += (raw.z - this.gravity.z) * smoothing;
      const shakeX = raw.x - this.gravity.x;
      const shakeY = raw.y - this.gravity.y;
      this.sensor.x = this.gravity.x - shakeX;
      this.sensor.y = this.gravity.y - shakeY;
      this.sensor.active = true;
    };
    try {
      wx.onAccelerometerChange(this.accelerometerHandler);
      wx.startAccelerometer({
        interval: "game",
        fail: () => { this.sensorRunning = false; }
      });
    } catch (_) { this.sensorRunning = false; }
  },

  stopSensor() {
    if (!this.sensorRunning) return;
    try {
      if (wx.offAccelerometerChange && this.accelerometerHandler) wx.offAccelerometerChange(this.accelerometerHandler);
      if (wx.stopAccelerometer) wx.stopAccelerometer();
    } catch (_) {}
    this.sensorRunning = false;
    this.accelerometerHandler = null;
    this.sensor = { x: 0, y: 0, active: false };
    this.gravity = { x: 0, y: -1, z: 0 };
    this.gravityReady = false;
  },

  recordCompletion(result) {
    this.progress = Progress.complete(this.progress, result.completedAt);
    try { wx.setStorageSync(Progress.STORAGE_KEY, Progress.storedValue(this.progress)); } catch (_) {}
    reportEvent("wr_complete", {
      tag: result.tag,
      method: result.method,
      props: result.props.length,
      hits: result.hits,
      slams: result.slams,
      recycle_days: this.progress.totalDays,
      added_day: this.progress.added
    });
  },

  startJob(kind, duration) {
    this.job = { kind, duration, started: Date.now(), progress: 0 };
    this.queueFrame();
  },

  queueFrame() {
    if (!this.sceneCanvas || this.frameId !== null || this.pageHidden) return;
    this.frameId = this.sceneCanvas.requestAnimationFrame(() => this.frame());
  },

  cancelFrame() {
    if (!this.sceneCanvas || this.frameId === null) return;
    this.sceneCanvas.cancelAnimationFrame(this.frameId);
    this.frameId = null;
  },

  frame() {
    this.frameId = null;
    const now = Date.now();
    const elapsed = this.lastFrameAt ? (now - this.lastFrameAt) / 1000 : 0;
    this.lastFrameAt = now;
    const healthBlend = 1 - Math.exp(-3.5 * Math.max(0, elapsed));
    this.visualHealth += (this.session.health - this.visualHealth) * healthBlend;
    if (Math.abs(this.session.health - this.visualHealth) < 0.4) this.visualHealth = this.session.health;

    if (this.session.phase === "processing" && !this.job && !(this.drag && this.drag.kind === "box")) {
      Physics.step(this.body, this.sensor, elapsed).forEach(impact => this.slamBox(impact));
    }

    if (this.dropEffect && now - this.dropEffect.started > 430) this.dropEffect = null;

    if (this.job) {
      this.job.progress = Math.min(1, Math.max(0, (now - this.job.started) / this.job.duration));
      if (this.job.kind === "recycle" && this.job.progress >= 0.92 && !this.job.doorPlayed) {
        this.job.doorPlayed = true;
        if (this.audio) this.audio.play("door");
        vibrate("heavy");
      }
      if (this.job.progress >= 1) {
        const kind = this.job.kind;
        this.job = null;
        if (kind === "seal") {
          this.session.choose("punch");
          this.session.start();
          this.body = Physics.create();
    this.visualHealth = Core.MAX_HEALTH;
          this.processingStarted = now;
          this.startSensor();
          reportEvent("wr_start", { method: "punch", props: this.session.props.length });
          this.setData({ phase: "processing", canvasLabel: "点击、拖拽或摇晃纸箱进行破坏" });
        } else if (kind === "punch-finish") {
          const result = this.session.recycle(now);
          this.recordCompletion(result);
          if (this.audio) this.audio.play("recycle");
          this.startJob("recycle", 1450);
          this.setData({ phase: "recycle", canvasLabel: "正在回收" });
        } else if (kind === "recycle") {
          this.session.finish();
          this.resultAt = now;
          this.setData({ phase: "result", canvasLabel: "回收完成，轻触屏幕再来一次" });
        }
      }
    }

    this.drawScene(now);
    const animate = this.job || this.dropEffect || this.session.phase === "processing" || now - this.resultAt < 4000;
    if (animate) this.queueFrame();
  },

  drawScene(now = Date.now()) {
    if (!this.sceneContext || !this.session || !this.pixelScale) return;
    this.sceneContext.setTransform(1, 0, 0, 1, 0, 0);
    this.sceneContext.clearRect(0, 0, this.sceneCanvas.width, this.sceneCanvas.height);
    this.sceneContext.fillStyle = "#fff";
    this.sceneContext.fillRect(0, 0, this.sceneCanvas.width, this.sceneCanvas.height);
    this.sceneContext.setTransform(this.pixelScale, 0, 0, this.pixelScale, this.pixelOffsetX, this.pixelOffsetY);
    Scene.drawScene(this.sceneContext, this.session, {
      interactive: true,
      now,
      animation: this.job || {},
      body: this.body,
      displayHealth: this.visualHealth,
      drag: this.drag,
      dropEffect: this.dropEffect,
      hitAt: this.hitAt,
      collisionAt: this.collisionAt,
      collisionTier: this.collisionTier || 0,
      collisionPoint: this.collisionPoint,
      processingAge: this.processingStarted ? now - this.processingStarted : 0,
      recycleDays: this.progress.totalDays,
      reducedMotion: false
    });
  },

  resetSession() {
    this.stopSensor();
    this.cancelFrame();
    if (this.session) this.session.dispose();
    this.session = new Core.RecycleSession();
    this.body = Physics.create();
    this.visualHealth = Core.MAX_HEALTH;
    this.sensor = { x: 0, y: 0, active: false };
    this.gravity = { x: 0, y: -1, z: 0 };
    this.gravityReady = false;
    this.job = null;
    this.drag = null;
    this.dropEffect = null;
    this.lastFrameAt = 0;
    this.hitAt = -10000;
    this.collisionAt = -10000;
    this.collisionTier = 0;
    this.processingStarted = 0;
    this.resultAt = 0;
    this.setData({
      phase: "write",
      note: "",
      canContinue: false,
      showNote: true,
      canvasLabel: "写下烦恼，然后把物品拖进箱子"
    });
    this.drawScene();
    this.queueFrame();
  },

  closePrivacy() {
    if (this.audio) this.audio.play("ui");
    this.setData({ showPrivacy: false });
  },
  preventDefault() {},

  onShareAppMessage() {
    reportEvent("wr_share", { recycle_days: this.progress.totalDays });
    const result = this.session && this.session.result;
    return {
      title: result ? Core.resultCopy(result, this.progress.totalDays).line : "把今天的班味装箱扔掉。",
      path: "/pages/index/index"
    };
  },

  onShareTimeline() {
    reportEvent("wr_share", { recycle_days: this.progress.totalDays });
    const result = this.session && this.session.result;
    return {
      title: result ? Core.resultCopy(result, this.progress.totalDays).line : "把今天的班味装箱扔掉。",
      query: ""
    };
  }
});
