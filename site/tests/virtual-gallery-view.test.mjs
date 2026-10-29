import {test} from 'node:test';import assert from 'node:assert/strict';
import {workShareCard,worksListHTML,shortRange,artworkCaption} from '../js/virtual-gallery-view.js';
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
