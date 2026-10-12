export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function safeURL(value) { try { const url = new URL(value, 'https://exhibition.unframe.kr'); return ['https:','http:'].includes(url.protocol) ? value : ''; } catch { return ''; } }
export function imageURL(value) { return /^(data:image\/(png|jpeg|webp);base64,|blob:https?:\/\/)/.test(value || '') ? value : safeURL(value); }
export function todaySeoul(now = new Date()) { return new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit' }).format(now); }
export function exhibitionState(item, today = todaySeoul()) { if(item.startDate > today) return 'upcoming'; if(item.endDate < today) return 'past'; return 'current'; }
export const stateLabels = {current:'현재 전시',upcoming:'예정 전시',past:'지난 전시'};
export const stateEnglish = {current:'NOW SHOWING',upcoming:'UPCOMING',past:'ARCHIVE'};
export const dateRange = item => `${item.startDate?.replaceAll('-','.')} — ${item.endDate?.replaceAll('-','.')}`;
export const sortExhibitions = items => [...items].sort((a,b) => (a.order ?? 0) - (b.order ?? 0) || b.startDate.localeCompare(a.startDate));
export function validateExhibition(item) {
  if(!item.title?.trim()) throw new Error('전시 제목을 입력해주세요.');
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug || '')) throw new Error('주소는 영문 소문자·숫자·하이픈으로 입력해주세요.');
  const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
  if(!validDate(item.startDate) || !validDate(item.endDate)) throw new Error('시작일과 종료일을 정확하게 입력해주세요.');
  if(item.startDate > item.endDate) throw new Error('종료일은 시작일 이후여야 합니다.');
  if(!item.location?.trim()) throw new Error('전시 장소를 입력해주세요.');
  if(!Number.isInteger(item.order) || item.order < 0) throw new Error('노출 순서는 0 이상의 정수로 입력해주세요.');
  if(item.published && (!(item.cover?.url || item.cover?.path) || !item.description?.trim())) throw new Error('게시하려면 대표 이미지와 전시 소개를 입력해주세요.');
  if(item.title.length > 200 || item.description.length > 30000 || item.summary.length > 600) throw new Error('입력 내용이 너무 깁니다.');
  return item;
}
export function filterExhibitions(items,{state='all',year='all',query=''}={}) { const term=query.trim().toLocaleLowerCase(); return sortExhibitions(items).filter(x => (state==='all'||exhibitionState(x)===state) && (year==='all'||x.startDate.slice(0,4)===year) && (!term||[x.title,x.artists,x.location,x.summary].join(' ').toLocaleLowerCase().includes(term))); }
