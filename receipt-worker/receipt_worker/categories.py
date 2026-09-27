"""가게 이름 → 카테고리 추측. 이름은 앱의 지출 카테고리(GagebuClient/src/lib/categories.ts)와 같다.

나중에는 "같은 가게를 예전에 어떤 카테고리로 저장했는지"를 우선한다 (서버 쪽, docs/PLAN.md 4단계).
"""

# 위에서부터 먼저 맞는 것. 비교는 대소문자·공백 무시
CATEGORY_KEYWORDS: list[tuple[str, list[str]]] = [
    ("카페", [
        "스타벅스", "starbucks", "투썸", "이디야", "메가커피", "메가mgc", "빽다방", "컴포즈", "폴바셋", "할리스",
        "커피빈", "파스쿠찌", "블루보틀", "파리바게뜨", "뚜레쥬르", "베이커리", "커피", "coffee", "카페", "cafe",
    ]),
    ("생활", [
        "gs25", "cu", "세븐일레븐", "7-eleven", "이마트24", "이마트", "emart", "홈플러스", "롯데마트", "미니스톱",
        "노브랜드", "하나로마트", "편의점", "마트", "약국", "세탁",
    ]),
    ("교통", [
        "택시", "카카오t", "버스", "지하철", "코레일", "korail", "srt", "주유", "sk에너지", "gs칼텍스", "s-oil",
        "에쓰오일", "현대오일뱅크", "오일뱅크", "주차", "톨게이트", "하이패스",
    ]),
    ("쇼핑", [
        "쿠팡", "coupang", "다이소", "올리브영", "무신사", "11번가", "g마켓", "옥션", "백화점", "아울렛", "유니클로",
    ]),
    ("식비", [
        "식당", "국밥", "치킨", "피자", "김밥", "분식", "반점", "짜장", "버거", "맥도날드", "롯데리아", "버거킹",
        "맘스터치", "서브웨이", "bbq", "교촌", "bhc", "배달의민족", "요기요", "고기", "삼겹", "한식", "중식",
        "일식", "초밥", "스시", "라멘", "냉면", "포차", "주점", "칼국수", "순대", "족발", "보쌈",
    ]),
]

# 편의점 약자처럼 짧은 키워드는 다른 단어 속에 섞여 잘못 맞기 쉬워서 단어 경계에서만
_SHORT_KEYWORDS = {"cu", "srt"}


def _normalize(text: str) -> str:
    return "".join(text.lower().split())


def guess_category(text: str | None) -> str | None:
    if not text:
        return None
    normalized = _normalize(text)
    for category, keywords in CATEGORY_KEYWORDS:
        for keyword in keywords:
            if keyword in _SHORT_KEYWORDS:
                # "CU 역삼점"은 맞고 "CUSTOMER"는 안 맞게: 원문 단어 단위로 비교
                words = [w.strip("()[]") for w in text.lower().split()]
                if keyword in words:
                    return category
            elif keyword in normalized:
                return category
    return None
