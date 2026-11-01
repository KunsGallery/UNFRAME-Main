import {test} from 'node:test';import assert from 'node:assert/strict';
import {workShareCard,galleryShareCard,wallShareScenes,showModalImage,worksListHTML,shortRange,artworkCaption} from '../js/virtual-gallery-view.js';
const english=fn=>{const saved=globalThis.location;globalThis.location={pathname:'/en/virtual-gallery/g',href:'https://u.kr/en/virtual-gallery/g',origin:'https://u.kr'};try{return fn();}finally{if(saved===undefined)delete globalThis.location;else globalThis.location=saved;}};
const art={id:'a1',title:'빛',titleEn:'Light',artist:'김작가',year:'2026',medium:'유채',mediumEn:'Oil',widthCm:40,heightCm:60,image:{url:'/a.webp',alt:''}};
const show={title:'공명',startDate:'2026-10-23',endDate:'2026-11-01'};
test('English share cards and the works list use English titles',()=>{
 english(()=>{
  const card=workShareCard(art,{...show,title:'Resonance'},'g');
  assert.equal(card.title,'Light');assert.equal(card.meta,'2026 · Oil · 60 × 40 cm');assert.deepEqual(card.exhibition,{title:'Resonance',dates:'2026.10.23 — 11.01'});assert.equal(card.url,'https://u.kr/en/virtual-gallery/g#art-a1');
  assert.match(worksListHTML([art]),/<strong>Light<\/strong>/);
 });
 const card=workShareCard(art,show,'g');
 assert.equal(card.title,'빛');assert.equal(card.meta,'2026 · 유채 · 60 × 40 cm');assert.equal(card.exhibition.title,'공명');
});
test('artwork captions hold only what the artist entered; the exhibition is separate',()=>{
 assert.equal(artworkCaption({year:'2025',medium:'종이에 연필'}),'2025 · 종이에 연필');
 assert.equal(artworkCaption({title:'무제'}),'');
 assert.ok(!workShareCard({...art,year:'',medium:''},show,'g').meta.includes('공명'));
});
test('exhibition dates drop a repeated year',()=>{
 assert.equal(shortRange({startDate:'2026-10-23',endDate:'2026-11-01'}),'2026.10.23 — 11.01');
 assert.equal(shortRange({startDate:'2026-12-20',endDate:'2027-01-10'}),'2026.12.20 — 2027.01.10');
 assert.equal(shortRange({startDate:'2026-10-31',endDate:'2026-10-31'}),'2026.10.31');
 assert.equal(shortRange({}),'');
});
test('gallery share card shows the room, its artist and exhibition, and links to the room',()=>{
 const card=galleryShareCard({title:'조은이',artistName:'조은이'},{...show,artists:'여러 작가'},[{image:{}},art],'g1');
 assert.equal(card.title,'조은이');assert.equal(card.artist,'조은이');assert.equal(card.image,'/a.webp');
 assert.deepEqual(card.exhibition,{title:'공명',dates:'2026.10.23 — 11.01'});assert.match(card.url,/\/virtual-gallery\/g1$/);
 assert.equal(galleryShareCard({title:'공명'},{...show,artists:'여러 작가'},[],'g').artist,'여러 작가');
});
test('the detail image stays hidden until the new work has loaded',()=>{
 const classes=new Set(),img={attrs:{},complete:false,classList:{add:c=>classes.add(c),remove:c=>classes.delete(c)},getAttribute(k){return this.attrs[k];},set src(v){this.attrs.src=v;}};
 showModalImage(img,'/b.webp');assert.ok(classes.has('is-loading'));assert.equal(img.attrs.src,'/b.webp');
 img.onload();assert.ok(!classes.has('is-loading'));
 img.complete=true;showModalImage(img,'/b.webp');assert.ok(!classes.has('is-loading'));
});
test('the gallery page has no placeholder artwork image',async()=>{const {readFile}=await import('node:fs/promises');const html=await readFile(new URL('../virtual-gallery.html',import.meta.url),'utf8');assert.doesNotMatch(html,/id="modal-img"[^>]*src=/);});
test('gallery share card offers every work with an image as the featured work',()=>{
 const card=galleryShareCard({title:'조은이'},show,[{image:{}},art,{...art,id:'a2',title:'밤',image:{url:'/b.webp'}}],'g');
 assert.deepEqual(card.works.map(w=>w.image),['/a.webp','/b.webp']);assert.equal(card.works[1].label,'밤 · 김작가');assert.equal(card.image,'/a.webp');
});
test('a saved entrance image is offered first, without losing artwork choices',()=>{
 const card=galleryShareCard({title:'갤러리',previewImage:{url:'/entry.jpeg'}},show,[art],'g');
 assert.deepEqual(card.works.map(work=>work.image),['/entry.jpeg','/a.webp']);
 assert.equal(card.works[0].label,'갤러리 입구 장면');assert.equal(card.image,'/entry.jpeg');
 english(()=>assert.equal(galleryShareCard({previewImage:{url:'/entry.jpeg'}},show,[],'g').works[0].label,'Gallery entrance view'));
});
test('wall views are captured and offered alongside the entrance and artworks',async()=>{
 const scenes=await wallShareScenes(async wall=>wall,async wall=>`data:image/jpeg;base64,${wall}`);
 assert.deepEqual(scenes.map(scene=>scene.label),['갤러리 좌측 벽','갤러리 우측 벽']);
 const card=galleryShareCard({title:'갤러리',previewImage:{url:'/entry.jpeg'}},show,[art],'g',scenes);
 assert.deepEqual(card.works.map(work=>work.image),['/entry.jpeg',...scenes.map(scene=>scene.image),'/a.webp']);
 assert.equal(card.image,'/entry.jpeg');
});
test('a failed wall capture keeps other wall and artwork choices available',async()=>{
 const scenes=await wallShareScenes(async wall=>{if(wall==='left')throw Error('failed');return wall;},async wall=>wall);
 assert.deepEqual(scenes.map(scene=>scene.label),['갤러리 우측 벽']);
 assert.deepEqual(galleryShareCard({title:'갤러리'},show,[art],'g',scenes).works.map(work=>work.image),['right','/a.webp']);
});
