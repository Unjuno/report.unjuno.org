"""Decode all active files and screen every directed equal-power cue boundary.
Numerical signal validation only, not a listening or browser acceptance test.
"""
from pathlib import Path
import json, subprocess, hashlib, concurrent.futures
import numpy as np
ROOT=Path(__file__).resolve().parents[1]; BANK=ROOT/'dist/assets/home-music'; OUT=ROOT/'source/quality-20261105/audio'; SR=32000
catalog=json.loads((BANK/'catalog.json').read_text()); overlap=catalog['crossfade_seconds']; tracks=catalog['tracks']; n=round(overlap*SR)
assert len(tracks)==50 and len({t['id'] for t in tracks})==50

def decode(t):
 p=BANK/t['file'];b=p.read_bytes();assert len(b)==t['bytes'];assert hashlib.sha256(b).hexdigest()==t['sha256']
 run=subprocess.run(['ffmpeg','-v','error','-i',str(p),'-f','f32le','-ar',str(SR),'-ac','2','-'],capture_output=True,check=True)
 x=np.frombuffer(run.stdout,dtype=np.float32).reshape(-1,2);duration=len(x)/SR
 assert np.isfinite(x).all() and np.max(np.abs(x))<1,(t['id'],'full-decode/clipping')
 assert abs(duration-t['decoded_duration_seconds'])<.05,(t['id'],duration,t['decoded_duration_seconds'])
 assert 0<=t['cue_in_seconds']<t['cue_out_seconds']<=duration+.001
 cue=x[round(t['cue_in_seconds']*SR):round(t['cue_out_seconds']*SR)]
 assert len(cue)>n*2+SR
 rms=lambda a:float(10*np.log10(max(1e-24,float(np.mean(a.astype(np.float64)**2)))))
 return t['id'],dict(duration=duration,sample_peak_dbfs=float(20*np.log10(max(1e-12,float(abs(x).max())))),clip_samples=int(np.sum(abs(x)>=1)),cue_in_seconds=t['cue_in_seconds'],cue_out_seconds=t['cue_out_seconds'],cue_seconds=len(cue)/SR,entry_rms_dbfs=rms(cue[:n]),exit_rms_dbfs=rms(cue[-n:]),measurement_window_seconds=overlap,sha256=t['sha256'],bytes=len(b)),dict(head=cue[:n].copy(),tail=cue[-n:].copy())
results={};endpoints={}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:
 for identity,result,ends in ex.map(decode,tracks): results[identity]=result;endpoints[identity]=ends
fade=np.linspace(0,np.pi/2,n);fo=np.cos(fade)[:,None];fi=np.sin(fade)[:,None];gain=10**(catalog['master_gain_db']/20); pairs=[]
for a in tracks:
 for b in tracks:
  y=(endpoints[a['id']]['tail']*fo+endpoints[b['id']]['head']*fi)*gain
  assert np.isfinite(y).all()
  e=np.mean(y*y,axis=1);cs=np.r_[0,np.cumsum(e)];window=round(.1*SR);starts=np.unique(np.r_[np.arange(0,n-window+1,round(.01*SR)),n-window]);rms=10*np.log10(np.maximum(1e-24,(cs[starts+window]-cs[starts])/window))
  blocks=y[:len(y)//window*window].reshape(-1,window,2);fixed=10*np.log10(np.maximum(1e-24,np.mean(blocks*blocks,axis=(1,2))))
  pairs.append(dict(from_id=a['id'],to_id=b['id'],overlap_seconds=overlap,minimum_100ms_fixed_rms_dbfs=float(fixed.min()),minimum_100ms_rolling_rms_dbfs=float(rms.min()),minimum_100ms_position=float(starts[rms.argmin()]/SR),sample_peak_dbfs=float(20*np.log10(max(1e-12,float(abs(y).max())))),clip_samples=int(np.sum(abs(y)>=1))))
summary=dict(bank='approved_piano_002_069',overlap_seconds=overlap,pair_count=len(pairs),fixed_100ms_min_rms_dbfs=min(p['minimum_100ms_fixed_rms_dbfs'] for p in pairs),rolling_100ms_min_rms_dbfs=min(p['minimum_100ms_rolling_rms_dbfs'] for p in pairs),highest_sample_peak_dbfs=max(p['sample_peak_dbfs'] for p in pairs),clip_samples=sum(p['clip_samples'] for p in pairs),pairs_with_100ms_below_minus40=sum(p['minimum_100ms_rolling_rms_dbfs']<-40 for p in pairs),pairs_with_100ms_below_minus45=sum(p['minimum_100ms_rolling_rms_dbfs']<-45 for p in pairs),weakest_pairs=sorted(pairs,key=lambda p:p['minimum_100ms_rolling_rms_dbfs'])[:10])
OUT.mkdir(parents=True,exist_ok=True);(OUT/'full-bank-decode.json').write_text(json.dumps(results,indent=2)+'\n');(OUT/'directed-pairs-2500.json').write_text(json.dumps(pairs,indent=2)+'\n');(OUT/'boundary-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
assert summary['clip_samples']==0
for t in tracks:
 if t['id'] in [2,69]:
  r=results[t['id']];t.update(decoded_duration_seconds=r['duration'],entry_rms_dbfs=r['entry_rms_dbfs'],exit_rms_dbfs=r['exit_rms_dbfs'],measurement_window_seconds=overlap)
v=catalog['verification'];v['numeric_pair_result']=summary;v['directed_pairs_screened']=len(pairs);v['full_decode_tracks']=50;v['full_decode_clip_samples']=sum(r['clip_samples'] for r in results.values());v['auditory_review']='002/069 full piano prototypes user-approved; all-pair listening and iPhone/Safari remain unverified'
(BANK/'catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'full_decode_tracks':len(results),'replacement_durations':{i:results[i]['duration'] for i in [2,69]},'boundary_summary':summary},indent=2))
