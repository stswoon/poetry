import { maskSecret, resolveSecret } from '../../lib/env.js';

/** Токен задаётся в корневом .env или переменной окружения — не через аргументы. */
export const TOKEN_ENV = 'YANDEX_DISK_TOKEN';

const ENV_VARS = [TOKEN_ENV, 'YADISK_TOKEN'];

export function cleanToken(value) {
  if (!value) return null;
  const token = String(value).trim().replace(/^(oauth|bearer)\s+/i, '').trim();
  return token || null;
}

/** Ищет токен: переменные окружения, затем корневой .env. Возвращает { token, source }. */
export function resolveToken() {
  const { value, source } = resolveSecret(ENV_VARS, cleanToken);
  return { token: value, source };
}

export const maskToken = maskSecret;
