import {safeURL,todaySeoul} from './model.js';
export function validateHighlight(item){
 if(!['event','virtual'].includes(item.kind))throw new Error('이벤트 또는 버추얼 갤러리를 선택해주세요.');
 if(!item.title?.trim()||item.title.length>200)throw new Error('제목은 1~200자로 입력해주세요.');
 if(typeof item.summary!=='string'||item.summary.length>600||typeof item.project!=='string'||item.project.length>100)throw new Error('소개는 600자, 프로젝트명은 100자 이하로 입력해주세요.');
 if(typeof item.url!=='string'||item.url.length>2000||item.url&&(!safeURL(item.url)||!(/^(https?:\/\/|\/(?!\/))/.test(item.url))))throw new Error('연결 주소는 https:// 또는 /로 시작해야 합니다.');
 const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
 if(item.startDate||item.endDate){if(!validDate(item.startDate)||!validDate(item.endDate)||item.startDate>item.endDate)throw new Error('시작일과 종료일을 정확하게 입력해주세요.');}
 if(item.published&&item.kind==='event'&&(!item.startDate||!item.endDate))throw new Error('이벤트를 게시하려면 시작일과 종료일이 필요합니다.');
 if(!Number.isInteger(item.order)||item.order<0||item.order>1000000)throw new Error('노출 순서는 0~1,000,000 사이 정수로 입력해주세요.');
 if(typeof item.published!=='boolean'||typeof item.featured!=='boolean')throw new Error('게시와 메인 노출 설정을 확인해주세요.');
 if(item.published&&(!(item.cover?.url||item.cover?.path)||!item.url))throw new Error('게시하려면 대표 이미지와 연결 주소가 필요합니다.');
 return item;
}
export function selectedHighlights(items,today=todaySeoul()){
 return items.filter(item=>item.published===true&&item.featured===true&&['event','virtual'].includes(item.kind)&&(!item.endDate||item.endDate>=today)).sort((a,b)=>a.order-b.order||a.title.localeCompare(b.title));
}
