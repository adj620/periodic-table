const isMobileClient = (typeof window !== 'undefined') && (
  /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || 
  window.innerWidth <= 840 || 
  (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || 
  window.navigator.standalone || 
  window.location.search.includes('mode=app') ||
  window.Capacitor !== undefined
);

let currentThemeId = isMobileClient ? 1 : 0;

document.addEventListener('DOMContentLoaded', () => {
  // 모바일 환경일 경우 탭 활성화를 1편으로 사전 동기화하여 불필요한 재렌더링 방지
  if (isMobileClient) {
    const tab0 = document.querySelector('button[data-theme-id="0"]');
    const tab1 = document.querySelector('button[data-theme-id="1"]');
    if (tab0) tab0.classList.remove('active');
    if (tab1) tab1.classList.add('active');
  }

  initPeriodicTable(currentThemeId);
  // initSplitPages()는 전체 2장 분할 뷰나 인쇄 시에만 지연(Lazy) 초기화
  initLegend();
  initSearchAndFilter();
  initThemeTabs();
  initPrintHandlers();
  initHeaderDropdowns();
  initAccessibilityMode();
  initTheme();
  initModal();
  initScreenZoomControls();

  const geminiConfigBtn = document.getElementById('geminiConfigBtn');
  if (geminiConfigBtn) {
    geminiConfigBtn.addEventListener('click', () => {
      if (window.GeminiService) {
        window.GeminiService.showApiKeyModal();
      }
    });
  }
});

// =========================================================================
// 1. 주기율표 격자 및 란타넘/악티늄족 렌더링 (core_utils.js의 SSOT 데이터 & 빌더 활용)
// =========================================================================
let activeCategoryFilter = null;
let currentTypeFilter = 'all';

function initPeriodicTable(themeId = 1) {
  currentThemeId = themeId;
  const mainGrid = document.getElementById('mainPeriodicTable');
  const lanthanideContainer = document.getElementById('lanthanideElements');
  const actinideContainer = document.getElementById('actinideElements');

  if (!mainGrid) return;
  mainGrid.innerHTML = '';
  lanthanideContainer.innerHTML = '';
  actinideContainer.innerHTML = '';

  for (let period = 1; period <= 7; period++) {
    const periodLabel = document.createElement('div');
    periodLabel.className = 'period-num';
    periodLabel.textContent = `${period}`;
    periodLabel.style.gridRow = period;
    periodLabel.style.gridColumn = 1;
    mainGrid.appendChild(periodLabel);

    for (let group = 1; group <= 18; group++) {
      const colIdx = group + 1;

      if (period === 6 && group === 3) {
        const placeholder = createPlaceholderCell("57-71", "란타넘족", "lanthanide");
        placeholder.style.gridRow = period;
        placeholder.style.gridColumn = colIdx;
        placeholder.addEventListener('click', () => {
          document.getElementById('lanthanideRow')?.scrollIntoView({ behavior: 'smooth' });
        });
        mainGrid.appendChild(placeholder);
        continue;
      }

      if (period === 7 && group === 3) {
        const placeholder = createPlaceholderCell("89-103", "악티늄족", "actinide");
        placeholder.style.gridRow = period;
        placeholder.style.gridColumn = colIdx;
        placeholder.addEventListener('click', () => {
          document.getElementById('actinideRow')?.scrollIntoView({ behavior: 'smooth' });
        });
        mainGrid.appendChild(placeholder);
        continue;
      }

      const element = elementPositionMap.get(`${period}-${group}`);

      if (element) {
        const fullEl = elementsMap.get(element.atomicNumber);
        const cell = createElementCellByTheme(fullEl, themeId);
        cell.style.gridRow = period;
        cell.style.gridColumn = colIdx;
        mainGrid.appendChild(cell);
      } else {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'grid-empty';
        emptyCell.style.gridRow = period;
        emptyCell.style.gridColumn = colIdx;
        mainGrid.appendChild(emptyCell);
      }
    }
  }

  for (let num = 57; num <= 71; num++) {
    const el = elementsMap.get(num);
    if (el) lanthanideContainer.appendChild(createElementCellByTheme(el, themeId));
  }

  for (let num = 89; num <= 103; num++) {
    const el = elementsMap.get(num);
    if (el) actinideContainer.appendChild(createElementCellByTheme(el, themeId));
  }

  // 테마 탭 전환 시에도 현재 활성화된 검색어 · 방사성 필터 · 범례 카테고리 하이라이트 상태를 유지
  applyPeriodicTableFilters();

  // 과학 실험/히트맵/블라인드 암기/북마크 별표 오버레이 동기화
  if (typeof window.refreshScienceOverlaysOnTableRender === 'function') {
    window.refreshScienceOverlaysOnTableRender();
  }
}

/**
 * 테마(0~7편)에 따른 원소 타일 렌더러 (core_utils.js의 buildElementTileInnerHtml 사용)
 */
function createElementCellByTheme(element, themeId) {
  const cell = document.createElement('div');
  cell.className = `element-cell cell-theme-${themeId}`;
  cell.dataset.atomicNumber = element.atomicNumber;
  cell.dataset.category = element.category;
  cell.dataset.symbol = element.symbol.toLowerCase();
  cell.dataset.nameKo = element.nameKo.toLowerCase();
  cell.dataset.altNameKo = (element.altNameKo || '').toLowerCase();
  cell.dataset.nameEn = element.nameEn.toLowerCase();
  cell.dataset.pronKo = `${element.symPronKo || ''} ${element.enPronKo || ''}`.toLowerCase();
  cell.dataset.radioactive = element.isRadioactive ? 'true' : 'false';
  cell.title = `${element.atomicNumber}번 ${element.nameKo} (${element.symbol} [${element.symPronKo}] / ${element.nameEn} [${element.enPronKo}])`;

  cell.innerHTML = buildElementTileInnerHtml(element, themeId);

  cell.addEventListener('click', () => {
    if (
      typeof window.handleElementCellClickWithScienceMode === 'function' &&
      window.handleElementCellClickWithScienceMode(element, cell)
    ) {
      return;
    }
    openElementModal(element);
  });

  return cell;
}

/**
 * 2. 전역 메인 뷰 전환 컨트롤러 (상단 탭, 모바일 하단 바, 외부 시뮬레이터 모두 100% 동기화)
 */
window.switchMainView = function(targetId) {
  // 1) 실행 중인 게임 타이머(퀴즈, 메모리, 퍼즐, 연금술 비동기 타이머) 일괄 중지
  if (typeof window.stopAllGameTimers === 'function') {
    window.stopAllGameTimers();
  } else if (typeof window.stopQuestionTimer === 'function') {
    window.stopQuestionTimer();
  }

  // 모달이 열려 있는 상태에서 뷰 전환 시 모달 및 음성 안전 닫기
  const modal = document.getElementById('elementModal');
  if (modal && !modal.classList.contains('hidden')) {
    modal.classList.add('hidden');
    document.body.classList.remove('modal-open');
    document.documentElement.classList.remove('modal-locked');
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  const screenContainer = document.getElementById('screenContainer');
  const twoPagesPrintContainer = document.getElementById('twoPagesPrintContainer');
  const cardExplorerContainer = document.getElementById('cardExplorerContainer');
  const quizContainer = document.getElementById('quizContainer');
  const themeBtns = document.querySelectorAll('.theme-tab-btn');
  const bottomNavItems = document.querySelectorAll('.mobile-bottom-nav .bottom-nav-item');

  // 모든 뷰 숨김 초기화
  if (screenContainer) screenContainer.style.display = 'none';
  if (twoPagesPrintContainer) twoPagesPrintContainer.style.display = 'none';
  if (cardExplorerContainer) cardExplorerContainer.style.display = 'none';
  if (quizContainer) quizContainer.style.display = 'none';
  document.body.classList.remove('view-mode-split');

  // 상단 탭 active 상태 동기화
  themeBtns.forEach(b => {
    if (b.dataset.themeId === String(targetId)) b.classList.add('active');
    else b.classList.remove('active');
  });

  // 하단 네비게이션 active 상태 동기화
  bottomNavItems.forEach(b => {
    const bId = b.dataset.tabId;
    if (bId === String(targetId) || (bId === '0' && !isNaN(parseInt(targetId, 10)))) {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
    }
  });

  if (targetId === 'all') {
    // 전체 7장(제1편~제7편) 연속 모아보기 뷰 (지연 초기화 적용)
    ensureSplitPagesInitialized();
    document.body.classList.add('view-mode-split');
    if (twoPagesPrintContainer) twoPagesPrintContainer.style.display = 'flex';
  } else if (targetId === 'cards') {
    // 📱 모바일 카드 탐색기 뷰
    if (cardExplorerContainer) {
      cardExplorerContainer.style.display = 'block';
      if (typeof initCardExplorer === 'function') initCardExplorer();
    }
  } else if (targetId === 'quiz') {
    // 🎮 원소 게임 스위트 (퀴즈, 카드 짝맞추기, 주기율표 퍼즐, 연금술)
    if (quizContainer) {
      quizContainer.style.display = 'block';
      if (typeof initGameSuite === 'function') {
        initGameSuite();
      } else if (typeof initQuiz === 'function') {
        initQuiz();
      }
    }
  } else {
    // 주기율표 편별 뷰 (0~7)
    if (screenContainer) screenContainer.style.display = 'block';
    const tid = parseInt(targetId, 10);
    initPeriodicTable(isNaN(tid) ? 1 : tid);
    if (isFitMode && typeof fitScreenProportionally === 'function') {
      fitScreenProportionally();
    }
  }
};

function initThemeTabs() {
  const themeBtns = document.querySelectorAll('.theme-tab-btn');
  themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const themeAttr = btn.dataset.themeId;
      window.switchMainView(themeAttr);
    });
  });
}

/**
 * 3. 인쇄 핸들러 연동 (1장 전용 인쇄 및 N장 일괄 인쇄)
 */
function initPrintHandlers() {
  const printCurrentBtn = document.getElementById('printCurrentBtn');
  const printAllBtn = document.getElementById('printAllBtn');

  // 현재 선택된 편 인쇄 (A4 1장 전용) - 패밀리링크 브라우저 차단 완벽 대응: 인앱 인쇄 호출
  if (printCurrentBtn) {
    printCurrentBtn.addEventListener('click', () => {
      const pageToPrint = (currentThemeId === 'all') ? 1 : currentThemeId;
      const url = `print-multi.html?page=${pageToPrint}&print=true`;
      if (typeof window.openInAppPrint === 'function') {
        window.openInAppPrint(url, `표준 주기율표 제${pageToPrint}편 (A4 인쇄)`);
      } else {
        window.open(url, '_blank');
      }
    });
  }

  // 전체 N장 일괄 인쇄 (A4 5장 세트) - 인앱 인쇄 호출
  if (printAllBtn) {
    printAllBtn.addEventListener('click', () => {
      const url = 'print-multi.html?print=true';
      if (typeof window.openInAppPrint === 'function') {
        window.openInAppPrint(url, `표준 주기율표 전체 N장 일괄 인쇄`);
      } else {
        window.open(url, '_blank');
      }
    });
  }
}

/**
 * 상단 툴바 드롭다운 메뉴 (인쇄 드롭다운 & 설정 드롭다운)
 */
function initHeaderDropdowns() {
  const printDropdownBtn = document.getElementById('printDropdownBtn');
  const printDropdownMenu = document.getElementById('printDropdownMenu');
  const toolsDropdownBtn = document.getElementById('toolsDropdownBtn');
  const toolsDropdownMenu = document.getElementById('toolsDropdownMenu');

  if (printDropdownBtn && printDropdownMenu) {
    printDropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (toolsDropdownMenu) toolsDropdownMenu.classList.remove('show');
      printDropdownMenu.classList.toggle('show');
    });
  }

  if (toolsDropdownBtn && toolsDropdownMenu) {
    toolsDropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (printDropdownMenu) printDropdownMenu.classList.remove('show');
      toolsDropdownMenu.classList.toggle('show');
    });
  }

  // 외부 클릭 시 모든 드롭다운 닫기
  document.addEventListener('click', () => {
    if (printDropdownMenu) printDropdownMenu.classList.remove('show');
    if (toolsDropdownMenu) toolsDropdownMenu.classList.remove('show');
  });
}

/**
 * 5단계 접근성: 색각 이상 보조 모드 (Colorblind Accessibility Pattern Mode)
 */
function initAccessibilityMode() {
  const toggleBtn = document.getElementById('colorblindToggleBtn');
  const statusText = document.getElementById('colorblindStatusText');
  const isEnabled = localStorage.getItem('pt_colorblind_mode') === 'true';

  function applyColorblindMode(enable) {
    if (enable) {
      document.body.classList.add('colorblind-mode');
      if (statusText) statusText.textContent = '색각 보조 모드: 켜짐';
      localStorage.setItem('pt_colorblind_mode', 'true');
    } else {
      document.body.classList.remove('colorblind-mode');
      if (statusText) statusText.textContent = '색각 보조 모드: 끄기';
      localStorage.setItem('pt_colorblind_mode', 'false');
    }
  }

  applyColorblindMode(isEnabled);

  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const current = document.body.classList.contains('colorblind-mode');
      applyColorblindMode(!current);
    });
  }
}

/**
 * 4. 전체 7장(제1편~제7편) 연속 모아보기 뷰 초기화 (Lazy Init + 동적 시트 빌더)
 * - 개선: 과거 1·2편만 하드코딩되어 3~7편이 누락되던 문제를 해결하고, PERIODIC_THEMES 기반으로 1~7편 전체를 동적 생성
 */
let isSplitPagesInitialized = false;

function ensureSplitPagesInitialized() {
  if (isSplitPagesInitialized) return;
  initSplitPages();
  isSplitPagesInitialized = true;
}

function initSplitPages() {
  const container = document.getElementById('twoPagesPrintContainer');
  if (!container) return;
  container.innerHTML = '';

  const themesToRender = (typeof PERIODIC_THEMES !== 'undefined')
    ? PERIODIC_THEMES.filter(t => t.id >= 1 && t.id <= 7)
    : [];

  const groupNumsHtml = Array.from({ length: 18 }, (_, idx) => `<div class="group-num">${idx + 1}</div>`).join('');

  themesToRender.forEach(theme => {
    const section = document.createElement('section');
    section.className = 'split-print-page';
    section.id = `splitPage${theme.id}`;
    section.innerHTML = `
      <div class="split-page-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
        <div>
          <h2 class="split-title">${theme.shortTitle || theme.title}</h2>
          <span class="split-sub">${theme.info}</span>
        </div>
        <button type="button" class="pill-btn primary small-btn no-print split-sheet-print-btn" data-page-id="${theme.id}">
          🖨️ 제${theme.id}편 A4 인쇄
        </button>
      </div>
      <div class="group-header-row">
        <div class="corner-cell">주기＼족</div>
        ${groupNumsHtml}
      </div>
      <div class="periodic-grid split-grid" id="splitGrid${theme.id}"></div>
      <div class="f-block-wrapper">
        <div class="f-block-row">
          <div class="f-block-label">란타넘족 <span class="range">57-71</span></div>
          <div class="f-block-elements" id="splitLanthanide${theme.id}"></div>
        </div>
        <div class="f-block-row">
          <div class="f-block-label">악티늄족 <span class="range">89-103</span></div>
          <div class="f-block-elements" id="splitActinide${theme.id}"></div>
        </div>
      </div>
      <footer class="legend-section">
        <div class="legend-header">
          <h3 class="legend-title">7대 족 및 화학 계열 분류 (색상 범례)</h3>
        </div>
        <div class="legend-grid" id="splitLegend${theme.id}"></div>
      </footer>
    `;
    container.appendChild(section);

    renderSplitGrid(
      `splitGrid${theme.id}`,
      `splitLanthanide${theme.id}`,
      `splitActinide${theme.id}`,
      (el) => createElementCellByTheme(el, theme.id)
    );
    renderSplitLegend(`splitLegend${theme.id}`);
  });

  // 시트별 개별 인쇄 버튼 이벤트 바인딩
  container.querySelectorAll('.split-sheet-print-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const pid = btn.dataset.pageId;
      const url = `print-multi.html?page=${pid}&print=true`;
      if (typeof window.openInAppPrint === 'function') {
        window.openInAppPrint(url, `표준 주기율표 제${pid}편 (A4 인쇄)`);
      } else {
        window.open(url, '_blank');
      }
    });
  });

  isSplitPagesInitialized = true;
  applyPeriodicTableFilters();
}

function renderSplitGrid(gridId, lanthId, actinId, cellBuilder) {
  const grid = document.getElementById(gridId);
  const lanthContainer = document.getElementById(lanthId);
  const actinContainer = document.getElementById(actinId);
  if (!grid) return;

  grid.innerHTML = '';
  lanthContainer.innerHTML = '';
  actinContainer.innerHTML = '';

  for (let period = 1; period <= 7; period++) {
    const periodLabel = document.createElement('div');
    periodLabel.className = 'period-num';
    periodLabel.textContent = `${period}`;
    periodLabel.style.gridRow = period;
    periodLabel.style.gridColumn = 1;
    grid.appendChild(periodLabel);

    for (let group = 1; group <= 18; group++) {
      const colIdx = group + 1;
      if (period === 6 && group === 3) {
        const ph = createPlaceholderCell("57-71", "란타넘족", "lanthanide");
        ph.style.gridRow = period; ph.style.gridColumn = colIdx;
        grid.appendChild(ph);
        continue;
      }
      if (period === 7 && group === 3) {
        const ph = createPlaceholderCell("89-103", "악티늄족", "actinide");
        ph.style.gridRow = period; ph.style.gridColumn = colIdx;
        grid.appendChild(ph);
        continue;
      }

      const found = elementPositionMap.get(`${period}-${group}`);

      if (found) {
        const fullEl = elementsMap.get(found.atomicNumber);
        const cell = cellBuilder(fullEl);
        cell.style.gridRow = period; cell.style.gridColumn = colIdx;
        grid.appendChild(cell);
      } else {
        const emp = document.createElement('div');
        emp.className = 'grid-empty';
        emp.style.gridRow = period; emp.style.gridColumn = colIdx;
        grid.appendChild(emp);
      }
    }
  }

  for (let num = 57; num <= 71; num++) {
    const el = elementsMap.get(num);
    if (el) lanthContainer.appendChild(cellBuilder(el));
  }
  for (let num = 89; num <= 103; num++) {
    const el = elementsMap.get(num);
    if (el) actinContainer.appendChild(cellBuilder(el));
  }
}

function renderSplitLegend(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  Object.values(CATEGORIES).forEach(cat => {
    const card = document.createElement('div');
    card.className = 'legend-card';
    card.style.setProperty('--color', cat.color);
    card.innerHTML = `
      <span class="legend-color-dot"></span>
      <div class="legend-text">
        <span class="legend-name-ko">${cat.nameKo}</span>
        <span class="legend-name-en">${cat.nameEn}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

function createPlaceholderCell(rangeText, titleText, type) {
  const box = document.createElement('div');
  box.className = 'grid-placeholder';
  box.dataset.placeholderType = type;
  box.innerHTML = `
    <div class="placeholder-num">${rangeText}</div>
    <div class="placeholder-name">${titleText}</div>
  `;
  return box;
}

/**
 * 5. 하단 7개 족 범례 렌더링 및 검색/방사성/범례 통합 필터 엔진
 */
function initLegend() {
  const legendGrid = document.getElementById('legendGrid');
  if (!legendGrid) return;
  legendGrid.innerHTML = '';

  Object.values(CATEGORIES).forEach(cat => {
    const card = document.createElement('div');
    card.className = 'legend-card';
    card.dataset.categoryId = cat.id;
    card.style.setProperty('--color', cat.color);

    card.innerHTML = `
      <span class="legend-color-dot"></span>
      <div class="legend-text">
        <span class="legend-name-ko">${cat.nameKo}</span>
        <span class="legend-name-en">${cat.nameEn}</span>
      </div>
    `;

    card.addEventListener('click', () => {
      toggleCategoryHighlight(cat.id);
    });

    legendGrid.appendChild(card);
  });
}

function toggleCategoryHighlight(categoryId) {
  const legendCards = document.querySelectorAll('#legendSection .legend-card');

  if (activeCategoryFilter === categoryId) {
    activeCategoryFilter = null;
    legendCards.forEach(c => c.classList.remove('active'));
  } else {
    activeCategoryFilter = categoryId;
    legendCards.forEach(c => {
      if (c.dataset.categoryId === categoryId) c.classList.add('active');
      else c.classList.remove('active');
    });
  }

  applyPeriodicTableFilters();
}

/**
 * 통합 필터 적용 함수 (검색어 + 방사성 여부 + 범례 카테고리 필터를 동시에 일관되게 반영)
 */
function applyPeriodicTableFilters() {
  const searchInput = document.getElementById('searchInput');
  const searchBar = document.querySelector('.search-bar');
  const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
  const allCells = document.querySelectorAll('.element-cell');

  if (searchBar) {
    if (query.length > 0) {
      searchBar.classList.add('has-value');
    } else {
      searchBar.classList.remove('has-value');
    }
  }

  const hasActiveFilter = query.length > 0 || currentTypeFilter !== 'all' || Boolean(activeCategoryFilter);

  allCells.forEach(cell => {
    let matchesSearch = true;
    let matchesType = true;
    let matchesCat = true;

    if (query.length > 0) {
      const num = cell.dataset.atomicNumber || '';
      const sym = cell.dataset.symbol || '';
      const ko = cell.dataset.nameKo || '';
      const alt = cell.dataset.altNameKo || '';
      const en = cell.dataset.nameEn || '';
      const pron = cell.dataset.pronKo || '';

      matchesSearch = (
        num.includes(query) ||
        sym.includes(query) ||
        ko.includes(query) ||
        alt.includes(query) ||
        en.includes(query) ||
        pron.includes(query)
      );
    }

    if (currentTypeFilter === 'radioactive') {
      matchesType = (cell.dataset.radioactive === 'true');
    } else if (currentTypeFilter === 'bookmarked') {
      const atomicNum = parseInt(cell.dataset.atomicNumber, 10);
      matchesType = Boolean(window.BookmarkManager && window.BookmarkManager.has(atomicNum));
    }

    if (activeCategoryFilter) {
      matchesCat = (cell.dataset.category === activeCategoryFilter);
    }

    if (matchesSearch && matchesType && matchesCat) {
      cell.classList.remove('is-dimmed');
      if (hasActiveFilter) {
        cell.classList.add('is-highlighted');
      } else {
        cell.classList.remove('is-highlighted');
      }
    } else {
      cell.classList.add('is-dimmed');
      cell.classList.remove('is-highlighted');
    }
  });
}

/**
 * 6. 검색 및 필터 이벤트 바인딩
 */
function initSearchAndFilter() {
  const searchInput = document.getElementById('searchInput');
  const clearBtn = document.getElementById('clearSearchBtn');
  const filterPillsWrap = document.querySelector('.filter-pills') || document.querySelector('.search-filter-group');

  if (!searchInput) return;

  searchInput.addEventListener('input', applyPeriodicTableFilters);

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      applyPeriodicTableFilters();
      searchInput.focus();
    });
  }

  if (filterPillsWrap) {
    filterPillsWrap.addEventListener('click', (e) => {
      const btn = e.target.closest('.pill-btn[data-filter]');
      if (!btn) return;
      filterPillsWrap.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTypeFilter = btn.dataset.filter || 'all';
      applyPeriodicTableFilters();
    });
  }
}

/**
 * 7. 테마 전환
 */
function initTheme() {
  const toggleBtn = document.getElementById('themeToggleBtn');
  if (!toggleBtn) return;
  const savedTheme = localStorage.getItem('pt_theme');

  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
    document.body.classList.remove('dark-theme');
    toggleBtn.textContent = '☀️';
  } else {
    document.body.classList.add('dark-theme');
    document.body.classList.remove('light-theme');
    toggleBtn.textContent = '🌙';
  }

  toggleBtn.addEventListener('click', () => {
    if (document.body.classList.contains('light-theme')) {
      document.body.classList.remove('light-theme');
      document.body.classList.add('dark-theme');
      toggleBtn.textContent = '🌙';
      localStorage.setItem('pt_theme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
      toggleBtn.textContent = '☀️';
      localStorage.setItem('pt_theme', 'light');
    }
  });
}

/**
 * 8. 원소 상세 정보 모달 및 보어 원자 모형(전자 껍질 시각화), TTS 음성 안내
 */
let currentModalAtomicNumber = 1;

/**
 * 보어 원자 모형 SVG 동적 렌더러 (core_utils.js의 BOHR_SHELLS_DATA, SHELL_NAMES 활용)
 */
function renderBohrModel(atomicNum, symbol, accentColor = '#38bdf8') {
  const container = document.getElementById('bohrModelContainer');
  const summaryEl = document.getElementById('modalShellSummary');
  const valenceEl = document.getElementById('modalValenceText');
  if (!container) return;

  const shells = BOHR_SHELLS_DATA[atomicNum] || [1];
  const shellCount = shells.length;
  const valenceCount = shells[shells.length - 1];

  if (valenceEl) {
    valenceEl.textContent = `최외각 전자: ${valenceCount}개`;
  }

  if (summaryEl) {
    const summaryStr = shells.map((count, idx) => `${SHELL_NAMES[idx] || idx + 1}(${count})`).join(' · ');
    summaryEl.textContent = summaryStr;
  }

  const cx = 120;
  const cy = 120;
  const maxRadius = 105;
  const minRadius = 26;
  const radiusStep = shellCount > 1 ? (maxRadius - minRadius) / (shellCount - 1) : 0;

  let orbitsSvg = '';
  shells.forEach((electronCount, i) => {
    const r = (shellCount === 1) ? 55 : minRadius + i * radiusStep;
    const duration = 4.5 + i * 2.2;
    const direction = (i % 2 === 0) ? 'normal' : 'reverse';

    let electronsSvg = '';
    for (let j = 0; j < electronCount; j++) {
      const angle = (2 * Math.PI * j) / electronCount;
      const ex = (cx + r * Math.cos(angle)).toFixed(2);
      const ey = (cy + r * Math.sin(angle)).toFixed(2);
      electronsSvg += `<circle cx="${ex}" cy="${ey}" r="3.2" class="bohr-electron" style="fill:${accentColor};" />`;
    }

    orbitsSvg += `
      <!-- ${SHELL_NAMES[i] || i + 1} 껍질 궤도 -->
      <circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" class="bohr-orbit" />
      <g class="bohr-shell-group" style="animation-duration:${duration}s; animation-direction:${direction};">
        ${electronsSvg}
      </g>
    `;
  });

  container.innerHTML = `
    <svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
      ${orbitsSvg}
      <!-- 중심 원자핵 -->
      <circle cx="${cx}" cy="${cy}" r="16" class="bohr-nucleus" style="fill:${accentColor};" />
      <text x="${cx}" y="${cy}" class="bohr-nucleus-text">${symbol}</text>
    </svg>
  `;
}

/**
 * Web Speech API TTS 발음 재생기 (core_utils.js의 AppAudio.speakText 통합 사용)
 */
function speakElementName(lang = 'ko-KR') {
  const element = elementsMap.get(currentModalAtomicNumber);
  if (!element || !window.AppAudio) return;

  const text = (lang === 'ko-KR') ? element.nameKo : element.nameEn;
  const btn = (lang === 'ko-KR') ? document.getElementById('modalSpeakKoBtn') : document.getElementById('modalSpeakEnBtn');

  window.AppAudio.speakText(text, lang, {
    onStart: () => { if (btn) btn.classList.add('speaking'); },
    onEnd: () => { if (btn) btn.classList.remove('speaking'); },
    onError: () => { if (btn) btn.classList.remove('speaking'); }
  });
}

function updateModalContent(atomicNum) {
  const element = elementsMap.get(atomicNum);
  if (!element) return;
  currentModalAtomicNumber = atomicNum;

  const modal = document.getElementById('elementModal');
  const modalBody = document.getElementById('modalBody');
  const savedScrollTop = modalBody ? modalBody.scrollTop : 0;
  const cat = CATEGORIES[element.category] || {};

  const aiBox = document.getElementById('modalAiResponseBox');
  if (aiBox) aiBox.style.display = 'none';

  document.getElementById('modalNum').textContent = element.atomicNumber;
  document.getElementById('modalSymbol').textContent = element.symbol;
  document.getElementById('modalSymbol').style.borderColor = cat.color || '#38bdf8';
  document.getElementById('modalSymbol').style.color = cat.color || '#38bdf8';

  document.getElementById('modalNameKo').textContent = element.nameKo;

  const altBadge = document.getElementById('modalAltNameKo');
  const pronInfo = `기호발음: [${element.symPronKo}] / 영문발음: [${element.enPronKo}]`;
  if (element.altNameKo) {
    altBadge.textContent = `이명: ${element.altNameKo} · 🗣️ ${pronInfo}`;
    altBadge.title = `이명 및 한글 발음: ${element.altNameKo} (${pronInfo})`;
    altBadge.style.display = 'inline-block';
  } else {
    altBadge.textContent = `🗣️ ${pronInfo}`;
    altBadge.style.display = 'inline-block';
  }

  document.getElementById('modalNameEn').textContent = `${element.nameEn} (${element.enPronKo})`;
  document.getElementById('modalCategoryName').textContent = cat.nameKo || '';

  // 모달 내 ⭐ 내 암기장 북마크 토글 & ⚔️ 1:1 VS 비교 버튼 연동
  const koSpeakBtn = document.getElementById('modalSpeakKoBtn');
  if (koSpeakBtn && koSpeakBtn.parentNode) {
    let bmModalBtn = document.getElementById('modalBookmarkToggleBtn');
    if (!bmModalBtn) {
      bmModalBtn = document.createElement('button');
      bmModalBtn.type = 'button';
      bmModalBtn.id = 'modalBookmarkToggleBtn';
      bmModalBtn.className = 'speak-btn modal-bm-btn';
      koSpeakBtn.parentNode.appendChild(bmModalBtn);
    }
    const syncModalBmText = () => {
      const isBm = window.BookmarkManager && window.BookmarkManager.has(atomicNum);
      bmModalBtn.innerHTML = isBm ? '⭐ 암기장 등록됨' : '☆ 암기장 추가';
      bmModalBtn.classList.toggle('bm-active', Boolean(isBm));
    };
    syncModalBmText();
    bmModalBtn.onclick = () => {
      if (window.BookmarkManager) {
        window.BookmarkManager.toggle(atomicNum);
        syncModalBmText();
      }
    };

    let vsModalBtn = document.getElementById('modalVsCompareBtn');
    if (!vsModalBtn) {
      vsModalBtn = document.createElement('button');
      vsModalBtn.type = 'button';
      vsModalBtn.id = 'modalVsCompareBtn';
      vsModalBtn.className = 'speak-btn modal-vs-btn';
      vsModalBtn.innerHTML = '⚔️ 1:1 비교';
      koSpeakBtn.parentNode.appendChild(vsModalBtn);
    }
    vsModalBtn.onclick = () => {
      if (typeof window.openScienceToolsModal === 'function') {
        if (typeof ScienceToolsState !== 'undefined') {
          ScienceToolsState.vsLeftNum = atomicNum;
          ScienceToolsState.vsRightNum = atomicNum === 11 ? 19 : 11;
        }
        window.openScienceToolsModal('vs');
      }
    };
  }

  document.getElementById('modalMass').textContent = element.atomicMass;
  document.getElementById('modalPeriodGroup').textContent = `${element.period}주기 ${element.group}족`;
  document.getElementById('modalPhase').textContent = element.phase;

  const radEl = document.getElementById('modalRadioactive');
  if (element.isRadioactive) {
    radEl.innerHTML = '<span style="color:#facc15;font-weight:700;">☢️ 방사성 원소 (주의)</span>';
  } else {
    radEl.textContent = '안정 동위원소 존재 (비방사성)';
  }

  document.getElementById('modalElectron').textContent = element.electronConfig;
  document.getElementById('modalDesc').textContent = element.description + (element.usage ? ` [대표 용도: ${element.usage}]` : '');

  // 실제 원소 표본 사진 및 외형 정보 바인딩
  const photoImg = document.getElementById('modalPhotoImg');
  const photoFallback = document.getElementById('modalPhotoFallback');
  const lookTextEl = document.getElementById('modalLookText');
  const itemTextEl = document.getElementById('modalItemText');

  const isSynthetic = element.isSynthetic || (element.atomicNumber >= 99);
  const syntheticReason = element.syntheticReason || (isSynthetic 
    ? '이 원소는 반감기가 극도로 짧아(수 밀리초~수 초) 원자 단위로만 찰나에 존재하므로 전 세계 과학계에 실제 육안 표본 사진이 존재하지 않는 원소입니다.' 
    : '실제 표본 사진을 로컬 그래픽으로 대체 표시합니다.');

  function renderPhotoFallbackContent() {
    if (!photoFallback) return;
    photoFallback.classList.remove('hidden');
    photoFallback.innerHTML = `
      <div class="synthetic-fallback-card">
        <span class="synthetic-badge">${isSynthetic ? '🔬 인공 합성 초중원소' : '🎨 대표 상징 그래픽'}</span>
        <div class="synthetic-big-icon">${element.icon || '⚛️'}</div>
        <strong class="synthetic-symbol" style="color:${cat.color || '#38bdf8'};">${element.symbol}</strong>
        <p class="synthetic-desc-note">${syntheticReason}</p>
      </div>
    `;
  }

  if (photoImg && photoFallback) {
    if (element.photo) {
      photoImg.src = element.photo;
      photoImg.alt = `${element.nameKo} 실제 표본 사진`;
      photoImg.style.display = 'block';
      photoFallback.classList.add('hidden');
      photoImg.onerror = () => {
        photoImg.style.display = 'none';
        renderPhotoFallbackContent();
      };
    } else {
      photoImg.style.display = 'none';
      renderPhotoFallbackContent();
    }
  }

  if (lookTextEl) {
    if (element.look) {
      lookTextEl.textContent = element.look;
    } else if (isSynthetic) {
      lookTextEl.textContent = '🔬 인공 합성 원소 (반감기가 극히 짧아 찰나에 붕괴하므로 육안 표본이 존재하지 않습니다)';
    } else {
      lookTextEl.textContent = '실물 외형 특성 정보 준비 중';
    }
  }
  if (itemTextEl) {
    const icon = element.icon || '🧪';
    const item = element.item || element.nameKo;
    const usage = element.usage ? ` (주요 활용: ${element.usage})` : '';
    itemTextEl.textContent = `${icon} ${item}${usage}`;
  }

  // 보어 원자 모형(전자 껍질 회전 애니메이션) 렌더링
  renderBohrModel(element.atomicNumber, element.symbol, cat.color || '#38bdf8');

  // 118개 완결형 백과사전 이야기(패밀리 링크 브라우저 차단 대응 인앱 내장) 바인딩
  const encyData = (typeof ELEMENTS_ENCYCLOPEDIA !== 'undefined' && ELEMENTS_ENCYCLOPEDIA[atomicNum]) ? ELEMENTS_ENCYCLOPEDIA[atomicNum] : null;
  const headlineEl = document.getElementById('modalEncyHeadline');
  const originEl = document.getElementById('modalEncyOrigin');
  const factsListEl = document.getElementById('modalEncyFacts');
  const scienceEl = document.getElementById('modalEncyScience');
  const safetyEl = document.getElementById('modalEncySafety');

  if (encyData) {
    if (headlineEl) headlineEl.textContent = encyData.headline || '';
    if (originEl) originEl.textContent = encyData.origin || '';
    if (factsListEl) {
      factsListEl.innerHTML = (encyData.funFacts || []).map(f => `<li>${f}</li>`).join('');
    }
    if (scienceEl) scienceEl.textContent = encyData.science || '';
    if (safetyEl) safetyEl.textContent = encyData.safety || '';
  }

  // 이전 음성 정지
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const koBtn = document.getElementById('modalSpeakKoBtn');
    const enBtn = document.getElementById('modalSpeakEnBtn');
    if (koBtn) koBtn.classList.remove('speaking');
    if (enBtn) enBtn.classList.remove('speaking');
  }

  // 이전/다음 네비게이션 버튼 및 인디케이터 상태 갱신
  const prevBtn = document.getElementById('modalPrevBtn');
  const nextBtn = document.getElementById('modalNextBtn');
  const prevLabel = document.getElementById('modalPrevLabel');
  const nextLabel = document.getElementById('modalNextLabel');
  const indicator = document.getElementById('modalNavIndicator');

  if (indicator) {
    indicator.textContent = `${element.atomicNumber} / 118`;
  }

  if (prevBtn && prevLabel) {
    if (atomicNum > 1) {
      prevBtn.disabled = false;
      const prevEl = elementsMap.get(atomicNum - 1);
      prevLabel.textContent = prevEl ? `${prevEl.atomicNumber} ${prevEl.symbol} ${prevEl.nameKo}` : '이전 원소';
    } else {
      prevBtn.disabled = true;
      prevLabel.textContent = '첫 번째 원소';
    }
  }

  if (nextBtn && nextLabel) {
    if (atomicNum < 118) {
      nextBtn.disabled = false;
      const nextEl = elementsMap.get(atomicNum + 1);
      nextLabel.textContent = nextEl ? `${nextEl.atomicNumber} ${nextEl.symbol} ${nextEl.nameKo}` : '다음 원소';
    } else {
      nextBtn.disabled = true;
      nextLabel.textContent = '마지막 원소';
    }
  }

  // Next/Prev 이동 시 사용자가 보던 스크롤 위치 완벽 유지 (동기 + 비동기 보정)
  if (modalBody && typeof savedScrollTop === 'number') {
    modalBody.scrollTop = savedScrollTop;
    requestAnimationFrame(() => {
      if (modalBody) modalBody.scrollTop = savedScrollTop;
    });
    setTimeout(() => {
      if (modalBody) modalBody.scrollTop = savedScrollTop;
    }, 35);
  }

  modal.classList.remove('hidden');
  document.body.classList.add('modal-open');
  document.documentElement.classList.add('modal-locked');
}

function openElementModal(element) {
  if (!element || !element.atomicNumber) return;
  const modalBody = document.getElementById('modalBody');
  if (modalBody) {
    modalBody.scrollTop = 0; // 새로 다른 원소를 클릭해 처음 열 때만 맨 위로 초기화
  }
  updateModalContent(element.atomicNumber);
}
window.openElementModal = openElementModal;
window.updateModalContent = updateModalContent;

function initModal() {
  const modal = document.getElementById('elementModal');
  const closeBtn = document.getElementById('modalCloseBtn');
  const prevBtn = document.getElementById('modalPrevBtn');
  const nextBtn = document.getElementById('modalNextBtn');
  const speakKoBtn = document.getElementById('modalSpeakKoBtn');
  const speakEnBtn = document.getElementById('modalSpeakEnBtn');
  if (!modal || !closeBtn) return;

  function closeModal() {
    modal.classList.add('hidden');
    document.body.classList.remove('modal-open');
    document.documentElement.classList.remove('modal-locked');
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // 모달 배경에서 발생하는 마우스 휠 및 터치 이동 시 뒤쪽 메인 화면 스크롤 전파 원천 차단
  modal.addEventListener('wheel', (e) => {
    if (!e.target.closest('.modal-card')) {
      e.preventDefault();
    }
  }, { passive: false });

  modal.addEventListener('touchmove', (e) => {
    if (!e.target.closest('.modal-card')) {
      e.preventDefault();
    }
  }, { passive: false });



  // 2. TTS 발음 듣기
  if (speakKoBtn) {
    speakKoBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      speakElementName('ko-KR');
    });
  }

  if (speakEnBtn) {
    speakEnBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      speakElementName('en-US');
    });
  }

  // 2-2. AI 실시간 팁 버튼
  const aiAskBtn = document.getElementById('modalAiAskBtn');
  const aiResponseBox = document.getElementById('modalAiResponseBox');
  if (aiAskBtn) {
    aiAskBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const el = elementsMap.get(currentModalAtomicNumber);
      if (!el) return;

      const apiKey = window.GeminiService ? window.GeminiService.getApiKey() : localStorage.getItem('gemini_api_key');

      if (!apiKey) {
        if (window.GeminiService) {
          window.GeminiService.showApiKeyModal(() => {
            if (aiAskBtn) aiAskBtn.click();
          });
        } else {
          alert('🤖 Google Gemini API 키가 아직 저장되지 않았습니다!\n\n상단 [🤖 AI 키 설정] 버튼이나 퀴즈 탭에서 키를 입력해 주세요.');
        }
        return;
      }

      if (aiResponseBox) {
        aiResponseBox.style.display = 'block';
        aiResponseBox.innerHTML = `
          <div class="ai-box-loading">
            <span class="ai-spinner">✨</span>
            <span>AI 선생님이 <strong>${el.nameKo}</strong>에 대한 재미있는 암기 팁과 상식을 생각하고 있어요...</span>
          </div>
        `;

        try {
          if (window.GeminiService) {
            const res = await window.GeminiService.getElementTip(el);
            if (res.ok) {
              aiResponseBox.innerHTML = `
                <div class="ai-box-content">
                  <div class="ai-box-header">
                    <span class="ai-badge">🤖 AI 화학 선생님의 꿀팁 (${res.modelName || 'Gemini'}${res.totalElapsedSec ? ` · ⏱️ ${res.totalElapsedSec}초` : ''})</span>
                    <button class="ai-close-mini-btn" onclick="document.getElementById('modalAiResponseBox').style.display='none'">✕</button>
                  </div>
                  <p class="ai-box-text">${res.text}</p>
                </div>
              `;
            } else {
              const err = res.errorInfo || {
                title: 'AI 응답 실패',
                desc: '구글 AI 서버 응답을 가져오지 못했습니다.',
                action: 'API 키를 다시 확인해 주세요.'
              };
              aiResponseBox.innerHTML = `
                <div class="ai-box-error">
                  <div style="font-weight:800; margin-bottom:4px;">⚠️ ${err.title}</div>
                  <div style="font-size:0.84rem; margin-bottom:4px; color:#fecaca;">${err.desc}</div>
                  ${err.raw ? `<div style="font-size:0.75rem; font-family:monospace; background:rgba(0,0,0,0.3); padding:4px 6px; border-radius:4px; margin-bottom:6px; word-break:break-all;">${err.raw}</div>` : ''}
                  <div style="font-size:0.8rem; color:#fef08a; margin-bottom:8px;">💡 ${err.action}</div>
                  <div class="ai-box-actions">
                    <button type="button" class="ai-box-btn-mini" id="modalFixAiKeyBtn">🔑 API 키 설정 및 진단 열기</button>
                  </div>
                </div>
              `;
              const fixBtn = document.getElementById('modalFixAiKeyBtn');
              if (fixBtn) {
                fixBtn.addEventListener('click', (ev) => {
                  ev.stopPropagation();
                  window.GeminiService.showApiKeyModal(() => {
                    if (aiAskBtn) aiAskBtn.click();
                  });
                });
              }
            }
          }
        } catch (err) {
          aiResponseBox.innerHTML = `
            <div class="ai-box-error">
              <div>⚠️ 네트워크 연결 오류 또는 오프라인 상태입니다.</div>
              <div style="font-size:0.8rem; margin-top:4px;">(${err.message || '인터넷 연결 확인 필요'})</div>
            </div>
          `;
        }
      }
    });
  }

  // 3. 하단 고정 푸터 이전/다음 버튼 클릭 이벤트
  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentModalAtomicNumber > 1) {
        updateModalContent(currentModalAtomicNumber - 1);
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentModalAtomicNumber < 118) {
        updateModalContent(currentModalAtomicNumber + 1);
      }
    });
  }

  // 4. 키보드 좌우 방향키로 이전/다음 이동, ESC로 닫기
  document.addEventListener('keydown', (e) => {
    if (modal.classList.contains('hidden')) return;
    if (e.key === 'Escape') {
      closeModal();
    } else if (e.key === 'ArrowLeft' && currentModalAtomicNumber > 1) {
      updateModalContent(currentModalAtomicNumber - 1);
    } else if (e.key === 'ArrowRight' && currentModalAtomicNumber < 118) {
      updateModalContent(currentModalAtomicNumber + 1);
    }
  });

  // 5. 모바일 터치 스와이프 및 PC/시뮬레이터 마우스 드래그 넘기기 지원
  const modalCard = modal.querySelector('.modal-card');
  if (modalCard) {
    let pointerStartX = 0;
    let pointerStartY = 0;
    let isTracking = false;

    // 포인터 이벤트(터치 + 마우스 모두 지원)
    modalCard.addEventListener('pointerdown', (e) => {
      // 버튼, 입력창, 닫기버튼 등 인터랙티브 요소는 드래그 제스처 제외
      if (e.target.closest('button, input, select, a, .bohr-model-container, .modal-tab-bar')) return;
      pointerStartX = e.clientX;
      pointerStartY = e.clientY;
      isTracking = true;
    });

    window.addEventListener('pointerup', (e) => {
      if (!isTracking || modal.classList.contains('hidden')) {
        isTracking = false;
        return;
      }
      isTracking = false;
      const diffX = e.clientX - pointerStartX;
      const diffY = e.clientY - pointerStartY;

      // 수평 이동 50px 이상 & 수평 이동이 수직 이동보다 클 때 이전/다음 전환
      if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY) * 1.3) {
        if (diffX > 0 && currentModalAtomicNumber > 1) {
          // 오른쪽으로 드래그/밀기 ➔ 이전 원소
          updateModalContent(currentModalAtomicNumber - 1);
        } else if (diffX < 0 && currentModalAtomicNumber < 118) {
          // 왼쪽으로 드래그/밀기 ➔ 다음 원소
          updateModalContent(currentModalAtomicNumber + 1);
        }
      }
    });
  }
}

/**
 * 9. 화면 확대/축소 및 꽉 찬 화면 조절 제어 (가로세로 완벽한 정비례 스케일링)
 */
let screenScaleFactor = 1.0;
let isFitMode = true; // 기본적으로 화면 크기에 맞게 자동 최적화
const BASE_TABLE_WIDTH = 1440; // 기준 표준 폭 (px)

function applyScreenScale(factor, isFit = false) {
  isFitMode = isFit;
  screenScaleFactor = Math.min(Math.max(factor, 0.55), 2.2);
  const container = document.getElementById('screenContainer');
  const zoomVal = document.getElementById('screenZoomVal');
  const fitBtn = document.getElementById('screenFitBtn');
  const tableWrapper = document.getElementById('tableWrapper');

  if (tableWrapper) {
    tableWrapper.style.zoom = ''; // 불균형을 유발하는 zoom 속성 제거
  }

  // 모바일 앱 환경일 때는 전체 화면을 2300px로 뻥튀기하지 않고, 100% 뷰포트 유지 (가로 스와이프로 안전 탐색)
  const isMobile = document.body.classList.contains('mobile-app-mode') || 
                   /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || 
                   window.innerWidth <= 840;

  if (isMobile) {
    if (container) {
      container.style.setProperty('--table-width', '100%');
      container.style.setProperty('--table-max-width', '100%');
    }
    return;
  }

  const targetWidth = Math.round(BASE_TABLE_WIDTH * screenScaleFactor);

  if (container) {
    if (isFit) {
      container.style.setProperty('--table-width', `${targetWidth}px`);
      container.style.setProperty('--table-max-width', '100%');
    } else {
      container.style.setProperty('--table-width', `${targetWidth}px`);
      container.style.setProperty('--table-max-width', `${targetWidth}px`);
    }
  }

  if (zoomVal) {
    zoomVal.textContent = `${Math.round(screenScaleFactor * 100)}%`;
  }

  if (fitBtn) {
    if (isFit) {
      fitBtn.classList.add('active');
    } else {
      fitBtn.classList.remove('active');
    }
  }
}

function fitScreenProportionally() {
  const isMobile = document.body.classList.contains('mobile-app-mode') || 
                   /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || 
                   window.innerWidth <= 840;
  if (isMobile) return;

  const header = document.querySelector('.app-header');
  const headerHeight = header ? header.offsetHeight : 105;
  const availW = window.innerWidth - 32; // 좌우 안전 여백
  const availH = window.innerHeight - headerHeight - 32; // 상하 안전 여백

  // 전체 주기율표 종횡비 (가로 18.6열 : 세로 약 12.2단위) -> 약 1.52 : 1
  const fitWidthByHeight = Math.max(680, availH * 1.52);
  const optimalWidth = Math.min(availW, fitWidthByHeight);
  const optimalFactor = optimalWidth / BASE_TABLE_WIDTH;

  applyScreenScale(optimalFactor, true);
}

function initScreenZoomControls() {
  const inBtn = document.getElementById('screenZoomInBtn');
  const outBtn = document.getElementById('screenZoomOutBtn');
  const fitBtn = document.getElementById('screenFitBtn');

  if (inBtn) {
    inBtn.addEventListener('click', () => {
      applyScreenScale(screenScaleFactor + 0.1, false);
    });
  }

  if (outBtn) {
    outBtn.addEventListener('click', () => {
      applyScreenScale(screenScaleFactor - 0.1, false);
    });
  }

  if (fitBtn) {
    fitBtn.addEventListener('click', () => {
      fitScreenProportionally();
    });
  }

  // 초기 로드 시 환경 감지 및 맞춤 설정
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || 
                   window.innerWidth <= 840 || 
                   window.Capacitor !== undefined;

  if (isMobile) {
    // 모바일 폰에서는 데스크톱 스케일 뻥튀기 대신 100% 뷰포트 고정
    document.body.classList.add('mobile-app-mode');
    document.body.classList.add('mobile-device');
  } else {
    // PC 화면에서는 전체 맞춤으로 시작
    fitScreenProportionally();
  }

  // 창 크기 변경 시 화면 맞춤 모드 유지 중이면 자동 재연산
  window.addEventListener('resize', () => {
    if (isFitMode && window.innerWidth > 840 && !document.body.classList.contains('mobile-app-mode')) {
      fitScreenProportionally();
    }
  });

  // 모바일 앱 환경 최적화 및 FAB/하단 탭 바 초기화
  initMobileAppExperience();
}

/**
 * 10. 진정한 모바일 앱 UX 환경 고도화
 * - 모바일 환경에서 데스크톱 전용 UI(인쇄, 줌 버튼, 종합1장판 등) 완전 차단
 * - 하단 고정 탭 바(Bottom Navigation)가 항상 화면 최하단에 100% 밀착 고정되도록 보장
 * - 18열 주기율표를 폰 화면 폭(100vw) 안에서 좌우 가로 스와이프로 쾌적하게 탐색
 */
function initMobileAppExperience() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                       window.navigator.standalone || 
                       window.location.search.includes('mode=app') ||
                       window.Capacitor !== undefined;
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || 
                   window.innerWidth <= 840 || 
                   isStandalone;

  if (isMobile) {
    document.body.classList.add('mobile-app-mode');
    document.body.classList.add('mobile-device');

    // 1) 네이티브 앱/PWA 안에서 불필요한 설치 버튼/배너 100% 제거
    const installBtn = document.getElementById('installAppBtn');
    const mobileInstallBanner = document.getElementById('mobileInstallBanner');
    
    if (isStandalone) {
      if (installBtn) installBtn.style.setProperty('display', 'none', 'important');
      if (mobileInstallBanner) mobileInstallBanner.style.setProperty('display', 'none', 'important');
    }

    // 2) 데스크톱 웹 전용 인쇄 컨트롤 숨김
    const printActions = document.querySelector('.print-actions');
    if (printActions) printActions.style.display = 'none';

    const printTab0 = document.querySelector('button[data-theme-id="0"]');
    if (printTab0) printTab0.style.display = 'none';

    const printTabAll = document.querySelector('button[data-theme-id="all"]');
    if (printTabAll) printTabAll.style.display = 'none';

    // 3) 모바일 첫 진입 시 '1편: 기본명칭' 탭을 활성화하여 깔끔한 모바일 시작 제공
    const tab1 = document.querySelector('button[data-theme-id="1"]');
    if (tab1 && printTab0 && printTab0.classList.contains('active')) {
      printTab0.classList.remove('active');
      tab1.classList.add('active');
      if (currentThemeId !== 1) {
        initPeriodicTable(1);
      }
    }
  }

  // 4) 모바일 하단 고정 네비게이션 바 (Bottom Navigation)
  const bottomNavItems = document.querySelectorAll('.mobile-bottom-nav .bottom-nav-item');
  const bottomSearchBtn = document.getElementById('bottomNavSearchBtn');
  const searchInput = document.getElementById('searchInput');

  bottomNavItems.forEach(item => {
    const tabId = item.dataset.tabId;
    if (!tabId) return;

    item.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.switchMainView(tabId);
    });
  });

  if (bottomSearchBtn) {
    bottomSearchBtn.addEventListener('click', () => {
      // 1. 현재 화면이 '카드' 탭인 경우 -> 카드 탐색기 검색창으로 포커스
      const cardContainer = document.getElementById('cardExplorerContainer');
      const isCardVisible = cardContainer && cardContainer.style.display !== 'none';
      if (isCardVisible) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const cardSearchInput = document.getElementById('cardSearchInput');
        if (cardSearchInput) cardSearchInput.focus();
        return;
      }

      // 2. 현재 화면이 '게임' 탭인 경우 -> 주기율표 1편으로 전환 후 검색창 포커스
      const quizContainer = document.getElementById('quizContainer');
      const isQuizVisible = quizContainer && quizContainer.style.display !== 'none';
      if (isQuizVisible) {
        window.switchMainView(1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => {
          if (searchInput) searchInput.focus();
        }, 150);
        return;
      }

      // 3. 주기율표 뷰인 경우 -> 주기율표 검색창 포커스
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (searchInput) searchInput.focus();
    });
  }
}
