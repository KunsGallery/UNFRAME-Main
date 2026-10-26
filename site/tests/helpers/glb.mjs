// Builds a minimal binary glTF (header + JSON chunk) for tests.
export function makeTestGlb(json){
 let text=JSON.stringify(json);while(text.length%4)text+=' ';
 const body=new TextEncoder().encode(text),buffer=new ArrayBuffer(12+8+body.length),view=new DataView(buffer);
 view.setUint32(0,0x46546c67,true);view.setUint32(4,2,true);view.setUint32(8,buffer.byteLength,true);
 view.setUint32(12,body.length,true);view.setUint32(16,0x4e4f534a,true);new Uint8Array(buffer,20).set(body);
 return buffer;
}
