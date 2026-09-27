import { AxiosError, AxiosHeaders } from 'axios';
import { describeError } from '../apiError';

const response = (status: number, data: unknown = '') =>
  ({ status, data, statusText: '', headers: {}, config: { headers: new AxiosHeaders() } });

describe('describeError', () => {
  it('서버에 닿지 못함 → 연결 안내', () => {
    const e = new AxiosError('Network Error', 'ERR_NETWORK');
    expect(describeError(e)).toMatchObject({ kind: 'network', title: '서버에 연결할 수 없어요' });
  });
  it('시간 초과 → 응답 없음 안내', () => {
    const e = new AxiosError('timeout of 6000ms exceeded', 'ECONNABORTED');
    expect(describeError(e).kind).toBe('timeout');
  });
  it('5xx → 서버 문제', () => {
    const e = new AxiosError('fail', 'ERR_BAD_RESPONSE', undefined, undefined, response(500) as never);
    expect(describeError(e)).toMatchObject({ kind: 'server', title: '서버에 문제가 생겼어요' });
  });
  it('4xx → 서버가 보낸 이유 표시', () => {
    const e = new AxiosError('fail', 'ERR_BAD_REQUEST', undefined, undefined, response(400, 'from and to must be given together') as never);
    expect(describeError(e).message).toBe('from and to must be given together');
  });
  it('axios 에러가 아니면 일반 안내', () => {
    expect(describeError(new Error('x')).kind).toBe('unknown');
  });
});
