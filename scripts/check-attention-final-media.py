"""Independent local check of staged chapter media; never a listening/browser claim."""
from pathlib import Path, PurePosixPath
from hashlib import sha256
from fractions import Fraction
import argparse
import json
import re
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('course', type=Path)
parser.add_argument('--units', nargs='+', required=True)
parser.add_argument('--require-all', action='store_true')
parser.add_argument('--base', help='Exact site prefix for site-root-relative manifest URLs')
parser.add_argument('--output', type=Path)
args = parser.parse_args()
course = args.course.resolve()
public = course
config = json.loads((course / 'content/experience.json').read_text())
manifest = json.loads((course / 'content/final-unit-videos.json').read_text())
chapters=[]
for unit in config['units']:
    if unit['id'] not in manifest['videos']: continue
    media=unit['video']; entry=manifest['videos'][unit['id']]
    chapter={'id':unit['id'],'duration_seconds':media['duration_seconds'],'bytes':entry['assets']['src']['bytes'],'sha256':entry['assets']['src']['sha256']}
    chapter.update({key:('' if key=='transcript' else 'public/')+media[src] for key,src in [('video','src'),('poster','poster'),('captions','captions'),('transcript','transcript')]})
    chapter['assets']=[{'path':('' if key=='transcript' else 'public/')+media[key],**value} for key,value in entry['assets'].items()]
    chapters.append(chapter)
assert isinstance(chapters, list) and chapters, 'At least one ready chapter is required'
ids = [entry['id'] for entry in chapters]
assert len(ids) == len(set(ids)) and set(ids) <= set(args.units), ids
if args.require_all: assert set(ids) == set(args.units), ids

def asset(value):
    assert isinstance(value, str) and value, value
    if value.startswith('/'):
        assert args.base and args.base.startswith('/notes/') and args.base.endswith('/') and value.startswith(args.base), value
        value = value[len(args.base):]
    rel = PurePosixPath(value)
    assert not rel.is_absolute() and '..' not in rel.parts and '\\' not in value, value
    path = (public / str(rel)).resolve()
    assert path.is_relative_to(public) and path.is_file(), value
    return path

def probe(path):
    return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(path)],text=True))

def seconds(value):
    h,m,s=value.split(':');return int(h)*3600+int(m)*60+float(s)

reports=[];video_hashes=set();paths={key:set() for key in ('video','poster','captions','transcript')}
for chapter in chapters:
    files={key:asset(chapter[key]) for key in paths}
    for key,path in files.items():
        assert path not in paths[key], f'Duplicated {key}: {chapter["id"]}'
        paths[key].add(path)
    declared_assets = chapter.get('assets', [])
    if isinstance(declared_assets, dict):
        records = []
        for filename, expected in declared_assets.items():
            matches = [path for path in files.values() if path.name == filename]
            assert len(matches) == 1, filename
            records.append((matches[0], expected))
    else:
        assert isinstance(declared_assets, list)
        records = [(asset(record['path']), record) for record in declared_assets]
    for path, expected in records:
        data = path.read_bytes()
        assert len(data) == expected['bytes'] and sha256(data).hexdigest() == expected['sha256'], path
    content=files['video'].read_bytes();digest=sha256(content).hexdigest()
    assert digest==chapter['sha256'] and len(content)==chapter['bytes'], chapter['id']
    assert digest not in video_hashes, 'Different lessons must not reuse one video'
    video_hashes.add(digest)
    data=probe(files['video']);vs=[s for s in data['streams'] if s['codec_type']=='video'];au=[s for s in data['streams'] if s['codec_type']=='audio']
    assert len(vs)==len(au)==1
    assert vs[0]['codec_name']=='h264' and au[0]['codec_name']=='aac'
    assert (vs[0]['width'],vs[0]['height'])==(1280,720)
    assert Fraction(vs[0]['avg_frame_rate'])==24
    duration=float(data['format']['duration'])
    assert duration>5 and abs(duration-float(chapter['duration_seconds']))<.15
    assert int(au[0]['sample_rate'])>=24000
    subprocess.run(['ffmpeg','-v','error','-threads','2','-i',str(files['video']),'-map','0:v:0','-map','0:a:0','-f','null','-'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
    volume=subprocess.run(['ffmpeg','-hide_banner','-threads','2','-i',str(files['video']),'-vn','-af','volumedetect','-f','null','-'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,text=True).stderr
    match=re.search(r'mean_volume:\s*(-?[\d.]+) dB',volume)
    assert match and float(match[1])>-60, 'No audible-level narration signal'
    mean_volume=float(match[1])
    text=files['captions'].read_text();assert text.startswith('WEBVTT')
    matches=list(re.finditer(r'(\d\d:\d\d:\d\d\.\d\d\d) --> (\d\d:\d\d:\d\d\.\d\d\d)([^\n]*)\n([^\n]+(?:\n(?!\n)[^\n]+)*)',text))
    assert matches, 'Missing caption cues'
    previous=-1
    for cue in matches:
        start,end=seconds(cue[1]),seconds(cue[2])
        assert 0<=start<end<=duration+.15 and start>=previous-.001, (chapter['id'],start,end,previous,duration)
        assert cue[4].strip() and len(cue[4])<300, 'Missing or excessively long caption'
        previous=end
    transcript=files['transcript'].read_text();assert len(transcript.strip())>100
    poster=probe(files['poster']);assert any(x.get('width',0)>=640 and x.get('height',0)>=360 for x in poster['streams'])
    report={'id':chapter['id'],'seconds':duration,'bytes':len(content),'sha256':digest,'full_av_decode':'passed','mean_volume_dbfs':mean_volume,'caption_cues':len(matches),'captions_bounded_nonoverlapping':'passed','poster_exists':'passed','browser_playback':'unverified','direct_listening':'unverified'}
    reports.append(report)
result={'public':str(public),'chapters_checked':len(reports),'expected_units':args.units,'missing_units':sorted(set(args.units)-set(ids)),'result':'passed','reports':reports,'limits':'Technical decode, signal and timing checks do not establish subjective pronunciation, synchronized forced alignment, visual layout, browser playback or direct listening.'}
if args.output: args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False,indent=2))
