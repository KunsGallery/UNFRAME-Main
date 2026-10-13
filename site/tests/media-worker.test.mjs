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
