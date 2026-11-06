"""Free local Kokoro ONNX Japanese narration. No hosted TTS calls or uploads."""
from pathlib import Path
import os,json,time,sys,wave,hashlib,subprocess
import numpy as np
import onnxruntime as ort
from kokoro_onnx import Kokoro
from misaki import ja
ROOT=Path(os.environ['KOKORO_MODEL_DIR'])
VOICE='jf_alpha';SR=24000
os.environ['OMP_NUM_THREADS']='2'
assert ort.__version__ == '1.20.1', 'Use verified no-telemetry Linux ONNX Runtime 1.20.1'
ort.disable_telemetry_events()
options=ort.SessionOptions();options.intra_op_num_threads=2;options.inter_op_num_threads=1;options.log_severity_level=3
session=ort.InferenceSession(str(ROOT/'kokoro-v1.0.onnx'),sess_options=options,providers=['CPUExecutionProvider'])
engine=Kokoro.from_session(session,str(ROOT/'voices-v1.0.bin'),vocab_config=str(ROOT/'kokoro-config.json'))
# v1.0 model uses the first-generation Cutlet frontend, not v1.1 pitch labels.
import unidic,unidic_lite
unidic.DICDIR=unidic_lite.DICDIR
g2p=ja.JAG2P(version='cutlet')
vocab=json.loads((ROOT/'kokoro-config.json').read_text())['vocab']
def save_wav(path,a):
 with wave.open(str(path),'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(SR);f.writeframes(np.int16(np.clip(a,-.999,.999)*32767).tobytes())
def synth(text,speed=1):
 phonemes,tokens=g2p(text)
 missing=sorted(set(phonemes)-set(vocab))
 if missing:raise ValueError(f'Unmapped phonemes {missing}: {phonemes}')
 start=time.time();samples,sr=engine.create(phonemes,voice=VOICE,speed=speed,is_phonemes=True,trim=True)
 assert sr==SR
 samples=np.asarray(samples,dtype=np.float32)
 print(json.dumps({'text':text,'speed':speed,'seconds':len(samples)/sr,'synthesis_seconds':round(time.time()-start,2),'phonemes':phonemes},ensure_ascii=False),flush=True)
 return samples

OUT=Path(__file__).resolve().parent
plans=json.loads((OUT/'plan.json').read_text())
for id,p in plans.items():
 d=OUT/id;d.mkdir(exist_ok=True);timeline=[];cursor=0
 for i,s in enumerate(p['beats']):
  a=synth(s['text'],1.12);save_wav(d/f'segment-{i+1}.wav',a)
  duration=max(8.5,len(a)/SR+1.3);s['start']=cursor;s['speech_start']=cursor+.5;s['speech_end']=cursor+.5+len(a)/SR;s['end']=cursor+duration
  timeline.extend([np.zeros(round(.5*SR)),a,np.zeros(round((duration-.5-len(a)/SR)*SR))]);cursor+=duration
 save_wav(d/'narration.wav',np.concatenate(timeline));p['duration']=cursor
 (d/'narration_plan.json').write_text(json.dumps(p,ensure_ascii=False,indent=2))
 print('DONE',id,cursor,flush=True)
