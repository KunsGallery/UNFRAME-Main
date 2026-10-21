// Scale an image into a box: contained whole, or covering it (cropped) and centred.
export function fitImage(iw,ih,w,h,cover=false){const s=(cover?Math.max:Math.min)(w/iw,h/ih);return [(w-iw*s)/2,(h-ih*s)/2,iw*s,ih*s];}
