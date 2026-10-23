# Patch: Unbound crew multiplayer. A host can create an Unbound crew galaxy; every pilot who joins flies Unbound and needs
# a Legend point of their own; no mixed galaxies. The crew shares the haven, its works and its fleet; heat, Infamy, Deeds,
# stolen goods and the Legend point stay per pilot. Guests' jam mode, false colours, cargo hook, harpoons, jamming torpedoes,
# Freeport and Lair docking, heat, scans, hunters and raids all run on the host, per pilot.
import sys,re
P=sys.argv[1];s=open(P,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    c=s.count(a);assert c==n,(c,n,a[:140]);s=s.replace(a,b)
def refn(name,new):
    global s
    i=s.index('function '+name+'(');m=re.search(r"\n(?=function |const |// |let |\{const o=)",s[i+10:]);j=i+10+m.start()
    assert s.count('function '+name+'(')==1,name
    s=s[:i]+new.strip()+s[j:]

# ---------------------------------------------------------------- per-pilot runtime state (not saved): takes, hooks, scans, the captain
rep("function unbLegendOK(name){","const UNB_RT={};function unbRT(){const k=curPid()||'me';return UNB_RT[k]||(UNB_RT[k]={})}\nfunction unbCoverP(P,f){return!!(P&&P.xpdr&&!((P.xpdrOut||0)>S.T)&&(P.heat||{})[f]<25)}\nfunction unbLegendOK(name){")
refn('hookTarget',r"""
function hookTargetOf(T){const p=W.player;if(!S.unb||!p||!T||T.type!=='ship')return null;return T.alive&&jamDark(T)&&d3(T,p)<hookReach(T)+T.st.radius*(T.role==='frigate'?8:1)?T:null}
function hookTarget(){return hookTargetOf(W.tgt&&W.tgt.kind==='ship'?W.tgt.ref:null)}
""")
refn('unbHook',r"""
function unbHook(dt,hold,Tsel){const p=W.player,P=unbP(),R=unbRT(),T=hookTargetOf(Tsel);const tk=R.take;
  if(tk&&(!tk.T.alive||!jamDark(tk.T))){takeEnd()}
  if(!T||!hold)return;const cg=hookSrc(T);if(!R.take||R.take.T!==T)R.take={T,moved:0,fac:T.side};const room=p.st.cargo-invMass(P.cargo);if(room<1){if(W.t-(R.hookMsg||0)>2){R.hookMsg=W.t;flash('Hold full. Let them go, or dump something.')}return}
  R.hookAcc=(R.hookAcc||0)+(unbWork('chop')>=3?12:unbWork('chop')>=1?10:JAM.hookRate)*dt;while(R.hookAcc>=1){const ks=Object.keys(cg).filter(k=>cg[k]>0&&mass(k)>0).sort((a,b)=>baseValue(b)/mass(b)-baseValue(a)/mass(a));const k=ks[0];if(!k){R.hookAcc=0;break}const m=mass(k);
    if(invMass(P.cargo)+m>p.st.cargo){R.hookAcc=0;break}if(R.hookAcc<m)break;R.hookAcc-=m;inv.take(cg,k,1);inv.add(P.cargo,k,1);inv.add(P.stolen,k,1);R.take.moved+=m}
  if(W.t-(R.hookMsg||0)>1.5&&R.take.moved){R.hookMsg=W.t;flash(`Hooking ${fmt(R.take.moved)} t · ${Math.max(0,Math.ceil(T.jamOff-W.t))} s left in the window`)}}
""")
refn('takeEnd',r"""
function takeEnd(){const R=unbRT(),tk=R.take;R.take=null;if(!tk||!tk.moved)return;const T=tk.T,P=unbP(),f=FAC_IDS.includes(tk.fac)?tk.fac:null;T.robbed=1;
  infAdd(tk.moved*UNB_INF.perTon);if(f)heatAdd(f,T.alive?UNB_HEAT.mercy:UNB_HEAT.take,T.alive?'a mercy take':'a take');if(T.role==='frigate'){infAdd(300);if(f)heatAdd(f,15,'a capital take');deedAdd('captake')}{const L=lockOf();if(L&&L.f===f)deedAdd('heist')}
  feed(`☠ Take: ${fmt(tk.moved)} t from a ${f?FACTIONS[f].short+' ':''}${CLASSES[T.cls]?CLASSES[T.cls].name:'ship'}${T.alive?'. You let them go.':'.'}`,'good');
  P.sortie=P.sortie||{};P.sortie[T.id]=1;if(Object.keys(P.sortie).length>=3)deedAdd('three');
  const g=T.tradeT&&T.tradeT.id||T.escortG&&T.escortG.id;if(g){S.cvTake=S.cvTake||{};const c=S.cvTake[g]=S.cvTake[g]||{n:0,kill:0};c.n++;const left=W.ents.filter(e=>e.alive&&e!==T&&((e.tradeT&&e.tradeT.id)===g||(e.escortG&&e.escortG.id)===g)&&(e.role==='hauler'||e.role==='trader')&&!e.robbed).length;if(c.n>=2&&!c.kill&&!left)deedAdd('sweep')}}
""")
refn('lockOf',r"""
function lockOf(){const P=S.player;return W&&P&&P.lock&&P.lock.sid===W.sid?P.lock:null}
""")
s=s.replace("function raidTick(){const f=unbHomeOf(W.sid),P=unbP(),p=W.player;if(!f){if(S.lock&&S.lock.sid!==W.sid)S.lock=null;return}\n  let L=lockOf();if(!L&&(!unbCover(f)))L=S.lock={sid:W.sid,f,t0:S.T,n:0},",
            "function raidTick(){const f=unbHomeOf(W.sid),P=unbP(),p=W.player;if(!f){if(P.lock&&P.lock.sid!==W.sid)P.lock=null;return}\n  let L=lockOf();if(!L&&(!unbCover(f)))L=P.lock={sid:W.sid,f,t0:S.T,n:0},")
assert "L=P.lock={sid:W.sid" in s
refn('captainTick',r"""
function captainTick(){const R=unbRT(),P=S.player;if(unbWork('tankard')<3||!W||P.docked||!W.player||(W===LW&&W.dead))return;if(R.capt&&R.capt.alive&&W.ents.includes(R.capt))return;if((P.captT||0)>S.T)return;
  const e=spawnNPC('patrol','pirate');if(!e)return;const p=W.player,o=rdir();e.x=p.x+o.x*300;e.y=p.y+o.y*120;e.z=p.z+o.z*300;e.order={kind:'escort',tgt:p,until:W.t+1e6,slot:0,by:true,pid:curPid()};e.capt=1;R.capt=e;P.captT=S.T+(R.capt0?240:0);R.capt0=1;feed('☠ Your captain falls in on your wing.','good')}
""")
s=s.replace("function unbScan(dt){const P=unbP(),p=W.player;if(!P.xpdr||!p||S.player.docked)return;W.scanT=(W.scanT||0)-dt;if(W.scanT>0)return;W.scanT=4;",
            "function unbScan(dt){const P=unbP(),p=W.player,R=unbRT();if(!P.xpdr||!p||S.player.docked)return;R.scanT=(R.scanT||0)-dt;if(R.scanT>0)return;R.scanT=4;")
assert "R.scanT=4;" in s
refn('lairNear',r"""
function lairNear(){const L=W&&lairHere(),p=W&&W.player;return L&&p&&d3(L,p)<260&&L.pid===(curPid()||'me')?L:null}
""")
rep("until:S.T+90,stage:'inbound',pid:'me'});","until:S.T+90,stage:'inbound',pid:curPid()||'me'});")
# the per-world Unbound tick: the host runs it for itself and, through runAs, for every Unbound guest in this world
refn('unbTick',r"""
function unbTick(dt){if(!S.unb||!W||NET.cl)return;
  lairWorld(dt);for(const e of W.ents)if(e.role==='frigate')capJamDrain(e,dt);
  if(W===LW){riggerTick();if(S.player)unbPilotTick(dt,true,keys.KeyE,W.tgt&&W.tgt.kind==='ship'?W.tgt.ref:null);
    if(NET.host)for(const pid in S.pilots||{}){const R=S.pilots[pid];if(pid===NET.me||!R.docked)continue;runAs(pid,()=>unbPilotTick(dt,false,false,null))}}
  if(NET.host)for(const e of W.ents.slice())if(e.rp&&e.alive&&S.pilots[e.rp]&&e.rp!==NET.me){const h=(MP.hook||{})[e.rp];runAs(e.rp,()=>unbPilotTick(dt,false,!!(h&&h.on),h&&h.on?W.ents.find(x=>x.id===h.id)||null:null))}}
function unbPilotTick(dt,local,hold,Tsel){const P=unbP(),p=W.player;
  const quiet=!W.ents.some(e=>e.npc&&e.alive&&FAC_IDS.includes(e.side))&&!FAC_IDS.some(f=>territory(f).has(W.sid));
  const lk=lockOf(),atLair=P.docked==='lair';for(const f of FAC_IDS)if(P.heat[f]>0&&!(lk&&lk.f===f))P.heat[f]=Math.max(0,P.heat[f]-(quiet||atLair?UNB_HEAT.coolQuiet:UNB_HEAT.cool)*(unbWork('forger')>=2?1.5:1)*dt);jtTick(dt);
  if(P.docked||!p||(local&&W.dead))return;raidTick();captainTick();unbHook(dt,hold,Tsel);unbScan(dt);
  P.huntT=P.huntT||{};for(const f of FAC_IDS){if(P.heat[f]<50||(P.huntT[f]||0)>S.T)continue;const T=territory(f);if(!T.has(W.sid)&&!NEIGH[W.sid].some(n=>T.has(n)))continue;
    P.huntT[f]=S.T+rnd(120,200)-(P.heat[f]>=75?40:0);let n=0;for(let i=0;i<3;i++){const e=spawnNPC('patrol',f);if(!e)break;const o=rdir();e.x=p.x+o.x*2200;e.y=p.y+o.y*400;e.z=p.z+o.z*2200;e.ai.tgt=p;e.hunt=1;e.ai.hunt=p;e.ai.huntUntil=W.t+240;n++}
    if(n)feed(`⚠ A ${FACTIONS[f].short} hunter wing (${n}) has your scent.`,'bad')}}
""")
# per-pilot resets on docking: the host's own player here, guests in hDock
rep("function openDock(){dockErr='';if(S&&S.unb){S.sortie={};S.player.fixUsed=0}","function openDock(){dockErr='';if(S&&S.unb&&!NET.cl){S.player.sortie={};S.player.fixUsed=0}")
# kills: every Unbound pilot with a share takes the heat and the Infamy
rep("  if(S.unb&&(sh.me||sh[NET.me]||killer==='me')){unbKill(e);return}","  if(S.unb){const ks=new Set(Object.keys(sh));if(killer)ks.add(killer);for(const k of ks)runAs(isMe(k)?null:k,()=>unbKill(e));return}")
# Legend points per pilot; the debrief lists the whole crew
rep("function unbLegend(side){if(!S.unb||S.training)return;const P=unbP(),",
    "function unbLegend(side){if(!S.unb||S.training)return;if(NET.host)for(const pid in S.pilots||{}){if(pid===NET.me)continue;const R=S.pilots[pid],ok=side!=='brood'&&unbRank(R.inf||0)>0&&(R.deeds||[]).length>0;const c=readyCl().find(x=>x.pid===pid);if(c)send(c.L,{t:'legend',side:'pirate',ok,cls:R.cls})}\n  const P=unbP(),")
rep("function unbDebrief(side){if(!S.unb)return'';const P=unbP(),r=unbRank(P.inf),ok=side!=='brood'&&r>0&&P.deeds.length>0;\n  return`<div",
    "function unbDebrief(side){if(!S.unb)return'';return allPilots().filter(Boolean).map(P=>unbDebriefOne(side,P)).join('')}\nfunction unbDebriefOne(side,P){P.heat=P.heat||{};P.inf=P.inf||0;P.deeds=P.deeds||[];const r=unbRank(P.inf),ok=side!=='brood'&&r>0&&P.deeds.length>0;\n  return`<div")
# ---------------------------------------------------------------- crew galaxies on the start screen
rep("{const ul=unbLegendOK(cleanCall($('mpName').value))&&!NET.on,U=FAC('pirate');if(selFac==='pirate'&&!ul)selFac='halcyon';",
    "{const crew=unbCrewGal(),fgal=unbFacGal(),ul=unbLegendOK(cleanCall($('mpName').value))&&!fgal,U=FAC('pirate');if(selFac==='pirate'&&!ul)selFac='halcyon';if(crew&&ul)selFac='pirate';")
rep("<div class=\"ft\">${ul?U.traitText:NET.on?'Unbound crew galaxies come with the next stage. Solo only for now.':'Earn a Legend point flying for a faction to unlock the Unbound.'}</div>",
    "<div class=\"ft\">${ul?(crew?'An Unbound crew galaxy: everyone here flies for the pirates.':U.traitText):fgal?'This galaxy flies for the factions. Unbound crews need a galaxy of their own.':'Earn a Legend point flying for a faction to unlock the Unbound.'}</div>")
rep("if(b.dataset.fac==='pirate'&&(!unbLegendOK(cleanCall($('mpName').value))||NET.on)){$('ssum').innerHTML=`<b style=\"color:var(--amber)\">${NET.on?'Unbound crew galaxies come with the next stage: fly the Unbound solo for now.':'The Unbound unlock once this callsign has earned a Legend point flying for a faction.'}</b>`;return}",
    "if(b.dataset.fac==='pirate'&&(!unbLegendOK(cleanCall($('mpName').value))||unbFacGal())){$('ssum').innerHTML=`<b style=\"color:var(--amber)\">${unbFacGal()?'This galaxy flies for the factions: Unbound crews need a galaxy of their own.':'The Unbound unlock once this callsign has earned a Legend point flying for a faction.'}</b>`;return}if(b.dataset.fac!=='pirate'&&unbCrewGal()){$('ssum').innerHTML='<b style=\"color:var(--amber)\">This is an Unbound crew galaxy: everyone here flies for the pirates.</b>';return}")
rep("function unbLegendOK(name){","function unbCrewGal(){return NET.on&&((NET.host&&S&&S.unb)||(NET.cl&&(MP.roster||[]).some(r=>r[2]==='pirate')))}\nfunction unbFacGal(){return NET.on&&((NET.host&&S&&!S.unb&&!!S.player)||(NET.cl&&(MP.roster||[]).some(r=>FAC_IDS.includes(r[2]))))}\nfunction unbLegendOK(name){")
# the host creating a crew galaxy; guests joining one
rep("function mpLaunch(fac,cls){\n  if(NET.host){if(S&&S.pilots){newPilot(MP.pid,MP.name,fac,cls,legPack(MP.name))}else{newGame(fac,cls,MP.name);S.gid=rid(10);S.pilots={};S.pilots[MP.pid]=S.player;S.player.pid=MP.pid;S.player.name=MP.name}",
    "function mpLaunch(fac,cls){\n  if(NET.host){if(S&&S.pilots){newPilot(MP.pid,MP.name,fac,cls,legPack(MP.name))}else{newGame(fac,cls,MP.name);if(fac==='pirate'){S.unb=1;unbP();S.player.cls='raider'}S.gid=rid(10);S.pilots={};S.pilots[MP.pid]=S.player;S.player.pid=MP.pid;S.player.name=MP.name}")
rep("if(!S.pilots[c.pid]&&FAC_IDS.includes(m.fac)&&START_HULLS.includes(m.cls))newPilot(c.pid,c.name,m.fac,m.cls,m.leg&&typeof m.leg==='object'?m.leg:null);hJoin(c);return}",
    "if(!S.pilots[c.pid]){const lg=m.leg&&typeof m.leg==='object'?m.leg:null;if(S.unb){if(m.fac!=='pirate'||!lg||!((lg.pts||0)>=1)){send(L,{t:'msg',k:'flash',a:[m.fac!=='pirate'?'This is an Unbound crew galaxy: everyone here flies for the pirates.':'Joining an Unbound crew takes a Legend point of your own, earned flying for a faction.',true]});return}const NP=newPilot(c.pid,c.name,'pirate','raider',lg);runAs(c.pid,()=>unbP())}else if(FAC_IDS.includes(m.fac)&&START_HULLS.includes(m.cls))newPilot(c.pid,c.name,m.fac,m.cls,lg);else{send(L,{t:'msg',k:'flash',a:['This galaxy flies for the factions. Unbound crews need a galaxy of their own.',true]});return}}hJoin(c);return}")
rep("function legPack(name){const r=legPeek(name);if(!r)return{lvl:0};const lvl=legLevel(r.pts);return{lvl,","function legPack(name){const r=legPeek(name);if(!r)return{lvl:0,pts:0};const lvl=legLevel(r.pts);return{lvl,pts:r.pts||0,")
s=s.replace("FACTIONS[r[2]].short","FAC(r[2]).short")
# ---------------------------------------------------------------- guest controls: jam mode, false colours, the hook, jamming torpedoes, docks
rep("function jamToggle(){const p=W.player;if(!p)return;p.jamMode=!p.jamMode;","function jamToggle(){const p=W.player;if(!p)return;p.jamMode=!p.jamMode;if(NET.cl)netSend({t:'jam',on:p.jamMode?1:0});")
rep("function xpdrToggle(){const P=unbP();if((P.xpdrOut||0)>S.T){flash(`Transponder burned out: ${fmtT(P.xpdrOut-S.T)} until it works again.`,true);return}P.xpdr=!P.xpdr;",
    "function xpdrToggle(){const P=unbP();if((P.xpdrOut||0)>S.T){flash(`Transponder burned out: ${fmtT(P.xpdrOut-S.T)} until it works again.`,true);return}P.xpdr=!P.xpdr;if(NET.cl)netSend({t:'xpdr',on:P.xpdr?1:0});")
rep("else if(S.unb&&hookTarget()){return}","else if(S.unb&&hookTarget()){if(NET.cl){const T=hookTarget();MP.hookOn=1;netSend({t:'hook',on:1,id:netTid(T)})}return}")
rep("addEventListener('keyup',e=>{keys[e.code]=false});","addEventListener('keyup',e=>{keys[e.code]=false;if(e.code==='KeyE'&&NET.cl&&MP.hookOn){MP.hookOn=0;netSend({t:'hook',on:0})}});")
rep("function fireJamTorp(){const P=S.player,L=W.lock,p=W.player;if(P.jt==null)P.jt=jtCap();if(P.jt<=0){flash(`Jamming torpedo reloading: ${Math.ceil(P.jtT||40)} s.`,true);return true}\n  if(!L.locked||!L.ref){flash('Lock a target first: a capital ship, a ship, or a faction station to crack its vault.',true);return true}",
    "function fireJamTorp(){const P=S.player,L=W.lock,p=W.player;if(P.jt==null)P.jt=jtCap();if(P.jt<=0){flash(`Jamming torpedo reloading: ${Math.ceil(P.jtT||40)} s.`,true);return true}\n  if(!L.locked||!L.ref){flash('Lock a target first: a capital ship, a ship, or a faction station to crack its vault.',true);return true}if(NET.cl){netSend({t:'msl',tg:netTid(L.ref),k:'jt'});flash('Jamming torpedo away.');return true}")
rep("if(S.unb&&W.player&&W.player.jamMode&&S.player.cls==='plunderer'&&!NET.cl){if(fireJamTorp())return}","if(S.unb&&W.player&&W.player.jamMode&&S.player.cls==='plunderer'){if(fireJamTorp())return}")
rep("function hMissile(pid,m){const e=MP.rp[pid],P=S.pilots[pid];if(!e)return;inW(worldOf(e),()=>{const T=resolveTgt(String(m.tg));if(!T||T===e)return;",
    "function hMissile(pid,m){const e=MP.rp[pid],P=S.pilots[pid];if(!e)return;inW(worldOf(e),()=>{const T=resolveTgt(String(m.tg));if(!T||T===e)return;if(m.k==='jt'){runAs(pid,()=>{if(P.jt==null)P.jt=jtCap();if(P.jt<=0||P.cls!=='plunderer')return;P.jt--;if(!(P.jtT>0))P.jtT=40;launchMissile(e,T,P.tiers.weapon,'torpedo',0,true);const mm=W.missiles[W.missiles.length-1];if(mm){mm.jt=1;mm.dmg=0;mm.col='#b7c6ff'}unbShot()});return}const n0=W.missiles.length;")
rep("P.rack-=n;for(let i=0;i<n;i++)launchMissile(e,T,P.tiers.weapon,CLASSES[P.cls].torp?'torpedo':'missile',n>1?(i?1:-1):0)}})}",
    "P.rack-=n;for(let i=0;i<n;i++)launchMissile(e,T,P.tiers.weapon,CLASSES[P.cls].torp?'torpedo':'missile',n>1?(i?1:-1):0);if(S.unb){if(e.jamMode)for(let i=n0;i<W.missiles.length;i++){const mm=W.missiles[i];if(mm.src===e){mm.harp=1;mm.col='#b7c6ff'}}runAs(pid,()=>unbShot())}}})}")
rep("    case 'msl':hMissile(pid,m);break;",
    "    case 'msl':hMissile(pid,m);break;\n    case 'jam':{const e=MP.rp[pid];if(e)e.jamMode=!!m.on;break}\n    case 'xpdr':{if(S.unb)runAs(pid,()=>{const R=unbP();if((R.xpdrOut||0)>S.T)return;R.xpdr=!!m.on});break}\n    case 'hook':{MP.hook=MP.hook||{};MP.hook[pid]={on:!!m.on,id:m.id};break}")
# guests' guns: jam mode never lasers; any shot under false colours blows cover
rep("if(u.f&&now-u.at<600){if(u.w==='l')fireLaser(e);else fire(e)}}","if(u.f&&now-u.at<600){if(S.unb&&e.cool<=0)runAs(e.rp,()=>unbShot());if(u.w==='l'&&!e.jamMode)fireLaser(e);else fire(e)}}")
# guests docking at Freeports (under false colours) and their own Lair
rep("inW(w,()=>{if(m.d==='station'){const SE=W.stationEnt;ok=!!SE&&SE.fac===P.faction&&d3(SE,e)<520}",
    "inW(w,()=>{if(m.d==='lair'){const L=(S.lairs||[]).find(x=>x.id===+m.id&&x.pid===pid&&x.sid===P.sector&&x.hull>0);ok=!!L&&d3(L,e)<320;if(ok)P.lairId=L.id}else if(m.d==='station'){const SE=W.stationEnt;ok=!!SE&&(SE.fac===P.faction||(S.unb&&SE.fac==='neutral'&&runAs(pid,()=>unbFreeportOK())))&&d3(SE,e)<520}")
rep("  despawnRP(pid,true);P.docked=m.d;P.vx=P.vy=P.vz=0;delete MP.inp[pid];",
    "  despawnRP(pid,true);P.docked=m.d;P.vx=P.vy=P.vz=0;delete MP.inp[pid];if(S.unb){P.sortie={};P.fixUsed=0;if(m.d==='lair'){const st=shipStats(P.faction,P.cls,P.tiers,P.tune);P.hull=st.hull;P.shield=st.sCap}}if(MP.hook)delete MP.hook[pid];")
rep("function lairDock(L){const P=S.player,p=W.player;","function lairDock(L){const P=S.player,p=W.player;if(NET.cl){P.docked='lair';P.lairId=L.id;p.vx=p.vy=p.vz=0;netSend({t:'dock',d:'lair',id:L.id});dockTab='storage';openDock();return}")
rep("if(P.docked==='lair'){P.docked=null;$('dock').hidden=true;const p=W.player;p.alive=true;p.vx=60;cam.snap=true;save();return}",
    "if(P.docked==='lair'){P.docked=null;$('dock').hidden=true;const p=W.player;p.alive=true;p.vx=60;cam.snap=true;if(NET.cl)netSend({t:'undock',x:p.x,y:p.y,z:p.z,vx:p.vx,vy:0,vz:0,q:[p.q.x,p.q.y,p.q.z,p.q.w]});save();return}")
# AI factions don't see through a guest's false colours; the Brood eats Unbound guests (side 'pirate') too
rep("function findHostile(e,range){let best=null,bd=range;for(const o of W.ents){if(o.type!=='ship'||!o.alive||o===e)continue;if((o.isPlayer&&(S.player.docked||W.dead)||mHid(o,e)))continue;if(!hostile(e.side,o.side))continue;",
    "function findHostile(e,range){let best=null,bd=range;for(const o of W.ents){if(o.type!=='ship'||!o.alive||o===e)continue;if((o.isPlayer&&(S.player.docked||W.dead)||mHid(o,e)))continue;if(!hostile(e.side,o.side)&&!(S.unb&&o.rp&&e.side==='brood'))continue;if(S.unb&&o.rp&&FAC_IDS.includes(e.side)&&unbCoverP(S.pilots[o.rp],e.side))continue;")
rep("if(!hostile(b.side,e.side))continue;","if(!hostile(b.side,e.side)&&!(S.unb&&((b.src&&b.src.rp&&e.side==='brood')||(e.rp&&b.side==='brood'))))continue;")
# snapshots tell guests which ships are jammed dark (for the hook)
rep("|(e.stealth?256:0),","|(e.stealth?256:0)|(jamDark(e)?512:0),")
rep("const fl=r[o+12];e.stealth=!!(fl&256);","const fl=r[o+12];e.jamOff=fl&512?now+1:0;e.stealth=!!(fl&256);")
open(P,'w',encoding='utf-8').write(s);print('unbound crew multiplayer applied')
