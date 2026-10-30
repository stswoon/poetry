import path from 'node:path';

import { helperRoot, readJson, REPO_ROOT, resolvePath } from '../../lib/files.js';

export { REPO_ROOT, resolvePath };

export const ROOT = helperRoot(import.meta.url);

export const config = readJson(path.join(ROOT, 'config.json'));

/** Путь из config.json (относительный считается от папки upload-helper-disk). */
export function fromRoot(p) {
  return path.isAbsolute(p) ? p : path.join(ROOT, p);
}
