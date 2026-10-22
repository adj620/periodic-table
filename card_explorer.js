/**
 * 모바일 카드 탐색기 (Mobile Card Explorer)
 * - 좁은 화면에서도 글자가 1픽셀도 잘리지 않고 시원하게 정보를 확인할 수 있는 모바일 최적화 뷰
 */

let cardExplorerCurrentIndex = 0;
let cardExplorerFilteredList = [];
let cardExplorerViewMode = 'grid'; // 'grid' | 'single'

function initCardExplorer() {
  const container = document.getElementById('cardExplorerContainer');
  if (!container) return;

  // 전체 118개 원소 목록 생성 (기본 atomicNumber 순)
  cardExplorerFilteredList = Array.from(elementsMap.values()).sort((a, b) => a.atomicNumber - b.atomicNumber);
  
  renderCardExplorerControls();
  renderCardExplorerView();
}

/**
 * 카드 탐색기 상단 필터 및 모드 컨트롤 렌더링
 */
function renderCardExplorerControls() {
  const controlsEl = document.getElementById('cardExplorerControls');
  if (!controlsEl) return;

  controlsEl.innerHTML = `
    <div class="card-explorer-toolbar">
      <div class="toolbar-search-row">
        <div class="card-search-wrap">
          <span class="search-icon">🔍</span>
          <input type="text" id="cardSearchInput" placeholder="원소 검색 (기호, 이름, 번호, 이명)..." autocomplete="off" />
          <button id="cardClearSearchBtn" class="clear-btn">✕</button>
        </div>
        <div class="card-view-mode-btns">
          <button id="viewGridBtn" class="mode-toggle-btn ${cardExplorerViewMode === 'grid' ? 'active' : ''}" title="전체 카드 그리드 보기">격자 목록</button>
          <button id="viewSingleBtn" class="mode-toggle-btn ${cardExplorerViewMode === 'single' ? 'active' : ''}" title="1개씩 집중 넘겨보기">카드 넘기기</button>
        </div>
      </div>

      <div class="toolbar-filter-row">
        <div class="category-filter-scroll">
          <button class="cat-pill active" data-cat="all">전체 (118)</button>
          <button class="cat-pill" data-cat="alkali">알칼리 금속</button>
          <button class="cat-pill" data-cat="alkalineEarth">알칼리 토금속</button>
          <button class="cat-pill" data-cat="transition">전이 금속</button>
          <button class="cat-pill" data-cat="postTransition">전이후 금속</button>
          <button class="cat-pill" data-cat="metalloid">준금속</button>
          <button class="cat-pill" data-cat="nonmetal">비금속/할로젠</button>
          <button class="cat-pill" data-cat="nobleGas">비활성 기체</button>
          <button class="cat-pill rad-pill" data-cat="radioactive">☢️ 방사성 원소</button>
        </div>
        <div class="sort-select-wrap">
          <select id="cardSortSelect" class="card-sort-select">
            <option value="num-asc">원자번호순 (1→118)</option>
            <option value="num-desc">원자번호 역순 (118→1)</option>
            <option value="name-asc">한글 이름순 (가→하)</option>
            <option value="mass-asc">원자량 가벼운순</option>
            <option value="mass-desc">원자량 무거운순</option>
          </select>
        </div>
      </div>
    </div>
  `;

  // 이벤트 바인딩
  const searchInput = document.getElementById('cardSearchInput');
  const clearBtn = document.getElementById('cardClearSearchBtn');
  const sortSelect = document.getElementById('cardSortSelect');
  const catPills = controlsEl.querySelectorAll('.cat-pill');
  const viewGridBtn = document.getElementById('viewGridBtn');
  const viewSingleBtn = document.getElementById('viewSingleBtn');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      if (clearBtn) clearBtn.style.display = q ? 'block' : 'none';
      filterCardExplorerList();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearBtn.style.display = 'none';
      filterCardExplorerList();
      searchInput.focus();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      sortCardExplorerList(sortSelect.value);
      renderCardExplorerView();
    });
  }

  catPills.forEach(pill => {
    pill.addEventListener('click', () => {
      catPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      filterCardExplorerList();
    });
  });

  if (viewGridBtn) {
    viewGridBtn.addEventListener('click', () => {
      cardExplorerViewMode = 'grid';
      viewGridBtn.classList.add('active');
      if (viewSingleBtn) viewSingleBtn.classList.remove('active');
      renderCardExplorerView();
    });
  }

  if (viewSingleBtn) {
    viewSingleBtn.addEventListener('click', () => {
      cardExplorerViewMode = 'single';
      viewSingleBtn.classList.add('active');
      if (viewGridBtn) viewGridBtn.classList.remove('active');
      renderCardExplorerView();
    });
  }
}

/**
 * 검색어 및 카테고리 필터링
 */
function filterCardExplorerList() {
  const searchInput = document.getElementById('cardSearchInput');
  const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
  const activeCatPill = document.querySelector('.category-filter-scroll .cat-pill.active');
  const selectedCat = activeCatPill ? activeCatPill.dataset.cat : 'all';
  const sortSelect = document.getElementById('cardSortSelect');
  const sortVal = sortSelect ? sortSelect.value : 'num-asc';

  let list = Array.from(elementsMap.values());

  if (selectedCat === 'radioactive') {
    list = list.filter(el => el.isRadioactive);
  } else if (selectedCat !== 'all') {
    list = list.filter(el => el.category === selectedCat);
  }

  if (query) {
    list = list.filter(el => {
      const numMatch = el.atomicNumber.toString() === query;
      const symbolMatch = el.symbol.toLowerCase().includes(query);
      const nameKoMatch = el.nameKo.toLowerCase().includes(query);
      const altMatch = (el.altNameKo || '').toLowerCase().includes(query);
      const nameEnMatch = el.nameEn.toLowerCase().includes(query);
      const itemMatch = (el.item || '').toLowerCase().includes(query);
      return numMatch || symbolMatch || nameKoMatch || altMatch || nameEnMatch || itemMatch;
    });
  }

  cardExplorerFilteredList = list;
  sortCardExplorerList(sortVal);
  cardExplorerCurrentIndex = 0;
  renderCardExplorerView();
}

/**
 * 정렬 처리
 */
function sortCardExplorerList(sortVal) {
  if (sortVal === 'num-asc') {
    cardExplorerFilteredList.sort((a, b) => a.atomicNumber - b.atomicNumber);
  } else if (sortVal === 'num-desc') {
    cardExplorerFilteredList.sort((a, b) => b.atomicNumber - a.atomicNumber);
  } else if (sortVal === 'name-asc') {
    cardExplorerFilteredList.sort((a, b) => a.nameKo.localeCompare(b.nameKo, 'ko'));
  } else if (sortVal === 'mass-asc') {
    cardExplorerFilteredList.sort((a, b) => parseFloat(a.atomicMass.replace(/[^0-9.]/g, '')) - parseFloat(b.atomicMass.replace(/[^0-9.]/g, '')));
  } else if (sortVal === 'mass-desc') {
    cardExplorerFilteredList.sort((a, b) => parseFloat(b.atomicMass.replace(/[^0-9.]/g, '')) - parseFloat(a.atomicMass.replace(/[^0-9.]/g, '')));
  }
}

/**
 * 카드 탐색기 메인 화면 렌더링 (그리드 모드 vs 단일 카드 스와이프 모드)
 */
function renderCardExplorerView() {
  const contentEl = document.getElementById('cardExplorerContent');
  if (!contentEl) return;

  if (cardExplorerFilteredList.length === 0) {
    contentEl.innerHTML = `
      <div class="card-empty-state">
        <span class="empty-icon">🔍</span>
        <h3>검색 조건에 맞는 원소가 없습니다</h3>
        <p>다른 검색어 또는 다른 카테고리를 선택해 보세요.</p>
      </div>
    `;
    return;
  }

  if (cardExplorerViewMode === 'grid') {
    // 1) 전체 카드 반응형 그리드 뷰
    let cardsHtml = cardExplorerFilteredList.map(el => createFullCardHtml(el)).join('');
    contentEl.innerHTML = `
      <div class="card-count-banner">
        <span>총 <strong>${cardExplorerFilteredList.length}</strong>개의 원소가 표시 중입니다.</span>
      </div>
      <div class="explorer-grid">
        ${cardsHtml}
      </div>
    `;
  } else {
    // 2) 단일 집중 카드 뷰 (이전/다음 네비게이션)
    const currentEl = cardExplorerFilteredList[cardExplorerCurrentIndex] || cardExplorerFilteredList[0];
    contentEl.innerHTML = `
      <div class="single-card-view-wrap">
        <div class="single-card-nav">
          <button id="singlePrevBtn" class="nav-arrow-btn" ${cardExplorerCurrentIndex === 0 ? 'disabled' : ''}>◀ 이전 원소</button>
          <span class="card-page-indicator"><strong>${cardExplorerCurrentIndex + 1}</strong> / ${cardExplorerFilteredList.length}</span>
          <button id="singleNextBtn" class="nav-arrow-btn" ${cardExplorerCurrentIndex === cardExplorerFilteredList.length - 1 ? 'disabled' : ''}>다음 원소 ▶</button>
        </div>
        <div class="single-card-container">
          ${createFullCardHtml(currentEl, true)}
        </div>
      </div>
    `;

    const prevBtn = document.getElementById('singlePrevBtn');
    const nextBtn = document.getElementById('singleNextBtn');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (cardExplorerCurrentIndex > 0) {
          cardExplorerCurrentIndex--;
          renderCardExplorerView();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (cardExplorerCurrentIndex < cardExplorerFilteredList.length - 1) {
          cardExplorerCurrentIndex++;
          renderCardExplorerView();
        }
      });
    }

    // 모바일 터치 스와이프로 카드 넘기기 제스처 지원
    const singleCardEl = contentEl.querySelector('.single-card-container');
    if (singleCardEl) {
      let touchStartX = 0;
      let touchStartY = 0;
      singleCardEl.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
      }, { passive: true });

      singleCardEl.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].screenX;
        const touchEndY = e.changedTouches[0].screenY;
        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;

        if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
          if (diffX > 0 && cardExplorerCurrentIndex > 0) {
            // 오른쪽으로 밀기 ➔ 이전 원소
            cardExplorerCurrentIndex--;
            renderCardExplorerView();
          } else if (diffX < 0 && cardExplorerCurrentIndex < cardExplorerFilteredList.length - 1) {
            // 왼쪽으로 밀기 ➔ 다음 원소
            cardExplorerCurrentIndex++;
            renderCardExplorerView();
          }
        }
      }, { passive: true });
    }
  }

  // TTS 음성 듣기 버튼 이벤트 바인딩
  const ttsBtns = contentEl.querySelectorAll('.card-tts-mini-btn');
  ttsBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const ko = btn.dataset.ko;
      const en = btn.dataset.en;
      if (ko) speakCardExplorerName(ko, 'ko-KR');
      else if (en) speakCardExplorerName(en, 'en-US');
    });
  });

  // 카드 클릭 시 상세 모달 연동
  const cards = contentEl.querySelectorAll('.element-full-card');
  cards.forEach(card => {
    card.addEventListener('click', (e) => {
      // 버튼 클릭 시 중복 모달 오픈 방지
      if (e.target.closest('button, a')) return;
      const btn = card.querySelector('.card-modal-open-btn');
      const num = parseInt(btn?.dataset.num, 10);
      const el = elementsMap.get(num);
      if (el && typeof openElementModal === 'function') {
        openElementModal(el);
      }
    });
  });

  const detailBtns = contentEl.querySelectorAll('.card-modal-open-btn');
  detailBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const num = parseInt(btn.dataset.num, 10);
      const el = elementsMap.get(num);
      if (el && typeof openElementModal === 'function') {
        openElementModal(el);
      }
    });
  });
}

/**
 * 카드 탐색기 전용 Web Speech API TTS 발음 재생기
 */
function speakCardExplorerName(text, lang = 'ko-KR') {
  if (!('speechSynthesis' in window)) {
    alert('현재 브라우저에서는 음성 합성(TTS) 기능을 지원하지 않습니다.');
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.9;
  utterance.pitch = 1.0;
  window.speechSynthesis.speak(utterance);
}

/**
 * 단일 원소의 대형 백과사전식 카드 HTML 생성
 * - 실제 표본 사진, 실물 외형, 실생활 대표 물건/용도, 특징 설명, 전자 껍질 구조, 9대 물리화학 스펙 전면 통합
 */
function createFullCardHtml(el, isSingle = false) {
  const catObj = (typeof CATEGORIES !== 'undefined' && CATEGORIES[el.category]) || { nameKo: el.category, color: '#38bdf8' };
  const cleanAlt = el.altNameKo ? `[${el.altNameKo.split('/')[0].split('(')[0].trim()}]` : '';
  const radBadge = el.isRadioactive ? '<span class="card-rad-badge" title="방사성 원소">☢️ 방사성 원소</span>' : '';
  const photoUrl = el.photo || '';
  const itemIcon = el.icon || '🧪';
  const itemName = el.item || el.nameKo;

  // 보어 전자 껍질(K, L, M, N...) 데이터 계산
  const shells = (typeof BOHR_SHELLS_DATA !== 'undefined' && BOHR_SHELLS_DATA[el.atomicNumber]) || [];
  const shellNames = ['K', 'L', 'M', 'N', 'O', 'P', 'Q'];
  const shellSummaryStr = shells.length
    ? shells.map((cnt, idx) => `${shellNames[idx] || idx + 1}(${cnt})`).join(' · ')
    : el.electronConfig;
  const valenceCount = shells.length ? shells[shells.length - 1] : '-';
  const ency = (typeof ELEMENTS_ENCYCLOPEDIA !== 'undefined' && ELEMENTS_ENCYCLOPEDIA[el.atomicNumber]) || null;

  return `
    <article class="element-full-card ${isSingle ? 'single-mode-card' : ''}" data-cat="${el.category}" style="--card-accent:${catObj.color};">
      <!-- 1. 카드 상단 헤더 바 -->
      <div class="card-header-bar">
        <div class="card-header-left">
          <span class="card-atomic-num">No. ${el.atomicNumber}</span>
          <span class="card-group-period">${el.period}주기 · ${el.group}족</span>
          <span class="card-cat-badge" style="background:${catObj.color}22; color:${catObj.color}; border: 1px solid ${catObj.color}55;">
            ${catObj.nameKo.split('(')[0]}
          </span>
          ${radBadge}
        </div>
        <div class="card-header-right">
          <button class="card-tts-mini-btn" data-ko="${el.nameKo}" title="한글 발음 듣기">🔊 한글</button>
          <button class="card-tts-mini-btn" data-en="${el.nameEn}" title="IUPAC 영문 공식 발음">🗣️ En</button>
          <button class="card-modal-open-btn" data-num="${el.atomicNumber}" title="상세 모달 열기">상세 ↗</button>
        </div>
      </div>

      <!-- 2. 메인 식별 & 실제 표본 사진 통합 영역 -->
      <div class="card-main-body">
        <div class="card-identity-box">
          <div class="card-symbol-badge" style="color:${catObj.color};">${el.symbol}</div>
          <div class="card-names-box">
            <h3 class="card-name-ko">${el.nameKo}</h3>
            ${cleanAlt ? `<span class="card-name-alt">이명: ${cleanAlt}</span>` : ''}
            <span class="card-name-en">${el.nameEn}</span>
          </div>
        </div>

        <div class="card-visual-box">
          ${photoUrl ? `
            <img src="${photoUrl}" alt="${el.nameKo} 실제 표본" class="card-photo-img" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
            <div class="card-icon-fallback" style="display:none;">
              <span class="card-item-emoji">${itemIcon}</span>
              <span class="card-item-label">${itemName}</span>
            </div>
          ` : `
            <div class="card-icon-wrap">
              <span class="card-item-emoji">${itemIcon}</span>
              <span class="card-item-label">${itemName}</span>
            </div>
          `}
        </div>
      </div>

      <!-- 3. 실생활 대표 물건 & 실물 외형 특성 배너 (누락 없이 통합) -->
      <div class="card-realworld-banner">
        <div class="realworld-item-chip">
          <span class="realworld-icon">${itemIcon}</span>
          <div class="realworld-text">
            <strong class="realworld-label">실생활 대표 물건: ${itemName}</strong>
            <span class="realworld-usage">${el.usage ? `활용처: ${el.usage}` : el.description}</span>
          </div>
        </div>
        <div class="realworld-look-chip">
          <span class="look-badge-icon">👁️</span>
          <span class="look-text"><strong>실물 외형 특성:</strong> ${el.look || ((el.isSynthetic || el.atomicNumber >= 99) ? '🔬 인공 합성 원소 (반감기가 극히 짧아 실제 육안 표본 미존재)' : '외형 정보')}</span>
        </div>
      </div>

      <!-- 4. 원소 본연의 특징 및 상세 설명 -->
      <div class="card-desc-box">
        <p class="card-desc-text">${el.description}</p>
      </div>

      ${ency && ency.headline ? `
        <div class="card-ency-headline-box">
          <span class="ency-icon">💡</span>
          <span class="ency-text">${ency.headline}</span>
        </div>
      ` : ''}

      <!-- 5. 보어 전자 껍질 & 최외각 전자 정보 바 -->
      <div class="card-shells-banner">
        <div class="shells-left">
          <span class="shells-title">⚛️ 전자 껍질 (K~Q):</span>
          <span class="shells-val font-mono">${shellSummaryStr}</span>
        </div>
        <span class="valence-chip">최외각: <strong>${valenceCount}개</strong></span>
      </div>

      <!-- 6. 9대 핵심 물리화학적 상세 스펙 테이블 -->
      <div class="card-specs-grid">
        <div class="spec-cell">
          <span class="spec-lbl">원자량</span>
          <span class="spec-val font-mono">${el.atomicMass}</span>
        </div>
        <div class="spec-cell">
          <span class="spec-lbl">상온 상태</span>
          <span class="spec-val">${el.phase || '고체'}</span>
        </div>
        <div class="spec-cell">
          <span class="spec-lbl">전자 배치</span>
          <span class="spec-val font-mono">${el.electronConfig}</span>
        </div>
        <div class="spec-cell">
          <span class="spec-lbl">녹는점</span>
          <span class="spec-val font-mono">${el.melting ? `${el.melting} ℃` : '-'}</span>
        </div>
        <div class="spec-cell">
          <span class="spec-lbl">끓는점</span>
          <span class="spec-val font-mono">${el.boiling ? `${el.boiling} ℃` : '-'}</span>
        </div>
        <div class="spec-cell">
          <span class="spec-lbl">밀도</span>
          <span class="spec-val font-mono">${el.density || '-'}</span>
        </div>
        <div class="spec-cell">
          <span class="spec-lbl">산화수</span>
          <span class="spec-val font-mono">${el.oxStates || '-'}</span>
        </div>
        <div class="spec-cell">
          <span class="spec-lbl">전기음성도</span>
          <span class="spec-val font-mono">${el.en || '-'}</span>
        </div>
        <div class="spec-cell full-width-cell">
          <span class="spec-lbl">발견 연도 및 발견자</span>
          <span class="spec-val">${el.year ? (el.year === '고대' ? '고대' : `${el.year}년`) : '고대'} (${el.discoverer || '미상'})</span>
        </div>
      </div>
    </article>
  `;
}
