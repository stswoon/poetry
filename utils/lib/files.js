import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Корень проекта poetry (utils/lib → ../..). */
export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Папка хелпера по import.meta.url его lib/config.js (lib → ..). */
export function helperRoot(metaUrl) {
  return path.resolve(path.dirname(fileURLToPath(metaUrl)), '..');
}

/** Абсолютный путь; относительный считается от baseDir (по умолчанию cwd). */
export function resolvePath(p, baseDir = process.cwd()) {
  if (!p) return p;
  return path.isAbsolute(p) ? path.normalize(p) : path.resolve(baseDir, p);
}

/** Текстовый файл без BOM: PowerShell `Out-File` пишет UTF-8 с BOM. */
export function readText(file) {
  return fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
}

/** JSON-файл без BOM; ошибка разбора называет файл. */
export function readJson(file) {
  try {
    return JSON.parse(readText(file));
  } catch (error) {
    throw new Error(`Не читается JSON ${file}: ${error.message}`);
  }
}
