# GagebuClient

Windows에서 실행하는 Expo React Native 클라이언트입니다.
API는 저장소 루트의 Docker Compose로 실행합니다.

```powershell
Set-Location E:\source\github\Gageabu\GagebuClient
# 최초 설치 또는 package-lock.json 변경 시
npm.cmd ci
# 최초 설정 시만 복사하고 PC의 실제 LAN IP를 입력
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
notepad .env.local
npm.cmd start -- --lan --port 8081
```

이미 설정되어 있으면 `npm.cmd start -- --lan --port 8081`만 실행합니다.
`w`: 웹 미리보기, `a`: Android 에뮬레이터. 실물 폰은 같은 Wi-Fi에서 QR을 스캔합니다.
환경변수 변경 후 Metro를 재시작합니다.

```powershell
npm.cmd run typecheck
npm.cmd run test:ci
```

API 실행·디버깅·백업과 연결 문제 해결은 [개발 환경 안내](../docs/DEVELOPMENT.md)를 참고하세요.
