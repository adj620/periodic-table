// deploy_runner.js
const fs = require('fs');
const { execSync } = require('child_process');

// 1. version.json 버전(패치 번호) 및 빌드 번호 자동 증가 + APK 복사
const vPath = 'version.json';
const vData = JSON.parse(fs.readFileSync(vPath, 'utf8'));
const oldBuild = vData.build;
const oldVersion = vData.version || '1.3.2';
const verParts = oldVersion.split('.').map(n => parseInt(n, 10) || 0);
verParts[2] = (verParts[2] || 0) + 1;
vData.version = verParts.join('.');
vData.build = oldBuild + 1;
vData.versionCode = vData.build;
vData.updatedAt = new Date().toISOString();
vData.notes = 'Gemini AI 최신 모델(2.5 Flash 등) 실시간 동적 탐색 엔진 적용 및 자동 업데이트 개선';

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

// 3. index.html의 CURRENT_EMBEDDED_BUILD는 4(기본 기준값)로 유지하고,
// 사용자가 업데이트 설치 버튼을 누르면 localStorage('app_installed_build')에 최신 빌드 번호가 기록됨
let idxHtml = fs.readFileSync('index.html', 'utf8');
idxHtml = idxHtml.replace(/const CURRENT_EMBEDDED_BUILD = \d+;/, 'const CURRENT_EMBEDDED_BUILD = 4;');
idxHtml = idxHtml.replace(/<span class="update-ver-tag" id="updateModalVerTag">.*?<\/span>/, `<span class="update-ver-tag" id="updateModalVerTag">v${vData.version} (빌드 #${vData.build})</span>`);
fs.writeFileSync('index.html', idxHtml, 'utf8');
console.log(`index.html 버전 태그 v${vData.version} (빌드 #${vData.build}) 동기화 완료`);

// 3-0. download.html 및 android/app/build.gradle 버전 동기화
if (fs.existsSync('download.html')) {
  let dlHtml = fs.readFileSync('download.html', 'utf8');
  dlHtml = dlHtml.replace(/<span class="badge">v[\d.]+ 최신판<\/span>/, `<span class="badge">v${vData.version} 최신판</span>`);
  fs.writeFileSync('download.html', dlHtml, 'utf8');
}
if (fs.existsSync('android/app/build.gradle')) {
  let gradleContent = fs.readFileSync('android/app/build.gradle', 'utf8');
  gradleContent = gradleContent.replace(/versionCode \d+/, `versionCode ${vData.build}`);
  gradleContent = gradleContent.replace(/versionName ".*?"/, `versionName "${vData.version}"`);
  fs.writeFileSync('android/app/build.gradle', gradleContent, 'utf8');
}

// 3-1. www/ 및 android assets 폴더에 핵심 파일 동기화
const syncFiles = [
  'index.html', 'style.css', 'app.js', 'elements.js', 'elements_extra.js',
  'elements_photos.js', 'elements_encyclopedia.js', 'in_app_browser.js',
  'gemini_service.js', 'quiz.js', 'game_suite.js', 'card_explorer.js',
  'manifest.json', 'icon.svg', 'version.json', 'service-worker.js',
  'download.html', 'firebase.json'
];
const targetDirs = ['www', 'android/app/src/main/assets/public'];
for (const dir of targetDirs) {
  if (fs.existsSync(dir)) {
    for (const file of syncFiles) {
      if (fs.existsSync(file)) {
        fs.copyFileSync(file, `${dir}/${file}`);
      }
    }
    console.log(`📂 ${dir}/ 동기화 완료`);
  }
}

// 4. Firebase Hosting 배포
console.log('🚀 Firebase Hosting 배포 중...');
const deployOut = execSync('npx --yes firebase-tools deploy --only hosting --project hwmgr-310f7', { encoding: 'utf8' });
console.log(deployOut);
console.log('🎉 배포 성공 완료! 원격 빌드 번호: #' + vData.build);
