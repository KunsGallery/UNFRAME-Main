const root='https://firestore.googleapis.com/v1/projects/unframe-main/databases/(default)/documents';
const text=(fields,key)=>fields?.[key]?.stringValue||'';
const imagePath=(fields,key)=>fields?.[key]?.mapValue?.fields?.path?.stringValue||'';
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const media='https://unframe-media.gallerykuns.workers.dev/media/';
const safePath=path=>/^(?:virtualGalleries\/[A-Za-z0-9_-]{1,100}\/[A-Za-z0-9_-]{1,100}\/[a-f0-9-]{36}\.(?:jpeg|png|webp)|exhibitions\/[A-Za-z0-9_-]{1,128}\/[a-f0-9-]{36}\.(?:jpeg|png|webp))$/.test(path);
async function doc(path,fetcher){const response=await fetcher(`${root}/${path}`);if(!response.ok)return null;return (await response.json()).fields;}
export async function previewData(path,fetcher=fetch,mediaOrigin='https://unframe-media.gallerykuns.workers.dev'){
 const match=/^\/(en\/)?(virtual-gallery|exhibition)\/([A-Za-z0-9_-]{1,100})\/?$/.exec(path);if(!match)return null;
 const [,english,type,id]=match;const fields=await doc(`${type==='exhibition'?'exhibitions':'virtualGalleries'}/${id}`,fetcher);
 if(!fields||fields.published?.booleanValue!==true)return null;
 const pick=key=>(english&&text(fields,key+'En'))||text(fields,key);
 let image=type==='exhibition'?imagePath(fields,'cover'):imagePath(fields,'previewImage');
 if(type==='virtual-gallery'&&!image){
  const response=await fetcher(`${root}/virtualGalleries/${id}:runQuery`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({structuredQuery:{from:[{collectionId:'artworks'}],orderBy:[{field:{fieldPath:'order'},direction:'ASCENDING'}],limit:1}})});
  if(response.ok){const results=await response.json();image=imagePath(results[0]?.document?.fields,'image');}
 }
 const base=/^https:\/\/[^/]+$/.test(mediaOrigin)?mediaOrigin+'/media/':media;
 return {title:pick('title'),description:pick(type==='exhibition'?'summary':'subtitle'),image:safePath(image)?base+image:''};
}
export default async function(request,context){
 const response=await context.next();if(!response.ok||!response.headers.get('content-type')?.includes('text/html'))return response;
 try{
  const mode=Deno.env.get('UNFRAME_DATA_MODE')||'demo';if(mode!=='firebase')return response;
  const url=new URL(request.url),data=await previewData(url.pathname,fetch,Deno.env.get('UNFRAME_MEDIA_BASE_URL')||undefined);if(!data)return response;
  const tags=[['property','og:title',data.title],['property','og:description',data.description],['property','og:image',data.image],['property','og:url',url.origin+url.pathname],['name','twitter:card','summary_large_image']].filter(([, ,value])=>value).map(([attr,name,value])=>`<meta ${attr}="${name}" content="${escape(value)}">`).join('');
  const html=(await response.text()).replace('</head>',tags+'</head>');const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('etag');headers.set('Cache-Control','public, max-age=60');return new Response(html,{status:response.status,statusText:response.statusText,headers});
 }catch{return response;}
}
export const config={path:['/virtual-gallery/*','/en/virtual-gallery/*','/exhibition/*','/en/exhibition/*']};
