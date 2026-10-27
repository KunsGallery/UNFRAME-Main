import {ROOMS} from './virtual-model.js';
// Shareable positions in the virtual room: #art-{id} opens in front of a work, and wall
// shortcuts stand inside the walkable bounds facing each wall.
export const hashFor=id=>`#art-${encodeURIComponent(id)}`;
export function artFromHash(hash,ids){
 const match=/^#art-(.+)$/.exec(hash||'');if(!match)return null;
 let id;try{id=decodeURIComponent(match[1]);}catch{return null;}
 return ids.includes(id)?id:null;
}
// Viewpoints scale with the room: arrival stands 4.2m from the front wall, shortcuts sit
// within the walkable bounds facing each wall.
export const WALL_VIEWS={front:{yaw:Math.PI/2},left:{yaw:Math.PI},right:{yaw:0}};
export const playerBounds=room=>({minX:-room.w/2+1,maxX:room.w/2-1.2,minZ:-room.d/2+1,maxZ:room.d/2-1});
export function wallViewpoint(wall,room=ROOMS.large){
 if(!Object.hasOwn(WALL_VIEWS,wall))return null;
 const position=wall==='front'?[-room.w/2+room.w*.4,0]:[0,wall==='left'?.5:-.5];
 return {...WALL_VIEWS[wall],position};
}
export const entryView=room=>({position:[-room.w/2+4.2,0],yaw:Math.PI/2});
