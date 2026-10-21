# 작가 업로드·승인 및 관람 개선 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 초대 링크 기반 작가 업로드 → 직원 승인 → 10일 미승인 만료 정리, 그리고 버추얼 갤러리 관람 개선 1~3단계.

**Architecture:** 작가 업로드는 공개 갤러리와 분리된 `virtualSubmissions` 제출함에 저장하고, 승인 시 관리자 클라이언트가 Worker `/copy`로 이미지를 복사한 뒤 `virtualGalleries`에 쓴다. 권한은 Firestore 규칙과 Worker가 각각 강제한다. 관람 개선은 기존 `virtual-room.js`에서 HUD·투어·품질 모듈을 분리해 진행한다.

**Tech Stack:** 정적 HTML + ES 모듈, Three.js r128(벤더), Firebase Web SDK 13(CDN), Firestore 규칙, Cloudflare Worker + R2, `node --test`.

**Spec:** `docs/superpowers/specs/2026-10-21-artist-virtual-submissions-design.md`

## Global Constraints

- 기존 Firebase 프로젝트 `unframe-main`, 웹 앱 `1:1003147136936:web:ae4a2bd6ec1ca8ade7179d`만 사용. 서비스 계정 키·`.env`·`dist`·`node_modules` 커밋 금지.
- 데모 모드(`CONFIG.mode==='demo'`)는 localStorage만 사용하고 Firebase·R2에 쓰지 않는다.
- 만료: 마지막 쓰기 + 10일(`EXPIRY_DAYS=10`), 경고는 남은 일수 ≤2.
- 작품: 최대 24점, 벽당 8점, 세로·가로 10~500cm, 기존 `validateArtwork` 한도 그대로.
- 제출함 ID: base62 22자. 제출함당 R2 객체 최대 60개. 이미지 10MB, JPG·PNG·WebP.
- 작가 화면 입력: 이미지·작품명·세로·가로·벽면·형태(필수), 연도·재료·설명(선택).
- 계정 귀속 안내 문구(링크 첫 화면·안내문 공통): "처음 로그인한 Google 계정에 권한이 연결됩니다. 앞으로 사용할 본인 계정으로 로그인하고, 링크는 다른 사람과 공유하지 마세요."
- 코드 스타일: 기존 파일처럼 압축된 한 줄 함수, 한국어 사용자 문구, `escapeHTML`로 출력 이스케이프.
- 푸시 전 `npm run check && npm test && npm run build` 통과. 규칙·Worker 배포는 사용자 확인 후.

## Review Focus

- 만료 직전에 작가가 저장 중인 경우: 규칙이 거부하면 "기한이 지났습니다" 안내가 떠야 하며 조용히 실패하면 안 된다 → Task 6 테스트.
- 승인 중간 실패(이미지 복사 일부 실패): 제출함이 남고 재승인 시 중복 작품 없이 완료돼야 한다 → Task 2 테스트 `approve is idempotent after partial failure`.
- 다른 Google 계정으로 이미 귀속된 링크를 연 경우: 편집 화면 대신 "다른 계정에 연결된 초대" 안내 → Task 6 테스트.
- 수정본 승인 시 빠진 작품: 공개 갤러리에서 삭제되고 그 이미지도 정리돼야 한다 → Task 2 테스트 `revision approval removes dropped artworks`.
- 기존 공개 갤러리 방문자 동작(규칙·Worker 변경 후)도 그대로여야 한다 → Task 3·4 기존 테스트 유지 확인.

---

### Task 1: 제출함 순수 모델

**Files:**
- Create: `site/js/submission-model.js`
- Test: `site/tests/submissions.test.mjs`

**Interfaces — Produces:**
- `EXPIRY_DAYS=10`, `STATUS={invited:'초대됨',draft:'작성 중',submitted:'심사 요청',rejected:'반려됨'}`
- `newSubmissionId(): string` — base62 22자, `crypto.getRandomValues`
- `expiryFrom(now: Date): Date`, `daysLeft(expiresAt: Date|string, now=new Date()): number`(올림, 최소 0), `isExpired(expiresAt, now)`
- `artistCanEdit(status): boolean` — `draft|rejected`
- `canTransition(from, to, role:'artist'|'staff'): boolean` — 작가: `draft|rejected→submitted`, `submitted→draft`; 직원: `submitted→rejected` 추가
- `inviteURL(id, origin=location.origin)`, `inviteMessage({artistName, exhibitionTitle, url, expiresAt}): string` — Global Constraints 귀속 문구 포함
- `validateInvite({artistName, invitedEmail})` — 작가명 1~300, 이메일은 빈 값 또는 형식 검사, 소문자 정규화해 반환
- `diffArtworks(before: Artwork[], after: Artwork[]): {added:string[], changed:string[], removed:string[]}` (id 기준, `updatedAt` 무시)
- `submissionImagePath(id, artId, ext)`, `isSubmissionPath(path, id)`

- [ ] **Step 1:** 테스트 작성 — `newSubmissionId` 길이 22·`/^[A-Za-z0-9]+$/`·1000회 중복 없음; `daysLeft` 10일 뒤=10, 9.2일=10, 과거=0; `canTransition('submitted','draft','artist')===true`, `('invited','submitted','artist')===false`, `('submitted','rejected','artist')===false`; `inviteMessage`가 링크·작가명·전시명·귀속 문구를 포함; `validateInvite({artistName:' ',invitedEmail:''})` throw, `'A@B.com'`→`'a@b.com'`; `diffArtworks` 추가/변경/삭제 분류.
- [ ] **Step 2:** `cd site && node --test tests/submissions.test.mjs` → FAIL(모듈 없음)
- [ ] **Step 3:** `submission-model.js` 구현
- [ ] **Step 4:** 같은 명령 → PASS
- [ ] **Step 5:** 커밋 `Add submission model for artist uploads`

### Task 2: 제출함 저장소(데모 + Firebase)

**Files:**
- Create: `site/js/submission-store.js`
- Modify: `site/js/store.js` (`uploadImage`의 허용 컬렉션에 `virtualSubmissions` 추가, `copyImages(pairs)` 추가)
- Modify: `site/js/virtual-store.js` (`saveVirtualSettings`가 선택 필드 `artistEmail` 보존)
- Modify: `site/js/virtual-model.js` (`validateGallery`가 `artistEmail` 허용)
- Test: `site/tests/submissions.test.mjs`

**Interfaces — Consumes:** Task 1 전부. `store.js`의 `demo`, `firestoreClient`, `session`, `uploadImage`, `removeImage`.
**Produces (모두 async):**
- 직원: `createInvite(exhibition, {artistName, invitedEmail, targetGalleryId=''}) → Submission`, `listSubmissions(exhibitionId) → Submission[]`, `countPending() → number`, `extendSubmission(id)`, `rejectSubmission(id, note)`, `deleteSubmission(id)`(작품·이미지 포함), `approveSubmission(id, {publish:boolean}) → galleryId`, `purgeExpiredSubmissions() → number`
- 작가: `getInvite(id) → Submission|null`, `claimInvite(id) → Submission`, `getSubmission(id) → {submission, artworks}`, `saveSubmissionSettings(id, settings)`, `saveSubmissionArtwork(id, artwork)`(부모 `expiresAt`·`updatedAt` 갱신을 같은 batch로), `deleteSubmissionArtwork(id, artId)`, `setSubmissionStatus(id, status)`, `myGalleries() → {id, settings}[]`, `createRevision(galleryId) → id`
- `Submission` = 스펙 1장 필드 + `id`. 데모에서 `expiresAt`은 ISO 문자열, Firebase에서는 `Timestamp`를 `Date`로 변환해 반환.
- 데모 작가 계정: `DEMO_ARTIST_EMAIL='sample-artist@unframe.local'`, 저장 키 `unframe-virtual-submissions-demo-v1`.
- 승인 순서: 신규면 `artist-${crypto.randomUUID()}` 갤러리 생성(`defaultArtistGallery` + 제출 `settings` + `artistEmail=ownerEmail`), 수정본이면 `targetGalleryId` 사용 → 제출함 경로 이미지 `copyImages` → 작품 쓰기 → 수정본에서 빠진 작품·이미지 삭제 → 제출함 삭제. 이미 갤러리 경로인 이미지는 복사하지 않는다. 승인 시 생성한 갤러리 ID를 제출함에 `approvedGalleryId`로 먼저 기록해 재시도 시 재사용(멱등).

- [ ] **Step 1:** 데모 모드 테스트 작성(`globalThis.localStorage` 메모리 스텁, `config.js` 데모 기본값 사용): `createInvite→claimInvite→saveSubmissionArtwork→setSubmissionStatus('submitted')→approveSubmission({publish:true})` 후 `getVirtualGallery`가 작품 1점·`published:true`·`artistEmail` 반환하고 `getInvite`는 null; `submitted` 상태에서 `saveSubmissionArtwork` throw; 만료(`expiresAt` 과거로 조작)된 제출함은 `getInvite` null·`purgeExpiredSubmissions()===1`; `approve is idempotent after partial failure`(`copyImages` 1회 실패 주입 후 재승인 시 작품 수 동일); `revision approval removes dropped artworks`.
- [ ] **Step 2:** `node --test tests/submissions.test.mjs` → FAIL
- [ ] **Step 3:** 구현. Firebase 경로의 모든 쓰기는 `writeBatch`를 쓰고 제출함 문서에 `touchedAt: serverTimestamp()`를 함께 기록한다. `expiresAt` 필드는 저장하지 않으며, 화면 표시용 만료일은 `touchedAt + EXPIRY_DAYS`로 계산한다(Task 3 규칙과 일치).
- [ ] **Step 4:** `node --test tests/submissions.test.mjs tests/virtual-gallery.test.mjs tests/artist-galleries.test.mjs` → PASS
- [ ] **Step 5:** 커밋 `Add submission store with demo approval and expiry purge`

> 설계 보정: 클라이언트가 `request.time`과 정확히 같은 값을 쓸 수 없으므로, 스펙의 `expiresAt == request.time + 10d` 대신 `touchedAt == request.time`(serverTimestamp)을 강제하고 만료는 `touchedAt + duration.value(10,'d')`로 계산한다. 의미(마지막 쓰기 + 10일, 서버 시간)는 동일하다. 스펙 문서도 이 표현으로 고친다.

### Task 3: Firestore 규칙

**Files:**
- Modify: `site/firestore.rules` (`virtualSubmissions` 블록, `virtualGalleries`에 `artistEmail` 선택 필드와 작가 본인 읽기)
- Modify: `site/scripts/test-firestore-rules.mjs` (작가 토큰 `artist@example.com`, `other@example.com` 케이스)

**Interfaces — Consumes:** Task 2 문서 형태(`touchedAt`, `status`, `ownerEmail`, `invitedEmail`, `settings`, `reviewNote`, `approvedGalleryId`).

- [ ] **Step 1:** 에뮬레이터 테스트 추가 — 허용: 직원 초대 생성, 비로그인 미귀속 `get`, 작가 귀속, 작가 settings 수정, 작가 작품 batch(부모 touch 포함), `draft→submitted→draft`, 직원 반려, 본인 갤러리(`artistEmail`) 읽기, 수정본 생성. 거부: 비로그인 `list`, `invitedEmail` 불일치 귀속, 이미 귀속된 문서 재귀속, 타인 읽기·쓰기, 부모 touch 없는 작품 쓰기, `submitted`에서 작품 쓰기, 작가가 `reviewNote`·`ownerEmail`·`exhibitionId` 변경, 작가의 `virtualGalleries` 쓰기, `touchedAt`이 `request.time`이 아닌 쓰기, 만료 문서의 작가 읽기·쓰기(11일 전 `touchedAt` 문서를 에뮬레이터 관리자 우회 토큰 `owner`로 시드해 검증).
- [ ] **Step 2:** `cd site && firebase emulators:exec --only firestore --project demo-unframe-rules "FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/test-firestore-rules.mjs"` → 새 케이스 FAIL
- [ ] **Step 3:** 규칙 구현
- [ ] **Step 4:** 같은 명령 → 모든 체크 PASS(기존 332개 포함)
- [ ] **Step 5:** 커밋 `Enforce artist submission ownership and expiry in Firestore rules`

### Task 4: 이미지 Worker

**Files:**
- Modify: `site/media-worker/index.mjs`
- Test: `site/tests/media-worker.test.mjs`

**Interfaces — Produces:** `parsePath`가 `virtualSubmissions/{id}/{artId}/{uuid}.{ext}` → `{collection:'virtualSubmissions', id, artId}`; `POST /copy` 본문 `{items:[{from,to}]}`(최대 24), 직원 전용, `from`은 제출함 경로·`to`는 `virtualGalleries/{galleryId}/{artId}/{uuid}.{ext}`이며 같은 확장자, 응답 `{copied:n}`.

- [ ] **Step 1:** 테스트 — 주인 PUT 200; 타인 PUT 403; `submitted` 상태 PUT 403; 61번째 객체 PUT 409(`MEDIA.list` 스텁); 비로그인 GET 404; 주인 GET 200; 직원 `/copy` 200, 작가 `/copy` 403, 경로 위조(`to`가 exhibitions) 400; 비공개 갤러리 이미지를 `artistEmail` 본인 GET 200; 기존 테스트 유지.
- [ ] **Step 2:** `node --test tests/media-worker.test.mjs` → FAIL
- [ ] **Step 3:** 구현(CORS 메서드에 POST 추가, 주인 확인은 작가 토큰으로 `virtualSubmissions/{id}` 문서 조회)
- [ ] **Step 4:** PASS
- [ ] **Step 5:** 커밋 `Let invited artists upload submission images through the media worker`

### Task 5: 관리자 초대·심사 화면

**Files:**
- Create: `site/js/admin-submissions.js`
- Modify: `site/js/admin-virtual.js` (허브에 "작가 초대" 섹션 진입), `site/js/admin.js` (로그인 후 `purgeExpiredSubmissions` 1회 + 토스트, 상단 "심사 대기 N건" 배지), `site/assets/` 관리자 CSS 파일
- Test: `site/tests/submissions.test.mjs` (렌더 헬퍼 순수 함수)

**Interfaces — Consumes:** Task 1·2. **Produces:** `adminSubmissions(exhibitionId, onBack)`, `reviewSubmission(id, onBack)`, 순수 `inviteCardHTML(submission, now)`(상태·남은 일수·경고 클래스 `is-urgent` 포함).

- [ ] **Step 1:** 테스트 — `inviteCardHTML`이 2일 남으면 `is-urgent`, 이메일 없으면 메일 버튼 없음, 작가명 이스케이프.
- [ ] **Step 2:** FAIL 확인
- [ ] **Step 3:** 구현: 초대 폼(작가명 필수·이메일 선택), 카드 버튼 링크 복사/안내문 복사(`navigator.clipboard.writeText`)/메일(`mailto:` + 인코딩된 제목·본문)/기한 연장/초대 취소; 심사 화면은 3D 미리보기 링크(`/virtual-gallery/submission/{id}?preview=1`), `diffArtworks` 표시, 승인 후 공개·승인만·반려(사유 필수).
- [ ] **Step 4:** PASS + 브라우저 데모로 초대 생성·복사 확인
- [ ] **Step 5:** 커밋 `Add artist invitations and review queue to admin`

### Task 6: 작가 스튜디오 페이지

**Files:**
- Create: `site/artist-studio.html`, `site/js/artist-studio.js`, `site/assets/artist-studio.css`
- Modify: `site/scripts/serve.mjs`, `site/scripts/build.mjs`(복사 목록·`_redirects`·`_headers` noindex), `site/netlify.toml`, `site/js/virtual-gallery.js`(`/virtual-gallery/submission/{id}` 미리보기: 주인 또는 직원만)
- Test: `site/tests/submissions.test.mjs`

**Interfaces — Consumes:** Task 1·2, `virtual-model.js`의 `validateArtwork`, `layoutArtworks`, `THEMES`, `WALLS`, `FRAMES`, `LIGHTING`, `CEILINGS`.
**Produces:** 순수 `studioState({invite, user, now}) → 'landing'|'editor'|'locked'|'expired'|'other-account'|'gone'`.

- [ ] **Step 1:** 테스트 — 미귀속+비로그인 `landing`; 귀속·본인 `editor`; 귀속·타인 `other-account`; `submitted` `locked`; 문서 없음 `gone`; 저장 시 규칙 거부(`permission-denied`)를 "기한이 지났거나 권한이 없습니다" 문구로 바꾸는 `studioError(error)`.
- [ ] **Step 2:** FAIL 확인
- [ ] **Step 3:** 구현: 첫 화면(귀속 안내 상자·절차·자동 삭제·마감일·**업로드하기**), 편집 화면(상태·계정·3D 미리보기·심사 요청/요청 취소, 남은 기간 띠, 작품 목록 n/24, 입력: 이미지·작품명·세로·가로·벽면·형태·연도·재료·설명, 공간 설정), 반려 사유 표시, 승인 후 "내 갤러리"·수정본 만들기, 데모 모드 안내 배너, 모바일 1열.
- [ ] **Step 4:** PASS + 브라우저 데모 전체 흐름(초대→업로드하기→작품 2점→심사 요청→관리자 승인→공개 갤러리 표시)
- [ ] **Step 5:** 커밋 `Add artist studio for invited virtual gallery uploads`

### Task 7: 관람 개선 1단계(HUD·안내·캡션·투어)

**Files:**
- Create: `site/js/virtual-hud.js`, `site/js/virtual-tour.js`
- Modify: `site/virtual-gallery.html`, `site/js/virtual-room.js`, `site/assets/virtual-gallery.css`
- Test: `site/tests/virtual-gallery.test.mjs`

**Interfaces — Produces:** `createTour(ids: string[]) → {start(), next(), prev(), current(): {id, index, total}|null, stop()}`(마지막에서 `next()`는 `null` 반환·종료); `mountHud({idleMs=4000})`(입장 후 `body.hud-idle` 토글, 메뉴 버튼 `#btn-menu`가 기존 버튼 묶음 열고 닫음); `inputHint(isTouch): string`.

- [ ] **Step 1:** 테스트 — `createTour` 순서·`3 / 12` 표기용 index/total·끝에서 종료·`prev` 처음에서 유지; `inputHint(true)`에 "WASD" 없음.
- [ ] **Step 2:** FAIL → **Step 3:** 구현(투어는 상세창 대신 하단 바 `#tour-bar`: 진행·이전·다음·상세 보기·종료; 캡션 텍스처 1024×512·글자 크게, 작품 우측 하단 8cm 간격) → **Step 4:** PASS + 데스크톱·375px 스크린샷 확인
- [ ] **Step 5:** 커밋 `Quiet the virtual gallery HUD and rebuild the guided tour`

### Task 8: 관람 개선 2단계(딥링크·벽 이동·로딩·확대)

**Files:**
- Create: `site/js/virtual-links.js`
- Modify: `site/js/virtual-room.js`, `site/js/virtual-gallery.js`, `site/virtual-gallery.html`, `site/assets/virtual-gallery.css`
- Test: `site/tests/virtual-gallery.test.mjs`

**Interfaces — Produces:** `artFromHash(hash, ids) → id|null`(`#art-{id}`), `hashFor(id)`, `wallViewpoint(wall: 'front'|'left'|'right') → {position:[x,z], yaw}`, 로딩은 `THREE.LoadingManager` 진행률을 `#start-progress`에 표시.

- [ ] **Step 1:** 테스트 — 알 수 없는 id는 null; `wallViewpoint`가 방 경계(`bounds`) 안 좌표.
- [ ] **Step 2:** FAIL → **Step 3:** 구현(상세창 열 때 `history.pushState`, `popstate`로 닫기; 공유 카드 URL에 해시 포함; 이미지 확대는 클릭 토글 2배 + 포인터 드래그) → **Step 4:** PASS + 브라우저에서 `#art-sample-1` 진입·뒤로가기 확인
- [ ] **Step 5:** 커밋 `Add artwork deep links, wall shortcuts, load progress and zoom`

### Task 9: 관람 개선 3단계(구조·화질·Three.js)

**Files:**
- Create: `site/js/virtual-quality.js`, `site/js/virtual-input.js`
- Modify: `site/js/virtual-room.js`(입력 처리·화질 분리), `site/js/virtual-environment.js`(식재 수를 화질 단계로)
- Test: `site/tests/virtual-gallery.test.mjs`

**Interfaces — Produces:** `pickQuality({memory, cores, width}) → 'low'|'medium'|'high'`, `QUALITY={low:{pixelRatio:1,shadows:false,leaves:400},medium:{pixelRatio:1.25,shadows:true,shadowSize:1024,leaves:1200},high:{pixelRatio:1.5,shadows:true,shadowSize:2048,leaves:2600}}`, `downgrade(level)`.

- [ ] **Step 1:** 테스트 — 메모리 2GB → low, 8GB·8코어·1440px → high, `downgrade('low')==='low'`.
- [ ] **Step 2:** FAIL → **Step 3:** 구현(첫 3초 평균 FPS < 40이면 한 단계 하향) → **Step 4:** PASS + 브라우저 확인
- [ ] **Step 5:** 커밋 `Split virtual room input and add adaptive render quality`
- [ ] **Step 6:** Three.js 전환 시도: 최신 안정 버전 벤더 파일로 교체해 `sRGBEncoding→colorSpace` 등 변환, 데스크톱·모바일 스크린샷을 r128과 비교. 색·조명·성능 중 하나라도 나빠지면 되돌리고 결과를 docs에 기록. 성공 시 커밋 `Upgrade Three.js for the virtual gallery`.

### Task 10: 문서·전체 검증

**Files:**
- Modify: `docs/virtual-gallery.md`(작가 초대·심사·만료·관람 기능 운영 안내), 스펙(Task 2 설계 보정 반영)

- [ ] **Step 1:** `cd site && npm run check && npm test && npm run build` → 모두 통과
- [ ] **Step 2:** 에뮬레이터 규칙 테스트 통과(Task 3 명령)
- [ ] **Step 3:** 브라우저 데모: 초대→업로드→심사 요청→반려→재요청→승인 후 공개, 만료 정리 토스트, 관람(데스크톱·375px)
- [ ] **Step 4:** 커밋 `Document artist uploads and verify virtual gallery upgrades`
- [ ] **Step 5:** 사용자에게 푸시·규칙 배포·Worker 배포 여부 확인
