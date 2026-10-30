import { formatBytes } from '../../lib/format.js';

export function formatDuration(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
  return `${m}:${String(rest).padStart(2, '0')}`;
}

export function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Прогресс загрузки в одну строку. В терминале перерисовывает строку через \r,
 * в лог-файле печатает не чаще, чем раз в 25%.
 */
export function makeProgress({ label = '', total, stream = process.stdout } = {}) {
  const startedAt = Date.now();
  let lastReport = 0;
  let lastPercent = -1;
  let lastLength = 0;
  const tty = Boolean(stream.isTTY);

  return (sent) => {
    const now = Date.now();
    const safeTotal = Number(total) || 0;
    const percent = safeTotal > 0 ? Math.min(100, Math.floor((sent / safeTotal) * 100)) : 100;

    if (sent < safeTotal) {
      if (tty && now - lastReport < 1000) return;
      if (!tty && percent < lastPercent + 25 && percent < 100) return;
    }

    lastReport = now;
    lastPercent = percent;

    const elapsed = Math.max(0.001, (now - startedAt) / 1000);
    const speed = sent / elapsed;
    const remaining = speed > 0 ? (safeTotal - sent) / speed : 0;
    const text =
      `    ${String(percent).padStart(3)}%  ${formatBytes(sent)} / ${formatBytes(safeTotal)}` +
      `  ${formatBytes(speed)}/с` +
      (sent < safeTotal ? `  осталось ${formatDuration(remaining)}` : '');
    const prefix = label ? `${label} ` : '';

    if (tty) {
      const line = `${prefix}${text}`;
      stream.write(`\r${line.padEnd(lastLength, ' ')}`);
      lastLength = line.length;
      if (sent >= safeTotal) stream.write('\n');
    } else {
      stream.write(`${prefix}${text}\n`);
    }
  };
}
