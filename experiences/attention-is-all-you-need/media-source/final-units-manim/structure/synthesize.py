"""Existing free local Kokoro; no network calls, install, or paid API."""
from pathlib import Path
import os,json,wave,sys,textwrap,math
os.environ['OMP_NUM_THREADS']='2';os.environ['OPENBLAS_NUM_THREADS']='1'
import numpy as np
import onnxruntime as ort
from kokoro_onnx import Kokoro
from misaki import ja
import unidic,unidic_lite
ROOT=Path(__file__).resolve().parent;OUT=ROOT/'deliverables';OUT.mkdir(parents=True,exist_ok=True)
MODELS=Path(os.environ['KOKORO_MODEL_DIR']);SR=24000
assert ort.__version__=='1.20.1';ort.disable_telemetry_events()
opt=ort.SessionOptions();opt.intra_op_num_threads=2;opt.inter_op_num_threads=1;opt.log_severity_level=3
session=ort.InferenceSession(str(MODELS/'kokoro-v1.0.onnx'),sess_options=opt,providers=['CPUExecutionProvider'])
engine=Kokoro.from_session(session,str(MODELS/'voices-v1.0.bin'),vocab_config=str(MODELS/'kokoro-config.json'))
unidic.DICDIR=unidic_lite.DICDIR;g2p=ja.JAG2P(version='cutlet')
def wav(path,a):
 with wave.open(str(path),'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(SR);f.writeframes((np.clip(a,-.999,.999)*32767).astype('<i2').tobytes())
def stamp(t):
 ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02}.{ms%1000:03}'
plan=json.loads((ROOT/'plan.json').read_text())
for c in plan['chapters']:
 if len(sys.argv)>1 and c['id'] not in sys.argv[1:]:continue
 d=ROOT/'audio'/c['id'];d.mkdir(parents=True,exist_ok=True);timeline=np.zeros(round(c['duration']*SR),dtype=np.float32);rows=[];cues=[]
 for i,b in enumerate(c['beats']):
  p=d/f'{i}.wav'
  if p.exists():
   with wave.open(str(p),'rb') as f:a=np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').astype(float)/32768
  else:
   ph,_=g2p(b['text']);a,sr=engine.create(ph,voice='jf_alpha',speed=1.05,is_phonemes=True,trim=True);assert sr==SR;a=np.asarray(a);wav(p,a)
  seconds=len(a)/SR;assert b['start']+seconds<=b['max_end'],(c['id'],i,seconds,b['max_end']-b['start'])
  start=round(b['start']*SR);timeline[start:start+len(a)]=a
  row={**b,'end':b['start']+seconds,'seconds':seconds,'rms':float(np.sqrt(np.mean(a*a)))};rows.append(row);print(c['id'],i,seconds,flush=True)
  # Sentence-boundary cues are distributed proportionally through each synthesized passage.
  sentences=[x+'。' for x in b['text'].split('。') if x];total=sum(map(len,sentences));at=b['start']
  for sentence in sentences:
   end=at+seconds*len(sentence)/total;cues.append({'start':at,'end':end,'text':sentence});at=end
 wav(d/'narration.wav',timeline);(d/'segments.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n');(d/'cues.json').write_text(json.dumps(cues,ensure_ascii=False,indent=2)+'\n')
 (OUT/f"{c['id']}.ja.vtt").write_text('WEBVTT\n\n'+'\n\n'.join(f'{stamp(r["start"])} --> {stamp(r["end"])}\n'+ '\n'.join(textwrap.wrap(r['text'],width=math.ceil(len(r['text'])/math.ceil(len(r['text'])/30)))) for r in cues)+'\n')
 (OUT/f"{c['id']}.transcript.ja.txt").write_text(c['title']+'\n原著: Vaswani et al. (2017), arXiv:1706.03762 / '+c['source_sections']+'\n音声: ローカル合成音声 Kokoro jf_alpha\n\n'+'\n\n'.join(b['text'] for b in c['beats'])+'\n\n図は構造の模式図で、実際の翻訳や実行時間の測定ではありません。字幕の文内タイミングは合成区間から比例配分し、単語単位の強制アラインメントは未実施です。\n')
