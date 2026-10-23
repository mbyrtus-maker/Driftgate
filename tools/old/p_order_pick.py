# Patch: choose between your faction's orders, and miners launch with a full magazine.
# 1. The HUD orders card lists every order your faction has going: the campaign move plus its strike groups, constructor convoys and
#    the calls to defend its ground. Shift+P picks the next one (or click it); P signs on to the picked one and sets a course there.
#    The Friendly ops list below it keeps only trouble in your own system, so nothing shows twice.
# 2. A blast-rig hull's magazine refills while docked, so a miner always launches with every charge ready.
import sys
P=sys.argv[1];s=open(P,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    c=s.count(a);assert c==n,(c,n,a[:140]);s=s.replace(a,b)

# ---- the order list and the pick
rep("function planKey(){if(S.unb){flash('The Unbound take no campaign orders. Check the Marks tab at the haven.',true);return}const C=myCamp(),m=C&&C.mv;if(!m){flash('No campaign orders right now. Your faction posts its next move shortly.',true);return}\n  const k=pkey();",
    "// every order your faction has going: the campaign move first, then its strikes, convoys and calls to defend (not trouble right here)\n"
    "let ordPick=null;\n"
    "function ordKey(o){return o.t==='camp'?'c'+o.m.id:o.op.ev&&o.op.ev.id!=null?'e'+o.op.ev.id:o.op.kind+':'+(o.op.ev&&o.op.ev.type)+':'+o.op.sector}\n"
    "function orderList(){if(S.unb||!S.player.faction||!FACTIONS[S.player.faction])return[];const C=myCamp(),m=C&&C.mv,out=[];if(m)out.push({t:'camp',m,label:m.title});\n"
    "  for(const op of friendlyOps()){if(op.kind==='local')continue;if(m&&m.evId&&op.ev&&op.ev.id===m.evId)continue;out.push({t:'op',op,label:op.label})}\n"
    "  for(const o of out)o.key=ordKey(o);return out.slice(0,5)}\n"
    "function ordSel(L){const i=L.findIndex(o=>o.key===ordPick);return i<0?0:i}\n"
    "function planKey(next){if(S.unb){flash('The Unbound take no campaign orders. Check the Marks tab at the haven.',true);return}const L=orderList();if(!L.length){flash('No orders right now. Your faction posts its next campaign move shortly.',true);return}\n"
    "  let i=ordSel(L);if(next){if(L.length<2){flash('That is your only order right now.');ordPick=L[0].key;return}i=(i+1)%L.length;ordPick=L[i].key;flash(`Order ${i+1} of ${L.length}: ${L[i].label}. Press P to take it.`);if(!MUTE)SFX.ui&&SFX.ui();return}\n"
    "  ordPick=L[i].key;if(L[i].t==='op'){joinOp(L[i].op);return}const m=L[i].m;\n  const k=pkey();")
rep("if(c==='KeyP'&&!(W&&W.bridge&&W.bridge.panel)){planKey();return}",
    "if(c==='KeyP'&&!(W&&W.bridge&&W.bridge.panel)){planKey(e.shiftKey);return}")

# ---- the HUD card: the campaign move, then the other orders, the picked one marked
old_hud=s[s.find("function campHud(){"):s.find("\n// map: the next move of your faction")]
assert old_hud.count("function campHud(){")==1 and old_hud.endswith("el.innerHTML=h}")
new_hud=("function campHud(){const el=$('hOrd');if(!el)return;if(S.unb){el.hidden=true;return}const C=myCamp(),m=C&&C.mv,f=S.player.faction,L=orderList(),si=ordSel(L),pick=L[si],multi=L.length>1;el.hidden=false;\n"
  "  const n=controlCounts()[f]||0,k=pkey(),cs=C&&(m||C.goal);let h=`<div class=\"ot\" style=\"border-color:${sideCol(f)}\"><span>${esc(FACTIONS[f].short)} ${cs?'· '+esc(DOCTRINE[f].name):'orders'}</span><b>${n}/${VIC_NEED} systems</b></div>`;\n"
  "  if(!m)h+=C&&C.goal?`<div class=\"om\">Goal reached. Hold the line.</div>`:`<div class=\"om\" style=\"color:var(--dim)\">No campaign move right now. Command posts the next one shortly.</div>`;\n"
  "  else{const on=!multi||(pick&&pick.t==='camp'),signed=m.acc.includes(k),left=m.stage==='active'&&m.until?Math.max(0,Math.round(m.until-S.T)):Math.max(0,Math.round(m.brief-S.T)),ev=m.evId&&S.events.find(e=>e.id===m.evId);\n"
  "    const st=m.stage==='brief'?`Opens in ${left} s`:m.kind==='mine'||m.kind==='haul'?`${Math.floor(m.prog)}/${m.need} · ${fmtT(left)}`:ev?(ev.stage==='engaged'?'Fighting now':ev.stage==='building'?`Building ${Math.round((ev.prog||0)*100)}%`:ev.hold&&S.T>=ev.eta?'Holding at the gate':`Inbound · ${Math.max(0,Math.round(ev.eta-S.T))} s`):'Under way';\n"
  "    h+=`<div class=\"oi${multi&&on?' sel':''}\" data-ord=\"${L[0]?L[0].key:''}\"><div class=\"om\">${esc(m.title)}</div>`;\n"
  "    if((m.kind==='mine'||m.kind==='haul')&&m.stage==='active')h+=`<div class=\"obar\"><i style=\"width:${clamp(m.prog/m.need*100,0,100)}%;background:${sideCol(f)}\"></i></div>`;\n"
  "    h+=`<div class=\"os\"><span>${st}</span><span class=\"${signed?'ok':'go'}\">${signed?(on?'✓ Signed on · P course':'✓ Signed on'):on?'P · sign on':''}</span></div></div>`}\n"
  "  for(const o of L){if(o.t!=='op')continue;const on=o===pick;h+=`<div class=\"oi op ${o.op.kind}${on?' sel':''}\" data-ord=\"${o.key}\"><div class=\"om\">${esc(o.label)}</div><div class=\"os\"><span>${esc(opWhen(o.op))}</span><span class=\"go\">${on?(o.op.kind==='assist'?'P · join':'P · defend'):''}</span></div></div>`}\n"
  "  if(multi)h+=`<div class=\"onx\"><kbd>⇧P</kbd> next order · ${si+1} of ${L.length}</div>`;\n"
  "  if(el._h!==h){el._h=h;el.innerHTML=h}}")
s=s.replace(old_hud,new_hud)
rep(".ordc .obar{margin:6px 9px 0 12px;height:4px;background:rgba(236,228,207,.12)}.ordc .obar i{display:block;height:100%}",
    ".ordc .obar{margin:6px 9px 0 12px;height:4px;background:rgba(236,228,207,.12)}.ordc .obar i{display:block;height:100%}\n"
    ".ordc .oi{border-left:2px solid transparent;margin:3px 0 0 1px;padding-bottom:3px;pointer-events:auto;cursor:pointer}.ordc .oi.sel{border-left-color:var(--amber);background:rgba(240,180,80,.08)}\n"
    ".ordc .oi.op .om{font-size:12px;padding-left:10px}.ordc .oi.op .os{padding-left:10px}.ordc .oi.op.defend .om{color:#f3c3b8}.ordc .oi .om,.ordc .oi .os,.ordc .oi .obar{margin-left:-2px}\n"
    ".ordc .onx{padding:6px 9px 0 12px;font-size:10.5px;color:var(--faint);letter-spacing:.04em}.ordc .onx kbd{font-size:10px}")
# click an order to pick it and take it
rep("$('hComms').addEventListener('pointerdown',e=>{const ob=e.target.closest('[data-op]');if(ob&&W){e.preventDefault();e.stopPropagation();joinOp(friendlyOps()[+ob.dataset.op])}});",
    "$('hComms').addEventListener('pointerdown',e=>{const ob=e.target.closest('[data-op]');if(ob&&W){e.preventDefault();e.stopPropagation();joinOp(friendlyOps()[+ob.dataset.op]);return}\n"
    "  const od=e.target.closest('[data-ord]');if(od&&W&&od.dataset.ord){e.preventDefault();e.stopPropagation();ordPick=od.dataset.ord;planKey(false)}});")
# the ops list keeps only trouble in your own system (the rest is in the orders card); local trouble leads friendlyOps, so indexes line up
rep("const ops=friendlyOps().slice(0,3),osig=",
    "const ops=friendlyOps().filter(o=>o.kind==='local'||S.unb).slice(0,3),osig=")
rep('<div class="cmt" id="cOpsT" hidden>Friendly ops · O joins the top one</div>',
    '<div class="cmt" id="cOpsT" hidden>Under attack here · O targets the attacker</div>')
# words
rep("K('O','Join operation')+K('P','Campaign orders')","K('O','Join operation')+K('P','Take order')+K('⇧P','Next order')")
rep("<kbd>P</kbd><span>Campaign orders: sign on to your faction's next move (shown under the system name), then set a course to it</span>",
    "<kbd>P</kbd><span>Orders: sign on to the order picked in the orders card (your faction's campaign move, its strikes and convoys, calls to defend) and set a course to it. <kbd>Shift</kbd>+<kbd>P</kbd> picks the next order, or click one</span>")
rep("{x:'Press <kbd>P</kbd> to read your faction’s campaign orders and sign on to its next move.',ok:()=>!!keys.KeyP},",
    "{x:'Press <kbd>P</kbd> to read your faction’s campaign orders and sign on to its next move. When it has several going, <kbd>Shift</kbd>+<kbd>P</kbd> picks between them.',ok:()=>!!keys.KeyP},")

# ---- miners launch with a full magazine: it refills while docked
rep("function blTick(P,dt){const cap=blCap(P);if(!cap){P.blN=0;P.blT=0;return}if(P.blN==null)P.blN=cap;if(P.blN>cap)P.blN=cap;",
    "function blTick(P,dt){const cap=blCap(P);if(!cap){P.blN=0;P.blT=0;return}if(P.blN==null)P.blN=cap;if(P.blN>cap)P.blN=cap;\n"
    "  if(P.docked&&P.docked!=='bridge'&&P.docked!=='turret'){P.blN=cap;P.blT=0;return}   // the dock reloads the magazine: launch with every charge")
open(P,'w',encoding='utf-8').write(s);print('order pick + docked reload applied')
