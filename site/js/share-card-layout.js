import {t} from './i18n.js';
import {fitImage} from './share-card-geometry.js';
// Geometry for the three artwork share cards. Each returns the frame around the work (art),
// where the image is drawn (image; poster crops to fill its frame) and the main text block.
export const DESIGNS={get label(){return t('card.design.label');},get wall(){return t('card.design.wall');},get poster(){return t('card.design.poster');}};
const rect=(x,y,w,h)=>({x,y,w,h});
function contain(box,iw,ih){const [dx,dy,dw,dh]=fitImage(iw,ih,box.w,box.h,false);return rect(box.x+dx,box.y+dy,dw,dh);}
export function cardLayout(design,w,h,iw,ih){
 const portrait=h>w;
 if(design==='label'){
  const mat=portrait?36:28,max=portrait?rect(86+mat,210+mat,w-172-2*mat,h*.55-2*mat):rect(60+mat,140+mat,w*.56-2*mat,h-220-2*mat);
  const image=contain(max,iw,ih),art=rect(image.x-mat,image.y-mat,image.w+2*mat,image.h+2*mat);
  // The caption hangs a fixed gap below the framed work, sized to its three lines of text.
  const text=portrait?rect(art.x,art.y+art.h+64,Math.max(art.w,560),236):rect(w*.62,art.y+art.h/2-110,w*.38-60,220);
  if(portrait)text.x=Math.min(text.x,w-86-text.w);
  return {portrait,art,image,text};
 }
 if(design==='wall'){
  const max=portrait?rect(w*.16,h*.15,w*.68,h*.46):rect(w*.08,h*.12,w*.5,h*.62);
  const image=contain(max,iw,ih);
  const text=portrait?rect(90,h*.76,w-180,h*.17):rect(w*.64,h*.36,w*.3,h*.44);
  return {portrait,art:image,image,text,floor:portrait?h*.68:h*.8};
 }
 const art=portrait?rect(80,640,w-160,h-940):rect(w*.46,60,w*.54-60,h-120);
 const [dx,dy,dw,dh]=fitImage(iw,ih,art.w,art.h,true);
 const text=portrait?rect(80,170,w-160,420):rect(60,150,w*.46-100,h-300);
 return {portrait,art,image:rect(art.x+dx,art.y+dy,dw,dh),text};
}
