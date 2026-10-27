import {test} from 'node:test';import assert from 'node:assert/strict';
import {DESIGNS} from '../js/share-card-layout.js';
import {saleBadge} from '../js/virtual-model.js';
import {inputHint} from '../js/virtual-hud.js';
import {introHTML} from '../js/virtual-intro.js';
const english=fn=>{const saved=globalThis.location;globalThis.location={pathname:'/en/virtual-gallery/x',href:'https://u.kr/en/virtual-gallery/x'};try{return fn();}finally{if(saved===undefined)delete globalThis.location;else globalThis.location=saved;}};
test('English gallery labels have no Korean left',()=>{
 english(()=>{
  assert.deepEqual(Object.values(DESIGNS),['Museum label','Gallery wall','Poster']);
  assert.equal(saleBadge('sold').label,'Sold');assert.equal(saleBadge('reserved').label,'Reserved');
  for(const touch of [true,false])assert.ok(!/[가-힣]/.test(inputHint(touch)));
  const html=introHTML({exhibition:{title:'Resonance',startDate:'2026-10-01',endDate:'2026-11-15',location:'Seoul'},settings:{artistName:'김작가',artistNote:'Note'}});
  assert.match(html,/About the artist/);assert.match(html,/Exhibition/);assert.match(html,/김작가/);
 });
 assert.equal(DESIGNS.label,'뮤지엄 라벨');assert.equal(saleBadge('sold').label,'판매 완료');
});
