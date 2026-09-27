using GagebuShared;

namespace Gagebu_Server.Auth
{
    // 지금 요청의 사용자와 가계부. CurrentUserMiddleware가 채운다 (요청마다 새로 만듦)
    public class CurrentUser
    {
        public int? UserId { get; private set; }
        public int? HouseholdId { get; private set; }
        public eHouseholdRole? Role { get; private set; }

        public void Set(int? userId, int? householdId, eHouseholdRole? role)
        {
            UserId = userId;
            HouseholdId = householdId;
            Role = role;
        }
    }
}
