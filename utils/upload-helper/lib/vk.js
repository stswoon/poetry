import { config } from './config.js';
import { selectors } from './selectors.js';
import { attachFile, findFirst, fillFirst, waitEnabled } from './ui.js';
import {
  advanceToPublish,
  hasChip,
  readAccess,
  readChips,
  selectAccessLink,
  selectPlaylistsVk,
  waitForVideoUrl,
} from './flows.js';
import { goto } from './browser.js';

const s = selectors.vk;

const PLAYLISTS_HINT =
  'После публикации добавь ролик командой: node run.js playlists --job <job.json> (только плейлисты, сам ролик не меняется)';

export async function uploadVk({ page, job, run }) {
  const t = config.timeouts;

  run.step('vk: открываю кабинет');
  await goto(page, config.vk.cabinet);
  run.info(`URL: ${page.url()}`);

  run.step('vk: открываю окно загрузки');
  const dialogOpened = await openUploadDialog(page);
  if (dialogOpened) run.info('Окно «Новое видео» открыто');
  else run.warn('VK: не нашёл «Добавить» → «Загрузить видео» — пробую действовать на текущей странице');

  const modal = page
    .locator('[role="dialog"]')
    .filter({ hasText: /Новое видео|Публикация видео/ })
    .last();
  await modal.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
  let scope = (await modal.isVisible().catch(() => false)) ? modal : null;

  await run.shot(page, 'vk-upload-dialog');

  run.step('vk: прикрепляю видео');
  let attached = await attachFile(page, {
    inputs: s.fileInputs,
    triggers: s.uploadTriggers,
    file: job.video,
    scope,
  });

  if (!attached) {
    run.info('Поле для файла не появилось — повторяю через «Добавить» → «Загрузить видео»');
    await goto(page, config.vk.cabinet);
    await openUploadDialog(page);
    await run.shot(page, 'vk-dashboard');
    attached = await attachFile(page, {
      inputs: s.fileInputs,
      triggers: s.uploadTriggers,
      file: job.video,
    });
  }

  if (!attached) {
    await run.shot(page, 'vk-no-file-input');
    throw new Error(
      'VK: не нашёл, куда прикрепить видео. Запусти probe и поправь lib/selectors.js → vk.fileInputs / vk.uploadTriggers',
    );
  }
  run.info(`Файл прикреплён через ${attached.via}`);

  // Окно могло открыться только со второй попытки: без scope плейлисты и доступ пойдут мимо формы.
  if (!scope && (await isShown(modal, 20000))) {
    scope = modal;
    run.info('Окно загрузки найдено после повтора');
  }

  run.step('vk: заполняю форму');
  const titleField = await findFirst(page, s.title, { timeout: t.formAppear, scope });
  if (!titleField) {
    await run.shot(page, 'vk-no-form');
    throw new Error('VK: форма загрузки не появилась (нет поля «Название»)');
  }

  await fillFirst(page, s.title, job.title, { what: 'название', scope });
  await fillFirst(page, s.description, job.description, { what: 'описание', required: false, scope });
  run.info(`Название: ${job.title}`);

  run.step('vk: жду окончания загрузки');
  const uploaded = await waitForUploadFinish(page, run, t.uploadFinish);
  if (uploaded) run.info('Загрузка завершена');
  else run.warn('VK: не увидел прогресс загрузки — продолжаю');

  await run.shot(page, 'vk-form');

  if (job.thumb) {
    run.step('vk: ставлю обложку');
    const cover = await attachFile(page, {
      inputs: s.coverInputs,
      triggers: s.coverTriggers,
      file: job.thumb,
      waitMs: 20000,
      scope,
    });
    if (cover) run.info(`Обложка прикреплена через ${cover.via}`);
    else run.warn('VK: не нашёл загрузку обложки — поставь вручную');
    await run.shot(page, 'vk-cover');
  }

  if (job.playlists.length > 0) {
    run.step('vk: плейлисты');
    if (!scope && (await isShown(modal, 5000))) scope = modal;
    if (!scope) {
      run.warn(`VK: окно загрузки не найдено — плейлисты не выбраны. ${PLAYLISTS_HINT}`);
    } else {
      const { missing, selected } = await selectPlaylistsVk(page, scope, job.playlists);
      for (const name of job.playlists) {
        if (missing.includes(name)) run.warn(`VK: плейлист «${name}» не найден в подсказках — его нет или VK не успел ответить. ${PLAYLISTS_HINT}`);
        else if (selected.includes(name)) run.info(`Плейлист «${name}» выбран`);
        else run.warn(`VK: плейлист «${name}» не появился в поле. ${PLAYLISTS_HINT}`);
      }
      await run.shot(page, 'vk-playlists');
    }
  }

  run.step('vk: перехожу к публикации');
  let publishButton = await advanceToPublish(page, s, { scope });
  if (publishButton) run.info('Дошёл до шага публикации');
  else run.warn('VK: кнопка «Опубликовать» пока не видна');
  await run.shot(page, 'vk-publish-step');

  run.step('vk: доступ по ссылке');
  const access = await selectAccessLink(page, s, scope);
  if (access.ok) {
    run.info(`Доступ: ${access.value}`);
  } else {
    await run.shot(page, 'vk-access');
    run.warn(`VK: доступ «по ссылке» не подтверждён (в поле: ${access.value ? `«${access.value}»` : 'не прочитал'})`);
  }
  await run.shot(page, 'vk-publish-tab');

  if (job.publish === false || !access.ok) {
    const previewUrl = await readVideoUrl(page);
    const blocked = job.publish !== false;
    run.step(blocked ? 'vk: не публикую — доступ не «по ссылке»' : 'vk: готово к публикации');
    run.set({
      ready: access.ok,
      url: previewUrl,
      videoId: videoIdFrom(previewUrl),
      stage: blocked ? 'vk: не опубликовано — доступ не подтверждён' : 'vk: ждёт кнопку «Опубликовать»',
    });
    if (previewUrl) run.info(`Ссылка: ${previewUrl}`);
    if (!blocked) {
      run.info('Всё заполнено. Нажми «Опубликовать» в окне браузера.');
      return { pendingPublish: true, accessConfirmed: access.ok, url: previewUrl };
    }
    return {
      pendingPublish: true,
      accessConfirmed: false,
      url: previewUrl,
      error:
        'VK: доступ «по ссылке» не подтверждён — ролик загружен, но НЕ опубликован. ' +
        'Выставь «У кого есть ссылка» и опубликуй вручную в кабинете; повторный запуск для VK создаст дубль',
    };
  }

  run.step('vk: публикую');
  const knownUrl = await readVideoUrl(page);
  if (!publishButton) publishButton = await findFirst(page, s.publish, { timeout: 30000, scope });
  if (!publishButton) {
    await run.shot(page, 'vk-no-publish');
    throw new Error('VK: не нашёл кнопку «Опубликовать»');
  }

  const ready = await waitEnabled(page, publishButton, {
    timeout: t.uploadFinish,
    tick: 15000,
    onTick: async () => run.info('… видео ещё загружается, ждём'),
  });
  if (!ready) {
    await run.shot(page, 'vk-publish-disabled');
    throw new Error('VK: кнопка «Опубликовать» так и не стала активной (видео не догрузилось?)');
  }

  // Пока ждали загрузку, форма могла перерисоваться — перед кликом проверяем доступ ещё раз.
  if (!(await readAccess(page, s, scope)).ok) {
    await run.shot(page, 'vk-access-lost');
    return {
      pendingPublish: true,
      accessConfirmed: false,
      url: knownUrl,
      error: 'VK: перед публикацией доступ уже не «по ссылке» — ролик НЕ опубликован, проверь его в кабинете',
    };
  }

  await publishButton.click({ timeout: 30000 });
  await page.waitForTimeout(3000);
  await run.shot(page, 'vk-after-publish');

  const url = (await waitForVideoUrl(page, s, t.publish)) || knownUrl || (await readVideoUrl(page));
  if (url) run.info(`Ссылка: ${url}`);
  else run.warn('VK: видео опубликовано, но ссылку найти не удалось');

  run.set({ ready: true, published: true, url, videoId: videoIdFrom(url) });
  return { pendingPublish: false, accessConfirmed: true, url };
}

/**
 * Ссылка на видео есть в форме ещё до публикации (блок «Ссылка на видео»).
 * Параметр list=ln-… — ключ доступа ролика «по ссылке»: без него зритель видео не откроет.
 */
async function readVideoUrl(page) {
  const text = await page.locator('body').innerText().catch(() => '');
  const match = text.match(/https:\/\/vkvideo\.ru\/video[^\s"'<>]*/);
  if (!match) return null;
  try {
    const url = new URL(match[0]);
    const list = url.searchParams.get('list');
    return `${url.origin}${url.pathname}${list ? `?list=${list}` : ''}`;
  } catch {
    return match[0];
  }
}

function videoIdFrom(url) {
  if (!url) return null;
  const match = url.match(/video-?\d+_(\d+)/);
  return match ? match[1] : null;
}

async function waitForUploadFinish(page, run, timeout) {
  const deadline = Date.now() + timeout;
  let sawProgress = false;
  let idle = 0;
  let lastLogged = -1;
  const started = Date.now();

  while (Date.now() < deadline) {
    const text = await page.locator('body').innerText().catch(() => '');
    const match = text.match(/Загружено\s+(\d+)\s*%/);
    const processing = /Обработка видео|Идёт обработка/i.test(text);

    if (match) {
      sawProgress = true;
      idle = 0;
      const percent = Number(match[1]);
      if (percent !== lastLogged && (percent === 100 || percent % 10 === 0)) {
        run.info(`… загрузка ${percent}%`);
        lastLogged = percent;
      }
      if (percent >= 100) {
        await page.waitForTimeout(4000);
        return true;
      }
    } else if (processing) {
      sawProgress = true;
      idle = 0;
    } else {
      if (sawProgress) {
        idle += 1;
        if (idle >= 3) return true;
      } else if (Date.now() - started > 30000) {
        return false;
      }
    }

    await page.waitForTimeout(2000);
  }

  return false;
}

/**
 * «Добавить» → «Загрузить видео». Пока кабинет не ожил, клик по «Добавить» меню не открывает:
 * так было с «Встречей зимы», поэтому жмём до трёх раз.
 */
async function openUploadDialog(page) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const add = await findFirst(page, s.addButton, { timeout: 15000 });
    if (!add) return false;

    await add.click({ timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);

    const item = await findFirst(page, s.uploadMenuItem, { timeout: 6000 });
    if (item) {
      await item.click({ timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(2000);
      return true;
    }

    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(1500);
  }
  return false;
}

async function isShown(locator, timeout) {
  return locator
    .waitFor({ state: 'visible', timeout })
    .then(() => true)
    .catch(() => false);
}

/**
 * Добавляет уже опубликованный ролик в плейлисты: страница ролика в кабинете →
 * «Редактировать» → поле «Плейлист» → «Сохранить». Больше ничего не меняет:
 * название, описание, обложка и доступ остаются как есть.
 * expectTitle — защита от чужого ролика: при несовпадении названия ничего не сохраняем.
 * dryRun — только показать, в каких плейлистах ролик и чего не хватает.
 */
export async function addPlaylistsVk({ page, url, playlists, expectTitle, dryRun = false, run }) {
  const id = parseVideoUrl(url);
  if (!id) throw new Error(`VK: не понял, что за ролик, по ссылке ${url}`);
  const club = config.vk.cabinet.match(/@club(\d+)/)?.[1];
  if (club && id.owner !== club) {
    throw new Error(`VK: ролик ${url} не из канала club${club} — плейлисты не трогаю`);
  }

  run.step('vk: открываю «Редактирование видео»');
  let form = await openEditForm(page, id.video, run);
  const title = await readTitle(form);
  run.info(`Ролик: ${title || '(название не прочитал)'}`);
  if (expectTitle && normalize(title) !== normalize(expectTitle)) {
    await closeEditForm(page, form);
    throw new Error(`VK: по ссылке открылся «${title}», а ждали «${expectTitle}» — ничего не меняю`);
  }

  const before = await readChips(chipsField(form));
  run.info(`Сейчас в плейлистах: ${before.length ? before.join(', ') : 'нет'}`);
  const todo = playlists.filter((name) => !hasChip(before, name));
  if (todo.length === 0) {
    run.info('Ролик уже во всех нужных плейлистах');
    await closeEditForm(page, form);
    return { ok: true, changed: false, playlists: before, missing: [] };
  }
  if (dryRun) {
    run.info(`--dry-run: добавил бы ${todo.join(', ')} — ничего не меняю`);
    await closeEditForm(page, form);
    return { ok: true, changed: false, dryRun: true, playlists: before, missing: [], wouldAdd: todo };
  }

  run.step('vk: выбираю плейлисты');
  const { missing } = await selectPlaylistsVk(page, form, todo);
  await run.shot(page, 'vk-edit-playlists');
  const picked = await readChips(chipsField(form));
  if (!todo.some((name) => hasChip(picked, name))) {
    await closeEditForm(page, form);
    return { ok: false, changed: false, playlists: before, missing: todo };
  }

  run.step('vk: сохраняю');
  const save = await findFirst(page, s.save, { timeout: 10000, scope: form });
  if (!save || !(await waitEnabled(page, save, { timeout: 15000 }))) {
    await run.shot(page, 'vk-edit-no-save');
    throw new Error('VK: кнопка «Сохранить» не нашлась или неактивна — плейлисты не сохранены');
  }
  await save.click({ timeout: 15000 });
  if (!(await isHidden(form, 20000))) {
    await run.shot(page, 'vk-edit-not-saved');
    throw new Error('VK: после «Сохранить» окно не закрылось — проверь ролик в кабинете');
  }

  // Проверяем по заново открытой форме: так видно, что VK действительно сохранил.
  run.step('vk: проверяю');
  form = await openEditForm(page, id.video, run);
  const after = await readChips(chipsField(form));
  await run.shot(page, 'vk-edit-check');
  await closeEditForm(page, form);
  run.info(`Теперь в плейлистах: ${after.length ? after.join(', ') : 'нет'}`);

  const absent = playlists.filter((name) => !hasChip(after, name));
  return { ok: absent.length === 0, changed: true, playlists: after, missing: absent };
}

async function openEditForm(page, videoId, run) {
  const target = new URL(config.vk.cabinet);
  target.searchParams.set('section', 'video_video_analytics');
  target.searchParams.set('vid', videoId);
  await goto(page, target.toString());

  const edit = await findFirst(page, s.editButton, { timeout: 30000 });
  if (!edit) {
    await run.shot(page, 'vk-no-edit');
    throw new Error('VK: на странице ролика нет «Редактировать» — поправь lib/selectors.js → vk.editButton');
  }
  await edit.click({ timeout: 15000 });

  const form = page.locator('[role="dialog"]').filter({ hasText: s.editDialog }).last();
  if (!(await isShown(form, 20000))) {
    await run.shot(page, 'vk-no-edit-form');
    throw new Error('VK: окно «Редактирование видео» не открылось');
  }
  // Поле плейлистов дорисовывается после заголовка окна.
  await chipsField(form).waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  return form;
}

async function closeEditForm(page, form) {
  const cancel = await findFirst(page, s.cancel, { timeout: 3000, scope: form });
  if (cancel) await cancel.click({ timeout: 10000 }).catch(() => {});
  else await page.keyboard.press('Escape').catch(() => {});
  await isHidden(form, 10000);
}

function chipsField(form) {
  return form.locator('[class*="ChipsInput"]').first();
}

async function readTitle(form) {
  const field = await findFirst(form.page(), s.title, { timeout: 5000, scope: form });
  return field ? (await field.inputValue().catch(() => '')).trim() : '';
}

async function isHidden(locator, timeout) {
  return locator
    .waitFor({ state: 'hidden', timeout })
    .then(() => true)
    .catch(() => false);
}

function normalize(text) {
  return String(text).replace(/\s+/g, ' ').trim().toLowerCase();
}

/** https://vkvideo.ru/video-242590990_456239068?list=… → { owner: '242590990', video: '456239068' } */
function parseVideoUrl(url) {
  const match = String(url || '').match(/video-?(\d+)_(\d+)/);
  return match ? { owner: match[1], video: match[2] } : null;
}
