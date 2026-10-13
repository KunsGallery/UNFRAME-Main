import {test} from 'node:test';import assert from 'node:assert/strict';
import {defaultGallery,emptyArtwork,validateArtwork,validateGallery,layoutArtworks} from '../js/virtual-model.js';
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
test('eight artworks per wall fit the supplied room in two rows without overlap and retain aspect ratio',()=>{
 const artwork={...emptyArtwork(),title:'작품',artist:'작가',widthCm:500,heightCm:300,order:0};
 const works=Array.from({length:8},(_,index)=>({...artwork,id:`art-${index}`,order:index}));
 const laid=layoutArtworks(works);
 assert.equal(laid.length,8);assert.equal(new Set(laid.map(art=>art.position[1])).size,2);
 for(const art of laid){assert.ok(art.position[2]-art.size[0]/2>=-5);assert.ok(art.position[2]+art.size[0]/2<=5);assert.ok(Math.abs(art.size[0]/art.size[1]-5/3)<1e-10);}
 const second=layoutArtworks(works.reverse());assert.deepEqual(second.map(art=>art.id),laid.map(art=>art.id));
});
