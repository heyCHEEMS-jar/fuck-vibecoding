(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.WorryPhysics = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const WIDTH = 800;
  const HEIGHT = 1600;
  const METERS_TO_PIXELS = 420;
  const GRAVITY = 9.80665;
  const MAX_SPEED = 6.5 * METERS_TO_PIXELS;
  const AIR_DRAG = 0.12;
  const HALF_WIDTH = 150;
  const HALF_HEIGHT = 118;
  const TOP = 150;
  const BOTTOM = 1510;
  const IMPACT_THRESHOLD = 430;

  function create() {
    return { x: 400, y: 800, vx: 0, vy: 0, angle: 0, spin: 0 };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function step(body, input, elapsed) {
    const dt = clamp(elapsed || 0, 0, 0.034);
    const active = Boolean(input && input.active);
    const xForce = clamp(input && input.x || 0, -6, 6);
    const yForce = clamp(input && input.y || 0, -6, 6);
    const acceleration = GRAVITY * METERS_TO_PIXELS;
    body.vx += (active ? xForce * acceleration : 0) * dt;
    body.vy += (active ? -yForce * acceleration : acceleration) * dt;
    const air = Math.exp(-AIR_DRAG * dt);
    body.vx *= air;
    body.vy *= air;
    body.vx = clamp(body.vx, -MAX_SPEED, MAX_SPEED);
    body.vy = clamp(body.vy, -MAX_SPEED, MAX_SPEED);
    body.x += body.vx * dt;
    body.y += body.vy * dt;
    body.spin += (body.vx / 1250 - body.angle * 1.6) * dt * 2.8;
    body.spin *= Math.pow(0.97, dt * 60);
    body.angle = clamp(body.angle + body.spin * dt, -0.42, 0.42);

    const impacts = [];
    const left = HALF_WIDTH;
    const right = WIDTH - HALF_WIDTH;
    const top = TOP + HALF_HEIGHT;
    const bottom = BOTTOM - HALF_HEIGHT;
    if (body.x < left) {
      impacts.push({ edge: "left", speed: Math.abs(body.vx) });
      body.x = left; body.vx = Math.abs(body.vx) * 0.24; body.vy *= 0.88; body.spin += 0.72;
    } else if (body.x > right) {
      impacts.push({ edge: "right", speed: Math.abs(body.vx) });
      body.x = right; body.vx = -Math.abs(body.vx) * 0.24; body.vy *= 0.88; body.spin -= 0.72;
    }
    if (body.y < top) {
      impacts.push({ edge: "top", speed: Math.abs(body.vy) });
      body.y = top; body.vy = Math.abs(body.vy) * 0.2; body.vx *= 0.82; body.spin += body.vx / 1100;
    } else if (body.y > bottom) {
      impacts.push({ edge: "bottom", speed: Math.abs(body.vy) });
      body.y = bottom; body.vy = -Math.abs(body.vy) * 0.18; body.vx *= 0.76; body.spin -= body.vx / 1100;
    }
    return impacts;
  }

  function moveTo(body, x, y) {
    body.x = clamp(x, HALF_WIDTH, WIDTH - HALF_WIDTH);
    body.y = clamp(y, TOP + HALF_HEIGHT, BOTTOM - HALF_HEIGHT);
    body.vx = 0; body.vy = 0;
  }

  function moveHeld(body, x, y, vx = 0, vy = 0) {
    const impacts = [];
    const left = HALF_WIDTH;
    const right = WIDTH - HALF_WIDTH;
    const top = TOP + HALF_HEIGHT;
    const bottom = BOTTOM - HALF_HEIGHT;
    if (x < left && vx < 0) impacts.push({ edge: "left", speed: Math.abs(vx), held: true });
    else if (x > right && vx > 0) impacts.push({ edge: "right", speed: Math.abs(vx), held: true });
    if (y < top && vy < 0) impacts.push({ edge: "top", speed: Math.abs(vy), held: true });
    else if (y > bottom && vy > 0) impacts.push({ edge: "bottom", speed: Math.abs(vy), held: true });
    body.x = clamp(x, left, right);
    body.y = clamp(y, top, bottom);
    body.vx = 0;
    body.vy = 0;
    body.spin = clamp(vx / MAX_SPEED, -1, 1) * 1.8;
    body.angle = clamp(body.angle + body.spin * 0.018, -0.42, 0.42);
    return impacts;
  }

  function throwBody(body, vx, vy) {
    body.vx = clamp(vx, -MAX_SPEED, MAX_SPEED);
    body.vy = clamp(vy, -MAX_SPEED, MAX_SPEED);
  }

  function contains(body, x, y) {
    return Math.abs(x - body.x) <= HALF_WIDTH && Math.abs(y - body.y) <= HALF_HEIGHT;
  }

  return { WIDTH, HEIGHT, METERS_TO_PIXELS, GRAVITY, MAX_SPEED, IMPACT_THRESHOLD, create, step, moveTo, moveHeld, throwBody, contains };
});
