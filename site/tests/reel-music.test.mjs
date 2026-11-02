import {test} from 'node:test';import assert from 'node:assert/strict';
import {waveformPeaks,loudestWindow,detectBeat,beatTimeline,DEFAULT_TIMELINE,mp3Url} from '../js/reel-music.js';
import {reelShot} from '../js/virtual-reel.js';
// A synthetic track: soft noise, with a loud click on every beat.
function clicks(bpm,seconds,rate=8000,offset=.1){
 const data=new Float32Array(seconds*rate),period=60/bpm;
 for(let i=0;i<data.length;i++)data[i]=(Math.sin(i*12.9898)*43758.5453%1)*.02;
 for(let t=offset;t<seconds;t+=period)for(let k=0;k<200;k++){const i=Math.round(t*rate)+k;if(i<data.length)data[i]=Math.sin(k*.6)*(1-k/200);}
 return data;
}
test('waveform peaks summarise the track into the requested number of bars',()=>{
 const peaks=waveformPeaks(Float32Array.from([0,.5,-1,.2,0,0,.1,-.3]),4);
 assert.deepEqual([...peaks].map(v=>Math.round(v*10)/10),[.5,1,0,.3]);
});
test('the default start is the loudest 30 seconds',()=>{
 const rate=100,data=new Float32Array(100*rate).fill(.01);for(let i=50*rate;i<80*rate;i++)data[i]=.8;
 assert.equal(Math.round(loudestWindow(data,rate,30)),50);
 assert.equal(loudestWindow(new Float32Array(10*rate),rate,30),0,'short tracks start at 0');
});
test('beat detection finds the tempo and where the beats fall',()=>{
 for(const bpm of [90,120,140]){
  const {bpm:found,phase}=detectBeat(clicks(bpm,20),8000,0,20);
  assert.ok(Math.abs(found-bpm)<=2,`${bpm} → ${found}`);
  const period=60/bpm,off=((phase-.1)%period+period)%period;
  assert.ok(Math.min(off,period-off)<.03,`phase ${phase}`);
 }
});
test('beat timeline puts every scene change on a bar and keeps the reel shape',()=>{
 const bpm=120,bar=2,line=beatTimeline(bpm,0,3);
 for(const t of [line.introEnd,...line.artEnds])assert.ok(Math.abs(t/bar-Math.round(t/bar))<1e-9,`${t} on a bar`);
 assert.ok(line.introEnd>=3&&line.introEnd<=6);assert.ok(30-line.endStart>=3&&30-line.endStart<=6);
 assert.equal(line.artEnds.at(-1),line.endStart);assert.equal(line.artEnds.length,3);
 const works=[{id:'a'},{id:'b'},{id:'c'}];
 assert.equal(reelShot(line.introEnd+.01,works,line).work.id,'a');assert.equal(reelShot(line.artEnds[0]+.01,works,line).work.id,'b');
 assert.equal(reelShot(line.endStart+.01,works,line).type,'end');
 assert.deepEqual(reelShot(12,works,DEFAULT_TIMELINE),reelShot(12,works));
});
test('a slow song still gives at least one bar per work',()=>{
 const line=beatTimeline(60,0,3);assert.ok(line.artEnds.every((t,i)=>t-(i?line.artEnds[i-1]:line.introEnd)>=4-1e-9));
});
test('UP tracks load their lighter MP3 copy',()=>{
 assert.equal(mp3Url('https://ia800403.us.archive.org/12/items/x/Song%20A.wav'),'https://ia800403.us.archive.org/12/items/x/Song%20A.mp3');
 assert.equal(mp3Url('https://ia600608.us.archive.org/6/items/y/B.flac'),'https://ia600608.us.archive.org/6/items/y/B.mp3');
 assert.equal(mp3Url('https://example.com/c.mp3'),'https://example.com/c.mp3');
});
