(() => {
  "use strict";

  const Core = window.WorryCore;
  const Scene = window.WorryScene;
  const Physics = window.WorryPhysics;
  const Progress = window.WorryProgress;
  const AudioFx = window.WorryAudio;
  const canvas = document.querySelector("#scene");
  const ctx = canvas.getContext("2d");
  const note = document.querySelector("#worry-note");
  const notePaper = document.querySelector("#note-paper");
  const noteNext = document.querySelector("#note-next");
  const status = document.querySelector("#status");
  const privacyDialog = document.querySelector("#privacy-dialog");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const PROP_LAYOUT = Scene.PROP_LAYOUT;

  function createBrowserAudio(path, volume) {
    const element = new window.Audio(path);
    element.preload = "auto";
    element.volume = volume;
    return {
      play() {
        try {
          element.pause();
          element.currentTime = 0;
          const started = element.play();
          if (started && started.catch) started.catch(() => {});
        } catch (_) {}
      },
      destroy() { try { element.pause(); element.removeAttribute("src"); } catch (_) {} }
    };
  }

  const audio = AudioFx.createPlayer(createBrowserAudio, "assets/audio/");

  let session = new Core.RecycleSession();
  let body = Physics.create();
  let visualHealth = Core.MAX_HEALTH;
  let sensor = { x: 0, y: 0, active: false };
  let gravity = { x: 0, y: -1, z: 0 };
  let gravityReady = false;
  let progress = loadProgress();
  let job = null;
  let drag = null;
  let dropEffect = null;
  let frameId = null;
  let lastFrameAt = 0;
  let hitAt = -10000;
  let collisionAt = -10000;
  let collisionTier = 0;
  let collisionPoint = null;
  let processingStarted = 0;
  let resultAt = 0;
  let motionListening = false;
  let viewScale = 1;
  let viewOffsetX = 0;
  let viewOffsetY = 0;
  let pixelScale = 1;
  let pixelOffsetX = 0;
  let pixelOffsetY = 0;

  function loadProgress() {
    try { return Progress.normalize(localStorage.getItem(Progress.STORAGE_KEY)); }
    catch (_) { return Progress.normalize(null); }
  }

  function saveProgress() {
    try { localStorage.setItem(Progress.STORAGE_KEY, JSON.stringify(Progress.storedValue(progress))); }
    catch (_) {}
  }

  function vibrate(level) {
    try {
      if (!navigator.vibrate) return;
      if (level === "heavy") navigator.vibrate([45, 22, 75]);
      else if (level === "medium") navigator.vibrate(32);
      else navigator.vibrate(16);
    } catch (_) {}
  }

  function setStatus(value) {
    status.textContent = value;
    canvas.setAttribute("aria-label", value);
  }

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.max(1, Math.round(bounds.width * ratio));
    canvas.height = Math.max(1, Math.round(bounds.height * ratio));
    viewScale = Math.min(bounds.width / Scene.WIDTH, bounds.height / Scene.INTERACTIVE_HEIGHT);
    viewOffsetX = (bounds.width - Scene.WIDTH * viewScale) / 2;
    viewOffsetY = (bounds.height - Scene.INTERACTIVE_HEIGHT * viewScale) / 2;
    pixelScale = viewScale * ratio;
    pixelOffsetX = viewOffsetX * ratio;
    pixelOffsetY = viewOffsetY * ratio;
    draw();
  }

  function point(event) {
    const bounds = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left - viewOffsetX) / viewScale,
      y: (event.clientY - bounds.top - viewOffsetY) / viewScale,
      time: performance.now()
    };
  }

  function finishNote() {
    if (session.phase !== "write" || !session.note.trim()) return;
    try {
      session.pack();
      audio.play("paper");
      note.value = "";
      notePaper.hidden = true;
      setStatus("拖动物品进箱子，再把胶带拖到箱子上");
      draw();
      schedule();
    } catch (_) {}
  }

  note.addEventListener("input", event => {
    if (event.isComposing || session.phase !== "write") return;
    const value = session.setNote(event.target.value);
    if (event.target.value !== value) event.target.value = value;
    noteNext.disabled = !value.trim();
  });
  note.addEventListener("compositionend", event => {
    if (session.phase !== "write") return;
    const value = session.setNote(event.target.value);
    event.target.value = value;
    noteNext.disabled = !value.trim();
  });
  noteNext.addEventListener("click", finishNote);

  function sealBox() {
    if (job || session.phase !== "pack") return;
    try {
      session.seal();
      audio.play("seal");
      vibrate("medium");
      requestMotion();
      beginJob("seal", 720);
      setStatus("纸箱正在封装");
    } catch (_) {}
  }

  function hitBox() {
    if (job || session.phase !== "processing" || !session.hit(Date.now())) return;
    hitAt = performance.now();
    const feedback = Core.punchFeedback(session.hits);
    audio.play("tap");
    vibrate(feedback.intensity);
    if (session.health <= 0) finishDestruction();
    draw();
    schedule();
  }

  function slamBox(impact, held = Boolean(impact && impact.held)) {
    if (job || session.phase !== "processing") return;
    const feedback = session.slam(impact.speed, Date.now(), held);
    if (!feedback) return;
    collisionAt = performance.now();
    collisionTier = feedback.tier;
    collisionPoint = {
      x: impact.edge === "left" ? 25 : impact.edge === "right" ? 775 : body.x,
      y: impact.edge === "top" ? 150 : impact.edge === "bottom" ? 1510 : body.y
    };
    audio.play(feedback.intensity);
    vibrate(feedback.intensity);
    if (session.health <= 0) finishDestruction();
  }

  function finishDestruction() {
    if (job) return;
    audio.play("final");
    vibrate("heavy");
    beginJob("punch-finish", 1150);
    setStatus("最后一击，正在自动回收");
  }

  function onPointerDown(event) {
    const current = point(event);
    if (current.x > 700 && current.y < 120) {
      drag = { kind: "privacy", startX: current.x, startY: current.y, moved: false };
      canvas.setPointerCapture(event.pointerId);
      return;
    }
    if (job) return;
    if (session.phase === "result") {
      audio.play("ui");
      reset();
      return;
    }

    if (session.phase === "pack") {
      for (const item of PROP_LAYOUT) {
        if (!session.props.includes(item.id) && Math.hypot(current.x - item.x, current.y - item.y) < item.radius) {
          audio.play("ui");
          drag = { kind: "prop", id: item.id, x: current.x, y: current.y };
          canvas.setPointerCapture(event.pointerId);
          schedule();
          return;
        }
      }
      if (Math.hypot(current.x - 690, current.y - 1360) < 76) {
        audio.play("ui");
        drag = { kind: "tape", x: current.x, y: current.y };
        canvas.setPointerCapture(event.pointerId);
        schedule();
      }
      return;
    }

    if (session.phase === "processing" && Physics.contains(body, current.x, current.y)) {
      drag = {
        kind: "box",
        x: current.x,
        y: current.y,
        lastX: current.x,
        lastY: current.y,
        lastTime: current.time,
        vx: 0,
        vy: 0,
        moved: false,
        heldEdges: new Set()
      };
      canvas.setPointerCapture(event.pointerId);
    }
  }

  function onPointerMove(event) {
    if (!drag) return;
    const current = point(event);
    if (drag.kind === "privacy") {
      if (Math.hypot(current.x - drag.startX, current.y - drag.startY) > 14) drag.moved = true;
    } else if (drag.kind === "prop" || drag.kind === "tape") {
      drag.x = current.x;
      drag.y = current.y;
    } else {
      const dt = Math.max(16, current.time - drag.lastTime) / 1000;
      if (Math.hypot(current.x - drag.x, current.y - drag.y) > 10) drag.moved = true;
      drag.vx = (current.x - drag.lastX) / dt;
      drag.vy = (current.y - drag.lastY) / dt;
      drag.lastX = current.x;
      drag.lastY = current.y;
      drag.lastTime = current.time;
      const impacts = Physics.moveHeld(body, current.x, current.y, drag.vx, drag.vy);
      const nextEdges = new Set(impacts.map(impact => impact.edge));
      impacts.forEach(impact => {
        if (!drag.heldEdges.has(impact.edge)) slamBox(impact, true);
      });
      drag.heldEdges = nextEdges;
    }
    draw();
    schedule();
  }

  function onPointerUp(event) {
    if (!drag) return;
    const current = point(event);
    const released = drag;
    drag = null;

    if (released.kind === "privacy") {
      if (!released.moved) {
        audio.play("ui");
        privacyDialog.showModal();
      }
    } else if (released.kind === "prop") {
      const accepted = current.x > 205 && current.x < 595 && current.y > 560 && current.y < 1080;
      if (accepted) {
        try { session.setProp(released.id, true); } catch (_) {}
        audio.play("paper");
        vibrate("light");
      } else audio.play("ui");
      const item = PROP_LAYOUT.find(prop => prop.id === released.id);
      dropEffect = {
        id: released.id,
        x: current.x,
        y: current.y,
        accepted,
        target: { x: item.x, y: item.y },
        started: performance.now()
      };
    } else if (released.kind === "tape") {
      if (current.x > 210 && current.x < 600 && current.y > 560 && current.y < 1080) sealBox();
    } else if (released.kind === "box") {
      if (released.moved) {
        if (released.heldEdges && released.heldEdges.size) Physics.throwBody(body, 0, 0);
        else Physics.throwBody(body, released.vx, released.vy);
      } else hitBox();
    }
    draw();
    schedule();
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", () => { drag = null; });
  canvas.addEventListener("contextmenu", event => event.preventDefault());

  async function requestMotion() {
    if (motionListening || !window.DeviceMotionEvent) return;
    try {
      if (typeof DeviceMotionEvent.requestPermission === "function") {
        const permission = await DeviceMotionEvent.requestPermission();
        if (permission !== "granted") return;
      }
      window.addEventListener("devicemotion", onMotion, { passive: true });
      motionListening = true;
    } catch (_) {}
  }

  function onMotion(event) {
    if (session.phase !== "processing" || job) return;
    const source = event.accelerationIncludingGravity || event.acceleration;
    if (!source) return;
    const raw = {
      x: Number.isFinite(source.x) ? source.x / 9.81 : 0,
      y: Number.isFinite(source.y) ? source.y / 9.81 : 0,
      z: Number.isFinite(source.z) ? source.z / 9.81 : 0
    };
    if (!gravityReady) {
      gravity = raw;
      gravityReady = true;
      sensor.x = raw.x;
      sensor.y = raw.y;
      sensor.active = true;
      return;
    }
    const smoothing = 0.18;
    gravity.x += (raw.x - gravity.x) * smoothing;
    gravity.y += (raw.y - gravity.y) * smoothing;
    gravity.z += (raw.z - gravity.z) * smoothing;
    const shakeX = raw.x - gravity.x;
    const shakeY = raw.y - gravity.y;
    sensor.x = gravity.x - shakeX;
    sensor.y = gravity.y - shakeY;
    sensor.active = true;
  }

  function beginJob(kind, duration) {
    job = {
      kind,
      duration: reducedMotion.matches ? Math.min(duration, 220) : duration,
      started: performance.now(),
      progress: 0
    };
    schedule();
  }

  function schedule() {
    if (frameId !== null || document.hidden) return;
    frameId = requestAnimationFrame(frame);
  }

  function frame(now) {
    frameId = null;
    const elapsed = lastFrameAt ? (now - lastFrameAt) / 1000 : 0;
    lastFrameAt = now;
    const healthBlend = 1 - Math.exp(-3.5 * Math.max(0, elapsed));
    visualHealth += (session.health - visualHealth) * healthBlend;
    if (Math.abs(session.health - visualHealth) < 0.4) visualHealth = session.health;

    if (session.phase === "processing" && !job && !(drag && drag.kind === "box")) {
      Physics.step(body, sensor, elapsed).forEach(impact => slamBox(impact));
    }
    if (dropEffect && now - dropEffect.started > 430) dropEffect = null;

    if (job) {
      job.progress = Math.min(1, Math.max(0, (now - job.started) / job.duration));
      if (job.kind === "recycle" && job.progress >= 0.92 && !job.doorPlayed) {
        job.doorPlayed = true;
        audio.play("door");
        vibrate("heavy");
      }
      if (job.progress >= 1) {
        const kind = job.kind;
        job = null;
        if (kind === "seal") {
          session.choose("punch");
          session.start();
          body = Physics.create();
          visualHealth = Core.MAX_HEALTH;
          processingStarted = now;
          setStatus("点击、拖拽或摇晃纸箱进行破坏");
        } else if (kind === "punch-finish") {
          const result = session.recycle(Date.now());
          progress = Progress.complete(progress, result.completedAt);
          saveProgress();
          audio.play("recycle");
          beginJob("recycle", 1450);
          setStatus("正在回收");
        } else if (kind === "recycle") {
          session.finish();
          resultAt = now;
          setStatus("回收完成，轻触屏幕再来一次");
        }
      }
    }

    draw(now);
    if (job || dropEffect || session.phase === "processing" || now - resultAt < 4000) schedule();
  }

  function draw(now = performance.now()) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(pixelScale, 0, 0, pixelScale, pixelOffsetX, pixelOffsetY);
    Scene.drawScene(ctx, session, {
      interactive: true,
      now,
      animation: job || {},
      body,
      displayHealth: visualHealth,
      drag,
      dropEffect,
      hitAt,
      collisionAt,
      collisionTier,
      collisionPoint,
      processingAge: processingStarted ? now - processingStarted : 0,
      recycleDays: progress.totalDays,
      reducedMotion: reducedMotion.matches
    });
  }

  function reset() {
    if (session) session.dispose();
    session = new Core.RecycleSession();
    body = Physics.create();
    visualHealth = Core.MAX_HEALTH;
    sensor = { x: 0, y: 0, active: false };
    gravity = { x: 0, y: -1, z: 0 };
    gravityReady = false;
    job = null;
    drag = null;
    dropEffect = null;
    lastFrameAt = 0;
    hitAt = -10000;
    collisionAt = -10000;
    collisionTier = 0;
    collisionPoint = null;
    processingStarted = 0;
    resultAt = 0;
    note.value = "";
    noteNext.disabled = true;
    notePaper.hidden = false;
    setStatus("写下烦恼，然后拖动物品进箱子");
    draw();
    schedule();
    setTimeout(() => note.focus({ preventScroll: true }), 0);
  }

  document.querySelector("#privacy-close").addEventListener("click", () => { audio.play("ui"); privacyDialog.close(); });
  privacyDialog.addEventListener("click", event => {
    if (event.target === privacyDialog) { audio.play("ui"); privacyDialog.close(); }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = null;
    } else {
      lastFrameAt = 0;
      sensor = { x: 0, y: 0, active: false };
    gravity = { x: 0, y: -1, z: 0 };
    gravityReady = false;
      schedule();
    }
  });
  window.addEventListener("resize", resize);
  window.addEventListener("pagehide", () => {
    session.note = "";
    note.value = "";
    audio.destroy();
    if (frameId !== null) cancelAnimationFrame(frameId);
  });

  setStatus("写下烦恼，然后拖动物品进箱子");
  resize();
  schedule();
})();
