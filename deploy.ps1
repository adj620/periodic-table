# 표준 원소 주기율표 & 퀴즈 웹앱 배포 스크립트
# 한 번 실행하면: Firebase Hosting으로 정적 웹앱 배포
$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}
try { [Console]::InputEncoding  = [System.Text.Encoding]::UTF8 } catch {}

$proj = $PSScriptRoot
Set-Location $proj

Write-Host "⚛️ 원소 주기율표 & 퀴즈 앱 배포 시작..." -ForegroundColor Cyan

# Firebase CLI 확인
$fb = Get-Command firebase -ErrorAction SilentlyContinue
if (-not $fb) {
  Write-Host "❌ Firebase CLI가 설치되어 있지 않습니다." -ForegroundColor Red
  Write-Host "   npm install -g firebase-tools 명령어로 설치 후 firebase login을 진행하세요." -ForegroundColor Yellow
  exit 1
}

Write-Host "🚀 Firebase Hosting 배포 중..." -ForegroundColor Yellow
& firebase deploy --only hosting

if ($LASTEXITCODE -eq 0) {
  Write-Host "`n✅ 배포 성공! 누구나 웹 및 모바일 앱(PWA)으로 접속할 수 있습니다." -ForegroundColor Green
} else {
  Write-Host "`n❌ 배포 실패. 로그인 상태(firebase login)를 확인해 주세요." -ForegroundColor Red
}
