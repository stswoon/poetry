import fs from 'node:fs';
import path from 'node:path';

import { config } from './config.js';

const IGNORED_DIRS = new Set([
  '.git',
  '.idea',
  '.profile',
  '.serena',
  '.hyperframes',
  '.thumbnails',
  '.waveform-cache',
  '__pycache__',
  'logs',
  'node_modules',
  'renders',
]);

const TEXTS_DIR = 'texts';

/**
 * Если файл лежит внутри .../texts/<Поэт>/<Стих>/..., возвращает путь от texts:
 * <Поэт>/<Стих>/<файл>. Для файлов вне texts возвращает null.
 * Так работает и `--source texts`, и `--source texts/Пушкин/У лукоморья`:
 * папки поэта и стиха попадают на Диск в любом случае.
 */
function textsRelative(absolute) {
  const parts = path.resolve(absolute).split(path.sep);
  for (let i = parts.length - 2; i >= 0; i--) {
    if (parts[i].toLowerCase() !== TEXTS_DIR) continue;
    const rel = parts.slice(i + 1);
    return rel.length >= 2 ? rel.join('/') : null;
  }
  return null;
}

/**
 * Собирает файлы для загрузки.
 * Для папки сохраняет структуру: texts/Блок/Ночная улица/<файл>.mp4 → Блок/Ночная улица/<файл>.mp4.
 * С --keep-root добавляется имя исходной папки: texts/Блок/... .
 */
export function collectFiles(sources, { all = false, extensions = config.extensions, keepRoot = false } = {}) {
  const allowed = new Set(
    (extensions.length ? extensions : config.extensions).map((ext) => String(ext).replace(/^\./, '').toLowerCase()),
  );
  const files = [];
  const skipped = [];

  for (const source of sources) {
    const absolute = path.resolve(source);
    let stat;
    try {
      stat = fs.statSync(absolute);
    } catch {
      throw new Error(`Не найден источник: ${absolute}`);
    }

    if (stat.isFile()) {
      if (!all && !allowed.has(path.extname(absolute).slice(1).toLowerCase())) {
        throw new Error(
          `Файл не похож на видео: ${absolute}\n` +
            `      Разрешённые расширения: ${[...allowed].join(', ')}. Для любого файла добавь --all.`,
        );
      }
      files.push({
        file: absolute,
        rel: textsRelative(absolute) || path.basename(absolute),
        source: absolute,
        size: stat.size,
      });
      continue;
    }

    if (!stat.isDirectory()) {
      throw new Error(`Источник не файл и не папка: ${absolute}`);
    }

    const rootName = path.basename(absolute);
    const before = files.length;
    walk(absolute, '');
    const found = files.splice(before);

    for (const item of found) {
      const rel = textsRelative(item.file) || (keepRoot ? path.posix.join(rootName, item.rel) : item.rel);
      files.push({ ...item, rel });
    }
  }

  files.sort((a, b) => a.rel.localeCompare(b.rel, 'ru'));

  return {
    files,
    skipped,
    extensions: [...allowed],
  };

  function walk(dir, relDir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (error) {
      throw new Error(`Не удалось прочитать папку ${dir}: ${error.message}`);
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const absolute = path.join(dir, entry.name);

      if (entry.isSymbolicLink()) continue;

      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        walk(absolute, path.posix.join(relDir, entry.name));
        continue;
      }

      if (!entry.isFile()) continue;

      if (!all && !allowed.has(path.extname(entry.name).slice(1).toLowerCase())) {
        skipped.push(absolute);
        continue;
      }

      const stat = fs.statSync(absolute);
      files.push({
        file: absolute,
        rel: path.posix.join(relDir, entry.name),
        source: absolute,
        size: stat.size,
      });
    }
  }
}

export function validateRemoteName(name) {
  const value = String(name);
  if (!value || value === '.' || value === '..') throw new Error('Пустое имя файла на Диске');
  if (value.length > 255) throw new Error(`Слишком длинное имя файла на Диске (${value.length} > 255): ${value}`);
  if (/[\\/]/.test(value) || value.includes('\0')) {
    throw new Error(`Имя файла на Диске не должно содержать слэши: ${value}`);
  }
  return value;
}

export function totalBytes(files) {
  return files.reduce((sum, item) => sum + item.size, 0);
}
