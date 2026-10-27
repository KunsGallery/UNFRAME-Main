import {test} from 'node:test';import assert from 'node:assert/strict';
import {workShareCard,worksListHTML} from '../js/virtual-gallery-view.js';
const english=fn=>{const saved=globalThis.location;globalThis.location={pathname:'/en/virtual-gallery/g',href:'https://u.kr/en/virtual-gallery/g',origin:'https://u.kr'};try{return fn();}finally{if(saved===undefined)delete globalThis.location;else globalThis.location=saved;}};
const art={id:'a1',title:'빛',titleEn:'Light',artist:'김작가',year:'2026',medium:'유채',mediumEn:'Oil',image:{url:'/a.webp',alt:''}};
test('English share cards and the works list use English titles',()=>{
 english(()=>{
  const card=workShareCard(art,'Resonance','g');
  assert.equal(card.title,'Light');assert.equal(card.meta,'Resonance · 2026 · Oil');assert.equal(card.url,'https://u.kr/en/virtual-gallery/g#art-a1');
  assert.match(worksListHTML([art]),/<strong>Light<\/strong>/);
 });
 const card=workShareCard(art,'공명','g');
 assert.equal(card.title,'빛');assert.equal(card.meta,'공명 · 2026 · 유채');
});
