/**
 * Разбор аргументов командной строки без зависимостей — общий для всех хелперов utils/.
 * Поддерживает: --key value, --key=value, --flag, повторяющиеся --file a --file b.
 *
 * Флаги из `booleans` никогда не забирают следующее слово: `--dry-run Пушкин/...`
 * оставит «Пушкин/...» позиционным аргументом. Значение им можно дать только через `=`.
 */
export class UsageError extends Error {}

export function parseArgs(argv, { booleans = [] } = {}) {
  const flags = new Set(booleans);
  const out = { _: [] };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--') {
      out._.push(...argv.slice(i + 1));
      break;
    }

    if (!arg.startsWith('--')) {
      out._.push(arg);
      continue;
    }

    const eq = arg.indexOf('=');
    if (eq !== -1) {
      add(out, arg.slice(2, eq), arg.slice(eq + 1));
      continue;
    }

    const key = arg.slice(2);
    const next = argv[i + 1];
    if (flags.has(key) || next === undefined || next.startsWith('--')) {
      add(out, key, true);
    } else {
      add(out, key, next);
      i++;
    }
  }

  return out;
}

function add(target, key, value) {
  if (Object.prototype.hasOwnProperty.call(target, key)) {
    target[key] = [].concat(target[key], value);
  } else {
    target[key] = value;
  }
}

/**
 * Да/нет из флага или job-файла. Непонятное значение — ошибка, а не молчаливый fallback:
 * `--dry-run=nope` не должен превращаться в настоящий запуск.
 */
export function bool(value, fallback = false, name = 'флаг') {
  if (value === undefined || value === null) return fallback;
  const v = last(value);
  if (v === true || v === false) return v;
  const s = String(v).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'да', 'on'].includes(s)) return true;
  if (['0', 'false', 'no', 'n', 'нет', 'off'].includes(s)) return false;
  throw new UsageError(`${name}: ожидается да/нет (true/false), а не «${v}»`);
}

export function list(value) {
  if (value === undefined || value === null) return [];
  return [].concat(value).flatMap((v) => String(v).split(',')).map((v) => v.trim()).filter(Boolean);
}

export function number(value, fallback) {
  if (value === undefined) return fallback;
  const n = Number(last(value));
  return Number.isFinite(n) ? n : fallback;
}

/** Последнее значение повторяющегося аргумента. */
export function last(value) {
  return Array.isArray(value) ? value.at(-1) : value;
}

/**
 * Строковая опция: последнее значение или undefined, если флага нет.
 * Флаг без значения (`--remote` в конце строки) — UsageError с подсказкой.
 */
export function option(args, name, hint = `Укажи значение: --${name} <...>`) {
  const value = last(args[name]);
  if (value === undefined) return undefined;
  if (value === true) throw new UsageError(hint);
  return String(value);
}
