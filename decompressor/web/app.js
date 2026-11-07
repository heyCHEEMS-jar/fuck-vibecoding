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
  const tagList = document.querySelector("#tag-list");
  const status = document.querySelector("#status");
  const resultCard = document.querySelector("#result-card");
  const resultTitle = document.querySelector("#result-title");
  const resultLine = document.querySelector("#result-line");
  const resultStatus = document.querySelector("#result-status");
  const resultSummary = document.querySelector("#result-summary");
  const resultShare = document.querySelector("#result-share");
  const resultAgain = document.querySelector("#result-again");
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

  function renderTags() {
    tagList.replaceChildren(...Core.TAGS.map(tag => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `tag-item${session.tag === tag.id ? " active" : ""}`;
      button.textContent = tag.label;
      button.addEventListener("click", () => {
        session.setTag(tag.id);
        audio.play("ui");
        renderTags();
      });
      return button;
    }));
  }

  let session = new Core.RecycleSession();
  let body = Physics.create();
  let visualHealth = Core.MAX_HEALTH;
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
  let viewScale = 1;
  let viewOffsetX = 0;
  let viewOffsetY = 0;
  let pixelScale = 1;
  let pixelOffsetX = 0;
  let pixelOffsetY = 0;

  renderTags();

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
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
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
      setStatus("把沾着班味的东西扔进去，再拿胶带封死");
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

  function showResult() {
    const result = session.result;
    if (!result) return;
    const copy = Core.resultCopy(result, progress.totalDays);
    const next = Progress.nextUnlock(progress.totalDays);
    resultCard.className = `result-card tier-${Progress.cardTier(progress.totalDays)}`;
    resultTitle.textContent = copy.title;
    resultLine.textContent = copy.line;
    resultStatus.textContent = progress.added
      ? `你已经连续放过自己 ${progress.totalDays} 天了`
      : `今天已经发过疯了 · 累计 ${progress.totalDays} 天`;
    resultSummary.textContent = next ? `再撑 ${next.days - progress.totalDays} 天，解锁${next.label}` : "工位幸存章已到手";
    resultCard.hidden = false;
  }

  async function shareResult() {
    const result = session.result;
    if (!result) return;
    const text = Core.resultCopy(result, progress.totalDays).line;
    try {
      if (navigator.share) await navigator.share({ title: "烦恼回收站", text, url: location.href });
      else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${text} ${location.href}`);
        setStatus("结果和入口已复制");
      }
    } catch (_) {}
  }

  resultShare.addEventListener("click", shareResult);
  resultAgain.addEventListener("click", reset);

  function sealBox() {
    if (job || session.phase !== "pack") return;
    try {
      session.seal();
      audio.play("seal");
      vibrate("medium");
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
    drag = null;
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
    if (session.phase === "result") return;

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

    if (session.phase === "processing" && session.health > 0 && Physics.contains(body, current.x, current.y)) {
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
    if (job || session.health <= 0) {
      drag = null;
      return;
    }
    const currentDrag = drag;
    const current = point(event);
    if (currentDrag.kind === "privacy") {
      if (Math.hypot(current.x - currentDrag.startX, current.y - currentDrag.startY) > 14) currentDrag.moved = true;
    } else if (currentDrag.kind === "prop" || currentDrag.kind === "tape") {
      currentDrag.x = current.x;
      currentDrag.y = current.y;
    } else {
      const dt = Math.max(16, current.time - currentDrag.lastTime) / 1000;
      if (Math.hypot(current.x - currentDrag.x, current.y - currentDrag.y) > 10) currentDrag.moved = true;
      currentDrag.vx = (current.x - currentDrag.lastX) / dt;
      currentDrag.vy = (current.y - currentDrag.lastY) / dt;
      currentDrag.lastX = current.x;
      currentDrag.lastY = current.y;
      currentDrag.lastTime = current.time;
      const impacts = Physics.moveHeld(body, current.x, current.y, currentDrag.vx, currentDrag.vy);
      const nextEdges = new Set(impacts.map(impact => impact.edge));
      impacts.forEach(impact => {
        if (!currentDrag.heldEdges.has(impact.edge)) slamBox(impact, true);
      });
      currentDrag.heldEdges = nextEdges;
    }
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
    schedule();
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", () => { drag = null; schedule(); });
  canvas.addEventListener("contextmenu", event => event.preventDefault());

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
      Physics.step(body, null, elapsed).forEach(impact => slamBox(impact));
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
          setStatus("点它、拖它、扔它，让这破事飞起来");
        } else if (kind === "punch-finish") {
          const result = session.recycle(Date.now());
          progress = Progress.complete(progress, result.completedAt);
          saveProgress();
          audio.play("recycle");
          beginJob("recycle", 1450);
          setStatus("送走了，谁也别捡回来");
        } else if (kind === "recycle") {
          session.finish();
          resultAt = now;
          showResult();
          setStatus("处理完了，发给同样命苦的人看看");
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
    renderTags();
    body = Physics.create();
    visualHealth = Core.MAX_HEALTH;
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
    resultCard.hidden = true;
    resultCard.className = "result-card";
    note.value = "";
    noteNext.disabled = true;
    notePaper.hidden = false;
    setStatus("把今天的破事写下来，打包处理");
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

  setStatus("把今天的破事写下来，打包处理");
  resize();
  schedule();
})();
