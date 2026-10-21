# usage: python3 tools/mp_loopback.py index.html shot.png  (needs Playwright with Chromium)
# loopback multiplayer harness: two pages, links faked over Playwright, the real host/client game code on both ends
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
    # the host creates an Unbound crew galaxy
    print('host:',await ev(H,"(()=>{MP.pid='hostpid1';MP.name='Hosty';MP.code='crew';MP.cl={};MP.rp={};MP.inp={};MP.roster=[];hostBegin(false);selFac='pirate';mpLaunch('pirate','raider');window.__HL=__mk('cli',s=>__toClient(s));return JSON.stringify({unb:S.unb,fac:S.player.faction,cls:S.player.cls,host:NET.host})})()"))
    await H.wait_for_timeout(1500)
    # the client dials in
    print('client:',await ev(C,"(()=>{NET.on=true;NET.cl=true;NET.host=false;MP.pid='clipid1';NET.me=MP.pid;MP.name='Clie';MP.code='crew';MP.roster=[];MP.host=__mk('host',s=>__toHost(s));window.MPHOST_READY=1;linkUp(MP.host);return 1})()"))
    await C.wait_for_timeout(2500)
    print('client start screen:',await ev(C,"(()=>JSON.stringify({needPilot:MP.needPilot,selFac,roster:MP.roster.map(r=>r[2]),card:document.querySelector('[data-fac=\"pirate\"]').innerText.slice(0,120)}))()"))
    await ev(C,"(()=>{mpLaunch('pirate','raider');return 1})()");await C.wait_for_timeout(4000)
    print('client joined:',await ev(C,"(()=>JSON.stringify({running,unb:S&&S.unb,fac:S&&S.player&&S.player.faction,cls:S&&S.player&&S.player.cls,sector:S&&S.player&&S.player.sector,docked:S&&S.player&&S.player.docked}))()"))
    print('host sees:',await ev(H,"(()=>JSON.stringify(Object.values(S.pilots).map(P=>[P.name,P.faction,P.cls,P.sector,P.docked])))()"))
    # client undocks and flies 4 km out
    await ev(C,"(()=>{undock();const p=W.player;p.x+=4000;p.y+=400;p.z+=3500;p.vx=p.vy=p.vz=0;return 1})()");await C.wait_for_timeout(2500)
    print('host ent:',await ev(H,"(()=>{const e=MP.rp['clipid1'];return e?JSON.stringify([e.side,Math.round(e.x),Math.round(e.z)]):'none'})()"))
    # a Halcyon freighter beside the guest; the host jams it dark
    print('mark:',await ev(H,"(()=>{const e=MP.rp['clipid1'],w=worldOf(e);return inW(w,()=>{W.popT=1e9;for(const x of W.ents.slice())if(x.npc&&d3(x,e)<6000)despawn(x);const h=makeNPC('hauler','halcyon','freighter',1,{},'stock:halcyon');h.x=e.x+80;h.y=e.y;h.z=e.z+30;h.vx=h.vy=h.vz=0;h.ai.dest=GATES[W.sid][0];W.ents.push(h);devLedger(()=>{inv.addAll(h.cargo,{plate:10,coil:6,wire:8})});h.shield=0;for(let i=0;i<300&&!jamDark(h);i++)jamHit(h,{side:'pirate',dmg:10,x:h.x,y:h.y,z:h.z,src:e});window.__h=h;return JSON.stringify({id:h.id,dark:jamDark(h)})})})()"))
    await C.wait_for_timeout(1500)
    # the guest: jam mode, target the dark freighter, hold E
    print('guest hook:',await ev(C,"(()=>{jamToggle();const T=W.ents.find(x=>x.side==='halcyon'&&x.role!=='frigate'&&d3(x,W.player)<600);if(!T)return 'no target seen';W.tgt={kind:'ship',ref:T};const ht=!!hookTarget();window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE'}));keys.KeyE=true;return JSON.stringify({seen:T.id,dark:jamDark(T),hookTarget:ht,hookOn:MP.hookOn})})()"))
    await C.wait_for_timeout(1500)
    print('host drive:',await ev(H,"(()=>{const e=MP.rp['clipid1'],w=worldOf(e);const P=S.pilots['clipid1'],c0=invMass(P.cargo);inW(w,()=>{for(let i=0;i<30*3;i++){worldUpdate(1/30);S.T+=1/30}});return JSON.stringify({moved:invMass(P.cargo)-c0,stolen:invMass(P.stolen||{}),hook:MP.hook&&MP.hook.clipid1})})()"))
    await ev(C,"(()=>{keys.KeyE=false;window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyE'}));return 1})()")
    print('host after hook:',await ev(H,"(()=>{const P=S.pilots['clipid1'],e=MP.rp['clipid1'];return JSON.stringify({jamMode:e&&e.jamMode,cargo:invMass(P.cargo),stolen:invMass(P.stolen||{}),hookMsg:(MP.hook||{})['clipid1']})})()"))
    print('host window:',await ev(H,"(()=>{const e=MP.rp['clipid1'],w=worldOf(e);inW(w,()=>{for(let i=0;i<30*12;i++){worldUpdate(1/30);S.T+=1/30}});return 1})()"))
    print('after window:',await ev(H,"(()=>{const P=S.pilots['clipid1'];return JSON.stringify({heat:P.heat,inf:P.inf,deeds:(P.deeds||[]).map(d=>d.k)})})()"))
    # false colours from the guest
    await ev(C,"(()=>{xpdrToggle();return 1})()");await C.wait_for_timeout(1200)
    print('guest cover:',await ev(H,"(()=>{const P=S.pilots['clipid1'];return JSON.stringify({xpdr:P.xpdr,coverHal:unbCoverP(P,'halcyon'),coverOst:unbCoverP(P,'ostrova')})})()"))
    # client HUD state from the host's pilot record
    print('client sees:',await ev(C,"(()=>JSON.stringify({heat:S.player.heat,inf:S.player.inf,stolen:invMass(S.player.stolen||{}),xpdr:S.player.xpdr}))()"))
    # ledger on the host
    print('ledger:',await ev(H,"(()=>{const l=ledger();let bad=0;for(const e of RAWS)if(Math.abs(l.tot[e]-S.ledger0.tot[e])>1e-6)bad=1;return bad?'DRIFT':'exact'})()"))
    # the end: legend points for both
    await ev(H,"(()=>{const P=S.pilots['clipid1'];P.inf=300;P.deeds=[{k:'three',t:10,sid:'wr'}];S.player.inf=10;galaxyWon('halcyon','hold');return 1})()");await C.wait_for_timeout(2500)
    print('legend host:',await ev(H,"(()=>JSON.stringify(legPeek('Hosty')))()"))
    print('legend client:',await ev(C,"(()=>JSON.stringify(legPeek('Clie')))()"))
    print('debrief:',await ev(H,"(()=>document.getElementById('winP').innerText.slice(-300))()"))
    await C.screenshot(path=sys.argv[2])
    print('errors:',errs[:10]);await b.close()
asyncio.run(main())
