# join src/ into index.html (see tools/srcfiles.py); --check only compares
import os,sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from srcfiles import *
names=[l.strip() for l in open(ORDER) if l.strip()]
parts=[(n,open(os.path.join(SRC,n),encoding='utf-8',newline='').read().split('\n')) for n in names]
text=join_parts(parts)
# two function declarations with one name: the later silently replaces the earlier everywhere (the game is one script).
# Refuse to build or pass the check until one is renamed.
import re,collections
_seen=collections.defaultdict(list)
for n,lines in parts:
  if n.endswith('.js'):
    for m in re.finditer(r'(?:^|[;{}\s])function\s+([A-Za-z_$][\w$]*)\s*\(','\n'.join(lines)):_seen[m.group(1)].append(n)
_dup={k:v for k,v in _seen.items() if len(v)>1}
if _dup:print('duplicate function names (rename one):',_dup);sys.exit(2)
# code hidden behind a line comment: a '// ...' comment added in the middle of a packed line swallows the rest of that line
_hid=re.compile(r'(?:^|[;{}\)\]])\s+//[^\n]*?(?:;\s*(?:const|let|if|for|return|function)\b|\)\{|=>\{)')
_bad=[(n,i+1,l.strip()[:120]) for n,lines in parts if n.endswith('.js') for i,l in enumerate(lines) if _hid.search(l) and 'http' not in l]
if _bad:print('code after a // comment on the same line (it would never run):');[print('  ',*b) for b in _bad];sys.exit(3)
cur=open(INDEX,encoding='utf-8',newline='').read() if os.path.exists(INDEX) else ''
if '--check' in sys.argv:
  if text==cur:print('src/ and index.html match');sys.exit(0)
  print('src/ and index.html differ: run tools/build.py (if you edited src/) or tools/split.py (if you edited index.html)');sys.exit(1)
if text!=cur:open(INDEX,'w',encoding='utf-8',newline='').write(text);print(f'built index.html from {len(names)} files')
else:print('index.html already up to date')
