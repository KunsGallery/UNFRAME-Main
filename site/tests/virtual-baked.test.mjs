import {test} from 'node:test';import assert from 'node:assert/strict';
import {bakedRequest,LIGHT_STYLES} from '../js/virtual-baked.js';
test('a baked room is only used when asked for, per room size and lighting mode',()=>{
 assert.equal(bakedRequest('',`large`,'general'),null);
 assert.equal(bakedRequest('?room=procedural','large','general'),null);
 assert.equal(bakedRequest('?room=baked','huge','general'),null,'only sizes that have a bake');
 assert.deepEqual(bakedRequest('?room=baked','medium','general'),{base:'/assets/virtual/baked/medium-general/',mode:'general',light:'frame'});
 assert.equal(bakedRequest('?room=baked','small','focused').mode,'general','focused lighting uses the general bake');
 assert.deepEqual(bakedRequest('?preview=1&room=baked&light=frame','large','museum'),{base:'/assets/virtual/baked/large-museum/',mode:'museum',light:'frame'});
 assert.equal(bakedRequest('?room=baked&light=disco','large','general').light,'frame','unknown styles fall back to frame');
 assert.equal(bakedRequest('?room=baked&light=tight','large','general').light,'frame','the retired tight style falls back to frame');
 assert.deepEqual(LIGHT_STYLES,['frame','wide']);
});
