using System.Threading.Channels;

namespace Gagebu_Server.Push
{
    // 푸시는 저장 요청과 분리해 백그라운드에서 보낸다 (요청이 느려지거나 실패하지 않게).
    // 서버가 재시작되면 큐에 남은 알림은 사라진다 — 알림은 놓쳐도 되는 정보(앱을 열면 실시간으로 다시 받음)
    public abstract record PushJob;

    // 거래가 새로 기록됨 → 다른 멤버에게 알림 + (지출이면) 예산 80%·100% 넘었는지
    public record TransactionCreatedJob(int HouseholdId, int ActorUserId, int TransactionId) : PushJob;

    // 초대 코드로 새 멤버가 들어옴 → 원래 있던 멤버들에게 알림
    public record MemberJoinedJob(int HouseholdId, int UserId) : PushJob;

    public class PushQueue
    {
        private readonly Channel<PushJob> _channel = Channel.CreateBounded<PushJob>(new BoundedChannelOptions(1000)
        {
            FullMode = BoundedChannelFullMode.DropOldest,
            SingleReader = true,
        });

        public void Enqueue(PushJob job) => _channel.Writer.TryWrite(job);

        public ChannelReader<PushJob> Reader => _channel.Reader;
    }
}
