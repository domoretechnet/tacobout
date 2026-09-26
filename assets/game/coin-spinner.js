/* Coin Spinner: a remake of the 2000s counter coin-drop spinner.
   A clear hexagonal case, a spindle turned by a knob on the lid, orange
   paddles spiralling down it and one yellow paddle at the bottom. A coin that
   comes to rest on the yellow paddle wins.

   Units are metres and seconds so the physics reads like the real toy: the
   case is 24 cm across and 36 cm tall. Everything is drawn in a 2D canvas
   through a small perspective camera; no libraries. */
(() => {
'use strict';

/* ---------- machine geometry ---------- */
const HEX_R = 0.12;                    // glass, centre to corner
const HEX_IN = HEX_R * Math.cos(Math.PI / 6);
const GLASS_H = 0.36;
const BASE_R = 0.136, BASE_H = 0.05;
const LID_R = 0.128, LID_T = 0.013, LID_Y = GLASS_H;
const SPINDLE_R = 0.0065;
const KNOB_R = 0.02, KNOB_H = 0.02;
const PADDLE_T = 0.003;
const FLOOR_Y = 0.013;                 // top of the coin pile, roughly
const G = 9.81;
const DEG = Math.PI / 180;

// Top to bottom. The last one is the yellow winner.
const LEVELS = [0.318, 0.276, 0.234, 0.192, 0.150, 0.110, 0.068];
const PHASE = LEVELS.map((_, i) => (-62 * i + 15) * DEG);
const WIN_LEVEL = LEVELS.length - 1;

const COINS = {
  N: { name: 'Nickel', cents: 5, R: 0.0106, t: 0.00195, prize: 'Cinnamon Twists', code: '22525', metal: 'nickel' },
  D: { name: 'Dime', cents: 10, R: 0.00895, t: 0.00135, prize: 'Crunchy Taco', code: '22100', metal: 'silver', reeded: true },
  Q: { name: 'Quarter', cents: 25, R: 0.01213, t: 0.00175, prize: 'Bean Burrito', code: '22200', metal: 'silver', reeded: true },
  P: { name: 'Penny', cents: 1, R: 0.0095, t: 0.00152, metal: 'copper' },
};
for (const k in COINS) COINS[k].key = k;

// Three slots in an arc in front of the knob, cut along the arc.
const SLOTS = [-48, 0, 48].map(d => {
  const a = (90 + d) * DEG, r = 0.072;
  return { x: r * Math.cos(a), z: r * Math.sin(a), a };
});

/* A paddle is a swept propeller blade: narrow neck at the spindle, widening
   to a rounded tip that just clears the flat walls. Built along +x. */
function bladeShape(wide) {
  const pts = [], side = [];
  const x0 = 0.004, x1 = wide ? 0.064 : 0.07, tip = wide ? 0.04 : 0.034;
  const N = 14;
  for (let i = 0; i <= N; i++) {
    const t = i / N, x = x0 + (x1 - x0) * t;
    const s = Math.min(1, t / 0.9), w = 0.0058 + (tip - 0.0058) * (s * s * (3 - 2 * s));
    side.push([x, w]);
  }
  for (const [x, w] of side) pts.push([x, -w]);
  for (let i = 1; i < 12; i++) {
    const a = -Math.PI / 2 + Math.PI * i / 12;
    pts.push([x1 + tip * 0.95 * Math.cos(a), tip * Math.sin(a)]);
  }
  for (let i = side.length - 1; i >= 0; i--) pts.push([side[i][0], side[i][1]]);
  // sweep: bend the blade backwards the further out it goes
  return pts.map(([x, z]) => {
    const b = -0.32 * (x / 0.1) ** 1.5, c = Math.cos(b), s = Math.sin(b);
    return [x * c - z * s, x * s + z * c];
  });
}
const BLADES = LEVELS.map((_, i) => bladeShape(i === WIN_LEVEL));

/* ---------- small maths ---------- */
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
function rot(x, z, a) { const c = Math.cos(a), s = Math.sin(a); return [x * c - z * s, x * s + z * c]; }
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rand = Math.random;

function insidePoly(poly, x, z) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
// nearest point on the outline and the distance to it
function nearestOnPoly(poly, x, z) {
  let best = Infinity, bx = 0, bz = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, az] = poly[j], [cx, cz] = poly[i];
    const dx = cx - ax, dz = cz - az, L = dx * dx + dz * dz;
    const t = L ? clamp(((x - ax) * dx + (z - az) * dz) / L, 0, 1) : 0;
    const px = ax + dx * t, pz = az + dz * t, d = (x - px) ** 2 + (z - pz) ** 2;
    if (d < best) { best = d; bx = px; bz = pz; }
  }
  return [Math.sqrt(best), bx, bz];
}

// Outward normals of the six glass walls (flat side toward the viewer).
const WALLS = [0, 1, 2, 3, 4, 5].map(k => { const a = (30 + 60 * k) * DEG; return [Math.cos(a), Math.sin(a)]; });
const hexPt = (r, k, y) => { const a = k * 60 * DEG; return [r * Math.cos(a), y, r * Math.sin(a)]; };

/* ---------- state ---------- */
const spin = { th: 0, om: 0, al: 0, target: 0, hold: 0, clock: 0, kicks: [], shakeK: 0.9 };
let coins = [];
let pile = [];
let ready = false;   // set once everything is built; resize() only draws after that
let stats = { dropped: 0, wins: 0, cents: 0, prize: 0, unpriced: 0 };
let selected = 'D';
let prices = {};
let dash = null;          // the site's dashboard.json, for the price facts
const wonWith = new Set(); // coins that have already won once this visit

/* ---------- physics ---------- */
const MU_S = 0.42, MU_K = 0.3;
const K_SPRING = 320, C_SPRING = 2 * Math.sqrt(320);

function stepSpindle(dt) {
  if (spin.hold) spin.target += spin.hold * dt;
  spin.clock += dt;
  while (spin.kicks.length && spin.kicks[0].at <= spin.clock) spin.target += spin.kicks.shift().d;
  const a = K_SPRING * (spin.target - spin.th) - C_SPRING * spin.om;
  spin.al = a;
  spin.om += a * dt;
  spin.th += spin.om * dt;
}

function dropCoin(slot, kind) {
  const s = SLOTS[slot], C = COINS[kind];
  const tang = [-Math.sin(s.a), Math.cos(s.a)];
  const j = (rand() - 0.5) * 0.012;
  coins.push({
    kind, C, mode: 'fall',
    p: [s.x + tang[0] * j, LID_Y + LID_T + C.R + 0.004, s.z + tang[1] * j],
    v: [(rand() - 0.5) * 0.06, -0.25, (rand() - 0.5) * 0.06],
    // standing on edge in the slot; normal points out of the slot's plane
    n: [Math.cos(s.a), 0, Math.sin(s.a)], tumble: [tang[0], 0, tang[1]], tumbleRate: (rand() - 0.5) * 14,
    level: -1, skip: -1, skipT: 0, still: 0, won: false, age: 0, stuckT: 0, tex: (rand() * 8) | 0,
  });
  stats.dropped++; stats.cents += C.cents;
  sfx.slide();
}

function rotateVec(v, axis, ang) { // Rodrigues
  const c = Math.cos(ang), s = Math.sin(ang), [x, y, z] = v, [a, b, d] = axis;
  const dot = x * a + y * b + z * d;
  return [x * c + (b * z - d * y) * s + a * dot * (1 - c), y * c + (d * x - a * z) * s + b * dot * (1 - c), z * c + (a * y - b * x) * s + d * dot * (1 - c)];
}
function norm3(v) { const L = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / L, v[1] / L, v[2] / L]; }

function stepFall(c, dt) {
  const C = c.C, p = c.p, v = c.v, y0 = p[1];
  v[1] -= G * dt;
  const drag = 1 - 0.25 * dt; v[0] *= drag; v[2] *= drag;
  p[0] += v[0] * dt; p[1] += v[1] * dt; p[2] += v[2] * dt;
  c.n = norm3(rotateVec(c.n, c.tumble, c.tumbleRate * dt));
  if (c.skipT > 0) c.skipT -= dt; else c.skip = -1;

  // glass walls (a tumbling coin reaches about 0.6 R sideways)
  const lim = HEX_IN - C.R * 0.6;
  for (const [nx, nz] of WALLS) {
    const d = p[0] * nx + p[2] * nz;
    if (d > lim) {
      p[0] -= (d - lim) * nx; p[2] -= (d - lim) * nz;
      const vn = v[0] * nx + v[2] * nz;
      if (vn > 0) {
        v[0] -= 1.4 * vn * nx; v[2] -= 1.4 * vn * nz;
        v[0] *= 0.85; v[2] *= 0.85;
        if (vn > 0.12) sfx.glass(vn, C);
        c.tumbleRate += (rand() - 0.5) * 8;
      }
    }
  }
  // spindle
  const rr = Math.hypot(p[0], p[2]), rmin = SPINDLE_R + C.R * 0.45;
  if (rr < rmin && y0 < LID_Y) {
    const ux = rr ? p[0] / rr : 1, uz = rr ? p[2] / rr : 0;
    p[0] = ux * rmin; p[2] = uz * rmin;
    const vr = v[0] * ux + v[2] * uz;
    if (vr < 0) { v[0] -= 1.4 * vr * ux; v[2] -= 1.4 * vr * uz; if (vr < -0.1) sfx.tick(-vr); }
  }
  // paddles: did the coin's underside cross a paddle's top this step?
  const half = C.t / 2;
  for (let i = 0; i < LEVELS.length; i++) {
    const yT = LEVELS[i] + half;
    if (!(y0 >= yT && p[1] < yT) || i === c.skip) continue;
    const ang = spin.th + PHASE[i];
    const [bx, bz] = rot(p[0], p[2], -ang);
    const poly = BLADES[i];
    if (insidePoly(poly, bx, bz)) {
      const vy = -v[1];
      p[1] = yT;
      sfx.paddle(vy, i === WIN_LEVEL, C, vy <= 0.45);
      buzz(8);
      const tilt = Math.abs(c.n[1]);          // 1 = flat, 0 = on edge
      if (vy > 0.45) {
        // bounce: flat landings are dead, edge landings kick sideways
        v[1] = vy * (0.12 + 0.2 * (1 - tilt));
        const k = (1 - tilt) * 0.22 + 0.04;
        const hx = c.n[0], hz = c.n[2], hl = Math.hypot(hx, hz) || 1;
        v[0] += (hx / hl) * k * (rand() * 2 - 0.4) + (rand() - 0.5) * 0.05;
        v[2] += (hz / hl) * k * (rand() * 2 - 0.4) + (rand() - 0.5) * 0.05;
        c.tumbleRate *= -0.5;
      } else {
        settle(c, i);
      }
      return;
    }
    const [d, nx, nz] = nearestOnPoly(poly, bx, bz);
    if (d < C.R * 0.85) {
      // clipped the paddle's edge: tipped outward, keeps falling
      let ex = bx - nx, ez = bz - nz; const el = Math.hypot(ex, ez) || 1; ex /= el; ez /= el;
      const [wx, wz] = rot(ex, ez, ang);
      const push = (0.18 + 0.35 * (1 - d / C.R)) * Math.max(0.3, -v[1]);
      v[0] += wx * push; v[2] += wz * push; v[1] *= 0.75;
      c.tumble = norm3([-wz, 0, wx]); c.tumbleRate = (rand() < 0.5 ? -1 : 1) * (10 + rand() * 12);
      c.skip = i; c.skipT = 0.08;
      sfx.tick(-v[1]);
    }
  }
  if (p[1] < FLOOR_Y + half) toPile(c);
}

function settle(c, i) {
  c.mode = 'rest'; c.level = i;
  const [lx, lz] = rot(c.p[0], c.p[2], -spin.th);
  const [vx, vz] = rot(c.v[0], c.v[2], -spin.th);
  c.l = [lx, lz];
  // velocity relative to the turning paddle, damped by the impact
  c.lv = [(vx + spin.om * lz) * 0.55, (vz - spin.om * lx) * 0.55];
  c.v = [0, 0, 0];
  c.n = [0, 1, 0]; c.wob = 0.35; c.still = 0;
}

function stepRest(c, dt) {
  const C = c.C, [lx, lz] = c.l, om = spin.om, al = spin.al;
  let [vx, vz] = c.lv;
  // what a rider on a turning plate feels: centrifugal, Euler, Coriolis
  let ax = om * om * lx + al * lz + 2 * om * vz;
  let az = om * om * lz - al * lx - 2 * om * vx;
  // a sharp twist rattles the acrylic: the coin hops, loses its grip and jostles
  const rattle = clamp((Math.abs(al) - 40) / 360, 0, 1);
  if (rattle > 0) { const j = rattle * 1.2 * dt; vx += (rand() - 0.5) * j * 60; vz += (rand() - 0.5) * j * 60; }
  const muS = MU_S * (1 - 0.6 * rattle);
  const sp = Math.hypot(vx, vz);
  if (sp < 0.004) {
    const af = Math.hypot(ax, az);
    if (af < muS * G) { vx = vz = 0; ax = az = 0; }
    else { ax -= MU_K * G * ax / af; az -= MU_K * G * az / af; }
  } else {
    ax -= MU_K * G * vx / sp; az -= MU_K * G * vz / sp;
    // friction alone would reverse a slow coin; stop it instead
    if (Math.hypot(vx + ax * dt, vz + az * dt) > sp && Math.hypot(ax, az) < MU_S * G * 0.5) { ax = az = 0; vx *= 0.5; vz *= 0.5; }
  }
  vx += ax * dt; vz += az * dt;
  let nx = lx + vx * dt, nz = lz + vz * dt;

  // the glass does not turn; it scrapes a coin along the paddle
  let [wx, wz] = rot(nx, nz, spin.th);
  const lim = HEX_IN - C.R;
  let hit = 0;
  for (const [ux, uz] of WALLS) {
    const d = wx * ux + wz * uz;
    if (d > lim) { wx -= (d - lim) * ux; wz -= (d - lim) * uz; hit = Math.max(hit, d - lim); }
  }
  if (hit) {
    const [bx, bz] = rot(wx, wz, -spin.th);
    vx = (bx - lx) / dt; vz = (bz - lz) / dt;
    nx = bx; nz = bz;
    if (hit > 0.0004) sfx.scrape();
  }
  const rr = Math.hypot(nx, nz), rmin = SPINDLE_R + C.R;
  if (rr < rmin) { nx *= rmin / (rr || 1); nz *= rmin / (rr || 1); vx *= 0.3; vz *= 0.3; }
  c.l = [nx, nz]; c.lv = [vx, vz];

  const ang = PHASE[c.level];
  const [bx, bz] = rot(nx, nz, -ang);
  const [w2x, w2z] = rot(nx, nz, spin.th);
  c.p = [w2x, LEVELS[c.level] + C.t / 2, w2z];
  c.wob = Math.max(0, (c.wob || 0) - dt * 1.6);

  if (!insidePoly(BLADES[c.level], bx, bz)) {
    // over the edge: tip off and fall, carrying the paddle's motion
    const tvx = vx - om * nz, tvz = vz + om * nx;
    const [gvx, gvz] = rot(tvx, tvz, spin.th);
    c.mode = 'fall';
    c.v = [gvx, -0.02, gvz];
    const hl = Math.hypot(gvx, gvz) || 1;
    c.tumble = [-gvz / hl, 0, gvx / hl]; c.tumbleRate = 9 + rand() * 9;
    c.skip = c.level; c.skipT = 0.12; c.level = -1;
    c.still = 0;
    return;
  }
  const moving = Math.hypot(vx, vz) > 0.002 || Math.abs(om) > 0.35;
  c.still = moving ? 0 : c.still + dt;
  // a quarter second of stillness is enough to know it has settled, not slid through
  if (c.level === WIN_LEVEL && !c.won && c.still > 0.25) win(c);
  if (c.level !== WIN_LEVEL) c.stuckT += dt;
}

function toPile(c) {
  c.mode = 'gone';
  const r = rng((rand() * 1e9) | 0);
  addPileCoin(c.kind, c.p[0], c.p[2], r);
  pileDirty = true;
  sfx.pile(c.C, Math.abs(c.v[1]));
  if (!coins.some(o => o !== c && o.mode !== 'gone')) toast(`Missed. The ${c.C.name.toLowerCase()} fell to the bottom.`);
}

function physics(dt) {
  const n = Math.max(1, Math.ceil(dt / (1 / 480)));
  const h = dt / n;
  for (let k = 0; k < n; k++) {
    stepSpindle(h);
    for (const c of coins) {
      if (c.mode === 'fall') stepFall(c, h);
      else if (c.mode === 'rest') stepRest(c, h);
    }
  }
  for (const c of coins) c.age += dt;
  coins = coins.filter(c => c.mode !== 'gone');
  const stuck = coins.find(c => c.mode === 'rest' && c.level !== WIN_LEVEL && c.stuckT > 2.2 && !c.hinted);
  if (stuck) { stuck.hinted = true; toast('Stuck on a paddle. Twist the knob to shake it loose.'); }
}

/* ---------- coin pile on the floor ---------- */
function addPileCoin(kind, x, z, r) {
  const C = COINS[kind];
  const lim = HEX_IN - C.R * 0.8;
  for (const [nx, nz] of WALLS) { const d = x * nx + z * nz; if (d > lim) { x -= (d - lim) * nx; z -= (d - lim) * nz; } }
  const h = 0.002 + 0.011 * Math.max(0, 1 - Math.hypot(x, z) / HEX_IN) ** 0.8 + r() * 0.004;
  const tx = (r() - 0.5) * 0.5, tz = (r() - 0.5) * 0.5;
  pile.push({ kind, C, p: [x, h, z], n: norm3([tx, 1, tz]), tex: (r() * 8) | 0, turn: r() * 6.28, glint: r() < 0.06 ? 0.35 + r() * 0.4 : 0 });
}
function seedPile() {
  const r = rng(20031977);
  const kinds = ['P', 'P', 'P', 'P', 'P', 'D', 'D', 'N', 'N', 'Q'];
  for (let i = 0; i < 380; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * HEX_IN * 0.98;
    addPileCoin(kinds[(r() * kinds.length) | 0], d * Math.cos(a), d * Math.sin(a), r);
  }
}

/* ---------- camera ---------- */
const cam = { E: [0.1, 0.5, 0.8], T: [0, 0.17, 0], F: 1, cx: 0, cy: 0 };
function setupCam() {
  const [ex, ey, ez] = cam.E, [tx, ty, tz] = cam.T;
  const f = norm3([tx - ex, ty - ey, tz - ez]);
  const up = [0, 1, 0];
  const rx = f[1] * up[2] - f[2] * up[1], ry = f[2] * up[0] - f[0] * up[2], rz = f[0] * up[1] - f[1] * up[0];
  const R = norm3([rx, ry, rz]);
  const U = [R[1] * f[2] - R[2] * f[1], R[2] * f[0] - R[0] * f[2], R[0] * f[1] - R[1] * f[0]];
  cam.f = f; cam.r = R; cam.u = U;
}
let MIRROR_Y = null;   // set while drawing a reflection in the counter
function proj(x, y, z) {
  if (MIRROR_Y !== null) y = 2 * MIRROR_Y - y;
  const dx = x - cam.E[0], dy = y - cam.E[1], dz = z - cam.E[2];
  const zc = dx * cam.f[0] + dy * cam.f[1] + dz * cam.f[2];
  const xc = dx * cam.r[0] + dy * cam.r[1] + dz * cam.r[2];
  const yc = dx * cam.u[0] + dy * cam.u[1] + dz * cam.u[2];
  return [cam.cx + cam.F * xc / zc, cam.cy - cam.F * yc / zc, zc];
}
const P = a => proj(a[0], a[1], a[2]);
function fitCam(W, H) {
  // frame the machine, the sign on top and a little counter. On a tall phone screen the width is what
  // limits the size, so frame the lid and glass side to side and let the base's corners run off the edges.
  const tall = H > W * 1.15;
  cam.F = 1; cam.cx = 0; cam.cy = 0;
  const pts = [], wide = [];
  for (let k = 0; k < 6; k++) { (tall ? wide : pts).push(P(hexPt(BASE_R + 0.012, k, -BASE_H - 0.01))); pts.push(P(hexPt(LID_R, k, LID_Y + LID_T))); }
  for (const s of signCorners()) pts.push(P(s));
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  for (const [, y] of wide) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const m = Math.min(W, H) * (tall ? 0.03 : 0.06);
  const S = Math.min((W - 2 * m) / (x1 - x0), (H - 2 * m - H * 0.04) / (y1 - y0));
  cam.F = S;
  cam.cx = W / 2 - S * (x0 + x1) / 2;
  cam.cy = H / 2 - S * (y0 + y1) / 2 - H * 0.015;
}

/* ---------- drawing helpers ---------- */
function poly(ctx, pts) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); }
const facing = (cx, cy, cz, nx, ny, nz) => (cam.E[0] - cx) * nx + (cam.E[1] - cy) * ny + (cam.E[2] - cz) * nz > 0;

function signCorners() {
  // a tent card standing in a holder on the lid, behind the knob
  const y0 = LID_Y + LID_T + 0.006, y1 = y0 + 0.1, z = -0.05, w = 0.085;
  return [[-w, y1, z - 0.012], [w, y1, z - 0.012], [w, y0, z], [-w, y0, z]];
}

// Soft-focus shapes: drawn off the canvas so only their blurred shadow lands.
// Works in every browser, where ctx.filter does not.
function soft(ctx, blur, color, path) {
  ctx.save();
  ctx.shadowColor = color; ctx.shadowBlur = blur * dpr; ctx.shadowOffsetX = 10000 * dpr;
  ctx.translate(-10000, 0); ctx.fillStyle = color; path(ctx); ctx.fill();
  ctx.restore();
}
const rectPath = (x, y, w, h) => c => { c.beginPath(); c.rect(x, y, w, h); };
const circPath = (x, y, r) => c => { c.beginPath(); c.arc(x, y, r, 0, 7); };

// The photographic backdrop (generated with ChatGPT, GPT-6 Astra, 2026-09-25).
// Its counter's back edge sits 51% down the picture; that line is laid on the
// game's own counter line. Until it loads, or if it never does, the drawn
// scene below stands in.
const SCENE = new Image();
const SCENE_EDGE = 0.51;
SCENE.onload = () => { bgLayer = null; frontLayer = null; pileDirty = true; };

// A heavily blurred copy of the room, for reflections in the glass, the lid
// and the glossy base. Shrinking to 48 px and scaling back up is the blur.
let SCENE_BLUR = null;
function sceneBlur() {
  if (SCENE_BLUR || !(SCENE.complete && SCENE.naturalWidth)) return SCENE_BLUR;
  const c = document.createElement('canvas'); c.width = 48; c.height = 32;
  c.getContext('2d').drawImage(SCENE, 0, 0, 48, 32);
  const c2 = document.createElement('canvas'); c2.width = 192; c2.height = 128;
  const x = c2.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(c, 0, 0, 192, 128);
  return (SCENE_BLUR = c2);
}
// Lay the room, mirrored, over a surface. `box` is where the picture is
// stretched: the whole canvas for the glass (one continuous reflection
// across its faces), or just the face for small parts.
function reflect(ctx, pts, alpha, box, op = 'screen') {
  const img = sceneBlur(); if (!img) return;
  ctx.save(); poly(ctx, pts); ctx.clip();
  ctx.globalAlpha = alpha; ctx.globalCompositeOperation = op;
  const [bx, by, bw, bh] = box || (() => {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    return [x0, y0, x1 - x0, y1 - y0];
  })();
  ctx.translate(bx + bw, by); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0, bw, bh);
  ctx.restore();
}
SCENE.src = 'assets/game/scene.webp?v=2';

function drawPhotoBackground(ctx, W, H) {
  const horizon = P([0, -BASE_H, -0.55])[1];
  const iw = SCENE.naturalWidth, ih = SCENE.naturalHeight;
  // big enough to cover the width, the wall above the line and the counter below it
  const s = Math.max(W / iw, horizon / (SCENE_EDGE * ih), (H - horizon) / ((1 - SCENE_EDGE) * ih));
  ctx.drawImage(SCENE, (W - iw * s) / 2, horizon - SCENE_EDGE * ih * s, iw * s, ih * s);
  // contact shadow under the base
  const c = P([0, -BASE_H, 0]);
  const sx = Math.abs(P([BASE_R * 1.5, -BASE_H, 0])[0] - c[0]);
  ctx.save(); ctx.translate(c[0], c[1] + sx * 0.06); ctx.scale(1, 0.3);
  const shg = ctx.createRadialGradient(0, 0, sx * 0.3, 0, 0, sx * 1.15);
  shg.addColorStop(0, 'rgba(25,10,4,.6)'); shg.addColorStop(1, 'rgba(25,10,4,0)');
  ctx.fillStyle = shg; ctx.beginPath(); ctx.arc(0, 0, sx * 1.15, 0, 7); ctx.fill(); ctx.restore();
}

function drawBackground(ctx, W, H) {
  if (SCENE.complete && SCENE.naturalWidth) return drawPhotoBackground(ctx, W, H);
  const r = rng(7);
  const horizon = P([0, -BASE_H, -0.55])[1];
  const bl = Math.max(4, W * 0.012);           // background blur
  // wall, lit warm from above
  const g = ctx.createLinearGradient(0, 0, 0, horizon);
  g.addColorStop(0, '#12102f'); g.addColorStop(0.5, '#1e194f'); g.addColorStop(1, '#2d2463');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, horizon + 1);

  // menu boards: a dark band of backlit panels, too far away to read
  const mb0 = horizon * 0.07, mb1 = horizon * 0.44;
  soft(ctx, bl * 2, 'rgba(160,80,200,.35)', rectPath(-20, mb0 - 12, W + 40, mb1 - mb0 + 24));
  soft(ctx, bl, '#101117', rectPath(-20, mb0, W + 40, mb1 - mb0));
  const panels = Math.max(3, Math.round(W / 190));
  const pw = W / panels;
  const foods = [['#f4b73f', '#c9571f'], ['#8fbf3c', '#e8d9a8'], ['#d8452b', '#f2c14e'], ['#f0e0b4', '#b5652b'], ['#413b92', '#f28c28']];
  for (let i = 0; i < panels; i++) {
    const x0 = i * pw + pw * 0.06, w = pw * 0.88, y0 = mb0 + (mb1 - mb0) * 0.1, h = (mb1 - mb0) * 0.8;
    soft(ctx, bl * 0.8, 'rgba(250,240,225,.92)', rectPath(x0, y0, w, h));
    const [c1, c2] = foods[(i + 2) % foods.length];
    // a food photo on each panel, and lines of prices below it
    soft(ctx, bl * 1.1, c1, c => { c.beginPath(); c.ellipse(x0 + w * 0.36, y0 + h * 0.36, w * 0.24, h * 0.18, 0, 0, 7); });
    soft(ctx, bl * 1.1, c2, c => { c.beginPath(); c.ellipse(x0 + w * 0.62, y0 + h * 0.3, w * 0.16, h * 0.14, 0, 0, 7); });
    soft(ctx, bl * 0.9, '#4338ca', rectPath(x0 + w * 0.08, y0 + h * 0.06, w * 0.5, h * 0.07));
    for (let k = 0; k < 3; k++) soft(ctx, bl * 0.7, 'rgba(40,30,45,.55)', rectPath(x0 + w * 0.1, y0 + h * (0.64 + k * 0.1), w * (0.5 + r() * 0.3), h * 0.035));
  }
  // pendant lamps and their glow
  for (const fx of [0.16, 0.52, 0.86]) {
    const lx = W * fx, ly = horizon * 0.02, lr = Math.max(10, W * 0.04);
    const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, lr * 6);
    glow.addColorStop(0, 'rgba(255,200,120,.45)'); glow.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = glow; ctx.fillRect(lx - lr * 6, ly - lr * 6, lr * 12, lr * 12);
    soft(ctx, bl, 'rgba(255,226,170,.95)', circPath(lx, ly, lr));
  }
  // back counter: brushed stainless with blurred cups and equipment
  const sb0 = horizon * 0.5, band = Math.max(8, horizon * 0.09), sb1 = horizon - band;
  const sg = ctx.createLinearGradient(0, sb0, 0, sb1);
  sg.addColorStop(0, '#6a6c78'); sg.addColorStop(0.5, '#9899a3'); sg.addColorStop(1, '#565863');
  soft(ctx, bl, '#797b86', rectPath(-20, sb0, W + 40, sb1 - sb0 + 4));
  ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = sg; ctx.fillRect(0, sb0 + bl, W, sb1 - sb0 - bl + 2); ctx.restore();
  for (let i = 0; i < 9; i++) soft(ctx, bl, 'rgba(255,255,255,.22)', rectPath(r() * W, sb0, 3 + r() * 10, sb1 - sb0));
  for (let i = 0; i < Math.round(W / 60); i++) {
    const cx = r() * W, cw = 10 + r() * 16, ch = (sb1 - sb0) * (0.35 + r() * 0.4);
    const col = ['#d8342a', '#f1ece4', '#e9a23b', '#4338ca', '#2a2b35'][(r() * 5) | 0];
    soft(ctx, bl * 1.2, col, rectPath(cx, sb1 - ch, cw, ch));
  }
  // orange tile backsplash right behind our counter
  ctx.fillStyle = '#d9692a'; ctx.fillRect(0, horizon - band, W, band);
  ctx.fillStyle = 'rgba(255,255,255,.14)';
  for (let x = -((W / 2) % band); x < W; x += band) ctx.fillRect(x, horizon - band, 1, band);
  ctx.fillRect(0, horizon - band, W, 1);
  // out-of-focus lights scattered on the wall
  for (let i = 0; i < 26; i++) {
    const bx = r() * W, by = r() * (horizon * 0.95), br = 3 + r() * Math.max(6, W * 0.02);
    const bg = ctx.createRadialGradient(bx, by, 0, bx, by, br);
    const a = 0.06 + r() * 0.14;
    bg.addColorStop(0, `rgba(255,${190 + (r() * 50 | 0)},140,${a})`); bg.addColorStop(0.8, `rgba(255,200,150,${a * 0.7})`); bg.addColorStop(1, 'rgba(255,200,150,0)');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(bx, by, br, 0, 7); ctx.fill();
  }

  // counter: warm granite laminate
  const cg = ctx.createLinearGradient(0, horizon, 0, H);
  cg.addColorStop(0, '#a8927a'); cg.addColorStop(0.35, '#c4ae94'); cg.addColorStop(1, '#9e8568');
  ctx.fillStyle = cg; ctx.fillRect(0, horizon, W, H - horizon);
  for (let i = 0; i < 70; i++) {
    const x = r() * W, y = horizon + r() * (H - horizon), sc = 0.4 + (y - horizon) / (H - horizon);
    const rr = (10 + r() * 40) * sc, light = r() < 0.5;
    ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.4);
    const mg = ctx.createRadialGradient(0, 0, 0, 0, 0, rr);
    mg.addColorStop(0, light ? 'rgba(255,245,225,.1)' : 'rgba(70,45,25,.1)'); mg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(0, 0, rr, 0, 7); ctx.fill(); ctx.restore();
  }
  const dots = Math.floor(W * (H - horizon) / 70);
  for (let i = 0; i < dots; i++) {
    const x = r() * W, y = horizon + r() * (H - horizon), k = r();
    ctx.fillStyle = k < 0.4 ? 'rgba(60,40,28,.4)' : k < 0.75 ? 'rgba(255,248,235,.4)' : 'rgba(130,95,60,.45)';
    const s = (0.35 + r() * 0.8) * (0.45 + (y - horizon) / (H - horizon));
    ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.55, 0, 0, 7); ctx.fill();
  }
  // ceiling lights reflected in the glossy top
  for (const fx of [0.16, 0.52, 0.86]) {
    const rx = W * fx, ry = horizon + (H - horizon) * 0.12;
    ctx.save(); ctx.translate(rx, ry); ctx.scale(1, 0.28);
    const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 0.18);
    rg.addColorStop(0, 'rgba(255,240,215,.22)'); rg.addColorStop(1, 'rgba(255,240,215,0)');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, 0, W * 0.18, 0, 7); ctx.fill(); ctx.restore();
  }
  // where the counter meets the backsplash
  ctx.fillStyle = 'rgba(30,15,8,.45)'; ctx.fillRect(0, horizon, W, 2);
  ctx.fillStyle = 'rgba(255,240,220,.25)'; ctx.fillRect(0, horizon + 2, W, 1);
  // the counter's front edge, when the view reaches it
  const fe = P([0, -BASE_H, 0.36])[1];
  if (fe < H) {
    ctx.fillStyle = '#c9cbd1'; ctx.fillRect(0, fe, W, 3);
    const fg = ctx.createLinearGradient(0, fe + 3, 0, H);
    fg.addColorStop(0, '#211c5a'); fg.addColorStop(1, '#120f33');
    ctx.fillStyle = fg; ctx.fillRect(0, fe + 3, W, H - fe);
  }

  // contact shadow under the base
  const c = P([0, -BASE_H, 0]);
  const sx = Math.abs(P([BASE_R * 1.5, -BASE_H, 0])[0] - c[0]);
  ctx.save(); ctx.translate(c[0], c[1] + sx * 0.08); ctx.scale(1, 0.34);
  const shg = ctx.createRadialGradient(0, 0, sx * 0.3, 0, 0, sx * 1.1);
  shg.addColorStop(0, 'rgba(20,8,4,.55)'); shg.addColorStop(1, 'rgba(20,8,4,0)');
  ctx.fillStyle = shg; ctx.beginPath(); ctx.arc(0, 0, sx * 1.1, 0, 7); ctx.fill(); ctx.restore();

  // things left on the counter: sauce packets and a couple of coins
  drawPacket(ctx, -0.215, 0.09, 22, '#e4572e', 'HOT');
  drawPacket(ctx, -0.2, 0.165, -38, '#f3a712', 'MILD');
  drawPacket(ctx, 0.225, 0.115, 64, '#b3001b', 'HOT');
  const y = -BASE_H + 0.0008;
  drawCoin(ctx, COINS.P, [0.19, y, 0.2], [0, 1, 0], 2, 1.2);
  drawCoin(ctx, COINS.D, [-0.165, y, 0.23], [0, 1, 0], 1, 0.4);
}

function drawPacket(ctx, x, z, deg, color, label) {
  const a = deg * DEG, ca = Math.cos(a), sa = Math.sin(a), hw = 0.03, hd = 0.019, y = -BASE_H + 0.0012;
  const at = (u, v) => P([x + u * ca - v * sa, y, z + u * sa + v * ca]);
  const q = [at(-hw, -hd), at(hw, -hd), at(hw, hd), at(-hw, hd)];
  // shadow, body, crimped ends, a shine and the label
  const sq = q.map(([px, py]) => [px + 2, py + 2]);
  poly(ctx, sq); ctx.fillStyle = 'rgba(40,20,10,.25)'; ctx.fill();
  poly(ctx, q); ctx.fillStyle = color; ctx.fill();
  for (const s of [-1, 1]) {
    const e = [at(s * hw, -hd), at(s * hw * 0.8, -hd), at(s * hw * 0.8, hd), at(s * hw, hd)];
    poly(ctx, e); ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fill();
  }
  const sh = [at(-hw * 0.8, -hd * 0.9), at(hw * 0.8, -hd * 0.9), at(hw * 0.8, -hd * 0.45), at(-hw * 0.8, -hd * 0.45)];
  poly(ctx, sh); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fill();
  // label laid on the packet in centimetres (a 1 cm step keeps the map local)
  const [o, ux, vy] = [at(0, 0), at(0.01, 0), at(0, 0.01)];
  const k = 1;
  ctx.save();
  ctx.transform((ux[0] - o[0]) * k, (ux[1] - o[1]) * k, (vy[0] - o[0]) * k, (vy[1] - o[1]) * k, o[0], o[1]);
  ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.font = '800 1.9px Outfit, Arial, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, 0, 0.1);
  ctx.restore();
  poly(ctx, q); ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 0.8; ctx.stroke();
}

function drawBase(ctx, sidesOnly) {
  const top = [], bot = [], lip = [];
  for (let k = 0; k < 6; k++) { top.push(hexPt(BASE_R, k, 0)); bot.push(hexPt(BASE_R + 0.006, k, -BASE_H)); lip.push(hexPt(BASE_R + 0.006, k, -BASE_H + 0.012)); }
  for (let k = 0; k < 6; k++) {
    const k2 = (k + 1) % 6, a = (30 + 60 * k) * DEG;
    if (!facing(0, -0.02, 0, Math.cos(a) * 1, 0, Math.sin(a))) continue;
    const light = 0.5 + 0.5 * Math.cos(a - 60 * DEG);
    // lower plinth
    poly(ctx, [P(lip[k]), P(lip[k2]), P(bot[k2]), P(bot[k])]);
    ctx.fillStyle = `rgb(${14 + light * 22},${13 + light * 20},${16 + light * 24})`; ctx.fill();
    // upper body
    poly(ctx, [P(top[k]), P(top[k2]), P(lip[k2]), P(lip[k])]);
    const p0 = P(top[k]), p1 = P(lip[k]);
    const g = ctx.createLinearGradient(0, p0[1], 0, p1[1]);
    g.addColorStop(0, `rgb(${40 + light * 40},${38 + light * 38},${46 + light * 44})`);
    g.addColorStop(0.2, `rgb(${22 + light * 26},${21 + light * 24},${26 + light * 28})`);
    g.addColorStop(1, `rgb(${10 + light * 12},${10 + light * 12},${12 + light * 14})`);
    ctx.fillStyle = g; ctx.fill();
    reflect(ctx, [P(top[k]), P(top[k2]), P(lip[k2]), P(lip[k])], 0.07 + 0.07 * light);
    ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1; ctx.stroke();
  }
  if (sidesOnly) return;
  // top rim of the base around the glass
  poly(ctx, top.map(P)); ctx.fillStyle = '#1b1a20'; ctx.fill();
  const inner = []; for (let k = 0; k < 6; k++) inner.push(P(hexPt(HEX_R + 0.002, k, 0)));
  poly(ctx, inner); ctx.fillStyle = '#0b0c0f'; ctx.fill();
}

function drawGlassBack(ctx) {
  for (let k = 0; k < 6; k++) {
    const a = (30 + 60 * k) * DEG;
    if (facing(0, 0.18, 0, Math.cos(a), 0, Math.sin(a))) continue;
    const q = [hexPt(HEX_R, k, 0), hexPt(HEX_R, (k + 1) % 6, 0), hexPt(HEX_R, (k + 1) % 6, GLASS_H), hexPt(HEX_R, k, GLASS_H)].map(P);
    poly(ctx, q);
    ctx.fillStyle = 'rgba(200,225,255,.07)'; ctx.fill();
    ctx.strokeStyle = 'rgba(230,240,255,.28)'; ctx.lineWidth = 1; ctx.stroke();
  }
}

/* ---------- coin faces ---------- */
// Each metal gets a handful of faces drawn once at 128 px (lit metal, raised
// rim, an embossed bust or building, lettering, wear and toning), then mapped
// onto a coin in perspective and lit for the angle it is at.
const TEX = 128;
const LIGHT = norm3([-0.45, 1, 0.55]);
const PALETTES = {
  copper: [['#f4b489', '#c9774a', '#8a4a2a'], ['#dc966c', '#a9603b', '#6e3a20'], ['#b27c5a', '#7f4f33', '#4d2e1b'], ['#eaa377', '#b96b41', '#7a4226']],
  nickel: [['#e8e7e1', '#aaa9a2', '#6d6c66'], ['#d4d3cc', '#98978f', '#5f5e58']],
  silver: [['#f8f9fb', '#babec4', '#747980'], ['#eceef1', '#aaafb6', '#686d74']],
};
const WORDS = { copper: ['LIBERTY', 'ONE CENT'], nickel: ['IN GOD WE TRUST', 'FIVE CENTS'], silver: ['LIBERTY', 'UNITED STATES OF AMERICA'] };
const hexRGB = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const metalOf = C => C.metal;

function bustPath(x) {
  x.beginPath();
  x.moveTo(-26, 38); x.quadraticCurveTo(-19, 23, -8, 20); x.lineTo(-9, 10);
  x.quadraticCurveTo(-15, 8, -16, 2); x.lineTo(-19, -3); x.lineTo(-24, -8); x.lineTo(-18, -12);
  x.quadraticCurveTo(-18, -31, 2, -32); x.quadraticCurveTo(25, -30, 24, -8);
  x.quadraticCurveTo(24, 8, 12, 14); x.lineTo(14, 22); x.quadraticCurveTo(27, 26, 33, 38); x.closePath();
}
function buildingPath(x) {
  x.beginPath();
  x.rect(-32, 16, 64, 6); x.rect(-27, 8, 54, 8);
  for (let i = 0; i < 6; i++) x.rect(-23 + i * 9, -8, 4, 16);
  x.moveTo(-28, -8); x.lineTo(0, -20); x.lineTo(28, -8); x.closePath();
  x.moveTo(-11, -18); x.arc(0, -18, 11, Math.PI, 0); x.closePath();
}
function emboss(x, path, fill) {
  x.save(); x.translate(1.4, 1.7); path(x); x.fillStyle = 'rgba(0,0,0,.38)'; x.fill(); x.restore();
  x.save(); x.translate(-1.1, -1.3); path(x); x.fillStyle = 'rgba(255,255,255,.5)'; x.fill(); x.restore();
  path(x); x.fillStyle = fill; x.fill();
}
function arcText(x, text, r, from, to, size, fill) {
  x.font = `700 ${size}px Outfit, Arial, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  const step = (to - from) / Math.max(1, text.length - 1);
  for (const [dx, dy, col] of [[1, 1.2, 'rgba(0,0,0,.35)'], [-0.8, -0.9, 'rgba(255,255,255,.45)'], [0, 0, fill]]) {
    x.fillStyle = col;
    for (let i = 0; i < text.length; i++) {
      const a = from + step * i;
      x.save(); x.translate(Math.cos(a) * r + dx, Math.sin(a) * r + dy); x.rotate(a + Math.PI / 2); x.fillText(text[i], 0, 0); x.restore();
    }
  }
}
function makeFace(metal, pal, seed, tails) {
  const cv = document.createElement('canvas'); cv.width = cv.height = TEX;
  const x = cv.getContext('2d'), r = rng(seed), R = TEX / 2;
  x.translate(R, R);
  const g = x.createRadialGradient(-R * 0.35, -R * 0.4, R * 0.08, 0, 0, R * 1.05);
  g.addColorStop(0, pal[0]); g.addColorStop(0.55, pal[1]); g.addColorStop(1, pal[2]);
  x.beginPath(); x.arc(0, 0, R, 0, 7); x.fillStyle = g; x.fill();
  x.save(); x.clip();
  // toning and grime blotches, heavier on copper
  const blotches = metal === 'copper' ? 9 : 4;
  for (let i = 0; i < blotches; i++) {
    const bx = (r() - 0.5) * TEX, by = (r() - 0.5) * TEX, br = 8 + r() * 26;
    const bg = x.createRadialGradient(bx, by, 0, bx, by, br);
    const dark = metal === 'copper' ? 'rgba(60,25,10,' : 'rgba(40,40,45,';
    bg.addColorStop(0, dark + (0.08 + r() * 0.14) + ')'); bg.addColorStop(1, dark + '0)');
    x.fillStyle = bg; x.fillRect(-R, -R, TEX, TEX);
  }
  // relief
  x.save(); x.translate(2, 4); x.scale(0.92, 0.92);
  emboss(x, tails ? buildingPath : bustPath, g);
  x.restore();
  const [w1, w2] = WORDS[metal];
  const word = tails ? w2 : w1, span = word.length > 12 ? 0.8 : word.length > 8 ? 0.7 : 0.6;
  arcText(x, word, R * 0.76, -Math.PI * (0.5 + span / 2), -Math.PI * (0.5 - span / 2), word.length > 12 ? 8 : word.length > 8 ? 10 : 12, pal[1]);
  if (!tails) { x.font = '700 10px Outfit, Arial, sans-serif'; x.fillStyle = 'rgba(0,0,0,.3)'; x.fillText(String(1990 + ((r() * 16) | 0)), R * 0.5, R * 0.42); }
  // grain and scratches
  for (let i = 0; i < 1100; i++) { x.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.08)'; x.fillRect(r() * TEX - R, r() * TEX - R, 1, 1); }
  x.lineWidth = 0.6;
  for (let i = 0; i < 12; i++) {
    x.strokeStyle = r() < 0.5 ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.1)';
    const sx = (r() - 0.5) * TEX, sy = (r() - 0.5) * TEX, a = r() * 6.28, l = 6 + r() * 30;
    x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + Math.cos(a) * l, sy + Math.sin(a) * l); x.stroke();
  }
  x.restore();
  // raised rim: lit on the upper left, shaded lower right
  const rg = x.createLinearGradient(-R, -R, R, R);
  rg.addColorStop(0, pal[0]); rg.addColorStop(0.5, pal[1]); rg.addColorStop(1, pal[2]);
  x.beginPath(); x.arc(0, 0, R * 0.935, 0, 7); x.lineWidth = R * 0.13; x.strokeStyle = rg; x.stroke();
  x.beginPath(); x.arc(0.8, 0.8, R * 0.87, 0, 7); x.lineWidth = 1.2; x.strokeStyle = 'rgba(0,0,0,.35)'; x.stroke();
  x.beginPath(); x.arc(-0.6, -0.6, R * 0.995, 0, 7); x.lineWidth = 1; x.strokeStyle = 'rgba(255,255,255,.35)'; x.stroke();
  // smaller copies, halved smoothly, so a tiny coin is not a speckled mess
  const levels = [cv];
  for (let sz = TEX / 2; sz >= 8; sz /= 2) {
    const m = document.createElement('canvas'); m.width = m.height = sz;
    const mx = m.getContext('2d'); mx.imageSmoothingQuality = 'high';
    mx.drawImage(levels[levels.length - 1], 0, 0, sz, sz); levels.push(m);
  }
  return { cv, levels, pal, rim: hexRGB(pal[1]) };
}
const FACES = {};

// Photographed faces (generated with ChatGPT, GPT-6 Astra, 2026-09-25): one
// strip of eight 256 px coins, heads P N D Q then tails P N D Q. Until it
// loads, the drawn faces above stand in. Pennies get darker and brighter
// copies so the pile is not all one shade.
const COIN_SHEET = new Image();
const PHOTO = {};
const PHOTO_RIM = { P: [176, 98, 58], N: [168, 168, 162], D: [178, 181, 186], Q: [178, 181, 186] };
function mipmaps(cv) {
  const levels = [cv];
  for (let sz = cv.width / 2; sz >= 8; sz /= 2) {
    const m = document.createElement('canvas'); m.width = m.height = sz;
    const mx = m.getContext('2d'); mx.imageSmoothingQuality = 'high';
    mx.drawImage(levels[levels.length - 1], 0, 0, sz, sz); levels.push(m);
  }
  return levels;
}
function buildPhotoFaces() {
  ['P', 'N', 'D', 'Q'].forEach((k, i) => {
    PHOTO[k] = [];
    const tones = k === 'P' ? [null, ['multiply', 'rgb(150,95,70)'], ['screen', 'rgba(255,190,140,.18)']] : [null, ['multiply', 'rgb(205,205,210)']];
    for (const tone of tones) for (const side of [0, 1]) {
      const cv = document.createElement('canvas'); cv.width = cv.height = TEX;
      const x = cv.getContext('2d'), sx = (side * 4 + i) * 256;
      x.drawImage(COIN_SHEET, sx, 0, 256, 256, 0, 0, TEX, TEX);
      if (tone) { x.globalCompositeOperation = tone[0]; x.fillStyle = tone[1]; x.fillRect(0, 0, TEX, TEX); }
      // the studio shot was on black and runs dark: lift it and add contrast
      x.globalCompositeOperation = 'overlay'; x.fillStyle = 'rgba(255,255,255,.3)'; x.fillRect(0, 0, TEX, TEX);
      x.globalCompositeOperation = 'destination-in'; x.drawImage(COIN_SHEET, sx, 0, 256, 256, 0, 0, TEX, TEX);
      PHOTO[k].push({ cv, levels: mipmaps(cv), rim: PHOTO_RIM[k] });
    }
  });
}
COIN_SHEET.onload = () => { buildPhotoFaces(); pileDirty = true; bgLayer = null; };
COIN_SHEET.src = 'assets/game/coins.webp';
function buildFaces() {
  let seed = 11;
  for (const [metal, pals] of Object.entries(PALETTES)) {
    FACES[metal] = [];
    for (const pal of pals) for (const tails of [false, true]) FACES[metal].push(makeFace(metal, pal, seed++, tails));
  }
}

// A four-point star: the flash off a coin edge.
function sparkle(ctx, x, y, size, k) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, size * 0.35);
  g.addColorStop(0, `rgba(255,255,250,${0.9 * k})`); g.addColorStop(1, 'rgba(255,255,250,0)');
  ctx.fillStyle = g; ctx.fillRect(x - size, y - size, size * 2, size * 2);
  ctx.fillStyle = `rgba(255,255,245,${0.75 * k})`;
  for (const [dx, dy] of [[1, 0], [0, 1]]) {
    ctx.beginPath();
    ctx.moveTo(x - dx * size, y - dy * size); ctx.lineTo(x + dy * size * 0.05, y + dx * size * 0.05);
    ctx.lineTo(x + dx * size, y + dy * size); ctx.lineTo(x - dy * size * 0.05, y - dx * size * 0.05); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
let glintBoost = 0;   // set by the pile to give some coins a fixed sparkle
function drawCoin(ctx, C, p, n, tex = 0, turn = 0, dim = 0) {
  let [nx, ny, nz] = n;
  if (!facing(p[0], p[1], p[2], nx, ny, nz)) { nx = -nx; ny = -ny; nz = -nz; }
  // two axes lying in the coin's face, turned by the coin's own spin
  const a0 = norm3(Math.abs(ny) > 0.5 ? [0, -nz, ny] : [-ny, nx, 0]);
  const b0 = norm3([ny * a0[2] - nz * a0[1], nz * a0[0] - nx * a0[2], nx * a0[1] - ny * a0[0]]);
  const ct = Math.cos(turn), st = Math.sin(turn);
  const a = [a0[0] * ct + b0[0] * st, a0[1] * ct + b0[1] * st, a0[2] * ct + b0[2] * st];
  const b = [b0[0] * ct - a0[0] * st, b0[1] * ct - a0[1] * st, b0[2] * ct - a0[2] * st];
  const R = C.R, h = C.t / 2, N = 24;
  const faces = PHOTO[C.key] || FACES[metalOf(C)], face = faces[tex % faces.length];
  const V = norm3([cam.E[0] - p[0], cam.E[1] - p[1], cam.E[2] - p[2]]);
  const front = [], back = [], dirs = [];
  for (let i = 0; i < N; i++) {
    const t = i / N * Math.PI * 2, cs = Math.cos(t), sn = Math.sin(t);
    const d = [a[0] * cs + b[0] * sn, a[1] * cs + b[1] * sn, a[2] * cs + b[2] * sn];
    dirs.push(d);
    const x = p[0] + d[0] * R, y = p[1] + d[1] * R, z = p[2] + d[2] * R;
    front.push(proj(x + nx * h, y + ny * h, z + nz * h));
    back.push(proj(x - nx * h, y - ny * h, z - nz * h));
  }
  const [cr, cg, cb] = face.rim;
  poly(ctx, back); ctx.fillStyle = `rgb(${cr * 0.45 | 0},${cg * 0.45 | 0},${cb * 0.45 | 0})`; ctx.fill();
  // the edge: each band lit by the way it faces; reeded coins get ridges
  const reeded = C.reeded;
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N, d = dirs[i], dn = dirs[j];
    const mx = d[0] + dn[0], my = d[1] + dn[1], mz = d[2] + dn[2];
    if (mx * V[0] + my * V[1] + mz * V[2] < -0.1) continue;
    let s = 0.35 + 0.75 * Math.max(0, (mx * LIGHT[0] + my * LIGHT[1] + mz * LIGHT[2]) / 2);
    if (reeded && i % 2) s *= 0.8;
    s *= 1 - dim;
    poly(ctx, [front[i], front[j], back[j], back[i]]);
    ctx.fillStyle = `rgb(${Math.min(255, cr * s) | 0},${Math.min(255, cg * s) | 0},${Math.min(255, cb * s) | 0})`; ctx.fill();
  }
  // the face picture, mapped through the coin's centre and two rim points
  const c0 = proj(p[0] + nx * h, p[1] + ny * h, p[2] + nz * h);
  const pa = proj(p[0] + nx * h + a[0] * R, p[1] + ny * h + a[1] * R, p[2] + nz * h + a[2] * R);
  const pb = proj(p[0] + nx * h + b[0] * R, p[1] + ny * h + b[1] * R, p[2] + nz * h + b[2] * R);
  // pick the copy nearest twice the coin's size on screen
  const onScreen = 2 * Math.max(Math.hypot(pa[0] - c0[0], pa[1] - c0[1]), Math.hypot(pb[0] - c0[0], pb[1] - c0[1])) * dpr;
  let lv = 0; while (lv < face.levels.length - 1 && face.levels[lv + 1].width >= onScreen * 1.6) lv++;
  const img = face.levels[lv], k = TEX / 2;
  ctx.save();
  ctx.transform((pa[0] - c0[0]) / k, (pa[1] - c0[1]) / k, (pb[0] - c0[0]) / k, (pb[1] - c0[1]) / k, c0[0], c0[1]);
  ctx.drawImage(img, -k, -k, TEX, TEX);
  ctx.restore();
  // lighting for the angle the face is at: shade, then a glint
  const diff = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2];
  const shade = clamp(0.5 - diff * 0.7, 0, 0.45) + dim;
  const H2 = norm3([LIGHT[0] + V[0], LIGHT[1] + V[1], LIGHT[2] + V[2]]);
  const spec = Math.pow(Math.max(0, nx * H2[0] + ny * H2[1] + nz * H2[2]), 40);
  if (shade > 0.02) { poly(ctx, front); ctx.fillStyle = `rgba(10,6,4,${Math.min(0.75, shade)})`; ctx.fill(); }
  if (spec > 0.02) { poly(ctx, front); ctx.fillStyle = `rgba(255,248,235,${spec * 0.75})`; ctx.fill(); }
  // polished metal: the room mirrored in the face, and a broad sheen across it
  // wherever it faces the lamps at all, not just at the one perfect angle
  let fx0 = Infinity, fx1 = -Infinity, fy0 = Infinity, fy1 = -Infinity;
  for (const [x, y] of front) { fx0 = Math.min(fx0, x); fx1 = Math.max(fx1, x); fy0 = Math.min(fy0, y); fy1 = Math.max(fy1, y); }
  const fsz = Math.max(fx1 - fx0, fy1 - fy0);
  // overlay keeps the darks dark, so the room reads as reflection rather than haze
  if (fsz > 3) reflect(ctx, front, 0.3, null, 'overlay');
  const sheen = Math.pow(Math.max(0, nx * H2[0] + ny * H2[1] + nz * H2[2]), 6) * (1 - dim);
  if (sheen > 0.03) {
    const sg = ctx.createLinearGradient(fx0, fy0, fx1, fy1);
    // a narrow bright streak, as a flat polished disc shows under a lamp
    sg.addColorStop(0.12, 'rgba(255,255,255,0)'); sg.addColorStop(0.3, `rgba(255,252,245,${0.7 * sheen})`);
    sg.addColorStop(0.36, `rgba(255,250,240,${0.35 * sheen})`); sg.addColorStop(0.55, 'rgba(255,255,255,0)');
    poly(ctx, front); ctx.fillStyle = sg; ctx.fill();
  }
  // a coin catching the light sparkles
  const glint = Math.max(spec, glintBoost);
  if (glint > 0.3 && fsz > 5) sparkle(ctx, fx0 + (fx1 - fx0) * 0.3, fy0 + (fy1 - fy0) * 0.3, fsz * (0.35 + glint * 0.5), glint);
}

function drawPile(ctx) {
  const list = pile.slice().sort((u, v) => u.p[1] - v.p[1] || P(v.p)[2] - P(u.p)[2]);
  for (const c of list) {
    // a soft contact shadow, then the coin, darker the deeper it sits
    const q = proj(c.p[0] + 0.0015, c.p[1] - 0.001, c.p[2] + 0.001), rx = cam.F * c.C.R / q[2];
    ctx.beginPath(); ctx.ellipse(q[0], q[1], rx * 1.05, rx * 0.5, 0, 0, 7);
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fill();
    glintBoost = c.glint || 0;
    drawCoin(ctx, c.C, c.p, c.n, c.tex, c.turn, clamp(0.16 - c.p[1] * 12, 0, 0.16));
    glintBoost = 0;
  }
  // pile shading toward the back glass
  const f = []; for (let k = 0; k < 6; k++) f.push(P(hexPt(HEX_R, k, 0.004)));
  poly(ctx, f);
  const c0 = P([0, 0, -HEX_R]), c1 = P([0, 0, HEX_R]);
  const g = ctx.createLinearGradient(0, c0[1], 0, c1[1]);
  g.addColorStop(0, 'rgba(10,5,15,.35)'); g.addColorStop(1, 'rgba(10,5,15,0)');
  ctx.fillStyle = g; ctx.fill();
}

function drawGlassFront(ctx, W, H) {
  for (let k = 0; k < 6; k++) {
    const a = (30 + 60 * k) * DEG;
    if (!facing(0, 0.18, 0, Math.cos(a), 0, Math.sin(a))) continue;
    const A = hexPt(HEX_R, k, 0), B = hexPt(HEX_R, (k + 1) % 6, 0);
    const q = [A, B, [B[0], GLASS_H, B[2]], [A[0], GLASS_H, A[2]]].map(P);
    poly(ctx, q);
    const light = 0.5 + 0.5 * Math.cos(a - 50 * DEG);
    ctx.fillStyle = `rgba(215,232,255,${0.05 + light * 0.05})`; ctx.fill();
    // soft reflections: a broad sheen and a thin streak
    ctx.save(); poly(ctx, q); ctx.clip();
    const lx = q[0][0] + (q[1][0] - q[0][0]) * (0.2 + 0.5 * light), wdt = Math.abs(q[1][0] - q[0][0]);
    const g = ctx.createLinearGradient(lx - wdt * 0.25, 0, lx + wdt * 0.25, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, `rgba(255,255,255,${0.07 + 0.08 * light})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const sx = q[0][0] + (q[1][0] - q[0][0]) * (0.78 - 0.3 * light);
    const g2 = ctx.createLinearGradient(sx - 3, 0, sx + 3, 0);
    g2.addColorStop(0, 'rgba(255,255,255,0)'); g2.addColorStop(0.5, `rgba(255,255,255,${0.1 + 0.15 * light})`); g2.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
    // faint fingerprints and smudges
    const sr = rng(31 + k);
    for (let i = 0; i < 5; i++) {
      const sx2 = q[0][0] + (q[1][0] - q[0][0]) * (0.15 + 0.7 * sr()), sy2 = q[3][1] + (q[0][1] - q[3][1]) * (0.35 + 0.6 * sr());
      const rr = 6 + sr() * 16, sg = ctx.createRadialGradient(sx2, sy2, 0, sx2, sy2, rr);
      sg.addColorStop(0, 'rgba(255,255,255,.05)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sg; ctx.fillRect(sx2 - rr, sy2 - rr, rr * 2, rr * 2);
    }
    ctx.restore();
    reflect(ctx, q, 0.05 + 0.04 * light, [0, 0, W, H]);
    // bottom edge sits in the base channel
    ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]); ctx.lineTo(q[1][0], q[1][1]);
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 2; ctx.stroke();
  }
  // bright polished corner edges
  for (let k = 0; k < 6; k++) {
    const A = hexPt(HEX_R, k, 0);
    const a1 = (30 + 60 * k) * DEG, a0 = (30 + 60 * (k + 5)) * DEG;
    if (!facing(0, 0.18, 0, Math.cos(a1), 0, Math.sin(a1)) && !facing(0, 0.18, 0, Math.cos(a0), 0, Math.sin(a0))) continue;
    const p0 = P(A), p1 = P([A[0], GLASS_H, A[2]]);
    ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]);
    ctx.strokeStyle = 'rgba(240,248,255,.55)'; ctx.lineWidth = Math.max(1, cam.F * 0.0025); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = Math.max(0.6, cam.F * 0.0008); ctx.stroke();
    // cut acrylic shows a green-cyan edge a hair inside the corner
    ctx.beginPath(); ctx.moveTo(p0[0] + 1.5, p0[1]); ctx.lineTo(p1[0] + 1.5, p1[1]);
    ctx.strokeStyle = 'rgba(170,255,225,.28)'; ctx.lineWidth = Math.max(1, cam.F * 0.0016); ctx.stroke();
  }
}

function drawLid(ctx) {
  const top = [], bot = [];
  for (let k = 0; k < 6; k++) { top.push(hexPt(LID_R, k, LID_Y + LID_T)); bot.push(hexPt(LID_R, k, LID_Y)); }
  // underside glow seen through the glass
  poly(ctx, bot.map(P)); ctx.fillStyle = 'rgba(255,110,20,.35)'; ctx.fill();
  for (let k = 0; k < 6; k++) {
    const k2 = (k + 1) % 6, a = (30 + 60 * k) * DEG;
    if (!facing(0, LID_Y, 0, Math.cos(a), 0, Math.sin(a))) continue;
    const q = [P(top[k]), P(top[k2]), P(bot[k2]), P(bot[k])];
    poly(ctx, q);
    const light = 0.5 + 0.5 * Math.cos(a - 60 * DEG);
    ctx.fillStyle = `rgba(${230 + light * 25},${90 + light * 40},${20 + light * 10},.92)`; ctx.fill();
    // printed label strip on the front edge
    if (k === 1) {
      const m = (u, v) => [q[0][0] + (q[1][0] - q[0][0]) * u + (q[3][0] - q[0][0]) * v, q[0][1] + (q[1][1] - q[0][1]) * u + (q[3][1] - q[0][1]) * v];
      const r = [m(0.18, 0.2), m(0.82, 0.2), m(0.82, 0.85), m(0.18, 0.85)];
      poly(ctx, r); ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fill();
      const hgt = Math.abs(r[3][1] - r[0][1]);
      if (hgt > 5) {
        ctx.save();
        ctx.translate((r[0][0] + r[2][0]) / 2, (r[0][1] + r[2][1]) / 2);
        let ang = Math.atan2(r[1][1] - r[0][1], r[1][0] - r[0][0]);
        if (Math.cos(ang) < 0) ang += Math.PI;   // keep the print upright
        ctx.rotate(ang);
        ctx.fillStyle = '#302a88'; ctx.font = `700 ${hgt * 0.62}px Outfit, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('LAND IT ON YELLOW TO WIN', 0, hgt * 0.04, Math.abs(r[1][0] - r[0][0]) * 0.94);
        ctx.restore();
      }
    }
  }
  // top face
  const tp = top.map(P);
  poly(ctx, tp);
  const g = ctx.createLinearGradient(tp[3][0], tp[3][1], tp[0][0], tp[0][1]);
  g.addColorStop(0, 'rgba(255,120,30,.9)'); g.addColorStop(0.5, 'rgba(255,150,60,.88)'); g.addColorStop(1, 'rgba(250,105,20,.92)');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = 'rgba(255,205,150,.9)'; ctx.lineWidth = Math.max(1, cam.F * 0.0018); ctx.stroke();
  // sheen
  ctx.save(); poly(ctx, tp); ctx.clip();
  const s0 = P([-LID_R, LID_Y + LID_T, -0.04]), s1 = P([LID_R, LID_Y + LID_T, 0.06]);
  const sh = ctx.createLinearGradient(s0[0], s0[1], s1[0], s1[1]);
  sh.addColorStop(0.35, 'rgba(255,255,255,0)'); sh.addColorStop(0.5, 'rgba(255,255,255,.22)'); sh.addColorStop(0.65, 'rgba(255,255,255,0)');
  ctx.fillStyle = sh; ctx.fillRect(0, 0, 1e4, 1e4); ctx.restore();
  reflect(ctx, tp, 0.18);
  // screws in the corners
  for (let k = 0; k < 6; k++) {
    const s = P(hexPt(LID_R - 0.011, k, LID_Y + LID_T));
    const r = Math.max(1.2, cam.F * 0.0032);
    ctx.beginPath(); ctx.ellipse(s[0], s[1], r, r * 0.6, 0, 0, 7);
    ctx.fillStyle = '#d8d8dc'; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 0.7; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s[0] - r * 0.7, s[1]); ctx.lineTo(s[0] + r * 0.7, s[1]); ctx.stroke();
  }
  // coin slots
  for (const s of SLOTS) {
    const tx = -Math.sin(s.a), tz = Math.cos(s.a), L = 0.017, Wd = 0.0028, y = LID_Y + LID_T + 0.0002;
    const rx = Math.cos(s.a), rz = Math.sin(s.a);
    const q = [[s.x - tx * L - rx * Wd, y, s.z - tz * L - rz * Wd], [s.x + tx * L - rx * Wd, y, s.z + tz * L - rz * Wd],
      [s.x + tx * L + rx * Wd, y, s.z + tz * L + rz * Wd], [s.x - tx * L + rx * Wd, y, s.z - tz * L + rz * Wd]].map(P);
    poly(ctx, q); ctx.fillStyle = 'rgba(70,20,0,.85)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,220,180,.8)'; ctx.lineWidth = 1; ctx.stroke();
  }
}

function drawSign(ctx) {
  const c = signCorners().map(P);
  // clear acrylic holder
  const hb = [[-0.09, LID_Y + LID_T, -0.035], [0.09, LID_Y + LID_T, -0.035], [0.09, LID_Y + LID_T + 0.02, -0.047], [-0.09, LID_Y + LID_T + 0.02, -0.047]].map(P);
  poly(ctx, c);
  ctx.fillStyle = '#fbfaf5'; ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1; ctx.stroke();
  // text laid on the card with an affine map of its corners
  const [tl, tr, , bl] = c, w = 300, h = 200 * (0.1 / 0.085) * 0.85;
  ctx.save();
  ctx.transform((tr[0] - tl[0]) / w, (tr[1] - tl[1]) / w, (bl[0] - tl[0]) / h, (bl[1] - tl[1]) / h, tl[0], tl[1]);
  ctx.fillStyle = '#e8671a'; ctx.fillRect(0, 0, w, 38);
  ctx.fillStyle = '#fff'; ctx.font = '700 22px Outfit, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('COIN SPINNER', w / 2, 20);
  ctx.fillStyle = '#1d2a6b'; ctx.font = '25px "Permanent Marker", "Marker Felt", "Comic Sans MS", cursive'; ctx.textAlign = 'left';
  const rows = [['25¢', COINS.Q.prize], ['10¢', COINS.D.prize], ['5¢', COINS.N.prize]];
  rows.forEach(([a, b], i) => { ctx.fillText(`${a} - ${b}`, 16, 62 + i * 32, w - 26); });
  ctx.fillStyle = '#c81e3a'; ctx.font = '17px "Permanent Marker", "Comic Sans MS", cursive'; ctx.textAlign = 'center';
  ctx.fillText("win bragging rights!", w / 2, 150);
  ctx.restore();
  poly(ctx, hb); ctx.fillStyle = 'rgba(220,235,255,.35)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.stroke();
}

function drawSpindle(ctx, y0, y1) {
  const a = P([0, y0, 0]), b = P([0, y1, 0]);
  const w = Math.max(2, cam.F * SPINDLE_R * 2 / ((a[2] + b[2]) / 2));
  const g = ctx.createLinearGradient(a[0] - w / 2, 0, a[0] + w / 2, 0);
  g.addColorStop(0, 'rgba(170,180,195,.75)'); g.addColorStop(0.35, 'rgba(250,252,255,.9)'); g.addColorStop(0.6, 'rgba(200,208,220,.7)'); g.addColorStop(1, 'rgba(120,128,140,.8)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(a[0] - w / 2, a[1]); ctx.lineTo(b[0] - w / 2, b[1]); ctx.lineTo(b[0] + w / 2, b[1]); ctx.lineTo(a[0] + w / 2, a[1]); ctx.closePath(); ctx.fill();
}

function bladeWorld(i) {
  const ang = spin.th + PHASE[i], c = Math.cos(ang), s = Math.sin(ang), y = LEVELS[i];
  return BLADES[i].map(([x, z]) => [x * c - z * s, y, x * s + z * c]);
}
function drawPaddle(ctx, i) {
  const win = i === WIN_LEVEL;
  const pts = bladeWorld(i);
  const top = pts.map(P), under = pts.map(q => proj(q[0], q[1] - PADDLE_T, q[2]));
  // hub collar
  const hub = [];
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; hub.push(P([Math.cos(a) * 0.011, LEVELS[i] + 0.001, Math.sin(a) * 0.011])); }
  poly(ctx, under); ctx.fillStyle = win ? 'rgba(200,150,0,.35)' : 'rgba(190,50,0,.28)'; ctx.fill();
  poly(ctx, top);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of top) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  // clear tinted acrylic: you see the coins and paddles below through it
  if (win) { g.addColorStop(0, 'rgba(255,245,120,.66)'); g.addColorStop(0.5, 'rgba(255,214,10,.55)'); g.addColorStop(1, 'rgba(240,190,0,.64)'); }
  else { g.addColorStop(0, 'rgba(255,140,50,.56)'); g.addColorStop(0.5, 'rgba(255,84,10,.42)'); g.addColorStop(1, 'rgba(235,60,0,.52)'); }
  ctx.fillStyle = g; ctx.fill();
  // glossy acrylic: the room reflected faintly, and a highlight that slides as it turns
  reflect(ctx, top, 0.14);
  ctx.save(); poly(ctx, top); ctx.clip();
  const ang = spin.th + PHASE[i], hx = (x0 + x1) / 2 + Math.cos(ang * 1.3) * (x1 - x0) * 0.3;
  const hg = ctx.createLinearGradient(hx - (x1 - x0) * 0.25, y0, hx + (x1 - x0) * 0.25, y1);
  hg.addColorStop(0, 'rgba(255,255,255,0)'); hg.addColorStop(0.5, 'rgba(255,245,230,.22)'); hg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hg; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.restore();
  // fluorescent acrylic glows at its cut edges
  ctx.strokeStyle = win ? 'rgba(255,250,170,1)' : 'rgba(255,190,110,.98)';
  ctx.lineWidth = Math.max(1, cam.F * 0.0016); ctx.lineJoin = 'round'; ctx.stroke();
  poly(ctx, hub); ctx.fillStyle = win ? 'rgba(240,200,20,.95)' : 'rgba(240,95,20,.95)'; ctx.fill();
}

function drawKnob(ctx) {
  const y0 = LID_Y + LID_T, y1 = y0 + KNOB_H, N = 28;
  const ring = (y, r) => { const a = []; for (let k = 0; k < N; k++) { const t = k / N * Math.PI * 2; a.push(P([Math.cos(t) * r, y, Math.sin(t) * r])); } return a; };
  const bot = ring(y0, KNOB_R), top = ring(y1, KNOB_R);
  // side wall: silhouette from the widest screen points
  ctx.beginPath();
  let L = 0, R = 0; for (let k = 0; k < N; k++) { if (bot[k][0] < bot[L][0]) L = k; if (bot[k][0] > bot[R][0]) R = k; }
  ctx.moveTo(top[L][0], top[L][1]); ctx.lineTo(bot[L][0], bot[L][1]);
  // front half of the bottom ellipse
  for (let k = L; k !== R; k = (k + N - 1) % N) ctx.lineTo(bot[k][0], bot[k][1]);
  ctx.lineTo(bot[R][0], bot[R][1]); ctx.lineTo(top[R][0], top[R][1]); ctx.closePath();
  const g = ctx.createLinearGradient(bot[L][0], 0, bot[R][0], 0);
  g.addColorStop(0, '#5b5d63'); g.addColorStop(0.3, '#c9cbd0'); g.addColorStop(0.55, '#9ea1a8'); g.addColorStop(1, '#46484d');
  ctx.fillStyle = g; ctx.fill();
  // grip ridges turn with the spindle
  ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = 1;
  for (let k = 0; k < 18; k++) {
    const t = spin.th + k / 18 * Math.PI * 2, x = Math.cos(t), z = Math.sin(t);
    if (!facing(x * KNOB_R, y0, z * KNOB_R, x, 0, z)) continue;
    const a = P([x * KNOB_R, y0 + 0.001, z * KNOB_R]), b = P([x * KNOB_R, y1 - 0.001, z * KNOB_R]);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  }
  poly(ctx, top);
  const tg = ctx.createLinearGradient(top[L][0], top[L][1] - 6, top[R][0], top[R][1] + 6);
  tg.addColorStop(0, '#e9eaee'); tg.addColorStop(1, '#8c8f96');
  ctx.fillStyle = tg; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.stroke();
  // pointer line on the cap shows which way it faces
  const t = spin.th, a = P([Math.cos(t) * 0.004, y1 + 0.0003, Math.sin(t) * 0.004]), b = P([Math.cos(t) * KNOB_R * 0.8, y1 + 0.0003, Math.sin(t) * KNOB_R * 0.8]);
  ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
  ctx.strokeStyle = 'rgba(40,40,46,.8)'; ctx.lineWidth = Math.max(1.2, cam.F * 0.0022); ctx.lineCap = 'round'; ctx.stroke(); ctx.lineCap = 'butt';
}

/* ---------- rendering ---------- */
const canvas = document.getElementById('cs-canvas');
const ctx = canvas.getContext('2d');
let W = 0, H = 0, dpr = 1;
let bgLayer = null, backLayer = null, frontLayer = null, pileDirty = true;
let hoverSlot = -1;

function resize() {
  const r = canvas.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  // tuning aid: #debug with ?dpr=3 renders as a sharp phone screen would
  if (location.hash === '#debug' && +new URLSearchParams(location.search).get('dpr')) dpr = +new URLSearchParams(location.search).get('dpr');
  W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  fitCam(W, H);
  bgLayer = null; frontLayer = null; pileDirty = true;
  // resizing clears the canvas; draw now so the blank frame never reaches the screen
  if (ready) frame();
}
function layer(draw) {
  const c = document.createElement('canvas');
  c.width = canvas.width; c.height = canvas.height;
  const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw(x); return c;
}
function frame() {
  if (pileDirty) {
    if (!bgLayer) bgLayer = layer(x => drawBackground(x, W, H));
    backLayer = layer(x => {
      x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(bgLayer, 0, 0); x.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (SCENE.complete && SCENE.naturalWidth) {
        // the glossy counter mirrors the base, fading out below it
        const refl = layer(y => {
          MIRROR_Y = -BASE_H; drawBase(y, true); MIRROR_Y = null;
          const b0 = P([0, -BASE_H, BASE_R])[1], b1 = b0 + (b0 - P([0, 0, BASE_R])[1]) * 1.3;
          const m = y.createLinearGradient(0, b0, 0, b1);
          m.addColorStop(0, 'rgba(0,0,0,.4)'); m.addColorStop(1, 'rgba(0,0,0,0)');
          y.globalCompositeOperation = 'destination-in'; y.fillStyle = m; y.fillRect(0, 0, W, H);
        });
        x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(refl, 0, 0); x.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      drawBase(x); drawGlassBack(x); drawPile(x);
    });
    pileDirty = false;
  }
  if (!frontLayer) frontLayer = layer(x => { drawCaseLight(x); drawGlassFront(x, W, H); drawLid(x); drawSign(x); drawVignette(x, W, H); });
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(backLayer, 0, 0);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // inside the case, bottom up so higher paddles cover lower ones
  const inside = coins.filter(c => c.p[1] < LID_Y + 0.004);
  let below = 0;
  for (let i = LEVELS.length - 1; i >= -1; i--) {
    const yTop = i >= 0 ? LEVELS[i] : LID_Y;
    drawSpindle(ctx, below, yTop);
    for (const c of inside) if (c.mode === 'fall' && c.p[1] >= below && c.p[1] < yTop) drawCoin(ctx, c.C, c.p, c.n, c.tex, c.age * 3);
    if (i < 0) break;
    drawPaddle(ctx, i);
    for (const c of inside) if (c.mode === 'rest' && c.level === i) drawCoin(ctx, c.C, c.p, wobble(c), c.tex, spin.th);
    below = yTop;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(frontLayer, 0, 0);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawKnob(ctx);
  for (const c of coins) if (c.p[1] >= LID_Y + 0.004) drawCoin(ctx, c.C, c.p, c.n, c.tex);
  if (hoverSlot >= 0) {
    const s = SLOTS[hoverSlot], q = P([s.x, LID_Y + LID_T, s.z]);
    ctx.beginPath(); ctx.ellipse(q[0], q[1], cam.F * 0.03, cam.F * 0.014, 0, 0, 7);
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2; ctx.stroke();
  }
}
function wobble(c) {
  const w = c.wob || 0;
  if (w <= 0) return [0, 1, 0];
  const t = performance.now() / 1000 * 30;
  return norm3([Math.cos(t) * w * 0.3, 1, Math.sin(t) * w * 0.3]);
}

let last = 0;
function loop(t) {
  const dt = Math.min(0.05, last ? (t - last) / 1000 : 0.016);
  last = t;
  physics(dt);
  frame();
  paintBar();
  requestAnimationFrame(loop);
}

/* ---------- sound (synthesised, starts on first tap) ---------- */
let actx = null, soundOn = true;
try { soundOn = localStorage.getItem('tbpm-cs-sound') !== 'off'; } catch {}
function audio() {
  if (!soundOn) return null;
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } }
  if (actx.state === 'suspended') actx.resume();
  return actx;
}
function ping(freqs, dur, gain, delay = 0) {
  const a = audio(); if (!a) return;
  const t0 = a.currentTime + delay;
  const out = a.createGain(); out.gain.value = 1; out.connect(a.destination);
  freqs.forEach(([f, g], i) => {
    const o = a.createOscillator(), e = a.createGain();
    o.type = 'sine'; o.frequency.value = f * (1 + (rand() - 0.5) * 0.02);
    e.gain.setValueAtTime(0, t0); e.gain.linearRampToValueAtTime(gain * g, t0 + 0.002);
    e.gain.exponentialRampToValueAtTime(0.0001, t0 + dur / (1 + i * 0.6));
    o.connect(e); e.connect(out); o.start(t0); o.stop(t0 + dur + 0.05);
  });
}
function knock(gain, f, dur) {
  const a = audio(); if (!a) return;
  const n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (rand() * 2 - 1) * Math.pow(1 - i / n, 4);
  const s = a.createBufferSource(), bp = a.createBiquadFilter(), g = a.createGain();
  bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 3; g.gain.value = gain;
  s.buffer = buf; s.connect(bp); bp.connect(g); g.connect(a.destination); s.start();
}
let lastScrape = 0;

// A short room (the case, the counter) behind the coin sounds so they are not bone dry.
let roomIn = null, noiseBuf = null;
function room(a) {
  if (roomIn) return roomIn;
  roomIn = a.createGain(); roomIn.connect(a.destination);
  const n = Math.floor(a.sampleRate * 0.35), ir = a.createBuffer(2, n, a.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < n; i++) d[i] = (rand() * 2 - 1) * Math.pow(1 - i / n, 3);
  }
  const cv = a.createConvolver(), wet = a.createGain();
  cv.buffer = ir; wet.gain.value = 0.16;
  roomIn.connect(cv); cv.connect(wet); wet.connect(a.destination);
  noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = rand() * 2 - 1;
  return roomIn;
}
// A coin rings like a small free metal plate: a few partials that are not in tune with each other,
// each one split in two so it shimmers. Thin, wide coins ring lower, so the quarter sits under the
// nickel and the dime.
const PLATE = [[1, 1], [1.72, 0.7], [2.33, 0.5], [3.05, 0.3]];
function ring(a, t0, C, gain, dur, out) {
  const f0 = 360 * C.t / (C.R * C.R) * (1 + (rand() - 0.5) * 0.05);
  PLATE.forEach(([r, g], i) => {
    const f = f0 * r; if (f > 16000) return;
    for (const split of [0.9985, 1.0015]) {
      const o = a.createOscillator(), e = a.createGain();
      o.frequency.value = f * split;
      e.gain.setValueAtTime(0, t0); e.gain.linearRampToValueAtTime(gain * g * 0.5, t0 + 0.001);
      e.gain.exponentialRampToValueAtTime(0.0001, t0 + dur / (1 + i * 0.5));
      o.connect(e); e.connect(out); o.start(t0); o.stop(t0 + dur + 0.02);
    }
  });
}
// A burst of noise through a filter: the click of contact, or coins shifting in a heap.
function hiss(a, t0, dur, f, q, gain, out, type = 'bandpass') {
  const s = a.createBufferSource(), bp = a.createBiquadFilter(), e = a.createGain();
  s.buffer = noiseBuf; bp.type = type; bp.frequency.value = f; bp.Q.value = q;
  e.gain.setValueAtTime(gain, t0); e.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(bp); bp.connect(e); e.connect(out); s.start(t0, rand() * 0.8, dur + 0.02);
}
// Coin on acrylic: a hollow, quickly damped tock from the sheet, with a hard click on top.
function tock(a, t0, gain, body, out) {
  const o = a.createOscillator(), e = a.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(body * 1.1, t0); o.frequency.exponentialRampToValueAtTime(body, t0 + 0.02);
  e.gain.setValueAtTime(0, t0); e.gain.linearRampToValueAtTime(gain, t0 + 0.001);
  e.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
  o.connect(e); e.connect(out); o.start(t0); o.stop(t0 + 0.07);
  hiss(a, t0, 0.012, body * 3.4, 1.4, gain * 1.4, out);
}
const sfx = {
  paddle(v, win, C, settles) {
    const a = audio(); if (!a) return;
    const k = clamp(v / 1.5, 0.08, 1), out = room(a), t = a.currentTime;
    tock(a, t, 0.32 * k, win ? 760 : 640, out);
    ring(a, t, C, 0.035 * k, settles ? 0.06 : 0.1, out);
    // a coin that lands flat chatters as it settles: taps that come faster and fainter
    if (settles) {
      let tt = t, gap = 0.045 + 0.035 * k, g = 1;
      for (let i = 0; i < 5; i++) {
        tt += gap; gap *= 0.7; g *= 0.6;
        tock(a, tt, 0.32 * k * g, win ? 780 : 660, out); ring(a, tt, C, 0.035 * k * g, 0.04, out);
      }
    }
  },
  // the case's side walls, struck edge-on, so the coin rings more and the sheet less
  glass(v, C) {
    const a = audio(); if (!a) return;
    const k = clamp(v / 1, 0.05, 1), out = room(a), t = a.currentTime;
    tock(a, t, 0.18 * k, 1150, out); ring(a, t, C, 0.04 * k, 0.14, out);
  },
  tick(v) { const k = clamp(v / 1.2, 0.05, 1); knock(0.3 * k, 1800, 0.03); ping([[3100, 1], [6800, 0.4]], 0.08, 0.04 * k); },
  scrape() { const n = performance.now(); if (n - lastScrape < 120) return; lastScrape = n; knock(0.08, 2400, 0.06); },
  // landing in the heap: the coin strikes and bounces, the coins it hits ring too, and the heap shifts
  pile(C, v) {
    const a = audio(); if (!a) return;
    const k = clamp(v / 1.2, 0.3, 1), out = room(a), t = a.currentTime;
    [[0, 1], [0.05 + rand() * 0.03, 0.4], [0.1 + rand() * 0.04, 0.15]].forEach(([d, g]) => ring(a, t + d, C, 0.06 * k * g, 0.35, out));
    const kinds = Object.values(COINS);
    for (let i = 0; i < 4; i++) ring(a, t + 0.003 + rand() * 0.08, kinds[(rand() * kinds.length) | 0], 0.035 * k * (1 - i * 0.2), 0.12 + rand() * 0.22, out);
    hiss(a, t, 0.1, 6000, 0.8, 0.05 * k, out);
    hiss(a, t + 0.04, 0.14, 4200, 0.6, 0.025 * k, out);
  },
  slide() { knock(0.12, 900, 0.09); ping([[1800, 1], [4200, 0.3]], 0.1, 0.03, 0.05); },
  win() { [0, 0.12, 0.24, 0.42].forEach((d, i) => ping([[[784, 988, 1175, 1568][i], 1], [[784, 988, 1175, 1568][i] * 2, 0.3]], 0.35, 0.09, d)); },
};
function buzz(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch {} }

/* ---------- UI ---------- */
const $ = id => document.getElementById(id);
const toastEl = $('cs-toast');
let toastTimer = 0;
function toast(msg, ms = 2600) {
  toastEl.textContent = msg; toastEl.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms);
}
function updateScore() {
  $('cs-dropped').textContent = stats.dropped; $('cs-wins').textContent = stats.wins;
  $('cs-spent').textContent = '$' + (stats.cents / 100).toFixed(2);
  // what the house keeps: coins in, minus the prizes won at today's prices (unknown if a price never loaded)
  const house = stats.cents / 100 - stats.prize;
  $('cs-house-lab').textContent = stats.unpriced || Math.abs(house) < 0.005 ? 'House' : house > 0 ? 'House is up' : 'House is down';
  $('cs-house').textContent = stats.unpriced ? '—' : '$' + Math.abs(house).toFixed(2);
}

const winEl = $('cs-win');
let pendingWin = null;
function win(c) {
  c.won = true;
  stats.wins++;
  const pv = prices[c.C.code];
  if (pv) stats.prize += pv.median; else stats.unpriced++;
  updateScore();
  sfx.win(); buzz([30, 60, 30, 60, 60]);
  pendingWin = c;
  const C = c.C, pr = prices[C.code];
  const what = `${/s$/.test(C.prize) ? '' : 'a '}${C.prize}`;
  /* the first win with a coin says what it used to pay out; after that, each
     win with it gets a price fact instead */
  const fact = wonWith.has(c.C.name) ? nextFact(C) : null;
  wonWith.add(c.C.name);
  $('cs-win-kicker').textContent = fact ? 'Landed on yellow again! Price fact:' : 'Landed on yellow!';
  $('cs-win-price').textContent = fact || `Back in the day, the ${C.name.toLowerCase()} slot paid out ${what}.` + (pr
    ? ` Today that runs about $${pr.median.toFixed(2)}: the typical online pickup price across ${pr.stores.toLocaleString()} restaurants, before tax and deals.`
    : '');
  // the support button shows on the 2nd and 5th win of the visit, then every 10th
  const w = stats.wins;
  $('cs-win-tip').hidden = !(w === 2 || w === 5 || (w >= 10 && w % 10 === 0));
  paintShare();
  setTimeout(() => { winEl.hidden = false; $('cs-win-close').focus(); }, 120);
}
/* Price facts, all from the site's own collected prices (online pickup, before
   tax and deals). A fact is only offered when every number in it is there. */
const $$money = v => `$${v.toFixed(2)}`;
const place = a => a && a.city ? `${a.city}, ${a.state}` : null;
function factsFor(C) {
  const out = [], it = prices[C.code], h = dash && dash.highlights, m = dash && dash.meta;
  if (it) {
    const n = it.name;
    if (it.min != null && it.max != null) out.push(`${n} runs from ${$$money(it.min)} to ${$$money(it.max)} depending on the restaurant. Same item, a ${$$money(it.max - it.min)} gap.`);
    if (it.min != null && place(it.cheapest_at)) out.push(`The cheapest ${n} we found was ${$$money(it.min)}, in ${place(it.cheapest_at)}.`);
    if (it.max != null && place(it.priciest_at)) out.push(`The priciest ${n} we found was ${$$money(it.max)}, in ${place(it.priciest_at)}.`);
    if (it.coverage != null) out.push(`${n} is on the menu at ${(it.coverage * 100).toFixed(1)}% of the restaurants we priced.`);
    if (it.median != null) out.push(`At the typical ${$$money(it.median)}, ${n} would take ${Math.ceil(it.median * 100 / C.cents)} ${C.name.toLowerCase()}s.`);
  }
  if (h) {
    if (h.cheapest_store && h.dearest_store) out.push(`The same 12-item order costs ${$$money(h.cheapest_store.basket)} at the cheapest restaurant we priced and ${$$money(h.dearest_store.basket)} at the priciest.`);
    if (h.priciest_state && h.cheapest_state) out.push(`Priciest state for the 12-item order: ${h.priciest_state.name}, at ${$$money(h.priciest_state.basket)}. Cheapest: ${h.cheapest_state.name}, at ${$$money(h.cheapest_state.basket)}.`);
    if (h.priciest_item && place(h.priciest_item.priciest_at)) out.push(`The most expensive single item we found: ${h.priciest_item.name}, ${$$money(h.priciest_item.max)} in ${place(h.priciest_item.priciest_at)}.`);
    if (h.biggest_book) out.push(`${h.biggest_book.stores} restaurants in ${h.biggest_book.states.length} states charge exactly the same price for everything we checked.`);
  }
  if (m && m.price_rows && m.stores_priced) out.push(`This site is built from ${m.price_rows.toLocaleString()} menu prices at ${m.stores_priced.toLocaleString()} restaurants.`);
  return out;
}
/* shuffled, and no fact repeats until every one for that coin has shown */
const factQueue = {};
function nextFact(C) {
  if (!factQueue[C.name] || !factQueue[C.name].length) {
    const all = factsFor(C);
    for (let i = all.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [all[i], all[j]] = [all[j], all[i]]; }
    factQueue[C.name] = all;
  }
  return factQueue[C.name].shift() || null;
}

function closeWin() {
  winEl.hidden = true;
  // the coin goes to the cashier, not the pile
  if (pendingWin) { coins = coins.filter(c => c !== pendingWin); pendingWin = null; }
  canvas.focus?.();
}
$('cs-win-close').addEventListener('click', closeWin);
/* Share a win: plain links to X, Facebook and Reddit's own share pages (no
   scripts or trackers of theirs are loaded), and a Copy link button that uses
   the phone's share sheet where there is one. */
const SHARE_URL = 'https://tacobout.domoretech.net/play/';
const brag = () => {
  const n = stats.wins, d = stats.dropped;
  return `Throwback: I landed the coin spinner on yellow ${n} time${n === 1 ? '' : 's'} with ${d} coin${d === 1 ? '' : 's'}. Try it, then see where Taco Bell is cheaper near you.`;
};
function paintShare() {
  const text = brag(), u = encodeURIComponent(SHARE_URL), tx = encodeURIComponent(text);
  $('cs-sh-x').href = `https://twitter.com/intent/tweet?text=${tx}&url=${u}`;
  $('cs-sh-fb').href = `https://www.facebook.com/sharer/sharer.php?u=${u}`;
  $('cs-sh-rd').href = `https://www.reddit.com/submit?url=${u}&title=${tx}`;
  $('cs-share').textContent = navigator.share ? 'More…' : 'Copy link';
}
$('cs-share').addEventListener('click', async () => {
  const btn = $('cs-share'), text = brag();
  const say = msg => { btn.textContent = msg; setTimeout(paintShare, 2200); };
  try {
    if (navigator.share) { await navigator.share({ title: 'Coin Spinner', text, url: SHARE_URL }); return; }
    const line = `${text} ${SHARE_URL}`;
    if (navigator.clipboard) await navigator.clipboard.writeText(line);
    else {
      // older route for pages without the clipboard API (plain http, older browsers)
      const ta = document.createElement('textarea');
      ta.value = line; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0';
      document.body.append(ta); ta.select();
      const ok = document.execCommand('copy'); ta.remove();
      if (!ok) throw new Error('copy failed');
    }
    say('Copied!');
  } catch (e) {
    if (e && e.name === 'AbortError') return;   // they closed the share sheet
    say('Couldn\'t copy');
  }
});
winEl.addEventListener('click', e => { if (e.target === winEl) closeWin(); });

function drop(slot) {
  if (!winEl.hidden || pendingWin) return;
  if (coins.filter(c => c.mode !== 'gone').length >= 6) { toast('Let those coins settle first.'); return; }
  audio();
  dropCoin(slot, selected);
  updateScore();
}
document.querySelectorAll('.cs-drops [data-slot]').forEach(b => b.addEventListener('click', () => drop(+b.dataset.slot)));
// on phones the prize names are hidden from the coin buttons; one line says it
function paintCoinNote() {
  const C = COINS[selected], pr = prices[C.code];
  $('cs-coin-note').textContent = `${C.name}: the old prize was ${/s$/.test(C.prize) ? '' : 'a '}${C.prize}` + (pr ? ` (about $${pr.median.toFixed(2)} today)` : '');
}
document.querySelectorAll('input[name=coin]').forEach(r => r.addEventListener('change', () => { selected = r.value; paintCoinNote(); }));
selected = document.querySelector('input[name=coin]:checked')?.value || 'D';
paintCoinNote();

const soundBtn = $('cs-sound');
function paintSound() { soundBtn.textContent = soundOn ? 'On' : 'Off'; soundBtn.setAttribute('aria-pressed', String(soundOn)); }
// iPhones mute web pages in Silent Mode; someone turning sound back on may not know that
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
soundBtn.addEventListener('click', () => {
  soundOn = !soundOn; try { localStorage.setItem('tbpm-cs-sound', soundOn ? 'on' : 'off'); } catch {} paintSound();
  if (soundOn && isIOS) toast('No sound? Your phone may be in Silent Mode. Turn it off to hear the game.', 4200);
});
paintSound();

// hold-to-turn buttons: a steady turn, not a flick
function holdButton(el, dir) {
  const start = e => { e.preventDefault(); audio(); spin.hold = dir * 2.2; el.classList.add('held'); el.setPointerCapture?.(e.pointerId); };
  const stop = () => { if (el.classList.contains('held')) { spin.hold = 0; el.classList.remove('held'); } };
  el.addEventListener('pointerdown', start);
  el.addEventListener('pointerup', stop); el.addEventListener('pointercancel', stop); el.addEventListener('lostpointercapture', stop);
  el.addEventListener('contextmenu', e => e.preventDefault());
}
holdButton($('cs-turn-l'), 1);
holdButton($('cs-turn-r'), -1);

// canvas: tap a slot to drop, drag sideways to twist the knob
function slotAt(x, y) {
  // anywhere on or above the lid counts, and picks the slot nearest across
  const lid = []; for (let k = 0; k < 6; k++) lid.push(P(hexPt(LID_R, k, LID_Y)));
  const xs = lid.map(q => q[0]), bottom = Math.max(...lid.map(q => q[1]));
  if (x < Math.min(...xs) - 8 || x > Math.max(...xs) + 8 || y > bottom + 8) return -1;
  let best = -1, bd = Infinity;
  SLOTS.forEach((s, i) => { const d = Math.abs(P([s.x, LID_Y + LID_T, s.z])[0] - x); if (d < bd) { bd = d; best = i; } });
  return best;
}
let drag = null;
canvas.addEventListener('pointerdown', e => {
  const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  audio();
  drag = { id: e.pointerId, x0: x, y0: y, t0: spin.target, moved: false, slot: slotAt(x, y) };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', e => {
  const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  if (!drag) { const s = slotAt(x, y); hoverSlot = e.pointerType === 'mouse' ? s : -1; canvas.classList.toggle('over-slot', s >= 0); return; }
  if (e.pointerId !== drag.id) return;
  // a mouse with no button down has been let go somewhere we never heard about
  if (e.pointerType === 'mouse' && !e.buttons) { endDrag({ type: 'lost', pointerId: drag.id }); return; }
  const dx = x - drag.x0;
  if (!drag.moved && Math.abs(dx) > 6) { drag.moved = true; canvas.classList.add('dragging'); }
  // dragging right sweeps the front of the paddles to the right
  if (drag.moved) spin.target = drag.t0 - dx / 70;
});
function endDrag(e) {
  if (!drag || e.pointerId !== drag.id) return;
  // a cancel means the browser took the touch for scrolling: no drop
  if (e.type === 'pointerup' && !drag.moved && drag.slot >= 0) drop(drag.slot);
  drag = null; canvas.classList.remove('dragging');
}
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('lostpointercapture', endDrag);
canvas.addEventListener('pointerleave', () => { hoverSlot = -1; });

const keys = new Set();
window.addEventListener('keydown', e => {
  if (e.target.closest && e.target.closest('input,textarea,select') && !/^(Arrow|Digit)/.test(e.code)) return;
  if (!winEl.hidden) { if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); closeWin(); } return; }
  if (e.key === '1' || e.key === '2' || e.key === '3') { drop(+e.key - 1); e.preventDefault(); }
  if (e.key === 's' || e.key === 'S') { shake(); e.preventDefault(); }
  if (e.key === 'Escape' && isFull()) setFull(false);
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault(); audio();
    const dir = e.key === 'ArrowLeft' ? 1 : -1;
    if (e.shiftKey && !e.repeat) spin.target += dir * 0.9;   // a sharp flick
    else { keys.add(e.key); spin.hold = dir * 2.2; }
  }
});
window.addEventListener('keyup', e => {
  if (keys.delete(e.key) && !keys.size) spin.hold = 0;
});
window.addEventListener('blur', () => { keys.clear(); spin.hold = 0; });

// prize prices from the published data; shown only when collected
fetch('data/dashboard.json').then(r => r.ok ? r.json() : null).then(d => {
  if (!d) return;
  dash = d;
  for (const it of d.items || []) prices[it.code] = it;
  for (const k of ['N', 'D', 'Q']) {
    const pr = prices[COINS[k].code];
    if (!pr) continue;
    const el = document.createElement('span');
    el.className = 'cs-price'; el.textContent = ` ~$${pr.median.toFixed(2)}`;
    $('cs-prize-' + k).append(el);
  }
  paintCoinNote();
}).catch(() => {});

let GRAIN = null;
// The restaurant lamps above: a soft pool of warm light down through the case.
function hull(pts) {   // convex hull (monotone chain) of screen points
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length > 1 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()) { while (up.length > 1 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
function drawCaseLight(ctx) {
  const pts = []; for (let k = 0; k < 6; k++) pts.push(P(hexPt(HEX_R, k, 0.002)), P(hexPt(HEX_R, k, GLASS_H)));
  const top = P([0, GLASS_H, 0]), bot = P([0, 0.01, 0]);
  const rx = Math.abs(P([HEX_R, 0.01, 0])[0] - bot[0]);
  ctx.save(); poly(ctx, hull(pts)); ctx.clip(); ctx.globalCompositeOperation = 'screen';
  const g = ctx.createLinearGradient(0, top[1], 0, bot[1]);
  g.addColorStop(0, 'rgba(255,236,205,.06)'); g.addColorStop(0.5, 'rgba(255,230,195,0)'); g.addColorStop(1, 'rgba(255,225,190,.03)');
  ctx.fillStyle = g; ctx.fillRect(bot[0] - rx * 1.5, top[1] - rx, rx * 3, bot[1] - top[1] + rx * 2);
  // brighter where it lands on the coin pile
  ctx.save(); ctx.translate(bot[0], bot[1]); ctx.scale(1, 0.5);
  const pg = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  pg.addColorStop(0, 'rgba(255,238,210,.14)'); pg.addColorStop(1, 'rgba(255,238,210,0)');
  ctx.fillStyle = pg; ctx.fillRect(-rx, -rx, rx * 2, rx * 2); ctx.restore();
  ctx.restore();
}
function drawVignette(ctx, W, H) {
  // fine film grain so the drawn machine sits in the photograph
  if (!GRAIN) {
    GRAIN = document.createElement('canvas'); GRAIN.width = GRAIN.height = 96;
    const gx = GRAIN.getContext('2d'), id = gx.createImageData(96, 96), r = rng(99);
    for (let i = 0; i < id.data.length; i += 4) { const v = 128 + (r() - 0.5) * 90; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
    gx.putImageData(id, 0, 0);
  }
  ctx.save(); ctx.globalAlpha = 0.07; ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = ctx.createPattern(GRAIN, 'repeat'); ctx.fillRect(0, 0, W, H); ctx.restore();
  const g = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.35, W / 2, H * 0.45, Math.hypot(W, H) * 0.62);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(10,0,15,.42)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// Shake: each tap is one quick flick of the knob, a random way and size, like
// a hand rattling it. The paddles spiral, so two flicks the same way are what
// walk a coin down to the next paddle; strictly alternating taps never would.
function shakeKick() { return (rand() < 0.5 ? -1 : 1) * spin.shakeK * (0.45 + 1.1 * rand()); }
function shake() {
  if (!winEl.hidden) return;
  audio();
  spin.kicks.push({ at: spin.clock, d: shakeKick() });
  spin.kicks.sort((u, v) => u.at - v.at);
}
$('cs-shake').addEventListener('click', shake);

// The roller bar: drag it and the spindle follows the finger, 70 px a radian,
// the same as dragging the machine. Its ridges are redrawn from the spindle's
// angle every frame, so they move exactly with the paddles.
const bar = $('cs-bar'), ridges = $('cs-bar-ridges');
let barDrag = null;
bar.addEventListener('pointerdown', e => {
  e.preventDefault(); audio();
  barDrag = { id: e.pointerId, x0: e.clientX, t0: spin.target };
  bar.classList.add('dragging', 'used');
  try { bar.setPointerCapture(e.pointerId); } catch {}
});
bar.addEventListener('pointermove', e => {
  if (!barDrag || e.pointerId !== barDrag.id) return;
  if (e.pointerType === 'mouse' && !e.buttons) return barEnd(e);
  spin.target = barDrag.t0 - (e.clientX - barDrag.x0) / 70;
});
const barEnd = e => { if (barDrag && e.pointerId === barDrag.id) { barDrag = null; bar.classList.remove('dragging'); } };
bar.addEventListener('pointerup', barEnd); bar.addEventListener('pointercancel', barEnd);
// the drag also ends if the page loses hold of the pointer (let go outside the window)
bar.addEventListener('lostpointercapture', barEnd);
window.addEventListener('blur', () => { barDrag = null; bar.classList.remove('dragging'); });
function paintBar() {
  ridges.style.backgroundPosition = `0 0, ${(-spin.th * 70) % 12}px 0`;
  const deg = ((Math.round(-spin.th * 180 / Math.PI) % 360) + 360) % 360;
  if (+bar.getAttribute('aria-valuenow') !== deg) bar.setAttribute('aria-valuenow', deg);
}

// Full-screen play on phones: the machine and controls fill the screen and
// nothing scrolls, so every swipe turns the knob. Back button closes it.
const isFull = () => document.body.classList.contains('cs-full');
function setFull(on, fromHistory) {
  if (on === isFull()) return;
  document.body.classList.toggle('cs-full', on);
  if (!fromHistory) { if (on) history.pushState({ csFull: 1 }, ''); else if (history.state && history.state.csFull) history.back(); }
  resize();
}
$('cs-fs').addEventListener('click', () => setFull(true));
$('cs-fs-close').addEventListener('click', () => setFull(false));
window.addEventListener('popstate', () => { if (isFull()) setFull(false, true); });

// On phones the game opens full screen. A swipe up from the controls under the machine leaves it and
// shows the rest of the page; tapping the machine or a control goes back in. The page follows the
// finger and springs back if the swipe was too short, like the map's full screen on the price page.
// same test as the inline script at the top of coin-spinner.html, which opens full screen before the first paint
const phone = matchMedia('(pointer:coarse)').matches && Math.min(screen.width, screen.height) < 600;
if (phone) {
  const main = document.querySelector('.cs-main'), stage = document.querySelector('.cs-stage');
  let y0 = 0, t0 = 0, dy = 0, swiping = false;
  main.addEventListener('touchstart', e => {
    swiping = false;
    if (!isFull() || e.touches.length > 1 || stage.contains(e.target) || $('cs-bar').contains(e.target)) return;
    swiping = true; y0 = e.touches[0].clientY; t0 = performance.now(); dy = 0;
    main.style.transition = 'none';
  }, { passive: true });
  main.addEventListener('touchmove', e => {
    // nothing in full screen scrolls; left alone, the page underneath would, and its scroll
    // would land after ours when the swipe ends
    if (isFull()) e.preventDefault();
    if (!swiping) return;
    dy = Math.max(0, y0 - e.touches[0].clientY);
    main.style.transform = dy ? `translateY(${-dy}px)` : '';
    main.style.opacity = String(1 - Math.min(dy / 400, .4));
  }, { passive: false });
  const end = () => {
    if (!swiping) return;
    swiping = false;
    const fast = dy > 30 && dy / Math.max(1, performance.now() - t0) > .5;
    main.style.transition = main.style.transform = main.style.opacity = '';
    if (dy > 90 || fast) { setFull(false); document.querySelector('.cs-drops').scrollIntoView({ block: 'start' }); }
  };
  main.addEventListener('touchend', end);
  main.addEventListener('touchcancel', () => { dy = 0; end(); });
  const reenter = () => { if (!isFull()) setFull(true); };
  for (const el of [canvas, ...document.querySelectorAll('.cs-coins, .cs-drops, .cs-knob')]) el.addEventListener('click', reenter);
}

/* ---------- tuning aid, only with #debug in the URL ---------- */
if (location.hash === '#debug') window.__cs = {
  coins: () => coins, spin,
  faces: () => FACES,
  facts: k => factsFor(COINS[k]),
  win: k => win({ C: COINS[k] }),
  step(sec) { for (let t = 0; t < sec; t += 1 / 120) physics(1 / 120); frame(); },
  // drop n coins one at a time with the knob still (or randomly jerked);
  // count where each first comes to rest
  simulate(n = 200, kind = 'D', shake = false) {
    const saved = coins, out = {}, snd = soundOn; soundOn = false;
    for (let k = 0; k < n; k++) {
      coins = []; spin.th = spin.target = rand() * 6.283; spin.om = 0; spin.hold = 0; spin.kicks.length = 0;
      dropCoin((rand() * 3) | 0, kind); stats.dropped--; stats.cents -= COINS[kind].cents;
      const c = coins[0];
      let t = 0;
      while (t < 12 && c.mode !== 'gone' && !(c.mode === 'rest' && c.still > 0.6 && (!shake || c.level === WIN_LEVEL))) {
        if (shake === 'button' && c.mode === 'rest' && c.level !== WIN_LEVEL && c.still > 0.5 && !spin.kicks.length) {
          spin.kicks.push({ at: spin.clock, d: shakeKick() });
        } else if (shake === true && c.mode === 'rest' && c.still > 0.6) spin.target += (rand() < 0.5 ? -1 : 1) * (0.4 + rand());
        physics(1 / 120); t += 1 / 120;
      }
      const key = c.mode === 'gone' ? 'pile' : c.mode === 'rest' ? 'level' + c.level : 'timeout';
      out[key] = (out[key] || 0) + 1;
    }
    coins = saved; soundOn = snd; pile.length = Math.min(pile.length, 380); pileDirty = true;
    return out;
  },
};

/* ---------- start ---------- */
setupCam();
buildFaces();
seedPile();
resize();
window.addEventListener('resize', resize);
if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
// the sign uses a web font; redraw it once the font arrives
// the sign and the coin lettering use web fonts; redraw once they arrive
if (document.fonts) Promise.all([document.fonts.load('25px "Permanent Marker"'), document.fonts.load('700 12px Outfit')]).then(() => { buildFaces(); bgLayer = null; frontLayer = null; pileDirty = true; }).catch(() => {});
updateScore();
// phones open the game full screen (usually already done by the page); no history entry, so Back still leaves the page
if (phone) setFull(true, true);
ready = true;
requestAnimationFrame(loop);
})();
