# Gageabu

여럿이 함께 쓰는 가계부. Expo React Native 클라이언트와 ASP.NET Core API로 구성합니다.

- 클라이언트·Metro: Windows 로컬
- API: Docker Desktop + WSL2
- 현재 DB: Docker 볼륨의 SQLite (PostgreSQL 전환 예정)

## 시작

Docker Desktop을 켜고 PowerShell에서 실행합니다.

```powershell
Set-Location E:\source\github\Gageabu
.\scripts\dev.ps1 start
Invoke-RestMethod http://localhost:5067/health
```

별도 PowerShell에서 클라이언트를 실행합니다. 처음에는 [개발 환경 안내](docs/DEVELOPMENT.md)를 따라 `npm.cmd ci`와 `.env.local` 설정을 완료합니다.

```powershell
Set-Location E:\source\github\Gageabu\GagebuClient
npm.cmd start -- --lan --port 8081
```

- [개발 환경·PowerShell 명령·디버깅·백업](docs/DEVELOPMENT.md)
- [개발 계획과 진행 기록](docs/PLAN.md)
- [2025년 개발 기록](docs/archive/DEVELOPMENT-2025.md)

API 문서: http://localhost:5067/swagger
