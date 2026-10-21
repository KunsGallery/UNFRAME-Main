// Shareable positions in the virtual room: #art-{id} opens in front of a work, and wall
// shortcuts stand inside the walkable bounds facing each wall.
export const hashFor=id=>`#art-${encodeURIComponent(id)}`;
export function artFromHash(hash,ids){
 const match=/^#art-(.+)$/.exec(hash||'');if(!match)return null;
 let id;try{id=decodeURIComponent(match[1]);}catch{return null;}
 return ids.includes(id)?id:null;
}
export const WALL_VIEWS={front:{label:'전면 벽',position:[-1.5,0],yaw:Math.PI/2},left:{label:'좌측 벽',position:[0,0.5],yaw:Math.PI},right:{label:'우측 벽',position:[0,-0.5],yaw:0}};
export const wallViewpoint=wall=>Object.hasOwn(WALL_VIEWS,wall)?WALL_VIEWS[wall]:null;
// Arrival and the "입구로" reset stand at the room's entrance looking at the front wall.
export const ENTRY_VIEW={position:[0,2.5],yaw:Math.PI/2};
