/**
 * Все селекторы в одном месте — чтобы правки после редизайна студий
 * не требовали лезть в логику.
 *
 * Если что-то не находится: запусти `node run.js probe --platform vk`
 * (или rutube), посмотри logs/<run>/probe-*.md и поправь список ниже.
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
  videoUrl: /rutube\.ru\/video\//,
};

export const selectors = { vk, rutube };
