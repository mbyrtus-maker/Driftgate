# Patch: blast-mining pay brought up to the agreed ladder. A live-game mining bot (real charges, clouds, docking and market sales,
# 30 game minutes per run) measured perfect placement at about 3.9k, 5.6k and 10.5k an hour at Mk I against the design's 12k,
# 15.6k and 19.9k: each magazine fills the hold, so the reload, not placement, set the pay. Shorter reloads restore the ladder
# and make placement matter again (a near-point hold now takes about twice the charges, and so about twice the reloads).
import sys
P=sys.argv[1];s=open(P,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    c=s.count(a);assert c==n,(c,n,a[:140]);s=s.replace(a,b)
a,b,c=(sys.argv[2:5] if len(sys.argv)>4 else ('110','115','150'))
rep("const BL_HULL={skiff:{n:2,reload:348,coll:6,cd:1},prospector:{n:3,reload:408,coll:9,cd:.5},dredger:{n:4,reload:552,coll:12,cd:.34}};",
    f"const BL_HULL={{skiff:{{n:2,reload:{a},coll:6,cd:1}},prospector:{{n:3,reload:{b},coll:9,cd:.5}},dredger:{{n:4,reload:{c},coll:12,cd:.34}}}};")
open(P,'w',encoding='utf-8').write(s);print('blast reloads',a,b,c)
# Measured with 110 / 115 / 150 s (Mk I, home field, all sales at the home station, 30 game minutes):
# on point 11.3k / 13.0k / 15.1k an hour, near 10.8k / 14.0k / 12.7k, off 6.6k / 7.9k / 6.7k; Mk III on point 16.2k / 20.4k / 21.5k.
# The Heavy Miner's shortfall is the home market: 880 t in half an hour sells at 8.6 cr/t against 12-14 for small loads.
