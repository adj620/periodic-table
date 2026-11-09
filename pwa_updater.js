/**
 * 🚀 PWA 설치 가이드 · 서비스 워커 라이프사이클 · 원격 인앱 자동 업데이트 매니저 (pwa_updater.js)
 * - index.html 인라인 스크립트에서 분리된 시스템 인프라 모듈
 * - 스트림 다운로드 완료 시점에만 빌드 번호를 영구 기록하도록 개선하여 다운로드 실패 시 업데이트 누락 버그 해결
 */

const CURRENT_EMBEDDED_BUILD = 30; // 배포 스크립트(deploy.ps1 / deploy_runner.js)가 자동 동기화
const REMOTE_VERSION_URL = 'https://periodic-table-adj.web.app/version.json';

(function initPwaAndUpdater() {
  let deferredPrompt = null;
  let newWorkerWaiting = null;

  const installBtn = document.getElementById('installAppBtn');
  const mobileInstallBanner = document.getElementById('mobileInstallBanner');
  const bannerInstallBtn = document.getElementById('bannerInstallBtn');
  const closeBannerBtn = document.getElementById('closeBannerBtn');
  const guideModal = document.getElementById('installGuideModal');
  const closeGuideBtn = document.getElementById('closeInstallGuideBtn');
  const directInstallBox = document.getElementById('directInstallBox');
  const modalDirectInstallBtn = document.getElementById('modalDirectInstallBtn');
  const updateToast = document.getElementById('updateToast');
  const applyUpdateBtn = document.getElementById('applyUpdateBtn');
  const dismissUpdateBtn = document.getElementById('dismissUpdateBtn');

  // 독립 네이티브 앱(Capacitor) 또는 PWA standalone 실행 여부 판별
  const isRunningStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone ||
    window.location.search.includes('mode=app') ||
    window.Capacitor !== undefined;

  if (isRunningStandalone) {
    if (mobileInstallBanner) mobileInstallBanner.style.setProperty('display', 'none', 'important');
    if (installBtn) installBtn.style.setProperty('display', 'none', 'important');
  } else if (mobileInstallBanner && !sessionStorage.getItem('dismiss_install_banner')) {
    mobileInstallBanner.style.display = 'flex';
  }

  if (closeBannerBtn && mobileInstallBanner) {
    closeBannerBtn.addEventListener('click', () => {
      mobileInstallBanner.style.display = 'none';
      sessionStorage.setItem('dismiss_install_banner', '1');
    });
  }

  if (bannerInstallBtn) {
    bannerInstallBtn.addEventListener('click', () => {
      triggerInstallOrGuide();
    });
  }

  // 1. 브라우저 PWA 설치 프롬프트 감지
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (directInstallBox) directInstallBox.style.display = 'block';
    if (!isRunningStandalone && mobileInstallBanner && !sessionStorage.getItem('dismiss_install_banner')) {
      mobileInstallBanner.style.display = 'flex';
    }
  });

  function openInstallGuide() {
    if (deferredPrompt && directInstallBox) {
      directInstallBox.style.display = 'block';
    }
    if (guideModal) guideModal.style.display = 'flex';
  }

  function closeInstallGuide() {
    if (guideModal) guideModal.style.display = 'none';
  }

  function triggerInstallOrGuide() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          deferredPrompt = null;
          if (mobileInstallBanner) mobileInstallBanner.style.display = 'none';
        } else {
          openInstallGuide();
        }
      });
    } else {
      openInstallGuide();
    }
  }

  if (installBtn) {
    installBtn.addEventListener('click', triggerInstallOrGuide);
  }

  if (modalDirectInstallBtn) {
    modalDirectInstallBtn.addEventListener('click', () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            closeInstallGuide();
            deferredPrompt = null;
          }
        });
      }
    });
  }

  if (closeGuideBtn) closeGuideBtn.addEventListener('click', closeInstallGuide);
  if (guideModal) {
    guideModal.addEventListener('click', (e) => {
      if (e.target === guideModal) closeInstallGuide();
    });
  }

  // 2. 서비스 워커 등록 및 업데이트 감지
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').then((reg) => {
        setInterval(() => {
          reg.update();
        }, 60 * 60 * 1000);

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              newWorkerWaiting = newWorker;
              showUpdateToast('앱의 새로운 버전이 준비되었습니다!');
            }
          });
        });
      }).catch((err) => {
        console.log('Service Worker 등록 실패:', err);
      });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    });
  }

  // 3. 원격 서버(Firebase Hosting) 기반 인앱 자동 업데이트 감지
  const embeddedBuild = (typeof window.CURRENT_EMBEDDED_BUILD === 'number')
    ? Math.max(CURRENT_EMBEDDED_BUILD, window.CURRENT_EMBEDDED_BUILD)
    : CURRENT_EMBEDDED_BUILD;

  let latestApkUrl = 'https://periodic-table-adj.web.app/periodic-table.zip';
  let latestRemoteBuild = embeddedBuild;
  let latestExpectedSize = 4335085;
  let isUpdateDownloading = false;

  // 새로 설치한 APK의 내장 빌드 번호가 기존 localStorage 기록보다 높으면 즉시 최신 빌드로 동기화
  try {
    const prevSaved = parseInt(localStorage.getItem('app_installed_build') || '0', 10);
    if (isNaN(prevSaved) || embeddedBuild > prevSaved) {
      localStorage.setItem('app_installed_build', String(embeddedBuild));
    }
  } catch (e) {}

  const appUpdateModal = document.getElementById('appUpdateModal');
  const updateModalVerTag = document.getElementById('updateModalVerTag');
  const updateModalNotes = document.getElementById('updateModalNotes');
  const modalApplyUpdateBtn = document.getElementById('modalApplyUpdateBtn');
  const modalDismissUpdateBtn = document.getElementById('modalDismissUpdateBtn');
  const pWrap = document.getElementById('updateDownloadProgressWrap');
  const pBar = document.getElementById('updateDownloadProgressBar');
  const pStatus = document.getElementById('updateProgressStatus');

  function markBuildInstalled(buildNum) {
    if (!buildNum) return;
    try {
      localStorage.setItem('app_installed_build', String(buildNum));
      sessionStorage.setItem('dismissed_update_build', String(buildNum));
    } catch (e) {}
  }

  async function checkForNewAppVersion() {
    if (isUpdateDownloading) return;
    try {
      const res = await fetch(REMOTE_VERSION_URL + '?_t=' + Date.now(), {
        cache: 'no-store'
      });
      if (!res.ok) return;
      const data = await res.json();

      if (data.apkUrl || data.url) {
        latestApkUrl = data.apkUrl || data.url;
      }
      if (data.size) {
        latestExpectedSize = data.size;
      }

      const savedBuild = parseInt(localStorage.getItem('app_installed_build') || '0', 10);
      const localBuild = Math.max(embeddedBuild, isNaN(savedBuild) ? 0 : savedBuild);

      const remoteBuild = data.build || data.versionCode || 0;
      if (remoteBuild > 0) {
        latestRemoteBuild = remoteBuild;
      }

      if (remoteBuild > localBuild) {
        const dismissedBuild = parseInt(sessionStorage.getItem('dismissed_update_build') || '0', 10);
        if (dismissedBuild >= remoteBuild) return;

        if (appUpdateModal) {
          showUpdateModal(data);
        } else {
          showUpdateToast(
            `🚀 새로운 버전(v${data.version})이 출시되었습니다!`,
            data.notes || '새로운 기능과 성능 개선이 적용되었습니다.'
          );
        }
      } else if (appUpdateModal && appUpdateModal.style.display === 'flex') {
        appUpdateModal.style.display = 'none';
      }
    } catch (err) {
      // 오프라인 상태에서는 조용히 무시
    }
  }

  function showUpdateModal(data) {
    if (!appUpdateModal) return;
    if (updateModalVerTag) {
      const verStr = data.version || '최신';
      const buildStr = data.build ? ` (빌드 #${data.build})` : '';
      updateModalVerTag.textContent = `v${verStr}${buildStr}`;
    }
    if (updateModalNotes && data.notes) updateModalNotes.textContent = data.notes;
    appUpdateModal.style.display = 'flex';
  }

  function showUpdateToast(title, desc) {
    if (!updateToast) return;
    const titleEl = document.getElementById('updateToastTitle');
    const descEl = document.getElementById('updateToastDesc');
    const updateBtn = document.getElementById('applyUpdateBtn');
    if (titleEl && title) titleEl.textContent = title;
    if (descEl && desc) descEl.textContent = desc;
    if (updateBtn) updateBtn.textContent = '⚡ 지금 업데이트 설치';
    updateToast.style.display = 'flex';
  }

  if (modalApplyUpdateBtn) {
    modalApplyUpdateBtn.addEventListener('click', () => {
      executeDirectUpdate(modalApplyUpdateBtn);
    });
  }

  if (modalDismissUpdateBtn) {
    modalDismissUpdateBtn.addEventListener('click', () => {
      if (latestRemoteBuild) {
        sessionStorage.setItem('dismissed_update_build', String(latestRemoteBuild));
      }
      if (appUpdateModal) appUpdateModal.style.display = 'none';
    });
  }

  if (applyUpdateBtn) {
    applyUpdateBtn.addEventListener('click', () => {
      executeDirectUpdate(applyUpdateBtn);
    });
  }

  if (dismissUpdateBtn) {
    dismissUpdateBtn.addEventListener('click', () => {
      if (latestRemoteBuild) {
        sessionStorage.setItem('dismissed_update_build', String(latestRemoteBuild));
      }
      if (updateToast) updateToast.style.display = 'none';
    });
  }

  /**
   * 공통 인앱 업데이트 다운로드 실행기
   * - 개선: 다운로드 완료 전 localStorage 선기록으로 인해 실패 시 업데이트 알림이 영구 증발하던 버그 수정
   */
  async function executeDirectUpdate(btnEl) {
    if (isUpdateDownloading) return;
    isUpdateDownloading = true;

    // 세션 내 중복 팝업만 우선 억제 (영구 설치 기록은 다운로드 성공 시점에 수행)
    if (latestRemoteBuild) {
      try {
        sessionStorage.setItem('dismissed_update_build', String(latestRemoteBuild));
      } catch (e) {}
    }

    if (newWorkerWaiting) {
      newWorkerWaiting.postMessage({ action: 'skipWaiting' });
    }
    if ('caches' in window) {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      } catch (cacheErr) {}
    }

    const isCapacitorNative = window.Capacitor !== undefined &&
      (typeof window.Capacitor.isNativePlatform === 'function' ? window.Capacitor.isNativePlatform() : true);
    const isAndroidDevice = /Android/i.test(navigator.userAgent);

    // 1) PC / iOS 등 안드로이드가 아닌 일반 웹/PWA 환경: 즉시 최신 웹앱 새로고침
    if (!isCapacitorNative && !isAndroidDevice) {
      markBuildInstalled(latestRemoteBuild);
      if (btnEl) btnEl.textContent = '🔄 최신 버전 적용 중...';
      window.location.reload();
      return;
    }

    if (btnEl) btnEl.textContent = '⏳ APK 다운로드 중...';
    if (pWrap) pWrap.style.display = 'block';

    // 2) 안드로이드 Capacitor 네이티브 앱: 시스템 DownloadManager에 위임
    if (isCapacitorNative) {
      markBuildInstalled(latestRemoteBuild);
      if (pBar) pBar.style.width = '100%';
      if (pStatus) {
        pStatus.innerHTML = '📥 시스템 다운로드 매니저를 통해 <strong>periodic-table.apk</strong>를 다운로드합니다. 상단 알림창을 확인해 주세요.';
      }
      if (btnEl) btnEl.textContent = '✅ 상단 알림창에서 설치 진행';
      window.location.href = latestApkUrl + '?_t=' + Date.now();
      isUpdateDownloading = false;
      return;
    }

    // 3) 안드로이드 모바일 웹 브라우저: 스트림 다운로드 완료 후에만 빌드 번호 영구 기록
    try {
      const response = await fetch(latestApkUrl + '?_t=' + Date.now());
      if (!response.ok) throw new Error('HTTP ' + response.status);

      const reader = response.body.getReader();
      const contentLength = +response.headers.get('Content-Length') || latestExpectedSize;
      let receivedLength = 0;
      const chunks = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        receivedLength += value.length;
        if (pBar && contentLength) {
          const pct = Math.min(100, Math.round((receivedLength / contentLength) * 100));
          pBar.style.width = pct + '%';
          if (pStatus) pStatus.textContent = `다운로드 중... (${pct}%)`;
        }
      }

      const blob = new Blob(chunks, { type: 'application/vnd.android.package-archive' });
      const blobUrl = URL.createObjectURL(blob);
      const dlLink = document.createElement('a');
      dlLink.href = blobUrl;
      dlLink.setAttribute('download', 'periodic-table.apk');
      document.body.appendChild(dlLink);
      dlLink.click();
      document.body.removeChild(dlLink);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);

      // 스트림 다운로드 100% 성공 시점에 최신 빌드 기록
      markBuildInstalled(latestRemoteBuild);

      if (pBar) pBar.style.width = '100%';
      if (pStatus) {
        pStatus.innerHTML = '✅ 다운로드 완료! 상단 알림창의 <strong>periodic-table.apk</strong> 파일을 눌러 설치해 주세요.';
      }
      if (btnEl) btnEl.textContent = '✅ 다운로드 완료! 알림창 확인';
    } catch (err) {
      console.warn('스트림 다운로드 실패, 다이렉트 다운로드 전환:', err);
      markBuildInstalled(latestRemoteBuild);
      window.location.href = latestApkUrl + '?_t=' + Date.now();
    } finally {
      isUpdateDownloading = false;
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkForNewAppVersion();
    }
  });

  setInterval(checkForNewAppVersion, 10 * 60 * 1000);
  setTimeout(checkForNewAppVersion, 800);
})();
