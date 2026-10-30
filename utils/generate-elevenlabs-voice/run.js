#!/usr/bin/env node
/**
 * generate-elevenlabs-voice — голос для стиха через ElevenLabs API (Eleven v4).
 *
 * Команды:
 *   node run.js key
 *   node run.js voices   [--search "..." ] [--language ru] [--limit 20]
 *   node run.js generate --poem "<Поэт>/<Стих>" [--dry-run] [--overwrite]
 *
 * Ключ — только в корневом .env или переменной ELEVENLABS_API_KEY.
 * Подробности — README.md рядом.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { config, displayPath, resolveInputPath } from './lib/config.js';
import { bool, last, number, parseArgs, UsageError } from '../lib/args.js';
import { ENV_FILE } from '../lib/env.js';
import { formatBytes } from '../lib/format.js';
import { ApiError, createElevenLabsApi } from './lib/elevenlabs.js';
import { KEY_ENV, maskKey, resolveKey } from './lib/key.js';
import {
  concatAudio,
  extensionForFormat,
  hasFfmpeg,
  isRawFormat,
  probeDuration,
} from './lib/audio.js';
import {
  codePointLength,
  detectVoice,
  head,
  modelSupportsStitching,
  parseElevenlabsText,
  splitText,
  tail,
} from './lib/text.js';
import {
  formatDate,
  formatDuration,
  formatNumber,
  formatUsd,
} from './lib/format.js';

const VERSION = '1.0.0';

const OUTPUT_FORMATS = new Set([
  'alaw_8000',
  'mp3_22050_32',
  'mp3_24000_48',
  'mp3_44100_128',
  'mp3_44100_192',
  'mp3_44100_32',
  'mp3_44100_64',
  'mp3_44100_96',
  'opus_48000_128',
  'opus_48000_192',
  'opus_48000_32',
  'opus_48000_64',
  'opus_48000_96',
  'pcm_16000',
  'pcm_22050',
  'pcm_24000',
  'pcm_32000',
  'pcm_44100',
  'pcm_48000',
  'pcm_8000',
  'ulaw_8000',
  'wav_16000',
  'wav_22050',
  'wav_24000',
  'wav_32000',
  'wav_44100',
  'wav_48000',
  'wav_8000',
]);

const MODEL_ALIASES = {
  v4: 'eleven_v4',
  'v4-turbo': 'eleven_v4_turbo',
  v4_turbo: 'eleven_v4_turbo',
  turbo: 'eleven_v4_turbo',
  v3: 'eleven_v3',
  v3_conversational: 'eleven_v3_conversational',
  v2: 'eleven_multilingual_v2',
  multilingual: 'eleven_multilingual_v2',
  flash: 'eleven_flash_v2_5',
};

const FORMAT_ALIASES = {
  mp3: 'mp3_44100_128',
  wav: 'wav_44100',
  opus: 'opus_48000_128',
  pcm: 'pcm_44100',
};

const STABILITY_PRESETS = {
  creative: 0,
  natural: 0.5,
  robust: 1,
};

const BOOLEAN_FLAGS = [
  'dry-run',
  'overwrite',
  'no-check',
  'speaker-boost',
  'no-speaker-boost',
  'json',
  'debug',
  'version',
];

const args = parseArgs(process.argv.slice(2), { booleans: BOOLEAN_FLAGS });
const command = args._[0] || 'help';
let debug = false;

main().catch((error) => {
  const message = error?.message || String(error);
  console.error(`\nОшибка: ${message}`);
  if (debug && error?.stack) console.error(error.stack);
  if (command === 'generate') {
    console.log(`RESULT_JSON: ${JSON.stringify({ ok: false, error: message })}`);
  }
  process.exitCode = error instanceof UsageError ? 2 : 1;
});

async function main() {
  debug = bool(args.debug, false, '--debug');
  for (const removed of ['key', 'set', 'clear']) {
    if (args[removed] !== undefined) {
      throw new UsageError(
        `--${removed} больше нет: ключ не передаётся через командную строку.\n` +
          `      Впиши ${KEY_ENV}=<ключ> в ${ENV_FILE} (образец — .env.example)\n` +
          `      или задай переменную окружения ${KEY_ENV}.`,
      );
    }
  }

  if (command === 'version' || command === '--version' || command === '-v' || args.version) {
    console.log(`generate-elevenlabs-voice ${VERSION}`);
    return;
  }

  switch (command) {
    case 'key':
      return keyCommand();
    case 'voices':
      return voicesCommand();
    case 'generate':
      return generateCommand();
    case 'help':
    case '--help':
    case '-h':
      return printHelp();
    default:
      printHelp();
      process.exitCode = 2;
  }
}

// ------------------------------------------------------------------ общее

function resolveKeyOrThrow() {
  const { key, source } = resolveKey();
  if (!key) {
    throw new Error(
      'API-ключ ElevenLabs не найден.\n' +
        `      Впиши ${KEY_ENV}=<ключ> в ${ENV_FILE} (образец — .env.example)\n` +
        `      или задай переменную окружения ${KEY_ENV}.\n` +
        '      Ключ создаётся здесь: https://elevenlabs.io/app/developers/api-keys',
    );
  }
  return { key, source };
}

function apiForKey(key) {
  return createElevenLabsApi({
    key,
    apiBase: process.env.ELEVENLABS_API_BASE || config.apiBase,
  });
}

function printAccount(subscription) {
  const used = Number(subscription?.character_count) || 0;
  const limit = Number(subscription?.character_limit) || 0;

  console.log(`Тариф: ${subscription?.tier || '—'}`);
  if (limit > 0) {
    console.log(
      `Символов: ${formatNumber(used)} / ${formatNumber(limit)} ` +
        `(осталось ${formatNumber(Math.max(0, limit - used))})`,
    );
  } else {
    console.log(`Символов использовано: ${formatNumber(used)}`);
  }
  if (subscription?.next_character_count_reset_unix) {
    console.log(`Сброс лимита: ${formatDate(subscription.next_character_count_reset_unix)}`);
  }
  if (subscription?.status && subscription.status !== 'active') {
    console.log(`Статус: ${subscription.status}`);
  }
}

function printWarnings(warnings) {
  for (const warning of [...new Set(warnings.filter(Boolean))]) {
    console.log(`! ${warning}`);
  }
}

function printHelp() {
  console.log(`generate-elevenlabs-voice ${VERSION} — голос для стиха через ElevenLabs API (Eleven v4)

Команды:
  key        проверить ключ и остаток символов
             node run.js key

  voices     найти голос в библиотеке ElevenLabs
             node run.js voices --language ru --search "male"

  generate   озвучить стих
             node run.js generate --poem "Пушкин/Зимний вечер"
             node run.js generate --poem "texts/Пушкин/Зимний вечер" --dry-run
             node run.js generate --text "D:\\poem.txt" --voice-id <ID> --out "D:\\voice.mp3"

Основные опции generate:
  --poem <путь>        папка стиха с elevenlabs.txt (или путь к самому txt)
  --text <файл>        явный файл с текстом (альтернатива --poem)
  --out <файл>         куда писать аудио (по умолчанию <папка стиха>/voice.mp3)
  --voice-id <ID>      ID голоса; иначе берётся из voice.json или блока «Голос»
  --model <id>         eleven_v4 (по умолчанию), v4-turbo, v3, v2, flash
  --language <код>     язык, по умолчанию ru; "none" — не передавать
  --format <формат>    mp3_44100_128 (по умолчанию), wav_44100, opus_48000_128...
  --stability <0..1>   stability; можно creative / natural / robust
  --similarity <0..1>  similarity_boost
  --style <0..1>       только для моделей, которые поддерживают style
  --speed <0.7..1.2>   только для моделей, которые поддерживают speed
  --speaker-boost      включить speaker boost
  --no-speaker-boost   выключить speaker boost
  --stress keep|strip  знаки ударения U+0301: оставить (по умолчанию) или снять
  --max-chars <N>      максимум символов в одном запросе
  --overwrite          перезаписать готовый voice.mp3
  --dry-run            показать план и цену, не обращаясь к API
  --no-check           не проверять остаток символов перед генерацией
  --debug              печатать стек ошибки

Флаги-переключатели не забирают следующее слово; значение — только через =,
например --dry-run=false.

Ключ читается из переменной ELEVENLABS_API_KEY (или XI_API_KEY), иначе из корневого .env.
Через командную строку ключ не передаётся.

Как устроен elevenlabs.txt:
  - всё до строки «ТЕКСТ ДЛЯ ОЗВУЧКИ» — блок «Голос», он не озвучивается;
  - ниже — только текст стиха; название и автор не озвучиваются;
  - паузы в v4 — аудио-теги [short pause], [pause], [long pause];
  - SSML <break> автоматически заменяется на эти теги.

Важно про Eleven v4:
  - поддерживаются только stability и similarity_boost;
  - speed и style недоступны — используйте теги [slowly], [rushed] и т. п.;
  - SSML не поддерживается;
  - один запрос — до 10 000 символов, длинный текст режется автоматически.
`);
}

// ------------------------------------------------------------------- key

async function keyCommand() {
  const { key, source } = resolveKeyOrThrow();
  const api = apiForKey(key);

  let subscription = null;
  try {
    subscription = await api.subscription();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) throw error;
    console.log(`! Данные аккаунта недоступны: ${error?.message || error}`);
  }

  console.log(`Ключ: ${maskKey(key)}`);
  console.log(`Источник: ${source}`);
  if (subscription) printAccount(subscription);
}

// ---------------------------------------------------------------- voices

async function voicesCommand() {
  const { key, source } = resolveKeyOrThrow();
  const api = apiForKey(key);

  const limitValue = last(args.limit);
  if (limitValue === true) throw new UsageError('Укажи число: --limit 20');
  const limit = Math.min(100, Math.max(1, Math.floor(number(limitValue, 20))));
  const search = args.search === true ? undefined : last(args.search);
  const gender = args.gender === true ? undefined : last(args.gender);
  const pageToken = args['page-token'] === true ? undefined : last(args['page-token']);
  if (args.language === true) {
    throw new UsageError('Укажи язык: --language ru или --language en,ru');
  }
  const language = [].concat(args.language ?? []).flatMap((value) =>
    String(value).split(',').map((part) => part.trim()).filter(Boolean),
  );

  const result = await api.listVoices({
    pageSize: limit,
    search,
    language,
    gender,
    pageToken,
  });

  if (bool(args.json, false)) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const voices = Array.isArray(result?.voices) ? result.voices : [];
  console.log(`Ключ: ${maskKey(key)} (${source})`);
  console.log(
    `Голосов: ${voices.length}` +
      (result?.total_count !== undefined ? ` из ${formatNumber(result.total_count)}` : ''),
  );

  if (voices.length === 0) {
    console.log('Ничего не найдено. Попробуй другой --search или --language.');
    return;
  }

  printVoiceTable(voices);

  if (result?.has_more && result?.next_page_token) {
    console.log(`\nЕсть ещё. Следующая страница: --page-token "${result.next_page_token}"`);
  }
  console.log('\nID голоса можно вписать в voice.json или передать: --voice-id <ID>');
}

function printVoiceTable(voices) {
  const rows = voices.map((voice) => {
    const labels = voice.labels || {};
    const language =
      labels.language ||
      labels.locale ||
      voice.verified_languages?.[0]?.language ||
      '—';
    const description = String(voice.description || labels.description || labels.use_case || '').replace(/\s+/g, ' ');
    return {
      id: String(voice.voice_id || ''),
      name: String(voice.name || '—'),
      category: String(voice.category || '—'),
      language: String(language),
      gender: String(labels.gender || '—'),
      age: String(labels.age || '—'),
      description: description.length > 52 ? `${description.slice(0, 51)}…` : description,
    };
  });

  const columns = [
    ['id', 'ID', 26],
    ['name', 'Имя', 28],
    ['category', 'Тип', 12],
    ['language', 'Язык', 9],
    ['gender', 'Пол', 8],
    ['age', 'Возраст', 12],
    ['description', 'Описание', 52],
  ];

  const header = columns.map(([, label, width]) => label.padEnd(width)).join(' ');
  console.log(`\n${header}`);
  console.log(columns.map(([, , width]) => '─'.repeat(width)).join(' '));

  for (const row of rows) {
    console.log(columns.map(([key, , width]) => row[key].padEnd(width)).join(' '));
  }
}

// -------------------------------------------------------------- generate

function resolveSource() {
  const poemArg = args.poem === true ? true : last(args.poem);
  const textArg = args.text === true ? true : last(args.text);
  const positional = args._[1];

  if (poemArg === true) throw new UsageError('Укажи папку стиха: --poem "Пушкин/Зимний вечер"');
  if (textArg === true) throw new UsageError('Укажи файл: --text "<путь>"');
  if (poemArg !== undefined && textArg !== undefined) {
    throw new UsageError('Укажи либо --poem, либо --text, но не оба сразу');
  }

  const input = poemArg ?? textArg ?? positional;
  if (input === undefined) {
    throw new UsageError(
      'Укажи стих: --poem "Пушкин/Зимний вечер"\n' +
        '      Например: node run.js generate --poem "Пушкин/Зимний вечер" --dry-run',
    );
  }

  const resolved = resolveInputPath(input);
  if (!resolved) {
    throw new Error(
      `Не найден путь: ${input}\n` +
        '      Искал относительно текущей папки, корня проекта и texts/.',
    );
  }

  const stat = fs.statSync(resolved);
  let poemDir;
  let textFile;

  if (stat.isDirectory()) {
    poemDir = resolved;
    textFile = path.join(poemDir, config.textFile);
    if (!fs.existsSync(textFile)) {
      throw new Error(`В папке стиха нет ${config.textFile}:\n      ${poemDir}`);
    }
  } else {
    textFile = resolved;
    poemDir = path.dirname(resolved);
  }

  return { poemDir, textFile };
}

function readVoiceConfig(poemDir) {
  const file = path.join(poemDir, config.voiceFile);
  const empty = {
    file: null,
    voiceId: null,
    name: null,
    modelId: null,
    language: null,
    outputFormat: null,
    settings: {},
  };

  if (!fs.existsSync(file)) return empty;

  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  } catch (error) {
    throw new Error(`Не удалось прочитать ${file}: ${error.message}`);
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`${file}: ожидается JSON-объект`);
  }

  const rawSettings = data.settings || data.voice_settings || data.voiceSettings || {};
  if (!rawSettings || typeof rawSettings !== 'object' || Array.isArray(rawSettings)) {
    throw new Error(`${file}: settings должен быть объектом`);
  }

  const settings = normalizeSettingKeys(rawSettings);
  for (const [key, value] of Object.entries(data)) {
    const normalized = normalizeSettingKey(key);
    if (
      ['stability', 'similarity_boost', 'style', 'speed', 'use_speaker_boost', 'clone_strength'].includes(
        normalized,
      ) &&
      settings[normalized] === undefined
    ) {
      settings[normalized] = value;
    }
  }

  return {
    file,
    voiceId: firstString(data.voice_id, data.voiceId),
    name: firstString(data.name, data.voice_name, data.voiceName),
    modelId: firstString(data.model_id, data.modelId, data.model),
    language: firstString(data.language_code, data.languageCode, data.language),
    outputFormat: firstString(data.output_format, data.outputFormat, data.format),
    settings,
  };
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function normalizeSettingKeys(raw) {
  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined || value === null) continue;
    out[normalizeSettingKey(key)] = value;
  }
  return out;
}

function normalizeSettingKey(key) {
  return String(key)
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

function resolveModel(raw) {
  if (raw === undefined || raw === null || raw === '') return config.modelId;
  if (raw === true) throw new UsageError('Укажи модель: --model eleven_v4');
  const value = String(last(raw)).trim();
  if (!value) return config.modelId;
  const modelId = MODEL_ALIASES[value.toLowerCase()] || value;
  if (!/^[a-z0-9_]+$/.test(modelId)) {
    throw new UsageError(`Некорректный ID модели: ${value}`);
  }
  return modelId;
}

function resolveStress() {
  if (args.stress === undefined) return 'keep';
  if (args.stress === true) throw new UsageError('Укажи режим: --stress keep или --stress strip');
  const value = String(last(args.stress)).trim().toLowerCase();
  if (['keep', 'сохранить', 'оставить'].includes(value)) return 'keep';
  if (['strip', 'снять', 'убрать'].includes(value)) return 'strip';
  throw new UsageError('--stress: допустимо keep или strip');
}

function resolveVoice(voiceConfig, parsed) {
  if (args['voice-id'] !== undefined) {
    if (args['voice-id'] === true) throw new UsageError('Укажи ID: --voice-id "<id>"');
    const id = String(last(args['voice-id'])).trim();
    if (!id) throw new UsageError('Пустой --voice-id');
    return { id, name: voiceConfig.name, source: '--voice-id' };
  }

  if (voiceConfig.voiceId) {
    return {
      id: voiceConfig.voiceId,
      name: voiceConfig.name,
      source: voiceConfig.file ? displayPath(voiceConfig.file) : 'voice.json',
    };
  }

  const detected = detectVoice(parsed.header);
  if (detected.id) {
    return {
      id: detected.id,
      name: voiceConfig.name || detected.name,
      source: 'блок «Голос» в elevenlabs.txt',
    };
  }

  throw new Error(
    'Не указан голос ElevenLabs.\n' +
      '      Добавь voice.json с "voice_id" или передай --voice-id <ID>.\n' +
      '      Посмотреть голоса: node run.js voices --language ru',
  );
}

function resolveSettings(voiceConfig, modelId, warnings) {
  const cli = {};
  if (args.stability !== undefined) {
    if (args.stability === true) throw new UsageError('Укажи stability: --stability 0.5');
    cli.stability = parseStability(last(args.stability));
  }
  if (args.similarity !== undefined) {
    if (args.similarity === true) throw new UsageError('Укажи similarity: --similarity 0.75');
    cli.similarity_boost = parseUnit(last(args.similarity), 'similarity');
  }
  if (args.style !== undefined) {
    if (args.style === true) throw new UsageError('Укажи style: --style 0.2');
    cli.style = parseUnit(last(args.style), 'style');
  }
  if (args.speed !== undefined) {
    if (args.speed === true) throw new UsageError('Укажи speed: --speed 0.9');
    cli.speed = parseSpeed(last(args.speed));
  }
  if (args['no-speaker-boost'] !== undefined) {
    const disabled =
      args['no-speaker-boost'] === true
        ? true
        : bool(args['no-speaker-boost'], true);
    if (disabled) cli.use_speaker_boost = false;
  } else if (args['speaker-boost'] !== undefined) {
    cli.use_speaker_boost = bool(last(args['speaker-boost']), true);
  }

  const settings = {
    ...config.voiceSettings,
    ...voiceConfig.settings,
    ...cli,
  };

  const isV4 = modelId === 'eleven_v4' || modelId === 'eleven_v4_turbo';
  if (isV4) {
    for (const key of ['style', 'speed']) {
      if (Object.prototype.hasOwnProperty.call(cli, key)) {
        throw new UsageError(
          `Eleven v4 не поддерживает ${key}. Убери --${key} ` +
            'и задай подачу аудио-тегами: [slowly], [rushed], [whispers].',
        );
      }
      if (Object.prototype.hasOwnProperty.call(settings, key)) {
        warnings.push(`Eleven v4 не поддерживает ${key}: настройка пропущена.`);
        delete settings[key];
      }
    }
  }

  const allowed = new Set([
    'stability',
    'similarity_boost',
    'style',
    'speed',
    'use_speaker_boost',
    'clone_strength',
  ]);

  const out = {};
  for (const [key, value] of Object.entries(settings)) {
    if (value === undefined || value === null) continue;
    if (!allowed.has(key)) {
      warnings.push(`Неизвестная настройка «${key}» — пропущена.`);
      continue;
    }

    if (key === 'stability') {
      out[key] = parseStability(value);
    } else if (['similarity_boost', 'style', 'clone_strength'].includes(key)) {
      out[key] = parseUnit(value, key);
    } else if (key === 'speed') {
      out[key] = parseSpeed(value);
    } else if (key === 'use_speaker_boost') {
      out[key] = toBoolean(value, key);
    }
  }

  return out;
}

function parseStability(value) {
  if (value === true) throw new UsageError('Укажи stability: --stability 0.5');
  const text = String(value).trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(STABILITY_PRESETS, text)) {
    return STABILITY_PRESETS[text];
  }
  return parseUnit(value, 'stability');
}

function parseUnit(value, name) {
  if (value === true) throw new UsageError(`Укажи ${name}: число от 0 до 1`);
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 1) {
    throw new UsageError(`${name}: нужно число от 0 до 1`);
  }
  return n;
}

function parseSpeed(value) {
  if (value === true) throw new UsageError('Укажи speed: число от 0.7 до 1.2');
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0.7 || n > 1.2) {
    throw new UsageError('speed: нужно число от 0.7 до 1.2');
  }
  return n;
}

function toBoolean(value, name) {
  if (typeof value === 'boolean') return value;
  const text = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'да', 'on'].includes(text)) return true;
  if (['0', 'false', 'no', 'n', 'нет', 'off'].includes(text)) return false;
  throw new UsageError(`${name}: нужно true или false`);
}

function resolveLanguage(voiceConfig, modelId, warnings) {
  let language;
  if (args.language !== undefined) {
    if (args.language === true) throw new UsageError('Укажи язык: --language ru или --language none');
    language = String(last(args.language)).trim();
  } else {
    language = voiceConfig.language || config.languageCode;
  }

  if (!language || ['none', 'off', '-'].includes(String(language).toLowerCase())) return null;

  if (!/^[a-z]{2,3}$/i.test(language)) {
    throw new UsageError(`Язык должен быть кодом ISO 639-1/639-3, например ru: ${language}`);
  }

  if (modelId === 'eleven_multilingual_v2') {
    warnings.push('eleven_multilingual_v2 не поддерживает language_code — параметр пропущен.');
    return null;
  }

  return language.toLowerCase();
}

function resolveOutputFormat(voiceConfig) {
  let raw;
  if (args.format !== undefined) {
    if (args.format === true) throw new UsageError('Укажи формат: --format mp3_44100_128');
    raw = String(last(args.format)).trim();
  } else {
    raw = voiceConfig.outputFormat || config.outputFormat;
  }

  const format = FORMAT_ALIASES[String(raw).toLowerCase()] || raw;
  if (!OUTPUT_FORMATS.has(format)) {
    throw new UsageError(
      `Неизвестный формат: ${raw}\n` +
        '      Примеры: mp3_44100_128, mp3_44100_192, wav_44100, opus_48000_128, pcm_44100',
    );
  }
  return format;
}

function resolveMaxChars(modelLimit) {
  if (args['max-chars'] !== undefined) {
    if (args['max-chars'] === true) throw new UsageError('Укажи число: --max-chars 5000');
    const value = Number(last(args['max-chars']));
    if (!Number.isFinite(value) || value < 200) {
      throw new UsageError('--max-chars должно быть не меньше 200');
    }
    if (value > modelLimit) {
      throw new UsageError(
        `--max-chars ${Math.floor(value)} больше лимита модели (${modelLimit})`,
      );
    }
    return Math.floor(value);
  }

  return Math.max(200, Math.min(config.maxCharsPerRequest, modelLimit - config.charMargin));
}

function resolveOutputPath(poemDir, outputFormat, warnings) {
  const ext = extensionForFormat(outputFormat);

  if (args.out !== undefined) {
    if (args.out === true) throw new UsageError('Укажи файл: --out "<путь>"');
    let out = String(last(args.out)).trim();
    if (!out) throw new UsageError('Пустой --out');
    out = path.resolve(process.cwd(), out);
    if (!path.extname(out)) out += ext;
    if (path.extname(out).toLowerCase() !== ext) {
      warnings.push(
        `Расширение ${path.extname(out)} не совпадает с форматом ${outputFormat} (ожидается ${ext}).`,
      );
    }
    return out;
  }

  const base = config.outputFile.replace(/\.[^.]+$/, '');
  return path.join(poemDir, `${base}${ext}`);
}

function describeSettings(settings) {
  const labels = {
    stability: 'stability',
    similarity_boost: 'similarity',
    style: 'style',
    speed: 'speed',
    use_speaker_boost: 'speaker boost',
    clone_strength: 'clone strength',
  };

  const parts = Object.entries(settings).map(([key, value]) => {
    const label = labels[key] || key;
    if (typeof value === 'boolean') return `${label} ${value ? 'да' : 'нет'}`;
    return `${label} ${value}`;
  });

  return parts.length ? parts.join(', ') : 'по умолчанию';
}

function plural(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

async function generateCommand() {
  const source = resolveSource();
  const warnings = [];

  const voiceConfig = readVoiceConfig(source.poemDir);
  const modelId = resolveModel(
    args.model !== undefined ? last(args.model) : voiceConfig.modelId,
  );
  const stress = resolveStress();

  let parsed;
  try {
    parsed = parseElevenlabsText(fs.readFileSync(source.textFile, 'utf8'), {
      stress,
      modelId,
    });
  } catch (error) {
    throw new Error(`${displayPath(source.textFile)}: ${error.message}`);
  }
  warnings.push(...parsed.warnings);

  const voice = resolveVoice(voiceConfig, parsed);
  const settings = resolveSettings(voiceConfig, modelId, warnings);
  const language = resolveLanguage(voiceConfig, modelId, warnings);
  const outputFormat = resolveOutputFormat(voiceConfig);
  const outputPath = resolveOutputPath(source.poemDir, outputFormat, warnings);
  const dryRun = bool(args['dry-run'], false);
  const overwrite = bool(args.overwrite, false);

  if (fs.existsSync(outputPath) && fs.statSync(outputPath).isDirectory()) {
    throw new Error(`Путь для аудио указывает на папку: ${outputPath}`);
  }

  const exists = fs.existsSync(outputPath);
  if (exists && !overwrite) {
    if (dryRun) {
      warnings.push(`Файл ${outputPath} уже существует; для реального запуска нужен --overwrite.`);
    } else {
      throw new Error(
        `Файл уже существует: ${outputPath}\n` +
          '      Добавь --overwrite, чтобы перезаписать его.',
      );
    }
  }

  const timingsFile = path.join(path.dirname(outputPath), 'timings.json');
  if (
    path.basename(outputPath).toLowerCase() === 'voice.mp3' &&
    fs.existsSync(timingsFile) &&
    (overwrite || !exists)
  ) {
    warnings.push('Рядом есть timings.json от старого голоса — после новой озвучки его нужно пересчитать.');
  }

  const modelLimit = config.modelLimits[modelId] ?? 10000;
  const maxChars = resolveMaxChars(modelLimit);
  const chunks = splitText(parsed.text, maxChars);
  if (chunks.length === 0) throw new Error('После разбиения не осталось текста для озвучки');

  if (chunks.length > 1 && !isRawFormat(outputFormat) && !hasFfmpeg()) {
    if (dryRun) {
      warnings.push('ffmpeg не найден: реальный запуск не сможет склеить куски.');
    } else {
      throw new Error(
        'Для склейки нескольких кусков нужен ffmpeg.\n' +
          '      Установи его или сгенерируй текст одним куском: --max-chars 10000',
      );
    }
  }

  const billedChars = chunks.reduce((sum, chunk) => sum + codePointLength(chunk), 0);
  const price = config.pricesPer1kUsd[modelId] ?? null;
  const estimate = price === null ? null : (billedChars / 1000) * price;

  console.log(`Стих:       ${displayPath(source.poemDir)}`);
  console.log(
    `Текст:      ${displayPath(source.textFile)}${parsed.header ? ' → после разделителя' : ''}`,
  );
  console.log(
    `Голос:      ${voice.name ? `${voice.name} · ` : ''}${voice.id} (${voice.source})`,
  );
  console.log(`Модель:     ${modelId} · лимит ${formatNumber(modelLimit)} симв.`);
  console.log(`Настройки:  ${describeSettings(settings)}`);
  console.log(`Язык:       ${language || 'не задан'}`);
  console.log(`Формат:     ${outputFormat}`);
  console.log(
    `Текст:      ${formatNumber(parsed.stats.characters)} симв. · ` +
      `${formatNumber(parsed.stats.lines)} ${plural(parsed.stats.lines, 'строка', 'строки', 'строк')} · ` +
      `${formatNumber(parsed.stats.stanzas)} ${plural(parsed.stats.stanzas, 'строфа', 'строфы', 'строф')} · ` +
      `${chunks.length} ${plural(chunks.length, 'кусок', 'куска', 'кусков')}`,
  );
  if (chunks.length > 1) {
    console.log(
      `Куски:      ${chunks.map((chunk) => formatNumber(codePointLength(chunk))).join(' / ')} симв.`,
    );
  }
  console.log(
    `Оценка:     ${
      estimate === null
        ? 'цена этой модели неизвестна'
        : `~${formatUsd(estimate)} (${formatNumber(billedChars)} симв. × $${price} / 1000)`
    }`,
  );
  console.log(`Файл:       ${outputPath}${exists ? ' (уже существует)' : ''}`);

  printWarnings(warnings);

  if (dryRun) {
    console.log('\n--dry-run: запрос к ElevenLabs не отправлялся.');
    console.log(
      `RESULT_JSON: ${JSON.stringify({
        ok: true,
        dryRun: true,
        output: outputPath,
        voiceId: voice.id,
        voiceName: voice.name || null,
        modelId,
        languageCode: language,
        outputFormat,
        settings,
        characters: billedChars,
        chunks: chunks.length,
        estimatedCostUsd: estimate,
      })}`,
    );
    return;
  }

  const { key, source: keySource } = resolveKeyOrThrow();
  const api = apiForKey(key);

  if (!bool(args['no-check'], false)) {
    try {
      const subscription = await api.subscription();
      const used = Number(subscription?.character_count) || 0;
      const limit = Number(subscription?.character_limit) || 0;
      const remaining = limit > 0 ? Math.max(0, limit - used) : null;
      console.log(
        `\nАккаунт:    ${subscription?.tier || '—'}` +
          (remaining === null ? '' : ` · осталось ${formatNumber(remaining)} симв.`),
      );
      if (remaining !== null && remaining < billedChars) {
        console.log(
          `! Может не хватить символов: нужно ${formatNumber(billedChars)}, осталось ${formatNumber(remaining)}.`,
        );
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) throw error;
      console.log(`\n! Не удалось проверить аккаунт: ${error?.message || error}`);
    }
    console.log(`Ключ:       ${maskKey(key)} (${keySource})`);
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'elevenlabs-voice-'));
  const ext = extensionForFormat(outputFormat);
  const chunkFiles = [];
  const requestIds = [];
  let actualCharacters = 0;
  let failedChunk = null;

  try {
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chars = codePointLength(chunk);
      const prefix = `[${i + 1}/${chunks.length}]`;
      const canStitch = modelSupportsStitching(modelId);

      console.log(`${prefix} ${formatNumber(chars)} симв. → запрос к ElevenLabs…`);

      try {
        const result = await api.textToSpeech({
          voiceId: voice.id,
          text: chunk,
          modelId,
          languageCode: language,
          voiceSettings: settings,
          outputFormat,
          previousRequestIds: canStitch ? requestIds : undefined,
          previousText:
            canStitch && i > 0 && requestIds.length === 0
              ? tail(chunks.slice(0, i).join('\n\n'), 1000)
              : undefined,
          nextText: canStitch && i < chunks.length - 1 ? head(chunks[i + 1], 500) : undefined,
        });

        const chunkFile = path.join(tmpDir, `chunk-${String(i + 1).padStart(3, '0')}${ext}`);
        fs.writeFileSync(chunkFile, result.buffer);
        chunkFiles.push(chunkFile);

        if (result.requestId) requestIds.push(result.requestId);
        actualCharacters += result.characterCost ?? chars;

        const duration = probeDuration(chunkFile);
        console.log(
          `      ✓ ${formatBytes(result.buffer.length)}` +
            (duration === null ? '' : ` · ${formatDuration(duration)}`) +
            (result.characterCost === null || result.characterCost === undefined
              ? ''
              : ` · ${formatNumber(result.characterCost)} симв.`),
        );
      } catch (error) {
        failedChunk = i + 1;
        throw error;
      }
    }

    if (chunkFiles.length !== chunks.length) {
      throw new Error(`Готово кусков ${chunkFiles.length} из ${chunks.length}`);
    }

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    const finalFile = path.join(tmpDir, `voice${ext}`);

    if (chunkFiles.length === 1) {
      fs.copyFileSync(chunkFiles[0], finalFile);
    } else if (isRawFormat(outputFormat)) {
      fs.writeFileSync(finalFile, Buffer.concat(chunkFiles.map((file) => fs.readFileSync(file))));
    } else {
      if (!hasFfmpeg()) {
        throw new Error(
          'Для склейки нескольких кусков нужен ffmpeg.\n' +
            '      Установи его или сгенерируй текст одним куском: --max-chars 10000',
        );
      }
      concatAudio(chunkFiles, finalFile);
    }

    const partFile = `${outputPath}.part-${process.pid}`;
    try {
      fs.copyFileSync(finalFile, partFile);
      if (fs.existsSync(outputPath)) fs.rmSync(outputPath, { force: true });
      fs.renameSync(partFile, outputPath);
    } finally {
      if (fs.existsSync(partFile)) fs.rmSync(partFile, { force: true });
    }

    const bytes = fs.statSync(outputPath).size;
    const duration = probeDuration(outputPath);
    const actualCost = price === null ? null : (actualCharacters / 1000) * price;

    console.log(`\nГотово: ${outputPath}`);
    console.log(
      `        ${formatBytes(bytes)}` +
        (duration === null ? '' : ` · ${formatDuration(duration)}`) +
        ` · ${formatNumber(actualCharacters)} симв.` +
        (actualCost === null ? '' : ` · ~${formatUsd(actualCost)}`),
    );

    console.log(
      `RESULT_JSON: ${JSON.stringify({
        ok: true,
        dryRun: false,
        output: outputPath,
        bytes,
        durationSec: duration,
        voiceId: voice.id,
        voiceName: voice.name || null,
        modelId,
        languageCode: language,
        outputFormat,
        settings,
        characters: billedChars,
        actualCharacters,
        chunks: chunks.length,
        estimatedCostUsd: estimate,
        actualCostUsd: actualCost,
        requestIds,
      })}`,
    );
  } catch (error) {
    if (failedChunk !== null) {
      error.message = `Кусок ${failedChunk} из ${chunks.length}: ${error.message}`;
    }
    throw error;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
