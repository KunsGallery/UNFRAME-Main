import {test} from 'node:test';import assert from 'node:assert/strict';
import {targetSize,shouldShrink,outputType} from '../js/image-prep.js';
test('phone photos shrink so the long edge is at most 3000px, keeping the ratio',()=>{
 assert.deepEqual(targetSize(4032,3024),[3000,2250]);
 assert.deepEqual(targetSize(3024,4032),[2250,3000]);
 assert.deepEqual(targetSize(1200,800),[1200,800]);
});
test('only large images are re-encoded',()=>{
 assert.equal(shouldShrink(4032,3024,3_000_000),true);
 assert.equal(shouldShrink(1600,1200,12_000_000),true);
 assert.equal(shouldShrink(1600,1200,900_000),false);
});
test('transparent PNGs stay PNG so free-form works keep their shape',()=>{
 assert.equal(outputType('image/png'),'image/png');
 assert.equal(outputType('image/webp'),'image/webp');
 assert.equal(outputType('image/jpeg'),'image/jpeg');
});
