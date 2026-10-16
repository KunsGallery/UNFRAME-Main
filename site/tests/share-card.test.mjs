import test from 'node:test';
import assert from 'node:assert/strict';
import {sizes,fitImage,textLines} from '../js/share-card.js';
test('sharing exports exact story and landscape ratios',()=>{assert.deepEqual(sizes.story,[1080,1920]);assert.equal(sizes.landscape[0]/sizes.landscape[1],4/3);});
test('A contains the full work while B covers and centers the crop',()=>{assert.deepEqual(fitImage(400,800,600,600),[150,0,300,600]);assert.deepEqual(fitImage(400,800,600,600,true),[0,-300,600,1200]);});
test('long Korean card copy is bounded and truncated, empty fields omitted',()=>{const ctx={measureText:text=>({width:Array.from(text).length*10})};assert.deepEqual(textLines(ctx,'',100),[]);const lines=textLines(ctx,'가나다라마바사아자차카타파하',50,2);assert.equal(lines.length,2);assert.equal(lines[1],'바사아자…');});
