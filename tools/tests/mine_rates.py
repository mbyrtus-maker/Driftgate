# Mining pay check (model): for each miner hull at Mk I, an average pilot blasts the richest field within two jumps of a friendly
# market until the hold is full, flies back and sells at that market at its real current prices (real lot sizes, fees, local
# demand). Charges: the hull's magazine, a section per charge, an average placement mix (60% on point, 30% near, 10% off),
# the magazine reload, and the scoop rate. Travel uses gate distances. Galaxies are simulated to 20, 40 and 60 minutes.
# Ladder targets an hour, Mk I: Light 12k, Medium 15.6k, Heavy 20k.
# usage: python3 tools/tests/mine_rates.py [page] [galaxies]   (PERFECT=aim,p models perfect blasts instead: s per charge, on-point chance)
import asyncio,json,sys,os,statistics as st
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__))
PAGE=os.path.abspath(sys.argv[1]) if len(sys.argv)>1 else os.path.join(HERE,'..','..','index.html')
G=int(sys.argv[2]) if len(sys.argv)>2 else 3
SNAP=r"""(()=>{const P=S.player,f=P.faction,out={};const DOCK=40,JUMP=10,GATE=4500,XG=6500,REL=.6*.9+.3*.5+.1*.25,AIM=4,DET=10;const PERF=__PERF__;
 const ok=R=>R&&R.kind!=='hive'&&(R.owner===f||R.owner==='neutral');
 const mk=R=>({kind:'station',market:(typeof mkStock==='function'?mkStock(R):S.econ.stock[R.owner]),wallet:R.owner,owner:R.owner});
 const at=(sid,fn)=>{const o=P.sector;P.sector=sid;try{return fn()}finally{P.sector=o}};
 function sellVal(R,load){const c=mk(R),st=c.market,s0=JSON.stringify(st),m0=JSON.stringify(R.mk||{});let v=0;
   for(const k in load){let left=load[k];for(let g=0;g<40&&left>0;g++){const pr=at(R.sid,()=>mSell(c,k)),n=at(R.sid,()=>lotCap(c,k,1,left));if(n<1)break;st[k]=(st[k]||0)+n;if(R.mk)R.mk[k]=(R.mk[k]||0)+n*((typeof pMk==='function')?pMk():1);v+=pr*n;left-=n}}
   for(const k of Object.keys(st))delete st[k];Object.assign(st,JSON.parse(s0));R.mk=JSON.parse(m0);return v}
 for(const cls of ['skiff','prospector','dredger']){P.cls=cls;const sts=shipStats(f,cls,P.tiers),cap=sts.cargo,spd=sts.maxSpd,h=BL_HULL[cls],n=blCap(P),coll=blColl(P),y=h.k*REL;
  let best=0,bd=null;
  for(const sid in S.stations){const R=S.stations[sid];if(!ok(R))continue;
   for(const d of SECTOR_DEFS){const j=HOP[sid][d.id];if(j>2)continue;const s=S.sectors[d.id],ore={};let tot=0;for(const a of s.ast){if(a.comet)continue;for(const k in a.ore){ore[k]=(ore[k]||0)+a.ore[k];tot+=a.ore[k]}}if(tot<300)continue;
    // a hold's worth of the field's mix, by mass
    let mm=0;for(const k in ore)mm+=ore[k]/tot*mass(k);const units=mm>0?cap/mm:cap*3;const load={};for(const k in ore){const u=Math.floor(units*ore[k]/tot);if(u>0)load[k]=u}
    const loadU=Object.values(load).reduce((a,b)=>a+b,0);if(loadU<1)continue;
    let tFill;const mags=loadU/(n*y),tMag=n*AIM+DET+n*y/coll;tFill=mags*tMag+Math.max(0,Math.ceil(mags)-1)*Math.max(0,h.reload-n*y/coll);
    if(PERF){ // perfect blasts: line up every fault point of a rock (PERF.aim s a charge), each lands on point with chance PERF.p;
      // all on point cracks the whole rock, otherwise the blast pays like an ordinary one. Fill the hold rock by rock.
      const rocks=s.ast.filter(a=>!a.comet&&oreTotal(a)>20).map(oreTotal);const avg=rocks.length?rocks.reduce((a,b)=>a+b,0)/rocks.length:60,np=avg<=50?2:avg<=90?3:4;
      let room=cap,t=0,chg=n;while(room>0&&t<36000){if(chg<np){t+=h.reload;chg=n}chg-=np;const ok=Math.pow(PERF.p,np),take=Math.min(room/mm,ok*avg+(1-ok)*np*h.k*BL_REL.on);t+=np*PERF.aim+DET+take/coll;room-=take*mm}
      tFill=t}
    const belt=(s.belts||[]).length?s.belts.reduce((a,b)=>a+Math.hypot(b.x,b.y,b.z),0)/s.belts.length:2500;
    const tr=j?2*((GATE*2+(j-1)*XG)/spd+j*JUMP):2*belt/spd;const T=tFill+tr+DOCK;
    const v=sellVal(R,load),rate=v*3600/T;if(rate>best){best=rate;bd={at:sid,field:d.id,j,load,T:Math.round(T),v}}}}
  out[cls]={rate:Math.round(best),bd}}
 return JSON.stringify(out)})()"""
PERF=os.environ.get('PERFECT','')   # e.g. PERFECT=10,.85 : seconds to line up each charge, chance each lands on point
SNAP=SNAP.replace('__PERF__','null' if not PERF else '{aim:%s,p:%s}'%tuple(PERF.split(',')))
async def main():
  res={}
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    for g in range(G):
      pg=await b.new_page();await pg.add_init_script('(()=>{let a=%d*7919+13;Math.random=function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}})()'%(g+1))
      await pg.goto('file://'+PAGE+'?name=Tester');await pg.wait_for_function('window.__dg&&__dg.ev("MDL.ready")',timeout=60000)
      await pg.evaluate("document.getElementById('bLaunch').click()");await pg.wait_for_timeout(800)
      ev=lambda c:pg.evaluate('c=>__dg.ev(c)',c)
      await ev("(()=>{galaxyWon=()=>{};running=false;exitSector();W=null;return 1})()")
      for t in (20,40,60):
        await ev(f"(()=>{{while(S.T<{t}*60){{S.T+=10;strategicTick();updateEvents()}}return 1}})()")
        r=json.loads(await ev(SNAP))
        for k,v in r.items():res.setdefault(k,[]).append(v['rate'])
        print(g,t,{k:v['rate'] for k,v in r.items()},flush=True)
      await pg.close()
    await b.close()
  print('MEDIAN',{k:round(st.median(v)) for k,v in res.items()},'targets skiff 12k prospector 15.6k dredger 20k')
asyncio.run(main())
