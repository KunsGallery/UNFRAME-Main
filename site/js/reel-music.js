// Music for the gallery reel: UP tracks or an uploaded file, a chosen 30 second window, and
// scene changes snapped to the beat. The analysis is plain arithmetic on samples (testable);
// decoding and playback use the Web Audio API in the browser.
export const DEFAULT_TIMELINE={introEnd:5,endStart:26,artEnds:null,transition:1.4};
const REEL=30;
// Largest absolute sample in each of `count` equal slices of a mono track.
export function waveformPeaks(data,count){
 const out=new Float32Array(count),size=data.length/count;
 for(let i=0;i<count;i++){let max=0;for(let j=Math.floor(i*size),end=Math.floor((i+1)*size);j<end;j++){const v=Math.abs(data[j]);if(v>max)max=v;}out[i]=max;}
 return out;
}
// Start (seconds) of the `length` second window with the most energy, in whole seconds.
export function loudestWindow(data,rate,length=REEL){
 const seconds=Math.floor(data.length/rate);if(seconds<=length)return 0;
 const energy=new Float64Array(seconds);for(let s=0;s<seconds;s++){let sum=0;for(let i=s*rate,end=(s+1)*rate;i<end;i++)sum+=data[i]*data[i];energy[s]=sum;}
 let run=0;for(let s=0;s<length;s++)run+=energy[s];let best=run,start=0;
 for(let s=length;s<seconds;s++){run+=energy[s]-energy[s-length];if(run>best){best=run;start=s-length+1;}}
 return start;
}
// Tempo and beat position from an energy-onset envelope (10ms hops) and its autocorrelation.
// Tempi near 120 BPM are slightly preferred so a half- or double-time reading loses.
// Returns {bpm, phase}: phase is the time (seconds, in track time) of one beat.
export function detectBeat(data,rate,start=0,length=REEL){
 const hop=Math.max(1,Math.round(rate*.01)),from=Math.floor(start*rate),to=Math.min(data.length,Math.floor((start+length)*rate)),frames=Math.floor((to-from)/hop);
 const onset=new Float64Array(frames);let previous=0;
 for(let f=0;f<frames;f++){let sum=0;for(let i=from+f*hop,end=i+hop;i<end;i++)sum+=data[i]*data[i];onset[f]=Math.max(0,sum-previous);previous=sum;}
 const score=lag=>{let s=0;for(let f=0;f+lag<frames;f++)s+=onset[f]*onset[f+lag];return s/(frames-lag);};
 const minLag=Math.round(60/180/.01),maxLag=Math.round(60/70/.01);let bestLag=minLag,best=-1;
 for(let lag=minLag;lag<=maxLag;lag++){const bpm=60/(lag*.01),weight=Math.exp(-Math.pow(Math.log2(bpm/120),2)/(2*.9*.9)),value=score(lag)*weight;if(value>best){best=value;bestLag=lag;}}
 const a=score(bestLag-1),b=score(bestLag),c=score(bestLag+1),shift=(a-2*b+c)?.5*(a-c)/(a-2*b+c):0,rough=(bestLag+clamp(shift,-.5,.5))*.01;
 // Fit a beat grid: try periods within ±1.5% of the rough one and every offset, keeping the grid
 // whose beats land on the most onset energy. A small tempo error drifts over 30 seconds of beats.
 const grid=(step,o)=>{let sum=0;for(let k=0;Math.round(o+k*step)<frames;k++)sum+=onset[Math.round(o+k*step)];return sum;};
 let period=rough,phaseFrame=0,fit=-1;
 for(let candidate=rough*.985;candidate<=rough*1.015;candidate+=.0005){const step=candidate/.01;for(let o=0;o<Math.round(step);o++){const sum=grid(step,o);if(sum>fit){fit=sum;period=candidate;phaseFrame=o;}}}
 return {bpm:60/period,phase:start+phaseFrame*.01};
}
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
// Scene changes on bar lines (4 beats). `phase` is a beat time relative to the reel's start.
// Keeps the reel's shape: an intro of about 5s, the works in between, an end card of about 4s.
export function beatTimeline(bpm,phase,count){
 const beat=60/bpm,bar=beat*4,first=((phase%bar)+bar)%bar;
 const nearest=(target,min,max)=>{let best=null;for(let t=first;t<=REEL+1e-9;t+=bar)if(t>=min-1e-9&&t<=max+1e-9&&(best===null||Math.abs(t-target)<Math.abs(best-target)))best=t;return best;};
 const introEnd=nearest(5,3,6)??first+bar*Math.max(1,Math.round((5-first)/bar));
 let endStart=nearest(26,24,27)??introEnd+bar*Math.max(count,Math.round((26-introEnd)/bar));
 const bars=Math.max(count,Math.round((endStart-introEnd)/bar));endStart=Math.min(REEL-1,introEnd+bars*bar);
 const artEnds=Array.from({length:count},(_,i)=>i===count-1?endStart:introEnd+Math.max(i+1,Math.round(bars*(i+1)/count))*bar);
 return {introEnd,endStart,artEnds,transition:Math.min(1.4,beat*2),bpm};
}
// archive.org keeps a VBR MP3 beside each WAV/FLAC; it is about a tenth of the size.
export const mp3Url=url=>/archive\.org\//.test(url)?url.replace(/\.(wav|flac)$/i,'.mp3'):url;
export async function upTracks(){
 const response=await fetch('https://firestore.googleapis.com/v1/projects/unframe-playlist/databases/(default)/documents/artifacts/unframe-playlist-v1/public/data/tracks?pageSize=100');
 if(!response.ok)throw new Error('UP 곡 목록을 불러오지 못했습니다.');
 const value=field=>field?(field.stringValue??field.booleanValue??''):'';
 return ((await response.json()).documents||[]).map(doc=>doc.fields)
  .filter(f=>value(f.isPublished)===true&&(!value(f.status)||value(f.status)==='published')&&/^https:\/\//.test(value(f.audioUrl))&&!/test/i.test(value(f.title)))
  .sort((a,b)=>Number(value(b.createdAt))-Number(value(a.createdAt)))
  .map(f=>({title:value(f.title),artist:value(f.artist),url:mp3Url(value(f.audioUrl)),original:value(f.audioUrl)}));
}
// Decodes a File or URL (falling back to `fallback` when the MP3 copy is missing).
export async function decodeMusic(context,source,fallback){
 let bytes;
 if(source instanceof Blob)bytes=await source.arrayBuffer();
 else{let response=await fetch(source).catch(()=>null);if((!response||!response.ok)&&fallback)response=await fetch(fallback).catch(()=>null);if(!response||!response.ok)throw new Error('음악 파일을 불러오지 못했습니다.');bytes=await response.arrayBuffer();}
 try{return await context.decodeAudioData(bytes);}catch{throw new Error('이 음악 파일은 열 수 없습니다. MP3나 WAV로 올려주세요.');}
}
// Mono mix of an AudioBuffer for analysis.
export function monoSamples(buffer){
 const out=new Float32Array(buffer.length);
 for(let c=0;c<buffer.numberOfChannels;c++){const data=buffer.getChannelData(c);for(let i=0;i<out.length;i++)out[i]+=data[i]/buffer.numberOfChannels;}
 return out;
}
