"""Two-pass loudness mastering; copy video without another picture encode."""
from pathlib import Path
import argparse
import json
import re
import subprocess


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input',type=Path,default=Path('renders/final-raw.mp4'))
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    probe=subprocess.run(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=duration','-of','json',str(args.input)],capture_output=True,text=True,encoding='utf-8',check=True)
    video_duration=float(json.loads(probe.stdout)['streams'][0]['duration'])
    analysis=subprocess.run(['ffmpeg','-nostdin','-hide_banner','-i',str(args.input),'-vn','-af','loudnorm=I=-14:TP=-1.5:LRA=7:print_format=json','-f','null','-'],capture_output=True,text=True,encoding='utf-8',errors='replace',check=True)
    reports=re.findall(r'\{\s*"input_i".*?\}',analysis.stderr,re.S)
    if not reports:
        raise RuntimeError('FFmpeg did not return loudness measurements')
    measured=json.loads(reports[-1])
    filt=('loudnorm=I=-14:TP=-1.5:LRA=7:'
          f'measured_I={measured["input_i"]}:measured_TP={measured["input_tp"]}:'
          f'measured_LRA={measured["input_lra"]}:measured_thresh={measured["input_thresh"]}:'
          f'offset={measured["target_offset"]}:linear=false:print_format=json')
    args.output.parent.mkdir(parents=True,exist_ok=True)
    result=subprocess.run(['ffmpeg','-nostdin','-hide_banner','-y','-i',str(args.input),'-map','0:v:0','-map','0:a:0','-c:v','copy','-af',filt,'-ar','48000','-ac','2','-c:a','aac','-b:a','192k','-t',f'{video_duration:.6f}','-movflags','+faststart',str(args.output)],capture_output=True,text=True,encoding='utf-8',errors='replace',check=True)
    mastering=re.findall(r'\{\s*"input_i".*?\}',result.stderr,re.S)
    report={'targetLufs':-14,'targetTruePeakDbtp':-1.5,'analysis':measured,'mastering':json.loads(mastering[-1]) if mastering else None,'output':str(args.output)}
    Path('renders/audio-master.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False))


if __name__=='__main__': main()
