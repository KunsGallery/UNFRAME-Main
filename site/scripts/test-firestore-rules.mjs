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
function field(value){if(typeof value==='string')return {stringValue:value};if(typeof value==='boolean')return {booleanValue:value};if(typeof value==='number')return {integerValue:String(value)};if(value===null)return {nullValue:null};if(Array.isArray(value))return {arrayValue:{values:value.map(field)}};return {mapValue:{fields:Object.fromEntries(Object.entries(value).map(([key,item])=>[key,field(item)]))}};}
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
console.log(`Firestore emulator: ${checks} checks passed.`);
