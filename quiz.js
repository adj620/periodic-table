/**
 * 대화형 원소 퀴즈 시스템 (Interactive Periodic Table Quiz Suite)
 * - 118개 원소 데이터를 기반으로 무한 자동 생성되는 4지선다형 퀴즈 엔진
 * - 초급/중급/고급/포토 퀴즈, 콤보 점수, 오답 노트, 해설 모달 및 LLM 확장 인터페이스 지원
 */

const QUIZ_MODES = {
  random: { id: 'random', title: '🎲 랜덤 종합 챌린지', desc: '모든 유형의 문제가 섞여 출제되는 10문제 정복 챌린지' },
  symbol_to_name: { id: 'symbol_to_name', title: '🔤 기호 ➔ 이름 맞추기', desc: '원소 기호를 보고 올바른 한글 원소명을 고르세요.' },
  name_to_symbol: { id: 'name_to_symbol', title: '🏷️ 이름 ➔ 기호 맞추기', desc: '원소 이름(이명)을 보고 올바른 원소 기호를 고르세요.' },
  number_to_name: { id: 'number_to_name', title: '🔢 원자번호 맞추기', desc: '원자번호를 보고 해당하는 원소를 맞추세요.' },
  usage_to_name: { id: 'usage_to_name', title: '🔋 실생활 용도 & 대표물건', desc: '실생활 대표 물건과 활용처를 보고 원소를 맞추세요.' },
  photo_to_name: { id: 'photo_to_name', title: '📸 실제 사진 표본 퀴즈', desc: '118개 원소의 실제 표본 사진을 보고 원소를 맞추세요.' }
};

let quizState = {
  currentMode: 'random',
  questions: [],
  currentIndex: 0,
  score: 0,
  combo: 0,
  maxCombo: 0,
  wrongAnswers: [],
  isAnswered: false,
  isTimeAttack: localStorage.getItem('periodic_quiz_time_attack') !== 'false', // 기본값: 타임어택 켜짐
  isSoundEnabled: localStorage.getItem('periodic_quiz_sound_enabled') !== 'false', // 기본값: 사운드 켜짐
  timerSeconds: 15,
  timeLeft: 15,
  timerInterval: null,
  totalQuestions: 10
};

// Web Audio API 사운드 합성기 (외부 파일 없이 브라우저 내장 생성)
let quizAudioCtx = null;

function getQuizAudioContext() {
  if (!quizAudioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      quizAudioCtx = new AudioCtx();
    }
  }
  if (quizAudioCtx && quizAudioCtx.state === 'suspended') {
    quizAudioCtx.resume();
  }
  return quizAudioCtx;
}

function playQuizSound(type) {
  if (!quizState.isSoundEnabled) return;
  try {
    const ctx = getQuizAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (type === 'correct') {
      // 맑고 경쾌한 도-솔 화음 (C5: 523Hz -> G5: 784Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.12);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'wrong') {
      // 둔탁한 저음 버저 (180Hz -> 130Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(130, now + 0.22);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'finish') {
      // 승리의 팡파레 (도-미-솔-높은도)
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);
        gain.gain.setValueAtTime(0.22, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.3);
      });
    }
  } catch (e) {
    // 오디오 컨텍스트 미지원 환경 무시
  }
}

function triggerQuizHaptic(type) {
  if (!('vibrate' in navigator)) return;
  try {
    if (type === 'correct') {
      navigator.vibrate(30);
    } else if (type === 'wrong') {
      navigator.vibrate([40, 45, 40]);
    } else if (type === 'finish') {
      navigator.vibrate([40, 50, 40, 50, 80]);
    }
  } catch (e) {}
}

function getQuizContainer() {
  return document.getElementById('gameSuiteContent') || document.getElementById('quizContainer');
}

function initQuiz() {
  const container = getQuizContainer();
  if (!container) return;

  renderQuizLobby();
}

/**
 * 1. 퀴즈 로비 화면 렌더링 (모드 선택 및 최고 점수)
 */
function renderQuizLobby() {
  stopQuestionTimer();
  const container = getQuizContainer();
  if (!container) return;

  const highScore = localStorage.getItem('periodic_quiz_high_score') || 0;

  container.innerHTML = `
    <div class="quiz-lobby-card">
      <div class="quiz-lobby-header">
        <span class="quiz-badge-icon">🎯</span>
        <h2 class="quiz-main-title">원소 주기율표 대화형 퀴즈</h2>
        <p class="quiz-sub-desc">118개 화학 원소의 기호, 원자번호, 실생활 대표 물건, 실제 표본 사진을 마스터해 보세요!</p>
        <div class="quiz-high-score-banner">
          <span>🏆 나의 최고 점수: <strong>${highScore}점</strong></span>
        </div>
      </div>

      <!-- 퀴즈 환경 설정 바 (타임어택 & 사운드/진동 피드백) -->
      <div class="timeattack-setting-box">
        <label class="timeattack-label" for="timeAttackToggle">
          <input type="checkbox" id="timeAttackToggle" ${quizState.isTimeAttack ? 'checked' : ''} />
          <span class="timeattack-text-wrap">
            <strong>⏱️ 타임어택 모드 (문제당 15초 카운트다운 제한)</strong>
            <small>정답 시 남은 초에 따라 최대 +150점의 스피드 보너스 점수가 가산됩니다.</small>
          </span>
        </label>
      </div>

      <div class="timeattack-setting-box" style="margin-top: 0.5rem;">
        <label class="timeattack-label" for="soundToggle">
          <input type="checkbox" id="soundToggle" ${quizState.isSoundEnabled ? 'checked' : ''} />
          <span class="timeattack-text-wrap">
            <strong>🔊 오디오 효과음 & 모바일 햅틱 진동</strong>
            <small>정답, 오답, 콤보 사운드 및 단말기 미세 진동 피드백을 활성화합니다.</small>
          </span>
        </label>
      </div>

      <div class="quiz-mode-selection">
        <h3>도전할 퀴즈 모드를 선택하세요</h3>
        <div class="quiz-mode-grid">
          ${Object.values(QUIZ_MODES).map(mode => `
            <div class="quiz-mode-card ${quizState.currentMode === mode.id ? 'active' : ''}" data-mode="${mode.id}">
              <div class="mode-card-header">
                <span class="mode-title">${mode.title}</span>
              </div>
              <p class="mode-desc">${mode.desc}</p>
              <button class="mode-start-btn">도전하기 ▶</button>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- LLM 확장 인터페이스 안내 배너 -->
      <div class="llm-extension-box">
        <div class="llm-icon-title">
          <span>🤖 AI 심화 해설 모드 (선택 사항)</span>
        </div>
        <p>기본 퀴즈는 내장된 118개 원소 데이터베이스로 완전하게 무한 출제됩니다. Gemini API 키를 등록하면 AI가 퀴즈 해설과 원소 암기 팁을 실시간으로 더 친절하게 설명해 줍니다.</p>
        <div class="llm-key-input-row">
          <input type="password" id="geminiApiKeyInput" placeholder="Google Gemini API Key (AIzaSy...) 입력..." value="${window.GeminiService ? window.GeminiService.getApiKey() : (localStorage.getItem('gemini_api_key') || '')}" />
          <button id="testApiKeyBtn" class="pill-btn" style="background:#334155; border:1px solid #475569; color:#f1f5f9;">🔍 연결 테스트</button>
          <button id="saveApiKeyBtn" class="pill-btn" style="background:#0284c7; color:#fff;">💾 저장</button>
        </div>
        <div id="quizLlmTestResult" style="display:none; margin-top:0.6rem; font-size:0.85rem; padding:0.6rem; border-radius:6px; line-height:1.4;"></div>
      </div>
    </div>
  `;

  // 타임어택 토글 이벤트
  const timeAttackToggle = document.getElementById('timeAttackToggle');
  if (timeAttackToggle) {
    timeAttackToggle.addEventListener('change', (e) => {
      quizState.isTimeAttack = e.target.checked;
      localStorage.setItem('periodic_quiz_time_attack', e.target.checked ? 'true' : 'false');
    });
  }

  // 효과음 & 햅틱 토글 이벤트
  const soundToggle = document.getElementById('soundToggle');
  if (soundToggle) {
    soundToggle.addEventListener('change', (e) => {
      quizState.isSoundEnabled = e.target.checked;
      localStorage.setItem('periodic_quiz_sound_enabled', e.target.checked ? 'true' : 'false');
      if (e.target.checked) playQuizSound('correct');
    });
  }

  // 모드 선택 이벤트
  const modeCards = container.querySelectorAll('.quiz-mode-card');
  modeCards.forEach(card => {
    card.addEventListener('click', () => {
      const modeId = card.dataset.mode;
      startQuizRound(modeId);
    });
  });

  const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
  const testApiKeyBtn = document.getElementById('testApiKeyBtn');
  const apiKeyInput = document.getElementById('geminiApiKeyInput');
  const quizTestResult = document.getElementById('quizLlmTestResult');

  if (testApiKeyBtn && apiKeyInput && quizTestResult) {
    testApiKeyBtn.addEventListener('click', async () => {
      const key = apiKeyInput.value.trim();
      if (!key) {
        quizTestResult.style.display = 'block';
        quizTestResult.style.background = 'rgba(239, 68, 68, 0.15)';
        quizTestResult.style.border = '1px solid #ef4444';
        quizTestResult.style.color = '#fca5a5';
        quizTestResult.innerHTML = '⚠️ API 키를 먼저 입력해 주세요.';
        return;
      }

      quizTestResult.style.display = 'block';
      quizTestResult.style.background = 'rgba(14, 165, 233, 0.15)';
      quizTestResult.style.border = '1px solid #0284c7';
      quizTestResult.style.color = '#7dd3fc';
      quizTestResult.innerHTML = '⏳ 구글 AI 서버와 연결 확인 중...';

      if (window.GeminiService) {
        const res = await window.GeminiService.testConnection(key);
        if (res.ok) {
          quizTestResult.style.background = 'rgba(34, 197, 94, 0.15)';
          quizTestResult.style.border = '1px solid #22c55e';
          quizTestResult.style.color = '#86efac';
          const traceStr = Array.isArray(res.attemptLogs) && res.attemptLogs.length > 0
            ? `<br><small style="opacity:0.8; font-family:monospace;">📋 로그: ${res.attemptLogs.join(' ➔ ')}</small>`
            : '';
          quizTestResult.innerHTML = `<strong>✅ 연결 성공! (${res.modelName} · ⏱️ ${res.totalElapsedSec || '0.0'}초)</strong><br>AI 응답: "${res.text}"${traceStr}`;
          window.GeminiService.setApiKey(key);
        } else {
          quizTestResult.style.background = 'rgba(239, 68, 68, 0.15)';
          quizTestResult.style.border = '1px solid #ef4444';
          quizTestResult.style.color = '#fca5a5';
          const err = res.errorInfo;
          quizTestResult.innerHTML = `<strong>❌ ${err.title}</strong><br>${err.desc}<br><small style="color:#fef08a;">💡 ${err.action}</small>`;
        }
      }
    });
  }

  if (saveApiKeyBtn && apiKeyInput) {
    saveApiKeyBtn.addEventListener('click', () => {
      const key = apiKeyInput.value.trim();
      if (window.GeminiService) {
        window.GeminiService.setApiKey(key);
      } else {
        if (key) localStorage.setItem('gemini_api_key', key);
        else localStorage.removeItem('gemini_api_key');
      }
      if (key) {
        alert('🔑 API 키가 안전하게 저장되었습니다!\n원소 상세창 [🤖 AI 꿀팁]이나 퀴즈에서 AI 해설을 이용하실 수 있습니다.');
      } else {
        alert('API 키가 삭제되었습니다.');
      }
    });
  }
}

/**
 * 타임어택 카운트다운 타이머 컨트롤러
 */
function startQuestionTimer() {
  stopQuestionTimer();
  if (!quizState.isTimeAttack) return;

  quizState.timeLeft = quizState.timerSeconds;
  updateTimerUI();

  quizState.timerInterval = setInterval(() => {
    quizState.timeLeft--;
    updateTimerUI();

    if (quizState.timeLeft <= 0) {
      stopQuestionTimer();
      handleTimeOut();
    }
  }, 1000);
}

function stopQuestionTimer() {
  if (quizState.timerInterval) {
    clearInterval(quizState.timerInterval);
    quizState.timerInterval = null;
  }
}
window.stopQuestionTimer = stopQuestionTimer;

function updateTimerUI() {
  const timerSecText = document.getElementById('timerSecText');
  const timerBar = document.getElementById('quizTimerBar');
  if (!timerSecText || !timerBar) return;

  timerSecText.textContent = `${quizState.timeLeft}초`;
  const pct = Math.max(0, (quizState.timeLeft / quizState.timerSeconds) * 100);
  timerBar.style.width = `${pct}%`;

  if (quizState.timeLeft <= 5) {
    timerBar.classList.add('urgent');
    timerSecText.classList.add('urgent');
  } else {
    timerBar.classList.remove('urgent');
    timerSecText.classList.remove('urgent');
  }
}

function handleTimeOut() {
  if (quizState.isAnswered) return;
  quizState.isAnswered = true;

  const container = getQuizContainer();
  const choiceBtns = container ? container.querySelectorAll('.quiz-choice-btn') : [];
  const q = quizState.questions[quizState.currentIndex];

  choiceBtns.forEach((btn, idx) => {
    btn.disabled = true;
    if (q.choices[idx].isCorrect) {
      btn.classList.add('correct');
    }
  });

  quizState.combo = 0;
  quizState.wrongAnswers.push({
    question: q,
    userChoice: '⏱️ 시간 초과 (15초 초과)'
  });

  playQuizSound('wrong');
  triggerQuizHaptic('wrong');

  const feedbackBox = document.getElementById('quizFeedbackBox');
  const feedbackTitle = document.getElementById('feedbackTitle');
  const feedbackDesc = document.getElementById('feedbackDesc');

  if (feedbackTitle) {
    feedbackTitle.innerHTML = `<span class="res-wrong">⏱️ 제한 시간(15초) 초과! (+0점)</span>`;
  }
  if (feedbackDesc) {
    feedbackDesc.textContent = `시간 내에 정답을 선택하지 못했습니다. ` + q.explanation;
  }
  if (feedbackBox) {
    feedbackBox.classList.add('active');
  }
}

/**
 * 2. 퀴즈 라운드 시작 (문제 생성 및 초기화)
 */
function startQuizRound(modeId) {
  quizState.currentMode = modeId;
  quizState.currentIndex = 0;
  quizState.score = 0;
  quizState.combo = 0;
  quizState.maxCombo = 0;
  quizState.wrongAnswers = [];
  quizState.isAnswered = false;
  quizState.totalQuestions = 10;

  // 10문제 생성
  quizState.questions = generateQuizQuestions(modeId, quizState.totalQuestions);

  renderQuizQuestionScreen();
}

/**
 * 3. 퀴즈 문제 생성 알고리즘 (정답 1개 + 매력적인 오답 3개)
 */
function generateQuizQuestions(modeId, count = 10) {
  const allElements = Array.from(elementsMap.values());
  const questions = [];

  // 랜덤 셔플
  const shuffled = [...allElements].sort(() => Math.random() - 0.5);
  const selectedElements = shuffled.slice(0, count);

  for (let i = 0; i < count; i++) {
    const target = selectedElements[i];
    let actualType = modeId;
    if (modeId === 'random') {
      const types = ['symbol_to_name', 'name_to_symbol', 'number_to_name', 'usage_to_name', 'photo_to_name'];
      actualType = types[Math.floor(Math.random() * types.length)];
    }

    // 포토 퀴즈인데 사진이 없는 원소면 다른 유형으로 자동 대체
    if (actualType === 'photo_to_name' && !target.photo) {
      actualType = 'usage_to_name';
    }

    // 오답 3개 선별 (같은 카테고리나 비슷한 번호대에서 선별하여 퀄리티 향상)
    const distractors = allElements
      .filter(el => el.atomicNumber !== target.atomicNumber)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const questionData = buildQuestionByType(actualType, target, distractors);
    questions.push(questionData);
  }

  return questions;
}

/**
 * 유형별 문제 데이터 조립
 */
function buildQuestionByType(type, target, distractors) {
  const choices = [target, ...distractors].sort(() => Math.random() - 0.5);

  if (type === 'symbol_to_name') {
    const categoryName = (typeof CATEGORIES !== 'undefined' && CATEGORIES[target.category]?.nameKo) || target.category || '';
    const catText = categoryName ? `(${categoryName}) ` : '';
    return {
      type,
      target,
      prompt: `원소 기호 [ ${target.symbol} ]의 한글 명칭은 무엇일까요?`,
      subPrompt: `원자번호: ${target.atomicNumber}번`,
      choices: choices.map(c => ({
        label: `${c.nameKo} ${c.altNameKo ? `(${c.altNameKo.split('/')[0].trim()})` : ''}`,
        isCorrect: c.atomicNumber === target.atomicNumber
      })),
      explanation: `정답은 [${target.nameKo}]입니다! 기호는 ${target.symbol}, 원자번호는 ${target.atomicNumber}번이며 ${catText}계열입니다.`
    };
  }

  if (type === 'name_to_symbol') {
    return {
      type,
      target,
      prompt: `원소 [ ${target.nameKo} ]의 원소 기호는 무엇일까요?`,
      subPrompt: `영문명: ${target.nameEn}`,
      choices: choices.map(c => ({
        label: `${c.symbol}`,
        sub: `(${c.nameKo})`,
        isCorrect: c.atomicNumber === target.atomicNumber
      })),
      explanation: `정답은 [${target.symbol}]입니다! ${target.nameKo}(${target.nameEn})의 원소 기호는 '${target.symbol}'입니다.`
    };
  }

  if (type === 'number_to_name') {
    return {
      type,
      target,
      prompt: `원자번호 [ ${target.atomicNumber}번 ] 원소는 무엇일까요?`,
      subPrompt: `주기: ${target.period}주기, 족: ${target.group}족`,
      choices: choices.map(c => ({
        label: `${c.nameKo} (${c.symbol})`,
        isCorrect: c.atomicNumber === target.atomicNumber
      })),
      explanation: `정답은 [${target.nameKo} (${target.symbol})]입니다! 원자번호 ${target.atomicNumber}번은 ${target.period}주기 ${target.group}족 원소입니다.`
    };
  }

  if (type === 'usage_to_name') {
    const item = target.item || target.nameKo;
    const icon = target.icon || '🧪';
    return {
      type,
      target,
      prompt: `[ ${icon} ${item} ]에 핵심으로 쓰이는 원소는?`,
      subPrompt: target.usage ? `주요 활용처: ${target.usage}` : `원소 특징: ${target.description}`,
      choices: choices.map(c => ({
        label: `${c.nameKo} (${c.symbol})`,
        isCorrect: c.atomicNumber === target.atomicNumber
      })),
      explanation: `정답은 [${target.nameKo}]입니다! ${target.usage ? target.usage : target.description}`
    };
  }

  // photo_to_name
  return {
    type,
    target,
    photoUrl: target.photo,
    prompt: `아래 실제 표본 사진의 주인공 원소는 무엇일까요?`,
    subPrompt: target.look ? `실물 외형 특성: ${target.look}` : `외형 정보를 관찰해 보세요!`,
    choices: choices.map(c => ({
      label: `${c.nameKo} (${c.symbol})`,
      isCorrect: c.atomicNumber === target.atomicNumber
    })),
    explanation: `정답은 [${target.nameKo} (${target.symbol})]입니다! ${target.look ? target.look : ''}`
  };
}

/**
 * 4. 퀴즈 문제 진행 화면 렌더링
 */
function renderQuizQuestionScreen() {
  const container = getQuizContainer();
  if (!container) return;

  const q = quizState.questions[quizState.currentIndex];
  quizState.isAnswered = false;

  container.innerHTML = `
    <div class="quiz-play-card">
      <!-- 퀴즈 헤더 진행 상황 바 -->
      <div class="quiz-play-header">
        <div class="quiz-progress-info">
          <span class="quiz-step-tag">문제 ${quizState.currentIndex + 1} / ${quizState.totalQuestions}</span>
          <div class="quiz-progress-track">
            <div class="quiz-progress-bar" style="width: ${((quizState.currentIndex) / quizState.totalQuestions) * 100}%;"></div>
          </div>
        </div>

        <div class="quiz-score-stats">
          <span class="score-display">점수: <strong>${quizState.score}</strong></span>
          ${quizState.combo > 1 ? `<span class="combo-badge">🔥 ${quizState.combo} 콤보!</span>` : ''}
          <button id="exitQuizBtn" class="quiz-exit-btn" title="퀴즈 나가기">✕ 로비로</button>
        </div>
      </div>

      <!-- 타임어택 카운트다운 타이머 게이지 (타임어택 모드 활성화 시) -->
      ${quizState.isTimeAttack ? `
        <div class="quiz-timer-container">
          <div class="quiz-timer-header">
            <span class="timer-badge">⏱️ 남은 시간</span>
            <span id="timerSecText" class="timer-countdown">${quizState.timerSeconds}초</span>
          </div>
          <div class="quiz-timer-track">
            <div id="quizTimerBar" class="quiz-timer-bar" style="width: 100%;"></div>
          </div>
        </div>
      ` : ''}

      <!-- 문제 영역 -->
      <div class="quiz-question-box">
        ${q.photoUrl ? `
          <div class="quiz-photo-display">
            <img src="${q.photoUrl}" alt="원소 표본" class="quiz-specimen-img" />
          </div>
        ` : ''}
        <h3 class="quiz-question-text">${q.prompt}</h3>
        ${q.subPrompt ? `<p class="quiz-question-hint">${q.subPrompt}</p>` : ''}
      </div>

      <!-- 4지선다 보기 버튼 목록 -->
      <div class="quiz-choices-grid">
        ${q.choices.map((choice, idx) => `
          <button class="quiz-choice-btn" data-choice-idx="${idx}">
            <span class="choice-num">${idx + 1}</span>
            <span class="choice-label">${choice.label}</span>
          </button>
        `).join('')}
      </div>

      <!-- 결과 피드백 및 다음 문제 버튼 (답변 후에만 active 클래스로 표시) -->
      <div id="quizFeedbackBox" class="quiz-feedback-box">
        <div class="feedback-content">
          <div id="feedbackTitle" class="feedback-title"></div>
          <p id="feedbackDesc" class="feedback-desc"></p>
        </div>
        <button id="quizNextBtn" class="action-btn primary quiz-next-btn">
          ${quizState.currentIndex === quizState.totalQuestions - 1 ? '결과 확인하기 🏆' : '다음 문제 ▶'}
        </button>
      </div>
    </div>
  `;

  // 문제 타이머 가동
  startQuestionTimer();

  // 화면 전환 직후 이전 클릭/터치가 새 버튼을 누르는 클릭 관통(Ghost Click) 방지 (300ms 쿨다운)
  quizState.isAnswered = true;
  setTimeout(() => {
    quizState.isAnswered = false;
  }, 300);

  // 보기 클릭 이벤트
  const choiceBtns = container.querySelectorAll('.quiz-choice-btn');
  choiceBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (quizState.isAnswered) return;
      const idx = parseInt(btn.dataset.choiceIdx, 10);
      handleChoiceSelect(idx, choiceBtns);
    });
  });

  const nextBtn = document.getElementById('quizNextBtn');
  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      stopQuestionTimer();
      if (quizState.currentIndex < quizState.totalQuestions - 1) {
        quizState.currentIndex++;
        renderQuizQuestionScreen();
      } else {
        renderQuizResultScreen();
      }
    });
  }

  const exitBtn = document.getElementById('exitQuizBtn');
  if (exitBtn) {
    exitBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      stopQuestionTimer();
      if (confirm('진행 중인 퀴즈를 종료하고 로비로 돌아갈까요?')) {
        renderQuizLobby();
      }
    });
  }
}

/**
 * 5. 보기 선택 및 정답 채점
 */
function handleChoiceSelect(selectedIdx, choiceBtns) {
  if (quizState.isAnswered) return;
  quizState.isAnswered = true;
  stopQuestionTimer();

  const q = quizState.questions[quizState.currentIndex];
  const selectedChoice = q.choices[selectedIdx];
  const feedbackBox = document.getElementById('quizFeedbackBox');
  const feedbackTitle = document.getElementById('feedbackTitle');
  const feedbackDesc = document.getElementById('feedbackDesc');

  choiceBtns.forEach((btn, idx) => {
    btn.disabled = true;
    if (q.choices[idx].isCorrect) {
      btn.classList.add('correct');
    }
  });

  if (selectedChoice.isCorrect) {
    // 정답 처리 (스피드 보너스 반영)
    choiceBtns[selectedIdx].classList.add('correct');
    quizState.combo++;
    if (quizState.combo > quizState.maxCombo) {
      quizState.maxCombo = quizState.combo;
    }
    const comboBonus = (quizState.combo - 1) * 20;
    const timeBonus = quizState.isTimeAttack ? Math.max(0, quizState.timeLeft * 10) : 0;
    const earned = 100 + comboBonus + timeBonus;
    quizState.score += earned;

    playQuizSound('correct');
    triggerQuizHaptic('correct');

    const bonusTxt = (timeBonus > 0) ? ` (스피드 +${timeBonus}점)` : '';
    feedbackTitle.innerHTML = `<span class="res-correct">🎉 정답입니다! (+${earned}점${bonusTxt})</span>`;
    feedbackDesc.textContent = q.explanation;
  } else {
    // 오답 처리
    choiceBtns[selectedIdx].classList.add('wrong');
    quizState.combo = 0;
    quizState.wrongAnswers.push({
      question: q,
      userChoice: selectedChoice.label
    });

    playQuizSound('wrong');
    triggerQuizHaptic('wrong');

    feedbackTitle.innerHTML = `<span class="res-wrong">❌ 아쉽네요, 틀렸습니다!</span>`;
    feedbackDesc.textContent = q.explanation;
  }

  if (feedbackBox) {
    feedbackBox.classList.add('active');
  }

  // LLM API 키가 등록되어 있으면 백그라운드로 AI 팁 보강 요청 가능
  const apiKey = localStorage.getItem('gemini_api_key');
  if (apiKey && feedbackDesc) {
    fetchGeminiExplanation(q.target, feedbackDesc, apiKey);
  }
}

/**
 * 6. 퀴즈 최종 결과 화면 렌더링
 */
function renderQuizResultScreen() {
  stopQuestionTimer();
  playQuizSound('finish');
  triggerQuizHaptic('finish');
  const container = getQuizContainer();
  if (!container) return;

  const correctCount = quizState.totalQuestions - quizState.wrongAnswers.length;
  const accuracy = Math.round((correctCount / quizState.totalQuestions) * 100);

  // 최고 점수 갱신
  const prevHigh = parseInt(localStorage.getItem('periodic_quiz_high_score') || '0', 10);
  let isNewHigh = false;
  if (quizState.score > prevHigh) {
    localStorage.setItem('periodic_quiz_high_score', quizState.score.toString());
    isNewHigh = true;
  }

  let grade = 'D';
  let gradeColor = '#94a3b8';
  let gradeMsg = '조금 더 복습해 보세요!';
  if (accuracy === 100) {
    grade = 'S';
    gradeColor = '#facc15';
    gradeMsg = '완벽합니다! 당신은 진정한 원소 주기율표 마스터!';
  } else if (accuracy >= 80) {
    grade = 'A';
    gradeColor = '#38bdf8';
    gradeMsg = '훌륭한 실력입니다! 대부분의 원소를 정확히 알고 계시네요.';
  } else if (accuracy >= 60) {
    grade = 'B';
    gradeColor = '#4ade80';
    gradeMsg = '좋습니다! 조금만 더 다듬으면 마스터가 될 수 있어요.';
  } else if (accuracy >= 40) {
    grade = 'C';
    gradeColor = '#fb923c';
    gradeMsg = '기본기는 갖추셨네요. 틀린 원소를 다시 확인해 보세요!';
  }

  container.innerHTML = `
    <div class="quiz-result-card">
      <div class="result-header">
        <span class="result-trophy">🏆</span>
        <h2>퀴즈 결과 리포트</h2>
        <p class="result-grade-sub" style="color:${gradeColor};">${gradeMsg}</p>
      </div>

      <div class="result-score-overview">
        <div class="grade-badge" style="border-color:${gradeColor}; color:${gradeColor};">
          <span class="grade-letter">${grade}</span>
          <span class="grade-lbl">등급</span>
        </div>
        <div class="score-details-list">
          <div class="score-row">
            <span>최종 점수:</span>
            <strong>${quizState.score}점 ${isNewHigh ? '🎉 신기록!' : ''}</strong>
          </div>
          <div class="score-row">
            <span>정답 수:</span>
            <strong>${correctCount} / ${quizState.totalQuestions} 문제 (${accuracy}%)</strong>
          </div>
          <div class="score-row">
            <span>최대 연속 콤보:</span>
            <strong>${quizState.maxCombo} 콤보</strong>
          </div>
        </div>
      </div>

      ${quizState.wrongAnswers.length > 0 ? `
        <div class="wrong-answers-review-box">
          <h3>📌 오답 노트 (${quizState.wrongAnswers.length}개)</h3>
          <div class="wrong-items-list">
            ${quizState.wrongAnswers.map((w, i) => `
              <div class="wrong-item-card">
                <div class="wrong-item-header">
                  <strong>${i + 1}. ${w.question.prompt}</strong>
                </div>
                <div class="wrong-item-body">
                  <span class="wrong-pick">내가 고른 답: ${w.userChoice}</span>
                  <p class="correct-exp">${w.question.explanation}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : `
        <div class="all-correct-congrats">
          ✨ 모든 문제를 한 번에 맞추셨습니다! 오답이 없습니다.
        </div>
      `}

      <div class="result-actions-row">
        ${quizState.wrongAnswers.length > 0 ? `
          <button id="retryWrongOnlyBtn" class="action-btn" style="background:#f59e0b; color:#000; font-weight:800;">오답만 다시 풀기 ✏️ (${quizState.wrongAnswers.length}문제)</button>
        ` : ''}
        <button id="retryQuizBtn" class="action-btn primary">새 퀴즈 도전 🔄</button>
        <button id="backToLobbyBtn" class="action-btn secondary">퀴즈 로비로 🏠</button>
      </div>
    </div>
  `;

  const retryWrongBtn = document.getElementById('retryWrongOnlyBtn');
  const retryBtn = document.getElementById('retryQuizBtn');
  const lobbyBtn = document.getElementById('backToLobbyBtn');

  if (retryWrongBtn) {
    retryWrongBtn.addEventListener('click', () => {
      const wrongQuestions = quizState.wrongAnswers.map(w => w.question);
      quizState.questions = wrongQuestions;
      quizState.totalQuestions = wrongQuestions.length;
      quizState.currentIndex = 0;
      quizState.score = 0;
      quizState.combo = 0;
      quizState.maxCombo = 0;
      quizState.wrongAnswers = [];
      quizState.isAnswered = false;
      renderQuizQuestionScreen();
    });
  }

  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      startQuizRound(quizState.currentMode);
    });
  }

  if (lobbyBtn) {
    lobbyBtn.addEventListener('click', () => {
      renderQuizLobby();
    });
  }
}

/**
 * 7. Gemini API 연동 심화 해설 보강 (선택적 기능)
 */
async function fetchGeminiExplanation(element, targetEl, apiKey) {
  try {
    if (window.GeminiService) {
      const res = await window.GeminiService.getQuizExplanation(element);
      if (res.ok && res.text) {
        const aiTipBox = document.createElement('div');
        aiTipBox.className = 'ai-explanation-bubble';
        aiTipBox.innerHTML = `<strong>💡 AI 선생님 팁 (${res.modelName || 'Gemini'}):</strong> ${res.text}`;
        targetEl.appendChild(aiTipBox);
      }
    }
  } catch (err) {
    console.warn('AI 해설 조회 실패 (오프라인/네트워크):', err);
  }
}
