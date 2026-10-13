import {test} from 'node:test';
import assert from 'node:assert/strict';
import {VENUES,venueChoice,venueName} from '../js/exhibition-editor-model.js';
import {exhibitionView} from '../js/exhibition-view.js';
import {validateExhibition} from '../js/model.js';
import {DEMO_EXHIBITIONS} from '../js/demo.js';
test('venue selector restores presets and preserves custom venue names',()=>{assert.equal(venueChoice('UNFRAME'),'unframe');assert.equal(venueChoice("Kün's Gallery"),'kuns');assert.equal(venueChoice('외부 프로젝트 공간'),'custom');assert.equal(venueName('custom',' 외부 프로젝트 공간 '),'외부 프로젝트 공간');assert.equal(venueName('kuns'),VENUES[1].label);});
test('publish validation explains separately which required field is missing',()=>{const item={...DEMO_EXHIBITIONS[0],description:'',cover:{url:'',path:'',alt:''}};assert.throws(()=>validateExhibition(item),/대표 이미지.*필수/);assert.throws(()=>validateExhibition({...item,cover:DEMO_EXHIBITIONS[0].cover}),/전시 소개.*필수/);assert.doesNotThrow(()=>validateExhibition({...item,published:false}));});
test('shared public and preview view escapes editorial text and omits legacy admission content',()=>{const item={...DEMO_EXHIBITIONS[0],title:'<img onerror="alert(1)">',description:'<script>alert(1)</script>',admission:'관람료 99999원',mapUrl:'javascript:alert(1)'};for(const preview of [false,true]){const html=exhibitionView(item,{preview});assert.ok(html.includes('&lt;img'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.ok(!html.includes('99999원'));assert.ok(!html.includes('javascript:'));}});
