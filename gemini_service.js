/**
 * Google Gemini API 클라이언트 & 스마트 진단 서비스 (gemini_service.js)
 * - 구글 API 키 지원 모델 자동 동적 탐색 (ListModels)
 * - 404 방지 다중 엔드포인트 & 버전(v1 / v1beta) 자동 폴백 엔진
 * - API 키 자동 정제 (공백/따옴표/줄바꿈 전처리)
 * - 실시간 구글 서버 상세 에러 진단 및 친절한 한글 안내
 * - 전역 API 키 설정 모달 및 1초 연결 테스트
 */

const GeminiService = (function() {
  const STORAGE_KEY = 'gemini_api_key';
  const CACHED_MODEL_KEY = 'gemini_working_model';

  // 우선 시도할 엔드포인트 후보군 (v1beta 및 v1 크로스 매핑)
  const CANDIDATE_ENDPOINTS = [
    { ver: 'v1beta', model: 'gemini-1.5-flash' },
    { ver: 'v1',     model: 'gemini-1.5-flash' },
    { ver: 'v1beta', model: 'gemini-2.0-flash' },
    { ver: 'v1beta', model: 'gemini-1.5-flash-latest' },
    { ver: 'v1beta', model: 'gemini-2.5-flash' },
    { ver: 'v1',     model: 'gemini-pro' }
  ];

  /**
   * 저장된 API 키 조회 (앞뒤 공백, 따옴표 완벽 정제)
   */
  function getApiKey() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || '';
      return raw.trim().replace(/^["']|["']$/g, '').trim();
    } catch (e) {
      return '';
    }
  }

  /**
   * API 키 저장
   */
  function setApiKey(rawKey) {
    const cleaned = (rawKey || '').trim().replace(/^["']|["']$/g, '').trim();
    if (cleaned) {
      localStorage.setItem(STORAGE_KEY, cleaned);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(CACHED_MODEL_KEY);
    }
    return cleaned;
  }

  /**
   * 구글 API 에러 응답 친절한 한글 번역
   */
  function parseGoogleError(status, errorObj) {
    const msg = errorObj?.message || errorObj?.error?.message || '알 수 없는 서버 응답';
    const errStatus = errorObj?.status || errorObj?.error?.status || '';

    if (status === 400 || msg.includes('API key not valid') || errStatus === 'INVALID_ARGUMENT') {
      return {
        title: 'API 키 불일치 (400 Invalid Key)',
        desc: '구글 AI Studio에서 발급받은 키와 일치하지 않거나 오타/공백이 포함되었습니다.',
        raw: msg,
        action: 'Google AI Studio(aistudio.google.com)에서 [Get API key]를 눌러 복사한 뒤 다시 붙여넣어 주세요.'
      };
    }

    if (status === 403 || msg.includes('PERMISSION_DENIED') || errStatus === 'PERMISSION_DENIED') {
      return {
        title: '권한 거부 (403 Permission Denied)',
        desc: '해당 API 키에 Generative Language API 사용 권한이 없거나 도메인/IP 제한이 걸려있습니다.',
        raw: msg,
        action: 'Google AI Studio에서 새로 키를 발급받으시거나, 구글 클라우드 콘솔의 API 제한 설정을 해제해 주세요.'
      };
    }

    if (status === 404 || msg.includes('not found')) {
      return {
        title: '모델 엔드포인트 미지원 (404 Not Found)',
        desc: '구글 서버에서 요청한 모델명을 찾을 수 없습니다.',
        raw: msg,
        action: '지원되는 다른 최신 모델 엔드포인트로 자동 전환을 시도합니다.'
      };
    }

    if (status === 429 || msg.includes('RESOURCE_EXHAUSTED')) {
      return {
        title: '무료 할당량 초과 (429 Quota Exceeded)',
        desc: '구글 Gemini 무료 티어의 분당 요청 한도를 일시적으로 초과했습니다.',
        raw: msg,
        action: '약 1분 후에 다시 시도하시면 정상 작동합니다.'
      };
    }

    return {
      title: `구글 서버 응답 오류 (HTTP ${status})`,
      desc: '구글 AI 서버에서 요청을 처리하지 못했습니다.',
      raw: msg,
      action: '네트워크 연결을 확인하거나 잠시 후 다시 시도해 주세요.'
    };
  }

  /**
   * 1. 구글 서버에서 현재 API 키로 사용 가능한 모델 동적 탐색 (ListModels)
   */
  async function fetchAvailableModels(key) {
    const versions = ['v1beta', 'v1'];
    for (const ver of versions) {
      try {
        const url = `https://generativelanguage.googleapis.com/${ver}/models?key=${encodeURIComponent(key)}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const list = data?.models || [];
          // generateContent 지원 모델 필터링
          const usable = list.filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'));
          if (usable.length > 0) {
            // flash 모델 우선 탐색
            const flashModel = usable.find(m => m.name.includes('flash')) || usable[0];
            const cleanModelName = flashModel.name.replace(/^models\//, '');
            return { ver, model: cleanModelName };
          }
        }
      } catch (e) {
        // 무시하고 다음 버전 시도
      }
    }
    return null;
  }

  /**
   * 2. Gemini API 단일 호출
   */
  async function callEndpoint(ver, modelName, prompt, key) {
    const endpoint = `https://generativelanguage.googleapis.com/${ver}/models/${modelName}:generateContent?key=${encodeURIComponent(key)}`;
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 250
      }
    };

    let res;
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (networkErr) {
      return {
        ok: false,
        isNetworkError: true,
        status: 0,
        errorInfo: {
          title: '네트워크 연결 실패 (CORS / 차단)',
          desc: '구글 AI 서버(generativelanguage.googleapis.com)에 접속할 수 없습니다.',
          raw: networkErr.message || 'Failed to fetch',
          action: '인터넷 연결 상태, 자녀 보호(Family Link) 브라우저 차단 정책, 또는 사내/학교 방화벽을 확인해 주세요.'
        }
      };
    }

    if (!res.ok) {
      let errJson = null;
      try {
        errJson = await res.json();
      } catch (e) {
        errJson = { message: res.statusText };
      }
      return {
        ok: false,
        status: res.status,
        ver,
        modelName,
        errorInfo: parseGoogleError(res.status, errJson)
      };
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return {
      ok: true,
      status: 200,
      ver,
      modelName,
      text: text.trim()
    };
  }

  /**
   * 3. 404 완벽 방지: 캐시된 모델 -> 동적 탐색 -> 후보군 순차 폴백
   */
  async function generateTextSmart(prompt, apiKey) {
    const key = apiKey || getApiKey();
    if (!key) {
      return {
        ok: false,
        errorInfo: {
          title: 'API 키 필요',
          desc: 'Google Gemini API 키가 아직 등록되지 않았습니다.',
          action: '상단 [🤖 AI 키 설정] 또는 퀴즈 탭에서 API 키를 등록해 주세요.'
        }
      };
    }

    // A. 이전에 성공해서 캐시된 작동 모델이 있으면 먼저 시도
    let cached = null;
    try {
      cached = JSON.parse(localStorage.getItem(CACHED_MODEL_KEY) || 'null');
    } catch (e) {}

    if (cached && cached.ver && cached.model) {
      const res = await callEndpoint(cached.ver, cached.model, prompt, key);
      if (res.ok) return res;
      // 실패 시 캐시 삭제 후 폴백 진행
      localStorage.removeItem(CACHED_MODEL_KEY);
    }

    // B. 후보군 순차 시도 (404가 나면 즉시 다음 후보 모델로 자동 전환)
    let lastError = null;
    for (const cand of CANDIDATE_ENDPOINTS) {
      const res = await callEndpoint(cand.ver, cand.model, prompt, key);
      if (res.ok) {
        // 성공한 엔드포인트 저장
        try {
          localStorage.setItem(CACHED_MODEL_KEY, JSON.stringify({ ver: cand.ver, model: cand.model }));
        } catch (e) {}
        return res;
      }

      lastError = res;

      // 400(잘못된 키) 또는 403(권한 거부)이면 모델 문제가 아니므로 즉시 반환
      if (res.status === 400 || res.status === 403 || res.isNetworkError) {
        return res;
      }
    }

    // C. 후보군 모두 404인 경우: 구글 서버에서 실제 사용 가능한 모델 목록 직접 조회 시도
    const discovered = await fetchAvailableModels(key);
    if (discovered) {
      const res = await callEndpoint(discovered.ver, discovered.model, prompt, key);
      if (res.ok) {
        try {
          localStorage.setItem(CACHED_MODEL_KEY, JSON.stringify(discovered));
        } catch (e) {}
        return res;
      }
    }

    return lastError || {
      ok: false,
      status: 404,
      errorInfo: {
        title: '지원되는 Gemini 모델을 찾을 수 없습니다 (404)',
        desc: '구글 AI Studio 계정의 사용 가능 모델을 탐색하지 못했습니다.',
        action: 'Google AI Studio(aistudio.google.com)에서 새로운 API 키를 발급받아 등록해 주세요.'
      }
    };
  }

  /**
   * 4. API 키 연결 상태 즉시 테스트
   */
  async function testConnection(testKey) {
    const key = (testKey || getApiKey() || '').trim();
    if (!key) {
      return {
        ok: false,
        errorInfo: {
          title: '키가 입력되지 않았습니다',
          desc: 'API 키를 입력하신 후 테스트 버튼을 눌러주세요.',
          action: 'Google AI Studio에서 키를 복사해 입력하세요.'
        }
      };
    }

    const testPrompt = '원소 주기율표 앱 연결 테스트입니다. "정상 연결되었습니다!"라고 한 문장으로 짧게 인사해 주세요.';
    return await generateTextSmart(testPrompt, key);
  }

  /**
   * 5. 원소 상세 꿀팁 생성
   */
  async function getElementTip(element) {
    const prompt = `당신은 재미있고 친절한 화학 선생님입니다. 원소 ${element.nameKo}(기호: ${element.symbol}, 원자번호: ${element.atomicNumber}번)에 대해 학생들의 기억에 쏙 남는 기발한 암기 비법이나 실생활과 관련된 흥미진진한 상식을 한국어로 딱 2~3문장으로 짧고 친근하게 요약해 주세요. 이모지도 1~2개 섞어주세요.`;
    return await generateTextSmart(prompt);
  }

  /**
   * 6. 퀴즈 오답/정답 해설 생성
   */
  async function getQuizExplanation(element) {
    const prompt = `당신은 재미있고 친절한 화학 선생님입니다. 원소 ${element.nameKo}(기호: ${element.symbol}, 원자번호: ${element.atomicNumber}번)에 대해 일상생활과 관련된 재미있는 상식이나 기억하기 쉬운 암기 팁을 한국어로 딱 2문장으로 짧게 요약해 주세요.`;
    return await generateTextSmart(prompt);
  }

  /**
   * 7. 전역 API 키 설정 모달 렌더링
   */
  function showApiKeyModal(onSuccessCallback) {
    let modalOverlay = document.getElementById('geminiConfigModal');
    if (!modalOverlay) {
      modalOverlay = document.createElement('div');
      modalOverlay.id = 'geminiConfigModal';
      modalOverlay.className = 'gemini-config-overlay';
      modalOverlay.innerHTML = `
        <div class="gemini-config-card">
          <div class="gemini-config-header">
            <div class="title-with-icon">
              <span class="gemini-logo-icon">🤖</span>
              <h3>Google Gemini AI 키 설정 & 실시간 진단</h3>
            </div>
            <button class="gemini-modal-close" id="geminiModalCloseBtn">&times;</button>
          </div>
          
          <div class="gemini-config-body">
            <p class="gemini-desc">
              구글 AI Studio에서 발급받은 무료 API 키를 등록하면, <strong>원소 상세 암기 비법</strong>과 <strong>퀴즈 실시간 AI 해설</strong>을 이용하실 수 있습니다.
            </p>

            <div class="gemini-input-group">
              <label for="geminiModalKeyInput">Google Gemini API Key:</label>
              <div class="gemini-input-wrapper">
                <input type="password" id="geminiModalKeyInput" placeholder="AIzaSy... 로 시작하는 키 붙여넣기" autocomplete="off" spellcheck="false" />
                <button type="button" id="geminiToggleKeyVisibility" class="gemini-toggle-vis-btn" title="키 표시/숨기기">👁️</button>
              </div>
            </div>

            <div class="gemini-actions-row">
              <button id="geminiTestKeyBtn" class="gemini-btn test-btn">🔍 키 연결 테스트</button>
              <button id="geminiSaveKeyBtn" class="gemini-btn save-btn">💾 저장하기</button>
            </div>

            <div id="geminiTestResultBox" class="gemini-test-result-box" style="display:none;"></div>

            <div class="gemini-guide-box">
              <div class="guide-title">📌 무료 API 키 발급 방법 (10초 소요)</div>
              <ol class="guide-steps">
                <li>구글 계정으로 <strong>aistudio.google.com</strong> 접속</li>
                <li><strong>[Get API key]</strong> 버튼 클릭 ➔ 새 키 생성</li>
                <li>생성된 키를 복사하여 위 칸에 붙여넣고 [저장]</li>
              </ol>
              <div class="guide-note">※ 신규 키 생성 후 약 30초~1분 동안은 구글 글로벌 서버 전파 지연이 발생할 수 있습니다.</div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modalOverlay);

      // 이벤트 리스너 바인딩
      const closeBtn = document.getElementById('geminiModalCloseBtn');
      closeBtn.addEventListener('click', () => {
        modalOverlay.style.display = 'none';
      });
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) modalOverlay.style.display = 'none';
      });

      const toggleVisBtn = document.getElementById('geminiToggleKeyVisibility');
      const keyInput = document.getElementById('geminiModalKeyInput');
      toggleVisBtn.addEventListener('click', () => {
        if (keyInput.type === 'password') {
          keyInput.type = 'text';
          toggleVisBtn.textContent = '🔒';
        } else {
          keyInput.type = 'password';
          toggleVisBtn.textContent = '👁️';
        }
      });

      const testBtn = document.getElementById('geminiTestKeyBtn');
      const saveBtn = document.getElementById('geminiSaveKeyBtn');
      const resultBox = document.getElementById('geminiTestResultBox');

      testBtn.addEventListener('click', async () => {
        const inputKey = keyInput.value.trim();
        if (!inputKey) {
          resultBox.style.display = 'block';
          resultBox.className = 'gemini-test-result-box result-error';
          resultBox.innerHTML = `⚠️ API 키를 먼저 입력해 주세요.`;
          return;
        }

        resultBox.style.display = 'block';
        resultBox.className = 'gemini-test-result-box result-loading';
        resultBox.innerHTML = `⏳ 구글 AI 서버 모델 탐색 및 연결 확인 중... (약 1~2초 소요)`;

        const res = await testConnection(inputKey);
        if (res.ok) {
          resultBox.className = 'gemini-test-result-box result-success';
          resultBox.innerHTML = `
            <div class="result-title">✅ 구글 AI 서버 연결 완벽 성공!</div>
            <div class="result-detail">연결된 모델: <code>${res.ver}/${res.modelName}</code></div>
            <div class="result-quote">" ${res.text} "</div>
          `;
          // 자동으로 저장
          setApiKey(inputKey);
          if (typeof onSuccessCallback === 'function') {
            onSuccessCallback(inputKey);
          }
        } else {
          resultBox.className = 'gemini-test-result-box result-error';
          const info = res.errorInfo;
          resultBox.innerHTML = `
            <div class="result-title">❌ ${info.title}</div>
            <div class="result-detail">${info.desc}</div>
            ${info.raw ? `<div class="result-raw">상세 오류: ${info.raw}</div>` : ''}
            <div class="result-action">💡 해결 방법: ${info.action}</div>
          `;
        }
      });

      saveBtn.addEventListener('click', () => {
        const inputKey = keyInput.value.trim();
        setApiKey(inputKey);
        if (inputKey) {
          alert('🔑 API 키가 안전하게 로컬에 저장되었습니다!\n이제 원소 상세 [🤖 AI 꿀팁]과 퀴즈에서 AI 기능을 사용하실 수 있습니다.');
          modalOverlay.style.display = 'none';
          if (typeof onSuccessCallback === 'function') {
            onSuccessCallback(inputKey);
          }
        } else {
          alert('API 키가 삭제되었습니다.');
          modalOverlay.style.display = 'none';
        }
      });
    }

    // 모달 열 때 현재 키 값 채우기
    const keyInput = document.getElementById('geminiModalKeyInput');
    if (keyInput) {
      keyInput.value = getApiKey();
    }
    const resultBox = document.getElementById('geminiTestResultBox');
    if (resultBox) {
      resultBox.style.display = 'none';
    }
    modalOverlay.style.display = 'flex';
  }

  return {
    getApiKey,
    setApiKey,
    testConnection,
    getElementTip,
    getQuizExplanation,
    showApiKeyModal
  };
})();

window.GeminiService = GeminiService;
