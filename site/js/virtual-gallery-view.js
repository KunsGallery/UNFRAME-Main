import {escapeHTML as e,imageURL} from './model.js';
import {t,localized,localHref} from './i18n.js';
import {hashFor} from './virtual-links.js';
// English pages show the optional …En copies of artwork text. The title keeps titleEn/title
// separate because the detail dialog shows both.
export const localizedWork=art=>({...art,medium:localized(art,'medium'),description:localized(art,'description')});
export const dimensionText=art=>art.kind==='object'?t('art.objectSize',{w:art.widthCm,d:art.depthCm,h:art.heightCm}):`${art.heightCm} × ${art.widthCm} cm`;
// Share cards caption only what the artist entered; the exhibition goes on the card's footer line.
export const artworkCaption=art=>{const work=localizedWork(art);return [work.year,work.medium,art.widthCm&&art.heightCm?dimensionText(art):''].filter(Boolean).join(' · ');};
// "2026.10.23 — 11.01": the end date drops a repeated year.
export const shortRange=item=>!item?.startDate?'':!item.endDate||item.endDate===item.startDate?item.startDate.replaceAll('-','.'):`${item.startDate.replaceAll('-','.')} — ${(item.endDate.slice(0,4)===item.startDate.slice(0,4)?item.endDate.slice(5):item.endDate).replaceAll('-','.')}`;
export const artworkCard=(art,exhibition,url)=>({title:localized(art,'title'),artist:art.artist,meta:artworkCaption(art),exhibition:{title:exhibition?.title||'',dates:shortRange(exhibition)},image:art.image?.url,url});
// The detail image stays hidden until the new picture has loaded, so neither an old work nor
// an empty frame flashes while it opens.
export function showModalImage(image,src){
 if(image.getAttribute('src')===src&&image.complete){image.classList.remove('is-loading');return;}
 image.classList.add('is-loading');image.onload=image.onerror=()=>image.classList.remove('is-loading');image.src=src;
}
// The whole gallery: its title, the artist (or the exhibition's artists), a work as the image.
// `works` lets the share dialog swap which work stands for the gallery.
export function galleryShareCard(settings,exhibition,artworks,galleryId){
 const works=artworks.filter(art=>art.image?.url).map(art=>({label:[localized(art,'title'),art.artist].filter(Boolean).join(' · '),image:art.image.url}));
 if(settings.previewImage?.url)works.unshift({label:t('vg.entryScene'),image:settings.previewImage.url});
 return {title:settings.title,artist:settings.artistName||exhibition?.artists||'',meta:t('vg.shareMeta'),exhibition:{title:exhibition?.title||'',dates:shortRange(exhibition)},image:works[0]?.image,works,url:(globalThis.location?.origin||'')+localHref('/virtual-gallery/'+encodeURIComponent(galleryId))};
}
export function workShareCard(art,exhibition,galleryId){
 return artworkCard(art,exhibition,(globalThis.location?.origin||'')+localHref('/virtual-gallery/'+encodeURIComponent(galleryId))+hashFor(art.id));
}
export const worksListHTML=artworks=>artworks.map(art=>{const title=localized(art,'title');return `<button type="button" class="virtual-work" data-art="${e(art.id)}"><img src="${e(imageURL(art.image.url))}" alt="${e(art.image.alt||title)}" loading="lazy"><strong>${e(title)}</strong><span>${e(art.artist)}</span></button>`;}).join('');
