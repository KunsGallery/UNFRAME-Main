import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reelShot,reelView} from '../js/virtual-reel.js';
import {ROOMS} from '../js/virtual-model.js';
test('reel distributes selected works over the middle of a 30 second film',()=>{
 const works=[{id:'a'},{id:'b'},{id:'c'}];
 assert.equal(reelShot(0,works).type,'intro');assert.equal(reelShot(5,works).work.id,'a');assert.equal(reelShot(12,works).work.id,'b');assert.equal(reelShot(19,works).work.id,'c');assert.equal(reelShot(26,works).type,'end');
});
test('portrait shot stays inside room and looks at the artwork',()=>{
 const room=ROOMS.large,work={wall:'front',position:[-room.w/2+.05,2,0],size:[2,1]};
 const view=reelView({type:'art',work,progress:.5},room,'tour');
 assert.deepEqual(view.target,work.position);assert.ok(view.position[0]>-room.w/2&&view.position[0]<room.w/2);assert.ok(Math.abs(view.position[2])<room.d/2);
});
