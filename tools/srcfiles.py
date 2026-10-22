# Driftgate source layout. The published game is one file, index.html; the source lives in src/ as separate files.
#
#   python3 tools/build.py          join src/ into index.html (run after editing anything in src/)
#   python3 tools/split.py          rebuild src/ from index.html (run after editing index.html directly)
#   python3 tools/build.py --check  exit 1 if src/ and index.html disagree
#
# Layout (in order): src/page.html (markup and styles), src/data/*.html (the sound pack and model data, one line each),
# src/js/NN_name.js (the game script, cut where index.html has a line '//@src NN_name.js'), src/end.html (closing tags).
# To start a new JS file, add a '//@src NN_name.js' line in index.html (or start a new file in src/js and list it in
# src/ORDER.txt) and run split/build. Both directions are byte-exact: build(split(index.html)) == index.html.
import os,re
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC=os.path.join(ROOT,'src');INDEX=os.path.join(ROOT,'index.html');ORDER=os.path.join(SRC,'ORDER.txt')
DATA_IDS=['sndpack','mdlidx','mdlbin']
def split_text(t):
  lines=t.split('\n');out=[];i=0;n=len(lines)
  first=next(k for k,l in enumerate(lines) if l.startswith('<script type="application/json" id="sndpack">'))
  out.append(('page.html',lines[:first]));i=first
  while i<n and lines[i].startswith('<script type=') and 'id="' in lines[i]:
    m=re.search(r'id="([a-z]+)"',lines[i]);out.append((f'data/{m.group(1)}.html',[lines[i]]));i+=1
  assert lines[i]=='<script>','expected the main <script> line, found: '+lines[i][:60]
  out.append(('script_open.html',[lines[i]]));i+=1
  close=max(k for k,l in enumerate(lines) if l=='</script>')
  cur=None;buf=[]
  for k in range(i,close):
    l=lines[k];m=re.match(r'^//@src (\S+)$',l)
    if m:
      if cur:out.append((f'js/{cur}',buf))
      cur=m.group(1);buf=[l]
    else:
      assert cur,'script must start with a //@src line'
      buf.append(l)
  if cur:out.append((f'js/{cur}',buf))
  out.append(('end.html',lines[close:]))
  return out
def join_parts(parts):
  return '\n'.join('\n'.join(lines) for _,lines in parts)
