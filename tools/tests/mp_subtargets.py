# usage: python3 tools/tests/mp_subtargets.py index.html  (needs Playwright with Chromium)
# sub-targets over the loopback link: a hostile escort's systems damaged on the host reach the guest (token sync), the
# guest's Shift+T, systems panel, lead point and HUD markers work, and a guest's shots disable a part on the host
import asyncio,json,sys
from playwright.async_api import async_playwright
FILE=sys.argv[1]
LINK=r"""(to)=>{window.__mk=(peer,fn)=>({peer,open:true,dead:false,parts:{},n:'',r:{readyState:'open',send:s=>fn(s)},u:{readyState:'open',send:s=>fn(s)},pc:{close(){},connectionState:'connected'}});return 1}"""
async def boot(ctx,name,errs):
  pg=await ctx.new_page();pg.on('pageerror',lambda e:errs.append(name+': '+str(e.stack)[:500]))
  pg.on('console',lambda m:errs.append(name+' console: '+m.text[:400]) if m.type in ('error','warning') and 'TUNNEL' not in m.text and 'fonts' not in m.text else None)
  await pg.goto('file://'+FILE+'?name='+name,timeout=400000);await pg.wait_for_function('window.__dg&&__dg.ev("MDL.ready")',timeout=400000)
  await pg.evaluate("c=>__dg.ev(c)",f"(()=>{{$('mpName').value='{name}';legGrant('{name}','halcyon',true,'interceptor',null);return 1}})()")
  return pg
async def ev(pg,code):
  return await pg.evaluate("c=>__dg.ev(c)",code)
async def main():
  errs=[]
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows'])
    H=await boot(await b.new_context(viewport={'width':1200,'height':800}),'Hosty',errs);C=await boot(await b.new_context(viewport={'width':1200,'height':800}),'Clie',errs)
    async def toC(s):
      try:await C.evaluate("d=>{if(window.MPHOST_READY)__dg.ev('linkRecv(MP.host,'+JSON.stringify(d)+')')}",s)
      except Exception as e:errs.append('relay->C '+str(e)[:200])
    async def toH(s):
      try:await H.evaluate("d=>__dg.ev('linkRecv(window.__HL,'+JSON.stringify(d)+')')",s)
      except Exception as e:errs.append('relay->H '+str(e)[:200])
    await H.expose_function('__toClient',toC);await C.expose_function('__toHost',toH)
    await H.evaluate(LINK);await C.evaluate(LINK)
    print('host:',await ev(H,"(()=>{MP.pid='hostpid1';MP.name='Hosty';MP.code='crew';MP.cl={};MP.rp={};MP.inp={};MP.roster=[];hostBegin(false);selFac='halcyon';mpLaunch('halcyon','interceptor');window.__HL=__mk('cli',s=>__toClient(s));return JSON.stringify({unb:!!S.unb,fac:S.player.faction,host:NET.host})})()"))
    await H.wait_for_timeout(1500)
    await ev(C,"(()=>{NET.on=true;NET.cl=true;NET.host=false;MP.pid='clipid1';NET.me=MP.pid;MP.name='Clie';MP.code='crew';MP.roster=[];MP.host=__mk('host',s=>__toHost(s));window.MPHOST_READY=1;linkUp(MP.host);return 1})()")
    await C.wait_for_timeout(2500)
    await ev(C,"(()=>{selFac='halcyon';mpLaunch('halcyon','interceptor');return 1})()");await C.wait_for_timeout(4000)
    print('guest joined:',await ev(C,"(()=>JSON.stringify({running,fac:S.player.faction,cls:S.player.cls,sector:S.player.sector,docked:S.player.docked}))()"))
    print('guest sector:',await ev(C,"S.player.sector+' docked '+S.player.docked"))
    await ev(C,"(()=>{undock();return 1})()");await C.wait_for_timeout(3000)
    print('spawn:',await ev(H,"""(()=>{const P=S.pilots.clipid1,w=WORLDS[P.sector];let msg;inW(w,()=>{const en='varkesh';msg=devEnemyFrig(en,false,true);const e=W.ents.find(x=>x.role==='frigate'&&x.side===en&&x.alive);const SE=W.stationEnt;e.x=SE.x+7000;e.y=SE.y;e.z=SE.z;e.vx=e.vy=e.vz=0;e.shield=0;e.lastHit=W.t;
      const t=e.tok;subInit(t);t.sub.pd[1]=0;t.sub.eng=500;window._HE=e;const g=MP.rp.clipid1;if(g){g.x=e.x+250;g.y=e.y+120;g.z=e.z;g.vx=g.vy=g.vz=0}});return msg+' '+_HE.tok.name})()"""))
    await H.wait_for_timeout(7000)
    print('guest shoots turret 3 (host simulates):',await ev(H,"""(()=>{const P=S.pilots.clipid1,w=WORLDS[P.sector],g=MP.rp.clipid1;let r;inW(w,()=>{const e=_HE;for(let j=0;j<40;j++){e.shield=0;e.lastHit=W.t;const s=subWorldPts(e).find(q=>q.k==='pd'&&q.i===3);const ox=s.x-e.x,oy=s.y-e.y,oz=s.z-e.z,ol=Math.hypot(ox,oy,oz);const o={x:s.x+ox/ol*300,y:s.y+oy/ol*300+60,z:s.z+oz/ol*300};const dx=s.x-o.x,dy=s.y-o.y,dz=s.z-o.z,l=Math.hypot(dx,dy,dz);
      W.shots.push({x:o.x,y:o.y,z:o.z,vx:dx/l*SHOT_SPD,vy:dy/l*SHOT_SPD,vz:dz/l*SHOT_SPD,dmg:10,side:g.side,src:g,ttl:SHOT_TTL,col:'#fff'});for(let q=0;q<12;q++)worldUpdate(.025)}r=JSON.stringify(e.tok.sub.pd)});return r})()"""))
    await H.wait_for_timeout(7000)
    for k in range(20):
      if await ev(C,"(S.frigates||[]).some(x=>x.side==='varkesh'&&x.cls==='escort'&&x.sub&&x.sub.pd[3]<300)"):break
      await C.wait_for_timeout(1500)
    print('guest sees:',await ev(C,"(()=>{const t=(S.frigates||[]).find(x=>x.side==='varkesh'&&x.cls==='escort');return JSON.stringify({pd:t&&t.sub&&t.sub.pd,summary:t&&subSummary(t)})})()"))
    for k in range(20):   # headless game time runs slowly: wait for the 5 s state sync to carry the token down
      if await ev(C,"(S.frigates||[]).some(x=>x.side==='varkesh'&&x.cls==='escort'&&x.sub)"):break
      await C.wait_for_timeout(1500)
    print('guest view:',await ev(C,"""(()=>{const t=(S.frigates||[]).find(x=>x.side==='varkesh'&&x.cls==='escort');const e=W&&W.ents.find(x=>x.role==='frigate'&&x.side==='varkesh');if(!t||!e)return 'no escort on guest '+!!t+' '+!!e+' frigs '+(S.frigates||[]).map(x=>x.side+x.cls+x.id)+' etok '+(e&&e.tokId);e.shield=0;W.tgt={kind:'ship',ref:e};subCycle();
      const aim=subAim(),c=document.createElement('canvas').getContext('2d');let hud='ok';try{subHud(c,W.player)}catch(x){hud=x.message}return JSON.stringify({sub:t.sub,pts:subLocal(e).length,pick:W.tsub&&W.tsub.k+W.tsub.i,aim:!!aim,hud,panel:subPanel(e).replace(/<[^>]+>/g,' ').replace(/[ ]+/g,' ')})})()"""))
    print('ledger:',await ev(H,"(()=>{const l=ledger();let b=[];for(const e of RAWS)if(Math.abs(l.tot[e]-S.ledger0.tot[e])>1e-6)b.push(e+':'+(l.tot[e]-S.ledger0.tot[e]).toFixed(1));return b.length?'DRIFT '+b:'exact'})()"))
    print('errors',errs[:6]);await b.close()
asyncio.run(main())
