/**
 * Google Gemini API 클라이언트 & 스마트 진단 서비스 (gemini_service.js)
 * - 구글 API 키 지원 모델 자동 동적 탐색 (ListModels)
 * - 404 방지 다중 엔드포인트 & 버전(v1 / v1beta) 자동 폴백 엔진
 * - API 키 자동 정제 (공백/따옴표/줄바꿈 전처리)
 * - 실시간 구글 서버 상세 에러 진단 및 친절한 한글 안내
 * - 전역 API 키 설정 모달 및 1초 연결 테스트
 */

(function() {
  const STORAGE_KEY = 'gemini_api_key';
  const CACHED_MODEL_KEY = 'gemini_working_model';
  const SELECTED_MODEL_KEY = 'gemini_selected_model';
  const FAST_MODE_KEY = 'gemini_fast_no_thinking';
  const DEFAULT_MODEL = 'gemini-2.5-flash';

  // 사용자가 직접 선택할 수 있는 모델 목록 (각 모델별 예상 응답속도 및 특징 명시)
  const SELECTABLE_MODELS = [
    {
      id: 'gemini-2.5-flash',
      ver: 'v1beta',
      label: '🌟 gemini-2.5-flash [⏱️ 1~2초] (기본 · 고성능 추천)',
      desc: '⏱️ 예상 속도: 약 1~2초 (빠른 응답 해제 시 8~14초) · 품질과 속도가 가장 뛰어난 주력 모델'
    },
    {
      id: 'gemini-3-flash-preview',
      ver: 'v1beta',
      label: '🚀 gemini-3-flash-preview [⏱️ 1.5~3초] (Gemini 3 고속)',
      desc: '⏱️ 예상 속도: 약 1.5~3초 (빠른 응답 해제 시 10~15초) · 차세대 Gemini 3 고속 모델'
    },
    {
      id: 'gemini-3.1-flash-lite-preview',
      ver: 'v1beta',
      label: '⚡ gemini-3.1-flash-lite-preview [⏱️ 0.6~1.2초] (Gemini 3.1 경량)',
      desc: '⏱️ 예상 속도: 약 0.6~1.2초 · 차세대 Gemini 3.1 초경량·초고속 프리뷰 모델'
    },
    {
      id: 'gemini-2.5-flash-lite',
      ver: 'v1beta',
      label: '⚡ gemini-2.5-flash-lite [⏱️ 0.5~0.9초] (최고속 경량)',
      desc: '⏱️ 예상 속도: 약 0.5~0.9초 · 전체 모델 중 응답이 가장 빠르고 무료 할당량이 가장 넉넉함'
    },
    {
      id: 'gemini-2.0-flash',
      ver: 'v1beta',
      label: '⚡ gemini-2.0-flash [⏱️ 0.7~1.2초] (비추론 고속)',
      desc: '⏱️ 예상 속도: 약 0.7~1.2초 · 내부 추론 대기가 없는 안정적인 고속 모델'
    },
    {
      id: 'gemini-2.5-pro',
      ver: 'v1beta',
      label: '🧠 gemini-2.5-pro [⏱️ 6~15초] (심층 추론 고지능)',
      desc: '⏱️ 예상 속도: 약 6~15초 · 강제 추론(Thinking)이 상시 작동하여 느리지만 해설 품질은 최고 수준'
    },
    {
      id: 'gemini-3-pro-preview',
      ver: 'v1beta',
      label: '🧠 gemini-3-pro-preview [⏱️ 8~18초] (Gemini 3 최고지능)',
      desc: '⏱️ 예상 속도: 약 8~18초 · 차세대 최고 지능 추론 모델 (무료 키에서는 429 한도 초과 주의)'
    },
    {
      id: 'gemini-flash-latest',
      ver: 'v1beta',
      label: '🔄 gemini-flash-latest [⏱️ 1~2초] (최신 Flash 별칭)',
      desc: '⏱️ 예상 속도: 약 1~2초 · 구글의 최신 Flash 정식 버전을 자동으로 가리키는 별칭'
    },
    {
      id: 'auto',
      ver: 'v1beta',
      label: '🤖 자동 최적 탐색 [⏱️ 1~2초] (지원 모델 자동 선택)',
      desc: '⏱️ 예상 속도: 약 1~2초 · 선택한 모델 장애 시 사용 가능한 최적 모델을 자동으로 찾아 연결'
    }
  ];

  // 폴백용 기본 후보군 (디폴트 gemini-2.5-flash 최우선)
  const CANDIDATE_ENDPOINTS = [
    { ver: 'v1beta', model: 'gemini-2.5-flash' },
    { ver: 'v1beta', model: 'gemini-3-flash-preview' },
    { ver: 'v1beta', model: 'gemini-2.5-flash-lite' },
    { ver: 'v1beta', model: 'gemini-2.0-flash' },
    { ver: 'v1beta', model: 'gemini-flash-latest' }
  ];

  function getSelectedModel() {
    try {
      return localStorage.getItem(SELECTED_MODEL_KEY) || DEFAULT_MODEL;
    } catch (e) {
      return DEFAULT_MODEL;
    }
  }

  function setSelectedModel(modelId) {
    try {
      const target = modelId || DEFAULT_MODEL;
      localStorage.setItem(SELECTED_MODEL_KEY, target);
      localStorage.removeItem(CACHED_MODEL_KEY);
      return target;
    } catch (e) {
      return DEFAULT_MODEL;
    }
  }

  function isFastModeEnabled() {
    try {
      const val = localStorage.getItem(FAST_MODE_KEY);
      return val === null ? true : val === 'true';
    } catch (e) {
      return true;
    }
  }

  function setFastModeEnabled(enabled) {
    try {
      localStorage.setItem(FAST_MODE_KEY, enabled ? 'true' : 'false');
    } catch (e) {}
  }

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
   * 1. 구글 서버에서 현재 API 키로 사용 가능한 텍스트 생성 모델 목록 동적 탐색 (ListModels)
   */
  async function fetchAvailableModels(key) {
    const discovered = [];
    const versions = ['v1beta', 'v1'];
    // 느리거나 특수 목적(음성/대화/실험/사고전용/구형) 모델은 철저히 제외
    const excludePattern = /tts|audio|dialog|live|image|imagen|vision|embedding|aqa|veo|robotics|computer-use|learnlm|thinking|exp|preview|1\.0|1\.5|gemini-pro/i;

    for (const ver of versions) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const url = `https://generativelanguage.googleapis.com/${ver}/models?key=${encodeURIComponent(key)}`;
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        if (!res.ok) {
          if (res.status === 400 || res.status === 403) {
            let errJson = null;
            try { errJson = await res.json(); } catch (e) {}
            return { authError: { ok: false, status: res.status, errorInfo: parseGoogleError(res.status, errJson) } };
          }
          continue;
        }

        const data = await res.json();
        const list = data?.models || [];
        const usable = list.filter(m => {
          if (!Array.isArray(m.supportedGenerationMethods) || !m.supportedGenerationMethods.includes('generateContent')) {
            return false;
          }
          const cleanName = (m.name || '').replace(/^models\//, '');
          return cleanName.startsWith('gemini-') && !excludePattern.test(cleanName);
        });

        const scoreModel = (name) => {
          if (name === 'gemini-2.5-flash') return 100;
          if (name === 'gemini-2.5-flash-lite') return 95;
          if (name === 'gemini-2.0-flash') return 90;
          if (name === 'gemini-2.0-flash-lite') return 88;
          if (name === 'gemini-flash-latest') return 85;
          if (name.includes('flash')) return 75;
          return 50;
        };

        usable
          .map(m => m.name.replace(/^models\//, ''))
          .sort((a, b) => scoreModel(b) - scoreModel(a))
          .slice(0, 4) // 최대 상위 4개 고속 모델만 시도하여 지연 원천 차단
          .forEach(modelName => {
            if (!discovered.some(d => d.ver === ver && d.model === modelName)) {
              discovered.push({ ver, model: modelName });
            }
          });

        if (discovered.length > 0) break;
      } catch (e) {
        // 타임아웃 또는 오류 시 다음으로 진행
      }
    }
    return { models: discovered };
  }

  /**
   * 2. Gemini API 단일 호출 (Thinking 제어 + 자동 호환 재시도 + 정밀 로깅)
   */
  async function callEndpoint(ver, modelName, prompt, key, maxTokens) {
    const stepStart = performance.now();
    const endpoint = `https://generativelanguage.googleapis.com/${ver}/models/${modelName}:generateContent?key=${encodeURIComponent(key)}`;
    const fastMode = isFastModeEnabled();
    const isProModel = modelName.includes('-pro');
    const isThinkingFlash = /2\.5-flash|3-flash|3\.1-flash|flash-latest/i.test(modelName);

    const buildPayload = (useThinkingConfig) => {
      const p = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: maxTokens || (fastMode && !isProModel ? 350 : 900)
        }
      };
      if (useThinkingConfig && fastMode) {
        if (isThinkingFlash) {
          // 2.5/3.0 Flash 계열의 기본 내부 추론(10~15초 지연 원인)을 0으로 꺼서 1초대 즉시 응답 유도
          p.generationConfig.thinkingConfig = { thinkingBudget: 0 };
        } else if (isProModel && modelName.includes('2.5-pro')) {
          // 2.5 Pro는 최소 추론 예산(128)으로 단축
          p.generationConfig.thinkingConfig = { thinkingBudget: 128 };
        }
      }
      return p;
    };

    console.log(`[GeminiService] 🚀 요청 시작 -> ${ver}/${modelName} (빠른응답:${fastMode})`);

    let res;
    const timeoutMs = isProModel ? 15000 : 7000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const initialPayload = buildPayload(true);
      res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initialPayload),
        signal: controller.signal
      });

      // 만약 특정 프리뷰 모델이 thinkingConfig 파라미터를 거부(400)하면 즉시 순수 페이로드로 재시도
      if (res.status === 400 && initialPayload.generationConfig.thinkingConfig) {
        res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildPayload(false)),
          signal: controller.signal
        });
      }
      clearTimeout(timeoutId);
    } catch (networkErr) {
      clearTimeout(timeoutId);
      const elapsedMs = Math.round(performance.now() - stepStart);
      const isTimeout = networkErr && networkErr.name === 'AbortError';
      console.warn(`[GeminiService] ❌ ${isTimeout ? '타임아웃' : '네트워크 실패'} <- ${ver}/${modelName} (${elapsedMs}ms)`, networkErr);
      return {
        ok: false,
        isNetworkError: !isTimeout,
        isTimeout: isTimeout,
        status: isTimeout ? 408 : 0,
        ver,
        modelName,
        elapsedMs,
        errorInfo: {
          title: isTimeout ? '응답 시간 초과 (Timeout)' : '네트워크 연결 실패 (CORS / 차단)',
          desc: isTimeout ? '해당 모델의 응답이 지연되어 다음 고속 모델로 전환합니다.' : '구글 AI 서버(generativelanguage.googleapis.com)에 접속할 수 없습니다.',
          raw: networkErr.message || 'Failed to fetch',
          action: '인터넷 연결 상태 또는 방화벽을 확인해 주세요.'
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
      const elapsedMs = Math.round(performance.now() - stepStart);
      console.warn(`[GeminiService] ⚠️ HTTP ${res.status} <- ${ver}/${modelName} (${elapsedMs}ms)`, errJson);
      return {
        ok: false,
        status: res.status,
        ver,
        modelName,
        elapsedMs,
        errorInfo: parseGoogleError(res.status, errJson)
      };
    }

    const data = await res.json();
    const elapsedMs = Math.round(performance.now() - stepStart);
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const textPart = parts.find(p => typeof p.text === 'string' && !p.thought) || parts.find(p => typeof p.text === 'string');
    const text = textPart?.text || '';
    console.log(`[GeminiService] ✅ 응답 완료 <- ${ver}/${modelName} (${elapsedMs}ms / ${(elapsedMs / 1000).toFixed(2)}s)`);
    return {
      ok: true,
      status: 200,
      ver,
      modelName,
      elapsedMs,
      text: text.trim()
    };
  }

  /**
   * 3. 404 완벽 방지: 캐시된 모델(구형 제외) -> 고속 후보군 직행 -> 실시간 ListModels 동적 탐색 폴백
   */
  async function generateTextSmart(prompt, apiKey) {
    const totalStart = performance.now();
    const attemptLogs = [];
    const finalizeResult = (resultObj) => {
      const totalElapsedMs = Math.round(performance.now() - totalStart);
      const totalElapsedSec = (totalElapsedMs / 1000).toFixed(2);
      resultObj.totalElapsedMs = totalElapsedMs;
      resultObj.totalElapsedSec = totalElapsedSec;
      resultObj.attemptLogs = attemptLogs;
      console.log(`[GeminiService] ⏱️ 총 소요시간: ${totalElapsedSec}초 (${totalElapsedMs}ms) | 시도 내역:`, attemptLogs.join(' -> '));
      return resultObj;
    };

    const key = (apiKey || getApiKey() || '').trim().replace(/^["']|["']$/g, '').trim();
    if (!key) {
      return finalizeResult({
        ok: false,
        errorInfo: {
          title: 'API 키 필요',
          desc: 'Google Gemini API 키가 아직 등록되지 않았습니다.',
          action: '상단 [🤖 AI 키 설정] 또는 퀴즈 탭에서 API 키를 등록해 주세요.'
        }
      });
    }

    const selectedModel = getSelectedModel();
    let firstNon404Error = null;
    let lastError = null;

    // A. 사용자가 지정한 모델(디폴트: gemini-2.5-flash)이 'auto'가 아니면 해당 모델을 최우선 1순위로 즉시 호출!
    if (selectedModel && selectedModel !== 'auto') {
      const res = await callEndpoint('v1beta', selectedModel, prompt, key);
      attemptLogs.push(`v1beta/${selectedModel}[선택]:${res.status}(${res.elapsedMs}ms)`);
      if (res.ok) {
        try {
          localStorage.setItem(CACHED_MODEL_KEY, JSON.stringify({ ver: 'v1beta', model: selectedModel }));
        } catch (e) {}
        return finalizeResult(res);
      }
      lastError = res;
      if (res.status !== 404 && !firstNon404Error) {
        firstNon404Error = res;
      }
      if (res.status === 400 || res.status === 403 || res.isNetworkError) {
        return finalizeResult(res);
      }
    } else {
      // 'auto' 모드일 때만 캐시 모델 확인
      let cached = null;
      try {
        cached = JSON.parse(localStorage.getItem(CACHED_MODEL_KEY) || 'null');
      } catch (e) {}

      if (cached && cached.ver && cached.model && !/1\.5|gemini-pro$/i.test(cached.model)) {
        const res = await callEndpoint(cached.ver, cached.model, prompt, key);
        attemptLogs.push(`${cached.ver}/${cached.model}[캐시]:${res.status}(${res.elapsedMs}ms)`);
        if (res.ok) return finalizeResult(res);
        localStorage.removeItem(CACHED_MODEL_KEY);
      }
    }

    // B. 선택된 모델이 실패(404/429 등)했거나 'auto' 모드인 경우 후보군 순차 폴백
    for (const cand of CANDIDATE_ENDPOINTS) {
      if (selectedModel !== 'auto' && cand.model === selectedModel) continue;
      const res = await callEndpoint(cand.ver, cand.model, prompt, key);
      attemptLogs.push(`${cand.ver}/${cand.model}:${res.status}(${res.elapsedMs}ms)`);
      if (res.ok) {
        try {
          localStorage.setItem(CACHED_MODEL_KEY, JSON.stringify({ ver: cand.ver, model: cand.model }));
        } catch (e) {}
        return finalizeResult(res);
      }

      lastError = res;
      if (res.status !== 404 && !firstNon404Error) {
        firstNon404Error = res;
      }
      if (res.status === 400 || res.status === 403 || res.isNetworkError) {
        return finalizeResult(res);
      }
    }

    // C. 기본 후보군이 모두 실패한 경우에만 ListModels 동적 탐색 수행
    const listStart = performance.now();
    const discoveryResult = await fetchAvailableModels(key);
    attemptLogs.push(`ListModels(${Math.round(performance.now() - listStart)}ms)`);
    if (discoveryResult && discoveryResult.authError) {
      return finalizeResult(discoveryResult.authError);
    }

    if (discoveryResult && Array.isArray(discoveryResult.models)) {
      for (const cand of discoveryResult.models) {
        if (CANDIDATE_ENDPOINTS.some(c => c.ver === cand.ver && c.model === cand.model)) continue;
        const res = await callEndpoint(cand.ver, cand.model, prompt, key);
        attemptLogs.push(`${cand.ver}/${cand.model}[탐색]:${res.status}(${res.elapsedMs}ms)`);
        if (res.ok) {
          try {
            localStorage.setItem(CACHED_MODEL_KEY, JSON.stringify({ ver: cand.ver, model: cand.model }));
          } catch (e) {}
          return finalizeResult(res);
        }
        lastError = res;
        if (res.status !== 404 && !firstNon404Error) {
          firstNon404Error = res;
        }
      }
    }

    return finalizeResult(firstNon404Error || lastError || {
      ok: false,
      status: 404,
      errorInfo: {
        title: '지원되는 Gemini 모델을 찾을 수 없습니다 (404)',
        desc: '구글 AI Studio 계정의 사용 가능 모델을 탐색하지 못했습니다.',
        action: 'Google AI Studio(aistudio.google.com)에서 새로운 API 키를 발급받아 등록해 주세요.'
      }
    });
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

            <div class="gemini-input-group" style="margin-top:0.75rem;">
              <label for="geminiModelSelect">AI 모델 선택 (모델별 예상 응답속도 표기):</label>
              <select id="geminiModelSelect" style="width:100%; padding:0.65rem 0.75rem; border-radius:10px; background:#0f172a; color:#f8fafc; border:1px solid rgba(148,163,184,0.3); font-size:0.86rem; font-weight:600; margin-top:0.35rem;">
                ${SELECTABLE_MODELS.map(m => `<option value="${m.id}">${m.label}</option>`).join('')}
              </select>
              <div id="geminiModelSpeedHint" style="margin-top:0.4rem; padding:0.45rem 0.65rem; border-radius:8px; background:rgba(56,189,248,0.1); border:1px solid rgba(56,189,248,0.25); font-size:0.78rem; color:#7dd3fc; line-height:1.4;"></div>
              <label style="display:flex; align-items:center; gap:0.5rem; margin-top:0.55rem; font-size:0.82rem; color:#bae6fd; cursor:pointer;">
                <input type="checkbox" id="geminiFastModeToggle" checked style="width:16px; height:16px; accent-color:#38bdf8;" />
                <span>⚡ <strong>빠른 응답 모드 (내부 Thinking 생략)</strong> — 15초 추론 대기를 1~2초로 단축</span>
              </label>
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
      const modelSelect = document.getElementById('geminiModelSelect');
      const modelSpeedHint = document.getElementById('geminiModelSpeedHint');
      const fastModeToggle = document.getElementById('geminiFastModeToggle');

      const updateSpeedHint = () => {
        if (!modelSpeedHint || !modelSelect) return;
        const found = SELECTABLE_MODELS.find(m => m.id === modelSelect.value) || SELECTABLE_MODELS[0];
        modelSpeedHint.textContent = found.desc || '';
      };

      if (modelSelect) {
        modelSelect.addEventListener('change', () => {
          setSelectedModel(modelSelect.value);
          updateSpeedHint();
        });
      }
      if (fastModeToggle) {
        fastModeToggle.addEventListener('change', () => {
          setFastModeEnabled(fastModeToggle.checked);
        });
      }

      testBtn.addEventListener('click', async () => {
        if (modelSelect) setSelectedModel(modelSelect.value);
        if (fastModeToggle) setFastModeEnabled(fastModeToggle.checked);
        const inputKey = keyInput.value.trim();
        if (!inputKey) {
          resultBox.style.display = 'block';
          resultBox.className = 'gemini-test-result-box result-error';
          resultBox.innerHTML = `⚠️ API 키를 먼저 입력해 주세요.`;
          return;
        }

        resultBox.style.display = 'block';
        resultBox.className = 'gemini-test-result-box result-loading';
        const uiStart = performance.now();
        resultBox.innerHTML = `⏳ 구글 AI 서버 모델 탐색 및 연결 확인 중... (<strong>0.0초</strong> 경과)`;
        const liveTimer = setInterval(() => {
          const sec = ((performance.now() - uiStart) / 1000).toFixed(1);
          resultBox.innerHTML = `⏳ 구글 AI 서버 모델 탐색 및 연결 확인 중... (<strong>${sec}초</strong> 경과)`;
        }, 100);

        const res = await testConnection(inputKey);
        clearInterval(liveTimer);
        const traceHtml = Array.isArray(res.attemptLogs) && res.attemptLogs.length > 0
          ? `<div class="result-raw" style="margin-top:6px; font-size:0.75rem; opacity:0.85;">📋 호출 로그: ${res.attemptLogs.join(' ➔ ')}</div>`
          : '';

        if (res.ok) {
          resultBox.className = 'gemini-test-result-box result-success';
          resultBox.innerHTML = `
            <div class="result-title">✅ 구글 AI 서버 연결 완벽 성공! (⏱️ ${res.totalElapsedSec}초 / ${res.totalElapsedMs}ms)</div>
            <div class="result-detail">연결된 모델: <code>${res.ver}/${res.modelName}</code></div>
            <div class="result-quote">" ${res.text} "</div>
            ${traceHtml}
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
            <div class="result-title">❌ ${info.title} (⏱️ ${res.totalElapsedSec || '0.00'}초)</div>
            <div class="result-detail">${info.desc}</div>
            ${info.raw ? `<div class="result-raw">상세 오류: ${info.raw}</div>` : ''}
            ${traceHtml}
            <div class="result-action">💡 해결 방법: ${info.action}</div>
          `;
        }
      });

      saveBtn.addEventListener('click', () => {
        const inputKey = keyInput.value.trim();
        if (modelSelect) setSelectedModel(modelSelect.value);
        if (fastModeToggle) setFastModeEnabled(fastModeToggle.checked);
        setApiKey(inputKey);
        if (inputKey) {
          alert(`🔑 API 키 및 모델(${getSelectedModel()}) 설정이 저장되었습니다!\n이제 원소 상세 [🤖 AI 꿀팁]과 퀴즈에서 AI 기능을 사용하실 수 있습니다.`);
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

    // 모달 열 때 현재 키 및 선택된 모델/빠른응답 값 채우기
    const keyInput = document.getElementById('geminiModalKeyInput');
    if (keyInput) {
      keyInput.value = getApiKey();
    }
    const modelSelect = document.getElementById('geminiModelSelect');
    const modelSpeedHint = document.getElementById('geminiModelSpeedHint');
    if (modelSelect) {
      modelSelect.value = getSelectedModel();
      if (modelSpeedHint) {
        const found = SELECTABLE_MODELS.find(m => m.id === modelSelect.value) || SELECTABLE_MODELS[0];
        modelSpeedHint.textContent = found.desc || '';
      }
    }
    const fastModeToggle = document.getElementById('geminiFastModeToggle');
    if (fastModeToggle) {
      fastModeToggle.checked = isFastModeEnabled();
    }
    const resultBox = document.getElementById('geminiTestResultBox');
    if (resultBox) {
      resultBox.style.display = 'none';
    }
    modalOverlay.style.display = 'flex';
  }

  window.GeminiService = {
    getApiKey,
    setApiKey,
    getSelectedModel,
    setSelectedModel,
    isFastModeEnabled,
    setFastModeEnabled,
    SELECTABLE_MODELS,
    testConnection,
    getElementTip,
    getQuizExplanation,
    showApiKeyModal
  };
})();
