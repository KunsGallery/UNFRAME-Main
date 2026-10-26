// Objects stand on the floor at a fixed spot: optional plinth, the GLB scaled to the entered
// height (proportions kept), copies in a row for series, a top light and a faint floor ring.
// If the model cannot load, the artwork photo stands on the plinth instead.
export const PLINTH_HEIGHT={none:0,low:.1,high:.6};
const GAP=.3;
export function buildObjectGroup(THREE,placement,{loader,photoTexture,onError=()=>{}}){
 const {art,spot,position,yaw,span}=placement,group=new THREE.Group();
 group.position.set(position[0],0,position[1]);group.rotation.y=yaw;
 const tag=object=>{object.traverse(child=>{if(child.isMesh){child.castShadow=true;child.receiveShadow=true;child.userData={isArtwork:true,data:art};}});return object;};
 const width=art.widthCm/100,height=art.heightCm/100,depth=art.depthCm/100,lift=PLINTH_HEIGHT[art.plinth]??0,copies=art.copies||1;
 if(lift){const plinth=new THREE.Mesh(new THREE.BoxGeometry(span+.2,lift,depth+.2),new THREE.MeshStandardMaterial({color:0xf2f0ea,roughness:.85}));plinth.position.y=lift/2;tag(plinth);plinth.userData={isArtwork:true,data:art};group.add(plinth);}
 const ringRadius=Math.max(span,depth)/2+1;
 const ring=new THREE.Mesh(new THREE.RingGeometry(ringRadius-.012,ringRadius,72,1,spot.type==='corner'?-Math.PI*.4:0,spot.type==='corner'?Math.PI*.8:Math.PI*2),new THREE.MeshBasicMaterial({color:0xb9b4aa,transparent:true,opacity:.55,side:THREE.DoubleSide}));
 ring.rotation.x=-Math.PI/2;ring.rotation.z=Math.PI/2;ring.position.y=.003;group.add(ring);
 const offsets=Array.from({length:copies},(_,index)=>-span/2+width/2+index*(width+GAP));
 const showPhoto=()=>{
  for(const x of offsets){const photo=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:photoTexture(),transparent:true,alphaTest:.5,toneMapped:false,side:THREE.DoubleSide}));photo.position.set(x,lift+height/2,0);tag(photo);group.add(photo);}
 };
 const url=art.model?.url;
 if(!url||!loader){showPhoto();return group;}
 loader.load(url,gltf=>{
  const source=gltf.scene,box=new THREE.Box3().setFromObject(source),size=box.getSize(new THREE.Vector3());
  if(!(size.y>0)){showPhoto();return;}
  source.scale.setScalar(height/size.y);
  const scaled=new THREE.Box3().setFromObject(source),center=scaled.getCenter(new THREE.Vector3());
  source.position.set(-center.x,lift-scaled.min.y,-center.z);
  const holder=new THREE.Group();holder.add(source);
  offsets.forEach((x,index)=>{const copy=index?holder.clone(true):holder;copy.position.x=x;tag(copy);group.add(copy);});
 },undefined,error=>{onError(error);showPhoto();});
 return group;
}
// Camera stop for tours and #art- links: 3m in front of the spot, facing it.
export function objectViewpoint(placement){
 const {spot,position,art}=placement,distance=3+Math.max(placement.span,art.depthCm/100)/2;
 const x=position[0]+Math.sin(spot.yaw)*distance,z=position[1]+Math.cos(spot.yaw)*distance;
 return {position:[x,z],yaw:Math.atan2(-(position[0]-x),-(position[1]-z)),lookAt:[position[0],(PLINTH_HEIGHT[art.plinth]??0)+art.heightCm/200,position[1]]};
}
