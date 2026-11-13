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
const POOL_STRENGTH={general:{frame:.09,wide:.05},museum:{frame:.32,wide:.2}};
const POOL_COLOR={general:[1,.9,.78],museum:[1,.82,.62]};

export function bakedRequest(search,roomId,lighting){
 const params=new URLSearchParams(search);
 if(params.get('room')!=='baked'||!ROOMS_BAKED.has(roomId))return null;
 const light=params.get('light'),mode=lighting==='museum'?'museum':'general';
 return {base:`/assets/virtual/baked/${roomId}-${mode}/`,mode,light:LIGHT_STYLES.includes(light)?light:'frame'};
}

// Loads the shell (room.glb + room.jpg), the garden outside the window and what lies beyond it.
// Returns stand-in materials so code that themes the procedural room keeps working.
export function buildBakedRoom(THREE,scene,renderer,{base,mode}){
 const textures=new THREE.TextureLoader(),maxAniso=renderer.capabilities.getMaxAnisotropy();
 const lighting=textures.load(`${base}room.jpg`);
 lighting.encoding=THREE.sRGBEncoding;lighting.flipY=false;lighting.anisotropy=maxAniso;
 // The bake is a touch bright on screen next to the works, so the general room is dimmed slightly.
 const shell=new THREE.MeshBasicMaterial({map:lighting,toneMapped:false,color:mode==='museum'?0xffffff:0xe4e4e4});
 new THREE.GLTFLoader().load(`${base}room.glb`,gltf=>{gltf.scene.traverse(node=>{if(node.isMesh)node.material=shell;});scene.add(gltf.scene);});
 // The near garden is real: the gravel, curb, flower bed and fence (baked like the room), the trees as
 // crossed picture cards and the low planting as a front and a back strip, all placed from garden.json.
 const ground=textures.load(`${base}garden-ground.jpg`);
 ground.encoding=THREE.sRGBEncoding;ground.flipY=false;ground.anisotropy=maxAniso;
 const groundMaterial=new THREE.MeshBasicMaterial({map:ground,toneMapped:false});
 new THREE.GLTFLoader().load(`${base}garden.glb`,gltf=>{gltf.scene.traverse(node=>{if(node.isMesh)node.material=groundMaterial;});scene.add(gltf.scene);});
 fetch(`${base}garden.json`).then(response=>response.ok?response.json():null).then(data=>{if(data)scene.add(gardenPlants(THREE,textures,base,data));}).catch(()=>{});
 // Beyond the fence: sky, distant trees and buildings, rendered from the middle of the room at eye height
 // looking out of the window (+x), on a sphere just beyond the whole garden (it reaches about 20 m).
 const garden=textures.load(`${base}garden.jpg`);garden.encoding=THREE.sRGBEncoding;
 const sky=new THREE.SphereGeometry(24,64,32);sky.scale(-1,1,1);
 const panorama=new THREE.Mesh(sky,new THREE.MeshBasicMaterial({map:garden,toneMapped:false,fog:false}));
 panorama.position.set(0,1.6,0);panorama.rotation.y=Math.PI;scene.add(panorama);
 // Frames, labels and floor objects are still lit at runtime: a soft, even fill.
 const museum=mode==='museum';
 scene.add(new THREE.AmbientLight(0xffffff,museum?.18:.7),new THREE.HemisphereLight(0xffffff,0x8a877f,museum?.08:.35));
 scene.fog=null;
 const stub=()=>new THREE.MeshStandardMaterial();
 return {walls:stub(),floor:stub(),trim:stub(),ceilingBeams:stub()};
}

// Trees: two crossed cards each (front and side renders), merged into one mesh per picture. Low planting:
// two long strips facing the room. Cards keep the colour they were rendered with (no runtime lighting).
export function gardenPlants(THREE,textures,base,{cards={},trees=[],strips=[]}){
 const group=new THREE.Group();
 const material=file=>{const map=textures.load(`${base}${file}`);map.encoding=THREE.sRGBEncoding;return new THREE.MeshBasicMaterial({map,alphaTest:.45,side:THREE.DoubleSide,toneMapped:false});};
 for(const [kind,card] of Object.entries(cards)){
  const placed=trees.filter(tree=>tree.kind===kind);if(!placed.length)continue;
  for(const face of ['front','side']){
   const positions=[],uvs=[],index=[];
   for(const {position:[x,y,z],scale,turn} of placed){
    const size=card.size*scale,mid=y+card.height*scale/2,c=Math.cos(turn),s=Math.sin(turn);
    // Image right runs along +z for the front card and +x for the side card, before the tree's turn.
    const [ax,az]=face==='front'?[s,c]:[c,-s],start=positions.length/3;
    for(const [u,v] of [[0,0],[1,0],[1,1],[0,1]]){positions.push(x+ax*(u-.5)*size,mid+(v-.5)*size,z+az*(u-.5)*size);uvs.push(u,v);}
    index.push(start,start+1,start+2,start,start+2,start+3);
   }
   const geometry=new THREE.BufferGeometry();
   geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(index);
   group.add(new THREE.Mesh(geometry,material(`card-${kind}-${face}.webp`)));
  }
 }
 for(const strip of strips){
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(strip.width,strip.height),material(`strip-${strip.name}.webp`));
  mesh.position.set(strip.x,strip.height/2,0);mesh.rotation.y=-Math.PI/2;group.add(mesh);
 }
 return group;
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
