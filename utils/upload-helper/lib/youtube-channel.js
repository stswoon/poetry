import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { goto, youtubeChannelId } from './browser.js';
import { findFirst } from './ui.js';

/**
 * Оформление канала YouTube: баннер, аватар, имя, handle и описание.
 * Всё на одной странице «Настройка канала → Профиль»; изменения применяются
 * кнопкой «Опубликовать» (до неё они лишь черновик).
 */
export async function setupYoutubeChannel({ page, job, baseDir, run, dryRun = false }) {
  run.step('youtube-channel: открываю настройки канала');
  await goto(page, config.youtube.studio);
  const channelId = youtubeChannelId(page.url());
  if (!channelId) {
    throw new Error('YouTube: студия не открыла канал — проверь логин');
  }
  run.info(`Канал: ${channelId}`);

  await goto(page, `https://studio.youtube.com/channel/${channelId}/editing/profile`);
  await page.waitForTimeout(3000);

  const changes = [];
  const warnings = [];

  const avatar = resolveAsset(job.avatar, baseDir);
  const banner = resolveAsset(job.banner, baseDir);
  const description = String(job.description || '').trim();

  if (!avatar && !banner && !description && !job.name && !job.handle) {
    throw new Error('В настройках канала нет ни одного изменения (avatar/banner/description/name/handle)');
  }

  if (description.length > 1000) {
    throw new Error(`Описание канала ${description.length} символов — лимит YouTube 1000`);
  }

  if (banner) {
    const ok = await uploadImage(page, run, /Баннер/i, banner, 'баннер');
    if (ok) changes.push(`баннер: ${path.basename(banner)}`);
    else warnings.push('YouTube: не удалось загрузить баннер — загрузи вручную');
    await run.shot(page, 'youtube-channel-banner');
  }

  if (avatar) {
    const ok = await uploadImage(page, run, /Фото профиля|Аватар/i, avatar, 'аватар');
    if (ok) changes.push(`аватар: ${path.basename(avatar)}`);
    else warnings.push('YouTube: не удалось загрузить аватар — загрузи вручную');
    await run.shot(page, 'youtube-channel-avatar');
  }

  if (job.name) {
    const field = await findFirst(
      page,
      ['input[placeholder="Укажите название канала"]', 'input[placeholder*="название канала" i]'],
      { timeout: 10000 },
    );
    if (field) {
      await setValue(field, job.name);
      changes.push(`имя: ${job.name}`);
    } else {
      warnings.push('YouTube: не нашёл поле имени канала');
    }
  }

  if (job.handle) {
    const handle = String(job.handle).replace(/^@/, '');
    const field = await findFirst(
      page,
      ['input[placeholder="Введите псевдоним"]', 'input[placeholder*="псевдоним" i]'],
      { timeout: 10000 },
    );
    if (field) {
      await setValue(field, handle);
      changes.push(`handle: @${handle}`);
      await page.waitForTimeout(2500);
      const text = await page.locator('body').innerText().catch(() => '');
      if (/недоступ|занят|уже используется|не может быть использован/i.test(text)) {
        warnings.push('YouTube: handle занят или недоступен — выбери другой в студии');
      }
    } else {
      warnings.push('YouTube: не нашёл поле handle');
    }
  }

  if (description) {
    const field = await findFirst(
      page,
      [
        'div#textbox[aria-label^="Расскажите аудитории"]',
        'div#textbox[role="textbox"][aria-label*="канале"]',
      ],
      { timeout: 10000 },
    );
    if (field) {
      await setValue(field, description);
      changes.push(`описание: ${description.length} символов`);
    } else {
      warnings.push('YouTube: не нашёл поле описания канала');
    }
  }

  await run.shot(page, 'youtube-channel-before-publish');

  if (dryRun) {
    run.step('youtube-channel: dry-run — не публикую');
    run.info('Все поля заполнены, но изменения НЕ опубликованы. Проверь скриншот.');
    run.set({ ready: false, stage: 'youtube-channel: dry-run', changes });
    return { changes, warnings, dryRun: true };
  }

  await publishChannel(page, run);

  // Перезагружаем страницу и читаем сохранённое — форма могла показать ввод, но не сохранить.
  await goto(page, `https://studio.youtube.com/channel/${channelId}/editing/profile`);
  await page.waitForTimeout(4000);

  if (job.name) {
    const field = await findFirst(
      page,
      ['input[placeholder="Укажите название канала"]', 'input[placeholder*="название канала" i]'],
      { timeout: 8000 },
    );
    const value = field ? await field.inputValue().catch(() => '') : '';
    if (value.trim() === job.name) run.info('Имя канала прочитано обратно: совпадает');
    else if (field) run.warn('YouTube: имя канала после сохранения не совпало — проверь вручную');
  }

  if (description) {
    const field = await findFirst(
      page,
      [
        'div#textbox[aria-label^="Расскажите аудитории"]',
        'div#textbox[role="textbox"][aria-label*="канале"]',
      ],
      { timeout: 8000 },
    );
    const value = field ? await field.innerText().catch(() => '') : '';
    if (value.trim() === description) run.info('Описание канала прочитано обратно: совпадает');
    else if (field) run.warn('YouTube: описание после сохранения не совпало — проверь вручную');
  }

  for (const warning of warnings) run.warn(warning);
  run.set({ ready: true, stage: 'youtube-channel: готово', changes, warnings: [...warnings] });
  return { changes, warnings };
}

function resolveAsset(file, baseDir) {
  if (!file) return null;
  const full = path.isAbsolute(file) ? file : path.resolve(baseDir, file);
  if (!fs.existsSync(full)) throw new Error(`Файл не найден: ${full}`);
  return full;
}

async function setValue(locator, value) {
  await locator.click({ timeout: 15000 }).catch(() => {});

  const contenteditable = await locator.getAttribute('contenteditable').catch(() => null);
  if (contenteditable === 'true') {
    // fill() на этом contenteditable обновляет счётчик, но не сохраняется в модели YouTube.
    await locator.press('Control+A').catch(() => {});
    await locator.press('Backspace').catch(() => {});
    await locator.pressSequentially(String(value), { delay: 1 });
    return;
  }

  await locator.fill(String(value), { timeout: 15000 });
}

/** Находит input[type=file] в карточке с нужной подписью: «Баннер», «Фото профиля». */
async function fileInputByLabel(page, label) {
  const inputs = page.locator('input[type=file]');
  const count = await inputs.count().catch(() => 0);
  const source = label.source ?? String(label);

  for (let i = 0; i < count; i++) {
    const input = inputs.nth(i);
    const matched = await input
      .evaluate((el, src) => {
        const re = new RegExp(src, 'i');
        let node = el.parentElement;
        for (let depth = 0; node && depth < 7; depth++) {
          const text = (node.innerText || '').replace(/\s+/g, ' ').trim();
          if (text && text.length < 500 && re.test(text)) return true;
          node = node.parentElement;
        }
        return false;
      }, source)
      .catch(() => false);
    if (matched) return input;
  }

  return null;
}

async function uploadImage(page, run, label, file, what) {
  const input = await fileInputByLabel(page, label);
  if (!input) {
    await run.shot(page, `youtube-channel-no-${what}`);
    return false;
  }

  await input.setInputFiles(file, { timeout: 60000 });
  await page.waitForTimeout(2500);
  run.info(`Файл «${what}» прикреплён`);

  const crop = await findFirst(
    page,
    [
      { role: 'button', name: /^Готово$/i },
      { role: 'button', name: /^Сохранить$/i },
      { text: /^Готово$/ },
    ],
    { timeout: 5000 },
  );
  if (crop) {
    await crop.click({ timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);
    run.info(`Кадрирование «${what}» подтверждено`);
  }

  return true;
}

async function publishChannel(page, run) {
  const button = await findFirst(
    page,
    ['#publish-button', { role: 'button', name: /^Опубликовать$/i }],
    { timeout: 10000 },
  );
  if (!button) {
    run.warn('YouTube: не нашёл кнопку «Опубликовать» — проверь, сохранилось ли');
    return false;
  }

  const enabled = await button.isEnabled().catch(() => false);
  if (!enabled) {
    run.warn('YouTube: «Опубликовать» неактивна — изменения не применились');
    return false;
  }

  await button.click({ timeout: 15000 }).catch(() => {});

  // После успешной публикации кнопка становится неактивной; не закрываем браузер
  // раньше, чем запрос сохранения завершится.
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    await page.waitForTimeout(500);
    if (!(await button.isEnabled().catch(() => false))) break;
  }
  await page.waitForTimeout(2000);

  // Подтверждение «Изменить название канала?» / «Опубликовать изменения?»
  const dialogButton = page
    .locator('ytcp-confirmation-dialog, tp-yt-paper-dialog')
    .last()
    .getByRole('button', { name: /^Опубликовать$/i })
    .first();
  if (await dialogButton.isVisible().catch(() => false)) {
    await dialogButton.click({ timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2500);
  }

  await run.shot(page, 'youtube-channel-saved');
  const text = await page.locator('body').innerText().catch(() => '');
  if (/Изменения опубликованы|Опубликовано|Сохранено/i.test(text)) {
    run.info('Изменения опубликованы');
  }
  return true;
}
