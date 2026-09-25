# Gageabu 개발 컨테이너: Node 22 (Expo 클라이언트) + .NET 8 SDK (API 서버)
FROM mcr.microsoft.com/devcontainers/typescript-node:1-22-bookworm

ENV TZ=Asia/Seoul \
    DOTNET_CLI_TELEMETRY_OPTOUT=1 \
    DOTNET_NOLOGO=1

# .NET 8 SDK + sqlite3 CLI
RUN wget -q https://packages.microsoft.com/config/debian/12/packages-microsoft-prod.deb -O /tmp/ms.deb \
    && dpkg -i /tmp/ms.deb && rm /tmp/ms.deb \
    && apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get install -y --no-install-recommends dotnet-sdk-8.0 sqlite3 tzdata \
    && rm -rf /var/lib/apt/lists/*

# Claude Code CLI (터미널에서 `claude`로도 사용 가능)
RUN npm install -g @anthropic-ai/claude-code

# 볼륨 마운트 지점을 node 사용자 소유로 미리 생성 (빈 볼륨은 이 소유권을 그대로 물려받음)
RUN mkdir -p /home/node/.claude /home/node/.nuget/packages /data/db \
    && chown -R node:node /home/node/.claude /home/node/.nuget /data

USER node

# EF Core 마이그레이션 도구 (서버 패키지 버전과 맞춤)
RUN dotnet tool install --global dotnet-ef --version 9.0.3
ENV PATH="${PATH}:/home/node/.dotnet/tools"
