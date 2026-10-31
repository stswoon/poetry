#!/usr/bin/env python3
"""Озвучка по ролям: режет elevenlabs.txt по меткам #роль, генерирует куски, склеивает voice.mp3.

  python3 build.py split     куски текста в parts/ и parts.json
  python3 build.py generate  недостающие parts/*.mp3 через utils/generate-elevenlabs-voice
  python3 build.py join      выравнивает громкость кусков и собирает ../voice.mp3

Перегенерировать кусок: удалить его mp3 и снова запустить generate и join.
"""
import json, re, subprocess, sys, tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
POEM = HERE.parent
ROOT = POEM.parents[2]
UTIL = ROOT / 'utils' / 'generate-elevenlabs-voice'
PARTS = HERE / 'parts'
GAP = 0.6           # между репликами
GAP_STANZA = 1.1    # если между кусками граница строфы
TARGET = -18.0      # LUFS каждого куска


def split():
    PARTS.mkdir(exist_ok=True)
    text = (POEM / 'elevenlabs.txt').read_text(encoding='utf8').split('копировать отсюда ===========')[1].strip()
    parts, cur = [], None
    for line in text.split('\n'):
        if line.startswith('#'):
            cur = {'role': line[1:].strip(), 'lines': []}
            parts.append(cur)
        else:
            cur['lines'].append(line)
    index = []
    for i, p in enumerate(parts, 1):
        body = '\n'.join(p['lines']).rstrip()
        stanza_end = False
        body = re.sub(r'\s*\[(short|long) pause\]\s*$', '', body)
        name = f"{i:02d}-{p['role']}"
        (PARTS / f'{name}.txt').write_text(body + '\n', encoding='utf8')
        index.append({'name': name, 'role': p['role'], 'stanza_end': bool(stanza_end), 'chars': len(body) + 1})
    (HERE / 'parts.json').write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding='utf8')
    print(len(index), 'кусков,', sum(p['chars'] for p in index), 'символов')


def generate():
    voice = json.loads((POEM / 'voice.json').read_text(encoding='utf8'))
    index = json.loads((HERE / 'parts.json').read_text(encoding='utf8'))
    spent = 0.0
    for p in index:
        out = PARTS / f"{p['name']}.mp3"
        if out.exists():
            continue
        vid = voice['cast'][p['role']]['voice_id']
        cmd = ['node', 'run.js', 'generate', '--text', str(PARTS / f"{p['name']}.txt"), '--voice-id', vid, '--out', str(out),
               '--stability', str(voice['settings']['stability']), '--similarity', str(voice['settings']['similarity_boost'])]
        res = subprocess.run(cmd, cwd=UTIL, capture_output=True, text=True)
        line = [x for x in res.stdout.split('\n') if x.startswith('RESULT_JSON')]
        data = json.loads(line[-1].split(':', 1)[1]) if line else {'ok': False, 'error': res.stderr[-400:]}
        if not data.get('ok'):
            print('ОШИБКА', p['name'], data, flush=True)
            sys.exit(1)
        spent += data.get('actualCostUsd') or data.get('estimatedCostUsd') or 0
        print(p['name'], 'ok', data.get('durationSec') or data.get('duration'), f'итого ${spent:.2f}', flush=True)
    print('RESULT_DONE', f'{spent:.2f}', flush=True)


def lufs(path):
    res = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(path), '-af', 'loudnorm=print_format=json', '-f', 'null', '-'],
                         capture_output=True, text=True)
    return float(re.search(r'"input_i"\s*:\s*"(-?[\d.]+)"', res.stderr).group(1))


def join():
    index = json.loads((HERE / 'parts.json').read_text(encoding='utf8'))
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        listing, t = [], 0.0
        for i, p in enumerate(index):
            src = PARTS / f"{p['name']}.mp3"
            gain = TARGET - lufs(src)
            wav = tmp / f"{p['name']}.wav"
            subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(src), '-af', f'volume={gain:.2f}dB,alimiter=limit=0.89:level=false',
                            '-ar', '44100', '-ac', '1', str(wav)], check=True)
            dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(wav)]))
            p['start'], p['duration'], p['gain_db'] = round(t, 3), round(dur, 3), round(gain, 2)
            listing.append(wav)
            t += dur
            if i + 1 < len(index):
                gap = GAP_STANZA if p['stanza_end'] else GAP
                sil = tmp / f'sil{i}.wav'
                subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', str(gap), str(sil)], check=True)
                listing.append(sil)
                t += gap
        lst = tmp / 'list.txt'
        lst.write_text(''.join(f"file '{x}'\n" for x in listing))
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', str(lst), '-c:a', 'libmp3lame', '-b:a', '160k',
                        str(POEM / 'voice.mp3')], check=True)
    (HERE / 'parts.json').write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding='utf8')
    print('voice.mp3', round(t, 1), 'с')


if __name__ == '__main__':
    {'split': split, 'generate': generate, 'join': join}[sys.argv[1]]()
