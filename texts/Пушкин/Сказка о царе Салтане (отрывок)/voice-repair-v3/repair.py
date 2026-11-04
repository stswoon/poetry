from pathlib import Path
import subprocess,json
import numpy as np
R=Path(__file__).resolve().parent; P=R.parent; SR=48000
def decode(path,af=None):
    a=['ffmpeg','-v','error','-i',str(path)]
    if af:a+=['-af',af]
    return np.frombuffer(subprocess.check_output(a+['-f','f32le','-ac','1','-ar',str(SR),'-']),dtype='<f4').copy()
old=decode(P/'voice.mp3'); new=decode(R/'line22.mp3','atrim=start=0:end=1.66,asetpts=PTS-STARTPTS,atempo=1.10')
start=round(39.344*SR); end=start+len(new)
original=old[start:round(40.616*SR)]
ratio=np.sqrt(np.mean(original**2))/np.sqrt(np.mean(new**2)); new*=ratio
fade=240; new[:fade]*=np.linspace(0,1,fade);new[-fade:]*=np.linspace(1,0,fade)
old[start:round(40.95*SR)]=0;old[start:end]=new
def save(path,arr):
    subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(SR),'-ac','1','-i','-','-c:a','pcm_s16le',str(path)],input=arr.astype('<f4').tobytes(),check=True)
old=old[:round(48.64*SR)];save(P/'voice-v3.wav',old);save(R/'preview-correction.wav',old[round(37.8*SR):round(41*SR)])
t=json.loads((P/'timings.json').read_text(encoding='utf-8-sig'));t['introDuration']=2.5;t['outroDuration']=4;t['lines'][21]['end']=end/SR
(P/'timings-v3.json').write_text(json.dumps(t,ensure_ascii=False,indent=2),encoding='utf-8')
(P/'elevenlabs-v3.txt').write_text((P/'elevenlabs.txt').read_text(encoding='utf-8-sig').replace('лисами','лиса́ми'),encoding='utf-8')
(R/'report.json').write_text(json.dumps({'replacedLine':22,'start':39.344,'end':end/SR,'trim':[0,1.66],'atempo':1.10,'gain':float(ratio),'costUsd':0.00136,'duration':len(old)/SR,'stressAuditedByListening':False},indent=2),encoding='utf-8')
print('Voice patched:',len(old)/SR,'line end:',end/SR)
