using Gagebu_Server.Push;

namespace Gagebu_Server.Tests;

// 테스트용 푸시 발송기: 보낸 메시지를 모아 두고, 지정한 토큰은 DeviceNotRegistered로 응답
public class FakePushSender : IPushSender
{
    private readonly List<PushMessage> _sent = [];
    public HashSet<string> DeadTokens { get; } = [];

    public IReadOnlyList<PushMessage> Sent
    {
        get { lock (_sent) return _sent.ToList(); }
    }

    public void Clear()
    {
        lock (_sent) _sent.Clear();
        DeadTokens.Clear();
    }

    public Task<IReadOnlyList<PushResult>> SendAsync(IReadOnlyList<PushMessage> messages, CancellationToken ct)
    {
        lock (_sent) _sent.AddRange(messages);
        IReadOnlyList<PushResult> results = messages
            .Select(m => DeadTokens.Contains(m.To) ? new PushResult(m.To, false, "DeviceNotRegistered") : new PushResult(m.To, true, null))
            .ToList();
        return Task.FromResult(results);
    }

    // 백그라운드 발송을 기다린다 (조건이 맞으면 바로)
    public async Task<IReadOnlyList<PushMessage>> WaitAsync(Func<IReadOnlyList<PushMessage>, bool> done, int timeoutMs = 5000)
    {
        var until = DateTime.UtcNow.AddMilliseconds(timeoutMs);
        while (DateTime.UtcNow < until)
        {
            if (done(Sent)) return Sent;
            await Task.Delay(50);
        }
        return Sent;
    }
}
