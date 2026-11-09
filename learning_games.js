/**
 * 🎮 심화 학습형 화학 미니게임 3종 스위트 (Learning Games Suite)
 * 5. 🕵️ 원소 추리 탐정 - 5단계 단서 스무고개 (Element Detective)
 * 6. ⚛️ 보어 전자껍질 조립 챌린지 (Bohr Electron Shell Builder)
 * 7. ⚖️ 화학 반응식 계수 맞추기 퍼즐 (Chemical Equation Balancer)
 */

let learningGamesTimeoutId = null;

function stopLearningGamesTimers() {
  if (learningGamesTimeoutId) {
    clearTimeout(learningGamesTimeoutId);
    learningGamesTimeoutId = null;
  }
}
window.stopLearningGamesTimers = stopLearningGamesTimers;

/* =========================================================================
 * 5. 🕵️ 원소 추리 탐정 - 5단계 단서 스무고개 (Element Detective)
 * ========================================================================= */
let detectiveState = {
  difficulty: 'core', // 'core' (1~36번 + 주요 원소) | 'all' (118개 전체)
  target: null,
  choices: [],
  revealedClues: 2, // 기본 2개 단서 공개 (최대 5개)
  eliminatedIndices: [],
  score: 0,
  round: 1,
  totalRounds: 5,
  isAnswered: false
};

function renderDetectiveGameLobby(container) {
  stopLearningGamesTimers();
  const bestScore = localStorage.getItem('periodic_detective_best') || 0;

  container.innerHTML = `
    <div class="game-lobby-box">
      <div class="game-lobby-hero">
        <span class="game-hero-icon">🕵️</span>
        <h2>원소 추리 탐정 (5단계 스무고개)</h2>
        <p>주기·족 위치, 물리적 상태, 전자껍질, 발견 역사, 실생활 용도까지 <strong>5단계 과학 단서</strong>를 보고 숨겨진 원소를 추리하세요!</p>
        <div class="game-record-tag">
          🏆 최고 추리 점수: <strong>${bestScore}점</strong> <small>(단서를 적게 열고 맞출수록 고득점!)</small>
        </div>
      </div>

      <div class="game-settings-card">
        <h3>출제 범위 선택</h3>
        <div class="difficulty-select-grid" style="grid-template-columns: repeat(2, 1fr);">
          <button type="button" class="diff-btn ${detectiveState.difficulty === 'core' ? 'active' : ''}" data-ddiff="core">
            <span class="diff-title">🌟 교과서 핵심 원소 (추천)</span>
            <small>1~36번 및 금·은·수은·우라늄 등 필수 원소</small>
          </button>
          <button type="button" class="diff-btn ${detectiveState.difficulty === 'all' ? 'active' : ''}" data-ddiff="all">
            <span class="diff-title">🌌 118개 전 원소 마스터</span>
            <small>란타넘·악티늄·초중원소까지 전체 출제</small>
          </button>
        </div>

        <button type="button" id="startDetectiveBtn" class="action-btn primary large-btn" style="margin-top:1.4rem; width:100%;">
          🕵️ 사건 파일 열기 (추리 시작!)
        </button>
      </div>
    </div>
  `;

  container.querySelectorAll('[data-ddiff]').forEach(btn => {
    btn.addEventListener('click', () => {
      detectiveState.difficulty = btn.dataset.ddiff;
      container.querySelectorAll('[data-ddiff]').forEach(b => b.classList.toggle('active', b === btn));
    });
  });

  document.getElementById('startDetectiveBtn')?.addEventListener('click', () => {
    detectiveState.score = 0;
    detectiveState.round = 1;
    startDetectiveRound(container);
  });
}

function buildDetectiveClues(el) {
  const cat = CATEGORIES[el.category] || {};
  const shells = BOHR_SHELLS_DATA[el.atomicNumber] || [1];
  const valence = shells[shells.length - 1];
  const ency = (typeof ELEMENTS_ENCYCLOPEDIA !== 'undefined' && ELEMENTS_ENCYCLOPEDIA[el.atomicNumber]) || {};

  return [
    {
      step: 1,
      title: '📍 주기율표 위치 & 화학 계열',
      text: `이 원소는 <strong>${el.period}주기 ${el.group}족</strong>에 속하며, 화학 계열은 <strong>[${cat.nameKo || el.category}]</strong>입니다.`
    },
    {
      step: 2,
      title: '🌡️ 상온 상태 & 물리적 특성',
      text: `상온에서 <strong>${el.phase}</strong> 상태이며, 원자량은 <strong>${el.atomicMass}</strong>, 녹는점은 <strong>${el.melting || '-'}°C</strong>, 밀도는 <strong>${el.density || '-'}</strong>입니다.`
    },
    {
      step: 3,
      title: '⚛️ 보어 전자껍질 & 산화수',
      text: `전자껍질 배치는 <strong>[${shells.join(' - ')}]</strong>로 가장 바깥 껍질(최외각) 전자는 <strong>${valence}개</strong>이며, 주요 산화수는 <strong>${el.oxStates || '-'}</strong>입니다.`
    },
    {
      step: 4,
      title: '🏛️ 발견 역사 & 특징 요약',
      text: `${el.year ? `<strong>${el.year}년</strong>(${el.discoverer || '미상'})에 발견되었으며, ` : ''}${ency.headline || el.description || ''}`
    },
    {
      step: 5,
      title: '🎁 결정적 단서! 실생활 대표 물건',
      text: `우리 생활에서 <strong>[${el.icon || '🧪'} ${el.item || el.nameKo}]</strong>에 핵심적으로 쓰입니다! (활용: ${el.usage || el.description})`
    }
  ];
}

function startDetectiveRound(container) {
  stopLearningGamesTimers();
  const allEl = Array.from(elementsMap.values());
  const famousNums = new Set([47, 50, 53, 54, 55, 56, 74, 78, 79, 80, 82, 86, 88, 92, 94]);
  const pool = detectiveState.difficulty === 'core'
    ? allEl.filter(e => e.atomicNumber <= 36 || famousNums.has(e.atomicNumber))
    : allEl;

  const target = pool[Math.floor(Math.random() * pool.length)];
  const distractors = pool
    .filter(e => e.atomicNumber !== target.atomicNumber)
    .sort(() => Math.random() - 0.5)
    .slice(0, 5);

  detectiveState.target = target;
  detectiveState.choices = [target, ...distractors].sort(() => Math.random() - 0.5);
  detectiveState.revealedClues = 2; // 처음엔 1, 2번 단서 오픈
  detectiveState.eliminatedIndices = [];
  detectiveState.isAnswered = false;

  renderDetectivePlayScreen(container);
}

function renderDetectivePlayScreen(container) {
  const target = detectiveState.target;
  const clues = buildDetectiveClues(target);
  const potentialPoints = Math.max(50, 170 - (detectiveState.revealedClues - 1) * 25);

  container.innerHTML = `
    <div class="detective-play-wrapper">
      <div class="puzzle-play-header">
        <span class="puzzle-step-tag">🕵️ 사건 ${detectiveState.round} / ${detectiveState.totalRounds}</span>
        <div class="puzzle-score-tag">현재 점수: <strong>${detectiveState.score}점</strong> <small>(이번 문제 획득 가능: +${potentialPoints}점)</small></div>
        <button type="button" id="exitDetectiveBtn" class="quiz-exit-btn">✕ 로비로</button>
      </div>

      <div class="detective-case-card">
        <div class="detective-case-top">
          <div>
            <h3>📂 기밀 사건 파일 #${detectiveState.round}: 이 원소의 정체를 밝혀라!</h3>
            <small>단서를 보고 아래 6개 용의자(후보 원소) 중 정답을 골라보세요. 모르면 [🔍 다음 단서 열기]를 누르세요!</small>
          </div>
          <div class="detective-helper-btns">
            <button type="button" id="revealNextClueBtn" class="pill-btn primary small-btn" ${detectiveState.revealedClues >= 5 || detectiveState.isAnswered ? 'disabled' : ''}>
              🔍 다음 단서 열기 (${detectiveState.revealedClues}/5)
            </button>
            <button type="button" id="eliminateTwoWrongBtn" class="pill-btn secondary small-btn" ${detectiveState.eliminatedIndices.length > 0 || detectiveState.isAnswered ? 'disabled' : ''}>
              ✂️ 오답 용의자 2명 제외 찬스
            </button>
          </div>
        </div>

        <div class="detective-clues-list">
          ${clues.map((c, idx) => {
            const isOpen = idx < detectiveState.revealedClues;
            return `
              <div class="detective-clue-item ${isOpen ? 'unlocked' : 'locked'}" data-clue-idx="${idx}">
                <span class="clue-step-badge">단서 ${c.step}</span>
                <div class="clue-body">
                  <strong>${c.title}</strong>
                  <p>${isOpen ? c.text : '🔒 아직 잠겨 있는 단서입니다. 클릭하거나 [🔍 다음 단서 열기]를 눌러 확인하세요!'}</p>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="detective-suspects-grid">
        ${detectiveState.choices.map((el, idx) => {
          const isEliminated = detectiveState.eliminatedIndices.includes(idx);
          const cat = CATEGORIES[el.category] || {};
          return `
            <button type="button" class="detective-suspect-btn ${isEliminated ? 'eliminated' : ''}" data-sidx="${idx}" ${isEliminated ? 'disabled' : ''}>
              <span class="suspect-num">${el.atomicNumber}번</span>
              <strong class="suspect-sym" style="color:${cat.color || '#38bdf8'};">${el.symbol}</strong>
              <span class="suspect-name">${el.nameKo}</span>
              <small>${el.period}주기 ${el.group}족</small>
            </button>
          `;
        }).join('')}
      </div>

      <div id="detectiveFeedback" class="puzzle-feedback-msg" style="display:none;"></div>
    </div>
  `;

  document.getElementById('exitDetectiveBtn')?.addEventListener('click', () => {
    renderDetectiveGameLobby(container);
  });

  document.getElementById('revealNextClueBtn')?.addEventListener('click', () => {
    if (detectiveState.revealedClues < 5 && !detectiveState.isAnswered) {
      detectiveState.revealedClues++;
      playSoundEffect('flip');
      renderDetectivePlayScreen(container);
    }
  });

  container.querySelectorAll('.detective-clue-item.locked').forEach(item => {
    item.addEventListener('click', () => {
      if (!detectiveState.isAnswered && detectiveState.revealedClues < 5) {
        detectiveState.revealedClues++;
        playSoundEffect('flip');
        renderDetectivePlayScreen(container);
      }
    });
  });

  document.getElementById('eliminateTwoWrongBtn')?.addEventListener('click', () => {
    if (detectiveState.eliminatedIndices.length > 0 || detectiveState.isAnswered) return;
    const wrongIndices = detectiveState.choices
      .map((c, i) => (c.atomicNumber !== target.atomicNumber ? i : -1))
      .filter(i => i !== -1)
      .sort(() => Math.random() - 0.5)
      .slice(0, 2);
    detectiveState.eliminatedIndices = wrongIndices;
    playSoundEffect('flip');
    renderDetectivePlayScreen(container);
  });

  container.querySelectorAll('.detective-suspect-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (detectiveState.isAnswered) return;
      const idx = parseInt(btn.dataset.sidx, 10);
      const picked = detectiveState.choices[idx];
      detectiveState.isAnswered = true;
      detectiveState.revealedClues = 5; // 모든 단서 오픈

      const fb = document.getElementById('detectiveFeedback');
      if (picked.atomicNumber === target.atomicNumber) {
        detectiveState.score += potentialPoints;
        playSoundEffect('match');
        triggerHaptic('success');
        btn.classList.add('correct-pick');
        if (fb) {
          fb.style.display = 'block';
          fb.className = 'puzzle-feedback-msg success';
          fb.innerHTML = `🎉 명추리입니다! 범인은 <strong>${target.atomicNumber}번 ${target.nameKo}(${target.symbol})</strong>였습니다! (+${potentialPoints}점 획득)`;
        }
      } else {
        playSoundEffect('wrong');
        triggerHaptic('wrong');
        btn.classList.add('wrong-pick');
        if (fb) {
          fb.style.display = 'block';
          fb.className = 'puzzle-feedback-msg wrong';
          fb.innerHTML = `❌ 아쉽네요! 정답은 <strong>${target.atomicNumber}번 ${target.nameKo}(${target.symbol})</strong> [${target.icon || ''} ${target.item || ''}]입니다.`;
        }
      }

      learningGamesTimeoutId = setTimeout(() => {
        learningGamesTimeoutId = null;
        if (detectiveState.round < detectiveState.totalRounds) {
          detectiveState.round++;
          startDetectiveRound(container);
        } else {
          const prevBest = parseInt(localStorage.getItem('periodic_detective_best') || '0', 10);
          if (detectiveState.score > prevBest) {
            localStorage.setItem('periodic_detective_best', String(detectiveState.score));
          }
          container.innerHTML = `
            <div class="game-win-card">
              <div class="win-trophy-icon">🕵️🏆</div>
              <h2>모든 사건 추리 완료!</h2>
              <p>최종 추리 점수: <strong>${detectiveState.score}점</strong></p>
              <div class="win-actions-row" style="margin-top:1.2rem;">
                <button type="button" id="detectiveReplayBtn" class="action-btn primary">새 사건 도전 🔄</button>
                <button type="button" id="detectiveLobbyBtn" class="action-btn secondary">로비로 🏠</button>
              </div>
            </div>
          `;
          document.getElementById('detectiveReplayBtn')?.addEventListener('click', () => {
            detectiveState.score = 0;
            detectiveState.round = 1;
            startDetectiveRound(container);
          });
          document.getElementById('detectiveLobbyBtn')?.addEventListener('click', () => {
            renderDetectiveGameLobby(container);
          });
        }
      }, 1700);
    });
  });
}

/* =========================================================================
 * 6. ⚛️ 보어 전자껍질 조립 챌린지 (Bohr Electron Shell Builder)
 * ========================================================================= */
const BOHR_CAPACITIES = [2, 8, 18, 32]; // K, L, M, N 기본 수용 한계 (1~20번은 2, 8, 8, 2 옥텟 규칙 안내)

let bohrGameState = {
  targetAtomicNum: 11, // 기본: 11번 나트륨(Na) (2-8-1)
  userShells: [0, 0, 0, 0], // K, L, M, N
  score: 0
};

function renderBohrBuilderGame(container) {
  stopLearningGamesTimers();
  const target = elementsMap.get(bohrGameState.targetAtomicNum) || elementsMap.get(11);
  const answerShells = BOHR_SHELLS_DATA[target.atomicNumber] || [1];
  const cat = CATEGORIES[target.category] || {};

  const totalPlaced = bohrGameState.userShells.reduce((a, b) => a + b, 0);
  const remaining = target.atomicNumber - totalPlaced;
  const isExactMatch = answerShells.every((cnt, idx) => (bohrGameState.userShells[idx] || 0) === cnt) &&
    bohrGameState.userShells.slice(answerShells.length).every(v => v === 0);

  // 이온화 원리 설명 생성
  const valence = answerShells[answerShells.length - 1];
  let octetTip = '';
  if (target.group === 18) {
    octetTip = `🌟 <strong>비활성 기체(18족):</strong> 가장 바깥 껍질이 이미 가득 차 있어(${valence}개) 전자를 잃거나 얻지 않는 완벽히 안정한 상태예요!`;
  } else if (valence <= 3 && target.atomicNumber > 2) {
    octetTip = `⚡ <strong>양이온 형성 원리:</strong> 가장 바깥 껍질의 원자가 전자가 <strong>${valence}개</strong>뿐이라, 이 전자 ${valence}개를 잃고 <strong>+${valence}가 양이온(${target.symbol}${valence > 1 ? valence : ''}⁺)</strong>이 되면 안쪽 껍질이 꽉 차서 안정해집니다!`;
  } else if (valence >= 5 && valence <= 7) {
    const need = 8 - valence;
    octetTip = `💧 <strong>음이온 형성 원리:</strong> 가장 바깥 껍질에 전자가 <strong>${valence}개</strong> 있어서, 전자 <strong>${need}개</strong>만 더 얻으면 8개(옥텟 규칙)를 채워 <strong>-${need}가 음이온(${target.symbol}${need > 1 ? need : ''}⁻)</strong>이 됩니다!`;
  } else {
    octetTip = `🔗 <strong>전자 배치 원리:</strong> 안쪽 K껍질(최대 2개)부터 L껍질(최대 8개), M껍질 순서로 전자가 차곡차곡 채워집니다.`;
  }

  // SVG 렌더링
  const cx = 135;
  const cy = 135;
  const radii = [34, 62, 90, 118];
  let orbitsSvg = '';
  for (let i = 0; i < 4; i++) {
    const r = radii[i];
    const eCount = bohrGameState.userShells[i] || 0;
    const reqCount = answerShells[i] || 0;
    const isShellMatch = eCount === reqCount;
    let electronsSvg = '';
    for (let j = 0; j < eCount; j++) {
      const angle = (2 * Math.PI * j) / eCount - Math.PI / 2;
      const ex = (cx + r * Math.cos(angle)).toFixed(1);
      const ey = (cy + r * Math.sin(angle)).toFixed(1);
      electronsSvg += `<circle cx="${ex}" cy="${ey}" r="5" fill="${isShellMatch ? '#4ade80' : '#38bdf8'}" stroke="#0f172a" stroke-width="1.5" />`;
    }
    orbitsSvg += `
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${eCount > 0 ? (isShellMatch ? 'rgba(74,222,128,0.55)' : 'rgba(56,189,248,0.45)') : 'rgba(148,163,184,0.22)'}" stroke-width="2" stroke-dasharray="${eCount > 0 ? 'none' : '4 4'}" />
      <text x="${cx}" y="${cy - r + 11}" fill="#94a3b8" font-size="9" text-anchor="middle">${SHELL_NAMES[i]}껍질(${eCount}/${reqCount})</text>
      <g>${electronsSvg}</g>
    `;
  }

  // 1~20번 필수 원소 선택 버튼
  const quickElements = Array.from({ length: 20 }, (_, i) => elementsMap.get(i + 1)).filter(Boolean);

  container.innerHTML = `
    <div class="bohr-builder-wrapper">
      <div class="bohr-top-bar">
        <div>
          <h3>⚛️ 보어 전자껍질 조립 실험실 (옥텟 규칙 & 원자가 전자 마스터)</h3>
          <small>원자번호(=전자 수)만큼 안쪽 K껍질부터 전자를 채워 넣고 왜 이온이 되는지 눈으로 확인해 보세요!</small>
        </div>
        <div class="bohr-top-actions">
          <button type="button" id="bohrRandomBtn" class="pill-btn secondary small-btn">🎲 랜덤 문제</button>
          <button type="button" id="bohrAutoSolveBtn" class="pill-btn primary small-btn">🪄 정답 배치 보기</button>
        </div>
      </div>

      <!-- 1~20번 원소 빠른 선택 칩 -->
      <div class="bohr-el-picker-row">
        ${quickElements.map(e => `
          <button type="button" class="bohr-el-chip ${e.atomicNumber === target.atomicNumber ? 'active' : ''}" data-bnum="${e.atomicNumber}">
            <small>${e.atomicNumber}</small> <strong>${e.symbol}</strong>
          </button>
        `).join('')}
      </div>

      <div class="bohr-main-stage">
        <!-- 좌측: 인터랙티브 보어 궤도 캔버스 -->
        <div class="bohr-svg-card">
          <div class="bohr-target-header">
            <span class="bohr-num-badge" style="background:${cat.color || '#38bdf8'}; color:#0f172a;">원자번호 ${target.atomicNumber}번 (총 전자 ${target.atomicNumber}개)</span>
            <h4>${target.nameKo} (${target.symbol}) · <small>${target.period}주기 ${target.group}족</small></h4>
          </div>
          <div class="bohr-svg-box">
            <svg viewBox="0 0 270 270" width="250" height="250">
              ${orbitsSvg}
              <circle cx="${cx}" cy="${cy}" r="18" fill="${cat.color || '#38bdf8'}" />
              <text x="${cx}" y="${cy + 5}" fill="#0f172a" font-weight="900" font-size="13" text-anchor="middle">+${target.atomicNumber} ${target.symbol}</text>
            </svg>
          </div>
          <div class="bohr-remain-status ${remaining === 0 && isExactMatch ? 'status-ok' : ''}">
            ${isExactMatch
              ? `🎉 <strong>완벽한 전자 배치 완성! [${answerShells.join(' - ')}]</strong> (최외각 원자가 전자: <strong>${valence}개</strong>)`
              : remaining > 0
                ? `⚡ 배치할 전자가 <strong>${remaining}개</strong> 남았습니다. 아래 껍질의 <strong>[+1]</strong> 버튼을 눌러 채워주세요!`
                : `⚠️ 전자가 <strong>${Math.abs(remaining)}개</strong> 초과되었거나 껍질 순서가 맞지 않습니다!`}
          </div>
        </div>

        <!-- 우측: K, L, M, N 껍질 조립 컨트롤러 및 튜터 해설 -->
        <div class="bohr-controls-card">
          <h4>🐚 껍질별 전자 채우기 컨트롤러</h4>
          <div class="bohr-shell-rows">
            ${[0, 1, 2, 3].map(idx => {
              const cur = bohrGameState.userShells[idx] || 0;
              const req = answerShells[idx] || 0;
              const maxRule = idx === 0 ? 2 : 8;
              const isOk = cur === req;
              return `
                <div class="bohr-shell-ctrl-row ${isOk ? 'shell-ok' : ''}">
                  <div class="shell-lbl-col">
                    <strong>${SHELL_NAMES[idx]} 껍질 (${idx + 1}번째 궤도)</strong>
                    <small>권장 규칙: 최대 ${maxRule}개 · 목표: <strong>${req}개</strong></small>
                  </div>
                  <div class="shell-btn-col">
                    <button type="button" class="shell-step-btn" data-sidx="${idx}" data-delta="-1" ${cur <= 0 ? 'disabled' : ''}>➖</button>
                    <span class="shell-cur-val">${cur}개</span>
                    <button type="button" class="shell-step-btn" data-sidx="${idx}" data-delta="1" ${cur >= 18 ? 'disabled' : ''}>➕</button>
                    <button type="button" class="pill-btn secondary small-btn shell-fill-target-btn" data-sidx="${idx}" data-req="${req}">
                      ${isOk ? '✅ 완료' : `${req}개 채우기`}
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <div class="bohr-tutor-insight">
            ${octetTip}
          </div>
        </div>
      </div>
    </div>
  `;

  container.querySelectorAll('.bohr-el-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      bohrGameState.targetAtomicNum = parseInt(chip.dataset.bnum, 10);
      bohrGameState.userShells = [0, 0, 0, 0];
      playSoundEffect('flip');
      renderBohrBuilderGame(container);
    });
  });

  document.getElementById('bohrRandomBtn')?.addEventListener('click', () => {
    const nextNum = Math.floor(Math.random() * 20) + 1;
    bohrGameState.targetAtomicNum = nextNum;
    bohrGameState.userShells = [0, 0, 0, 0];
    playSoundEffect('flip');
    renderBohrBuilderGame(container);
  });

  document.getElementById('bohrAutoSolveBtn')?.addEventListener('click', () => {
    bohrGameState.userShells = [
      answerShells[0] || 0,
      answerShells[1] || 0,
      answerShells[2] || 0,
      answerShells[3] || 0
    ];
    playSoundEffect('match');
    triggerHaptic('success');
    renderBohrBuilderGame(container);
  });

  container.querySelectorAll('.shell-step-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sidx = parseInt(btn.dataset.sidx, 10);
      const delta = parseInt(btn.dataset.delta, 10);
      bohrGameState.userShells[sidx] = Math.max(0, (bohrGameState.userShells[sidx] || 0) + delta);
      playSoundEffect('flip');
      renderBohrBuilderGame(container);
      const nowMatch = answerShells.every((cnt, idx) => (bohrGameState.userShells[idx] || 0) === cnt) &&
        bohrGameState.userShells.slice(answerShells.length).every(v => v === 0);
      if (nowMatch) {
        playSoundEffect('alchemy_success');
        triggerHaptic('success');
      }
    });
  });

  container.querySelectorAll('.shell-fill-target-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sidx = parseInt(btn.dataset.sidx, 10);
      const req = parseInt(btn.dataset.req, 10);
      bohrGameState.userShells[sidx] = req;
      playSoundEffect('match');
      renderBohrBuilderGame(container);
    });
  });
}

/* =========================================================================
 * 7. ⚖️ 화학 반응식 계수 맞추기 퍼즐 (Chemical Equation Balancer)
 * ========================================================================= */
const CHEMICAL_EQUATIONS_BANK = [
  {
    id: 'water_synth',
    title: '💧 물의 합성 반응',
    desc: '수소 기체(H₂)와 산소 기체(O₂)가 반응하여 물(H₂O)이 생성됩니다. 양변의 산소(O) 원자 수를 먼저 맞춰보세요!',
    reactants: [
      { formula: 'H₂', ko: '수소', atoms: { H: 2 }, targetCoeff: 2 },
      { formula: 'O₂', ko: '산소', atoms: { O: 2 }, targetCoeff: 1 }
    ],
    products: [
      { formula: 'H₂O', ko: '물', atoms: { H: 2, O: 1 }, targetCoeff: 2 }
    ]
  },
  {
    id: 'ammonia_synth',
    title: '🌾 암모니아 합성 반응 (하버-보슈법)',
    desc: '질소(N₂) 1분자와 수소(H₂) 3분자가 만나 암모니아(NH₃) 2분자를 만듭니다.',
    reactants: [
      { formula: 'N₂', ko: '질소', atoms: { N: 2 }, targetCoeff: 1 },
      { formula: 'H₂', ko: '수소', atoms: { H: 2 }, targetCoeff: 3 }
    ],
    products: [
      { formula: 'NH₃', ko: '암모니아', atoms: { N: 1, H: 3 }, targetCoeff: 2 }
    ]
  },
  {
    id: 'methane_combust',
    title: '🔥 메테인(천연가스) 완전 연소 반응',
    desc: '메테인(CH₄)이 산소(O₂)와 타면 이산화탄소(CO₂)와 물(H₂O)이 생깁니다. 수소(H) 4개를 먼저 맞춰보세요!',
    reactants: [
      { formula: 'CH₄', ko: '메테인', atoms: { C: 1, H: 4 }, targetCoeff: 1 },
      { formula: 'O₂', ko: '산소', atoms: { O: 2 }, targetCoeff: 2 }
    ],
    products: [
      { formula: 'CO₂', ko: '이산화탄소', atoms: { C: 1, O: 2 }, targetCoeff: 1 },
      { formula: 'H₂O', ko: '물', atoms: { H: 2, O: 1 }, targetCoeff: 2 }
    ]
  },
  {
    id: 'iron_rust',
    title: '🟤 철의 산화 (붉은 녹 생성) 반응',
    desc: '철(Fe)과 산소(O₂)가 결합해 산화철(Fe₂O₃)이 됩니다. 산소 원자 수(2와 3의 최소공배수 6)를 먼저 맞춰보세요!',
    reactants: [
      { formula: 'Fe', ko: '철', atoms: { Fe: 1 }, targetCoeff: 4 },
      { formula: 'O₂', ko: '산소', atoms: { O: 2 }, targetCoeff: 3 }
    ],
    products: [
      { formula: 'Fe₂O₃', ko: '산화철(III)', atoms: { Fe: 2, O: 3 }, targetCoeff: 2 }
    ]
  },
  {
    id: 'h2o2_decomp',
    title: '🩹 과산화수소 소독약 분해 반응',
    desc: '과산화수소(H₂O₂)가 물(H₂O)과 산소 기포(O₂)로 분해되는 반응입니다.',
    reactants: [
      { formula: 'H₂O₂', ko: '과산화수소', atoms: { H: 2, O: 2 }, targetCoeff: 2 }
    ],
    products: [
      { formula: 'H₂O', ko: '물', atoms: { H: 2, O: 1 }, targetCoeff: 2 },
      { formula: 'O₂', ko: '산소', atoms: { O: 2 }, targetCoeff: 1 }
    ]
  },
  {
    id: 'magnesium_burn',
    title: '✨ 마그네슘 리본 연소 반응',
    desc: '마그네슘(Mg)을 태우면 눈부신 빛을 내며 산소(O₂)와 결합해 산화마그네슘(MgO)이 됩니다.',
    reactants: [
      { formula: 'Mg', ko: '마그네슘', atoms: { Mg: 1 }, targetCoeff: 2 },
      { formula: 'O₂', ko: '산소', atoms: { O: 2 }, targetCoeff: 1 }
    ],
    products: [
      { formula: 'MgO', ko: '산화마그네슘', atoms: { Mg: 1, O: 1 }, targetCoeff: 2 }
    ]
  },
  {
    id: 'sodium_water',
    title: '💥 나트륨과 물의 격렬한 반응',
    desc: '나트륨(Na)을 물(H₂O)에 넣으면 수산화나트륨(NaOH) 용액이 되고 수소 기체(H₂)가 발생합니다.',
    reactants: [
      { formula: 'Na', ko: '소듐(나트륨)', atoms: { Na: 1 }, targetCoeff: 2 },
      { formula: 'H₂O', ko: '물', atoms: { H: 2, O: 1 }, targetCoeff: 2 }
    ],
    products: [
      { formula: 'NaOH', ko: '수산화나트륨', atoms: { Na: 1, O: 1, H: 1 }, targetCoeff: 2 },
      { formula: 'H₂', ko: '수소 기체', atoms: { H: 2 }, targetCoeff: 1 }
    ]
  },
  {
    id: 'photosynthesis',
    title: '🌱 식물의 광합성 반응 (포도당 합성)',
    desc: '이산화탄소(CO₂) 6개와 물(H₂O) 6개가 빛 에너지로 포도당(C₆H₁₂O₆) 1개와 산소(O₂) 6개를 만듭니다!',
    reactants: [
      { formula: 'CO₂', ko: '이산화탄소', atoms: { C: 1, O: 2 }, targetCoeff: 6 },
      { formula: 'H₂O', ko: '물', atoms: { H: 2, O: 1 }, targetCoeff: 6 }
    ],
    products: [
      { formula: 'C₆H₁₂O₆', ko: '포도당', atoms: { C: 6, H: 12, O: 6 }, targetCoeff: 1 },
      { formula: 'O₂', ko: '산소', atoms: { O: 2 }, targetCoeff: 6 }
    ]
  }
];

let balancerState = {
  currentIdx: 0,
  reactantCoeffs: [],
  productCoeffs: []
};

function initBalancerCoeffs(eqIdx) {
  const eq = CHEMICAL_EQUATIONS_BANK[eqIdx] || CHEMICAL_EQUATIONS_BANK[0];
  balancerState.currentIdx = eqIdx;
  balancerState.reactantCoeffs = eq.reactants.map(() => 1);
  balancerState.productCoeffs = eq.products.map(() => 1);
}
initBalancerCoeffs(0);

function renderEquationBalancerGame(container) {
  stopLearningGamesTimers();
  const eq = CHEMICAL_EQUATIONS_BANK[balancerState.currentIdx] || CHEMICAL_EQUATIONS_BANK[0];
  if (balancerState.reactantCoeffs.length !== eq.reactants.length) {
    initBalancerCoeffs(balancerState.currentIdx);
  }

  // 좌변 / 우변 원자 수 집계
  const leftCounts = {};
  const rightCounts = {};
  const allAtomSyms = new Set();

  eq.reactants.forEach((item, idx) => {
    const c = balancerState.reactantCoeffs[idx] || 1;
    for (const [sym, cnt] of Object.entries(item.atoms)) {
      allAtomSyms.add(sym);
      leftCounts[sym] = (leftCounts[sym] || 0) + cnt * c;
    }
  });

  eq.products.forEach((item, idx) => {
    const c = balancerState.productCoeffs[idx] || 1;
    for (const [sym, cnt] of Object.entries(item.atoms)) {
      allAtomSyms.add(sym);
      rightCounts[sym] = (rightCounts[sym] || 0) + cnt * c;
    }
  });

  const atomList = Array.from(allAtomSyms);
  const isAllBalanced = atomList.every(sym => (leftCounts[sym] || 0) === (rightCounts[sym] || 0));

  container.innerHTML = `
    <div class="balancer-game-wrapper">
      <div class="bohr-top-bar">
        <div>
          <h3>⚖️ 화학 반응식 계수 맞추기 퍼즐 (질량 보존의 법칙)</h3>
          <small>화살표 왼쪽(반응물)과 오른쪽(생성물)의 원자 개수가 똑같아지도록 숫자를 조절해 보세요!</small>
        </div>
        <div class="bohr-top-actions">
          <select id="balancerEqSelect" class="tutor-mission-select">
            ${CHEMICAL_EQUATIONS_BANK.map((item, i) => `
              <option value="${i}" ${i === balancerState.currentIdx ? 'selected' : ''}>${i + 1}. ${item.title}</option>
            `).join('')}
          </select>
          <button type="button" id="balancerHintBtn" class="pill-btn secondary small-btn">💡 힌트 1칸 맞추기</button>
          <button type="button" id="balancerSolveBtn" class="pill-btn primary small-btn">🪄 정답 계수 보기</button>
        </div>
      </div>

      <div class="balancer-stage-card">
        <div class="balancer-eq-header">
          <h4>${eq.title}</h4>
          <p>${eq.desc}</p>
        </div>

        <!-- 화학 반응식 계수 조절 카드 배열 -->
        <div class="balancer-equation-row">
          ${eq.reactants.map((r, idx) => {
            const c = balancerState.reactantCoeffs[idx];
            return `
              <div class="balancer-term-card">
                <div class="coeff-stepper">
                  <button type="button" class="coeff-btn" data-side="r" data-idx="${idx}" data-delta="-1" ${c <= 1 ? 'disabled' : ''}>➖</button>
                  <span class="coeff-num">${c}</span>
                  <button type="button" class="coeff-btn" data-side="r" data-idx="${idx}" data-delta="1" ${c >= 8 ? 'disabled' : ''}>➕</button>
                </div>
                <strong class="term-formula">${r.formula}</strong>
                <small class="term-ko">${r.ko}</small>
              </div>
            `;
          }).join('<span class="eq-op-symbol">+</span>')}

          <span class="eq-arrow-symbol">➔</span>

          ${eq.products.map((p, idx) => {
            const c = balancerState.productCoeffs[idx];
            return `
              <div class="balancer-term-card product-card">
                <div class="coeff-stepper">
                  <button type="button" class="coeff-btn" data-side="p" data-idx="${idx}" data-delta="-1" ${c <= 1 ? 'disabled' : ''}>➖</button>
                  <span class="coeff-num">${c}</span>
                  <button type="button" class="coeff-btn" data-side="p" data-idx="${idx}" data-delta="1" ${c >= 8 ? 'disabled' : ''}>➕</button>
                </div>
                <strong class="term-formula">${p.formula}</strong>
                <small class="term-ko">${p.ko}</small>
              </div>
            `;
          }).join('<span class="eq-op-symbol">+</span>')}
        </div>

        <!-- 실시간 좌변 vs 우변 원자 개수 균형 저울 -->
        <div class="balancer-scale-box">
          <h5>⚖️ 실시간 반응 전(좌변) vs 반응 후(우변) 원자 수 비교</h5>
          <div class="scale-atoms-grid">
            ${atomList.map(sym => {
              const l = leftCounts[sym] || 0;
              const r = rightCounts[sym] || 0;
              const matched = l === r;
              return `
                <div class="scale-atom-card ${matched ? 'balanced' : 'unbalanced'}">
                  <div class="scale-atom-sym">${sym} 원자</div>
                  <div class="scale-compare-nums">
                    <span>좌변: <strong>${l}개</strong></span>
                    <span class="scale-eq-sign">${matched ? '==' : '≠'}</span>
                    <span>우변: <strong>${r}개</strong></span>
                  </div>
                  <div class="scale-status-tag">${matched ? '✅ 균형 완료!' : (l > r ? '⬅️ 좌변이 더 많음' : '➡️ 우변이 더 많음')}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        ${isAllBalanced ? `
          <div class="balancer-win-banner">
            🎉 <strong>완벽합니다! 양변의 모든 원자 개수가 정확히 일치하여 화학 반응식이 완성되었습니다!</strong>
            <button type="button" id="nextBalancerEqBtn" class="action-btn primary small-btn">다음 반응식 도전 ▶</button>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  document.getElementById('balancerEqSelect')?.addEventListener('change', (e) => {
    initBalancerCoeffs(parseInt(e.target.value, 10));
    playSoundEffect('flip');
    renderEquationBalancerGame(container);
  });

  container.querySelectorAll('.coeff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const side = btn.dataset.side;
      const idx = parseInt(btn.dataset.idx, 10);
      const delta = parseInt(btn.dataset.delta, 10);
      if (side === 'r') {
        balancerState.reactantCoeffs[idx] = Math.max(1, Math.min(8, balancerState.reactantCoeffs[idx] + delta));
      } else {
        balancerState.productCoeffs[idx] = Math.max(1, Math.min(8, balancerState.productCoeffs[idx] + delta));
      }
      playSoundEffect('flip');
      renderEquationBalancerGame(container);
    });
  });

  document.getElementById('balancerHintBtn')?.addEventListener('click', () => {
    for (let i = 0; i < eq.reactants.length; i++) {
      if (balancerState.reactantCoeffs[i] !== eq.reactants[i].targetCoeff) {
        balancerState.reactantCoeffs[i] = eq.reactants[i].targetCoeff;
        playSoundEffect('match');
        renderEquationBalancerGame(container);
        return;
      }
    }
    for (let i = 0; i < eq.products.length; i++) {
      if (balancerState.productCoeffs[i] !== eq.products[i].targetCoeff) {
        balancerState.productCoeffs[i] = eq.products[i].targetCoeff;
        playSoundEffect('match');
        renderEquationBalancerGame(container);
        return;
      }
    }
  });

  document.getElementById('balancerSolveBtn')?.addEventListener('click', () => {
    balancerState.reactantCoeffs = eq.reactants.map(r => r.targetCoeff);
    balancerState.productCoeffs = eq.products.map(p => p.targetCoeff);
    playSoundEffect('alchemy_success');
    triggerHaptic('success');
    renderEquationBalancerGame(container);
  });

  document.getElementById('nextBalancerEqBtn')?.addEventListener('click', () => {
    const nextIdx = (balancerState.currentIdx + 1) % CHEMICAL_EQUATIONS_BANK.length;
    initBalancerCoeffs(nextIdx);
    playSoundEffect('flip');
    renderEquationBalancerGame(container);
  });
}

window.renderDetectiveGameLobby = renderDetectiveGameLobby;
window.renderBohrBuilderGame = renderBohrBuilderGame;
window.renderEquationBalancerGame = renderEquationBalancerGame;
