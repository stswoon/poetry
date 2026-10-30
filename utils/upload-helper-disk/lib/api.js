import { config } from './config.js';
import { ApiError, parseJson, requestWithRetry } from '../../lib/http.js';

export { ApiError };

function hintForStatus(status) {
  switch (status) {
    case 401:
      return 'Токен не принят. Проверь YANDEX_DISK_TOKEN в корневом .env: node run.js token';
    case 403:
      return 'Нет доступа: проверь права приложения (cloud_api:disk.write для всего Диска или cloud_api:disk.app_folder для папки приложения) и схему пути в --remote (app:/ для папки приложения)';
    case 404:
      return 'Ресурс не найден';
    case 407:
      return 'Требуется авторизация прокси';
    case 409:
      return 'Ресурс с таким путём уже существует';
    case 413:
      return 'Файл слишком большой для загрузки на Диск (ограничение тарифа)';
    case 423:
      return 'Загрузка недоступна: техработы или исчерпан месячный лимит загрузки';
    case 429:
      return 'Слишком много запросов к API, попробуй позже';
    case 507:
      return 'На Диске не хватает свободного места';
    default:
      return null;
  }
}

function describeError(status, text) {
  const body = parseJson(text);
  const detail = body?.message || body?.description || body?.error || '';
  const hint = hintForStatus(status);
  const base = `Яндекс Диск API ${status}${detail ? `: ${detail}` : ''}`;
  return { message: hint ? `${base}\n      ${hint}` : base, code: body?.error, body };
}

const APP_ROOT = 'app:/';

/**
 * Приводит путь на Диске к каноническому виду.
 * Поддерживает обе схемы API: `disk:/foo` (весь Диск) и `app:/foo` (папка приложения).
 * Схема `app:/` сохраняется — с токеном на папку приложения остальные пути дают 403.
 */
export function normalizeRemote(input, fallback = '/') {
  let value = String(input ?? '').trim();
  if (!value) return normalizeRemote(fallback);
  value = value.replace(/\\/g, '/');

  const appScoped = /^app:/i.test(value);
  value = value.replace(/^(?:app|disk):/i, '');
  value = value.replace(/\/{2,}/g, '/');
  if (!value.startsWith('/')) value = `/${value}`;
  if (value.length > 1) value = value.replace(/\/+$/g, '');
  if (!value) value = '/';
  return appScoped ? `app:${value}` : value;
}

/** Разбирает нормализованный путь на корень (`/` или `app:/`) и относительную часть. */
function splitRemote(remotePath) {
  const value = normalizeRemote(remotePath);
  const appScoped = /^app:/i.test(value);
  const rest = appScoped ? value.slice('app:'.length) : value;
  return {
    root: appScoped ? APP_ROOT : '/',
    rel: rest.replace(/^\/+/, ''),
    prefix: appScoped ? 'app:' : '',
  };
}

export function remoteJoin(dir, ...parts) {
  const base = normalizeRemote(dir);
  const tail = parts
    .filter((part) => part !== undefined && part !== null && String(part) !== '')
    .map((part) => String(part).replace(/\\/g, '/').replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');
  if (!tail) return base;
  return normalizeRemote(`${base}/${tail}`);
}

export function remoteParent(remotePath) {
  const { root, rel, prefix } = splitRemote(remotePath);
  if (!rel) return root;
  const index = rel.lastIndexOf('/');
  if (index <= 0) return root;
  return `${prefix}/${rel.slice(0, index)}`;
}

export function remoteBasename(remotePath) {
  const { rel } = splitRemote(remotePath);
  if (!rel) return '';
  return rel.slice(rel.lastIndexOf('/') + 1);
}

/**
 * Клиент REST API Яндекс Диска. Токен передаётся в заголовке Authorization: OAuth <token>.
 * Все методы идемпотентны, поэтому повторяются при 429/5xx и сетевых ошибках.
 */
export function createDiskApi({ token, apiBase = process.env.YANDEX_DISK_API_BASE || config.apiBase } = {}) {
  if (!token) throw new Error('Не задан OAuth-токен Яндекс Диска');

  const base = String(apiBase).replace(/\/+$/, '');
  const createdDirs = new Set();

  function request(method, pathname, { query, body, retries = config.retries.api } = {}) {
    return requestWithRetry({
      url: `${base}${pathname}`,
      query,
      method,
      headers: {
        Authorization: `OAuth ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      timeoutMs: config.timeouts.apiMs,
      retries,
      label: 'API Яндекс Диска',
      describe: describeError,
      read: async (response) => parseJson(await response.text()),
    });
  }

  /** Информация о Диске. Требует прав cloud_api:disk.info или полного доступа к Диску. */
  async function diskInfo() {
    try {
      return await request('GET', '/v1/disk');
    } catch (error) {
      // 403 — токен валиден, но выдан только на папку приложения: сведений о Диске нет.
      if (error instanceof ApiError && error.status === 403) return null;
      throw error;
    }
  }

  async function getResource(remotePath, fields = 'path,name,type,size,md5,modified,created') {
    try {
      return await request('GET', '/v1/disk/resources', {
        query: { path: normalizeRemote(remotePath), fields },
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  }

  /** Создаёт папку и все её родительские папки. */
  async function ensureDir(remotePath) {
    const { rel, prefix } = splitRemote(remotePath);
    if (!rel) return;

    const segments = rel.split('/').filter(Boolean);
    let current = prefix;

    for (const segment of segments) {
      current = `${current}/${segment}`;
      if (createdDirs.has(current)) continue;

      try {
        await request('PUT', '/v1/disk/resources', { query: { path: current } });
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 409) throw error;

        const meta = await getResource(current, 'path,type');
        if (meta?.type !== 'dir') {
          throw new ApiError(`Путь ${current} на Диске занят файлом, а не папкой`, {
            status: 409,
            code: 'PATH_IS_FILE',
          });
        }
      }

      createdDirs.add(current);
    }
  }

  async function getUploadLink(remotePath, { overwrite = false } = {}) {
    const link = await request('GET', '/v1/disk/resources/upload', {
      query: {
        path: normalizeRemote(remotePath),
        overwrite: overwrite ? 'true' : 'false',
      },
    });

    if (!link?.href) {
      throw new ApiError('API не вернул ссылку для загрузки', { code: 'NO_UPLOAD_LINK' });
    }
    if (link.templated) {
      throw new ApiError('API вернул шаблонизированную ссылку загрузки — такой ответ не поддерживается', {
        code: 'TEMPLATED_UPLOAD_LINK',
      });
    }

    return link;
  }

  async function listDir(remotePath, { limit = 100, offset = 0, fields } = {}) {
    return request('GET', '/v1/disk/resources', {
      query: {
        path: normalizeRemote(remotePath),
        limit,
        offset,
        fields: fields || 'path,name,type,size,modified,created,_embedded.items.path,_embedded.items.name,_embedded.items.type,_embedded.items.size,_embedded.items.modified,_embedded.total',
      },
    });
  }

  return {
    apiBase: base,
    request,
    diskInfo,
    getResource,
    ensureDir,
    getUploadLink,
    listDir,
  };
}
