import {imageURL} from './model.js';
// Use only for already-published homepage records. The media Worker still checks
// publication and the exact image reference for every anonymous request.
export function publicHomeCover(image,mediaBaseUrl){
 const path=image?.path||'';
 const valid=/^(exhibitions|homeHighlights)\/[A-Za-z0-9_-]{1,128}\/[a-f0-9-]{36}\.(jpeg|png|webp)$/.test(path);
 const base=imageURL(mediaBaseUrl||'').replace(/\/$/,'');
 return {...image,url:valid&&/^https?:\/\//.test(base)?`${base}/media/${path}`:imageURL(image?.url||'')};
}
