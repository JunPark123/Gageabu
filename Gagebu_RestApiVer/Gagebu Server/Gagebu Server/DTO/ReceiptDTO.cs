using GagebuShared;

namespace Gagebu_Server.DTO
{
    // OCR 한 줄. 위치(픽셀)는 있으면 워커가 줄 순서를 다시 맞추는 데 쓴다 (ML Kit의 line.frame)
    public class OcrLineDto
    {
        public string Text { get; set; } = "";
        public double? Top { get; set; }
        public double? Left { get; set; }
        public double? Width { get; set; }
        public double? Height { get; set; }
    }

    public class CreateReceiptRequest
    {
        public string ClientRequestId { get; set; } = "";   // 앱이 만든 고유값 (예: UUID). 재전송해도 같은 작업
        public DateTimeOffset? CapturedAt { get; set; }
        public List<OcrLineDto> Lines { get; set; } = new();
    }

    // 엔진 추천. 필드마다 확신도(0~1) — 낮으면 앱이 표시해서 사용자가 확인하게 한다
    public class ReceiptSuggestionDto
    {
        public string? Merchant { get; set; }
        public DateTimeOffset? Date { get; set; }
        public int? Total { get; set; }
        public string? Category { get; set; }
        // true = 이 가계부에서 같은 가게를 예전에 저장한 카테고리 (엔진 추천 대신). 서버가 보여줄 때만 채움
        public bool CategoryFromHistory { get; set; }
        public ReceiptConfidenceDto Confidence { get; set; } = new();
    }

    public class ReceiptConfidenceDto
    {
        public double? Merchant { get; set; }
        public double? Date { get; set; }
        public double? Total { get; set; }
        public double? Category { get; set; }
    }

    public class ReceiptDto
    {
        public int Id { get; set; }
        public string ClientRequestId { get; set; } = "";
        public eReceiptStatus Status { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset? CapturedAt { get; set; }
        public ReceiptSuggestionDto? Suggestion { get; set; }
        public string? FailureReason { get; set; }
        public List<int> TransactionIds { get; set; } = new();
    }

    // 확정: 한 영수증을 여러 거래로 나눠 저장할 수도 있다
    public class ConfirmReceiptRequest
    {
        public List<TransactionDto> Transactions { get; set; } = new();
    }

    // ── 워커 전용 (/internal) ──

    public class ReceiptWorkDto
    {
        public int Id { get; set; }
        public DateTimeOffset? CapturedAt { get; set; }
        public List<OcrLineDto> Lines { get; set; } = new();
        public int Attempt { get; set; }
    }

    public class ReceiptResultRequest
    {
        public string EngineVersion { get; set; } = "";
        public ReceiptSuggestionDto Suggestion { get; set; } = new();
    }

    public class ReceiptFailRequest
    {
        public string? EngineVersion { get; set; }
        public string Reason { get; set; } = "";
    }
}
