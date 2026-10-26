// 원소 주기율표 PWA Service Worker
// 네트워크 우선(Network-First) 전략: 배포 즉시 최신 버전이 자동 반영되며, 오프라인 시에만 로컬 캐시 사용

const CACHE_NAME = 'periodic-table-v1.3.2-b16';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './elements.js',
  './elements_extra.js',
  './elements_photos.js',
  './elements_encyclopedia.js',
  './in_app_browser.js',
  './gemini_service.js',
  './quiz.js',
  './game_suite.js',
  './card_explorer.js',
  './manifest.json',
  './icon.svg',
  './version.json'
];

// 1. 설치 단계: 핵심 정적 자산 사전 캐싱 및 대기 없이 즉시 활성화
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// 2. 활성화 단계: 구버전 캐시 즉시 정리 및 활성 클라이언트 제어 인수
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => {
          console.log('[ServiceWorker] 구버전 캐시 삭제:', key);
          return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. 네트워크 요청 처리:
// - 핵심 코드(HTML, JS, CSS, JSON)는 항상 네트워크 최신 파일 우선 (Network-First)
// - 네트워크 실패(오프라인) 시에만 캐시에서 제공하여 중단 없는 오프라인 앱 지원
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // GET 요청만 캐싱 처리
  if (event.request.method !== 'GET') return;

  // 외부 API 호출(Gemini API 등)은 캐싱에서 제외
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // 네트워크 응답이 정상이면 최신 상태를 캐시에 자동 갱신
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // 네트워크 연결 불가(오프라인) 시 캐시에서 제공
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // HTML 탐색 요청인 경우 index.html 반환
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('오프라인 상태입니다.', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});

// 메시지 수신: 즉시 업데이트 명령 수신 처리
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
