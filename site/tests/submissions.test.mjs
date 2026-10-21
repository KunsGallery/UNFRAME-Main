import {test} from 'node:test';import assert from 'node:assert/strict';
import {EXPIRY_DAYS,newSubmissionId,expiryFrom,daysLeft,isExpired,artistCanEdit,canTransition,inviteURL,inviteMessage,validateInvite,diffArtworks,submissionImagePath,isSubmissionPath,OWNERSHIP_NOTICE} from '../js/submission-model.js';
const DAY=86400000;
test('submission ids are unguessable 22-character base62 values',()=>{
 const ids=new Set(Array.from({length:1000},newSubmissionId));
 assert.equal(ids.size,1000);
 for(const id of ids)assert.match(id,/^[A-Za-z0-9]{22}$/);
});
test('expiry is ten days after the last write and remaining days round up',()=>{
 const now=new Date('2026-10-21T00:00:00Z');
 assert.equal(EXPIRY_DAYS,10);
 assert.equal(expiryFrom(now).toISOString(),'2026-10-31T00:00:00.000Z');
 assert.equal(daysLeft(new Date(now.getTime()+10*DAY),now),10);
 assert.equal(daysLeft(new Date(now.getTime()+9.2*DAY),now),10);
 assert.equal(daysLeft(new Date(now.getTime()-DAY),now),0);
 assert.equal(isExpired(new Date(now.getTime()-1),now),true);
 assert.equal(isExpired(new Date(now.getTime()+1),now),false);
});
test('artists edit drafts and rejected uploads but only toggle a submitted request',()=>{
 assert.equal(artistCanEdit('draft'),true);assert.equal(artistCanEdit('rejected'),true);assert.equal(artistCanEdit('submitted'),false);assert.equal(artistCanEdit('invited'),false);
 assert.equal(canTransition('draft','submitted','artist'),true);
 assert.equal(canTransition('rejected','submitted','artist'),true);
 assert.equal(canTransition('submitted','draft','artist'),true);
 assert.equal(canTransition('invited','submitted','artist'),false);
 assert.equal(canTransition('submitted','rejected','artist'),false);
 assert.equal(canTransition('submitted','rejected','staff'),true);
});
test('invite message carries the link, names and the account-binding notice',()=>{
 const url=inviteURL('abcDEF1234567890abcdEF','https://unframe.kr');
 assert.equal(url,'https://unframe.kr/artist-studio/abcDEF1234567890abcdEF');
 const text=inviteMessage({artistName:'김하늘',exhibitionTitle:'Resonance',url,expiresAt:new Date('2026-10-31T00:00:00Z')});
 for(const part of ['김하늘','Resonance',url,OWNERSHIP_NOTICE,'10일'])assert.ok(text.includes(part),part);
 assert.match(OWNERSHIP_NOTICE,/처음 로그인한 Google 계정/);
});
test('invites require an artist name and normalise an optional email',()=>{
 assert.throws(()=>validateInvite({artistName:' ',invitedEmail:''}),/작가명/);
 assert.throws(()=>validateInvite({artistName:'작가',invitedEmail:'not-an-email'}),/이메일/);
 assert.deepEqual(validateInvite({artistName:' 작가 ',invitedEmail:' A@B.com '}),{artistName:'작가',invitedEmail:'a@b.com'});
 assert.deepEqual(validateInvite({artistName:'작가',invitedEmail:''}),{artistName:'작가',invitedEmail:''});
});
test('artwork diff classifies additions, changes and removals by id',()=>{
 const a={id:'a',title:'A',updatedAt:'1'},b={id:'b',title:'B',updatedAt:'1'},c={id:'c',title:'C'};
 assert.deepEqual(diffArtworks([a,b],[{...a,updatedAt:'2'},{...b,title:'B2'},c]),{added:['c'],changed:['b'],removed:[]});
 assert.deepEqual(diffArtworks([a,b],[a]),{added:[],changed:[],removed:['b']});
});
test('submission image paths stay inside their own submission',()=>{
 const path=submissionImagePath('sub1','art1','webp');
 assert.match(path,/^virtualSubmissions\/sub1\/art1\/[0-9a-f-]{36}\.webp$/);
 assert.equal(isSubmissionPath(path,'sub1'),true);
 assert.equal(isSubmissionPath(path,'sub2'),false);
 assert.equal(isSubmissionPath('virtualGalleries/sub1/art1/x.webp','sub1'),false);
});
