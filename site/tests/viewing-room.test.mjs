import test from 'node:test';
import assert from 'node:assert/strict';
import {viewingRoomMarkup} from '../js/exhibition-viewing-room.js';
import {validateExhibition} from '../js/model.js';
import {DEMO_EXHIBITIONS} from '../js/demo.js';
test('viewing room remains opt-in for legacy and disabled exhibitions',()=>{
 assert.equal(viewingRoomMarkup({}), '');
 assert.equal(viewingRoomMarkup({viewingRoomEnabled:false}), '');
 assert.match(viewingRoomMarkup({viewingRoomEnabled:true}), /ex-artists/);
 const item=structuredClone(DEMO_EXHIBITIONS[0]);
 assert.doesNotThrow(()=>validateExhibition({...item,viewingRoomEnabled:true}));
 assert.throws(()=>validateExhibition({...item,viewingRoomEnabled:'true'}));
});
