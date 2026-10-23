# Patch: training cleanup. Every lesson's text checked against the code, and a full playthrough.
# Fixes:
#  - Tab never reached a jumpgate (or the beacon) in a busy system: it only cycled the 12 nearest things, and gates sit 4.5 km out.
#    Tab now always includes the gates, the station or outpost and the beacon, with the 12 nearest ships, works and salvage.
#  - The comms menu always opens on its Command page (closing it no longer leaves you on the last ship).
#  - "Press P" passes on the press itself, not only while the key happens to be down at a frame.
#  - The upgrades step wants Rapid fire, as it says.
#  - The training panel sits on the left, under the system name, instead of over the contacts list and target panel.
#  - Text that disagreed with the game: the sound cycle, Aurorite tuning (+6% drives/holds/rigs, +4% combat, once),
#    Hangar → Vault, convoy pay, the Wraith's cloak, specialist parts, the swarm launcher, mining hulls, market prices,
#    the Missions tab, variant names, faction builds, salvage on death, sensors, landing, the core blast, ion storms,
#    contracts vs freeport requests, the war-effort panel, the carrier landing speed, turrets, station modules, the haze,
#    the Seeder spot, P and Shift+P, the coalition; and stale laser / Mk IV-V text in the launch feed and help sheet.
import sys
P=sys.argv[1];s=open(P,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    c=s.count(a);assert c==n,(c,n,a[:140]);s=s.replace(a,b)

# ---------------- code
rep("function cycleTarget(){const p=W.player;const list=targetables().filter(t=>t.kind!=='ast').sort((a,b)=>d3(a.ref,p)-d3(b.ref,p)).slice(0,12);",
    "function cycleTarget(){const p=W.player,all=targetables().filter(t=>t.kind!=='ast'),NAV=['gate','station','outpost','beacon','wpt'],nav=all.filter(t=>NAV.includes(t.kind)),list=all.filter(t=>!NAV.includes(t.kind)).sort((a,b)=>d3(a.ref,p)-d3(b.ref,p)).slice(0,12).concat(nav).sort((a,b)=>d3(a.ref,p)-d3(b.ref,p));   // the 12 nearest ships, works and salvage, and always the gates, station, beacon and wreck salvage points\n  ")
rep("function closeComms(){const el=$('comms');if(el)el.hidden=true}","function closeComms(){const el=$('comms');if(el)el.hidden=true;if(W&&W.ftgt&&W.ftgt!==W.player)W.ftgt=null}   // next I opens on the Command page")
rep("function planKey(next){if(S.unb){","function planKey(next){if(S.training)S.training.pk=1;if(S.unb){")
rep("ok:()=>!!(S.player.tune&&S.player.tune.vr&&S.player.tune.vr.weapon)}","ok:()=>!!(S.player.tune&&S.player.tune.vr&&S.player.tune.vr.weapon==='rapid')}")
rep("#train{position:absolute;top:calc(64px + env(safe-area-inset-top,0px));right:16px;","#train{position:absolute;top:calc(118px + env(safe-area-inset-top,0px));left:16px;")
rep("@media (max-width:640px){#train{top:auto;bottom:calc(170px + env(safe-area-inset-bottom,0px));right:16px}}","@media (max-width:640px){#train{top:auto!important;bottom:calc(170px + env(safe-area-inset-bottom,0px));left:16px}}")
# keep it clear of whatever the top-left block shows (beacon status, chips)
rep("  if(h!==T.html){T.html=h;el.innerHTML=h}el.hidden=false}","  if(h!==T.html){T.html=h;el.innerHTML=h}el.hidden=false;{const tl=$('hTL');if(tl&&innerWidth>640){const y=Math.round(Math.max(118,tl.getBoundingClientRect().bottom+12));if(el._y!==y){el._y=y;el.style.top=y+'px'}}}}")

# ---------------- lesson text
T=[
# Flight
("This practice galaxy covers every system in Driftgate in 15 lessons;","This practice galaxy covers every part of Driftgate in 15 lessons;"),
("{x:'Hold <kbd>Shift</kbd> for the afterburner: a kick of speed, then a higher top speed while held. It drains energy.'",
 "{x:'Hold <kbd>W</kbd> and <kbd>Shift</kbd> for the afterburner: a kick of speed, then a higher top speed while held. It drains energy, and needs a little back before it lights again.'"),
("Jumpgates link every system in the galaxy.","Jumpgates link each system to its neighbours."),
("and battle music cuts in when shields start taking fire. <kbd>N</kbd> cycles all on → music off → muted.'",
 "and battle music cuts in when shields, yours or your target’s, start taking fire. <kbd>N</kbd> cycles all on → muted → effects only.'"),
# Weapons
("Heavy Fighters, Bombers, Heavy Bombers and Advanced Scouts also carry a swarm launcher (<kbd>3</kbd>): eight micro-missiles that fan out at your target.",
 "Heavy Fighters, Bombers, Heavy Bombers, Advanced Scouts and the Wraith also carry a swarm launcher (<kbd>3</kbd>): eight micro-missiles, most at your target and the rest at whoever flies beside it."),
# Mining
("Fault-point rings show on the rock: aim at one until it turns green and press <kbd>F</kbd> to fire a charge.",
 "Fault-point rings show on the rock: from within 300 m, aim at one until it turns green and press <kbd>F</kbd> to fire a charge (if the rings fade, <kbd>R</kbd> scans again)."),
("Bigger mining and hauling hulls, bought at a core Shipyard, carry more charge launchers (and bigger magazines) or bigger holds,",
 "Bigger mining and hauling hulls, bought at a core Shipyard, carry bigger charge magazines, blow off bigger chunks and scoop faster, or carry bigger holds,"),
("<b>Aurorite</b> exists only in the three deep-space systems and tunes components (+6% a level).",
 "<b>Aurorite</b> exists only in the three deep-space systems and tunes each component once: +6% to drives, holds and blast rigs, +4% to reactor, shields, guns and armour."),
("Prices follow each station’s real stock, so a glut sells cheap and a shortage pays well.","Prices follow the owner’s real stores, so a glut sells cheap and a shortage pays well."),
# The station
("(<b>Hangar → Storage</b>)","(<b>Hangar → Vault</b>)"),
("{x:'Open <b>Missions</b>: your faction posts combat, strategic and beacon missions with bounties. <b>Economy → Orders</b> holds hauling and mining work.'",
 "{x:'Open <b>Missions</b>: your faction’s campaign move, its faction orders (recon, beacons, interdiction, sabotage and more), operations to join, convoy raids and escorts, and beacon bounties. <b>Economy → Orders</b> holds hauling and mining work.'"),
# Upgrades
("<b>Builds.</b> Every system has two or three variants: Sprint, Vector or Long-burn drives; Surge or Steady cores; Bastion, Flicker or tuned shields; Heavy cannons, Rapid fire or a Long barrel; Ablative, Light or Reactive plating; Bulk or Stabilised holds; Deep, Quick-cycle or Smart missile racks; and three Blast Rig variants for miners.",
 "<b>Builds.</b> Every system has its variants: Sprint, Vector or Long-burn drives; Surge or Steady cores; Bastion, Flicker or a tuned emitter (kinetic or laser) for shields; Heavy cannons, Rapid fire or a Long barrel; Ablative plating, a Light frame or Reactive plating; Bulk or Stabilised holds; a Deep magazine, Quick-cycle rack or Smart seekers for missiles; and three Blast Rig variants for miners."),
("<b>Specialists</b> guard against one enemy and fit at any Mk: four against Unbound jammers (Faraday plating, Fast-reboot reactor, Snap-back emitter, Sealed hold, plus a Tether cutter) and six against the Brood. They cost only plate and wire, and core stations and Bloom-border stations stock them.",
 "<b>Specialists</b> guard against one enemy and fit at any Mk: five against Unbound jammers (Faraday plating, Fast-reboot reactor, Snap-back emitter, Sealed hold and Tether cutter) and six against the Brood. Each costs only 3 plate and 3 conduit to fit from Upgrades at any dock, and faction markets stock them once the Bloom or the Unbound press that faction."),
("<b>Everything fitted goes down with the ship.</b> Lose it and half your variants spill into the wreck as salvage; the rest is gone.",
 "<b>Everything fitted goes down with the ship.</b> Lose it and about half your variants spill into its salvage crate, with some of its parts; the rest is gone."),
("(Halcyon favours Bastion and Flicker; Varkesh heavy plating and cannons; Ostrova big cores and Rapid fire)","(Halcyon favours Bastion and Flicker; Varkesh heavy plating and cannons; Ostrova Surge or Steady cores and Rapid fire)"),
# Scouts
("systems with a friendly station or depot (and their neighbours), friendly outposts, held beacons, and wherever a friendly scout is.",
 "systems with a friendly station or depot (and their neighbours), friendly outposts, held beacons, and wherever a friendly scout or capital ship is (and next door)."),
# Hugging a rock
("Landed, you power down everything but radar: enemies beyond 320 m lose you.","Landed, you power down everything but radar, shields included: enemies beyond 320 m lose you."),
("Systems take four seconds to re-energise: no guns until they are back up.","Systems take four seconds to re-energise: no guns until they are back up, and shields recharge from empty."),
# Salvage
("it blows in a 600 m blast that wrecks every ship inside and destroys the whole wreck.","it blows in a 600 m blast that badly damages every ship inside and destroys the whole wreck."),
("<b>ion storms</b> (shields don’t recharge and radar is blind for 2½ minutes)","<b>ion storms</b> (for 2½ minutes shields don’t recharge and radar reaches only about a kilometre)"),
# Hauling
("Contracts take goods you mined, salvaged or made.","Faction contracts take goods you mined, salvaged or made; freeport requests take anything not bought at that freeport."),
("<b>Convoys.</b> In a hauling ship, set a course on the map, then call a convoy from Orders: a faction escort wing forms up on you, jumps with you, and goes home when you dock at a friendly station at the destination. Other pilots who fly escort are paid for every jump.",
 "<b>Convoys.</b> In a hauling ship with at least 10 t aboard, set a course on the map, then call a convoy from Orders while docked: a faction escort wing forms up on you, jumps with you, and goes home when you dock at a friendly station at the destination. Pilots who fly escort within 4 km are paid 120 cr for each jump into or out of hostile or unclaimed space."),
# Logistics
("The campaign panel at your station shows the current bonus.'}]},","The Campaign section (Missions, or Orders during a supply drive) shows the current bonus.'}]},"),
# Comms and capital ships
("{x:'A carrier of your faction is holding just ahead (targeted). Fly within reach and press <kbd>E</kbd> to land on its flight deck and board.'",
 "{x:'A carrier of your faction is holding just ahead (targeted). Fly to it (<kbd>J</kbd>), match its speed (under 140 m/s relative), and press <kbd>E</kbd> to land on its flight deck and board.'"),
("{x:'Open the <b>Hangar</b> tab: give the carrier’s fighters wing missions,","{x:'Open the <b>Hangar</b> tab (on an escort this is Weapons): give the carrier’s fighters wing missions,"),
("<b>Escorts</b> are smaller capital ships: their Weapons station fires twin torpedo bays, the weapon that really hurts capital ships and stations, and point defence shoots down incoming torpedoes. Torpedoes are what can really hurt a capital ship, so keep fighters around yours.",
 "<b>Escorts</b> are smaller capital ships: their Weapons station fires twin torpedo bays, the weapon that really hurts capital ships and stations, and point defence shoots down incoming torpedoes. Keep fighters around your capital ships to stop enemy bombers getting their torpedoes in."),
("and the commander hands each crew member one station (Helm, Weapons or Engineering) from the Strategic console. A squadmate’s Heavy Bomber turret can be crewed too: sign on in Hangar → Shipyard while docked together.",
 "and the commander hands each crew member one station (Helm, Weapons, called Hangar on a carrier, or Engineering) from the Strategic console. A squadmate’s Bomber or Heavy Bomber turret can be crewed too: sign on in Hangar → Shipyard while docked together."),
# Territory
("Stations grow modules beside them (habitat, storage, production, shield works), and a depot can build a <b>fighter hangar</b> that scrambles fighters when hostiles come close.",
 "Stations grow modules beside them (life support, storage, production, a defence platform, hull and shield works), and a depot can build a <b>fighter hangar</b> that scrambles fighters when hostiles come close."),
("<kbd>U</kbd> sends a distress call that brings your faction’s wings. Friendly wings screen your capital ships from bombers.'","<kbd>U</kbd> sends a distress call that brings your faction’s wings.'"),
("<b>Special hulls.</b> The <b>Wraith</b> can cloak: invisible beyond a short range until it fires or takes a hit.",
 "<b>Special hulls.</b> The <b>Wraith</b> (Legend level 10) cloaks with <kbd>K</kbd>: hidden beyond 600 m, but no guns, shields or locks until you press <kbd>K</kbd> again or take a hit."),
# Brood
("A scout who holds a lock on a Seeder for 3 s before it plants earns 250 cr.","A scout who keeps a Seeder targeted within 5 km for 3 s before it plants earns 250 cr."),
("<b>Fear.</b> In Bloom space shields recharge 15% slower","<b>The haze.</b> In Bloom space shields recharge 15% slower"),
# Winning
("Stations, depots and outposts hold a system; the others band together against whoever leads. Close the map (<kbd>M</kbd>).",
 "Stations, depots and outposts hold a system; the others band together against any faction that reaches 7. Close the map (<kbd>M</kbd>)."),
("{x:'Press <kbd>P</kbd> to read your faction’s campaign orders and sign on to its next move. When it has several going, <kbd>Shift</kbd>+<kbd>P</kbd> picks between them.',ok:()=>!!keys.KeyP},",
 "{x:'The orders card (Command panel, right) lists your faction’s campaign move and its faction orders: recon, beacon pushes, interdiction, sabotage, screening, counter-attacks, capital hunts and Brood purges, each with its pay. <kbd>Shift</kbd>+<kbd>P</kbd> steps to the next order; <kbd>P</kbd> signs on to the picked one and sets your course. Press <kbd>P</kbd>.',ok:()=>!!(S.training.pk||keys.KeyP)},"),
("When anyone gets close, the other powers call a truce and turn on them; against the Brood the <b>Containment Accord</b> starts much earlier, at 5 Brood systems, so watch the map.",
 "When a faction reaches 7 systems, the other powers call a truce and turn on it; against the Brood the <b>Containment Accord</b> starts earlier, at 5 Brood systems, so watch the map."),
]
for a,b in T:rep(a,b)

# ---------------- outside the lessons
rep("N cycles all on → music off → muted.</p>","N cycles all on → muted → effects only.</p>")
rep("Your vault holds a few plates and conduit: check Hangar → Shipyard for your first upgrade.`,'info');feed('Launch with E. Steer with the mouse, thrust with W. In a mining ship, hold F near an asteroid to mine.','info');save()});",
    "Your vault holds a few plates and conduit: check Construction → Upgrades for your first upgrade.`,'info');feed('Launch with E. Steer with the mouse, thrust with W. In a mining ship, R targets a rock, F fires a charge onto a fault point and 3 detonates; fly into the chunks to scoop them.','info');save()});")
rep("feed('Launch with E. Steer with the mouse, thrust with W. In a mining ship, hold F near an asteroid to mine.','info')}",
    "feed('Launch with E. Steer with the mouse, thrust with W. In a mining ship, R targets a rock, F fires a charge onto a fault point and 3 detonates; fly into the chunks to scoop them.','info')}")
rep("Components (Mk I–V) still cost materials. Miners and haulers come in Light, Medium and Heavy: more mining lasers, more guard drones and bigger holds as they grow. Only mining ships carry mining lasers.",
    "Components (Mk I–III) still cost materials. Miners and haulers come in Light, Medium and Heavy: bigger charge magazines and chunks, more guard drones and bigger holds as they grow. Only mining ships carry a blast rig.")
rep("Mine it with your mining laser (F) like a rock;","Blast it with charges like a rock;")
rep("Mine its glowing salvage points with the mining laser: a third of what's inside comes out as intact components. The reactor core holds the best of it, but every unit you cut heats it, and if it reaches 100% it blows.",
    "Blast its glowing salvage points with charges on their joint rings and scoop the chunks: a third of what's inside comes out as intact components. The reactor core holds the best of it, but every charge on it must be on point, or it blows in a 600 m blast and takes the whole wreck.")
rep(", and the only docks that fit Mk IV and Mk V parts.",".")
rep("The campaign panel at your station shows the current bonus.</p>","The Campaign section (Missions, or Orders during a supply drive) shows the current bonus.</p>")
rep("desc:'Carries Depot Frames; press K to build a depot where there is no station.'","desc:'Carries Depot Frames for faction depots; call one in from comms (I, then 3 on the Command page).'")
# the blast-rig HUD line sat on top of the ship status block (over ENERGY); lift it above the ship name
rep("${mine.length?` · ${mine.length} SET (3 DETONATE · 4 CANCEL)`:''}`,VW/2,VH-118);\n  if(warn){c.fillStyle='#ff5d4f';c.fillText(warn,VW/2,VH-136)}",
    "${mine.length?` · ${mine.length} SET (3 DETONATE · 4 CANCEL)`:''}`,VW/2,VH-232);\n  if(warn){c.fillStyle='#ff5d4f';c.fillText(warn,VW/2,VH-250)}")
# docked, the station screen makes room for the training panel on the left instead of sitting under it
rep("@media (max-width:640px){#train{top:auto!important;","@media (min-width:900px){body.trn .sheet{padding-left:362px}}\n@media (max-width:640px){#train{top:auto!important;")
rep("S.training={i:0,j:0,done:[],v:{},html:''};startWith(S);","S.training={i:0,j:0,done:[],v:{},html:''};document.body.classList.add('trn');startWith(S);")
# E docks with what you have targeted when it is in reach (the training carrier sat 700 m from the station, and E could pick the
# station); and the training carrier now holds 1.8 km out, clear of the station
rep("c.sort((a,b)=>a.d-b.d);return c[0]||null}","c.sort((a,b)=>a.d-b.d);{const tg=W.tgt&&W.tgt.ref,pf=tg&&c.find(x=>x.e===tg);if(pf)return pf}return c[0]||null}")
rep("if(e){const p=W.player;qRot(p.q,0,0,1,_f);e.x=p.x+_f.x*700;e.y=p.y+60;e.z=p.z+_f.z*700;","if(e){const p=W.player;qRot(p.q,0,0,1,_f);e.x=p.x+_f.x*1800;e.y=p.y+60;e.z=p.z+_f.z*1800;")
# the contacts list (top right) stops above the target card and Command panel (bottom right) instead of running under them
rep("function hudUpdate(){\n  if(apOn!==apSaid)","let hudFitT=0;function hudFit(){const n=performance.now();if(n-hudFitT<250)return;hudFitT=n;const cr=$('contacts'),br=$('hBR');if(!cr||!br||cr.offsetParent===null)return;const top=cr.getBoundingClientRect().top,b=br.getBoundingClientRect().top,h=Math.max(90,Math.floor(b-top-10));if(cr._mh!==h){cr._mh=h;cr.style.maxHeight=h+'px';cr.style.overflow='hidden'}}\nfunction hudUpdate(){hudFit();\n  if(apOn!==apSaid)")
# shoot all three drones down early and the missile step had nothing left to lock on to: it brings fresh drones if none are left
rep("{x:'Missiles: keep a target near your nose until the lock completes, then press <kbd>C</kbd>. Missiles hit 1.8× harder once shields are down and reload on a cooldown.',ok:",
    "{x:'Missiles: keep a target near your nose until the lock completes, then press <kbd>C</kbd>. Missiles hit 1.8× harder once shields are down and reload on a cooldown.',setup:()=>{if(!trDroneEnts().length)trDrones()},ok:")
rep("<b>Playing with friends.</b> Up to four pilots can share a galaxy:","<b>Playing with friends.</b> Friends can share a galaxy (it is built for up to four pilots):",2)
open(P,'w',encoding='utf-8').write(s);print('training cleanup applied',len(T),'lesson fixes')
