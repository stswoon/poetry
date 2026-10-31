// Персонажи и предметы: всё нарисовано кодом, контур добавляет sprite().
const COL = {
  skin: "#eebb8c", skinD: "#c68a60", steel: "#c8d0dc", steelD: "#7c88a0", steelL: "#eef2f6", mail: "#8d98ac", mailD: "#5f6a80",
  red: "#c8342c", redD: "#8a1e20", redL: "#ee5a44", gold: "#f0c040", goldD: "#b07c20", goldL: "#ffe680",
  bay: "#7c4a26", bayL: "#a06a38", bayD: "#552e16", mane: "#2a1a14", hoof: "#1c1412", leather: "#5a3a20", white: "#f4f0e0", whiteD: "#c4beb0",
  blue: "#2c54a8", blueD: "#1c3470", blueL: "#5484d8", green: "#3a8a4a", purple: "#6a2c90", purpleD: "#451a60", fur: "#e8e0d0", furD: "#a89c88",
  black: "#1a1620", blackL: "#3a3444", feather: "#5a4630", featherL: "#84683e", featherD: "#33281c", beak: "#d89a30",
};

function leg(c, hx, hy, a1, a2, l1, l2, col, hoof, w = 3) {
  const kx = hx + Math.sin(a1) * l1, ky = hy + Math.cos(a1) * l1;
  const fx = kx + Math.sin(a2) * l2, fy = ky + Math.cos(a2) * l2;
  line(c, hx, hy, kx, ky, col, w + 1);
  line(c, kx, ky, fx, fy, col, w);
  rect(c, fx - 1, fy, 4, 2, hoof);
}

// Конь с Ильёй. frame 0..7 — фаза галопа; opt: spear, bow, walk, noRider, color
function riderSprite(frame, opt = {}) {
  const key = "rider" + frame + JSON.stringify(opt);
  return sprite(key, 84, 72, (c) => {
    const p = (frame / 8) * Math.PI * 2;
    const amp = opt.walk ? 0.42 : 0.82;
    const bob = opt.walk ? R(Math.sin(p * 2) * 0.6) : R(Math.sin(p * 2) * 1.2);
    const ox = 6, oy = 12 + bob;
    const X = (x) => x + ox, Y = (y) => y + oy;
    const dark = COL.bayD, mid = COL.bay, light = COL.bayL;
    // дальние ноги
    leg(c, X(46), Y(38), Math.sin(p + 1.6) * amp + 0.1, Math.sin(p + 1.6) * amp - Math.max(0, Math.sin(p + 2.6)) * 1.1, 10, 9, dark, COL.hoof);
    leg(c, X(25), Y(38), Math.sin(p + 3.6) * amp, Math.sin(p + 3.6) * amp - Math.max(0, Math.sin(p + 4.6)) * 1.1, 10, 9, dark, COL.hoof);
    // хвост
    const tw = Math.sin(p) * 3;
    poly(c, [[X(19), Y(28)], [X(12), Y(29 + tw * 0.4)], [X(4), Y(38 + tw)], [X(7), Y(45 + tw)], [X(13), Y(37 + tw * 0.5)], [X(21), Y(33)]], COL.mane);
    // туловище
    ell(c, X(34), Y(33), 16, 8.5, mid);
    ell(c, X(34), Y(30), 13, 4.5, light);
    rect(c, X(22), Y(39), 24, 2, dark);
    // шея и голова
    poly(c, [[X(43), Y(31)], [X(51), Y(23)], [X(55), Y(13)], [X(48), Y(10)], [X(43), Y(21)], [X(40), Y(28)]], mid);
    poly(c, [[X(48), Y(9)], [X(55), Y(6)], [X(62), Y(10)], [X(69), Y(16)], [X(68), Y(20)], [X(61), Y(20)], [X(55), Y(16)], [X(50), Y(14)]], light);
    rect(c, X(61), Y(13), 3, 1, dark);
    poly(c, [[X(50), Y(8)], [X(51), Y(2)], [X(54), Y(7)]], mid);
    rect(c, X(56), Y(10), 2, 2, COL.hoof);
    rect(c, X(66), Y(18), 2, 1, COL.hoof);
    // грива
    poly(c, [[X(47), Y(8)], [X(52), Y(7)], [X(47), Y(14)], [X(44), Y(22)], [X(40), Y(30)], [X(36 + tw * 0.3), Y(25)], [X(41), Y(14)]], COL.mane);
    // упряжь
    line(c, X(56), Y(14), X(62), Y(18), COL.gold);
    line(c, X(50), Y(12), X(38), Y(23), COL.leather);
    // ближние ноги
    leg(c, X(44), Y(38), Math.sin(p) * amp + 0.1, Math.sin(p) * amp - Math.max(0, Math.sin(p + 1)) * 1.1, 11, 10, mid, COL.hoof, 4);
    leg(c, X(25), Y(38), Math.sin(p + 2) * amp, Math.sin(p + 2) * amp - Math.max(0, Math.sin(p + 3)) * 1.1, 11, 10, mid, COL.hoof, 4);
    // попона и седло
    poly(c, [[X(25), Y(25)], [X(41), Y(25)], [X(42), Y(32)], [X(24), Y(33)]], COL.red);
    rect(c, X(24), Y(32), 19, 1, COL.gold);
    if (opt.noRider) return;
    const ry = oy - 2;
    const RY = (y) => y + ry;
    // плащ
    const fl = Math.sin(p) * 2;
    poly(c, [[X(27), RY(6)], [X(16 - fl), RY(10)], [X(9 - fl), RY(21 + fl)], [X(19), RY(25)], [X(29), RY(18)]], COL.red);
    poly(c, [[X(26), RY(8)], [X(18), RY(12)], [X(14), RY(19)], [X(21), RY(19)], [X(28), RY(14)]], COL.redL);
    // нога
    poly(c, [[X(29), RY(24)], [X(36), RY(24)], [X(39), RY(35)], [X(35), RY(36)]], COL.mailD);
    poly(c, [[X(35), RY(34)], [X(39), RY(34)], [X(39), RY(40)], [X(43), RY(42)], [X(34), RY(42)]], COL.leather);
    // кольчуга
    poly(c, [[X(26), RY(6)], [X(38), RY(6)], [X(39), RY(25)], [X(26), RY(26)]], COL.mail);
    c.fillStyle = COL.mailD;
    for (let y = 7; y < 25; y += 2) for (let x = 27 + (y % 4 ? 1 : 0); x < 38; x += 2) c.fillRect(X(x), RY(y), 1, 1);
    rect(c, X(26), RY(22), 13, 2, COL.leather);
    rect(c, X(31), RY(22), 3, 2, COL.gold);
    // голова
    disc(c, X(33), RY(1), 5, COL.skin);
    rect(c, X(35), RY(0), 2, 1, COL.hoof);
    poly(c, [[X(30), RY(3)], [X(38), RY(1)], [X(38), RY(8)], [X(34), RY(10)], [X(30), RY(7)]], "#b8a890");
    rect(c, X(36), RY(5), 2, 1, COL.skinD);
    // шлем
    poly(c, [[X(27), RY(0)], [X(39), RY(0)], [X(37), RY(-5)], [X(33), RY(-11)], [X(29), RY(-5)]], COL.steel);
    poly(c, [[X(29), RY(-1)], [X(32), RY(-1)], [X(32), RY(-8)], [X(30), RY(-5)]], COL.steelL);
    rect(c, X(27), RY(0), 12, 1, COL.gold);
    rect(c, X(36), RY(0), 1, 3, COL.steelD);
    // рука
    if (opt.bow) {
      line(c, X(33), RY(11), X(45), RY(9), COL.mailD, 3);
      rect(c, X(45), RY(8), 3, 3, COL.skin);
    } else if (opt.spear) {
      line(c, X(34), RY(10), X(42), RY(16), COL.mailD, 3);
      rect(c, X(42), RY(15), 3, 3, COL.skin);
      line(c, X(18), RY(19), X(77), RY(9), COL.leather, 1);
      poly(c, [[X(76), RY(6)], [X(83), RY(8)], [X(77), RY(12)]], COL.steelL);
    } else {
      line(c, X(34), RY(10), X(46), RY(14), COL.mailD, 3);
      rect(c, X(46), RY(13), 3, 3, COL.skin);
      line(c, X(47), RY(15), X(53), RY(14 - oy + ry + 0), COL.leather);
    }
  });
}

function soldierSprite(frame, opt = {}) {
  return sprite("sold" + frame + (opt.spear ? "s" : ""), 18, 26, (c) => {
    const k = frame % 2 ? 1 : -1;
    rect(c, 5 + k, 19, 3, 6, COL.black); rect(c, 10 - k, 19, 3, 6, COL.black);
    poly(c, [[4, 9], [14, 9], [14, 20], [4, 20]], COL.blackL);
    rect(c, 4, 13, 10, 1, COL.black);
    disc(c, 9, 6, 4, "#26222e");
    poly(c, [[4, 5], [14, 5], [9, -2]], COL.blackL);
    rect(c, 9, 6, 3, 1, "#d8402c");
    if (opt.spear !== false) {
      line(c, 15, 22, 15, 1, "#2e2820");
      poly(c, [[13, 3], [17, 3], [15, -2]], "#6a6478");
      rect(c, 14, 12, 2, 2, COL.blackL);
    }
  }, "#07050a");
}

function crowSprite(frame) {
  return sprite("crow" + frame, 14, 9, (c) => {
    ell(c, 7, 5, 4, 2, COL.black);
    disc(c, 11, 4, 2, COL.black);
    rect(c, 13, 4, 1, 1, "#7a6a40");
    if (frame % 2) poly(c, [[5, 4], [9, 4], [4, 0]], COL.blackL);
    else poly(c, [[5, 5], [9, 5], [4, 8]], COL.blackL);
    rect(c, 1, 5, 3, 1, COL.black);
  }, null);
}

// Соловей: сидит на суку. pose: 'sit' | 'whistle' | 'bound'; patched — без правого глаза
function soloveySprite(pose = "sit", patched = false, wing = 0) {
  return sprite("sol" + pose + patched + wing, 46, 50, (c) => {
    const ww = wing * 3;
    // крылья-рукава
    poly(c, [[12, 20], [2 - ww, 28], [0 - ww, 36], [7, 34], [12, 32]], COL.featherD);
    poly(c, [[34, 20], [44 + ww, 28], [46 + ww, 36], [39, 34], [34, 32]], COL.featherD);
    for (let i = 0; i < 4; i++) { rect(c, 2 + i * 2 - ww, 30 + i, 2, 4, COL.feather); rect(c, 42 - i * 2 + ww, 30 + i, 2, 4, COL.feather); }
    // тело
    poly(c, [[13, 18], [33, 18], [36, 40], [10, 40]], COL.feather);
    poly(c, [[17, 19], [29, 19], [31, 38], [15, 38]], COL.featherL);
    c.fillStyle = COL.feather;
    for (let y = 21; y < 38; y += 3) for (let x = 16 + (y % 2) * 2; x < 31; x += 4) c.fillRect(x, y, 2, 1);
    // сапоги на суку
    rect(c, 13, 40, 7, 4, COL.featherD); rect(c, 26, 40, 7, 4, COL.featherD);
    rect(c, 12, 44, 8, 2, COL.hoof); rect(c, 26, 44, 8, 2, COL.hoof);
    // голова
    ell(c, 23, 12, 9, 9, COL.skinD);
    ell(c, 23, 12, 8, 8, "#c8956a");
    // шапка-капюшон с гребнем
    poly(c, [[12, 11], [34, 11], [31, 4], [23, -2], [15, 4]], COL.featherD);
    poly(c, [[20, 3], [23, -4], [26, 3]], COL.red);
    // глаза
    if (patched) { line(c, 15, 7, 21, 13, COL.hoof); line(c, 21, 7, 15, 13, COL.hoof); }
    else { rect(c, 16, 10, 4, 3, COL.white); rect(c, 18, 11, 2, 2, "#c82020"); }
    rect(c, 26, 10, 4, 3, COL.white); rect(c, 27, 11, 2, 2, "#c82020");
    rect(c, 15, 8, 6, 1, COL.hoof); rect(c, 25, 8, 6, 1, COL.hoof);
    // нос-клюв
    poly(c, [[21, 12], [25, 12], [25, 17], [23, 21], [21, 17]], COL.beak);
    rect(c, 22, 16, 2, 2, "#a06a20");
    // борода
    poly(c, [[14, 16], [20, 19], [26, 19], [32, 16], [30, 25], [26, 23], [23, 28], [20, 23], [16, 25]], COL.black);
    if (pose === "whistle") {
      ell(c, 23, 20, 3, 3, "#7a1c1c"); rect(c, 22, 19, 2, 2, "#2a0808");
      line(c, 12, 26, 20, 21, COL.featherD, 3); line(c, 34, 26, 26, 21, COL.featherD, 3);
      rect(c, 20, 20, 2, 2, COL.skin); rect(c, 25, 20, 2, 2, COL.skin);
    }
  });
}

function princeSprite(coat = false, frame = 0, hatOff = false) {
  return sprite("pr" + coat + frame + hatOff, 26, 42, (c) => {
    const k = frame % 2 ? 1 : 0;
    rect(c, 8, 33, 4, 7 - k, COL.redD); rect(c, 14, 33, 4, 7 - (1 - k), COL.redD);
    rect(c, 7, 39 - k, 5, 2, COL.goldD); rect(c, 14, 39 - (1 - k), 5, 2, COL.goldD);
    poly(c, [[7, 14], [19, 14], [21, 34], [5, 34]], COL.blue);
    rect(c, 12, 14, 2, 20, COL.gold);
    rect(c, 6, 24, 14, 2, COL.gold);
    if (coat) {
      poly(c, [[6, 13], [13, 13], [6, 34], [2, 34]], COL.fur);
      c.fillStyle = COL.furD; for (let y = 15; y < 33; y += 3) c.fillRect(5 + ((y * 3) % 3), y, 2, 1);
    } else {
      poly(c, [[7, 13], [3, 16], [2, 33], [6, 33]], COL.purple);
      poly(c, [[19, 13], [23, 16], [24, 33], [20, 33]], COL.purple);
      rect(c, 6, 12, 14, 3, COL.fur);
    }
    disc(c, 13, 8, 5, COL.skin);
    rect(c, 14, 7, 2, 1, COL.hoof); rect(c, 10, 7, 2, 1, COL.hoof);
    poly(c, [[9, 9], [17, 9], [15, 15], [13, 16], [11, 15]], "#c49a50");
    if (!hatOff) {
      rect(c, 7, 3, 12, 3, COL.fur);
      poly(c, [[8, 3], [18, 3], [16, -2], [13, -4], [10, -2]], COL.red);
      rect(c, 12, -4, 2, 2, COL.gold);
      rect(c, 7, 4, 12, 1, COL.furD);
    }
  });
}

function muzhikSprite(shirt = COL.white, frame = 0, opt = {}) {
  return sprite("mz" + shirt + frame + JSON.stringify(opt), 22, 30, (c) => {
    const k = frame % 2 ? 1 : 0;
    rect(c, 6, 20, 4, 7 - k, "#4a4050"); rect(c, 11, 20, 4, 7 - (1 - k), "#4a4050");
    rect(c, 5, 26 - k, 5, 2, COL.leather); rect(c, 11, 26 - (1 - k), 5, 2, COL.leather);
    poly(c, [[5, 10], [16, 10], [17, 22], [4, 22]], shirt);
    rect(c, 4, 18, 13, 2, COL.red);
    disc(c, 10, 6, 4, COL.skin);
    poly(c, [[6, 7], [14, 7], [13, 12], [10, 14], [7, 12]], opt.beard || "#8a6a40");
    rect(c, 11, 5, 2, 1, COL.hoof);
    poly(c, [[5, 4], [15, 4], [13, 0], [7, 0]], opt.hat || "#6a4a2a");
    rect(c, 5, 4, 10, 1, "#4a3018");
    if (opt.spear) {
      line(c, 17, 26, 17, 0, COL.leather);
      poly(c, [[15, 2], [19, 2], [17, -3]], COL.steelL);
      rect(c, 15, 13, 3, 2, COL.skin);
    } else if (opt.down) {
      rect(c, 15, 12, 2, 8, shirt);
    }
  });
}

// Девушка по пояс для окна
function girlSprite(col, frame = 0) {
  return sprite("girl" + col + frame, 18, 18, (c) => {
    poly(c, [[3, 10], [15, 10], [16, 18], [2, 18]], col);
    rect(c, 8, 10, 2, 8, COL.gold);
    disc(c, 9, 6, 4, COL.skin);
    rect(c, 7, 5, 1, 2, COL.hoof); rect(c, 11, 5, 1, 2, COL.hoof);
    rect(c, 8, 8, 2, 1, COL.redD);
    poly(c, [[3, 5], [15, 5], [13, -2], [9, -4], [5, -2]], COL.red);
    rect(c, 3, 4, 12, 1, COL.gold);
    if (frame) rect(c, 8, 8, 2, 2, "#5a1010");
    rect(c, 3, 6, 2, 8, "#6a4020");
  });
}

// Портрет говорящего 40×40. kind: narrator, ilya, solovey, solovey2, vladimir, muzhik, daughter1..3
function portrait(kind, mouth = 0, blink = false) {
  return sprite("por" + kind + mouth + blink, 40, 40, (c) => {
    const P = { narrator: "#2a2e5c", ilya: "#2c4470", solovey: "#3a2a28", solovey2: "#3a2a28", vladimir: "#4a2a5c", muzhik: "#3a4a34", daughter1: "#6a2c3c", daughter2: "#5c3a24", daughter3: "#2c5a5c" };
    rect(c, 0, 0, 40, 40, P[kind] || "#2a2e5c");
    c.fillStyle = "rgba(255,255,255,0.05)"; for (let y = 0; y < 40; y += 2) c.fillRect(0, y, 40, 1);
    const shoulders = (col, tr) => { poly(c, [[5, 40], [8, 32], [15, 28], [25, 28], [32, 32], [35, 40]], col); if (tr) rect(c, 15, 28, 10, 2, tr); };
    const face = (skin, shade) => {
      rect(c, 16, 26, 8, 5, shade);
      ell(c, 20, 19, 9, 11, skin);
      poly(c, [[25, 12], [29, 18], [28, 24], [24, 30]], shade);
    };
    const eyes = (col = "#1c1830", y = 16) => {
      if (blink) { rect(c, 14, y + 1, 4, 1, COL.skinD); rect(c, 22, y + 1, 4, 1, COL.skinD); return; }
      rect(c, 14, y, 4, 3, COL.white); rect(c, 22, y, 4, 3, COL.white);
      rect(c, 16, y, 2, 3, col); rect(c, 22, y, 2, 3, col);
    };
    const nose = (col) => { rect(c, 19, 18, 2, 5, col); rect(c, 19, 22, 3, 1, col); };
    const mouthAt = (y, col = "#5a1a1a") => {
      if (mouth) { rect(c, 17, y, 6, 3, "#3a0c0c"); rect(c, 18, y, 4, 1, "#d8c8b0"); }
      else rect(c, 17, y + 1, 6, 1, col);
    };
    if (kind === "narrator") {
      shoulders("#4a5888", COL.gold); face(COL.skin, COL.skinD);
      poly(c, [[10, 14], [12, 6], [20, 4], [28, 6], [30, 14], [26, 11], [14, 11]], COL.white);
      poly(c, [[11, 18], [14, 24], [17, 26], [23, 26], [26, 24], [29, 18], [31, 32], [24, 38], [20, 40], [16, 38], [9, 32]], COL.white);
      poly(c, [[20, 28], [24, 30], [22, 36], [20, 38]], COL.whiteD);
      eyes(); rect(c, 13, 14, 5, 1, COL.whiteD); rect(c, 22, 14, 5, 1, COL.whiteD); nose(COL.skinD); mouthAt(25);
      rect(c, 10, 4, 20, 3, "#2c54a8"); rect(c, 12, 1, 16, 4, "#2c54a8"); rect(c, 10, 6, 20, 1, COL.gold);
    } else if (kind === "ilya") {
      shoulders(COL.mail, COL.mailD);
      c.fillStyle = COL.mailD; for (let y = 31; y < 40; y += 2) for (let x = 8 + (y % 4 ? 1 : 0); x < 32; x += 2) c.fillRect(x, y, 1, 1);
      poly(c, [[3, 40], [6, 32], [12, 29], [12, 40]], COL.red); poly(c, [[37, 40], [34, 32], [28, 29], [28, 40]], COL.red);
      face(COL.skin, COL.skinD);
      poly(c, [[11, 20], [15, 25], [19, 26], [21, 26], [25, 25], [29, 20], [29, 28], [25, 35], [20, 37], [15, 35], [11, 28]], "#b0a088");
      poly(c, [[20, 29], [25, 26], [25, 32], [20, 36]], "#8a7c68");
      eyes(); rect(c, 13, 14, 6, 1, "#4a3a2a"); rect(c, 21, 14, 6, 1, "#4a3a2a"); nose(COL.skinD); mouthAt(25, "#6a2a1a");
      poly(c, [[10, 13], [30, 13], [28, 6], [20, -2], [12, 6]], COL.steel);
      poly(c, [[13, 12], [18, 12], [18, 3], [13, 7]], COL.steelL); poly(c, [[24, 12], [30, 13], [28, 6], [24, 3]], COL.steelD);
      rect(c, 10, 12, 20, 2, COL.gold); rect(c, 19, 12, 2, 7, COL.steelD);
    } else if (kind === "solovey" || kind === "solovey2") {
      shoulders(COL.feather);
      c.fillStyle = COL.featherD; for (let y = 30; y < 40; y += 2) for (let x = 7 + (y % 4 ? 2 : 0); x < 33; x += 4) c.fillRect(x, y, 2, 1);
      face("#c8956a", "#8e6042");
      poly(c, [[11, 20], [15, 24], [25, 24], [29, 20], [29, 30], [25, 28], [20, 36], [15, 28], [11, 30]], COL.black);
      if (kind === "solovey2") { rect(c, 12, 14, 8, 6, COL.white); line(c, 13, 15, 18, 19, "#7a1c1c"); line(c, 18, 15, 13, 19, "#7a1c1c"); }
      else { rect(c, 14, 16, 4, 3, COL.white); rect(c, 15, 16, 2, 3, "#c82020"); }
      if (blink) rect(c, 22, 16, 4, 3, "#8e6042"); else { rect(c, 22, 16, 4, 3, COL.white); rect(c, 23, 16, 2, 3, "#c82020"); }
      poly(c, [[13, 13], [19, 15], [13, 15]], COL.hoof); poly(c, [[27, 13], [21, 15], [27, 15]], COL.hoof);
      poly(c, [[18, 17], [22, 17], [23, 23], [20, 27], [17, 23]], COL.beak); rect(c, 19, 23, 2, 2, "#a06a20");
      mouthAt(27);
      poly(c, [[9, 15], [31, 15], [28, 6], [20, 1], [12, 6]], COL.featherD);
      poly(c, [[18, 2], [20, -3], [23, 2]], COL.red);
      c.fillStyle = COL.feather; for (let y = 5; y < 14; y += 3) for (let x = 12 + (y % 2) * 2; x < 29; x += 4) c.fillRect(x, y, 2, 1);
    } else if (kind === "vladimir") {
      shoulders(COL.purple, COL.gold);
      poly(c, [[7, 33], [12, 29], [28, 29], [33, 33], [31, 36], [9, 36]], COL.fur);
      c.fillStyle = COL.furD; for (let x = 10; x < 31; x += 4) c.fillRect(x, 32, 1, 2);
      face(COL.skin, COL.skinD);
      poly(c, [[12, 22], [16, 25], [24, 25], [28, 22], [27, 28], [24, 33], [20, 35], [16, 33], [13, 28]], "#c49a50");
      poly(c, [[20, 28], [24, 26], [24, 31], [20, 34]], "#9a7638");
      eyes(); rect(c, 13, 14, 6, 1, "#7a5a28"); rect(c, 21, 14, 6, 1, "#7a5a28"); nose(COL.skinD); mouthAt(25);
      poly(c, [[12, 11], [28, 11], [26, 3], [20, 0], [14, 3]], COL.red);
      rect(c, 19, -1, 2, 3, COL.gold);
      rect(c, 10, 9, 20, 4, COL.fur); c.fillStyle = COL.furD; for (let x = 11; x < 30; x += 3) c.fillRect(x, 10, 1, 2);
      rect(c, 18, 4, 4, 3, COL.gold);
    } else if (kind === "muzhik") {
      shoulders(COL.white, COL.red); face(COL.skin, COL.skinD);
      poly(c, [[12, 22], [16, 25], [24, 25], [28, 22], [27, 30], [23, 35], [20, 36], [17, 35], [13, 30]], "#8a6a40");
      eyes(); rect(c, 13, 14, 6, 1, "#5a4020"); rect(c, 21, 14, 6, 1, "#5a4020"); nose(COL.skinD); mouthAt(25);
      poly(c, [[10, 12], [30, 12], [27, 5], [13, 5]], "#6a4a2a"); rect(c, 9, 11, 22, 2, "#4a3018");
    } else {
      const v = { daughter1: COL.red, daughter2: COL.blue, daughter3: COL.green }[kind];
      shoulders(v, COL.gold);
      poly(c, [[8, 16], [12, 30], [7, 38], [5, 28]], "#6a4020");
      face(COL.skin, COL.skinD);
      eyes("#20407a", 17); rect(c, 14, 15, 4, 1, "#6a4020"); rect(c, 22, 15, 4, 1, "#6a4020"); rect(c, 19, 20, 2, 3, COL.skinD);
      if (mouth) rect(c, 18, 25, 4, 2, "#7a1c1c"); else rect(c, 18, 25, 4, 1, "#b8342c");
      rect(c, 12, 22, 3, 2, "#e89a88"); rect(c, 25, 22, 3, 2, "#e89a88");
      poly(c, [[10, 14], [30, 14], [29, 6], [24, 1], [20, 0], [16, 1], [11, 6]], v);
      poly(c, [[13, 13], [27, 13], [26, 7], [20, 3], [14, 7]], COL.gold);
      c.fillStyle = COL.white; for (let x = 14; x < 27; x += 3) c.fillRect(x, 10, 1, 1);
      rect(c, 10, 13, 20, 2, COL.white);
    }
  }, null);
}

// Дуб с дуплом и суком для Соловья
function oakSprite() {
  return sprite("oak", 150, 170, (c) => {
    poly(c, [[62, 170], [70, 90], [64, 66], [90, 66], [84, 96], [96, 170]], "#4a3020");
    poly(c, [[66, 170], [73, 96], [68, 70], [76, 70], [76, 170]], "#6a4a30");
    c.fillStyle = "#33211a"; for (let i = 0; i < 40; i++) c.fillRect(64 + hash(i) * 28, 72 + hash(i * 2) * 96, 1, 2 + hash(i * 3) * 8);
    line(c, 72, 90, 22, 68, "#4a3020", 7);
    line(c, 84, 92, 136, 66, "#4a3020", 7);
    line(c, 80, 74, 104, 40, "#4a3020", 5);
    const blob = (x, y, r) => { disc(c, x, y, r, "#234a2a"); disc(c, x - r * 0.2, y - r * 0.25, r * 0.78, "#2f6a3a"); disc(c, x - r * 0.4, y - r * 0.45, r * 0.42, "#4a8e4a"); };
    blob(30, 46, 30); blob(116, 44, 30); blob(74, 30, 30); blob(52, 56, 22); blob(98, 60, 22);
    c.fillStyle = "#18361e"; for (let i = 0; i < 80; i++) c.fillRect(6 + hash(i * 1.3) * 136, 10 + hash(i * 2.9) * 60, 2, 1);
  });
}

function birchSprite() {
  return sprite("birch", 60, 90, (c) => {
    poly(c, [[26, 90], [33, 90], [30, 60], [40, 40], [44, 24], [39, 22], [33, 38], [24, 58]], COL.white);
    c.fillStyle = "#2a2420"; for (let i = 0; i < 14; i++) c.fillRect(27 + hash(i) * 12, 26 + i * 4.5, 3, 1);
    disc(c, 42, 20, 15, "#5a8a3a"); disc(c, 30, 16, 12, "#6e9e44"); disc(c, 52, 24, 9, "#4a7a30");
    c.fillStyle = "#c8c040"; for (let i = 0; i < 16; i++) c.fillRect(20 + hash(i * 3.3) * 38, 6 + hash(i * 7.3) * 26, 1, 1);
  });
}

function crossSprite() {
  return sprite("cross", 22, 36, (c) => {
    rect(c, 9, 0, 4, 36, COL.bay); rect(c, 3, 8, 16, 4, COL.bay); rect(c, 6, 16, 10, 3, COL.bay);
    rect(c, 10, 1, 1, 34, COL.bayL); rect(c, 4, 9, 14, 1, COL.bayL);
  });
}
function cupSprite(fill) {
  return sprite("cup" + fill, 14, 14, (c) => {
    poly(c, [[1, 1], [13, 1], [10, 9], [4, 9]], COL.gold);
    rect(c, 2, 2, 10, 1, fill ? "#7a2030" : COL.goldL);
    rect(c, 6, 9, 2, 3, COL.goldD); rect(c, 3, 12, 8, 2, COL.gold);
    rect(c, 4, 4, 2, 3, COL.goldL);
  });
}
