import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export function extensionForFormat(format) {
  const value = String(format || '').toLowerCase();
  if (value.startsWith('mp3_')) return '.mp3';
  if (value.startsWith('wav_')) return '.wav';
  if (value.startsWith('opus_')) return '.ogg';
  if (value.startsWith('pcm_')) return '.pcm';
  if (value.startsWith('ulaw_')) return '.ulaw';
  if (value.startsWith('alaw_')) return '.alaw';
  return '.bin';
}

export function isRawFormat(format) {
  const value = String(format || '').toLowerCase();
  return value.startsWith('pcm_') || value.startsWith('ulaw_') || value.startsWith('alaw_');
}

export function hasFfmpeg() {
  return commandWorks('ffmpeg');
}

export function hasFfprobe() {
  return commandWorks('ffprobe');
}

function commandWorks(command) {
  const result = spawnSync(command, ['-version'], { stdio: 'ignore', windowsHide: true });
  return !result.error && result.status === 0;
}

/**
 * Склеивает аудиофайлы одного формата через concat demuxer.
 * Для MP3/WAV/OGG с одинаковыми параметрами перекодирование не нужно.
 */
export function concatAudio(files, outFile) {
  if (!files.length) throw new Error('Нет файлов для склейки');
  if (files.length === 1) {
    fs.copyFileSync(files[0], outFile);
    return;
  }

  const listFile = `${outFile}.concat.txt`;
  const lines = files.map((file) => {
    const normalized = path.resolve(file).replace(/\\/g, '/').replace(/'/g, "'\\''");
    return `file '${normalized}'`;
  });
  fs.writeFileSync(listFile, `${lines.join('\n')}\n`, 'utf8');

  try {
    const result = spawnSync(
      'ffmpeg',
      ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', outFile],
      { encoding: 'utf8', windowsHide: true },
    );

    if (result.error) {
      throw new Error(`Не удалось запустить ffmpeg: ${result.error.message}`);
    }
    if (result.status !== 0) {
      const detail = String(result.stderr || result.stdout || '').trim();
      throw new Error(`ffmpeg не смог склеить аудио${detail ? `:\n${detail}` : ''}`);
    }
  } finally {
    fs.rmSync(listFile, { force: true });
  }
}

/** Длительность аудио в секундах или null, если ffprobe недоступен/не смог. */
export function probeDuration(file) {
  const result = spawnSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file],
    { encoding: 'utf8', windowsHide: true },
  );

  if (result.error || result.status !== 0) return null;
  const duration = Number(String(result.stdout || '').trim());
  return Number.isFinite(duration) && duration >= 0 ? duration : null;
}
