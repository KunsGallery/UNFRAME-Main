import test from 'node:test';
import assert from 'node:assert/strict';
import {sizes,fitImage,textLines,footerLine,HANDLE} from '../js/share-card.js';
test('sharing exports exact story and landscape ratios',()=>{assert.deepEqual(sizes.story,[1080,1920]);assert.equal(sizes.landscape[0]/sizes.landscape[1],4/3);});
test('A contains the full work while B covers and centers the crop',()=>{assert.deepEqual(fitImage(400,800,600,600),[150,0,300,600]);assert.deepEqual(fitImage(400,800,600,600,true),[0,-300,600,1200]);});
test('long Korean card copy is bounded and truncated, empty fields omitted',()=>{const ctx={measureText:text=>({width:Array.from(text).length*10})};assert.deepEqual(textLines(ctx,'',100),[]);const lines=textLines(ctx,'가나다라마바사아자차카타파하',50,2);assert.equal(lines.length,2);assert.equal(lines[1],'바사아자…');});
import {DESIGNS,cardLayout} from '../js/share-card-layout.js';
test('three card designs are offered in order',()=>{assert.deepEqual(Object.keys(DESIGNS),['label','wall','poster']);assert.equal(DESIGNS.label,'뮤지엄 라벨');});
for(const [ratio,[w,h]] of Object.entries(sizes))for(const [iw,ih] of [[800,1200],[1600,900]])for(const design of ['label','wall','poster']){
 test(`${design} ${ratio} ${iw}x${ih} keeps the work and text on the card`,()=>{
  const layout=cardLayout(design,w,h,iw,ih),{image,art,text}=layout;
  for(const box of [art,text])assert.ok(box.x>=0&&box.y>=0&&box.x+box.w<=w&&box.y+box.h<=h,JSON.stringify(box));
  if(design!=='poster'){
   assert.ok(Math.abs(image.w/image.h-iw/ih)<.01,'aspect preserved');
   assert.ok(image.x>=art.x-.5&&image.y>=art.y-.5&&image.x+image.w<=art.x+art.w+.5&&image.y+image.h<=art.y+art.h+.5,'image inside its frame');
  }
  const overlap=!(text.x>=art.x+art.w||text.x+text.w<=art.x||text.y>=art.y+art.h||text.y+text.h<=art.y);
  assert.equal(overlap,false,'text never covers the work');
 });
}
// A fake canvas that records what is drawn; every character is 10px wide at any size.
function recorder(){const drawn=[];return {drawn,ctx:{font:'',fillStyle:'',textAlign:'left',measureText:t=>({width:Array.from(t).length*10}),fillText(text,x,y){drawn.push({text,x,y,align:this.textAlign,font:this.font});}}};}
test('card footer: handle on the left, exhibition title and dates on the right',()=>{
 const {ctx,drawn}=recorder();footerLine(ctx,{w:1080,y:1836,margin:86,size:22,color:'#888',strong:'#111'},{title:'OBLIQUE',dates:'2026.10.23 — 11.01'});
 assert.deepEqual(drawn.map(d=>[d.text,d.align]),[[HANDLE,'left'],['2026.10.23 — 11.01','right'],['OBLIQUE','right']]);
 assert.equal(HANDLE,'@unframe.kr');assert.match(drawn[2].font,/^600 /);
});
test('card footer shortens a long exhibition title before it reaches the handle',()=>{
 const {ctx,drawn}=recorder();const title='아주 긴 전시 제목이 들어가서 한 줄을 넘어가는 경우를 확인합니다 정말 길게';footerLine(ctx,{w:600,y:860,margin:40,size:16,color:'#888',strong:'#111'},{title,dates:'2026.10.23 — 11.01'});
 const handleEnd=40+HANDLE.length*10,titleDrawn=drawn.find(d=>d.font.startsWith('600'));
 assert.ok(titleDrawn.text.endsWith('…'));
 const left=Math.min(...drawn.filter(d=>d.align==='right').map(d=>d.x-Array.from(d.text).length*10));
 assert.ok(left>handleEnd,`exhibition starts at ${left}, handle ends at ${handleEnd}`);
});
test('exhibition cards carry only the handle',()=>{const {ctx,drawn}=recorder();footerLine(ctx,{w:1080,y:1836,margin:86,size:22,color:'#888',strong:'#111'},undefined);assert.deepEqual(drawn.map(d=>d.text),[HANDLE]);});
