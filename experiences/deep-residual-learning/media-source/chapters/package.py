"""Mux existing real Manim output + local narration, validate and export media manifest.
Usage: python package.py residual shape (or all five slugs). No network operations.
"""
from pathlib import Path
import subprocess,json,sys,wave,hashlib,re,math
import numpy as np
P=Path(__file__).resolve().parent;ROOT=P.parent.parent;OUT=ROOT/'media'/'chapters';OUT.mkdir(exist_ok=True)
BASE='/notes/deep-residual-learning/';CLASSES={'residual':'ResidualLesson','shape':'ShapeLesson','depth':'DepthLesson','blocks':'BlocksLesson','evidence':'EvidenceLesson'}
TITLES={'residual':'丸ごとではなく、差分を学ぶ','shape':'足すには、形をそろえる','depth':'深くすれば、必ず良くなる？','blocks':'2層と3層のブロック','evidence':'数値を、条件つきで読む'}
def run(args,**kwargs):return subprocess.run(args,check=True,**kwargs)
def stamp(t):
 n=round(t*1000);return f'{n//3600000:02}:{n//60000%60:02}:{n//1000%60:02}.{n%1000:03}'
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
manifestpath=ROOT/'media'/'chapter-videos.json'
manifest=json.loads(manifestpath.read_text()) if manifestpath.exists() else {'schema_version':1,'renderer':'Manim Community 0.19.0 / Cairo','narration':'Kokoro v1.0 / jf_alpha / local ONNX CPU','chapters':[]}
for slug in sys.argv[1:] or CLASSES:
 source=P/'render'/'videos'/'scenes'/'720p24'/(CLASSES[slug]+'.mp4');target=OUT/(slug+'.mp4');timing=json.loads((P/slug/'timing.json').read_text())
 with open(P/slug/'mux.log','w') as log:
  run(['ffmpeg','-y','-hide_banner','-threads','2','-i',str(source),'-i',str(P/slug/'narration.wav'),'-map','0:v','-map','1:a','-c:v','copy','-af','loudnorm=I=-17:TP=-1.5:LRA=7:print_format=json','-c:a','aac','-b:a','128k','-ar','48000','-movflags','+faststart','-shortest',str(target)],stdout=log,stderr=log)
 with open(P/slug/'decode.log','w') as log:run(['ffmpeg','-v','error','-threads','2','-i',str(target),'-f','null','-'],stdout=log,stderr=log)
 info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(target)]));(P/slug/'ffprobe.json').write_text(json.dumps(info,indent=2));duration=float(info['format']['duration']);assert 35<=duration<=80
 video=next(x for x in info['streams'] if x['codec_type']=='video');assert (video['width'],video['height'])==(1280,720)
 wav=P/slug/'decoded.wav';run(['ffmpeg','-y','-v','error','-threads','2','-i',str(target),'-vn','-ac','1','-ar','24000','-c:a','pcm_s16le',str(wav)])
 with wave.open(str(wav)) as f:sr=f.getframerate();a=np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').astype(float)/32768
 levels=[];cues=[];frames=[]
 for i,s in enumerate(timing):
  start=s['speech_start'];end=start+s['speech_seconds'];assert end<duration-.4
  chunk=a[round(start*sr):round(end*sr)];rms=20*math.log10(max(1e-12,np.sqrt(np.mean(chunk*chunk))));assert rms>-38
  window=2400; silence_run=0;longest=0
  for off in range(0,len(chunk)-window+1,window):
   quiet=np.sqrt(np.mean(chunk[off:off+window]**2))<10**(-45/20);silence_run=silence_run+1 if quiet else 0;longest=max(longest,silence_run)
  assert longest*.1<2.0
  levels.append({'longest_silence_seconds_below_minus45dbfs':round(longest*.1,3),'segment':i+1,'start':start,'end':end,'rms_dbfs':rms,'peak_dbfs':20*math.log10(max(1e-12,max(abs(chunk)))),'speech_not_cut':True})
  sentences=[x+'。' for x in s['speech'].replace('レル','ReLU').replace('ひゃくじゅう層','110層').split('。') if x];total=sum(map(len,sentences));cursor=start
  for text in sentences:
   stop=cursor+s['speech_seconds']*len(text)/total
   # Two lines where useful; do not split code units or equations blindly.
   if len(text)>42:
    split=text.rfind('、',10,45)+1
    if split<=10:split=len(text)//2
    text=text[:split]+'\n'+text[split:]
   assert cursor<stop<=duration
   cues.append({'start':cursor,'end':stop,'text':text});cursor=stop
  for offset in [3.0,6.5]:
   sec=min(s['end']-.7,s['start']+offset);frame=P/slug/f'frame-{i+1}-{int(offset*10)}.jpg'
   run(['ffmpeg','-y','-v','error','-threads','2','-ss',str(sec),'-i',str(target),'-frames:v','1',str(frame)]);frames.append({'seconds':sec,'file':str(frame.relative_to(ROOT))})
 caption=OUT/(slug+'.ja.vtt');caption.write_text('WEBVTT\n\n'+'\n\n'.join(f"{stamp(c['start'])} --> {stamp(c['end'])}\n{c['text']}" for c in cues)+'\n')
 transcript=OUT/(slug+'.ja.txt');transcript.write_text(TITLES[slug]+' — ナレーション全文\n\n'+'\n\n'.join(s['speech'] for s in timing)+'\n\n画面・字幕用表記（数式や数値を読みやすく表記）\n\n'+'\n\n'.join(s['caption'] for s in timing)+'\n\n原著: https://arxiv.org/abs/1512.03385\n')
 poster=OUT/(slug+'.jpg');run(['ffmpeg','-y','-v','error','-threads','2','-ss','4','-i',str(target),'-frames:v','1',str(poster)])
 loudness=(P/slug/'mux.log').read_text();normalization=json.loads(re.findall(r'\{\s*"input_i"[\s\S]*?\}',loudness)[-1])
 entry={'id':slug,'title':TITLES[slug],'video':BASE+'media/chapters/'+target.name,'poster':BASE+'media/chapters/'+poster.name,'captions':BASE+'media/chapters/'+caption.name,'transcript':BASE+'media/chapters/'+transcript.name,'duration_seconds':duration,'bytes':target.stat().st_size,'sha256':sha(target),'assets':{p.name:{'bytes':p.stat().st_size,'sha256':sha(p)} for p in [target,poster,caption,transcript]},'validation':{'decode':'passed: full ffmpeg audiovisual decode','ffprobe':{'video_codec':video['codec_name'],'width':video['width'],'height':video['height'],'fps':video['r_frame_rate']},'non_silence':{'passed':True,'speech_intervals':levels,'full_audio_peak_dbfs':20*math.log10(max(abs(a)))},'normalization':normalization,'subtitles':{'valid_ranges':True,'nonempty':True,'cues':len(cues),'no_overlap':all(cues[i]['end']<=cues[i+1]['start']+.002 for i in range(len(cues)-1)),'timing':'Sentence-proportional estimates inside exact synthesized speech intervals; not forced-aligned. Captions follow actual speech, with ReLU/110 display spellings; no additional numerical claims. Verbatim speech and supplemental screen wording are separate in transcript.','intentional_gaps':'Between speech sections only; captions end at speech end, not at scene boundary.'},'representative_frames':{'extracted':frames,'visual_review':'pending'},'browser_playback':'unverified; no browser launch attempted','direct_listening':'unverified'}}
 manifest['chapters']=[e for e in manifest['chapters'] if e['id']!=slug]+[entry];manifest['chapters'].sort(key=lambda e:list(CLASSES).index(e['id']));manifestpath.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');print('PACKAGED',slug,duration,target.stat().st_size,flush=True)
