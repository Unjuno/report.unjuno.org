"""Finite two-cue acoustic-piano material study, not a production bank or auditory approval."""
from pathlib import Path
from fractions import Fraction
from functools import lru_cache
import hashlib,json,math,re,subprocess
import numpy as np
from scipy.signal import resample_poly, butter, sosfilt
from scipy.io import wavfile

ROOT=Path(__file__).resolve().parent
SR=44100
NAMES={'C':0,'E':4,'G#':8}

def decode(path):
    return np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-f','f32le','-ac','2','-ar',str(SR),'-']),dtype='<f4').reshape(-1,2).copy()
def db(value):return float(20*np.log10(max(float(value),1e-15)))
def measure(path):
    r=subprocess.run(['ffmpeg','-hide_banner','-i',str(path),'-af','ebur128=peak=true','-f','null','-'],capture_output=True,text=True,check=True).stderr.split('Summary:')[-1]
    return dict(lufs=float(re.search(r'I:\s+(-?[\d.]+) LUFS',r).group(1)),true_peak_dbtp=float(re.search(r'Peak:\s+(-?[\d.]+) dBFS',r).group(1)))

samples={}; source_results=[]
for item in json.loads((ROOT/'samples_manifest.json').read_text()):
    m=re.fullmatch(r'(C|E|G#)(\d)',item['note']);root=12*(int(m[2])+1)+NAMES[m[1]]
    path=ROOT/'samples'/item['file'];assert hashlib.sha256(path.read_bytes()).hexdigest()==item['sha256']
    y=decode(path);assert np.isfinite(y).all()
    # Confirm filename octave convention against actual recorded fundamentals.
    x=y[int(.15*SR):int(1.15*SR)].mean(axis=1);spectrum=abs(np.fft.rfft(x*np.hanning(len(x))))**2
    freqs=np.fft.rfftfreq(len(x),1/SR);expected=440*2**((root-69)/12);idx=np.flatnonzero((freqs>expected*.96)&(freqs<expected*1.04));found=float(freqs[idx[np.argmax(spectrum[idx])]])
    cents=1200*math.log2(found/expected);assert abs(cents)<50,(item['note'],found,cents)
    samples[root]=sosfilt(butter(2,32,'highpass',fs=SR,output='sos'),y,axis=0).astype(np.float32)
    source_results.append(dict(file=item['file'],midi_root=root,expected_hz=expected,measured_fundamental_hz=found,cents=cents,original_duration_seconds=len(y)/SR,original_peak_dbfs=db(abs(y).max())))

@lru_cache(None)
def pitched(pitch):
    root=min(samples,key=lambda n:abs(n-pitch));shift=pitch-root;assert abs(shift)<=2
    ratio=Fraction(2**(-shift/12)).limit_denominator(2048)
    return resample_poly(samples[root],ratio.numerator,ratio.denominator,axis=0).astype(np.float32),root

def render(ident):
    score=json.loads(next((ROOT/'scores').glob(f'{ident:03d}_*.json')).read_text())
    beat=60/score['bpm'];bar=score['beats_per_bar']*beat;score_end=score['bars']*bar
    total=max(score['duration_seconds'],score_end+3);mix=np.zeros((math.ceil(total*SR),2),np.float64);used=[]
    notes=sorted(score['notes'],key=lambda n:(n['start_beats'],n['pitch']))
    for i,note in enumerate(notes):
        start=note['start_beats']*beat;gate=note['duration_beats']*beat;voice=note['voice']
        # Damped piano chords stop holding before the next harmony; natural releases remain.
        if voice in ('pad','organ'):gate=min(gate,(math.floor(start/bar)+1)*bar-start-.015)
        next_same=next((n['start_beats']*beat for n in notes[i+1:] if n['pitch']==note['pitch'] and n['start_beats']*beat>start+.001),None)
        if next_same is not None:gate=min(gate,max(.08,next_same-start-.025))
        gate=max(.08,min(gate,score_end-start));release=.35 if note['pitch']>=55 else .48
        recorded,root=pitched(note['pitch']);count=min(len(recorded),round((gate+release)*SR));y=recorded[:count].astype(np.float64).copy()
        # Preserve the real attack. Only a 2 ms safety ramp and smooth note-off damping are applied.
        a=min(round(.002*SR),len(y));y[:a]*=np.sin(np.linspace(0,np.pi/2,a))[:,None]**2
        off=min(round(gate*SR),len(y));tail=len(y)-off
        if tail>0:y[off:]*=np.cos(np.linspace(0,np.pi/2,tail))[:,None]**2
        balance=.55 if voice in ('pad','organ') else .92 if voice=='reed' else 1
        y*=note['velocity']**1.65*balance
        # The source recording already contains the piano's own stereo/room image.
        at=round(start*SR);end=min(len(mix),at+len(y));mix[at:end]+=y[:end-at]
        used.append(dict(pitch=note['pitch'],sample_root=root,transpose_semitones=note['pitch']-root,voice=voice,gate_seconds=gate))
    # No synthetic pad, alias-prone oscillators, delay taps, added room or hard limiting.
    edge=min(round(.04*SR),len(mix));mix[-edge:]*=np.cos(np.linspace(0,np.pi/2,edge))[:,None]**2
    raw=ROOT/'renders'/f'{ident:03d}_piano_raw.wav';wavfile.write(raw,SR,mix.astype(np.float32))
    before=measure(raw);gain_db=min(-18-before['lufs'],-2-before['true_peak_dbtp']);mix*=10**(gain_db/20)
    assert np.isfinite(mix).all() and abs(mix).max()<1
    wavfile.write(raw,SR,mix.astype(np.float32))
    stem=f'{ident:03d}_{score["stem"][4:]}_acoustic_piano_study';results={}
    for suffix,codec in [('flac',['-c:a','flac','-sample_fmt','s32','-bits_per_raw_sample','24']),('mp3',['-c:a','libmp3lame','-b:a','256k'])]:
        out=ROOT/'renders'/f'{stem}.{suffix}'
        subprocess.run(['ffmpeg','-v','error','-y','-i',str(raw),'-metadata',f'title={score["title_ja"]} — acoustic piano study','-metadata','comment=Original HOME score; CC0 VCSL Steinway B samples. Finite prototype; listening review pending.']+codec+[str(out)],check=True)
        dec=decode(out);assert np.isfinite(dec).all() and abs(dec).max()<1
        results[suffix]={**measure(out),'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'sample_peak_dbfs':db(abs(dec).max()),'full_decode':'pass'}
    original=ROOT.parent/'home_audio_readonly_audit/audio'/f'{score["stem"]}.mp3'
    # Loudness-matched 18 s passages make the new timbre inspectable without a volume advantage.
    start=bar;length=18
    pair=[]
    for label,src in [('before',original),('after',ROOT/'renders'/f'{stem}.flac')]:
        data=decode(src)[round(start*SR):round((start+length)*SR)];tmp=ROOT/'renders'/f'{ident:03d}_{label}_ab_raw.wav';wavfile.write(tmp,SR,data)
        level=measure(tmp);g=min(-20-level['lufs'],-2-level['true_peak_dbtp']);data=data*10**(g/20)
        e=min(round(.025*SR),len(data)//2);data[:e]*=np.linspace(0,1,e)[:,None];data[-e:]*=np.linspace(1,0,e)[:,None];wavfile.write(tmp,SR,data.astype(np.float32))
        out=ROOT/'renders'/f'{ident:03d}_{label}_matched_18s.mp3';subprocess.run(['ffmpeg','-v','error','-y','-i',str(tmp),'-c:a','libmp3lame','-b:a','256k',str(out)],check=True)
        pair.append(dict(kind=label,file=out.name,**measure(out)));tmp.unlink()
    raw.unlink()
    return dict(id=ident,score_title=score['title_ja'],duration_seconds=len(mix)/SR,notes=len(notes),sample_rate=SR,master_gain_db=gain_db,retained_score='Pitch and start times preserved; note-off gates/release and foreground/accompaniment balance refined for piano.',used_notes=used,outputs=results,comparison=pair,listening_review='unavailable: environment cannot receive audio input',production_status='not integrated')

if __name__=='__main__':
    result=[render(i) for i in (2,69)]
    (ROOT/'render_results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    (ROOT/'sample_checks.json').write_text(json.dumps(source_results,indent=2)+'\n')
    print(json.dumps([{k:v for k,v in r.items() if k!='used_notes'} for r in result],ensure_ascii=False,indent=2))
