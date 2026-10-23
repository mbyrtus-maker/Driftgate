#!/bin/bash
# Run Driftgate's browser tests against index.html (build first: python3 tools/build.py).
#   tools/tests/run.sh            quick tests (about 10 minutes)
#   tools/tests/run.sh full       also every training course (about 40 minutes more)
# Each test prints its results and an "errors [...]" line; anything in that list is a failure.
cd "$(dirname "$0")/../.."
QUICK="load start_screen keys brood_ui dock jobs ship limpet map mining_sight"
for t in $QUICK; do echo "== $t"; timeout 300 python3 -u tools/tests/$t.py 2>&1 | tail -4; done
if [ "$1" = full ]; then for trk in combat mining hauling scouting full; do echo "== training $trk"; TRK=$trk timeout 1200 python3 -u tools/tests/training.py 2>&1 | grep "course\|^end\|^errors\|^workarounds\|ERR"; done; fi
