import json,subprocess,hashlib,math
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
p=Path(__file__).resolve().parent;video=p/'sequence_cost_manim_ja.mp4';plan=json.loads((p/'narration_plan.json').read_text())
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(video)]))
v=next(s for s in probe['streams'] if s['codec_type']=='video');a=next(s for s in probe['streams'] if s['codec_type']=='audio')
assert (v['width'],v['height'],v['r_frame_rate'],int(v['nb_frames']))==(1920,1080,'30/1',1620)
assert abs(float(v['duration'])-54)<.001 and abs(float(a['duration'])-54)<.001
assert v['codec_name']=='h264' and a['codec_name']=='aac'
decode=subprocess.run(['ffmpeg','-v','error','-i',str(video),'-f','null','-'],capture_output=True);assert decode.returncode==0;assert not decode.stderr
(p/'full_decode.log').write_bytes(decode.stderr)
raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(video),'-vn','-f','f32le','-ar','24000','-ac','1','-']);samples=np.frombuffer(raw,dtype='<f4');rms=[]
for s in plan['segments']:
 x=samples[round(s['start']*24000):round(s['end']*24000)];value=float(np.sqrt(np.mean(x*x)));assert value>.005;rms.append(value)
peak=float(np.max(np.abs(samples)));assert peak<1
(p/'audio_sync_validation.json').write_text(json.dumps({'decoded_video_duration':float(v['duration']),'decoded_audio_duration':float(a['duration']),'frames':int(v['nb_frames']),'sample_rate':24000,'section_rms':rms,'peak':peak,'clipped_samples':int(np.sum(np.abs(samples)>=1)),'direct_listening':False,'timing_basis':'Placed section WAVs using narration_plan start/end, not ASR timestamps'},indent=2)+'\n')
contact=Image.new('RGB',(1440,870),'white')
for i,t in enumerate([3,9,16,22,28,34,40,45,51]):
 frame=p/f'verified_{t:02}.png';subprocess.run(['ffmpeg','-v','error','-y','-ss',str(t),'-i',str(video),'-frames:v','1',str(frame)],check=True)
 im=Image.open(frame).convert('RGB');im.thumbnail((480,270));contact.paste(im,(i%3*480,i//3*290));ImageDraw.Draw(contact).text((i%3*480+8,i//3*290+272),f'{t}s',fill='black')
contact.save(p/'verified_contact.png')
im=Image.open(p/'verified_22.png').convert('RGB');im.resize((1280,720),Image.Resampling.LANCZOS).save(p/'sequence_cost_manim_poster.jpg',quality=90)
def ts(t,sep=','):
 ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02}{sep}{ms%1000:03}'
srt='';vtt='WEBVTT\n\n'
for i,s in enumerate(plan['segments']):
 srt+=f"{i+1}\n{ts(s['start'])} --> {ts(s['end'])}\n{s['caption']}\n\n";vtt+=f"{ts(s['start'],'.')} --> {ts(s['end'],'.')}\n{s['caption']}\n\n"
(p/'sequence_cost_ja.srt').write_text(srt);(p/'sequence_cost_ja.vtt').write_text(vtt)
print(json.dumps({'path':str(video),'bytes':video.stat().st_size,'sha256':hashlib.sha256(video.read_bytes()).hexdigest(),'duration':v['duration'],'frames':v['nb_frames'],'peak':peak,'all_sections_non_silent':True},indent=2))
