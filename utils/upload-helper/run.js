#!/usr/bin/env node
/**
 * upload-helper — загрузка роликов на VK Видео и RUTUBE через настоящий браузер.
 *
 * Команды:
 *   node run.js login   [--platform vk|rutube]
 *   node run.js probe   [--platform vk|rutube]
 *   node run.js upload  --job job.json | --video ... --title ...
 *   node run.js playlists --job job.json [--url ...]   (VK: добавить опубликованный ролик в плейлисты)
 *
 * Подробности — README.md рядом.
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import { config, resolvePath, fromRoot, platformTarget } from './lib/config.js';
import { bool, list, number, option, parseArgs, UsageError } from '../lib/args.js';
import { readJson, readText } from '../lib/files.js';
import { Run, runDir, slug } from '../lib/state.js';
import {
  checkLogin,
  holdForManualPublish,
  isLoggedIn,
  openBrowser,
  stdinHint,
  waitForLogin,
  waitForUser,
} from './lib/browser.js';
import { probe } from './lib/probe.js';
import { addPlaylistsVk, uploadVk } from './lib/vk.js';
import { uploadRutube } from './lib/rutube.js';
import { uploadYoutube } from './lib/youtube.js';
import { setupYoutubeChannel } from './lib/youtube-channel.js';
import { checkVideo, findThumb, normalizeText, validateMeta } from './lib/media.js';

const PLATFORMS = ['vk', 'rutube', 'youtube'];
const ALL_PLATFORMS = ['vk', 'rutube', 'youtube'];
// YouTube — только по явному указанию: не все стихи свободны в США.
const DEFAULT_UPLOAD_PLATFORMS = ['vk', 'rutube'];
const BOOLEAN_FLAGS = ['no-publish', 'keep-open', 'headless', 'dry-run'];

const args = parseArgs(process.argv.slice(2), { booleans: BOOLEAN_FLAGS });
const command = args._[0] || 'help';

main().catch(async (error) => {
  console.error(`\nОшибка: ${error?.message || error}`);
  process.exitCode = error instanceof UsageError ? 2 : 1;
});

async function main() {
  // Другой профиль Chrome — например, копия, когда основной занят другой загрузкой.
  const profile = option(args, 'profile', 'Укажи папку профиля: --profile "<папка>"');
  if (profile) config.profileDir = path.resolve(profile);

  switch (command) {
    case 'login':
      return login();
    case 'probe':
      return runProbe();
    case 'upload':
      return upload();
    case 'channel':
      return channel();
    case 'playlists':
      return playlists();
    case 'help':
    case '--help':
    case '-h':
      return printHelp();
    default:
      printHelp();
      process.exitCode = 2;
  }
}

async function login() {
  const platforms = platformsFromArgs(ALL_PLATFORMS);
  const { context } = await openBrowser({ headless: false, slowMo: 150 });

  console.log('\nОткрываю кабинеты. Залогинься в каждом окне (капча/2FA — вручную).');
  console.log('Вход сохраняется в отдельный профиль .profile и переживёт перезапуск.\n');

  const pages = new Map();
  for (const platform of platforms) {
    const tab = await context.newPage();
    await tab
      .goto(platformTarget(platform), {
        waitUntil: 'domcontentloaded',
        timeout: config.timeouts.navigation,
      })
      .catch(() => {});
    await tab.waitForTimeout(2500);
    pages.set(platform, tab);
    console.log(`  ${platform}: ${tab.url()}`);
  }

  if (process.stdin.isTTY) {
    const rl = readline.createInterface({ input, output });
    await rl.question('\nEnter — когда залогинился: ');
    rl.close();
  } else {
    console.log(
      `\nТерминала нет: жду, пока все площадки станут залогинены (до ${Math.round(
        config.timeouts.loginWait / 60000,
      )} мин.)...`,
    );
    await waitForAllLogins(pages, platforms);
  }

  for (const platform of platforms) {
    const status = await checkLogin(pages.get(platform), platform);
    console.log(`  ${platform}: ${status.ok ? 'залогинен' : 'НЕ залогинен'} (${status.url})`);
  }

  await context.close();
  console.log('\nПрофиль сохранён: логин переживёт перезапуск.');
}

/** Без терминала (фон) ждём автодетектом: пользователь логинится, скрипт закрывается сам. */
async function waitForAllLogins(pages, platforms) {
  const deadline = Date.now() + config.timeouts.loginWait;
  let last = [];

  while (Date.now() < deadline) {
    const states = [];
    for (const platform of platforms) {
      states.push(await isLoggedIn(pages.get(platform), platform).catch(() => false));
    }
    const line = platforms.map((platform, i) => `${platform}: ${states[i] ? 'ок' : 'жду'}`).join(', ');
    if (line !== last.join(', ')) {
      console.log(`  ${line}`);
      last = line.split(', ');
    }
    if (states.every(Boolean)) return true;
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  return false;
}

async function runProbe() {
  const platforms = platformsFromArgs(ALL_PLATFORMS);
  const settle = number(option(args, 'settle', 'Укажи паузу в мс: --settle 8000'), 6000);
  const url = option(args, 'url', 'Укажи адрес: --url "https://..."');
  const attach = option(args, 'attach', 'Укажи файл: --attach "<видео>"');
  const keepOpen = bool(args['keep-open'], false, '--keep-open');
  const run = new Run(runDir(fromRoot('logs'), 'probe'));
  const { context, page } = await openBrowser({ headless: false, slowMo: 100 });

  try {
    for (const platform of platforms) {
      await page
        .goto(platformTarget(platform), {
          waitUntil: 'domcontentloaded',
          timeout: config.timeouts.navigation,
        })
        .catch(() => {});
      await page.waitForTimeout(2500);

      if (!(await isLoggedIn(page, platform))) {
        console.log(`\n[${platform}] Ты не залогинен. Войди в открывшемся окне: ${page.url()}`);
        console.log(`[${platform}] Жду до ${Math.round(config.timeouts.loginWait / 60000)} минут...`);
        const ok = await waitForLogin(page, { platform });
        if (!ok) throw new Error(`${platform}: не дождался логина — повтори node run.js probe --platform ${platform}`);
        console.log(`[${platform}] Логин есть, продолжаю.`);
      }

      await probe({
        page,
        platform,
        run,
        clicks: list(args.click),
        settle,
        url,
        attach,
      });
    }
    console.log(`\nГотово. Смотри ${path.join(run.dir, 'probe-*.md')}`);
  } finally {
    if (!keepOpen) await context.close();
  }
}

async function upload() {
  const job = loadJob();
  const headless = bool(args.headless, config.headless, '--headless');
  const keepOpen = bool(args['keep-open'], false, '--keep-open');

  const videoInfo = checkVideo(job.video);
  const thumb = findThumb(job.video, job.thumb);
  const warnings = validateMeta(job);

  const run = new Run(runDir(fromRoot('logs'), job.title), {
    platform: null,
    ready: false,
    published: false,
    url: null,
    videoId: null,
  });
  for (const warning of warnings) run.warn(warning);

  job.thumb = thumb;

  console.log(`\nВидео: ${job.video} (${(videoInfo.size / 1024 ** 2).toFixed(1)} МБ)`);
  console.log(`Обложка: ${thumb || 'нет'}`);
  console.log(`Площадки: ${job.platforms.join(', ')}`);
  console.log(
    `Публиковать: ${job.publish ? 'да' : 'нет — остановлюсь перед кнопкой и подожду, пока опубликуешь сам'}`,
  );
  console.log(`Логи: ${run.dir}`);

  const { context, page: firstPage } = await openBrowser({ headless });
  let page = firstPage;

  const results = [];
  const failures = [];
  // Площадки, где форма заполнена и ждёт ручного «Опубликовать» (--no-publish).
  const held = [];
  try {
    for (const platform of job.platforms) {
      run.set({ platform });

      // Форма предыдущей площадки ждёт человека — следующую открываем в новой вкладке.
      if (held.some((item) => item.page === page)) page = await context.newPage();

      try {
        const status = await checkLogin(page, platform);
        if (!status.ok) {
          throw new Error(`${platform}: не залогинен — выполни: node run.js login`);
        }

        const result =
          platform === 'vk'
            ? await uploadVk({ page, job, run })
            : platform === 'rutube'
              ? await uploadRutube({ page, job, run })
              : await uploadYoutube({ page, job, run });

        results.push({ platform, ...result });
        if (result.error) {
          failures.push({ platform, error: result.error, uploaded: true });
          run.warn(result.error);
        } else if (result.pendingPublish) {
          held.push({ platform, page });
        }
      } catch (error) {
        const message = String(error?.message || error);
        failures.push({ platform, error: message });
        run.warn(message);
        await run.shot(page, `${platform}-error`);
      }
    }

    if (held.length > 0) {
      run.set({ stage: 'ждёт ручной публикации', results, failures });
      await holdForManualPublish(context, held, headless);
    }

    run.set({ stage: failures.length ? 'failed' : 'done', results, failures });
    if (failures.length > 0) {
      throw new Error(failures.map((item) => item.error).join(' | '));
    }

    console.log(`\nГотово. Состояние: ${run.statePath}`);
    console.log(`RESULT_JSON: ${JSON.stringify({ ok: true, results, stateFile: run.statePath })}`);
  } catch (error) {
    run.fail(error, { results, failures });
    await run.shot(page, 'error');
    const retry = retryAdvice(results, failures);
    if (retry.hint) console.log(`\n${retry.hint}`);
    console.log(
      `RESULT_JSON: ${JSON.stringify({
        ok: false,
        error: String(error?.message || error),
        results,
        failures,
        doneOn: retry.doneOn,
        retryOn: retry.retryOn,
        stateFile: run.statePath,
      })}`,
    );
    process.exitCode = 1;
    if (keepOpen && context.pages().length > 0) {
      console.log(
        `\nБраузер оставлен открытым для разбора (--keep-open). Закрой окно${stdinHint()}.`,
      );
      await waitForUser(context, config.timeouts.manualPublish);
    }
  } finally {
    await context.close().catch(() => {});
  }
}

/** Оформление канала: имя, описание, аватар и баннер (сейчас — только YouTube). */
async function channel() {
  const jobArg = option(args, 'job', 'Укажи файл настроек канала: --job channels/youtube.json');
  if (!jobArg) throw new UsageError('Укажи файл настроек канала: --job channels/youtube.json');
  const jobPath = path.resolve(jobArg);
  if (!fs.existsSync(jobPath)) throw new UsageError(`Файл не найден: ${jobPath}`);

  const job = readJson(jobPath);
  const baseDir = path.dirname(jobPath);
  const dryRun = bool(args['dry-run'], false, '--dry-run');
  job.name = option(args, 'name', 'Укажи название: --name "stsAI Стихи"') ?? job.name;
  job.handle = option(args, 'handle', 'Укажи handle: --handle stsAiPoetry') ?? job.handle;
  job.descriptionFile =
    option(args, 'description-file', 'Укажи файл описания: --description-file "<файл>"') ?? job.descriptionFile;
  job.avatar = option(args, 'avatar', 'Укажи аватар: --avatar "<картинка>"') ?? job.avatar;
  job.banner = option(args, 'banner', 'Укажи баннер: --banner "<картинка>"') ?? job.banner;
  job.description = job.descriptionFile
    ? readText(resolvePath(job.descriptionFile, baseDir))
    : normalizeText(job.description);

  const run = new Run(runDir(fromRoot('logs'), `channel-${job.name || 'youtube'}`), {
    platform: 'youtube',
    ready: false,
  });

  console.log(`\nКанал: ${job.name || '(без имени)'}`);
  console.log(`Аватар: ${job.avatar || 'нет'}`);
  console.log(`Баннер: ${job.banner || 'нет'}`);
  console.log(`Логи: ${run.dir}`);

  const { context, page } = await openBrowser({ headless: false });
  try {
    const status = await checkLogin(page, 'youtube');
    if (!status.ok) throw new Error('YouTube: не залогинен — выполни: node run.js login --platform youtube');

    const result = await setupYoutubeChannel({ page, job, baseDir, run, dryRun });
    console.log(`\nСостояние: ${run.statePath}`);
    console.log(
      `RESULT_JSON: ${JSON.stringify({
        ok: !result.error,
        ...result,
        stateFile: run.statePath,
      })}`,
    );
    if (result.error) process.exitCode = 1;
  } catch (error) {
    run.fail(error);
    await run.shot(page, 'youtube-channel-error');
    console.log(
      `RESULT_JSON: ${JSON.stringify({
        ok: false,
        error: String(error?.message || error),
        stateFile: run.statePath,
      })}`,
    );
    process.exitCode = 1;
  } finally {
    await context.close().catch(() => {});
  }
}

/**
 * VK: добавляет уже опубликованный ролик в плейлисты — например, когда при загрузке
 * плейлист не выбрался. Меняет только плейлисты: сам ролик, описание и доступ не трогает.
 * Ссылку берёт из --url или из последней загрузки с тем же названием (logs/).
 */
async function playlists() {
  const jobArg = option(args, 'job', 'Укажи путь к job-файлу: --job job.json');
  const jobPath = jobArg ? path.resolve(jobArg) : null;
  if (jobPath && !fs.existsSync(jobPath)) throw new UsageError(`Job-файл не найден: ${jobPath}`);
  const job = jobPath ? readJson(jobPath) : {};

  const title = normalizeText(option(args, 'title', 'Укажи название: --title "Название - Фамилия"') ?? job.title ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  const names = args.playlist !== undefined ? list(args.playlist) : list(job.playlists);
  const platforms = parsePlatforms(args.platform, ['vk']);
  if (platforms.some((platform) => platform !== 'vk')) {
    throw new UsageError('playlists умеет только VK: на RUTUBE и YouTube плейлисты ставятся при загрузке');
  }
  if (names.length === 0) throw new UsageError('Нет плейлистов: укажи --playlist "класс 3" или playlists в job.json');

  const url = option(args, 'url', 'Укажи ссылку: --url "https://vkvideo.ru/video-…"') ?? findUploadedUrl('vk', title);
  if (!url) {
    throw new UsageError(`Не нашёл в logs/ загрузку «${title || '?'}» на VK — укажи ссылку: --url "https://vkvideo.ru/video-…"`);
  }

  const headless = bool(args.headless, config.headless, '--headless');
  const dryRun = bool(args['dry-run'], false, '--dry-run');
  const run = new Run(runDir(fromRoot('logs'), `${title || 'vk'} playlists`), { platform: 'vk', url });
  console.log(`\nРолик: ${title || '(название не задано — проверки названия не будет)'}`);
  console.log(`Ссылка: ${url}`);
  console.log(`Плейлисты: ${names.join(', ')}`);
  console.log(`Логи: ${run.dir}`);

  const { context, page } = await openBrowser({ headless });
  try {
    const status = await checkLogin(page, 'vk');
    if (!status.ok) throw new Error('vk: не залогинен — выполни: node run.js login --platform vk');

    const result = await addPlaylistsVk({ page, url, playlists: names, expectTitle: title || null, dryRun, run });
    for (const name of result.missing) {
      run.warn(`VK: ролик не попал в плейлист «${name}» — его нет в кабинете или VK не нашёл его в подсказках`);
    }
    run.set({ stage: result.ok ? 'done' : 'failed', result });
    console.log(`\nСостояние: ${run.statePath}`);
    console.log(`RESULT_JSON: ${JSON.stringify({ ...result, url, stateFile: run.statePath })}`);
    if (!result.ok) process.exitCode = 1;
  } catch (error) {
    run.fail(error);
    await run.shot(page, 'vk-playlists-error');
    console.log(
      `RESULT_JSON: ${JSON.stringify({ ok: false, error: String(error?.message || error), url, stateFile: run.statePath })}`,
    );
    process.exitCode = 1;
  } finally {
    await context.close().catch(() => {});
  }
}

/** Ссылка из последней удачной загрузки с этим названием: logs/<время>-<название>/state.json. */
function findUploadedUrl(platform, title) {
  if (!title) return null;
  const logs = fromRoot('logs');
  if (!fs.existsSync(logs)) return null;
  const runs = fs
    .readdirSync(logs)
    .filter((name) => name.endsWith(`-${slug(title)}`))
    .sort()
    .reverse();
  for (const name of runs) {
    const file = path.join(logs, name, 'state.json');
    if (!fs.existsSync(file)) continue;
    const state = readJson(file);
    const failed = new Set((state.failures ?? []).map((item) => item.platform));
    const hit = (state.results ?? []).find((item) => item.platform === platform && item.url && !failed.has(platform));
    if (hit) return hit.url;
  }
  return null;
}

/**
 * Что делать после частичного сбоя. Площадки, где ролик уже загружен, повторять нельзя:
 * новый запуск зальёт туда второй ролик.
 */
function retryAdvice(results, failures) {
  const failed = new Set(failures.map((item) => item.platform));
  const doneOn = results.filter((item) => !failed.has(item.platform)).map((item) => item.platform);
  const retryOn = failures.filter((item) => !item.uploaded).map((item) => item.platform);
  const manual = failures.filter((item) => item.uploaded).map((item) => item.platform);

  const lines = [];
  if (doneOn.length > 0) {
    lines.push(`Не перезапускай для ${doneOn.join(', ')}: там ролик уже загружен, повтор создаст дубль.`);
  }
  if (manual.length > 0) {
    lines.push(`${manual.join(', ')}: ролик загружен, но не опубликован — доделай вручную в студии.`);
  }
  if (retryOn.length > 0) {
    lines.push(
      `Повтор только для ${retryOn.join(', ')}: та же команда с ${retryOn.map((p) => `--platform ${p}`).join(' ')}. ` +
        'Сначала проверь студию: если ролик там остался черновиком, удали его или доделай вручную.',
    );
  }

  return { doneOn, retryOn, hint: lines.join('\n') };
}

function loadJob() {
  const jobArg = option(args, 'job', 'Укажи путь к job-файлу: --job job.json');
  const jobPath = jobArg ? path.resolve(jobArg) : null;
  const baseDir = jobPath ? path.dirname(jobPath) : process.cwd();
  if (jobPath && !fs.existsSync(jobPath)) throw new UsageError(`Job-файл не найден: ${jobPath}`);
  const job = jobPath ? readJson(jobPath) : {};

  const flag = (name, hint) => option(args, name, hint);
  job.video = flag('video', 'Укажи путь к видео: --video "<файл.mp4>"') ?? job.video;
  job.title = flag('title', 'Укажи название: --title "Название - Фамилия"') ?? job.title;
  job.thumb = flag('thumb', 'Укажи обложку: --thumb "<картинка>"') ?? job.thumb;
  job.category = flag('category', 'Укажи категорию: --category "Культура"') ?? job.category;
  if (args.playlist !== undefined) job.playlists = list(args.playlist);
  job.descriptionFile = flag('description-file', 'Укажи файл описания: --description-file "<файл>"') ?? job.descriptionFile;
  job.description = flag('description', 'Укажи описание: --description "<текст>"') ?? job.description;

  if (job.descriptionFile) {
    job.description = readText(resolvePath(job.descriptionFile, baseDir));
  }

  job.video = resolvePath(job.video, baseDir);
  job.thumb = job.thumb ? resolvePath(job.thumb, baseDir) : null;
  job.title = normalizeText(job.title).replace(/\s+/g, ' ');
  job.description = normalizeText(job.description);
  job.category = job.category || config.defaults.category;
  job.playlists = list(job.playlists);
  job.publish = bool(job.publish, config.defaults.publish, 'job.publish');
  job.platforms = parsePlatforms(
    list(args.platform).length ? args.platform : job.platforms,
    DEFAULT_UPLOAD_PLATFORMS,
  );

  if (bool(args['no-publish'], false, '--no-publish')) job.publish = false;

  return job;
}

function platformsFromArgs(fallback) {
  return parsePlatforms(args.platform, fallback);
}

/** Площадки из флага или job; опечатка — ошибка, а не молчаливый пропуск площадки. */
function parsePlatforms(value, fallback) {
  const names = list(value).map((name) => name.toLowerCase());
  if (names.length === 0) return [...fallback];
  const unknown = names.filter((name) => !PLATFORMS.includes(name));
  if (unknown.length > 0) {
    throw new UsageError(`Неизвестная площадка: ${unknown.join(', ')}. Допустимо: ${PLATFORMS.join(', ')}`);
  }
  return [...new Set(names)];
}

function printHelp() {
  console.log(`
upload-helper — VK Видео, RUTUBE и YouTube через настоящий браузер

  node run.js login  [--platform vk|rutube|youtube]
      Открывает Chrome с постоянным профилем, ты логинишься руками.
      Логин сохраняется в .profile и переживает перезапуск.
      Без терминала (фоновый запуск) скрипт сам ждёт авторизации до 10 минут.

  node run.js probe  [--platform vk|rutube|youtube] [--click "Добавить"] [--click "Загрузить видео"] [--settle 8000]
      Снимает карту страницы загрузки (кнопки, поля, селекты) в logs/<run>/probe-*.md.
      --click можно повторять: кнопки нажимаются по очереди перед снимком.

  node run.js upload --job job.json
  node run.js upload --video "D:\\path\\video.mp4" --title "Название - Фамилия" \\
                     --description-file "D:\\path\\desc.txt" --thumb "D:\\path\\cover.png" \\
                     --playlist "класс-7" --playlist "класс-11" [--platform vk] [--no-publish]

  node run.js playlists --job job.json [--url "https://vkvideo.ru/video-…"] [--playlist "класс 3"] [--dry-run]
      VK: добавляет уже опубликованный ролик в плейлисты (если при загрузке они не выбрались).
      Меняет только плейлисты. Ссылку берёт из --url или из последней загрузки в logs/,
      плейлисты — из job.json или --playlist; название ролика сверяется с job.json.
      --dry-run — только показать, в каких плейлистах ролик и чего не хватает.

  node run.js channel --job channels/youtube.json
      Оформление канала YouTube: имя, handle, описание, аватар и баннер.

  Флаги upload:
      --platform vk|rutube|youtube   можно повторять; по умолчанию vk и rutube
                                     (youtube — только явно: не все стихи свободны в США)
      --no-publish           остановиться перед кнопкой «Опубликовать» и держать формы
                             открытыми (каждая площадка — своя вкладка), пока ты не
                             опубликуешь и не закроешь окно (или Enter); до 60 мин.
      --keep-open            не закрывать браузер при ошибке (для разбора)
      --headless             без окна (не рекомендуется)
      --profile <папка>      другой профиль Chrome (например, копия, если основной занят)

  Доступ «по ссылке» проверяется перед публикацией. Если он не подтвердился,
  ролик остаётся неопубликованным, а запуск завершается с ok:false.
  При частичном сбое не перезапускай площадки, где ролик уже загружен (doneOn в RESULT_JSON).

  Результат: logs/<run>/state.json и строка RESULT_JSON в конце вывода.
`);
}
