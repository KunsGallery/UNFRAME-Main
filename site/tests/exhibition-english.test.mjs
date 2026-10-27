import {test} from 'node:test';import assert from 'node:assert/strict';
import {exhibitionView} from '../js/exhibition-view.js';
import {stateEnglish} from '../js/model.js';
import {DEMO_EXHIBITIONS} from '../js/demo.js';
const english=fn=>{const saved=globalThis.location;globalThis.location={pathname:'/en/exhibition/x',href:'https://u.kr/en/exhibition/x'};try{return fn();}finally{if(saved===undefined)delete globalThis.location;else globalThis.location=saved;}};
const base={...DEMO_EXHIBITIONS[1],startDate:'2020-01-01',endDate:'2099-12-31',summary:'요약',description:'설명',location:'서울',hours:'11-7',address:'서울시 종로구',artists:'김작가'};
test('English detail uses English copies and keeps address and artists as entered',()=>{
 const html=english(()=>exhibitionView({...base,titleEn:'Analog',summaryEn:'Summary',descriptionEn:'Story',locationEn:'Seoul',hoursEn:'11am-7pm'}));
 for(const text of ['<h1>Analog</h1>','Summary','Story','Seoul','11am-7pm','서울시 종로구','김작가',stateEnglish.current,'About the exhibition'])assert.ok(html.includes(text),text);
 assert.ok(html.includes('href="/en/exhibition"'));
});
test('English detail falls back to Korean when English is blank',()=>{
 const html=english(()=>exhibitionView({...base,titleEn:' ',summaryEn:''}));
 assert.ok(html.includes(`<h1>${base.title}</h1>`));assert.ok(html.includes('요약'));
});
test('Korean detail is unchanged by English copies',()=>{
 const html=exhibitionView({...base,titleEn:'Analog'});
 assert.ok(html.includes(`<h1>${base.title}</h1>`));assert.ok(html.includes('전시 소개'));
});
