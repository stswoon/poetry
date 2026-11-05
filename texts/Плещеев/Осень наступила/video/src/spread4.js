// ---------- Разворот 4: «Зашумели воды быстрого ручья, птички улетели в тёплые края» ----------

// Ручей — лента синей бумаги по плавной кривой
const STREAM = (() => {
  const K0 = [[-20, 612], [150, 656], [300, 628], [452, 700], [600, 772], [760, 752], [870, 764]], P = [];
  for (let i = 0; i < K0.length - 1; i++) {
    const a = K0[Math.max(0, i - 1)], b = K0[i], d = K0[i + 1], e = K0[Math.min(K0.length - 1, i + 2)];
    for (let j = 0; j < 20; j++) { const u = j / 20, u2 = u * u, u3 = u2 * u, f = (q) => 0.5 * (2 * b[q] + (d[q] - a[q]) * u + (2 * a[q] - 5 * b[q] + 4 * d[q] - e[q]) * u2 + (3 * b[q] - a[q] - 3 * d[q] + e[q]) * u3); P.push([f(0), f(1)]); }
  }
  P.push(K0[K0.length - 1]);
  const S = [0]; for (let i = 1; i < P.length; i++) S.push(S[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  return { P, S, L: S[S.length - 1] };
})();
function streamAt(s) { // точка и направление ручья на расстоянии s от начала
  const { P, S } = STREAM; let i = 1; while (i < P.length - 1 && S[i] < s) i++;
  const u = clamp((s - S[i - 1]) / (S[i] - S[i - 1]), 0, 1);
  return [lerp(P[i - 1][0], P[i][0], u), lerp(P[i - 1][1], P[i][1], u), Math.atan2(P[i][1] - P[i - 1][1], P[i][0] - P[i - 1][0])];
}
const PEBBLES = []; { const r = mulberry32(17); for (let i = 0; i < 16; i++) { const s = 30 + i * (STREAM.L - 60) / 15, d = (i % 2 ? 1 : -1) * (48 + r() * 14); PEBBLES.push({ s, d, rx: 9 + r() * 9, ry: 6 + r() * 5, a: r() * 3, c: mixc(hex("#8f8a80"), hex("#a8916f"), r()) }); } }

// Листья-птички: сначала приклеены к странице, на «птички» срываются и улетают клином
const BIRDS = [
  { x: 186, y: 262, a: -0.35, k: "maple", c: K.red, len: 150, v: [-240, 150] },
  { x: 372, y: 196, a: 0.25, k: "aspen", c: K.yellow, len: 124, v: [-120, 75] },
  { x: 540, y: 310, a: -0.1, k: "maple", c: K.orange, len: 156, v: [0, 0] },
  { x: 318, y: 440, a: 0.45, k: "birch", c: K.ochre, len: 124, v: [-120, -75] },
  { x: 690, y: 214, a: -0.4, k: "maple", c: K.red, len: 140, v: [-240, -150] },
].map((b, i) => ({ ...b, i, tp: EV.pti - 0.08 + i * 0.11 }));
const LIFT = 0.3, MORPH = 0.7, FLY = 2.6;

// Птичка сбоку: тело-капля, хвост и крылья из листьев. m — насколько крылья раскрылись, flap — фаза взмаха.
function leafBird(c, x, y, h, sz, b, m, flap, dark = 0) {
  const col = dark ? [40, 30, 20] : b.c, body = dark ? col : mixc(b.c, K.brown, 0.55), bl = b.len * 0.26 * sz * (0.4 + 0.6 * m), wl = b.len * 0.78 * sz * m;
  const up = (1 - Math.cos(flap)) / 2, sh = { shadow: dark ? 0 : 1.2, stem: 0.04 };
  c.save(); c.translate(x, y); c.rotate(h);
  if (wl > 1) leaf(c, bl * 0.1, -bl * 0.2, wl * 0.8, lerp(-0.75, 2.3, up) + 0.25, b.k, mixc(col, [40, 25, 10], dark ? 0 : 0.25), col, 0, sh); // дальнее крыло
  if (m > 0.05) leaf(c, -bl * 0.85, 0, bl * 1.5 * m, -Math.PI / 2 - 0.12, b.k, col, col, 0, sh); // хвост
  c.beginPath(); c.ellipse(0, 0, bl, bl * 0.42, 0, 0, TAU); c.fillStyle = css(body); c.fill();
  c.beginPath(); c.arc(bl * 0.92, -bl * 0.18, bl * 0.34, 0, TAU); c.fillStyle = css(dark ? col : [62, 38, 20]); c.fill();
  if (!dark) {
    c.beginPath(); c.moveTo(bl * 1.2, -bl * 0.26); c.lineTo(bl * 1.62, -bl * 0.1); c.lineTo(bl * 1.2, -bl * 0.02); c.closePath(); c.fillStyle = "#e0a030"; c.fill();
    c.beginPath(); c.arc(bl * 1.0, -bl * 0.26, bl * 0.07, 0, TAU); c.fillStyle = "#fff6e0"; c.fill();
  }
  if (wl > 1) leaf(c, bl * 0.05, -bl * 0.25, wl, lerp(-0.45, 2.55, up), b.k, col, col, 0, sh); // ближнее крыло
  c.restore();
}
function birdPath(b) { // в координатах кадра
  const x0 = SX - PW + b.x + Math.sin(b.a) * b.len * 0.5, y0 = PY + b.y - Math.cos(b.a) * b.len * 0.5;
  return [[x0, y0], [x0 + 560, 170 + b.i * 22], [2260 + b.v[0], 30 + b.v[1] * 0.6]];
}
const bez = (P, u) => [0, 1].map((q) => (1 - u) * (1 - u) * P[0][q] + 2 * (1 - u) * u * P[1][q] + u * u * P[2][q]);
// Рисует улетевших птичек поверх альбома (кадр). На странице до отрыва их рисует drawLeft4.
function flyingBirds(c, t) {
  for (const b of BIRDS) {
    const a = t - b.tp; if (a <= 0 || a > MORPH + FLY) continue;
    const P = birdPath(b);
    if (a < LIFT) { // отрывается: приподнимается, тень растёт
      const l = sstep(a / LIFT);
      c.save(); c.translate(SX - PW, PY);
      leaf(c, b.x, b.y - 10 * l, b.len * (1 + 0.15 * l), b.a, b.k, b.c, b.c, 0, { shadow: 1 + 2 * l });
      c.restore();
      tape(c, SX - PW + b.x + 8, PY + b.y - 20 - 40 * l, 80, 28, 0.5 + l, 300 + b.i, 1 - l);
      continue;
    }
    const f = sstep(prog(a, MORPH, MORPH + FLY)), u = f * f * 0.35 + f * 0.65, p = bez(P, u), q = bez(P, Math.min(1, u + 0.02));
    const h = Math.atan2(q[1] - p[1], q[0] - p[0]), m = sstep(prog(a, LIFT, MORPH));
    if (m < 1) { // лист сворачивается в тело, раскрываются крылья
      c.save(); c.globalAlpha = 1 - m; c.translate(SX - PW, PY - 10); leaf(c, b.x, b.y, b.len * 1.15 * (1 - 0.5 * m), lerp(b.a, h + Math.PI / 2, m), b.k, b.c, b.c, 0, { shadow: 3 }); c.restore();
    }
    leafBird(c, p[0], p[1], h, 1.15 - 0.35 * f, b, m, (t - b.tp) * 13 + b.i);
  }
}

function drawLeft4(c, t) {
  c.drawImage(PAPER_L[3], 0, 0);
  // ручей разворачивается на «зашумели воды», рябь бежит быстрее на «быстрого»
  const us = sstep(prog(t, EV.zas - 0.15, EV.vod + 0.55)), Ls = STREAM.L * us;
  if (Ls > 2) {
    for (const p of PEBBLES) { if (p.s > Ls) continue; const [x, y, a] = streamAt(p.s); c.save(); c.translate(x - Math.sin(a) * p.d, y + Math.cos(a) * p.d); c.rotate(p.a); c.shadowColor = "rgba(60,38,18,0.3)"; c.shadowBlur = 4; c.shadowOffsetY = 2; c.beginPath(); c.ellipse(0, 0, p.rx, p.ry, 0, 0, TAU); c.fillStyle = css(p.c); c.fill(); c.restore(); }
    const path = () => { c.beginPath(); let first = true; for (let i = 0; i < STREAM.P.length && STREAM.S[i] <= Ls; i++) { const [x, y] = STREAM.P[i]; if (first) { c.moveTo(x, y); first = false; } else c.lineTo(x, y); } const e = streamAt(Ls); c.lineTo(e[0], e[1]); };
    c.save(); c.lineCap = "round"; c.lineJoin = "round";
    c.shadowColor = "rgba(40,50,80,0.3)"; c.shadowBlur = 8; c.shadowOffsetY = 4;
    path(); c.strokeStyle = "#3a6aa8"; c.lineWidth = 76; c.stroke(); c.shadowColor = "transparent";
    path(); c.strokeStyle = css(K.stream); c.lineWidth = 64; c.stroke();
    path(); c.strokeStyle = "rgba(170,205,240,0.45)"; c.lineWidth = 22; c.stroke();
    const ph = (t - EV.zas) * 120 + Math.max(0, t - EV.bys) * 210;
    c.strokeStyle = "rgba(255,255,255,0.85)"; c.lineWidth = 3.5;
    for (let k = 0; k < 40; k++) {
      const s = ((k * 53 + ph) % (STREAM.L + 60)) - 30; if (s < 0 || s > Ls - 10) continue;
      const [x, y, a] = streamAt(s), off = (k % 3 - 1) * 17;
      c.beginPath(); c.arc(x - Math.sin(a) * off, y + Math.cos(a) * off, 11, a - 2.4, a - 0.7); c.stroke();
    }
    c.restore();
  }
  // листок-лодочка плывёт по ручью на «быстрого ручья»
  const sb = sstep(prog(t, EV.bys - 0.1, EV.E14 + 0.6));
  if (t > EV.bys - 0.1) { const [x, y, a] = streamAt(STREAM.L * (0.02 + 0.93 * sb)); leaf(c, x, y, 48, a + Math.PI / 2 + 0.25 * Math.sin(t * 7), "aspen", K.yellow, K.yellow, 0, { shadow: 1.2 }); }
  // листья-птички до отрыва
  for (const b of BIRDS) {
    if (t >= b.tp) continue;
    leaf(c, b.x, b.y, b.len, b.a, b.k, b.c, b.c, 0);
    tape(c, b.x + 8, b.y - 20, 80, 28, 0.5, 300 + b.i);
  }
}

// Тёплый свет «тёплых краёв» в правом верхнем углу кадра
function warmGlow(c, t) {
  const g = sstep(prog(t, EV.tep - 0.3, EV.kra + 0.7)) * (1 - sstep(prog(t, EV.close - 0.2, EV.close + 0.5)));
  if (g <= 0) return;
  const gr = c.createRadialGradient(1840, 70, 30, 1840, 70, 700);
  gr.addColorStop(0, `rgba(255,214,120,${0.62 * g})`); gr.addColorStop(0.45, `rgba(255,178,84,${0.26 * g})`); gr.addColorStop(1, "rgba(255,170,80,0)");
  c.fillStyle = gr; c.fillRect(1000, 0, 920, 760);
}

// Жёлуди на правой странице
function acorns(c) {
  c.save();
  leaf(c, 668, 900, 120, 0.55, "oak", K.ochre, K.ochre, 0, { shadow: 0.8 });
  for (const [x, y, a] of [[704, 836, 0.3], [758, 866, -0.4]]) {
    c.save(); c.translate(x, y); c.rotate(a);
    c.shadowColor = "rgba(60,38,18,0.35)"; c.shadowBlur = 5; c.shadowOffsetY = 3;
    c.beginPath(); c.ellipse(0, 10, 19, 27, 0, 0, TAU); c.fillStyle = "#b9893f"; c.fill(); c.shadowColor = "transparent";
    c.beginPath(); c.ellipse(-6, 6, 5, 12, -0.2, 0, TAU); c.fillStyle = "rgba(255,240,200,0.35)"; c.fill();
    c.beginPath(); c.arc(0, -6, 22, Math.PI, 0); c.lineTo(22, -2); c.quadraticCurveTo(0, 4, -22, -2); c.closePath(); c.fillStyle = "#6b4a28"; c.fill();
    c.strokeStyle = "rgba(30,15,5,0.4)"; c.lineWidth = 1.2; for (let i = -18; i <= 18; i += 6) { c.beginPath(); c.moveTo(i, -2); c.lineTo(i * 0.7, -22 + Math.abs(i) * 0.6); c.stroke(); }
    stem(c, [[0, -26], [3, -34], [8, -40]], 3, K.brown);
    c.restore();
  }
  c.restore();
}
