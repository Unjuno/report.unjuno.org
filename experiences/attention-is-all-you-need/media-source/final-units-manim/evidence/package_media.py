from pathlib import Path
import json,subprocess,hashlib,math,wave,textwrap
import numpy as np
P=Path(__file__).parent;OUT=P.parent/'media';OUT.mkdir(exist_ok=True)
def run(a):return subprocess.run(a,check=True,capture_output=True,text=True)
def stamp(t):
 ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02}.{ms%1000:03}'
manifest=[]
for id,scene in [('reported-evidence','ReportedEvidence'),('scope','Scope')]:
 p=json.loads((P/id/'narration_plan.json').read_text());dest=OUT/f'{id}.mp4'
 run(['ffmpeg','-y','-i',str(P/f'render/videos/scenes/720p24/{scene}.mp4'),'-i',str(P/id/'narration.wav'),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','128k','-af','loudnorm=I=-18:TP=-1.5:LRA=9','-movflags','+faststart',str(dest)])
 probe=json.loads(run(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(dest)]).stdout)
 run(['ffmpeg','-v','error','-i',str(dest),'-f','null','-'])
 cues=[]
 for b in p['beats']:
  # Cue one complete synthesized passage. Split into display lines, not artificial word timings.
  cues.append({'start':b['speech_start'],'end':b['speech_end'],'text':b['text']})
  assert b['start']<=b['speech_start']<b['speech_end']<b['end']
 (OUT/f'{id}.ja.vtt').write_text('WEBVTT\n\n'+'\n\n'.join(f'{stamp(c["start"])} --> {stamp(c["end"])}\n'+ '\n'.join(textwrap.wrap(c['text'],32)) for c in cues)+'\n')
 (OUT/f'{id}.transcript.ja.txt').write_text(p['title']+'\n\n'+'\n\n'.join(b['text'] for b in p['beats'])+'\n\n原著: Vaswani et al. (2017), Attention Is All You Need. '+p['sections']+'\nhttps://arxiv.org/abs/1706.03762\n音声: ローカル合成音声 Kokoro v1.0 / jf_alpha\n本教材は翻訳モデルの再実験ではありません。\n')
 stills=[]
 for j in [0,1,2,4,6]:
  target=OUT/f'{id}.frame-{j+1}.jpg';run(['ffmpeg','-y','-ss',str(p['beats'][j]['start']+3),'-i',str(dest),'-frames:v','1','-q:v','2',str(target)]);stills.append(str(target))
 poster=OUT/f'{id}.poster.jpg';poster.write_bytes(Path(stills[2]).read_bytes())
 raw=OUT/f'{id}.decoded.wav';run(['ffmpeg','-y','-i',str(dest),'-vn','-ac','1','-ar','24000',str(raw)])
 with wave.open(str(raw),'rb') as f:a=np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').astype(float)/32768
 levels=[]
 for b in p['beats']:
  x=a[round(b['speech_start']*24000):round(b['speech_end']*24000)];rms=float(np.sqrt(np.mean(x*x)));assert rms>.005
  levels.append({'rms_dbfs':20*math.log10(rms),'peak':float(np.max(np.abs(x)))})
 raw.unlink()
 v=next(s for s in probe['streams'] if s['codec_type']=='video');audio=next(s for s in probe['streams'] if s['codec_type']=='audio')
 assert (v['codec_name'],v['width'],v['height'],v['r_frame_rate'],audio['codec_name'])==('h264',1280,720,'24/1','aac')
 validation={'full_decode':'pass','captions':'7 complete passage cues; checked bounds, non-overlap, exact narration text','audio_levels_by_passage':levels,'peak':float(np.max(np.abs(a))),'visual_review':'pending','actual_listening':False,'browser_or_iphone_playback':False,'probe':probe,'source_checks':'Table 2 values 26.36,27.3,28.4; big - ConvS2S ensemble = 2.04; single model checkpoint averaging §6.1; scope §3–4 and §6–7','stills':stills}
 (P/id/'validation.json').write_text(json.dumps(validation,ensure_ascii=False,indent=2))
 manifest.append({'unit_id':id,'src':str(dest),'poster':str(poster),'captions':str(OUT/f'{id}.ja.vtt'),'transcript':str(OUT/f'{id}.transcript.ja.txt'),'duration':float(probe['format']['duration']),'width':1280,'height':720,'fps':24,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'source':str(P/'scenes.py'),'narration_plan':str(P/id/'narration_plan.json'),'validation':str(P/id/'validation.json')})
(P.parent/'integration-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print(json.dumps(manifest,ensure_ascii=False,indent=2))
