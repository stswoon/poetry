#!/usr/bin/env python3
"""Прогресс долгого шага ролика: проценты и оставшееся время.

  progress.py init   DIR --plan "Подготовка:5,Сцены:40,Проверка:15,Рендер:20"
  progress.py start  DIR "Сцены" [--total 12] [--plan 30] [--note "..."]
  progress.py step   DIR 5 [--total 12] [--note "мельница"]
  progress.py render DIR renders/final.log    текущая фаза следит за логом рендера
  progress.py done   DIR                       закрыть текущую фазу
  progress.py status DIR                       одна строка статуса
  progress.py watch  DIR [--every 120]         строка раз в N с, пока всё не готово

В --plan после двоеточия идут минуты по плану. Это вес фазы в процентах и
первая оценка оставшегося времени. Дальше оценка подстраивается под
фактическую скорость. Состояние хранится в DIR/.progress.json.
"""
import argparse
import json
import os
import re
import sys
import time

STATE = '.progress.json'
SAMPLES = '.progress.render.json'
PROGRESS_RE = re.compile(r'@hf-progress\s+(\{.*\})')
FAILED_RE = re.compile(r'Render failed|^\s*Error\b|Unhandled|exit code [1-9]', re.M)


def load(d):
    with open(os.path.join(d, STATE), encoding='utf-8') as f:
        return json.load(f)


def save(d, st):
    path = os.path.join(d, STATE)
    with open(path + '.tmp', 'w', encoding='utf-8') as f:
        json.dump(st, f, ensure_ascii=False, indent=1)
    os.replace(path + '.tmp', path)


def current(st):
    for ph in st['phases']:
        if ph.get('started') and not ph.get('finished'):
            return ph
    return None


def find(st, name):
    for ph in st['phases']:
        if ph['name'] == name:
            return ph
    ph = {'name': name, 'plan': 10.0}
    st['phases'].append(ph)
    return ph


def close(ph, now):
    if ph and not ph.get('finished'):
        ph['finished'] = now


def fmt_min(m):
    m = max(0.0, m)
    if m < 1:
        return '<1 мин'
    if m < 60:
        return '%d мин' % round(m)
    return '%d ч %02d мин' % (m // 60, round(m % 60))


def read_render(d, log):
    """Последняя строка @hf-progress, признаки конца и время последней записи в лог."""
    path = log if os.path.isabs(log) else os.path.join(d, log)
    if not os.path.exists(path):
        return {'state': 'waiting'}
    with open(path, encoding='utf-8', errors='replace') as f:
        text = f.read()
    info = {'state': 'running', 'mtime': os.path.getmtime(path)}
    found = PROGRESS_RE.findall(text)
    if found:
        try:
            info.update(json.loads(found[-1]))
        except ValueError:
            pass
    if 'Render complete' in text:
        info['state'] = 'complete'
    elif FAILED_RE.search(text):
        info['state'] = 'failed'
    return info


def render_rate(d, info, now):
    """Кадров в секунду по последним замерам capture. Замеры хранятся в отдельном файле."""
    path = os.path.join(d, SAMPLES)
    try:
        with open(path, encoding='utf-8') as f:
            samples = json.load(f)
    except (OSError, ValueError):
        samples = []
    if info.get('code') == 'capture' and info.get('done') is not None:
        if not samples or samples[-1][1] != info['done']:
            samples.append([now, info['done']])
            samples = samples[-30:]
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(samples, f)
    if len(samples) >= 2 and samples[-1][0] > samples[0][0]:
        return (samples[-1][1] - samples[0][1]) / (samples[-1][0] - samples[0][0])
    return None


def status(d, st, now=None):
    now = now or time.time()
    phases = st['phases']
    total_plan = sum(p['plan'] for p in phases) or 1.0
    done_plan = sum(p['plan'] for p in phases if p.get('finished'))
    done_actual = sum((p['finished'] - p['started']) / 60 for p in phases
                      if p.get('finished') and p.get('started'))
    speed = min(3.0, max(0.5, done_actual / done_plan)) if done_plan >= 5 else 1.0
    elapsed = (now - st['started']) / 60

    cur = current(st)
    if cur is None:
        if all(p.get('finished') for p in phases):
            return '✅ 100%% · всё готово за %s' % fmt_min(elapsed), 'done'
        return '⏸ %d%% · жду следующего шага · прошло %s' % (
            round(100 * done_plan / total_plan), fmt_min(elapsed)), 'idle'

    in_phase = (now - cur['started']) / 60
    detail, frac, left, event = '', None, None, 'running'
    if cur.get('log'):
        info = read_render(d, cur['log'])
        event = info['state']
        if info['state'] == 'waiting':
            detail = 'запуск'
            frac = 0.0
        else:
            frac = info.get('pct', 0) / 100.0
            if info.get('code') == 'capture' and info.get('total'):
                detail = 'кадр %d/%d' % (info.get('done', 0), info['total'])
                rate = render_rate(d, info, now)
                if rate:
                    left = (info['total'] - info.get('done', 0)) / rate / 60 * 1.1 + 0.3
            elif info.get('code'):
                detail = info['code']
            if info['state'] == 'complete':
                frac, left, detail = 1.0, 0.0, 'готово'
            elif info['state'] == 'failed':
                detail = 'ОШИБКА, смотри лог'
            elif now - info['mtime'] > 300:
                event = 'stalled'
                detail += ', лог не обновлялся %s' % fmt_min((now - info['mtime']) / 60)
    elif cur.get('total'):
        frac = min(1.0, cur.get('done', 0) / cur['total'])
        detail = '%d/%d' % (cur.get('done', 0), cur['total'])
    if frac is None:
        frac = min(in_phase / cur['plan'], 0.9) if cur['plan'] else 0.0
    if left is None:
        if frac >= 0.1 and in_phase > 0.5:
            left = in_phase * (1 - frac) / frac
        else:
            left = max(cur['plan'] * speed - in_phase, cur['plan'] * 0.2)
    left += sum(p['plan'] for p in phases if not p.get('started')) * speed

    pct = round(100 * (done_plan + cur['plan'] * frac) / total_plan)
    pct = min(pct, 99)
    name = cur['name'] + (' ' + detail if detail else '')
    if cur.get('note'):
        name += ' (%s)' % cur['note']
    icon = {'failed': '❌', 'stalled': '⚠️', 'complete': '✅'}.get(event, '⏳')
    line = '%s %d%% · %s · прошло %s · осталось ≈ %s' % (
        icon, pct, name, fmt_min(elapsed), fmt_min(left))
    return line, event


def main():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd', choices=['init', 'start', 'step', 'render', 'done', 'status', 'watch'])
    ap.add_argument('dir')
    ap.add_argument('arg', nargs='?')
    ap.add_argument('--plan')
    ap.add_argument('--total', type=int)
    ap.add_argument('--note')
    ap.add_argument('--every', type=int, default=120)
    a = ap.parse_args()
    d, now = a.dir, time.time()

    if a.cmd == 'init':
        if not a.plan:
            ap.error('init требует --plan "Фаза:минуты,..."')
        phases = []
        for part in a.plan.split(','):
            name, _, mins = part.rpartition(':')
            phases.append({'name': name.strip(), 'plan': float(mins)})
        for f in (SAMPLES,):
            try:
                os.remove(os.path.join(d, f))
            except OSError:
                pass
        save(d, {'started': now, 'phases': phases})
        print(status(d, load(d), now)[0])
        return

    st = load(d)
    if a.cmd == 'start':
        close(current(st), now)
        ph = find(st, a.arg)
        ph.update(started=now, finished=None, done=0, total=a.total, note=a.note, log=None)
        if a.plan:
            ph['plan'] = float(a.plan)
    elif a.cmd == 'step':
        ph = current(st)
        if ph is None:
            ap.error('нет текущей фазы, сначала start')
        ph['done'] = int(a.arg)
        if a.total:
            ph['total'] = a.total
        if a.note is not None:
            ph['note'] = a.note
    elif a.cmd == 'render':
        ph = current(st)
        if ph is None:
            ap.error('нет текущей фазы, сначала start')
        ph['log'] = a.arg
        try:
            os.remove(os.path.join(d, SAMPLES))
        except OSError:
            pass
    elif a.cmd == 'done':
        close(find(st, a.arg) if a.arg else current(st), now)
    elif a.cmd == 'watch':
        last_print, last_event = 0.0, None
        while True:
            try:
                st = load(d)
            except (OSError, ValueError):
                time.sleep(2)
                continue
            line, event = status(d, st)
            changed = event != last_event and event in ('complete', 'failed', 'stalled', 'done')
            if changed or time.time() - last_print >= a.every:
                print(line, flush=True)
                last_print, last_event = time.time(), event
            if event == 'done':
                return
            time.sleep(5)
    if a.cmd != 'watch':
        save(d, st)
        print(status(d, st, now)[0])


if __name__ == '__main__':
    main()
