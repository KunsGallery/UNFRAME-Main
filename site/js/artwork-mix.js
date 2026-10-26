// Fair, varied artwork selection across artists for the homepage and the exhibition slider.
// A group exhibition must not open with one artist's works just because their room sorts first.
export function seeded(seed){let s=seed>>>0||1;return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
export function shuffle(list,random=Math.random){const out=[...list];for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
const artistKey=artist=>String(artist||'').trim().toLowerCase();
function byArtist(items,artistOf){const groups=new Map();for(const item of items){const key=artistKey(artistOf(item));if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item);}return [...groups.values()];}
// One randomly chosen work per artist, artists in random order.
export function onePerArtist(entries,random=Math.random,limit=Infinity){
 return shuffle(byArtist(entries,entry=>entry.artwork.artist),random).map(group=>group[Math.floor(random()*group.length)]).slice(0,limit);
}
// Every work, artists taking turns in a random order (A, B, C, A, B, ...).
export function mixByArtist(works,random=Math.random){
 const queues=shuffle(byArtist(works,work=>work.artist),random).map(group=>shuffle(group,random)),out=[];
 while(queues.some(queue=>queue.length))for(const queue of queues)if(queue.length)out.push(queue.shift());
 return out;
}
