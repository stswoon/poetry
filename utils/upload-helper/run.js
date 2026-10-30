#!/usr/bin/env node
/**
 * upload-helper — загрузка роликов на VK Видео и RUTUBE через настоящий браузер.
 *
 * Команды:
 *   node run.js login   [--platform vk|rutube]
 *   node run.js probe   [--platform vk|rutube]
 *   node run.js upload  --job job.json | --video ... --title ...
 *
 * Подробности — README.md рядом.
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import { config, resolvePath, fromRoot } from './lib/config.js';
import { bool, list, number, option, parseArgs, UsageError } from '../lib/args.js';
import { readJson, readText } from '../lib/files.js';
import { Run, runDir } from '../lib/state.js';
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
import { uploadVk } from './lib/vk.js';
import { uploadRutube } from './lib/rutube.js';
import { checkVideo, findThumb, normalizeText, validateMeta } from './lib/media.js';

const PLATFORMS = ['vk', 'rutube'];
const BOOLEAN_FLAGS = ['no-publish', 'keep-open', 'headless'];

const args = parseArgs(process.argv.slice(2), { booleans: BOOLEAN_FLAGS });
const command = args._[0] || 'help';

main().catch(async (error) => {
  console.error(`\nОшибка: ${error?.message || error}`);
  process.exitCode = error instanceof UsageError ? 2 : 1;
});

async function main() {
  switch (command) {
    case 'login':
      return login();
    case 'probe':
      return runProbe();
    case 'upload':
      return upload();
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
  const platforms = platformsFromArgs(['vk', 'rutube']);
  const { context } = await openBrowser({ headless: false, slowMo: 150 });

  console.log('\nОткрываю кабинеты. Залогинься в каждом окне (капча/2FA — вручную).');
  console.log('Когда оба кабинета будут открыты и авторизованы — нажми Enter здесь.\n');

  const pages = new Map();
  for (const platform of platforms) {
    const target = platform === 'vk' ? config.vk.cabinet : config.rutube.studio;
    const tab = await context.newPage();
    await tab.goto(target, { waitUntil: 'domcontentloaded', timeout: config.timeouts.navigation }).catch(() => {});
    await tab.waitForTimeout(2500);
    pages.set(platform, tab);
    console.log(`  ${platform}: ${tab.url()}`);
  }

  const rl = readline.createInterface({ input, output });
  await rl.question('\nEnter — когда залогинился: ');
  rl.close();

  for (const platform of platforms) {
    const status = await checkLogin(pages.get(platform), platform);
    console.log(`  ${platform}: ${status.ok ? 'залогинен' : 'НЕ залогинен'} (${status.url})`);
  }

  await context.close();
  console.log('\nПрофиль сохранён: логин переживёт перезапуск.');
}

async function runProbe() {
  const platforms = platformsFromArgs(['vk', 'rutube']);
  const settle = number(option(args, 'settle', 'Укажи паузу в мс: --settle 8000'), 6000);
  const keepOpen = bool(args['keep-open'], false, '--keep-open');
  const run = new Run(runDir(fromRoot('logs'), 'probe'));
  const { context, page } = await openBrowser({ headless: false, slowMo: 100 });

  try {
    for (const platform of platforms) {
      const target = platform === 'vk' ? config.vk.cabinet : config.rutube.studio;
      await page.goto(target, { waitUntil: 'domcontentloaded', timeout: config.timeouts.navigation }).catch(() => {});
      await page.waitForTimeout(2500);

      if (!(await isLoggedIn(page))) {
        console.log(`\n[${platform}] Ты не залогинен. Войди в открывшемся окне: ${page.url()}`);
        console.log(`[${platform}] Жду до ${Math.round(config.timeouts.loginWait / 60000)} минут...`);
        const ok = await waitForLogin(page);
        if (!ok) throw new Error(`${platform}: не дождался логина — повтори node run.js probe --platform ${platform}`);
        console.log(`[${platform}] Логин есть, продолжаю.`);
      }

      await probe({
        page,
        platform,
        run,
        clicks: list(args.click),
        settle,
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
            : await uploadRutube({ page, job, run });

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
  job.platforms = parsePlatforms(list(args.platform).length ? args.platform : job.platforms, PLATFORMS);

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
upload-helper — VK Видео и RUTUBE через настоящий браузер

  node run.js login  [--platform vk|rutube]
      Открывает Chrome с постоянным профилем, ты логинишься руками.
      Логин сохраняется в .profile и переживает перезапуск.

  node run.js probe  [--platform vk|rutube] [--click "Добавить"] [--click "Загрузить видео"] [--settle 8000]
      Снимает карту страницы загрузки (кнопки, поля, селекты) в logs/<run>/probe-*.md.
      --click можно повторять: кнопки нажимаются по очереди перед снимком.

  node run.js upload --job job.json
  node run.js upload --video "D:\\path\\video.mp4" --title "Название - Фамилия" \\
                     --description-file "D:\\path\\desc.txt" --thumb "D:\\path\\cover.png" \\
                     --playlist "класс-7" --playlist "класс-11" [--platform vk] [--no-publish]

  Флаги upload:
      --platform vk|rutube   можно повторять; по умолчанию обе
      --no-publish           остановиться перед кнопкой «Опубликовать» и держать формы
                             открытыми (каждая площадка — своя вкладка), пока ты не
                             опубликуешь и не закроешь окно (или Enter); до 60 мин.
      --keep-open            не закрывать браузер при ошибке (для разбора)
      --headless             без окна (не рекомендуется)

  Доступ «по ссылке» проверяется перед публикацией. Если он не подтвердился,
  ролик остаётся неопубликованным, а запуск завершается с ok:false.
  При частичном сбое не перезапускай площадки, где ролик уже загружен (doneOn в RESULT_JSON).

  Результат: logs/<run>/state.json и строка RESULT_JSON в конце вывода.
`);
}
