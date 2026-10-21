import {escapeHTML as e,dateRange} from './model.js';
// Entry information: the exhibition's shared details from the admin record, then the
// artist's own name and intro for artist rooms.
export function introHTML({exhibition,settings}){
 const meta=[exhibition.startDate&&exhibition.endDate?dateRange(exhibition):'',exhibition.location].filter(Boolean).join(' · ');
 const artist=settings.artistName?`<div class="start-artist"><span>작가 소개</span><strong>${e(settings.artistName)}</strong>${settings.artistNote?`<p>${e(settings.artistNote)}</p>`:''}</div>`:'';
 return `<div class="start-exhibition"><span>전시 정보</span><strong>${e(exhibition.title||'')}</strong>${meta?`<em>${e(meta)}</em>`:''}${exhibition.summary?`<p>${e(exhibition.summary)}</p>`:''}</div>${artist}`;
}
