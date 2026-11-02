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

// Web Audio API 사운드 합성기 싱글톤 관리
let gameAudioCtx = null;

function getGameAudioContext() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!gameAudioCtx) {
      gameAudioCtx = new AudioCtx();
    }
    if (gameAudioCtx.state === 'suspended') {
      gameAudioCtx.resume().catch(() => {});
    }
    return gameAudioCtx;
  } catch (e) {
    return null;
  }
}

function playSoundEffect(type) {
  if (typeof quizState !== 'undefined' && !quizState.isSoundEnabled) return;
  try {
    const ctx = getGameAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (type === 'flip') {
      // 카드 뒤집는 틱 사운드
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.06);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if (type === 'match') {
      // 짝 맞춤: 맑고 영롱한 아르페지오 (C5 -> E5 -> G5)
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.2, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.25);
      });
    } else if (type === 'bubble') {
      // 화학 합성 보글보글 사운드
      [350, 480, 620, 800].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.18, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.12);
      });
    } else if (type === 'alchemy_success') {
      // 화합물 합성 대성공 팡파레
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);
        gain.gain.setValueAtTime(0.25, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.35);
      });
    } else if (type === 'wrong') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(120, now + 0.2);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    }
  } catch (e) {}
}

function triggerHaptic(type) {
  if (!('vibrate' in navigator)) return;
  try {
    if (type === 'short') navigator.vibrate(25);
    else if (type === 'success') navigator.vibrate([30, 40, 50]);
    else if (type === 'wrong') navigator.vibrate([40, 50, 40]);
  } catch (e) {}
}

/**
 * 게임 메인 컨테이너 초기화 및 상단 탭 렌더링
 */
window.initGameSuite = function() {
  const container = document.getElementById('quizContainer');
  if (!container) return;

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
      setTimeout(() => {
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
      setTimeout(() => {
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

  setTimeout(() => {
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
const ALCHEMY_RECIPES = [
  // [1. 생명과 자연 - 10종]
  { id: 'water', category: 'nature', name: '물 (생명의 근원)', shortFormula: 'H₂O', formula: 'H₂O', elements: ['H', 'H', 'O'], altCombos: [['H⁺', 'OH⁻'], ['H₂O₂', '-', 'O']], icon: '💧', desc: '지구 생명체의 70%를 이루는 가장 소중한 액체 화합물입니다. (H⁺ + OH⁻ 중화 반응으로도 생성!)' },
  { id: 'co2', category: 'nature', name: '이산화탄소 (탄산가스)', shortFormula: 'CO₂', formula: 'CO₂', elements: ['C', 'O', 'O'], altCombos: [['CO', 'O'], ['CaCO₃', '-', 'CaO']], icon: '🫧', desc: '식물이 광합성을 할 때 마시고, 시원한 탄산음료에 톡 쏘는 기포를 만듭니다.' },
  { id: 'h2o2', category: 'nature', name: '과산화수소 (상처 소독약)', shortFormula: 'H₂O₂', formula: 'H₂O₂', elements: ['H', 'H', 'O', 'O'], altCombos: [['H₂O', 'O'], ['OH⁻', 'OH⁻']], icon: '🩹', desc: '피부에 바르면 하얀 산소 거품을 내며 유해 세균을 소독하는 약품입니다.' },
  { id: 'ozone', category: 'nature', name: '오존 (성층권 보호막)', shortFormula: 'O₃', formula: 'O₃', elements: ['O', 'O', 'O'], altCombos: [['O', '×', '3'], ['3', 'O']], icon: '🛡️', desc: '지구 성층권에서 태양의 해로운 자외선을 99% 막아주는 든든한 방패입니다.' },
  { id: 'co', category: 'nature', name: '일산화탄소 (불완전연소 가스)', shortFormula: 'CO', formula: 'CO', elements: ['C', 'O'], altCombos: [['CO₂', '-', 'O']], icon: '⚠️', desc: '산소가 부족한 상태에서 탈 때 생기는 무색무취의 치명적인 독성 가스입니다.' },
  { id: 'methane', category: 'nature', name: '메테인 (천연도시가스)', shortFormula: 'CH₄', formula: 'CH₄', elements: ['C', 'H', 'H', 'H', 'H'], altCombos: [['C', '4', 'H'], ['C', 'H', '×', '4']], icon: '🔥', desc: '가정에서 보일러를 켜고 요리를 할 때 태우는 깨끗한 천연가스(LNG)의 주성분입니다.' },
  { id: 'ammonia', category: 'nature', name: '암모니아 (농업 비료)', shortFormula: 'NH₃', formula: 'NH₃', elements: ['N', 'H', 'H', 'H'], altCombos: [['N', '3', 'H'], ['NH₄⁺', '-', 'H⁺']], icon: '🌾', desc: '질소 비료를 만들어 전 세계 수십억 인류의 식량 위기를 해결한 기적의 화합물입니다.' },
  { id: 'glucose', category: 'nature', name: '포도당 (에너지 원천)', shortFormula: 'C₆H₁₂O₆', formula: 'C₆H₁₂O₆ (단순비)', elements: ['C', 'H', 'O'], altCombos: [['CO₂', 'H₂O']], icon: '🍇', desc: '식물이 햇빛으로 물(H₂O)과 이산화탄소(CO₂)를 합성해 만든 생체 에너지 연료입니다.' },
  { id: 'urea', category: 'nature', name: '요소 (최초의 인공합성 유기물)', shortFormula: 'CH₄N₂O', formula: 'CH₄N₂O', elements: ['C', 'O', 'N', 'H'], altCombos: [['NH₃', 'CO₂']], icon: '🌱', desc: '1828년 뵐러가 무기물로 합성하여 유기화학의 새 시대를 연 친환경 비료 성분입니다.' },
  { id: 'h2s', category: 'nature', name: '황화수소 (달걀 썩는 냄새/온천)', shortFormula: 'H₂S', formula: 'H₂S', elements: ['H', 'H', 'S'], altCombos: [['H⁺', 'H⁺', 'S²⁻'], ['2', 'H⁺', 'S²⁻']], icon: '♨️', desc: '유황 온천의 독특한 냄새이자 화산 분화구에서 뿜어져 나오는 유황 가스입니다.' },

  // [2. 주방과 일상 화학 - 10종]
  { id: 'salt', category: 'daily', name: '소금 (식염 / 염화나트륨)', shortFormula: 'NaCl', formula: 'NaCl', elements: ['Na', 'Cl'], altCombos: [['Na⁺', 'Cl⁻'], ['NaOH', 'HCl']], icon: '🧂', desc: '양이온(Na⁺)과 음이온(Cl⁻)이 정전기적 인력으로 결합한 대표적인 이온결합 물질입니다.' },
  { id: 'baking_soda', category: 'daily', name: '베이킹소다 (탄산수소나트륨)', shortFormula: 'NaHCO₃', formula: 'NaHCO₃', elements: ['Na', 'H', 'C', 'O'], altCombos: [['Na⁺', 'HCO₃⁻'], ['NaOH', 'CO₂']], icon: '🧁', desc: '빵을 푹신하게 부풀리고 주방 기름때를 깨끗이 지워주는 만능 친환경 가루입니다.' },
  { id: 'acid', category: 'daily', name: '염산 (위산 / 염화수소)', shortFormula: 'HCl', formula: 'HCl', elements: ['H', 'Cl'], altCombos: [['H⁺', 'Cl⁻']], icon: '🧪', desc: '물에 녹아 수소 양이온(H⁺)과 염화 음이온(Cl⁻)으로 완전히 이온화되는 강한 산성 액체입니다.' },
  { id: 'ethanol', category: 'daily', name: '에탄올 (소독용 알코올)', shortFormula: 'C₂H₅OH', formula: 'C₂H₅OH (C-H-O)', elements: ['C', 'H', 'O'], altCombos: [['C', 'H', 'OH⁻']], icon: '🍶', desc: '바이러스를 살균하는 손소독제의 주성분이자 발효주에 들어있는 알코올입니다.' },
  { id: 'quicklime', category: 'daily', name: '생석회 (산화칼슘)', shortFormula: 'CaO', formula: 'CaO', elements: ['Ca', 'O'], altCombos: [['Ca²⁺', 'O²⁻'], ['CaCO₃', '-', 'CO₂']], icon: '🧱', desc: '물과 반응하면 엄청난 열을 뿜어내어 즉석 전투식량 발열팩에 쓰이는 광물입니다.' },
  { id: 'slaked_lime', category: 'daily', name: '소석회 (수산화칼슘)', shortFormula: 'Ca(OH)₂', formula: 'Ca(OH)₂', elements: ['Ca', 'O', 'H'], altCombos: [['CaO', 'H₂O'], ['Ca²⁺', 'OH⁻', 'OH⁻'], ['Ca²⁺', '2', 'OH⁻']], icon: '🪨', desc: '생석회(CaO)에 물(H₂O)을 더하거나 Ca²⁺와 2OH⁻가 만나 만들어지는 염기성 석회입니다.' },
  { id: 'bleach', category: 'daily', name: '표백제 / 락스 (차아염소산나트륨)', shortFormula: 'NaClO', formula: 'NaClO', elements: ['Na', 'Cl', 'O'], altCombos: [['Na⁺', 'ClO⁻'], ['NaCl', 'O'], ['NaOH', 'Cl']], icon: '🫧', desc: '옷의 찌든 때를 하얗게 빼주고 강력한 산화력으로 욕실을 소독하는 청소용품입니다.' },
  { id: 'caustic_soda', category: 'daily', name: '가성소다 / 양잿물 (수산화나트륨)', shortFormula: 'NaOH', formula: 'NaOH', elements: ['Na', 'O', 'H'], altCombos: [['Na⁺', 'OH⁻'], ['Na', 'H₂O']], icon: '🧼', desc: '나트륨 양이온(Na⁺)과 수산화 음이온(OH⁻)으로 이루어진 강염기성 화학 물질의 제왕입니다.' },
  { id: 'vinegar', category: 'daily', name: '식초 (아세트산)', shortFormula: 'CH₃COOH', formula: 'CH₃COOH (C-H-O)', elements: ['C', 'H', 'O'], altCombos: [['C₂H₅OH', 'O']], icon: '🥗', desc: '음식의 새콤한 맛을 내고 피로 해소와 살균 효과를 주는 약산성 발효 조미료입니다.' },
  { id: 'chalk', category: 'daily', name: '탄산칼슘 (조개껍데기/분필)', shortFormula: 'CaCO₃', formula: 'CaCO₃', elements: ['Ca', 'C', 'O', 'O', 'O'], altCombos: [['Ca²⁺', 'CO₃²⁻'], ['CaO', 'CO₂']], icon: '🐚', desc: '칼슘 양이온(Ca²⁺)과 탄산 음이온(CO₃²⁻)이 만나 생성되는 달걀 껍데기·대리석 성분입니다.' },

  // [3. 광물, 보석 & 건축 - 9종]
  { id: 'sand', category: 'mineral', name: '석영 / 유리 (모래)', shortFormula: 'SiO₂', formula: 'SiO₂', elements: ['Si', 'O', 'O'], altCombos: [['Si', '2', 'O']], icon: '🏖️', desc: '바닷가 백사장의 모래이자 투명한 유리창을 만드는 핵심 규소 광물입니다.' },
  { id: 'ruby', category: 'mineral', name: '루비 / 사파이어 (알루미나)', shortFormula: 'Al₂O₃', formula: 'Al₂O₃', elements: ['Al', 'Al', 'O', 'O', 'O'], altCombos: [['Al³⁺', 'O²⁻'], ['2', 'Al³⁺', '3', 'O²⁻']], icon: '💎', desc: '산화알루미늄 결정에 크롬이 섞이면 붉은 루비, 철·티타늄이 섞이면 파란 사파이어가 됩니다.' },
  { id: 'diamond', category: 'mineral', name: '다이아몬드 (순수 탄소 결정)', shortFormula: 'C(다이아)', formula: 'C (결정질)', elements: ['C', 'C', 'C'], altCombos: [['C', '×', '3'], ['3', 'C']], icon: '💍', desc: '지구상에서 가장 단단하고 빛나는 보석으로, 오직 순수한 탄소 원자로만 이루어져 있습니다.' },
  { id: 'graphite', category: 'mineral', name: '흑연 (연필심 / 그래핀)', shortFormula: 'C(흑연)', formula: 'C (판상질)', elements: ['C', 'C'], altCombos: [['C', '×', '2'], ['2', 'C']], icon: '✏️', desc: '부드럽게 종이에 써지는 연필심이자 꿈의 신소재 그래핀의 원천 탄소입니다.' },
  { id: 'fluorite', category: 'mineral', name: '형석 (불소석)', shortFormula: 'CaF₂', formula: 'CaF₂', elements: ['Ca', 'F', 'F'], altCombos: [['Ca²⁺', 'F⁻', 'F⁻'], ['Ca²⁺', '2', 'F⁻']], icon: '🔮', desc: '자외선을 받으면 아름다운 형광 빛을 발하는 치약 속 불소의 주요 광물입니다.' },
  { id: 'cuso4', category: 'mineral', name: '황산구리 (파란 결정)', shortFormula: 'CuSO₄', formula: 'CuSO₄', elements: ['Cu', 'S', 'O'], altCombos: [['Cu²⁺', 'SO₄²⁻']], icon: '🔷', desc: '구리 양이온(Cu²⁺)과 황산 음이온(SO₄²⁻)이 결합한 아름다운 푸른빛 결정입니다.' },
  { id: 'rust', category: 'mineral', name: '산화철 (붉은 녹 / 황토)', shortFormula: 'Fe₂O₃', formula: 'Fe₂O₃', elements: ['Fe', 'Fe', 'O', 'O', 'O'], altCombos: [['Fe³⁺', 'O²⁻'], ['2', 'Fe', '3', 'O']], icon: '🟤', desc: '비 오는 날 철근이나 못이 산소와 만나 붉게 녹스는 반응이자 황토 흙의 붉은색입니다.' },
  { id: 'magnesia', category: 'mineral', name: '산화마그네슘 (내화벽돌)', shortFormula: 'MgO', formula: 'MgO', elements: ['Mg', 'O'], altCombos: [['Mg²⁺', 'O²⁻']], icon: '🧱', desc: '녹는점이 2800℃에 달해 용광로의 안쪽을 감싸는 불사신 내화벽돌의 원료입니다.' },
  { id: 'laughing_gas', category: 'mineral', name: '웃음가스 (아산화질소)', shortFormula: 'N₂O', formula: 'N₂O', elements: ['N', 'N', 'O'], altCombos: [['2', 'N', 'O']], icon: '😄', desc: '마시면 기분이 좋아져 웃음이 난다 하여 치과 마취 진통제로 쓰이는 가스입니다.' },

  // [4. 금속 합금 & 신소재 - 9종]
  { id: 'bronze', category: 'alloy', name: '청동 (인류 최초의 합금)', shortFormula: 'Cu-Sn', formula: 'Cu-Sn', elements: ['Cu', 'Sn'], icon: '🏺', desc: '인류에게 찬란한 청동기 시대를 열어준 구리와 주석의 단단하고 질긴 합금입니다.' },
  { id: 'brass', category: 'alloy', name: '황동 / 놋쇠 (금관악기)', shortFormula: 'Cu-Zn', formula: 'Cu-Zn', elements: ['Cu', 'Zn'], icon: '🎺', desc: '반짝이는 트럼펫, 호른 등 금관악기와 튼튼한 놋그릇을 만드는 아름다운 합금입니다.' },
  { id: 'stainless', category: 'alloy', name: '스테인리스강 (녹슬지 않는 철)', shortFormula: 'Fe-Cr-Ni', formula: 'Fe-Cr-Ni', elements: ['Fe', 'Cr', 'Ni'], icon: '🍴', desc: '철에 크롬과 니켈을 섞어 물에 닿아도 영원히 녹슬지 않는 주방 수저와 조리도구입니다.' },
  { id: 'duralumin', category: 'alloy', name: '두랄루민 (초경량 비행기 소재)', shortFormula: 'Al-Cu-Mg', formula: 'Al-Cu-Mg', elements: ['Al', 'Cu', 'Mg'], icon: '✈️', desc: '알루미늄처럼 가벼우면서도 강철만큼 튼튼하여 비행기 동체와 날개를 만드는 합금입니다.' },
  { id: 'solder', category: 'alloy', name: '땜납 (전자부품 접합)', shortFormula: 'Sn-Pb', formula: 'Sn-Pb', elements: ['Sn', 'Pb'], icon: '🔌', desc: '낮은 온도에서 녹아 스마트폰과 컴퓨터 회로 기판의 부품들을 이어주는 접착 합금입니다.' },
  { id: 'gold18k', category: 'alloy', name: '18K 금합금 (단단한 골드)', shortFormula: 'Au-Cu-Ag', formula: 'Au-Cu-Ag', elements: ['Au', 'Cu', 'Ag'], icon: '👑', desc: '순금(24K)의 무른 단점을 극복하기 위해 구리와 은을 섞어 단단하게 만든 귀금속입니다.' },
  { id: 'nitinol', category: 'alloy', name: '형상기억합금 (니티놀)', shortFormula: 'Ni-Ti', formula: 'Ni-Ti', elements: ['Ni', 'Ti'], icon: '🌀', desc: '구겨지고 휘어져도 뜨거운 물에 넣으면 원래 모습으로 마법처럼 되돌아오는 신소재입니다.' },
  { id: 'amalgam', category: 'alloy', name: '아말감 (치과 충전재)', shortFormula: 'Hg-Ag', formula: 'Hg-Ag', elements: ['Hg', 'Ag'], icon: '🦷', desc: '상온에서 액체인 수은에 은 분말을 섞어 굳힌 역사적인 충치 치료 충전재입니다.' },
  { id: 'ti_alloy', category: 'alloy', name: '타이타늄 합금 (우주선/인공관절)', shortFormula: 'Ti-Al', formula: 'Ti-Al', elements: ['Ti', 'Al'], icon: '🚀', desc: '가볍고 인체에 무해하여 인공관절과 우주 탐사선의 뼈대를 만드는 첨단 소재입니다.' },

  // [5. 에너지, 첨단 & 우주 - 7종]
  { id: 'li_battery', category: 'tech', name: '리튬이온 배터리 소재', shortFormula: 'LiCoO₂', formula: 'Li-Co-O', elements: ['Li', 'Co', 'O'], altCombos: [['Li⁺', 'Co', 'O²⁻']], icon: '🔋', desc: '스마트폰과 전기차를 움직이는 현대 문명의 필수 2차 전지 양극재 화합물입니다.' },
  { id: 'gunpowder', category: 'tech', name: '흑색화약 (인류 4대 발명품)', shortFormula: 'KNO₃-S-C', formula: 'K-N-S-C', elements: ['K', 'N', 'S', 'C'], altCombos: [['K⁺', 'NO₃⁻', 'S', 'C']], icon: '💥', desc: '초석(질산칼륨)과 황, 숯(탄소)을 섞어 인류 역사의 흐름을 바꾼 폭발성 화합물입니다.' },
  { id: 'neon_tube', category: 'tech', name: '네온 조명 가스', shortFormula: 'Ne-He', formula: 'Ne-He', elements: ['Ne', 'He'], icon: '🏮', desc: '진공 유리관에 네온과 헬륨을 넣고 전기를 흘리면 밤거리를 밝히는 붉은빛이 켜집니다.' },
  { id: 'wafer', category: 'tech', name: '반도체 실리콘 잉곳', shortFormula: 'Si₂', formula: 'Si-Si (순수 99.9999%)', elements: ['Si', 'Si'], altCombos: [['Si', '×', '2'], ['2', 'Si']], icon: '💻', desc: '순도 99.9999999%의 초고순도 단결정 실리콘으로 모든 컴퓨터 칩의 어머니입니다.' },
  { id: 'ag_nitrate', category: 'tech', name: '질산은 (사진 감광제)', shortFormula: 'AgNO₃', formula: 'AgNO₃', elements: ['Ag', 'N', 'O'], altCombos: [['Ag⁺', 'NO₃⁻']], icon: '📸', desc: '은 양이온(Ag⁺)과 질산 음이온(NO₃⁻)의 결합물로, 빛에 반응하는 사진 감광제입니다.' },
  { id: 'nuclear_fuel', category: 'tech', name: '우라늄 핵연료봉 (이산화우라늄)', shortFormula: 'UO₂', formula: 'UO₂', elements: ['U', 'O', 'O'], altCombos: [['U', '2', 'O']], icon: '☢️', desc: '원자력 발전소 원자로 안에서 엄청난 전기를 생산하는 이산화우라늄 연료입니다.' },
  { id: 'plat_cat', category: 'tech', name: '백금 촉매 (자동차 매연저감장치)', shortFormula: 'Pt₂', formula: 'Pt (촉매)', elements: ['Pt', 'Pt'], altCombos: [['Pt', '×', '2']], icon: '🚗', desc: '자동차 배기가스 파이프에서 매연과 유해가스를 깨끗한 공기로 정화하는 고가 귀금속입니다.' },

  // [6. 양이온 · 음이온 & 사칙연산 · 앙금 화학 반응 - 30종 (대폭 확장!)]
  { id: 'hydroxide_ion', category: 'ion', name: '수산화 음이온 (염기성의 본체)', shortFormula: 'OH⁻', formula: 'OH⁻', elements: ['O', 'H', '⁻'], altCombos: [['O', 'H', '-'], ['H₂O', '-', 'H⁺'], ['O²⁻', 'H⁺']], icon: '💧', desc: '산소와 수소에 음전하(⁻)가 결합한 다원자 음이온으로, 수용액을 염기성으로 만드는 핵심 주인공입니다.' },
  { id: 'hydronium_ion', category: 'ion', name: '하이드로늄 양이온 (산성의 본체)', shortFormula: 'H₃O⁺', formula: 'H₃O⁺ (H₂O + H⁺)', elements: ['H₂O', 'H⁺'], altCombos: [['H', 'H', 'H', 'O', '⁺'], ['H', '⁺']], icon: '⚡', desc: '물 분자(H₂O)에 수소 양이온(H⁺)이 결합한 형태로, 산성 수용액에서 신맛과 산성을 나타내는 진짜 주역입니다.' },
  { id: 'ammonium_ion', category: 'ion', name: '암모늄 양이온 (다원자 양이온)', shortFormula: 'NH₄⁺', formula: 'NH₄⁺', elements: ['NH₃', 'H⁺'], altCombos: [['N', 'H', 'H', 'H', 'H', '⁺'], ['N', '4', 'H', '⁺']], icon: '🌱', desc: '암모니아(NH₃)가 수소 양이온(H⁺)을 받아들여 형성된 대표적인 다원자 양이온입니다.' },
  { id: 'carbonate_ion', category: 'ion', name: '탄산 음이온 (조개·석회암 이온)', shortFormula: 'CO₃²⁻', formula: 'CO₃²⁻', elements: ['C', 'O', 'O', 'O', '²⁻'], altCombos: [['CO₂', 'O²⁻'], ['HCO₃⁻', '-', 'H⁺']], icon: '🐚', desc: '탄소 1개와 산소 3개가 2가 음전하(²⁻)를 띤 다원자 이온으로, 칼슘 이온(Ca²⁺)과 만나면 산호와 조개껍데기가 됩니다.' },
  { id: 'sulfate_ion', category: 'ion', name: '황산 음이온 (다원자 음이온)', shortFormula: 'SO₄²⁻', formula: 'SO₄²⁻', elements: ['S', 'O', 'O', 'O', 'O', '²⁻'], altCombos: [['S', '4', 'O', '²⁻'], ['H₂SO₄', '-', 'H⁺']], icon: '🔋', desc: '황 원자와 산소 4개가 결합한 안정한 2가 음이온으로, 자동차 납축전지와 각종 금속염에 들어있습니다.' },
  { id: 'nitrate_ion', category: 'ion', name: '질산 음이온 (성장 비료 이온)', shortFormula: 'NO₃⁻', formula: 'NO₃⁻', elements: ['N', 'O', 'O', 'O', '⁻'], altCombos: [['N', '3', 'O', '⁻'], ['N', 'O', 'O', 'O', '-']], icon: '🌿', desc: '식물이 뿌리에서 흡수하여 단백질을 만드는 데 필수적인 1가 다원자 음이온입니다.' },
  { id: 'neutralization', category: 'ion', name: '산·염기 중화 반응 (소금물 + 중화열)', shortFormula: 'NaCl+H₂O', formula: 'NaOH + HCl ➔ NaCl + H₂O', elements: ['NaOH', 'HCl'], altCombos: [['Na⁺', 'OH⁻', 'H⁺', 'Cl⁻'], ['2', 'NaOH', '2', 'HCl']], icon: '⚖️', desc: '강염기인 가성소다(NaOH)와 강산인 염산(HCl)이 만나 독성이 사라지고 순수한 소금(NaCl)과 물(H₂O)이 되는 마법 같은 반응입니다!' },
  { id: 'agcl_precip', category: 'ion', name: '염화은 백색 앙금 (앙금 생성 반응)', shortFormula: 'AgCl↓', formula: 'Ag⁺ + Cl⁻ ➔ AgCl↓', elements: ['Ag⁺', 'Cl⁻'], altCombos: [['AgNO₃', 'NaCl'], ['AgNO₃', 'HCl'], ['Ag', 'Cl']], icon: '🥛', desc: '투명한 은 이온(Ag⁺) 용액과 염화 이온(Cl⁻) 용액이 만나는 순간 눈부신 하얀색 염화은(AgCl) 침전물이 생깁니다.' },
  { id: 'caco3_precip', category: 'ion', name: '석회수 백탁 현상 (탄산칼슘 앙금)', shortFormula: 'CaCO₃↓', formula: 'Ca(OH)₂ + CO₂ ➔ CaCO₃↓ + H₂O', elements: ['Ca(OH)₂', 'CO₂'], altCombos: [['Ca²⁺', 'CO₃²⁻']], icon: '☁️', desc: '투명한 석회수(Ca(OH)₂)에 입김(CO₂)을 불어 넣으면 뿌옇게 흐려지며 탄산칼슘 앙금이 생기는 유명한 실험입니다.' },
  { id: 'nh4cl_smoke', category: 'ion', name: '염화암모늄 (하얀 연기 반응)', shortFormula: 'NH₄Cl', formula: 'NH₃ + HCl ➔ NH₄Cl', elements: ['NH₃', 'HCl'], altCombos: [['NH₄⁺', 'Cl⁻']], icon: '💨', desc: '암모니아(NH₃) 기체와 염화수소(HCl) 기체가 공기 중에서 만나면 불도 없이 새하얀 고체 연기(NH₄Cl)가 피어오릅니다.' },
  { id: 'sulfuric_acid', category: 'ion', name: '황산 (화학 산업의 쌀)', shortFormula: 'H₂SO₄', formula: '2H⁺ + SO₄²⁻ ➔ H₂SO₄', elements: ['H⁺', 'H⁺', 'SO₄²⁻'], altCombos: [['2', 'H⁺', 'SO₄²⁻'], ['H', 'H', 'S', 'O', 'O', 'O', 'O']], icon: '⚠️', desc: '수소 양이온 2개(2H⁺)와 황산 음이온(SO₄²⁻)이 결합한 강산으로, 비료·배터리·섬유 산업의 핵심 원료입니다.' },
  { id: 'nitric_acid', category: 'ion', name: '질산 (강산성 부식액)', shortFormula: 'HNO₃', formula: 'H⁺ + NO₃⁻ ➔ HNO₃', elements: ['H⁺', 'NO₃⁻'], altCombos: [['H', 'N', 'O', 'O', 'O']], icon: '🧪', desc: '수소 이온(H⁺)과 질산 이온(NO₃⁻)이 결합한 강력한 산으로, 구리와 은까지 녹이는 성질이 있습니다.' },
  { id: 'carbonic_acid', category: 'ion', name: '탄산 (톡 쏘는 탄산수)', shortFormula: 'H₂CO₃', formula: 'H₂O + CO₂ ➔ H₂CO₃ (H⁺ + HCO₃⁻)', elements: ['H₂O', 'CO₂'], altCombos: [['H⁺', 'HCO₃⁻'], ['2', 'H⁺', 'CO₃²⁻']], icon: '🥤', desc: '물(H₂O)에 이산화탄소(CO₂)를 녹이면 수소 이온(H⁺)과 탄산수소 이온(HCO₃⁻)으로 나뉘며 청량감을 줍니다.' },
  { id: 'electrolysis_nacl', category: 'ion', name: '소금물 전해질 이온화 (사칙연산 ÷ 분해)', shortFormula: 'Na⁺+Cl⁻', formula: 'NaCl ÷ ➔ Na⁺ + Cl⁻', elements: ['NaCl', '÷'], altCombos: [['Na', 'Cl', '-'], ['NaCl', '-'], ['NaCl', '⁻'], ['NaCl', 'H₂O']], icon: '🔌', desc: '고체 소금(NaCl)을 물에 녹이거나 전기분해(÷)하면 양이온(Na⁺)과 음이온(Cl⁻)으로 나뉘어 전기가 통하는 전해질이 됩니다!' },
  { id: 'alkali_ionization', category: 'ion', name: '가성소다 염기 이온화 (2NaOH 전리식)', shortFormula: '2Na⁺+2OH⁻', formula: '2NaOH ➔ 2Na⁺ + 2OH⁻', elements: ['NaOH', '÷'], altCombos: [['2', 'NaOH', '-'], ['2', 'NaOH', '⁻'], ['NaOH', '-'], ['NaOH', '⁻'], ['2', 'Na', 'O', 'H', '-'], ['2', 'Na', 'O', 'H', '⁻'], ['NaOH', '×', '2']], icon: '⚡', desc: '수산화나트륨(2NaOH)은 수용액에서 나트륨 양이온(2Na⁺)과 수산화 음이온(2OH⁻)으로 100% 이온화되어 강한 염기성을 띱니다!' },
  { id: 'baso4_precip', category: 'ion', name: '황산바륨 백색 앙금 (병원 위장 조영제)', shortFormula: 'BaSO₄↓', formula: 'Ba²⁺ + SO₄²⁻ ➔ BaSO₄↓', elements: ['Ba²⁺', 'SO₄²⁻'], altCombos: [['Ba', 'S', 'O', 'O', 'O', 'O']], icon: '🩻', desc: '바륨 양이온(Ba²⁺)과 황산 음이온(SO₄²⁻)이 만나 위산에도 녹지 않는 순백색 앙금을 형성하여 X선 촬영 조영제로 쓰입니다.' },
  { id: 'pbi2_precip', category: 'ion', name: '아이오딘화납 노란색 앙금 (황금비 실험)', shortFormula: 'PbI₂↓', formula: 'Pb²⁺ + 2I⁻ ➔ PbI₂↓', elements: ['Pb²⁺', 'I⁻'], altCombos: [['Pb²⁺', '2', 'I⁻'], ['Pb²⁺', 'I⁻', 'I⁻'], ['Pb', 'I']], icon: '🌼', desc: '납 양이온(Pb²⁺)과 아이오딘화 음이온(I⁻)이 만나면 샛노란 황금빛 결정(PbI₂)이 눈처럼 내리는 아름다운 앙금 반응입니다.' },
  { id: 'cus_precip', category: 'ion', name: '황화구리 검은색 앙금', shortFormula: 'CuS↓', formula: 'Cu²⁺ + S²⁻ ➔ CuS↓', elements: ['Cu²⁺', 'S²⁻'], altCombos: [['Cu', 'S']], icon: '⚫', desc: '푸른 구리 양이온(Cu²⁺) 용액에 황화 음이온(S²⁻)을 넣으면 즉시 칠흑같이 검은 황화구리(CuS) 침전이 생깁니다.' },
  { id: 'kmno4', category: 'ion', name: '과망가니즈산칼륨 (보라색 강산화제)', shortFormula: 'KMnO₄', formula: 'K⁺ + MnO₄⁻ ➔ KMnO₄', elements: ['K⁺', 'MnO₄⁻'], altCombos: [['K', 'Mn', 'O']], icon: '🟣', desc: '칼륨 양이온(K⁺)과 과망가니즈산 음이온(MnO₄⁻)이 결합한 진보라색 결정으로, 강력한 살균·산화제입니다.' },
  { id: 'k2cr2o7', category: 'ion', name: '중크로뮴산칼륨 (주황색 산화제)', shortFormula: 'K₂Cr₂O₇', formula: '2K⁺ + Cr₂O₇²⁻ ➔ K₂Cr₂O₇', elements: ['K⁺', 'Cr₂O₇²⁻'], altCombos: [['2', 'K⁺', 'Cr₂O₇²⁻'], ['K⁺', 'CrO₄²⁻']], icon: '🟠', desc: '선명한 주황색 결정으로 음주운전 측정기 초기 모델에서 알코올을 산화시켜 색이 변하는 원리로 사용되었습니다.' },
  { id: 'sodium_acetate', category: 'ion', name: '아세트산나트륨 (똑딱이 액체 손난로)', shortFormula: 'CH₃COONa', formula: 'Na⁺ + CH₃COO⁻ ➔ CH₃COONa', elements: ['Na⁺', 'CH₃COO⁻'], altCombos: [['NaOH', 'CH₃COOH']], icon: '🔥', desc: '나트륨 이온(Na⁺)과 아세트산 음이온(CH₃COO⁻)의 염으로, 과포화 용액에서 응고열을 방출하는 똑딱이 손난로의 주인공입니다.' },
  { id: 'calcium_phosphate', category: 'ion', name: '인산칼슘 (우리 몸의 뼈와 치아)', shortFormula: 'Ca₃(PO₄)₂', formula: '3Ca²⁺ + 2PO₄³⁻ ➔ Ca₃(PO₄)₂', elements: ['Ca²⁺', 'PO₄³⁻'], altCombos: [['3', 'Ca²⁺', '2', 'PO₄³⁻']], icon: '🦴', desc: '칼슘 2가 양이온(Ca²⁺)과 인산 3가 음이온(PO₄³⁻)이 결합하여 척추동물의 단단한 뼈와 치아 에나멜을 구성합니다.' },
  { id: 'magnesium_hydroxide', category: 'ion', name: '수산화마그네슘 (속쓰림 제산제)', shortFormula: 'Mg(OH)₂', formula: 'Mg²⁺ + 2OH⁻ ➔ Mg(OH)₂', elements: ['Mg²⁺', 'OH⁻'], altCombos: [['Mg²⁺', '2', 'OH⁻'], ['Mg²⁺', 'OH⁻', 'OH⁻'], ['MgO', 'H₂O']], icon: '💊', desc: '마그네슘 양이온(Mg²⁺)과 수산화 음이온(2OH⁻)이 결합한 약염기로, 과다 분비된 위산(HCl)을 부드럽게 중화하는 위장약입니다.' },
  { id: 'calcium_chloride', category: 'ion', name: '염화칼슘 (눈 녹이는 제설제 & 제습제)', shortFormula: 'CaCl₂', formula: 'Ca²⁺ + 2Cl⁻ ➔ CaCl₂', elements: ['Ca²⁺', 'Cl⁻'], altCombos: [['Ca²⁺', '2', 'Cl⁻'], ['Ca²⁺', 'Cl⁻', 'Cl⁻'], ['Ca', 'Cl', 'Cl']], icon: '❄️', desc: '공기 중 수분을 빨아들이며 열을 내어 겨울철 빙판길 눈을 녹이고 옷장 습기제거제로 쓰이는 이온 화합물입니다.' },
  { id: 'sodium_carbonate', category: 'ion', name: '탄산나트륨 (워싱소다 / 유리 원료)', shortFormula: 'Na₂CO₃', formula: '2Na⁺ + CO₃²⁻ ➔ Na₂CO₃', elements: ['Na⁺', 'CO₃²⁻'], altCombos: [['2', 'Na⁺', 'CO₃²⁻'], ['Na⁺', 'Na⁺', 'CO₃²⁻']], icon: '🫧', desc: '나트륨 이온 2개(2Na⁺)와 탄산 이온(CO₃²⁻)의 결합물로, 강력한 세정력을 가진 세탁 소다이자 유리 제조 원료입니다.' },
  { id: 'alum_sulfate', category: 'ion', name: '황산알루미늄 (정수장 응집제 / 백반)', shortFormula: 'Al₂(SO₄)₃', formula: '2Al³⁺ + 3SO₄²⁻ ➔ Al₂(SO₄)₃', elements: ['Al³⁺', 'SO₄²⁻'], altCombos: [['2', 'Al³⁺', '3', 'SO₄²⁻']], icon: '💧', desc: '3가 알루미늄 양이온(Al³⁺)과 2가 황산 음이온(SO₄²⁻)이 2:3 비율로 결합하여 흙탕물의 미세 입자를 뭉쳐 가라앉힙니다.' },
  { id: 'silver_bromide', category: 'ion', name: '브로민화은 (연노란색 앙금 / 필름 감광제)', shortFormula: 'AgBr↓', formula: 'Ag⁺ + Br⁻ ➔ AgBr↓', elements: ['Ag⁺', 'Br⁻'], altCombos: [['Ag', 'Br']], icon: '🎞️', desc: '은 양이온(Ag⁺)과 브로민화 음이온(Br⁻)이 만나 생성되는 연노란색 앙금으로, 빛에 민감하게 반응합니다.' },
  { id: 'potassium_iodide', category: 'ion', name: '아이오딘화칼륨 (방사능 갑상선 보호제)', shortFormula: 'KI', formula: 'K⁺ + I⁻ ➔ KI', elements: ['K⁺', 'I⁻'], altCombos: [['K', 'I']], icon: '🛡️', desc: '칼륨 양이온(K⁺)과 아이오딘화 음이온(I⁻)의 이온결합 염으로, 영양제 및 방사성 요오드 차단 약품에 쓰입니다.' },
  { id: 'ammonium_perchlorate', category: 'ion', name: '과염소산암모늄 (우주왕복선 고체 로켓 연료)', shortFormula: 'NH₄ClO₄', formula: 'NH₄⁺ + ClO₄⁻ ➔ NH₄ClO₄', elements: ['NH₄⁺', 'ClO₄⁻'], icon: '🚀', desc: '암모늄 양이온(NH₄⁺)과 과염소산 음이온(ClO₄⁻)이 결합한 강력한 고체 로켓 부스터 산화제입니다.' },
  { id: 'prussian_blue', category: 'ion', name: '프러시안 블루 (청사진 & 방사능 해독제)', shortFormula: 'Fe₄[Fe(CN)₆]₃', formula: 'Fe³⁺ + [Fe(CN)₆]⁴⁻ ➔ 프러시안 블루', elements: ['Fe³⁺', '[Fe(CN)₆]⁴⁻'], altCombos: [['Fe²⁺', '[Fe(CN)₆]³⁻'], ['Fe³⁺', 'CN⁻']], icon: '🎨', desc: '철(III) 양이온과 페로사이안화 착이온이 만나 만드는 매혹적인 짙은 파란색 안료이자 세슘 방사능 중독 해독제입니다.' }
];

// 기본 상시 비치 원소 (30종) + 양이온 대백과 (58종) + 음이온 대백과 (55종) = 총 143종 핵심 시약!
// (+ 아래 getFullAlchemyShelfItems()를 통해 118개 전 원소 및 전 산화수 이온까지 300종 이상 자동 확장 지원!)
const ALCHEMY_SHELF_ELEMENTS = [
  // [1. 비금속 & 기체 원소 - 14종]
  { symbol: 'H', name: '수소', cat: 'nonmetal', color: '#38bdf8' },
  { symbol: 'He', name: '헬륨', cat: 'nonmetal', color: '#93c5fd' },
  { symbol: 'B', name: '붕소', cat: 'nonmetal', color: '#2dd4bf' },
  { symbol: 'C', name: '탄소', cat: 'nonmetal', color: '#4ade80' },
  { symbol: 'N', name: '질소', cat: 'nonmetal', color: '#60a5fa' },
  { symbol: 'O', name: '산소', cat: 'nonmetal', color: '#38bdf8' },
  { symbol: 'F', name: '플루오린', cat: 'nonmetal', color: '#2dd4bf' },
  { symbol: 'Ne', name: '네온', cat: 'nonmetal', color: '#f43f5e' },
  { symbol: 'Si', name: '규소', cat: 'nonmetal', color: '#2dd4bf' },
  { symbol: 'P', name: '인', cat: 'nonmetal', color: '#fb923c' },
  { symbol: 'S', name: '황', cat: 'nonmetal', color: '#facc15' },
  { symbol: 'Cl', name: '염소', cat: 'nonmetal', color: '#86efac' },
  { symbol: 'Br', name: '브로민', cat: 'nonmetal', color: '#f87171' },
  { symbol: 'I', name: '아이오딘', cat: 'nonmetal', color: '#c084fc' },

  // [2. 주요 금속 원소 - 18종]
  { symbol: 'Li', name: '리튬', cat: 'metal', color: '#f87171' },
  { symbol: 'Be', name: '베릴륨', cat: 'metal', color: '#fdba74' },
  { symbol: 'Na', name: '소듐(나트륨)', cat: 'metal', color: '#fb923c' },
  { symbol: 'Mg', name: '마그네슘', cat: 'metal', color: '#facc15' },
  { symbol: 'Al', name: '알루미늄', cat: 'metal', color: '#a3e635' },
  { symbol: 'K', name: '칼륨', cat: 'metal', color: '#c084fc' },
  { symbol: 'Ca', name: '칼슘', cat: 'metal', color: '#fb923c' },
  { symbol: 'Ti', name: '타이타늄', cat: 'metal', color: '#94a3b8' },
  { symbol: 'Cr', name: '크롬', cat: 'metal', color: '#facc15' },
  { symbol: 'Mn', name: '망가니즈', cat: 'metal', color: '#f472b6' },
  { symbol: 'Fe', name: '철', cat: 'metal', color: '#f97316' },
  { symbol: 'Co', name: '코발트', cat: 'metal', color: '#3b82f6' },
  { symbol: 'Ni', name: '니켈', cat: 'metal', color: '#10b981' },
  { symbol: 'Cu', name: '구리', cat: 'metal', color: '#f59e0b' },
  { symbol: 'Zn', name: '아연', cat: 'metal', color: '#cbd5e1' },
  { symbol: 'Sr', name: '스트론튬', cat: 'metal', color: '#fb7185' },
  { symbol: 'Sn', name: '주석', cat: 'metal', color: '#94a3b8' },
  { symbol: 'Ba', name: '바륨', cat: 'metal', color: '#4ade80' },
  { symbol: 'Pb', name: '납', cat: 'metal', color: '#64748b' },

  // [3. 귀금속 & 특수 원소 - 6종]
  { symbol: 'Ag', name: '은', cat: 'precious', color: '#e2e8f0' },
  { symbol: 'Pt', name: '백금', cat: 'precious', color: '#f1f5f9' },
  { symbol: 'Au', name: '금', cat: 'precious', color: '#fbbf24' },
  { symbol: 'Hg', name: '수은', cat: 'precious', color: '#cbd5e1' },
  { symbol: 'Bi', name: '비스무트', cat: 'precious', color: '#f472b6' },
  { symbol: 'U', name: '우라늄', cat: 'precious', color: '#84cc16' },

  // =========================================================================
  // ⚡ 양이온 대백과 (Cations - 단원자 1~4가 & 다원자 양이온 총 58종!)
  // =========================================================================
  // [1가 양이온 (+1)]
  { symbol: 'H⁺', name: '수소 양이온', cat: 'cation', subCat: 'mono', color: '#fb7185', baseAtoms: ['H'] },
  { symbol: 'H₃O⁺', name: '하이드로늄 이온', cat: 'cation', subCat: 'poly', color: '#f43f5e', baseAtoms: ['H', 'H', 'H', 'O'] },
  { symbol: 'Li⁺', name: '리튬 양이온', cat: 'cation', subCat: 'mono', color: '#f87171', baseAtoms: ['Li'] },
  { symbol: 'Na⁺', name: '나트륨(소듐) 이온', cat: 'cation', subCat: 'mono', color: '#fb923c', baseAtoms: ['Na'] },
  { symbol: 'K⁺', name: '칼륨 양이온', cat: 'cation', subCat: 'mono', color: '#c084fc', baseAtoms: ['K'] },
  { symbol: 'Rb⁺', name: '루비듐 양이온', cat: 'cation', subCat: 'mono', color: '#e879f9', baseAtoms: ['Rb'] },
  { symbol: 'Cs⁺', name: '세슘 양이온', cat: 'cation', subCat: 'mono', color: '#a855f7', baseAtoms: ['Cs'] },
  { symbol: 'Fr⁺', name: '프랑슘 양이온', cat: 'cation', subCat: 'mono', color: '#d946ef', baseAtoms: ['Fr'] },
  { symbol: 'Cu⁺', name: '구리(I) 양이온', cat: 'cation', subCat: 'mono', color: '#fbbf24', baseAtoms: ['Cu'] },
  { symbol: 'Ag⁺', name: '은 양이온', cat: 'cation', subCat: 'mono', color: '#e2e8f0', baseAtoms: ['Ag'] },
  { symbol: 'Au⁺', name: '금(I) 양이온', cat: 'cation', subCat: 'mono', color: '#fde047', baseAtoms: ['Au'] },
  { symbol: 'Tl⁺', name: '탈륨(I) 양이온', cat: 'cation', subCat: 'mono', color: '#94a3b8', baseAtoms: ['Tl'] },
  { symbol: 'NH₄⁺', name: '암모늄 양이온', cat: 'cation', subCat: 'poly', color: '#4ade80', baseAtoms: ['N', 'H', 'H', 'H', 'H'] },
  { symbol: 'PH₄⁺', name: '포스포늄 양이온', cat: 'cation', subCat: 'poly', color: '#86efac', baseAtoms: ['P', 'H', 'H', 'H', 'H'] },
  { symbol: 'NO₂⁺', name: '니트로늄 양이온', cat: 'cation', subCat: 'poly', color: '#60a5fa', baseAtoms: ['N', 'O', 'O'] },
  { symbol: 'NO⁺', name: '니트로실 양이온', cat: 'cation', subCat: 'poly', color: '#93c5fd', baseAtoms: ['N', 'O'] },

  // [2가 양이온 (+2)]
  { symbol: 'Be²⁺', name: '베릴륨 양이온', cat: 'cation', subCat: 'mono', color: '#fdba74', baseAtoms: ['Be'] },
  { symbol: 'Mg²⁺', name: '마그네슘 양이온', cat: 'cation', subCat: 'mono', color: '#facc15', baseAtoms: ['Mg'] },
  { symbol: 'Ca²⁺', name: '칼슘 양이온', cat: 'cation', subCat: 'mono', color: '#fdba74', baseAtoms: ['Ca'] },
  { symbol: 'Sr²⁺', name: '스트론튬 양이온', cat: 'cation', subCat: 'mono', color: '#fb7185', baseAtoms: ['Sr'] },
  { symbol: 'Ba²⁺', name: '바륨 양이온', cat: 'cation', subCat: 'mono', color: '#4ade80', baseAtoms: ['Ba'] },
  { symbol: 'Ra²⁺', name: '라듐 양이온', cat: 'cation', subCat: 'mono', color: '#84cc16', baseAtoms: ['Ra'] },
  { symbol: 'Ti²⁺', name: '타이타늄(II) 양이온', cat: 'cation', subCat: 'mono', color: '#94a3b8', baseAtoms: ['Ti'] },
  { symbol: 'V²⁺', name: '바나듐(II) 양이온', cat: 'cation', subCat: 'mono', color: '#a78bfa', baseAtoms: ['V'] },
  { symbol: 'Cr²⁺', name: '크롬(II) 양이온', cat: 'cation', subCat: 'mono', color: '#60a5fa', baseAtoms: ['Cr'] },
  { symbol: 'Mn²⁺', name: '망가니즈(II) 양이온', cat: 'cation', subCat: 'mono', color: '#f472b6', baseAtoms: ['Mn'] },
  { symbol: 'Fe²⁺', name: '철(II) 양이온', cat: 'cation', subCat: 'mono', color: '#86efac', baseAtoms: ['Fe'] },
  { symbol: 'Co²⁺', name: '코발트(II) 양이온', cat: 'cation', subCat: 'mono', color: '#3b82f6', baseAtoms: ['Co'] },
  { symbol: 'Ni²⁺', name: '니켈(II) 양이온', cat: 'cation', subCat: 'mono', color: '#10b981', baseAtoms: ['Ni'] },
  { symbol: 'Cu²⁺', name: '구리(II) 양이온', cat: 'cation', subCat: 'mono', color: '#38bdf8', baseAtoms: ['Cu'] },
  { symbol: 'Zn²⁺', name: '아연 양이온', cat: 'cation', subCat: 'mono', color: '#cbd5e1', baseAtoms: ['Zn'] },
  { symbol: 'Pd²⁺', name: '팔라듐(II) 양이온', cat: 'cation', subCat: 'mono', color: '#e2e8f0', baseAtoms: ['Pd'] },
  { symbol: 'Cd²⁺', name: '카드뮴 양이온', cat: 'cation', subCat: 'mono', color: '#fde047', baseAtoms: ['Cd'] },
  { symbol: 'Hg₂²⁺', name: '수은(I) 이합체 양이온', cat: 'cation', subCat: 'poly', color: '#cbd5e1', baseAtoms: ['Hg', 'Hg'] },
  { symbol: 'Hg²⁺', name: '수은(II) 양이온', cat: 'cation', subCat: 'mono', color: '#94a3b8', baseAtoms: ['Hg'] },
  { symbol: 'Sn²⁺', name: '주석(II) 양이온', cat: 'cation', subCat: 'mono', color: '#cbd5e1', baseAtoms: ['Sn'] },
  { symbol: 'Pb²⁺', name: '납(II) 양이온', cat: 'cation', subCat: 'mono', color: '#64748b', baseAtoms: ['Pb'] },
  { symbol: 'Pt²⁺', name: '백금(II) 양이온', cat: 'cation', subCat: 'mono', color: '#f1f5f9', baseAtoms: ['Pt'] },
  { symbol: 'UO₂²⁺', name: '우라닐 양이온', cat: 'cation', subCat: 'poly', color: '#a3e635', baseAtoms: ['U', 'O', 'O'] },
  { symbol: 'VO²⁺', name: '바나딜 양이온', cat: 'cation', subCat: 'poly', color: '#38bdf8', baseAtoms: ['V', 'O'] },

  // [3가 · 4가 이상 고전하 양이온 (+3, +4~)]
  { symbol: 'B³⁺', name: '붕소 양이온', cat: 'cation', subCat: 'mono', color: '#2dd4bf', baseAtoms: ['B'] },
  { symbol: 'Al³⁺', name: '알루미늄 양이온', cat: 'cation', subCat: 'mono', color: '#a3e635', baseAtoms: ['Al'] },
  { symbol: 'Ga³⁺', name: '갈륨 양이온', cat: 'cation', subCat: 'mono', color: '#86efac', baseAtoms: ['Ga'] },
  { symbol: 'In³⁺', name: '인듐 양이온', cat: 'cation', subCat: 'mono', color: '#67e8f9', baseAtoms: ['In'] },
  { symbol: 'Tl³⁺', name: '탈륨(III) 양이온', cat: 'cation', subCat: 'mono', color: '#94a3b8', baseAtoms: ['Tl'] },
  { symbol: 'Sc³⁺', name: '스칸듐 양이온', cat: 'cation', subCat: 'mono', color: '#bae6fd', baseAtoms: ['Sc'] },
  { symbol: 'Y³⁺', name: '이트륨 양이온', cat: 'cation', subCat: 'mono', color: '#7dd3fc', baseAtoms: ['Y'] },
  { symbol: 'La³⁺', name: '란타넘 양이온', cat: 'cation', subCat: 'mono', color: '#f9a8d4', baseAtoms: ['La'] },
  { symbol: 'Cr³⁺', name: '크롬(III) 양이온', cat: 'cation', subCat: 'mono', color: '#4ade80', baseAtoms: ['Cr'] },
  { symbol: 'Mn³⁺', name: '망가니즈(III) 양이온', cat: 'cation', subCat: 'mono', color: '#f472b6', baseAtoms: ['Mn'] },
  { symbol: 'Fe³⁺', name: '철(III) 양이온', cat: 'cation', subCat: 'mono', color: '#f97316', baseAtoms: ['Fe'] },
  { symbol: 'Co³⁺', name: '코발트(III) 양이온', cat: 'cation', subCat: 'mono', color: '#60a5fa', baseAtoms: ['Co'] },
  { symbol: 'Au³⁺', name: '금(III) 양이온', cat: 'cation', subCat: 'mono', color: '#fbbf24', baseAtoms: ['Au'] },
  { symbol: 'Bi³⁺', name: '비스무트(III) 양이온', cat: 'cation', subCat: 'mono', color: '#f472b6', baseAtoms: ['Bi'] },
  { symbol: 'Ti⁴⁺', name: '타이타늄(IV) 양이온', cat: 'cation', subCat: 'mono', color: '#cbd5e1', baseAtoms: ['Ti'] },
  { symbol: 'Sn⁴⁺', name: '주석(IV) 양이온', cat: 'cation', subCat: 'mono', color: '#94a3b8', baseAtoms: ['Sn'] },
  { symbol: 'Pb⁴⁺', name: '납(IV) 양이온', cat: 'cation', subCat: 'mono', color: '#64748b', baseAtoms: ['Pb'] },
  { symbol: 'Pt⁴⁺', name: '백금(IV) 양이온', cat: 'cation', subCat: 'mono', color: '#e2e8f0', baseAtoms: ['Pt'] },

  // =========================================================================
  // 💧 음이온 대백과 (Anions - 단원자·산소산·다원자·착이온 총 55종!)
  // =========================================================================
  // [단원자 음이온 (-1, -2, -3, -4)]
  { symbol: 'H⁻', name: '수소화 음이온', cat: 'anion', subCat: 'mono', color: '#7dd3fc', baseAtoms: ['H'] },
  { symbol: 'F⁻', name: '플루오린화 음이온', cat: 'anion', subCat: 'mono', color: '#2dd4bf', baseAtoms: ['F'] },
  { symbol: 'Cl⁻', name: '염화 음이온', cat: 'anion', subCat: 'mono', color: '#86efac', baseAtoms: ['Cl'] },
  { symbol: 'Br⁻', name: '브로민화 음이온', cat: 'anion', subCat: 'mono', color: '#fca5a5', baseAtoms: ['Br'] },
  { symbol: 'I⁻', name: '아이오딘화 음이온', cat: 'anion', subCat: 'mono', color: '#d8b4fe', baseAtoms: ['I'] },
  { symbol: 'O²⁻', name: '산화 음이온', cat: 'anion', subCat: 'mono', color: '#60a5fa', baseAtoms: ['O'] },
  { symbol: 'S²⁻', name: '황화 음이온', cat: 'anion', subCat: 'mono', color: '#facc15', baseAtoms: ['S'] },
  { symbol: 'Se²⁻', name: '셀레늄화 음이온', cat: 'anion', subCat: 'mono', color: '#fb923c', baseAtoms: ['Se'] },
  { symbol: 'Te²⁻', name: '텔루륨화 음이온', cat: 'anion', subCat: 'mono', color: '#94a3b8', baseAtoms: ['Te'] },
  { symbol: 'N³⁻', name: '질화 음이온', cat: 'anion', subCat: 'mono', color: '#818cf8', baseAtoms: ['N'] },
  { symbol: 'P³⁻', name: '인화 음이온', cat: 'anion', subCat: 'mono', color: '#fdba74', baseAtoms: ['P'] },
  { symbol: 'As³⁻', name: '비소화 음이온', cat: 'anion', subCat: 'mono', color: '#a3e635', baseAtoms: ['As'] },
  { symbol: 'C⁴⁻', name: '탄화 음이온', cat: 'anion', subCat: 'mono', color: '#4ade80', baseAtoms: ['C'] },
  { symbol: 'Si⁴⁻', name: '규화 음이온', cat: 'anion', subCat: 'mono', color: '#2dd4bf', baseAtoms: ['Si'] },

  // [다원자 1가 음이온 (-1)]
  { symbol: 'OH⁻', name: '수산화 음이온', cat: 'anion', subCat: 'poly', color: '#38bdf8', baseAtoms: ['O', 'H'] },
  { symbol: 'NO₃⁻', name: '질산 음이온', cat: 'anion', subCat: 'poly', color: '#a78bfa', baseAtoms: ['N', 'O', 'O', 'O'] },
  { symbol: 'NO₂⁻', name: '아질산 음이온', cat: 'anion', subCat: 'poly', color: '#c4b5fd', baseAtoms: ['N', 'O', 'O'] },
  { symbol: 'HCO₃⁻', name: '탄산수소 음이온', cat: 'anion', subCat: 'poly', color: '#2dd4bf', baseAtoms: ['H', 'C', 'O', 'O', 'O'] },
  { symbol: 'HSO₄⁻', name: '황산수소 음이온', cat: 'anion', subCat: 'poly', color: '#fde047', baseAtoms: ['H', 'S', 'O', 'O', 'O', 'O'] },
  { symbol: 'HSO₃⁻', name: '아황산수소 음이온', cat: 'anion', subCat: 'poly', color: '#fef08a', baseAtoms: ['H', 'S', 'O', 'O', 'O'] },
  { symbol: 'H₂PO₄⁻', name: '인산이수소 음이온', cat: 'anion', subCat: 'poly', color: '#f9a8d4', baseAtoms: ['H', 'H', 'P', 'O', 'O', 'O', 'O'] },
  { symbol: 'ClO⁻', name: '차아염소산 음이온', cat: 'anion', subCat: 'poly', color: '#7dd3fc', baseAtoms: ['Cl', 'O'] },
  { symbol: 'ClO₂⁻', name: '아염소산 음이온', cat: 'anion', subCat: 'poly', color: '#67e8f9', baseAtoms: ['Cl', 'O', 'O'] },
  { symbol: 'ClO₃⁻', name: '염소산 음이온', cat: 'anion', subCat: 'poly', color: '#38bdf8', baseAtoms: ['Cl', 'O', 'O', 'O'] },
  { symbol: 'ClO₄⁻', name: '과염소산 음이온', cat: 'anion', subCat: 'poly', color: '#0ea5e9', baseAtoms: ['Cl', 'O', 'O', 'O', 'O'] },
  { symbol: 'BrO₃⁻', name: '브로민산 음이온', cat: 'anion', subCat: 'poly', color: '#fca5a5', baseAtoms: ['Br', 'O', 'O', 'O'] },
  { symbol: 'IO₃⁻', name: '아이오딘산 음이온', cat: 'anion', subCat: 'poly', color: '#d8b4fe', baseAtoms: ['I', 'O', 'O', 'O'] },
  { symbol: 'IO₄⁻', name: '과아이오딘산 음이온', cat: 'anion', subCat: 'poly', color: '#c084fc', baseAtoms: ['I', 'O', 'O', 'O', 'O'] },
  { symbol: 'MnO₄⁻', name: '과망가니즈산 음이온', cat: 'anion', subCat: 'poly', color: '#d946ef', baseAtoms: ['Mn', 'O', 'O', 'O', 'O'] },
  { symbol: 'CN⁻', name: '사이안화 음이온', cat: 'anion', subCat: 'poly', color: '#f43f5e', baseAtoms: ['C', 'N'] },
  { symbol: 'OCN⁻', name: '사이안산 음이온', cat: 'anion', subCat: 'poly', color: '#fb7185', baseAtoms: ['O', 'C', 'N'] },
  { symbol: 'SCN⁻', name: '싸이오사이안산 음이온', cat: 'anion', subCat: 'poly', color: '#fda4af', baseAtoms: ['S', 'C', 'N'] },
  { symbol: 'CH₃COO⁻', name: '아세트산 음이온', cat: 'anion', subCat: 'poly', color: '#4ade80', baseAtoms: ['C', 'H', 'O'] },
  { symbol: 'HCOO⁻', name: '폼산 음이온', cat: 'anion', subCat: 'poly', color: '#86efac', baseAtoms: ['H', 'C', 'O', 'O'] },
  { symbol: 'AlO₂⁻', name: '알루민산 음이온', cat: 'anion', subCat: 'poly', color: '#bef264', baseAtoms: ['Al', 'O', 'O'] },
  { symbol: 'N₃⁻', name: '아자이드 음이온', cat: 'anion', subCat: 'poly', color: '#93c5fd', baseAtoms: ['N', 'N', 'N'] },
  { symbol: 'O₂⁻', name: '초과산화 음이온', cat: 'anion', subCat: 'poly', color: '#38bdf8', baseAtoms: ['O', 'O'] },

  // [다원자 2가 · 3가 · 4가 음이온 (-2, -3, -4)]
  { symbol: 'CO₃²⁻', name: '탄산 음이온', cat: 'anion', subCat: 'poly', color: '#34d399', baseAtoms: ['C', 'O', 'O', 'O'] },
  { symbol: 'SO₄²⁻', name: '황산 음이온', cat: 'anion', subCat: 'poly', color: '#fbbf24', baseAtoms: ['S', 'O', 'O', 'O', 'O'] },
  { symbol: 'SO₃²⁻', name: '아황산 음이온', cat: 'anion', subCat: 'poly', color: '#fde047', baseAtoms: ['S', 'O', 'O', 'O'] },
  { symbol: 'S₂O₃²⁻', name: '싸이오황산 음이온', cat: 'anion', subCat: 'poly', color: '#facc15', baseAtoms: ['S', 'S', 'O', 'O', 'O'] },
  { symbol: 'S₂O₈²⁻', name: '과황산 음이온', cat: 'anion', subCat: 'poly', color: '#f59e0b', baseAtoms: ['S', 'S', 'O', 'O', 'O', 'O'] },
  { symbol: 'CrO₄²⁻', name: '크로뮴산 음이온', cat: 'anion', subCat: 'poly', color: '#facc15', baseAtoms: ['Cr', 'O', 'O', 'O', 'O'] },
  { symbol: 'Cr₂O₇²⁻', name: '중크로뮴산 음이온', cat: 'anion', subCat: 'poly', color: '#fb923c', baseAtoms: ['Cr', 'Cr', 'O', 'O', 'O', 'O'] },
  { symbol: 'MnO₄²⁻', name: '망가니즈산 음이온', cat: 'anion', subCat: 'poly', color: '#4ade80', baseAtoms: ['Mn', 'O', 'O', 'O', 'O'] },
  { symbol: 'SiO₃²⁻', name: '규산 음이온', cat: 'anion', subCat: 'poly', color: '#2dd4bf', baseAtoms: ['Si', 'O', 'O', 'O'] },
  { symbol: 'HPO₄²⁻', name: '인산수소 음이온', cat: 'anion', subCat: 'poly', color: '#f472b6', baseAtoms: ['H', 'P', 'O', 'O', 'O', 'O'] },
  { symbol: 'C₂O₄²⁻', name: '옥살산 음이온', cat: 'anion', subCat: 'poly', color: '#a3e635', baseAtoms: ['C', 'C', 'O', 'O', 'O', 'O'] },
  { symbol: 'O₂²⁻', name: '과산화 음이온', cat: 'anion', subCat: 'poly', color: '#60a5fa', baseAtoms: ['O', 'O'] },
  { symbol: 'B₄O₇²⁻', name: '사붕산 음이온', cat: 'anion', subCat: 'poly', color: '#5eead4', baseAtoms: ['B', 'O'] },
  { symbol: 'PO₄³⁻', name: '인산 음이온', cat: 'anion', subCat: 'poly', color: '#f472b6', baseAtoms: ['P', 'O', 'O', 'O', 'O'] },
  { symbol: 'PO₃³⁻', name: '아인산 음이온', cat: 'anion', subCat: 'poly', color: '#f9a8d4', baseAtoms: ['P', 'O', 'O', 'O'] },
  { symbol: 'AsO₄³⁻', name: '비산 음이온', cat: 'anion', subCat: 'poly', color: '#a3e635', baseAtoms: ['As', 'O', 'O', 'O', 'O'] },
  { symbol: '[Fe(CN)₆]³⁻', name: '페리사이안화 착이온', cat: 'anion', subCat: 'poly', color: '#f87171', baseAtoms: ['Fe', 'C', 'N'] },
  { symbol: '[Fe(CN)₆]⁴⁻', name: '페로사이안화 착이온', cat: 'anion', subCat: 'poly', color: '#fbbf24', baseAtoms: ['Fe', 'C', 'N'] },
  { symbol: 'P₂O₇⁴⁻', name: '피로인산 음이온', cat: 'anion', subCat: 'poly', color: '#ec4899', baseAtoms: ['P', 'O'] },
  { symbol: 'e⁻', name: '자유 전자', cat: 'anion', subCat: 'mono', color: '#fde047', baseAtoms: [] }
];

/**
 * 118개 전 원소 + 각 원소의 모든 산화수(ELEMENTS_EXTRA_DATA.oxStates)를 기반으로
 * 누락 없는 전체 원소·양이온·음이온 목록(350종 이상)을 동적 생성 및 캐싱
 */
let _cachedFullShelfItems = null;
function getFullAlchemyShelfItems() {
  if (_cachedFullShelfItems) return _cachedFullShelfItems;
  const list = [...ALCHEMY_SHELF_ELEMENTS];
  const existingSymbols = new Set(list.map(item => item.symbol));

  const SUPERSCRIPT_DIGITS = { '1': '', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸' };
  const ROMAN_NUMS = { '1': 'I', '2': 'II', '3': 'III', '4': 'IV', '5': 'V', '6': 'VI', '7': 'VII', '8': 'VIII' };

  if (typeof elementsMap !== 'undefined') {
    elementsMap.forEach((el, num) => {
      const catColor = (typeof CATEGORIES !== 'undefined' && CATEGORIES[el.category]?.color) || '#38bdf8';
      // 1) 중성 원소 추가 (1~118번 전체)
      if (!existingSymbols.has(el.symbol)) {
        list.push({
          symbol: el.symbol,
          name: `${el.nameKo}(${num}번)`,
          cat: 'full118',
          color: catColor,
          baseAtoms: [el.symbol]
        });
        existingSymbols.add(el.symbol);
      }

      // 2) ELEMENTS_EXTRA_DATA 산화수 기반 양이온/음이온 자동 생성
      const extra = typeof ELEMENTS_EXTRA_DATA !== 'undefined' ? ELEMENTS_EXTRA_DATA[num] : null;
      if (extra && extra.oxStates && extra.oxStates !== '0') {
        const states = extra.oxStates.split(',').map(s => s.trim());
        states.forEach(st => {
          const m = st.match(/^([+-])(\d+)$/);
          if (!m) return;
          const sign = m[1];
          const val = m[2];
          if (val === '0') return;
          const supNum = SUPERSCRIPT_DIGITS[val] || '';
          const supSign = sign === '+' ? '⁺' : '⁻';
          const ionSym = `${el.symbol}${supNum}${supSign}`;
          if (!existingSymbols.has(ionSym)) {
            const isCation = sign === '+';
            const roman = states.length > 1 ? `(${ROMAN_NUMS[val] || val})` : '';
            list.push({
              symbol: ionSym,
              name: isCation ? `${el.nameKo}${roman} 양이온` : `${el.nameKo}화 음이온`,
              cat: isCation ? 'cation' : 'anion',
              subCat: 'extended118',
              color: isCation ? '#fb923c' : '#38bdf8',
              baseAtoms: [el.symbol]
            });
            existingSymbols.add(ionSym);
          }
        });
      }
    });
  }

  _cachedFullShelfItems = list;
  return list;
}

// 사칙연산 & 계수(숫자) & 괄호 & 이온 전하 기호 패드 정의
const ALCHEMY_OPERATORS = [
  { symbol: '+', label: '＋ 더하기/결합', type: 'op', desc: '원소·이온·화합물 결합 또는 양전하(+)' },
  { symbol: '-', label: '－ 빼기/음전하', type: 'op', desc: '원소 분리·추출 또는 음전하(-) 표기 (예: NaCl-, 2NaOH-)' },
  { symbol: '×', label: '× 곱하기(배수)', type: 'op', desc: '분자·원소 개수 배수 증폭 (예: NaOH × 2 ➔ 2NaOH)' },
  { symbol: '÷', label: '÷ 나누기(이온화)', type: 'op', desc: '수용액 전리·전기분해 (예: NaCl ÷ ➔ Na⁺ + Cl⁻)' },
  { symbol: '➔', label: '➔ 반응(=)', type: 'op', desc: '화학 반응식 화살표' },
  { symbol: '(', label: '( 괄호열기', type: 'op', desc: '다원자 이온 묶음 괄호 (예: Ca(OH)₂)' },
  { symbol: ')', label: ') 괄호닫기', type: 'op', desc: '다원자 이온 묶음 괄호 (예: Al₂(SO₄)₃)' },
  { symbol: '2', label: '2 (계수)', type: 'num', desc: '화학식 앞 계수 2 또는 첨자 (예: 2NaOH)' },
  { symbol: '3', label: '3 (계수)', type: 'num', desc: '화학식 앞 계수 3 (예: 3Ca²⁺)' },
  { symbol: '4', label: '4 (계수)', type: 'num', desc: '화학식 앞 계수 4 (예: CH₄)' },
  { symbol: '5', label: '5 (계수)', type: 'num', desc: '화학식 계수 5' },
  { symbol: '6', label: '6 (계수)', type: 'num', desc: '화학식 계수 6' },
  { symbol: '⁺', label: '⁺ 1가양', type: 'charge', desc: '1가 양이온 전하 기호 부착 (예: Na⁺, NH₄⁺)' },
  { symbol: '⁻', label: '⁻ 1가음', type: 'charge', desc: '1가 음이온 전하 기호 부착 (예: OH⁻, NaCl⁻, 2NaOH⁻)' },
  { symbol: '²⁺', label: '²⁺ 2가양', type: 'charge', desc: '2가 양이온 전하 기호 (예: Ca²⁺, Mg²⁺, Fe²⁺)' },
  { symbol: '²⁻', label: '²⁻ 2가음', type: 'charge', desc: '2가 음이온 전하 기호 (예: CO₃²⁻, SO₄²⁻)' },
  { symbol: '³⁺', label: '³⁺ 3가양', type: 'charge', desc: '3가 양이온 전하 기호 (예: Al³⁺, Fe³⁺, Cr³⁺)' },
  { symbol: '³⁻', label: '³⁻ 3가음', type: 'charge', desc: '3가 음이온 전하 기호 (예: PO₄³⁻, N³⁻)' },
  { symbol: '⁴⁺', label: '⁴⁺ 4가양', type: 'charge', desc: '4가 양이온 전하 기호 (예: Ti⁴⁺, Sn⁴⁺, Pb⁴⁺)' },
  { symbol: '⁴⁻', label: '⁴⁻ 4가음', type: 'charge', desc: '4가 음이온 전하 기호 (예: C⁴⁻, P₂O₇⁴⁻)' }
];

// 초기 상태에서 바로 인벤토리로 끌어다 쓸 수 있는 기본 베이스 시약 ID 목록
const STARTER_INVENTORY_IDS = ['water', 'salt', 'caustic_soda', 'acid', 'ammonia', 'co2', 'chalk', 'hydroxide_ion'];

let alchemyState = {
  beakerElements: [], // 비커에 담긴 기호/수식/이온/연산자 토큰 배열
  unlockedRecipes: JSON.parse(localStorage.getItem('periodic_alchemy_unlocked') || '[]'),
  currentShelfCat: 'all', // 'all' | 'cation' | 'anion' | 'poly_ion' | 'nonmetal' | 'metal' | 'precious' | 'full118'
  shelfSearch: '',
  currentBookCat: 'all',
  inventoryFilter: 'unlocked', // 'unlocked' (해금+기본시약) | 'all' (전체 75종 도감 인벤토리 실험모드)
  inventorySearch: ''
};

/**
 * 칭호 계산 함수
 */
function getAlchemyTitle(unlockedCount) {
  if (unlockedCount >= 60) return { title: '🌌 태초의 신비 대연금술사', color: '#f43f5e' };
  if (unlockedCount >= 45) return { title: '🌟 전설의 대연금술사', color: '#facc15' };
  if (unlockedCount >= 30) return { title: '👑 마스터 화학자', color: '#a855f7' };
  if (unlockedCount >= 20) return { title: '🔮 숙련된 연금술사', color: '#38bdf8' };
  if (unlockedCount >= 10) return { title: '⚗️ 화학 견습생', color: '#4ade80' };
  return { title: '🧪 초보 실험생', color: '#94a3b8' };
}

/**
 * 비커 토큰 배열을 화학 수식/이온식 문자열로 아름답게 포매팅
 */
function formatBeakerExpression(tokens) {
  if (!tokens || tokens.length === 0) return '';
  let expr = '';
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const prev = i > 0 ? tokens[i - 1] : null;
    const next = i < tokens.length - 1 ? tokens[i + 1] : null;

    if (t === '+' || t === '×' || t === '÷' || t === '➔' || t === '=') {
      expr += ` ${t} `;
    } else if (t === '-') {
      if (!next || next === '+' || next === '×' || next === '÷' || next === '➔') {
        expr += '⁻';
      } else {
        expr += ' - ';
      }
    } else if (['⁺', '⁻', '²⁺', '²⁻', '³⁺', '³⁻', '⁴⁺', '⁴⁻', '(', ')'].includes(t)) {
      expr += t;
    } else if (/^\d+$/.test(t)) {
      if (!prev || prev === '+' || prev === '-' || prev === '×' || prev === '÷' || prev === '➔') {
        expr += t;
      } else {
        expr += t;
      }
    } else {
      expr += t;
    }
  }
  return expr.replace(/\s+/g, ' ').trim();
}

/**
 * 개별 토큰(원소·양이온·음이온·화합물·연산자)의 한글 이름을 조회하는 헬퍼
 */
function getTokenKoreanName(sym) {
  if (!sym) return '';
  const fullShelf = getFullAlchemyShelfItems();
  const shelfItem = fullShelf.find(e => e.symbol === sym);
  if (shelfItem) return shelfItem.name;

  const recipeItem = ALCHEMY_RECIPES.find(r => r.shortFormula === sym || r.formula.split(' ')[0] === sym);
  if (recipeItem) return recipeItem.name.replace(/\s*\(.*?\)/g, '');

  const opMap = {
    '+': '+',
    '-': '-',
    '×': '×',
    '÷': '÷(전리)',
    '➔': '➔',
    '=': '➔',
    '⁺': '(1가 양전하)',
    '⁻': '(1가 음전하)',
    '²⁺': '(2가 양전하)',
    '²⁻': '(2가 음전하)',
    '³⁺': '(3가 양전하)',
    '³⁻': '(3가 음전하)',
    '⁴⁺': '(4가 양전하)',
    '⁴⁻': '(4가 음전하)'
  };
  if (opMap[sym]) return opMap[sym];
  return sym;
}

/**
 * 비커 토큰 배열을 한글 명칭 수식(예: "나트륨 양이온 + 염화 음이온")으로 변환
 */
function formatBeakerKoreanNames(tokens) {
  if (!tokens || tokens.length === 0) return '';
  return tokens.map(t => getTokenKoreanName(t)).join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * 직접 입력한 화학 수식 문자열(예: "2NaOH-", "NaCl-", "Na+ + Cl-", "3Ca2+ + 2PO43-")을 비커 토큰 배열로 파싱
 */
function parseExpressionToTokens(rawStr) {
  const s = (rawStr || '').trim();
  if (!s) return [];
  const tokens = [];
  const fullShelf = getFullAlchemyShelfItems();
  const recipeFormulas = ALCHEMY_RECIPES
    .map(r => r.shortFormula)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  const shelfSymbols = fullShelf
    .map(e => e.symbol)
    .sort((a, b) => b.length - a.length);

  let i = 0;
  while (i < s.length) {
    if (/\s/.test(s[i])) {
      i++;
      continue;
    }
    const rest = s.slice(i);

    // 1) 다중 문자 전하 기호 확인 (2+, 2-, 3+, 3-, 4+, 4-)
    const chargeMap = [
      ['4+', '⁴⁺'], ['⁴⁺', '⁴⁺'], ['4-', '⁴⁻'], ['⁴⁻', '⁴⁻'],
      ['3+', '³⁺'], ['³⁺', '³⁺'], ['3-', '³⁻'], ['³⁻', '³⁻'],
      ['2+', '²⁺'], ['²⁺', '²⁺'], ['2-', '²⁻'], ['²⁻', '²⁻'],
      ['->', '➔'], ['=>', '➔']
    ];
    let matchedCharge = null;
    for (const [prefix, norm] of chargeMap) {
      if (rest.startsWith(prefix)) {
        matchedCharge = { len: prefix.length, norm };
        break;
      }
    }
    if (matchedCharge) {
      tokens.push(matchedCharge.norm);
      i += matchedCharge.len;
      continue;
    }

    // 2) 보관함 이온 기호 및 도감 화학식 매칭
    let matchedToken = null;
    for (const sym of shelfSymbols) {
      if (sym.length > 1 && rest.startsWith(sym)) {
        matchedToken = sym;
        break;
      }
    }
    if (!matchedToken) {
      for (const rf of recipeFormulas) {
        if (rf.length > 1 && rest.startsWith(rf)) {
          matchedToken = rf;
          break;
        }
      }
    }
    if (matchedToken) {
      tokens.push(matchedToken);
      i += matchedToken.length;
      continue;
    }

    // 3) 숫자 계수
    const numMatch = rest.match(/^\d+/);
    if (numMatch) {
      tokens.push(numMatch[0]);
      i += numMatch[0].length;
      continue;
    }

    // 4) 원소 기호
    const elMatch = rest.match(/^[A-Z][a-z]?/);
    if (elMatch) {
      tokens.push(elMatch[0]);
      i += elMatch[0].length;
      continue;
    }

    // 5) 연산자 및 전하 기호
    const ch = s[i];
    if (ch === '*') tokens.push('×');
    else if (ch === '/') tokens.push('÷');
    else if (ch === '=') tokens.push('➔');
    else tokens.push(ch);
    i++;
  }
  return tokens.slice(0, 20);
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
    return (
      item.symbol.toLowerCase().includes(q) ||
      item.name.toLowerCase().includes(q)
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

  container.innerHTML = `
    <div class="alchemy-lab-wrapper">
      <!-- 상단 도감 진행률 및 연금술사 칭호 바 -->
      <div class="alchemy-header-bar">
        <div class="alchemy-progress-group">
          <div class="alchemy-title-badge" style="color: ${titleInfo.color}; font-weight:800; font-size:0.95rem; margin-bottom:3px;">
            ${titleInfo.title}
          </div>
          <span>⚗️ 연금술 도감: <strong>${unlockedCount} / ${totalCount}</strong>종 해금 (${progressPct}%)</span>
          <div class="alchemy-progress-track">
            <div class="alchemy-progress-fill" style="width: ${progressPct}%;"></div>
          </div>
        </div>
        <button id="toggleRecipeBookBtn" class="pill-btn primary">📖 ${totalCount}종 전체 도감 보기</button>
      </div>

      <!-- 중앙 반응 비커 실험대 + 실시간 수식 전광판 -->
      <div class="alchemy-beaker-stage">
        <!-- 실시간 화학식/이온식/수식 전광판 -->
        <div class="alchemy-formula-board">
          <div class="formula-board-top">
            <span class="formula-badge-label">📟 실시간 화학·이온 수식 & 한글 명칭 전광판</span>
            <span class="formula-drag-tip">💡 도감 인벤토리·이온·원소를 비커로 끌어넣거나(드래그) 터치하세요!</span>
          </div>
          <div class="formula-display-row">
            <div id="beakerFormulaPreview" class="formula-preview-text">
              ${currentExpr
                ? `<div class="formula-expr-main"><strong>${currentExpr}</strong></div><div class="formula-ko-sub">🇰🇷 ${currentKoNames}</div>`
                : '<span class="formula-placeholder">예: Na⁺(나트륨 양이온) + Cl⁻(염화 음이온), 2NaOH⁻, Ba²⁺ + SO₄²⁻</span>'}
            </div>
            <div class="formula-direct-input-wrap">
              <input type="text" id="directFormulaInput" class="direct-formula-input" placeholder="직접 수식 입력 (예: 2NaOH-, NaCl-)" value="${currentExpr}" autocomplete="off" spellcheck="false" />
              <button id="applyDirectFormulaBtn" class="pill-btn secondary small-btn" title="입력한 수식을 비커에 적용">적용</button>
            </div>
          </div>
        </div>

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

        <!-- 🧮 사칙연산 & 계수 & 괄호 & 전하 기호 툴바 -->
        <div class="alchemy-operator-bar">
          <div class="operator-bar-header">
            <span>🧮 사칙연산 · 계수(2~6) · 괄호 · 다전하(⁺~⁴⁻) 패드</span>
            <button id="backspaceBeakerBtn" class="op-back-btn" title="마지막에 넣은 기호 지우기">⌫ 한 칸 지우기</button>
          </div>
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

        <div class="beaker-action-row">
          <button id="clearBeakerBtn" class="action-btn secondary small-btn">비커 비우기 🗑️</button>
          <button id="combineElementsBtn" class="action-btn primary large-btn">⚗️ 화학 반응 & 수식 분석 시작!</button>
        </div>
      </div>

      <!-- 🎒 도감 인벤토리 (도감 목록을 인벤토리처럼 보고 비커로 드래그/터치 투입!) -->
      <div class="alchemy-inventory-section">
        <div class="inventory-header-row">
          <div class="inventory-title-group">
            <h3>🎒 내 도감 인벤토리 <small>(비커로 끌어넣기 / 터치 투입)</small></h3>
          </div>
          <div class="inventory-controls-row">
            <input type="text" id="inventorySearchInput" class="inventory-search-input" placeholder="🔍 도감 물질·화학식 검색 (예: NaOH, 소금)" value="${alchemyState.inventorySearch}" />
            <div class="inventory-mode-tabs">
              <button class="cat-pill ${alchemyState.inventoryFilter === 'unlocked' ? 'active' : ''}" data-inv-mode="unlocked">내 보유 시약 (${getInventoryRecipes('unlocked').length})</button>
              <button class="cat-pill ${alchemyState.inventoryFilter === 'all' ? 'active' : ''}" data-inv-mode="all">🔓 전체 도감 시약 (${ALCHEMY_RECIPES.length})</button>
            </div>
          </div>
        </div>

        <div class="alchemy-inventory-grid" id="alchemyInventoryGrid">
          ${renderInventoryItemsHtml()}
        </div>
      </div>

      <!-- 하단 원소 & 양이온 & 음이온 대백과 보관함 선반 (118원소 전 산화수 확장 + 검색 지원) -->
      <div class="alchemy-shelf-section">
        <div class="shelf-header-row">
          <div style="display:flex; align-items:center; gap:0.6rem; flex-wrap:wrap;">
            <h3 style="margin:0;">🧪 원소 & 양이온 · 음이온 대백과 보관함</h3>
            <input type="text" id="shelfSearchInput" class="inventory-search-input" placeholder="🔍 원소·이온 검색 (예: Ba²⁺, 황산, 철, MnO₄⁻)" value="${alchemyState.shelfSearch}" />
          </div>
          <div class="shelf-cat-tabs">
            <button class="cat-pill ${alchemyState.currentShelfCat === 'all' ? 'active' : ''}" data-cat="all">핵심 추천(${ALCHEMY_SHELF_ELEMENTS.length})</button>
            <button class="cat-pill ion-cat-pill ${alchemyState.currentShelfCat === 'cation' ? 'active' : ''}" data-cat="cation">⚡ 양이온 전체(${totalCations})</button>
            <button class="cat-pill ion-cat-pill ${alchemyState.currentShelfCat === 'anion' ? 'active' : ''}" data-cat="anion">💧 음이온 전체(${totalAnions})</button>
            <button class="cat-pill ion-cat-pill ${alchemyState.currentShelfCat === 'poly_ion' ? 'active' : ''}" data-cat="poly_ion">🧩 다원자·착이온(${totalPolyIons})</button>
            <button class="cat-pill ${alchemyState.currentShelfCat === 'nonmetal' ? 'active' : ''}" data-cat="nonmetal">비금속/할로젠</button>
            <button class="cat-pill ${alchemyState.currentShelfCat === 'metal' ? 'active' : ''}" data-cat="metal">주요금속</button>
            <button class="cat-pill ${alchemyState.currentShelfCat === 'precious' ? 'active' : ''}" data-cat="precious">귀금속/특수</button>
            <button class="cat-pill ${alchemyState.currentShelfCat === 'full118' ? 'active' : ''}" data-cat="full118">🌌 118원소+전산화수(${fullList.length})</button>
          </div>
        </div>

        <div class="alchemy-atoms-grid" id="alchemyAtomsGrid">
          ${renderShelfButtonsHtml(filteredElements)}
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
    return `
      <button class="shelf-atom-btn ${isIon ? 'shelf-ion-btn' : ''}" data-symbol="${el.symbol}" draggable="true" style="border-color:${el.color};">
        ${badgeTag}
        <strong style="color:${el.color};">${el.symbol}</strong>
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
    const showSubName = koName && koName !== sym;

    return `
      <button class="beaker-atom-pill ${extraClass}" data-beaker-idx="${idx}" title="${showSubName ? `${sym} (${koName}) - 터치하여 꺼내기` : '터치하여 비커에서 꺼내기'}">
        <span class="pill-sym-text">${sym}</span>
        ${showSubName ? `<small class="pill-ko-name">${koName}</small>` : ''}
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
    return (
      r.name.toLowerCase().includes(query) ||
      r.formula.toLowerCase().includes(query) ||
      (r.shortFormula && r.shortFormula.toLowerCase().includes(query))
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
    return `
      <div class="inventory-item-slot ${isUnlocked ? 'unlocked' : (isStarter ? 'starter' : 'preview')}"
           draggable="true"
           data-token="${tokenVal}"
           data-recipe-id="${r.id}"
           title="비커로 드래그하거나 클릭하여 [${tokenVal}] 투입!">
        <div class="inv-slot-top">
          <span class="inv-slot-icon">${r.icon}</span>
          <span class="inv-slot-formula">${tokenVal}</span>
        </div>
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
 * 비커 드롭존 (마우스 Drag & Drop + 터치 드롭) 바인딩
 */
function bindBeakerDragAndDrop(container) {
  const beakerGlass = container.querySelector('#beakerGlassEl');
  if (!beakerGlass) return;

  beakerGlass.addEventListener('dragover', (e) => {
    e.preventDefault();
    beakerGlass.classList.add('drag-over');
  });

  beakerGlass.addEventListener('dragleave', () => {
    beakerGlass.classList.remove('drag-over');
  });

  beakerGlass.addEventListener('drop', (e) => {
    e.preventDefault();
    beakerGlass.classList.remove('drag-over');
    const token = e.dataTransfer?.getData('text/plain');
    if (token) {
      addTokenToBeaker(token, container);
    }
  });
}

/**
 * 화면이 아래로 스크롤된 상태에서 드래그할 때 상단에 나타나는 플로팅 비커 드롭존 생성/반환
 */
function ensureFloatingBeakerDropZone() {
  let zone = document.getElementById('floatingBeakerDropZone');
  if (!zone) {
    zone = document.createElement('div');
    zone.id = 'floatingBeakerDropZone';
    zone.className = 'floating-beaker-dropzone';
    zone.innerHTML = `
      <span class="floating-drop-icon">🧪</span>
      <div class="floating-drop-text">
        <strong>여기에 놓아 비커에 바로 투입!</strong>
        <small id="floatingDropFormulaSub">비커 드롭 영역</small>
      </div>
    `;
    document.body.appendChild(zone);
  }
  const sub = zone.querySelector('#floatingDropFormulaSub');
  if (sub) {
    const curExpr = formatBeakerExpression(alchemyState.beakerElements);
    sub.textContent = curExpr ? `현재 비커: ${curExpr}` : '비커가 비어 있습니다';
  }
  return zone;
}

/**
 * 모바일 터치 드래그 앤 드롭 지원 (화면 스크롤 완전 고정 + 아이템만 부드럽게 이동!)
 */
function bindTouchDragToBeaker(el, getTokenFn, container) {
  let ghostEl = null;
  let floatingZone = null;
  let startX = 0;
  let startY = 0;
  let isDragging = false;

  el.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    isDragging = false;
  }, { passive: true });

  el.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 1) return;
    // 첫 이동부터 기본 브라우저 스크롤(Viewport Pan) 및 내부 그리드 스크롤을 즉시 차단!
    if (e.cancelable) {
      e.preventDefault();
    }
    e.stopPropagation();

    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - startX);
    const dy = Math.abs(touch.clientY - startY);

    if (!isDragging && (dx > 5 || dy > 5)) {
      isDragging = true;
      el.classList.add('dragging');
      document.body.classList.add('alchemy-dragging-active');

      const token = getTokenFn();
      const koName = getTokenKoreanName(token);
      ghostEl = document.createElement('div');
      ghostEl.className = 'alchemy-touch-ghost';
      ghostEl.textContent = (koName && koName !== token) ? `${token} (${koName})` : token;
      document.body.appendChild(ghostEl);

      // 만약 비커가 화면 위쪽으로 스크롤되어 가려져 있다면 상단 플로팅 드롭존 표시
      const beakerGlass = document.getElementById('beakerGlassEl');
      if (beakerGlass) {
        const bRect = beakerGlass.getBoundingClientRect();
        if (bRect.top < 40) {
          floatingZone = ensureFloatingBeakerDropZone();
          floatingZone.classList.add('visible');
        }
      }
    }

    if (isDragging && ghostEl) {
      ghostEl.style.left = `${touch.clientX}px`;
      ghostEl.style.top = `${touch.clientY}px`;

      const beakerGlass = document.getElementById('beakerGlassEl');
      if (beakerGlass) {
        const rect = beakerGlass.getBoundingClientRect();
        const overBeaker = touch.clientX >= rect.left - 15 && touch.clientX <= rect.right + 15 &&
                           touch.clientY >= rect.top - 15 && touch.clientY <= rect.bottom + 15;
        beakerGlass.classList.toggle('drag-over', overBeaker);
      }

      if (floatingZone && floatingZone.classList.contains('visible')) {
        const fRect = floatingZone.getBoundingClientRect();
        const overFloat = touch.clientX >= fRect.left && touch.clientX <= fRect.right &&
                          touch.clientY >= fRect.top && touch.clientY <= fRect.bottom + 25;
        floatingZone.classList.toggle('drag-over', overFloat);
      }
    }
  }, { passive: false });

  const endTouch = (e) => {
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

    const touch = e.changedTouches?.[0];
    let dropped = false;

    const beakerGlass = document.getElementById('beakerGlassEl');
    if (beakerGlass) {
      beakerGlass.classList.remove('drag-over');
      if (touch) {
        const rect = beakerGlass.getBoundingClientRect();
        const overBeaker = touch.clientX >= rect.left - 15 && touch.clientX <= rect.right + 15 &&
                           touch.clientY >= rect.top - 15 && touch.clientY <= rect.bottom + 15;
        if (overBeaker) dropped = true;
      }
    }

    if (floatingZone) {
      if (touch && floatingZone.classList.contains('visible')) {
        const fRect = floatingZone.getBoundingClientRect();
        const overFloat = touch.clientX >= fRect.left && touch.clientX <= fRect.right &&
                          touch.clientY >= fRect.top && touch.clientY <= fRect.bottom + 25;
        if (overFloat) dropped = true;
      }
      floatingZone.classList.remove('visible', 'drag-over');
    }

    if (dropped) {
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
  const previewEl = document.getElementById('beakerFormulaPreview');
  if (previewEl) {
    previewEl.innerHTML = expr
      ? `<div class="formula-expr-main"><strong>${expr}</strong></div><div class="formula-ko-sub">🇰🇷 ${koNames}</div>`
      : '<span class="formula-placeholder">예: Na⁺(나트륨 양이온) + Cl⁻(염화 음이온), 2NaOH⁻, Ba²⁺ + SO₄²⁻</span>';
  }
  const directInput = document.getElementById('directFormulaInput');
  if (directInput && document.activeElement !== directInput) {
    directInput.value = expr;
  }
}

/**
 * 비커 토큰을 원자/이온 구성으로 분해·전개하는 헬퍼
 * - 숫자 계수(2, 3...)나 곱하기(× 2)는 개수를 배수로 확장하거나 기호 그대로 보존
 * - 도감 화합물(NaOH, NaCl, H₂O 등)이나 이온(Na⁺, OH⁻ 등)을 구성 원소로도 분해하여 유연한 매칭 지원
 */
function expandTokensToBaseAtoms(tokens) {
  const expanded = [];
  const COMPOUND_ATOM_MAP = {
    'H₂O': ['H', 'H', 'O'],
    'CO₂': ['C', 'O', 'O'],
    'H₂O₂': ['H', 'H', 'O', 'O'],
    'O₃': ['O', 'O', 'O'],
    'CO': ['C', 'O'],
    'CH₄': ['C', 'H', 'H', 'H', 'H'],
    'NH₃': ['N', 'H', 'H', 'H'],
    'NaCl': ['Na', 'Cl'],
    'NaHCO₃': ['Na', 'H', 'C', 'O'],
    'HCl': ['H', 'Cl'],
    'CaO': ['Ca', 'O'],
    'Ca(OH)₂': ['Ca', 'O', 'H'],
    'NaClO': ['Na', 'Cl', 'O'],
    'NaOH': ['Na', 'O', 'H'],
    'CaCO₃': ['Ca', 'C', 'O', 'O', 'O'],
    'SiO₂': ['Si', 'O', 'O'],
    'CuSO₄': ['Cu', 'S', 'O'],
    'AgNO₃': ['Ag', 'N', 'O'],
    'H₂SO₄': ['H', 'H', 'S', 'O', 'O', 'O', 'O'],
    'HNO₃': ['H', 'N', 'O', 'O', 'O'],
    'H₂CO₃': ['H', 'H', 'C', 'O', 'O', 'O'],
    'NH₄Cl': ['N', 'H', 'H', 'H', 'H', 'Cl']
  };

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (['+', '➔', '='].includes(t)) continue;

    // '× 숫자' 패턴 처리
    if (t === '×' && i > 0 && i + 1 < tokens.length && /^\d+$/.test(tokens[i + 1])) {
      const mult = Math.min(parseInt(tokens[i + 1], 10), 6);
      const prevToken = tokens[i - 1];
      for (let m = 1; m < mult; m++) {
        if (COMPOUND_ATOM_MAP[prevToken]) expanded.push(...COMPOUND_ATOM_MAP[prevToken]);
        else expanded.push(prevToken.replace(/[⁺⁻²³]/g, ''));
      }
      i++;
      continue;
    }

    if (/^\d+$/.test(t) || ['-', '÷', '×', '⁺', '⁻', '²⁺', '²⁻', '³⁺', '³⁻', '⁴⁺', '⁴⁻', '(', ')', 'e⁻'].includes(t)) {
      continue;
    }

    if (COMPOUND_ATOM_MAP[t]) {
      expanded.push(...COMPOUND_ATOM_MAP[t]);
    } else {
      const fullShelf = getFullAlchemyShelfItems();
      const shelfItem = fullShelf.find(e => e.symbol === t);
      if (shelfItem && shelfItem.baseAtoms && shelfItem.baseAtoms.length > 0) {
        expanded.push(...shelfItem.baseAtoms);
      } else {
        expanded.push(t.replace(/[⁺⁻²³⁴⁵⁶⁷⁸]/g, ''));
      }
    }
  }
  return expanded;
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

  setTimeout(() => {
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

