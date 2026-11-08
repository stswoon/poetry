// ---------- Монтаж: сцены по строфам, карточки трейлера, подписи, плёнка ----------
const ctx = document.getElementById("scene").getContext("2d");
const SCENES = [scene1, scene2, scene3, scene4, scene5, scene6, scene7, scene8, scene9, scene10, scene11, scene12, scene13, scene14, scene15, scene16, scene17];
const STARTS = SCENES.map((_, i) => L(i * 6 + 1) - (i === 0 ? 0.45 : 0.45));
// карточки трейлера в паузах между строфами: [текст, строка-начало следующей строфы]
const CARDS = [["ПРОРОЧЕСТВО", 19], ["ГОДЫ СПУСТЯ", 61], ["СУДЬБА", 85]];
const WARM = [0.7, 0.2, 0.3, 0.1, 0.9, 0.4, 0.5, 0.6, 0.9, 0.8, 0.9, 0.5, 0.7, 0.5, 0.6, 0.5, 0.7];

function sceneIndex(t) { let k = -1; for (let i = 0; i < STARTS.length; i++) if (t >= STARTS[i]) k = i; return k; }

function renderAt(t) {
  ctx.reset();
  const k = sceneIndex(t);
  if (t < STARTS[0]) scene0(ctx, t);
  else if (t >= EV.fin - 0.4) sceneFinal(ctx, t);
  else SCENES[k](ctx, t);
  // переход с заставки: из искр
  if (t >= STARTS[0] && t < STARTS[0] + 0.35) fade(ctx, 1 - prog(t, STARTS[0], STARTS[0] + 0.35));
  // в финал — через затемнение
  fade(ctx, win(t, EV.fin - 0.9, EV.fin + 0.1, 0.5, 0.5));
  grade(ctx, k >= 0 ? WARM[k] : 0.3);
  // подложка под строки
  const capK = sstep(prog(t, L(1) - 0.6, L(1) - 0.1)) * (1 - sstep(prog(t, EV.fin - 0.6, EV.fin - 0.2)));
  if (capK > 0) { ctx.save(); ctx.globalAlpha = capK; ctx.fillStyle = linear(ctx, 0, 700, 0, H - BAR, [[0, "rgba(0,0,0,0)"], [0.55, "rgba(0,0,0,0.55)"], [1, "rgba(0,0,0,0.78)"]]); ctx.fillRect(0, 700, W, H - BAR - 700); ctx.restore(); }
  for (const [txt, n] of CARDS) card(ctx, txt, t, LE(n - 1) + 0.1, Math.max(L(n) - 0.12, LE(n - 1) + 1.8), 88);
  vignette(ctx, 0.7);
  grain(ctx, t, 0.08);
  letterbox(ctx, 1);
  textAt(t);
}

// ---------- Подписи: пары строк в нижней трети, слова — под голос ----------
const CAPS = [...document.querySelectorAll(".cap")].map((el) => ({ el, n: +el.dataset.n, big: el.classList.contains("big"), last: "" }));
const WORDS = [...document.querySelectorAll(".cap .w")].map((el) => ({ el, at: +el.dataset.at, last: -1 }));
const ROW = [818, 894];
const NL = CFG.nl;
function capState(n, t) {
  const B = CFG.blocks.find((b) => n >= b[0] && n <= b[1]);
  const Ln = (k) => L(k);
  if (CFG.big.includes(n)) { // крупная строка-карточка по центру
    const hold = n === 42 ? LE(42) + 1.1 : LE(n) + 0.5;
    return { y: 0, op: sstep(prog(t, Ln(n) - 0.15, Ln(n) + 0.1)) * (1 - sstep(prog(t, hold, hold + 0.3))) };
  }
  const next = n < B[1] ? Ln(n + 1) : null;
  const endBlock = B[1] < NL ? Ln(B[1] + 1) - 0.25 : EV.fin - 0.5;
  let y = ROW[1], op = sstep(prog(t, Ln(n) - 0.12, Ln(n) + 0.05));
  if (next !== null) { y = lerp(ROW[1], ROW[0], springSoft(prog(t, next - 0.12, next + 0.6))); op *= lerp(1, 0.72, sstep(prog(t, next - 0.12, next + 0.3))); }
  op *= 1 - sstep(prog(t, endBlock, endBlock + 0.22));
  return { y, op };
}
function textAt(t) {
  for (const cp of CAPS) {
    const s = capState(cp.n, t), key = s.y.toFixed(1) + "|" + s.op.toFixed(3);
    if (key !== cp.last) { cp.el.style.transform = cp.big ? "none" : `translate(0px, ${s.y.toFixed(1)}px)`; cp.el.style.opacity = s.op.toFixed(3); cp.last = key; }
  }
  for (const w of WORDS) {
    const u = prog(t, w.at - 0.08, w.at + 0.35), k = Math.round(u * 400); if (k === w.last) continue; w.last = k;
    const s = springSnap(u);
    w.el.style.opacity = u > 0 ? Math.min(1, u * 4).toFixed(3) : "0";
    w.el.style.transform = u >= 1 ? "none" : `translate(0px, ${((1 - s) * 22).toFixed(1)}px)`;
  }
}

const seek = (t) => renderAt(t);
buildSprites();
window.addEventListener("hf-seek", (e) => seek(e.detail.time));
seek(0);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => seek(0));

const tl = gsap.timeline({ paused: true });
tl.set({}, {}, TOTAL);
window.__timelines = window.__timelines || {};
window.__timelines["main"] = tl;
