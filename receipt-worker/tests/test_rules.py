"""추출 규칙 테스트. 실제 영수증 샘플(docs/PLAN.md 4단계 "샘플 모으기")이 생기면 tests/samples/에 추가한다."""

from datetime import datetime

from receipt_worker.categories import guess_category
from receipt_worker.rules import KST, OcrLine, amounts_in, analyze, find_date, find_total, group_rows

CAPTURED = datetime(2026, 9, 24, 21, 40, tzinfo=KST)


def lines(text: str) -> list[OcrLine]:
    return [OcrLine(t) for t in text.strip().splitlines()]


CONVENIENCE_STORE = """
GS25 역삼점
서울특별시 강남구 테헤란로 123
사업자 123-45-67890 TEL 02-123-4567
2026-09-24 21:30:15 POS:01 0123
삼각김밥 1 1,500
바나나우유 2 3,000
과세물품가액 4,091
부가세 409
합계 4,500
받은돈 10,000
거스름돈 5,500
"""

CAFE_CARD_SLIP = """
[매출전표]
가맹점명: 스타벅스 강남R점
카드번호 9410-12**-****-1234
승인번호 30012345
거래일시 26/09/24 08:05
공급가액 5,000
부가세 500
승인금액 5,500
"""

RESTAURANT = """
영수증
상호: 교촌치킨 역삼점 대표자: 홍길동
2026.09.24 오후 7:30
허니콤보 1 23,000
콜라 1 2,000
합 계
25,000
"""


def test_편의점_합계는_부가세_받은돈_거스름돈이_아닌_합계줄():
    s = analyze(lines(CONVENIENCE_STORE), CAPTURED)
    assert s.total == 4500
    assert s.confidence["total"] >= 0.9


def test_편의점_가게_날짜_카테고리():
    s = analyze(lines(CONVENIENCE_STORE), CAPTURED)
    assert s.merchant == "GS25 역삼점"
    assert s.date == datetime(2026, 9, 24, 21, 30, 15, tzinfo=KST)
    assert s.category == "생활"


def test_카드전표는_승인금액_가맹점명_짧은_날짜():
    s = analyze(lines(CAFE_CARD_SLIP), CAPTURED)
    assert s.total == 5500
    assert s.merchant == "스타벅스 강남R점"
    assert s.confidence["merchant"] == 0.9
    assert s.date == datetime(2026, 9, 24, 8, 5, tzinfo=KST)
    assert s.category == "카페"


def test_띄어쓴_합계와_다음_줄_금액_오후_시간():
    s = analyze(lines(RESTAURANT), CAPTURED)
    assert s.total == 25000
    assert s.merchant == "교촌치킨 역삼점"
    assert s.date == datetime(2026, 9, 24, 19, 30, tzinfo=KST)
    assert s.category == "식비"


def test_키워드가_없으면_아래쪽에서_가장_큰_금액_확신_낮게():
    rows = ["동네 반찬가게", "시금치 3,000", "두부 2,000", "계 5,000", "거스름돈 5,000"]
    total, conf = find_total(rows)
    assert total == 5000
    assert conf == 0.4


def test_번호들은_금액이_아니다():
    assert amounts_in("TEL 02-123-4567") == []
    assert amounts_in("123-45-67890") == []
    assert amounts_in("카드 9410-12**-****-1234") == []
    assert amounts_in("941012******1234") == []
    assert amounts_in("승인번호 30012345") == []
    assert amounts_in("2026-09-24 21:30") == []


def test_금액_모양():
    assert amounts_in("합계 12,000원") == [12000]
    assert amounts_in("₩12,000") == [12000]
    assert amounts_in("아메리카노 2 9000") == [9000]     # 수량 2는 금액 아님
    assert amounts_in("비닐봉투 50원") == [50]
    assert amounts_in("주문 12345678901") == []           # 너무 긴 숫자


def test_날짜가_없으면_촬영_시각_확신_낮게():
    date, conf = find_date(["가게", "합계 1,000"], CAPTURED)
    assert date == CAPTURED
    assert conf == 0.3


def test_날짜만_있고_촬영일과_같으면_촬영_시각():
    date, conf = find_date(["2026년 9월 24일"], CAPTURED)
    assert date == CAPTURED
    assert conf == 0.8


def test_촬영보다_미래_날짜는_잘못_읽은_것으로_본다():
    date, conf = find_date(["유효기간 2027-12-31"], CAPTURED)
    assert date == CAPTURED
    assert conf == 0.3


def test_위치가_있으면_같은_높이_조각을_한_줄로():
    ocr = [
        OcrLine("4,500", top=200, left=300, height=20),
        OcrLine("스타벅스", top=10, left=50, height=20),
        OcrLine("합계", top=203, left=20, height=20),
        OcrLine("아메리카노", top=100, left=20, height=20),
        OcrLine("4,500", top=98, left=300, height=20),
    ]
    assert group_rows(ocr) == ["스타벅스", "아메리카노 4,500", "합계 4,500"]
    assert analyze(ocr, CAPTURED).total == 4500


def test_아무것도_못_찾아도_실패하지_않는다():
    s = analyze(lines("???\n..."), None)
    assert (s.total, s.merchant, s.date, s.category) == (None, None, None, None)


def test_json_모양():
    body = analyze(lines(CAFE_CARD_SLIP), CAPTURED).to_json()
    assert body["date"] == "2026-09-24T08:05:00+09:00"
    assert set(body["confidence"]) == {"merchant", "date", "total", "category"}


def test_카테고리_키워드():
    assert guess_category("CU 역삼점") == "생활"
    assert guess_category("CUSTOMER COPY") is None
    assert guess_category("카카오T 택시") == "교통"
    assert guess_category("다이소 강남점") == "쇼핑"
    assert guess_category("메가MGC커피 역삼") == "카페"
    assert guess_category("알 수 없는 가게") is None
