import {test} from 'node:test';import assert from 'node:assert/strict';
import {onePerArtist,mixByArtist,seeded} from '../js/artwork-mix.js';
const work=(artist,n)=>({artwork:{title:`${artist}-${n}`,artist,image:{path:`p/${artist}/${n}`}}});
const works=[...[1,2,3,4].map(n=>work('조은이',n)),work('권광훈',1),work('권광훈',2),work('김하늘',1)];
test('home shows exactly one work per artist, picked at random',()=>{
 const picks=onePerArtist(works,seeded(7));
 assert.deepEqual(picks.map(x=>x.artwork.artist).sort(),['권광훈','김하늘','조은이']);
 const seen=new Set();for(let s=1;s<40;s++)seen.add(onePerArtist(works,seeded(s)).find(x=>x.artwork.artist==='조은이').artwork.title);
 assert.ok(seen.size>1,'different visits can show different works');
 const firsts=new Set();for(let s=1;s<40;s++)firsts.add(onePerArtist(works,seeded(s))[0].artwork.artist);
 assert.ok(firsts.size>1,'artist order varies too');
 assert.equal(onePerArtist(works,seeded(3),2).length,2);
});
test('detail slider interleaves artists so one artist never fills the start',()=>{
 const mixed=mixByArtist(works.map(x=>x.artwork),seeded(5));
 assert.equal(mixed.length,7);
 assert.notEqual(mixed[0].artist,mixed[1].artist);assert.notEqual(mixed[1].artist,mixed[2].artist);
 assert.deepEqual(new Set(mixed.slice(0,3).map(x=>x.artist)).size,3);
 const firsts=new Set();for(let s=1;s<40;s++)firsts.add(mixByArtist(works.map(x=>x.artwork),seeded(s))[0].artist);
 assert.ok(firsts.size>1);
});
test('works without an artist name are grouped together, not dropped',()=>{
 assert.equal(onePerArtist([{artwork:{title:'a',artist:''}},{artwork:{title:'b',artist:''}}],seeded(1)).length,1);
 assert.equal(mixByArtist([{title:'a',artist:''},{title:'b'}],seeded(1)).length,2);
});
