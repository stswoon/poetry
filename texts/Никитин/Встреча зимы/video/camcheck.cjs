// node camcheck.js — скорость камеры по кадрам (экранные px за кадр) и скачки
const fs = require("fs");
const html = fs.readFileSync("index.html", "utf8");
const CFG = JSON.parse(html.match(/const CFG = (\{.*\});<\/script>/)[1]);
const src = ["core.js", "layout.js"].map((f) => fs.readFileSync("src/" + f, "utf8")).join("\n");
const stub = "const Motion = { spring: () => { throw 0; } }; const document = { createElement: () => ({ getContext: () => ({}) }) };" +
  ["sceneCover","sceneA1","sceneA2","sceneA3","sceneA4","sceneB1","sceneB2","sceneB3","sceneB4","sceneC1","sceneC2","sceneC3","sceneD1","sceneD2","sceneE1","sceneE2","sceneE3","sceneF1","sceneBack"].map((n) => `function ${n}(){}`).join("");
const f = new Function("CFG", stub + src + "; return { camAt, SHOTS };");
const { camAt, SHOTS } = f(CFG);
let prev = null, worst = [];
for (let i = 0; i < CFG.total * 30; i++) {
  const t = i / 30, c = camAt(t);
  if (prev) {
    const v = Math.hypot(c.cx - prev.cx, c.cy - prev.cy) * c.z, zr = Math.abs(Math.log(c.z / prev.z)) * 100;
    worst.push([v + zr * 20, t, v.toFixed(1), zr.toFixed(2)]);
  }
  prev = c;
}
worst.sort((a, b) => b[0] - a[0]);
console.log("макс. панорама px/кадр и зум %/кадр:"); worst.slice(0, 12).forEach((w) => console.log(`t=${w[1].toFixed(2)} pan=${w[2]} zoom=${w[3]}`));
const EVv = CFG.ev; console.log("E6", EVv.E6, "L7", EVv.L7, "E8", EVv.E8, "L9", EVv.L9, "L10", EVv.L10);
SHOTS.forEach((s, i) => { if (s.t > 10 && s.t < 22) console.log("shot", i, s.t.toFixed(2), s.r.id); });
for (let t = 16.4; t < 18.4; t += 0.1) { const c = camAt(t); console.log(t.toFixed(2), c.cx.toFixed(0), c.cy.toFixed(0), c.z.toFixed(3)); }
