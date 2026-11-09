/**
 * ⚛️ 원소 주기율표 코어 데이터 통합 & 공통 도메인 유틸리티 (core_utils.js)
 * - 118개 원소 통합 맵(elementsMap) 및 주기-족 O(1) 탐색 맵(elementPositionMap) 단일 진실 공급원(SSOT)
 * - 원소 기호·이온식·영문명 한글 발음 변환 엔진 및 보어 전자 껍질(BOHR_SHELLS_DATA) 상수
 * - 싱글톤 Web Audio API 효과음 합성기 + 모바일 햅틱 + Web Speech API TTS 음성 엔진 통합
 * - 8대 테마(0~7편) 메타데이터 및 원소 타일 공통 렌더러
 */

// =========================================================================
// 1. 🗣️ 원소 기호 · 이온식 · 영문명 한글 발음(Pronunciation) 변환 엔진
// =========================================================================
const ALPHABET_KO_PRON = {
  A: '에이', B: '비', C: '씨', D: '디', E: '이', F: '에프', G: '지',
  H: '에이치', I: '아이', J: '제이', K: '케이', L: '엘', M: '엠', N: '엔',
  O: '오', P: '피', Q: '큐', R: '알', S: '에스', T: '티', U: '유',
  V: '브이', W: '더블유', X: '엑스', Y: '와이', Z: '제트'
};

const SUB_SUP_DIGIT_PRON = {
  '₂': '투', '₃': '쓰리', '₄': '포', '₅': '파이브', '₆': '식스', '₇': '세븐', '₈': '에잇',
  '2': '투', '3': '쓰리', '4': '포', '5': '파이브', '6': '식스', '7': '세븐', '8': '에잇'
};

// 1~118번 원소 영문명(nameEn)의 한글 발음 사전
const ELEMENT_EN_PRON_MAP = {
  1: '하이드로젠', 2: '힐륨', 3: '리튬', 4: '베릴륨', 5: '보론', 6: '카본', 7: '나이트로젠', 8: '옥시젠', 9: '플루오린', 10: '네온',
  11: '소듐', 12: '마그네슘', 13: '알루미늄', 14: '실리콘', 15: '포스포러스', 16: '설퍼', 17: '클로린', 18: '아르곤', 19: '포타슘', 20: '칼슘',
  21: '스칸듐', 22: '타이타늄', 23: '바나듐', 24: '크로뮴', 25: '망가니즈', 26: '아이언', 27: '코발트', 28: '니켈', 29: '카퍼', 30: '징크',
  31: '갈륨', 32: '저마늄', 33: '아세닉', 34: '셀레늄', 35: '브로민', 36: '크립톤', 37: '루비듐', 38: '스트론튬', 39: '이트륨', 40: '지르코늄',
  41: '나이오븀', 42: '몰리브데넘', 43: '테크네튬', 44: '루테늄', 45: '로듐', 46: '팔라듐', 47: '실버', 48: '카드뮴', 49: '인듐', 50: '틴',
  51: '안티모니', 52: '텔루륨', 53: '아이오다인', 54: '제논', 55: '세슘', 56: '바륨', 57: '란타넘', 58: '세륨', 59: '프라세오디뮴', 60: '네오디뮴',
  61: '프로메튬', 62: '사마륨', 63: '유로퓸', 64: '가돌리늄', 65: '터븀', 66: '디스프로슘', 67: '홀뮴', 68: '어븀', 69: '툴륨', 70: '이터븀',
  71: '루테튬', 72: '하프늄', 73: '탄탈럼', 74: '텅스텐', 75: '레늄', 76: '오스뮴', 77: '이리듐', 78: '플래티넘', 79: '골드', 80: '머큐리',
  81: '탈륨', 82: '레드', 83: '비스무트', 84: '폴로늄', 85: '아스타틴', 86: '라돈', 87: '프랑슘', 88: '라듐', 89: '악티늄', 90: '토륨',
  91: '프로탁티늄', 92: '유레이늄', 93: '넵투늄', 94: '플루토늄', 95: '아메리슘', 96: '퀴륨', 97: '버클륨', 98: '캘리포늄', 99: '아인슈타이늄', 100: '페르뮴',
  101: '멘델레븀', 102: '노벨륨', 103: '로렌슘', 104: '러더포듐', 105: '더브늄', 106: '시보귬', 107: '보륨', 108: '하슘', 109: '마이트너륨', 110: '다름슈타튬',
  111: '뢴트게늄', 112: '코페르니슘', 113: '니호늄', 114: '플레로븀', 115: '모스코븀', 116: '리버모륨', 117: '테네신', 118: '오가네손'
};

/**
 * 원소 기호, 이온 기호, 화학식(예: Na, Fe, Na⁺, SO₄²⁻, H₂O, 2NaOH⁻)을 한글 발음으로 변환
 */
function getSymbolPronunciationKo(rawSym) {
  if (!rawSym) return '';
  let s = String(rawSym).trim();
  if (s === 'e⁻') return '이 마이너스';

  const opOnly = {
    '+': '더하기', '-': '마이너스', '×': '곱하기', '÷': '나누기', '➔': '화살표', '=': '화살표',
    '(': '괄호열고', ')': '괄호닫고',
    '⁺': '플러스', '⁻': '마이너스',
    '²⁺': '투플러스', '²⁻': '투마이너스',
    '³⁺': '쓰리플러스', '³⁻': '쓰리마이너스',
    '⁴⁺': '포플러스', '⁴⁻': '포마이너스'
  };
  if (opOnly[s]) return opOnly[s];

  let chargeSuffix = '';
  const chargePatterns = [
    ['⁸⁺', ' 에잇플러스'], ['⁷⁺', ' 세븐플러스'], ['⁶⁺', ' 식스플러스'], ['⁵⁺', ' 파이브플러스'],
    ['⁴⁺', ' 포플러스'], ['⁴⁻', ' 포마이너스'],
    ['³⁺', ' 쓰리플러스'], ['³⁻', ' 쓰리마이너스'],
    ['²⁺', ' 투플러스'], ['²⁻', ' 투마이너스'],
    ['⁺', ' 플러스'], ['⁻', ' 마이너스']
  ];
  for (const [pat, pron] of chargePatterns) {
    if (s.endsWith(pat)) {
      chargeSuffix = pron;
      s = s.slice(0, -pat.length);
      break;
    }
  }

  let out = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const upper = ch.toUpperCase();
    if (ALPHABET_KO_PRON[upper]) {
      out += ALPHABET_KO_PRON[upper];
    } else if (SUB_SUP_DIGIT_PRON[ch]) {
      out += SUB_SUP_DIGIT_PRON[ch];
    } else if (ch === '(' || ch === '[' || ch === ')' || ch === ']' || ch === '·') {
      continue;
    } else {
      out += ch;
    }
  }
  return (out + chargeSuffix).trim();
}

window.ALPHABET_KO_PRON = ALPHABET_KO_PRON;
window.SUB_SUP_DIGIT_PRON = SUB_SUP_DIGIT_PRON;
window.ELEMENT_EN_PRON_MAP = ELEMENT_EN_PRON_MAP;
window.getSymbolPronunciationKo = getSymbolPronunciationKo;

// =========================================================================
// 2. ⚛️ 118개 원소 표준 주양자수 전자 껍질(K, L, M, N, O, P, Q) 데이터셋
// =========================================================================
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

window.BOHR_SHELLS_DATA = BOHR_SHELLS_DATA;
window.SHELL_NAMES = SHELL_NAMES;

// =========================================================================
// 3. 🗂️ 118개 원소 데이터 단일 병합 맵 (elementsMap & elementPositionMap)
// =========================================================================
const elementsMap = new Map();
const elementPositionMap = new Map();

if (typeof ELEMENTS_DATA !== 'undefined' && Array.isArray(ELEMENTS_DATA)) {
  ELEMENTS_DATA.forEach(el => {
    const extra = (typeof ELEMENTS_EXTRA_DATA !== 'undefined' && ELEMENTS_EXTRA_DATA[el.atomicNumber]) || {};
    const photo = (typeof ELEMENTS_PHOTOS_DATA !== 'undefined' && ELEMENTS_PHOTOS_DATA[el.atomicNumber]) || {};
    const symPronKo = getSymbolPronunciationKo(el.symbol);
    const enPronKo = ELEMENT_EN_PRON_MAP[el.atomicNumber] || el.nameKo;
    elementsMap.set(el.atomicNumber, { ...el, ...extra, ...photo, symPronKo, enPronKo });

    // 란타넘족(57~71) 및 악티늄족(89~103)을 제외한 메인 18x7 그리드 O(1) 위치 캐시
    if ((el.atomicNumber >= 57 && el.atomicNumber <= 71) || (el.atomicNumber >= 89 && el.atomicNumber <= 103)) {
      return;
    }
    elementPositionMap.set(`${el.period}-${el.group}`, el);
  });
}

window.elementsMap = elementsMap;
window.elementPositionMap = elementPositionMap;

// =========================================================================
// 4. 🔊 통합 사운드(Web Audio API 싱글톤) · 모바일 햅틱 · TTS 음성 엔진
// =========================================================================
let _sharedAudioCtx = null;

function getSharedAudioContext() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!_sharedAudioCtx) {
      _sharedAudioCtx = new AudioCtx();
    }
    if (_sharedAudioCtx.state === 'suspended') {
      _sharedAudioCtx.resume().catch(() => {});
    }
    return _sharedAudioCtx;
  } catch (e) {
    return null;
  }
}

function isAppSoundEnabled() {
  if (typeof quizState !== 'undefined' && typeof quizState.isSoundEnabled === 'boolean') {
    return quizState.isSoundEnabled;
  }
  return localStorage.getItem('periodic_quiz_sound_enabled') !== 'false';
}

function playAppSound(type) {
  if (!isAppSoundEnabled()) return;
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (type === 'flip') {
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
    } else if (type === 'correct') {
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
    } else if (type === 'match') {
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
    } else if (type === 'finish' || type === 'alchemy_success') {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);
        gain.gain.setValueAtTime(0.24, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.34);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.34);
      });
    } else if (type === 'wrong') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(125, now + 0.22);
      gain.gain.setValueAtTime(0.21, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.24);
    }
  } catch (e) {}
}

function triggerAppHaptic(type) {
  if (!('vibrate' in navigator)) return;
  try {
    if (type === 'short' || type === 'correct') {
      navigator.vibrate(28);
    } else if (type === 'success') {
      navigator.vibrate([30, 40, 50]);
    } else if (type === 'wrong') {
      navigator.vibrate([40, 45, 40]);
    } else if (type === 'finish') {
      navigator.vibrate([40, 50, 40, 50, 80]);
    }
  } catch (e) {}
}

function speakAppText(text, lang = 'ko-KR', callbacks = {}) {
  if (!('speechSynthesis' in window)) {
    alert('현재 브라우저에서는 음성 합성(TTS) 기능을 지원하지 않습니다.');
    return;
  }
  if (!text) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.9;
  utterance.pitch = 1.0;

  if (typeof callbacks.onStart === 'function') callbacks.onStart();
  utterance.onend = () => {
    if (typeof callbacks.onEnd === 'function') callbacks.onEnd();
  };
  utterance.onerror = () => {
    if (typeof callbacks.onError === 'function') callbacks.onError();
  };

  window.speechSynthesis.speak(utterance);
}

window.AppAudio = {
  getContext: getSharedAudioContext,
  playSound: playAppSound,
  triggerHaptic: triggerAppHaptic,
  speakText: speakAppText
};

// 하위 호환 전역 함수 별칭
window.playQuizSound = playAppSound;
window.triggerQuizHaptic = triggerAppHaptic;
window.playSoundEffect = playAppSound;
window.triggerHaptic = triggerAppHaptic;

// =========================================================================
// 5. 🎨 8대 테마(0~7편) 메타데이터 및 원소 타일 공통 빌더
// =========================================================================
const PERIODIC_THEMES = [
  {
    id: 0,
    title: '종합판: 표준 원소 주기율표 (1+2편 통합 A4 1장 완성형)',
    shortTitle: '표준 원소 주기율표 - [종합 1장 완성판]',
    badge: '종합 완성판 (A4 1장)',
    info: '구성: 원자번호 · 원소기호 · 한글표준명 · 관용명/이명[나트륨] · 영문명 · 원자량 · 방사능 ☢️ 모두 포함',
    badgeBg: '#e0f2fe',
    badgeColor: '#0284c7'
  },
  {
    id: 1,
    title: '제1편: 원소 기본 및 명칭판',
    shortTitle: '표준 원소 주기율표 - [제1편: 원소 기본 및 명칭판]',
    badge: '기본 학습용',
    info: '구성: 원자번호 · 원소기호 · 한글 표준명 · 한글발음 · 영문 명칭 · 7개 족 색상 분류',
    badgeBg: '#e0f2fe',
    badgeColor: '#0369a1'
  },
  {
    id: 2,
    title: '제2편: 원자량 · 관용명(이명) · 전자배치판',
    shortTitle: '표준 원소 주기율표 - [제2편: 원자량 · 관용명(이명) · 전자배치판]',
    badge: '동위원소/명칭',
    info: '구성: 원자번호 · 원소기호 · 관용명/구명칭(나트륨 등) · 원자량 · 전자배치 · 방사능 ☢️',
    badgeBg: '#fef3c7',
    badgeColor: '#b45309'
  },
  {
    id: 3,
    title: '제3편: 열역학 및 밀도 · 상태판',
    shortTitle: '표준 원소 주기율표 - [제3편: 열역학 및 밀도 · 물리상태판]',
    badge: '물리/열역학',
    info: '구성: 원자번호 · 원소기호 · 녹는점(℃) · 끓는점(℃) · 밀도 · 상온 상태(고체/액체/기체)',
    badgeBg: '#dcfce7',
    badgeColor: '#15803d'
  },
  {
    id: 4,
    title: '제4편: 산화수 및 전기음성도 · 화학결합판',
    shortTitle: '표준 원소 주기율표 - [제4편: 산화수 및 전기음성도판]',
    badge: '화학 반응성',
    info: '구성: 원자번호 · 원소기호 · 주요 산화수(Oxidation States) · 전기음성도(Pauling) · 원소명',
    badgeBg: '#f3e8ff',
    badgeColor: '#7e22ce'
  },
  {
    id: 5,
    title: '제5편: 발견 역사 및 대표 실생활 용도판',
    shortTitle: '표준 원소 주기율표 - [제5편: 발견 역사 및 대표 실생활 용도판]',
    badge: '역사/산업용도',
    info: '구성: 원자번호 · 원소기호 · 발견연도 · 발견자 · 대표적 실생활 및 첨단 산업 활용처',
    badgeBg: '#ffe4e6',
    badgeColor: '#be123c'
  },
  {
    id: 6,
    title: '제6편: 실생활 대표 물건 및 일러스트 그림판',
    shortTitle: '표준 원소 주기율표 - [제6편: 실생활 대표 물건 및 일러스트 그림판]',
    badge: '실생활 물건/사물',
    info: '구성: 원자번호 · 원소기호 · 한글명 · 실생활 대표 물건 그림(이모지) · 대표 물건 명칭',
    badgeBg: '#fef3c7',
    badgeColor: '#d97706'
  },
  {
    id: 7,
    title: '제7편: 실제 원소 표본 사진 및 실물 외형판',
    shortTitle: '표준 원소 주기율표 - [제7편: 실제 원소 표본 사진 및 실물 외형판]',
    badge: '실제 표본 사진',
    info: '구성: 원자번호 · 원소기호 · 한글명 · 실제 표본 사진(Wikimedia Commons) · 실물 외형 및 상태',
    badgeBg: '#e0e7ff',
    badgeColor: '#4338ca'
  }
];

window.PERIODIC_THEMES = PERIODIC_THEMES;

/**
 * 테마(0~7편)에 따른 원소 타일 내부 HTML 생성기 (메인 화면 & 분할 뷰 공통)
 */
function buildElementTileInnerHtml(element, themeId) {
  const radMark = element.isRadioactive ? '<span class="radioactive-badge" title="방사성 원소">☢️</span>' : '';
  const pronLabel = element.enPronKo && element.enPronKo !== element.nameKo
    ? `${element.symPronKo}·${element.enPronKo}`
    : `${element.symPronKo}`;

  if (themeId === 0) {
    const cleanAlt = element.altNameKo ? `[${element.altNameKo.split('/')[0].split('(')[0].trim()}]` : '';
    return `
      <div class="cell-top">
        <span class="atomic-number">${element.atomicNumber}</span>
        ${radMark}
      </div>
      <div class="cell-symbol-wrap">
        <span class="element-symbol">${element.symbol}</span>
      </div>
      <div class="cell-names">
        <span class="name-ko-main">${element.nameKo}</span>
        <span class="name-pron-ko">(${pronLabel})</span>
        ${cleanAlt ? `<span class="name-ko-alt">${cleanAlt}</span>` : ''}
        <span class="name-en">${element.nameEn}</span>
        <span class="cell-mass">${element.atomicMass}</span>
      </div>
    `;
  } else if (themeId === 1) {
    return `
      <div class="cell-top">
        <span class="atomic-number">${element.atomicNumber}</span>
        ${radMark}
      </div>
      <div class="cell-symbol-wrap">
        <span class="element-symbol">${element.symbol}</span>
      </div>
      <div class="cell-names">
        <span class="name-ko-main">${element.nameKo}</span>
        <span class="name-pron-ko">(${pronLabel})</span>
        <span class="name-en">${element.nameEn}</span>
      </div>
    `;
  } else if (themeId === 2) {
    const cleanAlt = element.altNameKo ? `[${element.altNameKo.split('/')[0].split('(')[0].trim()}]` : element.nameKo;
    return `
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
    return `
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
    return `
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
    return `
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
    const icon = element.icon || '🧪';
    const item = element.item || element.nameKo;
    return `
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
  } else {
    // 제7편: 실제 원소 표본 사진 및 외형 판
    const photoUrl = element.photo || '';
    const isSynthetic = element.isSynthetic || (element.atomicNumber >= 99);
    const lookText = element.look || (isSynthetic ? '🔬 인공합성 (표본 미존재)' : element.symbol);
    const fallbackIcon = element.icon || '⚛️';

    return `
      <div class="cell-top">
        <span class="atomic-number">${element.atomicNumber}</span>
        <span class="name-ko-sub">${element.nameKo}</span>
      </div>
      <div class="cell-photo-thumb-wrap">
        ${photoUrl ? `<img src="${photoUrl}" alt="${element.nameKo} 표본" class="cell-photo-thumb" loading="lazy" onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='flex';"/>` : ''}
        <div class="cell-photo-symbol-fallback ${isSynthetic ? 'synthetic-fallback' : ''}" style="${photoUrl ? 'display:none;' : 'display:flex;'}">
          <span class="fallback-icon">${fallbackIcon}</span>
          <span class="element-symbol">${element.symbol}</span>
        </div>
      </div>
      <div class="cell-names">
        <span class="cell-photo-look" title="${lookText}">${lookText}</span>
      </div>
    `;
  }
}

window.buildElementTileInnerHtml = buildElementTileInnerHtml;
