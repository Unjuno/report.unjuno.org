from pathlib import Path
import subprocess,json,hashlib,wave,sys
import numpy as np
ROOT=Path(__file__).resolve().parent;OUT=ROOT/'deliverables';PLAN=json.loads((ROOT/'plan.json').read_text())
def run(a):return subprocess.run(a,check=True,capture_output=True,text=True).stdout
def rec(p):return {'path':str(p.relative_to(ROOT)),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
rows=[]
for c in PLAN['chapters']:
 name=c['id'];v=OUT/f'{name}.mp4';raw=ROOT/'render/videos/scenes/720p24'/('Sequence.mp4' if name=='sequence' else 'EncoderDecoder.mp4');wav=ROOT/'audio'/name/'narration.wav';cap=OUT/f'{name}.ja.vtt'
 run(['ffmpeg','-y','-threads','2','-i',str(raw),'-i',str(wav),'-map','0:v:0','-map','1:a:0','-vf',f"subtitles={cap}:force_style='FontName=Noto Sans CJK JP,FontSize=15,PrimaryColour=&H00312A19,OutlineColour=&H00ECF3F6,BorderStyle=3,Outline=1,Shadow=0,MarginV=15'",'-c:v','libx264','-threads','2','-preset','fast','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-movflags','+faststart','-shortest',str(v)])
 probe=json.loads(run(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(v)]));dur=float(probe['format']['duration']);assert abs(dur-c['duration'])<.15
 vs=next(x for x in probe['streams'] if x['codec_type']=='video');aus=next(x for x in probe['streams'] if x['codec_type']=='audio');assert(vs['width'],vs['height'],vs['r_frame_rate'],vs['codec_name'],aus['codec_name'])==(1280,720,'24/1','h264','aac')
 run(['ffmpeg','-v','error','-threads','2','-i',str(v),'-f','null','-'])
 check=ROOT/'checks'/name;check.mkdir(parents=True,exist_ok=True);decoded=check/'decoded.wav';run(['ffmpeg','-y','-v','error','-i',str(v),'-ac','1','-ar','24000',str(decoded)])
 with wave.open(str(decoded)) as w:sr=w.getframerate();pcm=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').astype(float)/32768
 seg=json.loads((ROOT/'audio'/name/'segments.json').read_text());cues=json.loads((ROOT/'audio'/name/'cues.json').read_text());checks=[]
 for s in seg:
  a=pcm[round(s['start']*sr):round(s['end']*sr)];rms=float(np.sqrt(np.mean(a*a)));assert rms>.005;assert s['end']<=s['max_end']<=dur;checks.append({'start':s['start'],'end':s['end'],'rms':rms,'fits_scene':True})
 assert all(0<=x['start']<x['end']<=dur for x in cues);assert all(x['end']<=y['start']+1e-6 for x,y in zip(cues,cues[1:]));assert ''.join(x['text'] for x in cues)==''.join(x['text'] for x in seg)
 peak=float(np.max(abs(pcm)));assert peak<.999
 frames=[]
 for i in range(4):
  t=i*17+10;p=check/f'frame-{i+1}.jpg';run(['ffmpeg','-y','-v','error','-ss',str(t),'-i',str(v),'-frames:v','1','-q:v','2',str(p)]);frames.append({'time':t,'path':str(p.relative_to(ROOT))})
 poster=OUT/f'{name}.poster.jpg';poster.write_bytes((check/'frame-2.jpg').read_bytes())
 validation={'full_av_decode':'passed','audio_intervals':checks,'audio_peak':peak,'subtitle_checks':'Passed bounds/order/full-text coverage. Sentence times proportionally estimated, not forced aligned. Burned captions and external VTT provided.','frames':frames,'visual_review':'pending','direct_listening':'not performed','browser_playback':'not performed','iphone_playback':'not performed'}
 (check/'probe.json').write_text(json.dumps(probe,indent=2));(check/'validation.json').write_text(json.dumps(validation,ensure_ascii=False,indent=2))
 rows.append({'unit_id':name,'src':str(v.relative_to(ROOT)),'poster':str(poster.relative_to(ROOT)),'captions':str(cap.relative_to(ROOT)),'transcript':f'deliverables/{name}.transcript.ja.txt','duration_seconds':dur,'width':1280,'height':720,'fps':24,'sha256':rec(v)['sha256'],'source_sections':c['source_sections'],'assets':[rec(p) for p in [v,poster,cap,OUT/f'{name}.transcript.ja.txt']],'validation':validation})
 print(name,dur,flush=True)
(ROOT/'integration-mapping.json').write_text(json.dumps({'source':'https://arxiv.org/abs/1706.03762','units':rows},ensure_ascii=False,indent=2))
