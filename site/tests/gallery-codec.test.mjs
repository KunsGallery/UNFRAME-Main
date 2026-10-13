import {test} from 'node:test';
import assert from 'node:assert/strict';
import {encodeGallery,decodeGallery} from '../js/gallery-codec.js';
test('gallery persistence preserves thirty images, Korean paragraphs, punctuation and order without transient URLs',()=>{
 const images=Array.from({length:30},(_,i)=>({path:`exhibitions/show/${i}.webp`,url:'blob:https://example.com/private',alt:`사진 ${i} | "작품"`,caption:'첫 문단\n\n둘째 문단 — 빛과 소리'}));
 const encoded=encodeGallery(images);
 assert.equal(encoded.length,30);
 assert.ok(encoded.every(record=>!record.includes('blob:')));
 assert.deepEqual(decodeGallery(encoded),images.map(image=>({...image,url:''})));
});
test('legacy gallery maps remain readable and reserved controls cannot create extra records',()=>{
 const legacy=[{path:'exhibitions/show/cover.jpg',url:'',alt:'기존 사진',caption:''}];
 assert.deepEqual(decodeGallery(legacy),legacy);
 assert.deepEqual(decodeGallery(encodeGallery([{...legacy[0],alt:'a\u001fb',caption:'c\u001ed\u001de'}])),[{...legacy[0],alt:'a b',caption:'c d e'}]);
 assert.throws(()=>decodeGallery(['invalid']),/형식/);
});
