let currentThemeId = 0;

document.addEventListener('DOMContentLoaded', () => {
  initPeriodicTable(currentThemeId);
  initSplitPages();
  initLegend();
  initSearchAndFilter();
  initThemeTabs();
  initPrintHandlers();
  initTheme();
  initModal();
  initScreenZoomControls();
});

// 118개 원소 매핑 객체 (기본 정보 + 상세 물리화학/역사 데이터 + 실제 표본 사진 병합)
const elementsMap = new Map();
ELEMENTS_DATA.forEach(el => {
  const extra = (typeof ELEMENTS_EXTRA_DATA !== 'undefined' && ELEMENTS_EXTRA_DATA[el.atomicNumber]) || {};
  const photo = (typeof ELEMENTS_PHOTOS_DATA !== 'undefined' && ELEMENTS_PHOTOS_DATA[el.atomicNumber]) || {};
  elementsMap.set(el.atomicNumber, { ...el, ...extra, ...photo });
});

/**
 * 1. 주기율표 격자 및 란타넘/악티늄족 렌더링 (테마별 동적 렌더링)
 */
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
          document.getElementById('lanthanideRow').scrollIntoView({ behavior: 'smooth' });
        });
        mainGrid.appendChild(placeholder);
        continue;
      }

      if (period === 7 && group === 3) {
        const placeholder = createPlaceholderCell("89-103", "악티늄족", "actinide");
        placeholder.style.gridRow = period;
        placeholder.style.gridColumn = colIdx;
        placeholder.addEventListener('click', () => {
          document.getElementById('actinideRow').scrollIntoView({ behavior: 'smooth' });
        });
        mainGrid.appendChild(placeholder);
        continue;
      }

      const element = ELEMENTS_DATA.find(el => {
        if (el.atomicNumber >= 57 && el.atomicNumber <= 71) return false;
        if (el.atomicNumber >= 89 && el.atomicNumber <= 103) return false;
        return el.period === period && el.group === group;
      });

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
}

/**
 * 테마(1~5편)에 따른 원소 타일 렌더러
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
  cell.dataset.radioactive = element.isRadioactive ? 'true' : 'false';

  const radMark = element.isRadioactive ? '<span class="radioactive-badge" title="방사성 원소">☢️</span>' : '';

  if (themeId === 0) {
    // 🌟 종합판 (최초 개발한 1편+2편 합본 1장 완성형)
    // 원자번호, 방사능(☢️), 기호, 한글표준명, 이명[나트륨], 영문명, 원자량 모두 표시
    const cleanAlt = element.altNameKo ? `[${element.altNameKo.split('/')[0].split('(')[0].trim()}]` : '';
    cell.innerHTML = `
      <div class="cell-top">
        <span class="atomic-number">${element.atomicNumber}</span>
        ${radMark}
      </div>
      <div class="cell-symbol-wrap">
        <span class="element-symbol">${element.symbol}</span>
      </div>
      <div class="cell-names">
        <span class="name-ko-main">${element.nameKo}</span>
        ${cleanAlt ? `<span class="name-ko-alt">${cleanAlt}</span>` : ''}
        <span class="name-en">${element.nameEn}</span>
        <span class="cell-mass">${element.atomicMass}</span>
      </div>
    `;
  } else if (themeId === 1) {
    // 제1편: 기본 명칭판 (기호 큼직, 한글 표준명, 영문명)
    cell.innerHTML = `
      <div class="cell-top">
        <span class="atomic-number">${element.atomicNumber}</span>
        ${radMark}
      </div>
      <div class="cell-symbol-wrap">
        <span class="element-symbol">${element.symbol}</span>
      </div>
      <div class="cell-names">
        <span class="name-ko-main">${element.nameKo}</span>
        <span class="name-en">${element.nameEn}</span>
      </div>
    `;
  } else if (themeId === 2) {
    // 제2편: 원자량 · 관용명(이명) · 전자배치판
    const cleanAlt = element.altNameKo ? `[${element.altNameKo.split('/')[0].split('(')[0].trim()}]` : element.nameKo;
    cell.innerHTML = `
      <div class="cell-top">
        <span class="atomic-number">${element.atomicNumber}</span>
        ${radMark}
      </div>
      <div class="cell-symbol-wrap">
        <span class="element-symbol">${element.symbol}</span>
      </div>
      <div class="cell-names">
        <span class="name-ko-alt">${cleanAlt}</span>
        <span class="cell-mass">${element.atomicMass}</span>
        <span class="electron-config">${element.electronConfig}</span>
      </div>
    `;
  } else if (themeId === 3) {
    // 제3편: 열역학 및 밀도·물리상태판
    cell.innerHTML = `
      <div class="cell-top">
        <span class="atomic-number">${element.atomicNumber}</span>
        <span class="phase">${element.phase || '-'}</span>
      </div>
      <div class="cell-symbol-wrap">
        <span class="element-symbol">${element.symbol}</span>
      </div>
      <div class="cell-names">
        <span class="temp-row">녹 ${element.melting || '-'}℃</span>
        <span class="temp-row">끓 ${element.boiling || '-'}℃</span>
        <span class="density">${element.density || '-'}</span>
      </div>
    `;
  } else if (themeId === 4) {
    // 제4편: 산화수 및 전기음성도판
    cell.innerHTML = `
      <div class="cell-top">
        <span class="atomic-number">${element.atomicNumber}</span>
        <span class="name-ko-sub">${element.nameKo}</span>
      </div>
      <div class="cell-symbol-wrap">
        <span class="element-symbol">${element.symbol}</span>
      </div>
      <div class="cell-names">
        <span class="ox-states" title="${element.oxStates || ''}">산화: ${element.oxStates || '-'}</span>
        <span class="en-val">전기음성: ${element.en || '-'}</span>
      </div>
    `;
  } else if (themeId === 5) {
    // 제5편: 역사 및 실생활 용도판
    cell.innerHTML = `
      <div class="cell-top">
        <span class="atomic-number">${element.atomicNumber}</span>
        <span class="year">${element.year || ''}</span>
      </div>
      <div class="cell-symbol-wrap">
        <span class="element-symbol">${element.symbol}</span>
      </div>
      <div class="cell-names">
        <span class="usage" title="${element.usage || ''}">${element.usage || element.description}</span>
      </div>
    `;
  } else if (themeId === 6) {
    // 제6편: 실생활 대표 물건 및 일러스트 그림(이모지) 판
    const icon = element.icon || "🧪";
    const item = element.item || element.nameKo;
    cell.innerHTML = `
      <div class="cell-top">
        <span class="atomic-number">${element.atomicNumber}</span>
        <span class="name-ko-sub">${element.nameKo}</span>
      </div>
      <div class="cell-symbol-wrap">
        <span class="element-symbol">${element.symbol}</span>
      </div>
      <div class="cell-names theme-6-content">
        <div class="item-icon">${icon}</div>
        <span class="item-name" title="${item}">${item}</span>
      </div>
    `;
  } else if (themeId === 7) {
    // 제7편: 실제 원소 표본 사진 및 외형 판
    const photoUrl = element.photo || '';
    const lookText = element.look || '';
    cell.innerHTML = `
      <div class="cell-top">
        <span class="atomic-number">${element.atomicNumber}</span>
        <span class="name-ko-sub">${element.nameKo}</span>
      </div>
      <div class="cell-photo-thumb-wrap">
        ${photoUrl ? `<img src="${photoUrl}" alt="${element.nameKo} 표본" class="cell-photo-thumb" loading="lazy" onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='flex';"/>` : ''}
        <div class="cell-photo-symbol-fallback" style="${photoUrl ? 'display:none;' : 'display:flex;'}">
          <span class="element-symbol">${element.symbol}</span>
        </div>
      </div>
      <div class="cell-names">
        <span class="cell-photo-look" title="${lookText}">${lookText || element.symbol}</span>
      </div>
    `;
  }

  cell.addEventListener('click', () => {
    openElementModal(element);
  });

  return cell;
}

/**
 * 2. 전역 메인 뷰 전환 컨트롤러 (상단 탭, 모바일 하단 바, 외부 시뮬레이터 모두 100% 동기화)
 */
window.switchMainView = function(targetId) {
  const screenContainer = document.getElementById('screenContainer');
  const twoPagesPrintContainer = document.getElementById('twoPagesPrintContainer');
  const cardExplorerContainer = document.getElementById('cardExplorerContainer');
  const quizContainer = document.getElementById('quizContainer');
  const themeBtns = document.querySelectorAll('.theme-tab-btn');
  const bottomNavItems = document.querySelectorAll('.mobile-bottom-nav .bottom-nav-item');
  const zoomFab = document.getElementById('mobileZoomToggleFab');

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
    // 전체 N장 뷰
    document.body.classList.add('view-mode-split');
    if (twoPagesPrintContainer) twoPagesPrintContainer.style.display = 'flex';
    if (zoomFab) zoomFab.style.display = 'none';
  } else if (targetId === 'cards') {
    // 📱 모바일 카드 탐색기 뷰
    if (cardExplorerContainer) {
      cardExplorerContainer.style.display = 'block';
      if (typeof initCardExplorer === 'function') initCardExplorer();
    }
    if (zoomFab) zoomFab.style.display = 'none';
  } else if (targetId === 'quiz') {
    // 🎯 원소 퀴즈 뷰
    if (quizContainer) {
      quizContainer.style.display = 'block';
      if (typeof initQuiz === 'function') initQuiz();
    }
    if (zoomFab) zoomFab.style.display = 'none';
  } else {
    // 주기율표 편별 뷰 (0~7)
    if (screenContainer) screenContainer.style.display = 'block';
    const tid = parseInt(targetId, 10);
    initPeriodicTable(isNaN(tid) ? 1 : tid);
    if (zoomFab) zoomFab.style.display = 'flex';
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

  // 현재 선택된 편 인쇄 (A4 1장 전용)
  if (printCurrentBtn) {
    printCurrentBtn.addEventListener('click', () => {
      const pageToPrint = (currentThemeId === 'all') ? 1 : currentThemeId;
      window.open(`print-multi.html?page=${pageToPrint}&print=true`, '_blank');
    });
  }

  // 전체 N장 일괄 인쇄 (A4 5장 세트)
  if (printAllBtn) {
    printAllBtn.addEventListener('click', () => {
      window.open('print-multi.html?print=true', '_blank');
    });
  }
}

/**
 * 4. 기존 2장 분할 뷰 초기화 (하위 호환)
 */
function initSplitPages() {
  renderSplitGrid('splitGrid1', 'splitLanthanide1', 'splitActinide1', (el) => createElementCellByTheme(el, 1));
  renderSplitGrid('splitGrid2', 'splitLanthanide2', 'splitActinide2', (el) => createElementCellByTheme(el, 2));
  renderSplitLegend('splitLegend1');
  renderSplitLegend('splitLegend2');
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

      const found = ELEMENTS_DATA.find(el => {
        if (el.atomicNumber >= 57 && el.atomicNumber <= 71) return false;
        if (el.atomicNumber >= 89 && el.atomicNumber <= 103) return false;
        return el.period === period && el.group === group;
      });

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
 * 5. 하단 7개 족 범례 렌더링
 */
let activeCategoryFilter = null;

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
  const allCells = document.querySelectorAll('.element-cell');

  if (activeCategoryFilter === categoryId) {
    activeCategoryFilter = null;
    legendCards.forEach(c => c.classList.remove('active'));
    allCells.forEach(cell => {
      cell.classList.remove('is-dimmed');
      cell.classList.remove('is-highlighted');
    });
  } else {
    activeCategoryFilter = categoryId;
    legendCards.forEach(c => {
      if (c.dataset.categoryId === categoryId) c.classList.add('active');
      else c.classList.remove('active');
    });

    allCells.forEach(cell => {
      if (cell.dataset.category === categoryId) {
        cell.classList.remove('is-dimmed');
        cell.classList.add('is-highlighted');
      } else {
        cell.classList.add('is-dimmed');
        cell.classList.remove('is-highlighted');
      }
    });
  }
}

/**
 * 6. 검색 및 필터
 */
function initSearchAndFilter() {
  const searchInput = document.getElementById('searchInput');
  const searchBar = document.querySelector('.search-bar');
  const clearBtn = document.getElementById('clearSearchBtn');
  const pillBtns = document.querySelectorAll('.pill-btn');

  if (!searchInput) return;

  let currentTypeFilter = 'all';

  function applyFilters() {
    const query = searchInput.value.trim().toLowerCase();
    const allCells = document.querySelectorAll('#mainPeriodicTable .element-cell, #lanthanideElements .element-cell, #actinideElements .element-cell');

    if (query.length > 0) {
      searchBar.classList.add('has-value');
    } else {
      searchBar.classList.remove('has-value');
    }

    allCells.forEach(cell => {
      let matchesSearch = true;
      let matchesType = true;

      if (query.length > 0) {
        const num = cell.dataset.atomicNumber;
        const sym = cell.dataset.symbol;
        const ko = cell.dataset.nameKo;
        const alt = cell.dataset.altNameKo;
        const en = cell.dataset.nameEn;

        matchesSearch = (
          num.includes(query) ||
          sym.includes(query) ||
          ko.includes(query) ||
          alt.includes(query) ||
          en.includes(query)
        );
      }

      if (currentTypeFilter === 'radioactive') {
        matchesType = (cell.dataset.radioactive === 'true');
      }

      let matchesCat = true;
      if (activeCategoryFilter) {
        matchesCat = (cell.dataset.category === activeCategoryFilter);
      }

      if (matchesSearch && matchesType && matchesCat) {
        cell.classList.remove('is-dimmed');
        if (query.length > 0 || currentTypeFilter === 'radioactive') {
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

  searchInput.addEventListener('input', applyFilters);

  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    applyFilters();
    searchInput.focus();
  });

  pillBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      pillBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTypeFilter = btn.dataset.filter;
      applyFilters();
    });
  });
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

// 118개 원소 표준 주양자수 전자 껍질(K, L, M, N, O, P, Q) 데이터셋
const BOHR_SHELLS_DATA = {
  1: [1], 2: [2], 3: [2,1], 4: [2,2], 5: [2,3], 6: [2,4], 7: [2,5], 8: [2,6], 9: [2,7], 10: [2,8],
  11: [2,8,1], 12: [2,8,2], 13: [2,8,3], 14: [2,8,4], 15: [2,8,5], 16: [2,8,6], 17: [2,8,7], 18: [2,8,8],
  19: [2,8,8,1], 20: [2,8,8,2], 21: [2,8,9,2], 22: [2,8,10,2], 23: [2,8,11,2], 24: [2,8,13,1], 25: [2,8,13,2],
  26: [2,8,14,2], 27: [2,8,15,2], 28: [2,8,16,2], 29: [2,8,18,1], 30: [2,8,18,2], 31: [2,8,18,3], 32: [2,8,18,4],
  33: [2,8,18,5], 34: [2,8,18,6], 35: [2,8,18,7], 36: [2,8,18,8],
  37: [2,8,18,8,1], 38: [2,8,18,8,2], 39: [2,8,18,9,2], 40: [2,8,18,10,2], 41: [2,8,18,12,1], 42: [2,8,18,13,1],
  43: [2,8,18,13,2], 44: [2,8,18,15,1], 45: [2,8,18,16,1], 46: [2,8,18,18], 47: [2,8,18,18,1], 48: [2,8,18,18,2],
  49: [2,8,18,18,3], 50: [2,8,18,18,4], 51: [2,8,18,18,5], 52: [2,8,18,18,6], 53: [2,8,18,18,7], 54: [2,8,18,18,8],
  55: [2,8,18,18,8,1], 56: [2,8,18,18,8,2], 57: [2,8,18,18,9,2], 58: [2,8,18,19,9,2], 59: [2,8,18,21,8,2],
  60: [2,8,18,22,8,2], 61: [2,8,18,23,8,2], 62: [2,8,18,24,8,2], 63: [2,8,18,25,8,2], 64: [2,8,18,25,9,2],
  65: [2,8,18,27,8,2], 66: [2,8,18,28,8,2], 67: [2,8,18,29,8,2], 68: [2,8,18,30,8,2], 69: [2,8,18,31,8,2],
  70: [2,8,18,32,8,2], 71: [2,8,18,32,9,2], 72: [2,8,18,32,10,2], 73: [2,8,18,32,11,2], 74: [2,8,18,32,12,2],
  75: [2,8,18,32,13,2], 76: [2,8,18,32,14,2], 77: [2,8,18,32,15,2], 78: [2,8,18,32,17,1], 79: [2,8,18,32,18,1],
  80: [2,8,18,32,18,2], 81: [2,8,18,32,18,3], 82: [2,8,18,32,18,4], 83: [2,8,18,32,18,5], 84: [2,8,18,32,18,6],
  85: [2,8,18,32,18,7], 86: [2,8,18,32,18,8],
  87: [2,8,18,32,18,8,1], 88: [2,8,18,32,18,8,2], 89: [2,8,18,32,18,9,2], 90: [2,8,18,32,18,10,2],
  91: [2,8,18,32,20,9,2], 92: [2,8,18,32,21,9,2], 93: [2,8,18,32,22,9,2], 94: [2,8,18,32,24,8,2],
  95: [2,8,18,32,25,8,2], 96: [2,8,18,32,25,9,2], 97: [2,8,18,32,27,8,2], 98: [2,8,18,32,28,8,2],
  99: [2,8,18,32,29,8,2], 100: [2,8,18,32,30,8,2], 101: [2,8,18,32,31,8,2], 102: [2,8,18,32,32,8,2],
  103: [2,8,18,32,32,8,3], 104: [2,8,18,32,32,10,2], 105: [2,8,18,32,32,11,2], 106: [2,8,18,32,32,12,2],
  107: [2,8,18,32,32,13,2], 108: [2,8,18,32,32,14,2], 109: [2,8,18,32,32,15,2], 110: [2,8,18,32,32,16,2],
  111: [2,8,18,32,32,17,2], 112: [2,8,18,32,32,18,2], 113: [2,8,18,32,32,18,3], 114: [2,8,18,32,32,18,4],
  115: [2,8,18,32,32,18,5], 116: [2,8,18,32,32,18,6], 117: [2,8,18,32,32,18,7], 118: [2,8,18,32,32,18,8]
};

const SHELL_NAMES = ['K', 'L', 'M', 'N', 'O', 'P', 'Q'];

/**
 * 보어 원자 모형 SVG 동적 렌더러
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
 * Web Speech API TTS 발음 재생기
 */
function speakElementName(lang = 'ko-KR') {
  if (!('speechSynthesis' in window)) {
    alert('현재 브라우저에서는 음성 합성(TTS)을 지원하지 않습니다.');
    return;
  }
  const element = elementsMap.get(currentModalAtomicNumber);
  if (!element) return;

  window.speechSynthesis.cancel();
  const text = (lang === 'ko-KR') ? element.nameKo : element.nameEn;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.9;
  utterance.pitch = 1.0;

  const btn = (lang === 'ko-KR') ? document.getElementById('modalSpeakKoBtn') : document.getElementById('modalSpeakEnBtn');
  if (btn) btn.classList.add('speaking');

  utterance.onend = () => {
    if (btn) btn.classList.remove('speaking');
  };
  utterance.onerror = () => {
    if (btn) btn.classList.remove('speaking');
  };

  window.speechSynthesis.speak(utterance);
}

function updateModalContent(atomicNum) {
  const element = elementsMap.get(atomicNum);
  if (!element) return;
  currentModalAtomicNumber = atomicNum;

  const modal = document.getElementById('elementModal');
  const cat = CATEGORIES[element.category] || {};

  document.getElementById('modalNum').textContent = element.atomicNumber;
  document.getElementById('modalSymbol').textContent = element.symbol;
  document.getElementById('modalSymbol').style.borderColor = cat.color || '#38bdf8';
  document.getElementById('modalSymbol').style.color = cat.color || '#38bdf8';

  document.getElementById('modalNameKo').textContent = element.nameKo;

  const altBadge = document.getElementById('modalAltNameKo');
  if (element.altNameKo) {
    altBadge.textContent = `이명: ${element.altNameKo}`;
    altBadge.style.display = 'inline-block';
  } else {
    altBadge.style.display = 'none';
  }

  document.getElementById('modalNameEn').textContent = element.nameEn;
  document.getElementById('modalCategoryName').textContent = cat.nameKo || '';

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

  if (photoImg && photoFallback) {
    if (element.photo) {
      photoImg.src = element.photo;
      photoImg.alt = `${element.nameKo} 실제 표본 사진`;
      photoImg.style.display = 'block';
      photoFallback.classList.add('hidden');
      photoImg.onerror = () => {
        photoImg.style.display = 'none';
        photoFallback.classList.remove('hidden');
        photoFallback.textContent = `${element.symbol} 표본 이미지 준비 중`;
      };
    } else {
      photoImg.style.display = 'none';
      photoFallback.classList.remove('hidden');
      photoFallback.textContent = `표본 미제공 (${element.symbol})`;
    }
  }

  if (lookTextEl) {
    lookTextEl.textContent = element.look || '외형 정보 준비 중';
  }
  if (itemTextEl) {
    itemTextEl.textContent = `${element.icon || '🧪'} ${element.item || element.nameKo} (활용처: ${element.usage || element.nameKo})`;
  }

  // 보어 원자 모형(전자 껍질 회전 애니메이션) 렌더링
  renderBohrModel(element.atomicNumber, element.symbol, cat.color || '#38bdf8');

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

  modal.classList.remove('hidden');
}

function openElementModal(element) {
  if (!element || !element.atomicNumber) return;
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
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

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

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentModalAtomicNumber > 1) {
        updateModalContent(currentModalAtomicNumber - 1);
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (currentModalAtomicNumber < 118) {
        updateModalContent(currentModalAtomicNumber + 1);
      }
    });
  }

  // 키보드 좌우 방향키로 이전/다음 이동, ESC로 닫기
  document.addEventListener('keydown', (e) => {
    if (modal.classList.contains('hidden')) return;
    if (e.key === 'Escape') {
      modal.classList.add('hidden');
    } else if (e.key === 'ArrowLeft' && currentModalAtomicNumber > 1) {
      updateModalContent(currentModalAtomicNumber - 1);
    } else if (e.key === 'ArrowRight' && currentModalAtomicNumber < 118) {
      updateModalContent(currentModalAtomicNumber + 1);
    }
  });

  // 모바일 스와이프(좌우 터치 넘기기) 제스처 지원
  let touchStartX = 0;
  let touchStartY = 0;
  const modalCard = modal.querySelector('.modal-card');
  if (modalCard) {
    modalCard.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    modalCard.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].screenX;
      const touchEndY = e.changedTouches[0].screenY;
      const diffX = touchEndX - touchStartX;
      const diffY = touchEndY - touchStartY;

      // 수평 스와이프 감지 (최소 50px 이상 이동 및 수평 이동이 수직보다 클 때)
      if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > 0 && currentModalAtomicNumber > 1) {
          // 오른쪽으로 스와이프 ➔ 이전 원소
          updateModalContent(currentModalAtomicNumber - 1);
        } else if (diffX < 0 && currentModalAtomicNumber < 118) {
          // 왼쪽으로 스와이프 ➔ 다음 원소
          updateModalContent(currentModalAtomicNumber + 1);
        }
      }
    }, { passive: true });
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
  const header = document.querySelector('.app-header');
  const headerHeight = header ? header.offsetHeight : 105;
  const availW = window.innerWidth - 32; // 좌우 안전 여백
  const availH = window.innerHeight - headerHeight - 32; // 상하 안전 여백

  // 전체 주기율표 종횡비 (가로 18.6열 : 세로 약 12.2단위) -> 약 1.52 : 1
  // 세로와 가로 양방향 모두 넘치지 않도록 최적 너비 산출
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
  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    // 폰 화면에서는 글자가 시원하게 읽히도록 160% 적정 확대로 시작
    applyScreenScale(1.6, false);
  } else {
    // PC 화면에서는 전체 맞춤으로 시작
    fitScreenProportionally();
  }

  // 창 크기 변경 시 화면 맞춤 모드 유지 중이면 자동 재연산
  window.addEventListener('resize', () => {
    if (isFitMode && window.innerWidth > 768) {
      fitScreenProportionally();
    }
  });

  // 모바일 앱 환경 최적화 및 FAB/하단 탭 바 초기화
  initMobileAppExperience();
}

/**
 * 10. 시니어 앱 디자이너 관점: 진정한 모바일 앱 UX 환경 고도화
 * - 앱/모바일 환경에서 불필요한 웹 전용 UI(인쇄, 종합1장판, 앱설치버튼) 자동 제거
 * - 원터치 전체보기 ↔ 확대보기 플로팅 토글 (FAB)
 * - 스마트폰 엄지손가락 친화적 하단 고정 탭 바 (Bottom Navigation)
 */
function initMobileAppExperience() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                       window.navigator.standalone || 
                       window.location.search.includes('mode=app');
  const isMobile = window.innerWidth <= 768 || isStandalone;

  if (isMobile) {
    document.body.classList.add('mobile-app-mode');

    // 1) 앱 안에서 '앱 설치' 버튼이 노출되는 어색함 100% 제거
    const installBtn = document.getElementById('installAppBtn');
    if (installBtn && isStandalone) {
      installBtn.style.setProperty('display', 'none', 'important');
    }

    // 2) 웹 인쇄용 버튼 및 인쇄 전용 탭 숨김
    const printActions = document.querySelector('.print-actions');
    if (printActions) printActions.style.display = 'none';

    const printTab0 = document.querySelector('button[data-theme-id="0"]');
    if (printTab0) printTab0.style.display = 'none';

    const printTabAll = document.querySelector('button[data-theme-id="all"]');
    if (printTabAll) printTabAll.style.display = 'none';

    // 3) 모바일 첫 진입 시 '1편: 기본명칭' 탭을 기본 활성화 (종합판 대신 모바일에 가장 적합)
    const tab1 = document.querySelector('button[data-theme-id="1"]');
    if (tab1 && printTab0 && printTab0.classList.contains('active')) {
      tab1.click();
    }
  }

  // 4) 원터치 전체보기 / 확대 토글 플로팅 버튼 (FAB)
  const zoomFab = document.getElementById('mobileZoomToggleFab');
  const fabIcon = document.getElementById('mobileZoomFabIcon');
  const fabText = document.getElementById('mobileZoomFabText');

  function updateFabState() {
    if (!zoomFab) return;
    if (screenScaleFactor >= 1.2) {
      // 현재 확대 상태 ➔ 누르면 전체보기로 전환
      if (fabIcon) fabIcon.textContent = '🔍';
      if (fabText) fabText.textContent = '전체보기';
    } else {
      // 현재 전체보기 상태 ➔ 누르면 확대보기로 전환
      if (fabIcon) fabIcon.textContent = '🔎';
      if (fabText) fabText.textContent = '확대보기';
    }
  }

  if (zoomFab) {
    zoomFab.addEventListener('click', () => {
      if (screenScaleFactor >= 1.2) {
        // 전체보기 모드로 축소 맞춤 (모바일 한눈에 조감)
        const availW = window.innerWidth - 24;
        const optimalFactor = Math.max(0.55, availW / BASE_TABLE_WIDTH);
        applyScreenScale(optimalFactor, true);
      } else {
        // 시원하게 읽히는 160% 가독성 확대 모드로 전환
        applyScreenScale(1.6, false);
      }
      updateFabState();
    });
    updateFabState();
  }

  // 5) 모바일 하단 고정 네비게이션 바 (Bottom Navigation)
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

  if (bottomSearchBtn && searchInput) {
    bottomSearchBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      searchInput.focus();
    });
  }
}
