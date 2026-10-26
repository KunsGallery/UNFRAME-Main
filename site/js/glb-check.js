// Reads a GLB header and JSON chunk before upload: binary glTF 2 only, and no Draco or meshopt
// compression (the gallery ships only the plain GLTFLoader).
const MAGIC=0x46546c67,JSON_CHUNK=0x4e4f534a,COMPRESSED=['KHR_draco_mesh_compression','EXT_meshopt_compression'];
const NOT_GLB='GLB 파일이 아닙니다. 3D 앱에서 GLB(바이너리 glTF) 형식으로 내보내 주세요.';
export function inspectGlb(buffer){
 if(!(buffer instanceof ArrayBuffer)||buffer.byteLength<20)return {ok:false,reason:NOT_GLB};
 const view=new DataView(buffer);
 if(view.getUint32(0,true)!==MAGIC)return {ok:false,reason:NOT_GLB};
 if(view.getUint32(4,true)!==2)return {ok:false,reason:'glTF 2.0 버전의 GLB만 올릴 수 있습니다.'};
 if(view.getUint32(8,true)>buffer.byteLength)return {ok:false,reason:'파일이 끝까지 저장되지 않았습니다. 다시 내보내 주세요.'};
 const length=view.getUint32(12,true);
 if(view.getUint32(16,true)!==JSON_CHUNK||20+length>buffer.byteLength)return {ok:false,reason:NOT_GLB};
 let json;try{json=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,length)));}catch{return {ok:false,reason:NOT_GLB};}
 if((json.extensionsRequired||[]).some(ext=>COMPRESSED.includes(ext)))return {ok:false,reason:'압축된 GLB(Draco/meshopt)입니다. 3D 앱의 내보내기 설정에서 압축을 끄고, 압축하지 않은 GLB로 다시 내보내 주세요.'};
 return {ok:true};
}
