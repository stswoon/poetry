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
// генератор по зерну (для заранее запечённых акварельных кусков)
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
// палитра: акварель и тушь на тёплой бумаге
const P = {
  paper: "#f1e6cd", paperD: "#e2d1ad", ink: "#2a2018", inkS: "rgba(42,32,24,",
  sky: "#9fb3c4", skyD: "#6d8297", skyL: "#cdd7dc", cloud: "#8a96a3", cloudD: "#5d6875",
  ochre: "#d89a3a", ochreL: "#ecc26a", rust: "#b8502a", crimson: "#9c2f2a", umber: "#7a4f2c", umberD: "#4e3320",
  olive: "#8b8a45", field: "#c9a85a", fieldD: "#9d7f3e", water: "#7f9bab", waterD: "#506d7e",
  sun: "#f2b544", sunO: "#e0762e", fog: "#f4efe4", snow: "#eef2f4", frost: "#9cb6c8",
  goose: "#8c8a80", gooseD: "#5b5850", gooseL: "#d9d4c4", beak: "#e8822c", eye: "#1a1410",
};
