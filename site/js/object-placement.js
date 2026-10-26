import {entryView} from './virtual-links.js';
import {ROOMS} from './virtual-model.js';
// Fixed exhibition spots for objects. Corner spots sit 1.2m from both walls so the walls hide
// the back of a work; centre spots suit full 360° scans. Every spot faces the entrance.
const CORNER_SPAN=1.8,CENTER_SPAN=3,GAP=.3,CLEARANCE=1;
export function objectSpots(room){
 const entry=entryView(room).position,front=-room.w/2+1.2,back=room.w/2-1.6,side=room.d/2-1.2,mid=-room.w/2+room.w*.72;
 const spot=(id,label,type,x,z)=>({id,label,type,position:[x,z],yaw:Math.atan2(entry[0]-x,entry[1]-z),maxSpan:type==='corner'?CORNER_SPAN:CENTER_SPAN});
 const spots=[spot('corner-front-left','정면 왼쪽 모서리','corner',front,side),spot('corner-front-right','정면 오른쪽 모서리','corner',front,-side)];
 if(room.id!=='small')spots.push(spot('corner-back-left','뒤쪽 왼쪽 모서리','corner',back,side),spot('corner-back-right','뒤쪽 오른쪽 모서리','corner',back,-side));
 if(room.id==='large')spots.push(spot('center-left','중앙 왼쪽','center',mid,2.5),spot('center-right','중앙 오른쪽','center',mid,-2.5));
 else spots.push(spot('center','중앙','center',mid,0));
 return spots;
}
export const objectSpan=art=>{const copies=art.copies||1;return copies*art.widthCm/100+(copies-1)*GAP;};
export function placeObjects(artworks,roomSize){
 const room=ROOMS[roomSize]||ROOMS.large,spots=objectSpots(room),used=new Map(),placed=[];
 for(const art of artworks.filter(item=>item.kind==='object')){
  const spot=spots.find(item=>item.id===art.spot);
  if(!spot)throw new Error(`「${art.title}」의 전시 자리를 다시 선택해주세요. 현재 공간 크기에 없는 자리입니다.`);
  if(used.has(spot.id))throw new Error(`「${used.get(spot.id)}」와 「${art.title}」가 같은 전시 자리를 쓰고 있습니다. 다른 자리를 골라주세요.`);
  const span=objectSpan(art),footprint=Math.max(span,(art.depthCm||0)/100);
  if(footprint>spot.maxSpan+1e-9)throw new Error(`「${art.title}」은(는) ${spot.label} 자리(최대 ${Math.round(spot.maxSpan*100)}cm)에 들어가지 않습니다. 연작 수량을 줄이거나 중앙 자리를 선택해주세요.`);
  used.set(spot.id,art.title);placed.push({art,spot,position:spot.position,yaw:spot.yaw+(art.yaw||0)*Math.PI/180,span});
 }
 return placed;
}
export const objectObstacles=placements=>placements.map(({position,span,art})=>({x:position[0],z:position[1],r:Math.max(span,(art.depthCm||0)/100)/2+CLEARANCE}));
// Push a walking visitor out of any object's footprint along the line from its centre.
export function resolveCollision([x,z],obstacles){
 for(const {x:ox,z:oz,r} of obstacles){const dx=x-ox,dz=z-oz,dist=Math.hypot(dx,dz);if(dist>=r)continue;const [ux,uz]=dist?[dx/dist,dz/dist]:[1,0];x=ox+ux*r;z=oz+uz*r;}
 return [x,z];
}
