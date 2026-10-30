import { config } from './config.js';
import { selectors } from './selectors.js';
import { attachFile, checkConsentBoxes, fillFirst, findFirst, waitEnabled } from './ui.js';
import { chooseOption, readAccess, selectAccessLink, selectPlaylistsRutube, waitForVideoUrl } from './flows.js';
import { goto } from './browser.js';

const s = selectors.rutube;

export async function uploadRutube({ page, job, run }) {
  const t = config.timeouts;

  run.step('rutube: открываю студию');
  await goto(page, config.rutube.uploadUrl);
  run.info(`URL: ${page.url()}`);

  // Студия открывает окно загрузки сама (?popup=upload_video), но иногда — только по кнопке.
  const modal = page.locator('[role="dialog"]').last();
  await modal.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  let scope = (await modal.isVisible().catch(() => false)) ? modal : null;

  run.step('rutube: прикрепляю видео');
  let attached = await attachFile(page, {
    inputs: s.fileInputs,
    triggers: s.uploadTriggers,
    file: job.video,
    scope,
  });

  if (!attached) {
    run.info('Окно загрузки не открылось — жму «Добавить» в студии');
    const add = await findFirst(page, [{ role: 'button', name: /^Добавить$/i }], { timeout: 10000 });
    if (add) {
      await add.click({ timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(2000);
      scope = (await modal.isVisible().catch(() => false)) ? modal : null;
      attached = await attachFile(page, {
        inputs: s.fileInputs,
        triggers: s.uploadTriggers,
        file: job.video,
        scope,
      });
    }
  }

  if (!attached) {
    await run.shot(page, 'rutube-no-file-input');
    throw new Error(
      'RUTUBE: не нашёл, куда прикрепить видео. Запусти probe и поправь lib/selectors.js → rutube.fileInputs / rutube.uploadTriggers',
    );
  }
  run.info(`Файл прикреплён через ${attached.via}`);

  run.step('rutube: заполняю форму');
  const titleField = await findFirst(page, s.title, { timeout: t.formAppear, scope });
  if (!titleField) {
    await run.shot(page, 'rutube-no-form');
    throw new Error('RUTUBE: форма загрузки не появилась (нет поля «Название»)');
  }

  await fillFirst(page, s.title, job.title, { what: 'название', scope });
  await fillFirst(page, s.description, job.description, { what: 'описание', required: false, scope });
  run.info(`Название: ${job.title}`);

  if (job.category) {
    const ok = await chooseOption(page, s.category, job.category, s.categoryFallbackSelect);
    if (ok) run.info(`Категория: ${job.category}`);
    else run.warn(`RUTUBE: не смог выбрать категорию «${job.category}» — проверь вручную`);
  }

  await run.shot(page, 'rutube-form');

  if (job.thumb) {
    run.step('rutube: ставлю обложку');
    const cover = await attachFile(page, {
      inputs: s.coverInputs,
      triggers: s.coverTriggers,
      file: job.thumb,
      waitMs: 8000,
      scope,
    });
    if (cover) {
      run.info(`Обложка прикреплена через ${cover.via}`);
      const crop = await findFirst(
        page,
        [{ role: 'button', name: /^Готово$/i }, { text: /^Готово$/ }],
        { timeout: 8000 },
      );
      if (crop) {
        await crop.click({ timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(1500);
        run.info('Кадрирование обложки подтверждено');
      }
    } else {
      run.warn('RUTUBE: не нашёл загрузку обложки — поставь вручную');
    }
    await run.shot(page, 'rutube-cover');
  }

  if (job.playlists.length > 0) {
    run.step('rutube: плейлисты');
    if (!scope) {
      run.warn('RUTUBE: окно загрузки не найдено — плейлисты не выбраны');
    } else {
      const { missing, selected } = await selectPlaylistsRutube(page, scope, job.playlists);
      for (const name of job.playlists) {
        if (missing.includes(name)) run.warn(`RUTUBE: плейлиста «${name}» нет — создай его в студии и повтори`);
        else if (selected.includes(name)) run.info(`Плейлист «${name}» выбран`);
        else run.warn(`RUTUBE: плейлист «${name}» не появился в поле — проверь вручную`);
      }
      await run.shot(page, 'rutube-playlists');
    }
  }

  run.step('rutube: доступ по ссылке');
  const access = await selectAccessLink(page, s, scope);
  if (access.ok) {
    run.info(`Доступ: ${access.value}`);
  } else {
    await run.shot(page, 'rutube-access');
    run.warn(
      `RUTUBE: доступ «Только по ссылке» не подтверждён (в поле: ${access.value ? `«${access.value}»` : 'не прочитал'})`,
    );
  }
  await run.shot(page, 'rutube-ready');

  const previewUrl = await readVideoUrl(page);
  if (previewUrl) run.info(`Ссылка: ${previewUrl}`);
  run.set({ ready: access.ok, url: previewUrl });

  if (job.publish === false) {
    run.step('rutube: готово к публикации');
    run.set({ stage: 'rutube: ждёт кнопку «Опубликовать»' });
    run.info('Всё заполнено. Нажми «Опубликовать» в окне браузера.');
    return { pendingPublish: true, accessConfirmed: access.ok, url: previewUrl };
  }

  if (!access.ok) {
    run.step('rutube: не публикую — доступ не «по ссылке»');
    run.set({ stage: 'rutube: не опубликовано — доступ не подтверждён' });
    return {
      pendingPublish: true,
      accessConfirmed: false,
      url: previewUrl,
      error:
        'RUTUBE: доступ «Только по ссылке» не подтверждён — ролик загружен, но НЕ опубликован. ' +
        'Выставь доступ и опубликуй вручную в студии; повторный запуск для RUTUBE создаст дубль',
    };
  }

  run.step('rutube: публикую');
  const consent = await checkConsentBoxes(page, scope);
  for (const label of consent) run.info(`Отмечен чекбокс: «${label}»`);

  let publishButton = await findFirst(page, s.publish, { timeout: 30000, scope });
  if (!publishButton) {
    await run.shot(page, 'rutube-no-publish');
    throw new Error('RUTUBE: не нашёл кнопку «Опубликовать»');
  }

  const ready = await waitEnabled(page, publishButton, {
    timeout: t.uploadFinish,
    tick: 15000,
    onTick: async () => run.info('… видео ещё обрабатывается, ждём'),
  });
  if (!ready) {
    await run.shot(page, 'rutube-publish-disabled');
    throw new Error('RUTUBE: кнопка «Опубликовать» так и не стала активной');
  }

  // Пока ждали обработку, форма могла перерисоваться — перед кликом проверяем доступ ещё раз.
  if (!(await readAccess(page, s, scope)).ok) {
    await run.shot(page, 'rutube-access-lost');
    return {
      pendingPublish: true,
      accessConfirmed: false,
      url: previewUrl,
      error: 'RUTUBE: перед публикацией доступ уже не «по ссылке» — ролик НЕ опубликован, проверь его в студии',
    };
  }

  await publishButton.click({ timeout: 30000 });
  await page.waitForTimeout(3000);
  await run.shot(page, 'rutube-after-publish');

  const url = (await waitForVideoUrl(page, s, t.publish)) || previewUrl || (await readVideoUrl(page));
  if (url) run.info(`Ссылка: ${url}`);
  else run.warn('RUTUBE: видео опубликовано, но ссылку найти не удалось');

  run.set({ ready: true, published: true, url });
  return { pendingPublish: false, accessConfirmed: true, url };
}

/** Ссылка на ролик есть в форме ещё до публикации. */
async function readVideoUrl(page) {
  const text = await page.locator('body').innerText().catch(() => '');
  const match = text.match(/https:\/\/rutube\.ru\/video\/[^\s"'<>]+/);
  return match ? match[0] : null;
}
