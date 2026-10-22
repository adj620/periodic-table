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

// Web Audio API 사운드 합성기
function playSoundEffect(type) {
  if (typeof quizState !== 'undefined' && !quizState.isSoundEnabled) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
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

function switchGameTab(gameKey) {
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
  isAnswered: false
};

function renderPuzzleGameLobby(container) {
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
  const targetEl = puzzleState.questions[puzzleState.currentIndex];
  const cat = CATEGORIES[targetEl.category] || {};

  // 문제의 후보 칸 4개 생성 (정답 1개 + 오답 3개)
  const allEl = Array.from(elementsMap.values());
  const distractors = allEl
    .filter(e => e.atomicNumber !== targetEl.atomicNumber)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
  
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
              <small>${slot.atomicNumber === targetEl.atomicNumber ? '정답 슬롯' : '후보 자리'}</small>
            </div>
            <span class="slot-pick-icon">👉 장착하기</span>
          </button>
        `).join('')}
      </div>

      <div id="puzzleFeedback" class="puzzle-feedback-msg" style="display:none;"></div>
    </div>
  `;

  document.getElementById('exitPuzzleBtn')?.addEventListener('click', () => {
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

  setTimeout(() => {
    if (puzzleState.currentIndex < puzzleState.questions.length - 1) {
      puzzleState.currentIndex++;
      renderPuzzlePlayScreen(container);
    } else {
      renderPuzzleResultScreen(container);
    }
  }, 1400);
}

function renderPuzzleResultScreen(container) {
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
 * 4. ⚗️ 원소 연금술사 - 화합물 합성 실험실 (Compound Alchemy Lab)
 * ========================================================================= */
const ALCHEMY_RECIPES = [
  { id: 'water', name: '물 (생명의 근원)', formula: 'H₂O', elements: ['H', 'H', 'O'], icon: '💧', desc: '지구 생명체의 70%를 이루는 가장 소중한 액체 화합물입니다.' },
  { id: 'salt', name: '소금 (식염)', formula: 'NaCl', elements: ['Na', 'Cl'], icon: '🧂', desc: '바닷물을 짜게 만들고 우리 몸의 삼투압을 조절하는 필수 소금입니다.' },
  { id: 'co2', name: '이산화탄소 (탄산가스)', formula: 'CO₂', elements: ['C', 'O', 'O'], icon: '🫧', desc: '식물이 광합성을 할 때 마시고, 시원한 탄산음료에 톡 쏘는 기포를 만듭니다.' },
  { id: 'methane', name: '메테인 (천연도시가스)', formula: 'CH₄', elements: ['C', 'H', 'H', 'H', 'H'], icon: '🔥', desc: '가정에서 보일러를 켜고 요리를 할 때 태우는 깨끗한 천연가스(LNG)의 주성분입니다.' },
  { id: 'rust', name: '산화철 (붉은 녹)', formula: 'Fe₂O₃', elements: ['Fe', 'Fe', 'O', 'O', 'O'], icon: '🟤', desc: '비 오는 날 철근이나 못이 공기 중 산소와 만나 붉게 녹스는 반응입니다.' },
  { id: 'chalk', name: '탄산칼슘 (조개껍데기/분필)', formula: 'CaCO₃', elements: ['Ca', 'C', 'O', 'O', 'O'], icon: '🐚', desc: '달걀 껍데기, 조개껍질, 학교 칠판 분필, 대리석을 이루는 단단한 광물입니다.' },
  { id: 'ammonia', name: '암모니아 (농업 비료)', formula: 'NH₃', elements: ['N', 'H', 'H', 'H'], icon: '🌾', desc: '질소 비료를 만들어 전 세계 수십억 인류의 식량 위기를 해결한 기적의 화합물입니다.' },
  { id: 'sand', name: '석영 / 유리 (모래)', formula: 'SiO₂', elements: ['Si', 'O', 'O'], icon: '🏖️', desc: '바닷가 백사장의 모래이자 투명한 유리창을 만드는 핵심 원료입니다.' },
  { id: 'acid', name: '염산 (위산)', formula: 'HCl', elements: ['H', 'Cl'], icon: '🧪', desc: '우리 위장 속에서 음식물을 소화하고 세균을 살균하는 강한 산성 액체입니다.' },
  { id: 'bronze', name: '청동 (역사상 최초의 합금)', formula: 'Cu-Sn', elements: ['Cu', 'Sn'], icon: '🏺', desc: '인류에게 찬란한 청동기 시대를 열어준 구리와 주석의 단단한 합금입니다.' },
  { id: 'brass', name: '황동 / 놋쇠 (금관악기)', formula: 'Cu-Zn', elements: ['Cu', 'Zn'], icon: '🎺', desc: '반짝이는 트럼펫, 호른 등 금관악기와 튼튼한 놋그릇을 만드는 합금입니다.' },
  { id: 'stainless', name: '스테인리스강 (녹슬지 않는 철)', formula: 'Fe-Cr-Ni', elements: ['Fe', 'Cr', 'Ni'], icon: '🍴', desc: '철에 크롬과 니켈을 섞어 물에 닿아도 영원히 녹슬지 않는 주방 수저와 칼입니다.' },
  { id: 'baking_soda', name: '베이킹소다 (탄산수소나트륨)', formula: 'NaHCO₃', elements: ['Na', 'H', 'C', 'O'], icon: '🧁', desc: '빵을 푹신하게 부풀리고 주방을 깨끗이 닦아주는 만능 백색 가루입니다.' },
  { id: 'h2o2', name: '과산화수소 (상처 소독약)', formula: 'H₂O₂', elements: ['H', 'H', 'O', 'O'], icon: '🩹', desc: '피부에 바르면 하얀 거품을 내며 세균을 소독하는 약품입니다.' },
  { id: 'ruby', name: '루비 / 사파이어 (알루미나)', formula: 'Al₂O₃', elements: ['Al', 'Al', 'O', 'O', 'O'], icon: '💎', desc: '산화알루미늄 결정에 크롬이 섞이면 붉은 루비, 철·티타늄이 섞이면 파란 사파이어가 됩니다.' },
  { id: 'laughing_gas', name: '웃음가스 (아산화질소)', formula: 'N₂O', elements: ['N', 'N', 'O'], icon: '😄', desc: '마시면 기분이 좋아져 웃음이 난다 하여 치과 마취 진통제로 쓰이는 가스입니다.' }
];

let alchemyState = {
  beakerElements: [], // 비커에 담긴 원소 기호 배열
  unlockedRecipes: JSON.parse(localStorage.getItem('periodic_alchemy_unlocked') || '[]')
};

function renderAlchemyGameLobby(container) {
  const unlockedCount = alchemyState.unlockedRecipes.length;
  const totalCount = ALCHEMY_RECIPES.length;
  const progressPct = Math.round((unlockedCount / totalCount) * 100);

  // 실험대에서 투입할 수 있는 주요 16가지 기본 원소
  const basicElements = [
    { symbol: 'H', name: '수소', color: '#38bdf8' },
    { symbol: 'C', name: '탄소', color: '#4ade80' },
    { symbol: 'N', name: '질소', color: '#60a5fa' },
    { symbol: 'O', name: '산소', color: '#38bdf8' },
    { symbol: 'Na', name: '소듐', color: '#f87171' },
    { symbol: 'Al', name: '알루미늄', color: '#4ade80' },
    { symbol: 'Si', name: '규소', color: '#2dd4bf' },
    { symbol: 'Cl', name: '염소', color: '#38bdf8' },
    { symbol: 'Ca', name: '칼슘', color: '#fb923c' },
    { symbol: 'Cr', name: '크롬', color: '#facc15' },
    { symbol: 'Fe', name: '철', color: '#facc15' },
    { symbol: 'Ni', name: '니켈', color: '#facc15' },
    { symbol: 'Cu', name: '구리', color: '#facc15' },
    { symbol: 'Zn', name: '아연', color: '#facc15' },
    { symbol: 'Sn', name: '주석', color: '#4ade80' }
  ];

  container.innerHTML = `
    <div class="alchemy-lab-wrapper">
      <!-- 상단 도감 진행률 바 -->
      <div class="alchemy-header-bar">
        <div class="alchemy-progress-group">
          <span>⚗️ 화합물 도감 수집: <strong>${unlockedCount} / ${totalCount}</strong> (${progressPct}%)</span>
          <div class="alchemy-progress-track">
            <div class="alchemy-progress-fill" style="width: ${progressPct}%;"></div>
          </div>
        </div>
        <button id="toggleRecipeBookBtn" class="pill-btn">📖 레시피 도감 보기</button>
      </div>

      <!-- 중앙 반응 비커 실험대 -->
      <div class="alchemy-beaker-stage">
        <div class="beaker-container">
          <div class="beaker-glass">
            <div id="beakerFluid" class="beaker-fluid">
              <div id="beakerItems" class="beaker-items-cloud">
                ${alchemyState.beakerElements.length === 0 ? '<span class="empty-tip">아래 원소를 탭하여 비커에 넣으세요</span>' : ''}
                ${alchemyState.beakerElements.map((sym, idx) => `
                  <button class="beaker-atom-pill" data-beaker-idx="${idx}" title="클릭하여 비커에서 제거">
                    ${sym} ✕
                  </button>
                `).join('')}
              </div>
            </div>
          </div>
        </div>

        <div class="beaker-action-row">
          <button id="clearBeakerBtn" class="action-btn secondary small-btn">비커 비우기 🗑️</button>
          <button id="combineElementsBtn" class="action-btn primary large-btn">⚗️ 화학 반응 시작!</button>
        </div>
      </div>

      <!-- 하단 원소 선반 보관함 -->
      <div class="alchemy-shelf-section">
        <h3>원소 보관함 (터치하여 비커에 투입)</h3>
        <div class="alchemy-atoms-grid">
          ${basicElements.map(el => `
            <button class="shelf-atom-btn" data-symbol="${el.symbol}" style="border-color:${el.color};">
              <strong style="color:${el.color};">${el.symbol}</strong>
              <small>${el.name}</small>
            </button>
          `).join('')}
        </div>
      </div>

      <!-- 도감 모달 오버레이 -->
      <div id="recipeBookModal" class="app-modal-backdrop" style="display:none;">
        <div class="app-modal-card">
          <div class="app-modal-header">
            <h3>📖 화합물 연금술 레시피 도감</h3>
            <button id="closeRecipeBookBtn" class="modal-close-btn">✕</button>
          </div>
          <div class="app-modal-body">
            <div class="recipe-grid">
              ${ALCHEMY_RECIPES.map(r => {
                const isUnlocked = alchemyState.unlockedRecipes.includes(r.id);
                return `
                  <div class="recipe-item-card ${isUnlocked ? 'unlocked' : 'locked'}">
                    <span class="recipe-icon">${isUnlocked ? r.icon : '🔒'}</span>
                    <div class="recipe-text">
                      <strong>${isUnlocked ? r.name : '미지의 화합물'}</strong>
                      <span class="recipe-formula">${isUnlocked ? r.formula : '???'}</span>
                      <small>${isUnlocked ? r.desc : '필요 원소: ' + r.elements.join(' + ')}</small>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // 원소 투입 바인딩
  const shelfBtns = container.querySelectorAll('.shelf-atom-btn');
  shelfBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const sym = btn.dataset.symbol;
      if (alchemyState.beakerElements.length >= 7) {
        alert('비커가 가득 찼습니다! (최대 7개 원소)');
        return;
      }
      playSoundEffect('flip');
      triggerHaptic('short');
      alchemyState.beakerElements.push(sym);
      updateBeakerDisplay(container);
    });
  });

  // 비커 원소 개별 제거 바인딩
  container.addEventListener('click', (e) => {
    const pill = e.target.closest('.beaker-atom-pill');
    if (pill) {
      const idx = parseInt(pill.dataset.beakerIdx, 10);
      alchemyState.beakerElements.splice(idx, 1);
      updateBeakerDisplay(container);
    }
  });

  // 비커 비우기
  document.getElementById('clearBeakerBtn')?.addEventListener('click', () => {
    alchemyState.beakerElements = [];
    updateBeakerDisplay(container);
  });

  // 반응 시작 버튼
  document.getElementById('combineElementsBtn')?.addEventListener('click', () => {
    handleCombineReaction(container);
  });

  // 도감 모달 토글
  const bookModal = document.getElementById('recipeBookModal');
  document.getElementById('toggleRecipeBookBtn')?.addEventListener('click', () => {
    if (bookModal) bookModal.style.display = 'flex';
  });
  document.getElementById('closeRecipeBookBtn')?.addEventListener('click', () => {
    if (bookModal) bookModal.style.display = 'none';
  });
}

function updateBeakerDisplay(container) {
  const itemsContainer = document.getElementById('beakerItems');
  if (!itemsContainer) return;

  if (alchemyState.beakerElements.length === 0) {
    itemsContainer.innerHTML = '<span class="empty-tip">아래 원소를 탭하여 비커에 넣으세요</span>';
  } else {
    itemsContainer.innerHTML = alchemyState.beakerElements.map((sym, idx) => `
      <button class="beaker-atom-pill" data-beaker-idx="${idx}" title="클릭하여 비커에서 제거">
        ${sym} ✕
      </button>
    `).join('');
  }
}

function handleCombineReaction(container) {
  if (alchemyState.beakerElements.length === 0) {
    alert('비커에 먼저 원소를 넣어주세요!');
    return;
  }

  // 보글보글 합성 애니메이션 및 사운드
  playSoundEffect('bubble');
  triggerHaptic('short');

  const fluid = document.getElementById('beakerFluid');
  if (fluid) fluid.classList.add('reacting');

  setTimeout(() => {
    if (fluid) fluid.classList.remove('reacting');

    // 비커에 들어있는 원소들의 구성(정렬된 형태)
    const currentSorted = [...alchemyState.beakerElements].sort().join(',');

    // 일치하는 레시피 탐색
    const matched = ALCHEMY_RECIPES.find(r => {
      const recipeSorted = [...r.elements].sort().join(',');
      return recipeSorted === currentSorted;
    });

    if (matched) {
      // 합성 성공!
      playSoundEffect('alchemy_success');
      triggerHaptic('success');

      if (!alchemyState.unlockedRecipes.includes(matched.id)) {
        alchemyState.unlockedRecipes.push(matched.id);
        localStorage.setItem('periodic_alchemy_unlocked', JSON.stringify(alchemyState.unlockedRecipes));
      }

      showAlchemySuccessModal(matched, container);
      alchemyState.beakerElements = [];
      updateBeakerDisplay(container);
    } else {
      // 합성 실패
      playSoundEffect('wrong');
      triggerHaptic('wrong');
      alert(`⚠️ 화학 반응이 일어나지 않았습니다! 원소들의 결합 비율을 다시 확인해 보세요. (💡 레시피 도감 확인)`);
    }
  }, 800);
}

function showAlchemySuccessModal(recipe, container) {
  const modalHtml = `
    <div id="alchemySuccessModal" class="app-modal-backdrop" style="display:flex;">
      <div class="app-modal-card alchemy-success-card">
        <div class="success-sparkles">✨ 🎉 ✨</div>
        <div class="success-icon-large">${recipe.icon}</div>
        <h2 class="success-compound-name">${recipe.name}</h2>
        <div class="success-formula-badge">${recipe.formula}</div>
        <p class="success-desc">${recipe.desc}</p>
        <div class="success-recipe-tag">결합 원소: ${recipe.elements.join(' + ')}</div>
        <button id="closeAlchemySuccessBtn" class="action-btn primary large-btn" style="width:100%; margin-top:1.2rem;">
          도감에 등록 완료! 확인 👍
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
