import {escapeHTML as e,imageURL} from './model.js';
import {t,localized,localHref} from './i18n.js';
import {hashFor} from './virtual-links.js';
// English pages show the optional …En copies of artwork text. The title keeps titleEn/title
// separate because the detail dialog shows both.
export const localizedWork=art=>({...art,medium:localized(art,'medium'),description:localized(art,'description')});
export const dimensionText=art=>art.kind==='object'?t('art.objectSize',{w:art.widthCm,d:art.depthCm,h:art.heightCm}):`${art.heightCm} × ${art.widthCm} cm`;
export function workShareCard(art,exhibitionTitle,galleryId){
 const work=localizedWork(art);
 return {title:localized(art,'title'),artist:art.artist,meta:[exhibitionTitle,work.year,work.medium].filter(Boolean).join(' · '),image:art.image?.url,url:(globalThis.location?.origin||'')+localHref('/virtual-gallery/'+encodeURIComponent(galleryId))+hashFor(art.id)};
}
export const worksListHTML=artworks=>artworks.map(art=>{const title=localized(art,'title');return `<button type="button" class="virtual-work" data-art="${e(art.id)}"><img src="${e(imageURL(art.image.url))}" alt="${e(art.image.alt||title)}" loading="lazy"><strong>${e(title)}</strong><span>${e(art.artist)}</span></button>`;}).join('');
