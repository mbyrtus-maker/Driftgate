#!/bin/bash
# Run before publishing the game anywhere. Publish only what this leaves in index.html, from an up-to-date main.
set -e
cd "$(dirname "$0")/.."
git pull -q --rebase
python3 tools/build.py --check
python3 - <<'PY'
import re,subprocess,tempfile
s=open('index.html',encoding='utf-8').read();js=max(re.findall(r'<script>(.*?)</script>',s,re.S),key=len)
f=tempfile.NamedTemporaryFile('w',suffix='.js',delete=False);f.write(js);f.close()
r=subprocess.run(['node','--check',f.name],capture_output=True,text=True)
print('script syntax ok' if not r.stderr else r.stderr[:400]);exit(1 if r.stderr else 0)
PY
git status --short | grep -q . && { echo "uncommitted changes: commit and push before publishing"; exit 1; } || true
echo "ready to publish index.html at $(git rev-parse --short HEAD)"
