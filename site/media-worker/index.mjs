import {catalog,product,image as sourcePhoto} from './imweb.mjs';
const MAX=10*1024*1024;
const JWKS='https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const bytes=s=>Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
export async function verifyToken(token,project,fetcher=fetch){
 try{
  if(!token||token.length>8192)fail(401,'로그인이 필요합니다.');
  const parts=token.split('.');if(parts.length!==3)fail(401,'잘못된 인증입니다.');
  const h=JSON.parse(new TextDecoder().decode(bytes(parts[0]))),p=JSON.parse(new TextDecoder().decode(bytes(parts[1]))),now=Date.now()/1000;
  if(h.alg!=='RS256'||!h.kid||p.aud!==project||p.iss!==`https://securetoken.google.com/${project}`||typeof p.sub!=='string'||!p.sub||p.sub.length>128||typeof p.exp!=='number'||p.exp<=now||typeof p.iat!=='number'||p.iat>now||typeof p.auth_time!=='number'||p.auth_time>now||p.email_verified!==true||p.firebase?.sign_in_provider!=='google.com')fail(401,'Google 로그인을 다시 해주세요.');
  const response=await fetcher(JWKS,{cf:{cacheTtl:3600,cacheEverything:true}});if(!response.ok)fail(503,'인증 서버에 연결할 수 없습니다.');
  const key=(await response.json()).keys.find(k=>k.kid===h.kid);if(!key)fail(401,'Google 로그인을 다시 해주세요.');
  const imported=await crypto.subtle.importKey('jwk',key,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',imported,bytes(parts[2]),new TextEncoder().encode(parts.slice(0,2).join('.'))))fail(401,'잘못된 인증입니다.');
  return p;
 }catch(error){if(error.status)throw error;fail(401,'잘못된 인증입니다.');}
}
async function document(env,path,token,fetcher){
 const response=await fetcher(`https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`,{headers:token?{Authorization:`Bearer ${token}`}:{}});
 if([403,404,401].includes(response.status))return null;
 if(!response.ok)fail(503,'전시 정보를 확인할 수 없습니다.');
 return (await response.json()).fields;
}
async function isStaff(env,token,fetcher){
 const user=await verifyToken(token,env.FIREBASE_PROJECT_ID,fetcher);
 const record=await document(env,`staffEmails/${encodeURIComponent(user.email)}`,token,fetcher);
 return {user,staff:record?.active?.booleanValue===true&&record?.email?.stringValue===user.email};
}
async function staff(env,token,fetcher){if(!(await isStaff(env,token,fetcher)).staff)fail(403,'관리자 권한이 없습니다.');}
const SUBMISSION_DAYS=10,SUBMISSION_OBJECTS=60;
// Invited artists are never staff: ownership, liveness and editability come from the submission
// document read with the artist's own token, so Firestore rules apply first.
async function submissionAccess(env,token,fetcher,path,write){
 if(!token)fail(404,'이미지를 찾을 수 없습니다.');
 const {user,staff:isStaffUser}=await isStaff(env,token,fetcher);if(isStaffUser)return;
 const record=await document(env,`virtualSubmissions/${path.id}`,token,fetcher);
 const touched=Date.parse(record?.touchedAt?.timestampValue||'');
 if(record?.ownerEmail?.stringValue!==user.email||!(touched+SUBMISSION_DAYS*86400000>Date.now()))fail(403,'업로드 권한이 없거나 기한이 지났습니다.');
 if(write&&!['draft','rejected'].includes(record?.status?.stringValue))fail(403,'심사 요청 중에는 이미지를 바꿀 수 없습니다.');
}
async function copySubmissionImages(request,env,token,fetcher){
 await staff(env,token,fetcher);
 let items;try{({items}=await request.json());}catch{fail(400,'복사 요청을 확인해주세요.');}
 if(!Array.isArray(items)||!items.length||items.length>24)fail(400,'복사할 이미지는 1~24개여야 합니다.');
 const pairs=items.map(item=>{
  const from=parsePath('/media/'+item?.from),to=parsePath('/media/'+item?.to);
  if(from?.collection!=='virtualSubmissions'||to?.collection!=='virtualGalleries'||from.artId!==to.artId||from.key.split('/').at(-1)!==to.key.split('/').at(-1))fail(400,'승인 이미지 경로를 확인해주세요.');
  return {from,to};
 });
 for(const {from,to} of pairs){const object=await env.MEDIA.get(from.key);if(!object)fail(404,'복사할 이미지를 찾을 수 없습니다.');await env.MEDIA.put(to.key,object.body,{httpMetadata:{contentType:to.type}});}
 return pairs.length;
}
export function parsePath(path){
 const virtual=/^\/media\/((virtualGalleries|virtualSubmissions)\/([a-zA-Z0-9_-]{1,100})\/([a-zA-Z0-9_-]{1,100})\/[a-f0-9-]{36}\.(jpeg|png|webp))$/.exec(path);
 if(virtual)return {key:virtual[1],collection:virtual[2],id:virtual[3],artId:virtual[4],type:`image/${virtual[5]}`};
 const match=/^\/media\/((exhibitions|homeHighlights|products)\/([a-zA-Z0-9_-]{1,128})\/[a-f0-9-]{36}\.(jpeg|png|webp))$/.exec(path);return match?{key:match[1],collection:match[2],id:match[3],type:`image/${match[4]}`}:null;
}
export async function handle(request,env,fetcher=fetch){
 const origin=request.headers.get('Origin'),allowed=(env.ALLOWED_ORIGINS||'').split(',');
 const headers=new Headers({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'});
 if(origin&&allowed.includes(origin)){headers.set('Access-Control-Allow-Origin',origin);headers.set('Access-Control-Allow-Headers','Authorization, Content-Type');headers.set('Access-Control-Allow-Methods','GET, PUT, POST, DELETE, OPTIONS');}
 const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:new Headers([...headers,['Content-Type','application/json']])});
 try{
  if(origin&&!allowed.includes(origin))fail(403,'허용되지 않은 사이트입니다.');
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  const url=new URL(request.url);
  if(url.pathname==='/health'&&request.method==='GET')return json({ok:true,storage:'r2'});
  const token=request.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
  if(url.pathname.startsWith('/imweb/')){
   if(request.method!=='GET')fail(405,'상품 가져오기는 읽기만 가능합니다.');
   await staff(env,token,fetcher);
   if(url.pathname==='/imweb/products'){const page=Number(url.searchParams.get('page')||1);if(!Number.isInteger(page)||page<1||page>100)fail(400,'페이지 번호를 확인해주세요.');return json(await catalog(page,fetcher));}
   const match=/^\/imweb\/products\/([1-9][0-9]{0,9})$/.exec(url.pathname);if(match)return json(await product(match[1],fetcher));
   if(url.pathname==='/imweb/image'){const photo=await sourcePhoto(url.searchParams.get('url'),fetcher);headers.set('Content-Type',photo.type);return new Response(photo.bytes,{headers});}
   fail(404,'상품 가져오기 주소를 확인해주세요.');
  }
  if(url.pathname==='/copy'){if(request.method!=='POST')fail(405,'지원하지 않는 요청입니다.');return json({copied:await copySubmissionImages(request,env,token,fetcher)});}
  const path=parsePath(url.pathname);if(!path)fail(404,'이미지를 찾을 수 없습니다.');
  if(path.collection==='virtualSubmissions'){
   if(!['GET','PUT','DELETE'].includes(request.method))fail(405,'지원하지 않는 요청입니다.');
   await submissionAccess(env,token,fetcher,path,request.method!=='GET');
   if(request.method==='GET'){const object=await env.MEDIA.get(path.key);if(!object)fail(404,'이미지를 찾을 수 없습니다.');headers.set('Content-Type',path.type);headers.set('ETag',object.httpEtag);return new Response(object.body,{headers});}
   if(request.method==='DELETE'){await env.MEDIA.delete(path.key);return json({ok:true});}
   const listed=await env.MEDIA.list({prefix:`virtualSubmissions/${path.id}/`,limit:SUBMISSION_OBJECTS+1});
   if(listed.objects.length>=SUBMISSION_OBJECTS)fail(409,`한 업로드에는 이미지를 ${SUBMISSION_OBJECTS}개까지 저장할 수 있습니다. 사용하지 않는 작품을 삭제해주세요.`);
   return json(await storeImage(request,env,path));
  }
  if(request.method==='GET'){
   // Anonymous Firestore reads enforce published=true. Never cache this authorization decision.
   let published;
   if(path.collection==='products'){if(!token)fail(404,'이미지를 찾을 수 없습니다.');await staff(env,token,fetcher);published=true;}
   else
   if(path.collection==='virtualGalleries'){
    // Anonymous document reads also require a published parent exhibition in rules.
    const [gallery,artwork]=await Promise.all([document(env,`virtualGalleries/${path.id}`,null,fetcher),document(env,`virtualGalleries/${path.id}/artworks/${path.artId}`,null,fetcher)]);
    published=gallery?.published?.booleanValue===true&&artwork?.image?.mapValue?.fields?.path?.stringValue===path.key;
   }else{
    const record=await document(env,`${path.collection}/${path.id}`,null,fetcher);
    const references=[record?.cover?.mapValue?.fields?.path?.stringValue,...(record?.gallery?.arrayValue?.values||[]).map(value=>typeof value.stringValue==='string'?value.stringValue.split('\u001f')[0]:value.mapValue?.fields?.path?.stringValue)];
    published=record?.published?.booleanValue===true&&references.includes(path.key);
   }
   if(!published){
    if(!token)fail(404,'이미지를 찾을 수 없습니다.');
    const access=await isStaff(env,token,fetcher);
    // An approved artist may view their own unpublished gallery while preparing a revision.
    const bound=!access.staff&&path.collection==='virtualGalleries'&&(await document(env,`virtualGalleries/${path.id}`,token,fetcher))?.artistEmail?.stringValue===access.user.email;
    if(!access.staff&&!bound)fail(403,'관리자 권한이 없습니다.');
   }
   const object=await env.MEDIA.get(path.key);if(!object)fail(404,'이미지를 찾을 수 없습니다.');
   headers.set('Content-Type',path.type);headers.set('ETag',object.httpEtag);return new Response(object.body,{headers});
  }
  if(!['PUT','DELETE'].includes(request.method))fail(405,'지원하지 않는 요청입니다.');
  await staff(env,token,fetcher);
  if(request.method==='DELETE'){await env.MEDIA.delete(path.key);return json({ok:true});}
  return json(await storeImage(request,env,path));
 }catch(error){const status=error.status||500;if(status===500)console.error(JSON.stringify({event:'media_error',status}));return json({error:status===500?'이미지 처리에 실패했습니다.':error.message},status);}
}
async function storeImage(request,env,path){
  if(request.headers.get('Content-Type')!==path.type)fail(415,'JPG, PNG, WebP 이미지만 업로드할 수 있습니다.');
  const length=Number(request.headers.get('Content-Length'));if(!Number.isInteger(length)||length<=0||length>MAX)fail(413,'이미지는 10MB 이하로 올려주세요.');
  // Buffer only a strictly bounded image and verify its magic bytes, preventing disguised active content.
  const reader=request.body.getReader(),chunks=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX){await reader.cancel();fail(413,'이미지는 10MB 이하로 올려주세요.');}chunks.push(value);}
  const data=new Uint8Array(size);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length;}
  const valid=path.type==='image/jpeg'?data[0]===255&&data[1]===216&&data[2]===255:path.type==='image/png'?[137,80,78,71,13,10,26,10].every((n,i)=>data[i]===n):new TextDecoder().decode(data.slice(0,4))==='RIFF'&&new TextDecoder().decode(data.slice(8,12))==='WEBP';
  if(!valid||size!==length)fail(415,'이미지 파일을 확인해주세요.');
  await env.MEDIA.put(path.key,data,{httpMetadata:{contentType:path.type}});return {path:path.key};
}
export default {fetch(request,env){return handle(request,env);}};
