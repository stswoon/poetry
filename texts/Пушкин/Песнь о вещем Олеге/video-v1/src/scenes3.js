// ---------- Сцены 13–17 и финал: гнев, кости на холме, череп, змея, тризна ----------
function lady(c, x, y, s, dir, col, rim, t = 0) {
  c.save(); c.translate(x, y); c.scale(s * dir, s);
  const draw = (g, cl) => {
    g.fillStyle = cl;
    g.beginPath(); g.moveTo(-70, 0); g.quadraticCurveTo(-50, -150, -26, -250); g.lineTo(26, -250); g.quadraticCurveTo(50, -150, 76, 0); g.closePath(); g.fill();
    ellipse(g, 0, -276, 20, 24); g.fill();
    g.beginPath(); g.moveTo(-24, -290); g.quadraticCurveTo(0, -320, 24, -290); g.quadraticCurveTo(40, -200, 30 + Math.sin(t * 1.5) * 6, -120); g.lineTo(-30, -150); g.closePath(); g.fill(); // покров
  };
  fig(c, draw, col, rim, -3 / s, -2 / s);
  c.restore();
}
function scene13(c, t) {
  if (t < L(75) - 0.1) { // поник головой
    const u = prog(t, L(73) - 0.45, L(75));
    hall(c, t, 0.6); fade(c, 0.35);
    c.save(); c.translate(860, 600); c.rotate(0.12 * sstep(prog(t, Wd("w_ponik") - 0.3, Wd("w_ponik") + 0.4))); c.translate(-860, -600);
    olegFace(c, 860, 600, 1.3, 1, { t, dark: 0.6, rim: "#ff9a4a" });
    c.restore();
    return;
  }
  if (t < L(77) - 0.1) { // лицо кудесника в огне рассыпается
    const u = prog(t, L(75) - 0.1, L(77)), br = Wd("w_prezr") + 0.1;
    const [sx, sy] = shake(t, br, 30, 0.6);
    c.save(); c.translate(sx, sy);
    hall(c, t, 1.1);
    if (t < br) { c.save(); c.globalAlpha = 0.75 * sstep(prog(t, L(75) - 0.1, L(75) + 0.4)); c.globalCompositeOperation = "lighter"; sorcererFace(c, 960, 430, 0.75, { t, glow: 0.4, rim: "#ff8a3a" }); c.restore(); }
    else { // осколки
      const R = mulberry32(17), k = prog(t, br, br + 1.2);
      c.save(); c.globalCompositeOperation = "lighter"; c.globalAlpha = 1 - k;
      for (let i = 0; i < 40; i++) { const a = R() * TAU, d = k * (200 + R() * 600); c.fillStyle = `rgba(255,${120 + R() * 100},60,0.8)`; c.save(); c.translate(960 + Math.cos(a) * d, 430 + Math.sin(a) * d + k * k * 200); c.rotate(k * 6 * R()); c.fillRect(-20, -12, 40, 24); c.restore(); }
      c.restore();
    }
    c.restore();
    flash(c, win(t, br, br + 0.25, 0.01, 0.2) * 0.5, "255,180,120");
    return;
  }
  // встаёт — плащ взлетает
  const u = prog(t, L(77) - 0.1, LE(78) + 0.8), up = sstep(prog(t, L(78) - 0.3, L(78) + 0.6));
  hall(c, t, 0.9);
  c.save(); camera(c, 960, 760, lerp(1.2, 1.05, up));
  warrior(c, 960, lerp(1180, 1020, up), 1.25, 1, "#040302", "#ffaa5a", { t, wind: 0.3 + up * 1.2, arm: 0.3 });
  c.fillStyle = "#120a04"; c.fillRect(0, 960, W, 140);
  c.restore();
}

// ---------- 14. Выезд к Днепру, кости на холме ----------
function scene14(c, t) {
  if (t < L(81) - 0.1) { // всадники вдоль Днепра
    const u = prog(t, L(79) - 0.45, L(81)), pan = u * 300;
    sky(c, "dusk", 620); sunDisc(c, 1500 - pan * 0.05, 560, 44);
    c.save(); c.translate(-pan * 0.2, 0); ridge(c, 91, 640, 50, "#2a2a36"); c.restore();
    c.fillStyle = linear(c, 0, 650, 0, 760, [[0, "#c88a5a"], [1, "#4a3a3e"]]); c.fillRect(0, 650, W, 110); // Днепр
    c.save(); c.globalAlpha = 0.4; c.strokeStyle = "#ffd0a0"; c.lineWidth = 2; for (let i = 0; i < 12; i++) { const y = 660 + i * 9, x = ((i * 397 + t * 40) % 2200) - 100; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 160, y); c.stroke(); } c.restore();
    c.save(); c.translate(-pan * 0.8, 0); ridge(c, 93, 840, 26, "#0b0f14", 0.003, -1200, W + 3000); c.restore();
    for (let i = 0; i < 4; i++) {
      const x = 500 + i * 230 + u * 300, P = horsePose(t, "walk", 1.1, i * 0.4), s = i === 0 ? 0.8 : 0.72;
      horse(c, x, 870 + (i % 2) * 18, s, 1, P, "#05070a", SUN); rider(c, x, 870 + (i % 2) * 18, s, 1, P, "#05070a", SUN, { spear: i > 1, banner: i === 0 });
    }
    return;
  }
  if (t < L(83) - 0.1) { // холм у брега, белеют кости
    const u = prog(t, L(81) - 0.1, L(83));
    sky(c, "dusk", 700); sunDisc(c, 1600, 560, 40);
    c.save(); camera(c, 1000, 560, lerp(1.0, 1.35, easeInOut(u)));
    c.fillStyle = linear(c, 0, 640, 0, 720, [[0, "#c88a5a"], [1, "#4a3a3e"]]); c.fillRect(-500, 640, W + 1000, 120);
    c.fillStyle = "#0d1016"; c.beginPath(); c.moveTo(-300, 900); c.quadraticCurveTo(700, 400, 1100, 520); c.quadraticCurveTo(1500, 620, 2300, 900); c.lineTo(2300, 1500); c.lineTo(-300, 1500); c.fill();
    bones(c, 1000, 520, 0.6, 0.9); skull(c, 1180, 510, 0.45, 0.1, 0.9);
    featherGrass(c, 44, 520, 120, 40, "#1a2028", t, 1, 600, 1500);
    c.restore();
    return;
  }
  // дожди, пыль, ковыль
  const u = prog(t, L(83) - 0.1, LE(84) + 0.6), dz = Wd("w_dozhd"), pl = Wd("w_pyl"), vt = Wd("w_veter");
  sky(c, t < pl ? "storm" : "dusk", 900);
  c.save(); camera(c, 960, 700, 1.4);
  c.fillStyle = "#0d1016"; c.beginPath(); c.moveTo(-300, 900); c.quadraticCurveTo(960, 560, 2300, 900); c.lineTo(2300, 1500); c.lineTo(-300, 1500); c.fill();
  bones(c, 860, 700, 0.85, 1); skull(c, 1160, 690, 0.7, 0.08, 1);
  c.restore();
  if (t < pl - 0.1) particles(c, "rain", t, 55, 260, win(t, dz - 0.2, pl, 0.2, 0.2));
  if (t > pl - 0.2 && t < vt) particles(c, "dust", t, 56, 200, win(t, pl - 0.2, vt + 0.4, 0.2, 0.3));
  featherGrass(c, 57, 930, 360, 150, "#a8b4b8", t, t > vt - 0.3 ? 1.6 : 0.6, -200, W + 200, 3);
  featherGrass(c, 58, 980, 220, 200, "#0a0e12", t + 2, t > vt - 0.3 ? 1.8 : 0.6, -200, W + 200, 4);
}

// ---------- 15. Нога на черепе ----------
function boot(c, x, y, s) {
  c.save(); c.translate(x, y); c.scale(s, s); c.fillStyle = "#050506";
  c.beginPath(); c.moveTo(-60, -900); c.lineTo(60, -900); c.lineTo(70, -120); c.quadraticCurveTo(200, -90, 230, -20); c.lineTo(230, 0); c.lineTo(-80, 0); c.lineTo(-80, -120); c.closePath(); c.fill();
  c.strokeStyle = "rgba(255,170,90,0.6)"; c.lineWidth = 5; c.beginPath(); c.moveTo(60, -900); c.lineTo(70, -120); c.quadraticCurveTo(200, -90, 230, -20); c.stroke();
  c.restore();
}
function scene15(c, t) {
  if (t < L(86) - 0.1) {
    const u = prog(t, L(85) - 0.5, L(86)), ns = Wd("w_nastup");
    sky(c, "dusk", 900); sunDisc(c, 400, 760, 50);
    c.fillStyle = "#0d1016"; c.fillRect(0, 780, W, 400);
    featherGrass(c, 61, 800, 220, 90, "#141a20", t, 1.2);
    skull(c, 960, 730, 1.4, 0.06, 1);
    const d = easeInOut(prog(t, L(85) - 0.3, ns + 0.35));
    boot(c, 900, lerp(80, 660, d), 0.66);
    return;
  }
  if (t < L(88) - 0.1) { // говорит с черепом, снизу
    const u = prog(t, L(86) - 0.1, L(88));
    sky(c, "dusk", 1100); sunDisc(c, 1500, 820, 60); rays(c, 1500, 820, 9, 1500, 0.2, t, 2.5, Math.PI, "255,190,120");
    c.save(); camera(c, 960, 700, 1.0 + u * 0.08);
    c.fillStyle = "#0d1016"; c.beginPath(); c.moveTo(-200, 1100); c.quadraticCurveTo(960, 900, 2200, 1100); c.lineTo(2200, 1400); c.lineTo(-200, 1400); c.fill();
    warrior(c, 860, 1010, 1.75, 1, "#040506", SUN, { t, wind: 1.0, arm: 0.4 });
    skull(c, 1090, 1000, 0.65, 0.06, 0.8);
    c.restore();
    return;
  }
  // видение тризны в дыму
  const u = prog(t, L(88) - 0.1, LE(90) + 0.6);
  c.fillStyle = "#120604"; c.fillRect(0, 0, W, H);
  flames(c, 960, 900, 300, 400, t, 1);
  c.save(); c.globalAlpha = 0.9; for (let i = 0; i < 3; i++) c.drawImage(SPR.smokeD, 200 + i * 500 + Math.sin(t + i) * 40, 120 - (t % 6) * 10, 800, 800); c.restore();
  for (let i = 0; i < 6; i++) warrior(c, 260 + i * 280, 1000, 0.95, i < 3 ? 1 : -1, "#030101", "#ff6a2a", { t, arm: 2.4 + Math.sin(t * 2 + i) * 0.2 });
  const sk = sstep(prog(t, Wd("w_sekir") - 0.3, Wd("w_sekir") + 0.3));
  c.save(); c.translate(960, 760 - sk * 220); c.rotate(-0.3 + sk * 0.3); c.fillStyle = "#050202"; c.fillRect(-8, 0, 16, 300);
  c.fillStyle = linear(c, 0, -40, 0, 120, [[0, "#d8e0e4"], [1, "#4a5258"]]);
  c.beginPath(); c.moveTo(6, 6); c.quadraticCurveTo(70, -40, 150, -50); c.quadraticCurveTo(120, 40, 150, 130); c.quadraticCurveTo(70, 110, 6, 80); c.closePath(); c.fill(); c.restore();
  fade(c, 0.15);
}

// ---------- 16. Змея ----------
function scene16(c, t) {
  if (t < L(93) - 0.1) { // «Так вот где…» — хохот над черепом
    const u = prog(t, L(91) - 0.5, L(93)), lf = Math.abs(Math.sin(t * 9)) * sstep(prog(t, L(92) - 0.3, L(92)));
    sky(c, "dusk", 1100); sunDisc(c, 1500, 820, 60);
    c.save(); camera(c, 960, 700, 1.0);
    c.fillStyle = "#0d1016"; c.beginPath(); c.moveTo(-200, 1100); c.quadraticCurveTo(960, 900, 2200, 1100); c.lineTo(2200, 1400); c.lineTo(-200, 1400); c.fill();
    c.save(); c.translate(860, 1010); c.rotate(-0.05 - lf * 0.06); c.translate(-860, -1010);
    warrior(c, 860, 1010 - lf * 8, 1.75, 1, "#040506", SUN, { t, wind: 1.0, arm: 0.3 + lf * 0.4 }); c.restore();
    skull(c, 1090, 1000, 0.65, 0.06, 0.8);
    c.restore();
    if (t < LE(91) + 0.3) fade(c, 0.6 * win(t, L(91) - 0.4, LE(91) + 0.3, 0.2, 0.3));
    return;
  }
  const zm = Wd("w_zmiya"), ob = Wd("w_obvil"), vs = Wd("w_vskr");
  if (t < L(95) - 0.1) { // наезд в глазницу: выползает змея
    const u = prog(t, L(93) - 0.1, L(95));
    sky(c, "dusk", 1200); fade(c, 0.5);
    c.save(); camera(c, 820, 520, lerp(1.0, 1.35, easeInOut(u)));
    skull(c, 960, 560, 3.2, 0.04, 0.85, { eye: 0.2 });
    // путь: из глазницы вперёд-вниз
    const pts = []; const ex = 960 - 48 * 3.2, ey = 560 - 30 * 3.2;
    const k = sstep(prog(t, zm - 0.3, L(95) - 0.1));
    for (let i = 0; i < 60; i++) { const v = i / 59, d = (1 - v) * 900 * k; pts.push([ex - d * 0.5 + Math.sin(v * 9 + t * 3) * 30 * (1 - v), ey + d * 0.55 + Math.cos(v * 7 + t * 2) * 20]); }
    c.save(); c.beginPath(); c.rect(-2000, -2000, 6000, 6000); snake(c, pts, Math.max(0.05, k), t, 46); c.restore();
    c.restore();
    return;
  }
  if (t < vs - 0.12) { // обвивает сапог
    const u = prog(t, L(95) - 0.1, vs), k = sstep(prog(t, L(95) - 0.1, ob + 0.6));
    sky(c, "dusk", 1200); fade(c, 0.45);
    c.fillStyle = "#0d1016"; c.fillRect(0, 880, W, 300);
    skull(c, 1420, 880, 0.9, 0.06, 0.7);
    boot(c, 860, 900, 1.15);
    // кольца вокруг голенища: задние витки под сапогом, передние — поверх
    const pts = [];
    for (let i = 0; i < 120; i++) { const v = i / 119, ang = v * TAU * 2.2 * k + t * 0.6, r = 125; pts.push([880 + Math.cos(ang) * r, 830 - v * 300 * k + Math.sin(ang) * 46, Math.sin(ang)]); }
    const P = pts.reverse();
    snake(c, P.map((q) => [q[0], q[1]]), 1, t, 54);
    c.save(); c.strokeStyle = "rgba(255,170,90,0.35)"; c.lineWidth = 4; c.beginPath();
    P.forEach((q, i) => { if (q[2] > 0.2) { c.moveTo(q[0], q[1] - 24); if (P[i + 1]) c.lineTo(P[i + 1][0], P[i + 1][1] - 24); } }); c.stroke(); c.restore();
    return;
  }
  // бросок и вспышка
  const k = prog(t, vs - 0.12, vs + 0.15);
  if (t < vs + 0.15) {
    sky(c, "dusk", 1200); fade(c, 0.45);
    c.fillStyle = "#0d1016"; c.fillRect(0, 880, W, 300);
    const pts = []; for (let i = 0; i < 40; i++) { const v = i / 39; pts.push([lerp(1500, 1000, easeIn(k)) + v * 500, lerp(500, 640, k) + Math.sin(v * 8) * 30 + v * 300]); }
    snake(c, pts, 1, t, 60 + k * 30);
  }
  flash(c, win(t, vs, vs + 0.7, 0.02, 0.6), "255,255,255");
  if (t > vs + 0.15) fade(c, 1);
}

// ---------- 17. Тризна плачевная ----------
function scene17(c, t) {
  if (t < L(99) - 0.1) { // ковши по кругу у костров
    const u = prog(t, L(97) - 0.5, L(99));
    fade(c, 0); sky(c, "dusk", 700); sunDisc(c, 1500, 650, 40, undefined, undefined, 0.8);
    c.fillStyle = "#0a0c10"; c.fillRect(0, 700, W, 500);
    for (let i = 0; i < 3; i++) flames(c, 400 + i * 560, 860, 120, 160, t + i, 1);
    c.save(); camera(c, 960, 760, lerp(1.0, 1.08, u));
    for (let i = 0; i < 6; i++) { const x = 330 + i * 252; warrior(c, x, 846, 0.5, x > 960 ? -1 : 1, "#070809", "#ff9a4a", { t, arm: 0.6 }); }
    for (let i = 0; i < 5; i++) { const x = 456 + i * 252; warrior(c, x, 958, 0.66, x > 960 ? -1 : 1, "#040506", "#ff9a4a", { t, arm: 0.6 }); }
    for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU + (t - L(97)) * 0.6, x = 960 + Math.cos(a) * 520, y = 780 + Math.sin(a) * 40; ladle(c, x, y, 0.55, Math.sin(t + i) * 0.1);
      const fm = 0.5 + 0.5 * Math.sin(t * 7 + i); c.fillStyle = `rgba(255,248,230,${0.6 * fm})`; ellipse(c, x, y - 18, 30, 8); c.fill(); }
    c.restore();
    fade(c, 1 - sstep(prog(t, L(97) - 0.5, L(97) + 0.6)));
    return;
  }
  if (t < L(100) - 0.1) { // Игорь и Ольга на холме
    const u = prog(t, L(99) - 0.1, L(100));
    sky(c, "sunset", 760); sunDisc(c, 960, 700, 70); rays(c, 960, 700, 12, 1500, 0.22, t, 3.2, -Math.PI / 2);
    c.fillStyle = "#07090c"; c.beginPath(); c.moveTo(-100, 1000); c.quadraticCurveTo(960, 560, 2020, 1000); c.lineTo(2020, H); c.lineTo(-100, H); c.fill();
    warrior(c, 900, 720, 0.75, 1, "#07090c", SUN, { t, wind: 0.5, arm: 0.2 });
    lady(c, 1030, 722, 0.72, -1, "#07090c", SUN, t);
    return;
  }
  if (t < L(101) - 0.1) { // дружина у брега
    const u = prog(t, L(100) - 0.1, L(101));
    sky(c, "dusk", 640); sunDisc(c, 1500, 600, 40);
    c.fillStyle = linear(c, 0, 650, 0, 760, [[0, "#c88a5a"], [1, "#4a3a3e"]]); c.fillRect(0, 650, W, 110);
    c.fillStyle = "#0a0c10"; c.fillRect(0, 760, W, 400);
    flames(c, 960, 930, 160, 200, t, 1);
    for (let i = 0; i < 9; i++) warrior(c, 260 + i * 175, 1000, 0.8, i < 5 ? 1 : -1, "#040506", "#ff9a4a", { t, arm: i % 3 === 0 ? 2.2 : 0.5 });
    return;
  }
  // в небе — призрак всадника
  const u = prog(t, L(101) - 0.1, EV.fin);
  sky(c, "sunset", 860); sunDisc(c, 960, 820, 60, undefined, undefined, 0.8);
  stars(c, 8, 60, 0.5 * u, 400);
  c.fillStyle = "#06080b"; c.beginPath(); c.moveTo(-100, 980); c.quadraticCurveTo(960, 820, 2020, 980); c.lineTo(2020, H); c.lineTo(-100, H); c.fill();
  const P = horsePose(t, "gallop", 0.5, 0);
  ghost(c, (g) => { horse(g, 900 + u * 100, 640, 1.3, 1, P, "#ffd8a0", null); rider(g, 900 + u * 100, 640, 1.3, 1, P, "#ffd8a0", null, { banner: true }); }, 0.32 * win(t, L(101), EV.fin + 0.4, 0.8, 1.2), "screen");
}

// ---------- Финал: титр поверх всадника на холме (кадр-обложка) ----------
function sceneFinal(c, t) {
  const u = prog(t, EV.fin - 0.4, TOTAL);
  bgSteppe(c, t, u * 40, { sky: "sunset", sunX: 1180, sunY: 760, sunR: 70, hz: 860, rays: 0.28 });
  c.fillStyle = "#06080b"; c.beginPath(); c.moveTo(-100, 1000); c.quadraticCurveTo(1200, 720, 2020, 900); c.lineTo(2020, H); c.lineTo(-100, H); c.fill();
  const P = horsePose(t, "stand", 1, 0.2);
  horse(c, 1320, 838, 0.62, -1, P, "#06080b", SUN); rider(c, 1320, 838, 0.62, -1, P, "#06080b", SUN, { banner: true, spearAng: -0.1 });
  particles(c, "dust", t, 99, 60, 0.8);
  c.save(); c.fillStyle = radial(c, W / 2, 400, 50, 900, [[0, "rgba(0,0,0,0.45)"], [1, "rgba(0,0,0,0)"]]); c.fillRect(0, 0, W, H); c.restore();
  const k = sstep(prog(t, EV.fin + 0.1, EV.fin + 0.9)), s = springSnap(prog(t, EV.fin + 0.1, EV.fin + 1.0));
  metalText(c, "ПЕСНЬ О ВЕЩЕМ ОЛЕГЕ", W / 2, 360, 112 * lerp(1.2, 1, s), k, prog(t, EV.fin + 0.6, EV.fin + 2.2), lerp(0.35, 0.14, s), "gold");
  c.save(); c.globalAlpha = sstep(prog(t, EV.fin + 0.6, EV.fin + 1.4)); font(c, 50, F_CAP, "italic"); c.textAlign = "center"; c.fillStyle = "#f0e2cc";
  c.shadowColor = "rgba(0,0,0,0.8)"; c.shadowBlur = 12; c.fillText("Александр Сергеевич Пушкин", W / 2, 470); c.restore();
}
