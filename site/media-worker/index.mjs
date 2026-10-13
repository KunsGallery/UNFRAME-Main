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
async function staff(env,token,fetcher){
 const user=await verifyToken(token,env.FIREBASE_PROJECT_ID,fetcher);
 const record=await document(env,`staffEmails/${encodeURIComponent(user.email)}`,token,fetcher);
 if(record?.active?.booleanValue!==true||record?.email?.stringValue!==user.email)fail(403,'관리자 권한이 없습니다.');
}
export function parsePath(path){const match=/^\/media\/((exhibitions|homeHighlights)\/([a-zA-Z0-9_-]{1,128})\/[a-f0-9-]{36}\.(jpeg|png|webp))$/.exec(path);return match?{key:match[1],collection:match[2],id:match[3],type:`image/${match[4]}`}:null;}
export async function handle(request,env,fetcher=fetch){
 const origin=request.headers.get('Origin'),allowed=(env.ALLOWED_ORIGINS||'').split(',');
 const headers=new Headers({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'});
 if(origin&&allowed.includes(origin)){headers.set('Access-Control-Allow-Origin',origin);headers.set('Access-Control-Allow-Headers','Authorization, Content-Type');headers.set('Access-Control-Allow-Methods','GET, PUT, DELETE, OPTIONS');}
 const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:new Headers([...headers,['Content-Type','application/json']])});
 try{
  if(origin&&!allowed.includes(origin))fail(403,'허용되지 않은 사이트입니다.');
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  const url=new URL(request.url);
  if(url.pathname==='/health'&&request.method==='GET')return json({ok:true,storage:'r2'});
  const path=parsePath(url.pathname);if(!path)fail(404,'이미지를 찾을 수 없습니다.');
  const token=request.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
  if(request.method==='GET'){
   // Anonymous Firestore reads enforce published=true. Never cache this authorization decision.
   const record=await document(env,`${path.collection}/${path.id}`,null,fetcher);
   const maps=[record?.cover?.mapValue?.fields,...(record?.gallery?.arrayValue?.values||[]).map(v=>v.mapValue?.fields)];
   const published=record?.published?.booleanValue===true&&maps.some(v=>v?.path?.stringValue===path.key);
   if(!published){if(!token)fail(404,'이미지를 찾을 수 없습니다.');await staff(env,token,fetcher);}
   const object=await env.MEDIA.get(path.key);if(!object)fail(404,'이미지를 찾을 수 없습니다.');
   headers.set('Content-Type',path.type);headers.set('ETag',object.httpEtag);return new Response(object.body,{headers});
  }
  if(!['PUT','DELETE'].includes(request.method))fail(405,'지원하지 않는 요청입니다.');
  await staff(env,token,fetcher);
  if(request.method==='DELETE'){await env.MEDIA.delete(path.key);return json({ok:true});}
  if(request.headers.get('Content-Type')!==path.type)fail(415,'JPG, PNG, WebP 이미지만 업로드할 수 있습니다.');
  const length=Number(request.headers.get('Content-Length'));if(!Number.isInteger(length)||length<=0||length>MAX)fail(413,'이미지는 10MB 이하로 올려주세요.');
  // Buffer only a strictly bounded image and verify its magic bytes, preventing disguised active content.
  const reader=request.body.getReader(),chunks=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX){await reader.cancel();fail(413,'이미지는 10MB 이하로 올려주세요.');}chunks.push(value);}
  const data=new Uint8Array(size);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length;}
  const valid=path.type==='image/jpeg'?data[0]===255&&data[1]===216&&data[2]===255:path.type==='image/png'?[137,80,78,71,13,10,26,10].every((n,i)=>data[i]===n):new TextDecoder().decode(data.slice(0,4))==='RIFF'&&new TextDecoder().decode(data.slice(8,12))==='WEBP';
  if(!valid||size!==length)fail(415,'이미지 파일을 확인해주세요.');
  await env.MEDIA.put(path.key,data,{httpMetadata:{contentType:path.type}});return json({path:path.key});
 }catch(error){const status=error.status||500;if(status===500)console.error(JSON.stringify({event:'media_error',status}));return json({error:status===500?'이미지 처리에 실패했습니다.':error.message},status);}
}
export default {fetch(request,env){return handle(request,env);}};
