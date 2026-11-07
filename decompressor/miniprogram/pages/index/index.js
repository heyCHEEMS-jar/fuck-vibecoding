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
  const allowed = ["tag", "method", "props", "hits", "slams", "recycle_days", "added_day", "source", "variant"];
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
    tags: Core.TAGS,
    selectedTag: "work",
    canContinue: false,
    showNote: true,
    showPrivacy: false,
    showResult: false,
    resultTitle: "",
    resultLine: "",
    resultStatus: "",
    resultSummary: "",
    resultTier: 0,
    showRewardAd: false,
    rewardBusy: false,
    canvasLabel: "把今天的破事写下来，打包处理"
  },

  onLoad(options = {}) {
    this.audio = Audio.createPlayer(createMiniAudio, "/assets/audio/");
    this.session = new Core.RecycleSession();
    this.resultVariant = 0;
    this.rewardedVideoAd = null;
    this.rewardedVideoCloseHandler = null;
    this.rewardedVideoErrorHandler = null;
    this.body = Physics.create();
    this.visualHealth = Core.MAX_HEALTH;
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
    const source = options.source === "share" ? "share" : "direct";
    this.openSource = source;
    reportEvent("wr_open", { source });
    if (source === "share") reportEvent("wr_share_open", { source });
    this.setupRewardedVideoAd();
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
      const ratio = Math.min(info.pixelRatio || 1, 2);
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
    this.queueFrame();
  },

  onHide() {
    this.pageHidden = true;
    this.cancelFrame();
  },

  onUnload() {
    this.cancelFrame();
    this.destroyRewardedVideoAd();
    if (this.audio) this.audio.destroy();
    if (this.session) this.session.dispose();
  },

  setupRewardedVideoAd() {
    const app = getApp();
    const adUnitId = app && app.globalData && app.globalData.rewardedVideoAdUnitId;
    if (!adUnitId || !wx.createRewardedVideoAd) return;
    try {
      const ad = wx.createRewardedVideoAd({ adUnitId });
      this.rewardedVideoAd = ad;
      this.rewardedVideoCloseHandler = result => {
        this.setData({ rewardBusy: false });
        if (!result || result.isEnded) {
          this.resultVariant += 1;
          this.updateResultCard();
          reportEvent("wr_ad_reward", { variant: this.resultVariant, recycle_days: this.progress.totalDays });
        }
      };
      this.rewardedVideoErrorHandler = error => {
        this.setData({ rewardBusy: false, showRewardAd: false });
        reportEvent("wr_ad_error", { source: error && error.errCode ? String(error.errCode) : "unknown" });
      };
      ad.onClose(this.rewardedVideoCloseHandler);
      ad.onError(this.rewardedVideoErrorHandler);
      this.setData({ showRewardAd: true });
    } catch (_) {}
  },

  destroyRewardedVideoAd() {
    const ad = this.rewardedVideoAd;
    if (!ad) return;
    try {
      if (ad.offClose && this.rewardedVideoCloseHandler) ad.offClose(this.rewardedVideoCloseHandler);
      if (ad.offError && this.rewardedVideoErrorHandler) ad.offError(this.rewardedVideoErrorHandler);
      if (ad.destroy) ad.destroy();
    } catch (_) {}
    this.rewardedVideoAd = null;
  },

  watchRewardAd() {
    const ad = this.rewardedVideoAd;
    if (!ad || this.data.rewardBusy) return;
    this.setData({ rewardBusy: true });
    reportEvent("wr_ad_request", { recycle_days: this.progress.totalDays });
    ad.show().catch(() => ad.load().then(() => ad.show())).catch(() => {
      this.setData({ rewardBusy: false });
      wx.showToast({ title: "视频暂时不可用", icon: "none" });
    });
  },

  onNoteInput(event) {
    try {
      const note = this.session.setNote(event.detail.value);
      this.setData({ note, canContinue: Boolean(note.trim()) });
    } catch (_) {}
  },

  selectTag(event) {
    const id = event.currentTarget && event.currentTarget.dataset && event.currentTarget.dataset.id;
    try {
      this.session.setTag(id);
      this.setData({ selectedTag: id });
      if (this.audio) this.audio.play("ui");
    } catch (_) {}
  },

  finishNote() {
    if (this.session.phase !== "write" || !this.session.note.trim()) return;
    try {
      this.session.pack();
      if (this.audio) this.audio.play("paper");
      reportEvent("wr_pack", { tag: this.session.tag });
      this.setData({ phase: "pack", showNote: false, canvasLabel: "把沾着班味的东西扔进去，再拿胶带封死" });
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
    if (this.session.phase === "result") return;

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
      if (this.session.health <= 0 || !Physics.contains(this.body, point.x, point.y)) return;
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
    if (this.job || this.session.health <= 0) {
      this.drag = null;
      return;
    }
    const drag = this.drag;
    const point = this.point(event);
    if (!point) return;
    if (drag.kind === "privacy") {
      if (Math.hypot(point.x - drag.startX, point.y - drag.startY) > 14) drag.moved = true;
    } else if (drag.kind === "prop" || drag.kind === "tape") {
      drag.x = point.x;
      drag.y = point.y;
    } else if (drag.kind === "box") {
      const dt = Math.max(16, point.time - drag.lastTime) / 1000;
      const dx = point.x - drag.lastX;
      const dy = point.y - drag.lastY;
      if (Math.hypot(point.x - drag.x, point.y - drag.y) > 10) drag.moved = true;
      drag.vx = dx / dt;
      drag.vy = dy / dt;
      drag.lastX = point.x;
      drag.lastY = point.y;
      drag.lastTime = point.time;
      const impacts = Physics.moveHeld(this.body, point.x, point.y, drag.vx, drag.vy);
      const nextEdges = new Set(impacts.map(impact => impact.edge));
      impacts.forEach(impact => {
        if (!drag.heldEdges.has(impact.edge)) this.slamBox(impact, true);
      });
      drag.heldEdges = nextEdges;
    }
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
    this.queueFrame();
  },

  onCanvasCancel() {
    this.drag = null;
    this.queueFrame();
  },

  sealBox() {
    if (this.job || this.session.phase !== "pack") return;
    try {
      this.session.seal();
      if (this.audio) this.audio.play("seal");
      vibrate("medium");
      this.startJob("seal", 720);
      this.setData({ phase: "choose", canvasLabel: "封死了，这事儿别想跑" });
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
    this.drag = null;
    if (this.audio) this.audio.play("final");
    vibrate("heavy");
    this.startJob("punch-finish", 1150);
    this.setData({ canvasLabel: "最后一下，送这破事上路" });
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
      added_day: this.progress.added,
      source: this.openSource || "direct"
    });
    if (this.openSource === "share") reportEvent("wr_share_complete", { recycle_days: this.progress.totalDays });
  },

  updateResultCard() {
    const result = this.session && this.session.result;
    if (!result) return;
    const copy = Core.resultCopy(result, this.progress.totalDays, this.resultVariant);
    const next = Progress.nextUnlock(this.progress.totalDays);
    const status = this.progress.added
      ? `你已经连续放过自己 ${this.progress.totalDays} 天了`
      : `今天已经发过疯了 · 累计 ${this.progress.totalDays} 天`;
    this.setData({
      showResult: true,
      resultTitle: copy.title,
      resultLine: copy.line,
      resultStatus: status,
      resultSummary: next ? `再撑 ${next.days - this.progress.totalDays} 天，解锁${next.label}` : "工位幸存章已到手",
      resultTier: Progress.cardTier(this.progress.totalDays)
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
      Physics.step(this.body, null, elapsed).forEach(impact => this.slamBox(impact));
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
          reportEvent("wr_start", { method: "punch", props: this.session.props.length });
          this.setData({ phase: "processing", canvasLabel: "点它、拖它、扔它，让这破事飞起来" });
        } else if (kind === "punch-finish") {
          const result = this.session.recycle(now);
          this.recordCompletion(result);
          if (this.audio) this.audio.play("recycle");
          this.startJob("recycle", 1450);
          this.setData({ phase: "recycle", canvasLabel: "送走了，谁也别捡回来" });
        } else if (kind === "recycle") {
          this.session.finish();
          this.resultAt = now;
          this.updateResultCard();
          reportEvent("wr_result_view", { recycle_days: this.progress.totalDays });
          this.setData({ phase: "result", canvasLabel: "处理完了，发给同样命苦的人看看" });
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
    this.cancelFrame();
    if (this.session) this.session.dispose();
    this.session = new Core.RecycleSession();
    this.resultVariant = 0;
    this.body = Physics.create();
    this.visualHealth = Core.MAX_HEALTH;
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
      selectedTag: "work",
      canContinue: false,
      showNote: true,
      showResult: false,
      rewardBusy: false,
      resultTitle: "",
      resultLine: "",
      resultStatus: "",
      resultSummary: "",
      resultTier: 0,
      canvasLabel: "把今天的破事写下来，打包处理"
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
    reportEvent("wr_share", { recycle_days: this.progress.totalDays, source: this.data.showResult ? "result" : "menu" });
    const result = this.session && this.session.result;
    return {
      title: result ? Core.resultCopy(result, this.progress.totalDays, this.resultVariant).line : "把今天这破事装箱扔了。",
      path: "/pages/index/index?source=share"
    };
  },

  onShareTimeline() {
    reportEvent("wr_share", { recycle_days: this.progress.totalDays, source: this.data.showResult ? "result" : "menu" });
    const result = this.session && this.session.result;
    return {
      title: result ? Core.resultCopy(result, this.progress.totalDays, this.resultVariant).line : "把今天这破事装箱扔了。",
      query: "source=share"
    };
  }
});
