import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

const VIDEO_EXT = new Set(['.mp4', '.mov', '.avi', '.wmv', '.flv', '.mpeg', '.mpg', '.webm', '.mkv', '.m4v', '.3gp']);
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);

export function checkVideo(file) {
  if (!file) throw new Error('Не указан путь к видео (job.video или --video)');
  if (!fs.existsSync(file)) throw new Error(`Видео не найдено: ${file}`);

  const stat = fs.statSync(file);
  if (!stat.isFile()) throw new Error(`Это не файл: ${file}`);
  if (stat.size === 0) throw new Error(`Файл пустой: ${file}`);

  const ext = path.extname(file).toLowerCase();
  if (!VIDEO_EXT.has(ext)) throw new Error(`Формат ${ext} не поддерживается площадками`);

  const limit = config.limits.rutubeFileSizeBytes;
  if (stat.size > limit) {
    throw new Error(`Файл больше лимита RUTUBE (${Math.round(limit / 1024 ** 3)} ГБ)`);
  }

  return { size: stat.size, ext };
}

/**
 * Обложка: явный путь или единственная картинка рядом с видео.
 * «Рядом» — та же папка; приоритет у имён oblozhka/cover/thumb/preview.
 */
export function findThumb(videoFile, explicit) {
  if (explicit) {
    if (!fs.existsSync(explicit)) throw new Error(`Обложка не найдена: ${explicit}`);
    const ext = path.extname(explicit).toLowerCase();
    if (!IMAGE_EXT.has(ext)) throw new Error(`Обложка должна быть jpg/png, а не ${ext}`);
    const size = fs.statSync(explicit).size;
    if (size > 10 * 1024 * 1024) throw new Error('Обложка больше 10 МБ — RUTUBE не примет');
    return explicit;
  }

  const dir = path.dirname(videoFile);
  const images = fs
    .readdirSync(dir)
    .filter((name) => IMAGE_EXT.has(path.extname(name).toLowerCase()))
    .map((name) => path.join(dir, name));

  if (images.length === 0) return null;
  if (images.length === 1) return images[0];

  const preferred = images.filter((file) => /oblozhka|cover|thumb|preview|poster|кадр/i.test(path.basename(file)));
  if (preferred.length === 1) return preferred[0];

  throw new Error(
    `Рядом с видео несколько картинок, непонятно какую брать. Укажи thumb явно. Кандидаты:\n` +
      images.map((f) => `  - ${f}`).join('\n'),
  );
}

export function normalizeText(value) {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .trim();
}

/** Проверка длин под лимиты площадок. Возвращает список предупреждений. */
export function validateMeta(job) {
  const warnings = [];
  const title = normalizeText(job.title);
  if (!title) throw new Error('Не указано название (job.title или --title)');
  if (/\s{2,}/.test(title)) warnings.push('В названии двойные пробелы');

  const description = normalizeText(job.description);
  if (!description) warnings.push('Описание пустое');

  for (const platform of job.platforms) {
    const titleLimit = config.limits.title[platform];
    const descLimit = config.limits.description[platform];
    if (titleLimit && title.length > titleLimit) {
      throw new Error(`Название длиннее ${titleLimit} символов (${title.length}) — не влезет в ${platform}`);
    }
    if (descLimit && description.length > descLimit) {
      throw new Error(`Описание длиннее ${descLimit} символов (${description.length}) — не влезет в ${platform}`);
    }
  }

  return warnings;
}
