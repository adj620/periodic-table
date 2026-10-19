# Antigravity CLI (`agy`) 설치 및 자동화 환경 구성 가이드

> **작성일**: 2026-10-19  
> **적용 대상**: `d:\workspace\periodic-table`, `d:\workspace\Stock2`

본 문서는 Antigravity CLI(`agy`) 설치, 권한 자동 승인(Bypass Permissions) 설정, 그리고 프로젝트별 원클릭 실행 바로가기 및 런처 스크립트 구성 내용을 정리한 가이드입니다.

---

## 1. PowerShell 최신 버전 점검

Antigravity CLI의 원활한 터미널 인터페이스(TUI) 구동 및 스크립트 실행을 위해 **PowerShell 7(pwsh)** 환경을 사용합니다.

- **설치 버전**: `PowerShell 7.6.7` (Core)
- **실행 경로**: `pwsh.exe`
- **점검 명령어**:
  ```powershell
  $PSVersionTable
  winget upgrade --id Microsoft.PowerShell
  ```

---

## 2. Antigravity CLI (`agy`) 설치

공식 PowerShell 설치 스크립트를 통해 시스템에 Antigravity CLI를 설치했습니다.

- **설치 명령어**:
  ```powershell
  irm https://antigravity.google/cli/install.ps1 | iex
  ```
- **바이너리 설치 경로**: `C:\Users\andyg\AppData\Local\agy\bin\agy.exe`
- **버전**: `v1.4.2`
- **환경변수 PATH**: Windows 사용자 환경변수 `PATH`에 `%LOCALAPPDATA%\agy\bin`이 자동 등록되었습니다.

---

## 3. Bypass Permissions (권한 자동 승인 모드) 설정

에이전트가 파일 수정, 터미널 명령 실행 등을 수행할 때 매번 권한 확인 팝업/프롬프트를 띄우지 않고 자율적으로 즉시 작업을 처리할 수 있도록 글로벌 설정을 적용했습니다.

- **설정 파일 위치**: `C:\Users\andyg\.gemini\antigravity-cli\settings.json`
- **설정 내용**:
  ```json
  {
    "permissionPreset": "always-proceed",
    "permission_preset": "always-proceed",
    "toolPermission": "always-proceed",
    "tool_permission": "always-proceed",
    "dangerouslySkipPermissions": true,
    "dangerously_skip_permissions": true,
    "skipPermissionChecks": true,
    "skip_permission_checks": true,
    "permissionMode": "bypassPermissions",
    "permission_mode": "bypassPermissions",
    "approvalMode": "bypassPermissions",
    "approval_mode": "bypassPermissions",
    "autoAllowAllInteractions": true,
    "auto_allow_all_interactions": true,
    "permissions": {
      "defaultMode": "bypassPermissions",
      "allow": [
        "*"
      ]
    }
  }
  ```

---

## 4. 원클릭 실행 스크립트 및 바탕화면 바로가기

터미널을 열고 일일이 디렉터리를 이동하여 명령어를 입력할 필요 없이, 바탕화면에서 한 번의 클릭으로 해당 프로젝트 경로에서 `agy`가 바이패스 권한 모드로 즉시 실행되도록 구성했습니다.

### 4.1 런처 스크립트 (`C:\Users\andyg\AppData\Local\agy\scripts\`)

각 스크립트는 `PATH`를 명시적으로 보정하고 `--dangerously-skip-permissions` 플래그를 포함하여 즉각적인 완전 자율 모드를 보장합니다.

1. **`launch-periodic-table.ps1`**:
   - `d:\workspace\periodic-table` 디렉터리로 이동 후 `agy --dangerously-skip-permissions` 실행
2. **`launch-stock2.ps1`**:
   - `d:\workspace\stock2` 디렉터리로 이동 후 `agy --dangerously-skip-permissions` 실행
3. **`launch-both.ps1`**:
   - 두 개의 프로젝트를 각각 독립된 PowerShell 창으로 동시 실행
4. **`launch-both-wt.ps1`**:
   - Windows Terminal(`wt.exe`)을 활용하여 한 창에서 좌/우 분할 화면(Split Pane, 좌: `stock2`, 우: `periodic-table`)으로 두 프로젝트를 동시 실행

### 4.2 생성된 바탕화면 바로가기 (`C:\Users\andyg\Desktop\`)

Antigravity 고유 아이콘(`agy.exe`)이 적용되어 시각적으로 구분됩니다.

| 바로가기 이름 | 동작 설명 |
| :--- | :--- |
| **`Antigravity CLI (All Projects).lnk`** | `periodic-table`과 `stock2` 창 2개를 독립된 PowerShell로 즉시 동시 실행 |
| **`Antigravity CLI (Terminal Split).lnk`** | Windows Terminal 분할 화면(좌: `stock2`, 우: `periodic-table`)으로 두 프로젝트 동시 실행 |
| **`Antigravity CLI (periodic-table).lnk`** | `periodic-table` 프로젝트 단독 실행 |
| **`Antigravity CLI (stock2).lnk`** | `stock2` 프로젝트 단독 실행 |

---

## 5. 기본 사용법 및 명령어 팁

- **세션 종료**: `/exit`, `/quit` 또는 `Ctrl+D` 2회
- **대화 내역 이어서 진행**: `agy --continue` (또는 `agy -c`)
- **실시간 권한 및 설정 확인**: CLI TUI 내부에서 `/permissions` 또는 `/config` 입력
