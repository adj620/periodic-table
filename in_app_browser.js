/**
 * 🛡️ 인앱 안전 뷰어 & 인앱 인쇄 브릿지 시스템 (In-App Browser & Print Bridge)
 * - 구글 패밀리 링크(Family Link) 등 자녀 계정의 외부 브라우저(Chrome 등) 차단 환경 완벽 대응
 * - window.open 및 외부 링크 클릭 시 외부 브라우저를 실행하지 않고 앱 내부 모달 오버레이에서 100% 자체 처리
 * - 인쇄 시에도 외부 창을 띄우지 않고 인앱 인쇄 뷰어(iframe)를 통해 시스템 인쇄 다이얼로그 즉시 호출
 */

(function() {
  'use strict';

  // 1. 인앱 뷰어 모달 HTML 구조 동적 주입
  function initInAppViewerDoms() {
    if (document.getElementById('inAppPrintModal')) return;

    // 인앱 인쇄 미리보기 모달
    const printModalHtml = `
      <div id="inAppPrintModal" class="inapp-modal-backdrop" style="display: none;">
        <div class="inapp-modal-card inapp-print-card">
          <div class="inapp-modal-header">
            <div class="inapp-modal-title-group">
              <span class="inapp-header-icon">🖨️</span>
              <div>
                <h3 id="inAppPrintTitle" class="inapp-header-title">인쇄 미리보기 (인앱 인쇄)</h3>
                <small class="inapp-header-sub">외부 브라우저 없이 앱 안에서 바로 A4 규격으로 출력합니다.</small>
              </div>
            </div>
            <div class="inapp-header-actions">
              <button id="inAppPrintExecuteBtn" class="action-btn primary small-btn">🖨️ 바로 인쇄</button>
              <button id="inAppPrintCloseBtn" class="inapp-close-btn" title="닫기">✕</button>
            </div>
          </div>
          <div class="inapp-modal-body">
            <div id="inAppPrintLoading" class="inapp-loading-indicator">
              <div class="spinner"></div>
              <span>문서를 준비하는 중입니다...</span>
            </div>
            <iframe id="inAppPrintIframe" class="inapp-iframe" src="about:blank"></iframe>
          </div>
        </div>
      </div>
    `;

    // 범용 인앱 웹/문서 뷰어 모달
    const browserModalHtml = `
      <div id="inAppBrowserModal" class="inapp-modal-backdrop" style="display: none;">
        <div class="inapp-modal-card inapp-browser-card">
          <div class="inapp-modal-header">
            <div class="inapp-modal-title-group">
              <span class="inapp-header-icon">🌐</span>
              <div>
                <h3 id="inAppBrowserTitle" class="inapp-header-title">인앱 문서 뷰어</h3>
                <span id="inAppBrowserUrl" class="inapp-header-url"></span>
              </div>
            </div>
            <div class="inapp-header-actions">
              <button id="inAppBrowserRefreshBtn" class="inapp-icon-btn" title="새로고침">🔄</button>
              <button id="inAppBrowserCloseBtn" class="inapp-close-btn" title="닫기">✕</button>
            </div>
          </div>
          <div class="inapp-modal-body">
            <div id="inAppBrowserLoading" class="inapp-loading-indicator">
              <div class="spinner"></div>
              <span>페이지를 안전하게 불러오는 중입니다...</span>
            </div>
            <iframe id="inAppBrowserIframe" class="inapp-iframe" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" src="about:blank"></iframe>
          </div>
        </div>
      </div>
    `;

    const container = document.createElement('div');
    container.id = 'inAppViewerContainer';
    container.innerHTML = printModalHtml + browserModalHtml;
    document.body.appendChild(container);

    bindInAppViewerEvents();
  }

  function bindInAppViewerEvents() {
    // 인쇄 모달 닫기
    const printCloseBtn = document.getElementById('inAppPrintCloseBtn');
    const printModal = document.getElementById('inAppPrintModal');
    if (printCloseBtn && printModal) {
      printCloseBtn.addEventListener('click', () => {
        printModal.style.display = 'none';
        const iframe = document.getElementById('inAppPrintIframe');
        if (iframe) iframe.src = 'about:blank';
      });
      printModal.addEventListener('click', (e) => {
        if (e.target === printModal) {
          printModal.style.display = 'none';
          const iframe = document.getElementById('inAppPrintIframe');
          if (iframe) iframe.src = 'about:blank';
        }
      });
    }

    // 인쇄 즉시 실행 버튼
    const printExecuteBtn = document.getElementById('inAppPrintExecuteBtn');
    if (printExecuteBtn) {
      printExecuteBtn.addEventListener('click', () => {
        const iframe = document.getElementById('inAppPrintIframe');
        if (iframe && iframe.contentWindow) {
          try {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
          } catch (err) {
            console.warn('인앱 인쇄 호출 실패 fallback:', err);
            window.print();
          }
        }
      });
    }

    // 브라우저 모달 닫기
    const browserCloseBtn = document.getElementById('inAppBrowserCloseBtn');
    const browserModal = document.getElementById('inAppBrowserModal');
    if (browserCloseBtn && browserModal) {
      browserCloseBtn.addEventListener('click', () => {
        browserModal.style.display = 'none';
        const iframe = document.getElementById('inAppBrowserIframe');
        if (iframe) iframe.src = 'about:blank';
      });
      browserModal.addEventListener('click', (e) => {
        if (e.target === browserModal) {
          browserModal.style.display = 'none';
          const iframe = document.getElementById('inAppBrowserIframe');
          if (iframe) iframe.src = 'about:blank';
        }
      });
    }

    // 새로고침 버튼
    const refreshBtn = document.getElementById('inAppBrowserRefreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        const iframe = document.getElementById('inAppBrowserIframe');
        if (iframe) {
          const loading = document.getElementById('inAppBrowserLoading');
          if (loading) loading.style.display = 'flex';
          iframe.src = iframe.src;
        }
      });
    }
  }

  /**
   * 2. 인앱 인쇄 뷰어 열기
   */
  window.openInAppPrint = function(url, title = 'A4 인쇄 미리보기') {
    initInAppViewerDoms();
    const modal = document.getElementById('inAppPrintModal');
    const iframe = document.getElementById('inAppPrintIframe');
    const titleEl = document.getElementById('inAppPrintTitle');
    const loading = document.getElementById('inAppPrintLoading');

    if (!modal || !iframe) return;

    if (titleEl) titleEl.textContent = title;
    if (loading) loading.style.display = 'flex';
    modal.style.display = 'flex';

    iframe.onload = () => {
      if (loading) loading.style.display = 'none';
    };

    iframe.src = url;
  };

  /**
   * 3. 범용 인앱 브라우저 뷰어 열기
   */
  window.openInAppBrowser = function(url, title = '문서 뷰어') {
    initInAppViewerDoms();
    const modal = document.getElementById('inAppBrowserModal');
    const iframe = document.getElementById('inAppBrowserIframe');
    const titleEl = document.getElementById('inAppBrowserTitle');
    const urlEl = document.getElementById('inAppBrowserUrl');
    const loading = document.getElementById('inAppBrowserLoading');

    if (!modal || !iframe) return;

    if (titleEl) titleEl.textContent = title;
    if (urlEl) urlEl.textContent = url;
    if (loading) loading.style.display = 'flex';
    modal.style.display = 'flex';

    iframe.onload = () => {
      if (loading) loading.style.display = 'none';
    };

    iframe.src = url;
  };

  /**
   * 4. 전역 window.open 가로채기 (안전 몽키패치)
   * - 외부 브라우저를 열지 않고 내부 모달로 전환
   */
  const originalWindowOpen = window.open;
  window.open = function(url, target, features) {
    if (!url) return null;

    // 인쇄 페이지 호출인 경우
    if (url.includes('print-multi.html') || url.includes('print-split.html')) {
      const pageMatch = url.match(/page=(\d+)/);
      const pageNum = pageMatch ? pageMatch[1] : '';
      const title = pageNum ? `표준 주기율표 제${pageNum}편 (A4 인쇄)` : `표준 주기율표 전체 N장 일괄 인쇄`;
      window.openInAppPrint(url, title);
      return { closed: false, close: () => {} };
    }

    // 그 외 일반 링크인 경우 인앱 브라우저로 표시
    window.openInAppBrowser(url, '웹 안내');
    return { closed: false, close: () => {} };
  };

  /**
   * 5. 전역 <a> 태그 클릭 안전 가로채기
   * - target="_blank" 또는 http/https 외부 링크를 브라우저 대신 인앱 모달로 처리
   */
  document.addEventListener('click', function(e) {
    const anchor = e.target.closest('a');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

    // print-multi.html 등 내부 인쇄 링크
    if (href.includes('print-multi.html') || href.includes('print-split.html')) {
      e.preventDefault();
      window.openInAppPrint(href, 'A4 인쇄 미리보기');
      return;
    }

    // APK 다운로드 링크의 경우: 패밀리링크에서 외부 브라우저 튕김 방지 안내
    if (href.endsWith('.apk')) {
      // APK 직링크는 그대로 다운로드 트리거 허용하되 새 창 방지
      anchor.removeAttribute('target');
      return;
    }

    // 외부 링크(http/https) 또는 새 창 타깃 링크
    if (anchor.target === '_blank' || href.startsWith('http://') || href.startsWith('https://')) {
      // 같은 도메인이 아닌 외부 사이트
      try {
        const targetUrl = new URL(href, window.location.href);
        if (targetUrl.origin !== window.location.origin) {
          e.preventDefault();
          window.openInAppBrowser(href, anchor.textContent.trim() || '외부 링크');
        }
      } catch (err) {
        // URL 파싱 에러 시
      }
    }
  }, true);

  // 문서 로드 완료 시 뷰어 DOM 초기화
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInAppViewerDoms);
  } else {
    initInAppViewerDoms();
  }
})();
