"""서버 대기열에서 영수증 작업을 가져와 분석하고 결과를 돌려준다.

DB는 만지지 않는다 — .NET API의 /internal/receipts만 쓴다 (X-Worker-Key).
"""

from __future__ import annotations

import json
import logging
import os
import time
import urllib.error
import urllib.request
from datetime import datetime
from typing import Protocol

from . import ENGINE_VERSION
from .rules import OcrLine, analyze

log = logging.getLogger("receipt_worker")


class WorkerKeyRejected(Exception):
    """서버에 워커 키가 설정되지 않았거나(404) 틀림(401)."""


class Api(Protocol):
    def claim(self) -> dict | None: ...
    def result(self, job_id: int, body: dict) -> None: ...
    def fail(self, job_id: int, body: dict) -> None: ...


class HttpApi:
    def __init__(self, base_url: str, key: str, timeout: float = 10):
        self._base = base_url.rstrip("/")
        self._key = key
        self._timeout = timeout

    def _post(self, path: str, body: dict | None = None) -> tuple[int, bytes]:
        data = json.dumps(body).encode() if body is not None else b""
        request = urllib.request.Request(
            self._base + path, data=data, method="POST",
            headers={"Content-Type": "application/json", "X-Worker-Key": self._key},
        )
        try:
            with urllib.request.urlopen(request, timeout=self._timeout) as response:
                return response.status, response.read()
        except urllib.error.HTTPError as e:
            if e.code in (401, 404):
                raise WorkerKeyRejected(f"{e.code} {path}") from e
            if e.code == 409:  # 그 사이 사용자가 확정·버림 → 결과가 필요 없어짐
                log.info("작업이 더 이상 분석 중이 아님: %s", path)
                return e.code, b""
            raise

    def claim(self) -> dict | None:
        status, body = self._post("/internal/receipts/claim")
        return json.loads(body) if status == 200 and body else None

    def result(self, job_id: int, body: dict) -> None:
        self._post(f"/internal/receipts/{job_id}/result", body)

    def fail(self, job_id: int, body: dict) -> None:
        self._post(f"/internal/receipts/{job_id}/fail", body)


def _parse_time(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def run_once(api: Api) -> bool:
    """작업 하나 처리. 처리했으면 True, 대기열이 비었으면 False."""
    job = api.claim()
    if not job:
        return False
    job_id = job["id"]
    try:
        lines = [
            OcrLine(text=l.get("text") or "", top=l.get("top"), left=l.get("left"), width=l.get("width"), height=l.get("height"))
            for l in job.get("lines") or []
        ]
        suggestion = analyze(lines, _parse_time(job.get("capturedAt")))
    except Exception as e:  # 규칙 버그로 한 영수증이 막히지 않게 실패로 보고하고 넘어간다
        log.exception("분석 실패 job=%s", job_id)
        api.fail(job_id, {"engineVersion": ENGINE_VERSION, "reason": f"분석 오류: {type(e).__name__}"[:500]})
        return True
    api.result(job_id, {"engineVersion": ENGINE_VERSION, "suggestion": suggestion.to_json()})
    log.info("분석 완료 job=%s total=%s", job_id, suggestion.total)
    return True


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    base_url = os.environ.get("GAGEBU_API_URL", "http://api:5067")
    key = os.environ.get("GAGEBU_WORKER_KEY", "")
    idle_sleep = float(os.environ.get("WORKER_IDLE_SECONDS", "2"))
    api = HttpApi(base_url, key)
    log.info("영수증 워커 시작 (%s, %s)", ENGINE_VERSION, base_url)

    backoff = 1.0
    while True:
        try:
            if run_once(api):
                backoff = 1.0
                continue          # 대기열이 남아 있을 수 있으니 바로 다음
            time.sleep(idle_sleep)
            backoff = 1.0
        except WorkerKeyRejected as e:
            log.warning("서버가 워커 키를 받지 않음 (%s) — Worker__Key / GAGEBU_WORKER_KEY 확인. 1분 뒤 다시", e)
            time.sleep(60)
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            log.warning("서버 연결 실패: %s — %.0f초 뒤 다시", e, backoff)
            time.sleep(backoff)
            backoff = min(backoff * 2, 60)
