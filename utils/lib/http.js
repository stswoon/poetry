import { sleep } from './format.js';

export class ApiError extends Error {
  constructor(message, { status, code, body, retryable = false } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.body = body;
    this.retryable = retryable;
  }
}

export const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

export function parseJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Пауза перед повтором: Retry-After из ответа или экспонента 1, 2, 4… с (до 30 с). */
export function retryDelay(response, attempt) {
  const header = response?.headers?.get('retry-after');
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds, 60) * 1000;
    const date = Date.parse(header);
    if (Number.isFinite(date)) return Math.max(0, Math.min(date - Date.now(), 60000));
  }
  return Math.min(30000, 1000 * 2 ** attempt);
}

/**
 * fetch с повторами при 429/5xx и сетевых ошибках.
 *
 * query    — параметры; массив передаётся повтором (?language=ru&language=en).
 * describe — (status, text) → { message, code, body } для ответа с ошибкой.
 * read     — (response) → результат успешного ответа; может бросить ApiError с retryable.
 * label    — кого не удалось достать при сетевой ошибке («API Яндекс Диска»).
 */
export async function requestWithRetry({
  url,
  query,
  method = 'GET',
  headers,
  body,
  timeoutMs,
  retries = 0,
  label = 'API',
  describe,
  read,
}) {
  const target = new URL(url);
  for (const [name, value] of Object.entries(query || {})) {
    for (const item of [].concat(value)) {
      if (item !== undefined && item !== null && item !== '') {
        target.searchParams.append(name, String(item));
      }
    }
  }

  const attempts = Math.max(0, Number(retries) || 0) + 1;

  for (let attempt = 0; ; attempt++) {
    let failed = null;
    try {
      const response = await fetch(target, {
        method,
        headers,
        body,
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        failed = response;
        const details = describe(response.status, await response.text());
        throw new ApiError(details.message, {
          status: response.status,
          code: details.code,
          body: details.body,
          retryable: RETRYABLE_STATUS.has(response.status),
        });
      }

      return await read(response);
    } catch (error) {
      const wrapped =
        error instanceof ApiError
          ? error
          : new ApiError(`Не удалось связаться с ${label}: ${error?.message || error}`, {
              code: 'NETWORK',
              retryable: true,
            });
      if (!wrapped.retryable || attempt >= attempts - 1) throw wrapped;
      await sleep(retryDelay(failed, attempt));
    }
  }
}
