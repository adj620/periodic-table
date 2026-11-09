/**
 * 🎮 원소 종합 게임 스위트 (Periodic Table Game Suite)
 * - 🎯 1. 원소 4지선다 퀴즈 (Quiz Master + 무한 서바이벌 모드)
 * - 🃏 2. 원소 카드 짝맞추기 기억력 퍼즐 (Memory Match Flip Game)
 * - 🧩 3. 주기율표 빈칸 채우기 퍼즐 (Table Placement Puzzle)
 * - ⚗️ 4. 원소 연금술사 - 화합물 합성 실험실 (Compound Alchemy Lab)
 * - 외부 인터넷/브라우저 없이 100% 로컬 동작, Web Audio API 효과음 & 모바일 햅틱 내장
 */

// 전역 게임 상태 관리자
let activeGameTab = 'quiz'; // 'quiz' | 'memory' | 'puzzle' | 'alchemy'

// 사운드 합성 및 햅틱 진동은 core_utils.js의 window.AppAudio 싱글톤(playSoundEffect / triggerHaptic)을 공유합니다.

/**
 * 게임 메인 컨테이너 초기화 및 상단 탭 렌더링
 * - 이미 초기화된 상태(force === false)라면 탭 전환 시 기존 게임 진행 상태를 그대로 유지합니다.
 */
window.initGameSuite = function(force = false) {
  const container = document.getElementById('quizContainer');
  if (!container) return;

  if (!force && container.querySelector('.game-suite-wrapper') && document.getElementById('gameSuiteContent')) {
    // 카드 짝맞추기 진행 중에 다른 탭에 갔다가 돌아온 경우 타이머 재개
    if (
      activeGameTab === 'memory' &&
      document.getElementById('memoryTimerText') &&
      !memoryGameState.timerInterval &&
      memoryGameState.matchedPairs < memoryGameState.totalPairs
    ) {
      resumeMemoryTimer();
    }
    return;
  }

  container.innerHTML = `
    <div class="game-suite-wrapper">
      <!-- 게임 스위트 상단 통합 탭 네비게이션 -->
      <nav class="game-suite-nav">
        <button class="game-nav-tab ${activeGameTab === 'quiz' ? 'active' : ''}" data-game="quiz">
          <span class="game-tab-icon">🎯</span>
          <span class="game-tab-text">4지선다 퀴즈</span>
        </button>
        <button class="game-nav-tab ${activeGameTab === 'memory' ? 'active' : ''}" data-game="memory">
          <span class="game-tab-icon">🃏</span>
          <span class="game-tab-text">카드 짝맞추기</span>
        </button>
        <button class="game-nav-tab ${activeGameTab === 'puzzle' ? 'active' : ''}" data-game="puzzle">
          <span class="game-tab-icon">🧩</span>
          <span class="game-tab-text">주기율표 퍼즐</span>
        </button>
        <button class="game-nav-tab ${activeGameTab === 'alchemy' ? 'active' : ''}" data-game="alchemy">
          <span class="game-tab-icon">⚗️</span>
          <span class="game-tab-text">원소 연금술</span>
        </button>
      </nav>

      <!-- 개별 게임 뷰 컨테이너 -->
      <div id="gameSuiteContent" class="game-suite-content"></div>
    </div>
  `;

  // 탭 클릭 바인딩
  const tabs = container.querySelectorAll('.game-nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const g = tab.dataset.game;
      switchGameTab(g);
    });
  });

  renderActiveGame();
};

function stopAllGameTimers() {
  stopMemoryTimer();
  stopPuzzleTimer();
  stopAlchemyTimer();
  if (typeof window.stopQuestionTimer === 'function') {
    window.stopQuestionTimer();
  }
}
window.stopAllGameTimers = stopAllGameTimers;

function switchGameTab(gameKey) {
  stopAllGameTimers();
  activeGameTab = gameKey;
  const container = document.getElementById('quizContainer');
  if (container) {
    const tabs = container.querySelectorAll('.game-nav-tab');
    tabs.forEach(t => {
      if (t.dataset.game === gameKey) t.classList.add('active');
      else t.classList.remove('active');
    });
  }
  renderActiveGame();
}

function renderActiveGame() {
  const content = document.getElementById('gameSuiteContent');
  if (!content) return;

  if (activeGameTab === 'quiz') {
    content.innerHTML = '';
    if (typeof renderQuizLobby === 'function') {
      renderQuizLobby();
    }
  } else if (activeGameTab === 'memory') {
    renderMemoryGameLobby(content);
  } else if (activeGameTab === 'puzzle') {
    renderPuzzleGameLobby(content);
  } else if (activeGameTab === 'alchemy') {
    renderAlchemyGameLobby(content);
  }
}

/* =========================================================================
 * 2. 🃏 원소 카드 짝맞추기 기억력 게임 (Memory Match Flip Game)
 * ========================================================================= */
let memoryGameState = {
  difficulty: 'easy', // 'easy' (12장/6쌍) | 'medium' (16장/8쌍) | 'hard' (20장/10쌍)
  cards: [],
  flippedCards: [],
  matchedPairs: 0,
  totalPairs: 6,
  turns: 0,
  timerSeconds: 0,
  timerInterval: null,
  flipTimeoutId: null,
  winTimeoutId: null,
  isLocked: false
};

function renderMemoryGameLobby(container) {
  stopMemoryTimer();
  const bestRecord = localStorage.getItem(`periodic_memory_best_${memoryGameState.difficulty}`) || '-';

  container.innerHTML = `
    <div class="game-lobby-box">
      <div class="game-lobby-hero">
        <span class="game-hero-icon">🃏</span>
        <h2>원소 카드 짝맞추기</h2>
        <p>뒤집힌 카드를 2장씩 열어 [원소 기호]와 [원소 이름 & 대표 물건] 짝을 맞춰보세요!</p>
        <div class="game-record-tag">
          🏆 내 최고 기록: <strong>${bestRecord !== '-' ? bestRecord + '회 (최소 턴)' : '도전 전'}</strong>
        </div>
      </div>

      <div class="game-settings-card">
        <h3>난이도 선택</h3>
        <div class="difficulty-select-grid">
          <button class="diff-btn ${memoryGameState.difficulty === 'easy' ? 'active' : ''}" data-diff="easy">
            <span class="diff-title">🌱 초급 (12장)</span>
            <small>6쌍 매칭 · 입문 추천</small>
          </button>
          <button class="diff-btn ${memoryGameState.difficulty === 'medium' ? 'active' : ''}" data-diff="medium">
            <span class="diff-title">⚡ 중급 (16장)</span>
            <small>8쌍 매칭 · 4x4 완성</small>
          </button>
          <button class="diff-btn ${memoryGameState.difficulty === 'hard' ? 'active' : ''}" data-diff="hard">
            <span class="diff-title">🔥 고급 (20장)</span>
            <small>10쌍 매칭 · 마스터 도전</small>
          </button>
        </div>

        <button id="startMemoryGameBtn" class="action-btn primary large-btn" style="margin-top: 1.5rem; width: 100%;">
          🃏 게임 시작하기!
        </button>
      </div>
    </div>
  `;

  const diffBtns = container.querySelectorAll('.diff-btn');
  diffBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      diffBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      memoryGameState.difficulty = btn.dataset.diff;
    });
  });

  const startBtn = document.getElementById('startMemoryGameBtn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      startMemoryGameRound(container);
    });
  }
}

function startMemoryGameRound(container) {
  const pairCounts = { easy: 6, medium: 8, hard: 10 };
  const pairCount = pairCounts[memoryGameState.difficulty] || 6;

  memoryGameState.totalPairs = pairCount;
  memoryGameState.matchedPairs = 0;
  memoryGameState.turns = 0;
  memoryGameState.timerSeconds = 0;
  memoryGameState.flippedCards = [];
  memoryGameState.isLocked = false;

  // 118개 원소 중 랜덤하게 pairCount개 선택 (실생활 물건 정보가 풍부한 1~36번 위주 우선 선별)
  const allEl = Array.from(elementsMap.values());
  const candidates = allEl.filter(e => e.atomicNumber <= 54).sort(() => Math.random() - 0.5).slice(0, pairCount);

  // 카드 덱 생성: 각 원소당 2장 (A: 심볼+번호, B: 한글명+아이콘+대표물건)
  const deck = [];
  candidates.forEach(el => {
    const cat = CATEGORIES[el.category] || {};
    const icon = el.icon || '🧪';
    const item = el.item || el.nameKo;

    // 카드 A: 기호형
    deck.push({
      id: `${el.atomicNumber}_symbol`,
      atomicNumber: el.atomicNumber,
      type: 'symbol',
      symbol: el.symbol,
      number: el.atomicNumber,
      color: cat.color || '#38bdf8',
      label: el.symbol,
      sub: `${el.atomicNumber}번`
    });

    // 카드 B: 이름 & 물건형
    deck.push({
      id: `${el.atomicNumber}_name`,
      atomicNumber: el.atomicNumber,
      type: 'name',
      nameKo: el.nameKo,
      icon: icon,
      item: item,
      color: cat.color || '#38bdf8',
      label: el.nameKo,
      sub: `${icon} ${item}`
    });
  });

  // 덱 무작위 셔플
  memoryGameState.cards = deck.sort(() => Math.random() - 0.5);

  renderMemoryBoard(container);
  startMemoryTimer();
}

function renderMemoryBoard(container) {
  container.innerHTML = `
    <div class="memory-board-wrapper">
      <div class="memory-board-header">
        <div class="memory-stats-bar">
          <div class="stat-pill">⏱️ 시간: <strong id="memoryTimerText">0초</strong></div>
          <div class="stat-pill">🔄 턴수: <strong id="memoryTurnsText">0회</strong></div>
          <div class="stat-pill">✨ 매칭: <strong id="memoryMatchedText">0 / ${memoryGameState.totalPairs}</strong></div>
        </div>
        <button id="exitMemoryBtn" class="quiz-exit-btn">✕ 로비로</button>
      </div>

      <div class="memory-cards-grid grid-${memoryGameState.difficulty}">
        ${memoryGameState.cards.map((c, idx) => `
          <div class="memory-card-item" data-card-idx="${idx}">
            <div class="card-inner">
              <div class="card-back">
                <span class="card-atom-logo">⚛️</span>
              </div>
              <div class="card-front" style="border-color:${c.color};">
                <span class="card-top-num">${c.sub}</span>
                <strong class="card-main-symbol" style="color:${c.color};">${c.label}</strong>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  const exitBtn = document.getElementById('exitMemoryBtn');
  if (exitBtn) {
    exitBtn.addEventListener('click', () => {
      stopMemoryTimer();
      renderMemoryGameLobby(container);
    });
  }

  // 카드 클릭 이벤트
  const cardElements = container.querySelectorAll('.memory-card-item');
  cardElements.forEach(cardEl => {
    cardEl.addEventListener('click', () => {
      const idx = parseInt(cardEl.dataset.cardIdx, 10);
      handleMemoryCardClick(idx, cardEl, container);
    });
  });
}

function handleMemoryCardClick(idx, cardEl, container) {
  if (memoryGameState.isLocked) return;
  if (cardEl.classList.contains('flipped') || cardEl.classList.contains('matched')) return;

  playSoundEffect('flip');
  triggerHaptic('short');
  cardEl.classList.add('flipped');
  memoryGameState.flippedCards.push({ idx, el: cardEl, data: memoryGameState.cards[idx] });

  if (memoryGameState.flippedCards.length === 2) {
    memoryGameState.turns++;
    const turnsEl = document.getElementById('memoryTurnsText');
    if (turnsEl) turnsEl.textContent = `${memoryGameState.turns}회`;

    const [card1, card2] = memoryGameState.flippedCards;
    // 두 카드의 원자번호가 같고 서로 다른 타입(기호 vs 이름)이면 정답!
    if (card1.data.atomicNumber === card2.data.atomicNumber && card1.data.type !== card2.data.type) {
      // 짝 맞춤 성공!
      memoryGameState.isLocked = true;
      memoryGameState.flipTimeoutId = setTimeout(() => {
        memoryGameState.flipTimeoutId = null;
        playSoundEffect('match');
        triggerHaptic('success');
        card1.el.classList.add('matched');
        card2.el.classList.add('matched');
        memoryGameState.matchedPairs++;
        memoryGameState.flippedCards = [];
        memoryGameState.isLocked = false;

        const matchedEl = document.getElementById('memoryMatchedText');
        if (matchedEl) matchedEl.textContent = `${memoryGameState.matchedPairs} / ${memoryGameState.totalPairs}`;

        // 게임 승리 확인
        if (memoryGameState.matchedPairs === memoryGameState.totalPairs) {
          handleMemoryGameWin(container);
        }
      }, 350);
    } else {
      // 불일치: 잠시 보여준 뒤 다시 뒤집기
      memoryGameState.isLocked = true;
      memoryGameState.flipTimeoutId = setTimeout(() => {
        memoryGameState.flipTimeoutId = null;
        card1.el.classList.remove('flipped');
        card2.el.classList.remove('flipped');
        memoryGameState.flippedCards = [];
        memoryGameState.isLocked = false;
      }, 900);
    }
  }
}

function handleMemoryGameWin(container) {
  stopMemoryTimer();
  playSoundEffect('alchemy_success');
  triggerHaptic('success');

  const key = `periodic_memory_best_${memoryGameState.difficulty}`;
  const prevBest = parseInt(localStorage.getItem(key) || '999', 10);
  let isNewBest = false;
  if (memoryGameState.turns < prevBest) {
    localStorage.setItem(key, memoryGameState.turns.toString());
    isNewBest = true;
  }

  memoryGameState.winTimeoutId = setTimeout(() => {
    memoryGameState.winTimeoutId = null;
    if (!container || !document.body.contains(container)) return;
    container.innerHTML = `
      <div class="game-win-card">
        <div class="win-trophy-icon">🏆</div>
        <h2>축하합니다! 짝맞추기 완성!</h2>
        <p>놀라운 기억력으로 모든 원소 카드의 짝을 완벽하게 맞추셨습니다.</p>
        
        <div class="win-stats-list">
          <div class="win-stat-row">
            <span>⏱️ 소요 시간:</span>
            <strong>${memoryGameState.timerSeconds}초</strong>
          </div>
          <div class="win-stat-row">
            <span>🔄 총 시도 턴수:</span>
            <strong>${memoryGameState.turns}회 ${isNewBest ? '🎉 신기록 달성!' : ''}</strong>
          </div>
        </div>

        <div class="win-actions-row">
          <button id="memoryPlayAgainBtn" class="action-btn primary">한 번 더 도전 🔄</button>
          <button id="memoryBackLobbyBtn" class="action-btn secondary">게임 메뉴로 🏠</button>
        </div>
      </div>
    `;

    document.getElementById('memoryPlayAgainBtn')?.addEventListener('click', () => {
      startMemoryGameRound(container);
    });
    document.getElementById('memoryBackLobbyBtn')?.addEventListener('click', () => {
      renderMemoryGameLobby(container);
    });
  }, 500);
}

function startMemoryTimer() {
  stopMemoryTimer();
  memoryGameState.timerSeconds = 0;
  resumeMemoryTimer();
}

function resumeMemoryTimer() {
  if (memoryGameState.timerInterval) clearInterval(memoryGameState.timerInterval);
  memoryGameState.timerInterval = setInterval(() => {
    memoryGameState.timerSeconds++;
    const el = document.getElementById('memoryTimerText');
    if (el) el.textContent = `${memoryGameState.timerSeconds}초`;
  }, 1000);
}

function stopMemoryTimer() {
  if (memoryGameState.timerInterval) {
    clearInterval(memoryGameState.timerInterval);
    memoryGameState.timerInterval = null;
  }
  if (memoryGameState.flipTimeoutId) {
    clearTimeout(memoryGameState.flipTimeoutId);
    memoryGameState.flipTimeoutId = null;
    memoryGameState.flippedCards.forEach(c => {
      if (c && c.el && !c.el.classList.contains('matched')) {
        c.el.classList.remove('flipped');
      }
    });
    memoryGameState.flippedCards = [];
    memoryGameState.isLocked = false;
  }
  if (memoryGameState.winTimeoutId) {
    clearTimeout(memoryGameState.winTimeoutId);
    memoryGameState.winTimeoutId = null;
  }
}

/* =========================================================================
 * 3. 🧩 주기율표 빈칸 채우기 퍼즐 (Table Placement Puzzle)
 * ========================================================================= */
const PUZZLE_STAGES = {
  stage1: { id: 'stage1', title: '🌟 필수 1~20번 원소 (수소~칼슘)', range: [1, 20], count: 8 },
  stage2: { id: 'stage2', title: '⚡ 1족 & 2족 알칼리 금속군', elements: [1, 3, 11, 19, 37, 55, 4, 12, 20, 38, 56], count: 6 },
  stage3: { id: 'stage3', title: '🧪 17족 & 18족 할로젠과 비활성 기체', elements: [9, 17, 35, 53, 85, 2, 10, 18, 36, 54, 86], count: 6 },
  stage4: { id: 'stage4', title: '🏅 4주기 전이금속 마스터 (21~30번)', range: [21, 30], count: 6 },
  stage5: { id: 'stage5', title: '👑 118개 전체 랜덤 마스터 챌린지', range: [1, 118], count: 10 }
};

let puzzleState = {
  currentStage: 'stage1',
  questions: [], // 빈칸으로 맞출 원소 목록
  currentIndex: 0,
  score: 0,
  mistakes: 0,
  isAnswered: false,
  timerId: null
};

function stopPuzzleTimer() {
  if (puzzleState.timerId) {
    clearTimeout(puzzleState.timerId);
    puzzleState.timerId = null;
  }
}

function renderPuzzleGameLobby(container) {
  stopPuzzleTimer();
  container.innerHTML = `
    <div class="game-lobby-box">
      <div class="game-lobby-hero">
        <span class="game-hero-icon">🧩</span>
        <h2>주기율표 빈칸 채우기 퍼즐</h2>
        <p>주기율표의 빈칸(?)을 보고 제시된 원소가 들어갈 올바른 주기와 족 위치를 쏙쏙 끼워 맞춰보세요!</p>
      </div>

      <div class="game-settings-card">
        <h3>도전할 스테이지를 선택하세요</h3>
        <div class="puzzle-stages-grid">
          ${Object.values(PUZZLE_STAGES).map(stage => `
            <button class="puzzle-stage-btn ${puzzleState.currentStage === stage.id ? 'active' : ''}" data-stage="${stage.id}">
              <div class="stage-btn-title">${stage.title}</div>
              <small>빈칸 ${stage.count}개 맞추기</small>
            </button>
          `).join('')}
        </div>

        <button id="startPuzzleGameBtn" class="action-btn primary large-btn" style="margin-top: 1.5rem; width: 100%;">
          🧩 퍼즐 시작하기!
        </button>
      </div>
    </div>
  `;

  const stageBtns = container.querySelectorAll('.puzzle-stage-btn');
  stageBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      stageBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      puzzleState.currentStage = btn.dataset.stage;
    });
  });

  document.getElementById('startPuzzleGameBtn')?.addEventListener('click', () => {
    startPuzzleGameRound(container);
  });
}

function startPuzzleGameRound(container) {
  stopPuzzleTimer();
  const stage = PUZZLE_STAGES[puzzleState.currentStage];
  let pool = [];

  if (stage.range) {
    const [min, max] = stage.range;
    for (let i = min; i <= max; i++) {
      const el = elementsMap.get(i);
      if (el) pool.push(el);
    }
  } else if (stage.elements) {
    pool = stage.elements.map(num => elementsMap.get(num)).filter(Boolean);
  }

  // 랜덤으로 stage.count 개수 선별
  const targetElements = [...pool].sort(() => Math.random() - 0.5).slice(0, stage.count);

  puzzleState.questions = targetElements;
  puzzleState.currentIndex = 0;
  puzzleState.score = 0;
  puzzleState.mistakes = 0;

  renderPuzzlePlayScreen(container);
}

function renderPuzzlePlayScreen(container) {
  stopPuzzleTimer();
  puzzleState.isAnswered = false;
  const targetEl = puzzleState.questions[puzzleState.currentIndex];
  const cat = CATEGORIES[targetEl.category] || {};

  // 문제의 후보 칸 4개 생성 (정답 1개 + 오답 3개)
  // 오답 보기는 targetEl과 period 및 group이 겹치지 않고 오답들끼리도 서로 period-group이 겹치지 않도록 추출
  const allEl = Array.from(elementsMap.values());
  const usedPositions = new Set([`${targetEl.period}-${targetEl.group}`]);
  const shuffledEl = allEl
    .filter(e => e.atomicNumber !== targetEl.atomicNumber)
    .sort(() => Math.random() - 0.5);

  const distractors = [];
  for (const el of shuffledEl) {
    const posKey = `${el.period}-${el.group}`;
    if (!usedPositions.has(posKey)) {
      usedPositions.add(posKey);
      distractors.push(el);
      if (distractors.length >= 3) break;
    }
  }
  
  const candidateSlots = [targetEl, ...distractors].sort(() => Math.random() - 0.5);

  container.innerHTML = `
    <div class="puzzle-play-wrapper">
      <div class="puzzle-play-header">
        <span class="puzzle-step-tag">문제 ${puzzleState.currentIndex + 1} / ${puzzleState.questions.length}</span>
        <div class="puzzle-score-tag">점수: <strong>${puzzleState.score}점</strong></div>
        <button id="exitPuzzleBtn" class="quiz-exit-btn">✕ 로비로</button>
      </div>

      <!-- 출제 카드: 맞춰야 할 원소 -->
      <div class="puzzle-target-banner">
        <div class="target-symbol-box" style="border-color:${cat.color}; color:${cat.color};">
          <span class="target-num">${targetEl.atomicNumber}</span>
          <span class="target-symbol">${targetEl.symbol}</span>
        </div>
        <div class="target-info-wrap">
          <h3>${targetEl.nameKo} <small>(${targetEl.nameEn})</small></h3>
          <p>이 원소는 주기율표의 <strong>어느 주기, 어느 족</strong> 자리에 들어갈까요?</p>
          <span class="target-hint-pill">${cat.nameKo || ''}</span>
        </div>
      </div>

      <!-- 주기율표 후보 슬롯 4개 선택 -->
      <div class="puzzle-slots-grid">
        ${candidateSlots.map((slot, idx) => `
          <button class="puzzle-slot-card" data-atomic-number="${slot.atomicNumber}">
            <span class="slot-pos-badge">${slot.period}주기 ${slot.group}족</span>
            <div class="slot-pos-desc">
              <strong>${slot.period}행 · ${slot.group}열 위치</strong>
              <small>후보 자리 ${idx + 1}</small>
            </div>
            <span class="slot-pick-icon">👉 장착하기</span>
          </button>
        `).join('')}
      </div>

      <div id="puzzleFeedback" class="puzzle-feedback-msg" style="display:none;"></div>
    </div>
  `;

  document.getElementById('exitPuzzleBtn')?.addEventListener('click', () => {
    stopPuzzleTimer();
    renderPuzzleGameLobby(container);
  });

  const slotBtns = container.querySelectorAll('.puzzle-slot-card');
  slotBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const num = parseInt(btn.dataset.atomicNumber, 10);
      handlePuzzleSlotSelect(num, targetEl, slotBtns, container);
    });
  });
}

function handlePuzzleSlotSelect(selectedNum, targetEl, slotBtns, container) {
  if (puzzleState.isAnswered) return;
  puzzleState.isAnswered = true;
  stopPuzzleTimer();

  slotBtns.forEach(b => b.disabled = true);
  const feedback = document.getElementById('puzzleFeedback');

  if (selectedNum === targetEl.atomicNumber) {
    // 정답!
    playSoundEffect('match');
    triggerHaptic('success');
    puzzleState.score += 100;
    if (feedback) {
      feedback.style.display = 'block';
      feedback.className = 'puzzle-feedback-msg success';
      feedback.innerHTML = `🎉 정답입니다! <strong>${targetEl.nameKo}(${targetEl.symbol})</strong>은 <strong>${targetEl.period}주기 ${targetEl.group}족</strong> 원소입니다!`;
    }
  } else {
    // 오답
    playSoundEffect('wrong');
    triggerHaptic('wrong');
    puzzleState.mistakes++;
    if (feedback) {
      feedback.style.display = 'block';
      feedback.className = 'puzzle-feedback-msg wrong';
      feedback.innerHTML = `❌ 아쉬워요! ${targetEl.nameKo}(${targetEl.symbol})의 올바른 자리는 <strong>${targetEl.period}주기 ${targetEl.group}족</strong>입니다.`;
    }
  }

  puzzleState.timerId = setTimeout(() => {
    puzzleState.timerId = null;
    if (puzzleState.currentIndex < puzzleState.questions.length - 1) {
      puzzleState.currentIndex++;
      renderPuzzlePlayScreen(container);
    } else {
      renderPuzzleResultScreen(container);
    }
  }, 1400);
}

function renderPuzzleResultScreen(container) {
  stopPuzzleTimer();
  playSoundEffect('alchemy_success');
  triggerHaptic('success');

  container.innerHTML = `
    <div class="game-win-card">
      <div class="win-trophy-icon">🏆</div>
      <h2>주기율표 퍼즐 완료!</h2>
      <p>주기율표의 주기와 족 위치를 훌륭하게 찾아내셨습니다.</p>
      
      <div class="win-stats-list">
        <div class="win-stat-row">
          <span>최종 점수:</span>
          <strong>${puzzleState.score}점</strong>
        </div>
        <div class="win-stat-row">
          <span>정답 성공률:</span>
          <strong>${puzzleState.questions.length - puzzleState.mistakes} / ${puzzleState.questions.length} 문제</strong>
        </div>
      </div>

      <div class="win-actions-row">
        <button id="puzzleRetryBtn" class="action-btn primary">다시 풀기 🔄</button>
        <button id="puzzleBackBtn" class="action-btn secondary">퍼즐 목록으로 🏠</button>
      </div>
    </div>
  `;

  document.getElementById('puzzleRetryBtn')?.addEventListener('click', () => {
    startPuzzleGameRound(container);
  });
  document.getElementById('puzzleBackBtn')?.addEventListener('click', () => {
    renderPuzzleGameLobby(container);
  });
}

/* =========================================================================
 * 4. ⚗️ 원소 연금술사 - 화합물 & 이온 합성 실험실 (확장판 60종 + 이온/사칙연산/도감 인벤토리)
 * ========================================================================= */
// 연금술 레시피(ALCHEMY_RECIPES), 시약 보관함(ALCHEMY_SHELF_ELEMENTS), 연산자(ALCHEMY_OPERATORS), 수식 파서/전개 엔진은 alchemy_data.js에서 로드됩니다.

let alchemyState = {
  beakerElements: [], // 비커에 담긴 기호/수식/이온/연산자 토큰 배열
  unlockedRecipes: JSON.parse(localStorage.getItem('periodic_alchemy_unlocked') || '[]'),
  currentShelfCat: 'all', // 'all' | 'cation' | 'anion' | 'poly_ion' | 'nonmetal' | 'metal' | 'precious' | 'full118'
  shelfSearch: '',
  currentBookCat: 'all',
  inventoryFilter: 'unlocked', // 'unlocked' (해금+기본시약) | 'all' (전체 도감 인벤토리 실험모드)
  inventorySearch: '',
  splitMode: window.innerWidth >= 820 ? 'side' : 'top', // 'top' (상단 비커 고정) | 'side' (좌측 비커 고정)
  deckView: 'all', // 'all' (원소+인벤토리) | 'shelf' (원소·이온만) | 'inv' (도감 인벤토리만)
  touchDragMode: 'drag', // 'drag' (카드 터치 시 즉시 비커로 드래그) | 'scroll' (목록 스크롤 우선, 길게 눌러 드래그)
  reactionTimeoutId: null
};

function stopAlchemyTimer() {
  if (alchemyState.reactionTimeoutId) {
    clearTimeout(alchemyState.reactionTimeoutId);
    alchemyState.reactionTimeoutId = null;
  }
  const fluid = document.getElementById('beakerFluid');
  const glass = document.getElementById('beakerGlassEl');
  if (fluid) fluid.classList.remove('reacting');
  if (glass) glass.classList.remove('shake-active');
}

/**
 * 보관함 필터 및 검색 결과 반환
 */
function getFilteredShelfElements() {
  const fullList = getFullAlchemyShelfItems();
  const cat = alchemyState.currentShelfCat;
  const q = (alchemyState.shelfSearch || '').trim().toLowerCase();

  return fullList.filter(item => {
    let catMatch = false;
    if (cat === 'all') {
      // 기본 탭에서는 핵심 143종 표시 (검색어 입력 시에는 118원소 전체 확장 목록까지 통합 검색!)
      catMatch = q ? true : item.subCat !== 'extended118' && item.cat !== 'full118';
    } else if (cat === 'cation') {
      catMatch = item.cat === 'cation';
    } else if (cat === 'anion') {
      catMatch = item.cat === 'anion';
    } else if (cat === 'poly_ion') {
      catMatch = item.subCat === 'poly';
    } else if (cat === 'full118') {
      catMatch = true;
    } else {
      catMatch = item.cat === cat;
    }

    if (!catMatch) return false;
    if (!q) return true;
    const pronStr = getShelfCardPronunciation(item.symbol).toLowerCase();
    return (
      item.symbol.toLowerCase().includes(q) ||
      item.name.toLowerCase().includes(q) ||
      pronStr.includes(q)
    );
  });
}

function renderAlchemyGameLobby(container) {
  const unlockedCount = alchemyState.unlockedRecipes.length;
  const totalCount = ALCHEMY_RECIPES.length;
  const progressPct = Math.round((unlockedCount / totalCount) * 100);
  const titleInfo = getAlchemyTitle(unlockedCount);

  const fullList = getFullAlchemyShelfItems();
  const totalCations = fullList.filter(e => e.cat === 'cation').length;
  const totalAnions = fullList.filter(e => e.cat === 'anion').length;
  const totalPolyIons = fullList.filter(e => e.subCat === 'poly').length;
  const filteredElements = getFilteredShelfElements();

  const currentExpr = formatBeakerExpression(alchemyState.beakerElements);
  const currentKoNames = formatBeakerKoreanNames(alchemyState.beakerElements);
  const currentPronNames = formatBeakerPronunciations(alchemyState.beakerElements);
  const isSideMode = alchemyState.splitMode === 'side';
  const isDragPriority = alchemyState.touchDragMode !== 'scroll';

  container.innerHTML = `
    <div class="alchemy-lab-wrapper split-mode-${alchemyState.splitMode} touch-mode-${alchemyState.touchDragMode}" id="alchemyLabRoot">
      <!-- 상단 컴팩트 진행률 & 레이아웃 고정 컨트롤 바 -->
      <div class="alchemy-header-bar compact-header">
        <div class="alchemy-progress-group">
          <div class="alchemy-title-row">
            <span class="alchemy-title-badge" style="color: ${titleInfo.color}; font-weight:800; font-size:0.88rem;">
              ${titleInfo.title}
            </span>
            <span class="alchemy-count-text">⚗️ <strong>${unlockedCount}/${totalCount}</strong> (${progressPct}%)</span>
          </div>
          <div class="alchemy-progress-track">
            <div class="alchemy-progress-fill" style="width: ${progressPct}%;"></div>
          </div>
        </div>
        <div class="alchemy-top-controls">
          <button id="toggleSplitModeBtn" class="pill-btn secondary small-btn" title="비커 고정 위치 전환 (상단 고정 / 좌측 고정)">
            ${isSideMode ? '◫ 좌측비커 고정중' : '⊟ 상단비커 고정중'}
          </button>
          <button id="toggleTouchModeBtn" class="pill-btn ${isDragPriority ? 'primary' : 'secondary'} small-btn" title="원소 카드 터치 시 드래그 우선 / 스크롤 우선 전환">
            ${isDragPriority ? '✋ 카드드래그 고정' : '↕️ 목록스크롤 우선'}
          </button>
          <button id="toggleRecipeBookBtn" class="pill-btn primary small-btn">📖 도감(${totalCount})</button>
        </div>
      </div>

      <!-- 📌 2단 분할 워크벤치: [1] 고정된 비커 실험대 + [2] 독립 스크롤 원소·이온·인벤토리 덱 -->
      <div class="alchemy-split-workbench">
        <!-- [1] 고정된 비커 실험대 (스크롤해도 절대 사라지지 않음!) -->
        <div class="alchemy-pinned-beaker-col">
          <div class="alchemy-beaker-stage pinned-stage">
            <!-- 실시간 화학식/이온식/수식 전광판 -->
            <div class="alchemy-formula-board">
              <div class="formula-board-top">
                <span class="formula-badge-label">📌 고정 비커 & 실시간 수식·발음 전광판</span>
                <span class="formula-drag-tip">원소·이온을 여기 비커로 끌어놓으세요!</span>
              </div>
              <div class="formula-display-row">
                <div id="beakerFormulaPreview" class="formula-preview-text">
                  ${currentExpr
                    ? `<div class="formula-expr-main"><strong>${currentExpr}</strong></div><div class="formula-ko-sub">🇰🇷 ${currentKoNames} <span class="formula-pron-sub">🗣️ [${currentPronNames}]</span></div>`
                    : '<span class="formula-placeholder">예: Na⁺[엔에이 플러스] + Cl⁻[씨엘 마이너스], 2NaOH⁻</span>'}
                </div>
                <div class="formula-direct-input-wrap">
                  <input type="text" id="directFormulaInput" class="direct-formula-input" placeholder="수식 직접입력 (예: 2NaOH-)" value="${currentExpr}" autocomplete="off" spellcheck="false" />
                  <button id="applyDirectFormulaBtn" class="pill-btn secondary small-btn" title="입력한 수식을 비커에 적용">적용</button>
                </div>
              </div>
            </div>

            <!-- 비커 드롭 영역 + 액션 버튼 가로 배치 (공간 절약 & 넓은 드롭 타깃) -->
            <div class="pinned-beaker-main-row">
              <div class="beaker-container">
                <div class="beaker-glass" id="beakerGlassEl" title="여기로 원소·이온·도감 아이템을 끌어넣으세요!">
                  <div class="beaker-drop-overlay" id="beakerDropOverlay">📥 여기에 놓아 비커에 투입!</div>
                  <div id="beakerFluid" class="beaker-fluid">
                    <div id="beakerItems" class="beaker-items-cloud">
                      ${renderBeakerPillsHtml()}
                    </div>
                  </div>
                </div>
              </div>

              <div class="pinned-beaker-side-actions">
                <button id="combineElementsBtn" class="action-btn primary combine-main-btn">⚗️ 화학 반응 시작!</button>
                <div class="pinned-sub-btns">
                  <button id="backspaceBeakerBtn" class="op-back-btn" title="마지막에 넣은 기호 지우기">⌫ 지우기</button>
                  <button id="clearBeakerBtn" class="op-back-btn clear-btn" title="비커 전체 비우기">🗑️ 비우기</button>
                </div>
              </div>
            </div>

            <!-- 🧮 사칙연산 & 계수 & 괄호 & 전하 기호 가로 스크롤/컴팩트 패드 -->
            <div class="alchemy-operator-bar compact-op-bar">
              <div class="operator-btns-grid" id="alchemyOperatorGrid">
                ${ALCHEMY_OPERATORS.map(op => `
                  <button class="alchemy-op-btn op-type-${op.type}" data-op="${op.symbol}" draggable="true" title="${op.desc}">
                    <strong>${op.symbol}</strong>
                    <small>${op.label.replace(/^[^\s]+\s/, '')}</small>
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- 힌트 알림 박스 (실패 시 똑똑한 안내) -->
            <div id="alchemyHintBox" class="alchemy-hint-box" style="display:none;"></div>
          </div>
        </div>

        <!-- [2] 독립 스크롤 원소·이온·인벤토리 덱 (이 영역만 위아래로 스크롤됨!) -->
        <div class="alchemy-scroll-deck-col">
          <!-- 상단 고정 서브탭 & 검색 바 -->
          <div class="deck-sticky-controls">
            <div class="deck-view-tabs">
              <button class="deck-tab-btn ${alchemyState.deckView === 'all' ? 'active' : ''}" data-deck-view="all">✨ 전체 보기</button>
              <button class="deck-tab-btn ${alchemyState.deckView === 'shelf' ? 'active' : ''}" data-deck-view="shelf">🧪 원소·양이온·음이온(${fullList.length})</button>
              <button class="deck-tab-btn ${alchemyState.deckView === 'inv' ? 'active' : ''}" data-deck-view="inv">🎒 도감 인벤토리(${ALCHEMY_RECIPES.length})</button>
            </div>
          </div>

          <!-- 내부 스크롤 본문 + 우측 전용 터치 스크롤 레일 -->
          <div class="deck-scroll-body-wrap">
            <div class="alchemy-scroll-deck" id="alchemyScrollDeck">
              <!-- 🎒 도감 인벤토리 섹션 -->
              <div class="alchemy-inventory-section" id="alchemyInventorySection" style="${alchemyState.deckView === 'shelf' ? 'display:none;' : ''}">
                <div class="inventory-header-row">
                  <div class="inventory-title-group">
                    <h3>🎒 내 도감 인벤토리 <small>(고정된 비커로 끌어넣기 / 터치)</small></h3>
                  </div>
                  <div class="inventory-controls-row">
                    <input type="text" id="inventorySearchInput" class="inventory-search-input" placeholder="🔍 도감 물질·화학식 검색 (예: NaOH, 소금)" value="${alchemyState.inventorySearch}" />
                    <div class="inventory-mode-tabs">
                      <button class="cat-pill ${alchemyState.inventoryFilter === 'unlocked' ? 'active' : ''}" data-inv-mode="unlocked">보유 시약(${getInventoryRecipes('unlocked').length})</button>
                      <button class="cat-pill ${alchemyState.inventoryFilter === 'all' ? 'active' : ''}" data-inv-mode="all">🔓 전체 시약(${ALCHEMY_RECIPES.length})</button>
                    </div>
                  </div>
                </div>

                <div class="alchemy-inventory-grid" id="alchemyInventoryGrid">
                  ${renderInventoryItemsHtml()}
                </div>
              </div>

              <!-- 🧪 원소 & 양이온 & 음이온 대백과 보관함 섹션 -->
              <div class="alchemy-shelf-section" id="alchemyShelfSection" style="${alchemyState.deckView === 'inv' ? 'display:none;' : ''}">
                <div class="shelf-header-row">
                  <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap; width:100%; justify-content:space-between;">
                    <h3 style="margin:0;">🧪 원소 & 양이온 · 음이온 보관함</h3>
                    <input type="text" id="shelfSearchInput" class="inventory-search-input" placeholder="🔍 원소·이온 한글/기호 검색 (예: 황산, Ba²⁺, 철)" value="${alchemyState.shelfSearch}" />
                  </div>
                  <div class="shelf-cat-tabs">
                    <button class="cat-pill ${alchemyState.currentShelfCat === 'all' ? 'active' : ''}" data-cat="all">핵심 추천(${ALCHEMY_SHELF_ELEMENTS.length})</button>
                    <button class="cat-pill ion-cat-pill ${alchemyState.currentShelfCat === 'cation' ? 'active' : ''}" data-cat="cation">⚡ 양이온(${totalCations})</button>
                    <button class="cat-pill ion-cat-pill ${alchemyState.currentShelfCat === 'anion' ? 'active' : ''}" data-cat="anion">💧 음이온(${totalAnions})</button>
                    <button class="cat-pill ion-cat-pill ${alchemyState.currentShelfCat === 'poly_ion' ? 'active' : ''}" data-cat="poly_ion">🧩 다원자(${totalPolyIons})</button>
                    <button class="cat-pill ${alchemyState.currentShelfCat === 'nonmetal' ? 'active' : ''}" data-cat="nonmetal">비금속</button>
                    <button class="cat-pill ${alchemyState.currentShelfCat === 'metal' ? 'active' : ''}" data-cat="metal">주요금속</button>
                    <button class="cat-pill ${alchemyState.currentShelfCat === 'precious' ? 'active' : ''}" data-cat="precious">귀금속</button>
                    <button class="cat-pill ${alchemyState.currentShelfCat === 'full118' ? 'active' : ''}" data-cat="full118">🌌 118전체(${fullList.length})</button>
                  </div>
                </div>

                <div class="alchemy-atoms-grid" id="alchemyAtomsGrid">
                  ${renderShelfButtonsHtml(filteredElements)}
                </div>
              </div>
            </div>

            <!-- ↕️ 우측 전용 원소 목록 스크롤 레일 (드래그 모드에서도 언제든 원소 목록만 부드럽게 위아래 스크롤!) -->
            <div class="alchemy-scroll-rail" id="alchemyScrollRail" title="위아래로 밀어 원소 목록만 스크롤">
              <button type="button" class="rail-step-btn" id="scrollDeckUpBtn" title="위로 스크롤">▲</button>
              <div class="rail-touch-track" id="railTouchTrack">
                <span>↕️</span>
                <small>목록<br>스크롤</small>
              </div>
              <button type="button" class="rail-step-btn" id="scrollDeckDownBtn" title="아래로 스크롤">▼</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 도감 모달 오버레이 (카테고리 필터 + 비커로 바로 투입 버튼 포함) -->
      <div id="recipeBookModal" class="app-modal-backdrop" style="display:none;">
        <div class="app-modal-card alchemy-book-card">
          <div class="app-modal-header">
            <div>
              <h3>📖 화합물 & 이온 연금술 도감 (총 ${totalCount}종)</h3>
              <small style="color:#94a3b8;">카드를 클릭하거나 [🧪 비커에 넣기]를 누르면 비커로 즉시 투입됩니다!</small>
            </div>
            <button id="closeRecipeBookBtn" class="modal-close-btn">&times;</button>
          </div>

          <div class="recipe-filter-tabs">
            <button class="book-tab ${alchemyState.currentBookCat === 'all' ? 'active' : ''}" data-bcat="all">전체 (${totalCount})</button>
            <button class="book-tab ${alchemyState.currentBookCat === 'ion' ? 'active' : ''}" data-bcat="ion">⚡ 이온·앙금·반응(30)</button>
            <button class="book-tab ${alchemyState.currentBookCat === 'nature' ? 'active' : ''}" data-bcat="nature">생명·자연(10)</button>
            <button class="book-tab ${alchemyState.currentBookCat === 'daily' ? 'active' : ''}" data-bcat="daily">주방·일상(10)</button>
            <button class="book-tab ${alchemyState.currentBookCat === 'mineral' ? 'active' : ''}" data-bcat="mineral">광물·보석(9)</button>
            <button class="book-tab ${alchemyState.currentBookCat === 'alloy' ? 'active' : ''}" data-bcat="alloy">금속·합금(9)</button>
            <button class="book-tab ${alchemyState.currentBookCat === 'tech' ? 'active' : ''}" data-bcat="tech">에너지·첨단(7)</button>
          </div>

          <div class="app-modal-body">
            <div class="recipe-grid" id="recipeBookGrid">
              ${renderRecipeGridItems(alchemyState.currentBookCat)}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // 이벤트 바인딩
  bindShelfAtomButtons(container);
  bindOperatorButtons(container);
  bindInventoryEvents(container);
  bindBeakerDragAndDrop(container);
  bindDeckScrollControls(container);

  // 상단 고정 / 좌측 고정 레이아웃 전환 버튼
  document.getElementById('toggleSplitModeBtn')?.addEventListener('click', () => {
    alchemyState.userToggledSplit = true;
    alchemyState.splitMode = alchemyState.splitMode === 'side' ? 'top' : 'side';
    renderAlchemyGameLobby(container);
  });

  // 카드 드래그 우선 / 목록 스크롤 우선 전환 버튼
  document.getElementById('toggleTouchModeBtn')?.addEventListener('click', () => {
    alchemyState.touchDragMode = alchemyState.touchDragMode === 'scroll' ? 'drag' : 'scroll';
    renderAlchemyGameLobby(container);
  });

  // 모바일 · 태블릿 화면 회전(resize / orientationchange) 시 자동 최적 레이아웃 반응
  if (!window._alchemyResizeBound) {
    window._alchemyResizeBound = true;
    window.addEventListener('resize', () => {
      if (alchemyState.userToggledSplit) return;
      const desired = window.innerWidth >= 820 ? 'side' : 'top';
      if (alchemyState.splitMode !== desired) {
        alchemyState.splitMode = desired;
        const root = document.getElementById('alchemyLabRoot');
        if (root) {
          root.classList.remove('split-mode-side', 'split-mode-top');
          root.classList.add(`split-mode-${desired}`);
          const btn = document.getElementById('toggleSplitModeBtn');
          if (btn) btn.textContent = desired === 'side' ? '◫ 좌측비커 고정중' : '⊟ 상단비커 고정중';
        }
      }
    });
  }

  // 덱 서브탭 (전체 / 원소·이온만 / 도감 인벤토리만) 전환
  const deckTabBtns = container.querySelectorAll('[data-deck-view]');
  deckTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      alchemyState.deckView = btn.dataset.deckView;
      deckTabBtns.forEach(b => b.classList.toggle('active', b.dataset.deckView === alchemyState.deckView));
      const invSec = document.getElementById('alchemyInventorySection');
      const shelfSec = document.getElementById('alchemyShelfSection');
      if (invSec) invSec.style.display = alchemyState.deckView === 'shelf' ? 'none' : '';
      if (shelfSec) shelfSec.style.display = alchemyState.deckView === 'inv' ? 'none' : '';
      const scrollDeck = document.getElementById('alchemyScrollDeck');
      if (scrollDeck) scrollDeck.scrollTop = 0;
    });
  });

  // 보관함 검색창 연동
  const shelfSearchInput = document.getElementById('shelfSearchInput');
  shelfSearchInput?.addEventListener('input', () => {
    alchemyState.shelfSearch = shelfSearchInput.value;
    const atomsGrid = container.querySelector('#alchemyAtomsGrid');
    if (atomsGrid) {
      atomsGrid.innerHTML = renderShelfButtonsHtml(getFilteredShelfElements());
      bindShelfAtomButtons(container);
    }
  });

  // 직접 수식 입력창 연동
  const directInput = document.getElementById('directFormulaInput');
  const applyDirectBtn = document.getElementById('applyDirectFormulaBtn');
  const applyDirectFormula = () => {
    if (!directInput) return;
    const parsed = parseExpressionToTokens(directInput.value);
    alchemyState.beakerElements = parsed;
    playSoundEffect('flip');
    updateBeakerDisplay(container);
  };
  applyDirectBtn?.addEventListener('click', applyDirectFormula);
  directInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applyDirectFormula();
    }
  });

  // 한 칸 지우기 (Backspace)
  document.getElementById('backspaceBeakerBtn')?.addEventListener('click', () => {
    if (alchemyState.beakerElements.length > 0) {
      alchemyState.beakerElements.pop();
      playSoundEffect('flip');
      updateBeakerDisplay(container);
    }
  });

  // 보관함 카테고리 탭 클릭
  const catPills = container.querySelectorAll('.shelf-cat-tabs .cat-pill');
  catPills.forEach(pill => {
    pill.addEventListener('click', () => {
      alchemyState.currentShelfCat = pill.dataset.cat;
      catPills.forEach(p => p.classList.toggle('active', p.dataset.cat === alchemyState.currentShelfCat));
      const atomsGrid = container.querySelector('#alchemyAtomsGrid');
      if (atomsGrid) {
        atomsGrid.innerHTML = renderShelfButtonsHtml(getFilteredShelfElements());
        bindShelfAtomButtons(container);
      }
      const scrollDeck = document.getElementById('alchemyScrollDeck');
      if (scrollDeck) scrollDeck.scrollTop = 0;
    });
  });

  // 비커 원소 개별 제거 바인딩
  const beakerGlass = container.querySelector('#beakerGlassEl');
  if (beakerGlass) {
    beakerGlass.addEventListener('click', (e) => {
      const pill = e.target.closest('.beaker-atom-pill');
      if (pill) {
        const idx = parseInt(pill.dataset.beakerIdx, 10);
        if (!isNaN(idx) && idx >= 0 && idx < alchemyState.beakerElements.length) {
          alchemyState.beakerElements.splice(idx, 1);
          updateBeakerDisplay(container);
        }
      }
    });
  }

  // 비커 비우기
  document.getElementById('clearBeakerBtn')?.addEventListener('click', () => {
    alchemyState.beakerElements = [];
    const hintBox = document.getElementById('alchemyHintBox');
    if (hintBox) hintBox.style.display = 'none';
    updateBeakerDisplay(container);
  });

  // 반응 시작 버튼
  document.getElementById('combineElementsBtn')?.addEventListener('click', () => {
    handleCombineReaction(container);
  });

  // 도감 모달 열기/닫기
  const bookModal = document.getElementById('recipeBookModal');
  document.getElementById('toggleRecipeBookBtn')?.addEventListener('click', () => {
    if (bookModal) bookModal.style.display = 'flex';
  });
  document.getElementById('closeRecipeBookBtn')?.addEventListener('click', () => {
    if (bookModal) bookModal.style.display = 'none';
  });

  // 도감 탭 필터 바인딩
  const bookTabs = container.querySelectorAll('.book-tab');
  bookTabs.forEach(bt => {
    bt.addEventListener('click', () => {
      bookTabs.forEach(t => t.classList.remove('active'));
      bt.classList.add('active');
      alchemyState.currentBookCat = bt.dataset.bcat;
      const grid = document.getElementById('recipeBookGrid');
      if (grid) {
        grid.innerHTML = renderRecipeGridItems(alchemyState.currentBookCat);
        bindRecipeBookCardActions(container);
      }
    });
  });
  bindRecipeBookCardActions(container);
}

function renderShelfButtonsHtml(elementsList) {
  return elementsList.map(el => {
    const isIon = el.cat === 'cation' || el.cat === 'anion';
    const badgeTag = el.cat === 'cation' ? '<span class="ion-mini-tag cation-tag">+양이온</span>' : (el.cat === 'anion' ? '<span class="ion-mini-tag anion-tag">-음이온</span>' : '');
    const pronText = getShelfCardPronunciation(el.symbol);
    return `
      <button class="shelf-atom-btn ${isIon ? 'shelf-ion-btn' : ''}" data-symbol="${el.symbol}" draggable="true" style="border-color:${el.color};" title="${el.symbol} [${pronText}] - ${el.name}">
        ${badgeTag}
        <strong style="color:${el.color};">${el.symbol}</strong>
        <span class="shelf-pron-tag">[${pronText}]</span>
        <small>${el.name}</small>
      </button>
    `;
  }).join('');
}

function renderBeakerPillsHtml() {
  if (alchemyState.beakerElements.length === 0) {
    return '<span class="empty-tip">원소·이온·연산기호 또는 도감 인벤토리 아이템을 비커로 끌어넣으세요!</span>';
  }
  return alchemyState.beakerElements.map((sym, idx) => {
    const isOp = ['+', '-', '×', '÷', '➔', '=', '(', ')'].includes(sym);
    const isCharge = ['⁺', '⁻', '²⁺', '²⁻', '³⁺', '³⁻', '⁴⁺', '⁴⁻'].includes(sym);
    const isNum = /^\d+$/.test(sym);
    let extraClass = '';
    if (isOp) extraClass = 'pill-op';
    else if (isCharge) extraClass = 'pill-charge';
    else if (isNum) extraClass = 'pill-num';
    else if (sym.includes('⁺') || sym.includes('⁻')) extraClass = 'pill-ion';

    const koName = (!isOp && !isCharge && !isNum) ? getTokenKoreanName(sym) : '';
    const pronName = (!isOp && !isCharge && !isNum) ? getTokenPronunciationKo(sym) : '';
    const showSubName = koName && koName !== sym;

    return `
      <button class="beaker-atom-pill ${extraClass}" data-beaker-idx="${idx}" title="${showSubName ? `${sym} [${pronName}] (${koName}) - 터치하여 꺼내기` : '터치하여 비커에서 꺼내기'}">
        <span class="pill-sym-text">${sym}</span>
        ${showSubName ? `<small class="pill-ko-name">${koName}${pronName ? ` [${pronName}]` : ''}</small>` : ''}
        <span class="pill-remove-x">✕</span>
      </button>
    `;
  }).join('');
}

function getInventoryRecipes(mode) {
  const query = (alchemyState.inventorySearch || '').trim().toLowerCase();
  return ALCHEMY_RECIPES.filter(r => {
    const isAvailable = mode === 'all' || alchemyState.unlockedRecipes.includes(r.id) || STARTER_INVENTORY_IDS.includes(r.id);
    if (!isAvailable) return false;
    if (!query) return true;
    const tokenVal = r.shortFormula || r.formula.split(' ')[0];
    const pronStr = getTokenPronunciationKo(tokenVal).toLowerCase();
    return (
      r.name.toLowerCase().includes(query) ||
      r.formula.toLowerCase().includes(query) ||
      (r.shortFormula && r.shortFormula.toLowerCase().includes(query)) ||
      pronStr.includes(query)
    );
  });
}

function renderInventoryItemsHtml() {
  const list = getInventoryRecipes(alchemyState.inventoryFilter);
  if (list.length === 0) {
    return `<div class="inventory-empty-msg">검색된 도감 물질이 없습니다. 다른 검색어를 입력하거나 [전체 도감 시약] 탭을 눌러보세요!</div>`;
  }
  return list.map(r => {
    const isUnlocked = alchemyState.unlockedRecipes.includes(r.id);
    const isStarter = STARTER_INVENTORY_IDS.includes(r.id);
    const tokenVal = r.shortFormula || r.formula.split(' ')[0];
    const pronVal = getTokenPronunciationKo(tokenVal);
    return `
      <div class="inventory-item-slot ${isUnlocked ? 'unlocked' : (isStarter ? 'starter' : 'preview')}"
           draggable="true"
           data-token="${tokenVal}"
           data-recipe-id="${r.id}"
           title="비커로 드래그하거나 클릭하여 [${tokenVal} (${pronVal})] 투입!">
        <div class="inv-slot-top">
          <span class="inv-slot-icon">${r.icon}</span>
          <span class="inv-slot-formula">${tokenVal}</span>
        </div>
        <div class="inv-slot-pron">[${pronVal}]</div>
        <div class="inv-slot-name">${r.name.replace(/\s*\(.*?\)/, '')}</div>
        <div class="inv-slot-badge">${isUnlocked ? '✅ 도감해금' : (isStarter ? '🧪 기본시약' : '🔓 실험시약')}</div>
      </div>
    `;
  }).join('');
}

function addTokenToBeaker(sym, container) {
  if (!sym) return;
  if (alchemyState.beakerElements.length >= 16) {
    alert('비커가 가득 찼습니다! (최대 16개 기호/물질)');
    return;
  }
  playSoundEffect('flip');
  triggerHaptic('short');
  alchemyState.beakerElements.push(sym);
  updateBeakerDisplay(container);
}

function bindShelfAtomButtons(container) {
  const shelfBtns = container.querySelectorAll('.shelf-atom-btn');
  shelfBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (btn._justDragged) {
        e.preventDefault();
        return;
      }
      addTokenToBeaker(btn.dataset.symbol, container);
    });
    btn.addEventListener('dragstart', (e) => {
      e.dataTransfer?.setData('text/plain', btn.dataset.symbol);
      btn.classList.add('dragging');
    });
    btn.addEventListener('dragend', () => {
      btn.classList.remove('dragging');
    });
    bindTouchDragToBeaker(btn, () => btn.dataset.symbol, container);
  });
}

function bindOperatorButtons(container) {
  const opBtns = container.querySelectorAll('.alchemy-op-btn');
  opBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (btn._justDragged) {
        e.preventDefault();
        return;
      }
      addTokenToBeaker(btn.dataset.op, container);
    });
    btn.addEventListener('dragstart', (e) => {
      e.dataTransfer?.setData('text/plain', btn.dataset.op);
      btn.classList.add('dragging');
    });
    btn.addEventListener('dragend', () => {
      btn.classList.remove('dragging');
    });
    bindTouchDragToBeaker(btn, () => btn.dataset.op, container);
  });
}

function bindInventoryEvents(container) {
  const modeBtns = container.querySelectorAll('[data-inv-mode]');
  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      alchemyState.inventoryFilter = btn.dataset.invMode;
      modeBtns.forEach(b => b.classList.toggle('active', b.dataset.invMode === alchemyState.inventoryFilter));
      refreshInventoryGrid(container);
    });
  });

  const searchInput = document.getElementById('inventorySearchInput');
  searchInput?.addEventListener('input', () => {
    alchemyState.inventorySearch = searchInput.value;
    refreshInventoryGrid(container);
  });

  bindInventorySlotActions(container);
}

function refreshInventoryGrid(container) {
  const grid = document.getElementById('alchemyInventoryGrid');
  if (!grid) return;
  grid.innerHTML = renderInventoryItemsHtml();
  bindInventorySlotActions(container);
}

function bindInventorySlotActions(container) {
  const slots = container.querySelectorAll('.inventory-item-slot');
  slots.forEach(slot => {
    slot.addEventListener('click', (e) => {
      if (slot._justDragged) {
        e.preventDefault();
        return;
      }
      addTokenToBeaker(slot.dataset.token, container);
    });
    slot.addEventListener('dragstart', (e) => {
      e.dataTransfer?.setData('text/plain', slot.dataset.token);
      slot.classList.add('dragging');
    });
    slot.addEventListener('dragend', () => {
      slot.classList.remove('dragging');
    });
    bindTouchDragToBeaker(slot, () => slot.dataset.token, container);
  });
}

function bindRecipeBookCardActions(container) {
  const cards = container.querySelectorAll('.recipe-item-card');
  cards.forEach(card => {
    const putBtn = card.querySelector('.recipe-put-beaker-btn');
    if (putBtn) {
      putBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const token = putBtn.dataset.token;
        addTokenToBeaker(token, container);
        const bookModal = document.getElementById('recipeBookModal');
        if (bookModal) bookModal.style.display = 'none';
      });
    }
  });
}

/**
 * 우측 전용 스크롤 레일(▲/▼ 버튼 및 터치 슬라이드 트랙) 바인딩
 */
function bindDeckScrollControls(container) {
  const scrollDeck = container.querySelector('#alchemyScrollDeck');
  const upBtn = container.querySelector('#scrollDeckUpBtn');
  const downBtn = container.querySelector('#scrollDeckDownBtn');
  const railTrack = container.querySelector('#railTouchTrack');
  if (!scrollDeck) return;

  upBtn?.addEventListener('click', () => {
    scrollDeck.scrollBy({ top: -240, behavior: 'smooth' });
  });

  downBtn?.addEventListener('click', () => {
    scrollDeck.scrollBy({ top: 240, behavior: 'smooth' });
  });

  if (railTrack) {
    let lastRailY = 0;
    railTrack.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      lastRailY = e.touches[0].clientY;
      railTrack.classList.add('rail-active');
    }, { passive: true });

    railTrack.addEventListener('touchmove', (e) => {
      if (e.touches.length !== 1) return;
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
      const curY = e.touches[0].clientY;
      const deltaY = curY - lastRailY;
      lastRailY = curY;
      // 손가락 이동량의 2.5배 속도로 원소 목록을 시원하게 스크롤
      scrollDeck.scrollTop += deltaY * 2.5;
    }, { passive: false });

    const endRail = () => railTrack.classList.remove('rail-active');
    railTrack.addEventListener('touchend', endRail);
    railTrack.addEventListener('touchcancel', endRail);
  }
}

/**
 * 비커 드롭존 (마우스 Drag & Drop + 터치 드롭) 바인딩
 */
function bindBeakerDragAndDrop(container) {
  const beakerGlass = container.querySelector('#beakerGlassEl');
  const pinnedCol = container.querySelector('.alchemy-pinned-beaker-col');
  const dropTargets = [beakerGlass, pinnedCol].filter(Boolean);

  dropTargets.forEach(target => {
    target.addEventListener('dragover', (e) => {
      e.preventDefault();
      beakerGlass?.classList.add('drag-over');
    });

    target.addEventListener('dragleave', () => {
      beakerGlass?.classList.remove('drag-over');
    });

    target.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      beakerGlass?.classList.remove('drag-over');
      const token = e.dataTransfer?.getData('text/plain');
      if (token) {
        addTokenToBeaker(token, container);
      }
    });
  });
}

/**
 * 모바일 터치 드래그 앤 드롭 지원
 * - 비커는 상단/좌측에 항상 고정되어 있으므로 화면 밖으로 사라지지 않음!
 * - 'drag' 모드(기본): 카드를 끌면 원소 목록 스크롤 없이 즉시 고정된 비커로 드래그 앤 드롭!
 * - 'scroll' 모드: 카드를 위아래로 밀면 원소 목록 스크롤, 0.16초 누르면 비커로 드래그!
 */
function bindTouchDragToBeaker(el, getTokenFn, container) {
  let ghostEl = null;
  let startX = 0;
  let startY = 0;
  let isDragging = false;
  let isScrollingList = false;
  let holdTimer = null;

  const startDragGhost = (clientX, clientY) => {
    if (isDragging) return;
    isDragging = true;
    el.classList.add('dragging');
    document.body.classList.add('alchemy-dragging-active');
    triggerHaptic('short');

    const token = getTokenFn();
    const koName = getTokenKoreanName(token);
    ghostEl = document.createElement('div');
    ghostEl.className = 'alchemy-touch-ghost';
    ghostEl.textContent = (koName && koName !== token) ? `${token} (${koName})` : token;
    ghostEl.style.left = `${clientX}px`;
    ghostEl.style.top = `${clientY}px`;
    document.body.appendChild(ghostEl);
  };

  const isTouchOverPinnedBeaker = (clientX, clientY) => {
    const beakerGlass = document.getElementById('beakerGlassEl');
    const pinnedStage = container.querySelector('.alchemy-pinned-beaker-col');
    if (beakerGlass) {
      const r = beakerGlass.getBoundingClientRect();
      if (clientX >= r.left - 20 && clientX <= r.right + 20 &&
          clientY >= r.top - 20 && clientY <= r.bottom + 20) {
        return true;
      }
    }
    if (pinnedStage) {
      const pr = pinnedStage.getBoundingClientRect();
      if (clientX >= pr.left && clientX <= pr.right &&
          clientY >= pr.top && clientY <= pr.bottom) {
        return true;
      }
    }
    return false;
  };

  el.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    isDragging = false;
    isScrollingList = false;

    if (holdTimer) clearTimeout(holdTimer);
    if (alchemyState.touchDragMode === 'scroll') {
      // 스크롤 우선 모드에서는 160ms 홀드 시 드래그 활성화
      holdTimer = setTimeout(() => {
        if (!isScrollingList) {
          startDragGhost(startX, startY);
        }
      }, 160);
    }
  }, { passive: true });

  el.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - startX);
    const dy = Math.abs(touch.clientY - startY);

    if (alchemyState.touchDragMode === 'scroll') {
      if (!isDragging) {
        if (dx > 8 || dy > 8) {
          isScrollingList = true;
          if (holdTimer) {
            clearTimeout(holdTimer);
            holdTimer = null;
          }
        }
        return; // 브라우저가 #alchemyScrollDeck 내부만 자연스럽게 스크롤하도록 허용
      }
    } else {
      // 기본 'drag' 모드: 원소 카드를 끌 때 화면/목록 스크롤을 100% 차단하고 즉시 비커로 드래그!
      if (e.cancelable) {
        e.preventDefault();
      }
      e.stopPropagation();

      if (!isDragging && (dx > 4 || dy > 4)) {
        startDragGhost(touch.clientX, touch.clientY);
      }
    }

    if (isDragging && ghostEl) {
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
      ghostEl.style.left = `${touch.clientX}px`;
      ghostEl.style.top = `${touch.clientY}px`;

      const beakerGlass = document.getElementById('beakerGlassEl');
      if (beakerGlass) {
        beakerGlass.classList.toggle('drag-over', isTouchOverPinnedBeaker(touch.clientX, touch.clientY));
      }
    }
  }, { passive: false });

  const endTouch = (e) => {
    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
    document.body.classList.remove('alchemy-dragging-active');
    el.classList.remove('dragging');

    if (!isDragging) return;
    isDragging = false;
    el._justDragged = true;
    setTimeout(() => { el._justDragged = false; }, 350);

    if (ghostEl) {
      ghostEl.remove();
      ghostEl = null;
    }

    const beakerGlass = document.getElementById('beakerGlassEl');
    if (beakerGlass) {
      beakerGlass.classList.remove('drag-over');
    }

    const touch = e.changedTouches?.[0];
    if (touch && isTouchOverPinnedBeaker(touch.clientX, touch.clientY)) {
      addTokenToBeaker(getTokenFn(), container);
    }
  };

  el.addEventListener('touchend', endTouch);
  el.addEventListener('touchcancel', endTouch);
}

function renderRecipeGridItems(catFilter) {
  const recipes = catFilter === 'all'
    ? ALCHEMY_RECIPES
    : ALCHEMY_RECIPES.filter(r => r.category === catFilter);

  return recipes.map(r => {
    const isUnlocked = alchemyState.unlockedRecipes.includes(r.id);
    const tokenVal = r.shortFormula || r.formula.split(' ')[0];
    return `
      <div class="recipe-item-card ${isUnlocked ? 'unlocked' : 'locked'}" data-recipe-id="${r.id}">
        <span class="recipe-icon">${isUnlocked ? r.icon : '🔒'}</span>
        <div class="recipe-text" style="flex:1;">
          <div class="recipe-title-row">
            <strong>${isUnlocked ? r.name : '미지의 물질/반응'}</strong>
            <span class="recipe-formula">${isUnlocked ? r.formula : '???'}</span>
          </div>
          <small>${isUnlocked ? r.desc : '조합 힌트: ' + r.elements.join(' + ')}</small>
          <div class="recipe-card-footer">
            <button class="recipe-put-beaker-btn" data-token="${tokenVal}">
              🧪 [${tokenVal}] 비커에 넣기
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function updateBeakerDisplay(container) {
  const itemsContainer = document.getElementById('beakerItems');
  if (itemsContainer) {
    itemsContainer.innerHTML = renderBeakerPillsHtml();
  }
  const expr = formatBeakerExpression(alchemyState.beakerElements);
  const koNames = formatBeakerKoreanNames(alchemyState.beakerElements);
  const pronNames = formatBeakerPronunciations(alchemyState.beakerElements);
  const previewEl = document.getElementById('beakerFormulaPreview');
  if (previewEl) {
    previewEl.innerHTML = expr
      ? `<div class="formula-expr-main"><strong>${expr}</strong></div><div class="formula-ko-sub">🇰🇷 ${koNames} <span class="formula-pron-sub">🗣️ [${pronNames}]</span></div>`
      : '<span class="formula-placeholder">예: Na⁺[엔에이 플러스] + Cl⁻[씨엘 마이너스], 2NaOH⁻</span>';
  }
  const directInput = document.getElementById('directFormulaInput');
  if (directInput && document.activeElement !== directInput) {
    directInput.value = expr;
  }
}

/**
 * 똑똑한 연금술 힌트 엔진: 비커에 들어있는 원소·이온·수식과 가장 가까운 레시피 제안
 */
function findAlchemyHint(currentTokens) {
  if (currentTokens.includes('÷')) {
    return '💡 사칙연산 나눗셈(÷) 힌트: <strong>NaCl ÷</strong> (소금물 이온화) 또는 <strong>NaOH ÷</strong> (가성소다 이온화)를 넣어 반응시켜 보세요!';
  }
  if (currentTokens.some(t => t.includes('⁺') || t.includes('⁻'))) {
    return '💡 이온 결합 힌트: <strong>Na⁺ + Cl⁻</strong> (소금), <strong>Na⁺ + OH⁻</strong> (가성소다), <strong>Ag⁺ + Cl⁻</strong> (염화은 앙금), <strong>Ca²⁺ + CO₃²⁻</strong> (탄산칼슘), <strong>H⁺ + OH⁻</strong> (물)를 조합해 보세요!';
  }

  const baseAtoms = expandTokensToBaseAtoms(currentTokens);
  const currentCounts = {};
  baseAtoms.forEach(s => currentCounts[s] = (currentCounts[s] || 0) + 1);

  const candidates = ALCHEMY_RECIPES.filter(r => !alchemyState.unlockedRecipes.includes(r.id));
  let bestMatch = null;
  let missingAtoms = [];
  let maxCommon = -1;

  candidates.forEach(r => {
    const recipeCounts = {};
    r.elements.forEach(s => recipeCounts[s] = (recipeCounts[s] || 0) + 1);

    let commonCount = 0;
    const missing = [];

    for (const [sym, count] of Object.entries(recipeCounts)) {
      const curCount = currentCounts[sym] || 0;
      commonCount += Math.min(curCount, count);
      if (curCount < count) {
        for (let i = 0; i < (count - curCount); i++) missing.push(sym);
      }
    }

    if (commonCount > maxCommon && commonCount >= 1) {
      maxCommon = commonCount;
      bestMatch = r;
      missingAtoms = missing;
    }
  });

  if (bestMatch && missingAtoms.length > 0 && missingAtoms.length <= 3) {
    return `💭 연금술사의 힌트: <strong>[${missingAtoms.join(', ')}]</strong>을(를) 더 넣으면 <strong>${bestMatch.name}</strong>(${bestMatch.formula})가 완성될 것 같아요!`;
  }

  return '💡 힌트: 도감 인벤토리에서 <strong>NaOH + HCl</strong>(중화반응), <strong>Na⁺ + Cl⁻</strong>(이온결합), <strong>2NaOH⁻</strong> 또는 <strong>NaCl ÷</strong>(전해질 이온화)를 실험해 보세요!';
}

function handleCombineReaction(container) {
  const directInput = document.getElementById('directFormulaInput');
  if (alchemyState.beakerElements.length === 0 && directInput && directInput.value.trim()) {
    alchemyState.beakerElements = parseExpressionToTokens(directInput.value);
    updateBeakerDisplay(container);
  }

  if (alchemyState.beakerElements.length === 0) {
    alert('비커에 먼저 원소, 이온, 연산기호 또는 도감 물질을 넣어주세요!');
    return;
  }

  playSoundEffect('bubble');
  triggerHaptic('short');

  const fluid = document.getElementById('beakerFluid');
  const glass = document.getElementById('beakerGlassEl');
  const hintBox = document.getElementById('alchemyHintBox');

  if (fluid) fluid.classList.add('reacting');
  if (glass) glass.classList.add('shake-active');

  stopAlchemyTimer();
  alchemyState.reactionTimeoutId = setTimeout(() => {
    alchemyState.reactionTimeoutId = null;
    if (fluid) fluid.classList.remove('reacting');
    if (glass) glass.classList.remove('shake-active');

    const rawTokens = [...alchemyState.beakerElements];
    const exprString = formatBeakerExpression(rawTokens);

    // '+'와 '➔', '=' 같은 단순 연결 기호를 제외한 핵심 토큰 배열
    const activeTokens = rawTokens.filter(t => t !== '+' && t !== '➔' && t !== '=');
    const activeSorted = [...activeTokens].sort().join(',');

    // 숫자 계수/전하 기호까지 제거한 순수 물질/원소 토큰
    const chemOnlyTokens = activeTokens.filter(t => !/^\d+$/.test(t) && !['-', '⁺', '⁻', '²⁺', '²⁻', '³⁺', '³⁻', '⁴⁺', '⁴⁻', '(', ')', '×', '÷'].includes(t));
    const chemOnlySorted = [...chemOnlyTokens].sort().join(',');

    // 원소 단위로 완전 전개한 배열 (예: 2NaOH- -> Na, O, H / Na⁺ + Cl⁻ -> Na, Cl)
    const expandedAtoms = expandTokensToBaseAtoms(rawTokens);
    const expandedSorted = [...expandedAtoms].sort().join(',');
    const uniqueAtomsSorted = [...new Set(expandedAtoms)].sort().join(',');

    // 1순위: 정확한 토큰 조합 또는 altCombos 매칭 (이온 반응, 사칙연산 반응 등)
    let matchingRecipes = ALCHEMY_RECIPES.filter(r => {
      const rSorted = [...r.elements].sort().join(',');
      if (rSorted === activeSorted || rSorted === chemOnlySorted) return true;
      if (Array.isArray(r.altCombos)) {
        return r.altCombos.some(combo => {
          const cSorted = [...combo].sort().join(',');
          return cSorted === activeSorted || cSorted === chemOnlySorted;
        });
      }
      return false;
    });

    // 2순위: 원소 전개 매칭 (계수 2, 3이나 이온 전하가 붙어 있어도 기반 화합물 매칭!)
    if (matchingRecipes.length === 0 && expandedAtoms.length > 0) {
      matchingRecipes = ALCHEMY_RECIPES.filter(r => {
        const rSorted = [...r.elements].sort().join(',');
        if (rSorted === expandedSorted) return true;
        const rUnique = [...new Set(r.elements)].sort().join(',');
        const hasMultiplier = rawTokens.some(t => /^\d+$/.test(t) || t === '×' || t === '-' || t === '⁻' || t === '⁺' || t === '²⁺' || t === '²⁻' || t === '³⁺' || t === '³⁻');
        return hasMultiplier && rUnique === uniqueAtomsSorted && r.elements.every(el => expandedAtoms.includes(el));
      });
    }

    let matched = matchingRecipes.find(r => !alchemyState.unlockedRecipes.includes(r.id)) || matchingRecipes[0];

    // 3순위: 75종 정규 도감 외에 임의의 [양이온 + 음이온] 조합을 넣었을 때도 동적 이온결합 염(Salt) 자동 합성 지원!
    if (!matched) {
      const fullShelf = getFullAlchemyShelfItems();
      const cationsInBeaker = chemOnlyTokens.map(t => fullShelf.find(e => e.symbol === t && e.cat === 'cation')).filter(Boolean);
      const anionsInBeaker = chemOnlyTokens.map(t => fullShelf.find(e => e.symbol === t && e.cat === 'anion' && e.symbol !== 'e⁻')).filter(Boolean);
      if (cationsInBeaker.length >= 1 && anionsInBeaker.length >= 1) {
        const catIon = cationsInBeaker[0];
        const anIon = anionsInBeaker[0];
        const catBase = catIon.symbol.replace(/[⁺⁻²³⁴⁵⁶⁷⁸]/g, '');
        const anBase = anIon.symbol.replace(/[⁺⁻²³⁴⁵⁶⁷⁸]/g, '');
        const cleanCatName = catIon.name.replace(/\s*(양이온|이온).*$/, '');
        const cleanAnName = anIon.name.replace(/\s*(음이온|이온).*$/, '');
        matched = {
          id: `dynamic_ion_${catBase}_${anBase}`,
          isDynamic: true,
          name: `${cleanAnName} ${cleanCatName} (이온결합 화합물)`,
          formula: `${catIon.symbol} + ${anIon.symbol} ➔ ${catBase}${anBase}`,
          elements: [catIon.symbol, anIon.symbol],
          icon: '⚗️',
          desc: `양이온인 [${catIon.name}(${catIon.symbol})]과 음이온인 [${anIon.name}(${anIon.symbol})]이 정전기적 인력(쿨롱 힘)으로 결합하여 생성된 이온결합 염(Salt)입니다!`
        };
      }
    }

    if (matched) {
      if (hintBox) hintBox.style.display = 'none';
      playSoundEffect('alchemy_success');
      triggerHaptic('success');

      if (!matched.isDynamic && !alchemyState.unlockedRecipes.includes(matched.id)) {
        alchemyState.unlockedRecipes.push(matched.id);
      }

      // 만약 계수나 음이온/양이온 부호(예: NaCl-, 2NaOH-)가 함께 들어간 수식이면 연관 이온 도감도 보너스 해금!
      let bonusNote = '';
      if (rawTokens.includes('-') || rawTokens.includes('⁻') || rawTokens.includes('⁺') || rawTokens.some(t => /^\d+$/.test(t))) {
        if (exprString.includes('NaOH') || (expandedAtoms.includes('Na') && expandedAtoms.includes('O') && expandedAtoms.includes('H'))) {
          if (!alchemyState.unlockedRecipes.includes('alkali_ionization')) alchemyState.unlockedRecipes.push('alkali_ionization');
          if (!alchemyState.unlockedRecipes.includes('hydroxide_ion')) alchemyState.unlockedRecipes.push('hydroxide_ion');
          if (!alchemyState.unlockedRecipes.includes('caustic_soda')) alchemyState.unlockedRecipes.push('caustic_soda');
          bonusNote = `🧪 <strong>수식 정밀 분석 [${exprString}]</strong>: 수산화나트륨(NaOH) 계열 수식입니다! 수용액에서는 양이온 <strong>Na⁺</strong>와 수산화 음이온 <strong>OH⁻</strong>로 이온화(2NaOH ➔ 2Na⁺ + 2OH⁻)됩니다.`;
        } else if (exprString.includes('NaCl') || (expandedAtoms.includes('Na') && expandedAtoms.includes('Cl'))) {
          if (!alchemyState.unlockedRecipes.includes('electrolysis_nacl')) alchemyState.unlockedRecipes.push('electrolysis_nacl');
          if (!alchemyState.unlockedRecipes.includes('salt')) alchemyState.unlockedRecipes.push('salt');
          bonusNote = `🧪 <strong>수식 정밀 분석 [${exprString}]</strong>: 염화나트륨(NaCl) 이온 수식입니다! 소금은 나트륨 양이온(<strong>Na⁺</strong>)과 염화 음이온(<strong>Cl⁻</strong>)이 1:1로 결합한 물질입니다.`;
        } else {
          bonusNote = `🧪 <strong>입력 수식 [${exprString}]</strong> 분석 완료! 계수와 전하가 포함된 화학식을 성공적으로 해석했습니다.`;
        }
      }

      localStorage.setItem('periodic_alchemy_unlocked', JSON.stringify(alchemyState.unlockedRecipes));

      showAlchemySuccessModal(matched, container, exprString, bonusNote);
      alchemyState.beakerElements = [];
      updateBeakerDisplay(container);
    } else {
      playSoundEffect('wrong');
      triggerHaptic('wrong');

      const hintText = findAlchemyHint(alchemyState.beakerElements);
      if (hintBox) {
        hintBox.style.display = 'block';
        hintBox.innerHTML = `⚠️ <strong>[${exprString}]</strong> 반응 실패! 새로운 물질이 합성되지 않았습니다.<br><small>${hintText}</small>`;
      }
    }
  }, 700);
}

function showAlchemySuccessModal(recipe, container, exprString, bonusNote) {
  const modalHtml = `
    <div id="alchemySuccessModal" class="app-modal-backdrop" style="display:flex;">
      <div class="app-modal-card alchemy-success-card">
        <div class="success-sparkles">✨ 🎉 ✨</div>
        <div class="success-icon-large">${recipe.icon}</div>
        <h2 class="success-compound-name">${recipe.name}</h2>
        <div class="success-formula-badge">${recipe.formula}</div>
        ${exprString ? `<div class="success-input-expr">내 실험 수식: <code>${exprString}</code></div>` : ''}
        <p class="success-desc">${recipe.desc}</p>
        ${bonusNote ? `<div class="success-bonus-analysis">${bonusNote}</div>` : ''}
        <div class="success-recipe-tag">결합 구성: ${recipe.elements.join(' + ')}</div>
        <button id="closeAlchemySuccessBtn" class="action-btn primary large-btn" style="width:100%; margin-top:1.2rem;">
          도감 & 인벤토리에 등록 완료! 확인 👍
        </button>
      </div>
    </div>
  `;

  const div = document.createElement('div');
  div.innerHTML = modalHtml;
  document.body.appendChild(div);

  document.getElementById('closeAlchemySuccessBtn')?.addEventListener('click', () => {
    div.remove();
    renderAlchemyGameLobby(container);
  });
}

// OTA 핫패치로 스크립트가 동적 로드되었을 때 현재 연금술 탭이 열려 있다면 새 고정 비커 레이아웃으로 즉시 갱신
(function autoRefreshAlchemyViewIfOpen() {
  const contentEl = document.getElementById('gameSuiteContent');
  if (contentEl && contentEl.querySelector('.alchemy-lab-wrapper')) {
    renderAlchemyGameLobby(contentEl);
  }
})();


