import {test} from 'node:test';import assert from 'node:assert/strict';
import {previewData} from '../netlify/edge-functions/link-preview.js';
const p='virtualGalleries/g/preview/12345678-1234-1234-1234-123456789012.jpeg';
const image=path=>({mapValue:{fields:{path:{stringValue:path}}}});
test('public gallery uses its entrance image and English title',async()=>{
 const fetcher=async()=>Response.json({fields:{published:{booleanValue:true},title:{stringValue:'제목'},titleEn:{stringValue:'Title'},previewImage:image(p)}});
 const value=await previewData('/en/virtual-gallery/g',fetcher);assert.equal(value.title,'Title');assert.match(value.image,/\/media\/virtualGalleries\/g\/preview\//);
});
test('gallery falls back to first artwork and private documents yield no metadata',async()=>{
 const fetcher=async(url,init)=>init?.method==='POST'?Response.json([{document:{fields:{image:image(p)}}}]):Response.json({fields:{published:{booleanValue:true},title:{stringValue:'방'}}});
 assert.match((await previewData('/virtual-gallery/g',fetcher)).image,/preview/);
 assert.equal(await previewData('/virtual-gallery/g',async()=>new Response('',{status:403})),null);
 assert.equal(await previewData('/virtual-gallery/submission/id',fetcher),null);
});
test('exhibition uses its published cover and rejects unsafe paths',async()=>{
 const fields={published:{booleanValue:true},title:{stringValue:'전시'},cover:image('exhibitions/g/12345678-1234-1234-1234-123456789012.jpeg')};
 assert.match((await previewData('/exhibition/g',async()=>Response.json({fields}))).image,/exhibitions\/g/);
 fields.cover=image('../../private');assert.equal((await previewData('/exhibition/g',async()=>Response.json({fields}))).image,'');
});
