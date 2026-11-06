from pathlib import Path
import json,re,wave,hashlib
import numpy as np
ROOT=Path(__file__).resolve().parent;OUT=ROOT.parent/'media'
plan=json.loads((ROOT/'timing.json').read_text())
def stamp(t):
 ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02}.{ms%1000:03}'
def display(s):return s.replace('ひゃくじゅう層','110層').replace('千二百二層','1202層')
cues=[];report=[]
for i,s in enumerate(plan):
 with wave.open(str(ROOT/f'segment-{i+1}.wav')) as f:
  a=np.frombuffer(f.readframes(f.getnframes()),dtype='<i2')/32768;duration=len(a)/f.getframerate()
 assert duration+.5<s['end']-s['start']
 report.append({'segment':i+1,'speech_duration':duration,'allocated_duration':s['end']-s['start'],'rms_dbfs':float(20*np.log10(np.sqrt(np.mean(a*a))))})
 chunks=[x+'。' for x in display(s['text']).split('。') if x];total=sum(map(len,chunks));cursor=s['speech_start']
 for chunk in chunks:
  end=cursor+duration*len(chunk)/total;cues.append(f'{stamp(cursor)} --> {stamp(end)}\n{chunk}');cursor=end
(OUT/'overview-ja.vtt').write_text('WEBVTT\n\n'+'\n\n'.join(cues)+'\n')
(OUT/'transcript-ja.txt').write_text('ResNet 概要動画・日本語全文\n\n'+'\n\n'.join(display(s['text']) for s in plan)+'\n\n音声: 無料ローカル Kokoro v1.0 / jf_alpha。原論文: https://arxiv.org/abs/1512.03385\n')
(OUT/'verification.json').write_text(json.dumps({'renderer':'Manim Community 0.19.0 (Cairo)','video':'overview-ja.mp4','resolution':[1280,720],'fps':24,'duration_seconds':82.291667,'audio':'AAC mono 48000 Hz, Kokoro v1.0 jf_alpha','full_av_decode':'passed ffmpeg -f null','reviewed_frames_seconds':[18,46],'segments':report,'subtitle_timing':'Sentence durations estimated proportionally within each exact synthesized speech segment; not forced-aligned.','direct_listening':'unverified','browser_playback':'unverified','per_unit_videos':(f"{len(json.loads((OUT/'chapter-videos.json').read_text())['chapters'])} chapter videos produced; see chapter-videos.json for per-file verification" if (OUT/'chapter-videos.json').exists() else 'not created; written brief explanations provided'),'sha256':hashlib.sha256((OUT/'overview-ja.mp4').read_bytes()).hexdigest()},ensure_ascii=False,indent=2))
