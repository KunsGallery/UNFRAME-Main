# Firebase 연결 현황

- 프로젝트: unframe-main (기존 프로젝트)
- 웹 앱: 1:1003147136936:web:ae4a2bd6ec1ca8ade7179d (기존 앱)
- Firestore: (default), Standard, asia-northeast3 (서울), 실시간 업데이트 사용 가능
- Firebase MCP 및 CLI: 연결됨. Google CLI 계정 인증 확인.
- Firestore 규칙: 실제 배포 성공 및 서버에서 새 규칙을 조회해 확인.
- Google 로그인: 첫 CLI 작업은 준비 단계의 180초 시간 초과로 실패를 반환했지만, 콘솔에서 Google 제공자가 사용 설정됨 상태임을 확인. Netlify 승인 도메인 추가 배포도 180초 시간 초과로 종료. 콘솔 승인 목록에 Netlify 주소가 없는 것을 확인. 주소 입력까지 준비했고 브라우저 저장 동작 승인 대기.
- Firestore와 Storage 규칙: Firebase MCP 문법 검증 통과. 승인된 Google 계정만 쓰기 가능하도록 ACL을 사용.
- 관리자 승인: Netlify 주소는 https://unframe-main.netlify.app로 확인. 승인할 이메일 목록은 대기. 승인 정보가 없으므로 아직 staff 문서를 만들지 않았음.
- Storage: 운영 규칙이 존재하지 않음. 결제 연결 없음. Blaze 전환 및 저장소 초기화가 필요함.

Firebase SDK 공개 설정은 Netlify FIREBASE_* 환경변수를 사용합니다. 서비스 계정 키는 저장소에 넣지 않습니다.

보안 규칙은 프로토타입이며 문법 검증을 통과했다고 모든 접근 시나리오가 검증된 것은 아닙니다. 실제 승인/미승인 계정, 공개/임시 저장 전시와 사진에 대한 테스트를 마친 후 공개 운영해야 합니다. 기존 규칙은 references/firebase-firestore-before-setup.rules에 보존했습니다.

사진 저장소에 대한 Blaze 결제 연결은 사용자가 Firebase 콘솔에서 수행해야 합니다. 무료 사용 구간이 있더라도 실제 요금은 사용량과 리전에 따라 달라집니다. 결제가 연결되면 Storage 생성과 규칙 배포, CORS 및 사진 업로드 테스트를 이어갑니다.

공식 문서: https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024

공개 운영 사이트 https://unframe-main.netlify.app/exhibition에서 익명 Firestore 조회가 정상 처리되어 0개 전시 상태가 표시되는 것을 확인했습니다. 샘플 전시를 실제 데이터베이스에 등록하지 않았습니다.
