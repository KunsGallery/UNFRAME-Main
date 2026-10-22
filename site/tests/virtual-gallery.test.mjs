import {test} from 'node:test';import assert from 'node:assert/strict';
import {environmentOptions} from '../js/virtual-environment.js';
import {defaultGallery,emptyArtwork,validateArtwork,validateGallery,layoutArtworks,artworkMount} from '../js/virtual-model.js';
test('gallery publication requires real saved works, valid settings and bounded editorial data',()=>{
 const gallery=defaultGallery({title:'전시',summary:''});assert.doesNotThrow(()=>validateGallery(gallery));
 assert.throws(()=>validateGallery({...gallery,published:true}),/한 점/);
 assert.throws(()=>validateGallery({...gallery,speed:99}),/설정/);
 assert.throws(()=>validateGallery({...gallery,wallColor:'url(javascript:)' }),/설정/);
});
test('artwork requires title, artist, image and sensible physical dimensions',()=>{
 const artwork={...emptyArtwork(),title:'작품',artist:'작가',image:{path:'virtualGalleries/ex/art/image.webp',url:'',alt:''}};
 assert.doesNotThrow(()=>validateArtwork(artwork));
 assert.throws(()=>validateArtwork({...artwork,widthCm:0}),/크기/);
 assert.throws(()=>validateArtwork({...artwork,image:{url:'',path:'',alt:''}}),/이미지/);
 assert.throws(()=>validateArtwork({...artwork,description:'a'.repeat(5001)}),/글자/);
});
test('real dimensions remain unchanged when works are reflowed onto two rows',()=>{
 const artwork={...emptyArtwork(),title:'작품',artist:'작가',widthCm:110,heightCm:110,order:0};
 const works=Array.from({length:8},(_,index)=>({...artwork,id:`art-${index}`,order:index}));
 const laid=layoutArtworks(works);
 assert.equal(laid.length,8);assert.equal(new Set(laid.map(art=>art.position[1])).size,2);
 for(const art of laid){assert.deepEqual(art.size,[1.1,1.1]);assert.ok(art.position[2]-art.size[0]/2>=-5);assert.ok(art.position[2]+art.size[0]/2<=5);}
 assert.deepEqual(layoutArtworks(works.reverse()).map(art=>art.id),laid.map(art=>art.id));
 const portrait=layoutArtworks([{...artwork,id:'portrait',widthCm:90,heightCm:160}])[0];
 assert.deepEqual(portrait.size,[.9,1.6]);
});
test('large works are rejected rather than silently shrunk; physical frame borders also consume wall space',()=>{
 const artwork={...emptyArtwork(),id:'art',title:'대형 작품',artist:'작가',widthCm:500,heightCm:300};
 assert.deepEqual(layoutArtworks([artwork])[0].size,[5,3]);
 assert.throws(()=>layoutArtworks([{...artwork,heightCm:500}]),/실제 크기/);
 assert.throws(()=>layoutArtworks([{...artwork,id:'one'},{...artwork,id:'two'}]),/모두 들어가지/);
 assert.doesNotThrow(()=>layoutArtworks([{...artwork,heightCm:360,frame:'canvas'}]));
 assert.throws(()=>layoutArtworks([{...artwork,heightCm:360,frame:'black'}]),/실제 크기/);
});
test('canvas adds thickness with no border, paper stays thin, and framed works retain their original surface dimensions',()=>{
 assert.equal(emptyArtwork().frame,'canvas');
 assert.deepEqual(artworkMount('canvas'),{framed:false,border:0,depth:.035});
 assert.deepEqual(artworkMount('none'),{framed:false,border:0,depth:.004});
 assert.deepEqual(artworkMount('black'),{framed:true,border:.12,depth:.08});
});

test('optional finishes preserve legacy defaults and physical canvas dimensions',()=>{
 const base=defaultGallery({title:'전시',summary:''});
 for(const lighting of ['general','focused'])for(const ceiling of ['plain','luminous'])assert.doesNotThrow(()=>validateGallery({...base,lighting,ceiling,theme:'urethane'}));
 const legacy={...base};delete legacy.lighting;delete legacy.ceiling;assert.doesNotThrow(()=>validateGallery(legacy));
 for(const extra of [{lighting:'spot'},{ceiling:'glass'},{theme:'unknown'}])assert.throws(()=>validateGallery({...base,...extra}));
 const art={...emptyArtwork(),title:'작품',artist:'작가',image:{path:'virtualGalleries/ex/art/image.webp',url:'',alt:''},canvasThickness:5,canvasEdge:'image'};
 assert.doesNotThrow(()=>validateArtwork(art));assert.equal(artworkMount('canvas',5).depth,.05);assert.equal(artworkMount('black',5).depth,.08);assert.deepEqual(layoutArtworks([art])[0].size,[.8,1]);
 for(const extra of [{canvasThickness:0},{canvasThickness:11},{canvasThickness:'5'},{canvasEdge:'unknown'}])assert.throws(()=>validateArtwork({...art,...extra}));
});

test('legacy environment uses general lighting and plain ceiling without replacing outdoor visibility',()=>{assert.deepEqual(environmentOptions({outdoor:true}),{lighting:'general',ceiling:'plain',outdoor:true});assert.equal(environmentOptions({outdoor:false}).outdoor,false);});
import {createTour} from '../js/virtual-tour.js';
import {inputHint} from '../js/virtual-hud.js';
test('guided tour walks forward and back and ends after the last artwork',()=>{
 const tour=createTour(['a','b','c']);
 assert.equal(tour.current(),null);
 assert.deepEqual(tour.start(),{id:'a',index:1,total:3});
 assert.deepEqual(tour.prev(),{id:'a',index:1,total:3});
 assert.deepEqual(tour.next(),{id:'b',index:2,total:3});
 assert.deepEqual(tour.next(),{id:'c',index:3,total:3});
 assert.equal(tour.next(),null);assert.equal(tour.current(),null);
 tour.start();tour.stop();assert.equal(tour.current(),null);
 assert.equal(createTour([]).start(),null);
});
test('input hints match the device',()=>{
 assert.doesNotMatch(inputHint(true),/WASD/);assert.match(inputHint(true),/드래그|손가락/);
 assert.match(inputHint(false),/WASD/);
});
import {artFromHash,hashFor,wallViewpoint,WALL_VIEWS} from '../js/virtual-links.js';
test('artwork deep links resolve only known ids',()=>{
 assert.equal(hashFor('sample-1'),'#art-sample-1');
 assert.equal(artFromHash('#art-sample-1',['sample-0','sample-1']),'sample-1');
 assert.equal(artFromHash('#art-unknown',['sample-1']),null);
 assert.equal(artFromHash('',['sample-1']),null);
 assert.equal(artFromHash('#art-'+encodeURIComponent('작품 1'),['작품 1']),'작품 1');
});
test('wall shortcuts stand inside the room facing their wall',()=>{
 for(const room of Object.values(ROOMS))for(const wall of ['front','left','right']){
  const bounds=playerBounds(room),view=wallViewpoint(wall,room);
  assert.ok(view.position[0]>=bounds.minX&&view.position[0]<=bounds.maxX&&view.position[1]>=bounds.minZ&&view.position[1]<=bounds.maxZ,wall);
 }
 assert.equal(wallViewpoint('front',ROOMS.large).yaw,Math.PI/2);assert.equal(wallViewpoint('right',ROOMS.small).yaw,0);assert.equal(wallViewpoint('left').yaw,Math.PI);
 assert.deepEqual(Object.keys(WALL_VIEWS),['front','left','right']);
 assert.equal(wallViewpoint('ceiling'),null);
});
import {pickQuality,QUALITY,downgrade} from '../js/virtual-quality.js';
test('render quality follows device capacity and steps down once at a time',()=>{
 assert.equal(pickQuality({memory:2,cores:8,width:1440}),'low');
 assert.equal(pickQuality({memory:8,cores:8,width:1440}),'high');
 assert.equal(pickQuality({memory:4,cores:4,width:390}),'medium');
 assert.equal(pickQuality({memory:undefined,cores:undefined,width:1280}),'medium');
 assert.equal(pickQuality({memory:8,cores:2,width:1440}),'low');
 assert.equal(downgrade('high'),'medium');assert.equal(downgrade('medium'),'low');assert.equal(downgrade('low'),'low');
 assert.deepEqual(QUALITY.low,{pixelRatio:1,shadows:false,shadowSize:512,leaves:400});
 assert.equal(QUALITY.high.leaves,2600);assert.equal(QUALITY.medium.shadowSize,1024);
});
import {WALL_COLORS,wallColorOptions} from '../js/virtual-model.js';
test('wall colours come from a curated gallery palette, keeping legacy custom colours',()=>{
 assert.equal(Object.keys(WALL_COLORS).length,7);
 for(const hex of Object.keys(WALL_COLORS))assert.match(hex,/^#[0-9a-f]{6}$/);
 assert.equal(WALL_COLORS['#f6f4ee'],'웜 화이트');
 assert.deepEqual(Object.keys(wallColorOptions('#f6f4ee')),Object.keys(WALL_COLORS));
 const legacy=wallColorOptions('#123456');
 assert.equal(Object.keys(legacy).length,8);assert.match(legacy['#123456'],/기존 색상/);
});
test('artist intro is optional and limited to 600 characters',()=>{
 const gallery=defaultGallery({title:'전시',summary:''});
 assert.doesNotThrow(()=>validateGallery({...gallery,artistNote:'회화와 소리를 함께 다룹니다.'}));
 assert.throws(()=>validateGallery({...gallery,artistNote:'가'.repeat(601)}),/600/);
 assert.throws(()=>validateGallery({...gallery,artistNote:5}),/600/);
});
import {entryView,playerBounds} from '../js/virtual-links.js';
test('visitors enter about four metres from the front wall of any room size',()=>{
 for(const room of Object.values(ROOMS)){
  const view=entryView(room),bounds=playerBounds(room);
  assert.equal(view.yaw,Math.PI/2);
  assert.ok(Math.abs((view.position[0]-(-room.w/2))-4.2)<1e-9,room.id);
  assert.ok(view.position[0]>=bounds.minX&&view.position[0]<=bounds.maxX,room.id);
  assert.ok(bounds.maxX<room.w/2&&bounds.minZ>-room.d/2,room.id);
 }
 assert.deepEqual(playerBounds(ROOMS.large),{minX:-7,maxX:6.8,minZ:-6,maxZ:6});
});
import {introHTML} from '../js/virtual-intro.js';
test('entry info shows shared exhibition details and the artist intro, escaped',()=>{
 const exhibition={title:'Resonance',startDate:'2026-10-01',endDate:'2026-11-15',location:'UNFRAME 성수',summary:'빛과 소리의 공명.'};
 const html=introHTML({exhibition,settings:{artistName:'김하늘',artistNote:'<b>회화</b>와 소리를 다룹니다.'}});
 for(const part of ['Resonance','2026.10.01','UNFRAME 성수','빛과 소리의 공명.','김하늘','&lt;b&gt;회화'])assert.ok(html.includes(part),part);
 assert.doesNotMatch(html,/<b>회화/);
 const whole=introHTML({exhibition,settings:{}});
 assert.doesNotMatch(whole,/작가 소개/);
 assert.doesNotMatch(introHTML({exhibition:{title:'미리보기 전시'},settings:{artistName:'작가'}}),/undefined/);
});
import {previewOverrides,lookFromMessage,previewURL} from '../js/virtual-embed.js';
test('embedded preview accepts only valid unsaved space settings',()=>{
 assert.deepEqual(previewOverrides('?embed=1&theme=wood&wallColor=%232f3d35&lighting=focused&ceiling=plain'),{embed:true,settings:{theme:'wood',wallColor:'#2f3d35',lighting:'focused',ceiling:'plain'}});
 assert.deepEqual(previewOverrides('?embed=1&theme=neon&wallColor=red&lighting=x'),{embed:true,settings:{}});
 assert.deepEqual(previewOverrides(''),{embed:false,settings:{}});
 assert.equal(previewURL('AbCdEfGhIjKlMnOpQrStUv',{theme:'wood',wallColor:'#2f3d35',lighting:'general',ceiling:'luminous',artistNote:'x'}),'/virtual-gallery/submission/AbCdEfGhIjKlMnOpQrStUv?embed=1&theme=wood&wallColor=%232f3d35&lighting=general&ceiling=luminous');
});
test('live look messages carry only floor and wall colour',()=>{
 assert.deepEqual(lookFromMessage({type:'unframe-look',theme:'black',wallColor:'#3a3c3b',lighting:'focused'}),{theme:'black',wallColor:'#3a3c3b'});
 assert.equal(lookFromMessage({type:'other',theme:'black',wallColor:'#3a3c3b'}),null);
 assert.equal(lookFromMessage({type:'unframe-look',theme:'black',wallColor:'javascript:alert(1)'}),null);
 assert.equal(lookFromMessage(null),null);
});
import {readFileSync} from 'node:fs';
test('embedded preview hides the entry window before any module runs',()=>{
 const html=readFileSync(new URL('../virtual-gallery.html',import.meta.url),'utf8');
 const head=html.slice(0,html.indexOf('</head>'));
 assert.match(head,/<script>[^<]*embed=1[^<]*classList\.add\('embed-preview'\)[^<]*<\/script>/);
 const css=readFileSync(new URL('../assets/virtual-gallery.css',import.meta.url),'utf8');
 assert.match(css,/\.embed-preview #start-overlay/);
});
import {ROOMS,roomOf,SHAPES,SALE_STATUS} from '../js/virtual-model.js';
test('room sizes: large keeps today\'s geometry, smaller rooms shrink walls and placement',()=>{
 assert.deepEqual(Object.keys(ROOMS),['small','medium','large']);
 assert.equal(roomOf({}).id,'large');assert.equal(roomOf({roomSize:'small'}).id,'small');
 const large=ROOMS.large,small=ROOMS.small;
 assert.deepEqual([large.w,large.d,large.wall],[16,14,10]);
 assert.deepEqual([small.w,small.d,small.wall],[10,8,6]);
 const art={...emptyArtwork(),id:'a',title:'작품',artist:'작가',widthCm:100,heightCm:100,order:0,image:{url:'x',path:'',alt:''}};
 assert.equal(layoutArtworks([art])[0].position[0],-7.95);
 assert.equal(layoutArtworks([art],'small')[0].position[0],-4.95);
 assert.equal(layoutArtworks([{...art,wall:'right'}],'medium')[0].position[2],-5.45);
 assert.throws(()=>layoutArtworks([{...art,widthCm:700}],'small'),/600cm/);
 assert.doesNotThrow(()=>layoutArtworks([{...art,widthCm:700}],'large'));
 assert.throws(()=>validateGallery({...defaultGallery({title:'t',summary:''}),published:true,roomSize:'small'},[{...art,widthCm:700}]),/600cm/);
 assert.throws(()=>validateGallery({...defaultGallery({title:'t',summary:''}),roomSize:'huge'}),/설정/);
 assert.equal(defaultGallery({title:'t',summary:''}).roomSize,'medium');
});
test('artwork shapes and sale status validate their combinations',()=>{
 assert.deepEqual(Object.keys(SHAPES),['rect','circle','free']);
 assert.deepEqual(Object.keys(SALE_STATUS),['available','reserved','sold','nfs']);
 assert.match(SALE_STATUS.nfs,/Not for Sale/);
 const art={...emptyArtwork(),title:'작품',artist:'작가',image:{path:'virtualGalleries/ex/art/image.webp',url:'',alt:''}};
 assert.equal(emptyArtwork().shape,'rect');assert.equal(emptyArtwork().saleStatus,'available');
 assert.doesNotThrow(()=>validateArtwork({...art,shape:'circle',widthCm:60,heightCm:60,frame:'canvas'}));
 assert.throws(()=>validateArtwork({...art,shape:'circle',widthCm:60,heightCm:80}),/지름/);
 assert.throws(()=>validateArtwork({...art,shape:'circle',widthCm:60,heightCm:60,frame:'black'}),/원형/);
 assert.doesNotThrow(()=>validateArtwork({...art,shape:'free',frame:'none'}));
 assert.throws(()=>validateArtwork({...art,shape:'free',frame:'canvas'}),/자유형/);
 assert.throws(()=>validateArtwork({...art,shape:'star'}),/형태/);
 assert.throws(()=>validateArtwork({...art,saleStatus:'gone'}),/판매/);
 const legacy={...art};delete legacy.shape;delete legacy.saleStatus;assert.doesNotThrow(()=>validateArtwork(legacy));
});
test('embedded preview carries the room size',()=>{
 assert.equal(previewOverrides('?embed=1&roomSize=small').settings.roomSize,'small');
 assert.equal(previewOverrides('?embed=1&roomSize=huge').settings.roomSize,undefined);
 assert.match(previewURL('AbCdEfGhIjKlMnOpQrStUv',{roomSize:'medium'}),/roomSize=medium/);
});
