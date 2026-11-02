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
 assert.equal(view.target[0],work.position[0]);assert.equal(view.target[2],work.position[2]);assert.ok(view.target[1]<work.position[1]);assert.ok(view.position[0]>-room.w/2&&view.position[0]<room.w/2);assert.ok(Math.abs(view.position[2])<room.d/2);
});
import {reelCamera,textLayout,textAlpha,formatInfo,REEL_TRANSITION} from '../js/virtual-reel.js';
import {objectSpots,placeObjects} from '../js/object-placement.js';
import {emptyArtwork} from '../js/virtual-model.js';
test('reel text stays inside the Reels safe zone (clear of the caption bar and side buttons)',()=>{
 for(const [w,h] of [[720,1280],[1080,1920],[360,640]]){
  const box=textLayout(w,h);
  assert.ok(box.top>=h*.14&&box.bottom<=h*.72,`${w}: ${box.top}..${box.bottom}`);
  assert.ok(box.left>=w*.05&&box.left+box.maxWidth<=w*.85,`${w}: right edge ${box.left+box.maxWidth}`);
 }
});
test('the camera eases from the previous shot instead of cutting',()=>{
 const room=ROOMS.large,works=[{id:'a',wall:'front',position:[-room.w/2+.05,2,0],size:[1,1]},{id:'b',wall:'left',position:[0,2,-room.d/2+.05],size:[1,1]}];
 const start=5+21/2,before=reelCamera(start-.01,works,room,'tour').view,at=reelCamera(start+.01,works,room,'tour').view,settled=reelCamera(start+REEL_TRANSITION+.2,works,room,'tour');
 const gap=(p,q)=>Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2]);
 assert.ok(gap(before.position,at.position)<.15,`jump ${gap(before.position,at.position)}`);
 const target=settled.view.target,work=works[1].position;
 assert.deepEqual([target[0],target[2]],[work[0],work[2]]);assert.ok(target[1]<work[1],'aims below the work so it sits above the caption');
});
test('object shots orbit gently in front of the work and stay in the room',()=>{
 const room=ROOMS.large,art={...emptyArtwork(),id:'o',title:'o',kind:'object',widthCm:60,heightCm:120,depthCm:40,spot:'corner-front-left',yaw:0,plinth:'low',copies:1,model:{path:'x.glb',name:'x'}};
 const [placement]=placeObjects([art],'large'),work={...art,placement},bounds=[room.w/2,room.d/2];
 const a=reelCamera(5.1,[work],room,'tour').view,b=reelCamera(25.9,[work],room,'tour').view;
 assert.ok(Math.hypot(a.position[0]-b.position[0],a.position[2]-b.position[2])>.5,'camera moves around the work');
 for(const v of [a,b])assert.ok(Math.abs(v.position[0])<bounds[0]&&Math.abs(v.position[2])<bounds[1]);
});
test('captions fade in and out at shot edges',()=>{
 assert.equal(textAlpha(5,5,12),0);assert.equal(textAlpha(9,5,12),1);assert.ok(textAlpha(11.9,5,12)<.5);
});
test('MP4 is ready for Instagram; WebM needs converting',()=>{
 assert.deepEqual(formatInfo('video/mp4;codecs=avc1.42E01E'),{ext:'mp4',instagram:true});
 assert.deepEqual(formatInfo('video/webm;codecs=vp9'),{ext:'webm',instagram:false});
});
