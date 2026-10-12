"""Catalogs every Apple Loop with its tags (key, tempo, instrument, genre, mood) into
docs/reel/out/catalog.json, for finding loops that suit an arrangement.

    python3 docs/reel/music/catalog.py
"""
import os, json, subprocess, re
from cafmeta import chunks
root='/Library/Audio/Apple Loops'
rows=[]
for d,_,fs in os.walk(root):
    for f in fs:
        if not f.endswith(('.caf','.aif','.aiff')): continue
        p=os.path.join(d,f); meta={}
        try:
            for typ,body in chunks(p):
                if typ=='uuid' and b'beat count' in body:
                    parts=body[20:].split(b'\x00')
                    for k,v in zip(parts[0::2],parts[1::2]): meta[k.decode('latin1')]=v.decode('utf8','replace')
        except Exception as e: meta['err']=str(e)
        out=subprocess.run(['afinfo',p],capture_output=True,text=True).stdout
        m=re.search(r'estimated duration: ([\d.]+)',out); dur=float(m.group(1)) if m else 0
        beats=int(meta.get('beat count','0') or 0)
        rows.append(dict(name=f[:-4], path=p, pack=os.path.relpath(d,root), dur=dur, beats=beats,
            bpm=round(beats/dur*60,1) if dur and beats else None, key=meta.get('key signature'), mode=meta.get('key type'),
            cat=meta.get('category'), genre=meta.get('genre'), desc=meta.get('descriptors','')))
out=os.path.join(os.path.dirname(__file__),'..','out')
os.makedirs(out,exist_ok=True)
json.dump(rows,open(os.path.join(out,'catalog.json'),'w'),indent=0)
print(len(rows))
