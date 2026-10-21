import test from 'node:test';
import assert from 'node:assert/strict';
import {sizes,fitImage,textLines} from '../js/share-card.js';
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
