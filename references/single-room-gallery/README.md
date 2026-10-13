# U.A.U. 원룸 갤러리 개발 참고자료

2026-10-14 현재 로컬 시제품에서 추출한 코드입니다. 홈페이지, 회원 기능, 운영 데이터, 업로드 관리 화면은 포함하지 않습니다. 원룸 두 종류와 롱 갤러리 통창을 확인하는 별도 React 예제입니다.

## 실행

Node.js 20.19+ 또는 22.12+에서 `npm install` 후 `npm run dev`를 실행합니다. `npm run build`는 일반 Vite 정적 결과물을 생성합니다. 이 패키지에는 기존 프로젝트의 배포 설정이 없습니다. 제공된 package.json은 원본에 실제 설치된 버전을 고정합니다.

## 파일별 역할

| 파일 | 역할 |
| --- | --- |
| src/App.jsx | 원룸만 노출하는 최소 사용 예제. 레이아웃·통창·천장·조명 선택과 작품 열기 |
| src/GalleryScene.jsx | Three.js 공간, 재질, 조명, 작품 배치, 이동, 리사이즈 및 정리 |
| src/gallery-model.js | 치수, 벽/받침대 위치, 배치 한계, 작품 재배치 |
| src/gallery-storage.js | 기존 렌더러가 참조하는 IndexedDB 파일 읽기/쓰기 지원 |
| src/beam-mask.js | 작품 조명 원형/사각형 마스크 |
| public/textures/ | 렌더러에서 실제 불러오는 외부 이미지 4개 |
| public/art/ | 가상의 샘플 작품 6점과 경량 표시 이미지 |

GalleryScene과 모델은 기존 공통 소스를 그대로 복사했습니다. 내부에 2룸 관련 분기도 남아 있지만 App에서는 `single-square`와 `single-long`만 사용합니다. 원본을 무리하게 분리해 동작을 바꾸지 않기 위한 선택입니다. 원본 App과 전체 스타일은 포함하지 않았습니다.

## 공간과 좌표

- 정방형: `single-square`, 12 × 12m.
- 직사각형: `single-long`, 9 × 18m.
- 벽 높이 5m, 카메라 눈높이 1.65m, 원룸 중심 Z=2.5.
- X는 좌우, Y는 높이, Z는 깊이. 초기 카메라 (0, 1.65, 6), 초기 시선은 -Z.
- 통창은 롱 갤러리 입장 시 오른쪽 긴 벽(+X)에만 적용.
- 벽면형은 벽 작품 9점, 통창형은 6점. 원룸 바닥 받침대는 4개.
- 렌더러의 부모에 반드시 명확한 높이가 있어야 합니다. 예제 `.viewer`와 `.gallery-canvas` 참조.

## 다른 프로젝트에서 사용

```jsx
const works = remapWorks(sourceWorks, 'single-long', true);
<GalleryScene
  layoutId="single-long"
  longWindow={true}
  ceiling="luminous"
  lighting="general"
  works={works}
  onRoomChange={() => {}}
  onArtworkClick={work => openWork(work)}
  exhibitionTitle="전시 제목"
  artistName="작가 이름"
  exhibitionDescription="전시 설명"
/>
```

`ceiling`: luminous/plain/glass. `lighting`: general/focused. 원룸에서도 onRoomChange 함수를 전달해야 합니다. 브라우저 API를 쓰므로 Next.js에서는 클라이언트에서 렌더링하고 CSS 높이를 먼저 확보하세요. Next.js 앱으로의 직접 통합은 이 패키지에서 검증하지 않았습니다.

## 작품 데이터와 레이아웃 변경

이미지는 최소 id, title, type:'image', mediumUrl, originalUrl, placementId를 사용합니다. 샘플은 DEFAULT_WORKS를 참조하세요. 업로드 assetId가 있는 작품은 원본 브라우저 IndexedDB에 파일이 있어야 하므로, 다른 개발자의 컴퓨터에는 URL 방식으로 전달해야 합니다. 이 예제는 업로드 파일이나 기존 로컬 초안을 가져오지 않습니다.

레이아웃/통창 변경 전에 `remapWorks(works, layoutId, longWindow)`를 호출하세요. 자산·메타데이터를 유지하고 중복 없이 재배치하며 wallAlong/wallHeight를 0으로 초기화합니다. 용량 초과 시 예외가 발생하므로 **성공한 뒤에만** 레이아웃과 작품을 저장하세요. 이전 공간으로 돌아가도 이전 배치가 자동 복구되지는 않습니다. 예제는 항상 6개 샘플을 재배치하며 영구 저장하지 않습니다.

## 재질과 외부 경계

실내 바닥은 모든 공간에서 이음매 없는 새틴 우레탄으로 고정되어 있습니다. roughness .31, clearcoat .28, clearcoatRoughness .36, bumpScale .00035. 바닥 변경 메뉴는 없습니다. 목재·포장·콘크리트 질감과 접촉 그림자는 공통 CanvasTexture로 생성됩니다.

롱 갤러리 통창형에는 짙은 창틀, 매립 그레이팅, 실제 수평 포장, 콘크리트 플랜터, 인스턴스 식재, 목재 측벽, 평면 숲 배경이 있습니다. 곡면 도시 배경과 별도 잔디는 사용하지 않습니다. 외부는 장식이며 이동 영역에 포함되지 않습니다. 숲은 생성 이미지로서 실제 장소를 나타내지 않습니다.

## 조명·이동·수명 관리

조명은 기존 6000 K 프리셋을 공유합니다. 통창형 햇빛은 유리천장 여부와 독립적으로 작동하고 창틀/식재 그림자를 만듭니다. 일반형/집중형 조명은 유지됩니다.

WASD는 물리적 KeyboardEvent.code를 사용하므로 한글 상태의 ㅈㅁㄴㅇ도 같은 이동입니다. A/D는 좌우 이동, 좌우 방향키는 회전입니다. 바닥 클릭 이동과 드래그 시선 변경을 지원합니다. 입력창·버튼 및 dialog가 활성화된 동안 이동 키 처리를 막습니다.

ResizeObserver, DPR 상한 1.75, animation frame, 이벤트 해제 및 geometry/material/texture/renderer 정리는 GalleryScene의 생성 effect와 cleanup을 참조하세요. 배경/작품 로딩은 실제 파일 경로가 필요합니다. 기존 시제품의 전체 성능·접근성을 새 제품의 완료 기준으로 간주하지 마세요.

## 검증과 한계

패키지의 Vite 빌드 검증 결과는 별도 VERIFY.md에 기록합니다. 원본 프로젝트의 배치·조명·호스팅 회귀 검사는 16개가 통과한 상태에서 추출했습니다. 큰 Three.js 번들 경고가 남아 있습니다. 모바일 실기기와 Safari 검증은 추가로 필요합니다. 사진 배경에는 전체 입체 공간과 같은 시차가 없으며, 식재는 간략화된 모델입니다. 예제 작품 dialog는 참고용으로 포커스 트랩 등 제품 수준 접근성 보강이 필요합니다.

## 출처와 권리

코드 출처: U.A.U. 프로젝트 `prototypes/virtual-gallery/src` (2026-10-14 스냅샷). 프로젝트 고유 코드와 이미지의 사용 권한은 프로젝트 소유자 정책을 따릅니다. 이 자료가 별도의 오픈소스 라이선스를 부여하지는 않습니다. React, Three.js, Vite 등 의존성의 라이선스와 저작권 고지는 각 패키지의 고지를 유지해야 합니다. 기존 텍스처·샘플 작품과 생성 숲 이미지는 참고 자산이며 공개 서비스 전환 시 자산 권리를 확인하세요.
