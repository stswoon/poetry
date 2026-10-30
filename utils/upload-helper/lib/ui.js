/**
 * Помощники для работы с интерфейсом: «найди первый подходящий из списка»
 * и «нажми/заполни, но не падай, если не нашлось».
 *
 * spec — это либо CSS-строка, либо объект:
 *   { role: 'button', name: /Опубликовать/i }
 *   { placeholder: /Название/i }
 *   { label: /Описание/i }
 *   { text: /По ссылке/i }
 *   { css: 'input[type=file]' }
 */

export function locatorFor(page, spec) {
  if (typeof spec === 'string') return page.locator(spec);
  if (spec.css) return page.locator(spec.css);
  if (spec.role) return page.getByRole(spec.role, { name: spec.name, exact: Boolean(spec.exact) });
  if (spec.placeholder) return page.getByPlaceholder(spec.placeholder, { exact: Boolean(spec.exact) });
  if (spec.label) return page.getByLabel(spec.label, { exact: Boolean(spec.exact) });
  if (spec.text) return page.getByText(spec.text, { exact: Boolean(spec.exact) });
  if (spec.testid) return page.getByTestId(spec.testid);
  throw new Error(`Непонятный селектор: ${JSON.stringify(spec)}`);
}

export function describe(spec) {
  if (typeof spec === 'string') return spec;
  return Object.entries(spec)
    .map(([k, v]) => `${k}=${v instanceof RegExp ? v.source : v}`)
    .join(' ');
}

/** Возвращает первый видимый локатор из списка или null. scope — искать внутри него. */
export async function findFirst(page, specs, { timeout = 5000, state = 'visible', poll = 200, scope = null } = {}) {
  const base = scope ?? page;
  const deadline = Date.now() + timeout;

  do {
    for (const spec of specs) {
      const loc = locatorFor(base, spec).first();
      try {
        if (!(await loc.count())) continue;
        if (state === 'attached') return loc;
        if (await loc.isVisible()) return loc;
      } catch {
        /* элемент мог исчезнуть между count и isVisible */
      }
    }
    if (Date.now() >= deadline) break;
    await page.waitForTimeout(poll);
  } while (true);

  return null;
}

export async function fillFirst(page, specs, value, { timeout = 5000, required = true, what = 'поле', scope = null } = {}) {
  const loc = await findFirst(page, specs, { timeout, scope });
  if (!loc) {
    if (required) {
      throw new Error(`Не нашёл ${what}. Кандидаты: ${specs.map(describe).join(' | ')}`);
    }
    return false;
  }
  await loc.click({ timeout: 15000 }).catch(() => {});
  await loc.fill(String(value), { timeout: 15000 });
  return true;
}

/**
 * Прикрепляет файл: сначала ждёт скрытые input[type=file], потом кнопки,
 * открывающие системный диалог (его перехватываем через filechooser).
 */
export async function attachFile(page, { inputs = [], triggers = [], file, timeout = 20000, waitMs = 15000, scope = null }) {
  const base = scope ?? page;
  const deadline = Date.now() + waitMs;

  do {
    for (const spec of inputs) {
      const loc = locatorFor(base, spec).first();
      try {
        if (!(await loc.count())) continue;
        await loc.setInputFiles(file, { timeout });
        return { via: 'input', spec };
      } catch {
        /* пробуем следующий вариант */
      }
    }

    // Если появилась кнопка загрузки — дальше работаем через неё.
    if (triggers.length && (await findFirst(page, triggers, { timeout: 300, poll: 100, scope }))) break;

    await page.waitForTimeout(500);
  } while (Date.now() < deadline);

  for (const spec of triggers) {
    const loc = await findFirst(page, [spec], { timeout: 3000, scope });
    if (!loc) continue;
    try {
      const [chooser] = await Promise.all([
        page.waitForEvent('filechooser', { timeout }),
        loc.click({ timeout: 15000 }),
      ]);
      await chooser.setFiles(file);
      return { via: 'chooser', spec };
    } catch {
      /* кнопка могла не открыть диалог */
    }
  }

  return null;
}

/** Ждёт, пока кнопка станет доступной (загрузка файла завершилась). */
export async function waitEnabled(page, locator, { timeout = 60000, tick = 5000, onTick } = {}) {
  const deadline = Date.now() + timeout;
  let last = 0;

  while (Date.now() < deadline) {
    if (await locator.isEnabled().catch(() => false)) return true;
    if (onTick && Date.now() - last > tick) {
      last = Date.now();
      await onTick();
    }
    await page.waitForTimeout(500);
  }
  return false;
}

// Слово начинается с «прав…» (права, правила, правообладатель), а не «отправить», «справка».
const CONSENT_LABEL = /(?<!\p{L})(прав|соглас|услови|не наруша|ознаком)/iu;
// Эти отметки скрипт не ставит никогда: маркировка ИИ, возраст, реклама, «для детей».
const NEVER_LABEL = /(?<!\p{L})(ИИ|AI)(?!\p{L})|искусствен|нейросет|сгенерир|синтез|18\s*\+|взросл|реклам|дет(ей|ск)/iu;

/**
 * Отмечает неотмеченные чекбоксы согласия (права, правила, условия) внутри scope.
 * Подпись берётся из <label> или ближайшего родителя с текстом, не из всего контейнера.
 * Возвращает подписи отмеченных чекбоксов — их надо вывести в лог.
 */
export async function checkConsentBoxes(page, scope = null) {
  const checked = [];
  const boxes = (scope ?? page).locator('input[type=checkbox]');
  const total = await boxes.count().catch(() => 0);

  for (let i = 0; i < total; i++) {
    const box = boxes.nth(i);
    if (await box.isChecked().catch(() => true)) continue;

    const label = await box
      .evaluate((el) => {
        const byFor = el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null;
        let node = el.closest('label') || byFor || el.parentElement;
        for (let depth = 0; node && depth < 3; depth++) {
          const text = (node.innerText || '').replace(/\s+/g, ' ').trim();
          if (text) return text.slice(0, 200);
          node = node.parentElement;
        }
        return '';
      })
      .catch(() => '');

    if (!label || NEVER_LABEL.test(label) || !CONSENT_LABEL.test(label)) continue;

    await box.check({ timeout: 5000 }).catch(() => {});
    if (await box.isChecked().catch(() => false)) checked.push(label);
  }

  return checked;
}
