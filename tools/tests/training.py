import asyncio,json,json,time
import os
from playwright.async_api import async_playwright
import os,tempfile
# the game under test: index.html at the repo root, or a file named in DG_GAME; screenshots go to DG_OUT (default: temp dir)
GAME='file://'+os.path.abspath(os.environ.get('DG_GAME',os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','index.html')))
D=os.path.join(os.environ.get('DG_OUT',tempfile.gettempdir()),'')
# Helpers evaluated once in the game closure (__dg.ev is a direct eval, so these see the game's own functions).
# Every action below is re-run each poll until the step advances, so each one is guarded to be safe to repeat.
HELP=r"""window.H={
 // a real key press through the game's own keydown/keyup listeners
 key(code){dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true}));dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true}));return code},
 // Tab until the wanted kind of target is selected (cycleTarget is what Tab calls)
 tab(kind){for(let i=0;i<60&&!(W.tgt&&W.tgt.kind===kind);i++)cycleTarget();return W.tgt&&W.tgt.kind},
 // fly toward a point: nose on it, speed proportional to the distance left (re-issued every poll, so it eases in).
 // As with ap() below, a leg longer than 400 m is cut short to its last 300 m (the game clock runs slowly under swiftshader).
 fly(pt,stop){const p=W.player;let dx=pt.x-p.x,dy=pt.y-p.y,dz=pt.z-p.z,d=hyp(dx,dy,dz)||1;apOn=false;
  if(d-(stop||0)>400){const k=(d-(stop||0)-300)/d;p.x+=dx*k;p.y+=dy*k;p.z+=dz*k;dx=pt.x-p.x;dy=pt.y-p.y;dz=pt.z-p.z;d=hyp(dx,dy,dz)||1}faceInstant(p,dx,dy,dz);
  const sp=Math.max(0,Math.min(p.st.maxSpd,(d-(stop||0))*1.5));p.vx=dx/d*sp+(pt.vx||0);p.vy=dy/d*sp+(pt.vy||0);p.vz=dz/d*sp+(pt.vz||0);return Math.round(d)},
 // autopilot (J) to the current target. Under swiftshader the game runs at a fraction of real time, so a long leg is cut short by
 // moving the ship to 150 m before the autopilot's approach point; the real autopilot then flies the last stretch and stops.
 ap(){const T=apTarget();if(!T)return'no target';if(!apOn)H.key('KeyJ');const R=T.ref,p=W.player;
  const stand=T.kind==='station'||T.kind==='outpost'?230:T.kind==='ast'?astR(R)+140:T.kind==='ship'?180:T.kind==='beacon'?90:0;
  const dx=R.x-p.x,dy=R.y-p.y,dz=R.z-p.z,d=hyp(dx,dy,dz)||1;
  if(d-stand>400){p.x=R.x-dx/d*(stand+150);p.y=R.y-dy/d*(stand+150);p.z=R.z-dz/d*(stand+150);p.vx=(R.vx||0)+dx/d*60;p.vy=(R.vy||0)+dy/d*60;p.vz=(R.vz||0)+dz/d*60;faceInstant(p,dx,dy,dz)}
  return'ap '+T.kind+' '+Math.round(d-stand)},
 // Tab to the station, J, and E once the autopilot has stopped in docking range
 dock(){if(S.player.docked||W.docking)return'docking';const p=W.player;if(dockTarget()&&!apOn&&hyp(p.vx,p.vy,p.vz)<180)return'E '+H.key('KeyE');H.tab('station');return H.ap()},
 // press a dock-screen button the way a click would
 btn(act,arg){const b=document.querySelector(`#dock [data-act="${act}"]`+(arg!=null?`[data-arg="${arg}"]`:''));if(!b)return'no button '+act+':'+arg;if(b.disabled)return'disabled '+act+':'+arg;b.click();return'clicked '+act+':'+arg},
 // open a dock tab: the group button (Economy / Construction / Hangar / Missions), then its sub-tab
 // the station screen: press the tab's number key (1-5), then click its view if the tab has several
 tab2(k){if(dockTab===k)return k;const i=DOCK_TOP.findIndex(g=>g[2].includes(k));if(i>=0)window.dispatchEvent(new KeyboardEvent('keydown',{code:'Digit'+(i+1)}));
  const sub=document.querySelector(`#dTabs .stab[data-arg="${k}"]`);if(sub&&dockTab!==k)sub.click();return dockTab},
 // weapons lesson: keep a training drone targeted (T, then Q), close in (W), hold Z to track the lead marker and Space to fire:
 // lasers (2) while its shield is up, cannons (1) on the bare hull
 tgt(){if(!(W.tgt&&W.tgt.kind==='ship'&&W.tgt.ref.alive&&W.tgt.ref.train)){H.key('KeyT');for(let i=0;i<10&&!(W.tgt&&W.tgt.ref&&W.tgt.ref.train);i++)H.key('KeyQ')}return W.tgt&&W.tgt.ref&&W.tgt.ref.train?'drone targeted':'no drone'},
 drone(msl){H.tgt();const e=W.tgt&&W.tgt.ref;if(e&&e.train){const w=e.shield>1?'laser':'kinetic';if(S.player.wpn!==w)H.key(w==='laser'?'Digit2':'Digit1');keys.KeyW=d3(e,W.player)>200;if(msl&&W.lock.locked)H.key('KeyC')}
  keys.KeyZ=keys.Space=true;return'firing ('+S.player.wpn+'), '+trDroneEnts().length+' drones'},
 // GAME BUG WORKAROUND: trMiner() swaps the hull to a Light Miner in flight, and blTick() then starts its blast magazine EMPTY on a
 // 90 s reload (blN was left at 0 by the previous non-mining hull), so "press F" only says "No charges left". Docking would fill it.
 mag(){const P=S.player;if(blCap(P)&&!(P.blN>0)&&!(S.sectors[W.sid].charges||[]).some(c=>c.o==='me')){const t=Math.ceil(P.blT||0);P.blN=blCap(P);P.blT=0;H.fixes.push('lesson '+S.training.i+': magazine empty, '+t+' s reload');return'[magazine was empty, '+t+' s reload: refilled] '}return''},
 fixes:[],
 // close in on the targeted rock below landing speed; once it is in reach, E lands
 land(){const p=W.player;if(p.landed)return'landed';if(!(W.tgt&&W.tgt.kind==='ast'))H.key('KeyR');const a=W.tgt.ref;
  if(landCandidate()&&hyp(p.vx,p.vy,p.vz)<LAND_SPD)return'E '+H.key('KeyE');
  const dx=p.x-a.x,dy=p.y-a.y,dz=p.z-a.z,d=hyp(dx,dy,dz)||1,r=astR(a)+p.st.radius+50;
  H.fly({x:a.x+dx/d*r,y:a.y+dy/d*r,z:a.z+dz/d*r},0);const v=hyp(p.vx,p.vy,p.vz),cap=d-r<150?60:p.st.maxSpd;if(v>cap){p.vx*=cap/v;p.vy*=cap/v;p.vz*=cap/v}return'approach '+Math.round(d-r)},
 // mining: fly to the targeted rock (J), then blast it
 mine(){const s=S.sectors[W.sid];if(!(W.tgt&&W.tgt.kind==='ast'))H.key('KeyR');let a=W.tgt&&W.tgt.ref;
  if(a&&blNearStation(a)){a=s.ast.filter(x=>!x.comet&&!blNearStation(x)).sort((x,y)=>d3(x,W.player)-d3(y,W.player))[0];W.tgt={kind:'ast',ref:a}}
  const busy=(s.clouds||[]).some(c=>c.chunk&&c.o==='me')||(s.charges||[]).some(c=>c.o==='me');
  if(!busy&&a&&d3(a,W.player)>astR(a)+500)return H.ap();return H.mag()+H.blast(a)},
 // salvage: Tab to the section to crack (never the reactor core), then blast it
 salv(){const T=H.salvPick();for(let i=0;i<60&&T&&!(W.tgt&&W.tgt.ref===T);i++)cycleTarget();return H.mag()+H.blast(T)},
 // the section to crack: not the core, and the one whose approach from outside the wreck passes clear of every other section
 salvPick(){const s=S.sectors[W.sid],w=(s.wrecks||[]).find(w=>w.name==='Training hulk')||(s.wrecks||[])[0];if(!w)return null;const all=w.pts.filter(p=>oreTotal(p)>0);let best=null,bc=-1;
  for(const T of all){if(T.k==='core')continue;const o=H.out(w,T),cl=Math.min(1e9,...all.filter(q=>q!==T).map(q=>H.segD(o,T,q)));if(cl>bc){bc=cl;best=T}}return best},
 out(w,T){let nx=T.x-w.x,ny=T.y-w.y,nz=T.z-w.z;const l=hyp(nx,ny,nz)||1;return{x:T.x+nx/l*(WPT_R+150),y:T.y+ny/l*(WPT_R+150),z:T.z+nz/l*(WPT_R+150)}},
 segD(a,b,q){const vx=b.x-a.x,vy=b.y-a.y,vz=b.z-a.z,L=vx*vx+vy*vy+vz*vz||1,t=Math.max(0,Math.min(1,((q.x-a.x)*vx+(q.y-a.y)*vy+(q.z-a.z)*vz)/L));return hyp(a.x+vx*t-q.x,a.y+vy*t-q.y,a.z+vz*t-q.z)},
 // blast mining, one stage per poll: line up on a fault point and fire a charge (F), back off past the blast radius and detonate (3),
 // then fly into the chunk to scoop it
 blast(T){const p=W.player,P=S.player,s=S.sectors[W.sid];
  const ch=(s.clouds||[]).filter(c=>c.chunk&&c.o==='me'&&oreTotal(c)>0).sort((a,b)=>d3(a,p)-d3(b,p))[0];
  if(ch){return'scoop '+H.fly(ch,0)}
  const mine=(s.charges||[]).filter(c=>c.o==='me');
  if(mine.length){const a=blTgt(s,mine[0]),R=astR(a),dx=p.x-a.x,dy=p.y-a.y,dz=p.z-a.z,d=hyp(dx,dy,dz)||1;
   if(d<R+150){H.fly({x:a.x+dx/d*(R+170),y:a.y+dy/d*(R+170),z:a.z+dz/d*(R+170)},0);return'backing off '+Math.round(d)}
   p.vx=p.vy=p.vz=0;H.key('Digit5');return'detonate ('+mine.map(c=>c.q)+')'}
  if(W.blShots&&W.blShots.length)return'charge in flight';
  if(!T)return'no target';
  // rock: 150 m out along the normal of the fault point nearest our side. Wreck section: from outside the wreck (its joint ring
  // faces the hull, behind the other sections), so the charge lands off point but well clear of the core
  const R=astR(T),pts=blPts(T);let fp=pts[0],bd=1e9;for(const q of pts){const d=d3(q,p);if(d<bd){bd=d;fp=q}}
  let at;if(T.wpt){at=H.out(wreckOf(s,T),T)}else{let nx=fp.x-T.x,ny=fp.y-T.y,nz=fp.z-T.z;const nl=hyp(nx,ny,nz)||1;at={x:T.x+nx/nl*(R+150),y:T.y+ny/nl*(R+150),z:T.z+nz/nl*(R+150)}}
  if(d3(p,at)>40){H.fly(at,0);return'lining up '+Math.round(d3(p,at))}
  p.vx=p.vy=p.vz=0;faceInstant(p,fp.x-p.x,fp.y-p.y,fp.z-p.z);
  if(!(P.blN>0))return'magazine empty ('+Math.ceil(P.blT||0)+' s)';
  blFire(p,P);return'fire (F)'},   // blFire is what a press of F calls (blPilotUpdate)
 // FAST-FORWARD (slow swiftshader clock): once the game itself has started a timer the lesson waits on, skip most of it and let
 // the game's own tick finish it: the beacon flip progress (beaconWorld, 10 s) and the landed clock (5 s)
 // claim lesson: launch, close on the practice outpost, sit in its ring (fast-forward the claim clock once it runs)
 claim(){if(S.player.docked)return'launch '+H.key('KeyE');const E=W.outpostEnt;if(!E)return'no outpost';W.tgt={kind:'outpost',ref:E};const p=W.player,d=d3(E,p);if(d>300){H.fly(E,150);return'closing '+Math.round(d)}
  apOn=false;p.vx=p.vy=p.vz=0;const c=E.o.cap;if(c.side==='player'&&c.p>.1&&c.p<.85)c.p=.85;return'claiming '+Math.round((c.p||0)*100)+'% '+c.side},
 // limpet lesson: close on the training escort and hold F once inside 600 m of its hull
 limpet(){const E=W.ents.find(x=>x.tok&&x.tok.dummy&&x.alive);if(!E)return'no dummy';W.tgt={kind:'ship',ref:E};const p=W.player,d=d3(E,p)-E.st.radius;H.fly(E,E.st.radius+300);if(d<550){keys.KeyF=true;return'holding F at '+Math.round(d)+' m, '+Math.round((W.lpF?W.lpF.t:0)*100)/100+' s'}keys.KeyF=false;return'closing '+Math.round(d)},
 hold(){const p=W.player,B=S.beacons[W.sid];if(d3(B,p)>=200)return H.ap();apOn=false;p.vx=p.vy=p.vz=0;const F=W.bcnF;
  if(F&&F.side===S.player.faction&&F.t>0.5&&F.t<BCN_T-1.5)F.t=BCN_T-1.5;return'holding, flip '+Math.round((F?F.t:0)/BCN_T*100)+'%'},
 landed(){const L=W.player.landed;if(!L)return'not landed';if(W.t-L.t>0.5&&W.t-L.t<4)L.t=W.t-4;return'landed '+(W.t-L.t).toFixed(1)+' s'},
 // comms lesson: fly to the carrier (J), and E once it is in reach
 board(){if(W.bridge||W.docking)return'boarding';if(commsOpen())return H.key('Escape');const F=W.ents.find(e=>e.role==='frigate'&&e.tok&&e.side===S.player.faction&&e.alive&&fBoard(e.tok));
  if(F&&!(W.tgt&&W.tgt.ref===F))W.tgt={kind:'ship',ref:F};if(myFrigNear()&&!apOn)return'E '+H.key('KeyE');return H.ap()},
 // a console button on the carrier bridge (they act on pointerdown)
 fc(a){const b=document.querySelector(`#fcon [data-fc="${a}"]`);if(!b)return'no console button '+a;b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));return a},
 // walk the bridge deck (W, facing the hatch) and press E at the hatch
 walk(){const B=W.bridge;if(!B){keys.KeyW=false;return'off the bridge'}if(B.panel){H.key('Escape');return'Esc'}const n=bridgeNear();if(n&&n.id==='hatch'){keys.KeyW=false;H.key('KeyE');return'E at hatch'}
  const h=BRIDGE.cons.find(c=>c.id==='hatch');B.yaw=Math.atan2(h.x-B.x,(h.z-3)-B.z);keys.KeyW=true;return'walking '+B.x.toFixed(1)+','+B.z.toFixed(1)}
};1"""
ACK="document.querySelector('[data-tr=ack]').click()"
LAUNCH="S.player.docked?H.key('KeyE'):'launched'"
MAP_OPEN="$('map').hidden?H.key('KeyM'):'open'"
MAP_CLOSE="$('map').hidden?'closed':H.key('KeyM')"
ACTS=[
 # 0 Flight (7)
 LAUNCH,"keys.KeyW=true","keys.ShiftLeft=true",
 "keys.KeyW=keys.ShiftLeft=false;H.tab('gate')==='gate'&&!apOn?H.key('KeyJ'):apOn","apOn?H.key('KeyJ'):'off'",
 "$('sndPop').hidden?($('bSnd').click(),'clicked Sound'):'open'","$('sndPop').hidden?'closed':H.key('Escape')",
 # 1 Weapons (6). Flares cost 30 energy (playerFlares), and the laser fire of the missile step drains it, so cease fire until it is back
 "H.tgt()","H.drone()",
 "H.drone(1)+', lock '+Math.round(W.lock.p*100)+'%'","keys.KeyZ=keys.Space=keys.KeyW=false;W.flareCd>0?'flares out':W.player.energy<30?'guns cold, energy '+Math.round(W.player.energy):H.key('KeyB')","H.drone(1)",
 "keys.KeyZ=keys.Space=keys.KeyW=false;"+ACK,
 # 2 Mining and trade (5)
 "S.player.docked?H.key('KeyE'):W.tgt&&W.tgt.kind==='ast'?'targeted':H.key('KeyR')","H.mine()","H.dock()",
 "H.tab2('market')+' '+TR_ORE.filter(k=>S.player.cargo[k]).map(k=>H.btn('sell',k+':all'))",ACK,
 # 3 The station (4)
 "S.player.docked?H.tab2('fab'):H.dock()",ACK,"H.tab2('ship')+' '+(S.player.cls==='scout'?'in a scout':H.btn('hull','scout'))","H.tab2('jobs')",
 # 4 Upgrades and variants (5)
 "H.tab2('upg')","(S.player.tune&&S.player.tune.vr&&S.player.tune.vr.weapon)==='rapid'?'rapid fitted':H.btn('vfit','weapon:rapid')",ACK,ACK,ACK,
 # 5 Scouts and beacons (7)
 LAUNCH,"H.tab('beacon')",
 "H.hold()",ACK,"H.limpet()","keys.KeyF=false;"+ACK,ACK,
 # 6 Hugging a rock (3)
 "H.land()","H.landed()","W.player.landed?H.key('KeyE'):'lifted'",
 # 7 Salvage and wrecks (4)
 "H.tab('wpt')","H.salv()",ACK,ACK,
 # 8 Hauling for the war (7)
 "H.dock()","H.tab2('ship')+' '+(S.player.cls==='courier'?'in a hauler':H.btn('hull','courier'))","H.tab2('jobs')",ACK,ACK,ACK,ACK,
 # 9 Logistics and raiding (3)
 "H.tab2('jobs')",ACK,ACK,
 # 10 Comms and capital ships (10)
 LAUNCH,"commsOpen()?'open':H.key('KeyI')","H.board()","W.bridge&&fMine(W.bridge.f.tok)?'in command':H.fc('take')","H.fc('tab:wpn')","H.fc('tab:nav')",ACK,ACK,ACK,"H.walk()",
 # 11 Fighting for territory (9)
 ACK,ACK,"S.player.docked?(trBeacons()>(S.training.v.bc||0)?'bought':H.tab2('market')+' '+H.btn('buybeacon')):H.dock()","H.tab2('storage')+' '+H.btn('mv','beacon:out:1')","H.claim()",ACK,ACK,ACK,ACK,
 # 12 The Brood (7)
 MAP_OPEN,MAP_CLOSE,ACK,ACK,ACK,ACK,ACK,
 # 13 Jammers and the Unbound (3)
 ACK,ACK,ACK,
 # 14 Winning the war (7)
 MAP_OPEN,MAP_CLOSE,"H.key('KeyP')",ACK,ACK,ACK,ACK]
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg=await b.new_page(viewport={'width':1100,'height':700});err=[];pg.on('pageerror',lambda e:err.append(str(e)))
    await pg.add_init_script('window.__fastDock=1')   # the game's test hook: docking clamps in 0.05 s instead of 5 s
    await pg.goto(GAME+'?name=Tester');await pg.wait_for_function('window.__dg&&__dg.ev("MDL.ready")',timeout=30000)
    TRK=os.environ.get('TRK','full');await pg.evaluate("document.getElementById('mpName').value='Cadet7';document.getElementById('bTrain').click();document.querySelector('[data-trk="+TRK+"]').click()");await pg.wait_for_timeout(2000)
    ev=lambda c:pg.evaluate('c=>__dg.ev(c)',c)
    nsteps=await ev("TRAIN.reduce((a,L)=>a+L.steps.length,0)");nles=await ev("TRAIN.length")
    print('lessons',nles,'steps',nsteps,'acts',len(ACTS))
    await ev(HELP)
    print('start',await ev("JSON.stringify([S.training.i,S.training.j,!document.getElementById('train').hidden,localStorage.getItem(SAVE_KEY)?'save-exists':'no-save'])"))
    await pg.screenshot(path=D+'train0.png')
    t0=time.time()
    plan=json.loads(await ev("JSON.stringify(S.training.plan)"));lens=json.loads(await ev("JSON.stringify(TRAIN.map(L=>L.steps.length))"))
    offs=[sum(lens[:i]) for i in range(len(lens))];RUN=[a for i in plan for a in ACTS[offs[i]:offs[i]+lens[i]]]
    print('course',TRK,'lessons',plan,'actions',len(RUN))
    for k,a in enumerate(RUN):
      before=await ev("S.training.i+'.'+S.training.j")
      for _ in range(250):   # game time runs slowly under swiftshader: timed steps (beacon hold, landing) need many polls
        try:r=await ev(a)
        except Exception as e:r='ERR '+str(e)[:120]
        await pg.wait_for_timeout(400)
        now=await ev("S.training.i+'.'+S.training.j")
        if now!=before:break
      print(k,before,'->',now,str(r)[:60],f'({time.time()-t0:.0f}s)')
      if k==2:await pg.screenshot(path=D+'train1.png')
      if k==14:await pg.screenshot(path=D+'train2.png')
      if k in(17,48,66):await pg.screenshot(path=D+f'test/train_{k}.png')
    await pg.screenshot(path=D+'train3.png')
    print('workarounds',await ev("JSON.stringify(H.fixes)"))
    print('frame errors',await ev("JSON.stringify((window.__dgErr||[]).map(e=>e.where+': '+e.msg).slice(0,4))"))
    print('end',await ev("JSON.stringify([S.training.i,S.training.done,localStorage.getItem(SAVE_KEY)?'save-exists':'no-save'])"))
    print('errors',err[:4]);await b.close()
asyncio.run(main())
