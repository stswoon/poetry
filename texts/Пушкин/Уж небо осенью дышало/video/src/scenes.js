// ---------- Сцены v2: камера летит за гусём ----------
const T0 = {
  wake: 2.15, run: EV.L1 + 0.15, lift: EV.dyshalo + 0.45,
  s1: EV.L2 - 0.15, s2: EV.L3 - 0.2, s3: EV.L4 - 0.15, s4: EV.L6 - 0.3, s5: EV.L7 - 0.35, s6: EV.L9 - 0.3, s7: EV.fin,
};
const BLOOM = 0.55;   // длительность перехода «растекающееся пятно»
let NOHERO = false;  // на переходе героя рисует main.js один раз, плавно между сценами
// путь по времени: интеграл скорости, таблица с шагом 1/240 с (кадр детерминирован)
function integ(a, b, v) { const dt = 1 / 240, n = Math.ceil((b - a) / dt) + 2, z = new Float64Array(n); for (let i = 1; i < n; i++) z[i] = z[i - 1] + v(a + (i - 0.5) * dt) * dt; return (t) => { const f = clamp((t - a) / dt, 0, n - 1), i = Math.floor(f); return i >= n - 1 ? z[n - 1] : lerp(z[i], z[i + 1], f - i); }; }
const zPond = integ(0, T0.s2 + 1, (t) => (t < T0.run ? 0 : t < T0.lift ? 9 * easeIn(inv(T0.run, T0.lift, t)) : lerp(9, 16, inv(T0.lift, T0.lift + 1, t))));
const zField = integ(T0.s2 - 1, T0.s3 + 1, () => 19);
const zForest = integ(T0.s3 - 1, T0.s4 + 1, (t) => lerp(8, 21, ease(inv(EV.pechal - 0.3, EV.pechal + 0.4, t))));
const zFog = integ(T0.s4 - 1, T0.s5 + 1, () => 16);
const flapAt = (t, f, ph = 0) => t * f + ph;
const SKYHZ = { pond: 1700, sun: 1100, dusk: 1100, forest: 1100 };

// ================= 0–1. Пруд → набор высоты к солнцу (одна непрерывная съёмка) =================
function camPond(t) {
  const up = easeIO(inv(T0.lift, T0.s2, t));
  const pitchUp = easeIO(inv(T0.lift - 0.1, EV.blistalo - 0.3, t)), dive = easeIO(inv(EV.blistalo + 0.35, T0.s2 + 0.4, t));
  return {
    x: Math.sin(t * 0.7) * 0.15, y: 1.15 + up * 11 + Math.sin(t * 1.3) * 0.03, z: zPond(t),
    hy: 540 + pitchUp * 430 - dive * 820 + (t < T0.run ? Math.sin(t * 1.6) * 3 : 0),
    roll: Math.sin(t * 0.9) * 0.02 + 0.08 * Math.sin(Math.PI * inv(T0.lift, EV.L2 + 0.8, t)) + dive * 0.22,
  };
}
function heroPond(t) {
  const woke = t > T0.wake;
  if (t < T0.run - 0.1) {
    const st = { x: 960, y: 700 + Math.sin(t * 1.8) * 3, s: 1.1, mode: woke ? "swim" : "sleep", nu: woke ? easeOut(inv(T0.wake, T0.wake + 0.3, t)) : 0, run: t * 0.25 };
    // оглядывается: влево, вправо, гогочет «проспал!»
    st.look = woke ? lerp(-0.85, 0.85, ease(inv(T0.wake + 0.15, T0.wake + 0.6, t))) * (1 - ease(inv(T0.wake + 0.7, T0.run, t))) + 0.3 * ease(inv(T0.wake + 0.7, T0.run, t)) : 0;
    st.honk = woke ? Math.max(0, Math.sin((t - T0.wake - 0.45) * 18)) * win(t, T0.wake + 0.45, T0.wake + 0.85, 0.02, 0.05) : 0;
    st.ruff = win(t, T0.wake, T0.wake + 0.5, 0.05, 0.3);
    return st;
  }
  const up = easeIO(inv(T0.lift, T0.lift + 0.8, t)), spread = ease(inv(T0.run - 0.1, T0.run + 0.45, t));
  const dive = easeIO(inv(EV.blistalo + 0.35, T0.s2 + 0.4, t)), climb = win(t, T0.lift, EV.blistalo + 0.4, 0.4, 0.3);
  return {
    spread, x: 960 + Math.sin(t * 1.1) * 14, y: lerp(lerp(700, 660, spread), 600, up) + Math.sin(t * 5.6) * 6 * spread, s: lerp(1.1, 1.08, spread),
    mode: t < T0.lift ? "run" : "fly", nu: lerp(0.85, 1, up), run: (t - T0.run) * 4.2 * spread, flap: flapAt(t, t < T0.lift ? 3.4 : 2.9),
    look: 0.3 + Math.sin(t * 1.7) * 0.15, pitch: climb * 0.8 - dive * 1, roll: -0.1 * Math.sin(Math.PI * inv(T0.lift, EV.L2 + 0.8, t)) + Math.sin(t * 1.3) * 0.03 - dive * 0.15,
    ruff: win(t, EV.L1 + 0.15, EV.dyshalo + 0.9, 0.12, 0.4),
  };
}
function drawCloudFace(g, t, cam) {
  const vis = win(t, EV.L1 - 0.12, EV.L2 - 0.05, 0.3, 0.45); if (vis <= 0) return null;
  const inh = ease(inv(EV.L1 - 0.12, EV.L1 + 0.05, t)) * (1 - ease(inv(EV.L1 + 0.05, EV.L1 + 0.3, t)));
  const blow = win(t, EV.L1 + 0.02, EV.dyshalo + 0.9, 0.15, 0.4) * (0.75 + 0.25 * win(t, EV.dyshalo - 0.2, EV.dyshalo + 0.6, 0.1, 0.3));
  const cx = 960, cy = cam.hy - 330, sc = 0.8 * (1 + inh * 0.1);
  g.save(); g.globalAlpha = vis; g.translate(cx, cy + (1 - vis) * -60); g.scale(sc * (1 + blow * 0.06), sc * (1 - blow * 0.04));
  const c = SPR.faceCloud; g.drawImage(c, -c.width / 2, -c.height / 2);
  // лицо: зажмуренные глаза-дуги, щёки дуются на вдохе, губы трубочкой и «О» на выдохе
  inkStroke(g, bez([-150, -40], [-125, -70], [-85, -70], [-60, -40], 10), 9, P.ink, { seed: 1 });
  inkStroke(g, bez([60, -40], [85, -70], [125, -70], [150, -40], 10), 9, P.ink, { seed: 2 });
  g.save(); g.globalAlpha *= 0.5; g.fillStyle = "#d9826a"; for (const d of [-175, 175]) { g.beginPath(); g.ellipse(d, 30, 60 + inh * 26, 40 + inh * 14, 0, 0, TAU); g.fill(); } g.restore();
  const mo = 18 + inh * 4 + blow * 24;
  g.fillStyle = "#b9524a"; g.beginPath(); g.ellipse(0, 70, mo, mo * 1.15, 0, 0, TAU); g.fill();
  g.fillStyle = "#3a1a14"; g.beginPath(); g.ellipse(0, 72, mo * 0.55, mo * 0.7, 0, 0, TAU); g.fill();
  inkStroke(g, Array.from({ length: 17 }, (_, k) => [Math.cos(k / 16 * TAU) * mo, 70 + Math.sin(k / 16 * TAU) * mo * 1.15]), 4, P.ink, { flat: true });
  g.restore();
  return { mx: cx, my: cy + 70 * sc, blow };
}
function drawBreath(g, t, face) {
  // струи холодного дыхания: из губ облака веером к зрителю, растут и уносятся за края кадра
  if (!face || face.blow <= 0) return;
  g.save(); g.lineCap = "round";
  for (let k = 0; k < 16; k++) {
    const p = ((t - EV.L1) * 1.3 + hash(k) * 0.9) % 1; if (p < 0) continue;
    const a = (k / 15 - 0.5) * 2.6, d0 = 40 + p * 1300, d1 = d0 + 120 + p * 380;
    const dirx = Math.sin(a), diry = Math.cos(a) * 0.55 + 0.25;
    const px0 = face.mx + dirx * d0, py0 = face.my + diry * d0, px1 = face.mx + dirx * d1, py1 = face.my + diry * d1;
    g.globalAlpha = face.blow * (1 - p * 0.8) * 0.9; g.strokeStyle = k % 3 ? "rgba(246,250,252,1)" : "#b9cfdc"; g.lineWidth = 8 + p * 46;
    g.beginPath(); g.moveTo(px0, py0); g.quadraticCurveTo((px0 + px1) / 2 + diry * 30, (py0 + py1) / 2 - 20, px1, py1); g.stroke();
  }
  g.restore();
}
function scPond(g, t) {
  const cam = camPond(t);
  let face = null;
  withRoll(g, cam, () => {
    drawSky(g, SPR.skyPond, SKYHZ.pond, cam);
    // солнце: открывается при наборе высоты; на «блистало» мигает и тонет в тучах
    const sx = 1300, sy = cam.hy - 720;
    const cover = easeIO(inv(EV.blistalo - 0.45, EV.blistalo + 0.35, t));
    const flick = 1 - 0.35 * Math.max(0, Math.sin(t * 23)) * win(t, EV.L2, EV.blistalo, 0.1, 0.1);
    if (sy > -250) { g.save(); g.globalAlpha = flick; g.drawImage(SPR.sun, sx - 210, sy - 210); g.restore(); }
    if (cover > 0) {
      g.drawImage(SPR.dark[0], lerp(-900, sx - 620, cover), sy - 250, 900, 405);
      g.drawImage(SPR.dark[1], lerp(W + 200, sx - 300, cover), sy - 150, 900, 405);
      g.save(); g.globalAlpha = 0.3 * cover; g.fillStyle = "#4b5563"; g.fillRect(-400, -400, W + 800, H + 800); g.restore();
    }
    face = drawCloudFace(g, t, cam);
    // клин уходит вдаль — гусь проспал
    const fu = inv(0, T0.run + 0.4, t);
    if (fu < 1) for (let k = 0; k < 7; k++) { const o = vOff(k); gooseAt(g, cam, o[0] * 1.2 + 4, 14 + o[1], cam.z + 90 + fu * 120 + o[2], { mode: "fly", flap: flapAt(t, 3, k * 0.21), look: 0.3, seed: k }); }
    // дальний берег, вода, камыш
    drawFar(g, SPR.farPond, cam, 120);
    g.fillStyle = "#8fa6b0"; const gs = cam.hy + 110, ge = cam.hy + cam.y * F / ZMAX + 2; if (ge > gs) g.fillRect(-420, gs, W + 840, ge - gs);
    drawGround(g, SPR.texWater, cam);
    haze(g, cam, "232,222,196", 0.35, 120);
    // рябь бежит к зрителю на «дышало»
    const gu = win(t, EV.L1 + 0.1, EV.dyshalo + 1.4, 0.2, 0.5);
    if (gu > 0) { g.save(); g.strokeStyle = "rgba(255,255,255,0.8)"; g.lineCap = "round"; for (let k = 0; k < 34; k++) { const p = ((t - EV.L1) * 0.9 + hash(k * 3)) % 1, y = cam.hy + 120 + p * p * 760, x = W / 2 + (hash(k) - 0.5) * (300 + p * 2600); g.globalAlpha = gu * (0.3 + 0.6 * p); g.lineWidth = 2 + p * 6; g.beginPath(); g.moveTo(x - 30 - p * 90, y); g.quadraticCurveTo(x, y - 6 - p * 8, x + 30 + p * 90, y); g.stroke(); } g.restore(); }
    const bend = win(t, EV.L1 + 0.1, EV.dyshalo + 1.2, 0.25, 0.5) * 0.18;
    drawBills(g, cam, scatter(cam, 2.6, 1.5, 11, (i, z, h) => [
      { spr: SPR.reeds[i % 2], x: -(2.6 + h(1) * 4), y: -0.1, z, h: 2.1 + h(2), flip: h(3) < 0.5, rot: -bend, near: 1.2 },
      { spr: SPR.reeds[(i + 1) % 2], x: 2.6 + h(4) * 4, y: -0.1, z: z + 1.2, h: 2.1 + h(5), flip: h(6) < 0.5, rot: -bend, near: 1.2 },
    ]));
    drawBreath(g, t, face);
  });
  // герой (в экране; крен свой)
  const st = heroPond(t);
  if (!NOHERO) drawGooseRear(g, st);
  if (st.mode === "sleep" || st.mode === "swim") waterline(g, st, t);
  else if (st.mode === "run" && st.spread < 1) { g.save(); g.globalAlpha = 1 - st.spread; waterline(g, st, t); g.restore(); }
  if (st.mode === "run" && st.spread > 0.5) splashes(g, st, t);
  // спит: «Z z z» тушью поднимается над головой
  const zz = win(t, 0.3, T0.wake - 0.05, 0.3, 0.15);
  if (zz > 0) { g.save(); g.font = '46px "GTitle"'; g.fillStyle = P.ink; for (let k = 0; k < 3; k++) { const p = ((t * 0.55 + k / 3) % 1); g.globalAlpha = zz * Math.sin(Math.PI * p); g.save(); g.translate(st.x + 70 + p * 60 + k * 6, st.y - 70 - p * 150); g.scale(0.6 + p * 0.6, 0.6 + p * 0.6); g.fillText("Z", 0, 0); g.restore(); } g.restore(); }
  // «!» тушью над головой при пробуждении
  const ex = win(t, T0.wake + 0.1, T0.wake + 0.9, 0.05, 0.2);
  if (ex > 0) { const sp = spr(t, T0.wake + 0.1); g.save(); g.globalAlpha = ex; g.translate(st.x + 120, st.y - 230); g.scale(sp, sp); inkStroke(g, [[0, -70], [3, -36], [5, -14]], 16, P.crimson, {}); g.fillStyle = P.crimson; g.beginPath(); g.arc(6, 8, 9, 0, TAU); g.fill(); g.restore(); }
  windStreaks(g, t, 900 * inv(T0.run, T0.lift + 0.5, t) * (1 - inv(T0.s1, T0.s2, t) * 0.3), 0.2);
  drawTitleIntro(g, t);
}
function waterline(g, st, t) {
  // нижняя часть гуся под водой: полупрозрачная вода поверх, светлое кольцо ряби
  const s = st.s, wy = st.y + 34 * s;
  g.save(); g.beginPath(); g.rect(st.x - 200 * s, wy, 400 * s, 160 * s); g.clip();
  const gr = g.createLinearGradient(0, wy, 0, wy + 110 * s); gr.addColorStop(0, "rgba(143,166,176,0.55)"); gr.addColorStop(1, "rgba(143,166,176,0.95)");
  g.fillStyle = gr; g.fillRect(st.x - 200 * s, wy, 400 * s, 160 * s); g.restore();
  g.save(); g.strokeStyle = "rgba(255,255,255,0.85)"; g.lineWidth = 3;
  for (let k = 0; k < 3; k++) { const p = ((t * 0.5 + k / 3) % 1); g.globalAlpha = 0.8 * (1 - p); g.beginPath(); g.ellipse(st.x, wy + 2, (115 + p * 120) * s, (12 + p * 12) * s, 0, 0, TAU); g.stroke(); }
  g.restore();
}
function splashes(g, st, t) {
  for (const sd of [-1, 1]) {
    const ph = ((st.run + (sd > 0 ? 0.5 : 0)) % 1 + 1) % 1; // 0.5…1 — лапа внизу
    if (ph < 0.5) continue;
    const u = (ph - 0.5) / 0.5, fx = st.x + sd * 38 * st.s, fy = st.y + 122 * st.s;
    g.save(); g.globalAlpha = 1 - u;
    splatter(g, fx, fy - 20 * u, 30 + u * 70, 20, "#ffffff", Math.floor(st.run * 2) * 7 + (sd > 0 ? 3 : 0), 0.95);
    g.strokeStyle = "rgba(255,255,255,0.9)"; g.lineWidth = 3; g.beginPath(); g.ellipse(fx, fy + 6, 30 + u * 80, 7 + u * 10, 0, 0, TAU); g.stroke(); g.restore();
  }
}
function windStreaks(g, t, speed, a) {
  if (speed <= 1) return;
  g.save(); g.strokeStyle = `rgba(250,248,240,${a})`; g.lineCap = "round";
  for (let k = 0; k < 22; k++) {
    const p = ((t * speed / 900 + hash(k * 5)) % 1), ang = hash(k) * TAU, r0 = 120 + p * p * 1100;
    const x = W / 2 + Math.cos(ang) * r0 * 1.4, y = 520 + Math.sin(ang) * r0 * 0.8;
    g.globalAlpha = p; g.lineWidth = 1 + p * 3;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(ang) * (40 + p * 160), y + Math.sin(ang) * (24 + p * 90)); g.stroke();
  }
  g.restore();
}

// ================= 2. Поле на закате: солнце садится, тени длиннее, впереди встаёт лес =================
function camField(t) {
  const out = 1 - easeOut(inv(T0.s2, T0.s2 + 0.8, t));
  return { x: Math.sin((t - T0.s2) * 1.1) * 0.8, y: 2.5 + Math.sin(t * 1.7) * 0.15 + out * 4, z: zField(t), hy: 420 - out * 280, roll: Math.sin((t - T0.s2) * 1.1 + 1.2) * 0.07 };
}
function heroField(t) {
  const out = 1 - easeOut(inv(T0.s2, T0.s2 + 0.8, t));
  return { x: 960 + Math.cos((t - T0.s2) * 1.1) * 40, y: 640 + Math.sin(t * 5.4) * 6, s: 1.05, mode: "fly", flap: flapAt(t, 3), look: 0.3 + Math.sin(t * 1.3) * 0.15, pitch: -out, roll: -Math.sin((t - T0.s2) * 1.1 + 1.2) * 0.12 };
}
function scField(g, t) {
  const cam = camField(t);
  const sunU = easeIn(inv(EV.koroche - 0.1, EV.den + 0.45, t));
  withRoll(g, cam, () => {
    drawSky(g, SPR.skySun, SKYHZ.sun, cam);
    if (sunU > 0) { g.save(); g.globalAlpha = sunU * 0.85; drawSky(g, SPR.skyDusk, SKYHZ.dusk, cam); g.restore(); }
    // солнце катится за горизонт
    const sx = 1150 - sunU * 60, sy = cam.hy - lerp(300, -60, sunU);
    g.save(); g.beginPath(); g.rect(-400, -600, W + 800, cam.hy + 600 + 4); g.clip(); g.drawImage(SPR.sun, sx - 210, sy - 210); g.restore();
    drawFar(g, SPR.farField, cam, 70);
    drawGround(g, SPR.texField, cam);
    // закатный тон и сумрак на земле
    g.save(); g.globalAlpha = 0.18 + 0.3 * sunU; g.fillStyle = sunU > 0.5 ? "#3a3560" : "#b4603a"; g.fillRect(-420, cam.hy, W + 840, H + 400); g.restore();
    haze(g, cam, "240,190,120", 0.45 * (1 - sunU) + 0.15, 140);
    // тени стогов к зрителю (солнце впереди): длиннее с закатом
    const items = scatter(cam, 8, 0, 21, (i, z, h) => { const sd = i % 2 ? 1 : -1; return { spr: SPR.stack[i % 2], x: sd * (4.5 + h(1) * 6), y: 0, z, h: 3.2 + h(2) * 0.6, flip: h(3) < 0.5 }; });
    const L = 2 + sunU * 16;
    g.save(); g.fillStyle = "rgba(60,40,70,0.32)";
    for (const it of items) { const a = proj(cam, it.x - 1.4, 0, it.z), b = proj(cam, it.x + 1.4, 0, it.z), c = proj(cam, it.x + 1.1 - L * 0.15, 0, Math.max(cam.z + 0.6, it.z - L)), d = proj(cam, it.x - 1.1 - L * 0.15, 0, Math.max(cam.z + 0.6, it.z - L)); if (!a || !b || !c || !d || a[3] > ZMAX) continue; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath(); g.fill(); }
    g.restore();
    // стена леса впереди
    const zEdge = zField(T0.s3) + 4;
    for (let k = 0; k < 18; k++) { const sd = k % 2 ? 1 : -1, x = sd * (1.2 + (k >> 1) * 1.6) + (hash(k) - 0.5), z = zEdge + hash(k + 3) * 6; items.push({ spr: SPR.trees[k % 5].bare, x, y: 0, z: z + 0.01, h: 13, near: 1.6 }, { spr: SPR.trees[k % 5].crown, x, y: 0, z, h: 13, near: 1.6 }); }
    drawBills(g, cam, items);
  });
  if (!NOHERO) drawGooseRear(g, heroField(t));
  windStreaks(g, t, 1100, 0.18);
}

// ================= 3. Лес: таинственная сень → печальный шум → листья срываются =================
function pathX(t) { const r = ease(inv(EV.pechal - 0.2, EV.pechal + 0.5, t)); return Math.sin((t - EV.pechal) * 2.3) * 2.4 * r; }
function camForest(t) {
  const r = ease(inv(EV.pechal - 0.2, EV.pechal + 0.5, t)), dx = Math.cos((t - EV.pechal) * 2.3) * r;
  const out = easeIn(inv(T0.s4 - 0.6, T0.s4 + BLOOM, t));
  return { x: pathX(t), y: 2.6 + Math.sin(t * 1.4) * 0.12 + out * 1.5, z: zForest(t), hy: 470 + out * 120, roll: -dx * 0.22 + Math.sin(t * 0.8) * 0.02 };
}
function heroForest(t) {
  const r = ease(inv(EV.pechal - 0.2, EV.pechal + 0.5, t)), dx = Math.cos((t - EV.pechal) * 2.3) * r;
  const myst = win(t, EV.L4, EV.pechal + 0.2, 0.4, 0.3);
  return { x: 960 + dx * 60, y: 640 + Math.sin(t * 5.6) * 6, s: 1.05, mode: "fly", flap: flapAt(t, lerp(2.2, 3.4, r)), look: 0.3 + myst * Math.sin((t - EV.L4) * 2.2) * 0.7, pitch: 0, roll: dx * 0.35, seed: 3 };
}
function forestTrees(cam) {
  const items = [];
  // по сторонам ряды деревьев
  items.push(...scatter(cam, 2.4, zForest(T0.s3) - 2, 31, (i, z, h) => { const sd = i % 2 ? 1 : -1; return { x: sd * (3.2 + h(1) * 9), z, k: i % 5, h: 12 + h(2) * 3, flip: h(3) < 0.5, ph: h(4) * 6 }; }));
  // деревья на пути после «печальным»: гусь проходит их змейкой
  const zP = zForest(EV.pechal);
  items.push(...scatter(cam, 5, zP + 4, 37, (i, z, h) => { let tt = EV.pechal; for (let k = 0; k < 40 && zForest(tt) < z; k++) tt += 0.1; const px = pathX(tt); return { x: px - Math.sign(px || 1) * (2.6 + h(1)), z, k: (i + 2) % 5, h: 12 + h(2) * 3, flip: h(3) < 0.5, ph: h(4) * 6 }; }));
  return items;
}
function scForest(g, t) {
  const cam = camForest(t);
  const shake = win(t, EV.pechal - 0.1, EV.obnazh + 1.2, 0.3, 0.4);
  const bare = (z) => 0.55 * easeIO(inv(EV.pechal + 0.2, EV.obnazh - 0.2, t)) + 0.45 * easeIO(inv(EV.obnazh - 0.1 + (z - cam.z) * 0.008, EV.obnazh + 0.45 + (z - cam.z) * 0.008, t));
  withRoll(g, cam, () => {
    drawSky(g, SPR.skyForest, SKYHZ.forest, cam);
    drawFar(g, SPR.farForest, cam, 60);
    drawGround(g, SPR.texForest, cam);
    haze(g, cam, "246,220,154", 0.6, 220);
    const trees = forestTrees(cam).sort((a, b) => b.z - a.z);
    for (const tr of trees) {
      const T = SPR.trees[tr.k], rot = shake * Math.sin(t * 13 + tr.ph) * 0.025;
      const base = { x: tr.x, y: 0, z: tr.z, h: tr.h, flip: tr.flip, rot, near: 1.6 };
      drawBill(g, cam, { ...base, spr: T.bare });
      drawBill(g, cam, { ...base, spr: T.crown, alpha: 1 - 0.88 * bare(tr.z) });
    }
    // лучи сквозь сень
    const myst = win(t, EV.L4 - 0.2, EV.pechal + 0.3, 0.5, 0.4);
    g.save(); g.globalAlpha = 0.16 + 0.12 * myst; g.fillStyle = "#fff3c8";
    for (let k = 0; k < 5; k++) { const x = 200 + k * 380 + Math.sin(t * 0.4 + k) * 40; g.beginPath(); g.moveTo(x, -300); g.lineTo(x + 90, -300); g.lineTo(x + 360, H + 300); g.lineTo(x + 180, H + 300); g.closePath(); g.fill(); }
    g.restore();
    drawLeavesForest(g, cam, t, false);
  });
  const myst = win(t, EV.L4 - 0.2, EV.pechal + 0.3, 0.5, 0.4);
  g.save(); g.globalAlpha = 0.3 * myst; g.fillStyle = "#2c3a3a"; g.fillRect(0, 0, W, H); g.globalAlpha = 0.7 * myst; const vg = g.createRadialGradient(960, 560, 240, 960, 560, 1100); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "#1e140a"); g.fillStyle = vg; g.fillRect(0, 0, W, H); g.restore();
  if (!NOHERO) drawGooseRear(g, heroForest(t));
  withRoll(g, cam, () => drawLeavesForest(g, cam, t, true));
  windStreaks(g, t, 400 + 900 * ease(inv(EV.pechal - 0.3, EV.pechal + 0.4, t)), 0.16);
}
function drawLeavesForest(g, cam, t, near) {
  // листопад: редкий, потом вихрь на «обнажалась» — листья летят на зрителя
  const n = 60 + Math.floor(120 * ease(inv(EV.pechal, EV.obnazh - 0.3, t))) + Math.floor(220 * ease(inv(EV.obnazh - 0.15, EV.obnazh + 0.25, t)));
  for (let k = 0; k < n; k++) {
    const burst = k >= 180, mid = k >= 60 && !burst;
    const t0 = burst ? EV.obnazh - 0.1 + hash(k * 3) * 0.6 : mid ? EV.pechal + hash(k * 3) * 1.4 : T0.s3 - 1 + hash(k) * 6;
    if (t < t0) continue;
    const u = t - t0, z0 = burst || mid ? zForest(t0) + 2.5 + hash(k * 5) * (burst ? 14 : 22) : zForest(T0.s3) + hash(k * 5) * 90;
    const x0 = (hash(k * 7) - 0.5) * (burst ? 9 : 16), y0 = burst ? 2 + hash(k * 11) * 5 : 6 + hash(k * 11) * 5;
    const x = x0 + Math.sin(u * 2 + k) * 0.8 + (burst ? (hash(k * 13) - 0.5) * 6 * u : 0), y = y0 - u * (burst ? 2.2 : 1.1) + Math.sin(u * 3 + k) * 0.3, z = z0 - (burst ? 7 * u : 0);
    if (y < -0.2) continue;
    const dz = z - cam.z;
    if (near !== dz < HERO_DZ + 0.6) continue;
    drawLeaf3(g, cam, x, y, z, u * (2 + 3 * hash(k)) + k, k, burst ? 0.42 : 0.3);
  }
}

// ================= 4. Туман ложится на поля =================
function camFog(t) { return { x: Math.sin((t - T0.s4) * 0.9) * 0.6, y: lerp(2.6, 1.5, ease(inv(EV.tuman - 0.8, EV.tuman + 0.5, t))) + Math.sin(t * 1.6) * 0.08, z: zFog(t), hy: 450, roll: Math.sin((t - T0.s4) * 0.9 + 1) * 0.05 }; }
function heroFog(t) {
  return { x: 960 + Math.cos((t - T0.s4) * 0.9) * 30, y: 640 + Math.sin(t * 5.2) * 6, s: 1.05, mode: "fly", flap: flapAt(t, 2.8), look: 0.3, pitch: 0, roll: -Math.sin((t - T0.s4) * 0.9 + 1) * 0.08 };
}
function scFog(g, t) {
  const cam = camFog(t);
  const lay = easeOut(inv(EV.tuman - 1.0, EV.tuman + 0.4, t));
  withRoll(g, cam, () => {
    drawSky(g, SPR.skyDusk, SKYHZ.dusk, cam);
    drawFar(g, SPR.farDusk, cam, 60);
    drawGround(g, SPR.texDusk, cam);
    g.save(); g.globalAlpha = 0.25; g.fillStyle = "#2e3048"; g.fillRect(-420, cam.hy, W + 840, H + 400); g.restore();
    const items = scatter(cam, 13, 0, 41, (i, z, h) => ({ spr: SPR.bare[i % 2], x: (i % 2 ? 1 : -1) * (7 + h(1) * 9), y: 0, z, h: 9 + h(2) * 3, flip: h(3) < 0.5 }));
    // пласты тумана: висят выше, на «ложился» опускаются на землю и расползаются
    items.push(...scatter(cam, 5, 0, 43, (i, z, h) => ({ spr: SPR.fog[i % 2], x: (h(1) - 0.5) * 16, y: lerp(6 + h(2) * 4, -0.2, lay), z, h: lerp(1.6, 2.4, lay), alpha: 0.55 + 0.35 * lay, ay: 0.5 })));
    drawBills(g, cam, items);
    haze(g, cam, "230,226,220", 0.3 + 0.4 * lay, 200);
  });
  // низовой туман у края кадра растёт
  const gr = g.createLinearGradient(0, 700, 0, H); gr.addColorStop(0, "rgba(243,239,230,0)"); gr.addColorStop(1, `rgba(243,239,230,${0.7 * lay})`); g.fillStyle = gr; g.fillRect(0, 700, W, H - 700);
  const st = heroFog(t);
  // вихри от кончиков крыльев режут туман
  if (lay > 0.4 && !NOHERO) { const [t1, t2] = wingAngles(st.flap); for (const sd of [-1, 1]) { const tx = st.x + sd * (58 + 112 * Math.cos(t1) + 150 * Math.cos(t2)) * st.s, ty = st.y + (-16 - 112 * Math.sin(t1) - 150 * Math.sin(t2)) * st.s; g.save(); g.lineCap = "round"; const gr2 = g.createLinearGradient(tx, ty, tx + sd * 260, H); gr2.addColorStop(0, `rgba(246,243,236,${0.85 * (lay - 0.4) / 0.6})`); gr2.addColorStop(1, "rgba(246,243,236,0)"); g.strokeStyle = gr2; for (let k = 0; k < 3; k++) { g.lineWidth = 9 - k * 2; g.beginPath(); g.moveTo(tx, ty); g.bezierCurveTo(tx + sd * 40, ty + 140, tx + sd * (140 + k * 30), ty + 300, tx + sd * (260 + k * 40), H + 40); g.stroke(); } g.restore(); } }
  if (!NOHERO) drawGooseRear(g, st);
}

// ================= 5. Клин: крикливый караван, догоняем, «к югу» =================
function vOff(k) { if (k === 0) return [0, 0, 0]; const sd = k % 2 ? 1 : -1, n = Math.ceil(k / 2); return [sd * n * 2.0, -n * 0.12, -n * 2.4]; }
const HERO_SLOT = 7; // хвост правого крыла клина (n = 4)
function flockShot(t) {
  // герой догоняет клин сзади-снизу; на «караван» камера отъезжает и поднимается — клин виден целиком, «Λ»
  const j = easeIO(inv(T0.s5, EV.yugu + 0.2, t));
  const slot = vOff(HERO_SLOT);
  const hero = [lerp(3, slot[0], j), lerp(-0.5, slot[1], j), lerp(-17, slot[2], j)];
  const pull = easeIO(inv(EV.karavan - 0.2, EV.karavan + 1.4, t));
  const back = lerp(HERO_DZ, 12.5, pull), upc = lerp(1.1, 3.4, pull);
  const cam = { x: lerp(hero[0], 2.2, pull), y: hero[1] + upc, z: hero[2] - back, hy: lerp(250, 340, pull), roll: Math.sin(t * 0.7) * 0.03 + 0.05 * ease(inv(EV.yugu - 0.2, EV.yugu + 0.6, t)) };
  return { cam, hero, j, pull };
}
function scFlock(g, t) {
  const { cam, hero, pull } = flockShot(t);
  withRoll(g, cam, () => {
    drawSky(g, SPR.skyDusk, SKYHZ.dusk, cam, 0.05);
    // юг: тёплое зарево и пальмы на горизонте на «к югу»
    const so = ease(inv(EV.yugu - 0.1, EV.yugu + 0.8, t));
    if (so > 0) {
      g.save(); g.globalAlpha = so; const gr = g.createRadialGradient(960, cam.hy, 20, 960, cam.hy, 700); gr.addColorStop(0, "rgba(255,206,110,0.95)"); gr.addColorStop(1, "rgba(255,180,90,0)"); g.fillStyle = gr; g.fillRect(-400, cam.hy - 700, W + 800, 900); g.restore();
    }
    // земля далеко внизу
    const fa = SPR.farAir; g.drawImage(fa, (t * 30) % 1600, 0, W + 840, fa.height, -420, cam.hy - 20, W + 840, H - cam.hy + 420);
    haze(g, cam, "226,160,120", 0.6, 160);
    // облака мимо (свой бег вперёд)
    const run = (t - T0.s5) * 14, camC = { ...cam, z: cam.z + run };
    drawBills(g, camC, scatter(camC, 14, -1e9, 51, (i, z, h) => ({ spr: SPR.cloudsDusk[Math.abs(i) % 2], x: (Math.abs(i) % 2 ? 1 : -1) * (6 + h(1) * 14), y: cam.y + 1 + h(2) * 6, z, h: 3 + h(3) * 2, ay: 0.5 })));
    if (so > 0) for (let k = 0; k < 5; k++) { const x = 560 + k * 200 + (k % 2) * 40, hh = (190 + 70 * hash(k)) * so; g.save(); g.globalAlpha = so; g.drawImage(SPR.palm[k % 2], x - hh * 0.32, cam.hy - hh + 10, hh * 0.64, hh); g.restore(); }
    // клин: гуси оглядываются и гогочут
    const order = [...Array(7).keys()].sort((a, b) => vOff(b)[2] - vOff(a)[2]);
    let talk = null;
    for (const k of order) {
      const o = vOff(k), hk = (ph) => Math.max(0, Math.sin((t - ph) * 16)) * win(t, ph, ph + 0.55, 0.02, 0.05);
      const turn = win(t, EV.gusey - 0.1 + k * 0.05, EV.gusey + 0.9, 0.15, 0.25) + win(t, EV.karavan - 0.05 + k * 0.05, EV.karavan + 0.9, 0.15, 0.25);
      const look = lerp(0.3, k % 2 ? 1 : -1, clamp(turn));
      const pos = gooseAt(g, cam, o[0], o[1] + Math.sin(t * 2 + k) * 0.06, o[2], { mode: "fly", flap: flapAt(t, 2.8, k * 0.17), look, honk: Math.max(hk(EV.gusey + k * 0.08), hk(EV.karavan + 0.1 + k * 0.06)), roll: Math.sin(t * 1.4 + k) * 0.05, seed: k });
      if (k === 3 && pos) talk = pos;
    }
    // «га-га!» тушью у клюва ближнего гуся
    for (const ph of [EV.gusey, EV.karavan + 0.1]) {
      const a = win(t, ph, ph + 1.0, 0.05, 0.3); if (a <= 0 || !talk) continue;
      const [hx, hy, s] = talk; const sp = spr(t, ph);
      g.save(); g.globalAlpha = a; g.translate(hx + 120 * s + 90, hy - 160 * s - 30); g.scale(sp, sp); g.rotate(-0.08);
      g.font = '58px "GTitle"'; g.fillStyle = P.ink; g.textAlign = "center"; g.fillText("га-га!", 0, 0); g.restore();
    }
    // герой — в мире клина (после отъезда камеры он в хвосте правого крыла)
    const st = { mode: "fly", flap: flapAt(t, 3.2 - 0.4 * pull), look: 0.3, roll: 0.05 * Math.sin(t * 1.5), pitch: 0, seed: 9, honk: Math.max(0, Math.sin((t - EV.karavan - 0.5) * 16)) * win(t, EV.karavan + 0.5, EV.karavan + 0.95, 0.02, 0.05) };
    if (!NOHERO) gooseAt(g, cam, hero[0], hero[1], hero[2], st);
  });
  windStreaks(g, t, 700 * (1 - pull), 0.14);
}
function heroFlock(t) { const { cam, hero, pull } = flockShot(t); const p = proj(cam, hero[0], hero[1], hero[2]); return { mode: "fly", flap: flapAt(t, 3.2 - 0.4 * pull), look: 0.3, roll: 0.05 * Math.sin(t * 1.5), pitch: 0, seed: 9, x: p ? p[0] : 960, y: p ? p[1] : 600, s: p ? HERO_DZ / p[3] : 1 }; }

// ================= 6. Деревня: скучная пора, ноябрь у ворот =================
function drawNovember(g, x, y, sc, t) {
  // появляется из снежного вихря у ворот: сначала спираль, потом фигура проявляется снизу вверх
  const s = SPR.november, w = s.width * sc, h = s.height * sc;
  const sw = win(t, EV.noyabr - 0.8, EV.noyabr + 0.9, 0.2, 0.6);
  if (sw > 0) { g.save(); g.lineCap = "round"; for (let k = 0; k < 10; k++) { const yy = y - k * h * 0.1, r = 40 + k * 16 * sc * 1.6, a0 = t * 8 + k * 0.7; g.globalAlpha = sw * 0.85; g.strokeStyle = k % 2 ? "#f4f8fa" : "#b9cfdc"; g.lineWidth = 6; g.beginPath(); g.ellipse(x, yy, r, r * 0.22, 0, a0, a0 + 3.6); g.stroke(); } g.restore(); }
  const a = easeOut(inv(EV.noyabr - 0.6, EV.noyabr + 0.35, t)); if (a <= 0) return;
  g.save(); g.globalAlpha = a; g.beginPath(); g.rect(x - w, y - h * a - 10, w * 2, h * a + 20); g.clip();
  g.drawImage(s, x - w / 2, y - h, w, h);
  g.restore();
  // морозное дыхание на «двора»
  const br = win(t, EV.dvora - 0.1, EV.dvora + 1.3, 0.2, 0.5);
  if (br > 0) { g.save(); for (let k = 0; k < 5; k++) { const p = ((t - EV.dvora) * 0.8 + k / 5) % 1; g.globalAlpha = br * (1 - p) * 0.6; g.fillStyle = "#f2f6f8"; g.beginPath(); g.arc(x - 20 * sc - p * 160 * sc, y - h * 0.77 + p * 20 * sc, (14 + p * 40) * sc, 0, TAU); g.fill(); } g.restore(); }
}
function scVillage(g, t) {
  const push = easeIO(inv(EV.dvora - 0.5, EV.dvora + 0.9, t));
  const z = 1.02 + 0.05 * inv(T0.s6, T0.s7, t) + push * 0.16;
  const fx = lerp(960, 1220, push), fy = lerp(560, 1180, push);
  g.save(); g.translate(fx, fy); g.scale(z, z); g.translate(-fx, -fy);
  g.drawImage(SPR.village, -100, -60);
  g.save(); g.translate(-100, -60);
  const wind = 0.4 + 0.6 * ease(inv(EV.pora - 0.5, EV.pora + 0.5, t));
  // дым из труб клонит ветром
  for (const [x, y] of [[409, 471], [1777, 467]]) for (let k = 0; k < 7; k++) { const p = ((t * 0.6 + k / 7) % 1); g.save(); g.globalAlpha = 0.4 * (1 - p); g.fillStyle = "#e7e4dc"; g.beginPath(); g.ellipse(x - p * 320 * wind, y - p * 170, 18 + p * 46, 14 + p * 30, -0.4, 0, TAU); g.fill(); g.restore(); }
  // клин тает в небе
  for (let k = 0; k < 8; k++) { const o = vOff(k), u = inv(T0.s6, EV.pora + 1.2, t); if (u >= 1) continue; drawGooseRear(g, { x: 1260 + u * 500 + o[0] * 14, y: 230 - u * 150 - o[2] * 5, s: 0.07 * (1 - u * 0.5), mode: "fly", flap: flapAt(t, 3, k * 0.2), look: 0.3, seed: k }); }
  // створки ворот: болтаются на ветру, на «ноябрь» захлопываются с отскоком
  const shut = spr(t, EV.noyabr + 0.02, 0.55);
  const open = (1 - clamp(shut, 0, 1.12)) * (0.75 + 0.12 * Math.sin(t * 2.6));
  for (const [hx, d, sp2] of [[824, 1, SPR.doorL], [1166, -1, SPR.doorR]]) {
    const wv = 171 * Math.max(0.2, Math.cos(open * 1.25));
    g.save(); g.translate(hx, 572); g.scale(d * wv / 210, 1); g.drawImage(sp2, 0, 0, 210, 360); g.restore();
  }
  g.restore();
  // листья несёт по земле
  const lf = ease(inv(EV.pora - 0.4, EV.pora + 0.4, t)) * (1 - ease(inv(EV.noyabr, EV.noyabr + 0.8, t)) * 0.6);
  for (let k = 0; k < 18; k++) { const p = ((t * 0.35 + hash(k)) % 1); const x = W + 100 - p * (W + 300), y = 880 + hash(k * 3) * 180 - Math.abs(Math.sin(p * 9 + k)) * 60; g.save(); g.globalAlpha = lf; g.translate(x, y); g.rotate(p * 12 + k); g.scale(0.45, 0.3); g.drawImage(SPR.leaves[k % 6], -60, -45); g.restore(); }
  drawNovember(g, 1225, 905, 0.56, t);
  g.restore();
  const dull = easeIO(inv(EV.pora - 0.6, EV.pora + 0.6, t));
  g.save(); g.globalAlpha = 0.28 * dull; g.fillStyle = "#56657a"; g.fillRect(0, 0, W, H); g.restore();
  snowflakes(g, t, Math.floor(180 * easeOut(inv(EV.noyabr - 0.4, EV.dvora, t))), EV.noyabr - 0.4, 1.3);
}
function snowflakes(g, t, n, t0, wind = 1) {
  g.save(); g.fillStyle = "#f6f8fa";
  for (let k = 0; k < n; k++) {
    const born = t0 + hash(k) * 1.5; if (t < born) continue;
    const u = t - born, x = ((hash(k * 3) * (W + 400) - u * 220 * wind) % (W + 400) + W + 400) % (W + 400) - 200, y = ((hash(k * 7) * 300 - 200) + u * (90 + 80 * hash(k * 5))) % (H + 100);
    g.globalAlpha = 0.9; g.beginPath(); g.arc(x + Math.sin(u * 3 + k) * 12, y, 2 + 3.5 * hash(k * 13), 0, TAU); g.fill();
  }
  g.restore();
}

// ================= 7. Финал: клин уходит к закату, название крупно =================
function scFinal(g, t) {
  const u = inv(T0.s7, TOTAL, t);
  g.save(); const z = 1.05 - 0.05 * easeOut(u); g.translate(960, 600); g.scale(z, z); g.translate(-960, -600); g.drawImage(SPR.final, 0, 0); g.restore();
  for (let k = 0; k < 8; k++) { const o = vOff(k); drawGooseRear(g, { x: lerp(1250, 1880, u) + o[0] * lerp(12, 6, u), y: lerp(170, 110, u) - o[2] * lerp(4, 2, u), s: lerp(0.085, 0.04, u), mode: "fly", flap: flapAt(t, 2.6, k * 0.2), look: 0.3, seed: k }); }
  drawTitleFinal(g, t);
}

// ================= сцены и переходы =================
const SC = [
  { a: 0, b: T0.s2, draw: scPond, hero: heroPond },
  { a: T0.s2, b: T0.s3, draw: scField, o: [960, 560], hero: heroField },
  { a: T0.s3, b: T0.s4, draw: scForest, o: [960, 470], hero: heroForest },
  { a: T0.s4, b: T0.s5, draw: scFog, o: [960, 450], hero: heroFog },
  { a: T0.s5, b: T0.s6, draw: scFlock, o: [960, 300], hero: heroFlock },
  { a: T0.s6, b: T0.s7, draw: scVillage, o: [1100, 700] },
  { a: T0.s7, b: TOTAL + 1, draw: scFinal, o: [960, 540] },
];
function heroState(t) {
  if (t < T0.s2) return heroPond(t);
  if (t < T0.s3) return heroField(t);
  if (t < T0.s4) return heroForest(t);
  if (t < T0.s5) return heroFog(t);
  return heroFlock(t);
}
