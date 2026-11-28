// ---------- Проба героев: птичка во всех позах через весь ролик, зонтики ----------
function probeCast() {
  reset(g); g.fillStyle = "#c9b8a8"; g.fillRect(0, 0, W, H);
  const lab = (s, x, y) => { g.fillStyle = "#222"; g.font = "18px monospace"; g.textAlign = "center"; g.fillText(s, x, y); g.textAlign = "left"; };
  const page = CFG.probePage | 0;
  if (page === 0) {
    // 24 момента от появления птички до улёта, каждая в своей клетке, крупно
    const t0 = EV.L1 + 0.6, t1 = EV.E8 + 0.4, n = 24;
    for (let i = 0; i < n; i++) {
      const t = lerp(t0, t1, i / (n - 1)), st = birdState(t);
      const cx = 160 + (i % 6) * 320, cy = 150 + Math.floor(i / 6) * 260;
      const s2 = { ...st, x: cx, y: cy, s: 1.15, paint: 1 };
      if (st.perched) { g.strokeStyle = P.bark; g.lineWidth = 16; g.beginPath(); g.moveTo(cx - 120, cy + 64 * 1.15 + 8); g.lineTo(cx + 120, cy + 64 * 1.15 + 8); g.stroke(); s2.y = cy - st.hop * 1.15; }
      drawBird(g, s2);
      lab(`t=${t.toFixed(2)} ${st.perched ? "сидит" : "летит"} flap=${(st.flap % 1).toFixed(2)}`, cx, cy + 115);
    }
  } else {
    // фазы взмаха крыла по кругу
    for (let i = 0; i < 12; i++) {
      const cx = 200 + (i % 6) * 300, cy = 300 + Math.floor(i / 6) * 400;
      drawBird(g, { x: cx, y: cy, s: 1.4, flap: i / 12, perched: false, alive: 1, look: 0, hop: 0, shake: 0, paint: 1 });
      lab(`flap ${(i / 12).toFixed(2)}`, cx, cy + 140);
    }
  }
}
