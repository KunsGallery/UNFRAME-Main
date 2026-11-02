import {test} from 'node:test';import assert from 'node:assert/strict';
import {tourScenes,tourTimeline,tourShot,tourCamera,tourLayout,wallLabel,TOUR_MAX_WORKS,SHOTS} from '../js/tour-video.js';
import {ROOMS,emptyArtwork} from '../js/virtual-model.js';
import {placeObjects} from '../js/object-placement.js';
const room=ROOMS.large;
const wall=(id,side,x)=>({id,title:id,artist:'작가',year:'2026',kind:'flat',wall:side,size:[1,1.2],position:side==='front'?[-room.w/2+.05,1.6,x]:[x,1.6,side==='left'?room.d/2-.05:-room.d/2+.05]});
const works=[wall('a','front',-2),wall('b','front',2),wall('c','left',0),wall('d','right',1),wall('e','left',-3),wall('f','right',3)];
test('the tour runs logo → title → enter → (wall → its works)… → overview → outro → QR',()=>{
 const scenes=tourScenes(works.slice(0,3));
 assert.deepEqual(scenes.map(s=>s.type),['logo','title','enter','wall','art','art','wall','art','overview','outro','qr']);
 assert.equal(TOUR_MAX_WORKS,6);
 assert.equal(tourTimeline(tourScenes(works)).total,56);assert.equal(tourTimeline(tourScenes(works.slice(0,3))).total,41);
});
test('works are grouped by wall in the order walls first appear, and neighbouring close-ups use different moves',()=>{
 const scenes=tourScenes(works);
 assert.deepEqual(scenes.filter(s=>s.type==='wall').map(s=>s.label),['정면 벽','왼쪽 벽','오른쪽 벽']);
 const arts=scenes.filter(s=>s.type==='art');
 assert.deepEqual(arts.map(s=>s.work.id),['a','b','c','e','d','f']);assert.deepEqual(arts.map(s=>s.number),[1,2,3,4,5,6]);
 assert.deepEqual(arts.slice(0,5).map(s=>s.shot),SHOTS);arts.slice(1).forEach((s,i)=>assert.notEqual(s.shot,arts[i].shot));
});
test('every close-up move ends square on the work, centred, and the dolly zoom keeps the work the same size',()=>{
 const line=tourTimeline(tourScenes(works)),arts=line.scenes.filter(s=>s.type==='art');
 for(const scene of arts){
  const {view}=tourCamera(scene.end-.01,line,room,16/9),a=scene.work.position;
  assert.deepEqual(view.target,a,`${scene.shot} target`);
  const along=scene.work.wall==='front'?Math.abs(view.position[2]-a[2]):Math.abs(view.position[0]-a[0]);assert.ok(along<1e-6,`${scene.shot} centred`);
  assert.ok(Math.abs(view.position[1]-a[1])<1e-6,`${scene.shot} level`);
  assert.ok(Math.hypot(view.position[0]-a[0],view.position[2]-a[2])>1.35,`${scene.shot} on the room side of the ${scene.work.wall} wall, at its framing distance`);
 }
 const zoom=arts.find(s=>s.shot==='dollyZoom'),a=zoom.work.position,size=t=>{const v=tourCamera(t,line,room,16/9).view;return Math.hypot(v.position[0]-a[0],v.position[2]-a[2])*Math.tan(v.fov*Math.PI/360);};
 const early=tourCamera(zoom.start+1.4,line,room,16/9).view,late=tourCamera(zoom.end-.3,line,room,16/9).view;
 assert.ok(early.fov>late.fov+5,'the lens narrows');assert.ok(Math.abs(size(zoom.start+1.4)-size(zoom.end-.3))<1e-6,'the work keeps its size');
});
test('a wall wide shot films from the far side and drifts sideways; the overview rises',()=>{
 const line=tourTimeline(tourScenes(works.slice(0,3))),wall=line.scenes.find(s=>s.type==='wall');
 const a=tourCamera(wall.start+1.25,line,room,16/9).view,b=tourCamera(wall.end-.05,line,room,16/9).view;
 assert.ok(a.position[0]>room.w/2-2,'far side of the room');assert.ok(Math.abs(a.position[2]-b.position[2])>.5,'drifts');
 const over=line.scenes.find(s=>s.type==='overview'),low=tourCamera(over.start+1.25,line,room,16/9).view,high=tourCamera(over.end-.05,line,room,16/9).view;
 assert.ok(high.position[1]>low.position[1]+.8,'crane up');
});
test('works are labelled by their wall, floor objects as floor objects',()=>{
 assert.equal(wallLabel({kind:'flat',wall:'front'}),'정면 벽');assert.equal(wallLabel({kind:'flat',wall:'left'}),'왼쪽 벽');
 assert.equal(wallLabel({kind:'flat',wall:'right'}),'오른쪽 벽');assert.equal(wallLabel({kind:'object'}),'바닥 오브제');
});
test('time maps to the right scene and progress',()=>{
 const line=tourTimeline(tourScenes(works.slice(0,3)));
 assert.equal(tourShot(1,line).scene.type,'logo');assert.equal(tourShot(5,line).scene.type,'title');
 const art=tourShot(20,line);assert.equal(art.scene.type,'art');assert.equal(art.scene.work.id,'b');assert.ok(Math.abs(art.progress-.5)<1e-9);
 assert.equal(tourShot(40.9,line).scene.type,'qr');assert.equal(tourShot(99,line).scene.type,'qr');assert.equal(tourShot(20,line).total,41);
});
test('with a beat, every scene change lands on a bar and the tour keeps its order',()=>{
 const line=tourTimeline(tourScenes(works.slice(0,4)),{bpm:120,phase:.25});
 for(const scene of line.scenes.slice(1))assert.ok(Math.abs(((scene.start-.25)/2)-Math.round((scene.start-.25)/2))<1e-9,`${scene.type} at ${scene.start}`);
 assert.ok(line.scenes.every(scene=>scene.end-scene.start>=2-1e-9),'each scene at least a bar');
});
test('logo and QR scenes have no 3D view; the camera stays in the room and faces the work in close-ups',()=>{
 const line=tourTimeline(tourScenes(works.slice(0,3)));
 assert.equal(tourCamera(1,line,room,16/9).view,null);assert.equal(tourCamera(38,line,room,16/9).view,null);
 for(let t=3;t<36;t+=.5){const {view}=tourCamera(t,line,room,16/9);assert.ok(Math.abs(view.position[0])<room.w/2&&Math.abs(view.position[2])<room.d/2,`t=${t}`);}
 const close=tourCamera(17.8,line,room,16/9).view,a=works[0].position;
 assert.deepEqual([close.target[0],close.target[2]],[a[0],a[2]]);
 const near=tourCamera(17.9,line,room,16/9).view,far=tourCamera(15.6,line,room,16/9).view,d=v=>Math.hypot(v.position[0]-a[0],v.position[2]-a[2]);
 assert.ok(d(near)<d(far),'the camera dollies in towards the work');
});
test('floor objects in the tour turn slowly in front of the camera',()=>{
 const art={...emptyArtwork(),id:'o',title:'o',kind:'object',widthCm:60,heightCm:120,depthCm:40,spot:'corner-front-left',yaw:0,plinth:'low',copies:1,model:{path:'x.glb',name:'x'}};
 const [placement]=placeObjects([art],'large'),line=tourTimeline(tourScenes([{...art,placement}]));
 const a=tourCamera(15.3,line,room,16/9).view,b=tourCamera(17.7,line,room,16/9).view;
 assert.ok(Math.hypot(a.position[0]-b.position[0],a.position[2]-b.position[2])>.3);
});
test('labels and the QR sit inside the frame for landscape and portrait',()=>{
 for(const [w,h] of [[1280,720],[1920,1080],[720,1280]]){
  const box=tourLayout(w,h);
  assert.ok(box.label.x>=w*.04&&box.label.y+box.label.h<=h*(h>w?.8:.9),`${w}x${h} label`);
  assert.ok(box.qr.x>=0&&box.qr.y>=0&&box.qr.x+box.qr.size<=w&&box.qr.y+box.qr.size<=h,`${w}x${h} qr`);
 }
});
