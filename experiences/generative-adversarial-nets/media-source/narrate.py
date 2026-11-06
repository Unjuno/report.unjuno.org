from pathlib import Path
import os,json,wave
import numpy as np
import onnxruntime as ort
from kokoro_onnx import Kokoro
from misaki import ja
import unidic,unidic_lite
ROOT=Path(__file__).resolve().parent
MODELS=Path(os.environ['KOKORO_MODEL_DIR'])
os.environ['OMP_NUM_THREADS']='2'
assert ort.__version__=='1.20.1'
ort.disable_telemetry_events()
opt=ort.SessionOptions();opt.intra_op_num_threads=2;opt.inter_op_num_threads=1;opt.log_severity_level=3
session=ort.InferenceSession(str(MODELS/'kokoro-v1.0.onnx'),sess_options=opt,providers=['CPUExecutionProvider'])
engine=Kokoro.from_session(session,str(MODELS/'voices-v1.0.bin'),vocab_config=str(MODELS/'kokoro-config.json'))
unidic.DICDIR=unidic_lite.DICDIR
g2p=ja.JAG2P(version='cutlet')
texts=[
'生成器はノイズからサンプルを作ります。識別器は、実データから来た確率を予測します。二つを競わせるのが、元のガンの考え方です。',
'識別器は、実データを本物、生成したデータを偽物と見分けます。生成器は、逆に識別器を迷わせる方向へ更新します。',
'三つの箱の確率で考えましょう。これは学習済み画像モデルではなく、合計が一になる教材の例です。分布の違いが、見分ける手がかりになります。',
'生成器を固定したとき、理想の識別器は実データの確率を、二つの確率の和で割ります。本物が多い箱ほど、本物らしいと判断します。',
'二つの分布が等しくなると、理想の識別器の答えは二分の一です。ただし、識別器の答えだけでは、学習の成功を断定できません。',
'二つを交互に更新します。原論文は、初期の勾配を強める目的も示しました。理論の条件と実際の学習は区別しましょう。']
SR=24000;timeline=np.zeros(78*SR,dtype=np.float32);rows=[]
for i,text in enumerate(texts):
 ph,_=g2p(text);a,sr=engine.create(ph,voice='jf_alpha',speed=1.05,is_phonemes=True,trim=True)
 a=np.asarray(a);assert sr==SR;assert len(a)/SR<12.1,(i,len(a)/SR)
 start=i*13+.6;timeline[round(start*SR):round(start*SR)+len(a)]=a
 rows.append({'start':start,'end':start+len(a)/SR,'text':text,'seconds':len(a)/SR});print(rows[-1],flush=True)
with wave.open(str(ROOT/'narration.wav'),'wb') as f:
 f.setnchannels(1);f.setsampwidth(2);f.setframerate(SR);f.writeframes((np.clip(timeline,-.999,.999)*32767).astype('<i2').tobytes())
(ROOT/'narration.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
def stamp(t):
 ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02}.{ms%1000:03}'
(ROOT.parent/'public/media/gan-overview-ja.vtt').write_text('WEBVTT\n\n'+'\n\n'.join(f'{stamp(r["start"])} --> {stamp(r["end"])}\n{r["text"]}' for r in rows)+'\n')
(ROOT.parent/'public/media/gan-overview-transcript-ja.txt').write_text('Generative Adversarial Nets｜概要動画 全文\n音声：ローカル合成音声 Kokoro jf_alpha\n原著：Goodfellow et al. (2014), arXiv:1406.2661\n\n'+'\n\n'.join(texts)+'\n\n数値は教育用の離散分布であり、訓練済みモデルの結果ではありません。\n')
