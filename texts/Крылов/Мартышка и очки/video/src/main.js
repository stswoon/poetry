// ---------- Режиссура: эфир → распаковка → четыре попытки → ворчание → удар о камень → повтор с моралью ----------
const ctx = document.getElementById("scene").getContext("2d");
const E = EV;
const roomCv = mkCanvas(RW, RH), rc = roomCv.getContext("2d");
const layCv = mkCanvas(W, H), lc = layCv.getContext("2d");
const BX = 660, BY = 600;            // где сидит Мартышка
const TI = E.w_hvat + 0.28;          // удар о камень
const ROCK = [1010, 598];
const IMPACT = [985, 548];

// ключи: [время, значение, длительность] → значение в момент t (числа или массивы), пружина по умолчанию
function kf(list, t, f = springSoft) {
  let i = -1; for (let k = 0; k < list.length; k++) if (t >= list[k][0]) i = k;
  if (i < 0) return list[0][1];
  if (i === 0) return list[0][1];
  const a = list[i - 1][1], b = list[i][1], u = f(prog(t, list[i][0], list[i][0] + (list[i][2] || 0.4)));
  const mix = (x, y) => (Array.isArray(x) ? x.map((v, j) => mix(v, y[j])) : lerp(x, y, u));
  return mix(a, b);
}
const ease = (u) => easeInOut(u);

// ---------- камера (координаты комнаты: центр и зум) ----------
const SH_WIDE = [660, 370, 1.0], SH_MED = [660, 330, 1.32], SH_FACE = [660, 300, 1.95], SH_FACE2 = [660, 300, 2.35],
      SH_TOP = [660, 200, 2.05], SH_TAIL = [900, 360, 1.6], SH_HANDS = [660, 400, 1.7], SH_DESK = [660, 470, 1.35], SH_ROCK = [880, 420, 1.45], SH_MED_R = [500, 330, 1.32], SH_SWING = [760, 330, 1.15];
const CAM = [
  [0, SH_WIDE], [E.L1 - 0.15, SH_FACE, 0.5], [E.L2 - 0.1, SH_MED_R, 0.45], [E.w_och1 - 0.1, SH_WIDE, 0.4],
  [E.L5 - 0.1, SH_DESK, 0.35], [E.w_poldz + 0.2, SH_WIDE, 0.5], [E.w_vert - 0.15, SH_HANDS, 0.3],
  [E.w_temyu - 0.12, SH_TOP, 0.28], [E.w_hvost - 0.12, SH_TAIL, 0.28], [E.w_nyuh - 0.12, SH_FACE2, 0.28],
  [E.L9 - 0.1, SH_MED, 0.4], [E.L10 - 0.1, SH_FACE, 0.3], [E.L11 - 0.1, SH_MED, 0.3], [E.L12 - 0.1, SH_FACE2, 0.3],
  [E.L13 - 0.1, SH_MED, 0.3], [E.L14 - 0.1, SH_WIDE, 0.35], [E.w_kamen - 0.1, SH_SWING, 0.35], [TI + 0.5, SH_WIDE, 0.6],
  [E.L17 - 0.1, SH_WIDE, 0.1], [E.L18 - 0.1, SH_MED, 1.6], [E.w_nevezh - 0.1, SH_MED, 0.4], [E.L20 - 0.1, SH_FACE, 0.5],
  [E.L21 - 0.1, SH_MED, 0.4], [E.E21 + 0.5, SH_WIDE, 1.2],
];
// встряски: [время, сила]
const SHAKES = [[E.w_tfu, 10], [E.w_nalg + 0.05, 8], [TI, 26], [E.w_poznat + 0.35, 8]];
function camAt(t) {
  let [cx, cy, z] = kf(CAM, t, springSnap);
  z = Math.max(1, z);
  const hw = RW / (2 * z), hh = RH / (2 * z);
  cx = clamp(cx, hw, RW - hw); cy = clamp(cy, hh, RH - hh);
  let sx = 0, sy = 0;
  for (const [te, a] of SHAKES) if (t >= te && t < te + 0.8) { const d = Math.exp(-(t - te) * 6) * a; sx += Math.sin((t - te) * 71) * d; sy += Math.cos((t - te) * 53) * d; }
  return { cx, cy, z, sx, sy };
}

// ---------- руки и мимика ----------
const REST = [[490, 592], [830, 592]];
const HANDS = [
  [0, REST], [E.V0 - 0.35, [[490, 592], [860, 330]], 0.4], [E.L1 + 0.5, REST, 0.5], [E.L2 + 0.1, [[490, 592], [720, 410]], 0.5],
  [E.w_och1 - 0.05, [[450, 330], [870, 330]], 0.3], [E.L5 + 0.25, [[560, 470], [760, 470]], 0.35], [E.w_poldz, [[470, 470], [850, 470]], 0.2],
  [E.w_dost + 0.1, REST, 0.4], [E.w_vert - 0.2, [[612, 440], [708, 440]], 0.35], [E.w_temyu - 0.15, [[588, 196], [732, 196]], 0.3],
  [E.w_temyu + 0.55, [[520, 540], [800, 540]], 0.4], [E.w_nyuh - 0.15, [[520, 540], [726, 336]], 0.3], [E.w_liz - 0.15, [[594, 372], [770, 470]], 0.3],
  [E.L9, [[584, 460], [736, 460]], 0.5], [E.L10 - 0.1, [[520, 585], [800, 560]], 0.3], [E.w_durak - 0.1, [[520, 585], [772, 330]], 0.25],
  [E.L11 - 0.05, [[470, 420], [850, 430]], 0.35], [E.L12 - 0.05, [[500, 380], [820, 400]], 0.35], [E.L13 - 0.05, [[470, 440], [850, 420]], 0.35],
  [E.L14, [[618, 430], [702, 430]], 0.45], [E.w_kamen - 0.15, [[640, 150], [710, 150]], 0.35], [TI - 0.12, [[930, 520], [990, 520]], 0.12],
  [TI + 0.5, REST, 0.6], [E.w_hudu - 0.1, [[440, 440], [880, 440]], 0.35], [E.w_poznat - 0.1, REST, 0.4],
  [E.w_gonit - 0.25, [[490, 592], [760, 420]], 0.2], [E.w_gonit, [[490, 592], [1060, 300]], 0.12], [E.w_gonit + 0.6, REST, 0.5],
];
const FACE = {
  squint: [[0, 0], [E.w_glaz - 0.1, 1, 0.3], [E.L2, 0.3, 0.4], [E.w_och1, 0, 0.2], [E.w_nikak - 0.1, 1, 0.3], [E.L10, 0.15, 0.2], [E.w_nevezh - 0.1, 0.55, 0.3], [E.w_poznat, 0.1, 0.3]],
  anger: [[0, 0], [E.w_nikak, 0.4, 0.3], [E.L10 - 0.1, 1, 0.2], [E.L14 + 0.6, 0.3, 0.3], [E.w_kamen, 1, 0.2], [TI + 0.6, 0.5, 0.4], [E.L17, 0, 0.4], [E.w_gonit - 0.2, 0.7, 0.2]],
  brow: [[0, 0], [E.L2, 0.5, 0.3], [E.w_och1, 1, 0.2], [E.L5 + 0.5, 0.3, 0.3], [E.w_nikak, 0, 0.3], [E.w_poznat, 0.6, 0.3]],
  smile: [[0, 0.7], [E.L1, 0.2, 0.3], [E.w_och1, 0.9, 0.2], [E.w_nikak, -0.2, 0.3], [E.L14 + 0.5, -0.6, 0.3], [E.L17, 0.2, 0.4], [E.w_poznat, 0.9, 0.3]],
  open: [[0, 0], [E.w_och1, 0.7, 0.15], [E.w_och1 + 0.7, 0, 0.3], [E.w_poldz, 0.5, 0.15], [E.w_dost + 0.4, 0, 0.3], [TI - 0.1, 0.8, 0.1], [TI + 0.6, 0, 0.3]],
  tongue: [[0, 0], [E.w_liz - 0.05, 1, 0.2], [E.E8 + 0.3, 0, 0.3]],
  sniff: [[0, 0], [E.w_nyuh - 0.05, 1, 0.1], [E.w_liz - 0.1, 0, 0.2]],
  look: [[0, [0, 0]], [E.L2 + 0.1, [-0.8, -0.8], 0.4], [E.w_och1, [0, 0], 0.2], [E.L5 + 0.1, [0, 0.9], 0.3], [E.w_vert, [0, 0.6], 0.3],
         [E.w_temyu, [0, -1], 0.2], [E.w_hvost, [1, 0.3], 0.2], [E.w_nyuh, [0, 0.6], 0.2], [E.L9, [0, 0], 0.3], [E.L14, [0.4, 0.5], 0.3],
         [E.w_kamen, [1, 0.6], 0.2], [TI + 0.6, [0, 0], 0.3], [E.L18, [1, -0.2], 0.4], [E.w_nevezh, [-0.6, 0], 0.3], [E.w_poznat, [0, -0.3], 0.3], [E.w_gonit - 0.3, [1, -0.3], 0.2]],
};
function blinkAt(t) { const p = (t + 0.7) % 3.1; return p < 0.14 ? Math.sin((p / 0.14) * Math.PI) : 0; }
const monkeyY = (t) => BY + 330 * (1 - springPop(prog(t, E.V0 - 0.7, E.V0 + 0.5)));

// ---------- очки: шесть пар ----------
const ROW = (i) => [330 + i * 132, 586];
const FLY = (i) => E.w_poldz + 0.05 + i * 0.07;
const TAIL_T = (i) => E.w_hvost + 0.12 + i * 0.16;
const GATHER = E.L14 + 0.05;
const PUTDOWN = E.L10 - 0.1;   // перед ворчанием кладёт две пары на стол
function bundle(c, t, x, y) { for (let i = 0; i < 6; i++) glasses(c, x - 40 + (i % 3) * 40, y - 14 * Math.floor(i / 3) + (i % 2) * 6, 0.62, -0.3 + i * 0.12); }

// ---------- осколки ----------
const SHARDS = (() => { const r = mulberry32(17), a = []; for (let i = 0; i < 46; i++) {
  const ang = -Math.PI * (0.08 + r() * 0.84), sp = 380 + r() * 760, g = 1900, vx = Math.cos(ang) * sp, vy = Math.sin(ang) * sp;
  const y0 = IMPACT[1], yl = 596 + r() * 22, tl = (-vy + Math.sqrt(vy * vy + 2 * g * (yl - y0))) / g;
  a.push({ vx, vy, g, tl, s: 0.6 + r() * 0.8, rot0: r() * 6, spin: (r() - 0.5) * 16, ph: r() * 6 }); } return a; })();
function shardPos(sh, tau) { const tt = clamp(tau, 0, sh.tl); return [IMPACT[0] + sh.vx * tt, IMPACT[1] + sh.vy * tt + 0.5 * sh.g * tt * tt, sh.rot0 + sh.spin * tt]; }

// ---------- комната ----------
const REWIND = [E.w_polez - 0.05, E.w_polez + 0.55];
const FLOAT = [900, 330];
function drawRoom(t) {
  const cam = camAt(t);
  rc.reset();
  rc.translate(RW / 2, RH / 2); rc.scale(cam.z, cam.z); rc.translate(-cam.cx + cam.sx, -cam.cy + cam.sy);
  rc.drawImage(ROOM_BG, 0, 0, RW, RH);
  const c = rc, my = monkeyY(t);
  const H2 = kf(HANDS, t);
  const shake = t > E.L10 - 0.1 && t < E.E13 ? Math.sin(t * 31) * 4 : 0;
  // что на голове и на хвосте
  const onHeadG = t >= E.w_temyu - 0.05 && t < GATHER;
  const crownK = prog(t, E.w_poznat - 0.05, E.w_poznat + 1.2);
  const tailUp = sstep(prog(t, E.w_hvost - 0.15, E.w_hvost + 0.35)) * (1 - sstep(prog(t, GATHER, GATHER + 0.4)));
  const tip = [lerp(980, 900, tailUp), lerp(360, 200, tailUp)];
  const ringK = [0, 1, 2].map((i) => (t < GATHER ? springPop(prog(t, TAIL_T(i), TAIL_T(i) + 0.8)) : 1 - sstep(prog(t, GATHER, GATHER + 0.25))));
  // что в руках
  const held = (cc) => {
    const [l, r] = H2;
    if (t >= E.w_vert - 0.25 && t < E.w_temyu - 0.05) { // вертит: «так» — поворот, «сяк» — вверх ногами
      const rot = lerp(0, 1.25, springPop(prog(t, E.w_tak - 0.05, E.w_tak + 0.6))) + lerp(0, Math.PI - 1.25, springPop(prog(t, E.w_syak - 0.05, E.w_syak + 0.6)));
      glasses(cc, (l[0] + r[0]) / 2, (l[1] + r[1]) / 2 - 30, 1.05, rot);
      // стрелки вращения
      const ak = win(t, E.w_tak - 0.05, E.w_temyu - 0.2, 0.15, 0.2);
      if (ak > 0) { cc.save(); cc.globalAlpha = ak; cc.lineWidth = 8; cc.strokeStyle = "#ffd21f"; cc.lineCap = "round";
        cc.beginPath(); cc.arc((l[0] + r[0]) / 2, (l[1] + r[1]) / 2 - 30, 120, -2.6 + t * 3, -1.2 + t * 3); cc.stroke(); cc.restore(); }
    }
    if (t >= E.w_nyuh - 0.15 && t < PUTDOWN) glasses(cc, r[0] - 76, r[1] - 18, 0.9, 0.15); // пара для нюха
    if (t >= E.w_liz - 0.15 && t < PUTDOWN) glasses(cc, l[0] + 66, l[1] - 26, 0.9, -0.12, { fog: sstep(prog(t, E.w_liz + 0.1, E.w_liz + 0.6)), drip: sstep(prog(t, E.w_liz + 0.4, E.E9 + 0.2)) });
    if (t >= GATHER && t < TI) bundle(cc, t, (l[0] + r[0]) / 2, (l[1] + r[1]) / 2 - 20);
  };
  const behind = (cc) => { // запахи и брызги слюны
    const sk = win(t, E.w_nyuh, E.w_liz - 0.1, 0.1, 0.2);
    if (sk > 0) { cc.save(); cc.globalAlpha = sk; cc.lineWidth = 6; cc.strokeStyle = "#a7f070"; cc.lineCap = "round";
      for (let i = 0; i < 3; i++) { cc.beginPath(); const y0 = 380 - ((t * 120 + i * 40) % 120);
        for (let k = 0; k <= 12; k++) { const yy = y0 - k * 6, xx = 640 + i * 22 + Math.sin(k * 0.9 + t * 9 + i) * 8; k ? cc.lineTo(xx, yy) : cc.moveTo(xx, yy); } cc.stroke(); }
      cc.restore(); }
  };
  monkey(c, {
    x: BX + shake, y: my, t,
    squint: kf(FACE.squint, t), anger: kf(FACE.anger, t), brow: kf(FACE.brow, t), smile: kf(FACE.smile, t),
    open: Math.max(kf(FACE.open, t), t > E.L10 && t < E.E13 ? 0.18 + 0.32 * Math.abs(Math.sin(t * 13)) : 0),
    tongue: kf(FACE.tongue, t), sniff: kf(FACE.sniff, t), look: kf(FACE.look, t), blink: blinkAt(t),
    tilt: t > E.w_nevezh && t < E.w_poznat ? 0.12 : 0,
    lh: H2[0], rh: H2[1],
    tail: { tip, curl: 1, rings: 3, ringK },
    onHead: (cc) => {
      if (onHeadG) { const u = springPop(prog(t, E.w_temyu - 0.05, E.w_temyu + 0.6)); glasses(cc, 0, lerp(-210, -132, u), 0.95, 0.08 * Math.sin(t * 4)); }
      if (crownK > 0) { const u = springPop(crownK); crown(cc, 0, lerp(-520, -150, u), 0.95, 0.1 * Math.sin(t * 3)); }
    },
    held, behind,
  });
  // камень
  const rockIn = springSnap(prog(t, E.L15 - 0.25, E.L15 + 0.5));
  if (t > E.L15 - 0.3) rock(c, lerp(1500, ROCK[0], rockIn), ROCK[1] - 32, 0.95);
  desk(c);
  if (t > E.L15 - 0.3) { c.save(); c.beginPath(); c.rect(-200, 560, RW + 400, 40); c.clip(); rock(c, lerp(1500, ROCK[0], rockIn), ROCK[1] - 32, 0.95); c.restore(); }
  // посылка
  if (t > E.L5 - 0.4 && t < E.w_dost + 1.2) {
    const drop = springPop(prog(t, E.L5 - 0.35, E.L5 + 0.6)), out = sstep(prog(t, E.w_dost + 0.3, E.w_dost + 1.0));
    parcel(c, lerp(660, -300, out), lerp(-200, 604, drop), 1.1, sstep(prog(t, E.w_poldz - 0.15, E.w_poldz + 0.2)), sstep(prog(t, E.w_poldz - 0.3, E.w_poldz)), -0.6 * out);
  }
  // шесть пар на столе: вылетают из посылки, потом уходят в работу
  for (let i = 0; i < 6; i++) {
    if (t < FLY(i)) continue;
    const u = prog(t, FLY(i), FLY(i) + 0.55), [rx, ry] = ROW(i);
    const x = lerp(660, rx, ease(u)), y = lerp(470, ry, ease(u)) - Math.sin(Math.PI * u) * 260;
    const gone = i === 0 ? E.w_vert - 0.25 : i <= 3 ? TAIL_T(i - 1) : i === 4 ? E.w_nyuh - 0.15 : E.w_liz - 0.15;
    if (t >= gone) continue;
    glasses(c, x, y, 0.75 * (0.6 + 0.4 * springPop(u)), (1 - u) * 6 + 0.04 * Math.sin(t * 3 + i));
  }
  // две пары лежат на столе во время ворчания
  if (t >= PUTDOWN && t < GATHER) { glasses(c, 540, 588, 0.75, 0.1); glasses(c, 790, 588, 0.75, -0.08, { fog: 1 }); }
  // осколки
  if (t >= TI) {
    const rw = prog(t, REWIND[0], REWIND[1]);
    if (t < REWIND[1]) for (const sh of SHARDS) {
      let tau = t - TI; if (rw > 0) tau = sh.tl * (1 - ease(rw));
      const [x, y, r] = shardPos(sh, tau), gl = t > E.w_sverk - 0.1 && t < E.L17 ? Math.max(0, Math.sin(t * 7 + sh.ph)) : 0;
      shard(c, x, y, sh.s, r, gl);
    }
  }
  // собранные очки в «повторе»: ценник, стрелка вниз, пинок
  if (t >= REWIND[1] - 0.05) {
    const up = springSoft(prog(t, REWIND[1] - 0.05, REWIND[1] + 0.8));
    let gx = lerp(IMPACT[0], FLOAT[0], up), gy = lerp(IMPACT[1], FLOAT[1], up) + Math.sin(t * 2.5) * 8, gr = 0;
    const kick = prog(t, E.w_gonit + 0.02, E.w_gonit + 1.1);
    if (kick > 0) { gx += kick * 900; gy -= Math.sin(kick * Math.PI * 0.6) * 380; gr = kick * 12; }
    if (kick < 1) {
      glasses(c, gx, gy, 1.3, gr);
      if (up > 0.3 && t < E.w_ceny + 0.8) star4(c, gx + 60, gy - 40, 30 * Math.abs(Math.sin(t * 4)), "#fffbe0");
      const tk = springPop(prog(t, E.w_ceny - 0.05, E.w_ceny + 0.8));
      if (tk > 0 && kick <= 0) { // ценник «???»
        c.save(); c.translate(gx + 66, gy + 10); c.rotate(0.35 * Math.sin(t * 3) * (1 - 0.5 * tk));
        c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 70 * tk); c.lineWidth = 3; c.strokeStyle = C.ink; c.stroke();
        c.translate(0, 70 * tk); c.scale(tk, tk); rrect(c, -56, 0, 112, 64, 10); ink(c, "#fff6d6", 5);
        font(c, 46, F_NUM); c.fillStyle = "#ef2b2b"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("???", 0, 34); c.restore();
      }
      const ak = win(t, E.w_hudu - 0.1, E.w_gonit, 0.2, 0.2);
      if (ak > 0) { // стрелка оценки клонится вниз
        const a = lerp(-0.2, Math.PI / 2 - 0.15, springPop(prog(t, E.w_klon - 0.1, E.w_klon + 0.8)));
        c.save(); c.globalAlpha = ak; c.translate(gx + 200, gy - 40); c.rotate(a);
        c.beginPath(); c.moveTo(-50, -16); c.lineTo(40, -16); c.lineTo(40, -40); c.lineTo(90, 0); c.lineTo(40, 40); c.lineTo(40, 16); c.lineTo(-50, 16); c.closePath(); ink(c, "#ef2b2b", 5); c.restore();
      }
    }
  }
  // «советы людей» перечёркнуты
  const vk = win(t, E.w_vrak - 0.1, E.L13 + 0.2, 0.2, 0.25);
  if (vk > 0) for (const [i, [x, y]] of [[340, 190], [985, 200], [300, 430]].entries()) {
    const u = springPop(prog(t, E.w_vrak - 0.1 + i * 0.12, E.w_vrak + 0.7 + i * 0.12));
    c.save(); c.globalAlpha = vk; c.translate(x, y); c.scale(u, u);
    c.beginPath(); c.roundRect(-90, -58, 180, 116, 30); c.moveTo(-20, 58); c.lineTo(-44, 92); c.lineTo(10, 58); ink(c, "#ffffff", 5);
    glasses(c, 0, 0, 0.8); bigX(c, 0, 0, 52, prog(t, E.w_vrak + 0.25 + i * 0.12, E.w_vrak + 1.0 + i * 0.12)); c.restore();
  }
  // красный отсвет злости
  const rk = win(t, E.L10 - 0.1, E.E13 + 0.2, 0.25, 0.3) * 0.18 + win(t, TI - 0.05, TI + 0.25, 0.02, 0.2) * 0.5;
  if (rk > 0) { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = TI - 0.05 < t ? `rgba(255,255,255,${rk})` : `rgba(255,40,70,${rk})`; c.fillRect(0, 0, RW, RH); c.restore(); }
}

// трещина по экрану после удара
const CRACK = (() => { const r = mulberry32(5), a = []; for (let i = 0; i < 11; i++) { const ang = (i / 11) * TAU + r() * 0.4; const pts = [[0, 0]];
  let x = 0, y = 0, aa = ang; for (let k = 0; k < 6; k++) { aa += (r() - 0.5) * 0.7; const l = 50 + r() * 90; x += Math.cos(aa) * l; y += Math.sin(aa) * l; pts.push([x, y]); } a.push(pts); } return a; })();
function crack(c, k, x, y) {
  if (k <= 0) return;
  c.save(); c.translate(x, y); c.lineJoin = "round";
  for (const pts of CRACK) { const n = Math.max(1, Math.floor(k * (pts.length - 1)) + 1);
    for (const [lw, col] of [[7, "rgba(0,0,0,0.55)"], [3, "rgba(255,255,255,0.95)"]]) { c.beginPath(); for (let i = 0; i < n; i++) i ? c.lineTo(pts[i][0], pts[i][1]) : c.moveTo(0, 0); c.lineWidth = lw; c.strokeStyle = col; c.stroke(); } }
  c.restore();
}

// окошко «люди говорят»
function peopleInset(c, t, k) {
  if (k <= 0) return;
  const s = springSnap(k); c.save(); c.translate(SX + 50, SY + 110); c.scale(s, s); c.globalAlpha = Math.min(1, k * 3);
  rrect(c, 0, 0, 520, 340, 22); ink(c, "#ffe9c7", 6);
  c.save(); rrect(c, 0, 0, 520, 340, 22); c.clip();
  c.fillStyle = "#ffd59a"; c.fillRect(0, 240, 520, 100);
  person(c, 150, 210, 0.9, t, "#3a2a1a", "#3b82f6", 0); person(c, 370, 210, 0.9, t, "#c0582a", "#ef4c7a", 1.4);
  // пузырь с очками
  const bk = springPop(prog(t, E.L3, E.L3 + 0.7));
  if (bk > 0) { c.save(); c.translate(260, 80); c.scale(bk, bk); c.beginPath(); c.roundRect(-80, -46, 160, 92, 26); ink(c, "#fff", 4); glasses(c, 0, 0, 0.7); c.restore(); }
  c.restore();
  pill(c, 260, 0, "ЛЮДИ ГОВОРЯТ", "#5a3c9e", 1, { size: 32 });
  c.restore();
}

// лупа над «волосом»
function magnifier(c, t, k) {
  if (k <= 0) return;
  const s = springPop(k), x = SX + 1080, y = SY + 330;
  c.save(); c.translate(x, y); c.scale(s, s);
  c.beginPath(); c.moveTo(80, 80); c.lineTo(170, 170); c.lineWidth = 34; c.strokeStyle = C.ink; c.lineCap = "round"; c.stroke(); c.lineWidth = 22; c.strokeStyle = "#7a4a24"; c.stroke();
  circle(c, 0, 0, 120); c.fillStyle = "rgba(220,245,255,0.92)"; c.fill(); c.lineWidth = 14; c.strokeStyle = C.ink; c.stroke();
  c.beginPath(); c.moveTo(-70, 40); c.bezierCurveTo(-30, -60, 20, 60, 70, -40); c.lineWidth = 5; c.strokeStyle = MC.furD; c.stroke();
  c.restore();
  pill(c, x, y - 175, "ПРОКУ: 0", "#ef2b2b", prog(t, E.w_volos + 0.3, E.w_volos + 1.0), { size: 40 });
}

// ---------- чат ----------
const NAMES = ["Лемур", "Енотик", "Жирафик", "Попугай", "Совёнок", "Ёжик"];
const MSGS = [
  [E.V0 - 1.6, 0, "привет!!"], [E.V0 - 0.5, 1, "ура, эфир!"], [E.L1 + 1.1, 2, "ты нас видишь?"], [E.L2 + 1.2, 3, "что за обзор?"],
  [E.w_och1 + 0.3, 4, "ОЧКИ!"], [E.w_poldz + 0.35, 5, "распаковка!!"], [E.w_syak + 0.25, 0, "вверх ногами!"],
  [E.w_temyu + 0.5, 1, "на нос надо!"], [E.w_hvost + 0.55, 2, "НА НОС!!!", true], [E.w_nyuh + 0.45, 3, "ха-ха-ха"],
  [E.w_liz + 0.45, 4, "фу-у-у"], [E.w_nikak + 0.35, 5, "чат не читает..."], [E.w_durak + 0.35, 0, "сама не так надела"],
  [E.w_nalg + 0.35, 1, "никто не лгал!"], [E.w_hvat + 0.1, 2, "НЕ-Е-ЕТ!", true], [E.w_bryz + 0.6, 3, "одна звезда?!"],
  [E.w_ceny + 0.5, 4, "очки ни при чём"], [E.w_gonit + 0.5, 5, "отписываюсь"],
].map(([t, i, text, big]) => ({ t, name: NAMES[i], col: CHAT_COLORS[i], text, big }));

// ---------- счётчики ----------
const viewers = (t) => kf([[0, 0], [E.V0 - 2.2, 1024, 1.6], [E.L5, 1480, 3], [E.L8, 2190, 3], [TI, 2350, 2]], t, (u) => ease(u));
const likes = (t) => kf([[0, 0], [E.V0 - 1.8, 640, 2.5], [E.w_poldz, 1024, 2], [E.w_nyuh, 1650, 2], [E.L10, 1650, 0.1], [E.L10 + 0.1, 380, 5], [TI, 120, 1.2]], t, (u) => ease(u));
const subs = (t) => (t < E.w_poznat + 0.2 ? 12345 : lerp(12345, 1000000, ease(prog(t, E.w_poznat + 0.2, E.w_poznat + 1.2))));

// ---------- кадр ----------
function renderAt(t) {
  drawRoom(t);
  const L = lc; L.reset();
  L.fillStyle = "#0e0b1f"; L.fillRect(0, 0, W, H);
  // фон-сетка
  L.save(); L.globalAlpha = 0.07; L.strokeStyle = "#8f7cff"; L.lineWidth = 2; for (let x = 0; x < W; x += 60) { L.beginPath(); L.moveTo(x, 0); L.lineTo(x, H); L.stroke(); } for (let y = 0; y < H; y += 60) { L.beginPath(); L.moveTo(0, y); L.lineTo(W, y); L.stroke(); } L.restore();
  streamFrame(L, t);
  // эфир: обычный, «повтор» (обесцвечен), «связь потеряна» (сдвиги полос)
  const replay = t >= E.L17 - 0.12;
  const glitch = t >= E.E16 + 0.25 && t < E.L17 - 0.12;
  L.save(); rrect(L, SX, SY, RW, RH, 22); L.clip();
  if (replay) L.filter = "saturate(0.55) sepia(0.28)";
  if (glitch) {
    const r = mulberry32(Math.floor(t * 30) + 3);
    for (let y = 0; y < RH; y += 46) { const dx = (r() - 0.5) * 120; L.drawImage(roomCv, 0, y, RW, 46, SX + dx, SY + y, RW, 46); }
    L.filter = "none"; L.fillStyle = `rgba(20,10,40,${0.35 + 0.2 * r()})`; L.fillRect(SX, SY, RW, RH);
  } else L.drawImage(roomCv, SX, SY);
  L.filter = "none";
  if (replay) { L.fillStyle = "rgba(40,20,60,0.12)"; L.fillRect(SX, SY, RW, RH); }
  // заставка эфира и финал: затемнение под HTML-титры
  const dim = Math.max(0.62 * (1 - sstep(prog(t, E.V0 - 0.65, E.V0 - 0.2))), 0.78 * sstep(prog(t, E.fin - 0.2, E.fin + 0.5)));
  if (dim > 0) { L.fillStyle = `rgba(14,8,40,${dim})`; L.fillRect(SX, SY, RW, RH); }
  crack(L, t >= TI && t < E.L17 - 0.12 ? sstep(prog(t, TI, TI + 0.35)) : 0, SX + 930, SY + 500);
  L.restore();
  // интерфейс эфира
  const uiK = sstep(prog(t, 0.05, 0.6)) * (1 - sstep(prog(t, E.fin - 0.2, E.fin + 0.3)));
  liveBadge(L, t, uiK, viewers(t), replay);
  likesBadge(L, t, uiK, likes(t), Math.max(0, Math.sin(t * 8)) * (t < E.L10 ? 0.3 : 0));
  chatPanel(L, t, MSGS, sstep(prog(t, 0.2, 0.9)), t >= E.L17 - 0.1 ? prog(t, E.L17 - 0.1, E.L17 + 0.6) : 0);
  channelBar(L, t, sstep(prog(t, 0.3, 1.0)), subs(t));
  // взгляд Мартышки: всё плывёт (весь кадр, кроме строк)
  const pov = Math.max(win(t, E.w_glaz + 0.3, E.L2 - 0.1, 0.35, 0.3), win(t, E.w_nikak + 0.05, E.E9 + 0.45, 0.3, 0.3));
  ctx.reset();
  if (pov > 0) {
    ctx.filter = `blur(${(9 * pov).toFixed(2)}px)`; ctx.drawImage(layCv, 0, 0);
    ctx.globalAlpha = 0.45 * pov; ctx.drawImage(layCv, 26 * pov, 10 * pov); ctx.globalAlpha = 1; ctx.filter = "none";
    pill(ctx, SX + RW / 2, SY + RH / 2, "ТАК ВИДИТ МАРТЫШКА", "#5a3c9e", pov, { size: 46, alpha: pov });
  } else ctx.drawImage(layCv, 0, 0);
  overlays(ctx, t);
  captionsPlate(ctx, t);
  textAt(t);
}

function overlays(c, t) {
  const cx = SX + RW / 2;
  peopleInset(c, t, win(t, E.L2 - 0.1, E.w_och1 - 0.05, 0.4, 0.2));
  // огромные очки — «лишь стоит завести Очки»
  const gk = win(t, E.w_och1 - 0.05, E.L5 - 0.1, 0.05, 0.3);
  if (gk > 0) { c.save(); c.globalAlpha = Math.min(1, gk * 3); const s = springPop(prog(t, E.w_och1 - 0.05, E.w_och1 + 0.8)) * 2.8 * (0.6 + 0.4 * gk);
    glasses(c, cx, SY + RH / 2 - 40, s, Math.sin(t * 3) * 0.05); for (let i = 0; i < 4; i++) star4(c, cx + Math.cos(i * 1.6 + t) * 330, SY + RH / 2 - 40 + Math.sin(i * 1.6 + t) * 150, 26 * Math.abs(Math.sin(t * 5 + i)), "#fffbe0"); c.restore(); }
  // распаковка: ×6 и донат
  pill(c, cx + 360, SY + 470, "×6", "#ff2e88", win(t, E.w_poldz + 0.5, E.w_vert - 0.2, 0.3, 0.2), { size: 64, fam: F_NUM });
  pill(c, SX + 1080, SY + 190, "Енотик: +50 бананов", "#3fd46b", win(t, E.w_dost - 0.1, E.w_vert - 0.2, 0.3, 0.2), { size: 38, color: C.ink, icon: (cc, x, y) => banana(cc, x, y, 0.75, 0.2) });
  // попытки
  const TR = [[E.w_temyu, "ПОПЫТКА 1: НА ТЕМЯ", E.w_hvost - 0.15], [E.w_hvost, "ПОПЫТКА 2: НА ХВОСТ", E.w_nyuh - 0.15], [E.w_nyuh, "ПОПЫТКА 3: НЮХ", E.w_liz - 0.15], [E.w_liz, "ПОПЫТКА 4: НА ВКУС", E.L9 + 0.6]];
  for (const [t0, txt, t1] of TR) {
    const k = win(t, t0 - 0.05, t1, 0.3, 0.15);
    pill(c, cx, SY + 120, txt, "#5a3c9e", k, { size: 42 });
    c.save(); c.globalAlpha = k > 0 ? Math.min(1, k * 3) : 0; bigX(c, cx + 300, SY + 120, 34, prog(t, t0 + 0.45, t0 + 1.2)); c.restore();
  }
  visionMeter(c, t, win(t, E.L9 - 0.1, E.L10 - 0.05, 0.4, 0.25), lerp(sstep(prog(t, E.L9, E.w_nikak - 0.1)) * 0.34, 0, sstep(prog(t, E.w_nikak - 0.05, E.w_nikak + 0.35))));
  // ворчание
  stamp(c, SX + 270, SY + 590, "ВРАКИ!", "#ef2b2b", t < E.L14 - 0.05 ? prog(t, E.w_nalg - 0.05, E.w_nalg + 0.55) : 0);
  magnifier(c, t, win(t, E.w_volos - 0.1, E.L14 - 0.05, 0.6, 0.2));
  // удар и оценка
  rating(c, cx, SY + 680, t < E.L17 - 0.15 ? prog(t, E.w_bryz + 0.2, E.w_bryz + 1.4) : 0, 1);
  const lost = win(t, E.E16 + 0.25, E.L17 - 0.12, 0.05, 0.05);
  pill(c, cx, SY + RH / 2 + 60, "СВЯЗЬ ПОТЕРЯНА", "#ef2b2b", lost, { size: 54 });
  // мораль
  pill(c, cx, SY + 120, "ЗНАМЕНИТОСТЬ", "#ffd21f", win(t, E.w_poznat + 0.2, E.L21 + 0.3, 0.3, 0.25), { size: 46, color: C.ink, icon: (cc, x, y) => star5(cc, x, y, 22, "#ff2e88", C.ink, 3) });
  stamp(c, SX + 1010, SY + 480, "ЗАБЛОКИРОВАНО", "#ef2b2b", win(t, E.w_gonit + 0.3, E.fin - 0.1, 0.5, 0.3) > 0 ? prog(t, E.w_gonit + 0.3, E.w_gonit + 0.9) : 0, -0.12, 60);
  // финал: «эфир окончен» и блеск осколков вокруг заголовка
  const fk = sstep(prog(t, E.fin + 0.1, E.fin + 0.7));
  if (fk > 0) {
    pill(c, cx, SY + 120, "ЭФИР ОКОНЧЕН", "#ff2e88", prog(t, E.fin + 0.1, E.fin + 0.9), { size: 44 });
    for (let i = 0; i < 9; i++) { const a = i * 0.7; star4(c, cx + Math.cos(a) * (520 + 40 * (i % 3)), 390 + Math.sin(a * 1.3) * 210, 22 * fk * Math.abs(Math.sin(t * 2.2 + i)), "#fffbe0"); }
  }
}

// ---------- плашка строк и ярлык говорящего ----------
const SPEAK = {};
for (let n = 10; n <= 13; n++) SPEAK[n] = ["МАРТЫШКА", "#ff2e88"];
for (let n = 17; n <= 21; n++) SPEAK[n] = ["МОРАЛЬ", "#ffd21f"];
function curLine(t) { let n = 0; for (let k = 1; k <= NL; k++) if (t >= E["L" + k] - 0.12) n = k; return n; }
function captionsPlate(c, t) {
  const k = sstep(prog(t, E.L1 - 0.6, E.L1 - 0.1)) * (1 - sstep(prog(t, E.fin - 0.3, E.fin + 0.05)));
  if (k <= 0) return;
  c.save(); c.globalAlpha = k;
  rrect(c, SX, 814, 1800, 160, 22); c.fillStyle = "rgba(20,14,48,0.94)"; c.fill(); c.lineWidth = 3; c.strokeStyle = "rgba(255,255,255,0.12)"; c.stroke();
  rrect(c, SX, 814, 14, 160, 7); c.fillStyle = "#ff2e88"; c.fill();
  c.restore();
  const cur = curLine(t), spk = SPEAK[cur];
  if (spk && k > 0.5) {
    const first = SPEAK[cur - 1] && SPEAK[cur - 1][0] === spk[0] ? 1 : prog(t, E["L" + cur] - 0.15, E["L" + cur] + 0.3);
    c.save(); font(c, 30, F_NARROW, "700"); const w = c.measureText(spk[0]).width + 36;
    c.translate(SX + 40, 800); c.scale(springPop(first), springPop(first)); rrect(c, 0, -22, w, 44, 12); ink(c, spk[1], 4);
    c.fillStyle = spk[1] === "#ffd21f" ? C.ink : "#fff"; c.textBaseline = "middle"; c.fillText(spk[0], 18, 1); c.restore();
  }
}

// ---------- текст ----------
const NL = Object.keys(E).filter((k) => /^L\d+$/.test(k)).length;
const CAPS = [...document.querySelectorAll(".cap")].map((el) => ({ el, n: +el.dataset.n, last: "" }));
const WORDS = [...document.querySelectorAll(".cap .w")].map((el) => ({ el, at: +el.dataset.at, last: -1 }));
const ROWS = [826, 896];
function capState(n, t) {
  // строка появляется снизу, со следующей строкой поднимается, на третьей исчезает; на новом блоке и в финале — исчезает
  const B = CFG.blocks.find((b) => n >= b[0] && n <= b[1]);
  const Ln = (k) => E["L" + k];
  const next = n < B[1] ? Ln(n + 1) : null, next2 = n + 1 < B[1] ? Ln(n + 2) : null;
  const endBlock = B[1] < NL ? Ln(B[1] + 1) - 0.3 : E.fin - 0.35;
  let y = ROWS[1], op = sstep(prog(t, Ln(n) - 0.12, Ln(n) + 0.05));
  if (next !== null) y = lerp(ROWS[1], ROWS[0], springSoft(prog(t, next - 0.12, next + 0.6)));
  if (next2 !== null && next2 - 0.12 < endBlock) {
    const u = sstep(prog(t, next2 - 0.12, next2 + 0.16));
    y -= 72 * u; op *= 1 - u;
  }
  op *= 1 - sstep(prog(t, endBlock, endBlock + 0.25));
  return { y, op };
}
function textAt(t) {
  for (const cp of CAPS) {
    const s = capState(cp.n, t), key = s.y.toFixed(1) + "|" + s.op.toFixed(3);
    if (key !== cp.last) { cp.el.style.transform = `translate(0px, ${s.y.toFixed(1)}px)`; cp.el.style.opacity = s.op.toFixed(3); cp.last = key; }
  }
  for (const w of WORDS) {
    const u = prog(t, w.at - 0.06, w.at + 0.4), k = Math.round(u * 400); if (k === w.last) continue; w.last = k;
    const s = springPop(u);
    w.el.style.opacity = u > 0 ? Math.min(1, u * 5).toFixed(3) : "0";
    w.el.style.transform = u >= 1 ? "none" : `translate(0px, ${((1 - s) * 30).toFixed(1)}px)`;
  }
  const ti = win(t, 0.5, E.V0 - 0.3, 0.45, 0.25), tf = sstep(prog(t, E.fin + 0.25, E.fin + 0.8));
  setTitle("tt1", ti, 0.5, t); setTitle("tt2", tf, E.fin + 0.25, t);
}
const TT = {};
function setTitle(id, k, t0, t) {
  const el = TT[id] || (TT[id] = document.getElementById(id)); if (!el) return;
  const s = springSnap(prog(t, t0, t0 + 0.8));
  el.style.opacity = k <= 0 ? "0" : k.toFixed(3); el.style.transform = `translate(0px, ${((1 - s) * -120).toFixed(1)}px) scale(${(0.85 + 0.15 * s).toFixed(3)})`;
}

const seek = (t) => renderAt(t);
buildWorld();
window.addEventListener("hf-seek", (e) => seek(e.detail.time));
seek(0);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => seek(0));

const tl = gsap.timeline({ paused: true });
tl.set({}, {}, TOTAL);
window.__timelines = window.__timelines || {};
window.__timelines["main"] = tl;
