import fs from 'node:fs';
import { config } from './config.js';
import { selectors } from './selectors.js';
import { attachFile, findFirst, waitEnabled } from './ui.js';
import { goto, youtubeChannelId } from './browser.js';

const s = selectors.youtube;

/**
 * YouTube Studio, новый мастер загрузки (2025–2026):
 * Информация → Дополнения → Проверка → Доступ.
 * Публикуем только после проверки, что в «Доступ» стоит «Доступ по ссылке» (unlisted).
 */
export async function uploadYoutube({ page, job, run }) {
  const t = config.timeouts;

  run.step('youtube: открываю студию');
  await goto(page, config.youtube.uploadUrl);
  const channelId = youtubeChannelId(page.url());
  if (!channelId) {
    throw new Error(
      'YouTube: студия не открыла канал. Проверь логин: node run.js login --platform youtube',
    );
  }
  run.info(`Канал: ${channelId}`);

  // Своя обложка доступна только подтверждённому по телефону каналу.
  const verified = job.thumb ? await isChannelVerified(page) : true;
  if (job.thumb && !verified) {
    run.warn(
      'YouTube: канал не подтверждён по телефону — своя обложка не загрузится. ' +
        'Подтверди номер на https://www.youtube.com/verify и запусти загрузку снова',
    );
  }

  run.step('youtube: открываю окно загрузки и прикрепляю видео');
  const attached = await attachVideo(page, run, job.video);
  if (!attached) {
    await run.shot(page, 'youtube-no-file-input');
    throw new Error(
      'YouTube: не нашёл, куда прикрепить видео. Запусти probe --platform youtube --attach <файл> и поправь lib/selectors.js → youtube.fileInputs',
    );
  }
  run.info(`Файл прикреплён через ${attached.via}`);

  // Ссылка появляется в окне почти сразу — сохраним её до публикации.
  const knownUrl = await readVideoUrl(page, 15000);
  if (knownUrl) run.info(`Ссылка: ${knownUrl}`);

  run.step('youtube: заполняю название и описание');
  const titleField = await findFirst(page, s.title, { timeout: t.formAppear });
  if (!titleField) {
    await run.shot(page, 'youtube-no-form');
    throw new Error(
      'YouTube: форма загрузки не появилась (нет поля названия). Запусти probe --platform youtube --attach <файл> и поправь lib/selectors.js → youtube.title',
    );
  }
  await fillField(page, titleField, job.title);
  run.info(`Название: ${job.title}`);

  const descriptionField = await findFirst(page, s.description, { timeout: 15000 });
  if (descriptionField) {
    await fillField(page, descriptionField, job.description);
    run.info(`Описание: ${job.description.length} символов`);
  } else {
    run.warn('YouTube: не нашёл поле описания — заполни вручную');
  }

  run.step('youtube: аудитория');
  await chooseAudience(page, run);

  await expandMore(page);
  await chooseCategory(page, run);
  await markAlteredContent(page);
  await markNoPaidProduct(page);

  await run.shot(page, 'youtube-details');

  if (job.thumb && verified) {
    const thumbSize = fs.statSync(job.thumb).size;
    if (thumbSize > 2 * 1024 * 1024) {
      run.warn('YouTube: обложка больше 2 МБ — YouTube её не примет, пересохрани в JPG/PNG до 2 МБ');
    }
    run.step('youtube: ставлю обложку');
    const cover = await attachFile(page, {
      inputs: s.thumbInputs,
      triggers: s.thumbTriggers,
      file: job.thumb,
      waitMs: 15000,
    });
    if (cover) {
      run.info(`Обложка прикреплена через ${cover.via}`);
      await confirmCrop(page, run);
    } else {
      run.warn('YouTube: не нашёл загрузку обложки — поставь вручную');
    }
    await run.shot(page, 'youtube-cover');
  }

  if (job.playlists.length > 0) {
    run.step('youtube: плейлисты');
    for (const name of job.playlists) {
      const result = await selectPlaylist(page, name);
      if (result.ok) run.info(`Плейлист «${name}» выбран`);
      else if (result.reason === 'missing') {
        run.warn(
          `YouTube: плейлиста «${name}» нет — создай его в студии (Контент → Плейлисты) и добавь ролик вручную`,
        );
      } else {
        run.warn(`YouTube: не смог выбрать плейлист «${name}» — проверь вручную`);
      }
    }
    await run.shot(page, 'youtube-playlists');
  }

  run.step('youtube: перехожу к проверке и доступу');
  await advanceToVisibility(page, 4);
  await run.shot(page, 'youtube-checks');

  run.step('youtube: доступ по ссылке');
  const access = await selectVisibilityUnlisted(page);
  if (access.ok) {
    run.info(`Доступ: ${access.value}`);
  } else {
    await run.shot(page, 'youtube-access');
    run.warn(`YouTube: доступ «Доступ по ссылке» не подтверждён (в поле: ${access.value ? `«${access.value}»` : 'не прочитал'})`);
  }
  await run.shot(page, 'youtube-visibility');

  if (job.publish === false || !access.ok) {
    const blocked = job.publish !== false;
    run.step(blocked ? 'youtube: не публикую — доступ не «по ссылке»' : 'youtube: готово к публикации');
    run.set({
      ready: access.ok,
      url: knownUrl,
      videoId: videoIdFrom(knownUrl),
      stage: blocked ? 'youtube: не опубликовано — доступ не подтверждён' : 'youtube: ждёт кнопку «Сохранить»',
    });
    if (!blocked) {
      run.info('Всё заполнено. Нажми «Сохранить» в окне браузера.');
      return { pendingPublish: true, accessConfirmed: access.ok, url: knownUrl };
    }
    return {
      pendingPublish: true,
      accessConfirmed: false,
      url: knownUrl,
      error:
        'YouTube: доступ «Доступ по ссылке» не подтверждён — ролик загружен, но НЕ опубликован. ' +
        'Выставь «Доступ по ссылке» и сохрани вручную в студии; повторный запуск для YouTube создаст дубль',
    };
  }

  run.step('youtube: публикую');
  const publishButton = await findFirst(page, s.publish, { timeout: 30000 });
  if (!publishButton) {
    await run.shot(page, 'youtube-no-publish');
    throw new Error('YouTube: не нашёл кнопку «Сохранить»');
  }

  const ready = await waitEnabled(page, publishButton, {
    timeout: t.uploadFinish,
    tick: 15000,
    onTick: async () => run.info('… видео ещё загружается, ждём'),
  });
  if (!ready) {
    await run.shot(page, 'youtube-publish-disabled');
    throw new Error('YouTube: кнопка «Сохранить» так и не стала активной (видео не догрузилось?)');
  }

  // Пока ждали, вкладка могла перерисоваться — проверяем доступ ещё раз.
  if (!(await readVisibility(page)).ok) {
    await run.shot(page, 'youtube-access-lost');
    return {
      pendingPublish: true,
      accessConfirmed: false,
      url: knownUrl,
      error: 'YouTube: перед сохранением доступ уже не «Доступ по ссылке» — ролик НЕ опубликован, проверь его в студии',
    };
  }

  await publishButton.click({ timeout: 30000 });
  await page.waitForTimeout(3000);
  await confirmPublishDialog(page);

  const url = (await waitForVideoUrl(page, t.publish)) || knownUrl || (await readVideoUrl(page, 5000));
  if (url) run.info(`Ссылка: ${url}`);
  else run.warn('YouTube: видео опубликовано, но ссылку найти не удалось');

  run.set({ ready: true, published: true, url, videoId: videoIdFrom(url) });
  return { pendingPublish: false, accessConfirmed: true, url };
}

/**
 * YouTube: страница /videos/upload сама окно не открывает.
 * «Создать» → «Добавить видео» → ждём окно → файл в input (имя Filedata, без accept).
 * Клик по «Добавить видео» может открыть системный выбор файла — его перехватываем.
 */
async function attachVideo(page, run, file) {
  const dialog = page.locator('ytcp-uploads-dialog').first();

  if (!(await dialog.isVisible().catch(() => false))) {
    const create = page.getByRole('button', { name: /^Создать$/ }).first();
    await create.click({ timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1200);

    const item = page.getByRole('menuitem', { name: /Добавить видео/i }).first();
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null),
      item.click({ timeout: 15000 }).catch(() => {}),
    ]);
    if (chooser) await chooser.setFiles(file).catch(() => {});
    await page.waitForTimeout(3000);
  }

  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    const inputs = dialog.locator('input[type=file]');
    const count = await inputs.count().catch(() => 0);
    if (count > 0) {
      run.info(`YouTube: в окне ${count} file input`);
      for (let i = 0; i < count; i++) {
        const input = inputs.nth(i);
        const id = await input.getAttribute('id').catch(() => null);
        const accept = await input.getAttribute('accept').catch(() => null);
        if (id === 'file-loader' || (accept && accept.includes('image'))) continue;
        try {
          await input.setInputFiles(file, { timeout: 120000 });
          return { via: 'input', index: i };
        } catch (error) {
          run.warn(`YouTube: input не принял файл (${String(error?.message || error).slice(0, 120)})`);
        }
      }
    }
    await page.waitForTimeout(500);
  }

  return null;
}

/** Канал подтверждён по телефону? Без этого YouTube не принимает свои обложки. */
async function isChannelVerified(page) {
  const tab = await page.context().newPage().catch(() => null);
  if (!tab) return true;

  try {
    await tab.goto('https://www.youtube.com/verify', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await tab.waitForTimeout(2500);
    const text = await tab.locator('body').innerText().catch(() => '');
    return !/Подтверждение номера телефона|Подтвердите номер|Укажите свой номер|Verify your phone|Confirm your phone/i.test(
      text,
    );
  } catch {
    return true; // не смогли проверить — не блокируем загрузку
  } finally {
    await tab.close().catch(() => {});
  }
}

/** contenteditable-поля Studio: fill() работает, но после ввода нужно дать Polymer перерисоваться. */
async function fillField(page, locator, value) {
  await locator.click({ timeout: 15000 }).catch(() => {});
  await locator.fill(String(value), { timeout: 15000 });
  await page.waitForTimeout(400);
}

async function chooseAudience(page, run) {
  const kids = config.youtube.audience === 'kids';
  const radio = await findFirst(page, kids ? s.audienceKids : s.audienceNotKids, {
    timeout: 10000,
  });
  if (!radio) {
    run.warn('YouTube: не нашёл выбор аудитории — это обязательный шаг, проверь вручную');
    return false;
  }

  await radio.scrollIntoViewIfNeeded().catch(() => {});
  await radio.click({ timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(600);

  if (!(await isChecked(radio))) {
    // Иногда клик по самой radio-кнопке не срабатывает — пробуем по подписи.
    const label = page
      .getByText(kids ? /Да, это видео для детей/i : /Нет, это видео не для детей/i)
      .first();
    await label.click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(500);
  }

  if (await isChecked(radio)) run.info(`Аудитория: ${kids ? 'для детей' : 'не для детей'}`);
  else run.warn('YouTube: аудитория не отметилась — проверь вручную (обязательный шаг)');
  return isChecked(radio);
}

/** «Развернуть» открывает категорию, маркировку ИИ и прямую рекламу. */
async function expandMore(page) {
  const more = await findFirst(page, s.showMore, { timeout: 5000 });
  if (!more) return false;
  const expanded = await more.getAttribute('aria-expanded').catch(() => null);
  if (expanded === 'true') return true;
  await more.click({ timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1200);
  return true;
}

/**
 * Категория — ytcp-select без id. Узнаём её по названию одной из категорий
 * (по умолчанию «Люди и блоги»), затем выбираем «Образование».
 */
async function chooseCategory(page, run) {
  const wanted = config.youtube.category;
  const triggers = page.locator('ytcp-uploads-dialog ytcp-dropdown-trigger');
  const count = await triggers.count().catch(() => 0);
  let trigger = null;

  for (let i = 0; i < count; i++) {
    const text = (await triggers.nth(i).innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
    if (s.categoryNames.test(text)) {
      trigger = triggers.nth(i);
      break;
    }
  }

  if (!trigger) {
    run.warn(`YouTube: не нашёл выбор категории — поставь «${wanted}» вручную`);
    return false;
  }

  const current = (await trigger.innerText().catch(() => '')).trim();
  if (current.toLowerCase() === wanted.toLowerCase()) {
    run.info(`Категория: ${wanted}`);
    return true;
  }

  await trigger.click({ timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(900);

  const exact = new RegExp(`^${escapeRegex(wanted)}$`, 'i');
  const item = page.locator('tp-yt-paper-item').filter({ hasText: exact }).first();
  if (await item.isVisible().catch(() => false)) {
    await item.click({ timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(600);
    run.info(`Категория: ${wanted}`);
    return true;
  }

  const option = page.getByRole('option', { name: exact }).first();
  if (await option.isVisible().catch(() => false)) {
    await option.click({ timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(600);
    run.info(`Категория: ${wanted}`);
    return true;
  }

  await page.keyboard.press('Escape').catch(() => {});
  run.warn(`YouTube: не нашёл категорию «${wanted}» — проверь вручную`);
  return false;
}

/** «Изменённый или синтетический контент»: анимация по стихам — не реалистичная подделка. */
async function markAlteredContent(page) {
  if (config.youtube.alteredContent !== false) return;
  await checkRadio(page, s.alteredContentNo, 'изменённый контент: нет');
}

/** «Прямая реклама»: в роликах её нет. */
async function markNoPaidProduct(page) {
  await checkRadio(page, s.paidProductNo, 'прямая реклама: нет');
}

async function checkRadio(page, specs, what) {
  const radio = await findFirst(page, specs, { timeout: 3000 });
  if (!radio) return false;
  if (await isChecked(radio)) return true;
  await radio.click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(400);
  return isChecked(radio);
}

async function isChecked(locator) {
  return locator
    .evaluate((el) => el.checked === true || el.getAttribute('aria-checked') === 'true')
    .catch(() => false);
}

async function confirmCrop(page, run) {
  const done = await findFirst(
    page,
    [{ role: 'button', name: /^Готово$/i }, { role: 'button', name: /^Сохранить$/i }, { text: /^Готово$/ }],
    { timeout: 6000 },
  );
  if (!done) return false;
  await done.click({ timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1500);
  run.info('Кадрирование обложки подтверждено');
  return true;
}

/**
 * Плейлисты Studio: выпадающий список с чекбоксами.
 * Уже выбранный пункт не кликаем — повторный клик снял бы отметку.
 */
async function selectPlaylist(page, name) {
  const trigger = await findFirst(page, s.playlistTrigger, { timeout: 8000 });
  if (!trigger) return { ok: false, reason: 'no-field' };

  await trigger.scrollIntoViewIfNeeded().catch(() => {});
  await trigger.click({ timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(900);

  const exact = new RegExp(`^${escapeRegex(name)}$`, 'i');
  const item = page.locator('tp-yt-paper-item').filter({ hasText: exact }).first();
  const option = page.getByRole('option').filter({ hasText: exact }).first();

  let target = null;
  if (await item.isVisible().catch(() => false)) target = item;
  else if (await option.isVisible().catch(() => false)) target = option;

  if (!target) {
    await page.keyboard.press('Escape').catch(() => {});
    return { ok: false, reason: 'missing' };
  }

  if (!(await isOptionSelected(target))) {
    await target.click({ timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(700);
  }

  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(400);

  const after = await findFirst(page, s.playlistTrigger, { timeout: 3000 });
  const text = after ? await after.innerText().catch(() => '') : '';
  return { ok: Boolean(text && text.includes(name)), reason: 'clicked' };
}

async function isOptionSelected(locator) {
  if ((await locator.getAttribute('aria-selected').catch(() => null)) === 'true') return true;
  if ((await locator.getAttribute('aria-checked').catch(() => null)) === 'true') return true;
  return (await locator.locator('input[type=checkbox]:checked').count().catch(() => 0)) > 0;
}

/** Жмёт «Далее», пока не появится блок «Доступ». */
async function advanceToVisibility(page, maxSteps) {
  for (let i = 0; i < maxSteps; i++) {
    if (await findFirst(page, s.visibilityUnlisted, { timeout: 1200 })) return true;
    const next = await findFirst(page, s.next, { timeout: 5000 });
    if (!next) return false;
    if (!(await next.isEnabled().catch(() => false))) return false;
    await next.click({ timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2200);
  }
  return Boolean(await findFirst(page, s.visibilityUnlisted, { timeout: 3000 }));
}

async function selectVisibilityUnlisted(page) {
  const radio = await findFirst(page, s.visibilityUnlisted, { timeout: 15000 });
  if (radio) {
    await radio.scrollIntoViewIfNeeded().catch(() => {});
    await radio.click({ timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(700);
  }
  return readVisibility(page);
}

/** Читает, что реально стоит в блоке «Доступ»: unlisted — только «Доступ по ссылке». */
async function readVisibility(page) {
  const radio = page.locator('tp-yt-paper-radio-button[name="UNLISTED"]').first();
  if (await radio.count().catch(() => 0)) {
    const checked = await isChecked(radio);
    return { ok: checked, value: checked ? 'Доступ по ссылке' : null };
  }

  const roleRadio = page.getByRole('radio', { name: /Доступ по ссылке/i }).first();
  if (await roleRadio.count().catch(() => 0)) {
    const checked = (await roleRadio.getAttribute('aria-checked').catch(() => null)) === 'true';
    return { ok: checked, value: checked ? 'Доступ по ссылке' : null };
  }

  return { ok: false, value: null };
}

async function confirmPublishDialog(page) {
  const dialog = page.locator('ytcp-confirmation-dialog, tp-yt-paper-dialog').last();
  const button = dialog.getByRole('button', { name: /^Опубликовать$/i }).first();
  if (await button.isVisible().catch(() => false)) {
    await button.click({ timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);
  }
}

async function waitForVideoUrl(page, timeout) {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    const url = await readVideoUrl(page, 1000);
    if (url) return url;
    await page.waitForTimeout(1500);
  }

  return null;
}

async function readVideoUrl(page, timeout) {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    const text = await page.locator('body').innerText().catch(() => '');
    const match = text.match(/https:\/\/(?:youtu\.be\/|www\.youtube\.com\/watch\?v=)[\w-]{11}/);
    if (match) return normalizeUrl(match[0]);

    const href = await page.locator('a[href*="youtu.be/"]').first().getAttribute('href').catch(() => null);
    if (href) return normalizeUrl(href);

    if (Date.now() + 500 < deadline) await page.waitForTimeout(500);
  }

  return null;
}

function normalizeUrl(url) {
  const id = videoIdFrom(url);
  return id ? `https://youtu.be/${id}` : url;
}

function videoIdFrom(url) {
  if (!url) return null;
  return url.match(/(?:youtu\.be\/|v=)([\w-]{11})/)?.[1] ?? null;
}

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
