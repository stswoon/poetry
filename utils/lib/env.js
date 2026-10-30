import fs from 'node:fs';
import path from 'node:path';

import { REPO_ROOT } from './files.js';

/** Общий .env в корне проекта. В git не попадает (см. .gitignore), образец — .env.example. */
export const ENV_FILE = path.join(REPO_ROOT, '.env');

/** Читает KEY=VALUE из .env. Отсутствующий файл — пустой объект. */
export function readEnvFile(file = ENV_FILE) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
  } catch {
    return {};
  }

  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim().replace(/^export\s+/, '');
    values[key] = unquote(trimmed.slice(eq + 1).trim());
  }
  return values;
}

function unquote(value) {
  if (value.length < 2) return value;
  const first = value[0];
  const last = value[value.length - 1];
  if (first === last && (first === '"' || first === "'")) return value.slice(1, -1);
  return value;
}

/**
 * Секрет из переменной окружения или корневого .env — ключи никогда не идут через
 * аргументы командной строки. names — имена по приоритету, clean — нормализация значения.
 * Возвращает { value, source } или { value: null, source: null }.
 */
export function resolveSecret(names, clean = (value) => String(value ?? '').trim() || null) {
  for (const name of names) {
    const value = clean(process.env[name]);
    if (value) return { value, source: `переменная окружения ${name}` };
  }

  const env = readEnvFile();
  for (const name of names) {
    const value = clean(env[name]);
    if (value) return { value, source: `${ENV_FILE} (${name})` };
  }

  return { value: null, source: null };
}

export function maskSecret(secret) {
  if (!secret) return '(нет)';
  if (secret.length <= 8) return `${secret.slice(0, 2)}… (${secret.length} симв.)`;
  return `${secret.slice(0, 4)}…${secret.slice(-4)} (${secret.length} симв.)`;
}
