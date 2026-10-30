import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import { createHash } from 'node:crypto';

import { sleep } from '../../lib/format.js';

export class UploadError extends Error {
  constructor(message, { status, retryable = false, body } = {}) {
    super(message);
    this.name = 'UploadError';
    this.status = status;
    this.retryable = retryable;
    this.body = body;
  }
}

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

/** MD5 файла — Яндекс Диск возвращает md5 в метаданных, по нему проверяем целостность. */
export async function md5File(filePath) {
  const hash = createHash('md5');
  for await (const chunk of fs.createReadStream(filePath)) hash.update(chunk);
  return hash.digest('hex');
}

/**
 * Загружает файл целиком одним PUT по ссылке из API.
 * При обрыве соединения, таймауте и 429/5xx берёт новую ссылку и грузит файл заново.
 * onRetry(error, attempt, attempts) — сообщить о повторе.
 */
export async function uploadFile({
  api,
  filePath,
  remotePath,
  overwrite = false,
  retries = 2,
  idleTimeoutMs = 300000,
  onProgress,
  onRetry,
}) {
  const size = fs.statSync(filePath).size;
  const attempts = Math.max(1, (Number(retries) || 0) + 1);
  let lastError = null;

  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) await sleep(Math.min(30000, 1000 * 2 ** (attempt - 1)));

    // Повтор — с overwrite: первая попытка могла успеть создать файл на Диске.
    const link = await api.getUploadLink(remotePath, { overwrite: overwrite || attempt > 0 });
    try {
      await putFile({ href: link.href, filePath, size, idleTimeoutMs, onProgress });
      return { href: link.href, size };
    } catch (error) {
      lastError = asUploadError(error);
      if (!lastError.retryable || attempt === attempts - 1) break;
      onRetry?.(lastError, attempt + 1, attempts);
    }
  }

  throw lastError || new UploadError('Загрузка не удалась');
}

/**
 * Ошибка сокета (ECONNRESET, EPIPE, socket hang up, ETIMEDOUT…) — повод повторить.
 * Ошибки чтения локального файла приходят уже как UploadError без retryable.
 */
function asUploadError(error) {
  if (error instanceof UploadError) return error;
  const code = error?.code ? ` (${error.code})` : '';
  return new UploadError(`Обрыв соединения с сервером загрузки${code}: ${error?.message || error}`, {
    retryable: true,
  });
}

async function putFile({ href, filePath, size, idleTimeoutMs, onProgress }) {
  const url = new URL(href);
  const transport = url.protocol === 'http:' ? http : https;

  const headers = {
    'Content-Type': 'application/octet-stream',
    'Content-Length': String(size),
  };

  const response = await new Promise((resolve, reject) => {
    const request = transport.request(url, { method: 'PUT', headers }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          body: Buffer.concat(chunks).toString('utf8').slice(0, 500),
        });
      });
      res.on('error', reject);
    });

    request.setTimeout(idleTimeoutMs, () => {
      request.destroy(new UploadError('Таймаут: сервер загрузки не отвечает', { retryable: true }));
    });
    request.on('error', reject);

    if (size === 0) {
      request.end();
      onProgress?.(0);
      return;
    }

    const stream = fs.createReadStream(filePath);
    let sent = 0;
    stream.on('data', (chunk) => {
      sent += chunk.length;
      onProgress?.(sent);
    });
    stream.on('error', (error) => {
      request.destroy(new UploadError(`Не удалось прочитать ${filePath}: ${error.message}`));
    });
    stream.pipe(request);
  });

  const { status, body } = response;
  if (status >= 200 && status < 300) return;

  throw new UploadError(`Сервер загрузки ответил ${status}${body ? `: ${body}` : ''}`, {
    status,
    retryable: RETRYABLE_STATUS.has(status),
    body,
  });
}
