export const THEMES={white:'화이트',black:'블랙 헤링본','herringbone-wood':'우드 헤링본',wood:'내추럴 우드'};
export const WALLS={front:'전면 벽',right:'우측 벽',left:'좌측 벽'};
export const FRAMES={black:'블랙',white:'화이트',wood:'우드',none:'프레임 없음'};
export const defaultGallery=exhibition=>({title:exhibition.title,subtitle:exhibition.summary||'',published:false,theme:'white',wallColor:'#f6f4ee',brightness:1,speed:2.5,outdoor:true,showPrices:false});
export const emptyArtwork=()=>({id:crypto.randomUUID(),title:'',titleEn:'',artist:'',year:'',medium:'',widthCm:80,heightCm:100,price:'',description:'',wall:'front',frame:'black',order:0,image:{url:'',path:'',alt:''}});
const bounded=(value,max,min=0)=>typeof value==='string'&&value.length>=min&&value.length<=max;
const between=(value,min,max)=>Number.isFinite(value)&&value>=min&&value<=max;
export function validateGallery(data,artworks=[]){
 if(!bounded(data.title,200,1)||!bounded(data.subtitle,1000))throw new Error('갤러리 제목은 200자, 소개는 1,000자 이내로 입력해주세요.');
 if(!Object.hasOwn(THEMES,data.theme)||!/^#[0-9a-fA-F]{6}$/.test(data.wallColor)||!between(data.brightness,.5,1.8)||!between(data.speed,1,5))throw new Error('공간 설정 값을 확인해주세요.');
 if(['published','outdoor','showPrices'].some(key=>typeof data[key]!=='boolean'))throw new Error('게시 및 공간 설정을 확인해주세요.');
 if(data.published&&!artworks.length)throw new Error('공개하려면 작품을 한 점 이상 등록해주세요.');
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
// A maximum of four works per row keeps artwork inside the supplied room.
export function layoutArtworks(artworks){
 const arranged=[];
 for(const wall of Object.keys(WALLS)){
  const list=artworks.filter(art=>art.wall===wall).sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));
  const rows=Math.ceil(list.length/4);
  list.forEach((art,index)=>{
   const row=Math.floor(index/4),rowCount=Math.min(4,list.length-row*4),cell=10/rowCount;
   const scale=Math.min(1,(cell-.65)/(art.widthCm/100),(rows>1?1.15:2.4)/(art.heightCm/100));
   const width=art.widthCm/100*scale,height=art.heightCm/100*scale,t=-5+cell*(index%4+.5),y=rows>1?(row===0?2.9:1.25):2;
   arranged.push({...art,size:[width,height],position:wall==='front'?[-7.95,y,t]:[t,y,wall==='right'?-6.95:6.95],rotation:[0,wall==='front'?Math.PI/2:wall==='left'?Math.PI:0,0]});
  });
 }
 return arranged;
}
