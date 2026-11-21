import { platformTarget } from './config.js';
import { goto, youtubeChannelId } from './browser.js';
import { attachFile, findFirst } from './ui.js';

/**
 * Снимает «карту» страницы: кнопки, поля, селекты, тексты про доступ/плейлисты.
 * Нужно, чтобы после редизайна студии быстро починить lib/selectors.js.
 *
 * click  — текст кнопки, которую надо нажать перед снимком (например, «Добавить»).
 * settle — сколько ждать отрисовки, мс.
 */
export async function probe({ page, platform, run, clicks = [], settle = 6000, url = null, attach = null }) {
  run.step(`${platform}: probe`);
  await goto(page, url || platformTarget(platform));
  await page.waitForTimeout(settle);

  // У YouTube страница /videos/upload сама окно не открывает: нужен клик по «Добавить видео».
  if (platform === 'youtube' && !url) {
    const channelId = youtubeChannelId(page.url());
    if (channelId) {
      await goto(page, `https://studio.youtube.com/channel/${channelId}/videos/upload`);
      await page.waitForTimeout(settle);
    } else {
      run.warn('YouTube: не нашёл ID канала в адресе студии');
    }
    if (attach) await openYoutubeUpload(page, run, attach, settle);
  }

  for (const click of clicks) {
    const button = await findFirst(
      page,
      [
        { role: 'button', name: new RegExp(click, 'i') },
        { role: 'menuitem', name: new RegExp(click, 'i') },
        { role: 'link', name: new RegExp(click, 'i') },
        { text: click },
      ],
      { timeout: 15000 },
    );
    if (button) {
      run.info(`Нажимаю «${click}»`);
      await button.click({ timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(3000);
    } else {
      run.warn(`Кнопка «${click}» не найдена`);
    }
  }

  await run.shot(page, `${platform}-probe`);

  const data = await page.evaluate(() => {
    const text = (el) => (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 160);
    const attr = (el, name) => el.getAttribute(name) || '';

    const pick = (el) => ({
      tag: el.tagName.toLowerCase(),
      type: attr(el, 'type') || undefined,
      name: attr(el, 'name') || undefined,
      placeholder: attr(el, 'placeholder') || undefined,
      ariaLabel: attr(el, 'aria-label') || undefined,
      role: attr(el, 'role') || undefined,
      accept: attr(el, 'accept') || undefined,
      href: attr(el, 'href') || undefined,
      id: el.id || undefined,
      text: text(el) || undefined,
    });

    const clean = (list) => list.filter((item) => item.text || item.placeholder || item.name || item.ariaLabel || item.type || item.accept);

    const info = (el) => ({
      tag: el.tagName.toLowerCase(),
      id: el.id || undefined,
      name: attr(el, 'name') || undefined,
      role: attr(el, 'role') || undefined,
      ariaLabel: attr(el, 'aria-label') || undefined,
      ariaChecked: attr(el, 'aria-checked') || undefined,
      checked: 'checked' in el ? Boolean(el.checked) : undefined,
      accept: attr(el, 'accept') || undefined,
      disabled: 'disabled' in el ? Boolean(el.disabled) : undefined,
      text: text(el) || undefined,
    });

    return {
      url: location.href,
      title: document.title,
      buttons: clean([...document.querySelectorAll('button, [role=button], a')].slice(0, 800).map(pick)),
      fields: clean([...document.querySelectorAll('input, textarea, select, [contenteditable="true"]')].map(pick)),
      selects: [...document.querySelectorAll('select')].map((select) => ({
        name: select.name || undefined,
        id: select.id || undefined,
        options: [...select.options].map((option) => option.text.trim()),
      })),
      keywordBlocks: [...document.querySelectorAll('div, span, label, li')]
        .filter((el) => el.children.length === 0)
        .map(text)
        .filter((value) => /доступ|плейлист|обложк|категор|опубликов|загрузить|видимост|по ссылке/i.test(value))
        .slice(0, 120),
      // Для YouTube Studio: Polymer-компоненты и shadow DOM не видны в обычном списке полей.
      detail: {
        dialogs: [...document.querySelectorAll('ytcp-uploads-dialog, ytcp-full-video-details, tp-yt-paper-dialog, [role=dialog]')]
          .map(info)
          .slice(0, 40),
        contenteditables: [...document.querySelectorAll('[contenteditable="true"]')].map(info).slice(0, 40),
        radios: [...document.querySelectorAll('tp-yt-paper-radio-button, input[type=radio]')].map(info).slice(0, 80),
        checkboxes: [
          ...document.querySelectorAll('input[type=checkbox], tp-yt-paper-checkbox, ytcp-checkbox-lit'),
        ]
          .map(info)
          .slice(0, 120),
        listItems: [
          ...document.querySelectorAll(
            'tp-yt-paper-item, ytcp-option, [role=option], [role=menuitemcheckbox], [role=menuitemradio]',
          ),
        ]
          .map(info)
          .slice(0, 160),
        fileInputs: [...document.querySelectorAll('input[type=file]')].map(info).slice(0, 40),
        ytcpButtons: [...document.querySelectorAll('ytcp-button, ytcp-icon-button')].map(info).slice(0, 120),
        dropdowns: [
          ...document.querySelectorAll('ytcp-select, tp-yt-paper-dropdown-menu, ytcp-dropdown-trigger, [role=combobox], [aria-haspopup]'),
        ]
          .map(info)
          .slice(0, 80),
        ids: [...document.querySelectorAll('[id]')]
          .map((el) => ({ tag: el.tagName.toLowerCase(), id: el.id, text: text(el) || undefined }))
          .slice(0, 500),
      },
    };
  });

  const jsonFile = run.writeJson(`probe-${platform}.json`, data);
  const md = renderMarkdown(platform, data);
  const mdFile = run.writeText(`probe-${platform}.md`, md);

  run.info(`Снимок: ${jsonFile}`);
  run.info(`Читаемая версия: ${mdFile}`);
  return data;
}

/** Открывает окно загрузки YouTube и прикрепляет тестовый файл, чтобы снять форму. */
async function openYoutubeUpload(page, run, file, settle) {
  const create = page.getByRole('button', { name: /^Создать$/ }).first();
  if (await create.isVisible().catch(() => false)) {
    await create.click({ timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);
  }

  const attached = await attachFile(page, {
    inputs: [],
    triggers: [
      { role: 'menuitem', name: /Добавить видео/i },
      { role: 'button', name: /Добавить видео/i },
      { text: /Добавить видео/i },
    ],
    file,
    timeout: 15000,
    waitMs: 8000,
  });

  if (attached) {
    run.info(`Тестовый файл прикреплён через ${attached.via}`);
    await page.waitForTimeout(settle);
    return;
  }

  const input = page.locator('ytcp-uploads-dialog input[type=file]').first();
  if (await input.count().catch(() => 0)) {
    await input.setInputFiles(file, { timeout: 60000 }).catch(() => {});
    run.info('Тестовый файл прикреплён через input в окне');
    await page.waitForTimeout(settle);
  } else {
    run.warn('YouTube: окно загрузки не открылось');
  }
}

function renderMarkdown(platform, data) {
  const lines = [];
  lines.push(`# Probe: ${platform}`);
  lines.push('');
  lines.push(`- URL: ${data.url}`);
  lines.push(`- Title: ${data.title}`);
  lines.push('');

  lines.push('## Кнопки и ссылки');
  for (const item of data.buttons.slice(0, 200)) {
    lines.push(`- <${item.tag}> ${item.text || ''}${item.href ? ` → ${item.href}` : ''}`);
  }
  lines.push('');

  lines.push('## Поля ввода');
  for (const item of data.fields) {
    lines.push(
      `- <${item.tag}${item.type ? ` type=${item.type}` : ''}>` +
        `${item.name ? ` name=${item.name}` : ''}` +
        `${item.placeholder ? ` placeholder="${item.placeholder}"` : ''}` +
        `${item.ariaLabel ? ` aria-label="${item.ariaLabel}"` : ''}` +
        `${item.accept ? ` accept="${item.accept}"` : ''}` +
        `${item.text ? ` text="${item.text}"` : ''}`,
    );
  }
  lines.push('');

  if (data.selects.length) {
    lines.push('## Select');
    for (const select of data.selects) {
      lines.push(`- ${select.name || select.id || '(без имени)'}: ${select.options.join(' | ')}`);
    }
    lines.push('');
  }

  lines.push('## Тексты про доступ/плейлисты/обложку');
  for (const value of data.keywordBlocks) lines.push(`- ${value}`);
  lines.push('');

  const detail = data.detail;
  if (detail) {
    const row = (item) =>
      `- <${item.tag}>` +
      `${item.id ? ` id=${item.id}` : ''}` +
      `${item.name ? ` name=${item.name}` : ''}` +
      `${item.role ? ` role=${item.role}` : ''}` +
      `${item.ariaLabel ? ` aria-label="${item.ariaLabel}"` : ''}` +
      `${item.ariaChecked ? ` aria-checked=${item.ariaChecked}` : ''}` +
      `${item.checked === true ? ' checked' : ''}` +
      `${item.disabled ? ' disabled' : ''}` +
      `${item.accept ? ` accept="${item.accept}"` : ''}` +
      `${item.text ? ` text="${item.text.slice(0, 120)}"` : ''}`;

    for (const [title, list] of [
      ['Диалоги', detail.dialogs],
      ['contenteditable', detail.contenteditables],
      ['Радио', detail.radios],
      ['Чекбоксы', detail.checkboxes],
      ['Пункты списков', detail.listItems],
      ['Файловые input', detail.fileInputs],
      ['ytcp-кнопки', detail.ytcpButtons],
      ['Дропдауны', detail.dropdowns],
    ]) {
      lines.push(`## ${title}`);
      for (const item of list) lines.push(row(item));
      lines.push('');
    }

    lines.push('## id на странице');
    for (const item of detail.ids) lines.push(`- <${item.tag}> #${item.id}${item.text ? ` — ${item.text.slice(0, 80)}` : ''}`);
    lines.push('');
  }

  return lines.join('\n');
}
