import json
from pathlib import Path
p=Path(__file__).parent
paths=[{'n':n,'adjacent_connections':n-1,'direct_connections':1} for n in [6,12]]
assert paths[0]['adjacent_connections']==5 and paths[1]['adjacent_connections']==11
inputs=['BOS','A','B','C'];targets=['A','B','C','EOS'];assert inputs[1:]==targets[:-1]
mask=[[j<=i for j in range(4)] for i in range(4)];assert [sum(x) for x in mask]==[1,2,3,4]
assert all(not mask[i][j] for i in range(4) for j in range(i+1,4))
generation=[{'step':i,'decoder_input':['BOS']+targets[:i],'next_target':targets[i]} for i in range(4)]
assert generation[0]['decoder_input']==['BOS'] and generation[1]['decoder_input']==['BOS','A'] and generation[3]['decoder_input']==['BOS','A','B','C']
(p/'math-validation.json').write_text(json.dumps({'status':'passed','sequence':{'paths':paths,'asymptotic_maximum_path_length':{'recurrent':'O(n)','self_attention':'O(1)'},'sequential_operations_per_layer':{'recurrent':'O(n)','self_attention':'O(1)'},'caveat':'Schematic connections, not timing; generation remains autoregressive.'},'encoder-decoder':{'shifted_input':inputs,'prediction_targets':targets,'causal_allowed_mask':mask,'generation':generation,'cross_attention':{'Q':'previous decoder layer','K':'encoder output','V':'encoder output'}},'source':'Vaswani et al. 2017, sections 1, 3.1, 3.2.3, 4 and Table 1','reference_content':'candidate/experiences/attention-is-all-you-need/src/site/lessons.mjs and labs.mjs'},ensure_ascii=False,indent=2))
