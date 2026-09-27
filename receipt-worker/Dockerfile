# 영수증 분석 워커. 실행에는 표준 라이브러리만 쓴다
FROM python:3.13-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 TZ=Asia/Seoul
WORKDIR /app
COPY receipt_worker/ receipt_worker/

# 개발: 테스트 도구 포함 (docker-compose.yml)
FROM base AS dev
RUN pip install --no-cache-dir pytest==8.4.2
COPY tests/ tests/
COPY pyproject.toml .
CMD ["python", "-m", "receipt_worker"]

# 운영 (docker-compose.prod.yml)
FROM base AS prod
RUN useradd --create-home --uid 10001 worker
USER worker
CMD ["python", "-m", "receipt_worker"]
