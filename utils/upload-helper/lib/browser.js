import fs from 'node:fs';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { chromium } from 'playwright-core';
import { config, fromRoot } from './config.js';

/**
 * Настоящий Chrome с постоянным профилем: логин переживает перезапуск.
 * Профиль отдельный — к своему обычному Chrome подключиться нельзя
 * (Chrome 136+ игнорирует remote debugging на профиле по умолчанию).
 */
export async function openBrowser({ headless = config.headless, slowMo = config.slowMo } = {}) {
  const userDataDir = fromRoot(config.profileDir);
  fs.mkdirSync(userDataDir, { recursive: true });

  try {
    const context = await chromium.launchPersistentContext(userDataDir, {
      channel: config.browserChannel,
      headless,
      slowMo,
      viewport: null,
      acceptDownloads: false,
      args: [
        '--start-maximized',
        '--disable-blink-features=AutomationControlled',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=CalculateNativeWinOcclusion',
      ],
      ignoreDefaultArgs: ['--enable-automation'],
    });

    context.setDefaultTimeout(30000);

    const page = context.pages()[0] ?? (await context.newPage());
    return { context, page };
  } catch (error) {
    const text = String(error?.message || error);
    if (/ProcessSingleton|profile|user data directory|Lock file/i.test(text)) {
      throw new Error(
        `Профиль ${userDataDir} уже занят другим Chrome.\n` +
          'Закрой окно автоматизации (или другой запуск скрипта) и повтори.',
      );
    }
    throw error;
  }
}

/** Похоже ли на страницу входа. */
export function urlLooksLikeLogin(url) {
  return /id\.vk\.(com|ru)|\/login|\/auth|signin|account\/login|multipass/i.test(url);
}

/** Проверка «залогинен» без перехода: по URL и кнопке «Войти». */
export async function isLoggedIn(page) {
  if (urlLooksLikeLogin(page.url())) return false;
  const loginButton = await page
    .getByRole('button', { name: /^Войти$|Войти в аккаунт/i })
    .first()
    .isVisible()
    .catch(() => false);
  return !loginButton;
}

/** Ждёт, пока пользователь залогинится в открытом окне. */
export async function waitForLogin(page, { timeoutMs = config.timeouts.loginWait, poll = 3000 } = {}) {
  const deadline = Date.now() + timeoutMs;

  await page.bringToFront().catch(() => {});

  while (Date.now() < deadline) {
    if (await isLoggedIn(page)) return true;
    await page.waitForTimeout(poll);
  }

  return false;
}

/** Проверяет, залогинен ли пользователь в кабинете площадки. */
export async function checkLogin(page, platform) {
  const target = platform === 'vk' ? config.vk.cabinet : config.rutube.studio;

  await page.goto(target, { waitUntil: 'domcontentloaded', timeout: config.timeouts.navigation });
  await page.waitForTimeout(3000);

  return { ok: await isLoggedIn(page), url: page.url() };
}

export async function goto(page, url, timeout = config.timeouts.navigation) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
  await page.waitForTimeout(1500);
}

/**
 * --no-publish: формы остаются открытыми, пока человек не нажмёт «Опубликовать»
 * и не закроет окно браузера (или Enter в терминале). Без окна (--headless) ждать нечего.
 */
export async function holdForManualPublish(context, held, headless) {
  const names = held.map((item) => item.platform).join(', ');
  if (headless) {
    console.log(`\n! --headless: окна нет, формы ${names} закроются без публикации.`);
    return;
  }

  await held[0].page.bringToFront().catch(() => {});
  const minutes = Math.round(config.timeouts.manualPublish / 60000);
  console.log(`\nФормы ждут ручной публикации: ${names} — у каждой площадки своя вкладка.`);
  console.log(`Нажми «Опубликовать» в каждой, затем закрой окно браузера${stdinHint()}.`);
  console.log(`Жду до ${minutes} мин.; потом браузер закроется сам.`);

  const reason = await waitForUser(context, config.timeouts.manualPublish);
  if (reason === 'timeout') console.log(`! Прошло ${minutes} мин. — закрываю браузер.`);
}

export function stdinHint() {
  return process.stdin.isTTY ? ' или нажми Enter здесь' : '';
}

/** Ждёт, пока закроют браузер, нажмут Enter (если есть терминал) или выйдет время. */
export async function waitForUser(context, timeoutMs) {
  let timer = null;
  let rl = null;

  const waits = [
    new Promise((resolve) => context.once('close', () => resolve('closed'))),
    new Promise((resolve) => {
      timer = setTimeout(() => resolve('timeout'), timeoutMs);
    }),
  ];
  if (process.stdin.isTTY) {
    rl = readline.createInterface({ input, output });
    waits.push(rl.question('').then(() => 'enter'));
  }

  try {
    return await Promise.race(waits);
  } finally {
    clearTimeout(timer);
    rl?.close();
  }
}
