// Rendering-only adaptation of the user-supplied UAU single-room reference.
// Existing room dimensions, artwork placement and storage remain owned by UNFRAME.
export function environmentOptions(settings){return {lighting:settings.lighting||'general',ceiling:settings.ceiling||'plain',outdoor:settings.outdoor===true};}
export function surfaceTexture(THREE,renderer,name,repeatX=1,repeatY=1){
 const texture=new THREE.TextureLoader().load(`/assets/virtual-textures/${name}.webp`,undefined,undefined,()=>console.warn('갤러리 표면 텍스처를 불러오지 못했습니다.'));
 texture.encoding=THREE.sRGBEncoding;texture.wrapS=texture.wrapT=THREE.MirroredRepeatWrapping;texture.repeat.set(repeatX,repeatY);texture.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);return texture;
}
export function materialTexture(THREE,kind){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(256,256);
 const base=kind==='wood'?[126,113,92]:kind==='paving'?[178,178,164]:kind==='urethane'?[227,225,216]:[181,181,169];
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){const noise=((Math.sin(x*12.9898+y*78.233)*43758.5453)%1+1)%1;const grain=kind==='wood'?Math.sin(y*.43+x*.018)*7:0;const n=(noise-.5)*(kind==='urethane'?3:12)+grain;const i=(y*256+x)*4;for(let c=0;c<3;c++)pixels.data[i+c]=base[c]+n;pixels.data[i+3]=255;}
 ctx.putImageData(pixels,0,0);if(kind==='paving'){ctx.strokeStyle='#92978d';ctx.lineWidth=1.5;ctx.strokeRect(0,0,256,256);}
 const texture=new THREE.CanvasTexture(canvas);texture.encoding=THREE.sRGBEncoding;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;return texture;
}
export function buildOutdoor(THREE,scene,renderer,fallbackTexture,{leafCount}={}){
 const group=new THREE.Group();group.name='unframe-woodland-terrace';scene.add(group);
 const box=(material,w,h,d,x,y,z)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);group.add(mesh);return mesh;};
 const paving=materialTexture(THREE,'paving');paving.repeat.set(3,10);
 const stone=new THREE.MeshStandardMaterial({map:paving,bumpMap:paving,bumpScale:.008,roughness:.94});
 box(stone,5.4,.12,14.6,10.7,-.09,0).receiveShadow=true;
 const concrete=materialTexture(THREE,'concrete');concrete.repeat.set(2,8);
 const planterMaterial=new THREE.MeshStandardMaterial({map:concrete,bumpMap:concrete,bumpScale:.006,roughness:.95});
 const planter=box(planterMaterial,.82,.45,14.4,10.75,.2,0);planter.castShadow=planter.receiveShadow=true;
 box(new THREE.MeshStandardMaterial({color:0x3f4834,roughness:1}),.68,.035,14.2,10.75,.43,0);
 const wood=materialTexture(THREE,'wood');wood.repeat.set(3,1);
 const timber=new THREE.MeshStandardMaterial({map:wood,bumpMap:wood,bumpScale:.004,roughness:.83});
 for(const side of [-1,1])for(let y=.08;y<4.2;y+=.18){const plank=box(timber,5.4,.16,.07,10.7,y,side*7.3);plank.receiveShadow=true;}
 let seed=37;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const mobile=matchMedia('(max-width:700px)').matches,count=leafCount??(mobile?700:2600);
 const hedge=new THREE.InstancedMesh(new THREE.SphereGeometry(1,7,5),new THREE.MeshStandardMaterial({color:new THREE.Color(0x506343).convertSRGBToLinear(),roughness:1}),60);
 const leaves=new THREE.InstancedMesh(new THREE.SphereGeometry(.045,5,3),new THREE.MeshStandardMaterial({color:0xffffff,roughness:1}),count);
 const transform=new THREE.Object3D();
 for(let i=0;i<60;i++){transform.position.set(10.75,.74+random()*.08,-7+(i/59)*14);transform.scale.set(.32,.28,.36);transform.rotation.set(0,0,0);transform.updateMatrix();hedge.setMatrixAt(i,transform.matrix);}
 for(let i=0;i<count;i++){transform.position.set(10.75+(random()-.5)*.8,.48+random()*.57,-7+random()*14);transform.scale.set(.8+random()*.5,.3,.7+random()*.5);transform.rotation.set(random()*Math.PI,random()*Math.PI,random()*Math.PI);transform.updateMatrix();leaves.setMatrixAt(i,transform.matrix);leaves.setColorAt(i,new THREE.Color().setHSL(.23+random()*.05,.18+random()*.1,.22+random()*.16).convertSRGBToLinear());}
 hedge.castShadow=hedge.receiveShadow=true;leaves.receiveShadow=true;group.add(hedge,leaves);
 const backdropMaterial=new THREE.MeshBasicMaterial({map:fallbackTexture(),side:THREE.DoubleSide,toneMapped:false,fog:false});
 const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(32,16),backdropMaterial);backdrop.rotation.y=-Math.PI/2;backdrop.position.set(15.4,5.6,0);group.add(backdrop);
 let disposed=false;new THREE.TextureLoader().load('/assets/virtual-textures/long-gallery-woodland-v1.webp',texture=>{if(disposed){texture.dispose();return;}texture.encoding=THREE.sRGBEncoding;texture.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);backdropMaterial.map.dispose();backdropMaterial.map=texture;backdropMaterial.needsUpdate=true;},undefined,()=>console.warn('숲 이미지를 불러오지 못해 기본 풍경을 표시합니다.'));
 const reduced=matchMedia('(prefers-reduced-motion:reduce)');
 return {update:time=>{if(!reduced.matches)leaves.rotation.z=Math.sin(time*.6)*.0012;},dispose:()=>{disposed=true;}};
}
export function canvasSideMaterials(THREE,texture,edge){
 return Array.from({length:6},(_,index)=>{
  if(index>=4||edge!=='image')return new THREE.MeshStandardMaterial({color:edge==='black'?0x171917:0xd9cdb6,roughness:1});
  const map=new THREE.Texture(texture.image);map.encoding=texture.encoding;texture.userData??={edgeMaps:[]};texture.userData.edgeMaps??=[];texture.userData.edgeMaps.push(map);if(texture.image)map.needsUpdate=true;map.wrapS=map.wrapT=THREE.ClampToEdgeWrapping;
  if(index<2){map.repeat.set(.025,1);map.offset.set(index===0?.975:0,0);}else{map.repeat.set(1,.025);map.offset.set(0,index===2?.975:0);}
  return new THREE.MeshStandardMaterial({map,roughness:.95,color:0xffffff});
 });
}
