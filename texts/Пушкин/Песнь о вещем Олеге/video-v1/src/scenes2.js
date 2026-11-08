// ---------- Сцены 7–12: конь в бою, приговор, прощание, луг, пир, вопрос о коне ----------
function scene7(c, t) {
  if (t < L(39) - 0.1) { // гордый конь
    const u = prog(t, L(37) - 0.45, L(39));
    bgSteppe(c, t, u * 80, { sky: "dusk", sunX: 500, sunY: 600, hz: 820, rays: 0.2 });
    horseHead(c, 1060, 540, lerp(0.95, 1.05, u), 1, { t, rim: SUN, wind: 0.8, nostril: 0.3 + 0.3 * Math.sin(t * 3) });
    return;
  }
  if (t < L(40) - 0.1) { // смирно стоит под стрелами
    const u = prog(t, L(39) - 0.1, L(40));
    bgSteppe(c, t, 40, { sky: "storm", sun: false, hz: 700 });
    blaze(c, 1400, 720, 600, 140, t, 0.5);
    const P = horsePose(t, "stand", 1, 0.7);
    horse(c, 960, 960, 1.15, 1, P, "#05070a", "#ff9a5a");
    const R = mulberry32(7);
    for (let i = 0; i < 26; i++) {
      const t0 = L(39) - 0.3 + R() * 1.6, x = 300 + R() * 1350, y = 900 + R() * 70, fl = prog(t, t0, t0 + 0.35);
      if (t < t0) continue;
      if (Math.abs(x - 960) < 260 && R() < 2) continue;
      arrow(c, lerp(x - 260, x, fl), lerp(y - 520, y, fl), 1.1, 110);
    }
    return;
  }
  if (t < L(41) - 0.1) { // мчится по бранному полю
    const u = prog(t, L(40) - 0.1, L(41)), pan = u * 900;
    bgSteppe(c, t, pan, { sky: "storm", sun: false, hz: 700 });
    for (let i = 0; i < 4; i++) smokeColumn(c, 300 + i * 500 - pan * 0.5, 760, 400, t + i, 0.6);
    const P = horsePose(t, "gallop", 1.3, 0);
    horse(c, 900, 990, 1.1, 1, P, "#05070a", "#ff9a5a"); rider(c, 900, 990, 1.1, 1, P, "#05070a", "#ff9a5a", { banner: true });
    particles(c, "ash", t, 61, 120, 0.8);
    featherGrass(c, 71, 990, 140, 80, "#050608", t * 3, 2.2, -200 - pan, W + 200 - pan);
    return;
  }
  if (t < L(42) - 0.3) { // холод и сеча
    const u = prog(t, L(41) - 0.1, L(42)), sc = Wd("w_secha");
    bgSteppe(c, t, 200 + u * 300, { sky: "night", sun: false, hz: 720 });
    particles(c, "snow", t, 81, 240, 1);
    const P = horsePose(t, "gallop", 1.2, 0.4);
    horse(c, 980, 990, 1.1, 1, P, "#05070a", "#bcd6ff"); rider(c, 980, 990, 1.1, 1, P, "#05070a", "#bcd6ff", { spear: false });
    const ck = win(t, sc - 0.05, sc + 0.4, 0.02, 0.3);
    if (ck > 0) { c.save(); c.globalCompositeOperation = "lighter"; c.fillStyle = radial(c, 1240, 560, 0, 240, [[0, `rgba(255,255,240,${ck})`], [1, "rgba(200,220,255,0)"]]); circle(c, 1240, 560, 240); c.fill(); c.restore();
      c.strokeStyle = `rgba(230,240,250,${ck})`; c.lineWidth = 10; seg(c, 1080, 400, 1400, 720, 10); seg(c, 1400, 400, 1080, 720, 10); }
    return;
  }
  // «Но примешь ты смерть…» — чёрный кадр, глаз коня из темноты
  const u = prog(t, L(42) - 0.3, LE(42) + 1.2);
  c.fillStyle = "#000"; c.fillRect(0, 0, W, H);
  c.save(); c.globalAlpha = 0.55 * sstep(prog(t, L(42) + 0.6, LE(42) + 0.6));
  horseHead(c, 1150, 560, 1.6, -1, { t, rim: "#7a2a1a", eye: 1, wind: 0.3 });
  c.restore();
}

// ---------- 8. Усмешка, спешивается, гладит коня ----------
function scene8(c, t) {
  if (t < L(45) - 0.1) {
    const u = prog(t, L(43) - 0.45, L(45)), od = Wd("w_odnako");
    bgSteppe(c, t, 0, { sky: "dusk", sunX: 1500, sunY: 600, hz: 860 });
    const dk = sstep(prog(t, od - 0.2, od + 0.8));
    fade(c, 0.2 + dk * 0.35);
    olegFace(c, 820, 590, 1.35 + u * 0.05, 1, { t, smirk: sstep(prog(t, Wd("w_usm") - 0.3, Wd("w_usm") + 0.2)) * (1 - dk), dark: dk, rim: SUN });
    // тень наползает на лицо
    c.save(); c.globalAlpha = 0.6 * dk; c.fillStyle = linear(c, 0, BAR, 0, 700, [[0, "#000"], [1, "rgba(0,0,0,0)"]]); c.fillRect(0, 0, W, 800 * dk); c.restore();
    return;
  }
  if (t < L(47) - 0.1) { // спешивается
    const u = prog(t, L(45) - 0.1, L(47)), sl = Wd("w_slez");
    bgSteppe(c, t, u * 40, { sky: "dusk", sunX: 1500, sunY: 600, hz: 720 });
    const P = horsePose(t, "stand", 1, 0.2);
    horse(c, 900, 990, 1.2, 1, P, "#05070a", SUN);
    if (t < sl) rider(c, 900, 990, 1.2, 1, P, "#05070a", SUN, { spear: false });
    else {
      const d = sstep(prog(t, sl, sl + 0.8));
      warrior(c, lerp(880, 700, d), lerp(780, 990, d), 1.15, 1, "#05070a", SUN, { t, arm: lerp(1.2, 0.9, d), wind: 0.3 });
    }
    return;
  }
  // ладонь гладит шею коня
  const u = prog(t, L(47) - 0.1, LE(48) + 0.5);
  bgSteppe(c, t, 0, { sky: "dusk", sunX: 400, sunY: 560, hz: 900, rays: 0.25 });
  horseHead(c, 1080, 560, 1.0, -1, { t, rim: SUN, wind: 0.5, tilt: Math.sin(t * 1.3) * 0.03 });
  const hx = 900 + Math.sin(t * 2.2) * 120, hy = 700 + Math.cos(t * 2.2) * 30;
  // рука в кольчужном рукаве, ладонь на шее
  c.save(); c.fillStyle = "#06070a"; c.strokeStyle = "#06070a"; c.lineCap = "round"; c.lineJoin = "round";
  c.lineWidth = 58; c.beginPath(); c.moveTo(120, 1150); c.quadraticCurveTo(420, 900, hx - 90, hy + 20); c.stroke();
  c.lineWidth = 6; c.strokeStyle = "rgba(255,180,100,0.5)"; c.beginPath(); c.moveTo(150, 1110); c.quadraticCurveTo(430, 860, hx - 96, hy - 6); c.stroke();
  c.fillStyle = "#4a2a14"; c.save(); c.translate(hx - 100, hy + 20); c.rotate(-0.5); c.fillRect(-26, -38, 44, 76); c.restore(); // наруч
  c.fillStyle = "#0a0806"; ellipse(c, hx - 30, hy + 4, 62, 36, -0.35); c.fill();
  c.strokeStyle = "#0a0806"; for (let i = 0; i < 4; i++) { c.lineWidth = 17 - i; c.beginPath(); c.moveTo(hx + 10, hy - 18 + i * 13); c.quadraticCurveTo(hx + 50, hy - 30 + i * 15, hx + 82 - i * 6, hy - 22 + i * 18); c.stroke(); }
  c.lineWidth = 16; c.beginPath(); c.moveTo(hx - 40, hy - 26); c.quadraticCurveTo(hx - 10, hy - 52, hx + 26, hy - 50); c.stroke(); // большой палец
  c.restore();
}

// ---------- 9. Прощание ----------
function scene9(c, t) {
  if (t < L(51) - 0.1) {
    const u = prog(t, L(49) - 0.45, L(51));
    bgSteppe(c, t, 0, { sky: "sunset", sunX: 960, sunY: 640, sunR: 70, hz: 900, rays: 0.3 });
    c.save(); camera(c, 960, 560, lerp(1.0, 1.1, u));
    olegFace(c, 600, 600, 1.15, 1, { t, rim: SUN, mouth: 0.3 + 0.3 * Math.sin(t * 13) });
    horseHead(c, 1350, 560, 0.85, -1, { t, rim: SUN, wind: 0.4, tilt: -0.1 + Math.sin(t) * 0.02 });
    c.restore();
    return;
  }
  if (t < L(53) - 0.1) { // пустое золотое стремя
    const u = prog(t, L(51) - 0.1, L(53)), sw = Math.sin((t - L(51)) * 2.2) * 0.25 * (1 - u * 0.5);
    bgSteppe(c, t, 0, { sky: "sunset", sunX: 1300, sunY: 560, hz: 980 });
    // бок коня во весь верх кадра, кромка света по брюху, край попоны
    c.fillStyle = "#06070a"; ellipse(c, 900, -380, 1500, 560); c.fill();
    c.strokeStyle = "rgba(255,180,100,0.55)"; c.lineWidth = 5; c.beginPath(); c.ellipse(900, -380, 1500, 560, 0, 0.15, Math.PI - 0.15); c.stroke();
    c.fillStyle = "#7a1a12"; c.beginPath(); c.moveTo(700, 80); c.lineTo(1220, 80); c.lineTo(1200, 170); c.lineTo(720, 175); c.closePath(); c.fill();
    c.fillStyle = "#d8a24a"; c.fillRect(720, 165, 480, 10);
    c.save(); c.translate(960, 150); c.rotate(sw);
    c.fillStyle = "#1a120a"; c.fillRect(-14, 0, 28, 380);
    c.translate(0, 380); c.lineWidth = 24; c.strokeStyle = linear(c, -90, 0, 90, 0, [[0, "#6a4410"], [0.5, "#ffe2a0"], [1, "#6a4410"]]);
    c.beginPath(); c.moveTo(-80, 200); c.quadraticCurveTo(-110, 20, 0, 0); c.quadraticCurveTo(110, 20, 80, 200); c.closePath(); c.stroke();
    c.fillStyle = "#e0a848"; c.fillRect(-90, 190, 180, 26);
    const gl = win(t, Wd("w_strem") - 0.1, Wd("w_strem") + 0.6, 0.1, 0.3);
    if (gl > 0) { c.globalCompositeOperation = "lighter"; c.fillStyle = radial(c, 50, 60, 0, 140, [[0, `rgba(255,245,210,${gl})`], [1, "rgba(255,200,120,0)"]]); circle(c, 50, 60, 140); c.fill(); }
    c.restore();
    return;
  }
  if (t < L(54) - 0.1) { // «помни меня» — конь вскидывает голову
    const u = prog(t, L(53) - 0.1, L(54)), up = sstep(prog(t, Wd("w_pomni") - 0.2, Wd("w_pomni") + 0.5));
    bgSteppe(c, t, 0, { sky: "sunset", sunX: 700, sunY: 600, hz: 900, rays: 0.3 });
    horseHead(c, 1000, 600 - up * 40, 1.0, 1, { t, rim: SUN, tilt: -up * 0.35, nostril: up, wind: 1 });
    return;
  }
  // отроки бегут
  const u = prog(t, L(54) - 0.1, LE(54) + 1.2);
  bgSteppe(c, t, 0, { sky: "sunset", sunX: 1500, sunY: 600, hz: 760 });
  const P = horsePose(t, "stand", 1, 0.1);
  horse(c, 760, 990, 1.0, 1, P, "#05070a", SUN);
  warrior(c, 560, 990, 1.0, 1, "#05070a", SUN, { t, arm: 0.9 });
  for (let i = 0; i < 2; i++) {
    const x = lerp(1900 + i * 160, 1150 + i * 150, easeOut(prog(t, L(54) - 0.1, L(54) + 1.1))), run = Math.sin(t * 14 + i) * 8;
    warrior(c, x, 990 - Math.abs(run), 0.78, -1, "#05070a", SUN, { t, arm: 0.6 + run * 0.05, wind: 0.8 });
  }
}

// ---------- 10. Попона, луг, вода, зерно, уход ----------
function scene10(c, t) {
  if (t < L(56) - 0.1) { // попона ложится на спину
    const u = prog(t, L(55) - 0.45, L(56)), d = popAt(t, Wd("w_popon") - 0.3, springSoft);
    bgSteppe(c, t, 0, { sky: "sunset", sunX: 1500, sunY: 600, hz: 760 });
    const P = horsePose(t, "stand", 1, 0.1);
    horse(c, 940, 990, 1.25, 1, P, "#05070a", SUN);
    c.save(); c.translate(930, lerp(300, 790, d)); c.scale(1.25, 1.25);
    c.fillStyle = "#8a1c14"; c.beginPath(); c.moveTo(-120, -10); c.quadraticCurveTo(0, -40, 120, -10); c.lineTo(110, 70 + Math.sin(t * 3) * 4); c.quadraticCurveTo(0, 90, -110, 70); c.closePath(); c.fill();
    c.strokeStyle = "#e0a848"; c.lineWidth = 6; c.stroke(); c.restore();
    return;
  }
  if (t < L(57) - 0.1) { // ведут на луг
    const u = prog(t, L(56) - 0.1, L(57)), x = lerp(500, 1200, u);
    bgSteppe(c, t, u * 200, { sky: "sunset", sunX: 1500, sunY: 600, hz: 760 });
    featherGrass(c, 91, 960, 320, 70, "#3a4a1c", t, 0.6);
    const P = horsePose(t, "walk", 1.2, 0);
    horse(c, x, 980, 1.0, 1, P, "#05070a", SUN);
    warrior(c, x + 250, 980 + Math.sin(t * 7) * 4, 0.85, 1, "#05070a", SUN, { t, arm: 2.0 });
    c.strokeStyle = "#05070a"; c.lineWidth = 4; c.beginPath(); c.moveTo(x + 210, 760); c.lineTo(x + 330, 780); c.stroke();
    return;
  }
  if (t < L(58) - 0.1) { // купайте; кормите
    const kr = Wd("w_korm");
    if (t < kr - 0.15) { // река, брызги
      sky(c, "sunset", 640); sunDisc(c, 1300, 600, 50);
      waves(c, 700, 10, t, "#2a3a44", 2, 0.8);
      const P = horsePose(t, "stand", 1, 0.3);
      c.save(); c.beginPath(); c.rect(0, 0, W, 860); c.clip(); horse(c, 960, 1020, 1.1, 1, P, "#05070a", SUN); c.restore();
      waves(c, 860, 12, t + 1, "#1a262c", 2, 1);
      const R = mulberry32(3); c.fillStyle = "rgba(220,235,245,0.8)";
      for (let i = 0; i < 60; i++) { const ph = (t * 1.2 + R()) % 1, x = 760 + R() * 400, y = 860 - Math.sin(ph * Math.PI) * (80 + R() * 160); circle(c, x + ph * (R() - 0.5) * 200, y, 3 + R() * 4); c.fill(); }
    } else { // зерно сыплется
      sky(c, "dusk", 1000); fade(c, 0.4);
      c.fillStyle = "#2a1a0c"; c.beginPath(); c.moveTo(560, 760); c.lineTo(1360, 760); c.lineTo(1300, 920); c.lineTo(620, 920); c.closePath(); c.fill();
      const R = mulberry32(5); c.fillStyle = "#f0c060";
      for (let i = 0; i < 220; i++) { const ph = ((t - kr) * 1.4 + R()) % 1, x = 960 + (R() - 0.5) * 260 + (R() - 0.5) * ph * 200, y = BAR + ph * 680; if (y < 780) { ellipse(c, x, y, 4, 2.5, R() * 3); c.fill(); } }
      c.fillStyle = linear(c, 0, 700, 0, 780, [[0, "#ffd890"], [1, "#a06a20"]]); c.beginPath(); c.moveTo(620, 780); c.quadraticCurveTo(960, 640 - prog(t, kr, kr + 2) * 60, 1300, 780); c.closePath(); c.fill();
    }
    return;
  }
  if (t < L(59) - 0.1) { // ключевая вода
    const u = prog(t, L(58) - 0.1, L(59));
    sky(c, "forest", 1000); rays(c, 1400, BAR, 8, 1300, 0.14, t, 1, Math.PI * 0.6, "220,240,230");
    c.fillStyle = "#0a1214"; c.beginPath(); c.moveTo(0, 400); c.quadraticCurveTo(500, 300, 820, 420); c.lineTo(860, 600); c.lineTo(0, 700); c.fill();
    c.strokeStyle = "rgba(200,230,240,0.85)"; c.lineCap = "round";
    for (let i = 0; i < 6; i++) { c.lineWidth = 6 - i * 0.6; c.beginPath(); c.moveTo(820 + i * 4, 460); c.quadraticCurveTo(900 + i * 6, 470 + Math.sin(t * 9 + i) * 5, 930 + i * 5, 760); c.stroke(); }
    c.fillStyle = "#1a120a"; c.beginPath(); c.moveTo(820, 760); c.lineTo(1100, 760); c.lineTo(1070, 860); c.lineTo(850, 860); c.closePath(); c.fill();
    horseHead(c, 1360, 560, 0.75, -1, { t, rim: "#cfe6d8", tilt: 0.5 + Math.sin(t * 2) * 0.03, wind: 0.2 });
    return;
  }
  if (t < L(60) - 0.1) { // уходит в закат
    const u = prog(t, L(59) - 0.1, L(60));
    bgSteppe(c, t, 0, { sky: "sunset", sunX: 1200, sunY: 660, sunR: 70, hz: 720, rays: 0.3 });
    const P = horsePose(t, "walk", 1, 0), s = lerp(0.8, 0.45, u), x = lerp(820, 1120, u);
    horse(c, x, lerp(980, 820, u), s, 1, P, "#05070a", SUN);
    warrior(c, x + 200 * s, lerp(980, 820, u) + Math.sin(t * 6) * 3, s * 0.85, 1, "#05070a", SUN, { t, arm: 2.0 });
    warrior(c, x - 160 * s, lerp(980, 820, u) + Math.sin(t * 6 + 1) * 3, s * 0.85, 1, "#05070a", SUN, { t, arm: 0.4 });
    return;
  }
  // другого коня подвели
  const u = prog(t, L(60) - 0.1, LE(60) + 1.4), ent = easeOut(prog(t, L(60) - 0.1, Wd("w_drug") + 0.8));
  bgSteppe(c, t, 0, { sky: "dusk", sunX: 1500, sunY: 640, hz: 760 });
  const P = horsePose(t, ent < 1 ? "walk" : "stand", 1.2, 0.5);
  horse(c, lerp(2200, 1300, ent), 990, 1.0, -1, P, "#2a2c30", "#ffd0a0");
  warrior(c, 640, 990, 1.1, -1, "#05070a", SUN, { t, arm: 0.2 });
}

// ---------- 11. Пир: годы спустя ----------
function hall(c, t, light = 1) {
  c.fillStyle = "#0a0604"; c.fillRect(0, 0, W, H);
  // бревенчатая стена
  for (let i = 0; i < 12; i++) { const y = BAR + i * 56; c.fillStyle = linear(c, 0, y, 0, y + 56, [[0, "#140b05"], [0.35, "#1e1209"], [1, "#160d06"]]); c.fillRect(0, y, W, 57); }
  flames(c, 960, 760, 220, 260, t, light);
  c.save(); c.globalCompositeOperation = "lighter"; c.fillStyle = radial(c, 960, 640, 0, 1100, [[0, `rgba(255,140,60,${0.35 * light})`], [1, "rgba(255,90,30,0)"]]); c.fillRect(0, 0, W, H); c.restore();
  particles(c, "embers", t, 5, 50, light, [600, BAR, 1320, 800]);
}
function feasters(c, t, raise = 0, white = 0) {
  for (let i = 0; i < 8; i++) {
    const side = i < 4 ? -1 : 1, x = side < 0 ? 140 + i * 150 : 1180 + (i - 4) * 150, y = 1010, s = 0.95;
    warrior(c, x, y, s, side < 0 ? 1 : -1, "#040302", "#ff9a4a", { t, arm: lerp(0.4, 2.6, raise * (0.8 + 0.2 * Math.sin(i))), wind: 0.1 });
    if (white > 0) { c.fillStyle = `rgba(235,235,230,${white})`; ellipse(c, x + 6 * (side < 0 ? 1 : -1), y - 276 * s + 10, 26 * s, 20 * s); c.fill(); }
    if (raise > 0.3) ladle(c, x + (side < 0 ? 1 : -1) * Math.sin(lerp(0.4, 2.6, raise)) * 90 * s + 16 * s, y - 236 * s + Math.cos(lerp(0.4, 2.6, raise)) * 90 * s - 10, 0.5, 0);
  }
  c.fillStyle = "#120a04"; c.fillRect(0, 960, W, 140); // стол
}
function scene11(c, t) {
  if (t < L(63) - 0.1) {
    const u = prog(t, L(61) - 0.45, L(63)), zv = Wd("w_zvon");
    hall(c, t);
    c.save(); camera(c, 960, 700, lerp(1.0, 1.08, u));
    feasters(c, t, sstep(prog(t, zv - 0.6, zv)));
    c.restore();
    const gk = win(t, zv, zv + 0.4, 0.02, 0.3);
    if (gk > 0) { c.save(); c.globalCompositeOperation = "lighter"; for (const x of [480, 1440]) { c.fillStyle = radial(c, x, 540, 0, 90, [[0, `rgba(255,240,200,${gk})`], [1, "rgba(255,200,120,0)"]]); circle(c, x, 540, 90); c.fill(); } c.restore(); }
    return;
  }
  if (t < L(64) - 0.1) { // седые головы
    const u = prog(t, L(63) - 0.1, L(64));
    hall(c, t, 0.8);
    c.save(); camera(c, lerp(500, 1400, u), 700, 1.6);
    feasters(c, t, 0.2, sstep(prog(t, Wd("w_kudri") - 0.2, Wd("w_kudri") + 0.4)));
    c.restore();
    return;
  }
  if (t < L(65) - 0.1) { // курган в снегу на рассвете
    const u = prog(t, L(64) - 0.1, L(65));
    sky(c, "dawn", 760); sunDisc(c, 1400, 680, 50, "#fff4e0", "rgba(255,210,170,0.5)");
    c.fillStyle = "#c8d0d8"; c.beginPath(); c.moveTo(-100, 800); c.quadraticCurveTo(960, 300 - u * 20, 2020, 800); c.lineTo(2020, H); c.lineTo(-100, H); c.fill();
    c.fillStyle = "rgba(255,255,255,0.6)"; c.beginPath(); c.moveTo(500, 600); c.quadraticCurveTo(960, 420, 1420, 600); c.quadraticCurveTo(960, 520, 500, 600); c.fill();
    particles(c, "snow", t, 9, 160, 0.9);
    fade(c, 1 - sstep(prog(t, L(64) - 0.1, L(64) + 0.5)));
    return;
  }
  // в пламени — минувшие битвы
  const u = prog(t, L(65) - 0.1, LE(66) + 0.6);
  c.fillStyle = "#0a0402"; c.fillRect(0, 0, W, H);
  flames(c, 960, 1000, 900, 900, t, 1);
  ghost(c, (g) => { for (let i = 0; i < 5; i++) { const P = horsePose(t, "gallop", 1, i * 0.3), x = ((i * 420 + (t - L(65)) * 240) % 2400) - 200; horse(g, x, 760, 0.6, 1, P, "#3a1004", null); rider(g, x, 760, 0.6, 1, P, "#3a1004", null, { banner: i % 2 === 0 }); } }, 0.7, "multiply");
  particles(c, "embers", t, 15, 100, 1);
}

// ---------- 12. «А где мой товарищ?» ----------
function scene12(c, t) {
  if (t < L(71) - 0.1) {
    const u = prog(t, L(67) - 0.45, L(71)), bu = Wd("w_burn");
    const fb = win(t, bu - 0.4, L(71) - 0.2, 0.15, 0.25);
    hall(c, t);
    c.save(); camera(c, 960, 700, 1.25 + u * 0.1);
    warrior(c, 900, 1060, 1.1, Math.sin(t * 0.8) > 0 ? 1 : -1, "#040302", "#ffaa5a", { t, arm: 1.0 + Math.sin(t * 2) * 0.4 });
    c.fillStyle = "#120a04"; c.fillRect(0, 960, W, 140);
    c.restore();
    if (fb > 0) { // вспышка-воспоминание: конь скачет
      c.save(); c.globalAlpha = fb; sky(c, "gold", 800); const P = horsePose(t, "gallop", 1.2, 0); horse(c, 960, 960, 1.1, 1, P, "#2a1608", "#fff0c0"); fade(c, 0); c.restore();
      flash(c, fb * 0.25, "255,230,180");
    }
    return;
  }
  // холм под луной
  const u = prog(t, L(71) - 0.1, LE(72) + 0.8), pc = Wd("w_pochil");
  sky(c, "night", 760); stars(c, 12, 140, 1); moonDisc(c, 1340, 300, 56);
  c.save(); camera(c, 960, 700, lerp(1.0, 1.15, u));
  c.fillStyle = "#070c12"; c.beginPath(); c.moveTo(-200, 900); c.quadraticCurveTo(700, 420, 1300, 640); c.quadraticCurveTo(1700, 760, 2200, 900); c.lineTo(2200, H + 200); c.lineTo(-200, H + 200); c.fill();
  featherGrass(c, 33, 700, 260, 60, "#0e1820", t, 1.2, 300, 1500);
  c.restore();
  fade(c, 0.5 * sstep(prog(t, pc, pc + 1.0)));
}
