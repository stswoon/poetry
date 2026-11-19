// ---------- Сцены ----------
// каждая сцена: fn(g, t, u) — рисует весь кадр в экранных координатах
const camLerp = (a, b, u) => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), u)) });

// большие колосья у объектива (пролёт)
function nearStalks(g, t, speed, n, a = 1) {
  for (let i = 0; i < n; i++) {
    const x = ((hash(i) * 2600 - t * speed * (0.8 + hash(i * 3) * 0.6)) % 2600 + 2600) % 2600 - 340;
    const h = 380 + hash(i * 5) * 380, bx = x, by = H + 40;
    const bend = Math.sin(t * 2.4 + i) * 0.12 + 0.18;
    const tx = bx + Math.sin(bend) * h, ty = by - Math.cos(bend) * h;
    const col = jit(C.gold, i * 13, 40);
    limb(g, [[bx, by], [lerp(bx, tx, 0.6) - 10, lerp(by, ty, 0.6)], [tx, ty]], 9 + hash(i) * 6, shade(col, -0.15));
    ear(g, tx, ty, 1.1 + hash(i * 7), -Math.PI / 2 + bend, col, 1, i);
  }
  reset(g);
}
// колос: зёрна мазками в два ряда и ости. ripe 0…1 — от зелёного к золоту (снизу вверх)
function ear(g, x, y, s, ang, col, ripe, seed) {
  const c = Math.cos(ang), sn = Math.sin(ang);
  for (let i = 0; i < 9; i++) {
    const along = i * 15 * s, k = clamp(ripe * 1.4 - (i / 9) * 0.4);
    const gc = mix([120, 160, 60], col, k);
    for (const sd of [-1, 1]) {
      const ox = x + c * along - sn * sd * 7 * s, oy = y + sn * along + c * sd * 7 * s;
      dab(g, ox, oy, 20 * s, 11 * s, ang + sd * 0.45, jit(gc, seed * 31 + i * 2 + sd, 24));
      // ость
      reset(g); g.strokeStyle = css(shade(gc, 0.25), 0.85); g.lineWidth = 1.6 * s;
      g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + Math.cos(ang + sd * 0.5) * 46 * s, oy + Math.sin(ang + sd * 0.5) * 46 * s); g.stroke();
    }
  }
  reset(g);
}
// светлый вихрь ветра: лента мазков, голова в точке hx
function windRibbon(g, hx, y0, t, a = 1, s = 1) {
  for (let i = 0; i < 44; i++) {
    const x = hx - i * 30 * s, y = y0 + Math.sin(i * 0.28 - t * 7) * 46 * s + Math.sin(i * 0.11) * 30 * s;
    const ang = Math.atan2(Math.cos(i * 0.28 - t * 7) * 0.28 * 46, 30);
    dab(g, x, y, 54 * s, 13 * s * (1 - i / 50), -ang, jit(i % 3 ? C.cream : C.cerul, i, 20), a * (1 - i / 46) * 0.85);
  }
  reset(g);
}
// ночь, ползущая с востока: тёмная синь со звёздами правее границы bx (экран)
function nightCurtain(g, bx, t) {
  reset(g);
  const gr = g.createLinearGradient(bx - 260, 0, bx + 200, 0);
  gr.addColorStop(0, "rgba(22,24,70,0)"); gr.addColorStop(1, "rgba(22,24,70,0.82)");
  g.fillStyle = gr; g.fillRect(bx - 260, 0, W - bx + 260, 760);
  for (let i = 0; i < 40; i++) {
    const x = bx + hash(i * 3.3) * (W - bx + 100), y = 30 + hash(i * 1.7) * 600;
    if (x < bx) continue;
    const tw = 0.6 + 0.4 * Math.sin(t * 4 + i);
    dab(g, x, y, 16, 5, 0.3, C.lemon, tw * clamp((x - bx) / 160)); dab(g, x, y, 16, 5, 1.9, C.lemon, tw * clamp((x - bx) / 160));
  }
  reset(g);
}
// руки Дня: золотые полосы мазков из солнца, на концах ладони-лучи. p 0…1
function dayArms(g, sx, sy, p, t) {
  if (p <= 0) return;
  for (const sd of [-1, 1]) {
    const L = (sd > 0 ? 860 : 520) * p;
    const N = Math.max(2, Math.floor(L / 22));
    const path = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, d = u * L;
      path.push([sx + sd * d, sy - Math.sin(u * Math.PI * 0.85) * 210 * p - u * 120 * p + Math.sin(d * 0.015 - t * 4) * 6]);
    }
    // рукав из света: 5 рядов мазков, к кисти уже
    for (let i = 1; i < path.length; i++) {
      const [x, y] = path[i], [x0, y0] = path[i - 1], u = i / N;
      const a = Math.atan2(y - y0, x - x0), nx = -Math.sin(a), ny = Math.cos(a);
      const half = lerp(70, 26, u);
      for (let r = -2; r <= 2; r++) {
        const off = r / 2 * half;
        dab(g, x + nx * off, y + ny * off, 60, half * 0.55, a + (hash(i * 7 + r) - 0.5) * 0.15, jit(mix(C.white, C.cad, Math.abs(r) / 2 * 0.8 + u * 0.2), i * 5 + r + sd * 400, 22), (0.55 + 0.35 * (1 - Math.abs(r) / 2)) * clamp(p * 3));
      }
    }
    // ладонь и пять лучей-пальцев
    const [lx, ly] = path[path.length - 1], [px0, py0] = path[path.length - 2];
    const la = Math.atan2(ly - py0, lx - px0);
    blob(g, lx, ly, 34, 30, C.lemon, 61, 6);
    for (let f = 0; f < 5; f++) {
      const fa = la + (f - 2) * 0.36 - sd * 0.1;
      for (let j = 1; j <= 3; j++) dab(g, lx + Math.cos(fa) * (20 + j * 22), ly + Math.sin(fa) * (20 + j * 22), 34, 17 - j * 3, fa, jit(C.lemon, f * 10 + j, 16), 0.95);
    }
  }
  reset(g);
}
// веки солнца-ока: облачные мазки вне миндалины; open 0…1
function sunLids(g, cx, cy, r, open, td) {
  const Rw = r * 2.4, Ho = r * 1.75, h = r * 1.3 * Math.max(0.02, open);
  const lid = ramp([[0.6, [170, 96, 140]], [0.86, [100, 70, 136]], [1, [238, 156, 118]]], td);
  const alm = (hh) => { g.moveTo(cx + Rw, cy); g.quadraticCurveTo(cx, cy - hh * 2, cx - Rw, cy); g.quadraticCurveTo(cx, cy + hh * 2, cx + Rw, cy); };
  reset(g);
  g.save();
  g.beginPath(); alm(Ho); alm(h); g.clip("evenodd");
  let n = 0;
  for (let y = cy - Ho * 1.1; y < cy + Ho * 1.1; y += r * 0.17) for (let x = cx - Rw; x < cx + Rw; x += r * 0.36) {
    n++;
    const up = y < cy;
    dab(g, x + hash(n) * r * 0.25, y, r * 0.55, r * 0.2, (up ? 1 : -1) * (x - cx) / Rw * 0.5 + (hash(n * 2) - 0.5) * 0.25, jit(shade(lid, up ? 0.05 : -0.1), n, 26));
  }
  g.restore();
  // тёмная кромка век
  reset(g); g.strokeStyle = css(shade(lid, -0.5)); g.lineWidth = r * 0.07; g.lineCap = "round";
  g.beginPath(); alm(h); g.stroke();
  g.strokeStyle = css(shade(lid, -0.3), 0.8); g.lineWidth = r * 0.05; g.beginPath(); alm(Ho); g.stroke();
  // ресницы-лучи по кромке верхнего века
  if (open > 0.15) for (let i = 1; i < 8; i++) {
    const u = i / 8, x = lerp(cx - Rw, cx + Rw, u), y = cy - h * 2 * 2 * u * (1 - u);
    const a = -Math.PI / 2 + (u - 0.5) * 1.6;
    dab(g, x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.3, r * 0.5, r * 0.11, a, shade(lid, -0.45), 0.95);
  }
  reset(g);
}
// гнездо примятой ржи (вид сверху)
function strawNest(g, cx, cy, t, td) {
  const lit = fieldLight(td), base = ramp(RYE_DAY, td);
  reset(g); g.fillStyle = css(shade(base, -0.35)); g.fillRect(0, 0, W, H);
  let n = 0;
  for (let y = -40; y < H + 60; y += 26) for (let x = -40; x < W + 60; x += 30) {
    n++;
    const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
    const inNest = d < 330;
    const ang = inNest ? Math.atan2(dy, dx) + Math.PI / 2 + (hash(n) - 0.5) * 0.6 : (hash(n) - 0.5) * 3 + Math.sin(t * 2 + x * 0.01) * 0.2;
    let col = jit(base, n, 40);
    if (!inNest) { col = shade(col, -0.1); if (hash(n * 3) > 0.7) col = shade(col, 0.25 * lit); }
    dab(g, x + hash(n * 5) * 18, y, inNest ? 60 : 30, inNest ? 13 : 16, ang, shade(col, (lit - 1) * 0.9));
    if (!inNest && hash(n * 9) > 0.993) dab(g, x, y, 18, 18, 0, shade([60, 90, 220], (lit - 1) * 0.8));
  }
  reset(g);
}

// ---------- Мальчик в мире: бег ----------
const ROW_B = HZ + 330;                 // ряд нивы, по которому он бежит
const RUN_V = 480;                      // мировых px/с
const RUN_T0 = () => EV.L2 - 0.15;
const XB_AT = (t) => (MEZHA_X - (ROW_B - HZ) * 0.7 - 30) + RUN_V * (t - EV.do);
function boyJump(xb) {
  const dx = xb + (ROW_B - HZ) * 0.7 - MEZHA_X;
  const per = 2600, q = ((dx % per) + per * 1.5) % per - per / 2;
  return Math.abs(q) < 115 ? Math.sin(Math.PI * (q + 115) / 230) * 62 : 0;
}

// колосья у ног героя: редкие, не выше середины голени, качаются ветром; xw — мировая x для привязки к полю
function frontRye(g, x, y, s, t, lit, xw) {
  const base = ramp(RYE_DAY, todAt(t));
  for (let i = 0; i < 7; i++) {
    const k = Math.floor((xw || 0) / 30) + i;
    const ox = (i - 3) * 30 * s / 1.3 - ((((xw || 0) % 30) + 30) % 30) * s / 1.3 + (hash(k * 3.7) - 0.5) * 8 * s;
    const h = (26 + hash(k * 2.1) * 12) * s, bendA = -Math.PI / 2 + 0.15 + windWave(x + ox, ROW_B, t) * 0.4;
    const px = x + ox, py = y + (5 + hash(k) * 6) * s;
    const col = shade(jit(base, k, 30), (lit - 1) * 0.9);
    dab(g, px + Math.cos(bendA) * h * 0.5, py + Math.sin(bendA) * h * 0.5, h, 4.2 * s, bendA, col, 0.95);
    dab(g, px + Math.cos(bendA) * h * 1.05, py + Math.sin(bendA) * h * 1.05, h * 0.42, 5.4 * s, bendA, shade(col, 0.22 * lit), 0.95);
  }
  reset(g);
}

// ---------- Список сцен ----------
function sIntro(g, t) {
  const V = { x: 700 + t * 700, y: HZ - 80, z: 1.0 };
  drawSky(g, V, t); drawSun(g, ...P(V, sunPos(t)[0] + t * 700 * 0.0, sunPos(t)[1]), 70, t);
  drawField(g, V, t);
  nearStalks(g, t, 1500, 9);
  drawTitle(g, W / 2, 300, 132, inv(0.25, 2.4, t), clamp((t - 1.5) / 0.5) * (1 - clamp((t - EV.L1 + 0.5) / 0.4)), true);
}
function sMacro(g, t) {
  const t0 = EV.L1 - 0.1, back = ease(inv(EV.zharkoy - 0.1, EV.E1 + 0.15, t));
  const V = camLerp({ x: 900, y: HZ - 40, z: 1.9 }, { x: 960, y: HZ + 40, z: 1.0 }, back);
  drawSky(g, V, t);
  const sp = sunPos(t); drawSun(g, ...P(V, sp[0], sp[1]), 70 * V.z, t);
  drawField(g, V, t);
  // марево: дрожащие светлые мазки над полем
  for (let i = 0; i < 26; i++) {
    const x = (i * 83 + t * 40) % W, y = P(V, 0, HZ)[1] - 30 + Math.sin(t * 6 + i) * 10;
    dab(g, x, y, 60, 6, Math.sin(t * 5 + i) * 0.2, C.cream, 0.25);
  }
  // колос крупно: зреет на «Зреет», уходит вдаль на «жаркой»
  const ripe = ease(inv(EV.zreet - 0.1, EV.zreet + 1.0, t));
  const s = lerp(5.2, 1.0, back), ex = lerp(1000, 1380, back), ey = lerp(600, 690, back);
  const sway = Math.sin(t * 2.2) * 0.06;
  limb(g, [[ex - 20 * s, H + 60], [ex + 2 * s, ey + 60 * s]], 9 * s * 0.7, shade(mix([120, 160, 60], C.gold, ripe), -0.2));
  ear(g, ex + 2 * s, ey + 50 * s, s, -Math.PI / 2 + sway, C.gold, ripe, 3);
  reset(g);
  return {};
}
function sRun(g, t) {
  const xb = XB_AT(t);
  const wide = ease(inv(EV.zolot - 0.2, EV.perel + 0.3, t));
  const z = lerp(1.0, 0.62, wide);
  const V = { x: xb + 200 / z * lerp(1, 0.5, wide), y: lerp(ROW_B - 100, ROW_B - 200, wide), z };
  drawSky(g, V, t);
  const sp = sunPos(t); drawSun(g, ...P(V, sp[0], sp[1]), 70 * V.z, t);
  drawField(g, V, t, { mezha: 2600 });
  // ветер обгоняет мальчика
  const wu = inv(EV.gonit - 0.5, EV.E4 + 0.4, t);
  if (wu > 0 && wu < 1) for (let k = 0; k < 3; k++) windRibbon(g, lerp(-300, 2700, wu) - k * 160, lerp(420, 640, wide) + k * 70 - 70, t + k * 0.4, 1 - k * 0.2, lerp(1.5, 1.1, wide) * (1 - k * 0.15));
  const [bx, by] = P(V, xb, ROW_B);
  const s = 1.3 * V.z;
  const prih = inv(EV.prih - 0.1, EV.prih + 1.0, t);
  const swerve = Math.sin(prih * Math.PI * 3) * (1 - prih) * (prih > 0 ? 1 : 0);
  const kx = bx - 330 * s + swerve * 240 * s + Math.sin(t * 1.7) * 20, ky = by - 440 * s + Math.cos(t * 2.3) * 16 - Math.abs(swerve) * 60 * s;
  const r = drawBoySide(g, bx, by, s, 1, { kind: "run", dist: xb / 1.3, jump: boyJump(xb), holdRel: [-50, -30], env: [232, 170, 60] }, t);
  frontRye(g, bx, by, s, t, 1, xb);
  drawKite(g, kx, ky, s * 0.9, swerve * 0.7 - 0.15, t, r.hand);
  return {};
}
function sMoonPeek(g, t) {
  const t0 = EV.L5 - 0.25;
  const V = { x: 1600 - (t - t0) * 30, y: 20, z: 1.25 };
  drawSky(g, V, t);
  const pk = 0.7 * ease(inv(EV.robko - 0.3, EV.mesyac + 0.2, t)) + 0.3 * ease(inv(EV.mesyac + 0.3, EV.ochi + 0.2, t)) + 0.02 * Math.sin(t * 1.8);
  const [mx, my] = P(V, 1560 + pk * 190, 40);
  drawMoon(g, mx, my, 105 * V.z, t, { blush: ease(inv(EV.mesyac, EV.ochi, t)), look: -0.6 });
  const [cx, cy] = P(V, 1500, 80);
  drawCloud(g, cx, cy, 1.5, mix([240, 170, 140], [200, 150, 190], 0.4), 7);
  drawCloud(g, cx + 600, cy + 230, 1.1, [236, 160, 120], 21);
}
function sFace(g, t) {
  const u = inv(EV.ochi - 0.1, EV.L6 - 0.1, t);
  drawSky(g, { x: 1500 + u * 40, y: 120, z: 1.5 }, t);
  drawCloud(g, 300, 760, 1.6, [236, 160, 130], 31, 0.9);
  const sc = 8.6 + u * 0.5;
  drawBoyFront(g, 960, 470 + 192 * sc, sc, { arms: 0, hold: false, tilt: 0.06, lookUp: 1, moonEyes: 1, smile: 0.7, warm: 0.4, lit: 0.97, env: [150, 120, 200] }, t);
}
function sMoonSurprise(g, t) {
  const pan = ease(inv(EV.den1 - 0.25, EV.E6 + 0.15, t));
  const V = camLerp({ x: 1720, y: 50, z: 2.0 }, { x: 700, y: 330, z: 0.95 }, pan);
  drawSky(g, V, t);
  const sp = sunPos(t); drawSun(g, ...P(V, sp[0], sp[1]), 70 * V.z, t);
  drawField(g, V, t);
  const [mx, my] = P(V, 1720, 40);
  drawMoon(g, mx, my, 105 * V.z, t, { brow: ease(inv(EV.izum - 0.1, EV.izum + 0.3, t)), look: -1, blush: 0.6 });
}
function sDayArms(g, t) {
  const V = { x: 700 + (t - EV.L7) * 25, y: 330, z: 0.85 };
  drawSky(g, V, t);
  const sp = sunPos(t), [sx, sy] = P(V, sp[0], sp[1]);
  // ночь наступает до «День», руки отталкивают её
  const p = ease(inv(EV.den2 - 0.25, EV.raskin + 0.45, t));
  const nb = lerp(lerp(1500, 1050, ease(inv(EV.L7 - 0.2, EV.noch + 0.2, t))), 2100, p);
  nightCurtain(g, nb, t);
  const [mx, my] = P(V, 1720, 40);
  drawMoon(g, mx, my, 105 * V.z, t, { look: -1, brow: 0.5 * (1 - p) });
  drawSun(g, sx, sy, 70 * V.z * (1 + p * 0.25), t);
  dayArms(g, sx, sy, p, t);
  drawField(g, V, t);
  const pb = ease(inv(EV.raskin - 0.35, EV.raskin + 0.35, t));
  const r = drawBoyFront(g, 1380, 830, 1.45, { arms: pb, smile: 0.4 + pb * 0.6, tilt: lerp(0.16, 0.04, pb), lookUp: 1 - pb * 0.5, lit: fieldLight(todAt(t)) * 0.95, warm: 0.85, env: [150, 90, 150] }, t);
  frontRye(g, 1380, 830, 1.45, t, fieldLight(todAt(t)) * 0.95, 0);
  drawKite(g, 1570 + Math.sin(t * 1.4) * 16, 230 + Math.cos(t * 1.9) * 12, 0.8, 0.2, t, r.handR);
}
// стайка ласточек: мазки-галочки, машут крыльями
function birds(g, t, x0, y0, vx, n, s) {
  for (let i = 0; i < n; i++) {
    const x = x0 + vx * t + (hash(i) - 0.5) * 500 * s + Math.sin(t * 1.3 + i) * 30, y = y0 + (hash(i * 2) - 0.5) * 220 * s + Math.sin(t * 2 + i * 1.7) * 20;
    const fl = Math.sin(t * 14 + i * 2) * 0.5;
    dab(g, x - 12 * s, y - 4 * s * fl, 26 * s, 4.5 * s, 0.35 + fl, [40, 30, 50]); dab(g, x + 12 * s, y - 4 * s * fl, 26 * s, 4.5 * s, -0.35 - fl, [40, 30, 50]);
  }
}
function sCrane(g, t) {
  const u = ease(inv(EV.L9 - 0.15, EV.L10 - 0.1, t));
  const V = camLerp({ x: 900, y: HZ + 120, z: 0.95 }, { x: 1350, y: HZ - 60, z: 0.5 }, u);
  drawSky(g, V, t);
  const sp = sunPos(t); drawSun(g, ...P(V, sp[0], sp[1]), 70 * V.z, t);
  drawField(g, V, t, { stooks: 1 });
  birds(g, t - EV.L9, 200, 330, 300, 9, 2.2);
}
function sPan(g, t) {
  const u = ease(inv(EV.L10 - 0.1, EV.L11 + 0.15, t));
  const V = { x: lerp(-150, 2450, u), y: HZ - 120, z: 0.62 };
  drawSky(g, V, t);
  const sp = sunPos(t); drawSun(g, ...P(V, sp[0], sp[1]), 70 * V.z, t);
  drawField(g, V, t, { stooks: 1 });
  birds(g, t - EV.L10, 1700, 280, -260, 7, 1.8);
}
function sEyeClose(g, t) {
  const V = { x: -60, y: HZ - 120, z: 1.1 };
  drawSky(g, V, t);
  const [ex, ey] = P(V, -120, HZ - 70);
  const sink = ease(inv(EV.smezh - 0.2, EV.nebo + 0.2, t));
  drawSun(g, ex, ey + sink * 40, 80 * V.z, t, 1 - sink * 0.3);
  // зрачок-искра в центре солнца: око
  reset(g); g.fillStyle = css(C.verm); g.beginPath(); g.arc(ex, ey + sink * 40, 22, 0, TAU); g.fill();
  sunLids(g, ex, ey, 80 * V.z, 1 - ease(inv(EV.smezh - 0.15, EV.smezh + 0.45, t)), todAt(t));
  drawField(g, V, t);
}
function sLie(g, t) {
  const td = todAt(t);
  const zoom = 1 + (t - EV.nebo) * 0.04, rot = Math.sin(t * 0.3) * 0.04;
  g.setTransform(zoom * Math.cos(rot), zoom * Math.sin(rot), -zoom * Math.sin(rot), zoom * Math.cos(rot), W / 2 - W / 2 * zoom, H / 2 - H / 2 * zoom);
  strawNest(g, 960, 400, t, td);
  const eyes = t < EV.oko ? 1 - ease(inv(EV.nebo - 0.1, EV.nebo + 0.3, t)) : ease(inv(EV.oko + 0.15, EV.oko + 0.5, t));
  const pb = 0.85;
  drawBoyFront(g, 960, 660, 2.3, { arms: pb, lie: true, eyes, tilt: -0.08, lit: Math.min(1, fieldLight(td) + 0.38), cool: 0.6 * (1 - ease(inv(EV.oko - 0.1, EV.oko + 0.6, t))), env: mix([80, 80, 150], [236, 180, 80], ease(inv(EV.oko - 0.1, EV.oko + 0.6, t))), warm: ease(inv(EV.oko - 0.1, EV.oko + 0.6, t)) * 0.5, smile: t < EV.oko ? 0.3 : 0.3 + ease(inv(EV.oko + 0.3, EV.oko + 0.8, t)) * 0.7 }, t);
  // тёмная синь ночи / золотой рассвет поверх
  reset(g);
  const dark = clamp((0.95 - fieldLight(td)) * 0.9);
  g.fillStyle = `rgba(20,24,70,${(dark * 0.55).toFixed(3)})`; g.fillRect(0, 0, W, H);
  const dawn = ease(inv(EV.oko - 0.1, EV.oko + 0.6, t));
  if (dawn > 0) {
    const gr = g.createLinearGradient(W, 0, 0, 0);
    gr.addColorStop(0, `rgba(255,200,90,${(0.32 * dawn).toFixed(3)})`); gr.addColorStop(lerp(0.05, 1, dawn), "rgba(255,200,90,0)");
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }
}
function sOko(g, t) {
  const u = ease(inv(EV.oko2 - 0.1, EV.fin, t));
  const V = camLerp({ x: 2300, y: HZ - 90, z: 1.25 }, { x: 2150, y: HZ - 160, z: 0.8 }, u);
  drawSky(g, V, t);
  const sp = sunPos(t), [sx, sy] = P(V, sp[0], sp[1]);
  // огонь: языки мазков вырываются из ока
  const fire = ease(inv(EV.oko2 - 0.05, EV.oko2 + 0.6, t));
  for (let i = 0; i < 46; i++) {
    const a = i / 46 * TAU, L = (120 + hash(i) * 160) * fire * V.z * (0.8 + 0.2 * Math.sin(t * 9 + i));
    for (let j = 1; j <= 4; j++) dab(g, sx + Math.cos(a) * (70 * V.z + L * j / 4), sy + Math.sin(a) * (70 * V.z + L * j / 4), 40 * V.z, (16 - j * 2) * V.z, a, mix(C.cad, C.verm, j / 4), 0.85 * fire * (1 - j / 5));
  }
  drawSun(g, sx, sy, 78 * V.z, t, 1, 1);
  sunLids(g, sx, sy, 78 * V.z, ease(inv(EV.oko2 - 0.25, EV.oko2 + 0.35, t)), todAt(t));
  drawField(g, V, t, { stooks: 1 });
}
function sOutro(g, t) {
  const u = inv(EV.fin, CFG.total, t);
  const V = { x: 1800 - u * 60, y: HZ - 170, z: 0.8 };
  drawSky(g, V, t);
  const sp = sunPos(t); drawSun(g, ...P(V, sp[0], sp[1]), 78 * V.z, t);
  drawField(g, V, t, { stooks: 1 });
  drawKite(g, 1720 + Math.sin(t * 1.2) * 18, 300 + Math.cos(t * 1.7) * 12, 0.7, 0.15, t, null);
  // тёмная виньетка под заголовком для читаемости
  reset(g);
  const gr = g.createRadialGradient(W / 2, 400, 100, W / 2, 400, 900);
  gr.addColorStop(0, "rgba(30,20,40,0.38)"); gr.addColorStop(1, "rgba(30,20,40,0)");
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  drawTitle(g, W / 2, 380, 150, inv(EV.fin + 0.1, EV.fin + 1.3, t), clamp((t - EV.fin - 1.0) / 0.5), false);
}

// [функция, начало, переход в неё]
const SCENES = [
  [sIntro, 0, ""],
  [sMacro, EV.L1 - 0.1, "gust"],
  [sRun, EV.L2 - 0.15, "gust"],
  [sMoonPeek, EV.L5 - 0.25, "rise"],
  [sFace, EV.ochi - 0.1, "fade"],
  [sMoonSurprise, EV.L6 - 0.1, "fade"],
  [sDayArms, EV.L7 - 0.15, "gust"],
  [sCrane, EV.L9 - 0.15, "gust"],
  [sPan, EV.L10 - 0.1, "fade"],
  [sEyeClose, EV.L11 - 0.1, "cut"],
  [sLie, EV.nebo - 0.05, "cut"],
  [sOko, EV.oko2 - 0.1, "flash"],
  [sOutro, EV.fin, "gust"],
];
