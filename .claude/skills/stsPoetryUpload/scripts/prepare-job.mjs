#!/usr/bin/env node
/**
 * Готовит публикацию стиха: проверяет папку и пишет рядом с роликом job.json и desc.txt.
 * Запуск: node prepare-job.mjs "<Поэт>/<Стих>"
 * Последняя строка вывода — PREPARE_JSON: {...}; код выхода 1, если публиковать нельзя.
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from '../../../../utils/lib/files.js';
import { slug } from '../../../../utils/lib/state.js';

const DESCRIPTION_LIMIT = 5000;
const OUT_OF_PROGRAM = 'вне классов';

const poemArg = process.argv[2];
if (!poemArg) fail(['Укажи стих: node prepare-job.mjs "<Поэт>/<Стих>"']);

const [poet, poem] = poemArg.split('/').map((part) => part.trim());
const dir = path.join(REPO_ROOT, 'texts', poet, poem ?? '');
if (!poem || !fs.existsSync(dir)) fail([`Нет папки стиха: ${dir}`]);

const errors = [];
const poemMd = readIfExists('poem.md');
const video = findVideo();
const title = `${poem} - ${poet}`;
const description = buildDescription();

if (!fs.existsSync(path.join(dir, 'cover.png'))) errors.push('Нет обложки cover.png');
if (!/^##\s*Вывод[\s\S]*?✅/m.test(readIfExists('rights.md'))) {
  errors.push('В rights.md нет вывода ✅: публиковать нельзя, пока права не подтверждены');
}
if (description.length > DESCRIPTION_LIMIT) {
  errors.push(`Описание ${description.length} символов, лимит ${DESCRIPTION_LIMIT}`);
}
if (errors.length > 0) fail(errors);

const playlists = findPlaylists();

fs.writeFileSync(path.join(dir, 'desc.txt'), `${description}\n`);
fs.writeFileSync(
  path.join(dir, 'job.json'),
  `${JSON.stringify(
    {
      video,
      thumb: 'cover.png',
      title,
      descriptionFile: 'desc.txt',
      category: 'Культура',
      playlists,
      platforms: ['vk', 'rutube'],
      publish: true,
    },
    null,
    2,
  )}\n`,
);

const helper = path.join(REPO_ROOT, 'utils', 'upload-helper');
report({
  ok: true,
  job: path.join(dir, 'job.json'),
  video: path.join(dir, video),
  poemText: path.join(dir, 'poem.md'),
  title,
  playlists,
  installed: fs.existsSync(path.join(helper, 'node_modules', 'playwright-core')),
  profile: fs.existsSync(path.join(helper, '.profile')),
  previousRuns: findPreviousRuns(helper),
});

function readIfExists(name) {
  const file = path.join(dir, name);
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
  errors.push(`Нет файла ${name}`);
  return '';
}

/** Самая старшая версия «<Стих> - <Поэт> - vN.mp4»; иначе единственный mp4 в папке. */
function findVideo() {
  const files = fs.readdirSync(dir).filter((name) => /\.mp4$/i.test(name));
  const version = (name) => Number(name.match(/ - v(\d+)\.mp4$/i)?.[1] ?? -1);
  const versioned = files.filter((name) => version(name) >= 0);
  if (versioned.length > 0) return versioned.sort((a, b) => version(b) - version(a))[0];
  if (files.length === 1) return files[0];
  errors.push(
    files.length === 0 ? 'В папке стиха нет mp4' : `Непонятно, какой ролик брать: ${files.join(', ')}`,
  );
  return null;
}

/** «Название - ФИО», пустая строка, текст стиха. */
function buildDescription() {
  const fullName = poemMd.match(/\*\*Поэт:\*\*\s*(.+)/)?.[1].replace(/\s*\(.*$/, '').trim();
  const text = poemMd.match(/^##\s*Текст\s*$([\s\S]*?)(?=^##\s|(?![\s\S]))/m)?.[1].trim();
  if (poemMd && !fullName) errors.push('В poem.md нет строки «**Поэт:** ФИО»');
  if (poemMd && !text) errors.push('В poem.md нет раздела «## Текст»');
  return `${poem} - ${fullName}\n\n${text}`;
}

/** Плейлисты по programs/N-класс.md: строка стиха ищется по пути, а если его нет — по автору и названию. */
function findPlaylists() {
  const programs = path.join(REPO_ROOT, 'programs');
  const grades = fs
    .readdirSync(programs)
    .map((name) => Number(name.match(/^(\d+)-класс\.md$/)?.[1]))
    .filter(Boolean)
    .sort((a, b) => a - b);

  const found = grades.filter((grade) =>
    fs
      .readFileSync(path.join(programs, `${grade}-класс.md`), 'utf8')
      .split('\n')
      .some(isPoemRow),
  );
  return found.length > 0 ? found.map((grade) => `класс ${grade}`) : [OUT_OF_PROGRAM];
}

function isPoemRow(line) {
  const cells = line.split('|').map((cell) => cell.trim());
  if (cells.includes(`texts/${poet}/${poem}`)) return true;
  return cells.some((cell) => cell.endsWith(poet)) && cells.includes(poem);
}

/** Прошлые запуски с тем же названием: повторная загрузка создаст дубль. */
function findPreviousRuns(helperDir) {
  const logs = path.join(helperDir, 'logs');
  if (!fs.existsSync(logs)) return [];
  return fs
    .readdirSync(logs)
    .filter((name) => name.endsWith(`-${slug(title)}`))
    .sort()
    .map((name) => {
      const state = JSON.parse(fs.readFileSync(path.join(logs, name, 'state.json'), 'utf8'));
      return {
        run: name,
        stage: state.stage,
        results: (state.results ?? []).map(({ platform, url }) => ({ platform, url })),
        warnings: state.warnings ?? [],
      };
    });
}

function report(result) {
  console.log(`PREPARE_JSON: ${JSON.stringify(result)}`);
}

function fail(messages) {
  for (const message of messages) console.error(`! ${message}`);
  report({ ok: false, errors: messages });
  process.exit(1);
}
