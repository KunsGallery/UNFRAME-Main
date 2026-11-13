// Baked rooms: the room shell with its lighting rendered ahead of time in Blender (see /blender in
// the repository), shown unlit so phones draw it cheaply. Artwork lights are not baked into the room;
// each work gets a pre-rendered light pool behind it, scaled to its size, so any upload is lit the same.
// Every room size is baked twice: general lighting (also used for 'focused') and dark museum.
// Preview only for now: ?room=baked[&light=frame|wide].
const ROOMS_BAKED=new Set(['small','medium','large']);
// 'frame' is a rectangular framing projector cut to the work, 'wide' a generous round pool.
export const LIGHT_STYLES=['frame','wide'];
const POOLS='/assets/virtual/baked/pools/';
// How strongly each style's pool adds to the wall (the pool images peak at white). In the dark museum
// the walls are dim, so the pools carry most of the light and are warmer.
const POOL_STRENGTH={general:{frame:.12,wide:.07},museum:{frame:.42,wide:.26}};
const POOL_COLOR={general:[1,.9,.78],museum:[1,.82,.62]};

export function bakedRequest(search,roomId,lighting){
 const params=new URLSearchParams(search);
 if(params.get('room')!=='baked'||!ROOMS_BAKED.has(roomId))return null;
 const light=params.get('light'),mode=lighting==='museum'?'museum':'general';
 return {base:`/assets/virtual/baked/${roomId}-${mode}/`,mode,light:LIGHT_STYLES.includes(light)?light:'frame'};
}

// Loads the shell (room.glb + room.jpg), the garden seen through the window and the window glass.
// Returns stand-in materials so code that themes the procedural room keeps working.
export function buildBakedRoom(THREE,scene,renderer,{base,mode}){
 const textures=new THREE.TextureLoader(),maxAniso=renderer.capabilities.getMaxAnisotropy();
 const lighting=textures.load(`${base}room.jpg`);
 lighting.encoding=THREE.sRGBEncoding;lighting.flipY=false;lighting.anisotropy=maxAniso;
 const shell=new THREE.MeshBasicMaterial({map:lighting,toneMapped:false});
 new THREE.GLTFLoader().load(`${base}room.glb`,gltf=>{gltf.scene.traverse(node=>{if(node.isMesh)node.material=shell;});scene.add(gltf.scene);});
 // The garden panorama was rendered from the middle of the room at eye height, looking out of the window (+x).
 // It sits on a sphere about as far as the garden fence, so the trees and fence line up through the
 // window from anywhere in the room instead of looking far away.
 const garden=textures.load(`${base}garden.jpg`);garden.encoding=THREE.sRGBEncoding;
 const sky=new THREE.SphereGeometry(13.5,64,32);sky.scale(-1,1,1);
 const panorama=new THREE.Mesh(sky,new THREE.MeshBasicMaterial({map:garden,toneMapped:false,fog:false}));
 panorama.position.set(0,1.6,0);panorama.rotation.y=Math.PI;scene.add(panorama);
 // Frames, labels and floor objects are still lit at runtime: a soft, even fill.
 const museum=mode==='museum';
 scene.add(new THREE.AmbientLight(0xffffff,museum?.18:.7),new THREE.HemisphereLight(0xffffff,0x8a877f,museum?.08:.35));
 scene.fog=null;
 const stub=()=>new THREE.MeshStandardMaterial();
 return {walls:stub(),floor:stub(),trim:stub(),ceilingBeams:stub()};
}

// The light a track light throws on the wall around one work, as an additive plane just in front of the
// wall (the work's group sits 5cm off the wall). Pools were rendered for a 1 x 1 m work on a 4 x 4 m
// wall: round pools scale with the work's longer side, the framing projector with its width and height.
const poolTextures=new Map();
export function lightPool(THREE,{mode,light},w,h){
 if(!poolTextures.has(light)){const texture=new THREE.TextureLoader().load(`${POOLS}pool-${light}.png`);texture.encoding=THREE.sRGBEncoding;poolTextures.set(light,texture);}
 const [sx,sy]=light==='frame'?[w,h]:[Math.max(w,h),Math.max(w,h)];
 const strength=POOL_STRENGTH[mode][light];
 const material=new THREE.MeshBasicMaterial({map:poolTextures.get(light),color:new THREE.Color(...POOL_COLOR[mode].map(c=>c*strength)),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
 const pool=new THREE.Mesh(new THREE.PlaneGeometry(4*sx,4*sy),material);
 pool.position.z=-0.045;pool.renderOrder=1;
 return pool;
}
