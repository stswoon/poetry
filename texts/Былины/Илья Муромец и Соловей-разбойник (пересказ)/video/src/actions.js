// Сцены: каждое действие привязано к строке текста. a(n) — секунд от начала строки n.
const SC = {
  title(c, t) {
    const u = t / V0;
    skyBands(c, ["#141240", "#241c5c", "#4c2a78", "#8a3c7c", "#d05c6c", "#f09458"], 170);
    rect(c, 0, 170, LW, 110, "#f09458");
    disc(c, 240, 170 - u * 26, 50, "#ffcc78"); disc(c, 240, 170 - u * 26, 42, "#fff0b8");
    forestLayer(c, 176, 34, 20, 7, "#2a1c48", 30 + t * 2);
    hillsLayer(c, 206, 8, 130, 4, "#1a1834", 10 + t * 4);
    rect(c, 0, 214, LW, 60, "#141228");
    groundLayer(c, 226, t * 90, ["#1c2a2c", "#2c423c", "#18222a"], "#121c1e");
    rider(c, 196, 158, t, { speed: 12, spear: true });
    const d = springPop(t - 0.5), y1 = lerp(-70, 22, d);
    const A = "ИЛЬЯ МУРОМЕЦ", B = "И СОЛОВЕЙ-РАЗБОЙНИК";
    const wa = textWidth(A, true) * 3, wb = textWidth(B, true) * 2;
    drawText(c, A, R((LW - wa) / 2) + 2, R(y1) + 2, "#2a0e0e", { scale: 3, bold: true });
    drawText(c, A, R((LW - wa) / 2), R(y1), "#ffd860", { scale: 3, bold: true, shadow: "#a84a14" });
    drawText(c, B, R((LW - wb) / 2), R(lerp(290, 54, springPop(t - 1.1))), "#fff6d8", { scale: 2, bold: true, shadow: "#3a1450" });
    if (t > 3.2 && Math.floor(t * 2.5) % 2 === 0) { const s = "▶ В ПУТЬ"; drawText(c, s, R((LW - textWidth(s, true)) / 2), 246, "#fff6d8", { bold: true, shadow: "#120c14" }); }
  },

  // 1–3: с горы на гору
  ride(c, t, a) {
    const v = a(1), scroll = 100 + v * 230;
    landscape(c, t, PAL.day, scroll * 0.6, { noGround: true, sun: [420, 40, 14] });
    const gy = (x) => 168 - (Math.sin((x + scroll) / 74) * 16 + Math.sin((x + scroll) / 31) * 4);
    for (let x = 0; x < LW; x++) { const y = R(gy(x)); rect(c, x, y, 1, 2, "#8ec04e"); rect(c, x, y + 2, 1, LH - y, "#5a9238"); }
    if (a(3) > 0) for (let i = 0; i < 5; i++) {
      const x = ((i * 240 - scroll) % (LW + 160) + LW + 160) % (LW + 160) - 80;
      for (let k = 0; k < 40; k++) rect(c, x + k, gy(x + k) - 1, 1, 4, k % 6 ? "#3c84d8" : "#b0d4f0");
    }
    const hx = 160, jump = Math.abs(Math.sin(v * 3.1)) * 40;
    rider(c, hx, gy(hx + 40) - 66 - jump, t, { speed: 17 });
    for (let i = 0; i < 6; i++) rect(c, hx + 10 - ((t * 200 + i * 40) % 120), gy(hx) - 2 - hash(i) * 10 - jump * 0.2, 4, 2, "#d8ecb0");
    label(c, "ДОРОГА НА КИЕВ");
  },

  // 4–12: болото. Конь тонет, Илья спрыгивает, держит коня, вырывает дубы, кладёт настил
  bog(c, t, a) {
    const P = 1.4, MAXP = 7, u = a(9);
    const stage = u > 0 ? Math.min(MAXP, Math.floor(u / P)) : 0;
    const ph = u > 0 && stage < MAXP ? (u % P) / P : 0;
    const ix0 = 176, ix = ix0 + (stage + (ph > 0.7 ? smooth((ph - 0.7) / 0.3) : 0)) * 30;
    const cam = Math.max(0, ix - 300);
    landscape(c, t, PAL.swamp, 40 + cam, { noGround: true });
    forestLayer(c, 160, 34, 22, 9, PAL.swamp.near, 60 + cam);
    bogLayer(c, t, 160);
    c.save(); c.translate(-R(cam), 0);
    for (let i = 0; i < stage; i++) plank(c, 182 + i * 30, 172 + (i % 2));
    // конь: тонет до настила, потом идёт за Ильёй
    const sink = a(5) > 0 ? clamp(a(5) / 2.5) * (stage > 0 ? 1 - clamp((stage - 1 + ph) / 1) : 1) : 0;
    const hx = Math.max(92, ix - 96), hy = 112 + sink * 14;
    const dismount = a(7);
    const moving = stage > 0 && ph > 0.7;
    rider(c, hx, hy, t, { speed: a(4) < 0 ? 10 : moving ? 8 : 0, noRider: dismount > 0.1 });
    // вода закрывает ноги
    c.save(); c.beginPath(); c.rect(cam + 0, 176, LW, 24); c.clip();
    if (sink > 0.05) { c.fillStyle = "#2c4436"; c.fillRect(R(hx), 176, 84, 24); for (let i = 0; i < 6; i++) { const p = (t * 1.3 + i / 6) % 1; ell(c, hx + 16 + i * 10, 182 - p * 6, 3 + p * 2, 1, "#6a8a50"); } }
    c.restore();
    if (dismount > 0) {
      const f = clamp(dismount / 0.8);
      if (f < 1) {
        // соскок с седла дугой
        const fx = lerp(hx + 26, ix - 6, f), fy = lerp(hy + 10, 134, f) - sinPi(f) * 26;
        blitRot(c, ilyaFoot(0, {}), fx + 17, fy + 22, (1 - f) * 0.4);
      } else {
        let hand;
        if (u <= 0) hand = [-6, 14]; // левой держит коня
        else if (ph < 0.35) hand = [34, 16 + R(Math.sin(t * 30) * 2)];
        else if (ph < 0.7) hand = [34, 4];
        else hand = [28, 20];
        ilya(c, ix, 134, t, { hand, walk: moving });
        if (u <= 0) line(c, ix - 6, 148, hx + 70, hy + 28, COL.skin, 2);
      }
    }
    // дуб впереди: шатается, идёт вверх с корнями, ложится настилом
    if (a(8) > 0 && stage < MAXP) {
      const ox = ix0 + stage * 30 + 66, by = 176;
      if (u <= 0 || ph < 0.35) oakAt(c, ox, by, u > 0 ? Math.sin(t * 34) * 0.05 : 0, 0.36, false);
      else if (ph < 0.7) {
        const v = (ph - 0.35) / 0.35;
        oakAt(c, ox, by - smooth(v) * 30, 0.04, 0.36, true);
        for (let i = 0; i < 7; i++) { const a0 = i * 0.9; rect(c, ox + Math.cos(a0) * v * 26, by + Math.sin(a0) * 6 - v * 8, 2, 2, "#3a2a1a"); }
      } else {
        const v = smooth((ph - 0.7) / 0.3);
        oakAt(c, lerp(ox, ix0 + stage * 30 + 8, v), lerp(by - 30, 172, v), v * 1.57, lerp(0.36, 0.2, v), true);
      }
    }
    if (a(8) > 0) ell(c, ix0 + stage * 30 + 66, 178, 16, 4, "#3e5a30");
    c.restore();
    if (stage > 0) hudCounter(c, R((stage + ph) / MAXP * 30) + " вёрст настила");
    label(c, "БРЫНСКИЕ ЛЕСА");
  },

  // 13–17: речка. Конь ржёт, взвивается, перепрыгивает и останавливается
  river(c, t, a) {
    landscape(c, t, PAL.day, 120, { noGround: true, sun: [410, 40, 14] });
    forestLayer(c, 160, 22, 19, 9, PAL.day.near, 60);
    rect(c, 0, 160, LW, LH - 160, "#5a9238"); rect(c, 0, 160, LW, 2, "#78ae48");
    const rx = 170, rw = 150;
    rect(c, rx, 160, rw, 110, "#2c6cc8");
    c.fillStyle = "#6ab0f0"; for (let i = 0; i < 80; i++) { const y = 162 + hash(i * 2.2) * 104; const x = rx + ((hash(i * 3.3) * rw + t * (24 + i % 7 * 8)) % rw); c.fillRect(R(x), R(y), 6 + hash(i) * 6, 1); }
    for (let i = 0; i < 12; i++) { const x = rx + 12 + hash(i * 5.1) * (rw - 24), y = 168 + hash(i * 7.7) * 30; ell(c, x, y, 5 + hash(i) * 4, 3, "#6a7280"); ell(c, x - 1, y - 1, 3, 2, "#98a0ac"); }
    const j = a(17);
    if (a(16) < 0) {
      const w = clamp(a(13) / 5);
      rider(c, lerp(-60, 60, w), 112, t, { speed: w < 1 ? 8 : 0 });
    } else if (j < 0) {
      const rear = sinPi(clamp(a(16) / (S(17) - S(16))) * 0.5);
      blitRot(c, riderSprite(idleF(t), { idle: true, talk: true }), 102, 150 - rear * 8, -rear * 0.55);
    } else {
      const f = clamp(j / 1.5);
      if (f < 1) blitRot(c, riderSprite(Math.floor(t * 8) % 8, {}), lerp(60, 340, f) + 42, 112 + 34 - sinPi(f) * 104, -0.3 + f * 0.6);
      else {
        const stop = clamp((j - 1.5) / 1.1); // галоп кончается: конь тормозит и встаёт
        rider(c, lerp(340, 378, smooth(stop)), 112, t, { speed: stop < 1 ? 7 : 0 });
        if (j < 1.9) for (let i = 0; i < 8; i++) rect(c, 356 + i * 8, 176 - hash(i) * 8, 2, 2, "#b8d890");
      }
    }
    label(c, "РЕЧКА СМОРОДИНА");
  },

  // 18–27: Соловей на трёх дубах; сокол, волк и змея поворачивают назад
  oaks(c, t, a) {
    landscape(c, t, PAL.grim, 30, { noGround: true });
    bowForest(c, 158, 0);
    groundLayer(c, 160, 30, ["#3a5a2c", "#4e7238", "#2e4a24"], null);
    bentMeadow(c, 160, 0, 1, t);
    threeOaks(c); nestOnOaks(c);
    const up = a(23) > 0 ? clamp(a(23) / 0.7) : 0;
    solovey(c, 300, lerp(18, 6, up), t);
    // сокол долетает до дубов и поворачивает
    if (a(20) > 0 && a(22) < 0) {
      const U = clamp(a(20) / 2.4), bx = lerp(-20, 210, sinPi(U)), turned = U > 0.5;
      blit(c, falconSprite(Math.floor(t * 8)), bx, 40 + Math.sin(t * 5) * 3, turned);
    }
    // волк подбегает и удирает
    if (a(20) > 1.2 && a(22) < 0) {
      const U = clamp((a(20) - 1.2) / 2.6), wx = lerp(-40, 186, sinPi(U));
      blit(c, wolfSprite(Math.floor(t * 10)), wx, 160, U > 0.5);
    }
    // змея ползёт и уползает
    if (a(21) > 0 && a(23) < 0) {
      const U = clamp(a(21) / 3), sx = lerp(-40, 150, sinPi(U));
      snake(c, sx, 180, t, U > 0.5 ? -1 : 1);
    }
    if (a(18) > 0 && a(18) < 3.2) {
      const k = springPop(a(18)), s = "СОЛОВЕЙ-РАЗБОЙНИК", w = textWidth(s, true) * 2 + 20;
      panel(c, R((LW - w) / 2), R(lerp(-30, 8, k)), w, 28, "#3c1420"); drawText(c, s, R((LW - w) / 2) + 10, R(lerp(-30, 8, k)) + 7, "#ffd860", { scale: 2, bold: true });
    }
    const w = clamp((t - S(22)) / 5);
    rider(c, lerp(-100, 70, w), 112, t, { speed: w < 1 ? 7 : 0 });
    label(c, "ЗАПОВЕДНЫЕ ДУБЫ");
  },

  // 28–38: свист, конь падает на колени, плётка, речь
  whistle(c, t, a) {
    const on = a(28) > 0 && a(32) < 0;
    landscape(c, t, PAL.grim, 30, { noGround: true });
    c.save();
    if (on) c.translate(R(Math.sin(t * 40) * 1.6), R(Math.cos(t * 31) * 1.2));
    const b = clamp(a(29) / 1.2);
    bowForest(c, 158, b);
    groundLayer(c, 160, 30, ["#3a5a2c", "#4e7238", "#2e4a24"], null);
    bentMeadow(c, 160, clamp(a(30) / 1), 1, t);
    const sway = on ? Math.sin(t * 7) * 0.06 * clamp(a(30) / 1.3) : 0;
    oakAt(c, 279, 196, sway, 1, false); oakAt(c, 369, 188, sway, 1, false); oakAt(c, 419, 204, sway, 1, false);
    nestOnOaks(c);
    solovey(c, 300, 6, t, on ? "whistle" : "sit");
    if (on) whistleWaves(c, 323, 28, t, 1);
    c.restore();
    const x = 70, y = 112;
    const fell = a(31) > 0;
    if (!fell) rider(c, x, y, t, { hand: [40, 18] });
    else {
      const k = clamp(a(31) / 0.5);
      const w = a(34);
      let hand, jolt = 0;
      if (w > 0 && a(35) < 0) {
        const ph = (w * 1.6) % 1, sw = smooth(Math.min(1, ph * 1.4));
        hand = [R(lerp(20, 44, sw)), R(lerp(-4, 22, sw))];
        if (ph > 0.65) jolt = -0.05;
      } else if (talking("илья")) hand = [44, Math.floor(t * 2.5) % 2 ? 0 : 6];
      const opt = { kneel: true, idle: true, hand, talk: talking("илья") && flap(t) };
      const an = k * 0.2 + jolt + (a(32) < 0 ? Math.sin(t * 18) * 0.015 : 0);
      blitRot(c, riderSprite(idleF(t), opt), x + 42, y + 34 + k * 6, an);
      if (w > 0 && a(35) < 0) {
        const ph = (w * 1.6) % 1;
        const [hx, hy] = rotPt(x + 6 + hand[0], y + 10 + hand[1], x + 42, y + 34 + k * 6, an);
        const tx = ph > 0.5 ? x + 34 : hx - 26 + ph * 20, ty = ph > 0.5 ? y + 40 : hy - 12 + ph * 30;
        line(c, hx, hy, (hx + tx) / 2 - 4, (hy + ty) / 2 + 4, "#e8c890");
        line(c, (hx + tx) / 2 - 4, (hy + ty) / 2 + 4, tx, ty, "#e8c890");
        if (ph > 0.55 && ph < 0.8) for (let i = 0; i < 6; i++) rect(c, x + 34 + Math.cos(i) * 7, y + 40 + Math.sin(i) * 7, 2, 2, "#fff4a0");
      }
    }
    label(c, "ЗАПОВЕДНЫЕ ДУБЫ");
  },

  // 39–46: вскочил, подскакал, лук в руке, стрела
  arrow(c, t, a) {
    const zoomed = a(45) > 0.7;
    if (!zoomed) {
      landscape(c, t, PAL.grim, 30, { noGround: true });
      bowForest(c, 158, 1 - clamp(a(39) / 2) * 0.4);
      groundLayer(c, 160, 30, ["#3a5a2c", "#4e7238", "#2e4a24"], null);
      bentMeadow(c, 160, 1 - clamp(a(39) / 2) * 0.4, 1, t);
      threeOaks(c); nestOnOaks(c);
      const peek = a(42) > 0 ? clamp(a(42) / 0.6) : 0;
      const sx = 300, sy = lerp(22, 2, peek);
      solovey(c, sx, sy, t);
      if (a(40) > 0 && a(42) < 0) drawText(c, "?", sx + 36, sy - 2, "#ffd860", { scale: 2, bold: true, shadow: "#120c14" });
      const rise = clamp(a(39) / 0.6), go = clamp(a(39) / 2.2);
      const hx = lerp(70, 120, smooth(go));
      if (rise < 1) blitRot(c, riderSprite(idleF(t), { idle: true }), hx + 42, 112 + 34 + (1 - rise) * 6, (1 - rise) * 0.2);
      else {
        const hand = [45, 9], bowOn = a(43) > 0;
        rider(c, hx, 112, t, { speed: go < 1 ? 9 : 0, bow: bowOn });
        if (bowOn) {
          const [bx, by] = handAt(hx, 112, hand);
          const draw = clamp(a(43) / 1.5);
          line(c, bx + 1, by - 20, bx + 7, by, "#a0522c", 2); line(c, bx + 7, by, bx + 1, by + 20, "#a0522c", 2);
          line(c, bx + 1, by - 20, bx + 1 - draw * 10, by, "#f8f0d8"); line(c, bx + 1 - draw * 10, by, bx + 1, by + 20, "#f8f0d8");
          if (a(44) > 0 && a(45) < 0) { line(c, bx + 1 - draw * 10, by, bx + 24, by, "#e8e0c8"); rect(c, bx + 23, by - 1, 4, 3, COL.steelL); }
          if (a(45) > 0) {
            const f = clamp(a(45) / 0.7), ax = lerp(bx + 24, sx + 23, f), ay = lerp(by, sy + 12, f);
            line(c, ax - 12, ay + 4, ax, ay, "#e8e0c8");
            for (let i = 1; i < 4; i++) rect(c, ax - 12 - i * 8, ay + 4 + i * 2, 4, 1, "#fff4a0");
          }
        }
      }
    } else {
      skyBands(c, PAL.grim.sky, 200);
      const k = springPop(a(45) - 0.7), hit = a(46);
      blitRot(c, soloveySprite(hit > 0 ? "sit" : "whistle", hit > 0.2), 240 + (hit > 0 ? Math.sin(t * 30) * 3 * Math.max(0, 1 - hit) : 0), 110, 0, 2.8 * k);
      if (hit > -0.05 && hit < 0.5) {
        for (let i = 0; i < 12; i++) { const r = (hit + 0.1) * 280; rect(c, 240 + Math.cos(i * 0.52) * r - 2, 88 + Math.sin(i * 0.52) * r * 0.8, 4, 4, i % 2 ? "#fff4a0" : "#ff7a4a"); }
        wash(c, "#fff8d0", clamp(0.7 - (hit + 0.05) * 1.8));
      }
    }
    if (a(43) > 0) hpBar(c, "СОЛОВЕЙ", 120, 22, 150, a(46) > 0 ? Math.max(0, 1 - a(46) * 1.2) : 1);
    label(c, "ЗАПОВЕДНЫЕ ДУБЫ");
  },

  // 47–55: падает сноповым, Илья подхватывает, вяжет ремнями, цепляет к стремени
  capture(c, t, a) {
    landscape(c, t, PAL.grim, 30, { noGround: true });
    bowForest(c, 158, 0.6 * (1 - clamp(a(47) / 5)));
    groundLayer(c, 160, 30, ["#3a5a2c", "#4e7238", "#2e4a24"], null);
    bentMeadow(c, 160, 0.6 * (1 - clamp(a(47) / 5)), 1, t);
    threeOaks(c); nestOnOaks(c);
    const hx = 104, hy = 112;
    const down = clamp(a(47) / 1.6);
    const gx = 236, gy = 170;
    const mountBack = a(51) > 0 ? clamp(a(51) / 0.7) : 0;
    const off = a(48) > 0 && mountBack < 1;
    rider(c, hx, hy, t, { noRider: off, speed: 0 });
    // Соловей
    const hung = a(50) > 0 ? clamp(a(50) / 1.3) : 0;
    if (hung >= 1) hangSol(c, hx, hy, t);
    else if (a(49) > 0 || hung > 0) {
      const bands = Math.min(4, Math.floor(a(49) / 0.5) + 1);
      const px = lerp(gx, hx + 36, smooth(hung)), py = lerp(gy, hy + 56, smooth(hung)) - sinPi(hung) * 26;
      blitRot(c, soloveySprite(bands >= 4 ? "bound" : "sit", true), px, py, 1.5 + hung * -0.15, lerp(1, 0.62, hung));
      if (bands < 4) for (let i = 0; i < bands; i++) rect(c, px - 18 + i * 12, py - 13, 2, 26, COL.leather);
    } else if (a(48) > 0) {
      // подхватил на руки
      const f = clamp(a(48) / 1.5);
      const lift = f > 0.7 ? smooth((f - 0.7) / 0.3) : 0;
      blitRot(c, soloveySprite("sit", true), gx, gy - lift * 18, 1.5, 1);
    } else {
      blitRot(c, soloveySprite("sit", true), lerp(322, gx, down), lerp(36, gy, down * down), down * 11 + (1 - down) * 0.2, 1 - down * 0);
      if (down >= 1) for (let i = 0; i < 6; i++) rect(c, gx + Math.cos(i) * 22 * clamp(a(47) - 1.6), gy + 14 - clamp(a(47) - 1.6) * 8, 2, 2, "#c8c0a0");
    }
    // Илья: соскок, бежит к Соловью, руками вяжет, ведёт к коню, садится
    if (off && mountBack <= 0) {
      const f = clamp(a(48) / 0.6);
      if (f < 1) {
        const fx = lerp(hx + 26, hx + 70, f), fy = lerp(hy + 8, 124, f) - sinPi(f) * 22;
        blitRot(c, ilyaFoot(0, {}), fx + 17, fy + 22, (1 - f) * 0.4);
      } else if (hung <= 0) {
        const run = clamp((a(48) - 0.6) / 0.8);
        const ix = lerp(hx + 70, gx - 44, smooth(run));
        const hand = a(49) > 0 ? [34, Math.floor(t * 8) % 2 ? 26 : 34] : run >= 1 ? [34, 28 - clamp(a(48) - 1.4) * 40] : undefined;
        ilya(c, ix, 124, t, { walk: run < 1, hand: hand && [hand[0], R(hand[1])] });
      } else {
        const back = smooth(hung);
        ilya(c, lerp(gx - 44, hx + 76, back), 124, t, { walk: hung < 1, hand: [32, 18] });
      }
    }
    if (mountBack > 0 && mountBack < 1) {
      const fx = lerp(hx + 76, hx + 26, mountBack), fy = lerp(124, hy + 8, mountBack) - sinPi(mountBack) * 22;
      blitRot(c, ilyaFoot(0, {}), fx + 17, fy + 22, mountBack * 0.3);
    }
    label(c, "ЗАПОВЕДНЫЕ ДУБЫ");
  },

  // 56–77: подворье
  court(c, t, a) {
    landscape(c, t, PAL.dusk, 80, { noGround: true, sun: [420, 42, 12], sunCol: "#ffc888" });
    groundLayer(c, 160, 40, ["#3a4a2e", "#4e6038", "#2c3a24"], null);
    hallOnPillars(c, t, a(58));
    ironFence(c, clamp(a(60) / 1.6));
    if (a(58) > 0 && a(61) < 0) {
      const k = springPop(a(58)), s = "ДВОР НА СЕМИ ВЁРСТАХ", w = textWidth(s, true) + 16;
      panel(c, R((LW - w) / 2), R(lerp(-24, 8, k)), w, 22, "#3c1420"); drawText(c, s, R((LW - w) / 2) + 8, R(lerp(-24, 8, k)) + 7, "#ffd860", { bold: true });
    }
    // в окнах: дочка и жена, жена всплёскивает руками
    if (a(63) > 0) {
      const k = springPop(a(63));
      c.save(); c.beginPath(); c.rect(236, 50, 18, 26); c.clip();
      blit(c, girlSprite(COL.blue, talking("дочка") && flap(t) ? 1 : 0), 235, 50 + 26 - k * 24);
      c.restore();
    }
    if (a(67) > 0) {
      const k = springPop(a(67));
      c.save(); c.beginPath(); c.rect(272, 50, 18, 26); c.clip();
      const fr = talking("жена") ? (flap(t) ? 1 : 0) : a(68) < 0 ? 2 : 0;
      blit(c, girlSprite(COL.purple, fr), 271, 50 + 26 - k * 24);
      c.restore();
    }
    // Илья
    const go = clamp(a(56) / 7);
    const x = lerp(-60, 74, go), y = 112;
    // отмах рукой на строке 75
    let hand;
    const sw = a(75);
    if (sw > -0.5 && sw < 0.8) {
      const u = clamp((sw + 0.5) / 1.3);
      hand = u < 0.5 ? [R(lerp(38, 20, u * 2)), R(lerp(14, 2, u * 2))] : [R(lerp(20, 50, (u - 0.5) * 2)), R(lerp(2, -6, (u - 0.5) * 2))];
    } else if (a(74) > 0 && sw < 0) hand = [38, 12];
    rider(c, x, y, t, { speed: go < 1 ? 9 : 0, hand });
    hangSol(c, x, y, t);
    // Пелька
    if (a(71) > 0) {
      const run = clamp(a(71) / 2.2);
      const px = lerp(250, 300, smooth(run)), py = lerp(84, 134, smooth(run));
      const board = (bx, by, an) => { c.save(); c.translate(R(bx), R(by)); c.rotate(an); rect(c, -15, -4, 30, 8, "#5a5a68"); rect(c, -15, -4, 30, 2, "#8a8a98"); c.restore(); };
      const fallen = a(77) > 0;
      const T0 = S(73) + 1.5, T1 = S(75) + 0.2, T2 = S(77) + 0.1;
      const [hitX, hitY] = handAt(74, 112, [50, -6]);
      if (!fallen) {
        const hold = a(72) > 0 && t < T0;
        woman(c, px, py, t, COL.green, null, a(72) > 0 ? 2 : 0);
        if (hold) board(px + 12, py - 8, 0.05);
      } else {
        const fk = clamp(a(77) / 0.7);
        blitRot(c, womanSprite(COL.green, false, 0), px + 14 + fk * 18, py + 14 + fk * 14 - sinPi(fk) * 10, fk * 1.5);
        if (a(77) < 2) for (let i = 0; i < 6; i++) { const an = t * 5 + i; rect(c, px + 30 + Math.cos(an) * 12, py + 6 + Math.sin(an) * 4, 2, 2, "#fff4a0"); }
      }
      if (t >= T0 && t < T1) { const f = clamp((t - T0) / (T1 - T0)); board(lerp(px + 12, hitX, f), lerp(py - 8, hitY, f) - sinPi(f) * 40, f * 9); }
      else if (t >= T1 && t < T2) { const f = clamp((t - T1) / (T2 - T1)); board(lerp(hitX, px + 10, f), lerp(hitY, py + 6, f) - sinPi(f) * 46, 9 + f * 9); }
      else if (t >= T2) board(px + 24 + clamp(a(77)) * 26, 172, 0.08);
      if (Math.abs(t - T1) < 0.22) { for (let i = 0; i < 10; i++) { const r = (t - T1 + 0.22) * 70; rect(c, hitX + Math.cos(i * 0.63) * r, hitY + Math.sin(i * 0.63) * r, 2, 2, "#fff4a0"); } }
    }
    label(c, "ПОДВОРЬЕ СОЛОВЬЯ");
  },

  // 78–90: жена на коленях, сундуки
  ransom(c, t, a) {
    landscape(c, t, PAL.dusk, 80, { noGround: true, sun: [420, 42, 12], sunCol: "#ffc888" });
    groundLayer(c, 160, 40, ["#3a4a2e", "#4e6038", "#2c3a24"], null);
    hallOnPillars(c, t, 0);
    ironFence(c, 1);
    rider(c, 74, 112, t);
    hangSol(c, 74, 112, t);
    blitRot(c, womanSprite(COL.green, false, 0), 362, 168, 1.5);
    // жена подбегает и встаёт на колени лицом к Илье
    const run = clamp(a(78) / 1.4);
    const wx = lerp(250, 168, smooth(run));
    if (run < 1) woman(c, wx, lerp(84, 138, smooth(run)), t, COL.purple, null, 1);
    else kneelWife(c, 162, 146, t, true, a(84) > 0.3);
    // сундуки с выкупом: открываются по словам
    const shut = a(84) > 0.2;
    [[79, 0, 214], [79, 1, 256], [80, 2, 298]].forEach(([n, kind, x], i) => {
      const at = n === 79 ? (kind === 0 ? S(79) + 1.0 : S(79) + 2.0) : S(80);
      const k = springPop(t - at);
      if (t < at) return;
      blitRot(c, chestSprite(shut ? 0 : 1, kind), x + 21, 158 + (1 - k) * 18, 0, k);
    });
    label(c, "ПОДВОРЬЕ СОЛОВЬЯ");
  },

  // 91–96: дорога, Киев, Илья привязывает коня к столбику
  kiev(c, t, a) {
    if (a(93) < 0) {
      landscape(c, t, PAL.gold, (t - S(91)) * 200, { sun: [410, 44, 14] });
      rider(c, 170, 112, t, { speed: 15 });
      hangSol(c, 170, 112, t);
    } else {
      const v = a(93);
      skyBands(c, PAL.gold.sky, 150); rect(c, 0, 150, LW, LH, PAL.gold.sky[5]);
      cloudsLayer(c, 14, t * 2, 8, PAL.gold.cloud, PAL.gold.cloudD);
      hillsLayer(c, 128, 12, 200, 2.2, PAL.gold.far, 40);
      const X = (x) => x - clamp(v / 6) * 80;
      const tower = (x, h, r) => { rect(c, X(x), 148 - h, 34, h, "#ece4d0"); rect(c, X(x) + 26, 148 - h, 8, h, "#c8bea4"); ell(c, X(x) + 17, 148 - h - 6, r, r + 2, "#f0c040"); ell(c, X(x) + 14, 148 - h - 8, r * 0.4, r * 0.6, "#ffe680"); rect(c, X(x) + 16, 148 - h - 20, 2, 10, "#f0c040"); rect(c, X(x) + 13, 148 - h - 17, 8, 1, "#f0c040"); };
      for (const [x, h, r] of [[-20, 66, 11], [110, 86, 14], [176, 104, 17], [240, 86, 14], [310, 66, 11], [420, 58, 10], [520, 72, 11]]) tower(x, h, r);
      rect(c, X(-120), 112, 900, 38, "#f4ecd8");
      for (let x = -120; x < 780; x += 13) rect(c, X(x), 106, 7, 6, "#f4ecd8");
      rect(c, X(190), 118, 34, 32, "#1e1410"); ell(c, X(207), 118, 17, 10, "#1e1410");
      groundLayer(c, 150, 40, PAL.gold.ground, PAL.gold.tuft);
      const go = clamp(v / 4), x = lerp(-60, 150, go), y = 96;
      if (a(94) < 0) { rider(c, x, y, t, { speed: go < 1 ? 8 : 0 }); hangSol(c, x, y, t); }
      else {
        // столбик точёный и повод от морды к нему
        rect(c, 236, 122, 5, 44, COL.bay); rect(c, 234, 120, 9, 3, COL.gold); rect(c, 234, 164, 9, 2, COL.bayD);
        const off = a(94) > 0.2;
        rider(c, 150, y, t, { noRider: off });
        hangSol(c, 150, y, t);
        if (off) {
          line(c, 222, y + 20, 238, 130, COL.leather);
          const f = clamp((a(94) - 0.2) / 0.6);
          if (f < 1) blitRot(c, ilyaFoot(0, {}), lerp(176, 244, f) + 17, lerp(106, 116, f) - sinPi(f) * 20 + 22, (1 - f) * 0.3);
          else ilya(c, lerp(244, 500, clamp(a(96) / 2.2)), 118, t, { walk: a(96) > 0 });
        }
      }
    }
    label(c, "СТОЛЬНЫЙ КИЕВ-ГРАД");
  },

  // 97–111: пир
  feast(c, t, a) {
    hallBack(c);
    feastTable(c, 200, 178, 260);
    for (let i = 0; i < 3; i++) {
      const lift = Math.sin(t * 1.3 + i * 2) > 0.5;
      blit(c, bogatyr(i, 0), 226 + i * 30, 150 - (Math.floor(t * 4 + i) % 2));
      if (lift) blit(c, cupSprite(true), 240 + i * 30, 158);
    }
    prince(c, 320, 130, t);
    woman(c, 356, 138, t, COL.purple, null, 0);
    rect(c, 28, 74, 44, 96, "#120c0c");
    if (a(99) < 0) rect(c, 28, 74, 44, 96, "#6a3a1a");
    else {
      poly(c, [[28, 74], [14, 62], [14, 184], [28, 170]], "#6a3a1a");
      const w = clamp(a(99) / 1.8), x = lerp(30, 118, w);
      const bow = a(99) > 1.8 && a(100) < 0 ? sinPi(clamp((a(99) - 1.8) / 1)) * 0.6 : 0;
      if (bow > 0.01) blitRot(c, ilyaFoot(idleF(t), {}), x + 17, 150, bow);
      else ilya(c, x, 128, t, { walk: w < 1, hand: a(109) > 0 && a(112) < 0 ? [-6, 12] : undefined });
    }
    label(c, "СВЕТЛАЯ ГОРНИЦА");
  },

  // 112–117: все на двор. Соловей висит у стремени
  yardRun(c, t, a) {
    yardBack(c, t, PAL.gold);
    rider(c, 300, 112, t, { noRider: true });
    hangSol(c, 300, 112, t);
    const k = clamp(a(112) / 4), run = k < 1;
    ilya(c, lerp(226, 392, smooth(k)), 124, t, { walk: run }, true);
    prince(c, lerp(226, 130, smooth(k)), 126, t, { coat: true, walk: run });
    woman(c, lerp(226, 96, smooth(k)), 138, t, COL.purple, null, run ? 1 : 0);
    for (let i = 0; i < 3; i++) blit(c, bogatyr(i, run ? Math.floor(t * 7 + i) : 0), lerp(226, 16 + i * 26, smooth(clamp(k - i * 0.1))), 146 - (run ? Math.floor(t * 7 + i) % 2 : 0));
    label(c, "КНЯЖЕСКИЙ ДВОР");
  },

  // 118–137: уговоры, стол, чара у рта
  yard(c, t, a) {
    yardBack(c, t, PAL.gold);
    rider(c, 300, 112, t, { noRider: true });
    const drinking = a(133) > 0;
    const sx = 170, sy = 116;
    if (!drinking) hangSol(c, 300, 112, t);
    ilya(c, 392, 124, t, { hand: a(125) > 0 && a(127) < 0 ? [30, 2] : undefined }, true);
    prince(c, 130, 126, t, { coat: true });
    woman(c, 96, 138, t, COL.purple, null, 0);
    for (let i = 0; i < 3; i++) blit(c, bogatyr(i, 0), 16 + i * 26, 146 - (Math.floor(t * 2 + i) % 4 === 0 ? 1 : 0));
    // стол с угощением
    const tx = 226, ty = 172;
    const onTable = a(129) > 0 && !drinking;
    if (a(129) > 0) { rect(c, tx - 2, ty, 54, 3, "#f4ecd8"); rect(c, tx, ty + 3, 4, 14, "#6a3a1a"); rect(c, tx + 46, ty + 3, 4, 14, "#6a3a1a"); }
    if (onTable) {
      if (a(129) > 0) blit(c, cupSprite(true), tx + 1, ty - 13);
      if (a(130) > 0) blit(c, cupSprite(true), tx + 18, ty - 13);
      if (a(131) > 0) { ell(c, tx + 42, ty - 4, 8, 4, "#c88a3c"); rect(c, tx + 36, ty - 7, 10, 1, "#e8c078"); }
    }
    if (drinking) {
      solovey(c, sx, sy, t, "sit", true);
      const n = Math.min(2, Math.floor(a(133) / 1.4)), ph = (a(133) % 1.4) / 1.4;
      if (a(133) < 4.2) {
        const tilt = sinPi(ph) * 1.5;
        blitRot(c, cupSprite(true), sx + 24, sy + 20 - sinPi(ph) * 2, tilt, 1.6);
      }
      for (let i = n + 1; i < 3; i++) blit(c, cupSprite(true), tx + 1 + i * 16, ty - 13);
    }
    label(c, "КНЯЖЕСКИЙ ДВОР");
  },

  // 138–149: главный свист
  blast(c, t, a, cv) {
    const v = a(141);
    const on = v > 0 && a(150) < 0;
    const bend = clamp(a(144) / 1) * (1 + Math.sin(t * 11) * 0.05);
    const burst = a(145) > 0 ? clamp(a(145) / 2) : 0;
    const porch = clamp((a(144) - 1.5) / 1.5);
    const fall = clamp(a(146) / 1.5);
    const sx = 170, sy = 116;
    yardBack(c, t, on ? PAL.grim : PAL.gold, { bend: on ? bend : 0, burst, porch });
    c.save();
    if (on) { const sh = 2 + clamp(v / 2) * 3; c.translate(R(Math.sin(t * 47) * sh), R(Math.cos(t * 37) * sh * 0.7)); }
    yardBack(c, t, on ? PAL.grim : PAL.gold, { bend: on ? bend : 0, burst, porch });
    if (a(145) > 0) for (let i = 0; i < 2; i++) rider(c, 460 - a(145) * (80 + i * 30) + i * 60, 112 + i * 5, t, { speed: 17, noRider: true }, true);
    else rider(c, 300, 112, t, { noRider: true });
    ilya(c, 392, 124, t, {}, true);
    const hide = a(148) > 0;
    const px = hide ? lerp(130, 368, clamp(a(148) / 1.4)) : 130;
    prince(c, px + (on && !hide ? Math.sin(t * 13) * 2 : 0), 126, t, { coat: true, walk: hide && a(148) < 1.4 });
    if (hide && a(148) > 1.4) { poly(c, [[366, 128], [398, 128], [406, 170], [358, 170]], COL.red); poly(c, [[370, 134], [394, 134], [402, 168], [362, 168]], COL.redD); }
    // вдох перед свистом: Соловей раздувается
    const puff = a(138) > 0 && v < 0 ? sinPi(clamp(a(138) / (S(141) - S(138)))) * 0.28 : 0;
    blitRot(c, soloveySprite(on ? "whistle" : "sit", true, Math.floor(t * 10) % 2), sx + 23, sy + 25, 0, 1 + puff);
    for (let i = 0; i < 5; i++) {
      const x0 = 6 + i * 24;
      if (fall <= 0) blit(c, bogatyr(i, 0), x0, 146 - (on ? Math.floor(t * 8 + i) % 2 : 0));
      else blitRot(c, bogatyr(i, Math.floor(t * 4 + i)), x0 + 11 + (a(147) > 0 ? a(147) * (i % 2 ? 6 : -4) : 0) + Math.sin(t * 2 + i) * 2, 170, fall * 1.5);
    }
    if (on) whistleWaves(c, sx + 23, sy + 20, t * 1.4, 1.6);
    c.restore();
    if (a(138) > 0 && !on) wash(c, "#120c20", clamp(a(138) / 6) * 0.45);
    if (on) scanWave(c, cv, 2 + clamp(v / 3) * 5, t);
    label(c, "КНЯЖЕСКИЙ ДВОР");
  },

  // 150–155: гнев Ильи. 156–157: взмах сабли, вспышка, Соловей рассыпается перьями
  end(c, t, a) {
    if (a(156) < 0) {
      yardBack(c, t, PAL.grim, { bend: 0.6, burst: 1, porch: 1 });
      ilya(c, 392, 124, t, {}, true);
      solovey(c, 170, 116, t, "sit", true);
      for (let i = 0; i < 5; i++) blitRot(c, bogatyr(i), 17 + i * 24, 170, 1.5);
      label(c, "КНЯЖЕСКИЙ ДВОР");
      return;
    }
    const W = LINES[155].words.find((w) => w.w.startsWith("отрубил"));
    const hitT = W ? W.s : S(156) + 2.2, u = t - hitT;
    // небо светлеет, когда Соловья не стало
    landscape(c, t, PAL.dusk, 200, { sun: [400, 60, 22], sunGlow: "#f8a860", sunCol: "#ffd890" });
    if (u > 0.6) { c.save(); c.globalAlpha = clamp((u - 0.6) / 1.8); landscape(c, t, PAL.gold, 200, { sun: [400, 60, 22], sunGlow: "#f8a860", sunCol: "#ffd890" }); c.restore(); }
    const ix = 150, iy = 124, sx = 250, sy = 118;
    const raise = clamp(a(156) / 1.2), swing = clamp((u + 0.25) / 0.3);
    const hand = swing > 0 ? [R(lerp(30, 44, swing)), R(lerp(0, 24, swing))] : [R(lerp(26, 30, raise)), R(lerp(25, 0, raise))];
    if (u < 0.05) solovey(c, sx, sy, t, "bound", true);
    ilya(c, ix, iy, t, { hand });
    // сабля в руке
    const hgx = ix + hand[0], hgy = iy + hand[1];
    const ang = swing > 0 ? lerp(-0.2, 2.3, swing) : lerp(1.2, -0.2, raise);
    const bl = 34 * clamp(a(156) / 0.6);
    line(c, hgx, hgy, hgx + Math.sin(ang) * bl, hgy - Math.cos(ang) * bl, "#f4f8ff", 2);
    rect(c, hgx - 3, hgy - 1, 6, 2, COL.gold);
    if (a(156) > 1 && u < -0.25 && Math.floor(t * 8) % 2) { const gx = hgx + Math.sin(ang) * bl, gy = hgy - Math.cos(ang) * bl; rect(c, gx - 3, gy, 7, 1, "#ffffff"); rect(c, gx, gy - 3, 1, 7, "#ffffff"); }
    if (u > 0) {
      if (u < 0.35) { // след удара
        for (let i = 0; i < 24; i++) { const an = -0.2 + (i / 24) * 2.5; rect(c, hgx + Math.sin(an) * 36, hgy - Math.cos(an) * 36, 2, 2, "#ffffff"); }
        wash(c, "#fff8e0", clamp(0.8 - u * 2.2));
      }
      for (let i = 0; i < 40; i++) { // перья разлетаются и оседают
        const an = hash(i) * 6.28, r = Math.min(1.4, u) * (16 + hash(i * 3) * 50);
        const fy = Math.min(50, u * u * 7 * hash(i * 5));
        rect(c, sx + 23 + Math.cos(an) * r + Math.sin(t * 3 + i) * 2, sy + 22 + Math.sin(an) * r * 0.6 + fy, 3, 1, i % 3 ? COL.featherL : COL.feather);
      }
      const hatK = clamp(u / 0.8);
      blit(c, sprite("hatg", 18, 14, (cc) => { poly(cc, [[1, 12], [17, 12], [14, 5], [9, 2], [4, 5]], COL.featherD); poly(cc, [[7, 3], [9, 0], [12, 3]], COL.red); }), sx + 16 + hatK * 12, lerp(sy, 168, hatK * hatK));
    }
    label(c, "ЧИСТО ПОЛЕ");
  },

  // 158–161: благодарность
  glory(c, t, a) {
    yardBack(c, t, PAL.gold);
    const bow = a(159) > 0 && a(160) < 0 ? sinPi(clamp(a(159) / 1.6)) * 0.5 : 0;
    if (bow > 0.01) blitRot(c, ilyaFoot(idleF(t), {}), 243, 148, -bow);
    else ilya(c, 226, 126, t, {}, true);
    prince(c, 186, 128, t, { coat: true });
    woman(c, 152, 140, t, COL.purple, null, 0);
    for (let i = 0; i < 4; i++) { const by = R(Math.abs(Math.sin(t * 4 + i)) * 3); blit(c, bogatyr(i, 0), 54 + i * 24, 146 - by); blit(c, bogatyr(i + 1, 0), 300 + i * 26, 146 - by); }
    if (a(159) > 0) { const k = springPop(a(159)); const s = "СТАРШИЙ БОГАТЫРЬ", w = textWidth(s, true) * 2 + 20; panel(c, R((LW - w) / 2), R(lerp(-30, 10, k)), w, 28, "#3c1420"); drawText(c, s, R((LW - w) / 2) + 10, R(lerp(-30, 10, k)) + 7, "#ffd860", { scale: 2, bold: true }); }
    label(c, "КНЯЖЕСКИЙ ДВОР");
  },

  // финал
  final(c, t, a, cv, u) {
    const pal = PAL.gold;
    skyBands(c, pal.sky, 170);
    rect(c, 0, 170, LW, LH, pal.sky[5]);
    disc(c, 240, 150, 92, "#ffe89c"); disc(c, 240, 150, 78, "#fff6d0");
    for (let i = 0; i < 16; i++) { const an = i * 0.39 + t * 0.12; line(c, 240 + Math.cos(an) * 96, 150 + Math.sin(an) * 96, 240 + Math.cos(an) * 170, 150 + Math.sin(an) * 170, "#ffe89c"); }
    hillsLayer(c, 206, 14, 150, 1.6, "#6aa23e", 10, "#8ec04e");
    rect(c, 0, 210, LW, 60, "#6aa23e");
    groundLayer(c, 226, 40, ["#5a9238", "#78ae48", "#477a2c"], null);
    rider(c, 198, 150, t, { spear: true });
    const k1 = springPop(u - 0.2), k2 = springPop(u - 0.7);
    const A = "ИЛЬЯ МУРОМЕЦ", B = "И СОЛОВЕЙ-РАЗБОЙНИК";
    const wa = textWidth(A, true) * 5, wb = textWidth(B, true) * 3;
    const ya = R(lerp(-90, 18, k1)), yb = R(lerp(-60, 68, k2));
    drawText(c, A, R((LW - wa) / 2) + 3, ya + 3, "#3a1208", { scale: 5, bold: true });
    drawText(c, A, R((LW - wa) / 2), ya, "#ffd24a", { scale: 5, bold: true, shadow: "#a0300c" });
    drawText(c, B, R((LW - wb) / 2) + 2, yb + 2, "#120c28", { scale: 3, bold: true });
    drawText(c, B, R((LW - wb) / 2), yb, "#fffaf0", { scale: 3, bold: true, shadow: "#7a2810" });
  },
};
