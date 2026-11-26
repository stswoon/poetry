// ---------- Пробы героев: все позы подряд крупно (PROBE=cast PROBE_PAGE=N) ----------
const PROBE_PAGES = [
  // 0: герой сбоку — санки, машет, кувырок по кадрам, в сугробе, ходьба
  (g, lab) => {
    const cells = [];
    cells.push(["sled", KP.sled]);
    for (const k of [0, 0.5, 1]) cells.push([`wave ${k}`, { ...KP.wave, arms: [{ a: KP.wave.arms[0].a + Math.sin(k * 3) * 0.35 * 0.6, b: KP.wave.arms[0].b - Math.sin(k * 3) * 0.35 * 0.5 }, KP.wave.arms[1]], mouth: "open" }]);
    for (let i = 0; i < 8; i++) { const u = i / 8; const ph = Math.sin(u * Math.PI * 8); cells.push([`tumble ${u.toFixed(2)}`, { ...blendPose(KP.tuck, KP.flail, clamp(0.5 + 0.5 * ph)), rot: u * Math.PI * 2 * 3, mouth: "o" }]); }
    for (let i = 0; i < 3; i++) { const k1 = Math.sin(i * 1.1 * 11), k2 = Math.sin(i * 1.1 * 11 + 2.2); cells.push([`drift ${i}`, { rot: Math.PI * 0.92, lean: 0, head: 0, arms: [{ a: 0.4, b: 0.3 }, { a: -0.3, b: 0.3 }], legs: [{ a: 0.25 + 0.35 * k1, b: 0.5 + 0.4 * Math.max(0, k1) }, { a: -0.2 + 0.35 * k2, b: 0.5 + 0.4 * Math.max(0, k2) }] }]); }
    for (let i = 0; i < 6; i++) { const wp = walkPose(i * 40, 1, 0.3, { lean: 0.2, head: 0.18, arms: [{ a: -0.32, b: 0.08 }, { a: 0.12, b: 0.1 }], mouth: "sad" }); cells.push([`walk ${i}`, wp.pose, wp.hipUp]); }
    cells.forEach(([n, p, hu], i) => {
      const cx = 140 + (i % 8) * 235, cy = 260 + Math.floor(i / 8) * 270;
      g.strokeStyle = "#999"; g.beginPath(); g.moveTo(cx - 110, cy + 0); g.lineTo(cx + 110, cy); g.stroke();
      drawKid(g, cx, hu ? cy - hu * 0.7 : cy - 70, 0.7, 1, p, i % 2 ? "hero" : "heroIn", 100);
      lab(n, cx, cy + 22);
    });
  },
  // 1: подъём на печь по кадрам и сидя
  (g, lab) => {
    for (let i = 0; i < 8; i++) {
      const cx = (i % 4) * 480, cy = Math.floor(i / 4) * 540, c = [0, 0.12, 0.25, 0.4, 0.55, 0.7, 0.82, 0.92][i];
      g.save(); g.beginPath(); g.rect(cx + 2, cy + 2, 476, 536); g.clip();
      g.translate(cx + 240, cy + 270); g.scale(0.62, 0.62); g.translate(-2600, -600);
      drawInterior(g, 0, {});
      const cp = climbPose(c, 1.25);
      drawKid(g, cp.hip[0], cp.hip[1], 1.25, 1, { ...cp.pose, mouth: "smile" }, "heroIn", 100);
      g.restore();
      lab(`climb c=${c.toFixed(2)}`, cx + 240, cy + 520);
    }
  },
  // 2: друзья в общем плане, f2 лёжа, взрослые
  (g, lab) => {
    for (let i = 0; i < 3; i++) {
      const t = i * 0.13, b1 = Math.sin(t * 10) * 0.08, k1 = Math.sin(t * 9), k2 = Math.sin(t * 9 + 2);
      const x0 = 120 + i * 600;
      drawKid(g, x0 + 80, 300, 0.9, 1, { rot: 0, lean: 0.5 + b1, head: 0.25, arms: [{ a: -0.23, b: 1.52 }, { a: 0.3, b: 0.2 }], legs: [{ a: 0.12, b: 0.25 }, { a: -0.12, b: 0.2 }], mouth: "laugh", eyes: "happy", tl: t }, "f1", 400);
      drawKid(g, x0 + 300, 300, 0.9, -1, { rot: 0, lean: 0.12 + b1, head: 0.05, arms: [{ a: 1.55, b: 0.1 }, { a: -0.23, b: 1.52 }], legs: [{ a: 0.05, b: 0.05 }, { a: -0.08, b: 0.05 }], mouth: "laugh", eyes: "happy" }, "f3", 480);
      drawKid(g, x0 + 380, 470, 0.9, -1, { rot: -Math.PI / 2, lean: 0, head: -0.1, arms: [{ a: -0.23, b: 1.52 }, { a: 1.7 + 0.3 * k1, b: 0.4 }], legs: [{ a: 1.35 + 0.3 * k1, b: 0.6 + 0.4 * Math.max(0, k1) }, { a: 1.15 + 0.3 * k2, b: 0.7 + 0.4 * Math.max(0, k2) }], mouth: "laugh", eyes: "happy" }, "f2", 440);
      lab(`friends t=${t.toFixed(2)}`, x0 + 220, 520);
    }
    const r = 0.5;
    drawAdult(g, 300, 850, 1.0, -1, "baba", { lean: 0.05 + r * 0.15, head: 0.08, seatH: 34, hands: [[lerp(30, 120, r), lerp(110, 40, r)], [lerp(10, 100, r), lerp(100, 30, r)]] }, 700); lab("baba reach", 300, 900);
    drawAdult(g, 620, 850, 1.0, -1, "baba", { lean: 0.12, head: 0.12, seatH: 34, hands: [[118, 36], [60, 100]], eyes: "closed" }, 700); lab("baba hug", 620, 900);
    for (let i = 0; i < 2; i++) drawAdult(g, 900 + i * 300, 850, 1.0, 1, "ded", { lean: 0.32, head: 0.3, seatH: 128, hands: [[62 + (i ? 10 : -10), 70 - (i ? 30 : 0)], [70, 96]] }, 720);
    lab("ded", 1050, 1000);
    drawAdult(g, 1600, 850, 1.0, 1, "mama", { lean: 0.08, head: -0.08, seatH: 128, hands: [[64, 120], [100, -40]] }, 740); lab("mama", 1600, 1000);
  },
];
