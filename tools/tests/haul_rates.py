# Hauling balance: a trade bot per hauler hull runs real trades (mBuy/mSell/lotCap, fees, local price moves, treasuries) in a
# live simulated galaxy for an hour of game time, choosing the best run it can see from wherever it docked. Travel time is
# modelled (gate distances, jumps, docking). Targets an hour, Mk I: Light 15.6k, Medium 19.9k, Heavy 25.2k.
# usage: python3 tools/tests/haul_rates.py [index.html] [galaxies]
import asyncio,json,sys,os,statistics as st
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__))
PAGE=os.path.abspath(sys.argv[1]) if len(sys.argv)>1 else os.path.join(HERE,'..','..','index.html')
G=int(sys.argv[2]) if len(sys.argv)>2 else 3
TUNE=sys.argv[3] if len(sys.argv)>3 else ''   # optional JS run in game scope first, e.g. "MK_SC.depot=.5"
BOT=r"""((cls,mins)=>{const P=S.player,f=P.faction;P.cls=cls;const sts=shipStats(f,cls,P.tiers),cap=sts.cargo,spd=sts.maxSpd;
 const DOCK=40,JUMP=10,GATE=4500,XG=6500,EXTRA=45;const legT=j=>j?(GATE*2+(j-1)*XG)/spd+j*JUMP+DOCK+EXTRA:DOCK+EXTRA;
 const ok=R=>R&&R.kind!=='hive'&&(R.owner===f||R.owner==='neutral');
 const ctx=R=>({kind:'station',market:mkStock(R),wallet:R.owner,owner:R.owner});
 const at=(sid,fn)=>{const o=P.sector;P.sector=sid;try{return fn()}finally{P.sector=o}};
 const canBuy=(R,k)=>ITEMS[k]&&!MUNITIONS.has(k)&&!(FP_ONLY.has(k)&&R.owner!=='neutral');const canSell=(R,k)=>!(k==='matrix'&&R.owner!=='neutral');
 // plan a fill from A for B: lot by lot, best margin per tonne first; mutates (call inside a snapshot to only look)
 function fill(A,B,doSell){const cA=ctx(A),cB=ctx(B);let room=cap,profit=0,cost=0;const load={};
  for(let g=0;g<40&&room>0;g++){let best=null,bv=0;for(const k of TRADE_ITEMS){if(!canBuy(A,k)||!canSell(B,k)||!(cA.market[k]>0))continue;const m=mass(k);if(m>room)continue;
     const b=at(A.sid,()=>mBuy(cA,k)),s=at(B.sid,()=>mSell(cB,k));const v=(s-b)/m;if(v>bv){bv=v;best={k,b,s,m}}}
   if(!best)break;const{k,b,m}=best;let n=Math.min(cA.market[k],Math.floor(room/m),Math.floor((P.credits-cost)/b));n=at(A.sid,()=>lotCap(cA,k,-1,n));if(doSell)n=Math.min(n,at(B.sid,()=>lotCap(cB,k,1,n)));if(n<1)break;
   inv.take(cA.market,k,n);mkOf(A)[k]=(A.mk[k]||0)-n*pMk();cost+=b*n;load[k]=(load[k]||0)+n;room-=n*m;
   if(doSell){inv.add(cB.market,k,n);mkOf(B)[k]=(B.mk[k]||0)+n*pMk();profit+=(best.s-b)*n}}
  return{load,cost,profit}}
 function snap(R){return{st:JSON.stringify(mkStock(R)),mk:JSON.stringify(mkOf(R))}}
 function restore(R,s){const st=mkStock(R);for(const k of Object.keys(st))delete st[k];Object.assign(st,JSON.parse(s.st));R.mk=JSON.parse(s.mk)}
 function look(A,B){const sa=snap(A),sb=snap(B);const r=fill(A,B,true);restore(A,sa);restore(B,sb);return r.profit}
 function sell(B,load){const c=ctx(B);let earn=0;for(const k in load){let left=load[k];for(let g=0;g<30&&left>0;g++){const pr=at(B.sid,()=>mSell(c,k));let n=at(B.sid,()=>lotCap(c,k,1,left));n=Math.min(n,Math.floor((S.econ.treasury[B.owner]||0)/pr));if(n<1)break;
   inv.add(c.market,k,n);mkOf(B)[k]=(B.mk[k]||0)+n*pMk();transfer(B.owner,'player',pr*n);earn+=pr*n;left-=n}if(left>0)inv.add(c.market,k,left)}return earn}
 function adv(t){const end=S.T+t;while(S.T<end){S.T+=10;strategicTick();updateEvents()}}
 let here=FAC_HOME(f),T0=S.T,c0=P.credits,trips=0,legs=[];P.credits=Math.max(P.credits,20000);c0=P.credits;
 while(S.T-T0<mins*60){const A=S.stations[here];if(!ok(A)){if(here===FAC_HOME(f))break;here=FAC_HOME(f);continue}
  let best=null;for(const sid in S.stations){const B=S.stations[sid];if(!ok(B)||sid===here)continue;const j=HOP[here][sid]||0;if(j<1||j>3)continue;const p=look(A,B),t=legT(j);if(!best||p/t>best.r)best={B,j,p,r:p/t}}
  if(!best||best.p<=0){adv(60);continue}
  const sb=snap(best.B),r=fill(A,best.B,true);restore(best.B,sb);transfer('player',A.owner,r.cost);adv(legT(best.j));const B=S.stations[best.B.sid];let earn=0;if(B&&ok(B))earn=sell(B,r.load);else{here=FAC_HOME(f);continue}
  legs.push({from:here,to:best.B.sid,j:best.j,plan:Math.round(r.profit),net:earn-r.cost,goods:JSON.stringify(r.load)});here=best.B.sid;trips++}
 const hrs=(S.T-T0)/3600;return{cls,perHour:Math.round((P.credits-c0)/hrs),trips,legs,kinds:legs.reduce((o,l)=>{const a=S.stations[l.from],b=S.stations[l.to],key=(a?a.kind:'?')+'>'+(b?b.kind:'?');o[key]=(o[key]||0)+1;return o},{})}})"""
async def one(p,g,cls):
  b=await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  try:
    pg=await b.new_page();errs=[]
    await pg.add_init_script('(()=>{let a=%d*7919+13;Math.random=function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}})()'%(g+1));pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('dialog',lambda d:asyncio.ensure_future(d.dismiss()))
    await pg.goto('file://'+PAGE+'?name=Tester');await pg.wait_for_function('window.__dg&&__dg.ev("MDL.ready")',timeout=60000)
    await pg.evaluate("document.getElementById('bLaunch').click()");await pg.wait_for_timeout(800)
    ev=lambda c:pg.evaluate('c=>__dg.ev(c)',c)
    if TUNE:await ev(TUNE+';1')
    await ev("(()=>{galaxyWon=()=>{};running=false;exitSector();W=null;while(S.T<20*60){S.T+=10;strategicTick();updateEvents()}return 1})()")
    r=json.loads(await ev(f"JSON.stringify({BOT}('{cls}',60))"));r['errs']=errs[:2];return r
  finally:
    await b.close()
async def main():
  res={}
  async with async_playwright() as p:
    for g in range(G):
      for cls in ['courier','freighter','bulker']:
        try:r=await asyncio.wait_for(one(p,g,cls),900)
        except Exception as e:print(g,cls,'FAILED',type(e).__name__,str(e)[:200],flush=True);continue
        res.setdefault(cls,[]).append(r['perHour'])
        print(g,cls,r['perHour'],'trips',r['trips'],r['kinds'],r['errs'],flush=True)
        if os.environ.get('LEGS'):[print('   ',l) for l in r['legs']]
  print('MEDIAN',{k:round(st.median(v)) for k,v in res.items()},'targets courier 15.6k freighter 19.9k bulker 25.2k')
asyncio.run(main())
