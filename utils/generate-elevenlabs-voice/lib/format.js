export function formatNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value ?? '—');
  return String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function formatDuration(seconds) {
  const s = Number(seconds);
  if (!Number.isFinite(s) || s < 0) return '—';
  const total = Math.round(s * 10) / 10;
  const minutes = Math.floor(total / 60);
  const rest = total - minutes * 60;
  if (minutes > 0) {
    const restText = rest < 10 ? `0${rest.toFixed(1)}` : rest.toFixed(1);
    return `${minutes}:${restText}`;
  }
  return `${rest.toFixed(1)} с`;
}

export function formatUsd(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  if (n === 0) return '$0';
  if (n < 0.01) return `$${n.toFixed(4)}`;
  if (n < 1) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(2)}`;
}

export function formatDate(unixSeconds) {
  const seconds = Number(unixSeconds);
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  const date = new Date(seconds * 1000);
  if (Number.isNaN(date.getTime())) return '—';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
