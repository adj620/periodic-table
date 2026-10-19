# 원소 주기율표 & 퀴즈 앱 배포 자동화 스크립트 (homework_manager 벤치마킹)
# 한 번 실행하면:
# 1) version.json 빌드 번호 자동 +1 증가
# 2) service-worker.js 캐시 버전 동기화 (배포 즉시 사용자 기기에서 자동 업데이트 감지)
# 3) Firebase Hosting으로 원클릭 초고속 배포

$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}
try { [Console]::InputEncoding  = [System.Text.Encoding]::UTF8 } catch {}

$proj = $PSScriptRoot
Set-Location $proj

$versionJsonPath = Join-Path $proj 'version.json'
$swPath          = Join-Path $proj 'service-worker.js'

Write-Host "⚛️ [원소 주기율표 & 퀴즈] 자동 배포 파이프라인 시작..." -ForegroundColor Cyan

# 1) Firebase CLI 존재 여부 확인
$useNpx = $false
$fb = Get-Command firebase -ErrorAction SilentlyContinue
if (-not $fb) {
  $npx = Get-Command npx -ErrorAction SilentlyContinue
  if ($npx) {
    Write-Host "ℹ️ 전역 firebase 대신 npx firebase-tools를 사용하여 배포를 진행합니다." -ForegroundColor Cyan
    $useNpx = $true
  } else {
    Write-Host "`n❌ Firebase CLI 또는 Node.js(npx)를 찾을 수 없습니다." -ForegroundColor Red
    Write-Host "   명령 프롬프트에서 'npm install -g firebase-tools' 설치 후 'firebase login'을 진행해 주세요.`n" -ForegroundColor Yellow
    exit 1
  }
}

# 2) version.json 읽기 및 빌드 번호 +1 증가
if (Test-Path $versionJsonPath) {
  $rawJson = [System.IO.File]::ReadAllText($versionJsonPath, [System.Text.Encoding]::UTF8)
  $vObj = $rawJson | ConvertFrom-Json
  $oldVersion = $vObj.version
  $newBuild = [int]$vObj.build + 1
} else {
  $oldVersion = '1.0.0'
  $newBuild = 1
  $vObj = [PSCustomObject]@{ version = $oldVersion; build = $newBuild; notes = '' }
}

Write-Host "현재 버전: $oldVersion (빌드: $($vObj.build)) ➔ 새 빌드: $newBuild" -ForegroundColor Green

# 3) 업데이트 메모 입력 (엔터 시 기본 문구)
$notes = Read-Host '이번 업데이트 내용 (엔터 치면 기본 문구 사용)'
if ([string]::IsNullOrWhiteSpace($notes)) {
  $notes = '성능 개선 및 원소 데이터 최신화'
}

# 4) version.json 저장 (UTF-8)
$vObj.build = $newBuild
$vObj.updatedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:sszzz")
$vObj.notes = $notes

$newJsonText = $vObj | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText($versionJsonPath, $newJsonText, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "📝 version.json 갱신 완료 (빌드 #$newBuild)" -ForegroundColor Cyan

# 5) service-worker.js 내 CACHE_NAME 자동 교체 (사용자 기기 즉시 갱신 유도)
if (Test-Path $swPath) {
  $swContent = [System.IO.File]::ReadAllText($swPath, [System.Text.Encoding]::UTF8)
  $newCacheName = "periodic-table-v$($vObj.version)-b$newBuild"
  $swContent = [regex]::Replace($swContent, "const CACHE_NAME = '.*?';", "const CACHE_NAME = '$newCacheName';")
  [System.IO.File]::WriteAllText($swPath, $swContent, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host "🔄 Service Worker 캐시 키 동기화: $newCacheName" -ForegroundColor Cyan
}

# 6) Firebase Hosting 배포 실행
Write-Host "`n🚀 Firebase Hosting으로 배포 중..." -ForegroundColor Yellow
if ($useNpx) {
  & npx --yes firebase-tools deploy --only hosting --project hwmgr-310f7
} else {
  & firebase deploy --only hosting --project hwmgr-310f7
}

if ($LASTEXITCODE -eq 0) {
  Write-Host "`n🎉 배포 성공 완료!" -ForegroundColor Green
  Write-Host "   - 버전: $($vObj.version) (빌드 #$newBuild)" -ForegroundColor Green
  Write-Host "   - 접속 중인 사용자 기기 및 모바일 앱(PWA)에서 자동으로 새 버전 감지 및 갱신이 진행됩니다.`n" -ForegroundColor Green
} else {
  Write-Host "`n❌ 배포 실패. 로그인 상태(firebase login) 또는 프로젝트 설정을 확인하세요.`n" -ForegroundColor Red
  exit 1
}
