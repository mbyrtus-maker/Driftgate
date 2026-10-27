// Halcyon Gannet (preview): a hauler from the future. A long lofted hull, a raised cargo spine, flush missile pods on both
// flanks with six glowing cells each, swept fins, light strips, twin drives and a centre drive.
function buildGannet(fk,g,L,eng,fc){const H=mixC([.78,.8,.84],fc,.12),M=mixC([.55,.58,.64],fc,.1),D=[.2,.22,.26],G=[.55,.85,1],S2=f=>{f(1);f(-1)};
  g.set().loft([[-1,.26,.15],[-.82,.34,.19],[-.3,.38,.21,.01],[.35,.33,.18,.01],[.78,.18,.1],[1.06,.03,.025]],12,H,0,2.6,{colFn:(k,i,p)=>p[1]<-.05?M:H});
  g.set(0,.17,0).loft([[-.86,.19,.11],[-.4,.23,.13],[.25,.2,.11],[.5,.05,.04]],10,M,0,2.2);
  g.set(0,.3,-.2).box(.03,.012,1.1,fc,1);S2(s=>g.set(.2*s,.25,-.3).box(.02,.01,.85,fc,.8));
  S2(s=>{g.set(.43*s,-.02,0).loft([[-.55,.075,.07],[-.4,.09,.085],[.45,.09,.085],[.62,.03,.03]],8,M,0,2.4);
    for(let r=0;r<2;r++)for(let k=0;k<3;k++)g.set(.43*s+(r?.035:-.035)*s,.07,-.18+k*.18).box(.05,.012,.11,fc,.9);
    g.set(.5*s,-.06,-.72,qAxis(0,0,1,-.35*s,{x:0,y:0,z:0,w:1})).box(.42,.02,.36,H);g.set(.69*s,-.13,-.78).box(.03,.03,.3,fc,.9);
    nacelle(g,.24*s,-.01,-1.18,-.84,.11,D,fc,eng)});
  nacelle(g,0,.12,-1.08,-.82,.09,D,fc,eng);canopy(g,.42,.82,.12,.16,.09,G)}
// in shipMesh, before the model-pack lookup:
// if(cls==='gannet'&&fac!=='brood'){const k=fac+'gannet';if(MESH[k])return MESH[k];const g=new GB(),L=new GB(),eng=[];buildGannet(fac,g,L,eng,hexRGB(sideCol(fac)));L.seg([0,0,0],[0,0,0],[0,0,0]);return MESH[k]={hull:g.upload(),rim:L.upload(true),eng}}
