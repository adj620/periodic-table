/**
 * Google Gemini API 클라이언트 & 진단 서비스 (gemini_service.js)
 * - Gemini 1.5 Flash / 2.0 Flash 자동 폴백
 * - API 키 자동 정제 (공백/따옴표/줄바꿈 전처리)
 * - 실시간 구글 서버 상세 에러 진단 및 친절한 한글 안내
 * - 전역 API 키 설정 모달 및 연결 테스트 엔진
 */

const GeminiService = (function() {
  const STORAGE_KEY = 'gemini_api_key';
  const PRIMARY_MODEL = 'gemini-1.5-flash';
  const FALLBACK_MODEL = 'gemini-2.0-flash';

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
        desc: '지정한 Gemini 모델 엔드포인트를 찾을 수 없습니다.',
        raw: msg,
        action: '최신 모델로 자동 전환을 시도합니다.'
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
   * Gemini API 단일 호출 (모델명 지정)
   */
  async function callGemini(modelName, prompt, apiKey) {
    const key = apiKey || getApiKey();
    if (!key) {
      throw new Error('NO_API_KEY');
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(key)}`;
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
        modelName,
        errorInfo: parseGoogleError(res.status, errJson)
      };
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return {
      ok: true,
      status: 200,
      modelName,
      text: text.trim()
    };
  }

  /**
   * 모델 자동 폴백을 포함한 스마트 호출
   */
  async function generateTextSmart(prompt, apiKey) {
    const key = apiKey || getApiKey();
    if (!key) {
      return {
        ok: false,
        errorInfo: {
          title: 'API 키 필요',
          desc: 'Google Gemini API 키가 아직 등록되지 않았습니다.',
          action: '퀴즈 탭 또는 설정에서 API 키를 등록해 주세요.'
        }
      };
    }

    // 1차: gemini-1.5-flash 시도
    let result = await callGemini(PRIMARY_MODEL, prompt, key);
    if (result.ok) return result;

    // 만약 404 모델 에러이거나 일시적 오류라면 2차 폴백: gemini-2.0-flash 시도
    if (result.status === 404 || result.status === 500 || result.status === 503) {
      const fallbackResult = await callGemini(FALLBACK_MODEL, prompt, key);
      if (fallbackResult.ok) return fallbackResult;
    }

    return result;
  }

  /**
   * API 키 연결 상태 즉시 테스트
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

    const testPrompt = '화학 주기율표 앱 연결 테스트입니다. "정상 연결되었습니다!"라고 한 문장으로 답변해 주세요.';
    return await generateTextSmart(testPrompt, key);
  }

  /**
   * 원소 상세 꿀팁 생성
   */
  async function getElementTip(element) {
    const prompt = `당신은 재미있고 친절한 화학 선생님입니다. 원소 ${element.nameKo}(기호: ${element.symbol}, 원자번호: ${element.atomicNumber}번)에 대해 학생들의 기억에 쏙 남는 기발한 암기 비법이나 실생활과 관련된 흥미진진한 상식을 한국어로 딱 2~3문장으로 짧고 친근하게 요약해 주세요. 이모지도 1~2개 섞어주세요.`;
    return await generateTextSmart(prompt);
  }

  /**
   * 퀴즈 오답/정답 해설 생성
   */
  async function getQuizExplanation(element) {
    const prompt = `당신은 재미있고 친절한 화학 선생님입니다. 원소 ${element.nameKo}(기호: ${element.symbol}, 원자번호: ${element.atomicNumber}번)에 대해 일상생활과 관련된 재미있는 상식이나 기억하기 쉬운 암기 팁을 한국어로 딱 2문장으로 짧게 요약해 주세요.`;
    return await generateTextSmart(prompt);
  }

  /**
   * 전역 API 키 설정 모달 렌더링
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
              <h3>Google Gemini AI 키 설정 & 진단</h3>
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
              <div class="guide-title">📌 API 키는 어디서 무료로 받나요?</div>
              <ol class="guide-steps">
                <li>구글 계정으로 <strong>aistudio.google.com</strong> 접속</li>
                <li><strong>[Get API key]</strong> 버튼 클릭 ➔ 새 키 생성</li>
                <li>생성된 키를 복사하여 위 칸에 붙여넣고 [저장]</li>
              </ol>
              <div class="guide-note">※ 발급 후 약 30초~1분 동안은 구글 서버 전파 지연으로 일시 오류가 날 수 있습니다.</div>
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
        resultBox.innerHTML = `⏳ 구글 AI 서버와 연결 확인 중... (약 1~2초 소요)`;

        const res = await testConnection(inputKey);
        if (res.ok) {
          resultBox.className = 'gemini-test-result-box result-success';
          resultBox.innerHTML = `
            <div class="result-title">✅ 구글 AI 서버 연결 완벽 성공!</div>
            <div class="result-detail">사용 모델: <code>${res.modelName}</code></div>
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
