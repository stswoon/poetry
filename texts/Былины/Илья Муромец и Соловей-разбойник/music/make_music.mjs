// Музыка и шумы ролика кодом: чиптюн 16 бит с гуслями. Мелодии свои.
// Запуск: node make_music.mjs (читает ../timings.json), пишет music.wav.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const T = JSON.parse(fs.readFileSync(path.join(HERE, "../timings.json"), "utf8"));
const V0 = 7.0, OUTRO = 9.0;
const SR = 44100;
const TOTAL = V0 + T.voiceDuration + OUTRO;
const N = Math.ceil(TOTAL * SR);
const L = new Float32Array(N), R = new Float32Array(N);
const FX = [new Float32Array(N), new Float32Array(N)]; // шумы не приглушаем так сильно, как музыку
const S = (n) => T.lines[n - 1].start + V0;
const E = (n) => T.lines[n - 1].end + V0;

let seed = 20261030;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

function addTo(buf, t, n, fn, pan = 0.5) {
  const i0 = Math.floor(t * SR);
  const gl = Math.cos(pan * Math.PI / 2), gr = Math.sin(pan * Math.PI / 2);
  for (let i = 0; i < n; i++) {
    const k = i0 + i;
    if (k < 0 || k >= N) continue;
    const v = fn(i / SR, i);
    buf[0][k] += v * gl; buf[1][k] += v * gr;
  }
}
const MUS = [L, R];

// Гусли: струна Карплуса — Стронга
function pluck(t, m, vel = 0.3, pan = 0.5, dur = 1.8) {
  const f = mtof(m), p = Math.max(2, Math.round(SR / f));
  const d = new Float32Array(p);
  for (let i = 0; i < p; i++) d[i] = (rnd() * 2 - 1);
  let idx = 0, last = 0;
  const damp = 0.5 - 0.02 * Math.max(0, (m - 60)) / 12;
  const n = Math.floor(dur * SR);
  addTo(MUS, t, n, (s, i) => {
    const y = d[idx];
    const nv = 0.996 * (damp * y + (1 - damp) * last);
    last = y; d[idx] = nv; idx = (idx + 1) % p;
    return y * vel * (i < 40 ? i / 40 : 1) * Math.min(1, (n - i) / 2000);
  }, pan);
}
// Лидирующий пульс с вибрато: как рожок консоли
function lead(t, m, dur, vel = 0.14, pan = 0.5, duty = 0.3) {
  const f = mtof(m), n = Math.floor(dur * SR);
  let ph = 0;
  addTo(MUS, t, n, (s, i) => {
    const vib = 1 + 0.006 * Math.sin(2 * Math.PI * 5.2 * s) * Math.min(1, s * 3);
    ph = (ph + f * vib / SR) % 1;
    const e = Math.min(1, s / 0.02) * Math.min(1, (n - i) / 1800) * (0.75 + 0.25 * Math.exp(-s * 6));
    return (ph < duty ? 1 : -1) * e * vel * 0.8 + Math.sin(2 * Math.PI * ph) * e * vel * 0.35;
  }, pan);
}
function bass(t, m, dur, vel = 0.26) {
  const f = mtof(m), n = Math.floor(dur * SR);
  let ph = 0;
  addTo(MUS, t, n, (s, i) => {
    ph = (ph + f / SR) % 1;
    const tri = 4 * Math.abs(ph - 0.5) - 1;
    return tri * vel * Math.min(1, s / 0.005) * Math.min(1, (n - i) / 900) * Math.exp(-s * 1.1);
  });
}
function pad(t, ms, dur, vel = 0.05) {
  const n = Math.floor(dur * SR);
  for (const m of ms) {
    const f = mtof(m);
    for (const det of [-0.003, 0.003]) {
      let ph = rnd(), lp = 0;
      addTo(MUS, t, n, (s, i) => {
        ph = (ph + f * (1 + det) / SR) % 1;
        const saw = 2 * ph - 1;
        lp += 0.05 * (saw - lp);
        return lp * vel * Math.min(1, s / 0.5) * Math.min(1, (n - i) / (0.6 * SR));
      }, det < 0 ? 0.3 : 0.7);
    }
  }
}
function kick(t, vel = 0.5) {
  let ph = 0;
  addTo(MUS, t, Math.floor(0.2 * SR), (s) => { ph += (45 + 110 * Math.exp(-s * 34)) / SR; return Math.sin(2 * Math.PI * ph) * vel * Math.exp(-s * 16); });
}
function warDrum(t, vel = 0.6) {
  let ph = 0;
  addTo(MUS, t, Math.floor(0.7 * SR), (s) => { ph += (58 + 40 * Math.exp(-s * 20)) / SR; return (Math.sin(2 * Math.PI * ph) * 0.9 + (rnd() * 2 - 1) * 0.1 * Math.exp(-s * 30)) * vel * Math.exp(-s * 5); });
}
function noiseHit(buf, t, dur, vel, decay, pan = 0.5, hp = 0) {
  let last = 0;
  addTo(buf, t, Math.floor(dur * SR), (s) => {
    const w = rnd() * 2 - 1, o = w - hp * last;
    last = w;
    return o * vel * Math.exp(-s * decay);
  }, pan);
}
const snare = (t, v = 0.2) => noiseHit(MUS, t, 0.18, v, 22, 0.5, 0.3);
const hat = (t, v = 0.05) => noiseHit(MUS, t, 0.05, v, 90, 0.62, 0.92);
function bell(t, m, vel = 0.14) {
  const f = mtof(m);
  addTo(MUS, t, Math.floor(1.6 * SR), (s) => (Math.sin(2 * Math.PI * f * s) + 0.5 * Math.sin(2 * Math.PI * f * 2.76 * s) * Math.exp(-s * 6) + 0.3 * Math.sin(2 * Math.PI * f * 5.4 * s) * Math.exp(-s * 12)) * vel * Math.exp(-s * 2.4), 0.6);
}

// ---------- партитура ----------
const SCALES = { minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], major: [0, 2, 4, 5, 7, 9, 11], mixo: [0, 2, 4, 5, 7, 9, 10] };
function deg(root, scale, d) {
  const sc = SCALES[scale], o = Math.floor(d / 7), i = ((d % 7) + 7) % 7;
  return root + 12 * o + sc[i];
}
const chord = (root, scale, d) => [deg(root, scale, d), deg(root, scale, d + 2), deg(root, scale, d + 4)];

// Мотивы в ступенях гаммы; null — пауза
const THEME = {
  road: [0, 2, 4, 3, 2, 3, 4, 7, 6, 4, 3, 2, 0, null, 2, 0],
  heroic: [0, 0, 4, 4, 5, 4, 2, null, 3, 3, 2, 3, 4, null, null, null],
  dark: [0, null, 1, 0, null, -2, 0, null, 2, 1, 0, -2, -3, null, null, null],
  boss: [0, 3, 2, 0, 4, 3, 1, 0, -1, 0, 1, 3, 2, 1, 0, null],
  merry: [4, 3, 2, 4, 3, 2, 0, null, 2, 3, 4, 5, 4, 2, 3, null],
  stately: [0, null, 2, 4, 5, null, 4, 2, 3, null, 2, 1, 0, null, null, null],
  warm: [2, 3, 4, null, 4, 5, 4, 2, 0, 2, 3, null, 2, 0, -1, 0],
};

function section(from, to, o) {
  const beat = 60 / o.bpm, bar = beat * 4;
  const chords = o.chords;
  let t = from, b = 0;
  let themeI = 0;
  while (t < to) {
    const d = chords[b % chords.length];
    const c = chord(o.root, o.scale, d);
    if (o.pad) pad(t, c.map((m) => m + 12), bar * 1.05, o.pad);
    if (o.bass) {
      for (const [p, dur] of o.bass) if (t + p * beat < to) bass(t + p * beat, c[0] - 12, dur * beat, o.bassVel || 0.24);
    }
    if (o.arp) {
      o.arp.forEach((idx, i) => {
        if (idx === null) return;
        const tt = t + i * beat * (4 / o.arp.length);
        if (tt >= to) return;
        const m = c[idx % 3] + 12 * Math.floor(idx / 3);
        pluck(tt + (rnd() - 0.5) * 0.006, m + 12, (o.arpVel || 0.2) * (0.8 + rnd() * 0.3), 0.35 + rnd() * 0.3);
      });
    }
    if (o.theme) {
      const th = THEME[o.theme], step = beat * (o.themeStep || 0.5);
      const barSteps = Math.round(4 / (o.themeStep || 0.5));
      for (let i = 0; i < barSteps; i++) {
        const q = th[themeI % th.length]; themeI++;
        const tt = t + i * step;
        if (q === null || tt >= to) continue;
        const m = deg(o.root + 12, o.scale, q + (o.themeUp || 0));
        (o.pluckLead ? (x, y) => pluck(x, y + 12, o.leadVel || 0.22, 0.5) : (x, y) => lead(x, y, step * 0.9, o.leadVel || 0.1, 0.5, o.duty || 0.3))(tt, m);
      }
    }
    if (o.drums === "march") { kick(t); kick(t + 2 * beat); snare(t + beat); snare(t + 3 * beat); for (let i = 0; i < 8; i++) hat(t + i * beat / 2); }
    if (o.drums === "gallop") { for (let i = 0; i < 4; i++) { kick(t + i * beat, 0.32); hat(t + i * beat + beat * 0.5); hat(t + i * beat + beat * 0.75); if (i % 2) snare(t + i * beat, 0.11); } }
    if (o.drums === "war") { warDrum(t); warDrum(t + 1.5 * beat, 0.4); warDrum(t + 3 * beat, 0.5); }
    if (o.drums === "battle") { for (let i = 0; i < 8; i++) { if (i % 4 === 0) kick(t + i * beat / 2, 0.55); if (i % 4 === 2) snare(t + i * beat / 2, 0.24); hat(t + i * beat / 2, 0.06); } warDrum(t, 0.25); }
    if (o.drums === "light") { hat(t + beat); hat(t + 3 * beat); noiseHit(MUS, t, 0.1, 0.05, 40, 0.5, 0.7); }
    if (o.bells) o.bells.forEach(([p, q]) => { if (t + p * beat < to) bell(t + p * beat, deg(o.root + 12, o.scale, q)); });
    t += bar; b++;
  }
}

const ROOT = 50; // ре
section(0, V0, { bpm: 104, root: ROOT, scale: "mixo", chords: [0, 3, 4, 0], pad: 0.06, bass: [[0, 1], [2, 1]], bassVel: 0.3, theme: "heroic", themeUp: 7, leadVel: 0.17, drums: "march", arp: [0, 1, 2, 3, 2, 1, 0, 1], arpVel: 0.16 });
section(V0, S(7), { bpm: 88, root: ROOT, scale: "dorian", chords: [0, 3, 0, 4], pad: 0.04, bass: [[0, 2]], arp: [0, 2, 1, 3, 2, 3, 1, 2], arpVel: 0.22, theme: "road", leadVel: 0.05, drums: "light" });
section(S(7), S(14), { bpm: 64, root: ROOT - 2, scale: "minor", chords: [0, 0, 5, 4], pad: 0.08, bass: [[0, 3]], bassVel: 0.3, theme: "dark", leadVel: 0.04, duty: 0.5, drums: "war" });
section(S(14), S(22), { bpm: 150, root: ROOT - 2, scale: "minor", chords: [0, 5, 3, 4], bass: [[0, 0.5], [0.5, 0.5], [1, 0.5], [1.5, 0.5], [2, 0.5], [2.5, 0.5], [3, 0.5], [3.5, 0.5]], bassVel: 0.28, theme: "boss", leadVel: 0.09, drums: "battle" });
section(S(22), S(41), { bpm: 76, root: ROOT, scale: "dorian", chords: [0, 6, 3, 0], pad: 0.05, bass: [[0, 2]], arp: [0, null, 1, null, 2, null, 1, null], arpVel: 0.2 });
section(S(41), S(49), { bpm: 56, root: ROOT - 1, scale: "minor", chords: [0, 1, 0, 5], pad: 0.11, bass: [[0, 4]], bassVel: 0.3, drums: "war" });
section(S(49), S(51), { bpm: 76, root: ROOT, scale: "dorian", chords: [0, 3], pad: 0.05, arp: [0, 1, 2, 1, 0, 1, 2, 1], arpVel: 0.2 });
section(S(51), S(57), { bpm: 136, root: ROOT, scale: "mixo", chords: [0, 3, 4, 0], pad: 0.03, bass: [[0, 0.75], [1, 0.75], [2, 0.75], [3, 0.75]], theme: "heroic", leadVel: 0.08, drums: "gallop" });
section(S(57), S(61), { bpm: 72, root: ROOT - 2, scale: "minor", chords: [0, 1], pad: 0.08, bass: [[0, 2], [2, 2]], drums: "war" });
section(S(61), S(85), { bpm: 120, root: ROOT - 2, scale: "minor", chords: [0, 1, 5, 4], pad: 0.05, bass: [[0, 0.5], [0.75, 0.25], [1.5, 0.5], [2.25, 0.25], [3, 0.5]], bassVel: 0.28, theme: "boss", leadVel: 0.07, drums: "march" });
section(S(85), S(115), { bpm: 96, root: ROOT, scale: "mixo", chords: [0, 3, 4, 0], pad: 0.03, bass: [[0, 1], [2, 1]], arp: [0, 1, 2, 1, 0, 2, 1, 2], arpVel: 0.18, theme: "merry", pluckLead: true, leadVel: 0.12, drums: "light" });
section(S(115), S(136), { bpm: 112, root: ROOT, scale: "dorian", chords: [0, 3, 0, 4], bass: [[0, 0.5], [1, 0.5], [2, 0.5], [3, 0.5]], arp: [0, null, 2, null, 1, null, 2, null], arpVel: 0.2, theme: "merry", leadVel: 0.05, drums: "light" });
section(S(136), S(153), { bpm: 72, root: ROOT + 2, scale: "major", chords: [0, 3, 4, 0], pad: 0.08, bass: [[0, 2], [2, 2]], theme: "stately", themeStep: 1, leadVel: 0.07, duty: 0.5, bells: [[0, 7], [2, 4]] });
section(S(153), S(203), { bpm: 66, root: ROOT, scale: "dorian", chords: [0, 3, 6, 0, 5, 3, 4, 0], pad: 0.05, bass: [[0, 4]], arp: [0, null, 1, 2, null, 1, null, 2], arpVel: 0.17 });
section(S(203), S(244), { bpm: 84, root: ROOT, scale: "dorian", chords: [0, 5, 3, 4], pad: 0.04, bass: [[0, 1], [2, 1]], arp: [0, 2, 1, 2, 0, 2, 1, 2], arpVel: 0.15, theme: "dark", leadVel: 0.035, drums: "light" });
section(S(244), S(253), { bpm: 120, root: ROOT, scale: "mixo", chords: [0, 4], bass: [[0, 0.25], [2, 0.25]], arp: [2, null, null, 1, null, 0, null, 1], arpVel: 0.2 });
section(S(253), S(261), { bpm: 160, root: ROOT - 1, scale: "minor", chords: [0, 1, 0, 1], pad: 0.14, bass: [[0, 4]], bassVel: 0.36, drums: "battle" });
section(S(261), S(266), { bpm: 54, root: ROOT - 2, scale: "minor", chords: [0, 5], pad: 0.09, bass: [[0, 4]], bassVel: 0.28, drums: "war" });
section(S(266), S(271), { bpm: 76, root: ROOT + 2, scale: "major", chords: [0, 4, 5, 3], pad: 0.07, bass: [[0, 2], [2, 2]], arp: [0, 1, 2, 3, 2, 1, 2, 3], arpVel: 0.2, theme: "warm", leadVel: 0.05 });
section(S(271), TOTAL, { bpm: 84, root: ROOT + 2, scale: "major", chords: [0, 3, 4, 0], pad: 0.09, bass: [[0, 2], [2, 2]], bassVel: 0.3, arp: [0, 1, 2, 3, 2, 3, 4, 3], arpVel: 0.2, theme: "heroic", themeUp: 7, leadVel: 0.15, drums: "march", bells: [[0, 7], [2, 4]] });

// ---------- шумы с причиной в кадре ----------
function hooves(from, to, rate = 3.4, v = 0.05) {
  for (let t = from; t < to; t += 1 / rate) {
    for (const off of [0, 0.07, 0.15]) noiseHit(FX, t + off + (rnd() - 0.5) * 0.008, 0.06, v * (0.7 + rnd() * 0.5), 60, 0.5, 0.2);
  }
}
function whistle(t, dur, v = 0.12) {
  let ph = 0;
  addTo(FX, t, Math.floor(dur * SR), (s) => {
    const u = s / dur;
    const f = 1500 + 1400 * Math.sin(u * Math.PI * 0.5) + 120 * Math.sin(2 * Math.PI * 11 * s);
    ph += f / SR;
    const e = Math.min(1, s / 0.08) * Math.min(1, (dur - s) / 0.2);
    return (Math.sin(2 * Math.PI * ph) + (rnd() * 2 - 1) * 0.2) * v * e;
  });
}
function whip(t) { let ph = 0; addTo(FX, t, Math.floor(0.14 * SR), (s) => { ph += (2600 - s * 14000) / SR; return (Math.sin(2 * Math.PI * ph) * 0.3 + (rnd() * 2 - 1) * 0.7) * 0.16 * Math.exp(-s * 40); }); }
function twang(t) { let ph = 0; addTo(FX, t, Math.floor(0.3 * SR), (s) => { ph += (170 + 40 * Math.exp(-s * 30)) / SR; return ((ph % 1) * 2 - 1) * 0.18 * Math.exp(-s * 14); }); }
function hit(t, v = 0.3) { noiseHit(FX, t, 0.25, v, 16); let ph = 0; addTo(FX, t, Math.floor(0.3 * SR), (s) => { ph += (120 - s * 200) / SR; return Math.sin(2 * Math.PI * ph) * v * Math.exp(-s * 12); }); }
function clink(t, f = 2100, v = 0.1) { addTo(FX, t, Math.floor(0.4 * SR), (s) => (Math.sin(2 * Math.PI * f * s) + Math.sin(2 * Math.PI * f * 1.51 * s) * 0.6) * v * Math.exp(-s * 14), 0.5 + (rnd() - 0.5) * 0.5); }
function creak(t, dur = 1) { let ph = 0; addTo(FX, t, Math.floor(dur * SR), (s) => { ph += (90 + Math.sin(s * 30) * 40) / SR; return (ph % 1 < 0.2 ? 1 : -0.25) * 0.08 * Math.min(1, s * 8) * Math.min(1, (dur - s) * 6); }); }

hooves(V0, S(7) - 0.5, 3.2, 0.045);
hooves(S(14), S(19), 4, 0.05);
hooves(S(51), S(57), 4.6, 0.05);
hooves(S(87), S(89), 3, 0.035);
hooves(S(136), S(137), 2.4, 0.03);
hooves(S(261), S(264) - 1, 3.4, 0.04);
for (let i = 0; i < 26; i++) hit(S(15) + i * (S(18) - S(15)) / 26, 0.05 + rnd() * 0.05);
creak(S(20), 1.2);
whistle(S(41) + 0.1, Math.min(4, S(43) - S(41)), 0.05);
whistle(S(45), 4, 0.05);
whistle(S(61) + 0.05, E(62) - S(61), 0.07);
whip(S(70) + 0.2); whip(S(70) + 0.55); whip(S(70) + 0.9);
twang(S(83)); hit(S(84) - 0.05, 0.22);
hit(S(85) + 1.0, 0.2);
for (let i = 0; i < 3; i++) clink(S(130) + 0.15 + i * 0.17, 1400 + i * 300, 0.06);
creak(S(147), 0.5); hit(S(147) + 0.45, 0.14);
clink(S(252) + 0.7, 1900, 0.08);
whistle(S(253) + 0.02, E(254) - S(253), 0.2);
hit(S(253), 0.35);
for (let i = 0; i < 26; i++) clink(S(256) + rnd() * 1.6, 1800 + rnd() * 2800, 0.06);
noiseHit(FX, S(256), 1.8, 0.1, 3, 0.5, 0.75);
let phSw = 0;
addTo(FX, S(264) + 0.1, Math.floor(0.5 * SR), (s) => { phSw += 0; return (rnd() * 2 - 1) * 0.14 * Math.sin(Math.min(1, s / 0.5) * Math.PI); });
bell(S(264) + 0.55, 62, 0.14);

// ---------- приглушение под голосом ----------
const LOUD = 1.0, DUCK = Math.pow(10, -22.5 / 20), DUCK_FX = Math.pow(10, -7 / 20);
const speech = new Float32Array(Math.ceil(TOTAL * 100));
for (const l of T.lines) {
  const a = Math.floor((l.start + V0 - 0.25) * 100), b = Math.ceil((l.end + V0 + 0.25) * 100);
  for (let i = a; i < b; i++) if (i >= 0 && i < speech.length) speech[i] = 1;
}
// После реплик в паузах между строфами музыка поднимается не сразу: сглаживание 0,6 с
let env = 0;
const smooth = new Float32Array(speech.length);
for (let i = 0; i < speech.length; i++) { const tg = speech[i]; env += (tg - env) * (tg > env ? 0.2 : 0.03); smooth[i] = env; }

// Эхо как в зале консоли
const dL = Math.floor(0.21 * SR), dR = Math.floor(0.27 * SR);
for (let i = 0; i < N; i++) {
  if (i >= dL) L[i] += L[i - dL] * 0.22;
  if (i >= dR) R[i] += R[i - dR] * 0.22;
}
let peak = 0;
for (let i = 0; i < N; i++) {
  const e = smooth[Math.min(smooth.length - 1, Math.floor(i / SR * 100))];
  const g = LOUD + (DUCK - LOUD) * e, gf = 1 + (DUCK_FX - 1) * e;
  L[i] = L[i] * g + FX[0][i] * gf;
  R[i] = R[i] * g + FX[1][i] * gf;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
console.log("пик до нормировки", peak.toFixed(2));
const norm = Math.min(1, 0.85 / peak) ;
const pcm = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  pcm.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(L[i] * norm * 32767))), i * 4);
  pcm.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(R[i] * norm * 32767))), i * 4 + 2);
}
const hdr = Buffer.alloc(44);
hdr.write("RIFF", 0); hdr.writeUInt32LE(36 + pcm.length, 4); hdr.write("WAVEfmt ", 8); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(2, 22);
hdr.writeUInt32LE(SR, 24); hdr.writeUInt32LE(SR * 4, 28); hdr.writeUInt16LE(4, 32); hdr.writeUInt16LE(16, 34); hdr.write("data", 36); hdr.writeUInt32LE(pcm.length, 40);
fs.writeFileSync(path.join(HERE, "music.wav"), Buffer.concat([hdr, pcm]));
console.log("music.wav", TOTAL.toFixed(1), "с");
