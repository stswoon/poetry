from pathlib import Path
import re
p=Path(__file__).parent/'build.py'
s=p.read_text(encoding='utf-8')
a=s.index('PARTS ='); b=s.index('def spray():')
s=s[:a]+'''def rig(name, key, x, y, w, extra=''):
    sw, sh = (1536,1024) if name=='ship' else (1024,1536)
    return f'<div class="actor {name} {extra}" style="left:{x}px;top:{y}px;width:{w}px;height:{w*sh/sw}px" data-layout-ignore><div class="actor-float"><img src="assets/art/{name}.png" width="100%" height="100%" alt="" data-layout-ignore></div></div>'

def sea(name='ocean'):
    return img(name,'backdrop')

'''+s[b:]
a=s.index('def chart():'); b=s.index('def title():')
s=s[:a]+'''def chart():
    return '<div class="map" data-layout-ignore><img src="assets/art/map-v3.png" width="100%" height="100%" alt="" data-layout-ignore><svg class="map-overlay" viewBox="0 0 1000 560" width="100%" height="100%"><path class="map-route" d="M190 350C280 430 430 350 515 290S690 345 810 190" fill="none" stroke="#a23733" stroke-width="5" stroke-linecap="round" stroke-dasharray="1800" stroke-dashoffset="1800"/></svg></div>'

def cargo():
    return img('chest','cargo')

'''+s[b:]
a=s.index('    if n==4:');b=s.index('    if n==7:')
s=s[:a]+'''    if n==4:
        return sea('city')+rig('ship','s4-ship',170,170,780)+spray()+'<div class="harbor-gun" data-layout-ignore><div class="pier" data-layout-ignore></div>'+cannon()+'</div>'
'''+s[b:]
s=s.replace("return img('palace','backdrop')+rig('merchant','s9-merchant',-330,120,780)+rig('prince','s9-prince',800,35,910)","return img('palace','backdrop')+rig('prince','s9-prince',760,45,860)")
a=s.index('    if n==12:');b=s.index('    raise ValueError(n)')
s=s[:a]+'''    if n==12:
        return sea('city')+rig('ship','s12-ship',200,150,1040)+spray()+title()
'''+s[b:]
s=s.replace("    for n,start in enumerate(starts):\n        end=starts[n+1] if n+1<len(starts) else duration", "    active=[0,1,2,3,4,7,8,9,10,11,12]\n    for slot,n in enumerate(active):\n        start=starts[n]\n        end=starts[active[slot+1]] if slot+1<len(active) else duration")
s=s.replace("        events={}","        events={'cannon':starts[6]-start} if n==4 else ({'title':INTRO+voice-start} if n==12 else {})")
s=s.replace("{('title-scene' if n in (0,14) else '')}","{('title-scene' if n==0 else ('ending-scene' if n==12 else ''))}")
s=s.replace("window.animeScene('{key}',{length:.6f},{n})", "window.animeScene('{key}',{length:.6f},{n},{json.dumps(events)})")
s=s.replace('assets/voice.mp3','assets/voice.wav').replace("shutil.copyfile(POEM/'voice.mp3',HERE/'assets/voice.wav')", "shutil.copyfile(POEM/'voice-v3.wav',HERE/'assets/voice.wav')")
s=s.replace("'version':2", "'version':3").replace('saltan-anime-v2','saltan-anime-v3').replace('аниме v2','аниме v3').replace('second version','third version')
p.write_text(s,encoding='utf-8')
