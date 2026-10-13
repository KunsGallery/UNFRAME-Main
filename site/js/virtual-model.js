export const THEMES={white:'화이트',black:'블랙 헤링본','herringbone-wood':'우드 헤링본',wood:'내추럴 우드'};
export const WALLS={front:'전면 벽',right:'우측 벽',left:'좌측 벽'};
export const FRAMES={canvas:'캔버스 (테두리 없음)',black:'블랙 액자',white:'화이트 액자',wood:'우드 액자',none:'프레임 없음 (종이)'};
export const defaultGallery=exhibition=>({title:exhibition.title,subtitle:exhibition.summary||'',published:false,theme:'white',wallColor:'#f6f4ee',brightness:1,speed:2.5,outdoor:true,showPrices:false});
export const galleryExhibitionId=(id,settings)=>settings.exhibitionId||id;
export const defaultArtistGallery=(exhibition,artistName,order=0)=>({...defaultGallery(exhibition),title:`${artistName} · ${exhibition.title}`.slice(0,200),subtitle:'',exhibitionId:exhibition.id,artistName,order});
export const sortVirtualGalleries=items=>[...items].sort((a,b)=>Number(!!a.settings.artistName)-Number(!!b.settings.artistName)||(a.settings.order||0)-(b.settings.order||0)||a.settings.title.localeCompare(b.settings.title));
export const emptyArtwork=()=>({id:crypto.randomUUID(),title:'',titleEn:'',artist:'',year:'',medium:'',widthCm:80,heightCm:100,price:'',description:'',wall:'front',frame:'canvas',order:0,image:{url:'',path:'',alt:''}});
const bounded=(value,max,min=0)=>typeof value==='string'&&value.length>=min&&value.length<=max;
const between=(value,min,max)=>Number.isFinite(value)&&value>=min&&value<=max;
export function validateGallery(data,artworks=[]){
 if(['exhibitionId','artistName','order'].some(key=>Object.hasOwn(data,key))){
  if(!/^[A-Za-z0-9_-]{1,100}$/.test(data.exhibitionId||'')||!bounded(data.artistName,300,1)||!data.artistName.trim()||!Number.isInteger(data.order)||!between(data.order,0,1000000))throw new Error('연결 전시, 작가명과 갤러리 노출 순서를 확인해주세요.');
 }
 if(!bounded(data.title,200,1)||!bounded(data.subtitle,1000))throw new Error('갤러리 제목은 200자, 소개는 1,000자 이내로 입력해주세요.');
 if(!Object.hasOwn(THEMES,data.theme)||!/^#[0-9a-fA-F]{6}$/.test(data.wallColor)||!between(data.brightness,.5,1.8)||!between(data.speed,1,5))throw new Error('공간 설정 값을 확인해주세요.');
 if(['published','outdoor','showPrices'].some(key=>typeof data[key]!=='boolean'))throw new Error('게시 및 공간 설정을 확인해주세요.');
 if(data.published&&!artworks.length)throw new Error('공개하려면 작품을 한 점 이상 등록해주세요.');
 if(data.published)layoutArtworks(artworks);
 return data;
}
export function validateArtwork(data){
 if(!bounded(data.title,200,1)||!bounded(data.artist,300,1))throw new Error('작품 제목과 작가명을 입력해주세요.');
 for(const [key,max] of Object.entries({titleEn:200,year:20,medium:500,price:100,description:5000}))if(!bounded(data[key],max))throw new Error('작품 정보의 글자 수를 확인해주세요.');
 if(!between(data.widthCm,10,500)||!between(data.heightCm,10,500))throw new Error('작품의 가로·세로 크기는 10~500cm로 입력해주세요.');
 if(!Object.hasOwn(WALLS,data.wall)||!Object.hasOwn(FRAMES,data.frame)||!Number.isInteger(data.order)||!between(data.order,0,1000000))throw new Error('작품 배치와 노출 순서를 확인해주세요.');
 if(!data.image?.url&&!data.image?.path)throw new Error('작품 이미지를 업로드해주세요.');
 if(!bounded(data.image?.alt,1000))throw new Error('이미지 설명은 1,000자 이내로 입력해주세요.');
 return data;
}
export function artworkMount(frame){
 const framed=['black','white','wood'].includes(frame);
 return {framed,border:framed?.12:0,depth:framed?.08:frame==='canvas'?.035:.004};
}
// Centimetres become metres without scaling. Reflow actual footprints and reject
// arrangements exceeding the usable wall area (10m wide, 3.6m high).
export function layoutArtworks(artworks){
 const arranged=[];const wallWidth=10,wallHeight=3.6,gap=.65,rowGap=.35;
 for(const wall of Object.keys(WALLS)){
  const list=artworks.filter(art=>art.wall===wall).sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));
  const rows=[];let row={items:[],width:0,height:0};
  for(const art of list){
   const mount=artworkMount(art.frame),width=art.widthCm/100,height=art.heightCm/100,outerWidth=width+mount.border,outerHeight=height+mount.border;
   if(outerWidth>wallWidth||outerHeight>wallHeight)throw new Error(`「${art.title}」의 실제 크기가 현재 공간의 벽 영역(가로 1,000cm · 세로 360cm)을 넘습니다. 작품 크기는 자동 축소하지 않습니다.`);
   if(row.items.length&&row.width+gap+outerWidth>wallWidth){rows.push(row);row={items:[],width:0,height:0};}
   row.width+=(row.items.length?gap:0)+outerWidth;row.height=Math.max(row.height,outerHeight);row.items.push({art,width,height,outerWidth});
  }
  if(row.items.length)rows.push(row);
  const totalHeight=rows.reduce((sum,item)=>sum+item.height,0)+Math.max(0,rows.length-1)*rowGap;
  if(totalHeight>wallHeight)throw new Error(`${WALLS[wall]}의 작품들이 실제 크기로는 현재 벽에 모두 들어가지 않습니다. 일부 작품을 다른 벽면으로 옮겨주세요. 자동 축소는 하지 않습니다.`);
  let top=rows.length===1?Math.min(3.9,Math.max(2+totalHeight/2,.3+totalHeight)):2.1+totalHeight/2;
  for(const packed of rows){
   let cursor=-packed.width/2;const y=top-packed.height/2;
   for(const {art,width,height,outerWidth} of packed.items){
    const t=cursor+outerWidth/2;
    arranged.push({...art,size:[width,height],position:wall==='front'?[-7.95,y,t]:[t,y,wall==='right'?-6.95:6.95],rotation:[0,wall==='front'?Math.PI/2:wall==='left'?Math.PI:0,0]});cursor+=outerWidth+gap;
   }
   top-=packed.height+rowGap;
  }
 }
 return arranged;
}
