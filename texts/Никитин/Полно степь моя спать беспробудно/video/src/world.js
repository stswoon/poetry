// ---------- Сцена по времени: что стоит и летает в степи ----------
const CR = { T: 0, base: [0, 0, 0], dir: 0 };
const NESTS = [], GUESTS = [], HAY = [], MOWERS = [], SINGERS = [];
const LARK = { pos: [0, 0, 0] };
let SHADOW_ON = false, SHADOW_K = 0;

function initWorld() {
  initFlight();
  // костёр — центр облёта
  const tm = (ORB.t0 + ORB.t1) / 2, R = ORB.v / (ORB.w * DEG);
  const [fx, fz] = pathPt(tm, 0, R);
  FIRE.pos = [fx, Hx(fx, fz), fz];
  FIRE_MOON_AZ = headAt(tm) + 0.6;
  initSky();
  CAM_AT_CVETY = posXZ(EV.cvety);
  ROAD_S0 = nearPL(ROAD, ...posXZ(EV.sohnet), 1e9).s;
  // журавли: вожак впереди справа, клин тянется назад
  CR.T = EV.karavan; CR.dir = headAt(CR.T) + 5 * DEG;
  const [cx, cz] = pathPt(CR.T, 27, 21);
  CR.base = [cx, camAt(CR.T).y + 8, cz];
  // гнёзда
  const tn = EV.gnezd + 1.0;
  const offs = [[0, 0], [-1.3, 0.9], [1.4, 0.6], [-0.6, 2.2], [1.0, 2.6]];
  offs.forEach(([r, f], k) => { const [x, z] = pathPt(tn, 4.4 + f, r); NESTS.push({ x, z, t: EV.gnezd + 0.1 + k * ((EV.posmotri - EV.gnezd) / 5), seed: k * 1.7 + 0.4, eggs: k === 1 ? 4 : 3 }); });
  // гости: 12 птиц, пятеро садятся на гнёзда
  for (let k = 0; k < 12; k++) {
    const a = k / 12 * TAU + 0.3;
    const land = k < 3;
    const tgt = land ? [NESTS[k + 1].x, Hx(NESTS[k + 1].x, NESTS[k + 1].z) + 0.33, NESTS[k + 1].z] : (() => { const [x, z] = pathPt(tn, 10 + hash(k) * 30, (hash(k * 3) - 0.5) * 40); return [x, Hx(x, z) + 6 + hash(k * 5) * 10, z]; })();
    const start = [tgt[0] + Math.cos(a) * 45, tgt[1] + 18 + hash(k * 7) * 10, tgt[2] + Math.sin(a) * 45];
    const t0 = EV.gosti - 0.5 + k * 0.08, t1 = land ? EV.ponavyut + k * 0.2 : EV.E18 + 1.5 + hash(k) * 1.5;
    GUESTS.push({ start, tgt, t0, t1, land, col: [[150, 116, 82], [120, 104, 90], [170, 132, 90]][k % 3] });
  }
  // жаворонок
  const [lx, lz] = pathPt(EV.zvuki, 18, 1);
  LARK.pos = [lx, Hx(lx, lz) + 13, lz];
  // косцы: эшелоном, идут навстречу камере и чуть влево
  const hm = headAt(EV.lozhis), dm = hm + Math.PI - 30 * DEG;
  const [mx, mz] = pathPt(EV.E22 - 0.25, 0, 10);
  const dmv = [Math.sin(dm), Math.cos(dm)], rmv = [Math.cos(dm), -Math.sin(dm)];
  for (let k = 0; k < 3; k++) {
    const x = mx + rmv[0] * k * 2.6 - dmv[0] * k * 1.7, z = mz + rmv[1] * k * 2.6 - dmv[1] * k * 1.7;
    MOWERS.push({ P: [x, Hx(x, z), z], h: dm, k, dv: dmv });
  }
  // певцы у костра
  for (let k = 0; k < 3; k++) {
    const a = k / 3 * TAU + 0.5, x = FIRE.pos[0] + Math.sin(a) * 2.5, z = FIRE.pos[2] + Math.cos(a) * 2.5;
    SINGERS.push({ P: [x, Hx(x, z), z], h: a + Math.PI, k });
  }
  // копны: вдоль пути выскакивают по одной, дальние — по полю
  for (let k = 0; k < 7; k++) {
    const T = EV.podym + k * (EV.kopnoyu + 0.45 - EV.podym) / 6;
    const [x, z] = pathPt(T + 2.6, 0, (k % 2 ? 1 : -1) * (10 + hash(k) * 4));
    if (Math.hypot(x - FIRE.pos[0], z - FIRE.pos[2]) < 24) continue;
    HAY.push({ x, z, t: T, seed: k * 2.3 });
  }
  const [hx, hz] = posXZ(EV.kopna);
  for (let k = 0; k < 26; k++) {
    const a = hash(k * 4.1) * TAU, d = 60 + hash(k * 2.9) * 260, x = hx + Math.sin(a) * d, z = hz + Math.cos(a) * d;
    if (Math.hypot(x - FIRE.pos[0], z - FIRE.pos[2]) < 24) continue;
    HAY.push({ x, z, t: EV.kopna + d / 260 * (EV.E23 - EV.kopna + 0.4), seed: 20 + k });
  }
  initDetails();
}

function guestPos(G, t) {
  const u = clamp((t - G.t0) / (G.t1 - G.t0));
  const mid = vadd(vlerp(G.start, G.tgt, 0.5), [0, G.land ? 5 : 2, 0]);
  const e = G.land ? easeOut(u) : u;
  const a = vlerp(G.start, mid, e), b = vlerp(mid, G.tgt, e);
  const p = vlerp(a, b, e);
  return { p, u };
}

function drawScene(t) {
  if (t < TO.merge1) { const S = droneState(t); if (vlen(vsub(S.pos, [CAM.x, CAM.y, CAM.z])) > 0.75) drawDrone(t, S); }
  SHADOW_K = ease(inv(EV.E12 + 0.3, EV.E12 + 1.6, t)) * (1 - ease(inv(EV.L17 - 0.2, EV.L17 + 1.2, t)));
  SHADOW_ON = SHADOW_K > 0.001;
  drawTerrain(t);
  drawRoad(t);
  drawStream(t);
  drawFlowers(t);
  drawTufts(t);
  drawDetails(t);
  // копны
  for (const hs of HAY) {
    if (t < hs.t) continue;
    const d = Math.hypot(hs.x - CAM.x, hs.z - CAM.z); if (d > 900) continue;
    haystack(hs.x, hs.z, spr(t, hs.t, 0.55), t, hs.seed);
  }
  // журавли
  if (t > EV.polyub - 0.6 && t < EV.ovragam + 0.5) {
    const fd = [Math.sin(CR.dir), 0, Math.cos(CR.dir)], rd = [Math.cos(CR.dir), 0, -Math.sin(CR.dir)];
    const lead = vadd(CR.base, vsc(fd, 25 * (t - CR.T)));
    for (let k = 0; k <= 8; k++) {
      const arm = k === 0 ? 0 : (k % 2 ? 1 : -1), n = Math.ceil(k / 2);
      const p = vadd(lead, vadd(vsc(fd, -n * 4.4), vadd(vsc(rd, arm * n * 3.6), [0, Math.sin(t * 1.3 + k) * 0.3 - n * 0.25, 0])));
      crane(p, CR.dir, t * 5.4 + k * 0.7, 0.72);
    }
  }
  // гнёзда и гости
  if (t > EV.L17 - 0.5 && t < EV.L20 + 1) {
    for (const N of NESTS) nest(N.x, N.z, spr(t, N.t, 0.5), t, N.seed, N.eggs);
    for (const G of GUESTS) {
      if (t < G.t0) continue;
      const { p, u } = guestPos(G, t);
      if (!G.land && u >= 1) continue;
      const q = guestPos(G, Math.min(t + 0.05, G.t1 + 0.05)), hd = u >= 1 ? Math.atan2(G.tgt[0] - G.start[0], G.tgt[2] - G.start[2]) : Math.atan2(q.p[0] - p[0], q.p[2] - p[2]);
      const sit = G.land && u >= 1;
      beginGroup(sit ? [p[0], p[1] - 0.33, p[2]] : p, sit ? 0.78 : 0);
      smallBird(p, hd, t * 22 + G.t0 * 5, 1.9, { sit, col: G.col });
      endGroup();
    }
  }
  // жаворонок
  if (t > EV.L19 - 0.6 && t < EV.L20 + 1.2) {
    const p = vadd(LARK.pos, [Math.sin(t * 1.7) * 0.4, Math.sin(t * 2.3) * 0.3, 0]);
    smallBird(p, headAt(EV.zvuki) + Math.PI + 0.4, t * 30, 3.6, { crest: true, pitch: 0.5, col: [160, 128, 92] });
  }
  // косцы
  MOWN = [];
  if (t > EV.E20 + 0.2 && t < EV.raspev + 0.2) {
    for (const M of MOWERS) {
      const J = mowPose(M.P, M.h, t - EV.L21 + 2, M.k);
      const cur = vadd(J.pel, vsc([M.dv[0], 0, M.dv[1]], 0.9));
      MOWN.push({ x: cur[0] - M.dv[0] * 40, z: cur[2] - M.dv[1] * 40, dx: M.dv[0], dz: M.dv[1], len: 40, w: 1.3 });
      drawMower(J);
    }
  }
  // костёр и певцы
  const fireA = t < EV.raspev - 0.4 ? 0 : t < ORB.t1 + 0.4 ? ease(inv(EV.raspev - 0.4, EV.raspev + 0.2, t)) : 1 - ease(inv(ORB.t1 + 0.4, EV.rumyan, t));
  LIGHT.point = fireA > 0.01 ? { pos: vadd(FIRE.pos, [0, 0.9, 0]), col: [255, 150, 70], r: 5.5, k: 1.9 * fireA * (0.9 + 0.15 * vn(t * 9, 3)) } : null;
  if (fireA > 0.01) {
    campfire(t, fireA);
    if (t < ORB.t1 + 0.6) for (const S of SINGERS) drawMower(singPose(S.P, S.h, t, S.k));
  }
  drawClouds(t);
}

// ---------- Экранные слои: роса, звук жаворонка, искры костра ----------
function star4(g, x, y, r, a, col) {
  if (a <= 0.01) return;
  g.fillStyle = css(col, a);
  g.beginPath();
  for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4, rr = i % 2 ? r * 0.18 : r; g.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); }
  g.closePath(); g.fill();
}
function drawOverlays(g, t) {
  reset(g);
  // роса
  const dew = pulse2(t, EV.umoisya - 0.2, EV.E5 + 0.9, 0.3);
  if (dew > 0) {
    const R = 70, cell = 1.6;
    const i0 = Math.floor((CAM.x - R) / cell), i1 = Math.floor((CAM.x + R) / cell), j0 = Math.floor((CAM.z - R) / cell), j1 = Math.floor((CAM.z + R) / cell);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const hs = hash2(i * 1.1 + 9, j * 0.7 - 3); if (hs > 0.2) continue;
      const x = (i + hash2(i, j + 1)) * cell, z = (j + hash2(i + 1, j)) * cell;
      const p = project([x, Hx(x, z) + 0.1, z]); if (!p || p[2] > R) continue;
      const tw = Math.pow(Math.max(0, Math.sin(t * 7 + hs * 90)), 3);
      star4(g, p[0], p[1], (8 + 16 * tw) * clamp(25 / p[2], 0.5, 2.0), dew * (0.4 + 0.6 * tw), [240, 252, 255]);
    }
  }
  // кольца песни жаворонка
  if (t > EV.zvuki - 0.2 && t < EV.E20) {
    const p = project(LARK.pos);
    if (p) {
      g.globalCompositeOperation = "lighter";
      for (let k = 0; k < 5; k++) {
        const ph = ((t - EV.zvuki) * 0.9 + k / 5) % 1;
        if (t - EV.zvuki + 0.2 < k * 0.2) continue;
        const r = (30 + ph * 330) * clamp(40 / p[2], 0.5, 2);
        g.strokeStyle = `rgba(255,236,170,${(0.55 * (1 - ph) * (1 - inv(EV.E19 + 1.5, EV.E20, t))).toFixed(3)})`;
        g.lineWidth = 5 * (1 - ph) + 1;
        ngon(g, p[0], p[1], r, 10, t * 0.3); g.stroke();
      }
      g.globalCompositeOperation = "source-over";
    }
  }
  // свечение костра и искры
  const fireA = t < EV.raspev - 0.4 ? 0 : t < ORB.t1 + 0.4 ? ease(inv(EV.raspev - 0.4, EV.raspev + 0.2, t)) : 1 - ease(inv(ORB.t1 + 0.4, EV.rumyan, t));
  if (fireA > 0.01) {
    const p = project(vadd(FIRE.pos, [0, 0.8, 0]));
    if (p) {
      g.globalCompositeOperation = "lighter";
      const r = 2600 / p[2] * (0.95 + 0.1 * vn(t * 8, 1));
      const gl = g.createRadialGradient(p[0], p[1], 0, p[0], p[1], r);
      gl.addColorStop(0, `rgba(255,170,80,${(0.5 * fireA).toFixed(3)})`); gl.addColorStop(0.4, `rgba(255,120,50,${(0.18 * fireA).toFixed(3)})`); gl.addColorStop(1, "rgba(255,100,40,0)");
      g.fillStyle = gl; g.fillRect(p[0] - r, p[1] - r, r * 2, r * 2);
      for (let i = 0; i < 46; i++) {
        const life = 1.6 + hash(i) * 1.2, ph = ((t + hash(i * 3) * 5) / life) % 1;
        const sp = [FIRE.pos[0] + Math.sin(i * 2.3 + ph * 3) * (0.2 + ph * 0.8), FIRE.pos[1] + 0.8 + ph * (3.5 + hash(i * 7) * 3), FIRE.pos[2] + Math.cos(i * 1.7 + ph * 2) * (0.2 + ph * 0.8)];
        const q = project(sp); if (!q) continue;
        const a = fireA * (1 - ph) * 0.95;
        g.fillStyle = `rgba(255,${(200 - ph * 90) | 0},90,${a.toFixed(3)})`;
        const s = clamp(60 / q[2], 1.5, 6);
        g.fillRect(q[0] - s / 2, q[1] - s / 2, s, s);
      }
      g.globalCompositeOperation = "source-over";
    }
  }
  drawDust(g, t);
  const fl = droneFlash(t);
  if (fl > 0.01) { reset(g); g.fillStyle = `rgba(248,250,255,${(0.92 * fl).toFixed(3)})`; g.fillRect(0, 0, W, H); }
  // снег во вступлении: пока камера стоит — хлопья падают, в полёте летят навстречу дрону
  const sn = 1 - ease(inv(EV.carstvo - 0.5, EV.carstvo + 0.8, t));
  const fw = ease(inv(TO.merge0, TO.merge1, t));
  if (sn > 0.01) {
    for (let i = 0; i < 140; i++) {
      const a = hash(i * 1.37) * TAU, per = 1.4 + hash(i * 2.9) * 1.2;
      const ph = ((t + hash(i * 5.1) * per) / per) % 1;
      const r = 40 + Math.pow(ph, 2.2) * 1300;
      const fx = hash(i * 9.3) * W + Math.sin(t * 0.8 + i) * 30, fy = ((hash(i * 4.4) + t * (0.08 + hash(i) * 0.06)) % 1) * H;
      const x = lerp(fx, W / 2 + Math.cos(a) * r * 1.2, fw), y = lerp(fy, H / 2 + Math.sin(a) * r * 0.8 + ph * 60, fw);
      const sz = lerp(1.8 + hash(i * 2.2) * 2.6, 1.5 + ph * ph * 7, fw);
      g.fillStyle = `rgba(250,252,255,${(sn * 0.85 * lerp(1, Math.min(1, ph * 4), fw)).toFixed(3)})`;
      ngon(g, x, y, sz, 6, i); g.fill();
    }
  }
  // молочный туман строфы 7: мягкий слой от горизонта вниз и медленные клубы
  const fa = MIST.on * ease(inv(EV.otdohni - 0.6, EV.usni + 0.8, t));
  if (fa > 0.01) {
    g.save(); g.translate(W / 2, H / 2); g.rotate(CAM.roll);
    const hy = Math.tan(CAM.pitch) * F;
    const mc = MIST.col;
    const fg = g.createLinearGradient(0, hy - 30, 0, hy + 700);
    fg.addColorStop(0, css(mc, 0)); fg.addColorStop(0.08, css(mc, 0.75 * fa)); fg.addColorStop(1, css(mc, 0.45 * fa));
    g.fillStyle = fg; g.fillRect(-1800, hy - 30, 3600, 2600);
    for (let i = 0; i < 9; i++) {
      const x = ((hash(i * 3.7) * 3000 + t * (18 + i * 4)) % 3400) - 1700, y = hy + 80 + hash(i * 1.9) * 520, r = 260 + hash(i * 5.3) * 300;
      const rg = g.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, css(mix(mc, [255, 255, 255], 0.3), 0.35 * fa)); rg.addColorStop(1, css(mc, 0));
      g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    g.restore();
  }
  // золотой блик
  drawFlare(g, t, SKY.gold * 0.9 + 0.5 * pulse2(t, EV.svetlo - 0.1, EV.svetlo + 1.4, 0.25));
}
const pulse2 = (t, a, b, e) => clamp(Math.min((t - a) / e, (b - t) / e));
