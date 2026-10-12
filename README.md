# UNFRAME-Main

UNFRAME 통합 사이트

- `site/`: 메인, 전시 목록, 상세, 관리자, Firebase 설정과 Netlify 배포 파일.
- `references/`: 사용자가 제공한 메인/전시 원본 코드.
- `shared/`: 향후 공통 브랜드 자료.
- `docs/`: 연결과 운영 안내.

`site` 폴더에서 `npm run dev` 실행 후 http://127.0.0.1:4173 방문.

| 경로 | 화면 |
|---|---|
| `/` | 메인 |
| `/exhibition` | 전시 목록 |
| `/exhibition/:id` | 전시 상세 |
| `/admin` | 전시 관리자 |

메인과 전시 목록은 같은 공개 전시 데이터를 구독합니다. Firebase 모드에서는 Firestore 실시간 구독, 샘플 모드에서는 브라우저 탭 사이의 저장 이벤트로 갱신합니다. 샘플 데이터는 실제 전시가 아닙니다. 실제 Firebase/Netlify 연결은 아직 수행하지 않았습니다.

Netlify 배포 단위는 `site`이며, `npm run build`로 만든 `site/dist`를 배포합니다. 연결과 남은 이전 작업은 `docs/시작하기.md`, `docs/통합사이트.md`에 정리했습니다.

GitHub 저장소: https://github.com/KunsGallery/UNFRAME-Main
기본 브랜치: main. Netlify는 루트 netlify.toml 설정으로 site 폴더를 빌드합니다.
