// ---------- Общие функции: время, пружины, цвет, случайность по зерну ----------
const W = 1920, H = 1080, TAU = Math.PI * 2;
const EV = CFG.ev;
const TOTAL = CFG.total;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, u) => a + (b - a) * u;
const inv = (a, b, v) => clamp((v - a) / (b - a));
const ease = (u) => { u = clamp(u); return u * u * (3 - 2 * u); };
const easeOut = (u) => 1 - Math.pow(1 - clamp(u), 3);
const easeIn = (u) => Math.pow(clamp(u), 3);
const easeIO = (u) => { u = clamp(u); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const hash2 = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7 + 17.13) * 43758.5453; return s - Math.floor(s); };
// пружина Motion → u(0…1) с перелётом; кадр детерминирован
function makeSpring(stiffness, damping) {
  try {
    const gen = Motion.spring({ keyframes: [0, 1], stiffness, damping, mass: 1 });
    const N = 160, arr = [];
    for (let i = 0; i <= N; i++) arr.push(gen.next(i * 1400 / N).value);
    return (u) => { u = clamp(u); const f = u * N, i = Math.floor(f); return i >= N ? arr[N] : lerp(arr[i], arr[i + 1], f - i); };
  } catch (e) { return (u) => { u = clamp(u); return 1 - Math.cos(u * 9) * Math.exp(-u * 6); }; }
}
const SPRING = makeSpring(260, 14);      // бодрая, с перелётом
const SOFT = makeSpring(140, 18);        // мягкая
// k — растяжение по времени: 1 — естественная скорость пружины (~0.8 с), 0.5 — вдвое быстрее
const spr = (t, t0, k = 1) => (t <= t0 ? 0 : SPRING((t - t0) / (1.4 * k)));
const sprS = (t, t0, k = 1) => (t <= t0 ? 0 : SOFT((t - t0) / (1.4 * k)));
// «вкл» с плавным входом и выходом
const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(ease(inv(a, a + fi, t)), 1 - ease(inv(b - fo, b, t)));
// колебание
const wob = (t, f, ph = 0) => Math.sin(t * f * TAU + ph);
const EASEQ = (u) => { u = clamp(u); return u * u; };
// Камера: тряска по зерну (детерминированно от времени)
const shake = (t, amp, f = 9, seed = 0) => [
  amp * (Math.sin(t * f * 1.7 + seed) * 0.6 + Math.sin(t * f * 3.1 + seed * 2.3) * 0.4),
  amp * (Math.sin(t * f * 2.3 + seed * 1.3) * 0.6 + Math.sin(t * f * 4.3 + seed * 0.7) * 0.4),
];
const seg = (t, a, b) => t >= a && t < b;
