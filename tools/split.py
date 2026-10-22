# rebuild src/ from index.html (see tools/srcfiles.py)
import os,shutil,sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from srcfiles import *
parts=split_text(open(INDEX,encoding='utf-8').read())
for sub in ('js','data'):
  d=os.path.join(SRC,sub)
  if os.path.isdir(d):shutil.rmtree(d)
os.makedirs(os.path.join(SRC,'js'),exist_ok=True);os.makedirs(os.path.join(SRC,'data'),exist_ok=True)
for name,lines in parts:
  open(os.path.join(SRC,name),'w',encoding='utf-8',newline='').write('\n'.join(lines))
open(ORDER,'w').write('\n'.join(n for n,_ in parts)+'\n')
assert open(INDEX,encoding='utf-8').read()==join_parts(parts)
print(f'split index.html into {len(parts)} files under src/')
