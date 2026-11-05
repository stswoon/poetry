// ---------- Альбом: обложка, перевороты страниц, текст и кадр ----------
const ctx = document.getElementById("scene").getContext("2d");
const stageEl = document.getElementById("stage");
const BOARD = "#5b3d22", STACK = "#dccba6", DX0 = -PW / 2; // закрытый альбом сдвинут к центру кадра
const work = [0, 1, 2].map(() => mkCanvas(PW, PH)), coverW = mkCanvas(CW, CH);
const LEFT = [drawLeft1, drawLeft2, drawLeft3, drawLeft4], DECO = [rowan, ryeEar, feather, acorns];

function drawRight(c, s) {
  c.drawImage(PAPER_R[s - 1], 0, 0);
  tag(c, 650, 96, "№ " + s, -0.06);
  DECO[s - 1](c);
}
function left(s, t, i = 0) { const cv = work[i], c = cv.getContext("2d"); c.reset(); LEFT[s - 1](c, t); return cv; }
function right(s, i = 1) { const cv = work[i], c = cv.getContext("2d"); c.reset(); drawRight(c, s); return cv; }

// Кленовый лист падает на обложку в начале и лежит на ней в финале (координаты обложки)
const FALL = { a: 0.2, b: 2.3, x0: 520, y0: -260, x1: 680, y1: 860, r0: -1.3, r1: 0.45 };
function fallingLeaf(t) {
  const f = prog(t, FALL.a, FALL.b), e = 1 - Math.pow(1 - f, 1.6);
  return { x: lerp(FALL.x0, FALL.x1, e) + 70 * Math.sin(f * 7) * (1 - f), y: lerp(FALL.y0, FALL.y1, e), r: lerp(FALL.r0, FALL.r1, e) + 0.5 * Math.sin(f * 8) * (1 - f), sh: 1 + 3 * (1 - f) };
}
function cover(t, withLeaf) {
  const c = coverW.getContext("2d"); c.reset(); c.drawImage(coverC, 0, 0);
  if (withLeaf) leaf(c, FALL.x1, FALL.y1, 210, FALL.r1, "maple", K.orange, K.red, 0.6, { edge: K.rust });
  return coverW;
}

// Лист, переворачиваемый у корешка: side +1 — лежит справа от корешка, −1 — слева. k — видимая ширина 0..1.
function sheet(img, k, side, border) {
  if (k <= 0.004) return;
  const w = PW * k, sh = 1 - k;
  const g = ctx.createLinearGradient(SX + side * w, 0, SX + side * (w + 110), 0);
  g.addColorStop(0, `rgba(35,20,8,${0.4 * sh})`); g.addColorStop(1, "rgba(35,20,8,0)");
  ctx.fillStyle = g; ctx.fillRect(side > 0 ? SX + w : SX - w - 110, PY - 14, 110, PH + 28);
  ctx.save(); ctx.translate(SX, PY + PH / 2); ctx.scale(k, 1 + 0.025 * Math.sin(Math.PI * sh));
  if (img === coverW) ctx.drawImage(coverW, -2, -PH / 2 - 14);
  else {
    if (border) { ctx.fillStyle = BOARD; ctx.fillRect(side > 0 ? -2 : -PW - 16, -PH / 2 - 14, PW + 18, PH + 28); }
    ctx.drawImage(img, side > 0 ? 0 : -PW, -PH / 2);
  }
  ctx.fillStyle = `rgba(30,18,8,${0.3 * sh})`; ctx.fillRect(side > 0 ? 0 : -PW, -PH / 2 - 14, PW + 18, PH + 28);
  ctx.restore();
}
function boardOpen() {
  ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 36; ctx.shadowOffsetY = 16;
  ctx.fillStyle = BOARD; ctx.fillRect(SX - PW - 16, PY - 14, PW * 2 + 32, PH + 28); ctx.restore();
  ctx.fillStyle = STACK; ctx.fillRect(SX - PW - 7, PY + 3, PW * 2 + 14, PH + 3);
  ctx.strokeStyle = "rgba(120,90,50,0.45)"; ctx.lineWidth = 1;
  for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(SX - PW - i * 2, PY + 4); ctx.lineTo(SX - PW - i * 2, PY + PH + 4); ctx.moveTo(SX + PW + i * 2, PY + 4); ctx.lineTo(SX + PW + i * 2, PY + PH + 4); ctx.stroke(); }
}
function boardClosed() {
  ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 36; ctx.shadowOffsetY = 16;
  ctx.fillStyle = BOARD; ctx.fillRect(SX - 2, PY - 14, PW + 18, PH + 28); ctx.restore();
  ctx.fillStyle = STACK; ctx.fillRect(SX, PY + 3, PW + 7, PH + 3);
}
function spine() {
  const g = ctx.createLinearGradient(SX - 22, 0, SX + 22, 0);
  g.addColorStop(0, "rgba(60,38,18,0)"); g.addColorStop(0.5, "rgba(60,38,18,0.35)"); g.addColorStop(1, "rgba(60,38,18,0)");
  ctx.fillStyle = g; ctx.fillRect(SX - 22, PY, 44, PH);
}

function albumState(t) {
  if (t < EV.open) return { m: "closed", dx: DX0 };
  if (t < EV.opene) { const u = sstep(prog(t, EV.open, EV.opene)); return { m: "opening", u, dx: lerp(DX0, 0, u) }; }
  if (t < EV.close) {
    for (const i of [1, 2, 3]) if (t >= EV["f" + i] && t < EV["f" + i + "e"]) return { m: "flip", s: i, u: sstep(prog(t, EV["f" + i], EV["f" + i + "e"])), dx: 0 };
    return { m: "open", s: t < EV.f1 ? 1 : t < EV.f2 ? 2 : t < EV.f3 ? 3 : 4, dx: 0 };
  }
  const dx = lerp(0, DX0, sstep(prog(t, EV.slide, EV.slidee)));
  if (t < EV.closee) return { m: "closing", u: sstep(prog(t, EV.close, EV.closee)), dx };
  return { m: "closed", dx };
}
const kOf = (u) => Math.abs(Math.cos(Math.PI * u));

function drawAlbum(t, st) {
  ctx.save(); ctx.translate(st.dx, 0);
  const landed = t >= FALL.b;
  if (st.m === "closed") {
    boardClosed(); ctx.drawImage(cover(t, landed), SX - 2, PY - 14);
  } else if (st.m === "opening") {
    boardClosed(); ctx.drawImage(right(1), SX, PY);
    if (st.u < 0.5) sheet(cover(t, true), kOf(st.u), 1); else sheet(left(1, t, 2), kOf(st.u), -1, true);
  } else if (st.m === "open") {
    boardOpen(); ctx.drawImage(left(st.s, t, 0), SX - PW, PY); ctx.drawImage(right(st.s), SX, PY); spine();
  } else if (st.m === "flip") {
    boardOpen(); ctx.drawImage(left(st.s, t, 0), SX - PW, PY); ctx.drawImage(right(st.s + 1), SX, PY); spine();
    if (st.u < 0.5) sheet(right(st.s, 2), kOf(st.u), 1); else sheet(left(st.s + 1, t, 2), kOf(st.u), -1);
  } else if (st.m === "closing") {
    boardClosed(); ctx.drawImage(right(4), SX, PY);
    if (st.u < 0.5) sheet(left(4, t, 2), kOf(st.u), -1, true); else sheet(cover(t, true), kOf(st.u), 1);
  }
  ctx.restore();
  // лист падает на обложку (поверх альбома, пока не лёг)
  if (t >= FALL.a && t < FALL.b) { const q = fallingLeaf(t); leaf(ctx, SX - 2 + DX0 + q.x, PY - 14 + q.y, 210, q.r, "maple", K.orange, K.red, 0.6, { edge: K.rust, shadow: q.sh }); }
}

// Тени улетевшей стаи проплывают по обложке в финале
function birdShadows(t) {
  const a0 = EV.slidee + 0.2, f = prog(t, a0, a0 + 2.8); if (f <= 0 || f >= 1) return;
  ctx.save(); ctx.globalAlpha = 0.16 * Math.sin(Math.PI * f);
  for (const b of BIRDS) leafBird(ctx, lerp(260, 1760, f) + b.v[0] * 0.55, 860 + b.v[1] * 0.45 - 90 * f, -0.08, 0.7, b, 1, t * 11 + b.i, 1);
  ctx.restore();
}

// ---------- Текст: слова «пишутся» слева направо под голос ----------
const WORDS = [...document.querySelectorAll(".w")].map((el) => ({ el, at: parseFloat(el.dataset.at), d: parseFloat(el.dataset.d), last: -1 }));
const SHEETS = {}; for (const el of document.querySelectorAll(".sheet")) SHEETS[el.id] = { el, tf: "", op: "", cp: "" };
function setSheet(id, tf, op = "1", cp = "none") {
  const s = SHEETS[id]; if (!s) return;
  if (s.tf !== tf) { s.el.style.transform = tf; s.tf = tf; }
  if (s.op !== op) { s.el.style.opacity = op; s.op = op; }
  if (s.cp !== cp) { s.el.style.clipPath = cp; s.cp = cp; }
}
function textAt(t, st) {
  for (const w of WORDS) {
    const a = clamp((t - w.at) / w.d, 0, 1), key = Math.round(a * 300); if (key === w.last) continue; w.last = key;
    // clip-path только на время, пока слово пишется: много постоянных clip-path тормозят рендер
    w.el.style.opacity = a > 0 ? "1" : "0";
    w.el.style.clipPath = a > 0 && a < 1 ? `inset(0 ${((1 - a) * 100).toFixed(2)}% 0 0)` : "";
  }
  const dx = `translateX(${st.dx.toFixed(2)}px)`;
  // заставка: название на обложке уходит вместе с ней
  if (st.m === "opening") { if (st.u < 0.5) setSheet("card1s", `${dx} scaleX(${kOf(st.u).toFixed(4)})`); else setSheet("card1s", "none", "0"); }
  else setSheet("card1s", dx);
  // строфы: прочитанная уходит с перевёрнутой страницей
  for (let s = 1; s <= 4; s++) {
    if (st.m === "flip" && st.s === s) { if (st.u < 0.5) setSheet("sh" + s, `scaleX(${kOf(st.u).toFixed(4)})`); else setSheet("sh" + s, "none", "0"); }
    else if (s === 4 && st.m === "closing") setSheet("sh4", dx, "1", st.u < 0.5 ? "none" : `inset(0 0 0 ${(SX + PW * kOf(st.u)).toFixed(1)}px)`);
    else setSheet("sh" + s, "none");
  }
  // финал: название на обложке, которая ложится сверху
  if (st.m === "closing" && st.u >= 0.5) setSheet("card2s", `${dx} scaleX(${kOf(st.u).toFixed(4)})`);
  else setSheet("card2s", dx);
}

// ---------- Кадр ----------
function renderAt(t) {
  ctx.reset();
  ctx.drawImage(deskC, 0, 0);
  const st = albumState(t);
  drawAlbum(t, st);
  if (t > EV.f3 && t < EV.close) { warmGlow(ctx, t); }
  flyingBirds(ctx, t);
  if (t >= EV.close && t < EV.close + 0.5) warmGlow(ctx, t);
  birdShadows(t);
  textAt(t, st);
  // лёгкий наезд на заставке и в финале
  let z = 1;
  if (t < EV.open) z = 1 + 0.025 * sstep(t / EV.open); else if (t < EV.opene) z = lerp(1.025, 1, sstep(prog(t, EV.open, EV.opene)));
  else if (t > EV.slidee) z = 1 + 0.035 * sstep(prog(t, EV.slidee, TOTAL));
  stageEl.style.transform = z === 1 ? "none" : `scale(${z.toFixed(5)})`;
}

const seek = (t) => renderAt(t);
window.addEventListener("hf-seek", (e) => seek(e.detail.time));
seek(0);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => seek(0));

const tl = gsap.timeline({ paused: true });
tl.set({}, {}, TOTAL);
window.__timelines = window.__timelines || {};
window.__timelines["main"] = tl;
