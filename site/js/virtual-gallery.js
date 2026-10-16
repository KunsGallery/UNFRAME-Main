import {openShareCard} from './share-card.js';
import {demo,listExhibitions,getExhibition,resolveImage,session,isStaff} from './store.js';
import {getVirtualGallery,listVirtualGalleries} from './virtual-store.js';
import {galleryExhibitionId} from './virtual-model.js';
import {escapeHTML as e,imageURL,dateRange,sortExhibitions} from './model.js';
const $=selector=>document.querySelector(selector);
let room;
function info(art,settings){
 document.dispatchEvent(new CustomEvent('unframe-artwork-open',{detail:{id:art.id}}));
 $('#modal-img').src=imageURL(art.image.url);$('#modal-img').alt=art.image.alt||art.title;
 for(const [id,value] of Object.entries({'modal-title-en':art.titleEn||art.title,'modal-title-ko':art.titleEn?art.title:'','modal-artist':art.artist,'modal-spec-title':art.title,'modal-spec-year':art.year,'modal-spec-medium':art.medium,'modal-spec-dimensions':`${art.heightCm} × ${art.widthCm} cm`,'modal-spec-price':art.price,'modal-desc':art.description}))$('#'+id).textContent=value;
 $('#modal-spec-price').closest('.art-spec-row').hidden=!settings.showPrices||!art.price;
 $('#tour-next').hidden=true;$('#tour-stop').hidden=true;
 $('#modal-spec-year').closest('.art-spec-row').hidden=!art.year;$('#modal-spec-medium').closest('.art-spec-row').hidden=!art.medium;$('#art-modal').classList.add('active');$('#art-modal').showModal();
}
async function index(){
 document.body.className='virtual-index-body';document.body.innerHTML='<main class="virtual-index"><a href="/">UNFRAME</a><h1>Virtual Galleries.</h1><p>언프레임의 전시를 온라인 공간에서 만나보세요.</p><div class="virtual-index-list" id="gallery-index">갤러리를 불러오고 있습니다.</div><p><a href="/exhibition">전체 전시 보기</a></p></main>';
 const exhibits=sortExhibitions(await listExhibitions());
 const results=await Promise.allSettled(exhibits.map(async exhibition=>({exhibition,galleries:await listVirtualGalleries(exhibition.id)})));
 const publicItems=results.filter(result=>result.status==='fulfilled').flatMap(result=>result.value.galleries.map(gallery=>({exhibition:result.value.exhibition,gallery})));
 const failed=results.some(result=>result.status==='rejected');
 $('#gallery-index').innerHTML=publicItems.length?publicItems.map(({exhibition,gallery})=>`<a href="/virtual-gallery/${encodeURIComponent(gallery.id)}" data-exhibition="${e(exhibition.id)}"><h2>${e(gallery.settings.artistName||gallery.settings.title)}</h2><p>${gallery.settings.artistName?'참여 작가 갤러리':'전시 전체 갤러리'} · ${e(exhibition.title)}</p><p>${e(dateRange(exhibition))}</p><p>${e(gallery.settings.subtitle)}</p></a>`).join(''):failed?'<p>갤러리 목록을 불러오지 못했습니다. 잠시 후 다시 확인해주세요.</p>':'<p>현재 공개된 버추얼 갤러리가 없습니다. 다음 전시를 준비하고 있습니다.</p>';
 if(failed&&publicItems.length)$('#gallery-index').insertAdjacentHTML('beforeend','<p>일부 전시의 갤러리를 불러오지 못했습니다. 잠시 후 다시 확인해주세요.</p>');
 await Promise.allSettled(exhibits.filter(exhibition=>publicItems.some(item=>item.exhibition.id===exhibition.id)).map(async exhibition=>{const image=await resolveImage(exhibition.cover);if(!image?.url)return;document.querySelectorAll(`[data-exhibition="${exhibition.id}"]`).forEach(link=>{const img=document.createElement('img');img.src=image.url;img.alt=exhibition.cover?.alt||exhibition.title;img.loading='lazy';link.prepend(img);});}));
}
async function show(id){
 const preview=new URLSearchParams(location.search).get('preview')==='1';
 const authorized=preview&&await isStaff(await session());
 if(preview&&!authorized&&!demo)throw new Error('관리자 미리보기는 승인된 Google 계정으로 로그인한 뒤 이용해주세요.');
 const data=await getVirtualGallery(id,{admin:authorized||preview&&demo});
 const parentId=data?galleryExhibitionId(id,data.settings):id;
 const exhibition=data?await getExhibition(parentId):null;
 if(!exhibition||!data||(!authorized&&!demo&&(!exhibition.published||!data.settings.published)))throw new Error('공개된 버추얼 갤러리를 찾을 수 없습니다. 전시 목록에서 확인해주세요.');
 const {settings}=data;
 $('#preview-mode').hidden=!(preview||demo);$('#preview-mode').textContent=demo?'샘플 체험 · 실제 전시가 아닙니다.':'관리자 미리보기 · 저장된 설정을 확인하는 화면입니다.';
 $('#gallery-title').textContent=settings.title;$('#gallery-subtitle').textContent=settings.subtitle;$('#start-title').textContent=settings.title;$('#start-subtitle').textContent=settings.subtitle||`${exhibition.title}의 작품을 온라인 공간에서 만나보세요.`;
 document.title=`${settings.title} — UNFRAME Virtual Gallery`;
 $('#gallery-subtitle').textContent=[settings.artistName?settings.artistName+' · '+exhibition.title:'',settings.subtitle].filter(Boolean).join(' / ');
 const chooser=document.createElement('a');chooser.href=`/exhibition/${encodeURIComponent(parentId)}#ex-online`;chooser.className='glass-btn virtual-gallery-choice';chooser.textContent='갤러리 선택';$('.top-actions').append(chooser);
 document.querySelectorAll('[data-return]').forEach(link=>link.href=`/exhibition/${encodeURIComponent(parentId)}`);
 const artworks=await Promise.all(data.artworks.map(async art=>({...art,image:await resolveImage(art.image)})));
 if(!preview&&exhibition.published&&settings.published){const share=document.createElement('button');share.className='action-btn-primary';share.textContent='작품 공유 카드';share.type='button';$('.modal-btn-row').append(share);let selected;document.addEventListener('unframe-artwork-open',event=>{selected=artworks.find(art=>art.id===event.detail.id);share.hidden=!selected;});share.onclick=()=>{if(selected)openShareCard({title:selected.title,artist:selected.artist,meta:[exhibition.title,selected.year,selected.medium].filter(Boolean).join(' · '),image:selected.image?.url,url:location.origin+'/exhibition/'+encodeURIComponent(parentId)});};}
 $('#works-list').innerHTML=artworks.length?artworks.map(art=>`<button type="button" class="virtual-work" data-art="${e(art.id)}"><img src="${e(imageURL(art.image.url))}" alt="${e(art.image.alt||art.title)}" loading="lazy"><strong>${e(art.title)}</strong><span>${e(art.artist)}</span></button>`).join(''):'<p>등록된 작품이 없습니다. 관리자에서 작품을 추가해주세요.</p>';
 $('#btn-list').onclick=()=>$('#works-dialog').showModal();$('#works-close').onclick=()=>$('#works-dialog').close();
 document.querySelectorAll('[data-art]').forEach(button=>button.onclick=()=>{$('#works-dialog').close();const art=artworks.find(item=>item.id===button.dataset.art);if(room)room.inspect(art.id);else info(art,settings);});
 try{
  const {mountRoom}=await import('./virtual-room.js');room=mountRoom(settings,artworks);
  $('#enter-gallery-btn').disabled=false;
 }catch(error){
  $('#start-subtitle').textContent='이 기기에서 3D 공간을 시작하지 못했습니다. 작품 목록에서 이미지와 설명을 감상할 수 있습니다.';
  $('#enter-gallery-btn').textContent='작품 목록으로 감상하기';$('#enter-gallery-btn').disabled=false;
  $('#enter-gallery-btn').onclick=()=>{$('#start-overlay').classList.add('hidden');$('#works-dialog').showModal();};
  const close=()=>{$('#art-modal').classList.remove('active');$('#art-modal').close();};
  $('#modal-close-btn').onclick=close;$('#modal-back-btn').onclick=close;$('#tour-stop').onclick=close;
  $('#btn-help').onclick=()=>$('#start-overlay').classList.remove('hidden');$('#btn-tour').disabled=true;$('.nav-controls-container').hidden=true;
 }
}
const match=location.pathname.match(/^\/virtual-gallery\/([^/]+)\/?$/);
try{if(match)await show(decodeURIComponent(match[1]));else await index();}catch(error){if($('#start-title')){$('#start-title').textContent='갤러리를 열 수 없습니다.';$('#start-subtitle').textContent=error.message;$('#start-help').hidden=true;$('#enter-gallery-btn').hidden=true;$('.top-right-panel').hidden=true;$('.nav-controls-container').hidden=true;}else if($('#gallery-index'))$('#gallery-index').textContent='갤러리를 불러오지 못했습니다. 잠시 후 다시 방문해주세요.';}
