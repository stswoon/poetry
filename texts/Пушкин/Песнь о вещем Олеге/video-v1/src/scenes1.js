// ---------- Сцены 0–6: заставка, поход, кудесник, вопрос, пророчество, слава, хранитель ----------
const L = (n) => EV["L" + n], LE = (n) => EV["E" + n], Wd = (k) => EV[k];
const inS = (t, a, b) => t >= a && t < b;
const SUN = "#ffb35a", MOONRIM = "#a9d0ff";

// общий фон: степь на закате; pan — сдвиг камеры по x (параллакс)
function bgSteppe(c, t, pan = 0, o = {}) {
  const hz = o.hz ?? 640, kind = o.sky || "sunset";
  sky(c, kind, hz);
  if (o.sun !== false) sunDisc(c, (o.sunX ?? 1420) - pan * 0.05, o.sunY ?? hz - 70, o.sunR ?? 46, undefined, undefined, o.sunK ?? 1);
  if (o.rays) rays(c, (o.sunX ?? 1420) - pan * 0.05, o.sunY ?? hz - 70, 9, 1400, o.rays, t, 2.4, Math.PI, "255,190,120");
  c.save(); c.translate(-pan * 0.15, 0); ridge(c, 11, hz + 10, 70, mix(SKY[kind][3], "#202838", 0.55), 0.0015); c.restore();
  haze(c, hz + 20, 120, SKY[kind][4], 0.35);
  if (o.extra) o.extra(c);
  c.save(); c.translate(-pan * 0.4, 0); ridge(c, 23, hz + 90, 50, mix(SKY[kind][2], "#0d1218", 0.75), 0.0022); c.restore();
  c.save(); c.translate(-pan * 1.0, 0); ridge(c, 37, hz + 200, 30, "#0b0f14", 0.003, -1200, W + 3000); c.restore();
}

// ---------- 0. Заставка ----------
function scene0(c, t) {
  const v0 = EV.V0;
  sky(c, "storm", 700);
  const l1 = Math.max(win(t, 0.25, 0.75, 0.04, 0.4), win(t, 1.5, 2.0, 0.04, 0.45) * 0.8);
  flash(c, l1 * 0.35, "170,200,255");
  lightning(c, 1300, BAR, 640, 5, win(t, 0.25, 0.55, 0.02, 0.2));
  lightning(c, 520, BAR, 600, 9, win(t, 1.5, 1.75, 0.02, 0.2));
  c.save(); camera(c, W / 2, 620, 1 + t * 0.02);
  ridge(c, 3, 770, 60, mix("#1a2a33", "#9ab4d0", l1 * 0.6), 0.0016);
  // строй всадников на гребне — видны во вспышках
  for (let i = 0; i < 9; i++) {
    const x = 260 + i * 170 + Math.sin(i * 2.1) * 30, P = horsePose(t, "walk", 1, i * 0.37);
    horse(c, x, 782, 0.42, 1, P, "#05070a", "#a9c8ff", 0.4 + l1);
    rider(c, x, 782, 0.42, 1, P, "#05070a", "#a9c8ff", { banner: i % 3 === 0 }, 0.4 + l1);
  }
  ridge(c, 8, 900, 40, "#030507", 0.002);
  c.restore();
  particles(c, "ash", t, 4, 60, 0.5);
  // название
  const k = win(t, 0.75, v0 + 0.3, 0.35, 0.45), s = springSnap(prog(t, 0.75, 1.6));
  metalText(c, "ПЕСНЬ О ВЕЩЕМ ОЛЕГЕ", W / 2, 330, 104 * lerp(1.25, 1, s), k, prog(t, 1.0, 2.4), lerp(0.4, 0.14, s), "gold");
  c.save(); c.globalAlpha = win(t, 1.4, v0 + 0.3, 0.4, 0.45); font(c, 42, F_CAP, "italic"); c.textAlign = "center"; c.fillStyle = "#e8dccb";
  c.fillText("Александр Сергеевич Пушкин · 1822", W / 2, 430); c.restore();
}

// ---------- 1. Поход на хазар ----------
function druzhina(c, t, x0, y, n, s, speed, rim, o = {}) {
  for (let i = n - 1; i >= 0; i--) {
    const row = i % 3, x = x0 - i * 130 * s - row * 40 * s, yy = y + row * 22 * s, P = horsePose(t, "gallop", speed, i * 0.29);
    const sc = s * (1 - row * 0.08);
    horse(c, x, yy, sc, 1, P, "#07090c", rim, 0.9);
    rider(c, x, yy, sc, 1, P, "#07090c", rim, { banner: i % 4 === 0, spearAng: 0.35 + row * 0.1, ...o }, 0.9);
  }
}
function scene1(c, t) {
  const a = L(1) - 0.45;
  if (t < Wd("w_hoz") - 0.25) { // общий план: дружина скачет
    const u = prog(t, a, Wd("w_hoz")), pan = u * 260;
    bgSteppe(c, t, pan, { rays: 0.12 });
    c.save(); c.translate(-pan * 0.7, 0);
    druzhina(c, t, 600 + u * 520, 820, 9, 0.62, 1, SUN);
    c.restore();
    particles(c, "dust", t, 12, 90, 0.9, [0, 640, W, 900]);
    featherGrass(c, 5, 905, 160, 70, "#0a0d10", t, 1.3);
    return;
  }
  if (t < Wd("w_mech") - 0.1) { // хазарские шатры, сёла и нивы
    const u = prog(t, Wd("w_hoz") - 0.25, Wd("w_mech")), pan = 120 + u * 200;
    bgSteppe(c, t, pan, {
      sky: "dusk", sunX: 380, sunY: 560, sunR: 40, extra: (g) => {
        g.save(); g.translate(-pan * 0.3, 0);
        for (let i = 0; i < 7; i++) tent(g, 900 + i * 150, 660 - Math.sin(i) * 8, 0.75 + (i % 2) * 0.15, "#141822");
        for (let i = 0; i < 3; i++) smokeColumn(g, 980 + i * 300, 640, 300, t + i * 3, 0.5);
        g.restore();
      },
    });
    // нивы: золотые колосья на переднем плане
    const ks = popAt(t, Wd("w_sely") - 0.1, springSoft);
    c.save(); c.translate(0, (1 - ks) * 220);
    featherGrass(c, 17, 860, 380, 120, "#c99a4a", t, 0.8, -200, W + 200, 3);
    featherGrass(c, 19, 930, 260, 150, "#6e4c1e", t + 1, 0.9, -200, W + 200, 4);
    c.restore();
    return;
  }
  if (t < L(5) - 0.1) { // мечи взлетают, зарево
    const u = prog(t, Wd("w_mech") - 0.1, L(5)), z = Wd("w_pozh");
    sky(c, "dusk", 700);
    blaze(c, 960, 700, 900 * popAt(t, z - 0.2, springSoft), 260, t, 1);
    c.save(); c.translate(-u * 80, 0); ridge(c, 41, 720, 40, "#0b0e14"); c.restore();
    particles(c, "embers", t, 21, 120 * prog(t, z - 0.3, z + 0.6), 1);
    // мечи из ножен — снизу вверх веером
    for (let i = 0; i < 6; i++) {
      const t0 = Wd("w_mech") - 0.1 + i * 0.07, sp = popAt(t, t0, springPop), x = 360 + i * 240, ang = (i - 2.5) * 0.09;
      c.save(); c.translate(x, 1100 - sp * 420); c.rotate(ang);
      c.fillStyle = linear(c, -10, 0, 10, 0, [[0, "#5c6a74"], [0.5, "#f2f6f8"], [1, "#4a565e"]]);
      c.beginPath(); c.moveTo(-12, 0); c.lineTo(-10, -420); c.lineTo(0, -470); c.lineTo(10, -420); c.lineTo(12, 0); c.closePath(); c.fill();
      c.fillStyle = "#c8902e"; c.fillRect(-46, -6, 92, 18); c.fillStyle = "#1a1410"; c.fillRect(-9, 12, 18, 120);
      const gl = win(t, t0 + 0.25, t0 + 0.65, 0.1, 0.2);
      if (gl > 0) { c.globalCompositeOperation = "lighter"; c.fillStyle = radial(c, 0, -420 + gl * 300, 0, 80, [[0, `rgba(255,240,210,${gl})`], [1, "rgba(255,200,120,0)"]]); circle(c, 0, -420 + gl * 300, 80); c.fill(); }
      c.restore();
    }
    return;
  }
  if (t < L(6) - 0.1) { // Олег крупнее, затем деталь брони
    const wb = Wd("w_bron");
    if (t < wb - 0.25) {
      const u = prog(t, L(5) - 0.1, wb), pan = u * 200;
      bgSteppe(c, t, pan, { sunX: 1500, sunY: 520, rays: 0.18, hz: 700 });
      c.save(); c.translate(-pan * 0.6, 0);
      druzhina(c, t + 0.3, 640, 960, 4, 0.85, 1.1, SUN);
      const P = horsePose(t, "gallop", 1.05, 0.1);
      horse(c, 1020 + u * 120, 960, 1.15, 1, P, "#06080b", SUN);
      rider(c, 1020 + u * 120, 960, 1.15, 1, P, "#06080b", SUN, { banner: true });
      c.restore();
      particles(c, "dust", t, 13, 80, 1, [0, 700, W, 990]);
    } else { // чешуя царьградской брони
      const u = prog(t, wb - 0.25, L(6));
      c.fillStyle = "#1c1208"; c.fillRect(0, 0, W, H);
      c.save(); camera(c, 960, 540, lerp(1.25, 1.05, easeOut(u)), 0, 0, -0.08);
      for (let r = 0; r < 14; r++) for (let q = 0; q < 22; q++) {
        const x = q * 100 + (r % 2) * 50 - 140, y = r * 72 - 30;
        c.fillStyle = linear(c, x, y, x, y + 90, [[0, "#ffe6a8"], [0.35, "#d49a3e"], [1, "#4a2c0c"]]);
        c.beginPath(); c.moveTo(x - 48, y); c.lineTo(x + 48, y); c.quadraticCurveTo(x + 50, y + 80, x, y + 96); c.quadraticCurveTo(x - 50, y + 80, x - 48, y); c.fill();
        c.strokeStyle = "rgba(40,20,5,0.7)"; c.lineWidth = 3; c.stroke();
      }
      c.restore();
      const sw = prog(t, wb - 0.1, wb + 0.9);
      c.save(); c.globalCompositeOperation = "lighter"; c.fillStyle = linear(c, -400 + sw * 2800, 0, -100 + sw * 2800, 300, [[0, "rgba(255,240,200,0)"], [0.5, "rgba(255,240,200,0.6)"], [1, "rgba(255,240,200,0)"]]);
      c.fillRect(0, 0, W, H); c.restore();
      flare(c, 1200 - u * 300, 380, 0.6);
    }
    return;
  }
  // профиль верного коня
  const u = prog(t, L(6) - 0.1, LE(6) + 0.6), P = horsePose(t, "gallop", 1, 0);
  bgSteppe(c, t, u * 300, { sunX: 600, sunY: 560, hz: 760, rays: 0.25 });
  const bob = -Math.abs(Math.sin(P.ph * TAU)) * 18;
  horseHead(c, 1100 + u * 60, 520 + bob, 1.05, 1, { t, rim: SUN, wind: 1.6, nostril: 0.5 + 0.5 * Math.sin(t * 9) });
  particles(c, "dust", t, 14, 70, 1, [0, 600, W, 990]);
}

// ---------- 2. Кудесник выходит из леса ----------
function bgForest(c, t, push = 0, light = 1) {
  sky(c, "forest", 900);
  rays(c, 260, BAR - 40, 10, 1500, 0.10 * light, t, 0.9, Math.PI * 0.32, "200,230,210");
  c.save(); camera(c, 960, 640, 1 + push * 0.15);
  forestRow(c, 31, 720, 520, "#1a3638", 26); c.fillStyle = "#1a3638"; c.fillRect(-900, 700, W + 1800, 900); haze(c, 740, 260, "#3f6e70", 0.3);
  forestRow(c, 32, 780, 640, "#0f2224", 20); c.fillStyle = "#0f2224"; c.fillRect(-900, 755, W + 1800, 900); fog(c, 780, 0.5, t, 12, 1.2, 1);
  c.restore();
  c.save(); camera(c, 960, 640, 1 + push * 0.5);
  forestRow(c, 33, 860, 760, "#081314", 14);
  c.fillStyle = "#050b0c"; c.fillRect(-900, 788, W + 1800, 900);
  c.restore();
}
function scene2(c, t) {
  const a = L(7) - 0.45, kTime = Wd("w_kud1");
  if (t < kTime - 0.3) { // проход сквозь лес
    const u = prog(t, a, kTime);
    bgForest(c, t, u);
    c.save(); camera(c, 960, 540, 1 + u * 0.9); trunks(c, 51, 5, "#020505"); c.restore();
    fog(c, 860, 0.4, t, 25, 1.5, 2);
    return;
  }
  if (t < L(9) - 0.1) { // из тумана идёт старик
    const u = prog(t, kTime - 0.3, L(9) + 0.4);
    bgForest(c, t, 1);
    const s = lerp(0.55, 1.15, easeOut(u)), x = lerp(1180, 1080, u);
    fog(c, 860, 0.8 * (1 - u * 0.5), t, 18, 1.4, 0);
    sorcerer(c, x, 900 + (1 - u) * -40, s, -1, "#06090a", MOONRIM, { t, glow: 0 });
    fog(c, 940, 0.5, t, 30, 1.6, 1);
    return;
  }
  if (t < L(11) - 0.1) { // посох, Перун, руны
    const u = prog(t, L(9) - 0.1, L(11)), gp = Wd("w_perun");
    bgForest(c, t, 1, 0.7);
    lightning(c, 1500, BAR, 520, 13, win(t, gp + 0.05, gp + 0.35, 0.02, 0.2) * 0.7);
    flash(c, win(t, gp + 0.05, gp + 0.4, 0.02, 0.3) * 0.18, "170,200,255");
    c.save(); camera(c, 1000, 600, lerp(1.25, 1.45, u));
    sorcerer(c, 1060, 980, 1.3, -1, "#06090a", MOONRIM, { t, glow: sstep(prog(t, gp - 0.1, gp + 0.4)) });
    // руны по кругу
    const rk = win(t, Wd("w_vest") - 0.2, L(11) + 0.2, 0.3, 0.3);
    if (rk > 0) {
      c.save(); c.globalCompositeOperation = "lighter"; c.translate(1000, 640);
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * TAU + t * 0.6, r = 330, x = Math.cos(ang) * r, y = Math.sin(ang) * r * 0.4;
        c.save(); c.translate(x, y); c.globalAlpha = rk * (0.5 + 0.5 * Math.sin(t * 3 + i)); c.strokeStyle = "rgb(170,215,255)"; c.lineWidth = 4;
        c.beginPath(); c.moveTo(0, -18); c.lineTo(0, 18); if (i % 3 === 0) { c.moveTo(0, -18); c.lineTo(12, -6); } else if (i % 3 === 1) { c.moveTo(-10, -4); c.lineTo(10, 8); } else { c.moveTo(0, 0); c.lineTo(-12, -12); }
        c.stroke(); c.restore();
      }
      c.restore();
    }
    c.restore();
    return;
  }
  if (t < L(12) - 0.1) { // старик крупно: весь век в мольбах
    const u = prog(t, L(11) - 0.1, L(12));
    bgForest(c, t, 1, 0.6);
    fade(c, 0.35);
    sorcererFace(c, 960, 470 + u * 20, lerp(0.95, 1.05, u), { t, glow: 0.15, rim: MOONRIM });
    return;
  }
  // подъезжает Олег
  const u = prog(t, L(12) - 0.1, LE(12) + 0.5), stop = Wd("w_podieh") + 0.6;
  bgForest(c, t, 1, 0.8);
  const hx = lerp(-200, 640, easeOut(prog(t, L(12) - 0.1, stop))), P = horsePose(t, t < stop ? "walk" : "stand", 1.4, 0.2);
  sorcerer(c, 1320, 960, 0.95, -1, "#06090a", MOONRIM, { t, glow: 0.2 });
  horse(c, hx, 970, 0.95, 1, P, "#06090a", "#d8c09a");
  rider(c, hx, 970, 0.95, 1, P, "#06090a", "#d8c09a", { spearAng: 0.15 });
  if (t > stop - 0.2) particles(c, "dust", t - stop, 77, 40, 1 - prog(t, stop, stop + 1.2), [hx - 300, 860, hx + 300, 980]);
  fog(c, 960, 0.35, t, 22, 1.4, 2);
}

// ---------- 3. Олег спрашивает ----------
function scene3(c, t) {
  if (t < L(15) - 0.1) {
    const u = prog(t, L(13) - 0.45, L(15));
    bgForest(c, t, 1, 0.8); fade(c, 0.3);
    olegFace(c, 820, 560 - u * 20, lerp(1.25, 1.35, u), 1, { t, mouth: 0.5 + 0.5 * Math.sin(t * 14), rim: "#d8c09a" });
    return;
  }
  if (t < L(16) - 0.1) { // враги-соседи на горизонте
    const u = prog(t, L(15) - 0.1, L(16));
    bgSteppe(c, t, u * 100, { sky: "storm", sun: false, hz: 680 });
    blaze(c, 960, 690, 700, 160, t, 0.5);
    for (let i = 0; i < 9; i++) warrior(c, 380 + i * 150, 700, 0.5, i % 2 ? 1 : -1, "#040506", "#ff5a3a", { t, arm: 0.5, spear: true });
    c.save(); c.globalCompositeOperation = "lighter";
    for (let i = 0; i < 9; i++) { c.fillStyle = `rgba(255,60,40,${0.7 * win(t, L(15) + i * 0.08, L(16), 0.2, 0.2)})`; circle(c, 380 + i * 150 + 6 * (i % 2 ? 1 : -1), 562, 4); c.fill(); }
    c.restore();
    return;
  }
  if (t < L(17) - 0.1) { // могильная земля
    const u = prog(t, L(16) - 0.1, L(17)), z = Wd("w_zeml");
    bgForest(c, t, 1, 0.5); fade(c, 0.45 + 0.3 * prog(t, z - 0.3, z + 0.5));
    olegFace(c, 860, 560, 1.4, 1, { t, dark: prog(t, z - 0.5, z + 0.3), mouth: 0.3 + 0.3 * Math.sin(t * 14), rim: "#d8c09a" });
    // комья земли сыплются
    const R = mulberry32(99);
    c.fillStyle = "#120d08";
    for (let i = 0; i < 80; i++) { const x = R() * W, d = R() * 0.8, sz = 4 + R() * 12, y = BAR + ((t - L(16) - d) * (500 + R() * 400)); if (y > BAR && y < H - BAR) { ellipse(c, x, y, sz, sz * 0.7, R()); c.fill(); } }
    return;
  }
  // в награду любого коня
  const u = prog(t, L(17) - 0.1, LE(18) + 0.5), kc = Wd("w_konya3");
  if (t < L(18) - 0.15) {
    bgForest(c, t, 1, 0.8); fade(c, 0.25);
    olegFace(c, 860, 560, 1.32, 1, { t, mouth: 0.5 + 0.5 * Math.sin(t * 13), smirk: 0.4, rim: "#d8c09a" });
    return;
  }
  bgSteppe(c, t, u * 120, { sunX: 1600, sunY: 560, rays: 0.2 });
  for (let i = 0; i < 6; i++) {
    const k = popAt(t, kc - 0.3 + i * 0.08, springSoft), P = horsePose(t, "stand", 1, i);
    horse(c, 900 + i * 170, 740 + (1 - k) * 60, 0.55, i % 2 ? 1 : -1, P, "#06080b", SUN, k);
  }
  const P = horsePose(t, "stand", 1, 0.5);
  horse(c, 420, 1000, 1.05, 1, P, "#05070a", SUN);
  rider(c, 420, 1000, 1.05, 1, P, "#05070a", SUN, { spear: false });
  // широкий жест рукой
  const g = sstep(prog(t, L(18) - 0.1, kc));
  c.save(); c.translate(414, 1000); c.scale(1.05, 1.05); c.strokeStyle = "#05070a"; c.lineWidth = 13; c.lineCap = "round";
  c.beginPath(); c.moveTo(4, -272); c.lineTo(4 + lerp(20, 110, g), -272 + lerp(50, -20, g)); c.stroke(); c.restore();
}

// ---------- 4. Пророчество (голос кудесника) ----------
function scene4(c, t) {
  const a = L(19) - 0.5;
  if (t < L(23) - 0.1) {
    const u = prog(t, a, L(23));
    sky(c, "night", 1000); fog(c, 700, 0.35, t, 10, 1.6, 0);
    // за спиной — тень князя уменьшается
    const vk = win(t, Wd("w_vlad") - 0.3, L(21), 0.3, 0.6), vs = lerp(1.6, 0.9, prog(t, Wd("w_vlad") - 0.3, L(21)));
    if (vk > 0) { c.save(); c.globalAlpha = vk * 0.55; warrior(c, 1500, 1200, vs, -1, "#1d2b3a", null, { t }); c.restore(); }
    const g = lerp(0.2, 0.9, u) + 0.1 * Math.sin(t * 3);
    sorcererFace(c, 820, 460, lerp(1.0, 1.12, u), { t, glow: g, rim: MOONRIM, mouth: 0.4 + 0.4 * Math.sin(t * 12) });
    // вещий язык — светлая дымка из уст
    const yk = win(t, Wd("w_yazyk") - 0.3, L(23), 0.3, 0.5);
    if (yk > 0) { c.save(); c.globalCompositeOperation = "lighter"; c.globalAlpha = yk * 0.6; c.drawImage(SPR.smoke, 820 - 60 + Math.sin(t) * 20, 470 + 40 - (t - Wd("w_yazyk")) * 60, 360, 360); c.restore(); }
    return;
  }
  if (t < L(24) - 0.1) { // всё тонет во мгле
    const u = prog(t, L(23) - 0.1, L(24));
    sky(c, "night", 1000);
    sorcererFace(c, 820, 460, 1.12 + u * 0.05, { t, glow: 0.9, rim: MOONRIM });
    for (let k = 0; k < 4; k++) fog(c, 300 + k * 180, 0.4 + u * 0.5, t + k, 40 + k * 15, 1.8 + k * 0.2, k);
    return;
  }
  // жребий на светлом челе
  const u = prog(t, L(24) - 0.1, LE(24) + 1.2), z = Wd("w_chele");
  sky(c, "night", 1100); fog(c, 900, 0.5, t, 10, 1.6, 1);
  c.save(); c.globalCompositeOperation = "lighter";
  const bk = sstep(prog(t, z - 0.8, z));
  c.fillStyle = linear(c, 1200, BAR, 900, 400, [[0, `rgba(220,235,255,${0.5 * bk})`], [1, "rgba(220,235,255,0)"]]);
  c.beginPath(); c.moveTo(1300, BAR); c.lineTo(1480, BAR); c.lineTo(1010, 470); c.lineTo(900, 420); c.closePath(); c.fill(); c.restore();
  olegFace(c, 820, 600, 1.35 + u * 0.08, 1, { t, rim: MOONRIM });
  perunSign(c, 900, 330 + u * -10, 34, `rgba(235,245,255,${sstep(prog(t, z - 0.1, z + 0.5))})`);
}

// ---------- 5. Видение славы ----------
function scene5(c, t) {
  if (t < L(26) - 0.1) {
    const u = prog(t, L(25) - 0.45, L(26));
    sky(c, "night", 1000);
    sorcererFace(c, 900, 460, 1.15 + u * 0.1, { t, glow: 1, rim: MOONRIM, mouth: 0.4 + 0.4 * Math.sin(t * 12) });
    flash(c, sstep(prog(t, L(26) - 0.4, L(26) - 0.1)) * 0.9, "255,230,180");
    return;
  }
  const gold = (g) => { sky(g, "gold", 760); sunDisc(g, 960, 700, 60, "#fff1c8", "rgba(255,200,110,0.7)"); rays(g, 960, 700, 14, 1600, 0.16, t, 3.2, -Math.PI / 2, "255,220,150"); };
  if (t < L(27) - 0.1) { // слава воителю: щиты вверх
    const u = prog(t, L(26) - 0.1, L(27));
    gold(c); ridge(c, 61, 840, 26, "#1a0f06");
    for (let i = 0; i < 9; i++) {
      const x = 240 + i * 180, k = popAt(t, L(26) + i * 0.06, springPop);
      warrior(c, x, 900, 0.62, 1, "#120a04", "#ffd890", { t, arm: lerp(0.3, 2.9, k) });
      shield(c, x + 14 * 0.62, 900 - 236 * 0.62 - lerp(0, 90, k), 30, 0, win(t, Wd("w_slava") + i * 0.04, Wd("w_slava") + 0.7, 0.1, 0.3));
    }
    flash(c, win(t, L(26) - 0.1, L(26) + 0.25, 0.01, 0.25) * 0.8, "255,230,180");
    return;
  }
  if (t < L(28) - 0.1) { // имя на стяге
    const u = prog(t, L(27) - 0.1, L(28));
    gold(c);
    c.save(); camera(c, 960, 520, lerp(1.05, 1.15, u));
    c.fillStyle = "#1a0f06"; c.fillRect(366, 140, 14, 900);
    const fy = (x, base) => base + Math.sin(t * 3 - (x - 380) / 30 * 0.35) * 18 * ((x - 380) / 1200);
    c.save(); c.beginPath(); c.moveTo(380, fy(380, 180));
    for (let x = 380; x <= 1580; x += 10) c.lineTo(x, fy(x, 180));
    for (let x = 1580; x >= 380; x -= 10) c.lineTo(x, fy(x, 560));
    c.closePath(); c.fillStyle = "#a82a1e"; c.fill(); c.clip();
    for (let x = 380; x < 1580; x += 6) { const k = Math.sin(t * 3 - (x - 380) / 30 * 0.35 + 1); c.fillStyle = k > 0 ? `rgba(255,140,100,${(0.18 * k).toFixed(3)})` : `rgba(40,0,0,${(-0.35 * k).toFixed(3)})`; c.fillRect(x, 100, 6.5, 560); }
    c.restore();
    const nk = sstep(prog(t, Wd("w_imya") - 0.2, Wd("w_imya") + 0.4));
    c.save(); c.beginPath(); c.rect(380, 150, 1200 * nk, 460); c.clip();
    metalText(c, "ОЛЕГ", 980, 380, 220, 1, prog(t, Wd("w_imya"), Wd("w_imya") + 1.2), 0.2, "gold"); c.restore();
    c.restore();
    return;
  }
  if (t < L(29) - 0.1) { // щит на вратах Цареграда
    const hit = Wd("w_shchit") + 0.15, u = prog(t, L(28) - 0.1, L(29));
    const [sx, sy] = shake(t, hit, 26, 0.7);
    gold(c);
    c.save(); camera(c, 960, 600, lerp(0.95, 1.08, u), sx, sy);
    ridge(c, 71, 960, 20, "#2a1608");
    gates(c, 960, 960, 1.0, "#3a2414", "#ffd890");
    const fk = prog(t, hit - 0.45, hit), fs = lerp(5, 1, easeIn(fk)), fr = lerp(-3, 0, easeOut(fk));
    if (t > hit - 0.45) shield(c, 960, 640, 96 * fs, fr, win(t, hit, hit + 1.4, 0.02, 0.8));
    c.restore();
    particles(c, "dust", t - hit, 33, t > hit ? 90 : 0, 1 - prog(t, hit, hit + 1.5), [560, 540, 1360, 800]);
    flash(c, win(t, hit, hit + 0.3, 0.01, 0.28) * 0.7, "255,240,210");
    return;
  }
  if (t < L(30) - 0.1) { // волны и суша
    const u = prog(t, L(29) - 0.1, L(30));
    sky(c, "gold", 700); sunDisc(c, 1500, 600, 50);
    ridge(c, 81, 690, 50, "#3a2412", 0.002);
    waves(c, 760, 22, t, "#2a1a10", 3, 1.2);
    for (let i = 0; i < 3; i++) ship(c, 400 + i * 520 + u * 120, 820 + i * 40, 0.55 + i * 0.12, Math.sin(t * 1.5 + i) * 0.05, "#120a04", "#8a2a1c", t);
    waves(c, 900, 30, t + 2, "#1a1008", 2, 1.4);
    return;
  }
  // завидует недруг
  const u = prog(t, L(30) - 0.1, LE(30) + 0.6);
  sky(c, "storm", 800); blaze(c, 960, 800, 900, 200, t, 0.35);
  for (let i = 0; i < 6; i++) {
    const turn = sstep(prog(t, Wd("w_zavid") + i * 0.12, Wd("w_zavid") + 0.6 + i * 0.12));
    c.save(); c.globalAlpha = 1 - turn * 0.8;
    warrior(c, 360 + i * 240 - turn * 60, 1000, 0.95, turn > 0.5 ? -1 : 1, "#050404", "#ff6a3a", { t, arm: 0.2 });
    c.restore();
  }
}

// ---------- 6. Хранитель: море, пращ, стрела, кинжал ----------
function scene6(c, t) {
  if (t < L(33) - 0.1) { // шторм, вал не трогает ладью
    const u = prog(t, L(31) - 0.45, L(33)), wv = Wd("w_val");
    sky(c, "sea", 640); stars(c, 3, 0);
    lightning(c, 600, BAR, 600, 31, win(t, wv - 0.1, wv + 0.2, 0.02, 0.15));
    flash(c, win(t, wv - 0.1, wv + 0.3, 0.02, 0.25) * 0.2, "170,200,255");
    waves(c, 690, 30, t, "#10222c", 2, 1.6);
    ship(c, 960, 800, 0.85, Math.sin(t * 1.8) * 0.12, "#04080b", "#5a1a12", t);
    const vk = Math.sin(Math.PI * prog(t, wv - 0.4, wv + 1.6));
    c.save(); c.translate(0, -vk * 260);
    waves(c, 900, 40 + vk * 30, t + 3, "#0a1a22", 2, 2);
    c.restore();
    particles(c, "rain", t, 41, 160, 0.6);
    return;
  }
  if (t < L(35) - 0.1) { // снаряды отскакивают от брони
    const u = prog(t, L(33) - 0.1, L(35));
    bgSteppe(c, t, u * 60, { sky: "dusk", sunX: 1500, sunY: 560, hz: 720 });
    const P = horsePose(t, "stand", 1, 0.3);
    horse(c, 900, 1000, 1.25, 1, P, "#05070a", SUN); rider(c, 900, 1000, 1.25, 1, P, "#05070a", SUN, { spear: false });
    const hits = [[Wd("w_prashch"), "stone"], [Wd("w_strela"), "arrow"], [Wd("w_kinzhal"), "dagger"]];
    for (const [h, kind] of hits) {
      const T = h + 0.35, fly = prog(t, T - 0.6, T), back = prog(t, T, T + 0.7);
      if (t < T - 0.6 || t > T + 0.7) continue;
      const tx = 890, ty = 640;
      let x, y, ang;
      if (t < T) { x = lerp(1900, tx, fly); y = lerp(380, ty, fly) - Math.sin(fly * Math.PI) * 60; ang = Math.PI + 0.12; }
      else { x = tx + back * 300; y = ty - back * 260 + back * back * 500; ang = -1 + back * 6; }
      if (kind === "stone") { c.fillStyle = "#0c0c0c"; circle(c, x, y, 16); c.fill(); }
      else if (kind === "arrow") arrow(c, x, y, ang, 150);
      else { c.save(); c.translate(x, y); c.rotate(ang); c.fillStyle = "#d8dee2"; c.beginPath(); c.moveTo(-60, -7); c.lineTo(40, 0); c.lineTo(-60, 7); c.fill(); c.fillStyle = "#3a2410"; c.fillRect(-100, -9, 40, 18); c.restore(); }
      const sp = win(t, T, T + 0.35, 0.01, 0.3);
      if (sp > 0) { c.save(); c.globalCompositeOperation = "lighter"; c.fillStyle = radial(c, tx, ty, 0, 160, [[0, `rgba(255,240,200,${sp})`], [1, "rgba(255,180,80,0)"]]); circle(c, tx, ty, 160); c.fill(); c.restore(); }
    }
    return;
  }
  // незримый хранитель — светящийся купол
  const u = prog(t, L(35) - 0.1, LE(36) + 0.6), hk = sstep(prog(t, Wd("w_khran") - 0.2, Wd("w_khran") + 0.6));
  bgSteppe(c, t, 80 + u * 60, { sky: "dusk", sunX: 1500, sunY: 560, hz: 720 });
  c.save(); camera(c, 900, 760, lerp(1.0, 1.12, u));
  const P = horsePose(t, "stand", 1, 0.3);
  horse(c, 900, 1000, 1.25, 1, P, "#05070a", SUN); rider(c, 900, 1000, 1.25, 1, P, "#05070a", SUN, { spear: false });
  if (hk > 0) {
    c.save(); c.globalCompositeOperation = "lighter";
    c.fillStyle = radial(c, 880, 760, 200, 520, [[0, "rgba(160,210,255,0)"], [0.85, `rgba(170,215,255,${0.28 * hk})`], [1, "rgba(170,215,255,0)"]]);
    ellipse(c, 880, 760, 520, 470); c.fill();
    c.strokeStyle = `rgba(200,230,255,${0.4 * hk})`; c.lineWidth = 3; ellipse(c, 880, 760, 500 + Math.sin(t * 3) * 6, 450); c.stroke();
    c.restore();
  }
  c.restore();
}
