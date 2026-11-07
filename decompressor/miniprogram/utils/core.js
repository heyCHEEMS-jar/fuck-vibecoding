(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.WorryCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const MAX_HEALTH = 1000;
  const TAP_DAMAGE = 50;
  const SLAM_DAMAGE = 10;
  const HIT_TARGET = MAX_HEALTH / TAP_DAMAGE;
  const HIT_INTERVAL = 60;
  const SLAM_INTERVAL = 450;
  const HELD_SLAM_INTERVAL = 120;
  const SLAM_TIERS = Object.freeze([
    Object.freeze({ tier: 3, minSpeed: 1400, damage: 50, heldDamage: 30, intensity: "heavy" }),
    Object.freeze({ tier: 2, minSpeed: 800, damage: 25, heldDamage: 15, intensity: "medium" }),
    Object.freeze({ tier: 1, minSpeed: 430, damage: SLAM_DAMAGE, heldDamage: 5, intensity: "light" })
  ]);
  const TAGS = Object.freeze([
    { id: "work", label: "这破班", short: "工作" },
    { id: "relations", label: "人情世故", short: "人际" },
    { id: "life", label: "生活暴击", short: "生活" },
    { id: "sleep", label: "睡个好觉真难", short: "睡眠" },
    { id: "other", label: "其他破事", short: "其他" }
  ]);
  const PROPS = Object.freeze([
    { id: "keyboard", label: "键盘" },
    { id: "mouse", label: "鼠标" },
    { id: "badge", label: "工牌" },
    { id: "suit", label: "西装人偶" },
    { id: "monitor", label: "显示器" },
    { id: "tower", label: "主机" },
    { id: "cup", label: "杯子" }
  ]);
  const METHODS = Object.freeze([
    { id: "press", label: "液压压扁", description: "自动压扁" },
    { id: "punch", label: "手动摔打", description: "点击、拖拽或抛摔" }
  ]);

  function cleanNote(value) {
    if (typeof value !== "string") return "";
    const text = value.replace(/[\r\n\t]+/g, " ")
      .replace(/[\u0000-\u001f\u007f​-‏‪-‮⁦-⁩]/g, "");
    return text;
  }

  function makeSessionId(now) {
    return "wr-" + now.toString(36) + "-" + Math.random().toString(36).slice(2, 12);
  }

  function punchFeedback(hits) {
    const count = Number.isFinite(hits) ? Math.max(0, Math.min(HIT_TARGET, Math.floor(hits))) : 0;
    return Object.freeze({
      stage: count >= 15 ? 3 : count >= 8 ? 2 : count > 0 ? 1 : 0,
      intensity: count >= HIT_TARGET ? "heavy" : count === 7 || count === 14 ? "medium" : "light",
      final: count >= HIT_TARGET
    });
  }

  function slamFeedback(speed, held = false) {
    if (!Number.isFinite(speed)) return null;
    const tier = SLAM_TIERS.find(item => speed >= item.minSpeed);
    if (!tier) return null;
    return Object.freeze({
      tier: tier.tier,
      minSpeed: tier.minSpeed,
      damage: held ? tier.heldDamage : tier.damage,
      intensity: tier.intensity,
      held: Boolean(held)
    });
  }

  function pressProgress(value) {
    const progress = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
    if (progress < 0.16) {
      const t = progress / 0.16;
      return t * t * 0.06;
    }
    if (progress < 0.7) {
      const t = (progress - 0.16) / 0.54;
      const smooth = t * t * (3 - 2 * t);
      return 0.06 + smooth * 0.62;
    }
    if (progress < 0.82) return 0.68;
    const t = (progress - 0.82) / 0.18;
    return 0.68 + (1 - Math.pow(1 - t, 3)) * 0.32;
  }

  class RecycleSession {
    constructor(now = Date.now()) {
      this.phase = "write";
      this.note = "";
      this.tag = "work";
      this.props = [];
      this.method = null;
      this.health = MAX_HEALTH;
      this.hits = 0;
      this.slams = 0;
      this.progress = 0;
      this.lastHitAt = -Infinity;
      this.lastSlamAt = -Infinity;
      this.lastHeldSlamAt = -Infinity;
      this.sessionId = makeSessionId(now);
      this.result = null;
    }

    requirePhase(...phases) {
      if (!phases.includes(this.phase)) throw new Error("当前步骤不能执行这个操作。");
    }

    setNote(value) {
      this.requirePhase("write");
      this.note = cleanNote(value);
      return this.note;
    }

    setTag(id) {
      this.requirePhase("write");
      if (!TAGS.some(tag => tag.id === id)) throw new Error("请选择一个已有的烦恼标签。");
      this.tag = id;
    }

    pack() {
      this.requirePhase("write");
      this.note = this.note.trim();
      if (!this.note) throw new Error("先写一句烦恼，再把它装进纸箱。");
      this.phase = "pack";
    }

    setProp(id, selected = true) {
      this.requirePhase("pack");
      if (!PROPS.some(prop => prop.id === id)) throw new Error("这个道具还没有上架。");
      if (selected && !this.props.includes(id)) this.props.push(id);
      if (!selected) this.props = this.props.filter(prop => prop !== id);
    }

    toggleProp(id) {
      this.setProp(id, !this.props.includes(id));
    }

    seal() {
      this.requirePhase("pack");
      this.phase = "choose";
    }

    choose(id) {
      this.requirePhase("choose");
      if (!METHODS.some(method => method.id === id)) throw new Error("请选择液压机或沙袋。");
      this.method = id;
    }

    start() {
      this.requirePhase("choose");
      if (!this.method) throw new Error("先选一种处理方式。");
      this.phase = "processing";
      // Destruction is irreversible: never keep the private text in a result or a log.
      this.note = "";
    }

    hit(now = Date.now()) {
      this.requirePhase("processing");
      if (this.method !== "punch" || !Number.isFinite(now)) return false;
      if (this.health <= 0 || now - this.lastHitAt < HIT_INTERVAL) return false;
      this.lastHitAt = now;
      this.hits += 1;
      this.health = Math.max(0, this.health - TAP_DAMAGE);
      this.progress = 1 - this.health / MAX_HEALTH;
      return true;
    }

    slam(speed, now = Date.now(), held = false) {
      this.requirePhase("processing");
      const feedback = slamFeedback(speed, held);
      if (this.method !== "punch" || !feedback || !Number.isFinite(now)) return false;
      const previous = held ? this.lastHeldSlamAt : this.lastSlamAt;
      const interval = held ? HELD_SLAM_INTERVAL : SLAM_INTERVAL;
      if (this.health <= 0 || now - previous < interval) return false;
      if (held) this.lastHeldSlamAt = now;
      else this.lastSlamAt = now;
      this.slams += 1;
      this.health = Math.max(0, this.health - feedback.damage);
      this.progress = 1 - this.health / MAX_HEALTH;
      return feedback;
    }

    compress(progress) {
      this.requirePhase("processing");
      if (this.method !== "press" || !Number.isFinite(progress)) return;
      this.progress = Math.max(this.progress, Math.min(1, Math.max(0, progress)));
      this.health = Math.round(MAX_HEALTH * (1 - this.progress));
    }

    recycle(now = Date.now()) {
      this.requirePhase("processing");
      if (this.progress < 1) throw new Error("这箱烦恼还没有处理完。");
      this.note = "";
      this.phase = "recycle";
      this.result = Object.freeze({
        sessionId: this.sessionId,
        tag: this.tag,
        method: this.method,
        props: Object.freeze(this.props.slice()),
        hits: this.hits,
        slams: this.slams,
        completedAt: now
      });
      return this.result;
    }

    finish() {
      this.requirePhase("recycle");
      this.phase = "result";
      return this.result;
    }

    back() {
      this.requirePhase("pack", "choose");
      this.phase = this.phase === "choose" ? "pack" : "write";
      if (this.phase === "pack") this.method = null;
    }

    dispose() {
      this.note = "";
      this.props = [];
      this.result = null;
      this.phase = "disposed";
    }
  }

  const RESULT_COPY = Object.freeze({
    press: Object.freeze([
      { line: "这破事，已经扁得没脾气了。", card: ["这破事，", "没脾气了。"] },
      { line: "班味已压成薄薄一片。", card: ["班味已压成，", "薄薄一片。"] },
      { line: "别改了，再改就成二维码了。", card: ["再改下去，", "就是二维码。"] },
      { line: "今日内耗，已打包成废纸。", card: ["今日内耗，", "一张废纸。"] },
      { line: "压力没说话，主要是说不了。", card: ["压力闭嘴了，", "物理意义上。"] },
      { line: "需求还能改，箱子真不行了。", card: ["需求随便改，", "箱子不奉陪。"] },
      { line: "本次破事已压缩到不占脑子。", card: ["破事已压缩，", "不占脑子。"] },
      { line: "今天的班味，薄得能透光。", card: ["今天的班味，", "薄得透光。"] }
    ]),
    punch: Object.freeze([
      { line: "这破事挨的打，比你画的饼实在。", card: ["饼是虚的，", "这顿打是真的。"] },
      { line: "这口气不隔夜，现场结清。", card: ["这口气，", "现场结清。"] },
      { line: "事情没解决，但箱子替你扛了。", card: ["事情没解决，", "箱子扛下了。"] },
      { line: "内耗今日停业，明天看心情。", card: ["内耗停业，", "明天再说。"] },
      { line: "不是脾气大，是它确实欠摔。", card: ["不是脾气大，", "是它欠摔。"] },
      { line: "今日怒气已走物理流程。", card: ["今日怒气，", "走物理流程。"] },
      { line: "你的沉默震耳欲聋，箱子知道了。", card: ["你的沉默，", "箱子听见了。"] },
      { line: "到此为止，谁返工谁自己来。", card: ["到此为止，", "拒绝返工。"] }
    ])
  });

  function stableIndex(value, length) {
    let hash = 0;
    for (const character of String(value || "")) hash = (hash * 31 + character.codePointAt(0)) >>> 0;
    return length ? hash % length : 0;
  }

  function resultCopy(result, totalDays = 0, variant = 0) {
    const method = result && result.method === "press" ? "press" : "punch";
    const pool = RESULT_COPY[method];
    const days = Number.isFinite(totalDays) ? Math.max(0, Math.floor(totalDays)) : 0;
    const unlocked = days >= 7 ? 8 : days >= 4 ? 6 : days >= 2 ? 4 : 2;
    const choices = pool.slice(0, unlocked);
    const offset = Number.isFinite(variant) ? Math.max(0, Math.floor(variant)) : 0;
    const copy = choices[(stableIndex(`${result && result.sessionId}:${result && result.tag}`, choices.length) + offset) % choices.length];
    return {
      title: method === "press" ? "这事儿，扁了" : "这口气，出了",
      line: copy.line,
      card: copy.card
    };
  }

  return {
    MAX_HEALTH, TAP_DAMAGE, SLAM_DAMAGE, SLAM_TIERS, HIT_TARGET, HIT_INTERVAL, SLAM_INTERVAL, HELD_SLAM_INTERVAL,
    TAGS, PROPS, METHODS, cleanNote, punchFeedback, slamFeedback, pressProgress, RecycleSession, resultCopy
  };
});
