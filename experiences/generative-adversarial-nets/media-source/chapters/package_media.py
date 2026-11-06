"""Mux, inspect, and inventory only chapter assets. Never changes overview."""
from pathlib import Path
import subprocess,json,hashlib,wave,re,sys
import numpy as np
ROOT=Path(__file__).resolve().parent;SITE=ROOT.parents[1];OUT=SITE/'public/media/chapters';OUT.mkdir(parents=True,exist_ok=True)
PLAN=json.loads((ROOT/'plan.json').read_text());classes={'roles':'Roles','objective':'Objective','optimal':'Optimal','equilibrium':'Equilibrium','training':'Training','saturation':'Saturation','evidence':'Evidence'}
def run(cmd):return subprocess.run(cmd,check=True,capture_output=True,text=True).stdout
def record(p):return {'path':p.relative_to(SITE/'public').as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
manifest=OUT.parent/'chapter-videos.json';prior=json.loads(manifest.read_text()) if manifest.exists() else {'source':'https://arxiv.org/abs/1406.2661','chapters':[]};lookup={c['id']:c for c in prior['chapters']}
for c in PLAN['chapters']:
 if len(sys.argv)>1 and c['id'] not in sys.argv[1:]:continue
 name=c['id'];video=OUT/f'{name}.mp4';raw=ROOT/f'render/videos/scenes/720p24/{classes[name]}.mp4';audio=ROOT/f'audio/{name}/narration.wav'
 run(['ffmpeg','-y','-threads','2','-i',str(raw),'-i',str(audio),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','128k','-movflags','+faststart','-shortest',str(video)])
 probe=json.loads(run(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(video)]));duration=float(probe['format']['duration']);assert abs(duration-c['duration'])<.15
 run(['ffmpeg','-v','error','-threads','2','-i',str(video),'-f','null','-'])
 check=ROOT/'checks'/name;check.mkdir(parents=True,exist_ok=True)
 finalwav=check/'decoded.wav';run(['ffmpeg','-v','error','-y','-threads','2','-i',str(video),'-ac','1','-ar','24000',str(finalwav)])
 with wave.open(str(finalwav),'rb') as w:sr=w.getframerate();pcm=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').astype(float)/32768
 segments=json.loads((ROOT/f'audio/{name}/segments.json').read_text());cues=json.loads((ROOT/f'audio/{name}/cues.json').read_text());intervals=[]
 for s in segments:
  a=pcm[round(s['start']*sr):round(s['end']*sr)];rms=float(np.sqrt(np.mean(a*a)));assert rms>.005;assert s['end']<=s['max_end']<=duration;intervals.append({'start':s['start'],'end':s['end'],'rms':rms,'fits_scene':True})
 assert all(0<=x['start']<x['end']<=duration for x in cues)
 assert all(x['end']<=y['start']+1e-6 for x,y in zip(cues,cues[1:]));assert ''.join(x['text'] for x in cues)==''.join(x['text'] for x in segments)
 text=(OUT/f'{name}.ja.vtt').read_text();assert text.startswith('WEBVTT');assert max(len(line) for line in text.splitlines() if '-->' not in line)<=30
 frames=[]
 for i in range(4):
  time=(i+.72)*c['slot'];p=check/f'frame-{i+1}.jpg';run(['ffmpeg','-y','-v','error','-threads','2','-ss',str(time),'-i',str(video),'-frames:v','1','-q:v','2',str(p)]);frames.append({'time':time,'path':p.relative_to(SITE).as_posix()})
 poster=OUT/f'{name}.poster.jpg';poster.write_bytes((check/'frame-3.jpg').read_bytes())
 validation={'full_av_decode':'passed','non_silence':'passed; decoded AAC narration intervals checked','audio_intervals':intervals,'subtitles':'bounds, order, full narration coverage, <=30 chars/line passed; sentence timings proportional estimates, not forced aligned','representative_frames':frames,'frame_visual_review':'pending','browser_playback':'not performed','direct_listening':'not performed','asr':'not performed'}
 row={'id':name,'title':c['title'],'video':record(video)['path'],'poster':record(poster)['path'],'captions':f'media/chapters/{name}.ja.vtt','transcript':f'media/chapters/{name}.transcript.ja.txt','duration_seconds':duration,'bytes':video.stat().st_size,'sha256':record(video)['sha256'],'assets':[record(p) for p in [video,poster,OUT/f'{name}.ja.vtt',OUT/f'{name}.transcript.ja.txt']],'source_sections':c['source_sections'],'validation':validation}
 lookup[name]=row;(check/'probe.json').write_text(json.dumps(probe,indent=2)+'\n');(check/'validation.json').write_text(json.dumps(validation,ensure_ascii=False,indent=2)+'\n');print(name,duration,row['bytes'],flush=True)
 prior['chapters']=[lookup[x['id']] for x in PLAN['chapters'] if x['id'] in lookup];manifest.write_text(json.dumps(prior,ensure_ascii=False,indent=2)+'\n')
