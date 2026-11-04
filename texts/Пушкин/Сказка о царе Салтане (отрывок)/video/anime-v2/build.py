"""Build the second version from original anime art and verified narration timings."""
from pathlib import Path
from html import escape
import json
import re
import shutil

HERE = Path(__file__).resolve().parent
POEM = HERE.parent.parent
INTRO, OUTRO = 2.5, 4.0

def img(name, cls, style=''):
    return f'<img class="{cls}" src="assets/art/{name}.png" style="{style}" alt="" data-layout-ignore>'

PARTS = {
 'merchant': [('head','M220 10H515V280H220Z','360 270'),('arm','M510 210L690 172L1015 70L1024 230L700 370L520 380Z','540 300')],
 'prince': [('head','M350 5H640V245H350Z','510 240'),('arm','M0 220L290 215L430 330L390 510L230 455L0 360Z','405 400')],
 'elder': [('head','M300 0H650V330H300Z','510 310'),('arm','M560 40L860 40L935 270L865 450L640 350Z','780 400')],
 'ship': [('sail','M360 150L1080 270L1180 635L1070 710L740 600L400 680L450 400Z','750 260')]
}

def rig(name, key, x, y, w, extra=''):
    sw, sh = (1536,1024) if name=='ship' else (1024,1536)
    parts=PARTS[name]
    defs=f'<clipPath id="{key}-body"><path clip-rule="evenodd" d="M0 0H{sw}V{sh}H0Z '+ ' '.join(p[1] for p in parts)+'"/></clipPath>'
    base=f'<g clip-path="url(#{key}-body)"><image href="assets/art/{name}.png" width="{sw}" height="{sh}"/></g>'
    layers=[]
    for part,path,origin in parts:
        defs+=f'<clipPath id="{key}-{part}"><path d="{path}"/></clipPath>'
        layers.append(f'<g class="rig-{part}" data-origin="{origin}"><g clip-path="url(#{key}-{part})"><image href="assets/art/{name}.png" width="{sw}" height="{sh}"/></g></g>')
    return f'<div class="actor {name} {extra}" style="left:{x}px;top:{y}px;width:{w}px;height:{w*sh/sw}px" data-layout-ignore><div class="actor-float"><svg viewBox="0 0 {sw} {sh}" width="100%" height="100%"><defs>{defs}</defs>{base}{"".join(layers)}</svg></div></div>'

def sea(name='ocean'):
    return img(name,'backdrop')+f'<div class="sea-strip" data-layout-ignore><div class="water-copy" style="background-image:url(assets/art/{name}.png)"></div></div>'

def spray():
    return '<div class="spray" data-layout-ignore>'+''.join(f'<i class="drop" style="left:{80+(i*163)%1720}px;top:{540+(i*47)%190}px;width:{4+i%5}px;height:{9+i%9}px"></i>' for i in range(28))+'</div>'

def speed():
    return '<svg class="speed" width="1920" height="810" viewBox="0 0 1920 810" data-layout-ignore>'+''.join(f'<path d="M{(i*197)%1800} {80+i*43}l{160+i*31} -18" stroke="#fff8dd" stroke-width="{2+i%3}" opacity=".45"/>' for i in range(15))+'</svg>'

def cannon():
    return '''<svg class="cannon" width="600" height="450" viewBox="0 0 600 450" data-layout-ignore><g class="gun"><image href="assets/art/gun.png" x="0" y="70" width="600" height="320"/></g><g class="muzzle"><path d="M580 90l38-58-7 42 75-21-43 43 55 12-75 12 11 32-57-30Z" fill="#ffe8a1"/><path d="M587 96l56-15-22 26-36 15Z" fill="#fff9df"/></g></svg><div class="smoke" data-layout-ignore><i></i><i></i><i></i><i></i><i></i></div>'''

def chart():
    return '''<div class="map" data-layout-ignore><svg viewBox="0 0 1000 560" width="100%" height="100%"><rect x="10" y="10" width="980" height="540" rx="12" fill="#eed9a6" stroke="#8f683d" stroke-width="8"/><path d="M80 150Q160 80 260 140T420 170L360 300L230 340L140 270Z M570 70Q720 60 770 155L690 260L590 210Z M730 350L860 320L910 440L790 480Z" fill="#9eb193" stroke="#597c71" stroke-width="5"/><path class="map-route" d="M170 230C300 410 570 450 610 200S880 160 865 390" fill="none" stroke="#a23733" stroke-width="9" stroke-linecap="round" stroke-dasharray="1800" stroke-dashoffset="1800"/><circle cx="170" cy="230" r="14" fill="#a23733"/><g transform="translate(475 170)" stroke="#746342" stroke-width="3"><path d="M0-65L15-12L65 0L15 12L0 65L-15 12L-65 0L-15-12Z" fill="#fdf3d1"/><path d="M0-65L0 65M-65 0H65"/></g></svg></div>'''

def cargo():
    return '''<svg class="cargo" width="760" height="540" viewBox="0 0 1536 1024" data-layout-ignore><defs><clipPath id="cargo-body"><path clip-rule="evenodd" d="M0 0H1536V1024H0Z M190 0H1140L1070 338L220 430Z"/></clipPath><clipPath id="cargo-lid"><path d="M190 0H1140L1070 338L220 430Z"/></clipPath></defs><g clip-path="url(#cargo-body)"><image href="assets/art/chest.png" width="1536" height="1024"/></g><g class="lid"><g clip-path="url(#cargo-lid)"><image href="assets/art/chest.png" width="1536" height="1024"/></g></g></svg>'''

def title():
    return '<div class="title-shade" data-layout-ignore></div><div class="title" data-hold data-layout-allow-overlap><p class="eyebrow">Александр Сергеевич Пушкин</p><h1>Сказка<br>о царе <span>Салтане</span></h1><p class="title-sub">«Ветер на море гуляет…»</p><p class="title-year">Отрывок · 1831</p></div>'

def content(n):
    if n in (0,14):
        return sea('ocean' if n==0 else 'city')+rig('ship',f's{n}-ship',1060,120 if n==0 else 300,850)+spray()+title()
    if n==1:
        return sea()+rig('ship','s1-ship',300,-20,1130)+spray()+speed()
    if n==2:
        return sea()+rig('ship','s2-ship',100,-170,1480)+spray()+speed()
    if n==3:
        return img('deck','backdrop')+rig('elder','s3-elder',900,55,720)+rig('merchant','s3-merchant',80,45,790)
    if n==4:
        return sea('city')+rig('merchant','s4-merchant',-340,30,780,'leave')+rig('ship','s4-ship',170,170,780)+spray()
    if n==5:
        return sea('city')+rig('ship','s5-ship',50,250,690)+spray()
    if n==6:
        return sea('city')+rig('ship','s6-ship',1150,300,570)+'<div class="pier" data-layout-ignore></div>'+cannon()+spray()
    if n==7:
        return img('palace','backdrop')+rig('elder','s7-elder',110,70,440)+rig('merchant','s7-merchant',390,60,510)+rig('prince','s7-prince',1080,10,550)
    if n==8:
        return img('palace','backdrop')+rig('elder','s8-elder',-70,50,580)+rig('prince','s8-prince',1220,40,610)
    if n==9:
        return img('palace','backdrop')+rig('merchant','s9-merchant',-330,120,780)+rig('prince','s9-prince',800,35,910)
    if n==10:
        return img('palace','backdrop')+rig('elder','s10-elder',20,40,710)+chart()
    if n==11:
        return img('palace','backdrop')+rig('merchant','s11-merchant',20,45,650)+cargo()
    if n==12:
        return sea('city')+rig('ship','s12-ship',200,90,1040)+spray()
    if n==13:
        return sea()+rig('ship','s13-ship',200,130,950)+spray()
    raise ValueError(n)

def main():
    data=json.loads((POEM/'timings.json').read_text(encoding='utf-8-sig'))
    lines=data['lines']; voice=float(data['voiceDuration']); duration=INTRO+voice+OUTRO
    expected=re.search(r'```text\s*\n(.*?)\n```',(POEM/'poem.md').read_text(encoding='utf-8-sig'),re.S).group(1).splitlines()
    assert [x['text'] for x in lines]==expected and len(lines)==26
    starts=[0,INTRO]+[INTRO+lines[i]['start'] for i in range(2,26,2)]+[INTRO+voice]
    hosts=[]; manifests=[]
    for n,start in enumerate(starts):
        end=starts[n+1] if n+1<len(starts) else duration
        length=end-start
        key=f'scene{n}'
        events={}
        html=f'''<template><style>@import url('assets/style.css');</style>
<div id="root" data-composition-id="{key}" data-width="1920" data-height="1080">
<div class="visual {('title-scene' if n in (0,14) else '')}" data-layout-allow-overlap><div class="camera" data-layout-ignore>{content(n)}</div></div>
</div><script>window.__timelines['{key}']=window.animeScene('{key}',{length:.6f},{n});</script></template>'''
        (HERE/'compositions'/f'{key}.html').write_text(html,encoding='utf-8')
        hosts.append(f'<div id="{key}" class="clip" data-composition-id="{key}" data-composition-src="compositions/{key}.html" data-start="{start:.6f}" data-duration="{length:.6f}" data-track-index="{n+1}" data-track-kind="graphics" data-width="1920" data-height="1080"></div>')
        manifests.append({'scene':n,'start':start,'end':end})
    caps=[]
    for i,line in enumerate(lines):
        pair=i//2; end=lines[2*pair+2]['start'] if 2*pair+2<len(lines) else voice+0.7
        caps.append(f'<div id="line{i+1}" class="clip caption" data-start="{line["start"]:.6f}" data-duration="{end-line["start"]:.6f}" data-track-index="1" style="top:{823 if i%2==0 else 905}px"><span>{escape(line["text"])}</span></div>')
    cap=f'''<template><style>@import url('assets/style.css');</style><div id="root" data-composition-id="captions" data-width="1920" data-height="1080"><div class="caption-band" data-layout-ignore></div>{''.join(caps)}</div><script>const c=gsap.timeline({{paused:true}});c.to({{p:0}},{{p:1,duration:{voice+0.7},ease:'none'}},0);window.__timelines.captions=c;</script></template>'''
    (HERE/'compositions/captions.html').write_text(cap,encoding='utf-8')
    hosts.append(f'<div id="captions" class="clip" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="{INTRO}" data-duration="{voice+0.7:.6f}" data-track-index="18" data-track-kind="captions" data-width="1920" data-height="1080" style="z-index:40"></div>')
    base='''<!doctype html><html lang="ru" data-resolution="landscape"><head><meta charset="utf-8"><meta name="viewport" content="width=1920,height=1080"><title>Сказка о царе Салтане — приключенческое аниме</title><script src="assets/gsap.min.js"></script><script src="assets/motion.js"></script><script>window.__timelines={};</script><script src="assets/anime-motion.js"></script><link rel="stylesheet" href="assets/style.css"></head><body><div id="root" data-composition-id="main" data-start="0" data-duration="@@DURATION@@" data-width="1920" data-height="1080">@@HOSTS@@<audio id="voice" class="clip" src="assets/voice.mp3" data-start="@@INTRO@@" data-duration="@@VOICE@@" data-track-index="20" data-volume="1"></audio><audio id="music" class="clip" src="assets/music.wav" data-start="0" data-duration="@@DURATION@@" data-track-index="21" data-volume="1"></audio></div><script>const main=gsap.timeline({paused:true});main.to({p:0},{p:1,duration:@@DURATION@@,ease:'none'},0);window.__timelines.main=main;</script></body></html>'''
    for k,v in {'DURATION':str(duration),'HOSTS':'\n'.join(hosts),'INTRO':str(INTRO),'VOICE':str(voice)}.items():
        base=base.replace('@@'+k+'@@',v)
    (HERE/'index.html').write_text(base,encoding='utf-8')
    shutil.copyfile(POEM/'voice.mp3',HERE/'assets/voice.mp3')
    music=POEM/'music/anime-v2/music.wav'
    if music.exists(): shutil.copyfile(music,HERE/'assets/music.wav')
    manifest={'version':2,'style':'Приключенческое аниме','duration':duration,'intro':INTRO,'outro':OUTRO,'voiceDuration':voice,'lineCount':len(lines),'screenTextMatchesPoem':True,'scenes':manifests}
    (HERE/'build-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    (HERE/'meta.json').write_text(json.dumps({'id':'saltan-anime-v2','name':'Салтан — приключенческое аниме v2'},ensure_ascii=False),encoding='utf-8')
    print(json.dumps(manifest,ensure_ascii=False))

if __name__=='__main__': main()
