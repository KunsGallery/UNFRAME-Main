// Artist uploads live in virtualSubmissions until staff approve them. Pure helpers only.
export const EXPIRY_DAYS=10;
const DAY=86400000;
export const STATUS={invited:'초대됨',draft:'작성 중',submitted:'심사 요청',rejected:'반려됨'};
export const OWNERSHIP_NOTICE='처음 로그인한 Google 계정에 권한이 연결됩니다. 앞으로 사용할 본인 계정으로 로그인하고, 링크는 다른 사람과 공유하지 마세요.';
const ALPHABET='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
export function newSubmissionId(){
 // Rejection sampling keeps every character uniform (62 does not divide 256).
 let id='';while(id.length<22){for(const byte of crypto.getRandomValues(new Uint8Array(32))){if(byte<248&&id.length<22)id+=ALPHABET[byte%62];}}
 return id;
}
export const expiryFrom=touched=>new Date(new Date(touched).getTime()+EXPIRY_DAYS*DAY);
export const daysLeft=(expiresAt,now=new Date())=>Math.max(0,Math.ceil((new Date(expiresAt)-now)/DAY));
export const isExpired=(expiresAt,now=new Date())=>new Date(expiresAt)<=now;
export const artistCanEdit=status=>status==='draft'||status==='rejected';
export function canTransition(from,to,role){
 if((from==='draft'||from==='rejected')&&to==='submitted')return true;
 if(from==='submitted'&&to==='draft')return true;
 return role==='staff'&&from==='submitted'&&to==='rejected';
}
export const inviteURL=(id,origin=location.origin)=>`${origin}/artist-studio/${encodeURIComponent(id)}`;
const dateText=value=>new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
export function inviteMessage({artistName,exhibitionTitle,url,expiresAt}){
 return [`${artistName} 작가님, 안녕하세요. 언프레임입니다.`,`「${exhibitionTitle}」 버추얼 갤러리에 작품을 올려주실 수 있도록 업로드 링크를 보내드립니다.`,'',url,'',`· ${OWNERSHIP_NOTICE}`,'· 작품 이미지와 정보를 올린 뒤 심사 요청을 눌러주세요. 언프레임이 확인 후 공개합니다.',`· 마지막 수정 후 ${EXPIRY_DAYS}일 안에 승인되지 않으면 업로드 내용이 자동으로 삭제됩니다. (현재 기한: ${dateText(expiresAt)})`].join('\n');
}
export function validateInvite({artistName,invitedEmail}){
 const name=String(artistName||'').trim(),email=String(invitedEmail||'').trim().toLowerCase();
 if(!name||name.length>300)throw new Error('작가명을 300자 이내로 입력해주세요.');
 if(email&&(email.length>320||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))throw new Error('이메일 형식을 확인해주세요.');
 return {artistName:name,invitedEmail:email};
}
const comparable=({updatedAt,image,...rest})=>JSON.stringify({...rest,image:image&&{path:image.path,alt:image.alt}});
export function diffArtworks(before,after){
 const old=new Map(before.map(art=>[art.id,art])),next=new Set(after.map(art=>art.id));
 return {added:after.filter(art=>!old.has(art.id)).map(art=>art.id),changed:after.filter(art=>old.has(art.id)&&comparable(old.get(art.id))!==comparable(art)).map(art=>art.id),removed:before.filter(art=>!next.has(art.id)).map(art=>art.id)};
}
export const submissionImagePath=(id,artId,ext)=>`virtualSubmissions/${id}/${artId}/${crypto.randomUUID()}.${ext}`;
export const isSubmissionPath=(path,id)=>typeof path==='string'&&path.startsWith(`virtualSubmissions/${id}/`);
