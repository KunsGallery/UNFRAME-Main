// Pure view decisions for /artist-studio. Firestore rules hide expired, deleted and
// foreign submissions identically, so those collapse into one "unavailable" state.
export function studioState({invite,user}){
 if(!invite)return user?'unavailable':'signin';
 if(!invite.ownerEmail)return 'landing';
 if(!user||invite.ownerEmail!==user.email)return 'unavailable';
 return invite.status==='submitted'?'locked':'editor';
}
export function studioError(error){
 if(error?.code==='permission-denied')return '기한이 지났거나 권한이 없습니다. 페이지를 새로고침한 뒤에도 같다면 언프레임에 문의해주세요.';
 return error instanceof Error&&error.message?error.message:'저장하지 못했습니다. 잠시 후 다시 시도해주세요.';
}
