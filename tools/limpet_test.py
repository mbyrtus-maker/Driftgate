# scout limpet: plant on a pass, +25% for the planter's side, turrets can't touch it, fighters shoot it off, warnings, rearm;
# drones go dark with a jammed mother ship
import asyncio,json
from playwright.async_api import async_playwright
D='/tmp/claude-0/-home-claude/e4eb29fe-538d-5f56-aa4d-b952797c2573/scratchpad/'
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']);pg=await b.new_page(viewport={'width':1400,'height':860});errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto('file://'+D+'driftgate.html?name=Tester',wait_until='domcontentloaded');await pg.wait_for_function('window.__dg&&__dg.ev("MDL.ready")',timeout=60000)
    await pg.evaluate("document.getElementById('mpName').value='Tester'");await pg.evaluate("document.getElementById('bLaunch').click()");await pg.wait_for_timeout(1500)
    ev=lambda c:pg.evaluate('c=>__dg.ev(c)',c)
    print('setup',await ev("""(()=>{if(S.player.docked)undock();S.player.cls='scout';refreshPlayerStats();const foe=FAC_IDS.find(f=>hostile(S.player.faction,f));
      const t=makeEscort(foe,W.sid,{});t.dummy=true;const E=W.ents.find(x=>x.tok===t);const p=W.player;qRot(p.q,0,0,1,_f);E.x=p.x+_f.x*900;E.y=p.y;E.z=p.z+_f.z*900;
      W.tgt={kind:'ship',ref:E};window._E=E;window._foe=foe;hudUpdate();return JSON.stringify({foe,r:E.st.radius,surf:Math.round(lpSurf(E,p)),chip:limpetChip(),strip:document.getElementById('hKeysNow').innerText.replace(/\\n/g,' ')})})()"""))
    # fly past: hold F while closing at speed; progress keeps while in range
    for i in range(60):
      r=await ev("""(()=>{const E=_E,p=W.player;let dx=E.x-p.x,dy=E.y-p.y,dz=E.z-p.z;const d=hyp(dx,dy,dz);faceInstant(p,dx,dy,dz);p.vx=dx/d*250;p.vy=dy/d*250;p.vz=dz/d*250;keys.KeyF=true;
        return JSON.stringify({surf:Math.round(lpSurf(E,p)),t:+(W.lpF?W.lpF.t:0).toFixed(2),on:capPinged(E.tok,S.player.faction)})})()""")
      if json.loads(r)['on']:print('planted',r);break
      await pg.wait_for_timeout(250)
    else: print('NOT PLANTED',r)
    await ev("keys.KeyF=false")
    print('after plant',await ev("""(()=>{const E=_E,L=W.ents.find(x=>x.role==='limpet'&&x.lh===E);hudUpdate();return JSON.stringify({used:S.player.limpetUsed,limpet:!!L,onHull:L?Math.round(d3(L,E)):null,
      r:Math.round(E.st.radius),kMe:limpetK(E.tok,'player'),kFoe:limpetK(E.tok,_foe),chip:limpetChip(),label:L?shipLabel(L):'',kind:L?tgtKind(L):''})})()"""))
    print('second try',await ev("(()=>{let f='';const o=flash;flash=m=>{f=m};W.lpF.h=false;limpetHold(true,.1);flash=o;return f})()"))
    print('damage',await ev("""(()=>{const E=_E;E.tok.dummy=false;E.shield=0;const h=E.hull;damageShip(E,100,'player',null,'kinetic');const a=h-E.hull;const h2=E.hull;damageShip(E,100,'pirate',null,'kinetic');return JSON.stringify({mine:Math.round(a),other:Math.round(h2-E.hull)})})()"""))
    print('turret shot',await ev("""(()=>{const L=W.ents.find(x=>x.role==='limpet');const h=L.hull;W.shots.push({x:L.x-20,y:L.y,z:L.z,vx:2000,vy:0,vz:0,dmg:10,side:_foe,src:null,ttl:1,sty:'turret'});shotsUpdate(.02);
      const a=L.hull;W.shots.push({x:L.x-20,y:L.y,z:L.z,vx:2000,vy:0,vz:0,dmg:10,side:_foe,src:null,ttl:1});shotsUpdate(.02);return JSON.stringify({start:h,afterTurret:a,afterFighter:L.hull})})()"""))
    print('pd ignores',await ev("""(()=>{const E=_E;let tgt=[];const o=turretShot;turretShot=(wp,t,...r)=>{tgt.push(t.role||t.kind);return{x:0,y:0,z:1}};E.turrets.forEach(t=>t.cool=0);frigTurrets(E,.1);turretShot=o;return JSON.stringify(tgt)})()"""))
    print('ai',await ev("""(()=>{const L=W.ents.find(x=>x.role==='limpet');const e=makeNPC('patrol',_foe,'interceptor',1,{},'x');e.x=L.x+300;e.y=L.y;e.z=L.z;W.ents.push(e);const t=findHostile(e,1500);const i=W.ents.indexOf(e);W.ents.splice(i,1);return t?t.role||t.cls:'none'})()"""))
    print('shot off',await ev("""(()=>{const L=W.ents.find(x=>x.role==='limpet');const fd=[];const of=feed;feed=(m,k)=>{fd.push(m);of(m,k)};damageShip(L,200,_foe,null,'kinetic');feed=of;
      return JSON.stringify({gone:!W.ents.includes(L),tag:capPinged(_E.tok,S.player.faction),feeds:fd})})()"""))
    print('resync',await ev("""(()=>{_E.tok.pings={[S.player.faction]:{by:'me',until:S.T+100}};W.lpT=0;limpetSync(1);return W.ents.filter(x=>x.role==='limpet').length})()"""))
    print('warning to us',await ev("""(()=>{const t=makeCarrier(S.player.faction,W.sid,{});t.owner='me';const F=W.ents.find(x=>x.tok===t);const fd=[],fl=[];const of=feed,ofl=flash;feed=(m,k)=>{fd.push(m)};flash=(m,a)=>{fl.push(m+(a?' [alert]':''))};
      const ok=limpetPlant(F,_foe,null,null);feed=of;flash=ofl;delete t.owner;return JSON.stringify({ok,fd,fl,k:limpetK(t,_foe)})})()"""))
    print('station',await ev("""(()=>{const SE=W.stationEnt;const ok=limpetPlant(SE,_foe,null,{x:SE.x+500,y:SE.y,z:SE.z});const L=W.ents.find(x=>x.role==='limpet'&&x.lh===SE);return JSON.stringify({ok,k:limpetK(SE.rec,_foe),limpet:!!L,d:L?Math.round(d3(L,SE)):null})})()"""))
    print('rearm',await ev("(()=>{S.player.docked='station';playerUpdate(.016);const u=S.player.limpetUsed;S.player.docked=null;return u})()"))
    print('drones dark',await ev("""(()=>{const h=makeNPC('hauler',S.player.faction,'courier',1,{drone:2},'x');const p=W.player;h.x=p.x;h.y=p.y;h.z=p.z+400;W.ents.push(h);deployDrones(h);let n=0;const o=droneThink;droneThink=(e,dt)=>{n++;o(e,dt)};
      for(const d of h.drones)npcThink(d,.05);const live=n;n=0;h.jamOff=W.t+10;for(const d of h.drones)npcThink(d,.05);droneThink=o;return JSON.stringify({drones:h.drones.length,thinkLive:live,thinkJammed:n})})()"""))
    await ev("W.tgt={kind:'ship',ref:_E};hudUpdate()");await pg.screenshot(path=D+'limpet.png')
    print('errors',errs[:3]);await b.close()
asyncio.run(main())
