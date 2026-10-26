import {test} from 'node:test';import assert from 'node:assert/strict';
import {inspectGlb} from '../js/glb-check.js';
import {makeTestGlb} from './helpers/glb.mjs';
test('a plain binary glTF 2 file passes',()=>{
 assert.deepEqual(inspectGlb(makeTestGlb({asset:{version:'2.0'}})),{ok:true});
});
test('wrong signature, version or truncated files are rejected',()=>{
 const bad=new Uint8Array(makeTestGlb({asset:{version:'2.0'}}));bad[0]=0;
 assert.match(inspectGlb(bad.buffer).reason,/GLB 파일이 아닙니다/);
 const v1=new Uint8Array(makeTestGlb({asset:{version:'2.0'}}));new DataView(v1.buffer).setUint32(4,1,true);
 assert.match(inspectGlb(v1.buffer).reason,/버전/);
 assert.match(inspectGlb(new ArrayBuffer(8)).reason,/GLB 파일이 아닙니다/);
});
test('Draco or meshopt compressed models are rejected with export advice',()=>{
 for(const ext of ['KHR_draco_mesh_compression','EXT_meshopt_compression']){
  const result=inspectGlb(makeTestGlb({asset:{version:'2.0'},extensionsRequired:[ext]}));
  assert.equal(result.ok,false);assert.match(result.reason,/압축하지 않은 GLB/);
 }
 assert.deepEqual(inspectGlb(makeTestGlb({asset:{version:'2.0'},extensionsUsed:['KHR_materials_emissive_strength']})),{ok:true});
});
