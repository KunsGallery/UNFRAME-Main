import {test} from 'node:test';import assert from 'node:assert/strict';
import {objectSpots,placeObjects,objectObstacles,resolveCollision} from '../js/object-placement.js';
import {ROOMS,emptyArtwork,layoutArtworks,validateArtwork,validateGallery,defaultGallery} from '../js/virtual-model.js';
import {entryView} from '../js/virtual-links.js';
const object=(id,extra={})=>({...emptyArtwork(),id,title:`오브제 ${id}`,artist:'권광훈',kind:'object',widthCm:60,heightCm:120,depthCm:50,spot:'corner-front-left',yaw:0,plinth:'low',copies:1,model:{path:`virtualGalleries/g/${id}/12345678-1234-1234-1234-123456789012.glb`,name:'a.glb'},image:{url:'',path:`virtualGalleries/g/${id}/12345678-1234-1234-1234-123456789012.webp`,alt:''},...extra});
test('each room size offers its corner and centre spots inside the walls',()=>{
 assert.deepEqual(['small','medium','large'].map(size=>objectSpots(ROOMS[size]).length),[3,5,6]);
 for(const room of Object.values(ROOMS))for(const spot of objectSpots(room)){
  assert.ok(Math.abs(spot.position[0])<room.w/2&&Math.abs(spot.position[1])<room.d/2,spot.id);
  if(spot.type==='corner')assert.ok(Math.abs(Math.abs(spot.position[1])-(room.d/2-1.2))<1e-9,spot.id);
  const entry=entryView(room).position,dist=Math.hypot(entry[0]-spot.position[0],entry[1]-spot.position[1]);
  assert.ok(dist>spot.maxSpan/2+1+0.5,`${room.id} ${spot.id} keeps the entrance clear`);
 }
 assert.deepEqual(objectSpots(ROOMS.small).map(s=>s.id),['corner-front-left','corner-front-right','center']);
});
test('spots face the entrance and the artist yaw adds to it',()=>{
 const room=ROOMS.medium,entry=entryView(room).position;
 const [placed]=placeObjects([object('a',{yaw:90})],'medium');
 const spot=objectSpots(room).find(s=>s.id==='corner-front-left');
 assert.ok(Math.abs(spot.yaw-Math.atan2(entry[0]-spot.position[0],entry[1]-spot.position[1]))<1e-9);
 assert.ok(Math.abs(placed.yaw-(spot.yaw+Math.PI/2))<1e-9);
});
test('placement rejects missing spots, shared spots and works too large for a spot',()=>{
 assert.throws(()=>placeObjects([object('a',{spot:'corner-back-left'})],'small'),/전시 자리/);
 assert.throws(()=>placeObjects([object('a'),object('b')],'medium'),/같은 전시 자리/);
 assert.throws(()=>placeObjects([object('a',{widthCm:250})],'medium'),/240cm/);
 assert.throws(()=>placeObjects([object('a',{widthCm:60,copies:4})],'medium'),/240cm/);
 const [series]=placeObjects([object('a',{widthCm:40,copies:3})],'medium');
 assert.ok(Math.abs(series.span-(1.2+0.6))<1e-9);
 assert.doesNotThrow(()=>placeObjects([object('a',{spot:'center',widthCm:250,depthCm:200})],'medium'));
});
test('visitors are pushed out of an object\'s footprint but walk freely elsewhere',()=>{
 const obstacles=objectObstacles(placeObjects([object('a')],'medium'));
 const o=obstacles[0];assert.ok(Math.abs(o.r-(0.6/2+1))<1e-9);
 const pushed=resolveCollision([o.x+0.1,o.z],obstacles);
 assert.ok(Math.hypot(pushed[0]-o.x,pushed[1]-o.z)>=o.r-1e-9);
 assert.deepEqual(resolveCollision([0,0],obstacles),[0,0]);
 assert.ok(Math.hypot(...resolveCollision([o.x,o.z],obstacles).map((v,i)=>v-[o.x,o.z][i]))>=o.r-1e-9);
});
test('objects validate their own fields and stay off the walls',()=>{
 assert.doesNotThrow(()=>validateArtwork(object('a')));
 assert.throws(()=>validateArtwork(object('a',{model:{path:'',name:''}})),/GLB/);
 assert.throws(()=>validateArtwork(object('a',{copies:6})),/연작/);
 assert.throws(()=>validateArtwork(object('a',{yaw:360})),/방향/);
 assert.throws(()=>validateArtwork(object('a',{plinth:'tall'})),/좌대/);
 assert.throws(()=>validateArtwork(object('a',{depthCm:5})),/깊이/);
 assert.throws(()=>validateArtwork({...object('a'),kind:'statue'}),/종류/);
 const flat={...emptyArtwork(),id:'f',title:'회화',artist:'작가',order:0,image:{url:'x',path:'',alt:''}};
 assert.deepEqual(layoutArtworks([flat,object('a')],'medium').map(a=>a.id),['f']);
});
import {objectViewpoint} from '../js/virtual-objects.js';
import {playerBounds} from '../js/virtual-links.js';
test('tour stops stand in front of each spot, inside the room and outside the footprint',()=>{
 for(const size of ['small','medium','large'])for(const spot of objectSpots(ROOMS[size])){
  const [placed]=placeObjects([object('a',{spot:spot.id})],size),view=objectViewpoint(placed),bounds=playerBounds(ROOMS[size]);
  assert.ok(view.position[0]>=bounds.minX&&view.position[0]<=bounds.maxX&&view.position[1]>=bounds.minZ&&view.position[1]<=bounds.maxZ,`${size} ${spot.id}`);
  const [o]=objectObstacles([placed]);assert.ok(Math.hypot(view.position[0]-o.x,view.position[1]-o.z)>o.r,`${size} ${spot.id} outside footprint`);
  const look=[-Math.sin(view.yaw),-Math.cos(view.yaw)],to=[o.x-view.position[0],o.z-view.position[1]],dot=(look[0]*to[0]+look[1]*to[1])/Math.hypot(...to);
  assert.ok(dot>.999,`${size} ${spot.id} faces the object`);
 }
});

const flatWork=(id,wall,order,widthCm=100)=>({...emptyArtwork(),id,title:`평면 ${id}`,artist:'작가',wall,order,widthCm,heightCm:100,image:{url:'x',path:'',alt:''}});
test('corner objects may not stand in front of wall works on the adjacent walls',()=>{
 const crowded=[0,1,2,3].map(n=>flatWork('f'+n,'front',n,140));
 assert.throws(()=>placeObjects([...crowded,object('a',{spot:'corner-front-left'})],'small'),/벽 작품/);
 assert.doesNotThrow(()=>placeObjects([flatWork('one','front',0,100),object('a',{spot:'corner-front-left'})],'small'));
 assert.doesNotThrow(()=>placeObjects([...crowded,object('a',{spot:'center'})],'small'));
});
test('changing the room size is checked against object spots',()=>{
 assert.throws(()=>validateGallery({...defaultGallery({title:'t',summary:''}),roomSize:'small'},[object('a',{spot:'corner-back-left'})]),/전시 자리/);
 assert.doesNotThrow(()=>validateGallery({...defaultGallery({title:'t',summary:''}),roomSize:'medium'},[object('a',{spot:'corner-back-left'})]));
});
test('photo relief objects stand only in corner spots',()=>{
 const photo=(id,spot)=>object(id,{spot,model:{path:`virtualGalleries/g/${id}/12345678-1234-1234-1234-123456789abc.glb`,name:'relief.glb',source:'photo'}});
 for(const room of Object.values(ROOMS))assert.ok(objectSpots(room,{photo:true}).every(spot=>spot.type==='corner'),room.id);
 assert.equal(objectSpots(ROOMS.large,{photo:true}).length,4);
 assert.doesNotThrow(()=>placeObjects([photo('p1','corner-front-left')],'large'));
 assert.throws(()=>placeObjects([photo('p2','center-left')],'large'),/사진으로 만든 입체라 모서리 자리에만/);
 assert.doesNotThrow(()=>placeObjects([object('g1',{spot:'center-left'})],'large'));
});
test('model source must be glb or photo',()=>{
 assert.doesNotThrow(()=>validateArtwork(object('s1',{model:{path:'virtualGalleries/g/s1/12345678-1234-1234-1234-123456789abc.glb',name:'a.glb',source:'photo'}})));
 assert.throws(()=>validateArtwork(object('s2',{model:{path:'virtualGalleries/g/s2/12345678-1234-1234-1234-123456789abc.glb',name:'a.glb',source:'ai'}})),/3D/);
});
test('stored models keep path, name and the photo source but drop display-only fields',async()=>{
 const {storedModel}=await import('../js/virtual-model.js');
 assert.deepEqual(storedModel({path:'p.glb',name:'a',source:'photo',url:'blob:x',load:()=>{}}),{path:'p.glb',name:'a',source:'photo'});
 assert.deepEqual(storedModel({path:'p.glb'}),{path:'p.glb',name:''});
 assert.equal(storedModel(undefined),undefined);
});
test('a 200cm-wide object fits a corner, which moves out so it clears both walls',()=>{
 const room=ROOMS.large,chair=object('chair',{widthCm:200,depthCm:80,heightCm:90,spot:'corner-front-left'});
 const [placed]=placeObjects([chair],'large');
 const half=1,x=placed.position[0],z=placed.position[1];
 assert.ok(room.w/2-Math.abs(x)>=half+.15-1e-9&&room.d/2-Math.abs(z)>=half+.15-1e-9,`clears walls at ${x},${z}`);
 const small=placeObjects([object('s',{widthCm:60})],'large')[0];
 assert.deepEqual(small.position,small.spot.position,'small works keep the usual spot');
 assert.throws(()=>placeObjects([object('big',{widthCm:250})],'large'),/최대 240cm/);
});
