// deploy_runner.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 1. version.json 버전(패치 번호) 및 빌드 번호 자동 증가
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
vData.notes = '원소 연금술 대개편(118원소·양이온·음이온 한글명·사칙연산·인벤토리) 및 원스톱(1회) 즉시 업데이트 패치';

console.log(`🚀 버전 상향: v${oldVersion} (#${oldBuild}) -> v${vData.version} (#${vData.build})`);

// 2. service-worker.js 캐시 키 교체
const swPath = 'service-worker.js';
let swContent = fs.readFileSync(swPath, 'utf8');
const newCacheName = 'periodic-table-v' + vData.version + '-b' + vData.build;
swContent = swContent.replace(/const CACHE_NAME = '.*?';/, "const CACHE_NAME = '" + newCacheName + "';");
fs.writeFileSync(swPath, swContent, 'utf8');
console.log('service-worker.js CACHE_NAME:', newCacheName);

// 3. index.html의 CURRENT_EMBEDDED_BUILD를 최신 빌드 번호(vData.build)와 정확히 일치시켜
//    새 APK 설치 후 업데이트 안내 모달이 중복해서 뜨는 현상을 원천 차단!
let idxHtml = fs.readFileSync('index.html', 'utf8');
idxHtml = idxHtml.replace(/const CURRENT_EMBEDDED_BUILD = \d+;/, `const CURRENT_EMBEDDED_BUILD = ${vData.build};`);
idxHtml = idxHtml.replace(/<span class="update-ver-tag" id="updateModalVerTag">.*?<\/span>/, `<span class="update-ver-tag" id="updateModalVerTag">v${vData.version} (빌드 #${vData.build})</span>`);
fs.writeFileSync('index.html', idxHtml, 'utf8');
console.log(`index.html CURRENT_EMBEDDED_BUILD = ${vData.build} 및 버전 태그 v${vData.version} 동기화 완료`);

// 3-0. gemini_service.js 내 LATEST_BUILD_NUM 동기화
if (fs.existsSync('gemini_service.js')) {
  let gemContent = fs.readFileSync('gemini_service.js', 'utf8');
  gemContent = gemContent.replace(/const LATEST_BUILD_NUM = \d+;/, `const LATEST_BUILD_NUM = ${vData.build};`);
  fs.writeFileSync('gemini_service.js', gemContent, 'utf8');
}

// 3-1. download.html 및 android/app/build.gradle 버전 동기화
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

// 임시 version.json 저장
fs.writeFileSync(vPath, JSON.stringify(vData, null, 2), 'utf8');

// 4. www/ 및 android assets 폴더에 핵심 파일 선(先) 동기화 (APK 빌드 전 최신 에셋 주입!)
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

// 5. Android APK 자동 리빌드 (최신 CURRENT_EMBEDDED_BUILD가 내장된 APK 생성)
if (fs.existsSync('android/gradlew.bat')) {
  try {
    console.log('🔨 최신 에셋 기반 Android APK(v' + vData.version + ', 빌드 #' + vData.build + ') Gradle 빌드 중...');
    execSync('gradlew.bat assembleDebug', { cwd: path.join(__dirname, 'android'), stdio: 'inherit' });
    const builtApk = path.join(__dirname, 'android/app/build/outputs/apk/debug/app-debug.apk');
    if (fs.existsSync(builtApk)) {
      fs.copyFileSync(builtApk, 'periodic-table.apk');
      console.log('✅ 최신 periodic-table.apk 생성 완료!');
    }
  } catch (e) {
    console.warn('⚠️ Gradle 빌드 건너뜀 (기존 APK 유지):', e.message);
  }
}

// 6. 최신 periodic-table.apk -> periodic-table.zip 복사 및 최종 파일 크기 version.json 반영
if (fs.existsSync('periodic-table.apk')) {
  fs.copyFileSync('periodic-table.apk', 'periodic-table.zip');
  if (fs.existsSync('www')) {
    fs.copyFileSync('periodic-table.zip', 'www/periodic-table.zip');
  }
  const stats = fs.statSync('periodic-table.apk');
  vData.size = stats.size;
  fs.writeFileSync(vPath, JSON.stringify(vData, null, 2), 'utf8');
  for (const dir of targetDirs) {
    if (fs.existsSync(dir)) {
      fs.copyFileSync(vPath, `${dir}/${vPath}`);
    }
  }
  console.log('📦 periodic-table.apk -> periodic-table.zip 복사 완료 (최신 크기:', stats.size, '바이트)');
}

// 7. Firebase Hosting 배포
console.log('🚀 Firebase Hosting 배포 중...');
const deployOut = execSync('npx --yes firebase-tools deploy --only hosting --project hwmgr-310f7', { encoding: 'utf8' });
console.log(deployOut);
console.log('🎉 배포 성공 완료! 원격 빌드 번호: #' + vData.build);
