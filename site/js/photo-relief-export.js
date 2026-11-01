// Writes a photo relief (from photo-relief.js) as an uncompressed glTF 2.0 binary: one mesh,
// a textured primitive for the front and side walls, and a dark primitive for the back.
// The existing object pipeline (GLB upload, worker checks, GLTFLoader) reads it unchanged.
export function reliefNormals(positions,front,back){
 const normals=new Float32Array(positions.length);
 for(const indices of [front,back])for(let t=0;t<indices.length;t+=3){
  const [a,b,c]=[indices[t]*3,indices[t+1]*3,indices[t+2]*3];
  const ux=positions[b]-positions[a],uy=positions[b+1]-positions[a+1],uz=positions[b+2]-positions[a+2];
  const vx=positions[c]-positions[a],vy=positions[c+1]-positions[a+1],vz=positions[c+2]-positions[a+2];
  const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
  for(const i of [a,b,c]){normals[i]+=nx;normals[i+1]+=ny;normals[i+2]+=nz;}
 }
 for(let i=0;i<normals.length;i+=3){const length=Math.hypot(normals[i],normals[i+1],normals[i+2])||1;normals[i]/=length;normals[i+1]/=length;normals[i+2]/=length;}
 return normals;
}
const pad4=n=>(n+3)&~3;
export function encodeReliefGLB(geometry,jpeg){
 const {positions,uvs,front,back}=geometry,count=positions.length/3;
 const normals=reliefNormals(positions,front,back);
 // glTF texture coordinates start at the image's top-left; photo-relief.js uses bottom-left.
 const texcoords=new Float32Array(uvs.length);for(let i=0;i<uvs.length;i+=2){texcoords[i]=uvs[i];texcoords[i+1]=1-uvs[i+1];}
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(let i=0;i<positions.length;i+=3)for(let k=0;k<3;k++){min[k]=Math.min(min[k],positions[i+k]);max[k]=Math.max(max[k],positions[i+k]);}
 const parts=[positions,normals,texcoords,front,back,jpeg].map(part=>new Uint8Array(part.buffer,part.byteOffset,part.byteLength));
 const views=[];let offset=0;
 for(const [index,part] of parts.entries()){views.push({buffer:0,byteOffset:offset,byteLength:part.byteLength,...(index<3?{target:34962}:index<5?{target:34963}:{})});offset=pad4(offset+part.byteLength);}
 const json={
  asset:{version:'2.0',generator:'UNFRAME photo relief'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0,name:'relief'}],
  meshes:[{primitives:[{attributes:{POSITION:0,NORMAL:1,TEXCOORD_0:2},indices:3,material:0},{attributes:{POSITION:0,NORMAL:1},indices:4,material:1}]}],
  accessors:[
   {bufferView:0,componentType:5126,count,type:'VEC3',min,max},{bufferView:1,componentType:5126,count,type:'VEC3'},{bufferView:2,componentType:5126,count,type:'VEC2'},
   {bufferView:3,componentType:5125,count:front.length,type:'SCALAR'},{bufferView:4,componentType:5125,count:back.length,type:'SCALAR'}],
  materials:[{name:'photo',pbrMetallicRoughness:{baseColorTexture:{index:0},metallicFactor:0,roughnessFactor:.9}},{name:'back',pbrMetallicRoughness:{baseColorFactor:[.06,.06,.06,1],metallicFactor:0,roughnessFactor:1}}],
  textures:[{source:0,sampler:0}],samplers:[{magFilter:9729,minFilter:9729,wrapS:33071,wrapT:33071}],images:[{bufferView:5,mimeType:'image/jpeg'}],
  bufferViews:views,buffers:[{byteLength:offset}]
 };
 const jsonBytes=new TextEncoder().encode(JSON.stringify(json)),jsonLength=pad4(jsonBytes.length),total=12+8+jsonLength+8+offset;
 const out=new Uint8Array(total),view=new DataView(out.buffer);
 view.setUint32(0,0x46546C67,true);view.setUint32(4,2,true);view.setUint32(8,total,true);
 view.setUint32(12,jsonLength,true);view.setUint32(16,0x4E4F534A,true);out.set(jsonBytes,20);out.fill(0x20,20+jsonBytes.length,20+jsonLength);
 const bin=20+jsonLength;view.setUint32(bin,offset,true);view.setUint32(bin+4,0x004E4942,true);
 for(const [index,part] of parts.entries())out.set(part,bin+8+views[index].byteOffset);
 return out;
}
