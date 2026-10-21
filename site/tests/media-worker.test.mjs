import {test} from 'node:test';import assert from 'node:assert/strict';
import {handle,verifyToken,parsePath} from '../media-worker/index.mjs';
const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk={...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:'test'};
const b64=value=>Buffer.from(typeof value==='string'?value:JSON.stringify(value)).toString('base64url');
async function token(extra={}){const now=Math.floor(Date.now()/1000);const data=b64({alg:'RS256',kid:'test'})+'.'+b64({aud:'unframe-main',iss:'https://securetoken.google.com/unframe-main',sub:'owner',email:'owner@example.com',email_verified:true,firebase:{sign_in_provider:'google.com'},exp:now+3600,iat:now-1,auth_time:now-1,...extra});return data+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(data))).toString('base64url');}
const path='exhibitions/exhibit/12345678-1234-1234-1234-123456789012.png';
const png=Uint8Array.from([137,80,78,71,13,10,26,10,0]);
function fixture({published=false,active=true,referenced=true}={}){let stored;const env={FIREBASE_PROJECT_ID:'unframe-main',ALLOWED_ORIGINS:'https://unframe-main.netlify.app',MEDIA:{async get(){return {body:png,httpEtag:'"test"'};},async put(k,v){stored={k,v};},async delete(k){stored={deleted:k};}}};const fetcher=async url=>url.includes('googleapis.com/service_accounts')?Response.json({keys:[jwk]}):url.includes('/staffEmails/')?Response.json({fields:{active:{booleanValue:active},email:{stringValue:'owner@example.com'}}}):published?Response.json({fields:{published:{booleanValue:true},cover:{mapValue:{fields:{path:{stringValue:referenced?path:'other'}}}}}}):new Response('',{status:403});return {env,fetcher,stored:()=>stored};}
const req=(method,headers={},body)=>new Request('https://media.example/media/'+path,{method,headers,body});
test('virtual artwork access requires a published gallery and the exact artwork reference; staff can upload scoped files',async()=>{
 const virtualPath='virtualGalleries/exhibit/art/12345678-1234-1234-1234-123456789012.png',f=fixture();
 const request=new Request('https://media.example/media/'+virtualPath);
 assert.equal(parsePath(new URL(request.url).pathname).artId,'art');
 assert.equal(parsePath('/media/virtualGalleries/exhibit/../bad.png'),null);
 for(const [published,referenced] of [[true,true],[false,true],[true,false]]){
  const fetcher=async url=>url.includes('/artworks/')?Response.json({fields:{image:{mapValue:{fields:{path:{stringValue:referenced?virtualPath:'other'}}}}}}):published?Response.json({fields:{published:{booleanValue:true}}}):new Response('',{status:403});
  assert.equal((await handle(request,f.env,fetcher)).status,published&&referenced?200:404);
 }
 const auth='Bearer '+await token();
 assert.equal((await handle(new Request(request.url,{method:'PUT',headers:{Authorization:auth,'Content-Type':'image/png','Content-Length':String(png.length)},body:png}),f.env,f.fetcher)).status,200);
 assert.equal(f.stored().k,virtualPath);
});
test('public gallery references accept bounded serialized images and legacy maps, without granting access to unrelated files',async()=>{
 const f=fixture();
 for(const image of [{stringValue:path+'\u001f작품 사진\u001f캡션'},{mapValue:{fields:{path:{stringValue:path}}}}]){
  const fetcher=async()=>Response.json({fields:{published:{booleanValue:true},cover:{mapValue:{fields:{path:{stringValue:'other'}}}},gallery:{arrayValue:{values:[image]}}}});
  assert.equal((await handle(req('GET'),f.env,fetcher)).status,200);
  assert.equal((await handle(new Request('https://media.example/media/'+path.replace('.png','x.png')),f.env,fetcher)).status,404);
 }
});
test('public referenced image is readable; drafts and unreferenced objects are denied',async()=>{for(const options of [{published:true},{published:false},{published:true,referenced:false}]){const f=fixture(options);const res=await handle(req('GET'),f.env,f.fetcher);assert.equal(res.status,options.published&&options.referenced!==false?200:404);assert.equal(res.headers.get('Cache-Control'),'no-store');}});
test('staff can upload, preview unsaved draft, and delete',async()=>{const f=fixture();const authorization='Bearer '+await token();const upload=await handle(req('PUT',{Authorization:authorization,'Content-Type':'image/png','Content-Length':String(png.length)},png),f.env,f.fetcher);assert.equal(upload.status,200);assert.equal(f.stored().k,path);assert.equal((await handle(req('GET',{Authorization:authorization}),f.env,f.fetcher)).status,200);assert.equal((await handle(req('DELETE',{Authorization:authorization}),f.env,f.fetcher)).status,200);assert.equal(f.stored().deleted,path);});
test('inactive staff and unsigned/expired/wrong-project/provider tokens fail closed',async()=>{const f=fixture({active:false});assert.equal((await handle(req('DELETE',{Authorization:'Bearer '+await token()}),f.env,f.fetcher)).status,403);for(const jwt of ['fake',await token({exp:0}),await token({aud:'another'}),await token({firebase:{sign_in_provider:'password'}}),await token({email_verified:false})])await assert.rejects(verifyToken(jwt,'unframe-main',f.fetcher));const good=await token();await assert.rejects(verifyToken(good.slice(0,-10)+'aaaaaaaaaa','unframe-main',f.fetcher));});
test('reject anonymous mutations, oversize uploads and fake PNG bytes',async()=>{const f=fixture();assert.equal((await handle(req('DELETE'),f.env,f.fetcher)).status,401);const auth={Authorization:'Bearer '+await token(),'Content-Type':'image/png'};assert.equal((await handle(req('PUT',{...auth,'Content-Length':'10485761'},png),f.env,f.fetcher)).status,413);assert.equal((await handle(req('PUT',{...auth,'Content-Length':'3'},'bad'),f.env,f.fetcher)).status,415);assert.equal(f.stored(),undefined);});
test('CORS only permits known site; unsafe object paths are rejected',async()=>{const f=fixture();assert.equal((await handle(req('OPTIONS',{Origin:'https://evil.example'}),f.env,f.fetcher)).status,403);const r=await handle(req('OPTIONS',{Origin:'https://unframe-main.netlify.app'}),f.env,f.fetcher);assert.equal(r.status,204);assert.equal(r.headers.get('Access-Control-Allow-Origin'),'https://unframe-main.netlify.app');assert.equal(parsePath('/media/exhibitions/a/../../secret'),null);assert.equal(parsePath('/media/'+path+'.svg'),null);});
test('highlight media authorization uses its own published record and rejects drafts and unrelated paths',async()=>{
 const highlightPath=path.replace('exhibitions/','homeHighlights/');
 for(const published of [true,false]){const f=fixture();let queried='';const fetcher=async url=>{queried=url;return published?Response.json({fields:{published:{booleanValue:true},cover:{mapValue:{fields:{path:{stringValue:highlightPath}}}}}}):new Response('',{status:403});};const response=await handle(new Request('https://media.example/media/'+highlightPath),f.env,fetcher);assert.equal(response.status,published?200:404);assert.match(queried,/\/homeHighlights\/exhibit$/);}
 const f=fixture({published:true});const response=await handle(new Request('https://media.example/media/'+highlightPath),f.env,f.fetcher);assert.equal(response.status,404);
 const authorization='Bearer '+await token();const draft=fixture();assert.equal((await handle(new Request('https://media.example/media/'+highlightPath,{method:'PUT',headers:{Authorization:authorization,'Content-Type':'image/png','Content-Length':String(png.length)},body:png}),draft.env,draft.fetcher)).status,200);assert.equal(draft.stored().k,highlightPath);
});

test('artist media uses its own gallery ID and never resolves a sibling gallery reference',async()=>{
 const galleryId='artist-one',virtualPath=`virtualGalleries/${galleryId}/art/12345678-1234-1234-1234-123456789012.png`,f=fixture();
 for(const [visible,referenced] of [[true,true],[false,true],[true,false]]){
  const queried=[];const fetcher=async url=>{queried.push(url);if(!visible)return new Response('',{status:403});return url.includes('/artworks/')?Response.json({fields:{image:{mapValue:{fields:{path:{stringValue:referenced?virtualPath:virtualPath.replace('artist-one','artist-two')}}}}}}):Response.json({fields:{published:{booleanValue:true},exhibitionId:{stringValue:'parent-exhibit'},artistName:{stringValue:'작가 A'}}});};
  const response=await handle(new Request('https://media.example/media/'+virtualPath),f.env,fetcher);assert.equal(response.status,visible&&referenced?200:404);assert.equal(queried.length,2);assert.ok(queried.every(url=>url.includes('/virtualGalleries/artist-one')));
 }
});
test('product photos stay staff-only even if a document claims published',async()=>{
 const f=fixture({published:true}),productPath='products/unframe-pen/12345678-1234-1234-1234-123456789012.png';
 const request=(headers={})=>new Request('https://media.example/media/'+productPath,{headers});
 assert.equal(parsePath('/media/'+productPath).collection,'products');
 assert.equal((await handle(request(),f.env,f.fetcher)).status,404);
 const auth={Authorization:'Bearer '+await token()};
 const ok=await handle(request(auth),f.env,f.fetcher);assert.equal(ok.status,200);assert.equal(ok.headers.get('Cache-Control'),'no-store');
 const inactive=fixture({active:false});assert.equal((await handle(request(auth),inactive.env,inactive.fetcher)).status,403);
});

test('storefront import routes require verified active staff and remain read-only',async()=>{const f=fixture();const base='https://media.example/imweb/';assert.equal((await handle(new Request(base+'products'),f.env,f.fetcher)).status,401);const authorization='Bearer '+await token();const inactive=fixture({active:false});assert.equal((await handle(new Request(base+'products',{headers:{Authorization:authorization}}),inactive.env,inactive.fetcher)).status,403);assert.equal((await handle(new Request(base+'products',{method:'POST',headers:{Authorization:authorization}}),f.env,f.fetcher)).status,405);assert.equal((await handle(new Request(base+'products?page=999999',{headers:{Authorization:authorization}}),f.env,f.fetcher)).status,400);assert.equal((await handle(new Request(base+'image?url=https://127.0.0.1/a.png',{headers:{Authorization:authorization}}),f.env,f.fetcher)).status,400);});
// Invited artists: ownership comes from the submission document read with the artist's own token.
const subPath='virtualSubmissions/AbCdEfGhIjKlMnOpQrStUv/art/12345678-1234-1234-1234-123456789012.png';
function artistFixture({owner='artist@example.com',status='draft',touchedDaysAgo=1,objects=0,staff=false,gallery}={}){
 const stored=[];const env={FIREBASE_PROJECT_ID:'unframe-main',ALLOWED_ORIGINS:'https://unframe-main.netlify.app',MEDIA:{async get(k){return k.includes('aaaaaaaa-')?null:{body:png,httpEtag:'"t"'};},async put(k,v,o){stored.push({k,o});},async delete(k){stored.push({deleted:k});},async list({prefix,limit}){return {objects:Array.from({length:Math.min(objects,limit)},(_,i)=>({key:prefix+i}))};}}};
 const touched=new Date(Date.now()-touchedDaysAgo*86400000).toISOString();
 const fetcher=async(url,init)=>{
  if(url.includes('googleapis.com/service_accounts'))return Response.json({keys:[jwk]});
  if(url.includes('/staffEmails/'))return staff?Response.json({fields:{active:{booleanValue:true},email:{stringValue:'artist@example.com'}}}):new Response('',{status:403});
  if(url.includes('/virtualSubmissions/'))return init?.headers?.Authorization?Response.json({fields:{ownerEmail:{stringValue:owner},status:{stringValue:status},touchedAt:{timestampValue:touched}}}):new Response('',{status:403});
  if(url.includes('/virtualGalleries/')&&gallery&&!url.includes('/artworks/'))return init?.headers?.Authorization?Response.json({fields:{published:{booleanValue:false},artistEmail:{stringValue:gallery}}}):new Response('',{status:403});
  return new Response('',{status:403});
 };
 return {env,fetcher,stored};
}
const artistAuth=async()=>'Bearer '+await token({email:'artist@example.com'});
const subReq=async(method,extra={},p=subPath)=>new Request('https://media.example/media/'+p,{method,headers:{Authorization:await artistAuth(),...(method==='PUT'?{'Content-Type':'image/png','Content-Length':String(png.length)}:{}),...extra},body:method==='PUT'?png:undefined});
test('submission owner uploads, previews and deletes their own images',async()=>{
 const f=artistFixture();
 assert.deepEqual(parsePath('/media/'+subPath),{key:subPath,collection:'virtualSubmissions',id:'AbCdEfGhIjKlMnOpQrStUv',artId:'art',type:'image/png'});
 assert.equal((await handle(await subReq('PUT'),f.env,f.fetcher)).status,200);assert.equal(f.stored[0].k,subPath);
 assert.equal((await handle(await subReq('GET'),f.env,f.fetcher)).status,200);
 assert.equal((await handle(await subReq('DELETE'),f.env,f.fetcher)).status,200);
});
test('submission images reject other accounts, anonymous readers, locked and expired uploads',async()=>{
 assert.equal((await handle(await subReq('PUT'),artistFixture({owner:'other@example.com'}).env,artistFixture({owner:'other@example.com'}).fetcher)).status,403);
 const f=artistFixture();assert.equal((await handle(new Request('https://media.example/media/'+subPath),f.env,f.fetcher)).status,404);
 const locked=artistFixture({status:'submitted'});assert.equal((await handle(await subReq('PUT'),locked.env,locked.fetcher)).status,403);
 assert.equal((await handle(await subReq('GET'),locked.env,locked.fetcher)).status,200);
 const expired=artistFixture({touchedDaysAgo:11});assert.equal((await handle(await subReq('PUT'),expired.env,expired.fetcher)).status,403);
 assert.equal((await handle(await subReq('GET'),expired.env,expired.fetcher)).status,403);
});
test('a submission holds at most sixty stored images',async()=>{
 const f=artistFixture({objects:60});const response=await handle(await subReq('PUT'),f.env,f.fetcher);
 assert.equal(response.status,409);assert.equal(f.stored.length,0);
});
test('bound artists read their own unpublished gallery images; others cannot',async()=>{
 const galleryPath='virtualGalleries/artist-x/art/12345678-1234-1234-1234-123456789012.png';
 const mine=artistFixture({gallery:'artist@example.com'});assert.equal((await handle(await subReq('GET',{},galleryPath),mine.env,mine.fetcher)).status,200);
 const theirs=artistFixture({gallery:'other@example.com'});assert.equal((await handle(await subReq('GET',{},galleryPath),theirs.env,theirs.fetcher)).status,403);
});
const copyReq=async(items,auth)=>new Request('https://media.example/copy',{method:'POST',headers:{Authorization:auth,'Content-Type':'application/json'},body:JSON.stringify({items})});
test('staff copy approved submission images into the gallery with the same file name',async()=>{
 const to='virtualGalleries/artist-x/art/12345678-1234-1234-1234-123456789012.png';
 const f=artistFixture({staff:true});const response=await handle(await copyReq([{from:subPath,to}],await artistAuth()),f.env,f.fetcher);
 assert.equal(response.status,200);assert.deepEqual(await response.json(),{copied:1});
 assert.equal(f.stored[0].k,to);assert.equal(f.stored[0].o.httpMetadata.contentType,'image/png');
});
test('copy is staff-only and refuses paths outside the submission-to-gallery pattern',async()=>{
 const to='virtualGalleries/artist-x/art/12345678-1234-1234-1234-123456789012.png';
 const artist=artistFixture();assert.equal((await handle(await copyReq([{from:subPath,to}],await artistAuth()),artist.env,artist.fetcher)).status,403);
 const f=artistFixture({staff:true});
 for(const items of [[{from:subPath,to:to.replace('virtualGalleries','exhibitions')}],[{from:to,to}],[{from:subPath,to:to.replace('/art/','/other/')}],[{from:subPath,to:to.replace('1234-123456789012.png','1234-123456789013.png')}],Array.from({length:25},()=>({from:subPath,to})),[]])
  assert.equal((await handle(await copyReq(items,await artistAuth()),f.env,f.fetcher)).status,400);
 assert.equal((await handle(await copyReq([{from:subPath.replace('12345678-1234','aaaaaaaa-1234'),to:to.replace('12345678-1234','aaaaaaaa-1234')}],await artistAuth()),f.env,f.fetcher)).status,404);
 assert.equal(f.stored.length,0);
});
