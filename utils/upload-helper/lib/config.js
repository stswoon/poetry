import path from 'node:path';

import { helperRoot, readJson, resolvePath } from '../../lib/files.js';

export { resolvePath };

export const ROOT = helperRoot(import.meta.url);

export const config = readJson(path.join(ROOT, 'config.json'));

/** Путь из config.json (относительный считается от папки upload-helper). */
export function fromRoot(p) {
  return path.isAbsolute(p) ? p : path.join(ROOT, p);
}

/** Кабинет площадки, с которого начинается логин и загрузка. */
export function platformTarget(platform) {
  switch (platform) {
    case 'vk':
      return config.vk.cabinet;
    case 'rutube':
      return config.rutube.studio;
    case 'youtube':
      return config.youtube.studio;
    default:
      throw new Error(`Неизвестная площадка: ${platform}`);
  }
}
