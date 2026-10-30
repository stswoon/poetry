import fs from 'node:fs';
import path from 'node:path';

/**
 * Прогон = папка logs/<runId>/ и файл state.json, по которому человек или агент
 * понимает, на каком шаге скрипт и чем всё кончилось.
 * extra — поля конкретного хелпера, которые попадут в state.json.
 */
export class Run {
  constructor(dir, extra = {}) {
    this.dir = dir;
    fs.mkdirSync(dir, { recursive: true });

    this.statePath = path.join(dir, 'state.json');
    this.data = {
      runId: path.basename(dir),
      startedAt: new Date().toISOString(),
      stage: 'init',
      ...extra,
      warnings: [],
      steps: [],
      error: null,
    };
    this.save();
  }

  set(patch) {
    Object.assign(this.data, patch);
    this.data.updatedAt = new Date().toISOString();
    this.save();
  }

  save() {
    fs.writeFileSync(this.statePath, JSON.stringify(this.data, null, 2), 'utf8');
  }

  step(name, extra = {}) {
    this.data.stage = name;
    this.data.steps.push({ name, at: new Date().toISOString(), ...extra });
    this.set({});
    console.log(`\n=== ${name} ===`);
  }

  info(message) {
    console.log(`    ${message}`);
  }

  warn(message) {
    this.data.warnings.push(message);
    this.set({});
    console.log(`    ! ${message}`);
  }

  fail(error, extra = {}) {
    const message = error instanceof Error ? error.message : String(error);
    this.set({ stage: 'failed', error: message, ...extra });
    console.error(`\n!!! ${message}`);
  }

  /** Скриншот страницы Playwright в папку прогона. */
  async shot(page, name) {
    const file = path.join(
      this.dir,
      `${String(this.data.steps.length).padStart(2, '0')}-${slug(name)}.png`,
    );
    try {
      await page.screenshot({ path: file });
    } catch {
      /* окно могло закрыться — не повод падать */
    }
    return file;
  }

  writeJson(name, value) {
    const file = path.join(this.dir, name);
    fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf8');
    return file;
  }

  writeText(name, text) {
    const file = path.join(this.dir, name);
    fs.writeFileSync(file, text, 'utf8');
    return file;
  }
}

export function slug(text) {
  return (
    String(text)
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'step'
  );
}

/** Папка прогона: <logsDir>/<время>-<метка>. */
export function runDir(logsDir, label) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return path.join(logsDir, `${stamp}-${slug(label)}`);
}
