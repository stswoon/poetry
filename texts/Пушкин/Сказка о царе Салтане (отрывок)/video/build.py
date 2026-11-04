"""Build seekable comic scenes from the verified poem and real voice timings."""
from pathlib import Path
import json
import re
import shutil
import xml.etree.ElementTree as ET
from html import escape
from artwork import scene_svg

HERE=Path(__file__).resolve().parent
POEM=HERE.parent
SVG='http://www.w3.org/2000/svg'
ET.register_namespace('',SVG)
INTRO=4.0
OUTRO=6.0
OVERLAP=0.34

CSS='''
@font-face {font-family:TaleBody;src:url('assets/fonts/seguisb.ttf') format('truetype');font-weight:600;font-display:block;}
@font-face {font-family:TaleTitle;src:url('assets/fonts/georgiab.ttf') format('truetype');font-weight:700;font-display:block;}
* {box-sizing:border-box;}
#root {position:absolute;inset:0;overflow:hidden;color:#12263A;}
.scene-visual {position:absolute;inset:0;background:#FFF5DD;overflow:hidden;}
.art-stage {position:absolute;inset:0 0 auto;height:760px;transform-origin:center center;}
.art-stage>svg {display:block;width:1920px;height:760px;}
.paper-base {position:absolute;left:0;top:755px;width:1920px;height:325px;background:#FFF5DD;}
.paper-edge {position:absolute;left:192px;top:760px;width:1536px;height:6px;background:#12263A;}
.corner-mark {position:absolute;width:75px;height:8px;background:#EF6548;top:741px;left:192px;}
.title-sheet {position:absolute;left:335px;top:162px;width:1250px;padding:38px 45px 32px;background:#FFF5DD;border:7px solid #12263A;box-shadow:12px 14px 0 #12263A;text-align:center;transform-origin:50% 50%;}
.title-top {font-family:TaleTitle;font-size:93px;line-height:1.15;margin:0;letter-spacing:-2px;}
.title-main {font-family:TaleTitle;font-size:150px;line-height:1.05;margin:0;color:#B83029;letter-spacing:-3px;}
.title-author {font-family:TaleBody;font-size:40px;line-height:1.3;margin:24px 0 0;}
.title-note {font-family:TaleBody;font-size:28px;line-height:1.3;margin:16px 0 0;color:#36545D;}
.caption-line {position:absolute;left:192px;width:1536px;max-width:1536px;height:78px;text-align:center;color:#12263A;font-family:TaleBody;font-size:58px;line-height:78px;font-weight:600;white-space:nowrap;}
.caption-line .lettering {display:block;}
.caption-line.clip {inset:auto;left:192px;width:1536px;}
.journey-arrow {position:absolute;left:1160px;top:355px;width:330px;height:7px;background:#B83029;transform-origin:0 50%;}
.journey-arrow:after {content:'';position:absolute;right:-1px;top:-13px;border-left:27px solid #B83029;border-top:17px solid transparent;border-bottom:17px solid transparent;}
'''

ANIM_CLASSES={'ship','sail','waves-back','waves-front','cloud','bird','hero','city','arm','splash','cannon','flash'}

def wrapped_art(number):
    tree=ET.fromstring(scene_svg(number))
    for parent in list(tree.iter()):
        for child in list(parent):
            classes=child.attrib.get('class','').split()
            matches=[c[4:] for c in classes if c.startswith('art-') and c[4:] in ANIM_CLASSES]
            if matches:
                wrapper=ET.Element(f'{{{SVG}}}g',{'class':' '.join('anim-'+c for c in matches),'data-layout-ignore':''})
                if child.get('id'):
                    wrapper.set('id',child.get('id')+'-motion')
                parent.insert(list(parent).index(child),wrapper)
                parent.remove(child)
                wrapper.append(child)
    if number==6:
        route=next((node for node in tree.iter() if node.tag.endswith('path') and node.get('stroke-dasharray')),None)
        if route is not None:
            defs=next(node for node in tree if node.tag.endswith('defs'))
            mask=ET.SubElement(defs,f'{{{SVG}}}mask',{'id':'s6-route-mask','maskUnits':'userSpaceOnUse','x':'0','y':'0','width':'1920','height':'760'})
            ET.SubElement(mask,f'{{{SVG}}}path',{'d':route.get('d'),'fill':'none','stroke':'white','stroke-width':'24','stroke-linecap':'round','class':'route-stroke','stroke-dasharray':'2000','stroke-dashoffset':'2000'})
            route.set('mask','url(#s6-route-mask)')
    return ET.tostring(tree,encoding='unicode')

def title_markup():
    return '''<div class="title-sheet" data-layout-allow-overlap data-hold>
      <p class="title-top">Сказка о царе</p>
      <h1 class="title-main">Салтане</h1>
      <p class="title-author" data-var-text="author">Александр Сергеевич Пушкин</p>
      <p class="title-note">Отрывок · 1831</p>
    </div>'''

def main():
    data=json.loads((POEM/'timings.json').read_text(encoding='utf-8-sig'))
    lines=data['lines']
    text=(POEM/'poem.md').read_text(encoding='utf-8-sig')
    match=re.search(r'```text\s*\n(.*?)\n```',text,re.S)
    expected=match.group(1).splitlines() if match else []
    if len(lines)!=26 or [x['text'] for x in lines]!=expected:
        raise ValueError('Verified poem and timing text differ')
    voice=float(data['voiceDuration'])
    for i,line in enumerate(lines):
        if not (0<=line['start']<=line['end']<=voice+0.02):
            raise ValueError(f'Invalid line timing {i+1}')
        if i and line['start']<lines[i-1]['start']:
            raise ValueError('Timing order is not monotonic')
    duration=INTRO+voice+OUTRO
    (HERE/'compositions').mkdir(exist_ok=True)
    (HERE/'assets').mkdir(exist_ok=True)
    (HERE/'renders').mkdir(exist_ok=True)
    (HERE/'assets/fonts').mkdir(exist_ok=True)
    for font_name in ['seguisb.ttf','georgiab.ttf']:
        target=HERE/'assets/fonts'/font_name
        if not target.is_file():
            source=Path('C:/Windows/Fonts')/font_name
            if not source.is_file():
                raise FileNotFoundError(f'Local licensed font required: {font_name}')
            shutil.copyfile(source,target)
    shutil.copyfile(POEM/'voice.mp3',HERE/'assets/voice.mp3')
    if (POEM/'music/music.wav').is_file():
        shutil.copyfile(POEM/'music/music.wav',HERE/'assets/music.wav')
    starts=[0,INTRO]+[INTRO+float(lines[i]['start']) for i in [4,8,12,16,18,22]]+[INTRO+voice]
    hosts=[]
    all_sources=[]
    for number,start in enumerate(starts):
        end=starts[number+1] if number+1<len(starts) else duration
        slot=end-start+(OVERLAP if number+1<len(starts) else 0)
        scene_id=f'scene{number}'
        events={}
        if number==2: events['wonder']=INTRO+lines[7]['start']-start
        if number==3: events['cannon']=INTRO+lines[10]['start']-start
        artwork=wrapped_art(number)
        extra=title_markup() if number in [0,8] else ''
        if number==7:
            extra+='<div class="journey-arrow" data-layout-ignore></div>'
        source=f'''<template>
<style>{CSS}</style>
<div id="root" data-composition-id="{scene_id}" data-width="1920" data-height="1080">
  <div class="scene-visual" data-layout-allow-overlap>
    <div class="art-stage" data-layout-ignore>{artwork}</div>
    <div class="paper-base" data-layout-ignore></div>
    <div class="paper-edge" data-layout-ignore></div>
    <div class="corner-mark" data-layout-ignore></div>{extra}
  </div>
</div>
<script>
const sceneTimeline=window.createComicTimeline({json.dumps(scene_id)},{slot:.6f},{number},{json.dumps(events)});
window.__timelines[{json.dumps(scene_id)}]=sceneTimeline;
</script>
</template>'''
        (HERE/f'compositions/{scene_id}.html').write_text(source,encoding='utf-8')
        all_sources.append(source)
        hosts.append(f'<div id="{scene_id}" class="clip" data-composition-id="{scene_id}" data-composition-src="compositions/{scene_id}.html" data-start="{start:.6f}" data-duration="{slot:.6f}" data-track-index="{number+1}" data-track-kind="graphics" data-width="1920" data-height="1080" style="z-index:{number+1}"></div>')

    cap_duration=voice+1.0
    caps=[]
    cap_anim=[]
    for i,line in enumerate(lines):
        pair=i//2
        next_pair=(pair+1)*2
        end=lines[next_pair]['start'] if next_pair<len(lines) else cap_duration
        start=float(line['start'])
        top=789 if i%2==0 else 870
        caps.append(f'<div id="line{i+1}" class="clip caption-line" data-start="{start:.6f}" data-duration="{end-start:.6f}" data-track-index="1" style="top:{top}px"><span class="lettering">{escape(line["text"])}</span></div>')
        cap_anim.append(f"capTimeline.fromTo('#line{i+1} .lettering',{{opacity:0.35}},{{opacity:1,duration:0.09,ease:'none'}},{start:.6f});")
    cap_source=f'''<template><style>{CSS}</style>
<div id="root" data-composition-id="captions" data-width="1920" data-height="1080">{''.join(caps)}</div>
<script>
const capTimeline=gsap.timeline({{paused:true}});
{''.join(cap_anim)}
capTimeline.to({{p:0}},{{p:1,duration:{cap_duration:.6f},ease:'none'}},0);
window.__timelines.captions=capTimeline;
</script></template>'''
    (HERE/'compositions/captions.html').write_text(cap_source,encoding='utf-8')
    all_sources.append(cap_source)
    hosts.append(f'<div id="captions" class="clip" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="{INTRO}" data-duration="{cap_duration:.6f}" data-track-index="12" data-track-kind="captions" data-width="1920" data-height="1080" style="z-index:30"></div>')
    template=(HERE/'template.tpl').read_text(encoding='utf-8')
    mapping={'DURATION':f'{duration:.6f}','INTRO':str(INTRO),'VOICE_DURATION':f'{voice:.6f}','HOSTS':'\n'.join(hosts)}
    for key,value in mapping.items(): template=template.replace('@@'+key+'@@',value)
    (HERE/'index.html').write_text(template,encoding='utf-8')
    # A five-second local render probe covers both the ship and the character rig.
    probe_hosts='''<div id="scene1" class="clip" data-composition-id="scene1" data-composition-src="compositions/scene1.html" data-start="0" data-duration="2.84" data-track-index="1" data-track-kind="graphics" data-width="1920" data-height="1080" style="z-index:1"></div>
<div id="scene2" class="clip" data-composition-id="scene2" data-composition-src="compositions/scene2.html" data-start="2.5" data-duration="2.5" data-track-index="2" data-track-kind="graphics" data-width="1920" data-height="1080" style="z-index:2"></div>
<div id="captions" class="clip" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="5" data-track-index="12" data-track-kind="captions" data-width="1920" data-height="1080" style="z-index:30"></div>'''
    probe=(HERE/'template.tpl').read_text(encoding='utf-8')
    for key,value in {'DURATION':'5','INTRO':'0','VOICE_DURATION':'5','HOSTS':probe_hosts}.items():
        probe=probe.replace('@@'+key+'@@',value)
    (HERE/'renders/probe.html').write_text(probe,encoding='utf-8')
    # Each repeated #root belongs to its own sub-composition; all other ids are global.
    ids=[]
    for source in all_sources:
        ids.extend(x for x in re.findall(r'\bid="([^"]+)"',source) if x!='root')
    duplicates=sorted(x for x in set(ids) if ids.count(x)>1)
    if duplicates: raise ValueError(f'Duplicate ids: {duplicates}')
    manifest={'duration':duration,'voiceDuration':voice,'intro':INTRO,'outro':OUTRO,'lineCount':len(lines),'scenes':[{'scene':i,'start':s,'end':starts[i+1] if i+1<len(starts) else duration} for i,s in enumerate(starts)],'screenTextMatchesPoem':True}
    (HERE/'build-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(manifest,ensure_ascii=False))

if __name__=='__main__': main()
