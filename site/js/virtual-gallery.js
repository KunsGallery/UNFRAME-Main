import {openShareCard} from './share-card.js';
import {demo,listExhibitions,getExhibition,resolveImage,session,isStaff} from './store.js';
import {getVirtualGallery,listVirtualGalleries} from './virtual-store.js';
import {submissionPreview} from './submission-store.js';
import {artFromHash,hashFor} from './virtual-links.js';
import {introHTML} from './virtual-intro.js';
import {previewOverrides,lookFromMessage} from './virtual-embed.js';
import {galleryExhibitionId} from './virtual-model.js';
import {escapeHTML as e,imageURL,dateRange,sortExhibitions} from './model.js';
import {lang,t,localized,localHref} from './i18n.js';
import {localizedExhibition} from './exhibition-view.js';
import {mountLanguageSwitch} from './language-switch.js';
// English pages show the optional …En copies of gallery and artwork text.
const localizedSettings=settings=>({...settings,title:localized(settings,'title'),subtitle:localized(settings,'subtitle'),artistNote:localized(settings,'artistNote')});
import {localizedWork,dimensionText,workShareCard,worksListHTML} from './virtual-gallery-view.js';
const $=selector=>document.querySelector(selector);
let room;
function info(art,settings){
 document.dispatchEvent(new CustomEvent('unframe-artwork-open',{detail:{id:art.id}}));
 $('#modal-img').src=imageURL(art.image.url);$('#modal-img').alt=art.image.alt||art.title;
 for(const [id,value] of Object.entries({'modal-title-en':art.titleEn||art.title,'modal-title-ko':art.titleEn?art.title:'','modal-artist':art.artist,'modal-spec-title':art.title,'modal-spec-year':art.year,'modal-spec-medium':art.medium,'modal-spec-dimensions':dimensionText(art),'modal-spec-price':art.price,'modal-desc':art.description}))$('#'+id).textContent=value;
 $('#modal-spec-dimensions').previousElementSibling.textContent=art.kind==='object'?t('art.size'):t('art.sizeFlat');
 $('#modal-spec-price').closest('.art-spec-row').hidden=!settings.showPrices||!art.price;
 $('#tour-next').hidden=true;$('#tour-stop').hidden=true;
 $('#modal-spec-year').closest('.art-spec-row').hidden=!art.year;$('#modal-spec-medium').closest('.art-spec-row').hidden=!art.medium;$('#art-modal').classList.add('active');$('#art-modal').showModal();
}
async function index(){
 document.body.className='virtual-index-body';document.body.innerHTML=`<main class="virtual-index"><div class="virtual-index-top"><a href="${localHref('/')}">UNFRAME</a><div data-lang-switch></div></div><h1>Virtual Galleries.</h1><p>${t('vg.indexIntro')}</p><div class="virtual-index-list" id="gallery-index">${t('vg.loading')}</div><p><a href="${localHref('/exhibition')}">${t('list.showAll')}</a></p></main>`;mountLanguageSwitch();
 const exhibits=sortExhibitions(await listExhibitions()).map(localizedExhibition);
 const results=await Promise.allSettled(exhibits.map(async exhibition=>({exhibition,galleries:await listVirtualGalleries(exhibition.id)})));
 const publicItems=results.filter(result=>result.status==='fulfilled').flatMap(result=>result.value.galleries.map(gallery=>({exhibition:result.value.exhibition,gallery})));
 const failed=results.some(result=>result.status==='rejected');
 $('#gallery-index').innerHTML=publicItems.length?publicItems.map(({exhibition,gallery})=>`<a href="${localHref(`/virtual-gallery/${encodeURIComponent(gallery.id)}`)}" data-exhibition="${e(exhibition.id)}"><h2>${e(gallery.settings.artistName||localized(gallery.settings,'title'))}</h2><p>${gallery.settings.artistName?t('vg.artistGallery'):t('ex.wholeGallery')} · ${e(exhibition.title)}</p><p>${e(dateRange(exhibition))}</p><p>${e(localized(gallery.settings,'subtitle'))}</p></a>`).join(''):failed?`<p>${t('ex.galleriesFailed')}</p>`:`<p>${t('vg.none')}</p>`;
 if(failed&&publicItems.length)$('#gallery-index').insertAdjacentHTML('beforeend',`<p>${t('vg.someFailed')}</p>`);
 await Promise.allSettled(exhibits.filter(exhibition=>publicItems.some(item=>item.exhibition.id===exhibition.id)).map(async exhibition=>{const image=await resolveImage(exhibition.cover);if(!image?.url)return;document.querySelectorAll(`[data-exhibition="${exhibition.id}"]`).forEach(link=>{const img=document.createElement('img');img.src=image.url;img.alt=exhibition.cover?.alt||exhibition.title;img.loading='lazy';link.prepend(img);});}));
}
// Artwork textures report through Three's default manager; entry waits for them, but never
// longer than ten seconds, and failed images still count as finished.
function watchLoading(){
 const manager=window.THREE?.DefaultLoadingManager,progress=$('#start-progress'),button=$('#enter-gallery-btn');
 let ready=false;const finish=()=>{if(ready)return;ready=true;progress.textContent='';button.disabled=false;};
 if(!manager)return finish();
 manager.onProgress=(url,loaded,total)=>{if(!ready)progress.textContent=t('vg.progress',{loaded:Math.min(loaded,total),total});};
 manager.onLoad=finish;setTimeout(finish,10000);
}
// #art-{id} opens in front of that work; the detail dialog joins history so Back closes it.
function bindArtworkLinks(artworks){
 const ids=artworks.map(art=>art.id),dialog=$('#art-modal');let fromHistory=false;
 $('#enter-gallery-btn').addEventListener('click',()=>{const target=artFromHash(location.hash,ids);if(target)room.inspect(target);});
 document.addEventListener('unframe-artwork-open',event=>{const hash=hashFor(event.detail.id);if(location.hash!==hash)history.pushState({virtualArt:event.detail.id},'',hash);});
 // The room announces closes synchronously; dialog 'close' events can be deferred in background tabs.
 document.addEventListener('unframe-artwork-close',()=>{if(fromHistory){fromHistory=false;return;}if(history.state?.virtualArt)history.back();});
 addEventListener('popstate',()=>{if(dialog.open){fromHistory=true;room.close();}});
}
// Tap or click toggles a 2x view of the detail image; moving the pointer pans it.
function bindImageZoom(){
 const image=$('#modal-img'),wrap=image.parentElement;let zoomed=false;
 const pan=event=>{if(!zoomed)return;const box=wrap.getBoundingClientRect();image.style.transformOrigin=`${((event.clientX-box.left)/box.width*100).toFixed(1)}% ${((event.clientY-box.top)/box.height*100).toFixed(1)}%`;};
 const set=value=>{zoomed=value;image.classList.toggle('is-zoomed',value);image.setAttribute('aria-label',value?t('vg.zoomOut'):t('vg.zoomIn'));};
 image.tabIndex=0;image.setAttribute('role','button');set(false);
 image.addEventListener('click',event=>{set(!zoomed);pan(event);});
 image.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();set(!zoomed);}});
 wrap.addEventListener('pointermove',pan);
 document.addEventListener('unframe-artwork-open',()=>set(false));
}
async function show(id){
 bindImageZoom();
 // Artist uploads preview under /virtual-gallery/submission/{id}; Firestore rules limit it to the owner and staff.
 const submissionId=id.startsWith('submission/')?id.slice(11):'';
 const preview=!!submissionId||new URLSearchParams(location.search).get('preview')==='1';
 const authorized=!submissionId&&preview&&await isStaff(await session());
 if(preview&&!submissionId&&!authorized&&!demo)throw new Error(t('vg.staffOnly'));
 const data=submissionId?await submissionPreview(submissionId):await getVirtualGallery(id,{admin:authorized||preview&&demo});
 if(submissionId&&!data)throw new Error(t('vg.submissionUnavailable'));
 // The artist studio frames this page with unsaved space settings and streams look changes.
 const embedded=submissionId?previewOverrides(location.search):{embed:false,settings:{}};
 if(embedded.embed){Object.assign(data.settings,embedded.settings);document.body.classList.add('embed-preview');}
 const parentId=data?galleryExhibitionId(id,data.settings):id;
 const exhibition=submissionId?{id:parentId,title:data.settings.exhibitionTitle,published:false}:data?await getExhibition(parentId):null;
 if(!exhibition||!data||(!submissionId&&!authorized&&!demo&&(!exhibition.published||!data.settings.published)))throw new Error(t('vg.notFound'));
 const settings=localizedSettings(data.settings),shownExhibition=localizedExhibition(exhibition);
 $('#preview-mode').hidden=!(preview||demo);$('#preview-mode').textContent=submissionId?t('vg.submissionPreview'):demo?t('vg.demo'):t('vg.staffPreview');
 $('#gallery-title').textContent=settings.title;$('#gallery-subtitle').textContent=settings.subtitle;$('#start-title').textContent=settings.title;$('#start-subtitle').textContent=settings.subtitle||t('vg.defaultSubtitle',{title:shownExhibition.title});
 document.title=`${settings.title} — UNFRAME Virtual Gallery`;
 $('#start-info').innerHTML=introHTML({exhibition:shownExhibition,settings});
 $('#gallery-subtitle').textContent=[settings.artistName?settings.artistName+' · '+shownExhibition.title:'',settings.subtitle].filter(Boolean).join(' / ');
 if(submissionId)document.querySelectorAll('[data-return]').forEach(link=>{link.href=`/artist-studio/${encodeURIComponent(submissionId)}`;link.textContent=t('vg.backToStudio');});
 else{const chooser=document.createElement('a');chooser.href=localHref(`/exhibition/${encodeURIComponent(parentId)}`)+'#ex-online';chooser.className='glass-btn virtual-gallery-choice';chooser.textContent=t('vg.chooseGallery');$('.top-actions').append(chooser);
 document.querySelectorAll('[data-return]').forEach(link=>link.href=localHref(`/exhibition/${encodeURIComponent(parentId)}`));}
 const artworks=await Promise.all(data.artworks.map(async art=>({...localizedWork(art),image:await resolveImage(art.image),...(art.model?.path?{model:{...art.model,load:()=>resolveImage(art.model).then(model=>model.url)}}:{})})));
 if(!preview&&exhibition.published&&settings.published){const share=document.createElement('button');share.className='action-btn-primary';share.textContent=t('room.shareCard');share.type='button';$('.modal-btn-row').append(share);let selected;document.addEventListener('unframe-artwork-open',event=>{selected=artworks.find(art=>art.id===event.detail.id);share.hidden=!selected;});share.onclick=()=>{if(selected)openShareCard(workShareCard(selected,shownExhibition.title,id));};}
 $('#works-list').innerHTML=artworks.length?worksListHTML(artworks):`<p>${t('vg.noWorks')}</p>`;
 $('#btn-list').onclick=()=>$('#works-dialog').showModal();$('#works-close').onclick=()=>$('#works-dialog').close();
 document.querySelectorAll('[data-art]').forEach(button=>button.onclick=()=>{$('#works-dialog').close();const art=artworks.find(item=>item.id===button.dataset.art);if(room)room.inspect(art.id);else info(art,settings);});
 try{
  watchLoading();
  const {mountRoom}=await import('./virtual-room.js');room=mountRoom(settings,artworks);
  bindArtworkLinks(artworks);
  if(embedded.embed){$('#start-overlay').classList.add('hidden');addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==parent)return;const look=lookFromMessage(event.data);if(look)room.applyLook(look);});}
 }catch(error){
  $('#start-subtitle').textContent=t('vg.no3d');
  $('#enter-gallery-btn').textContent=t('vg.viewList');$('#enter-gallery-btn').disabled=false;
  $('#enter-gallery-btn').onclick=()=>{$('#start-overlay').classList.add('hidden');$('#works-dialog').showModal();};
  const close=()=>{$('#art-modal').classList.remove('active');$('#art-modal').close();};
  $('#modal-close-btn').onclick=close;$('#modal-back-btn').onclick=close;$('#tour-stop').onclick=close;
  $('#btn-help').onclick=()=>$('#start-overlay').classList.remove('hidden');$('#btn-tour').disabled=true;$('.nav-controls-container').hidden=true;
 }
}
mountLanguageSwitch();
const match=location.pathname.match(/^(?:\/en)?\/virtual-gallery\/((?:submission\/)?[^/]+)\/?$/);
try{if(match)await show(decodeURIComponent(match[1]));else await index();}catch(error){if($('#start-title')){document.documentElement.classList.remove('embed-preview');$('#start-title').textContent=t('vg.cannotOpen');$('#start-subtitle').textContent=error.message;$('#start-help').hidden=true;$('#enter-gallery-btn').hidden=true;$('.top-right-panel').hidden=true;$('.nav-controls-container').hidden=true;}else if($('#gallery-index'))$('#gallery-index').textContent=t('vg.indexFailed');}
