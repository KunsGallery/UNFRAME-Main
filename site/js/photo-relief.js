// Builds a depth relief from one photo: a mask (255 = artwork) and a depth map (1 = nearest),
// both w×h. The result is cropped to the artwork, 1 unit tall with its base at y=0, centred
// on x, front towards +Z and sealed by side walls and a flat back. Pure: no DOM, no Three.js.
export const inside=value=>value>127;
export function maskCoverage(mask){let count=0;for(const value of mask)if(inside(value))count++;return count/mask.length;}
export function maskBounds(mask,w,h){
 let x0=w,y0=h,x1=-1,y1=-1;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(inside(mask[y*w+x])){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
 return x1<0?null:{x0,y0,x1:x1+1,y1:y1+1};
}
// Blurs inside the mask only (so the background never bleeds in), then stretches to 0–1.
export function normalizeDepth(depth,mask,w,h,radius=2){
 let source=depth;
 if(radius>0){
  source=new Float32Array(depth.length);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const i=y*w+x;if(!inside(mask[i]))continue;let sum=0,count=0;
   for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=w||ny>=h)continue;const j=ny*w+nx;if(inside(mask[j])){sum+=depth[j];count++;}}
   source[i]=sum/count;
  }
 }
 let min=Infinity,max=-Infinity;for(let i=0;i<source.length;i++)if(inside(mask[i])){if(source[i]<min)min=source[i];if(source[i]>max)max=source[i];}
 const out=new Float32Array(depth.length),span=max-min||1;
 for(let i=0;i<source.length;i++)if(inside(mask[i]))out[i]=(source[i]-min)/span;
 return out;
}
// strength × maxDepth is the tallest relief, in units of the artwork's height.
// front holds the textured triangles (front and side walls); back the flat back, for a dark material.
export function reliefGeometry({width:w,height:h,mask,depth,strength,maxDepth,cells=200}){
 const bounds=maskBounds(mask,w,h);if(!bounds)throw new Error('empty mask');
 const {x0,y0,x1,y1}=bounds,bw=Math.max(2,x1-x0),bh=Math.max(2,y1-y0);
 const rows=bh>=bw?cells:Math.max(1,Math.round(cells*bh/bw)),cols=bh>=bw?Math.max(1,Math.round(cells*bw/bh)):cells;
 const pixel=(i,j)=>{const px=Math.round(x0+i/cols*(bw-1)),py=Math.round(y0+j/rows*(bh-1));return [px,py];};
 const vertexIn=(i,j)=>{const [px,py]=pixel(i,j);return inside(mask[py*w+px]);};
 const cellIn=(i,j)=>i>=0&&j>=0&&i<cols&&j<rows&&vertexIn(i,j)&&vertexIn(i+1,j)&&vertexIn(i,j+1)&&vertexIn(i+1,j+1);
 const unit=1/(bh-1),relief=strength*maxDepth,front=[],back=[],ids=new Map(),pos=[],uv=[];
 // Each used grid point gets a front vertex and, at the same x/y, a back vertex at z=0.
 const vertex=(i,j)=>{
  const key=j*(cols+1)+i;if(ids.has(key))return ids.get(key);
  const [px,py]=pixel(i,j),x=(px-(x0+(bw-1)/2))*unit,y=(y0+bh-1-py)*unit,u=(px-x0)/(bw-1),v=1-(py-y0)/(bh-1),id=pos.length/6;
  pos.push(x,y,depth[py*w+px]*relief,x,y,0);uv.push(u,v,u,v);ids.set(key,id);return id;
 };
 const f=id=>id*2,b=id=>id*2+1;
 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
  if(!cellIn(i,j))continue;
  // a top-left, b top-right, c bottom-right, d bottom-left; a→d→c→b runs counter-clockwise from +Z.
  const a=vertex(i,j),bb=vertex(i+1,j),c=vertex(i+1,j+1),d=vertex(i,j+1);
  front.push(f(a),f(d),f(c),f(a),f(c),f(bb));back.push(b(a),b(c),b(d),b(a),b(bb),b(c));
  for(const [from,to,ni,nj] of [[bb,a,i,j-1],[a,d,i-1,j],[d,c,i,j+1],[c,bb,i+1,j]])
   if(!cellIn(ni,nj))front.push(f(to),f(from),b(from),f(to),b(from),b(to));
 }
 const positions=new Float32Array(pos.length),uvs=new Float32Array(uv.length);
 // pos/uv were pushed front,back per vertex; that order is the f()/b() index scheme above.
 positions.set(pos);uvs.set(uv);
 return {positions,uvs,front:Uint32Array.from(front),back:Uint32Array.from(back),bounds,aspect:(bw-1)/(bh-1)};
}
