import { findFirst } from './ui.js';

/**
 * Текущее значение доступа: { ok, value }. ok — только если поле показывает «по ссылке».
 * Источники по порядку: нативный select, текст под подписью поля (s.accessLabel),
 * контрол, в имени которого уже стоит «по ссылке» (s.accessCurrent).
 */
export async function readAccess(page, s, scope = null) {
  const base = scope ?? page;

  const selects = base.locator('select');
  const count = await selects.count().catch(() => 0);
  for (let i = 0; i < count; i++) {
    const select = selects.nth(i);
    const options = await select.locator('option').allInnerTexts().catch(() => []);
    if (!options.some((text) => s.accessLinkValue.test(text))) continue;
    const value = await select
      .evaluate((el) => el.selectedOptions[0]?.textContent?.trim() || '')
      .catch(() => '');
    return { ok: s.accessLinkValue.test(value), value: value || null };
  }

  const value = await readLabeledValue(base, s.accessLabel);
  if (value) return { ok: s.accessLinkValue.test(value), value };

  const current = await findFirst(page, s.accessCurrent, { timeout: 500, scope });
  if (current) return { ok: true, value: 'по ссылке' };

  return { ok: false, value: null };
}

/** Первая строка текста после подписи: «Кто может смотреть это видео?» → «У кого есть ссылка». */
async function readLabeledValue(base, labelRegex) {
  const label = base.getByText(labelRegex).first();
  if (!(await label.isVisible().catch(() => false))) return null;

  return label
    .evaluate((el) => {
      const labelText = (el.innerText || '').trim();
      let node = el.parentElement;
      for (let depth = 0; node && depth < 3; depth++) {
        const text = (node.innerText || '').trim();
        const index = text.indexOf(labelText);
        const rest = index >= 0 ? text.slice(index + labelText.length) : '';
        const line = rest.split('\n').map((item) => item.trim()).find(Boolean);
        if (line) return line;
        node = node.parentElement;
      }
      return null;
    })
    .catch(() => null);
}

/**
 * Выбирает «по ссылке» в радио, нативном select или дропдауне «Доступ».
 * Успех засчитывается только после readAccess — клик без результата не считается.
 */
export async function selectAccessLink(page, s, scope = null) {
  let state = await readAccess(page, s, scope);
  if (state.ok) return state;

  const radio = await findFirst(page, s.accessLinkOption.filter((spec) => spec.role === 'radio'), {
    timeout: 1200,
    scope,
  });
  if (radio) {
    await radio.click({ timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(500);
    state = await readAccess(page, s, scope);
    if (state.ok) return state;
  }

  const selects = (scope ?? page).locator('select');
  const count = await selects.count().catch(() => 0);
  for (let i = 0; i < count; i++) {
    const select = selects.nth(i);
    const options = await select.locator('option').allInnerTexts().catch(() => []);
    const label = options.find((text) => s.accessLinkValue.test(text));
    if (!label) continue;
    await select.selectOption({ label }).catch(() => {});
    state = await readAccess(page, s, scope);
    if (state.ok) return state;
  }

  for (const trigger of s.accessTriggers) {
    const control = await findFirst(page, [trigger], { timeout: 2500, scope });
    if (!control) continue;

    await control.click({ timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(500);

    const option = await findFirst(page, s.accessLinkOption, { timeout: 2000 });
    if (option) {
      await option.click({ timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(700);
      state = await readAccess(page, s, scope);
      if (state.ok) return state;
    }

    await page.keyboard.press('Escape').catch(() => {});
  }

  return readAccess(page, s, scope);
}

/** Жмёт «Далее», пока не появится кнопка публикации (VK — мастер из нескольких шагов). */
export async function advanceToPublish(page, s, { steps = 3, scope = null } = {}) {
  for (let i = 0; i < steps; i++) {
    const publish = await findFirst(page, s.publish, { timeout: 2500, scope });
    if (publish) return publish;

    const next = await findFirst(page, s.next, { timeout: 1500, scope });
    if (!next) return null;

    await next.click({ timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);
  }

  return findFirst(page, s.publish, { timeout: 5000, scope });
}

/** Чипы в поле плейлистов: «класс 1 ×» → «класс 1». placeholder отбрасывается. */
export async function readChips(field, placeholder = /выберите плейлист/i) {
  const text = await field.innerText().catch(() => '');
  return text
    .split('\n')
    .map((line) => line.replace(/[×✕✖]/g, '').trim())
    .filter((line) => line && !placeholder.test(line));
}

/** Точное совпадение чипа: «класс 1» не засчитывается за «класс 11». */
export function hasChip(chips, name) {
  const wanted = normalizeName(name);
  return chips.some((chip) => normalizeName(chip) === wanted);
}

/** «класс 3» и «класс-3» — один плейлист: регистр и лишние пробелы тоже не важны. */
function normalizeName(text) {
  return String(text)
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/^класс[ -](\d+)$/, 'класс $1');
}

/** Все написания плейлиста; то, что указано в job, идёт первым. */
function playlistSpellings(name) {
  const grade = normalizeName(name).match(/^класс (\d+)$/)?.[1];
  if (!grade) return [name];
  return [...new Set([name, `класс ${grade}`, `класс-${grade}`])];
}

/**
 * VK: плейлисты — это ChipsInput. Вводим название и выбираем подсказку.
 * Создать плейлист из формы нельзя: если его нет, возвращаем в missing.
 */
export async function selectPlaylistsVk(page, scope, names) {
  // Поле — ChipsInput: после первого чипа placeholder исчезает, поэтому ищем по классу.
  const field = scope.locator('[class*="ChipsInput"]').first();
  const input = scope.locator('[class*="ChipsInput"] input, input[class*="ChipsInput"]').first();
  if (!(await input.count())) return { ok: false, missing: [...names], selected: [] };

  const missing = [];

  for (const name of names) {
    if (hasChip(await readChips(field), name)) continue;

    const option = page.getByRole('option', { name: exactName(name) }).first();
    let found = false;

    // Подсказки VK фильтруются по введённому тексту — пробуем каждое написание.
    for (const spelling of playlistSpellings(name)) {
      await input.click({ timeout: 10000 }).catch(() => {});
      await input.fill('', { timeout: 5000 }).catch(() => {});
      await input.type(spelling, { delay: 60 }).catch(() => {});

      // Подсказки могут идти долго, особенно когда канал занят другой заливкой.
      found = await option
        .waitFor({ state: 'visible', timeout: 8000 })
        .then(() => true)
        .catch(() => false);
      if (found) break;
    }

    if (found) {
      await option.click({ timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(500);
    } else {
      missing.push(name);
      await input.fill('', { timeout: 5000 }).catch(() => {});
    }
  }

  const chips = await readChips(field);
  const selected = names.filter((name) => hasChip(chips, name));
  return { ok: selected.length === names.length, missing, selected };
}

/**
 * RUTUBE: плейлисты — выпадающий список с чекбоксами (role=option).
 * Уже отмеченный пункт не кликаем: повторный клик снимает отметку.
 * Создать плейлист из формы нельзя: отсутствующие возвращаем в missing.
 * selected — что реально стоит чипами в поле после выбора.
 */
export async function selectPlaylistsRutube(page, scope, names) {
  const findCombo = async () => {
    const combos = scope.locator('[role="combobox"]');
    const count = await combos.count().catch(() => 0);
    for (let i = 0; i < count; i++) {
      const text = await combos.nth(i).innerText().catch(() => '');
      if (/плейлист/i.test(text)) return combos.nth(i);
      const chips = await readChips(combos.nth(i));
      if (names.some((name) => hasChip(chips, name))) return combos.nth(i);
    }
    return null;
  };

  let combo = await findCombo();
  if (!combo) return { ok: false, missing: [...names], selected: [] };

  const missing = [];
  const before = await readChips(combo);
  let opened = false;

  for (const name of names) {
    if (hasChip(before, name)) continue;

    const row = page.getByRole('option', { name: exactName(name) }).first();

    if (!(await row.isVisible().catch(() => false))) {
      combo = (await findCombo()) || combo;
      await combo.click({ timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(700);
      opened = true;
    }

    if (!(await row.isVisible().catch(() => false))) {
      missing.push(name);
      continue;
    }

    if (!(await isOptionSelected(row))) {
      await row.click({ timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(500);
    }
  }

  if (opened) {
    combo = (await findCombo()) || combo;
    await combo.click({ timeout: 5000 }).catch(() => {}); // закрыть список
    await page.waitForTimeout(300);
  }

  const chips = await readChips((await findCombo()) || combo);
  const selected = names.filter((name) => hasChip(chips, name));
  return { ok: selected.length === names.length, missing, selected };
}

async function isOptionSelected(row) {
  if ((await row.getAttribute('aria-selected').catch(() => null)) === 'true') return true;
  if ((await row.getAttribute('aria-checked').catch(() => null)) === 'true') return true;
  return (await row.locator('input[type=checkbox]:checked').count().catch(() => 0)) > 0;
}

function exactName(name) {
  const body = playlistSpellings(name).map(escapeRegex).join('|');
  return new RegExp(`^(?:${body})$`, 'i');
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Ждёт, пока в адресе появится ссылка на видео, или тост об успехе. */
export async function waitForVideoUrl(page, s, timeout) {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    if (s.videoUrl.test(page.url())) return page.url();

    const toast = await page.getByText(s.successText).first().isVisible().catch(() => false);
    if (toast) {
      await page.waitForTimeout(2000);
      if (s.videoUrl.test(page.url())) return page.url();
    }

    await page.waitForTimeout(1000);
  }

  return null;
}

/** Выбор значения в кастомном комбобоксе или нативном select. */
export async function chooseOption(page, triggerSpecs, optionText, fallbackSelect) {
  if (fallbackSelect) {
    const selects = page.locator(fallbackSelect);
    const count = await selects.count().catch(() => 0);
    for (let i = 0; i < count; i++) {
      const select = selects.nth(i);
      const options = await select.locator('option').allInnerTexts().catch(() => []);
      const label = options.find((text) => text.trim().toLowerCase() === optionText.toLowerCase());
      if (label) {
        await select.selectOption({ label }).catch(() => {});
        return true;
      }
    }
  }

  const trigger = await findFirst(page, triggerSpecs, { timeout: 3000 });
  if (!trigger) return false;

  await trigger.click({ timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(500);

  const option = await findFirst(
    page,
    [{ role: 'option', name: exactName(optionText) }, { text: optionText }],
    { timeout: 3000 },
  );
  if (!option) {
    await page.keyboard.press('Escape').catch(() => {});
    return false;
  }

  await option.click({ timeout: 10000 }).catch(() => {});
  return true;
}
