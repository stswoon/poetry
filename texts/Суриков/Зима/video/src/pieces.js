// ---------- Фишки: расписные деревянные кегли и предметы игры ----------
// Все фишки рисуются от точки опоры (x, y) — центр основания на доске; s — пикселей на единицу мира.

// лицо: глаза, щёки, рот; f — {eyes, mouth, look, red}
function face(g, hx, hy, rh, f = {}) {
  const lx = (f.look || 0) * rh * 0.22;
  const ex = rh * 0.34, ey = hy - rh * 0.02;
  if (f.red) { g.beginPath(); g.arc(hx, hy, rh * 0.98, 0, TAU); g.fillStyle = css(C.verm, 0.45 * f.red); g.fill(); }
  // щёки
  for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(hx + lx + sx * rh * 0.52, hy + rh * 0.26, rh * 0.17, rh * 0.12, 0, 0, TAU); g.fillStyle = css(C.cheek, 0.75); g.fill(); }
  g.fillStyle = css(C.ink); g.strokeStyle = css(C.ink); g.lineCap = "round";
  const eyes = f.eyes || "open";
  for (const sx of [-1, 1]) {
    const x = hx + lx + sx * ex;
    if (eyes === "closed" || eyes === "happy") {
      g.lineWidth = Math.max(1.5, rh * 0.09);
      g.beginPath();
      if (eyes === "closed") g.arc(x, ey - rh * 0.02, rh * 0.12, 0.15 * Math.PI, 0.85 * Math.PI);
      else g.arc(x, ey + rh * 0.08, rh * 0.12, 1.15 * Math.PI, 1.85 * Math.PI);
      g.stroke();
    } else {
      const big = eyes === "wide" ? 1.35 : 1;
      g.beginPath(); g.ellipse(x, ey, rh * 0.075 * big, rh * 0.11 * big, 0, 0, TAU); g.fill();
      g.beginPath(); g.arc(x - rh * 0.025, ey - rh * 0.04, rh * 0.028 * big, 0, TAU); g.fillStyle = "rgba(255,255,255,0.9)"; g.fill(); g.fillStyle = css(C.ink);
      if (eyes === "angry") {
        g.lineWidth = Math.max(2, rh * 0.1);
        g.beginPath(); g.moveTo(x - sx * rh * 0.2, ey - rh * 0.3); g.lineTo(x + sx * rh * 0.12, ey - rh * 0.17); g.stroke();
      }
    }
  }
  const my = hy + rh * 0.38, mx = hx + lx;
  g.lineWidth = Math.max(1.5, rh * 0.08);
  const m = f.mouth || "smile";
  g.beginPath();
  if (m === "smile") g.arc(mx, my - rh * 0.12, rh * 0.18, 0.2 * Math.PI, 0.8 * Math.PI);
  else if (m === "frown") g.arc(mx, my + rh * 0.12, rh * 0.16, 1.2 * Math.PI, 1.8 * Math.PI);
  else if (m === "flat") { g.moveTo(mx - rh * 0.12, my); g.lineTo(mx + rh * 0.12, my); }
  if (m === "o" || m === "blow") { g.ellipse(mx, my, rh * (m === "blow" ? 0.08 : 0.1), rh * (m === "blow" ? 0.08 : 0.13), 0, 0, TAU); g.fillStyle = css(C.vermD); g.fill(); }
  else if (m === "open") { g.arc(mx, my - rh * 0.06, rh * 0.17, 0.05 * Math.PI, 0.95 * Math.PI); g.closePath(); g.fillStyle = css(C.vermD); g.fill(); }
  else g.stroke();
}

// Кегля-герой. spec: размеры и роспись; p: поза {aL, aR (рад от вертикали наружу), sq (сплющивание), tilt, eyes, mouth, look, red}
function peg(g, x, y, s, spec, p = {}) {
  const h = spec.h, r = spec.r, rs = spec.rs, rh = spec.rh;
  const sq = p.sq ?? 1;
  g.save();
  g.translate(x, y); g.rotate(p.tilt || 0); g.scale(s * (2 - sq) ** 0.5, s * sq);
  // тело: от основания вверх, плечи скруглены
  const body = () => {
    g.beginPath();
    g.moveTo(-r, 0);
    g.bezierCurveTo(-r * 1.02, -h * 0.45, -rs * 1.05, -h * 0.8, -rs, -h * 0.9);
    g.quadraticCurveTo(-rs * 0.92, -h, -rs * 0.35, -h);
    g.lineTo(rs * 0.35, -h);
    g.quadraticCurveTo(rs * 0.92, -h, rs, -h * 0.9);
    g.bezierCurveTo(rs * 1.05, -h * 0.8, r * 1.02, -h * 0.45, r, 0);
    g.ellipse(0, 0, r, r * 0.3, 0, 0, Math.PI);
    g.closePath();
  };
  body(); paintPath(g, spec.body, { sc: 0.35, rot: 90 });
  // роспись одежды (пояс, пуговицы, узоры) — по форме тела
  g.save(); body(); g.clip();
  // некрашеный поясок дерева у основания
  g.beginPath(); g.rect(-r * 1.2, -h * 0.1, r * 2.4, h * 0.2); woodPath(g, "pine", 0, 0, 0.3, 90);
  if (spec.deco) spec.deco(g, h, r, rs);
  g.restore();
  body(); cylShade(g, -r * 1.05, r * 1.05);
  // голова
  const hy = -h - rh * 0.88;
  if (spec.beardBack) spec.beardBack(g, hy, rh);
  g.beginPath(); g.arc(0, hy, rh, 0, TAU); paintPath(g, spec.skin || C.skin, { ga: 0.12, sc: 0.3 });
  face(g, 0, hy, rh, p);
  g.beginPath(); g.arc(0, hy, rh, 0, TAU); ballShade(g, 0, hy, rh, 0.9);
  if (spec.hat) spec.hat(g, hy, rh, p);
  // руки-детали: обе всегда снаружи тела, кисть — шарик
  const A = spec.arm;
  if (A) {
    for (const side of [-1, 1]) {
      const ang = side < 0 ? (p.aL ?? 0.18) : (p.aR ?? 0.18);
      const sx = side * rs * 0.92, sy = -h * 0.86;
      const a = side < 0 ? ang : -ang;
      capsule(g, sx, sy, a, A.L, A.w); paintPath(g, A.col, { sc: 0.3 });
      capsule(g, sx, sy, a, A.L, A.w);
      const gr = g.createLinearGradient(sx - A.w, 0, sx + A.w, 0);
      gr.addColorStop(0, "rgba(255,255,255,0.18)"); gr.addColorStop(1, "rgba(30,16,8,0.3)"); g.fillStyle = gr; g.fill();
      const hx = sx - Math.sin(a) * A.L, hyy = sy + Math.cos(a) * A.L;
      g.beginPath(); g.arc(hx, hyy, A.w * 0.72, 0, TAU); paintPath(g, A.hand, { ga: 0.12 });
      g.beginPath(); g.arc(hx, hyy, A.w * 0.72, 0, TAU); ballShade(g, hx, hyy, A.w * 0.72);
    }
  }
  g.restore();
}
// где кисть руки (для верёвки, снопа): в координатах экрана
function pegHand(x, y, s, spec, p, side) {
  const h = spec.h, rs = spec.rs, A = spec.arm, sq = p.sq ?? 1;
  const ang = side < 0 ? (p.aL ?? 0.18) : (p.aR ?? 0.18);
  const a = side < 0 ? ang : -ang;
  const sx = side * rs * 0.92, sy = -h * 0.86;
  let hx = sx - Math.sin(a) * A.L, hy = sy + Math.cos(a) * A.L;
  const tl = p.tilt || 0, kx = s * (2 - sq) ** 0.5, ky = s * sq;
  hx *= kx; hy *= ky;
  return [x + hx * Math.cos(tl) - hy * Math.sin(tl), y + hx * Math.sin(tl) + hy * Math.cos(tl)];
}

// ---------- Роспись героев ----------
const SPEC = {
  // крестьянин: тулуп охрой, красный кушак, борода, меховая шапка
  muzhik: {
    h: 150, r: 46, rs: 40, rh: 30, body: C.ochre,
    arm: { L: 54, w: 17, col: C.ochre, hand: C.verm },
    deco: (g, h, r) => {
      g.fillStyle = css(C.verm); g.fillRect(-r * 1.2, -h * 0.5, r * 2.4, h * 0.11);
      g.fillStyle = css(C.vermD); g.fillRect(-r * 0.15, -h * 0.5, r * 0.3, h * 0.3);
      g.strokeStyle = css(C.ochreD); g.lineWidth = 3; g.beginPath(); g.moveTo(r * 0.05, -h); g.lineTo(r * 0.12, -h * 0.12); g.stroke();
      g.fillStyle = css(C.ink); for (const yy of [0.72, 0.32]) { g.beginPath(); g.arc(-r * 0.08, -h * yy, 3.5, 0, TAU); g.fill(); }
      g.fillStyle = css([250, 240, 220]); g.fillRect(-r * 1.2, -h * 0.16, r * 2.4, h * 0.06);
    },
    beardBack: (g, hy, rh) => {
      g.beginPath(); g.moveTo(-rh * 0.75, hy + rh * 0.2); g.quadraticCurveTo(-rh * 0.6, hy + rh * 1.6, 0, hy + rh * 1.75);
      g.quadraticCurveTo(rh * 0.6, hy + rh * 1.6, rh * 0.75, hy + rh * 0.2); g.closePath(); paintPath(g, [168, 112, 62], { sc: 0.3, rot: 90 });
    },
    hat: (g, hy, rh) => {
      g.beginPath(); g.moveTo(-rh * 1.02, hy - rh * 0.25); g.lineTo(-rh * 0.9, hy - rh * 1.25); g.quadraticCurveTo(0, hy - rh * 1.5, rh * 0.9, hy - rh * 1.25);
      g.lineTo(rh * 1.02, hy - rh * 0.25); g.quadraticCurveTo(0, hy - rh * 0.55, -rh * 1.02, hy - rh * 0.25); paintPath(g, [96, 62, 40], { sc: 0.25 });
      g.beginPath(); g.ellipse(0, hy - rh * 0.35, rh * 1.08, rh * 0.28, 0, 0, TAU); paintPath(g, [128, 86, 54], { sc: 0.25 });
      // борода и усы поверх лица снизу
      g.beginPath(); g.moveTo(-rh * 0.55, hy + rh * 0.42); g.quadraticCurveTo(0, hy + rh * 0.62, rh * 0.55, hy + rh * 0.42);
      g.quadraticCurveTo(rh * 0.55, hy + rh * 1.2, 0, hy + rh * 1.45); g.quadraticCurveTo(-rh * 0.55, hy + rh * 1.2, -rh * 0.55, hy + rh * 0.42); paintPath(g, [168, 112, 62], { sc: 0.3, rot: 90 });
      g.strokeStyle = css([120, 76, 40]); g.lineWidth = 2; for (const k of [-0.25, 0, 0.25]) { g.beginPath(); g.moveTo(rh * k, hy + rh * 0.75); g.lineTo(rh * k * 1.3, hy + rh * 1.25); g.stroke(); }
    },
  },
  // мальчик: синий полушубок, красный шарф, вязаная шапка с помпоном
  boy: {
    h: 92, r: 32, rs: 27, rh: 25, body: C.cobalt,
    arm: { L: 36, w: 13, col: C.cobalt, hand: C.verm },
    deco: (g, h, r) => {
      g.fillStyle = css(C.verm); g.fillRect(-r * 1.2, -h, r * 2.4, h * 0.16);
      g.fillRect(r * 0.2, -h * 0.9, r * 0.32, h * 0.42);
      g.fillStyle = css(C.white); for (const yy of [0.62, 0.4]) { g.beginPath(); g.arc(-r * 0.1, -h * yy, 3, 0, TAU); g.fill(); }
      g.fillStyle = css(C.white, 0.85); g.fillRect(-r * 1.2, -h * 0.2, r * 2.4, h * 0.07);
    },
    hat: (g, hy, rh) => {
      g.beginPath(); g.arc(0, hy - rh * 0.15, rh * 1.04, Math.PI * 1.03, Math.PI * 1.97); g.closePath(); paintPath(g, C.cobaltD, { sc: 0.25 });
      g.beginPath(); g.rect(-rh * 1.04, hy - rh * 0.42, rh * 2.08, rh * 0.3); paintPath(g, C.white, { ga: 0.15 });
      g.beginPath(); g.arc(0, hy - rh * 1.22, rh * 0.3, 0, TAU); paintPath(g, C.verm, { ga: 0.15 }); g.beginPath(); g.arc(0, hy - rh * 1.22, rh * 0.3, 0, TAU); ballShade(g, 0, hy - rh * 1.22, rh * 0.3);
    },
  },
  // девочка: красная шубка, жёлтый платок в горох
  girl: {
    h: 88, r: 33, rs: 26, rh: 24, body: C.verm,
    arm: { L: 34, w: 13, col: C.verm, hand: C.cobalt },
    deco: (g, h, r) => {
      g.fillStyle = css(C.white, 0.9); g.fillRect(-r * 1.2, -h * 0.22, r * 2.4, h * 0.08);
      g.fillStyle = css(C.gold); for (let i = -1; i <= 1; i++) for (const yy of [0.4, 0.62]) { g.beginPath(); g.arc(i * r * 0.5, -h * yy, 4, 0, TAU); g.fill(); }
    },
    hat: (g, hy, rh) => {
      g.beginPath(); g.moveTo(-rh * 1.12, hy + rh * 0.35); g.quadraticCurveTo(-rh * 1.2, hy - rh * 1.35, 0, hy - rh * 1.18);
      g.quadraticCurveTo(rh * 1.2, hy - rh * 1.35, rh * 1.12, hy + rh * 0.35); g.quadraticCurveTo(rh * 0.85, hy - rh * 0.55, 0, hy - rh * 0.62);
      g.quadraticCurveTo(-rh * 0.85, hy - rh * 0.55, -rh * 1.12, hy + rh * 0.35); paintPath(g, C.gold, { sc: 0.25 });
      g.fillStyle = css(C.verm); for (const [dx, dy] of [[-0.6, -0.6], [0, -0.95], [0.6, -0.6], [-0.95, 0], [0.95, 0]]) { g.beginPath(); g.arc(dx * rh, hy + dy * rh, rh * 0.1, 0, TAU); g.fill(); }
      // узелок под подбородком
      g.beginPath(); g.moveTo(-rh * 0.2, hy + rh * 0.95); g.lineTo(-rh * 0.5, hy + rh * 1.35); g.lineTo(-rh * 0.05, hy + rh * 1.1); g.lineTo(rh * 0.35, hy + rh * 1.38); g.lineTo(rh * 0.2, hy + rh * 0.95); g.closePath(); paintPath(g, C.gold, { grain: false });
    },
  },
  // Мороз: большой, кобальтовая шуба со снежинками, длинная белая борода, высокая шапка с мехом
  frost: {
    h: 230, r: 66, rs: 54, rh: 40, body: C.cobalt,
    arm: { L: 80, w: 24, col: C.cobalt, hand: C.white },
    deco: (g, h, r) => {
      g.fillStyle = css(C.white); g.fillRect(-r * 1.2, -h * 0.13, r * 2.4, h * 0.08); g.fillRect(-r * 0.12, -h, r * 0.24, h);
      g.strokeStyle = css(C.white, 0.9); g.lineWidth = 3;
      for (const [cx, cy] of [[-0.55, 0.35], [0.55, 0.55], [-0.5, 0.75], [0.5, 0.25]]) {
        const x0 = cx * r, y0 = -h * cy, rr = r * 0.2;
        for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3; g.beginPath(); g.moveTo(x0 - Math.cos(a) * rr, y0 - Math.sin(a) * rr); g.lineTo(x0 + Math.cos(a) * rr, y0 + Math.sin(a) * rr); g.stroke(); }
      }
    },
    beardBack: (g, hy, rh) => {
      g.beginPath(); g.moveTo(-rh * 0.95, hy); g.quadraticCurveTo(-rh * 1.1, hy + rh * 2.4, 0, hy + rh * 3.1);
      g.quadraticCurveTo(rh * 1.1, hy + rh * 2.4, rh * 0.95, hy); g.closePath(); paintPath(g, C.snow, { sc: 0.3, rot: 90, ga: 0.12 });
    },
    hat: (g, hy, rh) => {
      g.beginPath(); g.moveTo(-rh * 0.95, hy - rh * 0.4); g.lineTo(-rh * 0.75, hy - rh * 1.9); g.quadraticCurveTo(0, hy - rh * 2.15, rh * 0.75, hy - rh * 1.9); g.lineTo(rh * 0.95, hy - rh * 0.4); g.closePath(); paintPath(g, C.cobaltD, { sc: 0.25 });
      g.beginPath(); g.ellipse(0, hy - rh * 0.5, rh * 1.1, rh * 0.32, 0, 0, TAU); paintPath(g, C.snow, { ga: 0.12 });
      g.beginPath(); g.ellipse(0, hy - rh * 0.5, rh * 1.1, rh * 0.32, 0, 0, TAU); ballShade(g, 0, hy - rh * 0.5, rh * 1.1, 0.5);
      // усы и борода спереди
      g.beginPath(); g.moveTo(-rh * 0.75, hy + rh * 0.35); g.quadraticCurveTo(0, hy + rh * 0.65, rh * 0.75, hy + rh * 0.35);
      g.quadraticCurveTo(rh * 0.8, hy + rh * 2.0, 0, hy + rh * 2.7); g.quadraticCurveTo(-rh * 0.8, hy + rh * 2.0, -rh * 0.75, hy + rh * 0.35); paintPath(g, C.snow, { sc: 0.3, rot: 90, ga: 0.12 });
      g.strokeStyle = css(C.snowB); g.lineWidth = 2.5; for (const k of [-0.35, 0, 0.35]) { g.beginPath(); g.moveTo(rh * k, hy + rh * 0.9); g.quadraticCurveTo(rh * k * 1.4, hy + rh * 1.6, rh * k * 0.8, hy + rh * 2.3); g.stroke(); }
      g.beginPath(); g.moveTo(-rh * 0.5, hy + rh * 0.32); g.quadraticCurveTo(-rh * 0.25, hy + rh * 0.55, 0, hy + rh * 0.38); g.quadraticCurveTo(rh * 0.25, hy + rh * 0.55, rh * 0.5, hy + rh * 0.32);
      g.quadraticCurveTo(rh * 0.2, hy + rh * 0.28, 0, hy + rh * 0.3); g.quadraticCurveTo(-rh * 0.2, hy + rh * 0.28, -rh * 0.5, hy + rh * 0.32); g.fillStyle = css(C.white); g.fill();
    },
  },
};

// ---------- Предметы ----------
// ёлка: три яруса-конуса на пеньке; eyes 0…1 (1 — открыты), snow — снег на ярусах
function firTree(g, x, y, s, o = {}) {
  g.save(); g.translate(x, y); g.scale(s, s); g.rotate(o.sway || 0);
  g.beginPath(); rrect(g, -9, -26, 18, 28, 4); woodPath(g, "pine", 0, 0, 0.3, 90);
  const tiers = [[0, 66, 64, 0.95], [-46, 52, 56, 0.9], [-86, 38, 52, 0.85]];
  tiers.forEach(([y0, rw, hh], i) => {
    const yb = y0 - 18;
    const path = () => { g.beginPath(); g.moveTo(-rw, yb); g.quadraticCurveTo(-rw * 0.4, yb - hh * 0.55, 0, yb - hh); g.quadraticCurveTo(rw * 0.4, yb - hh * 0.55, rw, yb); g.ellipse(0, yb, rw, rw * 0.22, 0, 0, Math.PI); g.closePath(); };
    path(); paintPath(g, i % 2 ? C.green : shade(C.green, -0.08), { sc: 0.3 });
    path(); cylShade(g, -rw, rw, 0.9);
    if (o.snow) { g.save(); path(); g.clip(); g.beginPath(); g.moveTo(-rw, yb - hh * 0.62); g.quadraticCurveTo(0, yb - hh * 0.5 - 10, rw, yb - hh * 0.62); g.lineTo(0, yb - hh - 4); g.closePath(); g.fillStyle = css(C.snow, o.snow); g.fill(); g.restore(); }
  });
  // глаза на нижнем ярусе
  const e = o.eyes ?? 1;
  g.fillStyle = css(C.ink); g.strokeStyle = css(C.ink); g.lineCap = "round"; g.lineWidth = 3.5;
  for (const sx of [-1, 1]) {
    const ex = sx * 16 + (o.look || 0) * 6, ey = -38;
    if (e > 0.15) { g.beginPath(); g.ellipse(ex, ey, 5, 7.5 * e, 0, 0, TAU); g.fill(); g.beginPath(); g.arc(ex - 1.6, ey - 2.5 * e, 1.8, 0, TAU); g.fillStyle = "rgba(255,255,255,0.9)"; g.fill(); g.fillStyle = css(C.ink); }
    else { g.beginPath(); g.arc(ex, ey - 2, 6, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); }
  }
  g.restore();
}

// изба: брёвна, двускатная крыша фронтоном к нам, правый бок в глубину.
// o: snowRoof 0…1, straw 0…1 (4 яруса соломы снизу вверх), glow 0…1, door 0…1, sq
const IZ = { w: 250, wall: 140, gable: 96, dx: 92, dy: -58 };
function izba(g, x, y, s, o = {}) {
  const { w, wall, gable, dx, dy } = IZ, hw = w / 2;
  g.save(); g.translate(x, y); g.scale(s * (2 - (o.sq ?? 1)) ** 0.5, s * (o.sq ?? 1));
  // бок (правая стена в глубину)
  const side = () => { g.beginPath(); g.moveTo(hw, 0); g.lineTo(hw + dx, dy); g.lineTo(hw + dx, dy - wall); g.lineTo(hw, -wall); g.closePath(); };
  side(); paintPath(g, [128, 84, 48], { sc: 0.4 });
  side(); g.fillStyle = "rgba(30,16,8,0.25)"; g.fill();
  g.save(); side(); g.clip(); g.strokeStyle = "rgba(40,22,10,0.45)"; g.lineWidth = 3;
  for (let i = 1; i < 7; i++) { const yy = -wall * i / 7; g.beginPath(); g.moveTo(hw, yy); g.lineTo(hw + dx, yy + dy); g.stroke(); }
  g.restore();
  // перед (стена + фронтон)
  const front = () => { g.beginPath(); g.moveTo(-hw, 0); g.lineTo(hw, 0); g.lineTo(hw, -wall); g.lineTo(0, -wall - gable); g.lineTo(-hw, -wall); g.closePath(); };
  front(); paintPath(g, [150, 100, 58], { sc: 0.4 });
  g.save(); front(); g.clip();
  // брёвна: полосы с тенью снизу
  for (let i = 0; i < 7; i++) {
    const y0 = -wall * (i + 1) / 7;
    const gr = g.createLinearGradient(0, y0, 0, y0 + wall / 7);
    gr.addColorStop(0, "rgba(255,240,210,0.16)"); gr.addColorStop(0.7, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(40,22,10,0.38)");
    g.fillStyle = gr; g.fillRect(-hw, y0, w, wall / 7);
  }
  // фронтон досками
  g.strokeStyle = "rgba(40,22,10,0.3)"; g.lineWidth = 2.5;
  for (let i = -5; i <= 5; i++) { g.beginPath(); g.moveTo(i * 22, -wall); g.lineTo(i * 22, -wall - gable); g.stroke(); }
  g.restore();
  // торцы брёвен на углах
  for (let i = 0; i < 7; i++) for (const sx of [-1, 1]) {
    const cy = -wall * (i + 0.5) / 7;
    g.beginPath(); g.arc(sx * (hw + 2), cy, 9.5, 0, TAU); woodPath(g, "pine", 0, 0, 0.2); g.strokeStyle = "rgba(60,30,12,0.6)"; g.lineWidth = 1.5; g.stroke();
    g.beginPath(); g.arc(sx * (hw + 2), cy, 4, 0, TAU); g.stroke();
  }
  // окно с наличником
  const wx = -58, wy = -wall * 0.6;
  g.beginPath(); rrect(g, wx - 38, wy - 34, 76, 68, 4); paintPath(g, C.white, { ga: 0.15 });
  const glow = o.glow ?? 0.4;
  g.beginPath(); rrect(g, wx - 28, wy - 25, 56, 50, 3); g.fillStyle = css(mix([90, 110, 140], [255, 214, 110], glow)); g.fill();
  g.strokeStyle = css(C.white); g.lineWidth = 5; g.beginPath(); g.moveTo(wx, wy - 25); g.lineTo(wx, wy + 25); g.moveTo(wx - 28, wy); g.lineTo(wx + 28, wy); g.stroke();
  g.beginPath(); g.moveTo(wx - 44, wy - 34); g.lineTo(wx, wy - 54); g.lineTo(wx + 44, wy - 34); g.closePath(); paintPath(g, C.verm, { ga: 0.15 });
  // дверь (открывается внутрь — тёмный проём)
  const ddx = 64, dh = 104, dw = 60;
  g.beginPath(); rrect(g, ddx - dw / 2, -dh, dw, dh, 5); g.fillStyle = css([40, 24, 14]); g.fill();
  const dO = o.door ?? 0;
  g.beginPath(); g.moveTo(ddx - dw / 2, 0); g.lineTo(ddx - dw / 2 + dw * (1 - dO * 0.8), 2 * dO); g.lineTo(ddx - dw / 2 + dw * (1 - dO * 0.8), -dh - 6 * dO); g.lineTo(ddx - dw / 2, -dh); g.closePath();
  paintPath(g, C.verm, { sc: 0.3, rot: 90 });
  g.fillStyle = css(C.gold); g.beginPath(); g.arc(ddx - dw / 2 + dw * (1 - dO * 0.8) - 10, -dh * 0.5, 4, 0, TAU); g.fill();
  // солома: ярусы снизу вверх по стенам (перед и бок)
  const st = o.straw || 0;
  for (let k = 0; k < 4; k++) {
    const u = clamp(st * 4 - k);
    if (u <= 0) continue;
    const y1 = -wall * k / 4 + 6, y0 = -wall * (k + 1) / 4 - 4;
    const drop = (1 - easeOut(u)) * -80;
    g.save(); g.translate(0, drop); g.globalAlpha = clamp(u * 3);
    // перед
    g.beginPath(); g.moveTo(-hw - 8, y1); g.lineTo(hw + 6, y1);
    g.lineTo(hw + 6, y0); for (let i = 0; i <= 12; i++) g.lineTo(hw + 6 - (w + 14) * i / 12, y0 + (i % 2 ? -7 : 2));
    g.closePath(); paintPath(g, k % 2 ? C.straw : shade(C.straw, -0.05), { sc: 0.3, rot: 90, ga: 0.3 });
    g.strokeStyle = css(C.strawD, 0.8); g.lineWidth = 2;
    for (let i = 0; i < 30; i++) { const xx = -hw - 4 + (w + 8) * i / 30 + (hash(i + k * 31) - 0.5) * 6; g.beginPath(); g.moveTo(xx, y1 - 2); g.lineTo(xx + (hash(i * 3 + k) - 0.5) * 6, y0 + 4); g.stroke(); }
    // бок
    g.beginPath(); g.moveTo(hw + 4, y1); g.lineTo(hw + dx + 6, y1 + dy); g.lineTo(hw + dx + 6, y0 + dy); g.lineTo(hw + 4, y0); g.closePath();
    paintPath(g, shade(C.straw, -0.25), { sc: 0.3, ga: 0.3 });
    g.strokeStyle = css(C.strawD, 0.7);
    for (let i = 0; i < 10; i++) { const f = i / 10, xx = hw + 6 + dx * f; g.beginPath(); g.moveTo(xx, y1 + dy * f - 2); g.lineTo(xx + 2, y0 + dy * f + 4); g.stroke(); }
    g.restore();
  }
  // дверь и окно остаются видны поверх соломы: рамки
  if (st > 0) {
    g.beginPath(); rrect(g, ddx - dw / 2 - 4, -dh - 4, dw + 8, dh + 4, 6); g.strokeStyle = css(C.strawD); g.lineWidth = 5; g.stroke();
    g.beginPath(); rrect(g, wx - 38, wy - 34, 76, 68, 4); g.stroke();
  }
  // крыша: два ската (левый — плоскость к нам не видна; видим фронт и правый скат в глубину)
  const roof = () => { g.beginPath(); g.moveTo(0, -wall - gable - 8); g.lineTo(hw + 22, -wall + 8); g.lineTo(hw + 22 + dx, -wall + 8 + dy); g.lineTo(dx, -wall - gable - 8 + dy); g.closePath(); };
  roof(); paintPath(g, [120, 70, 40], { sc: 0.35 });
  g.save(); roof(); g.clip(); g.strokeStyle = "rgba(40,22,10,0.35)"; g.lineWidth = 3;
  for (let i = 1; i < 8; i++) { const f = i / 8; g.beginPath(); g.moveTo(lerp(0, hw + 22, f), lerp(-wall - gable - 8, -wall + 8, f)); g.lineTo(lerp(0, hw + 22, f) + dx, lerp(-wall - gable - 8, -wall + 8, f) + dy); g.stroke(); }
  g.restore();
  // свес левого ската (видна кромка)
  g.beginPath(); g.moveTo(0, -wall - gable - 8); g.lineTo(-hw - 22, -wall + 8); g.lineTo(-hw - 14, -wall + 18); g.lineTo(0, -wall - gable + 6); g.closePath(); paintPath(g, [100, 58, 32], { sc: 0.3 });
  g.beginPath(); g.moveTo(0, -wall - gable - 8); g.lineTo(hw + 22, -wall + 8); g.lineTo(hw + 14, -wall + 18); g.lineTo(0, -wall - gable + 6); g.closePath(); paintPath(g, [100, 58, 32], { sc: 0.3 });
  // снег на крыше
  const sr = o.snowRoof || 0;
  if (sr > 0) {
    g.save(); g.globalAlpha = clamp(sr * 1.5);
    const th = 16 * sr;
    g.beginPath(); g.moveTo(-2, -wall - gable - 10 - th); g.lineTo(hw + 26, -wall + 6 - th * 0.4);
    for (let i = 0; i <= 8; i++) { const f = i / 8; g.lineTo(hw + 26 + dx * f, -wall + 6 + dy * f + (i % 2 ? 10 * sr : 2)); }
    g.lineTo(dx - 2, -wall - gable - 10 - th + dy); g.closePath(); paintPath(g, C.snow, { ga: 0.1 });
    g.beginPath(); g.moveTo(-2, -wall - gable - 10 - th); g.lineTo(-hw - 26, -wall + 6 - th * 0.4);
    for (let i = 0; i <= 6; i++) { const f = i / 6; g.lineTo(lerp(-hw - 26, 0, f), lerp(-wall + 6, -wall - gable - 4, f) + (i % 2 ? 9 * sr : 0)); }
    g.closePath(); paintPath(g, C.snow, { ga: 0.1 });
    g.restore();
  }
  // труба
  const cx = dx * 0.55 + 60, cy = lerp(-wall - gable - 8, -wall + 8, 60 / (hw + 22)) + dy * 0.55;
  g.beginPath(); rrect(g, cx - 16, cy - 62, 32, 66, 3); paintPath(g, [176, 92, 64], { sc: 0.3 });
  g.beginPath(); rrect(g, cx - 16, cy - 62, 32, 66, 3); cylShade(g, cx - 16, cx + 16, 0.8);
  if (sr > 0) { g.beginPath(); g.ellipse(cx, cy - 62, 19, 6 + 3 * sr, 0, 0, TAU); g.fillStyle = css(C.snow, clamp(sr * 1.5)); g.fill(); }
  g.restore();
  return { chimney: [x + cx * s, y + (cy - 62) * s] };
}

// снежная гора-бастион: ярусы-диски; lv 0…3 (дробное — ярус растёт)
function snowHill(g, x, y, s, lv) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const tiers = [[78, 30], [58, 28], [36, 26]];
  let yy = 0;
  for (let i = 0; i < 3; i++) {
    const u = clamp(lv - i);
    if (u <= 0) break;
    const k = SPRING(u) , [rw, hh] = tiers[i];
    const r = rw * (0.5 + 0.5 * k), h = hh * k;
    g.beginPath(); g.moveTo(-r, yy); g.lineTo(-r * 0.92, yy - h); g.ellipse(0, yy - h, r * 0.92, r * 0.92 * 0.3, 0, Math.PI, 0); g.lineTo(r, yy); g.ellipse(0, yy, r, r * 0.3, 0, 0, Math.PI); g.closePath();
    paintPath(g, C.snow, { ga: 0.08 });
    g.beginPath(); g.moveTo(-r, yy); g.lineTo(-r * 0.92, yy - h); g.lineTo(r * 0.92, yy - h); g.lineTo(r, yy); g.ellipse(0, yy, r, r * 0.3, 0, 0, Math.PI); g.closePath();
    cylShade(g, -r, r, 0.55);
    g.beginPath(); g.ellipse(0, yy - h, r * 0.92, r * 0.92 * 0.3, 0, 0, TAU); g.fillStyle = css(C.white); g.fill();
    g.beginPath(); g.ellipse(0, yy - h, r * 0.92, r * 0.92 * 0.3, 0, 0, TAU); g.strokeStyle = css(C.snowS); g.lineWidth = 2; g.stroke();
    yy -= h;
  }
  g.restore();
}

// санки: полозья и рейки; dir 1 — передок вправо
function sled(g, x, y, s, dir = 1) {
  g.save(); g.translate(x, y); g.scale(s * dir, s);
  for (const [oy, k] of [[-10, 0.75], [6, 1]]) {
    g.beginPath(); g.moveTo(-62, oy); g.lineTo(46, oy); g.quadraticCurveTo(70, oy, 66, oy - 24); g.lineTo(60, oy - 22); g.quadraticCurveTo(60, oy - 6, 46, oy - 7); g.lineTo(-62, oy - 7); g.closePath();
    paintPath(g, shade(C.verm, k - 1), { sc: 0.3 });
  }
  for (let i = 0; i < 5; i++) { g.beginPath(); rrect(g, -56 + i * 24, -30, 18, 30, 3); woodPath(g, "pine", i * 7, 0, 0.25, 90); g.strokeStyle = "rgba(60,30,12,0.4)"; g.lineWidth = 1.5; g.stroke(); }
  for (const sx of [-48, 34]) { g.beginPath(); g.rect(sx, -22, 7, 22); g.fillStyle = css(C.vermD); g.fill(); }
  g.restore();
}
// стог соломы
function haystack(g, x, y, s, amt = 1) {
  g.save(); g.translate(x, y); g.scale(s, s * (0.55 + 0.45 * amt));
  g.beginPath(); g.moveTo(-90, 0); g.quadraticCurveTo(-96, -100, -30, -150); g.quadraticCurveTo(0, -170, 30, -150); g.quadraticCurveTo(96, -100, 90, 0); g.ellipse(0, 0, 90, 24, 0, 0, Math.PI); g.closePath();
  paintPath(g, C.straw, { sc: 0.3, rot: 90, ga: 0.3 });
  g.save(); g.clip(); g.strokeStyle = css(C.strawD, 0.85); g.lineWidth = 2.2;
  for (let i = 0; i < 40; i++) { const xx = -95 + 190 * hash(i * 1.7), yy = -160 * hash(i * 2.9); g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx + (hash(i) - 0.5) * 14, yy + 26); g.stroke(); }
  g.restore();
  g.beginPath(); g.moveTo(-90, 0); g.quadraticCurveTo(-96, -100, -30, -150); g.quadraticCurveTo(0, -170, 30, -150); g.quadraticCurveTo(96, -100, 90, 0); g.closePath(); cylShade(g, -96, 96, 0.7);
  g.restore();
}
// лавка
function bench(g, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s);
  for (const lx of [-58, 50]) { g.beginPath(); g.rect(lx, -34, 9, 34); woodPath(g, "pine", 0, 0, 0.25, 90); }
  g.beginPath(); rrect(g, -74, -44, 148, 14, 4); woodPath(g, "pine", 0, 0, 0.3); g.strokeStyle = "rgba(60,30,12,0.5)"; g.lineWidth = 1.5; g.stroke();
  g.restore();
}
// снежинка-жетон: резная, spin — поворот вокруг вертикали (сжатие по x), rot — в плоскости
function flake(g, x, y, s, rot = 0, spin = 0, a = 1) {
  g.save(); g.translate(x, y); g.scale(s * Math.max(0.12, Math.abs(Math.cos(spin))), s); g.rotate(rot); g.globalAlpha *= a;
  g.lineCap = "round";
  const arm = () => {
    g.beginPath();
    for (let k = 0; k < 6; k++) {
      g.save(); g.rotate(k * Math.PI / 3);
      g.moveTo(0, 0); g.lineTo(0, -30);
      g.moveTo(0, -17); g.lineTo(-9, -25); g.moveTo(0, -17); g.lineTo(9, -25);
      g.restore();
    }
  };
  arm(); g.strokeStyle = css(C.snowB); g.lineWidth = 11; g.stroke();
  arm(); g.strokeStyle = css(C.white); g.lineWidth = 7.5; g.stroke();
  g.beginPath(); g.arc(0, 0, 7, 0, TAU); g.fillStyle = css(C.white); g.fill();
  g.beginPath(); g.arc(-2, -2, 2.5, 0, TAU); g.fillStyle = css(C.snowS); g.fill();
  g.restore();
}
// облако-фишка
function cloudPiece(g, x, y, s, puff = 0) {
  g.save(); g.translate(x, y); g.scale(s * (1 + puff * 0.04), s * (1 - puff * 0.03));
  const bumps = [[-110, -10, 52], [-55, -42, 64], [15, -55, 74], [85, -32, 58], [128, -4, 42], [0, 0, 60]];
  // один контур-объединение, без кругов внутри
  const path = () => { g.beginPath(); for (const [bx, by, r] of bumps) { g.moveTo(bx + r, by); g.arc(bx, by, r, 0, TAU); } g.rect(-140, -10, 290, 50); };
  g.save(); g.translate(0, 12); path(); g.fillStyle = css(C.snowB); g.fill("nonzero"); g.restore();
  path(); g.fillStyle = css([238, 242, 250]); g.fill("nonzero");
  g.save(); path(); g.clip("nonzero");
  g.globalCompositeOperation = "multiply"; g.globalAlpha = 0.14; g.fillStyle = pat(g, "grainGrey", 0, 0, 0.6); g.fillRect(-200, -150, 400, 220);
  g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
  // объём: светлые макушки и тень снизу одной заливкой
  for (const [bx, by, r] of bumps) { const gr = g.createRadialGradient(bx - r * 0.3, by - r * 0.45, 0, bx - r * 0.3, by - r * 0.45, r * 0.9); gr.addColorStop(0, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(bx - r, by - r, r * 2, r * 2); }
  const sh = g.createLinearGradient(0, -130, 0, 40); sh.addColorStop(0, "rgba(30,40,70,0)"); sh.addColorStop(0.65, "rgba(30,40,70,0.04)"); sh.addColorStop(1, "rgba(30,40,70,0.3)"); g.fillStyle = sh; g.fillRect(-200, -150, 400, 200);
  g.restore();
  g.restore();
}
// большая белая шапка с красной полосой и помпоном (накрывает лес)
function bigHat(g, x, y, s, sq = 1) {
  g.save(); g.translate(x, y); g.scale(s * (2 - sq) ** 0.5, s * sq);
  const R = 300, Hh = 380;
  // дальний край отворота
  g.beginPath(); g.ellipse(0, 0, R * 1.08, R * 0.3, 0, Math.PI, 0); g.lineTo(R * 1.08, -40); g.ellipse(0, -40, R * 1.08, R * 0.3, 0, 0, Math.PI, true); g.closePath(); paintPath(g, C.snowS, { ga: 0.1 });
  // купол
  const dome = () => { g.beginPath(); g.moveTo(-R, -30); g.bezierCurveTo(-R, -Hh * 1.2, R, -Hh * 1.2, R, -30); g.ellipse(0, -30, R, R * 0.3, 0, 0, Math.PI); g.closePath(); };
  dome(); paintPath(g, C.snow, { ga: 0.1 });
  g.save(); dome(); g.clip();
  g.strokeStyle = css(C.snowS, 0.7); g.lineWidth = 6;
  for (let i = -6; i <= 6; i++) { g.beginPath(); g.moveTo(i * 46, -10); g.quadraticCurveTo(i * 30, -Hh * 0.7, i * 8, -Hh * 0.95); g.stroke(); }
  g.fillStyle = css(C.verm); g.beginPath(); g.ellipse(0, -Hh * 0.52, R, R * 0.3, 0, 0, TAU); g.ellipse(0, -Hh * 0.38, R, R * 0.3, 0, 0, TAU, true); g.fill("evenodd");
  g.restore();
  dome(); cylShade(g, -R, R, 0.6);
  // передний край отворота
  g.beginPath(); g.ellipse(0, 0, R * 1.08, R * 0.3, 0, 0, Math.PI); g.lineTo(-R * 1.08, -40); g.ellipse(0, -40, R * 1.08, R * 0.3, 0, Math.PI, 0, true); g.closePath(); paintPath(g, C.white, { ga: 0.1 });
  g.beginPath(); g.ellipse(0, 0, R * 1.08, R * 0.3, 0, 0, Math.PI); g.lineTo(-R * 1.08, -40); g.ellipse(0, -40, R * 1.08, R * 0.3, 0, Math.PI, 0, true); g.closePath(); cylShade(g, -R * 1.08, R * 1.08, 0.5);
  // помпон
  g.beginPath(); g.arc(0, -Hh * 0.98, 52, 0, TAU); paintPath(g, C.verm, { ga: 0.15 });
  g.beginPath(); g.arc(0, -Hh * 0.98, 52, 0, TAU); ballShade(g, 0, -Hh * 0.98, 52);
  g.restore();
}
// вихрь-дух (Вьюга, Метель): диск со спиралью, щёки надуты, губы трубочкой
function windSpirit(g, x, y, s, o = {}) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const R = 70, col = o.col || C.ice;
  // хвост-завитки сзади (по направлению движения dir)
  const dir = o.dir || 1;
  g.strokeStyle = css(C.white, 0.42); g.lineCap = "round";
  for (let k = 0; k < 3; k++) {
    g.lineWidth = 11 - k * 3;
    g.beginPath();
    const yy = -20 + k * 22, ph = (o.t || 0) * 9 + k;
    g.moveTo(-dir * R * 0.7, yy);
    g.bezierCurveTo(-dir * (R + 30), yy - 24 * Math.sin(ph), -dir * (R + 70), yy + 24 * Math.sin(ph + 1), -dir * (R + 110 - k * 20), yy + 8 * Math.sin(ph + 2));
    g.stroke();
  }
  g.rotate(o.rot || 0);
  g.beginPath(); g.arc(0, 0, R, 0, TAU); paintPath(g, col, { ga: 0.15 });
  g.save(); g.beginPath(); g.arc(0, 0, R, 0, TAU); g.clip();
  g.strokeStyle = css(C.white, 0.9); g.lineWidth = 9; g.beginPath();
  for (let a = 0; a < Math.PI * 5.5; a += 0.1) { const r = 6 + a * 3.8; const px = Math.cos(a) * r, py = Math.sin(a) * r; a === 0 ? g.moveTo(px, py) : g.lineTo(px, py); }
  g.stroke(); g.restore();
  g.beginPath(); g.arc(0, 0, R, 0, TAU); ballShade(g, 0, 0, R, 0.8);
  g.rotate(-(o.rot || 0));
  // лицо поверх спирали: щёки надуты, губы трубочкой
  const fx = dir * 14;
  g.beginPath(); g.arc(fx, 4, R * 0.55, 0, TAU); paintPath(g, [236, 244, 252], { ga: 0.1 });
  for (const sx of [-1, 1]) { g.beginPath(); g.arc(fx + sx * 20, 16, 13 + (o.puff || 0) * 5, 0, TAU); g.fillStyle = css(C.cheek, 0.7); g.fill(); }
  g.fillStyle = css(C.ink); g.lineWidth = 4; g.strokeStyle = css(C.ink); g.lineCap = "round";
  for (const sx of [-1, 1]) {
    g.beginPath(); g.ellipse(fx + sx * 13, -8, 4.5, 6.5, 0, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(fx + sx * 22, -22); g.lineTo(fx + sx * 6, -17); g.stroke();
  }
  g.beginPath(); g.ellipse(fx + dir * 22, 18, 6, 8, 0, 0, TAU); g.fillStyle = css(C.vermD); g.fill();
  g.restore();
}
// сосулька-миньон: ледяной конус с глазками
function icicle(g, x, y, s, o = {}) {
  g.save(); g.translate(x, y); g.scale(s * (2 - (o.sq ?? 1)) ** 0.5, s * (o.sq ?? 1));
  const path = () => { g.beginPath(); g.moveTo(-26, 0); g.quadraticCurveTo(-24, -50, 0, -96); g.quadraticCurveTo(24, -50, 26, 0); g.ellipse(0, 0, 26, 8, 0, 0, Math.PI); g.closePath(); };
  path(); paintPath(g, C.ice, { ga: 0.12 });
  path(); cylShade(g, -26, 26, 0.7);
  g.fillStyle = css(C.ink); for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 8, -30, 3.5, 5, 0, 0, TAU); g.fill(); }
  g.strokeStyle = css(C.ink); g.lineWidth = 2.5; g.beginPath(); g.moveTo(-14, -42); g.lineTo(-3, -38); g.moveTo(14, -42); g.lineTo(3, -38); g.stroke();
  g.beginPath(); g.arc(0, -16, 5, 1.2 * Math.PI, 1.8 * Math.PI); g.stroke();
  g.restore();
}
// буква-жетон «Z» (сон) и звёздочка удара
function zToken(g, x, y, s, a = 1) {
  g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha *= a;
  g.beginPath(); g.moveTo(-18, -20); g.lineTo(18, -20); g.lineTo(18, -12); g.lineTo(-6, 12); g.lineTo(18, 12); g.lineTo(18, 20); g.lineTo(-18, 20); g.lineTo(-18, 12); g.lineTo(6, -12); g.lineTo(-18, -12); g.closePath();
  paintPath(g, C.cobalt, { ga: 0.12 }); g.restore();
}
function burst(g, x, y, s, u, col = C.white) {
  if (u <= 0 || u >= 1) return;
  g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha *= 1 - easeIn(u);
  const R = 40 + 70 * easeOut(u);
  g.beginPath();
  for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, r = i % 2 ? R * 0.45 : R; i ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  g.closePath(); paintPath(g, col, { grain: false }); g.strokeStyle = css(C.gold); g.lineWidth = 4; g.stroke();
  g.restore();
}
