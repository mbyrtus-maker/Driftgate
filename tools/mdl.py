import json,struct,re,io,base64,math,os
import numpy as np
from PIL import Image
CT={5120:'b',5121:'B',5122:'h',5123:'H',5125:'I',5126:'f'};NC={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
def qmat(q):
    x,y,z,w=q;return np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])
def node_mat(n):
    M=np.eye(4)
    if 'matrix' in n: return np.array(n['matrix']).reshape(4,4).T
    T=np.eye(4);T[:3,3]=n.get('translation',[0,0,0]);R=np.eye(4);R[:3,:3]=qmat(n.get('rotation',[0,0,0,1]));S=np.diag(list(n.get('scale',[1,1,1]))+[1])
    return T@R@S
def load_glb(path,texdir=None):
    b=open(path,'rb').read();assert b[:4]==b'glTF'
    off=12;J=None;BIN=None
    while off<len(b):
        ln,ty=struct.unpack('<II',b[off:off+8]);ch=b[off+8:off+8+ln]
        if ty==0x4E4F534A:J=json.loads(ch)
        elif ty==0x004E4942:BIN=ch
        off+=8+ln
    def acc(i):
        a=J['accessors'][i];bv=J['bufferViews'][a['bufferView']];n=NC[a['type']];fmt=CT[a['componentType']]
        st=bv.get('byteStride',0);o=bv.get('byteOffset',0)+a.get('byteOffset',0);cnt=a['count'];sz=struct.calcsize(fmt)
        if st and st!=sz*n:
            out=[struct.unpack_from('<'+fmt*n,BIN,o+k*st) for k in range(cnt)];return np.array(out)
        return np.frombuffer(BIN,dtype=np.dtype('<'+fmt),count=cnt*n,offset=o).reshape(cnt,n) if n>1 else np.frombuffer(BIN,dtype=np.dtype('<'+fmt),count=cnt,offset=o)
    # texture
    tex=None
    if J.get('images'):
        im=J['images'][0]
        if 'bufferView' in im:
            bv=J['bufferViews'][im['bufferView']];tex=Image.open(io.BytesIO(BIN[bv.get('byteOffset',0):bv.get('byteOffset',0)+bv['byteLength']])).convert('RGB')
        elif 'uri' in im:
            p=os.path.join(texdir or os.path.dirname(path),im['uri']);tex=Image.open(p).convert('RGB') if os.path.exists(p) else None
    mats=J.get('materials',[])
    P=[];U=[];N=[];C=[]
    def walk(ni,M):
        n=J['nodes'][ni];M2=M@node_mat(n)
        if 'mesh' in n:
            for pr in J['meshes'][n['mesh']]['primitives']:
                pos=acc(pr['attributes']['POSITION']).astype(float);nor=acc(pr['attributes']['NORMAL']).astype(float) if 'NORMAL' in pr['attributes'] else None
                uv=acc(pr['attributes']['TEXCOORD_0']).astype(float) if 'TEXCOORD_0' in pr['attributes'] else np.zeros((len(pos),2))
                idx=acc(pr['indices']).astype(int) if 'indices' in pr else np.arange(len(pos))
                pw=(M2[:3,:3]@pos.T).T+M2[:3,3];nw=(M2[:3,:3]@nor.T).T if nor is not None else None
                base=[1,1,1]
                if 'material' in pr and pr['material']<len(mats):
                    pbr=mats[pr['material']].get('pbrMetallicRoughness',{});base=pbr.get('baseColorFactor',[1,1,1,1])[:3]
                    if 'baseColorTexture' not in pbr: base=list(base)+['flat']
                tri=idx.reshape(-1,3)
                for t in tri:
                    P.append(pw[t]);U.append(uv[t]);N.append(nw[t].mean(0) if nw is not None else None);C.append(base)
        for c in n.get('children',[]):walk(c,M2)
    sc=J['scenes'][J.get('scene',0)]
    for r in sc['nodes']:walk(r,np.eye(4))
    return dict(P=np.array(P),U=np.array(U),N=N,C=C,tex=tex)
def half(b,o):return struct.unpack_from('<e',b,o)[0]
def load_godot(path):
    s=open(path).read()
    def arr(k):
        m=re.search('"'+k+r'": PoolByteArray\(([^)]*)\)',s);return bytes(int(x) for x in m.group(1).split(','))
    a=arr('array_data');ix=arr('array_index_data');vc=int(re.search(r'"vertex_count": (\d+)',s).group(1));st=len(a)//vc
    pos=np.array([struct.unpack_from('<fff',a,i*st) for i in range(vc)]);uv=np.array([(half(a,i*st+16),half(a,i*st+18)) for i in range(vc)])
    def octn(i):
        x,y=struct.unpack_from('<bb',a,i*st+12);x=max(x/127,-1);y=max(y/127,-1);z=1-abs(x)-abs(y)
        if z<0:x,y=(1-abs(y))*math.copysign(1,x),(1-abs(x))*math.copysign(1,y)
        v=np.array([x,y,z]);return v/(np.linalg.norm(v)+1e-9)
    nor=np.array([octn(i) for i in range(vc)])
    idx=np.frombuffer(ix,dtype='<u2').astype(int).reshape(-1,3)
    P=[pos[t] for t in idx];U=[uv[t] for t in idx];N=[nor[t].mean(0) for t in idx]
    return dict(P=np.array(P),U=np.array(U),N=N,C=[[1,1,1]]*len(idx),tex=None)
def sample(tex,uv):
    w,h=tex.size;px=tex.load();x=int((uv[0]%1)*w)%w;y=int((uv[1]%1)*h)%h;return np.array(px[x,y])/255.
def tri_colors(M,tex=None):
    tex=tex or M['tex'];out=[]
    for k in range(len(M['P'])):
        base=M['C'][k]
        if tex is not None and not (len(base)>3):
            uv=M['U'][k];cs=[sample(tex,uv.mean(0))]+[sample(tex,uv[j]*.7+uv.mean(0)*.3) for j in range(3)];c=np.mean(cs,0)*np.array(base[:3])
        else:c=np.array(base[:3],dtype=float)
        out.append(c)
    return np.array(out)
def hexrgb(h):h=h.lstrip('#');return np.array([int(h[i:i+2],16)/255 for i in (0,2,4)])
def rgb2hsv(c):
    import colorsys;return colorsys.rgb_to_hsv(*c)
def faction_palette(col):
    F=hexrgb(col);return dict(accent=F*.92,light=np.array([.6,.61,.62])*.9+F*.1,mid=np.array([.37,.39,.44]),dark=np.array([.15,.16,.19]),glass=np.array([.18,.32,.42]))
def recolor(cols,pal,accent_s=.33):
    out=[];ems=[]
    for c in cols:
        h,s,v=rgb2hsv(c)
        if s>accent_s and v>.22: r='accent';k=.85+.3*min(1,v)
        elif v<.2: r='dark';k=1
        elif v>.66: r='light';k=.9+.15*(v-.66)/.34
        else: r='mid';k=.85+.35*(v-.2)/.46
        out.append(np.clip(pal[r]*k,0,1));ems.append(0)
    return np.array(out),ems
def flat_soup(M,cols,ems=None,fwd='+z',fit=1.0,center=True):
    P=M['P'].reshape(-1,3).copy()
    if fwd=='-z':P[:,0]*=-1;P[:,2]*=-1
    if fwd=='+x':P=P[:,[2,1,0]];P[:,2]*=1;P[:,0]*=-1
    lo,hi=P.min(0),P.max(0);c=(lo+hi)/2 if center else np.zeros(3);s=fit/(max(hi-lo)/2);P=(P-c)*s
    P=P.reshape(-1,3,3);data=[]
    for k,t in enumerate(P):
        n=np.cross(t[1]-t[0],t[2]-t[0]);l=np.linalg.norm(n)
        if l<1e-12:continue
        n/=l;vn=M['N'][k]
        if vn is not None:
            vv=np.array(vn,dtype=float)
            if fwd=='-z':vv=vv*np.array([-1,1,-1])
            if fwd=='+x':vv=np.array([-vv[2],vv[1],vv[0]])
            if np.dot(n,vv)<0:n=-n
        col=cols[k];em=ems[k] if ems else 0
        for v in t:data+= [v[0],v[1],v[2],n[0],n[1],n[2],col[0],col[1],col[2],em]
    return np.array(data,dtype='<f4')
def b64(a):return base64.b64encode(a.tobytes()).decode()
def load_obj(path):
    V=[];P=[];C=[];N=[];mats={};cur=None;d=os.path.dirname(path)
    for line in open(path):
        t=line.split()
        if not t:continue
        if t[0]=='mtllib':
            for l2 in open(os.path.join(d,t[1])):
                u=l2.split()
                if not u:continue
                if u[0]=='newmtl':m=u[1]
                elif u[0]=='Kd':mats[m]=[float(x) for x in u[1:4]]
        elif t[0]=='v':V.append([float(x) for x in t[1:4]])
        elif t[0]=='usemtl':cur=t[1]
        elif t[0]=='f':
            ids=[int(x.split('/')[0])-1 for x in t[1:]]
            for k in range(1,len(ids)-1):
                P.append(np.array([V[ids[0]],V[ids[k]],V[ids[k+1]]]));C.append(mats.get(cur,[1,1,1])+['flat',cur]);N.append(None)
    return dict(P=np.array(P),U=None,N=N,C=C,tex=None)
