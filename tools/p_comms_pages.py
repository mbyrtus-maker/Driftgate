# Patch: the comms menu (I) in pages. The first page is Command: call-ins for you (escort me, guard me, request a depot or
# shipyard, distress). Each press of I steps to the next friendly ship nearby, and the menu offers what that kind of ship does:
#  fighter wing: guard it, escort it, form up on me, attack my target
#  freighter:    escort this convoy (the escort contract, signed on in flight), guard it, where are you bound?
#  carrier:      resupply / clear me to land (course to its deck), launch fighters on my target, guard it, escort it
#  constructor:  escort it to the build site, guard it
#  under attack: "Help: target its attacker" leads the list
# 1-4 pick, firing closes the menu. The HUD panel that was also called Comms is now Command.
import sys
P=sys.argv[1];s=open(P,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    c=s.count(a);assert c==n,(c,n,a[:140]);s=s.replace(a,b)

rep('''    <div class="cm-h"><span>Comms</span><b id="cmTo"></b></div>
    <button type="button" class="cm-o" data-cm="guard"><kbd>1</kbd><span id="cmG">Guard</span></button>
    <button type="button" class="cm-o" data-cm="escort"><kbd>2</kbd><span id="cmE">Escort</span></button>
    <button type="button" class="cm-o" data-cm="build"><kbd>3</kbd><span id="cmB">Request construction</span></button>
    <button type="button" class="cm-o" data-cm="help"><kbd>4</kbd><span>Distress call: send help to me</span></button>
    <button type="button" class="cm-o" data-cm="close"><kbd>Esc</kbd><span>Close</span></button>
    <div class="cm-n" id="cmN"></div>''',
'''    <div class="cm-h"><span>Comms</span><b id="cmTo"></b></div>
    <div class="cm-l" id="cmList"></div>
    <div class="cm-n" id="cmN"></div>''')
rep(".cm-o kbd{min-width:30px;text-align:center}",".cm-o kbd{min-width:30px;text-align:center}.cm-l{display:flex;flex-direction:column;gap:4px}.cm-o:disabled{opacity:.5;cursor:default}.cm-o:disabled:hover{border-color:var(--line-hi);color:var(--ivory)}")
rep('<button type="button" class="cmh" id="cmHead" aria-expanded="true"><span>Comms</span>','<button type="button" class="cmh" id="cmHead" aria-expanded="true"><span>Command</span>')

old_open=s[s.find("function openComms(){"):s.find("function closeComms(){")]
assert old_open.count("function openComms(){")==1
rep(old_open, r"""// ---- comms pages: Command first (call-ins for you), then each friendly ship nearby, with what that kind of ship can do
const CM_FIGHT=['patrol','escort','screen','strike','raider'];
// a crew pilot sees the host's ships without their convoy record: match it by system and side
function cmTrader(T){if(T.tradeT)return T.tradeT;if(!T.pup||T.role!=='trader')return null;return(S.traders||[]).find(t=>t.live&&t.sector===W.sid&&t.side===T.side&&t.kind==='haul')||null}
function cmRole(T){const t=cmTrader(T);if(T.role==='trader')return t&&t.kind==='haul'?`freighter → ${DEF[t.to]?DEF[t.to].name:'?'}`:'trader';if(T.role==='frigate')return T.tok?capName(T.tok):'capital ship';if(T.role==='builder')return'constructor';if(T.role==='miner')return'miner';if(T.role==='hauler')return'hauler';if(T.role==='scout')return'scout';return T.grp&&grpAlive(T.grp).length>1?'wing':'fighter'}
function cmOpts(T){const P=S.player,p=W.player,f=P.faction,O=[];
  if(T===p){O.push({k:'escort',l:'Escort me: a wing forms up on me'},{k:'guard',l:'Guard me here'},{k:'build',l:S.unb?'Build here':W.sid===FAC_HOME(f)?'Request a shipyard here':'Request a depot here'},{k:'help',l:'Distress: send help to me'});return O}
  const nm=ftgtName(T),t=cmTrader(T),cv=T.role==='trader'&&t&&t.kind==='haul'&&t.side===f,car=T.role==='frigate'&&T.tok&&isCar(T.tok)&&T.tok.side!=='brood',hit=W.t-(T.lastHit||-99)<4&&T.lastHitBy&&hostile('player',T.lastHitBy);
  if(hit)O.push({k:'assist',l:`Help: target the ship attacking ${nm}`});
  if(cv){const me=P.pid||'me',E=t.esc,n=cvLeft(t);O.push(E&&E.k===me?{k:'none',l:`Escorting: ${E.hops} of ${E.need} jumps · paid when it docks`,off:1}:E?{k:'none',l:`Already escorted by ${E.name||'another pilot'}`,off:1}:n<1?{k:'none',l:'Last leg: no escort contract',off:1}:{k:'cvesc',l:`Escort this convoy · ${n} jump${n>1?'s':''} · ${fmt(cvPay(t,Math.ceil(n*ESC_CV.need)))} cr`},{k:'guard',l:'Guard '+nm},{k:'bound',l:'Where are you bound?'})}
  else if(car){const n=carNeed(T.tok),ks=Object.keys(n),have=ks.some(k=>(P.cargo[k]||0)>0);O.push({k:'land',l:ks.length?`Resupply: needs ${ks.slice(0,2).map(k=>n[k]+' '+ITEMS[k].name).join(', ')}${have?' · you carry some':''}`:'Clear me to land on its deck'},{k:'launch',l:'Launch fighters on my target'},{k:'guard',l:'Guard '+nm},{k:'escort',l:'Escort '+nm})}
  else if(T.role==='builder')O.push({k:'escort',l:'Escort it to the build site'},{k:'guard',l:'Guard it'});
  else if(CM_FIGHT.includes(T.role)&&T.role!=='pilot')O.push({k:'guard',l:'Guard '+nm},{k:'escort',l:'Escort '+nm},{k:'form',l:'Form up on me'},{k:'attack',l:'Attack my target'});
  else{O.push({k:'guard',l:'Guard '+nm},{k:'escort',l:'Escort '+nm});if(T.role==='trader'||T.role==='hauler')O.push({k:'bound',l:'Where are you bound?'})}
  return O.slice(0,4)}
function openComms(){const T=W&&W.ftgt;if(!T)return;const me=T===W.player,O=cmOpts(T);W.cmOpts=O;
  $('cmTo').textContent=me?`${S.unb?'The Unbound':FACTIONS[S.player.faction]?FACTIONS[S.player.faction].short+' command':'Command'}`:`${ftgtName(T)} · ${cmRole(T)} · ${fmt(d3(T,W.player))} m`;
  $('cmList').innerHTML=O.map((o,i)=>`<button type="button" class="cm-o" data-cm="${i}"${o.off?' disabled':''}><kbd>${i+1}</kbd><span>${esc(o.l)}</span></button>`).join('')+`<button type="button" class="cm-o" data-cm="close"><kbd>Esc</kbd><span>Close</span></button>`;
  $('cmN').textContent=me?'I: next page, the ships around you. Guard and escort last 2 minutes.':'I: next ship. Firing closes this menu.';$('comms').hidden=false;W.commsT=W.t}
""")
old_pick=s[s.find("function commsPick(k){"):s.find("  issueOrder(k,T)}",s.find("function commsPick(k){"))+len("  issueOrder(k,T)}")]
assert old_pick.count("function ")==1,old_pick
rep(old_pick, r"""function commsPick(k){if(k==='close'){closeComms();return}const o=W&&W.cmOpts&&W.cmOpts[+k],T=W&&W.ftgt;if(!o||o.off)return;closeComms();if(T)cmDo(o.k,T)}
function cmDo(k,T){const P=S.player,me=T===W.player;
  if(k==='help'){if(NET.cl)netSend({t:'order',k:'help'});else pilotDistress();return}
  if(k==='build'){if(NET.cl)netSend({t:'order',k:'build'});else requestBuild();return}
  if(!me&&(!T.alive||!W.ents.includes(T)))return;
  if(k==='guard'||k==='escort'){if(NET.cl){netSend({t:'order',k,id:me?'me':T.id});return}issueOrder(k,T);return}
  if(k==='form'||k==='attack'||k==='launch'){const tg=W.tgt&&W.tgt.kind==='ship'&&W.tgt.ref;if(k!=='form'&&!(tg&&tg.alive&&hostile('player',tg.side))){flash('Target an enemy ship first (T, Q or G), then give the order.',true);return}
    if(NET.cl){netSend({t:'order',k,id:T.id,tg:tg&&tg.id});return}cmWing(k,T,tg);return}
  if(k==='assist'){const at=attackersOf(T).sort((a,b)=>d3(a,W.player)-d3(b,W.player))[0]||W.ents.find(e=>e.type==='ship'&&e.alive&&e.ai&&e.ai.tgt===T&&hostile('player',e.side));if(at){W.tgt={kind:'ship',ref:at};apOn=false;flash(`Targeted ${shipLabel(at)}: it is attacking ${ftgtName(T)}.`)}else flash('No attacker in range.');return}
  if(k==='cvesc'){const t=cmTrader(T);if(!t)return;if(NET.cl){netSend({t:'cvesc',id:t.id});flash('Signing on as escort…');return}cvTake(t);return}
  if(k==='bound'){const t=cmTrader(T);feed(t&&t.to&&DEF[t.to]?`${shipLabel(T)}: bound for ${DEF[t.to].name}${t.load?' with '+haulWhat(t):''}${t.esc?`, escorted by ${t.esc.name||'a pilot'}`:''}.`:`${shipLabel(T)}: working this system.`,'info');return}
  if(k==='land'){W.tgt={kind:'ship',ref:T};apOn=true;const has=Object.keys(carNeed(T.tok)).some(i=>(P.cargo[i]||0)>0);flash(`${T.tok.name}: cleared to land. Autopilot is bringing you in: press E at its deck${has?' and your cargo unloads into its store (paid at the front-line rate)':''}.`);return}}
// a ship's own wing (or a carrier's fighters) takes your order: form up on you, or attack your target
function cmWing(k,T,tg){const pl=W.player,mem=k==='launch'?(T.pickets||[]).filter(e=>e.alive&&W.ents.includes(e)):(T.grp?grpAlive(T.grp):[T]).filter(e=>e.alive&&e.npc&&CM_FIGHT.includes(e.role));
  if(!mem.length){feed(k==='launch'?`${T.tok?T.tok.name:shipLabel(T)}: no fighters out to send.`:`${shipLabel(T)}: no one free to take that order.`,'warn');return 0}
  const use=mem.slice(0,k==='launch'?6:4),opid=CTX||NET.me||null;use.forEach((e,i)=>{e.order=k==='form'?{kind:'escort',tgt:pl,until:W.t+ORDER_TIME,slot:i,by:true,pid:opid}:{kind:'attack',tgt:tg,until:W.t+90,slot:i,by:false,pid:opid};e.ai.tgt=k==='form'?null:tg;e.ai.t=0});
  feed(`${k==='launch'?(T.tok?T.tok.name:shipLabel(T))+': '+use.length+' fighters':shipLabel(use[0])+(use.length>1?` and ${use.length-1} more`:'')}: copy, ${k==='form'?'forming up on you':'attacking '+shipLabel(tg)}.`,'good');return use.length}
// sign on as a convoy's escort from the cockpit, the same contract as Missions → Convoy escort
function cvTake(t){const P=S.player;if(!t||t.side!==P.faction||t.esc||cvLeft(t)<1){feed('That convoy no longer needs an escort.','warn');return false}const k=P.pid||'me';for(const x of S.traders||[])if(x.esc&&x.esc.k===k)x.esc=null;const E=cvSign(t,k,P.name);
  feed(`✓ Escort contract: the convoy is bound for ${DEF[t.to].name}. Stay with it for ${E.need} jump${E.need>1?'s':''}; Command pays when it docks.`,'good');return true}""")
rep("if(commsOpen()&&(c==='Digit1'||c==='Digit2'||c==='Digit3'||c==='Digit4')){commsPick(c==='Digit1'?'guard':c==='Digit2'?'escort':c==='Digit3'?'build':'help');return}",
    "if(commsOpen()&&(c==='Digit1'||c==='Digit2'||c==='Digit3'||c==='Digit4')){commsPick(String(+c.slice(5)-1));return}")
# the host: a crew pilot's orders, and escort sign-on in flight
rep("const e=MP.rp[pid],w=e?worldOf(e):WORLDS[P.sector],k=m.k==='guard'?'guard':'escort';if(!w)break;runAs(pid,()=>{const T=m.id==='me'?W.player:entInWorld(w,String(m.id||''));if(T&&!hostile(S.player.faction,T.side==='player'?S.player.faction:T.side))issueOrder(k,T)});break}",
    "const e=MP.rp[pid],w=e?worldOf(e):WORLDS[P.sector],k=m.k==='guard'?'guard':'escort';if(!w)break;runAs(pid,()=>{const T=m.id==='me'?W.player:entInWorld(w,String(m.id||''));if(!T||hostile(S.player.faction,T.side==='player'?S.player.faction:T.side))return;if(m.k==='form'||m.k==='attack'||m.k==='launch'){const tg=m.tg!=null?entInWorld(w,String(m.tg)):null;if(m.k==='form'||(tg&&tg.alive))cmWing(m.k,T,tg)}else issueOrder(k,T)});break}\n"
    "    case 'cvesc':{const t=(S.traders||[]).find(x=>x.id===m.id&&x.kind==='haul');if(t)runAs(pid,()=>cvTake(t));break}")
# NPCs: an attack order, and carrier fighters that take one
rep("  const R=o.kind==='guard'?1800:1000;\n  if(ai.t<=0","  if(o.kind==='attack'){ai.tgt=T;fight(e,T,dt);return true}\n  const R=o.kind==='guard'?1800:1000;\n  if(ai.t<=0")
rep("if(e.role==='picket'){droneThink(e,dt);return}","if(e.role==='picket'){if(e.order&&e.order.kind==='attack'&&orderThink(e,dt))return;droneThink(e,dt);return}")
rep("if(e.order&&e.order.tgt)return[(e.order.kind==='guard'?'guarding ':'escorting ')+(e.order.tgt===p?'you':'ally'),'g'];",
    "if(e.order&&e.order.tgt)return[e.order.kind==='attack'?'attacking':(e.order.kind==='guard'?'guarding ':'escorting ')+(e.order.tgt===p?'you':'ally'),'g'];")
# firing closes the menu (the number keys go back to weapons)
rep("if(commsOpen()&&W.t-(W.commsT||0)>12)closeComms();","if(commsOpen()&&(W.t-(W.commsT||0)>12||mouse.l||keys.Space))closeComms();")
# words
rep("<kbd>I</kbd><span>Friendly target (yourself first, then nearby friendlies) and open comms: 1 guard, 2 escort, 3 request construction, 4 distress call (your faction sends a wing)</span>",
    "<kbd>I</kbd><span>Comms. First press: Command (1 escort me, 2 guard me, 3 request a depot or shipyard, 4 distress call). Each press after steps to the next friendly ship nearby, with what it can do: a wing guards, escorts, forms up on you or attacks your target; a freighter takes you on as its escort; a carrier clears you to land (resupply) or launches its fighters on your target. Firing closes the menu</span>")
rep("<kbd>I</kbd><span>then 3 — call a faction constructor","<kbd>I</kbd><span>then 3 (on the Command page): call a faction constructor")
rep('<div class="sub">In the comms menu (I): <kbd>1</kbd> guard · <kbd>2</kbd> escort · <kbd>3</kbd> construction · <kbd>4</kbd> distress</div>',
    '<div class="sub"><kbd>I</kbd> opens Command (escort me, guard me, build, distress), then steps through the ships around you; <kbd>1</kbd>–<kbd>4</kbd> pick</div>')
open(P,'w',encoding='utf-8').write(s);print('comms pages applied')
