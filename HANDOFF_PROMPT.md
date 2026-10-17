# ⚛️ 표준 원소 주기율표 & 퀴즈 앱 프로젝트 인수인계 지침서 (HANDOFF_PROMPT)

## 1. 프로젝트 개요 및 환경
* **프로젝트 경로**: `D:\workspace\periodic-table` (원격: `git@github.com:adj620/periodic-table.git`)
* **참조 프로젝트**: `D:\workspace\homework_manager` (`https://github.com/adj620/homework_manager.git` 연결 완료)
* **기술 스택**: HTML5, CSS3, ES6 JavaScript, PWA (Service Worker + Manifest), Firebase Hosting 배포 파이프라인
* **로컬 서버**: Node.js 서버 실행 중 (`http://localhost:3000`)
* **모바일 시뮬레이터**: `http://localhost:3000/mobile_simulator.html` (PC에서 갤럭시/아이폰 규격으로 실시간 디버깅 가능)

## 2. 사용자 절대 규칙 (반드시 준수)
1. **문서 및 출력 언어 통일**: 구현 계획, 워크스루, 기술 문서, 코드 주석, 사용자 응답을 포함한 모든 출력물은 **반드시 100% 한국어(Korean)**로만 작성해야 합니다. (기술 용어 제외한 영어 사용 금지)
2. **간결한 응답 스타일**: 장황한 긴 줄글 대신 핵심 위주의 불릿 포인트로 짧고 명확하게 작성해야 합니다.

## 3. 핵심 파일 및 아키텍처 구조
* `index.html`: 반응형 표준 주기율표, 상세 모달 다이얼로그, PWA 매니페스트, 모바일 전용 하단 고정 탭 바 (`mobileBottomNav`).
* `app.js`: 118개 원소 렌더링, 전역 뷰 전환 엔진 (`window.switchMainView`), 원소 상세 모달 연속 탐색 (이전/다음 버튼 및 좌우 터치 스와이프), 모바일 160% 가독성 기본 줌 및 `🔍 전체보기` / `🔎 확대보기` 플로팅 FAB 토글.
* `card_explorer.js`: 모바일 세로 화면 최적화 대형 카드 뷰, 1장씩 넘기기 모드 (터치 스와이프 지원), 검색 및 10대 화학 계열 필터, 5가지 정렬.
* `quiz.js`: 118개 원소 데이터 기반 6개 모드 무한 4지선다형 퀴즈 생성기, 연속 정답 콤보 점수, 클릭 관통 방지(300ms 쿨다운), 오답노트 및 `오답만 다시 풀기` 기능.
* `mobile_simulator.html`: PC에서 폰 환경을 1:1로 보면서 글자 크기, 터치 감도, 화면 비율을 초고속으로 실시간 디버깅하는 도구.
* `version.json` / `service-worker.js`: 네트워크 우선(Network-First) 캐시 전략 및 새 버전 배포 시 인앱 자동 갱신 알림.
* `deploy.ps1` / `deploy.bat`: version.json 빌드 번호 자동 +1 증가, 서비스 워커 캐시 키 동기화, Firebase Hosting 원클릭 자동 배포.

## 4. 최근 완료 및 검증된 작업
* 폰 화면 하단 탭 바 연동 버그 및 퀴즈 클릭 관통 버그 수정 완료.
* 카드 탐색기 단일 카드 터치 스와이프 및 퀴즈 오답 재도전 기능 탑재 완료.
* 모든 변경 사항 Git 커밋 및 `origin/main` 원격 저장소 푸시 완료.
