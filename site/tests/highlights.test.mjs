import {test} from 'node:test';
import assert from 'node:assert/strict';
import {selectedHighlights,selectedNews,pastNews,activeOpenCalls,openCallDays,validateHighlight} from '../js/highlight-model.js';
const item=extra=>({kind:'virtual',title:'갤러리',summary:'',project:'',url:'https://uau.unframe.kr',startDate:'',endDate:'',cover:{url:'/assets/zero.svg',path:'',alt:''},published:true,featured:true,order:0,...extra});
test('hero excludes draft, unselected and expired highlights while keeping undated featured galleries',()=>{const values=[item({title:'선택'}),item({title:'임시',published:false}),item({title:'미선택',featured:false}),item({title:'종료',kind:'event',startDate:'2026-10-01',endDate:'2026-10-12'}),item({title:'진행',kind:'event',startDate:'2026-10-01',endDate:'2026-10-13',order:1}),item({title:'예정',kind:'event',startDate:'2026-11-01',endDate:'2026-11-10',order:2})];assert.deepEqual(selectedHighlights(values,'2026-10-13').map(x=>x.title),['선택','진행','예정']);});
test('published event requires dates and destination, virtual gallery can be undated',()=>{assert.doesNotThrow(()=>validateHighlight(item({})));assert.throws(()=>validateHighlight(item({kind:'event'})));assert.throws(()=>validateHighlight(item({url:''})));assert.throws(()=>validateHighlight(item({kind:'event',startDate:'2026-02-30',endDate:'2026-03-01'})));assert.throws(()=>validateHighlight(item({url:'javascript:alert(1)'})));assert.throws(()=>validateHighlight(item({url:'//example.com'})));});

test('NOW selection is independent of hero, bounded to four, canonical projects and active published news',()=>{const values=Array.from({length:6},(_,i)=>item({kind:'news',project:['UP','음','U#','U.A.U'][i%4],title:`소식 ${i}`,order:i,featured:false,nowFeatured:true}));values.push(item({kind:'news',project:'UP',title:'임시',published:false,nowFeatured:true}),item({kind:'event',project:'음',nowFeatured:true,startDate:'2026-10-01',endDate:'2026-10-12',order:0}),item({kind:'virtual',nowFeatured:true}));assert.deepEqual(selectedNews(values,'2026-10-13').map(x=>x.title),['소식 0','소식 1','소식 2','소식 3']);assert.equal(selectedHighlights(values,'2026-10-13').length,1);assert.doesNotThrow(()=>validateHighlight(values[0]));assert.throws(()=>validateHighlight({...values[0],project:'다른 프로젝트'}));assert.throws(()=>validateHighlight({...values[0],nowFeatured:'true'}));assert.throws(()=>validateHighlight(item({nowFeatured:true})));});

test('SALON event saves and appears in JOURNAL without being assigned to another project',()=>{const salon=item({kind:'event',project:'UNFRAME SALON',title:'UNFRAME SALON Vol. 4',nowFeatured:true,featured:true,startDate:'2026-10-31',endDate:'2026-10-31'});assert.doesNotThrow(()=>validateHighlight(salon));assert.equal(selectedNews([salon],'2026-10-26')[0].project,'UNFRAME SALON');assert.equal(selectedHighlights([salon],'2026-10-26')[0].project,'UNFRAME SALON');assert.equal(selectedNews([salon],'2026-11-01').length,0);assert.equal(selectedNews([{...salon,published:false}],'2026-10-26').length,0);});

test('optional English highlight fields are bounded',()=>{
 assert.doesNotThrow(()=>validateHighlight(item({titleEn:'Gallery',summaryEn:''})));
 assert.throws(()=>validateHighlight(item({titleEn:'x'.repeat(201)})),/영문/);
 assert.throws(()=>validateHighlight(item({summaryEn:'x'.repeat(601)})),/영문/);
});

test('past records are ended project events and news with an image and link, newest first',()=>{
 const values=[item({title:'오래전',kind:'event',project:'UP',startDate:'2026-01-01',endDate:'2026-01-02'}),item({title:'최근',kind:'news',project:'U#',startDate:'2026-10-01',endDate:'2026-10-30'}),
  item({title:'진행 중',kind:'event',project:'UP',startDate:'2026-11-01',endDate:'2026-11-30'}),item({title:'비공개',kind:'event',project:'UP',startDate:'2026-10-01',endDate:'2026-10-02',published:false}),
  item({title:'갤러리',kind:'virtual',startDate:'2026-10-01',endDate:'2026-10-02'}),item({title:'날짜 없음',kind:'news',project:'UP'}),item({title:'이미지 없음',kind:'event',project:'UP',startDate:'2026-10-01',endDate:'2026-10-02',cover:{url:'',path:''}})];
 assert.deepEqual(pastNews(values,'2026-11-07').map(x=>x.title),['최근','오래전']);
 assert.deepEqual(pastNews(values,'2026-11-07',1).map(x=>x.title),['최근']);
});

test('open calls show only while recruiting, soonest deadline first, and need dates to publish',()=>{
 const call=extra=>item({kind:'opencall',title:'오픈콜',project:'',url:'https://forms.gle/x',startDate:'2026-11-01',endDate:'2026-11-30',...extra});
 const values=[call({title:'늦게 마감'}),call({title:'곧 마감',endDate:'2026-11-10'}),call({title:'예정',startDate:'2026-12-01',endDate:'2026-12-31'}),call({title:'끝남',startDate:'2026-10-01',endDate:'2026-10-31'}),call({title:'비공개',published:false}),call({title:'링크 없음',url:''})];
 assert.deepEqual(activeOpenCalls(values,'2026-11-07').map(x=>x.title),['곧 마감','늦게 마감']);
 assert.deepEqual(activeOpenCalls(values,'2026-11-30').map(x=>x.title),['늦게 마감'],'the deadline day still counts');
 assert.equal(openCallDays(call(),'2026-11-27'),3);assert.equal(openCallDays(call(),'2026-11-30'),0);
 assert.equal(selectedHighlights(values,'2026-11-07').length,0,'open calls are not ordinary hero highlights');assert.equal(selectedNews(values,'2026-11-07').length,0);
 assert.doesNotThrow(()=>validateHighlight(call()));
 assert.throws(()=>validateHighlight(call({startDate:'',endDate:''})),/모집 시작일과 마감일/);
 assert.doesNotThrow(()=>validateHighlight(call({published:false,startDate:'',endDate:''})));
});
