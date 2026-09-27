from receipt_worker import ENGINE_VERSION
from receipt_worker.worker import run_once


class FakeApi:
    def __init__(self, jobs):
        self.jobs = list(jobs)
        self.results = []
        self.fails = []

    def claim(self):
        return self.jobs.pop(0) if self.jobs else None

    def result(self, job_id, body):
        self.results.append((job_id, body))

    def fail(self, job_id, body):
        self.fails.append((job_id, body))


def test_작업을_분석해서_결과를_보낸다():
    api = FakeApi([{"id": 7, "capturedAt": "2026-09-24T12:40:00Z", "lines": [{"text": "합계 4,500"}], "attempt": 1}])
    assert run_once(api) is True
    job_id, body = api.results[0]
    assert job_id == 7
    assert body["engineVersion"] == ENGINE_VERSION
    assert body["suggestion"]["total"] == 4500
    # 영수증에 날짜가 없으면 촬영 시각 (KST로)
    assert body["suggestion"]["date"] == "2026-09-24T21:40:00+09:00"


def test_대기열이_비면_False():
    assert run_once(FakeApi([])) is False


def test_분석_중_오류는_실패로_보고하고_멈추지_않는다():
    api = FakeApi([{"id": 8, "lines": [{"text": "합계 1,000", "top": "잘못된 값"}]}])
    assert run_once(api) is True
    assert api.fails[0][0] == 8
    assert api.fails[0][1]["reason"].startswith("분석 오류")
