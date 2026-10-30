import { config } from './config.js';
import { goto } from './browser.js';
import { findFirst } from './ui.js';

/**
 * Снимает «карту» страницы: кнопки, поля, селекты, тексты про доступ/плейлисты.
 * Нужно, чтобы после редизайна студии быстро починить lib/selectors.js.
 *
 * click  — текст кнопки, которую надо нажать перед снимком (например, «Добавить»).
 * settle — сколько ждать отрисовки, мс.
 */
export async function probe({ page, platform, run, clicks = [], settle = 6000 }) {
  const target = platform === 'vk' ? config.vk.uploadUrl : config.rutube.uploadUrl;

  run.step(`${platform}: probe`);
  await goto(page, target);
  await page.waitForTimeout(settle);

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
    };
  });

  const jsonFile = run.writeJson(`probe-${platform}.json`, data);
  const md = renderMarkdown(platform, data);
  const mdFile = run.writeText(`probe-${platform}.md`, md);

  run.info(`Снимок: ${jsonFile}`);
  run.info(`Читаемая версия: ${mdFile}`);
  return data;
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

  return lines.join('\n');
}
