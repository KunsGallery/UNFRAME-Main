// Guided tour order for the virtual room: one artwork at a time, ending after the last.
export function createTour(ids){
 let index=-1;
 const at=()=>index<0||index>=ids.length?null:{id:ids[index],index:index+1,total:ids.length};
 return {
  start(){index=ids.length?0:-1;return at();},
  next(){if(index<0)return null;index++;if(index>=ids.length)index=-1;return at();},
  prev(){if(index>0)index--;return at();},
  current:at,
  stop(){index=-1;}
 };
}
