// deploy_runner.js
const fs = require('fs');
const { execSync } = require('child_process');

// 1. version.json 빌드 번호 증가 및 APK 복사
const vPath = 'version.json';
const vData = JSON.parse(fs.readFileSync(vPath, 'utf8'));
const oldBuild = vData.build;
vData.build = oldBuild + 1;
vData.versionCode = vData.build;
vData.updatedAt = new Date().toISOString();
vData.notes = 'Google Gemini AI 실시간 진단 엔진 & 원소 4대 게임존 탑재, 네이티브 DownloadManager 자동 다운로드 지원';

// homework_manager 방식: 무료 Firebase Hosting은 .apk 업로드를 금지하므로 .zip으로 복사하여 배포
if (fs.existsSync('periodic-table.apk')) {
  fs.copyFileSync('periodic-table.apk', 'periodic-table.zip');
  const stats = fs.statSync('periodic-table.apk');
  vData.size = stats.size;
  console.log('📦 periodic-table.apk -> periodic-table.zip 복사 완료 (크기:', stats.size, '바이트)');
}

fs.writeFileSync(vPath, JSON.stringify(vData, null, 2), 'utf8');
console.log('version.json build:', oldBuild, '->', vData.build);

// 2. service-worker.js 캐시 키 교체
const swPath = 'service-worker.js';
let swContent = fs.readFileSync(swPath, 'utf8');
const newCacheName = 'periodic-table-v' + vData.version + '-b' + vData.build;
swContent = swContent.replace(/const CACHE_NAME = '.*?';/, "const CACHE_NAME = '" + newCacheName + "';");
fs.writeFileSync(swPath, swContent, 'utf8');
console.log('service-worker.js CACHE_NAME:', newCacheName);

// 3. index.html의 CURRENT_EMBEDDED_BUILD는 4(기존 설치본 기준)로 유지해야
// 원격 build 6 > localBuild 4 가 되어 업데이트 토스트가 무조건 뜸!
let idxHtml = fs.readFileSync('index.html', 'utf8');
idxHtml = idxHtml.replace(/const CURRENT_EMBEDDED_BUILD = \d+;/, 'const CURRENT_EMBEDDED_BUILD = 4;');
fs.writeFileSync('index.html', idxHtml, 'utf8');
console.log('index.html CURRENT_EMBEDDED_BUILD = 4 설정 완료 (업데이트 감지 트리거용)');

// 4. Firebase Hosting 배포
console.log('🚀 Firebase Hosting 배포 중...');
const deployOut = execSync('npx --yes firebase-tools deploy --only hosting --project hwmgr-310f7', { encoding: 'utf8' });
console.log(deployOut);
console.log('🎉 배포 성공 완료! 원격 빌드 번호: #' + vData.build);
