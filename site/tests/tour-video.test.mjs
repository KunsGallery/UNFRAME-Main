import {test} from 'node:test';import assert from 'node:assert/strict';
import {tourScenes,tourTimeline,tourShot,tourCamera,tourLayout,wallLabel,TOUR_MAX_WORKS} from '../js/tour-video.js';
import {ROOMS,emptyArtwork} from '../js/virtual-model.js';
import {placeObjects} from '../js/object-placement.js';
const room=ROOMS.large;
const wall=(id,side,x)=>({id,title:id,artist:'작가',year:'2026',kind:'flat',wall:side,size:[1,1.2],position:side==='front'?[-room.w/2+.05,1.6,x]:[x,1.6,side==='left'?-room.d/2+.05:room.d/2-.05]});
const works=[wall('a','front',-2),wall('b','front',2),wall('c','left',0),wall('d','right',1),wall('e','left',-3),wall('f','right',3)];
test('the tour runs logo → title → enter → statement → works → overview → outro → QR',()=>{
 const scenes=tourScenes(works.slice(0,3));
 assert.deepEqual(scenes.map(s=>s.type),['logo','title','enter','statement','art','art','art','overview','outro','qr']);
 assert.equal(TOUR_MAX_WORKS,6);
 assert.equal(tourTimeline(tourScenes(works)).total,52);assert.equal(tourTimeline(tourScenes(works.slice(0,3))).total,40);
});
test('works are labelled by their wall, floor objects as floor objects',()=>{
 assert.equal(wallLabel({kind:'flat',wall:'front'}),'정면 벽');assert.equal(wallLabel({kind:'flat',wall:'left'}),'왼쪽 벽');
 assert.equal(wallLabel({kind:'flat',wall:'right'}),'오른쪽 벽');assert.equal(wallLabel({kind:'object'}),'바닥 오브제');
});
test('time maps to the right scene and progress',()=>{
 const line=tourTimeline(tourScenes(works.slice(0,3)));
 assert.equal(tourShot(1,line).scene.type,'logo');assert.equal(tourShot(5,line).scene.type,'title');
 const art=tourShot(16+4+2,line);assert.equal(art.scene.type,'art');assert.equal(art.scene.work.id,'b');assert.ok(Math.abs(art.progress-.5)<1e-9);
 assert.equal(tourShot(39.9,line).scene.type,'qr');assert.equal(tourShot(99,line).scene.type,'qr');
});
test('with a beat, every scene change lands on a bar and the tour keeps its order',()=>{
 const line=tourTimeline(tourScenes(works.slice(0,4)),{bpm:120,phase:.25});
 for(const scene of line.scenes.slice(1))assert.ok(Math.abs(((scene.start-.25)/2)-Math.round((scene.start-.25)/2))<1e-9,`${scene.type} at ${scene.start}`);
 assert.ok(line.scenes.every(scene=>scene.end-scene.start>=2-1e-9),'each scene at least a bar');
});
test('logo and QR scenes have no 3D view; the camera stays in the room and faces the work in close-ups',()=>{
 const line=tourTimeline(tourScenes(works.slice(0,3)));
 assert.equal(tourCamera(1,line,room,16/9).view,null);assert.equal(tourCamera(38,line,room,16/9).view,null);
 for(let t=3;t<35;t+=.5){const {view}=tourCamera(t,line,room,16/9);assert.ok(Math.abs(view.position[0])<room.w/2&&Math.abs(view.position[2])<room.d/2,`t=${t}`);}
 const close=tourCamera(16+3.8,line,room,16/9).view,a=works[0].position;
 assert.deepEqual([close.target[0],close.target[2]],[a[0],a[2]]);
 const near=tourCamera(16+3.9,line,room,16/9).view,far=tourCamera(16+1.6,line,room,16/9).view,d=v=>Math.hypot(v.position[0]-a[0],v.position[2]-a[2]);
 assert.ok(d(near)<d(far),'the camera dollies in towards the work');
});
test('floor objects in the tour turn slowly in front of the camera',()=>{
 const art={...emptyArtwork(),id:'o',title:'o',kind:'object',widthCm:60,heightCm:120,depthCm:40,spot:'corner-front-left',yaw:0,plinth:'low',copies:1,model:{path:'x.glb',name:'x'}};
 const [placement]=placeObjects([art],'large'),line=tourTimeline(tourScenes([{...art,placement}]));
 const a=tourCamera(16.3,line,room,16/9).view,b=tourCamera(19.7,line,room,16/9).view;
 assert.ok(Math.hypot(a.position[0]-b.position[0],a.position[2]-b.position[2])>.3);
});
test('labels and the QR sit inside the frame for landscape and portrait',()=>{
 for(const [w,h] of [[1280,720],[1920,1080],[720,1280]]){
  const box=tourLayout(w,h);
  assert.ok(box.label.x>=w*.04&&box.label.y+box.label.h<=h*(h>w?.8:.9),`${w}x${h} label`);
  assert.ok(box.qr.x>=0&&box.qr.y>=0&&box.qr.x+box.qr.size<=w&&box.qr.y+box.qr.size<=h,`${w}x${h} qr`);
 }
});
