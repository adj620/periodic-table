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
 * 2. 상단 테마 탭 (0~7편, N장 뷰, 카드 탐색기, 원소 퀴즈) 토글 제어
 */
function initThemeTabs() {
  const themeBtns = document.querySelectorAll('.theme-tab-btn');
  const screenContainer = document.getElementById('screenContainer');
  const twoPagesPrintContainer = document.getElementById('twoPagesPrintContainer');
  const cardExplorerContainer = document.getElementById('cardExplorerContainer');
  const quizContainer = document.getElementById('quizContainer');

  themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      themeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const themeAttr = btn.dataset.themeId;

      // 1) 모든 메인 뷰 숨김 초기화
      if (screenContainer) screenContainer.style.display = 'none';
      if (twoPagesPrintContainer) twoPagesPrintContainer.style.display = 'none';
      if (cardExplorerContainer) cardExplorerContainer.style.display = 'none';
      if (quizContainer) quizContainer.style.display = 'none';
      document.body.classList.remove('view-mode-split');

      if (themeAttr === 'all') {
        // 전체 N장 뷰
        document.body.classList.add('view-mode-split');
        if (twoPagesPrintContainer) twoPagesPrintContainer.style.display = 'flex';
      } else if (themeAttr === 'cards') {
        // 📱 모바일 카드 탐색기 뷰
        if (cardExplorerContainer) {
          cardExplorerContainer.style.display = 'block';
          if (typeof initCardExplorer === 'function') initCardExplorer();
        }
      } else if (themeAttr === 'quiz') {
        // 🎯 원소 퀴즈 뷰
        if (quizContainer) {
          quizContainer.style.display = 'block';
          if (typeof initQuiz === 'function') initQuiz();
        }
      } else {
        // 개별 주기율표 편별 뷰 (0~7편)
        if (screenContainer) screenContainer.style.display = 'block';
        const tid = parseInt(themeAttr, 10);
        initPeriodicTable(tid);
        if (isFitMode && typeof fitScreenProportionally === 'function') {
          fitScreenProportionally();
        }
      }
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
 * 8. 원소 상세 정보 모달
 */
function initModal() {
  const modal = document.getElementById('elementModal');
  const closeBtn = document.getElementById('modalCloseBtn');
  if (!modal || !closeBtn) return;

  closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      modal.classList.add('hidden');
    }
  });
}

function openElementModal(element) {
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

  modal.classList.remove('hidden');
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

  // 초기 로드 시 자동으로 화면에 딱 맞게 정비례 피팅
  fitScreenProportionally();

  // 창 크기 변경 시 화면 맞춤 모드 유지 중이면 자동 재연산
  window.addEventListener('resize', () => {
    if (isFitMode) {
      fitScreenProportionally();
    }
  });
}
