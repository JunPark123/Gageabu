namespace Gagebu_Server.DTO
{
    // PUT /api/me/push-token — 앱이 시작·로그인할 때마다 보낸다 (토큰은 바뀔 수 있음)
    public class RegisterPushTokenRequest
    {
        public string Token { get; set; } = "";      // ExponentPushToken[...]
        public string? Platform { get; set; }        // android / ios
    }

    public class UnregisterPushTokenRequest
    {
        public string Token { get; set; } = "";
    }

    // GET·PUT /api/me/notifications
    public class NotificationSettingsDto
    {
        public bool PartnerRecords { get; set; }     // 함께 쓰는 사람이 기록하면
        public bool Budget { get; set; }             // 예산 80%·100%를 넘으면
    }
}
