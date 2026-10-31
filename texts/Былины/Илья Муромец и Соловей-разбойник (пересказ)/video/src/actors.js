// Актёры: кто говорит, тот шевелит губами и руками; кто стоит, тот дышит.
const talking = (role) => {
  const i = currentLine(lastT);
  if (i < 0) return false;
  const L = LINES[i];
  return L.role === role && lastT <= L.end + 0.05;
};
const flap = (t) => Math.floor(t * 8) % 3 !== 0;
const idleF = (t) => Math.floor(t * 4) % 8;
const rotPt = (px, py, cx, cy, an) => [cx + (px - cx) * Math.cos(an) - (py - cy) * Math.sin(an), cy + (px - cx) * Math.sin(an) + (py - cy) * Math.cos(an)];

// Всадник: якорь как раньше (ступни на y + 71). speed 0 — стоит и дышит, иначе скачет.
function rider(c, x, y, t, o = {}, flip) {
  const { speed = 0, ...rest } = o;
  const opt = Object.assign({}, rest);
  if (speed) { if (speed < 11) opt.walk = true; } else opt.idle = true;
  if (!opt.noRider && talking("илья")) {
    opt.talk = flap(t);
    if (!opt.hand && !opt.bow) opt.hand = [44, Math.floor(t * 2.5) % 2 ? 0 : 6];
  }
  blit(c, riderSprite(speed ? Math.floor(t * speed) % 8 : idleF(t), opt), x, y - 6, flip);
}
// Кисть руки на экране для opt.hand
const handAt = (x, y, h) => [x + 6 + h[0], y + 10 + h[1]];

function ilyaFoot(frame = 0, o = {}) {
  return sprite("ilf" + frame + JSON.stringify(o), 44, 54, (c) => {
    const p = (frame / 8) * Math.PI * 2, k = o.walk ? (frame % 2) : 0;
    const X = (x) => x + 2, Y = (y) => y + 8;
    const fl = Math.sin(p) * 1.6;
    poly(c, [[X(10), Y(14)], [X(4 - fl), Y(18)], [X(2 - fl), Y(34)], [X(10), Y(36)], [X(14), Y(24)]], COL.red);
    rect(c, X(11), Y(30), 5, 9 - k, COL.mailD); rect(c, X(18), Y(30), 5, 9 - (1 - k) * (o.walk ? 1 : 0), COL.mailD);
    rect(c, X(10), Y(38 - k), 7, 3, COL.leather); rect(c, X(18), Y(38 - (o.walk ? 1 - k : 0)), 7, 3, COL.leather);
    poly(c, [[X(10), Y(12)], [X(24), Y(12)], [X(25), Y(32)], [X(9), Y(32)]], COL.mail);
    c.fillStyle = COL.mailD; for (let y = 13; y < 31; y += 2) for (let x = 11 + (y % 4 ? 1 : 0); x < 24; x += 2) c.fillRect(X(x), Y(y), 1, 1);
    rect(c, X(9), Y(25), 16, 2, COL.leather); rect(c, X(15), Y(25), 3, 2, COL.gold);
    const hand = o.hand || [26, 25 + (p > Math.PI ? 1 : 0)];
    disc(c, X(17), Y(6), 6, COL.skin);
    poly(c, [[X(13), Y(9)], [X(23), Y(8)], [X(23), Y(13)], [X(19), Y(16)], [X(14), Y(13)]], "#b8a890");
    rect(c, X(19), Y(4), 3, 3, COL.white); rect(c, X(20), Y(4), 2, 3, COL.hoof);
    rect(c, X(18), Y(3), 5, 1, "#4a3a2a");
    rect(c, X(22), Y(6), 2, 2, COL.skinD);
    if (o.talk) rect(c, X(19), Y(9), 4, 2, "#5a1a1a"); else rect(c, X(19), Y(9), 4, 1, "#7a3a2a");
    poly(c, [[X(10), Y(2)], [X(24), Y(2)], [X(22), Y(-3)], [X(17), Y(-8)], [X(12), Y(-3)]], COL.steel);
    poly(c, [[X(12), Y(1)], [X(15), Y(1)], [X(15), Y(-4)], [X(13), Y(-3)]], COL.steelL);
    rect(c, X(10), Y(2), 14, 1, COL.gold);
    line(c, X(24), Y(15), X(hand[0]), Y(hand[1]), COL.mailD, 3);
    rect(c, X(hand[0]) - 1, Y(hand[1]) - 1, 3, 3, COL.skin);
  });
}
// Пеший Илья: ступни на y + 41
function ilya(c, x, y, t, o = {}, flip) {
  const opt = Object.assign({}, o);
  if (talking("илья")) { opt.talk = flap(t); if (!opt.hand) opt.hand = [28, Math.floor(t * 2.5) % 2 ? 10 : 18]; }
  blit(c, ilyaFoot(o.walk ? Math.floor(t * 8) % 8 : idleF(t), opt), x - 2, y - 8, flip);
}
function prince(c, x, y, t, o = {}) {
  const tk = talking("владимир");
  const gest = o.gest != null ? o.gest : tk ? (Math.floor(t * 2.5) % 2 ? 1 : 2) : 0;
  blit(c, princeSprite(!!o.coat, o.walk ? Math.floor(t * 8) : 0, tk && flap(t), gest), x - 4, y - 4 - (tk && Math.floor(t * 5) % 2 ? 1 : 0));
}
function womanSprite(col, talk, gest) {
  return sprite("wmn" + col + talk + gest, 28, 36, (c) => {
    const X = (x) => x + 3, Y = (y) => y + 4;
    poly(c, [[X(6), Y(12)], [X(15), Y(12)], [X(19), Y(28)], [X(3), Y(28)]], col);
    rect(c, X(10), Y(12), 2, 16, COL.gold);
    const hx = gest === 2 ? 22 : gest === 1 ? 20 : 17, hy = gest === 2 ? 2 : gest === 1 ? 8 : 20;
    line(c, X(15), Y(14), X(hx), Y(hy), col, 2); rect(c, X(hx) - 1, Y(hy) - 1, 3, 3, COL.skin);
    disc(c, X(11), Y(7), 5, COL.skin);
    rect(c, X(8), Y(6), 2, 2, COL.hoof); rect(c, X(13), Y(6), 2, 2, COL.hoof);
    rect(c, X(7), Y(5), 3, 1, "#6a4020"); rect(c, X(12), Y(5), 3, 1, "#6a4020");
    if (talk) rect(c, X(10), Y(9), 3, 2, "#5a1010"); else rect(c, X(10), Y(10), 3, 1, COL.redD);
    poly(c, [[X(5), Y(4)], [X(17), Y(4)], [X(15), Y(-1)], [X(11), Y(-3)], [X(7), Y(-1)]], COL.red);
    rect(c, X(5), Y(3), 12, 1, COL.gold);
    rect(c, X(5), Y(5), 2, 12, "#6a4020");
  });
}
function woman(c, x, y, t, col, role, gest = 0) {
  const tk = role && talking(role);
  blit(c, womanSprite(col, tk && flap(t), tk ? (Math.floor(t * 2.5) % 2 ? 1 : 2) : gest), x - 3, y - 4);
}
// Жена на коленях: руки подняты к богатырю, смотрит вправо (flip — влево)
function kneelWife(c, x, y, t, flip, down) {
  const tk = talking("жена"), up = tk && Math.floor(t * 2.5) % 2;
  const s = sprite("knw" + (tk && flap(t)) + up + down, 34, 30, (cc) => {
    ell(cc, 14, 23, 13, 6, COL.purple); ell(cc, 12, 25, 10, 3, COL.purpleD);
    poly(cc, [[9, 12], [19, 12], [21, 24], [8, 24]], COL.purple);
    rect(cc, 14, 12, 2, 12, COL.gold);
    const hy = down ? 20 : up ? 2 : 7;
    line(cc, 18, 14, 27, hy, COL.purple, 2); rect(cc, 26, hy - 1, 3, 3, COL.skin);
    const hd = down ? 2 : 0;
    disc(cc, 16, 7 + hd, 5, COL.skin);
    rect(cc, 16, 6 + hd, 2, 2, COL.hoof); rect(cc, 20, 6 + hd, 1, 2, COL.hoof);
    if (tk && flap(t)) rect(cc, 17, 9 + hd, 3, 2, "#5a1010"); else rect(cc, 17, 10 + hd, 3, 1, COL.redD);
    poly(cc, [[10, 4 + hd], [22, 4 + hd], [20, -1 + hd], [16, -3 + hd], [12, -1 + hd]], COL.red);
    rect(cc, 10, 3 + hd, 12, 1, COL.gold);
    rect(cc, 10, 5 + hd, 2, 10, "#6a4020");
  });
  blit(c, s, x, y, flip);
}
function solovey(c, x, y, t, pose = "sit", patched = false) {
  const tk = talking("соловей");
  blit(c, soloveySprite(pose, patched, Math.floor(t * (tk ? 6 : 3)) % 2, tk && flap(t)), x, y - (tk && Math.floor(t * 5) % 2 ? 1 : 0));
}
// Соловей висит у стремени поперёк конского бока: ремень короткий, ничего не висит в воздухе
function hangSol(c, hx, hy, t) {
  const tk = talking("соловей");
  const by = hy + 56 + Math.sin(t * 4) * 0.8;
  line(c, hx + 45, hy + 47, hx + 40, by - 6, COL.leather, 2);
  blitRot(c, soloveySprite("bound", true, 0, tk && flap(t)), hx + 36, by, 1.35 + Math.sin(t * 3) * 0.04, 0.62);
}
function falconSprite(frame) {
  return sprite("falc" + (frame % 2), 22, 14, (c) => {
    ell(c, 11, 8, 6, 3, "#8a6a40"); ell(c, 11, 9, 4, 1.6, "#d8c8a0");
    disc(c, 17, 6, 2.6, "#6a4e30"); rect(c, 18, 5, 1, 1, COL.hoof); rect(c, 20, 6, 2, 1, COL.beak);
    poly(c, [[4, 7], [0, 5], [1, 10], [5, 9]], "#5a4428");
    if (frame % 2) poly(c, [[8, 6], [15, 6], [9, 0]], "#6a5030"); else poly(c, [[8, 8], [15, 8], [9, 13]], "#6a5030");
  });
}
function wolfSprite(frame) {
  return sprite("wolf" + (frame % 4), 38, 24, (c) => {
    const k = [0, 2, 0, -2][frame % 4];
    line(c, 7, 12, 1, 8 + k * 0.5, "#6c6c78", 3);
    ell(c, 15, 12, 10, 5, "#7c7c88"); ell(c, 15, 10, 8, 2.5, "#9a9aa6");
    line(c, 8, 15, 6 - k, 21, "#5c5c68", 2); line(c, 12, 15, 13 + k, 21, "#6c6c78", 2);
    line(c, 20, 15, 18 + k, 21, "#5c5c68", 2); line(c, 23, 15, 25 - k, 21, "#6c6c78", 2);
    ell(c, 27, 8, 5, 4, "#8e8e98");
    poly(c, [[30, 7], [37, 9], [36, 11], [30, 11]], "#9a9aa6"); rect(c, 36, 9, 1, 1, COL.hoof);
    poly(c, [[24, 5], [25, 0], [27, 5]], "#6c6c78"); poly(c, [[27, 5], [29, 1], [30, 5]], "#7c7c88");
    rect(c, 28, 6, 2, 2, COL.white); rect(c, 29, 6, 1, 2, COL.hoof);
  });
}
// Змея ползёт волной; dir — куда смотрит
function snake(c, x, y, t, dir = 1) {
  for (let i = 0; i < 26; i++) {
    const px = x - dir * i * 3, py = y + Math.sin(i * 0.65 - t * 7 * dir) * 3;
    rect(c, px, py, 4, 3 + (i < 20 ? 1 : 0), i % 4 === 0 ? "#b8c850" : "#4a8a30");
    rect(c, px, py + 3, 3, 1, "#2e5a20");
  }
  const hy = y + Math.sin(-t * 7 * dir) * 3;
  ell(c, x + dir * 3, hy + 1, 5, 3, "#4a8a30");
  rect(c, x + dir * 4, hy, 2, 2, "#ffe060"); rect(c, x + dir * 4 + (dir > 0 ? 1 : 0), hy, 1, 1, COL.hoof);
  if (Math.floor(t * 4) % 2) { rect(c, x + dir * 8 - (dir < 0 ? 3 : 0), hy + 2, 4, 1, "#d82020"); }
}
// Сундук: kind 0 серебро, 1 золото, 2 жемчуг; open 0..1
function chestSprite(open, kind) {
  return sprite("chest" + open + kind, 42, 36, (c) => {
    const fill = ["#d8e0ec", "#f0c040", "#f8f4e8"][kind], glint = ["#ffffff", "#ffe680", "#d0c8e8"][kind];
    if (open) {
      poly(c, [[4, 16], [38, 16], [36, 2], [6, 2]], "#5a3418"); poly(c, [[6, 14], [36, 14], [34, 5], [8, 5]], "#33200e");
      rect(c, 4, 15, 34, 1, COL.gold);
      ell(c, 21, 16, 15, 6, fill);
      c.fillStyle = glint; for (let i = 0; i < 12; i++) c.fillRect(R(9 + hash(i * 3 + kind) * 24), R(11 + hash(i * 7 + kind) * 7), 2, 2);
    }
    rect(c, 3, 17, 36, 17, "#7a4a22"); rect(c, 3, 17, 36, 2, "#a06a34");
    c.fillStyle = "#4a2c12"; for (const y of [23, 29]) c.fillRect(3, y, 36, 1);
    rect(c, 7, 17, 3, 17, COL.steelD); rect(c, 32, 17, 3, 17, COL.steelD);
    rect(c, 18, 21, 6, 7, COL.gold); rect(c, 20, 23, 2, 3, COL.hoof);
    if (!open) { poly(c, [[3, 17], [39, 17], [37, 9], [31, 6], [11, 6], [5, 9]], "#8a5428"); rect(c, 7, 6, 3, 11, COL.steelD); rect(c, 32, 6, 3, 11, COL.steelD); rect(c, 3, 16, 36, 1, COL.gold); }
  });
}
// Вырванный дуб: pivot — низ ствола
function oakAt(c, bx, by, ang, sc, roots) {
  c.save(); c.translate(R(bx), R(by)); c.rotate(ang); c.scale(sc, sc);
  c.drawImage(oakSprite(), -79, -170);
  if (roots) { for (let i = -3; i <= 3; i++) line(c, i * 3, 0, i * 12, 14 + (3 - Math.abs(i)) * 6, "#4a3020", 3); }
  c.restore();
}
function hallOnPillars(c, t, numbered) {
  rect(c, 150, 36, 200, 84, "#ece4d0"); rect(c, 150, 36, 200, 4, "#a89878");
  poly(c, [[140, 38], [360, 38], [250, 6]], "#7a3030"); poly(c, [[146, 38], [354, 38], [250, 12]], "#8e3e38");
  rect(c, 150, 116, 200, 4, "#a89878");
  for (let i = 0; i < 5; i++) { rect(c, 164 + i * 36, 50, 18, 26, "#231810"); rect(c, 163 + i * 36, 48, 20, 2, COL.gold); }
  for (let i = 0; i < 7; i++) {
    const x = 152 + i * 31;
    rect(c, x, 120, 8, 40, "#8a6a44"); rect(c, x + 1, 120, 2, 40, "#b08a5c"); rect(c, x - 1, 120, 10, 2, COL.gold); rect(c, x - 1, 158, 10, 2, COL.goldD);
  }
  // золочёное крыльцо: ровный цвет, без мигания
  poly(c, [[224, 120], [276, 120], [292, 160], [208, 160]], COL.gold);
  c.fillStyle = COL.goldD; for (let i = 0; i < 5; i++) c.fillRect(222 - i * 3, 124 + i * 8, 56 + i * 6, 1);
  poly(c, [[224, 120], [276, 120], [272, 112], [228, 112]], COL.goldL);
  rect(c, 238, 84, 24, 36, "#2a1a10"); rect(c, 249, 84, 2, 36, "#54381e");
  poly(c, [[230, 84], [270, 84], [250, 72]], COL.gold);
  // номера столбов поверх крыльца, только пока о них говорят
  if (numbered > 0 && numbered < 3.6) for (let i = 0; i < 7; i++) {
    const x = 152 + i * 31, k = springPop(numbered - i * 0.32);
    if (k > 0) { const ny = R(136 - k * 2); rect(c, x - 2, ny - 2, 12, 11, "#120c14"); drawText(c, String(i + 1), x + 1, ny, "#ffd860"); }
  }
}
function bentMeadow(c, y, b, seed, t) {
  for (let i = 0; i < 150; i++) {
    const x = hash(i * 3.1 + seed) * LW, yy = y + hash(i * 1.7 + seed) * (LH - y - 4), h = 3 + hash(i) * 4;
    const dx = b * h * (1 + hash(i * 9)) + Math.sin(t * 8 + i) * b * 1.2;
    line(c, x, yy, x + dx, yy - h * (1 - b * 0.75), i % 3 ? "#2a4a1e" : "#6a8a3a");
    if (i % 7 === 0) { const fall = b * (10 + hash(i * 5) * 40), fx = x + dx + fall * 1.4; if (fall < 40) { rect(c, fx - 1, yy - h, 3, 1, "#6ab0f0"); rect(c, fx, yy - h - 1, 1, 3, "#6ab0f0"); rect(c, fx, yy - h, 1, 1, "#f8e870"); } }
  }
}
