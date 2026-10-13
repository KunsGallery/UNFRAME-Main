// Opt-in tests against an isolated local emulator; never use a production project.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const host=process.env.FIRESTORE_EMULATOR_HOST;
if(!/^127\.0\.0\.1:\d+$/.test(host||''))throw new Error('Set FIRESTORE_EMULATOR_HOST=127.0.0.1:8087 for an isolated emulator.');
const project='demo-unframe-rules';
const origin=`http://${host}`;
const base=`${origin}/v1/projects/${project}/databases/(default)/documents`;
const token=(extra={})=>`${Buffer.from(JSON.stringify({alg:'none',typ:'JWT'})).toString('base64url')}.${Buffer.from(JSON.stringify({sub:'staff-user',user_id:'staff-user',email:'staff@example.com',email_verified:true,firebase:{sign_in_provider:'google.com'},aud:project,iss:`https://securetoken.google.com/${project}`,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,...extra})).toString('base64url')}.`;
const staff=token();
function field(value){if(typeof value==='string')return {stringValue:value};if(typeof value==='boolean')return {booleanValue:value};if(typeof value==='number')return Number.isInteger(value)?{integerValue:String(value)}:{doubleValue:value};if(value===null)return {nullValue:null};if(Array.isArray(value))return {arrayValue:{values:value.map(field)}};return {mapValue:{fields:Object.fromEntries(Object.entries(value).map(([key,item])=>[key,field(item)]))}};}
async function request(path,{method='GET',data,auth=staff}={}){const response=await fetch(`${base}/${path}`,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${auth}`}:{})},...(data?{body:JSON.stringify({fields:field(data).mapValue.fields})}:{})});return {status:response.status,text:await response.text()};}
async function expectStatus(label,expected,promise){const result=await promise;assert.equal(result.status,expected,`${label}: ${result.text}`);checks++;}
let checks=0;
const rules=await readFile(new URL('../firestore.rules',import.meta.url),'utf8');
const loaded=await fetch(`${origin}/emulator/v1/projects/${project}:securityRules`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({rules:{files:[{name:'firestore.rules',content:rules}]}})});
assert.equal(loaded.status,200,await loaded.text());
await expectStatus('seed approved staff',200,request('staffEmails/staff@example.com',{method:'PATCH',auth:'owner',data:{email:'staff@example.com',active:true}}));
await expectStatus('seed inactive staff',200,request('staffEmails/inactive@example.com',{method:'PATCH',auth:'owner',data:{email:'inactive@example.com',active:false}}));
function fixture(id,count=0,legacy=false){const cover={url:'',path:`exhibitions/${id}/cover.jpg`,alt:'대표 이미지'};const images=Array.from({length:count},(_,index)=>({url:'',path:`exhibitions/${id}/${index}.jpg`,alt:'사진 설명',caption:'첫 줄\n둘째 줄'}));return {title:'규칙 검증',slug:id,startDate:'2026-10-13',endDate:'2026-10-20',location:'UNFRAME',artists:'',summary:'',description:'전시 소개',hours:'',admission:'',address:'',mapUrl:'',bookingUrl:'',cover,gallery:legacy?images:images.map(image=>[image.path,image.alt,image.caption].join('\u001f')),published:true,order:0,updatedAt:new Date().toISOString(),imagePaths:[cover,...images].map(image=>image.path)};}
for(const count of [0,1,8,30]){const id=`rules-gallery-${count}`;const data=fixture(id,count);await expectStatus(`create ${count} photos`,200,request(`exhibitions/${id}`,{method:'PATCH',data}));await expectStatus(`update ${count} photos`,200,request(`exhibitions/${id}`,{method:'PATCH',data:{...data,summary:'수정'}}));}
await expectStatus('legacy eight-photo form',200,request('exhibitions/rules-legacy',{method:'PATCH',data:fixture('rules-legacy',8,true)}));
const id='rules-attacks';const legal=fixture(id,1);const write=data=>request(`exhibitions/${id}`,{method:'PATCH',data});
await expectStatus('create attack fixture',200,write(legal));
const denied=[
 ['unknown document field',{...legal,privateEmail:'secret@example.com'}],
 ['missing required field',Object.fromEntries(Object.entries(legal).filter(([key])=>key!=='title'))],
 ['invalid field type',{...legal,title:1}],
 ['oversized title',{...legal,title:'x'.repeat(201)}],
 ['invalid dates',{...legal,endDate:'2026-01-01'}],
 ['negative order',{...legal,order:-1}],
 ['unscoped cover',{...legal,cover:{...legal.cover,path:'exhibitions/another/cover.jpg'}}],
 ['unknown cover field',{...legal,cover:{...legal.cover,extra:true}}],
 ['missing cover alt',{...legal,cover:{url:'',path:legal.cover.path}}],
 ['nonstring cover alt',{...legal,cover:{...legal.cover,alt:1}}],
 ['oversized cover alt',{...legal,cover:{...legal.cover,alt:'x'.repeat(1001)}}],
 ['nonempty cover URL',{...legal,cover:{...legal.cover,url:'https://example.com/image.jpg'}}],
 ['thirty-one photos',fixture(id,31)],
 ['unscoped gallery',{...legal,gallery:['exhibitions/another/image.jpg\u001falt\u001fcaption']}],
 ['oversized gallery alt',{...legal,gallery:[`${legal.imagePaths[1]}\u001f${'x'.repeat(1001)}\u001fcaption`]}],
 ['oversized gallery caption',{...legal,gallery:[`${legal.imagePaths[1]}\u001falt\u001f${'x'.repeat(2001)}`]}],
 ['nonstring gallery entry',{...legal,gallery:[123]}],
 ['gallery mixed types',{...legal,gallery:[legal.gallery[0],null]}],
 ['record separator injection',{...legal,gallery:[`${legal.gallery[0]}\u001e${legal.gallery[0]}`]}],
 ['alternate record separator injection',{...legal,gallery:[`${legal.gallery[0]}\u001d${legal.gallery[0]}`]}],
 ['field separator injection',{...legal,gallery:[`${legal.gallery[0]}\u001fextra`]}],
 ['nonstring indexed paths',{...legal,imagePaths:[123]}],
 ['cross-document indexed paths',{...legal,imagePaths:['exhibitions/another/image.jpg']}],
 ['path separator injection',{...legal,imagePaths:[`${legal.imagePaths[0]}|${legal.imagePaths[0]}`]}],
 ['alternate path separator injection',{...legal,imagePaths:[`${legal.imagePaths[0]}~${legal.imagePaths[0]}`]}],
 ['oversized path filename',{...legal,imagePaths:[`exhibitions/${id}/${'x'.repeat(401)}`]}],
 ['invalid legacy image type',{...fixture(id,1,true),gallery:[{url:'',path:legal.imagePaths[1],alt:1,caption:''}]}],
];
for(const [label,data] of denied){
 await expectStatus(`${label}: remove fixture`,200,request(`exhibitions/${id}`,{method:'DELETE',auth:'owner'}));
 await expectStatus(`${label}: create denied`,403,write(data));
 await expectStatus(`${label}: seed legal fixture`,200,write(legal));
 await expectStatus(`${label}: update denied`,403,write(data));
}
const bounds={...legal,gallery:[`${legal.imagePaths[1]}\u001f${'x'.repeat(1000)}\u001f${'x'.repeat(2000)}`]};
await expectStatus('string limits inclusive',200,write(bounds));
for(const [label,auth] of [['anonymous',null],['inactive',token({email:'inactive@example.com'})],['unapproved',token({email:'other@example.com'})],['unverified',token({email_verified:false})],['password provider',token({firebase:{sign_in_provider:'password'}})]])await expectStatus(`${label} cannot write`,403,request(`exhibitions/${id}`,{method:'PATCH',data:legal,auth}));
await expectStatus('anonymous published read',200,request(`exhibitions/${id}`,{auth:null}));
await expectStatus('save draft',200,write({...legal,published:false}));
await expectStatus('anonymous draft read',403,request(`exhibitions/${id}`,{auth:null}));
await expectStatus('staff draft read',200,request(`exhibitions/${id}`));
await expectStatus('public unrestricted list',403,request('exhibitions',{auth:null}));
await expectStatus('staff cannot grant access',403,request('staffEmails/other@example.com',{method:'PATCH',data:{email:'other@example.com',active:true}}));
await expectStatus('staff cannot activate own role',403,request('staffEmails/staff@example.com',{method:'PATCH',data:{email:'staff@example.com',active:true,admin:true}}));
await expectStatus('anonymous cannot read staff record',403,request('staffEmails/staff@example.com',{auth:null}));
await expectStatus('staff cannot read another staff record',403,request('staffEmails/inactive@example.com'));
await expectStatus('staff can read own staff record',200,request('staffEmails/staff@example.com'));
await expectStatus('anonymous cannot delete',403,request(`exhibitions/${id}`,{method:'DELETE',auth:null}));
await expectStatus('staff can delete',200,request(`exhibitions/${id}`,{method:'DELETE'}));
// Virtual galleries remain linked to their exhibition publication state.
const exid='rules-virtual';const artid='rules-artwork';
const galleryPath=`virtualGalleries/${exid}`;
const artworkPath=`${galleryPath}/artworks/${artid}`;
const settings={title:'가상 전시',subtitle:'전시 소개',published:true,theme:'white',wallColor:'#e6e2de',brightness:1.2,speed:2.4,outdoor:false,showPrices:false,updatedAt:new Date().toISOString()};
const artwork={title:'작품',titleEn:'Artwork',artist:'작가',year:'2026',medium:'Oil on canvas',widthCm:100.5,heightCm:120,price:'가격 문의',description:'작품 소개',wall:'front',frame:'black',order:0,image:{url:'',path:`virtualGalleries/${exid}/${artid}/11111111-2222-4333-8444-555555555555.jpeg`,alt:'작품 이미지'},updatedAt:new Date().toISOString()};
const saveGallery=data=>request(galleryPath,{method:'PATCH',data});
const saveArtwork=data=>request(artworkPath,{method:'PATCH',data});
await expectStatus('gallery requires exhibition',403,saveGallery(settings));
await expectStatus('seed virtual parent exhibition',200,request(`exhibitions/${exid}`,{method:'PATCH',data:fixture(exid)}));
await expectStatus('artwork requires gallery root',403,saveArtwork(artwork));
await expectStatus('create gallery settings',200,saveGallery(settings));
await expectStatus('update gallery settings',200,saveGallery({...settings,theme:'herringbone-wood'}));
await expectStatus('create canvas artwork',200,saveArtwork({...artwork,frame:'canvas'}));
await expectStatus('update canvas artwork',200,saveArtwork({...artwork,frame:'canvas',title:'캔버스 작품'}));
await expectStatus('update artwork to black frame',200,saveArtwork(artwork));
await expectStatus('update artwork',200,saveArtwork({...artwork,frame:'wood'}));
await expectStatus('public published gallery',200,request(galleryPath,{auth:null}));
await expectStatus('public published artwork',200,request(artworkPath,{auth:null}));
await expectStatus('public artwork list for published gallery',200,request(`${galleryPath}/artworks`,{auth:null}));
for(const state of ['parent-draft','gallery-draft']){
 await expectStatus(`${state}: exhibition state`,200,request(`exhibitions/${exid}`,{method:'PATCH',data:{...fixture(exid),published:state!=='parent-draft'}}));
 await expectStatus(`${state}: gallery state`,200,saveGallery({...settings,published:state!=='gallery-draft'}));
 for(const path of [galleryPath,artworkPath,`${galleryPath}/artworks`])await expectStatus(`${state}: public denied ${path}`,403,request(path,{auth:null}));
 await expectStatus(`${state}: staff gallery read`,200,request(galleryPath));
 await expectStatus(`${state}: staff artwork read`,200,request(artworkPath));
}
await expectStatus('restore published exhibition',200,request(`exhibitions/${exid}`,{method:'PATCH',data:fixture(exid)}));
await expectStatus('restore published gallery',200,saveGallery(settings));
const badSettings=[
 ['empty title',{...settings,title:''}],
 ['extra field',{...settings,role:'admin'}],
 ['missing required field',Object.fromEntries(Object.entries(settings).filter(([key])=>key!=='showPrices'))],
 ['oversized title',{...settings,title:'x'.repeat(201)}],
 ['wrong brightness type',{...settings,brightness:'1'}],
 ['low brightness',{...settings,brightness:0.49}],
 ['high brightness',{...settings,brightness:1.81}],
 ['low speed',{...settings,speed:0.9}],
 ['high speed',{...settings,speed:5.1}],
 ['bad theme',{...settings,theme:'unknown'}],
 ['bad color',{...settings,wallColor:'red'}],
 ['wrong boolean',{...settings,outdoor:'true'}],
 ['oversized timestamp',{...settings,updatedAt:'x'.repeat(51)}],
 ['invalid timestamp',{...settings,updatedAt:'today'}],
];
for(const [label,data] of badSettings){
 await expectStatus(`virtual ${label}: clear fixture`,200,request(galleryPath,{method:'DELETE',auth:'owner'}));
 await expectStatus(`virtual ${label}: create denied`,403,saveGallery(data));
 await expectStatus(`virtual ${label}: seed fixture`,200,saveGallery(settings));
 await expectStatus(`virtual ${label}: update denied`,403,saveGallery(data));
}
const badArtwork=[
 ['extra field',{...artwork,privateEmail:'secret@example.com'}],
 ['missing required field',Object.fromEntries(Object.entries(artwork).filter(([key])=>key!=='artist'))],
 ['empty title',{...artwork,title:''}],
 ['empty artist',{...artwork,artist:''}],
 ['invalid timestamp',{...artwork,updatedAt:'today'}],
 ['wrong width type',{...artwork,widthCm:'100'}],
 ['small width',{...artwork,widthCm:9.99}],
 ['large height',{...artwork,heightCm:500.01}],
 ['oversized description',{...artwork,description:'x'.repeat(5001)}],
 ['bad wall',{...artwork,wall:'ceiling'}],
 ['bad frame',{...artwork,frame:'metal'}],
 ['negative order',{...artwork,order:-1}],
 ['fractional order',{...artwork,order:0.5}],
 ['wrong image type',{...artwork,image:'url'}],
 ['missing image alt',{...artwork,image:{url:'',path:artwork.image.path}}],
 ['extra image field',{...artwork,image:{...artwork.image,caption:'hidden'}}],
 ['cross-exhibition path',{...artwork,image:{...artwork.image,path:artwork.image.path.replace(exid,'another-exhibition')}}],
 ['cross-artwork path',{...artwork,image:{...artwork.image,path:artwork.image.path.replace(artid,'another-artwork')}}],
 ['extra path segment',{...artwork,image:{...artwork.image,path:artwork.image.path.replace('/11111111','/nested/11111111')}}],
 ['wrong file extension',{...artwork,image:{...artwork.image,path:artwork.image.path.replace('.jpeg','.svg')}}],
 ['non-UUID filename',{...artwork,image:{...artwork.image,path:artwork.image.path.replace('11111111-2222-4333-8444-555555555555','name')}}],
 ['nonempty image URL',{...artwork,image:{...artwork.image,url:'https://example.com/image.jpeg'}}],
 ['oversized image alt',{...artwork,image:{...artwork.image,alt:'x'.repeat(1001)}}],
];
for(const [label,data] of badArtwork){
 await expectStatus(`artwork ${label}: clear fixture`,200,request(artworkPath,{method:'DELETE',auth:'owner'}));
 await expectStatus(`artwork ${label}: create denied`,403,saveArtwork(data));
 await expectStatus(`artwork ${label}: seed fixture`,200,saveArtwork(artwork));
 await expectStatus(`artwork ${label}: update denied`,403,saveArtwork(data));
}
for(const [label,auth] of [['anonymous',null],['inactive',token({email:'inactive@example.com'})],['unapproved',token({email:'other@example.com'})],['unverified',token({email_verified:false})],['password',token({firebase:{sign_in_provider:'password'}})]]){
 await expectStatus(`${label}: virtual write denied`,403,request(galleryPath,{method:'PATCH',data:settings,auth}));
 await expectStatus(`${label}: artwork write denied`,403,request(artworkPath,{method:'PATCH',data:artwork,auth}));
}
await expectStatus('parent delete fixture',200,request(`exhibitions/${exid}`,{method:'DELETE',auth:'owner'}));
await expectStatus('orphaned gallery public read denied',403,request(galleryPath,{auth:null}));
await expectStatus('orphaned artwork public read denied',403,request(artworkPath,{auth:null}));
await expectStatus('orphaned gallery update denied',403,saveGallery(settings));
await expectStatus('orphaned artwork update denied',403,saveArtwork(artwork));
await expectStatus('anonymous artwork delete denied',403,request(artworkPath,{method:'DELETE',auth:null}));
await expectStatus('staff orphan artwork cleanup allowed',200,request(artworkPath,{method:'DELETE'}));
await expectStatus('staff orphan gallery cleanup allowed',200,request(galleryPath,{method:'DELETE'}));
console.log(`Firestore emulator: ${checks} checks passed.`);
