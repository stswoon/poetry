/**
 * Все селекторы в одном месте — чтобы правки после редизайна студий
 * не требовали лезть в логику.
 *
 * Если что-то не находится: запусти `node run.js probe --platform vk`
 * (или rutube/youtube), посмотри logs/<run>/probe-*.md и поправь список ниже.
 *
 * Доступ проверяется после выбора: accessLabel — подпись поля, под которой
 * стоит текущее значение; accessCurrent — контрол, в имени которого уже видно
 * «по ссылке»; accessLinkValue — как выглядит нужное значение.
 */

export const vk = {
  // Загрузка открывается из кабинета: «Добавить» → «Загрузить видео».
  addButton: [
    { role: 'button', name: /^Добавить$/i },
  ],
  uploadMenuItem: [
    { role: 'menuitem', name: /Загрузить видео/i },
    { text: /^Загрузить видео$/i },
  ],

  uploadTriggers: [
    { role: 'button', name: /Загрузить видео|Добавить видео|Выбрать файл|Загрузить/i },
    { role: 'link', name: /Загрузить видео|Добавить видео/i },
    { text: /Загрузить видео/i },
  ],

  fileInputs: ['input[type=file][accept*="video"]', 'input[type=file]'],

  title: [
    { placeholder: /Название/i },
    { label: /Название/i },
    'input[name="title"]',
    'input[name="name"]',
  ],

  description: [
    { placeholder: /Описание/i },
    { label: /Описание/i },
    'textarea[name="description"]',
    'textarea',
    '[contenteditable="true"]',
  ],

  coverTriggers: [
    { role: 'button', name: /Загрузить обложку|Изменить обложку|Добавить обложку|Обложка/i },
    { text: /Загрузить обложку|Изменить обложку/i },
    'label:has-text("Обложка")',
  ],
  coverInputs: ['input[type=file][accept*="image"]', 'input[type=file][accept*="png"]'],

  // Вкладка «Публикация»: «Кто может смотреть это видео?» → «У кого есть ссылка».
  accessTriggers: [
    { role: 'button', name: /Все пользователи|Кто может смотреть|Доступ|Видимость/i },
    { role: 'combobox', name: /Все пользователи|Доступ|Видимость|Кто может смотреть/i },
    { text: /^Все пользователи$/ },
  ],
  accessLinkOption: [
    { role: 'option', name: /У кого есть ссылка|по ссылке/i },
    { role: 'menuitem', name: /У кого есть ссылка|по ссылке/i },
    { role: 'radio', name: /У кого есть ссылка|по ссылке/i },
    { text: /У кого есть ссылка|Только по ссылке/i },
  ],
  accessLabel: /^\s*Кто может смотреть это видео\??\s*$/i,
  accessCurrent: [
    { role: 'button', name: /Кто может смотреть[\s\S]*(У кого есть ссылка|по ссылке)/i },
  ],
  accessLinkValue: /У кого есть ссылка|по ссылке/i,

  next: [
    { role: 'button', name: /^Далее$/i },
    { role: 'button', name: /Продолжить/i },
  ],

  publish: [
    { role: 'button', name: /^Опубликовать$/i },
    { role: 'button', name: /Опубликовать/i },
  ],

  successText: /Видео опубликовано|Опубликовано|Видео загружено/i,
  videoUrl: /vkvideo\.ru\/video|vk\.com\/video/,
};

export const rutube = {
  uploadTriggers: [
    { role: 'button', name: /Загрузить видео|Загрузить ролик|Выбрать файл|Загрузить/i },
    { role: 'link', name: /Загрузить видео/i },
    { text: /Загрузить видео|Выбрать файл/i },
  ],

  fileInputs: ['input[type=file][accept*="video"]', 'input[type=file]'],

  title: [
    { placeholder: /Название/i },
    { label: /Название/i },
    'input[name="title"]',
    'input[name="name"]',
  ],

  description: [
    { placeholder: /Описание/i },
    { label: /Описание/i },
    'textarea[name="description"]',
    'textarea',
    '[contenteditable="true"]',
  ],

  category: [
    { role: 'combobox', name: /Выберите категорию|Категория/i },
    { text: /^Выберите категорию$/ },
    { label: /Категория/i },
  ],
  categoryFallbackSelect: 'select',

  coverTriggers: [
    { role: 'button', name: /^Выбрать$/ },
    { text: /Загрузить свою/i },
    { role: 'button', name: /Загрузить обложку|Изменить обложку|Добавить обложку|Обложка/i },
  ],
  coverInputs: ['input[type=file][accept*="image"]', 'input[type=file][accept*="png"]'],

  // Поле «Доступ»: «Для всех» → «Только по ссылке».
  accessTriggers: [
    { role: 'combobox', name: /^Для всех$|^Только по ссылке$|Доступ|Видимость/i },
    { text: /^Для всех$|^Только по ссылке$/ },
    { text: /Для всех/i },
    { role: 'button', name: /Параметры доступа|Доступ|Видимость/i },
  ],
  accessLinkOption: [
    { role: 'option', name: /по ссылке/i },
    { role: 'menuitem', name: /по ссылке/i },
    { role: 'radio', name: /по ссылке/i },
    { text: /Только по ссылке/i },
  ],
  accessLabel: /^\s*Доступ\s*$/i,
  accessCurrent: [
    { role: 'combobox', name: /^\s*Только по ссылке\s*$/i },
  ],
  accessLinkValue: /по ссылке/i,

  publish: [
    { role: 'button', name: /^Опубликовать$/i },
    { role: 'button', name: /Опубликовать/i },
  ],

  successText: /Видео опубликовано|Ролик опубликован|Опубликовано/i,
  // Студия добавляет ролик в плейлисты при публикации и сообщает об ошибке только коротким уведомлением.
  playlistError: /(Не получилось|Не удалось)[^.]*плейлист/i,
  videoUrl: /rutube\.ru\/video\//,
};

/**
 * YouTube Studio (новый мастер загрузки, 2025–2026):
 * Информация → Дополнения → Проверка → Доступ.
 * Заголовок и описание — contenteditable с одинаковым id=textbox,
 * поэтому различаем их по aria-label.
 */
export const youtube = {
  uploadTriggers: [
    { role: 'menuitem', name: /Добавить видео/i },
    { role: 'button', name: /Добавить видео/i },
    { text: /Добавить видео/i },
  ],
  createMenu: [{ role: 'button', name: /^Создать$/i }],

  fileInputs: [
    'ytcp-uploads-dialog input[type=file][accept*="video"]',
    'ytcp-uploads-dialog input[type=file]',
    'input[type=file][accept*="video"]',
  ],

  title: [
    'ytcp-uploads-dialog div#textbox[aria-label^="Укажите название"]',
    'ytcp-uploads-dialog #textbox[role="textbox"][aria-label*="название"]',
  ],
  description: [
    'ytcp-uploads-dialog div#textbox[aria-label^="Расскажите"]',
    'ytcp-uploads-dialog #textbox[role="textbox"][aria-label*="описание"]',
  ],

  showMore: ['#toggle-button', { role: 'button', name: /Развернуть|Показать дополнительные/i }],

  audienceNotKids: [
    'tp-yt-paper-radio-button[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"]',
    { role: 'radio', name: /Нет, это видео не для детей/i },
  ],
  audienceKids: [
    'tp-yt-paper-radio-button[name="VIDEO_MADE_FOR_KIDS_MFK"]',
    { role: 'radio', name: /Да, это видео для детей/i },
  ],

  alteredContentNo: ['tp-yt-paper-radio-button[name="VIDEO_HAS_ALTERED_CONTENT_NO"]'],
  paidProductNo: ['tp-yt-paper-radio-button[name="VIDEO_PAID_PRODUCT_PLACEMENT_NO"]'],

  // Категория — ytcp-select без id; узнаём её по названию одной из категорий.
  categoryNames:
    /^(Животные|Игры|Люди и блоги|Музыка|Наука и техника|Новости и политика|Образование|Общественная деятельность|Путешествия|Развлечения|Спорт|Транспорт|Фильмы и анимация|Хобби и стиль|Юмор)$/i,

  next: ['#next-button', { role: 'button', name: /^Далее$/i }],
  back: ['#back-button'],

  thumbTriggers: [
    { role: 'button', name: /Загрузить файл/i },
    { text: /Загрузить файл/i },
  ],
  thumbInputs: ['#file-loader', 'ytcp-uploads-dialog input[type=file][accept*="image"]'],

  playlistTrigger: [
    'ytcp-dropdown-trigger[aria-label="Выбрать плейлисты"]',
    { role: 'button', name: /Выберите плейлист|Выбрать плейлисты/i },
    { text: /^Выберите плейлист$/ },
  ],
  playlistDialog: 'tp-yt-paper-dialog[aria-label="Выберите плейлисты"]',
  playlistGroup: 'ytcp-checkbox-group#playlists-list',

  checksDone: /Проверки завершены|Проблем не обнаружено|Проверка не выявила|Авторские права не нарушены/i,
  checksRunning: /Проверка:|Проверки выполняются|Проверка продолжается|Идёт проверка|Проверяем/i,

  visibilityUnlisted: [
    'tp-yt-paper-radio-button[name="UNLISTED"]',
    { role: 'radio', name: /Доступ по ссылке|^По ссылке$/i },
    { text: /Доступ по ссылке/i },
  ],
  visibilityPublic: ['tp-yt-paper-radio-button[name="PUBLIC"]'],
  visibilityPrivate: ['tp-yt-paper-radio-button[name="PRIVATE"]'],

  publish: [
    '#done-button',
    { role: 'button', name: /^Опубликовать$/i },
    { role: 'button', name: /^Сохранить$/i },
  ],
  confirmPublish: [{ role: 'button', name: /^Опубликовать$/i }],

  successText: /Видео опубликовано|Видео сохранено|Опубликовано|Все изменения сохранены/i,
  videoUrl: /youtu\.be\/[\w-]{11}|youtube\.com\/watch\?v=[\w-]{11}/,
};

export const selectors = { vk, rutube, youtube };
