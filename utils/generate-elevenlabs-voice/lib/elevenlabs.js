import { config } from './config.js';
import { ApiError, parseJson, requestWithRetry } from '../../lib/http.js';

export { ApiError };

function detailText(body) {
  const detail = body?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'string') return item;
        const location = Array.isArray(item?.loc)
          ? item.loc.filter((part) => part !== 'body').join('.')
          : '';
        const message = item?.msg || item?.type || JSON.stringify(item);
        return location ? `${location}: ${message}` : message;
      })
      .join('; ');
  }
  if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
    return detail.message || detail.msg || detail.error || JSON.stringify(detail);
  }
  return body?.message || body?.error || body?.detail || '';
}

function hintForStatus(status, detail) {
  const text = String(detail || '').toLowerCase();
  switch (status) {
    case 401:
      return 'Ключ ElevenLabs не принят. Проверь ELEVENLABS_API_KEY в корневом .env: node run.js key';
    case 402:
      return 'Не хватает средств или кредитов на аккаунте ElevenLabs';
    case 403:
      if (text.includes('192')) return 'Формат 192 kbps требует тариф Creator или выше';
      return 'Нет доступа: возможно, тариф не позволяет этот голос или формат';
    case 404:
      return 'Голос или модель не найдены. Проверь voice_id: node run.js voices';
    case 422:
      if (text.includes('speed') || text.includes('style')) {
        return 'Модель не поддерживает speed/style — убери эти настройки и используй аудио-теги';
      }
      return 'ElevenLabs отклонил параметры запроса';
    case 429:
      return 'Слишком много запросов или превышен лимит параллельных запросов. Повтори позже';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'Ошибка на стороне ElevenLabs. Повтори позже';
    default:
      return null;
  }
}

function describeError(status, text) {
  const parsed = parseJson(text);
  const detail = detailText(parsed) || text.slice(0, 500);
  const hint = hintForStatus(status, detail);
  return {
    message: `ElevenLabs API ${status}${detail ? `: ${detail}` : ''}${hint ? `\n      ${hint}` : ''}`,
    code: parsed?.code || parsed?.status,
    body: parsed,
  };
}

function headerNumber(headers, names) {
  for (const name of names) {
    const value = headers.get(name);
    if (value === null || value === undefined || value === '') continue;
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

async function readJson(response) {
  const text = await response.text();
  const parsed = parseJson(text);
  if (parsed === null) {
    throw new ApiError('ElevenLabs вернул ответ, который не является JSON', {
      status: response.status,
      body: text.slice(0, 500),
    });
  }
  return parsed;
}

async function readAudio(response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.toLowerCase().includes('application/json')) {
    const text = await response.text();
    const parsed = parseJson(text);
    throw new ApiError(
      `ElevenLabs вернул JSON вместо аудио: ${detailText(parsed) || text.slice(0, 500)}`,
      { status: response.status, body: parsed },
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0) {
    throw new ApiError('ElevenLabs вернул пустой аудиофайл', {
      status: response.status,
      code: 'EMPTY_AUDIO',
      retryable: true,
    });
  }

  return {
    buffer,
    headers: response.headers,
    requestId: response.headers.get('request-id'),
    characterCost: headerNumber(response.headers, ['character-cost', 'x-character-count']),
    contentType,
  };
}

export function createElevenLabsApi({ key, apiBase = process.env.ELEVENLABS_API_BASE || config.apiBase } = {}) {
  if (!key) throw new Error('Не задан API-ключ ElevenLabs');

  const base = String(apiBase).replace(/\/+$/, '');

  function request(
    pathname,
    { method = 'GET', query, body, expect = 'json', retries = config.retries, timeoutMs = config.timeouts.apiMs } = {},
  ) {
    const headers = {
      'xi-api-key': key,
      Accept: expect === 'audio' ? '*/*' : 'application/json',
    };
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    return requestWithRetry({
      url: `${base}${pathname}`,
      query,
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      timeoutMs,
      retries,
      label: 'API ElevenLabs',
      describe: describeError,
      read: expect === 'audio' ? readAudio : readJson,
    });
  }

  async function subscription() {
    return request('/v1/user/subscription');
  }

  async function models() {
    return request('/v1/models');
  }

  /** language — список кодов: API ждёт его повтором параметра (?language=ru&language=en). */
  async function listVoices({ pageSize = 20, search, language, gender, pageToken } = {}) {
    return request('/v2/voices', {
      query: {
        page_size: pageSize,
        search,
        gender,
        language,
        next_page_token: pageToken,
      },
    });
  }

  /**
   * Озвучивает один кусок текста. Возвращает аудио и служебные заголовки.
   * Модель и настройки передаются как есть — проверка ограничений v4 в run.js.
   */
  async function textToSpeech({
    voiceId,
    text,
    modelId,
    languageCode,
    voiceSettings,
    outputFormat,
    previousRequestIds,
    previousText,
    nextText,
  }) {
    const body = {
      text,
      model_id: modelId,
      apply_text_normalization: 'auto',
    };

    if (languageCode) body.language_code = languageCode;
    if (voiceSettings && Object.keys(voiceSettings).length > 0) body.voice_settings = voiceSettings;
    if (Array.isArray(previousRequestIds) && previousRequestIds.length > 0) {
      body.previous_request_ids = previousRequestIds.slice(-3);
    } else if (previousText) {
      body.previous_text = previousText;
    }
    if (nextText) body.next_text = nextText;

    return request(`/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
      method: 'POST',
      query: { output_format: outputFormat },
      body,
      expect: 'audio',
      timeoutMs: config.timeouts.generateMs,
    });
  }

  return {
    apiBase: base,
    request,
    subscription,
    models,
    listVoices,
    textToSpeech,
  };
}
