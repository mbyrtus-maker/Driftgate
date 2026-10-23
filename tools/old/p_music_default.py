# Patch: the default music volume drops from 45% to 35%. Players still on the old default (45, never moved) get the new one once;
# anyone who set their own level keeps it.
import sys
P=sys.argv[1];s=open(P,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    c=s.count(a);assert c==n,(c,n,a[:140]);s=s.replace(a,b)
rep("if(!(AU.on.mvol>=0))AU.on.mvol=45;","if(!(AU.on.mvol>=0))AU.on.mvol=35;if(!AU.on.mv2){if(AU.on.mvol===45)AU.on.mvol=35;AU.on.mv2=1}")
open(P,'w',encoding='utf-8').write(s);print('music default 35')
