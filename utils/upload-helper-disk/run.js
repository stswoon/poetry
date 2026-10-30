#!/usr/bin/env node
/**
 * upload-helper-disk — загрузка бекапов видео на Яндекс Диск через REST API и OAuth-токен.
 *
 * Команды:
 *   node run.js token
 *   node run.js info   [--remote "/poetry"]
 *   node run.js list   [--remote "/poetry"] [--recursive] [--limit 100]
 *   node run.js upload --poem <Поэт/Стих> | --source <файл|папка> [--remote <папка>] [--dry-run]
 *
 * Токен — только в корневом .env или переменной YANDEX_DISK_TOKEN.
 * Подробности — README.md рядом.
 */

import fs from 'node:fs';
import path from 'node:path';

import { config, fromRoot, resolvePath, ROOT } from './lib/config.js';
import { bool, list, number, option, parseArgs, UsageError } from '../lib/args.js';
import { ENV_FILE } from '../lib/env.js';
import { readJson } from '../lib/files.js';
import { formatBytes, sleep } from '../lib/format.js';
import { runDir } from '../lib/state.js';
import { UploadRun } from './lib/state.js';
import { maskToken, resolveToken, TOKEN_ENV } from './lib/token.js';
import {
  createDiskApi,
  normalizeRemote,
  remoteBasename,
  remoteJoin,
  remoteParent,
} from './lib/api.js';
import { collectFiles, validateRemoteName, totalBytes } from './lib/files.js';
import { uploadFile, md5File } from './lib/upload.js';
import { formatDate, makeProgress } from './lib/format.js';

const BOOLEAN_FLAGS = ['dry-run', 'overwrite', 'no-verify', 'all', 'keep-root', 'recursive'];

const args = parseArgs(process.argv.slice(2), { booleans: BOOLEAN_FLAGS });
const command = args._[0] || 'help';

main().catch((error) => {
  console.error(`\nОшибка: ${error?.message || error}`);
  process.exitCode = error instanceof UsageError ? 2 : 1;
});

async function main() {
  for (const removed of ['token', 'set', 'clear']) {
    if (args[removed] !== undefined) {
      throw new UsageError(
        `--${removed} больше нет: токен не передаётся через командную строку.\n` +
          `      Впиши ${TOKEN_ENV}=<токен> в ${ENV_FILE} (образец — .env.example)\n` +
          `      или задай переменную окружения ${TOKEN_ENV}.`,
      );
    }
  }
  if (args['chunk-mb'] !== undefined) {
    throw new UsageError('--chunk-mb больше нет: файл всегда грузится целиком (куски не проверены на Диске).');
  }

  switch (command) {
    case 'token':
      return tokenCommand();
    case 'info':
      return infoCommand();
    case 'list':
      return listCommand();
    case 'upload':
      return uploadCommand();
    case 'help':
    case '--help':
    case '-h':
      return printHelp();
    default:
      printHelp();
      process.exitCode = 2;
  }
}

function getTokenOrThrow() {
  const { token, source } = resolveToken();
  if (!token) {
    throw new Error(
      'Токен Яндекс Диска не найден.\n' +
        `      Впиши ${TOKEN_ENV}=<токен> в ${ENV_FILE} (образец — .env.example)\n` +
        `      или задай переменную окружения ${TOKEN_ENV}.`,
    );
  }
  return { token, source };
}

function diskApi() {
  const { token, source } = getTokenOrThrow();
  return { api: createDiskApi({ token }), token, source };
}

function remoteFromArgs() {
  return normalizeRemote(option(args, 'remote', 'Укажи папку: --remote "/poetry"') || config.remoteDir);
}

// ------------------------------------------------------------------ token

async function tokenCommand() {
  const { token, source } = getTokenOrThrow();
  const api = createDiskApi({ token });
  const probe = await probeAccess(api);

  console.log(`Токен: ${maskToken(token)}`);
  console.log(`Источник: ${source}`);
  printDiskInfo(probe.info);
  printPathAccess(probe);
}

/**
 * Проверяет токен: сведения о Диске (если есть права) и доступ к папке по умолчанию.
 * Токен на папку приложения не видит /v1/disk, поэтому дополнительно пробуем саму папку.
 */
async function probeAccess(api) {
  const info = await api.diskInfo();
  if (info) return { info, remote: null, meta: null };

  const remote = remoteFromArgs();
  const meta = await api.getResource(remote, 'path,type');
  return { info, remote, meta };
}

function printPathAccess({ remote, meta }) {
  if (!remote) return;
  if (!meta) {
    console.log(`Папка: ${remote} — ещё не создана (появится при первой загрузке)`);
  } else if (meta.type === 'dir') {
    console.log(`Папка: ${remote} — доступна`);
  } else {
    console.log(`Папка: ${remote} — это файл на Диске, а не папка`);
  }
}

// ------------------------------------------------------------------- info

async function infoCommand() {
  const { api, token, source } = diskApi();
  const info = await api.diskInfo();
  const remote = remoteFromArgs();

  console.log(`Токен: ${maskToken(token)} (${source})`);
  printDiskInfo(info);

  const meta = await api.getResource(remote, 'path,type');
  if (!meta) {
    console.log(`Папка на Диске: ${remote} — ещё не создана (появится при загрузке)`);
  } else if (meta.type === 'dir') {
    const page = await api.listDir(remote, { limit: 1 });
    const total = page?._embedded?.total ?? 0;
    console.log(`Папка на Диске: ${remote} — есть (${total} объектов)`);
  } else {
    console.log(`Путь на Диске: ${remote} — это файл, а не папка`);
  }

  console.log(`По умолчанию: ${config.remoteDir}`);
  console.log(`Расширения: ${config.extensions.join(', ')}`);
}

function printDiskInfo(info) {
  if (!info) {
    console.log('Диск: сведения недоступны — у токена нет права cloud_api:disk.info');
    return;
  }
  const total = Number(info?.total_space) || 0;
  const used = Number(info?.used_space) || 0;
  const trash = Number(info?.trash_size) || 0;
  const free = Math.max(0, total - used);
  console.log(
    `Диск: ${formatBytes(used)} занято, ${formatBytes(free)} свободно из ${formatBytes(total)}` +
      (trash ? ` (в корзине ${formatBytes(trash)})` : ''),
  );
}

// ------------------------------------------------------------------- list

async function listCommand() {
  const { api } = diskApi();
  const root = remoteFromArgs();
  const recursive = bool(args.recursive, false, '--recursive');
  const limit = clamp(number(option(args, 'limit', 'Укажи лимит: --limit 100'), 100), 1, 1000);

  const meta = await api.getResource(root, 'path,type');
  if (!meta) {
    throw new Error(`Папка не найдена: ${root}\n      Она появится после первой загрузки.`);
  }
  if (meta.type !== 'dir') {
    printEntry(meta, 0);
    return;
  }

  console.log(`\n${root}`);
  await printDir(root, 0);

  async function printDir(dir, depth) {
    let offset = 0;
    let total = null;

    do {
      const page = await api.listDir(dir, { limit, offset });
      const items = page?._embedded?.items || [];
      total = page?._embedded?.total ?? items.length;

      for (const item of items) {
        printEntry(item, depth);
        if (recursive && item.type === 'dir' && depth < 6) {
          await printDir(item.path, depth + 1);
        }
      }

      offset += items.length;
      if (items.length === 0) break;
    } while (offset < total);
  }
}

function printEntry(item, depth) {
  const indent = '  '.repeat(depth);
  const remotePath = String(item.path || item.name || '').replace(/^disk:/, '');
  if (item.type === 'dir') {
    console.log(`${indent}DIR   ${item.name || remotePath}/`);
    return;
  }
  const size = formatBytes(item.size || 0).padStart(9);
  const date = formatDate(item.modified || item.created).padEnd(16);
  console.log(`${indent}FILE  ${size}  ${date}  ${item.name || remotePath}`);
}

// ----------------------------------------------------------------- upload

async function uploadCommand() {
  const options = loadUploadOptions();
  const { api } = diskApi();

  const collected = collectFiles(options.sources, {
    all: options.all,
    extensions: options.extensions,
    keepRoot: options.keepRoot,
  });

  if (options.name && collected.files.length !== 1) {
    throw new UsageError(
      `--name можно использовать только для одного файла, а найдено ${collected.files.length}.`,
    );
  }
  if (collected.files.length === 0) {
    throw new Error(
      `В источниках нет файлов для загрузки.\n` +
        `      Расширения: ${options.extensions.join(', ')}. Для любых файлов добавь --all.`,
    );
  }

  const items = collected.files.map((item) => {
    const rel = options.name ? validateRemoteName(options.name) : item.rel;
    const remote = remoteJoin(options.remote, rel);
    if (remote.length > 32760) throw new Error(`Слишком длинный путь на Диске: ${remote}`);
    return { ...item, rel, remote };
  });

  const seen = new Map();
  for (const item of items) {
    if (seen.has(item.remote)) {
      throw new Error(
        `Два файла претендуют на один путь на Диске:\n` +
          `      ${seen.get(item.remote)}\n      ${item.file}\n` +
          `      Укажи --remote или загружай папки по одной.`,
      );
    }
    seen.set(item.remote, item.file);
  }

  const bytes = totalBytes(items);
  const run = new UploadRun(runDir(fromRoot('logs'), remoteBasename(options.remote) || 'backup'), {
    source: options.sources,
    remote: options.remote,
    dryRun: options.dryRun,
  });

  console.log(`\nИсточник: ${options.sources.join(', ')}`);
  console.log(`На Диск:  ${options.remote}`);
  console.log(`Файлов:   ${items.length} (${formatBytes(bytes)})`);
  if (collected.skipped.length > 0) {
    console.log(`Пропущено не-видео: ${collected.skipped.length}`);
  }
  console.log(`Режим:    ${options.dryRun ? 'проверка без загрузки (--dry-run)' : 'загрузка'}`);
  console.log(`Проверка: ${options.verify ? 'размер + md5' : 'только размер'}`);
  console.log(`Замена:   ${options.overwrite ? 'разрешена (--overwrite)' : 'запрещена, конфликт = ошибка'}`);
  console.log(`Логи:     ${run.dir}`);

  try {
    const info = await api.diskInfo();
    console.log('');
    printDiskInfo(info);
    if (info) {
      const free = Math.max(0, (Number(info.total_space) || 0) - (Number(info.used_space) || 0));
      if (bytes > free) {
        run.warn(`Нужно ${formatBytes(bytes)}, а свободно ${formatBytes(free)} — загрузка может упасть с 507`);
      }
    }

    let index = 0;
    for (const item of items) {
      index++;
      console.log(`\n[${index}/${items.length}] ${item.rel} (${formatBytes(item.size)})`);
      console.log(`    → ${item.remote}`);
      run.set({ stage: 'upload', current: item.remote });

      try {
        const result = await processItem({ api, item, options, run });
        run.addResult(result);
        printResultLine(result);
      } catch (error) {
        const message = String(error?.message || error);
        console.log('');
        console.log(`    Ошибка: ${message}`);
        run.addResult({
          status: 'failed',
          file: item.file,
          remote: item.remote,
          size: item.size,
          error: message,
        });
        run.warn(`${item.rel}: ${message}`);
      }
    }
  } catch (error) {
    run.fail(error);
    run.finish({ files: items.length, bytes });
    printSummary(run, options);
    process.exitCode = 1;
    return;
  }

  run.finish({ files: items.length, bytes });
  const ok = printSummary(run, options);
  if (!ok) process.exitCode = 1;
}

async function processItem({ api, item, options, run }) {
  const startedAt = Date.now();
  const parent = remoteParent(item.remote);

  if (!options.dryRun) await api.ensureDir(parent);

  const existing = await api.getResource(item.remote);
  let localMd5 = null;
  let action = 'upload';

  if (existing) {
    if (existing.type !== 'file') {
      return conflictResult(item, `на Диске по этому пути папка ${item.remote}`);
    }

    const sameSize = Number(existing.size) === Number(item.size);
    if (sameSize) {
      localMd5 = options.verify ? await withMd5Notice(item) : null;
      if (!options.verify || localMd5 === existing.md5) {
        return {
          status: options.dryRun ? 'would-skip' : 'skipped',
          file: item.file,
          remote: item.remote,
          size: item.size,
          md5: localMd5,
          remoteMd5: existing.md5 || null,
          md5Verified: Boolean(localMd5) && localMd5 === existing.md5,
          durationMs: Date.now() - startedAt,
        };
      }
    }

    if (!options.overwrite) {
      return conflictResult(
        item,
        `файл уже есть на Диске, но отличается по размеру или md5. ` +
          `Добавь --overwrite, чтобы заменить`,
        { remoteSize: existing.size, remoteMd5: existing.md5 || null },
      );
    }

    action = 'overwrite';
  }

  if (options.dryRun) {
    return {
      status: action === 'overwrite' ? 'would-overwrite' : 'would-upload',
      file: item.file,
      remote: item.remote,
      size: item.size,
      md5: localMd5,
      durationMs: Date.now() - startedAt,
    };
  }

  if (options.verify && !localMd5) localMd5 = await withMd5Notice(item);

  const progress = makeProgress({ total: item.size });
  const uploadedAt = Date.now();

  await uploadFile({
    api,
    filePath: item.file,
    remotePath: item.remote,
    overwrite: action === 'overwrite',
    retries: config.retries.upload,
    idleTimeoutMs: config.timeouts.uploadIdleMs,
    onProgress: progress,
    onRetry: (error, attempt, attempts) => {
      console.log('');
      run.warn(`${item.rel}: ${error.message} — повтор ${attempt} из ${attempts - 1}`);
    },
  });

  const meta = await waitForRemote(api, item.remote, item.size, config.timeouts.verifyMs, options.verify);
  let md5Verified = false;

  if (!meta || meta.type !== 'file') {
    run.warn(`${item.rel}: файл отправлен, но не вижу его в метаданных Диска`);
  } else {
    if (Number(meta.size) !== Number(item.size)) {
      throw new Error(
        `размер на Диске ${meta.size} не совпал с локальным ${item.size} — файл загружен не полностью`,
      );
    }
    if (options.verify && localMd5 && meta.md5) {
      if (meta.md5 !== localMd5) {
        throw new Error(`md5 на Диске (${meta.md5}) не совпал с локальным (${localMd5})`);
      }
      md5Verified = true;
    } else if (options.verify) {
      run.warn(`${item.rel}: Диск ещё не посчитал md5 — сверен только размер`);
    }
  }

  return {
    status: action === 'overwrite' ? 'overwritten' : 'uploaded',
    file: item.file,
    remote: item.remote,
    size: item.size,
    md5: localMd5,
    remoteMd5: meta?.md5 || null,
    md5Verified,
    durationMs: Date.now() - uploadedAt,
    totalMs: Date.now() - startedAt,
  };
}

function conflictResult(item, message, extra = {}) {
  return {
    status: 'conflict',
    file: item.file,
    remote: item.remote,
    size: item.size,
    error: message,
    ...extra,
  };
}

async function withMd5Notice(item) {
  if (item.size > 100 * 1024 * 1024) console.log('    считаю md5…');
  return md5File(item.file);
}

async function waitForRemote(api, remote, size, timeoutMs, needMd5 = true) {
  const deadline = Date.now() + Math.max(0, timeoutMs);
  let meta = null;

  for (;;) {
    meta = await api.getResource(remote).catch(() => null);
    const ready =
      meta?.type === 'file' &&
      Number(meta.size) === Number(size) &&
      (!needMd5 || Boolean(meta.md5));
    if (ready) return meta;
    if (Date.now() >= deadline) return meta;
    await sleep(1000);
  }
}

function printResultLine(result) {
  const seconds = ((result.durationMs || 0) / 1000).toFixed(1).replace('.', ',');
  const check = result.md5Verified ? 'размер и md5 совпали' : 'совпал размер, md5 не сверялся';
  switch (result.status) {
    case 'skipped':
      console.log(`    уже на Диске (${check}) — пропускаю`);
      break;
    case 'would-skip':
      console.log(`    уже на Диске (${check}) — пропустил бы (dry-run)`);
      break;
    case 'uploaded':
      console.log(`    загружено за ${seconds} с, ${check}`);
      break;
    case 'overwritten':
      console.log(`    перезаписано за ${seconds} с, ${check}`);
      break;
    case 'conflict':
      console.log(`    конфликт: ${result.error}`);
      break;
    case 'would-upload':
      console.log(`    будет загружено (dry-run)`);
      break;
    case 'would-overwrite':
      console.log(`    будет перезаписано (dry-run)`);
      break;
    default:
      break;
  }
}

function printSummary(run, options) {
  const results = run.data.results;
  const count = (status) => results.filter((item) => item.status === status).length;
  const uploaded = count('uploaded') + count('overwritten');
  const skipped = count('skipped');
  const conflicts = count('conflict');
  const failed = count('failed');
  const wouldUpload = count('would-upload') + count('would-overwrite');
  const wouldSkip = count('would-skip');
  const ok = failed === 0 && conflicts === 0 && !run.data.error;

  console.log('\n────────────────────────────────────────');
  if (options.dryRun) {
    console.log(`Dry-run: загрузилось бы ${wouldUpload}, пропущено ${wouldSkip}, конфликтов ${conflicts}, ошибок ${failed}`);
  } else {
    console.log(`Итог: загружено ${uploaded}, пропущено ${skipped}, конфликтов ${conflicts}, ошибок ${failed}`);
  }
  console.log(`Состояние: ${run.statePath}`);
  console.log(
    `RESULT_JSON: ${JSON.stringify({
      ok,
      dryRun: options.dryRun,
      uploaded,
      skipped,
      conflicts,
      failed,
      wouldUpload,
      wouldSkip,
      error: run.data.error || null,
      stateFile: run.statePath,
      results,
    })}`,
  );

  return ok;
}

// --------------------------------------------------------------- options

function loadUploadOptions() {
  const jobArg = option(args, 'job', 'Укажи путь к job-файлу: --job backup.json');
  const jobPath = jobArg ? resolvePath(jobArg) : null;
  let job = {};

  if (jobPath) {
    if (!fs.existsSync(jobPath)) throw new UsageError(`Job-файл не найден: ${jobPath}`);
    try {
      job = readJson(jobPath);
    } catch (error) {
      throw new UsageError(error.message);
    }
    if (job.chunkSizeMb !== undefined) {
      throw new UsageError(`${jobPath}: chunkSizeMb больше нет — файл всегда грузится целиком.`);
    }
  }

  const baseDir = jobPath ? path.dirname(jobPath) : process.cwd();
  const cliSources = [...list(args.file), ...list(args.source)];
  const poemArg = option(args, 'poem', 'Укажи стих: --poem "Пушкин/У лукоморья"');
  const poem = poemArg ?? (job.poem ? String(job.poem) : null);
  if (poem && cliSources.length > 0) {
    throw new UsageError('Укажи что-то одно: --poem или --source');
  }
  const rawSources =
    cliSources.length > 0 ? cliSources : poem ? [poemSource(poem)] : list(job.source ?? job.sources);
  if (rawSources.length === 0) {
    throw new UsageError(
      'Не указан источник.\n' +
        '      Пример: node run.js upload --source "D:\\mycode\\poetry\\texts" --remote "/poetry"\n' +
        '      Или один стих: node run.js upload --poem "Пушкин/У лукоморья"',
    );
  }

  if (args.ext === true) throw new UsageError('Укажи расширения: --ext mp4,webm');

  const sources = rawSources.map((source) => resolvePath(String(source), baseDir));
  const remoteArg = option(args, 'remote', 'Укажи папку: --remote "/poetry"');
  const remote = normalizeRemote(remoteArg || job.remote || config.remoteDir);
  const overwrite = bool(
    args.overwrite,
    bool(job.overwrite, config.overwrite, 'job.overwrite'),
    '--overwrite',
  );
  const verify = bool(args['no-verify'], false, '--no-verify')
    ? false
    : bool(job.verify, config.verify, 'job.verify');
  const jobExtensions = list(job.extensions);
  const extensions = list(args.ext).length > 0 ? list(args.ext) : jobExtensions.length > 0 ? jobExtensions : config.extensions;
  const nameArg = option(args, 'name', 'Укажи имя: --name "video.mp4"');
  const name = nameArg ?? (job.name ? String(job.name) : null);

  return {
    sources,
    remote,
    overwrite,
    verify,
    all: bool(args.all, bool(job.all, false, 'job.all'), '--all'),
    extensions,
    keepRoot: bool(args['keep-root'], bool(job.keepRoot, false, 'job.keepRoot'), '--keep-root'),
    dryRun: bool(args['dry-run'], bool(job.dryRun, false, 'job.dryRun'), '--dry-run'),
    name,
  };
}

/** `--poem "Пушкин/У лукоморья"` → D:\mycode\poetry\texts\Пушкин\У лукоморья. */
function poemSource(poem) {
  const parts = String(poem)
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean);
  if (parts.length !== 2) {
    throw new UsageError(`--poem должен быть в виде "<Поэт>/<Стих>": ${poem}`);
  }
  const dir = path.resolve(ROOT, '..', '..', 'texts', ...parts);
  if (!fs.existsSync(dir)) throw new Error(`Папка стиха не найдена: ${dir}`);
  return dir;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function printHelp() {
  console.log(`
upload-helper-disk — бекапы видео на Яндекс Диск через REST API

  node run.js token                         проверить токен и показать диск

  node run.js info  [--remote "${config.remoteDir}"]
      Проверка токена, свободного места и папки на Диске.

  node run.js list  [--remote "${config.remoteDir}"] [--recursive] [--limit 100]
      Что уже лежит на Диске.

  node run.js upload --poem "Пушкин/У лукоморья"
      Загрузить один стих: texts/Пушкин/У лукоморья/*.mp4 →
      ${config.remoteDir}/Пушкин/У лукоморья/*.mp4.

  node run.js upload --source "D:\\mycode\\poetry\\texts"
      Загрузить все видео из texts, сохранив структуру:
      ${config.remoteDir} + /<Поэт>/<Стих>/<файл>.mp4 (имя файла сохраняется).
      Папки поэта и стиха создаются на Диске автоматически.
      Повторный запуск пропускает файлы с совпадающим размером и md5.

  node run.js upload --job backup.json
      Параметры из JSON: source (строка или массив), poem, remote, extensions,
      overwrite, verify, dryRun, keepRoot, name.
      Относительные пути в job считаются от папки job-файла.

  Флаги upload:
      --poem <Поэт/Стих>     один стих из texts; вместо --source
      --source <путь>        файл или папка; можно повторять (--file — то же самое)
      --remote <папка>       куда класть на Диске; по умолчанию ${config.remoteDir}
      --name <файл.mp4>      имя на Диске (только для одного файла)
      --ext mp4,webm         какие расширения брать; по умолчанию mp4
      --all                  брать любые файлы, не только видео
      --keep-root            добавить имя исходной папки в путь на Диске
      --overwrite            заменять отличающийся файл на Диске
      --no-verify            не считать md5 (быстрее, но только размер)
      --dry-run              показать, что было бы загружено, ничего не менять

  Флаги-переключатели не забирают следующее слово; значение — только через =.
  Файл всегда грузится целиком; при обрыве соединения загрузка повторяется.

  Токен берётся из переменной YANDEX_DISK_TOKEN, иначе из корневого .env.
  Через командную строку токен не передаётся.
  Для ${config.remoteDir} нужен токен на весь Диск:
  cloud_api:disk.read, cloud_api:disk.write, cloud_api:disk.info.
  Схема пути: / или disk:/ — весь Диск, app:/ — папка приложения.
  Результат: logs/<run>/state.json и строка RESULT_JSON в конце вывода.
  Коды выхода: 0 — успех, 1 — ошибка или конфликт, 2 — неверная команда.
`);
}
