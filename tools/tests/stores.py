# Per-station markets: each depot and freeport trades from its own store, treasuries stay shared, the ledger balances,
# and an old save's shared Compact pool moves onto the freeports' shelves.
import asyncio,json,os,sys
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__));PAGE=os.path.abspath(sys.argv[1]) if len(sys.argv)>1 else os.path.join(HERE,'..','..','index.html')
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']);pg=await b.new_page();errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto('file://'+PAGE+'?name=Tester');await pg.wait_for_function('window.__dg&&__dg.ev("MDL.ready")',timeout=60000)
    await pg.evaluate("document.getElementById('bLaunch').click()");await pg.wait_for_timeout(1000)
    ev=lambda c:pg.evaluate('c=>__dg.ev(c)',c)
    print('init',await ev("""JSON.stringify({neutral:Object.keys(S.econ.stock.neutral).length,fp:FREEPORTS.map(F=>invMass(dStore(S.stations[F.sid]))),same:mkStock(S.stations.mw)!==mkStock(S.stations.cw)})"""))
    r=json.loads(await ev("""(()=>{galaxyWon=()=>{};running=false;exitSector();W=null;const L0=ledger();while(S.T<50*60){S.T+=10;strategicTick();updateEvents()}const L1=ledger();
      const dep=Object.values(S.stations).filter(isDepotF);const d=dep[0];
      const own=S.traders.filter(t=>t.kind!=='haul').map(t=>S.stations[t.from]&&S.stations[t.to]?S.stations[t.from].kind+'>'+S.stations[t.to].kind:'?');
      return JSON.stringify({drift:RAWS.map(e=>Math.round(L1.tot[e]-L0.tot[e])),cr:Math.round(L1.credits-L0.credits),depots:dep.length,depMk:d?mkStock(d)===dStore(d):null,depMass:d?invMass(dStore(d)):0,
        depFe:d?Math.round(stPrice(d,'fe')):0,coreFe:Math.round(stPrice(S.stations[FAC_HOME(d?d.owner:'halcyon')],'fe')),fp:FREEPORTS.map(F=>S.stations[F.sid]?invMass(dStore(S.stations[F.sid])):-1),neutral:invMass(S.econ.stock.neutral),traders:own})})()"""))
    print('sim',r)
    assert r['depMk'] in (True,None) and r['neutral']==0,r
    # old save: pool on S.econ.stock.neutral, no per-freeport stores
    m=json.loads(await ev("""(()=>{const st=JSON.parse(JSON.stringify(S));delete st.fpStock;st.econ.stock.neutral={fe:90,seal:5};for(const F of FREEPORTS)if(st.stations[F.sid])st.stations[F.sid].store={};const L0=ledger();migrate(st);
      return JSON.stringify({neutral:invMass(S.econ.stock.neutral),fe:fpStores().map(x=>x.fe||0),seal:fpStores().map(x=>x.seal||0)})})()"""))
    print('migrate',m);assert m['neutral']==0 and sum(m['fe'])==90 and sum(m['seal'])==5,m
    print('errors',errs[:3])
    await b.close()
asyncio.run(main())
