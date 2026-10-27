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
function field(value){if(value instanceof Date)return {timestampValue:value.toISOString()};if(typeof value==='string')return {stringValue:value};if(typeof value==='boolean')return {booleanValue:value};if(typeof value==='number')return Number.isInteger(value)?{integerValue:String(value)}:{doubleValue:value};if(value===null)return {nullValue:null};if(Array.isArray(value))return {arrayValue:{values:value.map(field)}};return {mapValue:{fields:Object.fromEntries(Object.entries(value).map(([key,item])=>[key,field(item)]))}};}
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
for(const enabled of [true,false]){
 const flagId=`rules-viewing-room-${enabled}`;
 const data={...fixture(flagId),viewingRoomEnabled:enabled};
 await expectStatus(`clear viewing room ${enabled}`,200,request(`exhibitions/${flagId}`,{method:'DELETE',auth:'owner'}));
 await expectStatus(`create viewing room ${enabled}`,200,request(`exhibitions/${flagId}`,{method:'PATCH',data}));
 await expectStatus(`update viewing room ${enabled}`,200,request(`exhibitions/${flagId}`,{method:'PATCH',data:{...data,viewingRoomEnabled:!enabled}}));
 await expectStatus(`remove optional viewing room flag ${enabled}`,200,request(`exhibitions/${flagId}`,{method:'PATCH',data:fixture(flagId)}));
}
const denied=[
 ['unknown document field',{...legal,privateEmail:'secret@example.com'}],
 ['missing required field',Object.fromEntries(Object.entries(legal).filter(([key])=>key!=='title'))],
 ['invalid field type',{...legal,title:1}],
 ['viewing room string flag',{...legal,viewingRoomEnabled:'true'}],
 ['viewing room numeric flag',{...legal,viewingRoomEnabled:1}],
 ['viewing room null flag',{...legal,viewingRoomEnabled:null}],
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
await expectStatus('round canvas artwork with sale status',200,saveArtwork({...artwork,frame:'canvas',shape:'circle',widthCm:80,heightCm:80,saleStatus:'sold'}));
await expectStatus('free-form artwork not for sale',200,saveArtwork({...artwork,frame:'none',shape:'free',saleStatus:'nfs'}));
await expectStatus('unknown artwork shape denied',403,saveArtwork({...artwork,shape:'star'}));
await expectStatus('unknown sale status denied',403,saveArtwork({...artwork,saleStatus:'gone'}));
await expectStatus('gallery room size saved',200,saveGallery({...settings,roomSize:'small'}));
await expectStatus('unknown room size denied',403,saveGallery({...settings,roomSize:'huge'}));
await expectStatus('restore gallery room size',200,saveGallery(settings));
const objectArt={...artwork,kind:'object',depthCm:50,spot:'corner-front-left',yaw:45,plinth:'low',copies:2,model:{path:`virtualGalleries/${exid}/${artid}/11111111-2222-4333-8444-555555555555.glb`,name:'lamp.glb'}};
await expectStatus('object artwork with GLB model',200,saveArtwork(objectArt));
await expectStatus('object model must live under its artwork',403,saveArtwork({...objectArt,model:{...objectArt.model,path:`virtualGalleries/other/${artid}/11111111-2222-4333-8444-555555555555.glb`}}));
await expectStatus('object model must be a GLB',403,saveArtwork({...objectArt,model:{...objectArt.model,path:`virtualGalleries/${exid}/${artid}/11111111-2222-4333-8444-555555555555.exe`}}));
await expectStatus('unknown artwork kind denied',403,saveArtwork({...objectArt,kind:'statue'}));
await expectStatus('object copies limited to five',403,saveArtwork({...objectArt,copies:6}));
await expectStatus('object yaw limited',403,saveArtwork({...objectArt,yaw:400}));
await expectStatus('unknown plinth denied',403,saveArtwork({...objectArt,plinth:'tall'}));
await expectStatus('restore flat artwork',200,saveArtwork(artwork));
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
const newsid='rules-now';const newsPath=`homeHighlights/${newsid}`;
const news={kind:'news',title:'새 소식',summary:'',project:'UP',url:'/news',startDate:'',endDate:'',cover:{url:'',path:`homeHighlights/${newsid}/cover.jpeg`,alt:'소식 이미지'},published:true,featured:false,nowFeatured:true,order:0,updatedAt:new Date().toISOString()};
const saveNews=data=>request(newsPath,{method:'PATCH',data});
await expectStatus('create news in NOW without hero',200,saveNews(news));
await expectStatus('update news in hero without NOW',200,saveNews({...news,featured:true,nowFeatured:false}));
await expectStatus('news in both selections',200,saveNews({...news,featured:true}));
await expectStatus('legacy news without NOW field',200,saveNews(Object.fromEntries(Object.entries(news).filter(([key])=>key!=='nowFeatured'))));
await expectStatus('legacy virtual without NOW field',200,saveNews({...Object.fromEntries(Object.entries(news).filter(([key])=>key!=='nowFeatured')),kind:'virtual',project:''}));
await expectStatus('event selected for NOW',200,saveNews({...news,kind:'event',project:'음',startDate:'2026-10-13',endDate:'2026-10-20'}));
for(const projectName of ['UP','음','U#','U.A.U','UNFRAME SALON'])await expectStatus(`published news project ${projectName}`,200,saveNews({...news,project:projectName}));
await expectStatus('SALON event in JOURNAL',200,saveNews({...news,kind:'event',project:'UNFRAME SALON',startDate:'2026-10-31',endDate:'2026-10-31'}));
await expectStatus('SALON published news',200,saveNews({...news,project:'UNFRAME SALON'}));
await expectStatus('draft news can omit project value',200,saveNews({...news,published:false,project:'',url:'',cover:{url:'',path:'',alt:''}}));
const badNews=[
 ['invalid NOW type',{...news,nowFeatured:'true'}],
 ['invalid hero type',{...news,featured:'true'}],
 ['invalid kind',{...news,kind:'article'}],
 ['published news unknown project',{...news,project:'other'}],
 ['published news missing project selection',{...news,project:''}],
 ['NOW event unknown project',{...news,kind:'event',project:'other',startDate:'2026-10-13',endDate:'2026-10-20'}],
 ['virtual selected for NOW',{...news,kind:'virtual'}],
 ['news unpaired dates',{...news,startDate:'2026-10-13'}],
 ['news reversed dates',{...news,startDate:'2026-10-20',endDate:'2026-10-13'}],
 ['published news missing URL',{...news,url:''}],
 ['published news missing image',{...news,cover:{url:'',path:'',alt:''}}],
];
for(const [label,data] of badNews){
 await expectStatus(`${label}: clear fixture`,200,request(newsPath,{method:'DELETE',auth:'owner'}));
 await expectStatus(`${label}: create denied`,403,saveNews(data));
 await expectStatus(`${label}: seed fixture`,200,saveNews(news));
 await expectStatus(`${label}: update denied`,403,saveNews(data));
}
for(const [label,auth] of [['anonymous',null],['inactive',token({email:'inactive@example.com'})],['unapproved',token({email:'other@example.com'})],['unverified',token({email_verified:false})],['password',token({firebase:{sign_in_provider:'password'}})]])await expectStatus(`${label}: news write denied`,403,request(newsPath,{method:'PATCH',data:news,auth}));
await expectStatus('published news public read',200,request(newsPath,{auth:null}));
await expectStatus('draft news saved',200,saveNews({...news,published:false}));
await expectStatus('draft news public read denied',403,request(newsPath,{auth:null}));
await expectStatus('draft news staff read',200,request(newsPath));
// Multiple artist galleries use immutable exhibition references, without migrating legacy roots.
const artistParent='rules-artists-parent';const otherParent='rules-artists-other';
await expectStatus('seed artist parent',200,request(`exhibitions/${artistParent}`,{method:'PATCH',data:fixture(artistParent)}));
await expectStatus('seed other artist parent',200,request(`exhibitions/${otherParent}`,{method:'PATCH',data:fixture(otherParent)}));
const artistIds=['artist-rules-one','artist-rules-two','artist-rules-draft'];
await expectStatus('clear prior artist-invalid fixture',200,request('virtualGalleries/artist-rules-invalid',{method:'DELETE',auth:'owner'}));
const artistSettings=(galleryId,extra={})=>({...settings,exhibitionId:artistParent,artistName:galleryId,order:0,...extra});
const artistArtwork=galleryId=>({...artwork,image:{...artwork.image,path:`virtualGalleries/${galleryId}/${artid}/11111111-2222-4333-8444-555555555555.jpeg`}});
for(const galleryId of artistIds){
 const path=`virtualGalleries/${galleryId}`;
 await expectStatus(`clear ${galleryId} prior artwork`,200,request(`${path}/artworks/${artid}`,{method:'DELETE',auth:'owner'}));
 await expectStatus(`clear ${galleryId} prior metadata`,200,request(path,{method:'DELETE',auth:'owner'}));
 await expectStatus(`create ${galleryId}`,200,request(path,{method:'PATCH',data:artistSettings(galleryId,{published:galleryId!==artistIds[2]})}));
 await expectStatus(`create ${galleryId} artwork`,200,request(`${path}/artworks/${artid}`,{method:'PATCH',data:artistArtwork(galleryId)}));
}
async function artistQuery(filters,auth=null){
 const response=await fetch(`${base}:runQuery`,{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${auth}`}:{})},body:JSON.stringify({structuredQuery:{from:[{collectionId:'virtualGalleries'}],where:{compositeFilter:{op:'AND',filters:filters.map(([key,value])=>({fieldFilter:{field:{fieldPath:key},op:'EQUAL',value:field(value)}}))}}}})});
 return {status:response.status,text:await response.text()};
}
const filtered=await artistQuery([['exhibitionId',artistParent],['published',true]]);
await expectStatus('public artist list query',200,Promise.resolve(filtered));
assert.deepEqual(JSON.parse(filtered.text).filter(item=>item.document).map(item=>item.document.name.split('/').at(-1)).sort(),artistIds.slice(0,2).sort());checks++;
await expectStatus('public artist query without published filter denied',403,artistQuery([['exhibitionId',artistParent]]));
await expectStatus('public gallery query without parent filter denied',403,artistQuery([['published',true]]));
await expectStatus('staff artist list including drafts',200,artistQuery([['exhibitionId',artistParent]],staff));
for(const galleryId of artistIds){
 await expectStatus(`public ${galleryId} metadata`,galleryId===artistIds[2]?403:200,request(`virtualGalleries/${galleryId}`,{auth:null}));
 await expectStatus(`public ${galleryId} artwork`,galleryId===artistIds[2]?403:200,request(`virtualGalleries/${galleryId}/artworks/${artid}`,{auth:null}));
}
await expectStatus('artwork cannot borrow another artist image path',403,request(`virtualGalleries/${artistIds[0]}/artworks/${artid}`,{method:'PATCH',data:artistArtwork(artistIds[1])}));
await expectStatus('artist cannot be reassigned to another valid exhibition',403,request(`virtualGalleries/${artistIds[0]}`,{method:'PATCH',data:artistSettings(artistIds[0],{exhibitionId:otherParent})}));
await expectStatus('artist remains editable within parent',200,request(`virtualGalleries/${artistIds[0]}`,{method:'PATCH',data:artistSettings(artistIds[0],{artistName:'수정한 작가',order:2})}));
const invalidArtistId='artist-rules-invalid';const invalidArtistPath=`virtualGalleries/${invalidArtistId}`;
const invalidArtistSettings=[
 ['missing artist name',Object.fromEntries(Object.entries(artistSettings(invalidArtistId)).filter(([key])=>key!=='artistName'))],
 ['missing artist order',Object.fromEntries(Object.entries(artistSettings(invalidArtistId)).filter(([key])=>key!=='order'))],
 ['empty artist name',artistSettings(invalidArtistId,{artistName:''})],
 ['oversized artist name',artistSettings(invalidArtistId,{artistName:'x'.repeat(301)})],
 ['invalid parent type',artistSettings(invalidArtistId,{exhibitionId:123})],
 ['invalid parent characters',artistSettings(invalidArtistId,{exhibitionId:'../parent'})],
 ['missing parent',artistSettings(invalidArtistId,{exhibitionId:'rules-missing-parent'})],
 ['negative order',artistSettings(invalidArtistId,{order:-1})],
 ['fractional order',artistSettings(invalidArtistId,{order:0.5})],
 ['large order',artistSettings(invalidArtistId,{order:1000001})],
];
for(const [label,data] of invalidArtistSettings){
 await expectStatus(`${label}: artist clear fixture`,200,request(invalidArtistPath,{method:'DELETE',auth:'owner'}));
 await expectStatus(`${label}: artist create denied`,403,request(invalidArtistPath,{method:'PATCH',data}));
 await expectStatus(`${label}: seed legal artist`,200,request(invalidArtistPath,{method:'PATCH',data:artistSettings(invalidArtistId)}));
 await expectStatus(`${label}: artist update denied`,403,request(invalidArtistPath,{method:'PATCH',data}));
}
await expectStatus('legacy gallery still supported',200,request(`virtualGalleries/${artistParent}`,{method:'PATCH',data:settings}));
await expectStatus('legacy gallery public read',200,request(`virtualGalleries/${artistParent}`,{auth:null}));
await expectStatus('legacy cannot convert to artist gallery',403,request(`virtualGalleries/${artistParent}`,{method:'PATCH',data:artistSettings(artistParent,{exhibitionId:otherParent})}));
await expectStatus('legacy cannot add artist metadata without parent',403,request(`virtualGalleries/${artistParent}`,{method:'PATCH',data:{...settings,artistName:'작가',order:0}}));
await expectStatus('seed exhibition using artist ID for conversion attack',200,request(`exhibitions/${artistIds[0]}`,{method:'PATCH',data:fixture(artistIds[0])}));
await expectStatus('artist cannot convert to legacy root despite same-ID exhibition',403,request(`virtualGalleries/${artistIds[0]}`,{method:'PATCH',data:settings}));
const sameId='rules-artist-same-id';
await expectStatus('seed same-ID association attack parent',200,request(`exhibitions/${sameId}`,{method:'PATCH',data:fixture(sameId)}));
await expectStatus('new artist gallery ID must differ from parent',403,request(`virtualGalleries/${sameId}`,{method:'PATCH',data:artistSettings(sameId,{exhibitionId:sameId})}));
for(const auth of [null,token({email:'inactive@example.com'}),token({email:'other@example.com'}),token({email_verified:false})])await expectStatus('unapproved user cannot edit artist gallery',403,request(`virtualGalleries/${artistIds[0]}`,{method:'PATCH',data:artistSettings(artistIds[0]),auth}));
await expectStatus('unpublish artist parent',200,request(`exhibitions/${artistParent}`,{method:'PATCH',data:{...fixture(artistParent),published:false}}));
await expectStatus('unpublished parent public query denied',403,artistQuery([['exhibitionId',artistParent],['published',true]]));
for(const galleryId of artistIds.slice(0,2)){
 await expectStatus('unpublished parent artist read denied',403,request(`virtualGalleries/${galleryId}`,{auth:null}));
 await expectStatus('unpublished parent artist artwork read denied',403,request(`virtualGalleries/${galleryId}/artworks/${artid}`,{auth:null}));
 await expectStatus('staff can read unpublished parent artist gallery',200,request(`virtualGalleries/${galleryId}`));
}
await expectStatus('legacy parent draft hides legacy root',403,request(`virtualGalleries/${artistParent}`,{auth:null}));
await expectStatus('delete artist parent',200,request(`exhibitions/${artistParent}`,{method:'DELETE',auth:'owner'}));
await expectStatus('orphaned artist query denied',403,artistQuery([['exhibitionId',artistParent],['published',true]]));
await expectStatus('orphaned artist artwork edit denied',403,request(`virtualGalleries/${artistIds[0]}/artworks/${artid}`,{method:'PATCH',data:artistArtwork(artistIds[0])}));
// Optional lighting/ceiling and canvas properties keep legacy settings valid.
const upgradeParent='rules-upgrade-parent';const upgradeArtist='artist-rules-upgrade';
await expectStatus('seed optional-upgrade parent',200,request(`exhibitions/${upgradeParent}`,{method:'PATCH',data:fixture(upgradeParent)}));
const enhancedSettings={...settings,theme:'urethane',lighting:'focused',ceiling:'luminous'};
for(const galleryId of [upgradeParent,upgradeArtist]){
 const galleryPath=`virtualGalleries/${galleryId}`;
 const artworkPath=`${galleryPath}/artworks/${artid}`;
 const association=galleryId===upgradeParent?{}:{exhibitionId:upgradeParent,artistName:'선택 설정 작가',order:0};
 const legacySettings={...settings,...association};
 const enhanced={...enhancedSettings,...association};
 const baseArtwork=artistArtwork(galleryId);
 await expectStatus(`${galleryId}: clear optional fixture`,200,request(galleryPath,{method:'DELETE',auth:'owner'}));
 await expectStatus(`${galleryId}: optional settings create`,200,request(galleryPath,{method:'PATCH',data:enhanced}));
 await expectStatus(`${galleryId}: optional settings update`,200,request(galleryPath,{method:'PATCH',data:{...enhanced,lighting:'general',ceiling:'plain'}}));
 await expectStatus(`${galleryId}: legacy settings update`,200,request(galleryPath,{method:'PATCH',data:legacySettings}));
 const invalidSettings=[['lighting enum',{lighting:'spotlight'}],['lighting type',{lighting:1}],['lighting null',{lighting:null}],['ceiling enum',{ceiling:'open'}],['ceiling type',{ceiling:true}],['invalid floor',{theme:'plastic'}]];
 for(const [label,extra] of invalidSettings){
  await expectStatus(`${galleryId} ${label}: clear`,200,request(galleryPath,{method:'DELETE',auth:'owner'}));
  await expectStatus(`${galleryId} ${label}: create denied`,403,request(galleryPath,{method:'PATCH',data:{...legacySettings,...extra}}));
  await expectStatus(`${galleryId} ${label}: seed`,200,request(galleryPath,{method:'PATCH',data:legacySettings}));
  await expectStatus(`${galleryId} ${label}: update denied`,403,request(galleryPath,{method:'PATCH',data:{...legacySettings,...extra}}));
 }
 await expectStatus(`${galleryId}: clear canvas fixture`,200,request(artworkPath,{method:'DELETE',auth:'owner'}));
 await expectStatus(`${galleryId}: canvas optional create minimum`,200,request(artworkPath,{method:'PATCH',data:{...baseArtwork,frame:'canvas',canvasThickness:0.5,canvasEdge:'natural'}}));
 await expectStatus(`${galleryId}: canvas optional update maximum`,200,request(artworkPath,{method:'PATCH',data:{...baseArtwork,frame:'canvas',canvasThickness:10,canvasEdge:'black'}}));
 await expectStatus(`${galleryId}: canvas optional image edge`,200,request(artworkPath,{method:'PATCH',data:{...baseArtwork,canvasThickness:3.5,canvasEdge:'image'}}));
 await expectStatus(`${galleryId}: legacy artwork unchanged`,200,request(artworkPath,{method:'PATCH',data:baseArtwork}));
 const invalidCanvas=[['thickness type',{canvasThickness:'3.5'}],['thickness null',{canvasThickness:null}],['thickness minimum',{canvasThickness:0.49}],['thickness maximum',{canvasThickness:10.01}],['edge enum',{canvasEdge:'wood'}],['edge type',{canvasEdge:1}],['edge null',{canvasEdge:null}]];
 for(const [label,extra] of invalidCanvas){
  await expectStatus(`${galleryId} ${label}: clear`,200,request(artworkPath,{method:'DELETE',auth:'owner'}));
  await expectStatus(`${galleryId} ${label}: create denied`,403,request(artworkPath,{method:'PATCH',data:{...baseArtwork,...extra}}));
  await expectStatus(`${galleryId} ${label}: seed`,200,request(artworkPath,{method:'PATCH',data:baseArtwork}));
  await expectStatus(`${galleryId} ${label}: update denied`,403,request(artworkPath,{method:'PATCH',data:{...baseArtwork,...extra}}));
 }
 await expectStatus(`${galleryId}: restore enhanced settings`,200,request(galleryPath,{method:'PATCH',data:enhanced}));
 await expectStatus(`${galleryId}: enhanced public settings read`,200,request(galleryPath,{auth:null}));
 await expectStatus(`${galleryId}: enhanced artwork public read`,200,request(artworkPath,{auth:null}));
 await expectStatus(`${galleryId}: anonymous enhanced settings denied`,403,request(galleryPath,{method:'PATCH',data:enhanced,auth:null}));
 await expectStatus(`${galleryId}: anonymous enhanced artwork denied`,403,request(artworkPath,{method:'PATCH',data:{...baseArtwork,canvasThickness:3.5,canvasEdge:'image'},auth:null}));
 await expectStatus(`${galleryId}: enhanced draft settings save`,200,request(galleryPath,{method:'PATCH',data:{...enhanced,published:false}}));
 await expectStatus(`${galleryId}: enhanced draft settings public denied`,403,request(galleryPath,{auth:null}));
 await expectStatus(`${galleryId}: enhanced draft artwork public denied`,403,request(artworkPath,{auth:null}));
 await expectStatus(`${galleryId}: restore publication`,200,request(galleryPath,{method:'PATCH',data:enhanced}));
}
await expectStatus('enhanced parent unpublish',200,request(`exhibitions/${upgradeParent}`,{method:'PATCH',data:{...fixture(upgradeParent),published:false}}));
for(const galleryId of [upgradeParent,upgradeArtist]){
 await expectStatus('enhanced settings unpublished parent denied',403,request(`virtualGalleries/${galleryId}`,{auth:null}));
 await expectStatus('enhanced artwork unpublished parent denied',403,request(`virtualGalleries/${galleryId}/artworks/${artid}`,{auth:null}));
}
// Product inventory is private even if a trusted backend injects publishing metadata.
function productFixture(productId,count=0){return {name:'시드 펜',summary:'',story:'',details:'',packaging:'',priceLabel:'',checkoutUrl:'',colors:'',specs:'',images:Array.from({length:count},()=>({url:'',path:`products/${productId}/11111111-2222-4333-8444-555555555555.jpeg`,alt:'상품 사진'})),order:0,updatedAt:new Date().toISOString()};}
for(const count of [0,1,12]){
 const productId=`rules-product-${count}`;const path=`products/${productId}`;const data=productFixture(productId,count);
 await expectStatus(`product ${count} images clear`,200,request(path,{method:'DELETE',auth:'owner'}));
 await expectStatus(`product ${count} images create`,200,request(path,{method:'PATCH',data}));
 await expectStatus(`product ${count} images update`,200,request(path,{method:'PATCH',data:{...data,summary:'수정'}}));
 await expectStatus(`product ${count} staff read`,200,request(path));
}
const productId='rules-private-product';const productPath=`products/${productId}`;const product=productFixture(productId,1);
const badProducts=[
 ['published field',{...product,published:true}],['unknown field',{...product,role:'admin'}],
 ['missing name',Object.fromEntries(Object.entries(product).filter(([key])=>key!=='name'))],
 ['empty name',{...product,name:''}],['name type',{...product,name:1}],['long name',{...product,name:'x'.repeat(201)}],
 ...[['summary',601],['story',5001],['details',5001],['packaging',5001],['priceLabel',101],['colors',1001],['specs',5001],['updatedAt',51],['checkoutUrl',2001]].map(([key,size])=>[`oversized ${key}`,{...product,[key]:'x'.repeat(size)}]),
 ['checkout http',{...product,checkoutUrl:'http://example.com'}],['checkout javascript',{...product,checkoutUrl:'javascript:alert(1)'}],['checkout relative',{...product,checkoutUrl:'/shop'}],['checkout missing host',{...product,checkoutUrl:'https://'}],
 ['checkout whitespace',{...product,checkoutUrl:'https://example.com/a b'}],['checkout query without host',{...product,checkoutUrl:'https://?checkout'}],
 ['negative order',{...product,order:-1}],['large order',{...product,order:1000001}],['fractional order',{...product,order:0.5}],
 ['thirteen images',productFixture(productId,13)],['images type',{...product,images:{}}],
 ['image extra field',{...product,images:[{...product.images[0],caption:'secret'}]}],
 ['image missing alt',{...product,images:[{url:'',path:product.images[0].path}]}],
 ['image nonempty url',{...product,images:[{...product.images[0],url:'https://example.com/image.jpeg'}]}],
 ['image wrong namespace',{...product,images:[{...product.images[0],path:product.images[0].path.replace('products/','exhibitions/')}]}],
 ['image another product',{...product,images:[{...product.images[0],path:product.images[0].path.replace(productId,'other-product')}]}],
 ['image nested path',{...product,images:[{...product.images[0],path:product.images[0].path.replace('/11111111','/nested/11111111')}]}],
 ['image traversal',{...product,images:[{...product.images[0],path:product.images[0].path.replace('/11111111','/../11111111')}]}],
 ['image extension',{...product,images:[{...product.images[0],path:product.images[0].path.replace('.jpeg','.svg')}]}],
 ['image nonuuid',{...product,images:[{...product.images[0],path:`products/${productId}/name.jpeg`}]}],
 ['image alt type',{...product,images:[{...product.images[0],alt:1}]}],['image oversized alt',{...product,images:[{...product.images[0],alt:'x'.repeat(1001)}]}],
 ['last image invalid',{...productFixture(productId,12),images:[...productFixture(productId,11).images,{...product.images[0],path:'products/other/11111111-2222-4333-8444-555555555555.jpeg'}]}],
];
for(const [label,data] of badProducts){
 await expectStatus(`product ${label}: clear`,200,request(productPath,{method:'DELETE',auth:'owner'}));
 await expectStatus(`product ${label}: create denied`,403,request(productPath,{method:'PATCH',data}));
 await expectStatus(`product ${label}: seed`,200,request(productPath,{method:'PATCH',data:product}));
 await expectStatus(`product ${label}: update denied`,403,request(productPath,{method:'PATCH',data}));
}
for(const auth of [null,token({email:'other@example.com'}),token({email:'inactive@example.com'}),token({email_verified:false}),token({firebase:{sign_in_provider:'password'}})]){
 for(const [label,path,method,data] of [['get',productPath,'GET',null],['list','products','GET',null],['create','products/rules-new-private','PATCH',productFixture('rules-new-private')],['update',productPath,'PATCH',product],['delete',productPath,'DELETE',null]])await expectStatus(`unapproved product ${label} denied`,403,request(path,{method,data,auth}));
}
await expectStatus('staff product collection list',200,request('products'));
await expectStatus('seed malicious product published field as trusted backend',200,request(productPath,{method:'PATCH',data:{...product,published:true},auth:'owner'}));
await expectStatus('malicious published flag grants no public product read',403,request(productPath,{auth:null}));
await expectStatus('staff can remove invalid published flag',200,request(productPath,{method:'PATCH',data:product}));
await expectStatus('https checkout accepted',200,request(productPath,{method:'PATCH',data:{...product,checkoutUrl:'https://example.com/checkout?item=pen'}}));
for(const extension of ['png','webp'])await expectStatus(`product ${extension} accepted`,200,request(productPath,{method:'PATCH',data:{...product,images:[{...product.images[0],path:product.images[0].path.replace('.jpeg',`.${extension}`)}]}}));
await expectStatus('staff product delete',200,request(productPath,{method:'DELETE'}));
await expectStatus('unsafe product ID denied',403,request('products/rules.product',{method:'PATCH',data:productFixture('rules.product')}));
await expectStatus('oversized product ID denied',403,request(`products/${'p'.repeat(101)}`,{method:'PATCH',data:productFixture('p'.repeat(101))}));

// Artist submissions: invite links, account binding, ten-day expiry from server time.
const docName=path=>`projects/${project}/databases/(default)/documents/${path}`;
const artistToken=token({sub:'artist-user',user_id:'artist-user',email:'artist@example.com'});
const otherToken=token({sub:'other-user',user_id:'other-user',email:'other@example.com'});
const touch=fields=>fields.map(fieldPath=>({fieldPath,setToServerValue:'REQUEST_TIME'}));
const put=(path,data,{mask,stamp=['touchedAt']}={})=>({update:{name:docName(path),fields:field(data).mapValue.fields},...(mask?{updateMask:{fieldPaths:mask}}:{}),updateTransforms:touch(stamp)});
const remove=path=>({delete:docName(path)});
async function commit(writes,auth=staff){const response=await fetch(`${base}:commit`,{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${auth}`}:{})},body:JSON.stringify({writes})});return {status:response.status,text:await response.text()};}
const subSettings={theme:'white',wallColor:'#f6f4ee',lighting:'general',ceiling:'luminous'};
const invite=(extra={})=>({exhibitionId:artistParent,exhibitionTitle:'단체전',artistName:'김하늘',invitedEmail:'',ownerEmail:'',targetGalleryId:'',status:'invited',reviewNote:'',settings:subSettings,approvedGalleryId:'',...extra});
const subId=suffix=>`RulesSub${suffix}`.padEnd(22,'x');
const subArtwork=(sid,aid=artid,extra={})=>({...artwork,image:{...artwork.image,path:`virtualSubmissions/${sid}/${aid}/11111111-2222-4333-8444-555555555555.jpeg`},...extra});
const subWork=(sid,data,aid=artid,auth=artistToken)=>commit([put(`virtualSubmissions/${sid}/artworks/${aid}`,data,{stamp:[]}),put(`virtualSubmissions/${sid}`,{},{mask:[]})],auth);
async function resetSubmission(sid){for(const aid of [artid,'second-art','third-art'])await request(`virtualSubmissions/${sid}/artworks/${aid}`,{method:'DELETE',auth:'owner'});await request(`virtualSubmissions/${sid}`,{method:'DELETE',auth:'owner'});}
await expectStatus('re-seed artist parent for submissions',200,request(`exhibitions/${artistParent}`,{method:'PATCH',data:fixture(artistParent)}));
const open=subId('Open'),locked=subId('Locked'),old=subId('Old');
for(const sid of [open,locked,old])await resetSubmission(sid);
await expectStatus('artist cannot create an invite',403,commit([put(`virtualSubmissions/${open}`,invite(),{stamp:['touchedAt','createdAt']})],artistToken));
await expectStatus('invite requires server touch time',403,request(`virtualSubmissions/${open}`,{method:'PATCH',data:{...invite(),touchedAt:new Date(Date.now()+86400000*30),createdAt:new Date()}}));
await expectStatus('invite requires an existing exhibition',403,commit([put(`virtualSubmissions/${open}`,invite({exhibitionId:'missing-exhibition'}),{stamp:['touchedAt','createdAt']})]));
await expectStatus('short invite id denied',403,commit([put('virtualSubmissions/short',invite(),{stamp:['touchedAt','createdAt']})]));
await expectStatus('staff creates invite',200,commit([put(`virtualSubmissions/${open}`,invite(),{stamp:['touchedAt','createdAt']})]));
await expectStatus('staff creates email-locked invite',200,commit([put(`virtualSubmissions/${locked}`,invite({invitedEmail:'artist2@example.com'}),{stamp:['touchedAt','createdAt']})]));
// Staff may pre-upload artworks and space settings before the artist opens the link.
const staffWork=(sid,data,aid=artid)=>subWork(sid,data,aid,staff);
await expectStatus('staff pre-uploads artwork to an invite',200,staffWork(open,subArtwork(open)));
await expectStatus('staff pre-upload requires the parent touch',403,commit([put(`virtualSubmissions/${open}/artworks/second-art`,subArtwork(open,'second-art'),{stamp:[]})]));
await expectStatus('submission artworks never carry English copies',403,staffWork(open,subArtwork(open,artid,{descriptionEn:'About'})));
await expectStatus('submission artworks never carry English medium',403,staffWork(open,subArtwork(open,artid,{mediumEn:'Oil'})));
await expectStatus('staff pre-upload keeps image scoping',403,staffWork(open,subArtwork(open,artid,{image:{...artwork.image,path:`virtualSubmissions/${locked}/${artid}/11111111-2222-4333-8444-555555555555.jpeg`}})));
await expectStatus('staff sets space settings before the invite opens',200,commit([put(`virtualSubmissions/${open}`,{settings:{...subSettings,theme:'wood'}},{mask:['settings']})]));
await expectStatus('artist cannot write an unclaimed invite artwork',403,subWork(open,subArtwork(open,'second-art'),'second-art'));
await expectStatus('anonymous reads unclaimed invite',200,request(`virtualSubmissions/${open}`,{auth:null}));
const anonList=await fetch(`${base}:runQuery`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({structuredQuery:{from:[{collectionId:'virtualSubmissions'}]}})});
assert.equal(anonList.status,403);checks++;
await expectStatus('email-locked invite rejects another account',403,commit([put(`virtualSubmissions/${locked}`,{ownerEmail:'artist@example.com',status:'draft'},{mask:['ownerEmail','status']})],artistToken));
await expectStatus('claim must use own email',403,commit([put(`virtualSubmissions/${open}`,{ownerEmail:'other@example.com',status:'draft'},{mask:['ownerEmail','status']})],artistToken));
await expectStatus('claim cannot change artist name',403,commit([put(`virtualSubmissions/${open}`,{ownerEmail:'artist@example.com',status:'draft',artistName:'다른 이름'},{mask:['ownerEmail','status','artistName']})],artistToken));
await expectStatus('artist claims invite',200,commit([put(`virtualSubmissions/${open}`,{ownerEmail:'artist@example.com',status:'draft'},{mask:['ownerEmail','status']})],artistToken));
await expectStatus('claimed invite is no longer public',403,request(`virtualSubmissions/${open}`,{auth:null}));
await expectStatus('other account cannot read claimed invite',403,request(`virtualSubmissions/${open}`,{auth:otherToken}));
await expectStatus('other account cannot re-claim',403,commit([put(`virtualSubmissions/${open}`,{ownerEmail:'other@example.com',status:'draft'},{mask:['ownerEmail','status']})],otherToken));
await expectStatus('owner reads submission',200,request(`virtualSubmissions/${open}`,{auth:artistToken}));
await expectStatus('owner updates settings',200,commit([put(`virtualSubmissions/${open}`,{settings:{...subSettings,theme:'wood'}},{mask:['settings']})],artistToken));
await expectStatus('owner picks a room size',200,commit([put(`virtualSubmissions/${open}`,{settings:{...subSettings,roomSize:'small'}},{mask:['settings']})],artistToken));
await expectStatus('owner cannot pick an unknown room size',403,commit([put(`virtualSubmissions/${open}`,{settings:{...subSettings,roomSize:'huge'}},{mask:['settings']})],artistToken));
await expectStatus('owner saves a sold round artwork',200,subWork(open,subArtwork(open,artid,{frame:'none',shape:'circle',widthCm:60,heightCm:60,saleStatus:'reserved'})));
await expectStatus('owner saves an object with a submission GLB',200,subWork(open,subArtwork(open,artid,{kind:'object',depthCm:40,spot:'center',yaw:0,plinth:'none',copies:1,model:{path:`virtualSubmissions/${open}/${artid}/11111111-2222-4333-8444-555555555555.glb`,name:'a.glb'}})));
await expectStatus('owner cannot point an object at another submission GLB',403,subWork(open,subArtwork(open,artid,{kind:'object',depthCm:40,spot:'center',yaw:0,plinth:'none',copies:1,model:{path:`virtualSubmissions/${locked}/${artid}/11111111-2222-4333-8444-555555555555.glb`,name:'a.glb'}})));
await expectStatus('owner writes artist intro',200,commit([put(`virtualSubmissions/${open}`,{settings:{...subSettings,artistNote:'빛과 소리를 그립니다.'}},{mask:['settings']})],artistToken));
await expectStatus('artist intro over 600 chars denied',403,commit([put(`virtualSubmissions/${open}`,{settings:{...subSettings,artistNote:'가'.repeat(601)}},{mask:['settings']})],artistToken));
await expectStatus('unknown settings key denied',403,commit([put(`virtualSubmissions/${open}`,{settings:{...subSettings,published:true}},{mask:['settings']})],artistToken));
await expectStatus('owner cannot set invalid settings',403,commit([put(`virtualSubmissions/${open}`,{settings:{...subSettings,theme:'neon'}},{mask:['settings']})],artistToken));
for(const [label,key,value] of [['review note','reviewNote','승인해주세요'],['owner email','ownerEmail','other@example.com'],['exhibition','exhibitionId',otherParent],['target gallery','targetGalleryId','artist-rules-one'],['approved gallery','approvedGalleryId','artist-rules-one']])
 await expectStatus(`owner cannot change ${label}`,403,commit([put(`virtualSubmissions/${open}`,{[key]:value},{mask:[key]})],artistToken));
await expectStatus('owner cannot skip the touch time',403,request(`virtualSubmissions/${open}?updateMask.fieldPaths=settings`,{method:'PATCH',auth:artistToken,data:{settings:subSettings}}));
await expectStatus('artwork write requires parent touch in same batch',403,commit([put(`virtualSubmissions/${open}/artworks/${artid}`,subArtwork(open),{stamp:[]})],artistToken));
await expectStatus('owner saves artwork with parent touch',200,subWork(open,subArtwork(open)));
await expectStatus('artwork image must stay in own submission',403,subWork(open,subArtwork(open,artid,{image:{...artwork.image,path:`virtualSubmissions/${locked}/${artid}/11111111-2222-4333-8444-555555555555.jpeg`}})));
await expectStatus('artwork image cannot borrow another gallery',403,subWork(open,artistArtwork('artist-rules-one')));
await expectStatus('artwork keeps standard validation',403,subWork(open,subArtwork(open,artid,{widthCm:900})));
await expectStatus('other account cannot write artwork',403,subWork(open,subArtwork(open),artid,otherToken));
await expectStatus('owner reads artworks',200,request(`virtualSubmissions/${open}/artworks/${artid}`,{auth:artistToken}));
await expectStatus('other account cannot read artworks',403,request(`virtualSubmissions/${open}/artworks/${artid}`,{auth:otherToken}));
await expectStatus('owner submits for review',200,commit([put(`virtualSubmissions/${open}`,{status:'submitted'},{mask:['status']})],artistToken));
await expectStatus('staff cannot edit artwork under review',403,staffWork(open,subArtwork(open,'third-art'),'third-art'));
await expectStatus('staff cannot change settings under review',403,commit([put(`virtualSubmissions/${open}`,{settings:{...subSettings,theme:'black'}},{mask:['settings']})]));
await expectStatus('submitted locks artwork edits',403,subWork(open,subArtwork(open,'second-art'),'second-art'));
await expectStatus('submitted locks settings',403,commit([put(`virtualSubmissions/${open}`,{settings:subSettings},{mask:['settings']})],artistToken));
await expectStatus('artist cannot reject',403,commit([put(`virtualSubmissions/${open}`,{status:'rejected'},{mask:['status']})],artistToken));
await expectStatus('owner cancels review request',200,commit([put(`virtualSubmissions/${open}`,{status:'draft'},{mask:['status']})],artistToken));
await expectStatus('owner resubmits',200,commit([put(`virtualSubmissions/${open}`,{status:'submitted'},{mask:['status']})],artistToken));
await expectStatus('staff cannot rewrite artist fields',403,commit([put(`virtualSubmissions/${open}`,{ownerEmail:'staff@example.com'},{mask:['ownerEmail']})]));
await expectStatus('staff rejects with note',200,commit([put(`virtualSubmissions/${open}`,{status:'rejected',reviewNote:'이미지를 바꿔주세요.'},{mask:['status','reviewNote']})]));
await expectStatus('owner edits a rejected upload',200,subWork(open,subArtwork(open,'second-art'),'second-art'));
await expectStatus('staff extends deadline',200,commit([put(`virtualSubmissions/${open}`,{},{mask:[]})]));
await expectStatus('staff records approved gallery',200,commit([put(`virtualSubmissions/${open}`,{approvedGalleryId:'artist-approved-x'},{mask:['approvedGalleryId']})]));
await expectStatus('staff lists submissions',200,(async()=>{const r=await fetch(`${base}:runQuery`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${staff}`},body:JSON.stringify({structuredQuery:{from:[{collectionId:'virtualSubmissions'}]}})});return {status:r.status,text:await r.text()};})());
// Expiry: seeded through the emulator admin bypass with a touch time eleven days ago.
await expectStatus('seed expired submission',200,request(`virtualSubmissions/${old}`,{method:'PATCH',auth:'owner',data:{...invite({ownerEmail:'artist@example.com',status:'draft'}),createdAt:new Date(Date.now()-11*86400000),touchedAt:new Date(Date.now()-11*86400000)}}));
await expectStatus('seed expired artwork',200,request(`virtualSubmissions/${old}/artworks/${artid}`,{method:'PATCH',auth:'owner',data:subArtwork(old)}));
await expectStatus('owner cannot read expired submission',403,request(`virtualSubmissions/${old}`,{auth:artistToken}));
await expectStatus('owner cannot read expired artwork',403,request(`virtualSubmissions/${old}/artworks/${artid}`,{auth:artistToken}));
await expectStatus('owner cannot revive expired submission',403,commit([put(`virtualSubmissions/${old}`,{status:'submitted'},{mask:['status']})],artistToken));
await expectStatus('owner cannot write expired artwork',403,subWork(old,subArtwork(old)));
await expectStatus('staff reads expired submission',200,request(`virtualSubmissions/${old}`));
await expectStatus('artist cannot delete submission',403,commit([remove(`virtualSubmissions/${old}`)],artistToken));
await expectStatus('staff deletes expired artwork',200,commit([remove(`virtualSubmissions/${old}/artworks/${artid}`)]));
await expectStatus('staff deletes expired submission',200,commit([remove(`virtualSubmissions/${old}`)]));
// Approved galleries: the bound artist reads their own gallery and opens revisions, never writes it.
const owned='artist-rules-owned';
await request(`virtualGalleries/${owned}/artworks/${artid}`,{method:'DELETE',auth:'owner'});await request(`virtualGalleries/${owned}`,{method:'DELETE',auth:'owner'});
await expectStatus('gallery accepts artist email',200,request(`virtualGalleries/${owned}`,{method:'PATCH',data:artistSettings(owned,{published:false,artistEmail:'artist@example.com'})}));
await expectStatus('gallery accepts artist intro',200,request(`virtualGalleries/${owned}`,{method:'PATCH',data:artistSettings(owned,{published:false,artistEmail:'artist@example.com',artistNote:'작가 소개'})}));
await expectStatus('gallery rejects long artist intro',403,request(`virtualGalleries/${owned}`,{method:'PATCH',data:artistSettings(owned,{published:false,artistEmail:'artist@example.com',artistNote:'가'.repeat(601)})}));
await expectStatus('gallery rejects non-string artist email',403,request(`virtualGalleries/${owned}`,{method:'PATCH',data:artistSettings(owned,{published:false,artistEmail:5})}));
await expectStatus('owned gallery artwork',200,request(`virtualGalleries/${owned}/artworks/${artid}`,{method:'PATCH',data:artistArtwork(owned)}));
await expectStatus('bound artist reads private gallery',200,request(`virtualGalleries/${owned}`,{auth:artistToken}));
await expectStatus('bound artist reads private artwork',200,request(`virtualGalleries/${owned}/artworks/${artid}`,{auth:artistToken}));
await expectStatus('other account cannot read private gallery',403,request(`virtualGalleries/${owned}`,{auth:otherToken}));
await expectStatus('bound artist cannot write gallery',403,request(`virtualGalleries/${owned}`,{method:'PATCH',auth:artistToken,data:artistSettings(owned,{published:true,artistEmail:'artist@example.com'})}));
const myQuery=await fetch(`${base}:runQuery`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${artistToken}`},body:JSON.stringify({structuredQuery:{from:[{collectionId:'virtualGalleries'}],where:{fieldFilter:{field:{fieldPath:'artistEmail'},op:'EQUAL',value:{stringValue:'artist@example.com'}}}}})});
assert.equal(myQuery.status,200,await myQuery.clone().text());assert.deepEqual((await myQuery.json()).filter(item=>item.document).map(item=>item.document.name.split('/').at(-1)),[owned]);checks++;
const revision=subId('Revision'),stolen=subId('Stolen');for(const sid of [revision,stolen])await resetSubmission(sid);
const revisionDoc=invite({targetGalleryId:owned,ownerEmail:'artist@example.com',status:'draft'});
const keptArtwork={...artistArtwork(owned)};
await expectStatus('other account cannot open a revision',403,commit([put(`virtualSubmissions/${stolen}`,{...revisionDoc,ownerEmail:'other@example.com'},{stamp:['touchedAt','createdAt']}),put(`virtualSubmissions/${stolen}/artworks/${artid}`,keptArtwork,{stamp:[]})],otherToken));
await expectStatus('revision must target a gallery',403,commit([put(`virtualSubmissions/${stolen}`,{...revisionDoc,targetGalleryId:''},{stamp:['touchedAt','createdAt']})],artistToken));
await expectStatus('revision cannot start submitted',403,commit([put(`virtualSubmissions/${stolen}`,{...revisionDoc,status:'submitted'},{stamp:['touchedAt','createdAt']})],artistToken));
await expectStatus('bound artist opens a revision with existing artwork',200,commit([put(`virtualSubmissions/${revision}`,revisionDoc,{stamp:['touchedAt','createdAt']}),put(`virtualSubmissions/${revision}/artworks/${artid}`,keptArtwork,{stamp:[]})],artistToken));
await expectStatus('revision may keep gallery images',200,subWork(revision,{...keptArtwork,title:'고친 제목'}));
await expectStatus('revision may add submission images',200,subWork(revision,subArtwork(revision,'second-art'),'second-art'));

// Optional English copies of entered content.
{
 const enId='rules-english';
 await request(`exhibitions/${enId}`,{method:'DELETE',auth:'owner'});
 const english={titleEn:'Rules',summaryEn:'s'.repeat(600),descriptionEn:'d',locationEn:'Seoul',hoursEn:'11-7',admissionEn:'Free'};
 await expectStatus('exhibition with English copy',200,request(`exhibitions/${enId}`,{method:'PATCH',data:{...fixture(enId),...english}}));
 for(const [key,max] of Object.entries({titleEn:200,summaryEn:600,descriptionEn:30000,locationEn:1000,hoursEn:1000,admissionEn:1000})){
  await expectStatus(`exhibition ${key} too long`,403,request(`exhibitions/${enId}`,{method:'PATCH',data:{...fixture(enId),[key]:'x'.repeat(max+1)}}));
  await expectStatus(`exhibition ${key} not a string`,403,request(`exhibitions/${enId}`,{method:'PATCH',data:{...fixture(enId),[key]:3}}));
 }
 await expectStatus('highlight with English copy',200,saveNews({...news,titleEn:'News',summaryEn:'Short'}));
 await expectStatus('highlight titleEn too long',403,saveNews({...news,titleEn:'x'.repeat(201)}));
 await expectStatus('highlight summaryEn too long',403,saveNews({...news,summaryEn:'x'.repeat(601)}));
 await expectStatus('re-seed English gallery parent',200,request(`exhibitions/${exid}`,{method:'PATCH',data:fixture(exid)}));
 const galleryNow={...settings,updatedAt:new Date().toISOString()};
 await expectStatus('gallery with English copy',200,request(galleryPath,{method:'PATCH',data:{...galleryNow,titleEn:'Room',subtitleEn:'About',artistNoteEn:'Note'}}));
 for(const [key,max] of Object.entries({titleEn:200,subtitleEn:1000,artistNoteEn:600}))await expectStatus(`gallery ${key} too long`,403,request(galleryPath,{method:'PATCH',data:{...galleryNow,[key]:'x'.repeat(max+1)}}));
 const workNow={...artwork,updatedAt:new Date().toISOString()};
 await expectStatus('gallery artwork with English copy',200,request(artworkPath,{method:'PATCH',data:{...workNow,descriptionEn:'About',mediumEn:'Oil'}}));
 await expectStatus('gallery artwork descriptionEn too long',403,request(artworkPath,{method:'PATCH',data:{...workNow,descriptionEn:'x'.repeat(5001)}}));
 await expectStatus('gallery artwork mediumEn too long',403,request(artworkPath,{method:'PATCH',data:{...workNow,mediumEn:'x'.repeat(501)}}));
}
console.log(`Firestore emulator: ${checks} checks passed.`);
