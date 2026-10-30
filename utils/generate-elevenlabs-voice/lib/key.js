import { maskSecret, resolveSecret } from '../../lib/env.js';

/** Ключ задаётся в корневом .env или переменной окружения — не через аргументы. */
export const KEY_ENV = 'ELEVENLABS_API_KEY';

const ENV_VARS = [KEY_ENV, 'XI_API_KEY'];

export function cleanKey(value) {
  if (!value) return null;
  let key = String(value).trim().replace(/^["']|["']$/g, '').trim();
  key = key.replace(/^(xi-api-key|api[-_ ]?key|bearer)\s*[:=]?\s*/i, '').trim();
  return key || null;
}

/** Ищет ключ: переменные окружения, затем корневой .env. Возвращает { key, source }. */
export function resolveKey() {
  const { value, source } = resolveSecret(ENV_VARS, cleanKey);
  return { key: value, source };
}

export const maskKey = maskSecret;
