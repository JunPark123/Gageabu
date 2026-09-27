using System.ComponentModel.DataAnnotations;

namespace GagebuShared
{
    public enum eReceiptStatus
    {
        Pending = 0,     // 분석 대기
        Processing = 1,  // 워커가 분석 중
        Ready = 2,       // 추천 초안 있음 → 사용자 확인 대기
        Failed = 3,      // 분석 실패 (사용자가 직접 입력해 확정할 수는 있음)
        Confirmed = 4,   // 거래로 저장됨
        Discarded = 5,   // 사용자가 버림
    }

    // 영수증 분석 작업. 사진은 저장하지 않고 폰 OCR 결과(글자)만 받는다 (docs/PLAN.md 4단계)
    public class ReceiptJob
    {
        [Key]
        public int Id { get; set; }
        public int HouseholdId { get; set; }
        public int? CreatedByUserId { get; set; }
        public string ClientRequestId { get; set; } = "";   // 앱이 만든 요청 Id. 같은 값 재전송 = 같은 작업 (가계부별 유일)
        public eReceiptStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }             // UTC
        public DateTime? CapturedAt { get; set; }           // 촬영 시각 (영수증에 날짜가 없을 때 대신)

        public string OcrJson { get; set; } = "[]";         // 입력: OCR 줄 목록 (jsonb)

        // 워커
        public int AttemptCount { get; set; }
        public DateTime? ClaimedAt { get; set; }
        public DateTime? ProcessedAt { get; set; }
        public string? EngineVersion { get; set; }
        public string? SuggestionJson { get; set; }         // 엔진이 처음 추천한 값 (수정하지 않음, jsonb)
        public string? FailureReason { get; set; }

        // 확정
        public DateTime? ConfirmedAt { get; set; }
        public string? ConfirmedJson { get; set; }          // 사용자가 최종 확정한 값 (jsonb) — 추천과 비교해 규칙 개선에 씀
        public List<int> TransactionIds { get; set; } = new(); // 만들어진 거래
    }
}
