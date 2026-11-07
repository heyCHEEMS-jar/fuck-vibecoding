(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.WorryScene = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const WIDTH = 800;
  const HEIGHT = 600;
  const INTERACTIVE_HEIGHT = 1600;
  // The illustration deliberately keeps its cardboard / workshop palette in both UI themes.
  const C = Object.freeze({
    ink: "#263f4a", paper: "#fffcf1", box: "#d99a55", boxSide: "#b87738",
    boxTop: "#edbb7c", inside: "#80502d", tape: "#f3dba3", blue: "#305db7",
    blueLight: "#8fadd8", floor: "#dce6e6", steel: "#77939b", green: "#397469",
    yellow: "#efc45b", light: "#f1f5f2", shadow: "rgba(38,63,74,0.12)"
  });

  const PROP_LAYOUT = Object.freeze([
    Object.freeze({ id: "keyboard", x: 120, y: 245, scale: 0.82, radius: 76 }),
    Object.freeze({ id: "mouse", x: 315, y: 245, scale: 1.0, radius: 72 }),
    Object.freeze({ id: "badge", x: 505, y: 245, scale: 0.95, radius: 72 }),
    Object.freeze({ id: "monitor", x: 125, y: 440, scale: 0.82, radius: 82 }),
    Object.freeze({ id: "tower", x: 345, y: 440, scale: 0.9, radius: 78 }),
    Object.freeze({ id: "cup", x: 545, y: 440, scale: 1.02, radius: 72 }),
    Object.freeze({ id: "suit", x: 690, y: 365, scale: 1.95, radius: 128 })
  ]);

  function roundRect(ctx, x, y, w, h, r, fill, stroke) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.stroke(); }
  }

  function poly(ctx, points, fill, stroke = C.ink) {
    ctx.beginPath();
    points.forEach((point, index) => index ? ctx.lineTo(...point) : ctx.moveTo(...point));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.lineJoin = "round"; ctx.stroke(); }
  }

  function line(ctx, points, color = C.ink, width = 3) {
    ctx.beginPath();
    points.forEach((point, index) => index ? ctx.lineTo(...point) : ctx.moveTo(...point));
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  }

  function label(ctx, value, x, y, size = 16, color = C.ink, weight = "500") {
    ctx.fillStyle = color;
    ctx.font = weight + " " + size + 'px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(value, x, y);
  }

  function circle(ctx, x, y, radius, fill, stroke) {
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.stroke(); }
  }

  function drawProp(ctx, id, x = 0, y = 0, scale = 1, angle = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(scale, scale);
    ctx.shadowColor = "rgba(20,28,31,0.22)"; ctx.shadowBlur = 8; ctx.shadowOffsetY = 4;
    if (id === "keyboard") {
      const shell = ctx.createLinearGradient(0, -31, 0, 32);
      shell.addColorStop(0, "#555c5f"); shell.addColorStop(1, "#252b2d");
      roundRect(ctx, -64, -31, 128, 63, 6, shell, "rgba(20,24,25,0.65)");
      ctx.shadowColor = "transparent";
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 11; col++) {
          const keyWidth = row === 3 && col > 2 && col < 8 ? 9.5 : 8;
          roundRect(ctx, -54 + col * 10, -22 + row * 12, keyWidth, 8, 1.5, row === 3 ? "#5f676a" : "#747d80");
          ctx.save(); ctx.globalAlpha = 0.22;
          line(ctx, [[-52 + col * 10,-20 + row * 12],[-47 + col * 10,-20 + row * 12]], "#e4e8e7", 0.7);
          ctx.restore();
        }
      }
    } else if (id === "mouse") {
      const shell = ctx.createLinearGradient(-20, -38, 22, 37);
      shell.addColorStop(0, "#747c7e"); shell.addColorStop(0.55, "#444b4d"); shell.addColorStop(1, "#272d2f");
      ctx.beginPath();
      ctx.moveTo(0,-39); ctx.bezierCurveTo(25,-39,31,-16,28,11); ctx.bezierCurveTo(25,35,12,42,0,42);
      ctx.bezierCurveTo(-12,42,-25,35,-28,11); ctx.bezierCurveTo(-31,-16,-25,-39,0,-39); ctx.closePath();
      ctx.fillStyle = shell; ctx.fill(); ctx.strokeStyle = "rgba(22,27,29,0.7)"; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.shadowColor = "transparent";
      line(ctx, [[0,-38],[0,-6]], "rgba(220,225,224,0.35)", 1.2);
      roundRect(ctx, -3.5, -24, 7, 15, 3, "#9ba2a3");
      line(ctx, [[0,-39],[10,-57],[2,-72]], "#343b3d", 2);
    } else if (id === "badge") {
      ctx.shadowColor = "transparent";
      line(ctx, [[-19,-30],[-26,-80],[26,-80],[19,-30]], "#263d52", 5);
      const card = ctx.createLinearGradient(-30, -32, 30, 48);
      card.addColorStop(0, "rgba(245,248,247,0.97)"); card.addColorStop(1, "rgba(207,217,217,0.95)");
      roundRect(ctx, -31, -32, 62, 80, 4, card, "rgba(56,70,73,0.55)");
      roundRect(ctx, -16, -21, 32, 29, 2, "#8e9b9e");
      circle(ctx, 0, -13, 6, "#c3cbcb");
      roundRect(ctx, -10, -6, 20, 9, 4, "#c3cbcb");
      ctx.save(); ctx.globalAlpha = 0.55;
      line(ctx, [[-17,20],[17,20]], "#58666a", 1.5);
      line(ctx, [[-17,29],[10,29]], "#58666a", 1.5);
      line(ctx, [[-17,37],[14,37]], "#58666a", 1.5);
      ctx.restore();
    } else if (id === "suit") {
      const skin = ctx.createRadialGradient(-6,-58,2,0,-50,22);
      skin.addColorStop(0, "#d5aa7d"); skin.addColorStop(1, "#9d704b");
      circle(ctx, 0, -52, 18, skin, "rgba(63,44,31,0.45)");
      const fabric = ctx.createLinearGradient(-42,-28,35,52);
      fabric.addColorStop(0, "#455057"); fabric.addColorStop(0.55, "#252e33"); fabric.addColorStop(1, "#131a1e");
      poly(ctx, [[-28,-28],[-43,13],[-27,22],[-18,1],[-18,49],[18,49],[18,1],[27,22],[43,13],[28,-28]], fabric, "rgba(13,18,21,0.75)");
      ctx.shadowColor = "transparent";
      poly(ctx, [[-14,-27],[0,8],[14,-27]], "#d7d8d4", null);
      poly(ctx, [[0,-20],[5,-7],[0,10],[-5,-7]], "#6f2830", null);
      line(ctx, [[-11,49],[-11,73]], "#20272b", 9);
      line(ctx, [[11,49],[11,73]], "#20272b", 9);
    } else if (id === "monitor") {
      const bezel = ctx.createLinearGradient(-60,-42,60,46);
      bezel.addColorStop(0, "#4b5356"); bezel.addColorStop(1, "#1c2326");
      roundRect(ctx, -65, -46, 130, 86, 6, bezel, "rgba(13,19,21,0.75)");
      const screen = ctx.createLinearGradient(-52,-33,52,28);
      screen.addColorStop(0, "#67787f"); screen.addColorStop(0.45, "#27343a"); screen.addColorStop(1, "#11191c");
      roundRect(ctx, -54, -35, 108, 62, 2, screen);
      ctx.shadowColor = "transparent";
      line(ctx, [[0,40],[0,61]], "#343d40", 9);
      roundRect(ctx, -31, 59, 62, 8, 3, "#2d3538");
      ctx.save(); ctx.globalAlpha = 0.22;
      line(ctx, [[-46,-29],[8,-29]], "#d7e4e6", 1.2); ctx.restore();
    } else if (id === "tower") {
      const tower = ctx.createLinearGradient(-34,-62,35,66);
      tower.addColorStop(0, "#4b5355"); tower.addColorStop(0.5, "#262e31"); tower.addColorStop(1, "#151c1f");
      roundRect(ctx, -36, -66, 72, 132, 5, tower, "rgba(12,17,19,0.78)");
      ctx.shadowColor = "transparent";
      circle(ctx, 0, -39, 18, "#20282b", "#5f696b");
      circle(ctx, 0, -39, 8, "#111719");
      circle(ctx, 18, 48, 4, "#5a8e73");
      for (let y = 5; y < 42; y += 9) line(ctx, [[-24,y],[19,y]], "rgba(164,174,175,0.24)", 1);
    } else if (id === "cup") {
      const ceramic = ctx.createLinearGradient(-28,-35,31,49);
      ceramic.addColorStop(0, "#f2f0e9"); ceramic.addColorStop(0.58, "#d6d2c8"); ceramic.addColorStop(1, "#aaa69e");
      ctx.beginPath(); ctx.moveTo(-29,-34); ctx.lineTo(26,-34); ctx.lineTo(20,47); ctx.quadraticCurveTo(0,57,-21,47); ctx.closePath();
      ctx.fillStyle = ceramic; ctx.fill(); ctx.strokeStyle = "rgba(72,76,75,0.5)"; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.shadowColor = "transparent";
      ctx.beginPath(); ctx.ellipse(-1,-34,28,8,0,0,Math.PI*2); ctx.fillStyle = "#6b4937"; ctx.fill();
      ctx.beginPath(); ctx.arc(30,2,18,-1.25,1.2); ctx.strokeStyle = "#b8b3aa"; ctx.lineWidth = 7; ctx.stroke();
    }
    ctx.restore();
  }

  function drawBox(ctx, props = [], sealed = false, tapeProgress = 1, damage = 0, showLabel = true) {
    ctx.save();
    const front = ctx.createLinearGradient(-170, -145, 130, 35);
    front.addColorStop(0, "#c99354");
    front.addColorStop(0.48, "#b97b3d");
    front.addColorStop(1, "#a96831");
    const side = ctx.createLinearGradient(120, -120, 225, 20);
    side.addColorStop(0, "#9f612e");
    side.addColorStop(1, "#77421f");
    const top = ctx.createLinearGradient(-120, -240, 180, -110);
    top.addColorStop(0, "#d5a060");
    top.addColorStop(0.55, "#c48747");
    top.addColorStop(1, "#ad6d35");
    const flap = ctx.createLinearGradient(-180, -300, 180, -130);
    flap.addColorStop(0, "#dfac6d");
    flap.addColorStop(1, "#bd7c3e");
    const edge = "rgba(73,42,22,0.72)";

    function face(points, fill, stroke = edge, width = 1.8) {
      ctx.beginPath();
      points.forEach((point, index) => index ? ctx.lineTo(point[0], point[1]) : ctx.moveTo(point[0], point[1]));
      ctx.closePath();
      ctx.fillStyle = fill; ctx.fill();
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.lineJoin = "round"; ctx.stroke(); }
    }

    if (!sealed) {
      face([[-165,-150],[-242,-222],[-149,-294],[-72,-222]], flap);
      face([[-72,-222],[-40,-291],[253,-255],[220,-188]], flap);
      ctx.save(); ctx.globalAlpha = 0.16;
      line(ctx, [[-213,-221],[-151,-273],[-88,-220]], "#6e4024", 1.4);
      line(ctx, [[-25,-274],[103,-254],[226,-238]], "#6e4024", 1.4);
      ctx.restore();
    }

    face([[-165,-150],[-72,-222],[220,-188],[125,-118]], sealed ? top : "#58341f");
    if (!sealed) {
      ctx.save(); ctx.translate(-6, -206); ctx.rotate(-0.13);
      ctx.shadowColor = "rgba(22,14,8,0.25)"; ctx.shadowBlur = 10; ctx.shadowOffsetY = 5;
      roundRect(ctx, -56, -50, 112, 86, 3, "#eee8d8", "rgba(82,74,60,0.5)");
      ctx.shadowColor = "transparent";
      ctx.save(); ctx.globalAlpha = 0.3;
      line(ctx, [[-38,-18],[38,-18]], "#6f7c80", 1.2);
      line(ctx, [[-38,-3],[31,-3]], "#6f7c80", 1.2);
      line(ctx, [[-38,12],[35,12]], "#6f7c80", 1.2);
      ctx.restore();
      ctx.restore();
      const spots = [
        [-78,-177,0.58,-0.2],[58,-168,0.58,0.18],[132,-204,0.54,0.16],
        [25,-245,0.48,-0.1],[-20,-188,0.5,0.08],[101,-232,0.5,0.2],[-132,-219,0.46,-0.15]
      ];
      props.forEach((id, index) => drawProp(ctx, id, ...spots[index % spots.length]));
    }

    face([[-165,-150],[125,-118],[125,35],[-165,2]], front);
    face([[125,-118],[220,-188],[220,-32],[125,35]], side);
    if (!sealed) face([[-165,-150],[125,-118],[81,-53],[-211,-87]], top);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-165,-150); ctx.lineTo(125,-118); ctx.lineTo(125,35); ctx.lineTo(-165,2); ctx.closePath();
    ctx.clip();
    ctx.globalAlpha = 0.09;
    for (let y = -132; y < 30; y += 11) line(ctx, [[-175,y],[135,y+31]], "#4e2c18", 0.8);
    for (let x = -145; x < 125; x += 37) line(ctx, [[x,-150],[x-12,18]], "#f0c58c", 0.7);
    ctx.restore();

    ctx.save(); ctx.globalAlpha = 0.22;
    line(ctx, [[-158,-143],[117,-112]], "#f1c58a", 1.2);
    line(ctx, [[132,-114],[213,-178]], "#d09958", 1.1);
    ctx.restore();

    if (sealed) {
      const t = Math.max(0, Math.min(1, tapeProgress));
      const tape = ctx.createLinearGradient(-40, -205, 95, -105);
      tape.addColorStop(0, "rgba(226,196,135,0.93)");
      tape.addColorStop(0.5, "rgba(245,221,166,0.96)");
      tape.addColorStop(1, "rgba(201,165,101,0.94)");
      face([[-39,-205],[-4,-201],[-4 + 93*t,-201 + 69*t],[-39 + 93*t,-205 + 69*t]], tape, "rgba(116,85,45,0.28)", 1);
      if (t > 0.35) {
        const length = 154 * (t - 0.35) / 0.65;
        face([[-27,-135],[10,-131],[10,-131 + length],[-27,-135 + length]], tape, "rgba(116,85,45,0.24)", 1);
        ctx.save(); ctx.globalAlpha = 0.28;
        line(ctx, [[-19,-130],[-19,-130 + length]], "#fff4cf", 1.2);
        ctx.restore();
      }
      line(ctx, [[-72,-222],[125,-118]], "rgba(79,45,23,0.62)", 1.6);
    }

    if (showLabel) {
      ctx.save(); ctx.translate(-111, -58); ctx.rotate(0.112);
      roundRect(ctx, 0, 0, 62, 35, 1.5, "#e9e3d4", "rgba(83,70,54,0.45)");
      ctx.save(); ctx.globalAlpha = 0.42;
      line(ctx, [[9,11],[51,11]], "#6e7677", 1);
      line(ctx, [[9,19],[44,19]], "#6e7677", 1);
      line(ctx, [[9,27],[48,27]], "#6e7677", 1);
      ctx.restore(); ctx.restore();
    }

    const d = Math.max(0, Math.min(1, damage));
    if (d > 0) {
      ctx.save();
      ctx.strokeStyle = "rgba(85,45,21,0.58)";
      ctx.lineWidth = 1.5 + d * 1.6;
      ctx.beginPath(); ctx.moveTo(58,-94); ctx.bezierCurveTo(42,-77,66,-68,36,-42); ctx.stroke();
      ctx.globalAlpha = 0.2 + d * 0.18;
      ctx.fillStyle = "#6f3c1d";
      ctx.beginPath(); ctx.ellipse(51,-64,27 + d*18,9 + d*6,-0.7,0,Math.PI*2); ctx.fill();
      if (d > 0.4) {
        ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.moveTo(-137,-51); ctx.lineTo(-118,-30); ctx.lineTo(-130,-8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(155,-43); ctx.lineTo(177,-59); ctx.lineTo(196,-49); ctx.stroke();
      }
      if (d > 0.72) {
        ctx.globalAlpha = 0.35;
        for (let x = -140; x < 110; x += 34) line(ctx, [[x,-122],[x+20,-5]], "#5d3218", 1.2);
      }
      ctx.restore();
    }
    ctx.restore();
  }

  function drawGround(ctx) {
    ctx.fillStyle = C.shadow;
    ctx.beginPath(); ctx.ellipse(414, 500, 220, 31, 0, 0, Math.PI * 2); ctx.fill();
  }

  function clamp(value, min = 0, max = 1) {
    return Math.max(min, Math.min(max, value));
  }

  function easeOut(value) {
    const t = clamp(value);
    return 1 - Math.pow(1 - t, 3);
  }

  function punchStage(hits) {
    return hits >= 15 ? 3 : hits >= 8 ? 2 : hits > 0 ? 1 : 0;
  }

  function punchCamera(state, view, now) {
    if (view.reducedMotion || state.phase !== "processing" || state.method !== "punch") {
      return { x: 0, y: 0, angle: 0 };
    }

    const animation = view.animation || {};
    let power = 0;
    if (animation.kind === "punch-finish") {
      const progress = animation.progress || 0;
      if (progress < 0.08) power = progress * 24;
      else {
        const strike = clamp((progress - 0.08) / 0.92);
        power = 25 * Math.pow(1 - strike, 2) + (progress < 0.22 ? 7 : 0);
      }
    } else {
      const age = Math.max(0, now - (view.hitAt || -10000));
      if (age < 300) {
        const stage = punchStage(state.hits || 0);
        const milestone = state.hits === 7 || state.hits === 14;
        const attack = clamp(age / 28);
        power = (3 + stage * 2 + (milestone ? 4 : 0)) * attack * Math.exp(-age / 115);
      }
    }

    return {
      x: Math.sin(now * 0.39) * power + Math.sin(now * 0.17) * power * 0.45,
      y: Math.cos(now * 0.31) * power * 0.62,
      angle: Math.sin(now * 0.21) * power * 0.0015
    };
  }

  function drawImpactBurst(ctx, x, y, age, hits) {
    const life = clamp(1 - age / 290);
    if (life <= 0) return;
    const radius = 32 + (1 - life) * 78;
    const stage = punchStage(hits);
    ctx.save();
    ctx.globalAlpha = life;
    for (let i = 0; i < 10 + stage * 2; i++) {
      const angle = i / (10 + stage * 2) * Math.PI * 2 + hits * 0.31;
      const inner = radius * 0.55;
      line(ctx, [
        [x + Math.cos(angle) * inner, y + Math.sin(angle) * inner],
        [x + Math.cos(angle) * radius, y + Math.sin(angle) * radius]
      ], i % 3 === 0 ? C.yellow : C.ink, i % 3 === 0 ? 6 : 3);
    }
    const words = ["咚！", "砰！", "啪！", "哐！"];
    const word = hits === 7 ? "裂！" : hits === 14 ? "爆！" : words[hits % words.length];
    ctx.translate(x + (hits % 2 ? -74 : 24), y - 58 - stage * 4);
    ctx.rotate((hits % 2 ? -1 : 1) * 0.09);
    roundRect(ctx, -8, -32, 88, 55, 12, C.yellow, C.ink);
    label(ctx, word, 10, 8, 28 + stage * 2, C.ink, "900");
    ctx.restore();
  }

  function drawPhysicalImpact(ctx, x, y, age, tier = 1) {
    const life = clamp(1 - age / (220 + tier * 45));
    if (life <= 0) return;
    const travel = (1 - life) * (34 + tier * 24);
    ctx.save();
    ctx.globalAlpha = life * 0.72;
    const fragmentCount = 12 + tier * 6;
    for (let i = 0; i < fragmentCount; i++) {
      const angle = i / fragmentCount * Math.PI * 2 + tier * 0.37;
      const distance = 12 + travel * (0.65 + i % 3 * 0.18);
      const px = x + Math.cos(angle) * distance;
      const py = y + Math.sin(angle) * distance;
      ctx.save(); ctx.translate(px, py); ctx.rotate(angle + i * 0.23);
      roundRect(ctx, -5, -2, 10 + tier * 2 + i % 3 * 3, 4 + tier, 1, i % 2 ? "#c28a4d" : "#9d6131");
      ctx.restore();
    }
    ctx.globalAlpha = life * 0.22;
    for (let i = 0; i < 7 + tier * 2; i++) {
      const angle = i / (7 + tier * 2) * Math.PI * 2;
      circle(ctx, x + Math.cos(angle) * travel * 0.65, y + Math.sin(angle) * travel * 0.38, 10 + tier * 4, "#b9a58a");
    }
    ctx.restore();
  }

  function drawLooseDebris(ctx, state) {
    const hits = state.hits || 0;
    const count = Math.min(10, Math.floor(hits / 2));
    for (let i = 0; i < count; i++) {
      const x = 238 + (i * 73) % 330;
      const y = 474 + (i % 3) * 10;
      ctx.save(); ctx.translate(x, y); ctx.rotate((i - 4) * 0.19);
      roundRect(ctx, -9, -4, 18 + i % 3 * 5, 8, 2, i % 2 ? C.tape : C.boxTop, C.boxSide);
      ctx.restore();
    }

    const escaped = Math.min(state.props.length, Math.floor(hits / 6));
    const spots = [[240,442,0.34,-0.28],[552,450,0.32,0.25],[302,482,0.28,0.11],[498,486,0.28,-0.12]];
    for (let i = 0; i < escaped; i++) drawProp(ctx, state.props[i], ...spots[i]);
  }

  function drawFlyingProps(ctx, props, progress) {
    const flight = easeOut(clamp((progress - 0.08) / 0.68));
    props.forEach((id, index) => {
      const direction = index % 2 ? 1 : -1;
      const x = 400 + direction * (90 + index * 42) * flight;
      const y = 395 - Math.sin(flight * Math.PI) * (150 + index * 18) + index * 12 * flight;
      drawProp(ctx, id, x, y, 0.42 - index * 0.025, direction * flight * (1.2 + index * 0.3));
    });
  }

  function drawFinalStamp(ctx, progress) {
    if (progress < 0.53) return;
    const drop = easeOut((progress - 0.53) / 0.2);
    const bounce = progress < 0.73 ? 1 + Math.sin(drop * Math.PI) * 0.28 : 1;
    ctx.save();
    ctx.translate(400, 272 - (1 - drop) * 190);
    ctx.rotate(-0.075);
    ctx.scale(bounce, bounce);
    roundRect(ctx, -170, -48, 340, 96, 14, C.paper, C.green);
    label(ctx, "不伺候了", -92, 17, 38, C.green, "900");
    ctx.restore();
  }

  function drawMachine(ctx, progress) {
    roundRect(ctx, 174, 98, 36, 384, 8, C.steel, C.ink);
    roundRect(ctx, 620, 98, 36, 384, 8, C.steel, C.ink);
    roundRect(ctx, 155, 71, 520, 70, 12, C.blue, C.ink);
    const plateY = 185 + progress * 217;
    roundRect(ctx, 387, 140, 56, plateY - 124, 3, C.blueLight, C.ink);
    roundRect(ctx, 229, plateY, 376, 29, 5, C.yellow, C.ink);
    ctx.save(); ctx.beginPath(); ctx.rect(233, plateY + 3, 368, 23); ctx.clip();
    for (let x = 217; x < 610; x += 33) poly(ctx, [[x,plateY+3],[x+14,plateY+3],[x+32,plateY+26],[x+18,plateY+26]], C.ink, null);
    ctx.restore();
    roundRect(ctx, 159, 475, 512, 33, 7, C.blue, C.ink);
    circle(ctx, 188, 106, 8, C.green, C.paper);
  }

  function fragments(ctx, progress, seed = 0) {
    for (let i = 0; i < 18; i++) {
      const angle = i * 2.399 + seed;
      const distance = 25 + progress * (75 + i * 5);
      const x = 400 + Math.cos(angle) * distance;
      const y = 436 + Math.sin(angle) * distance * 0.42 - Math.sin(progress * Math.PI) * 45;
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle + progress * 3);
      roundRect(ctx, -6, -3, 12 + i % 3 * 3, 6, 1, i % 3 === 0 ? C.tape : C.boxTop);
      ctx.restore();
    }
  }

  function drawConveyor(ctx, progress, resultView) {
    roundRect(ctx, 80, 461, 645, 29, 14, C.steel, C.ink);
    for (let x = 108; x < 720; x += 43) circle(ctx, x, 476, 7, C.light, C.ink);
    line(ctx, [[110,490],[110,525]], C.ink, 10);
    line(ctx, [[678,490],[678,525]], C.ink, 10);
    const x = resultView ? 280 : 175 + progress * 465;
    if (progress < 0.94 || resultView) {
      ctx.save(); ctx.translate(x, 448 - (progress > 0.7 && !resultView ? (progress-0.7) * 90 : 0));
      ctx.scale(0.62, 0.28); drawBox(ctx, [], true, 1, 1); ctx.restore();
    }
    roundRect(ctx, 551, 317, 160, 144, 7, C.green, C.ink);
    roundRect(ctx, 540, 299, 183, 24, 6, C.blueLight, C.ink);
    label(ctx, "滚蛋", 596, 401, 26, C.paper, "700");
    line(ctx, [[580,341],[597,332],[613,344]], C.paper, 4);
    line(ctx, [[676,345],[681,363],[664,369]], C.paper, 4);
    line(ctx, [[641,428],[620,428],[615,410]], C.paper, 4);
    if (resultView) {
      ctx.save(); ctx.translate(345, 350); ctx.rotate(-0.13);
      roundRect(ctx, -94, -29, 188, 58, 7, C.paper, C.green);
      label(ctx, "破事已处理", -74, 10, 26, C.green, "800");
      ctx.restore();
    }
  }

  function drawInteractiveHealth(ctx, health) {
    const ratio = clamp((Number.isFinite(health) ? health : 1000) / 1000);
    const x = 74, y = 108, width = 652, height = 30;
    roundRect(ctx, x, y, width, height, 15, "rgba(38,63,74,0.13)");
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, width * ratio, height); ctx.clip();
    roundRect(ctx, x, y, width, height, 15, ratio > 0.55 ? C.green : ratio > 0.25 ? C.yellow : "#d95845");
    ctx.restore();
    for (let i = 1; i < 20; i++) line(ctx, [[x + width * i / 20, y + 5], [x + width * i / 20, y + height - 5]], "rgba(255,255,255,0.5)", 2);
  }

  function drawShield(ctx) {
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.translate(744, 82);
    ctx.scale(0.7, 0.7);
    poly(ctx, [[0,-22],[20,-14],[18,8],[0,27],[-18,8],[-20,-14]], C.paper, C.steel);
    line(ctx, [[-8,0],[-1,8],[11,-8]], C.green, 4);
    ctx.restore();
  }

  function drawTapeRoll(ctx, x, y, pulse = 0) {
    ctx.save(); ctx.translate(x, y); ctx.scale(1 + pulse * 0.08, 1 + pulse * 0.08);
    circle(ctx, 0, 0, 43, C.tape, C.ink);
    circle(ctx, 0, 0, 19, C.paper, C.ink);
    ctx.restore();
  }

  function drawPhoneHint(ctx, now) {
    const sway = Math.sin(now / 180) * 0.18;
    ctx.save(); ctx.translate(125, 1440); ctx.rotate(sway);
    roundRect(ctx, -34, -57, 68, 114, 13, C.paper, C.steel);
    circle(ctx, 0, 42, 4, C.steel);
    line(ctx, [[-58,-18],[-73,0],[-58,18]], C.yellow, 6);
    line(ctx, [[58,-18],[73,0],[58,18]], C.yellow, 6);
    ctx.restore();
    const ring = 18 + (now / 14 % 28);
    ctx.save(); ctx.globalAlpha = 1 - (ring - 18) / 28;
    circle(ctx, 675, 1440, ring, "rgba(0,0,0,0)", C.yellow);
    circle(ctx, 675, 1440, 10, C.yellow);
    ctx.restore();
  }

  function drawInteractivePack(ctx, state, view, now, animation) {
    const drag = view.drag || null;
    const sealing = animation.kind === "seal";
    const progress = sealing ? animation.progress || 0 : 0;
    PROP_LAYOUT.forEach((item, index) => {
      const selected = state.props.includes(item.id);
      const dragging = drag && drag.kind === "prop" && drag.id === item.id;
      if (!selected && !dragging) {
        ctx.save();
        ctx.globalAlpha = 0.96;
        const float = Math.sin(now / 460 + index * 0.8) * 6;
        drawProp(ctx, item.id, item.x, item.y + float, item.scale);
        ctx.restore();
      }
    });

    ctx.save(); ctx.translate(400, 930);
    drawBox(ctx, state.props, sealing && progress > 0.28, sealing ? clamp(progress * 1.5) : 1, 0, false);
    ctx.restore();

    if (!sealing && !(drag && drag.kind === "tape")) {
      const pulse = (Math.sin(now / 260) + 1) / 2;
      drawTapeRoll(ctx, 690, 1360, pulse);
      ctx.save(); ctx.globalAlpha = 0.25 + pulse * 0.3;
      line(ctx, [[646,1340],[575,1250],[505,1130]], C.yellow, 5);
      ctx.restore();
    }

    if (drag && drag.kind === "prop") {
      const item = PROP_LAYOUT.find(prop => prop.id === drag.id);
      ctx.save();
      ctx.globalAlpha = 0.96;
      drawProp(ctx, drag.id, drag.x, drag.y, item ? item.scale * 1.08 : 0.9, drag.angle || 0);
      ctx.restore();
    } else if (drag && drag.kind === "tape") drawTapeRoll(ctx, drag.x, drag.y, 0.2);

    const drop = view.dropEffect;
    if (drop) {
      const age = clamp((now - drop.started) / 420);
      const t = easeOut(age);
      const target = drop.accepted ? { x: 400, y: 805 } : drop.target;
      const x = drop.x + (target.x - drop.x) * t;
      const y = drop.y + (target.y - drop.y) * t - Math.sin(t * Math.PI) * 55;
      const item = PROP_LAYOUT.find(prop => prop.id === drop.id);
      const startScale = item ? item.scale : 0.9;
      drawProp(ctx, drop.id, x, y, startScale * (1 - t * 0.45), t * 0.8);
    }
  }

  function drawInteractiveDestroy(ctx, state, view, now, animation) {
    drawInteractiveHealth(ctx, Number.isFinite(view.displayHealth) ? view.displayHealth : state.health);
    const body = view.body || { x: 400, y: 600, angle: 0 };
    const final = animation.kind === "punch-finish";
    const finish = final ? animation.progress || 0 : 0;
    const damage = clamp(state.progress);
    const speed = Math.hypot(body.vx || 0, body.vy || 0);
    if (speed > 300 && !view.reducedMotion) {
      const trailLength = Math.min(150, speed * 0.055);
      const unitX = -(body.vx || 0) / speed;
      const unitY = -(body.vy || 0) / speed;
      ctx.save();
      for (let i = 0; i < 4; i++) {
        ctx.globalAlpha = 0.12 - i * 0.022;
        line(ctx, [
          [body.x + unitX * (28 + i * 18), body.y + unitY * (28 + i * 18)],
          [body.x + unitX * (trailLength + i * 24), body.y + unitY * (trailLength + i * 24)]
        ], "#687173", 7 - i);
      }
      ctx.restore();
    }
    const age = Math.max(0, now - (view.hitAt || -10000));
    const slam = final ? easeOut(clamp((finish - 0.08) / 0.25)) : 0;
    const hitKick = age < 260 ? Math.sin(age / 35) * Math.exp(-age / 115) * (8 + damage * 18) : 0;
    const shadowY = Math.min(1505, body.y + 150);
    const floorDistance = Math.max(0, 1392 - body.y);
    ctx.save();
    ctx.globalAlpha = 0.2 * (1 - Math.min(0.72, floorDistance / 1500));
    ctx.fillStyle = "#4a4d4c";
    ctx.beginPath(); ctx.ellipse(body.x, shadowY, Math.max(80, 145 - floorDistance * 0.025), 25, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    const residueCount = Math.min(34, Math.floor(damage * 24) + Math.min(10, (state.slams || 0) * 2));
    for (let i = 0; i < residueCount; i++) {
      const x = 90 + (i * 97) % 620;
      const y = 1490 - (i % 4) * 16;
      ctx.save(); ctx.translate(x, y); ctx.rotate(i * 0.71);
      roundRect(ctx, -9, -4, 18 + i % 3 * 5, 8, 2, i % 2 ? C.tape : C.boxTop, C.boxSide);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(body.x + hitKick, body.y + 104 + slam * 35);
    ctx.rotate((body.angle || 0) + hitKick * 0.004);
    ctx.scale(0.78 * (1 + damage * 0.14 + slam * 0.34), 0.78 * (1 - damage * 0.2) * (1 - slam * 0.76));
    drawBox(ctx, state.props, true, 1, damage, false);
    ctx.restore();

    if (age < 290 && !final) {
      const x = body.x + (state.hits % 2 ? -115 : 115);
      drawPhysicalImpact(ctx, x, body.y, age, Math.max(1, Math.min(3, Math.ceil(damage * 3))));
    }

    const collisionAge = Math.max(0, now - (view.collisionAt || -10000));
    if (collisionAge < 260) {
      const point = view.collisionPoint || { x: body.x, y: body.y };
      const tier = Math.max(1, Math.min(3, view.collisionTier || 1));
      ctx.save();
      ctx.translate(point.x, point.y);
      ctx.scale(0.82 + tier * 0.2, 0.82 + tier * 0.2);
      ctx.translate(-point.x, -point.y);
      drawPhysicalImpact(ctx, point.x, point.y, collisionAge, tier);
      ctx.restore();
    }

    if (final) {
      const blast = clamp((finish - 0.08) / 0.5);
      if (blast > 0 && !view.reducedMotion) {
        ctx.save(); ctx.translate(body.x - 400, body.y - 436); fragments(ctx, blast, 1.7); ctx.restore();
      }
      ctx.save(); ctx.translate(body.x - 400, body.y - 395);
      drawFlyingProps(ctx, state.props, finish);
      ctx.restore();
    } else if ((view.processingAge || 0) < 2800) drawPhoneHint(ctx, now);
  }

  function drawInteractiveResult(ctx, state, view, now, animation) {
    const days = Number.isFinite(view.recycleDays) ? view.recycleDays : 0;
    const indicator = days >= 7 ? "#d2a83f" : days >= 4 ? "#4774a8" : days >= 2 ? "#79558b" : "#4f8a72";
    const progress = animation.kind === "recycle" ? animation.progress || 0 : 1;
    const steel = ctx.createLinearGradient(180, 530, 620, 1000);
    steel.addColorStop(0, "#7c898c");
    steel.addColorStop(0.48, "#536166");
    steel.addColorStop(1, "#303d42");

    ctx.save();
    ctx.shadowColor = "rgba(25,34,37,0.24)"; ctx.shadowBlur = 35; ctx.shadowOffsetY = 18;
    roundRect(ctx, 176, 526, 448, 486, 18, steel, "#26363b");
    ctx.shadowColor = "transparent";
    roundRect(ctx, 228, 608, 344, 270, 8, "#182125", "#1f2b2f");
    for (let x = 255; x <= 545; x += 58) {
      circle(ctx, x, 914, 21, "#29363b", "#879396");
      circle(ctx, x, 914, 7, "#aeb8ba");
    }
    circle(ctx, 570, 570, 11, indicator, "#223035");
    circle(ctx, 210, 570, 5, "#9ba6a8");
    circle(ctx, 590, 970, 7, "#1d292d");
    circle(ctx, 210, 970, 7, "#1d292d");

    const close = easeOut(clamp((progress - 0.72) / 0.28));
    const shutterWidth = 154 * close;
    if (shutterWidth > 0) {
      const shutter = ctx.createLinearGradient(0, 608, 0, 878);
      shutter.addColorStop(0, "#6c797c"); shutter.addColorStop(1, "#39474b");
      ctx.fillStyle = shutter;
      ctx.fillRect(228, 608, shutterWidth, 270);
      ctx.fillRect(572 - shutterWidth, 608, shutterWidth, 270);
      ctx.strokeStyle = "rgba(210,220,220,0.18)"; ctx.lineWidth = 2;
      for (let y = 630; y < 868; y += 34) {
        ctx.beginPath(); ctx.moveTo(228, y); ctx.lineTo(228 + shutterWidth, y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(572 - shutterWidth, y); ctx.lineTo(572, y); ctx.stroke();
      }
    }
    ctx.restore();

    if (progress < 0.92) {
      const travel = easeOut(clamp(progress / 0.84));
      const x = 400 + Math.sin(progress * Math.PI * 2) * (1 - progress) * 120;
      const y = 1300 - travel * 560;
      const scale = Math.max(0.12, 0.72 * (1 - travel * 0.78));
      ctx.save(); ctx.translate(x, y); ctx.rotate(progress * 2.4); ctx.scale(scale, scale * 0.34);
      drawBox(ctx, [], true, 1, 1, false); ctx.restore();
    }

    if (state.phase === "result") {
      const glow = 0.18 + (Math.sin(now / 520) + 1) * 0.08;
      ctx.save(); ctx.globalAlpha = glow;
      circle(ctx, 570, 570, 23, indicator);
      ctx.restore();
    }
  }

  function drawInteractiveScene(ctx, state, view, now, animation) {
    ctx.clearRect(0, 0, WIDTH, INTERACTIVE_HEIGHT);
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, WIDTH, INTERACTIVE_HEIGHT);
    ctx.save();
    const hitAge = Math.max(0, now - (view.hitAt || -10000));
    const collisionAge = Math.max(0, now - (view.collisionAt || -10000));
    let shake = hitAge < 260 ? (7 + clamp(state.progress) * 13) * Math.exp(-hitAge / 100) : 0;
    if (collisionAge < 300) {
      const tier = Math.max(1, Math.min(3, view.collisionTier || 1));
      const collisionPower = tier === 3 ? 36 : tier === 2 ? 24 : 13;
      shake = Math.max(shake, collisionPower * Math.exp(-collisionAge / 120));
    }
    if (animation.kind === "punch-finish") shake = Math.max(shake, 30 * Math.pow(1 - (animation.progress || 0), 2));
    if (!view.reducedMotion && shake > 0) {
      ctx.translate(Math.sin(now * 0.43) * shake, Math.cos(now * 0.37) * shake * 0.65);
      ctx.rotate(Math.sin(now * 0.29) * shake * 0.0015);
    }
    const ceiling = ctx.createLinearGradient(0, 0, 0, 185);
    ceiling.addColorStop(0, "#ffffff"); ceiling.addColorStop(1, "#ffffff");
    poly(ctx, [[0,0],[800,0],[734,172],[66,172]], ceiling, null);
    ctx.fillStyle = "#ffffff"; ctx.fillRect(66, 172, 668, 1015);
    poly(ctx, [[0,0],[66,172],[66,1187],[0,1310]], "#ffffff", null);
    poly(ctx, [[800,0],[734,172],[734,1187],[800,1310]], "#ffffff", null);
    const floor = ctx.createLinearGradient(0, 1187, 0, INTERACTIVE_HEIGHT);
    floor.addColorStop(0, "#ffffff"); floor.addColorStop(1, "#ffffff");
    poly(ctx, [[66,1187],[734,1187],[800,1310],[800,1600],[0,1600],[0,1310]], floor, null);
    const ceilingShadow = ctx.createLinearGradient(0, 172, 0, 210);
    ceilingShadow.addColorStop(0, "rgba(45,52,54,0.085)"); ceilingShadow.addColorStop(1, "rgba(45,52,54,0)");
    ctx.fillStyle = ceilingShadow; ctx.fillRect(66, 172, 668, 38);
    const floorShadow = ctx.createLinearGradient(0, 1148, 0, 1188);
    floorShadow.addColorStop(0, "rgba(45,52,54,0)"); floorShadow.addColorStop(1, "rgba(45,52,54,0.09)");
    ctx.fillStyle = floorShadow; ctx.fillRect(66, 1148, 668, 40);
    const leftShadow = ctx.createLinearGradient(66, 0, 96, 0);
    leftShadow.addColorStop(0, "rgba(45,52,54,0.07)"); leftShadow.addColorStop(1, "rgba(45,52,54,0)");
    ctx.fillStyle = leftShadow; ctx.fillRect(66, 172, 30, 1015);
    const rightShadow = ctx.createLinearGradient(704, 0, 734, 0);
    rightShadow.addColorStop(0, "rgba(45,52,54,0)"); rightShadow.addColorStop(1, "rgba(45,52,54,0.075)");
    ctx.fillStyle = rightShadow; ctx.fillRect(704, 172, 30, 1015);

    line(ctx, [[0,0],[66,172]], "rgba(68,75,77,0.2)", 2);
    line(ctx, [[66,172],[734,172]], "rgba(68,75,77,0.2)", 2);
    line(ctx, [[734,172],[800,0]], "rgba(68,75,77,0.2)", 2);
    line(ctx, [[66,172],[66,1187]], "rgba(68,75,77,0.2)", 2);
    line(ctx, [[734,172],[734,1187]], "rgba(68,75,77,0.2)", 2);
    line(ctx, [[0,1310],[66,1187]], "rgba(68,75,77,0.22)", 2.5);
    line(ctx, [[66,1187],[734,1187]], "rgba(68,75,77,0.24)", 3);
    line(ctx, [[734,1187],[800,1310]], "rgba(68,75,77,0.22)", 2.5);
    ctx.save(); ctx.globalAlpha = 0.18;
    line(ctx, [[0,1600],[400,1187]], "#aeb2b1", 1.3);
    line(ctx, [[800,1600],[400,1187]], "#aeb2b1", 1.3);
    line(ctx, [[190,1600],[400,1187]], "#c0c2c0", 1);
    line(ctx, [[610,1600],[400,1187]], "#c0c2c0", 1);
    ctx.restore();

    if (state.phase === "write") {
      ctx.save(); ctx.translate(400, 1180 + Math.sin(now / 500) * 8); ctx.scale(0.9, 0.9);
      drawBox(ctx, [], false, 0, 0, false); ctx.restore();
      ctx.save(); ctx.globalAlpha = 0.3 + (Math.sin(now / 320) + 1) * 0.15;
      line(ctx, [[400,610],[400,900]], C.yellow, 8);
      poly(ctx, [[380,880],[420,880],[400,920]], C.yellow, null); ctx.restore();
    } else if (state.phase === "pack" || state.phase === "choose") {
      drawInteractivePack(ctx, state, view, now, animation);
    } else if (state.phase === "processing") {
      drawInteractiveDestroy(ctx, state, view, now, animation);
    } else drawInteractiveResult(ctx, state, view, now, animation);

    drawShield(ctx);
    ctx.restore();
  }

  function drawScene(ctx, state, view = {}) {
    const now = view.now || 0;
    const animation = view.animation || {};
    if (view.interactive) return drawInteractiveScene(ctx, state, view, now, animation);
    const t = animation.progress || 0;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.save();
    const camera = punchCamera(state, view, now);
    ctx.translate(camera.x, camera.y);
    ctx.rotate(camera.angle);
    drawGround(ctx);
    if (state.phase === "recycle" || state.phase === "result") {
      drawConveyor(ctx, t, state.phase === "result");
    } else if (state.phase === "processing" && state.method === "press") {
      const p = state.progress;
      // Machine frame behind the carton; crushing plate is redrawn on top.
      drawMachine(ctx, p);
      ctx.save(); ctx.translate(402, 466); ctx.scale(0.83, 0.83 * (1 - p * 0.82));
      drawBox(ctx, state.props, true, 1, p); ctx.restore();
      const plateY = 185 + p * 217;
      roundRect(ctx, 229, plateY, 376, 29, 5, C.yellow, C.ink);
      ctx.save(); ctx.beginPath(); ctx.rect(233, plateY + 3, 368, 23); ctx.clip();
      for (let x = 217; x < 610; x += 33) poly(ctx, [[x,plateY+3],[x+14,plateY+3],[x+32,plateY+26],[x+18,plateY+26]], C.ink, null);
      ctx.restore();
      if (p > 0.72 && !view.reducedMotion) fragments(ctx, (p - 0.72) / 0.28);
    } else if (state.phase === "processing" && state.method === "punch") {
      const hits = state.hits || 0;
      const stage = punchStage(hits);
      const age = Math.max(0, now - (view.hitAt || -10000));
      const final = animation.kind === "punch-finish";
      const finishProgress = final ? t : 0;
      const direction = hits % 2 ? -1 : 1;
      const pulse = view.reducedMotion ? 0 : Math.sin(Math.min(age, 320) / 52) * Math.exp(-age / 230);
      const wobble = direction * pulse * (0.08 + stage * 0.035);
      const offset = wobble * 110;
      const slam = final ? easeOut(clamp((finishProgress - 0.08) / 0.24)) : 0;
      const damage = clamp(state.progress);

      roundRect(ctx, 149, 80, 510, 29, 9, C.blue, C.ink);
      if (!final || finishProgress < 0.18) {
        line(ctx, [[334,107],[335 + offset,256 + damage * 18]], C.ink, 5);
        line(ctx, [[486,107],[489 + offset,270 + damage * 12]], C.ink, 5);
      } else {
        line(ctx, [[334,107],[338,205],[323,231]], C.ink, 5);
        line(ctx, [[486,107],[490,218],[507,241]], C.ink, 5);
      }

      drawLooseDebris(ctx, state);
      const boxX = 394 + offset * (1 - slam);
      const boxY = 411 + damage * 12 + slam * 39;
      const boxScaleX = 0.84 * (1 + damage * 0.13 + slam * 0.34);
      const boxScaleY = 0.84 * (1 - damage * 0.18) * (1 - slam * 0.76);
      ctx.save();
      ctx.translate(boxX, boxY);
      ctx.rotate(wobble + direction * damage * 0.025 * (1 - slam));
      ctx.transform(1, direction * damage * 0.035 * (1 - slam), 0, 1, 0, 0);
      ctx.scale(boxScaleX, boxScaleY);
      drawBox(ctx, state.props, true, 1, damage);
      ctx.restore();

      if (!final && age < 290) {
        const impactX = hits % 2 ? 276 + offset : 534 + offset;
        const impactY = 326 + hits % 3 * 18;
        drawImpactBurst(ctx, impactX, impactY, age, hits);
      }

      if (final) {
        const blast = clamp((finishProgress - 0.08) / 0.48);
        if (blast > 0 && !view.reducedMotion) fragments(ctx, blast, 0.9);
        drawFlyingProps(ctx, state.props, finishProgress);
        if (finishProgress > 0.08 && finishProgress < 0.2) {
          ctx.save();
          ctx.globalAlpha = (0.2 - finishProgress) * 0.75;
          ctx.fillStyle = C.yellow;
          ctx.fillRect(-40, -40, WIDTH + 80, HEIGHT + 80);
          ctx.restore();
        }
        drawFinalStamp(ctx, finishProgress);
      }
    } else {
      const sealing = animation.kind === "seal";
      const sealed = state.phase === "choose" && (!sealing || t > 0.35);
      ctx.save(); ctx.translate(393, 451);
      drawBox(ctx, state.phase === "write" ? [] : state.props, sealed, sealing ? Math.min(1, t * 1.6) : 1);
      ctx.restore();
    }
    ctx.restore();
  }

  function hitTestBox(x, y) {
    return x >= 170 && x <= 655 && y >= 153 && y <= 500;
  }

  return { WIDTH, HEIGHT, INTERACTIVE_HEIGHT, PROP_LAYOUT, C, roundRect, poly, line, label, circle, drawProp, drawBox, drawScene, hitTestBox };
});
