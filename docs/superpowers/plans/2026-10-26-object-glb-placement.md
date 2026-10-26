# 오브제 GLB 배치 구현 계획

**Spec:** `docs/superpowers/specs/2026-10-26-object-glb-placement-design.md`
**Global constraints:**
- 기존 평면 작품 동작을 바꾸지 않습니다(`kind`가 없으면 평면).
- GLB는 30MB 이하, 압축하지 않은 파일만 받습니다.
- 데모 모드는 localStorage(data URL)만 씁니다.
- 반영 순서는 규칙 → Worker → 머지입니다.

### Task 1 — 모델 (`js/object-placement.js`, `js/virtual-model.js`)
- **Produces**
  - `OBJECT_SPOTS(room) → [{id,label,type:'corner'|'center',position:[x,z],yaw,maxSpan}]`
  - `placeObjects(artworks, roomSize) → [{art, spot, position, yaw, span}]` — 자리 없음, 자리 중복, 크기 초과 시 throw
  - `objectObstacles(placements) → [{x,z,r}]`
  - `resolveCollision([x,z], obstacles) → [x,z]`
  - `validateArtwork`에 오브제 규칙 추가, `layoutArtworks`는 평면만 배치
- **Test:** `tests/object-placement.test.mjs`
  - 방별 자리 수(소 3 · 중 5 · 대 6), 모서리가 벽 안쪽 1.2m인지
  - 자리 중복·크기 초과 거부, 연작 길이 계산
  - 충돌하면 원 밖으로 밀어내는지
  - 평면 배치에서 오브제가 제외되는지

### Task 2 — GLB 검사 (`js/glb-check.js`)
- **Produces:** `inspectGlb(ArrayBuffer) → {ok, reason}` — 서명, 버전 2, 길이, JSON 청크의 `extensionsRequired` Draco·meshopt 거부
- **Test:** 정상 GLB, 잘못된 서명, Draco 필수, 버전 1

### Task 3 — 규칙과 Worker
- **규칙:**
  - `validArtworkFields`에 `kind`, `depthCm`, `spot`, `yaw`, `plinth`, `copies`, `model` 추가
  - `validModel(model, prefix, artid)` 경로 정규식(`.glb`)
  - 제출함 작품은 제출함 경로와 대상 갤러리 경로를 모두 허용
- **Worker:**
  - `parsePath`가 `.glb`를 받고 `type: model/gltf-binary`로 처리
  - PUT은 30MB, `glTF` 서명 검사
  - 공개 GET은 `model.path` 일치 시 허용
  - `/copy`는 확장자가 같아야 함
- **Test:** 에뮬레이터 케이스, `media-worker.test.mjs` 케이스

### Task 4 — 업로드 클라이언트 (`js/store.js`)
- **Produces:** `uploadModel(file, id, onProgress, collection, artId) → {path, name}` — `inspectGlb` 통과 후 PUT. 데모는 data URL.
- 승인 복사(`approveSubmission`)가 `model.path`도 함께 옮기도록 확장
- **Test:** `submissions.test.mjs`
  - 오브제 승인 시 모델 경로가 갤러리 경로로 복사되는지
  - 다른 오브제가 이미 있는 자리 저장을 거부하는지

### Task 5 — 렌더러
- `virtual-gallery.html`에 로더 스크립트를 추가합니다.
- `virtual-room.js`
  - `buildObjects()`: 로드 → 크기 맞춤 → 좌대 → 연작 복제 → 조명
  - 실패하면 사진 대체
  - `inspectArtwork`의 오브제 시점
  - 이동할 때 `resolveCollision`
- **브라우저 확인:** 생성한 테스트 GLB로 확인합니다.

### Task 6 — 화면 (`js/artist-studio.js`, `js/admin-virtual.js`, `js/artwork-form.js`)
- 종류 토글을 추가합니다.
- 오브제 칸: 깊이, 자리, 좌대, 연작, 방향 슬라이더, GLB 업로드, 안내
- **Test:** `bindKindControls` 표시 전환, 저장 데이터 정규화

### Task 7 — 마무리
- 문서를 갱신합니다.
- check, test, build, 에뮬레이터, 브라우저(데모)를 확인합니다.
- 전체 리뷰를 받습니다.
- 규칙·Worker 배포 → PR → 머지
