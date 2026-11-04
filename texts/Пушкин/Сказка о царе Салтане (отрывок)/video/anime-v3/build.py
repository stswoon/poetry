"""Build the third version from original anime art and verified narration timings."""
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

def rig(name, key, x, y, w, extra=''):
    sw, sh = (1536,1024) if name=='ship' else (1024,1536)
    return f'<div class="actor {name} {extra}" style="left:{x}px;top:{y}px;width:{w}px;height:{w*sh/sw}px" data-layout-ignore><div class="actor-float"><img src="assets/art/{name}.png" width="100%" height="100%" alt="" data-layout-ignore></div></div>'

def sea(name='ocean'):
    return img(name,'backdrop')

def spray():
    return '<div class="spray" data-layout-ignore>'+''.join(f'<i class="drop" style="left:{80+(i*163)%1720}px;top:{540+(i*47)%190}px;width:{4+i%5}px;height:{9+i%9}px"></i>' for i in range(28))+'</div>'

def speed():
    return '<svg class="speed" width="1920" height="810" viewBox="0 0 1920 810" data-layout-ignore>'+''.join(f'<path d="M{(i*197)%1800} {80+i*43}l{160+i*31} -18" stroke="#fff8dd" stroke-width="{2+i%3}" opacity=".45"/>' for i in range(15))+'</svg>'

def cannon():
    return '''<svg class="cannon" width="600" height="450" viewBox="0 0 600 450" data-layout-ignore><g class="gun"><image href="assets/art/gun.png" x="0" y="70" width="600" height="320"/></g><g class="muzzle"><path d="M580 90l38-58-7 42 75-21-43 43 55 12-75 12 11 32-57-30Z" fill="#ffe8a1"/><path d="M587 96l56-15-22 26-36 15Z" fill="#fff9df"/></g></svg><div class="smoke" data-layout-ignore><i></i><i></i><i></i><i></i><i></i></div>'''

def chart():
    return '<div class="map" data-layout-ignore><img src="assets/art/map-v3.png" width="100%" height="100%" alt="" data-layout-ignore><svg class="map-overlay" viewBox="0 0 1000 560" width="100%" height="100%"><path class="map-route" d="M190 350C280 430 430 350 515 290S690 345 810 190" fill="none" stroke="#a23733" stroke-width="5" stroke-linecap="round" stroke-dasharray="1800" stroke-dashoffset="1800"/></svg></div>'

def cargo():
    return img('chest','cargo')

def title():
    return '<div class="title-shade" data-layout-ignore></div><div class="title" data-hold data-layout-allow-overlap><p class="eyebrow">Александр Сергеевич Пушкин</p><h1>Сказка<br>о царе <span>Салтане</span></h1><p class="title-sub">«Ветер на море гуляет…»</p><p class="title-year">Отрывок · 1831</p></div>'

def content(n):
    if n in (0,14):
        return sea('ocean' if n==0 else 'city')+rig('ship',f's{n}-ship',1060,120 if n==0 else 300,850)+spray()+title()
    if n==1:
        return sea()+rig('ship','s1-ship',300,-20,1130)+spray()
    if n==2:
        return sea()+rig('ship','s2-ship',100,-170,1480)+spray()
    if n==3:
        return img('deck','backdrop')+rig('elder','s3-elder',900,55,720)+rig('merchant','s3-merchant',80,45,790)
    if n==4:
        return sea('city')+rig('ship','s4-ship',170,170,780)+spray()+'<div class="harbor-gun" data-layout-ignore><div class="pier" data-layout-ignore></div>'+cannon()+'</div>'
    if n==7:
        return img('palace','backdrop')+rig('elder','s7-elder',110,70,440)+rig('merchant','s7-merchant',390,60,510)+rig('prince','s7-prince',1080,10,550)
    if n==8:
        return img('palace','backdrop')+rig('elder','s8-elder',-70,50,580)+rig('prince','s8-prince',1220,40,610)
    if n==9:
        return img('palace','backdrop')+rig('prince','s9-prince',760,45,860)
    if n==10:
        return img('palace','backdrop')+rig('elder','s10-elder',20,40,710)+chart()
    if n==11:
        return img('palace','backdrop')+rig('merchant','s11-merchant',20,45,650)+cargo()
    if n==12:
        return sea('city')+rig('ship','s12-ship',200,150,1040)+spray()+title()
    raise ValueError(n)

def main():
    data=json.loads((POEM/'timings-v3.json').read_text(encoding='utf-8-sig'))
    lines=data['lines']; voice=float(data['voiceDuration']); duration=INTRO+voice+OUTRO
    expected=re.search(r'```text\s*\n(.*?)\n```',(POEM/'poem.md').read_text(encoding='utf-8-sig'),re.S).group(1).splitlines()
    assert [x['text'] for x in lines]==expected and len(lines)==26
    starts=[0,INTRO]+[INTRO+lines[i]['start'] for i in range(2,26,2)]+[INTRO+voice]
    hosts=[]; manifests=[]
    active=[0,1,2,3,4,7,8,9,10,11,12]
    for slot,n in enumerate(active):
        start=starts[n]
        end=starts[active[slot+1]] if slot+1<len(active) else duration
        length=end-start
        key=f'scene{n}'
        events={'cannon':starts[6]-start} if n==4 else ({'title':INTRO+voice-start} if n==12 else {})
        html=f'''<template><style>@import url('assets/style.css');</style>
<div id="root" data-composition-id="{key}" data-width="1920" data-height="1080">
<div class="visual {('title-scene' if n==0 else ('ending-scene' if n==12 else ''))}" data-layout-allow-overlap><div class="camera" data-layout-ignore>{content(n)}</div></div>
</div><script>window.__timelines['{key}']=window.animeScene('{key}',{length:.6f},{n},{json.dumps(events)});</script></template>'''
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
    base='''<!doctype html><html lang="ru" data-resolution="landscape"><head><meta charset="utf-8"><meta name="viewport" content="width=1920,height=1080"><title>Сказка о царе Салтане — приключенческое аниме</title><script src="assets/gsap.min.js"></script><script src="assets/motion.js"></script><script>window.__timelines={};</script><script src="assets/anime-motion.js"></script><link rel="stylesheet" href="assets/style.css"></head><body><div id="root" data-composition-id="main" data-start="0" data-duration="@@DURATION@@" data-width="1920" data-height="1080">@@HOSTS@@<audio id="voice" class="clip" src="assets/voice.wav" data-start="@@INTRO@@" data-duration="@@VOICE@@" data-track-index="20" data-volume="1"></audio><audio id="music" class="clip" src="assets/music.wav" data-start="0" data-duration="@@DURATION@@" data-track-index="21" data-volume="1"></audio></div><script>const main=gsap.timeline({paused:true});main.to({p:0},{p:1,duration:@@DURATION@@,ease:'none'},0);window.__timelines.main=main;</script></body></html>'''
    for k,v in {'DURATION':str(duration),'HOSTS':'\n'.join(hosts),'INTRO':str(INTRO),'VOICE':str(voice)}.items():
        base=base.replace('@@'+k+'@@',v)
    (HERE/'index.html').write_text(base,encoding='utf-8')
    shutil.copyfile(POEM/'voice-v3.wav',HERE/'assets/voice.wav')
    music=POEM/'music/anime-v2/music.wav'
    if music.exists(): shutil.copyfile(music,HERE/'assets/music.wav')
    manifest={'version':3,'style':'Приключенческое аниме','duration':duration,'intro':INTRO,'outro':OUTRO,'voiceDuration':voice,'lineCount':len(lines),'screenTextMatchesPoem':True,'scenes':manifests}
    (HERE/'build-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    (HERE/'meta.json').write_text(json.dumps({'id':'saltan-anime-v3','name':'Салтан — приключенческое аниме v3'},ensure_ascii=False),encoding='utf-8')
    print(json.dumps(manifest,ensure_ascii=False))

if __name__=='__main__': main()
