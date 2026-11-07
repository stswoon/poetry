// Проверка баланса: смешивает ../voice.mp3 (со сдвигом V0) и music.wav как в ролике, меряет голос и музыку
// в местах речи (по events.json: L<n>…E<n>) — RMS и K-взвешенно (BS.1770), и громкость смеси (ffmpeg ebur128).
// Запуск: node check_mix.mjs [путь к mix.wav]   (по умолчанию — во временной папке системы)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)), POEM = path.dirname(HERE), SR = 44100;
const EV = JSON.parse(fs.readFileSync(path.join(HERE, 'events.json'), 'utf8'));
const V0 = EV.V0, mixPath = process.argv[2] ?? path.join(os.tmpdir(), 'kvartet_mix.wav');
const nl = Object.keys(EV).filter((k) => /^L\d+$/.test(k)).length;
const speech = Array.from({ length: nl }, (_, i) => [EV[`L${i + 1}`], EV[`E${i + 1}`]]);
const voicePath = path.join(POEM, 'voice.mp3'), musicPath = path.join(HERE, 'music.wav');
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', voicePath, '-i', musicPath, '-filter_complex',
  `[0:a]aresample=${SR},pan=stereo|c0=c0|c1=c0,adelay=${Math.round(V0 * 1000)}:all=1[v];[v][1:a]amix=inputs=2:normalize=0:duration=longest[m]`,
  '-map', '[m]', '-c:a', 'pcm_s16le', mixPath]);
const dec = (p, extra = []) => { const b = execFileSync('ffmpeg', ['-v', 'error', '-i', p, ...extra, '-f', 'f32le', '-ac', '2', '-ar', String(SR), '-'], { maxBuffer: 1 << 30 });
  const x = new Float32Array(b.buffer, b.byteOffset, b.length / 4), L = new Float32Array(x.length / 2), R = new Float32Array(x.length / 2);
  for (let i = 0; i < L.length; i++) { L[i] = x[2 * i]; R[i] = x[2 * i + 1]; } return [L, R]; };
const mus = dec(musicPath), vo = dec(voicePath, ['-af', `pan=stereo|c0=c0|c1=c0,adelay=${Math.round(V0 * 1000)}:all=1`]), mix = dec(mixPath);
function kW(x) { // K-фильтр BS.1770
  const bq = (q, v) => { const y = q.b0 * v + q.b1 * q.x1 + q.b2 * q.x2 - q.a1 * q.y1 - q.a2 * q.y2; q.x2 = q.x1; q.x1 = v; q.y2 = q.y1; q.y1 = y; return y; };
  let K = Math.tan(Math.PI * 1681.974450955533 / SR), Q = 0.7071752369554196; const Vh = 10 ** (3.999843853973347 / 20), Vb = Vh ** 0.4996667741545416;
  let a0 = 1 + K / Q + K * K;
  const s = { b0: (Vh + Vb * K / Q + K * K) / a0, b1: 2 * (K * K - Vh) / a0, b2: (Vh - Vb * K / Q + K * K) / a0, a1: 2 * (K * K - 1) / a0, a2: (1 - K / Q + K * K) / a0, x1: 0, x2: 0, y1: 0, y2: 0 };
  K = Math.tan(Math.PI * 38.13547087602444 / SR); Q = 0.5003270373238773; a0 = 1 + K / Q + K * K;
  const h = { b0: 1, b1: -2, b2: 1, a1: 2 * (K * K - 1) / a0, a2: (1 - K / Q + K * K) / a0, x1: 0, x2: 0, y1: 0, y2: 0 };
  const y = new Float32Array(x.length); for (let i = 0; i < x.length; i++) y[i] = bq(h, bq(s, x[i])); return y;
}
const ms = (chs, wins) => { let s = 0, c = 0; for (const [a, b] of wins) for (let i = Math.floor(a * SR); i < Math.min(chs[0].length, b * SR); i++) { for (const x of chs) s += x[i] * x[i]; c++; } return s / Math.max(1, c); };
const dB = (x) => 10 * Math.log10(Math.max(x, 1e-20)), f1 = (x) => x.toFixed(1);
const kM = mus.map(kW), kV = vo.map(kW);
console.log(`смесь: ${mixPath} (${(mix[0].length / SR).toFixed(3)} с), music.wav ${(mus[0].length / SR).toFixed(3)} с`);
console.log(`в местах речи (${nl} строк): музыка к голосу RMS ${f1(dB(ms(mus, speech)) - dB(ms(vo, speech)))} дБ, K ${f1(dB(ms(kM, speech)) - dB(ms(kV, speech)))} дБ`);
console.log('голос моно в оба канала с полным уровнем — как в make_music.mjs');
console.log('по строкам, RMS дБ:', speech.map((w, i) => `${i + 1}:${f1(dB(ms(mus, [w])) - dB(ms(vo, [w])))}`).join(' '));
let pk = 0; for (const x of mix) for (const v of x) pk = Math.max(pk, Math.abs(v));
console.log(`пик смеси ${f1(20 * Math.log10(pk))} dBFS`);
{ // ebur128 пишет итог в stderr
  const { spawnSync } = await import('node:child_process');
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', mixPath, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
  const I = r.stderr.match(/I:\s+(-?[\d.]+) LUFS/g)?.at(-1), P = r.stderr.match(/Peak:\s+(-?[\d.]+) dBFS/g)?.at(-1);
  console.log(`смесь (до мастера ролика): ${I}, true peak ${P}`);
}
