# join src/ into index.html (see tools/srcfiles.py); --check only compares
import os,sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from srcfiles import *
names=[l.strip() for l in open(ORDER) if l.strip()]
parts=[(n,open(os.path.join(SRC,n),encoding='utf-8',newline='').read().split('\n')) for n in names]
text=join_parts(parts)
cur=open(INDEX,encoding='utf-8',newline='').read() if os.path.exists(INDEX) else ''
if '--check' in sys.argv:
  if text==cur:print('src/ and index.html match');sys.exit(0)
  print('src/ and index.html differ: run tools/build.py (if you edited src/) or tools/split.py (if you edited index.html)');sys.exit(1)
if text!=cur:open(INDEX,'w',encoding='utf-8',newline='').write(text);print(f'built index.html from {len(names)} files')
else:print('index.html already up to date')
