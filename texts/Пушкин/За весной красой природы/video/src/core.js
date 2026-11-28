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
// генератор по зерну (для заранее нарисованных кусков стены)
function rng(seed) { let s = (seed * 9301 + 49297) % 233280 || 1; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
// пружина Motion → u(0…1) с перелётом; кадр детерминирован
function makeSpring(stiffness, damping) {
  try {
    const gen = Motion.spring({ keyframes: [0, 1], stiffness, damping, mass: 1 });
    const N = 160, arr = [];
    for (let i = 0; i <= N; i++) arr.push(gen.next(i * 1400 / N).value);
    return (u) => { u = clamp(u); const f = u * N, i = Math.floor(f); return i >= N ? arr[N] : lerp(arr[i], arr[i + 1], f - i); };
  } catch (e) { return (u) => { u = clamp(u); return 1 - Math.cos(u * 9) * Math.exp(-u * 6); }; }
}
const SPRING = makeSpring(260, 14);
const SOFT = makeSpring(140, 18);
const spr = (t, t0, k = 1) => (t <= t0 ? 0 : SPRING((t - t0) / (1.4 * k)));
const sprS = (t, t0, k = 1) => (t <= t0 ? 0 : SOFT((t - t0) / (1.4 * k)));
const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(ease(inv(a, a + fi, t)), 1 - ease(inv(b - fo, b, t)));
const wob = (t, f, ph = 0) => Math.sin(t * f * TAU + ph);
function reset(g) { g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; g.filter = "none"; g.shadowBlur = 0; g.shadowColor = "transparent"; }
function mk(w, h) { const c = document.createElement("canvas"); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; }
// палитра: баллончики
const P = {
  ink: "#1b1830", white: "#fbf8ef", grey: "#8d93a3", fog: "#b9bfcc", fogD: "#6e7487",
  pink: "#ff6fa8", pinkL: "#ffc0d8", leaf: "#38c46b", leafD: "#1f8a4a", bark: "#6a3f2a",
  sun: "#ffcf2e", sunO: "#ff8a1f", red: "#ff4130", field: "#f3d23a", sky: "#4fc3f7",
  sea: "#1f63d6", seaL: "#3aa0ff", seaD: "#163f9e", teal: "#18b5a4", purple: "#8a4fff",
  orange: "#ff7b22", yellow: "#ffd84a", rust: "#c9441c", lime: "#b6f03c",
};
