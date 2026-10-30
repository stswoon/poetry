import fs from 'node:fs';
import path from 'node:path';

import { helperRoot, readJson, REPO_ROOT } from '../../lib/files.js';

export { REPO_ROOT };

export const ROOT = helperRoot(import.meta.url);

export const config = readJson(path.join(ROOT, 'config.json'));

/**
 * Ищет стих или файл в нескольких местах:
 * cwd, корень проекта, texts/<путь>, папка утилиты.
 * Возвращает абсолютный путь или null.
 */
export function resolveInputPath(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return null;

  const candidates = [];
  if (path.isAbsolute(raw)) {
    candidates.push(raw);
  } else {
    candidates.push(path.resolve(process.cwd(), raw));
    candidates.push(path.join(REPO_ROOT, raw));
    candidates.push(path.join(REPO_ROOT, 'texts', raw));
    candidates.push(path.join(ROOT, raw));
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return path.normalize(candidate);
  }
  return null;
}

/** Красивый путь для вывода: относительно корня проекта, если он внутри. */
export function displayPath(p) {
  const absolute = path.resolve(p);
  const relative = path.relative(REPO_ROOT, absolute);
  if (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) {
    return relative.split(path.sep).join('/');
  }
  return absolute;
}
