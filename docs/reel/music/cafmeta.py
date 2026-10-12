"""Reads the chunks of a CAF file; Apple Loops keep their tags in a `uuid` chunk."""
import struct, sys
def chunks(path):
    with open(path,'rb') as f:
        data=f.read()
    pos=8; out=[]
    while pos+12<=len(data):
        typ=data[pos:pos+4].decode('latin1'); size=struct.unpack('>q',data[pos+4:pos+12])[0]
        body=data[pos+12:pos+12+size] if size>=0 else data[pos+12:]
        out.append((typ,body))
        if size<0: break
        pos+=12+size
    return out
if __name__=='__main__':
    for typ,body in chunks(sys.argv[1]):
        if typ in ('info','uuid','strg','mark','regn'):
            print(typ, len(body)); print(body[:1500])
        else: print(typ, len(body))
