import {test} from 'node:test';import assert from 'node:assert/strict';
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
