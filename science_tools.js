/**
 * 🔬 과학 탐구 · 암기 · 분석 도구 스위트 (Science Tools & Interactive Simulators)
 * 1. 🌡️ 온도 슬라이더(-273°C ~ 6,000°C) 실시간 고체/액체/기체 상태변화 시뮬레이터
 * 2. 📊 주기율 성질 히트맵(Heatmap) 시각화 (전기음성도, 원자량, 밀도, 녹는점, 끓는점)
 * 3. 🙈 주기율표 블라인드 암기 모드 (기호/한글명/번호/전체 가리기 + 터치 시 정답 토글)
 * 4. ⭐ 나만의 취약 원소 암기장 (북마크 저장 및 주기율표 필터 연동)
 * 5. ⚖️ 화학식 분자량(몰 질량 · 원소별 질량 백분율) 계산기 & ⚔️ 원소 1:1 VS 스펙 비교 모달
 */

const ScienceToolsState = {
  activePanelTab: 'none', // 'none' | 'temp' | 'heatmap' | 'blind'
  temperatureC: 25,
  isTempSimActive: false,
  heatmapProp: 'none', // 'none' | 'en' | 'mass' | 'density' | 'melting' | 'boiling' | 'shells'
  blindMode: 'none', // 'none' | 'name' | 'symbol' | 'number' | 'all'
  blindClickAction: 'reveal', // 'reveal' (터치 시 정답 토글) | 'modal' (상세 모달 열기)
  bookmarks: new Set(JSON.parse(localStorage.getItem('periodic_bookmarked_elements') || '[]')),
  vsLeftNum: 11,  // 기본: 나트륨(Na)
  vsRightNum: 19, // 기본: 칼륨(K)
  activeModalTab: 'molar' // 'molar' | 'vs'
};

/* =========================================================================
 * 1. ⭐ 나만의 암기 단어장 (북마크 매니저)
 * ========================================================================= */
const BookmarkManager = {
  has(atomicNumber) {
    return ScienceToolsState.bookmarks.has(Number(atomicNumber));
  },
  toggle(atomicNumber) {
    const num = Number(atomicNumber);
    if (!num) return false;
    if (ScienceToolsState.bookmarks.has(num)) {
      ScienceToolsState.bookmarks.delete(num);
    } else {
      ScienceToolsState.bookmarks.add(num);
    }
    this.save();
    this.syncUI();
    return ScienceToolsState.bookmarks.has(num);
  },
  add(atomicNumber) {
    const num = Number(atomicNumber);
    if (!num || ScienceToolsState.bookmarks.has(num)) return;
    ScienceToolsState.bookmarks.add(num);
    this.save();
    this.syncUI();
  },
  getAll() {
    return Array.from(ScienceToolsState.bookmarks).sort((a, b) => a - b);
  },
  count() {
    return ScienceToolsState.bookmarks.size;
  },
  save() {
    localStorage.setItem(
      'periodic_bookmarked_elements',
      JSON.stringify(Array.from(ScienceToolsState.bookmarks))
    );
  },
  syncUI() {
    // 1) 상단 필터 알약 카운트 갱신
    const pillBtn = document.getElementById('bookmarkFilterPill');
    if (pillBtn) {
      const cnt = this.count();
      pillBtn.innerHTML = `⭐ 내 암기장 <span class="bm-cnt-badge">${cnt}</span>`;
    }
    // 2) 주기율표 타일 별표 배지 동기화
    document.querySelectorAll('.element-cell').forEach(cell => {
      const num = parseInt(cell.dataset.atomicNumber, 10);
      const isBm = this.has(num);
      cell.classList.toggle('is-bookmarked', isBm);
      let badge = cell.querySelector('.tile-bookmark-star');
      if (isBm && !badge) {
        badge = document.createElement('span');
        badge.className = 'tile-bookmark-star no-print';
        badge.textContent = '⭐';
        badge.title = '내 암기장에 등록된 원소';
        cell.appendChild(badge);
      } else if (!isBm && badge) {
        badge.remove();
      }
    });
    // 3) 만약 현재 'bookmark' 필터가 켜져 있다면 필터 재적용
    if (typeof applyPeriodicTableFilters === 'function') {
      applyPeriodicTableFilters();
    }
  }
};
window.BookmarkManager = BookmarkManager;

/* =========================================================================
 * 2. 수치 데이터 파싱 유틸리티 (녹는점, 끓는점, 밀도, 전기음성도, 원자량)
 * ========================================================================= */
function parseElementNumeric(valStr) {
  if (valStr === undefined || valStr === null) return null;
  const s = String(valStr).replace(/,/g, '').trim();
  if (!s || s === '-' || s === '미상') return null;
  const m = s.match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

function getElementPhaseAtTemp(el, tempC) {
  const melt = parseElementNumeric(el.melting);
  const boil = parseElementNumeric(el.boiling);
  if (melt === null && boil === null) return 'unknown';
  // 비소(As, 33번)처럼 상압 승화 원소(녹는점 표시값 > 끓는점 표시값)는 끓는점 이상에서 기체
  if (melt !== null && boil !== null && melt > boil) {
    return tempC >= boil ? 'gas' : 'solid';
  }
  if (boil !== null && tempC >= boil) return 'gas';
  if (melt !== null && tempC >= melt) return 'liquid';
  return 'solid';
}

/* =========================================================================
 * 3. 주기율표 상단 인터랙티브 실험 & 학습 컨트롤 바 렌더링
 * ========================================================================= */
function initScienceInteractiveBar() {
  const tableWrapper = document.getElementById('tableWrapper');
  if (!tableWrapper || document.getElementById('scienceInteractiveBar')) return;

  const bar = document.createElement('section');
  bar.id = 'scienceInteractiveBar';
  bar.className = 'science-interactive-bar no-print';
  bar.innerHTML = `
    <div class="sci-bar-tabs-row">
      <div class="sci-bar-left-tabs">
        <span class="sci-bar-label">🔬 과학 실험·암기 모드:</span>
        <button type="button" class="sci-mode-tab" data-sci-tab="temp" title="온도를 바꾸며 118개 원소의 고체·액체·기체 상태 변화를 실험합니다">
          🌡️ 온도 상태변화 실험기
        </button>
        <button type="button" class="sci-mode-tab" data-sci-tab="heatmap" title="전기음성도, 원자량, 밀도, 녹는점의 주기적 경향성을 색상 농도로 확인합니다">
          📊 주기율 히트맵(경향성)
        </button>
        <button type="button" class="sci-mode-tab" data-sci-tab="blind" title="원소 기호나 한글 이름을 가리고 터치하며 외우는 백지 복습 모드입니다">
          🙈 블라인드 암기 테스트
        </button>
      </div>
      <div class="sci-bar-right-actions">
        <button type="button" id="openMolarCalcQuickBtn" class="sci-quick-tool-btn" title="화학식 분자량(몰 질량) 및 질량 백분율 계산기 열기">
          ⚖️ 분자량 계산기
        </button>
        <button type="button" id="openVsCompareQuickBtn" class="sci-quick-tool-btn" title="두 원소의 물리·화학 스펙을 1:1로 나란히 비교합니다">
          ⚔️ 원소 1:1 VS 비교
        </button>
        <button type="button" id="resetAllSciModesBtn" class="sci-reset-btn" style="display:none;">
          ✕ 실험모드 끄기
        </button>
      </div>
    </div>

    <!-- [패널 1] 🌡️ 온도 슬라이더 상태변화 시뮬레이터 -->
    <div id="sciPanelTemp" class="sci-sub-panel" style="display:none;">
      <div class="temp-sim-top-row">
        <div class="temp-display-badge">
          <span class="temp-icon">🌡️</span>
          <strong id="tempValueText">25 °C</strong>
          <small id="tempKelvinText">(298 K)</small>
        </div>
        <div class="temp-slider-wrap">
          <span class="slider-end-lbl">-273°C</span>
          <input type="range" id="tempSimSlider" min="-273" max="6000" step="1" value="25" />
          <span class="slider-end-lbl">6,000°C</span>
        </div>
        <div class="temp-phase-counters">
          <span class="phase-pill phase-solid">🧊 고체 <strong id="cntSolid">0</strong></span>
          <span class="phase-pill phase-liquid">💧 액체 <strong id="cntLiquid">0</strong></span>
          <span class="phase-pill phase-gas">💨 기체 <strong id="cntGas">0</strong></span>
          <span class="phase-pill phase-unknown">❓ 미상 <strong id="cntUnknown">0</strong></span>
        </div>
      </div>
      <div class="temp-presets-row">
        <span class="preset-lbl">⚡ 빠른 온도 이동:</span>
        <button type="button" class="temp-preset-btn" data-temp="-273">❄️ 절대영도 (-273°C)</button>
        <button type="button" class="temp-preset-btn" data-temp="-196">🧪 액체질소 (-196°C)</button>
        <button type="button" class="temp-preset-btn active" data-temp="25">🏠 상온 (25°C)</button>
        <button type="button" class="temp-preset-btn" data-temp="35">🖐️ 체온·갈륨용융 (35°C)</button>
        <button type="button" class="temp-preset-btn" data-temp="100">💧 물 끓는점 (100°C)</button>
        <button type="button" class="temp-preset-btn" data-temp="1200">🌋 화산 용암 (1,200°C)</button>
        <button type="button" class="temp-preset-btn" data-temp="3500">💡 텅스텐 필라멘트 (3,500°C)</button>
        <button type="button" class="temp-preset-btn" data-temp="5500">☀️ 태양 표면 (5,500°C)</button>
      </div>
      <div id="tempScienceBriefing" class="sci-insight-banner"></div>
    </div>

    <!-- [패널 2] 📊 주기율 히트맵(Heatmap) -->
    <div id="sciPanelHeatmap" class="sci-sub-panel" style="display:none;">
      <div class="heatmap-controls-row">
        <span class="preset-lbl">📊 시각화할 주기적 성질:</span>
        <button type="button" class="heatmap-prop-btn active" data-hprop="en">⚡ 전기음성도 (전자를 당기는 힘)</button>
        <button type="button" class="heatmap-prop-btn" data-hprop="shells">🐚 전자껍질 수 (주기성)</button>
        <button type="button" class="heatmap-prop-btn" data-hprop="mass">⚖️ 원자량 (무거움)</button>
        <button type="button" class="heatmap-prop-btn" data-hprop="density">🧱 밀도 (치밀함)</button>
        <button type="button" class="heatmap-prop-btn" data-hprop="melting">🔥 녹는점 (°C)</button>
        <button type="button" class="heatmap-prop-btn" data-hprop="boiling">💨 끓는점 (°C)</button>
        <div class="heatmap-gradient-legend">
          <span>낮음</span>
          <div class="heatmap-grad-bar"></div>
          <span>높음</span>
        </div>
      </div>
      <div id="heatmapScienceBriefing" class="sci-insight-banner"></div>
    </div>

    <!-- [패널 3] 🙈 블라인드 암기 테스트 모드 -->
    <div id="sciPanelBlind" class="sci-sub-panel" style="display:none;">
      <div class="blind-controls-row">
        <span class="preset-lbl">🙈 가릴 항목 선택:</span>
        <button type="button" class="blind-type-btn active" data-btype="name">🙈 한글·영문 이름 가리기 (기호 보고 이름 맞추기)</button>
        <button type="button" class="blind-type-btn" data-btype="symbol">🔤 원소 기호 가리기 (이름 보고 기호 맞추기)</button>
        <button type="button" class="blind-type-btn" data-btype="number">🔢 원자번호·원자량 가리기</button>
        <button type="button" class="blind-type-btn" data-btype="all">🕵️ 전체 백지 테스트 (전부 가리기)</button>
      </div>
      <div class="blind-actions-row">
        <span class="blind-guide-tip">💡 <strong>암기 방법:</strong> 가려진 원소 타일을 <strong>클릭(터치)</strong>하면 정답이 톡! 하고 열립니다. 외운 원소는 확인하고 못 외운 원소는 ⭐암기장에 추가해 보세요!</span>
        <div class="blind-action-btns">
          <button type="button" id="blindRevealAllBtn" class="pill-btn secondary small-btn">👁️ 전체 정답 열기</button>
          <button type="button" id="blindHideAllBtn" class="pill-btn primary small-btn">🙈 다시 모두 가리기</button>
          <button type="button" id="blindToggleClickModeBtn" class="pill-btn secondary small-btn">👆 현재: 터치 시 정답확인</button>
        </div>
      </div>
    </div>
  `;

  tableWrapper.parentNode.insertBefore(bar, tableWrapper);

  // 탭 전환 이벤트
  const tabBtns = bar.querySelectorAll('.sci-mode-tab');
  const resetBtn = document.getElementById('resetAllSciModesBtn');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.sciTab;
      if (ScienceToolsState.activePanelTab === targetTab) {
        deactivateAllScienceModes();
      } else {
        activateSciencePanel(targetTab);
      }
    });
  });

  resetBtn?.addEventListener('click', () => {
    deactivateAllScienceModes();
  });

  // 빠른 도구 모달 열기 버튼
  document.getElementById('openMolarCalcQuickBtn')?.addEventListener('click', () => {
    openScienceToolsModal('molar');
  });
  document.getElementById('openVsCompareQuickBtn')?.addEventListener('click', () => {
    openScienceToolsModal('vs');
  });

  // 온도 슬라이더 이벤트
  const tempSlider = document.getElementById('tempSimSlider');
  tempSlider?.addEventListener('input', () => {
    ScienceToolsState.temperatureC = parseInt(tempSlider.value, 10);
    bar.querySelectorAll('.temp-preset-btn').forEach(b => {
      b.classList.toggle('active', parseInt(b.dataset.temp, 10) === ScienceToolsState.temperatureC);
    });
    applyTemperatureOverlay();
  });

  bar.querySelectorAll('.temp-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = parseInt(btn.dataset.temp, 10);
      ScienceToolsState.temperatureC = t;
      if (tempSlider) tempSlider.value = String(t);
      bar.querySelectorAll('.temp-preset-btn').forEach(b => b.classList.toggle('active', b === btn));
      applyTemperatureOverlay();
    });
  });

  // 히트맵 속성 버튼 이벤트
  bar.querySelectorAll('.heatmap-prop-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      ScienceToolsState.heatmapProp = btn.dataset.hprop;
      bar.querySelectorAll('.heatmap-prop-btn').forEach(b => b.classList.toggle('active', b === btn));
      applyHeatmapOverlay();
    });
  });

  // 블라인드 암기 버튼 이벤트
  bar.querySelectorAll('.blind-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      ScienceToolsState.blindMode = btn.dataset.btype;
      bar.querySelectorAll('.blind-type-btn').forEach(b => b.classList.toggle('active', b === btn));
      applyBlindStudyMode();
    });
  });

  document.getElementById('blindRevealAllBtn')?.addEventListener('click', () => {
    document.querySelectorAll('.element-cell').forEach(c => c.classList.add('blind-revealed'));
  });

  document.getElementById('blindHideAllBtn')?.addEventListener('click', () => {
    document.querySelectorAll('.element-cell').forEach(c => c.classList.remove('blind-revealed'));
  });

  const clickModeBtn = document.getElementById('blindToggleClickModeBtn');
  clickModeBtn?.addEventListener('click', () => {
    ScienceToolsState.blindClickAction = ScienceToolsState.blindClickAction === 'reveal' ? 'modal' : 'reveal';
    clickModeBtn.textContent = ScienceToolsState.blindClickAction === 'reveal'
      ? '👆 현재: 터치 시 정답확인'
      : '🔍 현재: 터치 시 상세창 열기';
  });
}

function activateSciencePanel(tabKey) {
  clearCellScienceOverlays();
  ScienceToolsState.activePanelTab = tabKey;

  const bar = document.getElementById('scienceInteractiveBar');
  if (!bar) return;

  bar.querySelectorAll('.sci-mode-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.sciTab === tabKey);
  });

  document.getElementById('sciPanelTemp').style.display = tabKey === 'temp' ? 'block' : 'none';
  document.getElementById('sciPanelHeatmap').style.display = tabKey === 'heatmap' ? 'block' : 'none';
  document.getElementById('sciPanelBlind').style.display = tabKey === 'blind' ? 'block' : 'none';
  document.getElementById('resetAllSciModesBtn').style.display = 'inline-flex';

  if (tabKey === 'temp') {
    ScienceToolsState.isTempSimActive = true;
    applyTemperatureOverlay();
  } else if (tabKey === 'heatmap') {
    if (ScienceToolsState.heatmapProp === 'none') ScienceToolsState.heatmapProp = 'en';
    applyHeatmapOverlay();
  } else if (tabKey === 'blind') {
    if (ScienceToolsState.blindMode === 'none') ScienceToolsState.blindMode = 'name';
    applyBlindStudyMode();
  }
}

function deactivateAllScienceModes() {
  ScienceToolsState.activePanelTab = 'none';
  ScienceToolsState.isTempSimActive = false;
  ScienceToolsState.heatmapProp = 'none';
  ScienceToolsState.blindMode = 'none';

  const bar = document.getElementById('scienceInteractiveBar');
  if (bar) {
    bar.querySelectorAll('.sci-mode-tab').forEach(b => b.classList.remove('active'));
    document.getElementById('sciPanelTemp').style.display = 'none';
    document.getElementById('sciPanelHeatmap').style.display = 'none';
    document.getElementById('sciPanelBlind').style.display = 'none';
    document.getElementById('resetAllSciModesBtn').style.display = 'none';
  }
  clearCellScienceOverlays();
}

function clearCellScienceOverlays() {
  const grid = document.getElementById('periodicGrid');
  if (grid) {
    grid.classList.remove('blind-mode-name', 'blind-mode-symbol', 'blind-mode-number', 'blind-mode-all');
  }
  document.querySelectorAll('.element-cell').forEach(cell => {
    cell.classList.remove(
      'phase-solid-cell', 'phase-liquid-cell', 'phase-gas-cell', 'phase-unknown-cell',
      'heatmap-active-cell', 'blind-revealed'
    );
    cell.style.removeProperty('--heatmap-bg');
    cell.style.removeProperty('--heatmap-border');
    cell.querySelectorAll('.sci-overlay-badge').forEach(b => b.remove());
  });
}

/* =========================================================================
 * 4. 온도별 고체/액체/기체 상태변화 시뮬레이션 적용
 * ========================================================================= */
function applyTemperatureOverlay() {
  if (ScienceToolsState.activePanelTab !== 'temp') return;
  const tempC = ScienceToolsState.temperatureC;
  const tempK = Math.max(0, Math.round(tempC + 273.15));

  const valEl = document.getElementById('tempValueText');
  const kelEl = document.getElementById('tempKelvinText');
  if (valEl) valEl.textContent = `${tempC.toLocaleString()} °C`;
  if (kelEl) kelEl.textContent = `(${tempK.toLocaleString()} K)`;

  let counts = { solid: 0, liquid: 0, gas: 0, unknown: 0 };

  document.querySelectorAll('.element-cell').forEach(cell => {
    const num = parseInt(cell.dataset.atomicNumber, 10);
    const el = elementsMap.get(num);
    if (!el) return;

    const phase = getElementPhaseAtTemp(el, tempC);
    counts[phase] = (counts[phase] || 0) + 1;

    cell.classList.remove('phase-solid-cell', 'phase-liquid-cell', 'phase-gas-cell', 'phase-unknown-cell');
    cell.classList.add(`phase-${phase}-cell`);

    let badge = cell.querySelector('.sci-overlay-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'sci-overlay-badge no-print';
      cell.appendChild(badge);
    }
    const labelMap = {
      solid: '🧊고체',
      liquid: '💧액체',
      gas: '💨기체',
      unknown: '❓미상'
    };
    badge.textContent = labelMap[phase];
  });

  // 118개 기준 카운트 (중복 셀 방지 위해 elementsMap 기준으로 정확히 집계)
  const exactCounts = { solid: 0, liquid: 0, gas: 0, unknown: 0 };
  elementsMap.forEach(el => {
    const p = getElementPhaseAtTemp(el, tempC);
    exactCounts[p]++;
  });

  document.getElementById('cntSolid').textContent = `${exactCounts.solid}개`;
  document.getElementById('cntLiquid').textContent = `${exactCounts.liquid}개`;
  document.getElementById('cntGas').textContent = `${exactCounts.gas}개`;
  document.getElementById('cntUnknown').textContent = `${exactCounts.unknown}개`;

  const briefing = document.getElementById('tempScienceBriefing');
  if (briefing) {
    if (tempC <= -270) {
      briefing.innerHTML = `❄️ <strong>절대영도 부근 (${tempC}°C):</strong> 우주에서 가장 차가운 온도로, 헬륨(He, 녹는점 -272.2°C)을 제외한 거의 모든 원소가 꽁꽁 얼어붙은 <strong>🧊고체</strong> 상태입니다!`;
    } else if (tempC >= -200 && tempC <= -180) {
      briefing.innerHTML = `🧪 <strong>극저온 액화가스 구간 (${tempC}°C):</strong> 공기의 주성분인 질소(N, 끓는점 -195.8°C)와 산소(O, 끓는점 -183°C)가 기체에서 <strong>💧액체</strong>로 변하는 구간입니다.`;
    } else if (tempC >= 15 && tempC <= 28) {
      briefing.innerHTML = `🏠 <strong>상온 (${tempC}°C) 핵심 포인트:</strong> 상온에서 <strong>💧액체</strong>인 원소는 단 2개! 금속 중 유일한 액체인 <strong>수은(Hg, 80번)</strong>과 비금속 유일의 액체인 <strong>브로민(Br, 35번)</strong>뿐입니다.`;
    } else if (tempC >= 29 && tempC <= 45) {
      briefing.innerHTML = `🖐️ <strong>체온 구간 (${tempC}°C):</strong> <strong>갈륨(Ga, 31번, 녹는점 29.8°C)</strong>과 <strong>세슘(Cs, 55번, 녹는점 28.5°C)</strong>이 손바닥 위 체온만으로도 스르르 녹아 <strong>💧액체</strong>가 됩니다!`;
    } else if (tempC >= 3400 && tempC <= 3700) {
      briefing.innerHTML = `💡 <strong>초고온 내열 구간 (${tempC}°C):</strong> 철(Fe)과 티타늄(Ti)도 모두 녹거나 끓지만, 금속 중 녹는점이 가장 높은 <strong>텅스텐(W, 74번, 녹는점 3,422°C)</strong>과 <strong>탄소(C, 3,550°C)</strong>가 끝까지 버팁니다!`;
    } else if (tempC >= 5000) {
      briefing.innerHTML = `☀️ <strong>태양 표면 온도 (${tempC}°C):</strong> 지구상의 거의 모든 금속과 광물이 끓어올라 <strong>💨기체</strong>(플라즈마 증기)로 증발합니다. (레늄 Re, 오스뮴 Os, 텅스텐 W의 끓는점 5,000~5,900°C 주목!)`;
    } else {
      briefing.innerHTML = `🔬 현재 <strong>${tempC}°C</strong>에서 고체 <strong>${exactCounts.solid}종</strong>, 액체 <strong>${exactCounts.liquid}종</strong>, 기체 <strong>${exactCounts.gas}종</strong>입니다. 슬라이더를 좌우로 움직여 각 원소가 녹고 끓는 순간을 관찰해 보세요!`;
    }
  }
}

/* =========================================================================
 * 5. 주기율 성질 히트맵(Heatmap) 오버레이 적용
 * ========================================================================= */
function applyHeatmapOverlay() {
  if (ScienceToolsState.activePanelTab !== 'heatmap') return;
  const prop = ScienceToolsState.heatmapProp;

  const extractVal = (el) => {
    if (prop === 'en') return parseElementNumeric(el.en);
    if (prop === 'mass') return parseElementNumeric(el.atomicMass);
    if (prop === 'density') return parseElementNumeric(el.density);
    if (prop === 'melting') return parseElementNumeric(el.melting);
    if (prop === 'boiling') return parseElementNumeric(el.boiling);
    if (prop === 'shells') {
      const shells = BOHR_SHELLS_DATA[el.atomicNumber] || [];
      return shells.length;
    }
    return null;
  };

  let minVal = Infinity;
  let maxVal = -Infinity;
  elementsMap.forEach(el => {
    const v = extractVal(el);
    if (v !== null) {
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
    }
  });

  document.querySelectorAll('.element-cell').forEach(cell => {
    const num = parseInt(cell.dataset.atomicNumber, 10);
    const el = elementsMap.get(num);
    if (!el) return;

    const val = extractVal(el);
    let badge = cell.querySelector('.sci-overlay-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'sci-overlay-badge no-print';
      cell.appendChild(badge);
    }

    if (val === null || maxVal <= minVal) {
      cell.classList.remove('heatmap-active-cell');
      cell.style.removeProperty('--heatmap-bg');
      cell.style.removeProperty('--heatmap-border');
      badge.textContent = '-';
      return;
    }

    // 0.0 ~ 1.0 정규화 (밀도/원자량은 편차가 크므로 제곱근 보정으로 시각적 변별력 강화)
    let ratio = (val - minVal) / (maxVal - minVal);
    if (prop === 'density') ratio = Math.pow(ratio, 0.5);

    // Hue: 195(시안 블루) -> 140(그린) -> 45(골드) -> 340(핫핑크/레드)
    const hue = Math.round(195 - ratio * 195);
    const bgAlpha = (0.18 + ratio * 0.42).toFixed(2);
    cell.classList.add('heatmap-active-cell');
    cell.style.setProperty('--heatmap-bg', `hsla(${hue}, 88%, 48%, ${bgAlpha})`);
    cell.style.setProperty('--heatmap-border', `hsl(${hue}, 90%, 60%)`);

    const unitMap = { en: '', shells: '겹', mass: 'u', density: '', melting: '°C', boiling: '°C' };
    badge.textContent = `${val}${unitMap[prop] || ''}`;
  });

  const briefing = document.getElementById('heatmapScienceBriefing');
  if (briefing) {
    const descMap = {
      en: `⚡ <strong>전기음성도 경향성:</strong> 주기율표의 <strong>오른쪽 위(17족 할로젠)로 갈수록 커지고</strong>, 왼쪽 아래(1족 알칼리 금속)로 갈수록 작아집니다! 최고봉은 <strong>플루오린(F, 3.98)</strong>입니다.`,
      shells: `🐚 <strong>전자껍질 수 (주기성):</strong> 가로줄(1~7주기) 번호가 곧 전자가 들어있는 <strong>보어 전자껍질(K~Q)의 개수</strong>와 정확히 일치합니다!`,
      mass: `⚖️ <strong>원자량 경향성:</strong> 원자번호가 커질수록 양성자와 중성자가 늘어나 원자량이 무거워집니다. (단, <strong>아르곤 Ar 39.95 > 칼륨 K 39.10</strong>처럼 동위원소 비율 때문에 역전되는 구간을 찾아보세요!)`,
      density: `🧱 <strong>밀도 경향성:</strong> 6주기 중앙의 전이금속인 <strong>오스뮴(Os, 22.59 g/cm³)</strong>과 <strong>이리듐(Ir, 22.56 g/cm³)</strong>이 지구상에서 가장 묵직하고 치밀한 원소입니다.`,
      melting: `🔥 <strong>녹는점 경향성:</strong> 탄소(C, 3,550°C)와 6주기 전이금속인 <strong>텅스텐(W, 3,422°C)</strong> 부근에서 가장 강하게 결합하여 높은 녹는점을 보입니다.`,
      boiling: `💨 <strong>끓는점 경향성:</strong> 비활성 기체(18족)는 원자 간 인력이 매우 약해 극저온에서 끓고, 전이금속(레늄 Re, 텅스텐 W)은 5,500°C가 넘어야 끓습니다.`
    };
    briefing.innerHTML = descMap[prop] || '';
  }
}

/* =========================================================================
 * 6. 블라인드 암기 테스트 모드 적용
 * ========================================================================= */
function applyBlindStudyMode() {
  const grid = document.getElementById('periodicGrid');
  if (!grid) return;

  grid.classList.remove('blind-mode-name', 'blind-mode-symbol', 'blind-mode-number', 'blind-mode-all');
  if (ScienceToolsState.activePanelTab === 'blind' && ScienceToolsState.blindMode !== 'none') {
    grid.classList.add(`blind-mode-${ScienceToolsState.blindMode}`);
  }
}

/* =========================================================================
 * 7. ⚖️ 화학식 분자량(몰 질량) 파서 & 계산 엔진
 * ========================================================================= */
function calculateMolarMassData(rawFormula) {
  if (!rawFormula || !rawFormula.trim()) return null;

  // 아래첨자 숫자를 일반 숫자로 정규화 (H₂O -> H2O)
  const subMap = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9' };
  let f = rawFormula.trim().replace(/[₀-₉]/g, ch => subMap[ch] || ch);
  // 전하 기호 및 공백 제거
  f = f.replace(/[⁺⁻\s]/g, '');

  // 앞쪽 전체 계수 추출 (예: 2H2O -> multiplier 2, formula H2O)
  let leadingMultiplier = 1;
  const leadMatch = f.match(/^(\d+)(.+)$/);
  if (leadMatch) {
    leadingMultiplier = Math.max(1, parseInt(leadMatch[1], 10));
    f = leadMatch[2];
  }

  // 기호 -> 원소 객체 매핑
  const symToEl = new Map();
  elementsMap.forEach(el => symToEl.set(el.symbol, el));

  // 괄호 중첩 지원 스택 파서 (예: Ca(OH)2, Al2(SO4)3)
  const stack = [{}];
  let i = 0;
  while (i < f.length) {
    if (f[i] === '(' || f[i] === '[') {
      stack.push({});
      i++;
    } else if (f[i] === ')' || f[i] === ']') {
      i++;
      const numMatch = f.slice(i).match(/^\d+/);
      const mult = numMatch ? parseInt(numMatch[0], 10) : 1;
      if (numMatch) i += numMatch[0].length;
      const top = stack.pop() || {};
      const curr = stack[stack.length - 1];
      for (const [sym, cnt] of Object.entries(top)) {
        curr[sym] = (curr[sym] || 0) + cnt * mult;
      }
    } else {
      const elMatch = f.slice(i).match(/^([A-Z][a-z]?)/);
      if (!elMatch) {
        i++;
        continue;
      }
      const sym = elMatch[1];
      if (!symToEl.has(sym)) {
        return { error: `알 수 없는 원소 기호 [${sym}]가 포함되어 있습니다. 대소문자를 확인해 주세요! (예: Co=코발트, CO=일산화탄소)` };
      }
      i += sym.length;
      const numMatch = f.slice(i).match(/^\d+/);
      const count = numMatch ? parseInt(numMatch[0], 10) : 1;
      if (numMatch) i += numMatch[0].length;

      const curr = stack[stack.length - 1];
      curr[sym] = (curr[sym] || 0) + count;
    }
  }

  while (stack.length > 1) {
    const top = stack.pop();
    const curr = stack[stack.length - 1];
    for (const [sym, cnt] of Object.entries(top)) {
      curr[sym] = (curr[sym] || 0) + cnt;
    }
  }

  const finalCounts = stack[0];
  const entries = Object.entries(finalCounts);
  if (entries.length === 0) {
    return { error: '유효한 원소 기호를 입력해 주세요. (예: H2O, NaCl, C6H12O6)' };
  }

  let totalMass = 0;
  const breakdown = [];

  for (const [sym, rawCnt] of entries) {
    const count = rawCnt * leadingMultiplier;
    const el = symToEl.get(sym);
    const unitMass = parseElementNumeric(el.atomicMass) || 0;
    const subMass = unitMass * count;
    totalMass += subMass;
    breakdown.push({
      el,
      symbol: sym,
      nameKo: el.nameKo,
      count,
      unitMass,
      subMass
    });
  }

  breakdown.forEach(item => {
    item.pct = totalMass > 0 ? (item.subMass / totalMass) * 100 : 0;
  });

  return {
    formula: rawFormula.trim(),
    leadingMultiplier,
    totalMass,
    breakdown
  };
}
window.calculateMolarMassData = calculateMolarMassData;

/* =========================================================================
 * 8. ⚖️ 분자량 계산기 & ⚔️ 원소 1:1 VS 비교 모달 UI
 * ========================================================================= */
function ensureScienceToolsModal() {
  let modal = document.getElementById('scienceToolsModal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'scienceToolsModal';
  modal.className = 'app-modal-backdrop no-print';
  modal.style.display = 'none';
  document.body.appendChild(modal);
  return modal;
}

function openScienceToolsModal(initialTab = 'molar') {
  ScienceToolsState.activeModalTab = initialTab;
  const modal = ensureScienceToolsModal();
  modal.style.display = 'flex';
  renderScienceToolsModalContent(modal);
}
window.openScienceToolsModal = openScienceToolsModal;

function renderScienceToolsModalContent(modal) {
  const isMolar = ScienceToolsState.activeModalTab === 'molar';
  const allElements = Array.from(elementsMap.values());

  modal.innerHTML = `
    <div class="app-modal-card science-tools-modal-card">
      <div class="app-modal-header">
        <div class="sci-modal-tab-switches">
          <button type="button" class="sci-modal-tab-btn ${isMolar ? 'active' : ''}" data-mtab="molar">
            ⚖️ 화학식 분자량(몰 질량) 계산기
          </button>
          <button type="button" class="sci-modal-tab-btn ${!isMolar ? 'active' : ''}" data-mtab="vs">
            ⚔️ 원소 1:1 VS 스펙 비교
          </button>
        </div>
        <button type="button" id="closeScienceToolsModalBtn" class="modal-close-btn">&times;</button>
      </div>

      <div class="app-modal-body">
        ${isMolar ? `
          <!-- [탭 1] ⚖️ 분자량 & 성분비 계산기 -->
          <div class="molar-calc-section">
            <p class="sci-modal-desc">화학식을 입력하거나 아래 추천 화합물을 누르면 <strong>1몰 질량(g/mol)</strong>과 <strong>구성 원소별 질량 비율(%)</strong>을 즉시 계산해 줍니다.</p>
            <div class="molar-input-row">
              <input type="text" id="molarFormulaInput" class="molar-formula-input" placeholder="화학식 입력 (예: H2O, C6H12O6, Ca(OH)2, H2SO4)" value="H2O" autocomplete="off" spellcheck="false" />
              <button type="button" id="runMolarCalcBtn" class="action-btn primary">⚖️ 계산하기</button>
            </div>
            <div class="molar-quick-chips">
              <span>⚡ 자주 쓰는 화학식:</span>
              <button type="button" class="molar-chip" data-f="H2O">💧 물 (H₂O)</button>
              <button type="button" class="molar-chip" data-f="NaCl">🧂 소금 (NaCl)</button>
              <button type="button" class="molar-chip" data-f="CO2">🫧 이산화탄소 (CO₂)</button>
              <button type="button" class="molar-chip" data-f="C6H12O6">🍇 포도당 (C₆H₁₂O₆)</button>
              <button type="button" class="molar-chip" data-f="H2SO4">⚠️ 황산 (H₂SO₄)</button>
              <button type="button" class="molar-chip" data-f="NaOH">🧼 수산화나트륨 (NaOH)</button>
              <button type="button" class="molar-chip" data-f="CaCO3">🐚 탄산칼슘 (CaCO₃)</button>
              <button type="button" class="molar-chip" data-f="Ca(OH)2">🪨 수산화칼슘 Ca(OH)₂</button>
              <button type="button" class="molar-chip" data-f="Al2(SO4)3">🧪 황산알루미늄 Al₂(SO₄)₃</button>
              <button type="button" class="molar-chip" data-f="CH3COOH">🥗 아세트산 (CH₃COOH)</button>
            </div>
            <div id="molarCalcResultBox" class="molar-result-box"></div>
          </div>
        ` : `
          <!-- [탭 2] ⚔️ 원소 1:1 VS 비교 분석기 -->
          <div class="vs-compare-section">
            <div class="vs-quick-matchups">
              <span>🔥 추천 라이벌 매치:</span>
              <button type="button" class="vs-match-chip" data-l="11" data-r="19">⚡ 소듐(Na) vs 칼륨(K)</button>
              <button type="button" class="vs-match-chip" data-l="6" data-r="14">💻 탄소(C) vs 규소(Si)</button>
              <button type="button" class="vs-match-chip" data-l="79" data-r="47">👑 금(Au) vs 은(Ag)</button>
              <button type="button" class="vs-match-chip" data-l="26" data-r="13">✈️ 철(Fe) vs 알루미늄(Al)</button>
              <button type="button" class="vs-match-chip" data-l="1" data-r="2">🎈 수소(H) vs 헬륨(He)</button>
              <button type="button" class="vs-match-chip" data-l="9" data-r="17">🧪 플루오린(F) vs 염소(Cl)</button>
            </div>
            <div class="vs-selectors-row">
              <select id="vsSelectLeft" class="vs-element-select">
                ${allElements.map(e => `<option value="${e.atomicNumber}" ${e.atomicNumber === ScienceToolsState.vsLeftNum ? 'selected' : ''}>${e.atomicNumber}번. ${e.nameKo} (${e.symbol})</option>`).join('')}
              </select>
              <span class="vs-badge-center">VS</span>
              <select id="vsSelectRight" class="vs-element-select">
                ${allElements.map(e => `<option value="${e.atomicNumber}" ${e.atomicNumber === ScienceToolsState.vsRightNum ? 'selected' : ''}>${e.atomicNumber}번. ${e.nameKo} (${e.symbol})</option>`).join('')}
              </select>
            </div>
            <div id="vsCompareResultBox" class="vs-result-box"></div>
          </div>
        `}
      </div>
    </div>
  `;

  document.getElementById('closeScienceToolsModalBtn')?.addEventListener('click', () => {
    modal.style.display = 'none';
  });
  modal.onclick = (e) => {
    if (e.target === modal) modal.style.display = 'none';
  };

  modal.querySelectorAll('.sci-modal-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      ScienceToolsState.activeModalTab = btn.dataset.mtab;
      renderScienceToolsModalContent(modal);
    });
  });

  if (isMolar) {
    const input = document.getElementById('molarFormulaInput');
    const runBtn = document.getElementById('runMolarCalcBtn');
    const updateMolar = () => renderMolarResult(input?.value || 'H2O');
    runBtn?.addEventListener('click', updateMolar);
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') updateMolar();
    });
    modal.querySelectorAll('.molar-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        if (input) input.value = chip.dataset.f;
        updateMolar();
      });
    });
    updateMolar();
  } else {
    const selL = document.getElementById('vsSelectLeft');
    const selR = document.getElementById('vsSelectRight');
    const updateVs = () => {
      ScienceToolsState.vsLeftNum = parseInt(selL.value, 10);
      ScienceToolsState.vsRightNum = parseInt(selR.value, 10);
      renderVsComparisonResult();
    };
    selL?.addEventListener('change', updateVs);
    selR?.addEventListener('change', updateVs);
    modal.querySelectorAll('.vs-match-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        ScienceToolsState.vsLeftNum = parseInt(chip.dataset.l, 10);
        ScienceToolsState.vsRightNum = parseInt(chip.dataset.r, 10);
        if (selL) selL.value = String(ScienceToolsState.vsLeftNum);
        if (selR) selR.value = String(ScienceToolsState.vsRightNum);
        renderVsComparisonResult();
      });
    });
    renderVsComparisonResult();
  }
}

function renderMolarResult(formulaStr) {
  const box = document.getElementById('molarCalcResultBox');
  if (!box) return;

  const res = calculateMolarMassData(formulaStr);
  if (!res || res.error) {
    box.innerHTML = `<div class="molar-error-msg">⚠️ ${res?.error || '화학식을 입력해 주세요.'}</div>`;
    return;
  }

  box.innerHTML = `
    <div class="molar-summary-banner">
      <div class="molar-total-main">
        <span class="molar-formula-tag">${res.formula}</span>
        <strong>${res.totalMass.toFixed(3)} <small>g/mol</small></strong>
      </div>
      <div class="molar-sub-note">
        1몰(6.022 × 10²³개 입자)을 모았을 때의 질량이 약 <strong>${res.totalMass.toFixed(2)}g</strong>입니다.
      </div>
    </div>

    <!-- 성분 질량비 스택 바 -->
    <div class="molar-stack-bar">
      ${res.breakdown.map(item => {
        const catColor = CATEGORIES[item.el.category]?.color || '#38bdf8';
        return `<div class="molar-stack-seg" style="width:${Math.max(4, item.pct)}%; background:${catColor};" title="${item.nameKo}(${item.symbol}): ${item.pct.toFixed(1)}%">
          <span>${item.symbol} ${item.pct.toFixed(0)}%</span>
        </div>`;
      }).join('')}
    </div>

    <div class="molar-breakdown-list">
      ${res.breakdown.map(item => {
        const catColor = CATEGORIES[item.el.category]?.color || '#38bdf8';
        return `
          <div class="molar-breakdown-row">
            <div class="molar-el-badge" style="border-color:${catColor}; color:${catColor};">
              <strong>${item.symbol}</strong>
              <small>${item.nameKo}</small>
            </div>
            <div class="molar-calc-detail">
              <div>원자량 <strong>${item.unitMass}</strong> × <strong>${item.count}개</strong> = <strong>${item.subMass.toFixed(3)} g/mol</strong></div>
              <div class="molar-pct-bar-track">
                <div class="molar-pct-bar-fill" style="width:${item.pct.toFixed(1)}%; background:${catColor};"></div>
              </div>
            </div>
            <div class="molar-pct-val">${item.pct.toFixed(1)}%</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderVsComparisonResult() {
  const box = document.getElementById('vsCompareResultBox');
  if (!box) return;

  const left = elementsMap.get(ScienceToolsState.vsLeftNum);
  const right = elementsMap.get(ScienceToolsState.vsRightNum);
  if (!left || !right) return;

  const catL = CATEGORIES[left.category] || {};
  const catR = CATEGORIES[right.category] || {};
  const shellsL = (BOHR_SHELLS_DATA[left.atomicNumber] || []).join(' - ');
  const shellsR = (BOHR_SHELLS_DATA[right.atomicNumber] || []).join(' - ');

  const buildMetricRow = (label, valLStr, valRStr, unit = '') => {
    const numL = parseElementNumeric(valLStr);
    const numR = parseElementNumeric(valRStr);
    let winL = false;
    let winR = false;
    if (numL !== null && numR !== null && numL !== numR) {
      winL = numL > numR;
      winR = numR > numL;
    }
    return `
      <div class="vs-metric-row">
        <div class="vs-val left-val ${winL ? 'vs-winner' : ''}">${valLStr || '-'}${valLStr && valLStr !== '-' ? unit : ''}</div>
        <div class="vs-metric-label">${label}</div>
        <div class="vs-val right-val ${winR ? 'vs-winner' : ''}">${valRStr || '-'}${valRStr && valRStr !== '-' ? unit : ''}</div>
      </div>
    `;
  };

  box.innerHTML = `
    <div class="vs-cards-header">
      <div class="vs-hero-card" style="border-color:${catL.color};">
        <span class="vs-hero-num">${left.atomicNumber}번 · ${catL.nameKo || ''}</span>
        <strong class="vs-hero-sym" style="color:${catL.color};">${left.symbol}</strong>
        <div class="vs-hero-name">${left.nameKo} <small>(${left.nameEn})</small></div>
        <div class="vs-hero-item">${left.icon || '🧪'} ${left.item || ''}</div>
      </div>
      <div class="vs-hero-card" style="border-color:${catR.color};">
        <span class="vs-hero-num">${right.atomicNumber}번 · ${catR.nameKo || ''}</span>
        <strong class="vs-hero-sym" style="color:${catR.color};">${right.symbol}</strong>
        <div class="vs-hero-name">${right.nameKo} <small>(${right.nameEn})</small></div>
        <div class="vs-hero-item">${right.icon || '🧪'} ${right.item || ''}</div>
      </div>
    </div>

    <div class="vs-metrics-table">
      ${buildMetricRow('주기 / 족 위치', `${left.period}주기 ${left.group}족`, `${right.period}주기 ${right.group}족`)}
      ${buildMetricRow('⚖️ 원자량', left.atomicMass, right.atomicMass, ' u')}
      ${buildMetricRow('🐚 보어 전자껍질', shellsL, shellsR)}
      ${buildMetricRow('⚡ 전기음성도', left.en, right.en)}
      ${buildMetricRow('🔥 녹는점', left.melting, right.melting, ' °C')}
      ${buildMetricRow('💨 끓는점', left.boiling, right.boiling, ' °C')}
      ${buildMetricRow('🧱 밀도', left.density, right.density)}
      ${buildMetricRow('🔗 주요 산화수', left.oxStates, right.oxStates)}
      ${buildMetricRow('🏛️ 발견 연도', left.year, right.year)}
    </div>
  `;
}

/* =========================================================================
 * 9. 상단 헤더 필터 알약('⭐ 내 암기장') 및 원소 상세 모달 북마크 버튼 자동 연동
 * ========================================================================= */
function initBookmarkAndToolsIntegration() {
  // 1) 상단 검색바 옆 .filter-pills에 '⭐ 내 암기장' 알약 추가
  const filterPills = document.querySelector('.filter-pills');
  if (filterPills && !document.getElementById('bookmarkFilterPill')) {
    const bmBtn = document.createElement('button');
    bmBtn.type = 'button';
    bmBtn.id = 'bookmarkFilterPill';
    bmBtn.className = 'pill-btn bookmark-pill';
    bmBtn.dataset.filter = 'bookmarked';
    bmBtn.innerHTML = `⭐ 내 암기장 <span class="bm-cnt-badge">${BookmarkManager.count()}</span>`;
    filterPills.appendChild(bmBtn);
  }

  // 2) 주기율표 인터랙티브 컨트롤 바 장착
  initScienceInteractiveBar();

  // 3) 초기 타일 별표 동기화
  BookmarkManager.syncUI();
}

// 주기율표가 다시 그려질 때(테마 변경 등) 현재 활성화된 실험 오버레이 및 북마크 별표를 자동 재적용
window.refreshScienceOverlaysOnTableRender = function() {
  BookmarkManager.syncUI();
  if (ScienceToolsState.activePanelTab === 'temp') {
    applyTemperatureOverlay();
  } else if (ScienceToolsState.activePanelTab === 'heatmap') {
    applyHeatmapOverlay();
  } else if (ScienceToolsState.activePanelTab === 'blind') {
    applyBlindStudyMode();
  }
};

// 블라인드 암기 모드일 때 타일 클릭 가로채기 헬퍼 (app.js의 createElementCellByTheme에서 호출)
window.handleElementCellClickWithScienceMode = function(element, cellEl) {
  if (
    ScienceToolsState.activePanelTab === 'blind' &&
    ScienceToolsState.blindMode !== 'none' &&
    ScienceToolsState.blindClickAction === 'reveal'
  ) {
    cellEl.classList.toggle('blind-revealed');
    if (typeof playSoundEffect === 'function') playSoundEffect('flip');
    return true; // 상세 모달 대신 블라인드 토글 수행 완료
  }
  return false;
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBookmarkAndToolsIntegration);
} else {
  initBookmarkAndToolsIntegration();
}
