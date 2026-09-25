using GagebuShared;

namespace Gagebu_Server.Servecies
{
    // 지금 요청이 다루는 가계부
    public interface ICurrentHousehold
    {
        int Id { get; }
    }

    // 로그인 도입 전: 항상 기본 가계부. 3단계에서 JWT의 사용자 → 소속 Household로 바꾼다
    public class DefaultHousehold : ICurrentHousehold
    {
        public int Id => Household.DefaultId;
    }
}
