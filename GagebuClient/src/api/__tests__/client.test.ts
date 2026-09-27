import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { AuthTokens } from '../../models/Auth';

// 토큰 저장소는 메모리 가짜로 (폰 암호화 저장소 없이)
let mockStored: AuthTokens | null = null;
jest.mock('../../auth/tokenStore', () => ({
  tokenStore: {
    get: jest.fn(async () => mockStored),
    set: jest.fn(async (t: AuthTokens) => {
      mockStored = { ...t };
    }),
    clear: jest.fn(async () => {
      mockStored = null;
    }),
  },
}));

import { API, onSignedOut } from '../client';

const inAnHour = () => new Date(Date.now() + 3600_000).toISOString();
const tokens = (n: number, expiresAt = inAnHour()): AuthTokens => ({ token: `access-${n}`, refreshToken: `refresh-${n}`, expiresAt, sessionId: 1 });

// 가짜 서버: 요청을 기록하고 규칙대로 응답
type Handler = (config: InternalAxiosRequestConfig) => Promise<{ status: number; data?: unknown }>;
let handler: Handler;
const seen: { url?: string; auth?: string }[] = [];

function respond(config: InternalAxiosRequestConfig, status: number, data: unknown = {}): Promise<AxiosResponse> {
  const response = { status, data, statusText: '', headers: {}, config } as AxiosResponse;
  if (status >= 400) return Promise.reject(new AxiosError(`HTTP ${status}`, String(status), config, null, response));
  return Promise.resolve(response);
}

beforeEach(() => {
  mockStored = null;
  seen.length = 0;
  API.defaults.adapter = async (config) => {
    seen.push({ url: config.url, auth: config.headers?.Authorization as string | undefined });
    const { status, data } = await handler(config);
    return respond(config, status, data);
  };
});

// 접근 토큰 access-2 이상만 받아 주는 서버
const serverAccepting = (valid: string, refresh: (config: InternalAxiosRequestConfig) => Promise<{ status: number; data?: unknown }>): Handler =>
  async (config) => {
    if (config.url === '/api/auth/refresh') return refresh(config);
    return config.headers?.Authorization === `Bearer ${valid}` ? { status: 200, data: 'ok' } : { status: 401 };
  };

test('토큰을 붙여 보낸다', async () => {
  mockStored = tokens(1);
  handler = serverAccepting('access-1', async () => ({ status: 500 }));
  await API.get('/api/me');
  expect(seen[0].auth).toBe('Bearer access-1');
});

test('401이면 갱신하고 새 토큰으로 한 번 다시 보낸다', async () => {
  mockStored = tokens(1);
  handler = serverAccepting('access-2', async () => ({ status: 200, data: tokens(2) }));

  const res = await API.get('/api/me');

  expect(res.data).toBe('ok');
  expect(seen.map((s) => s.url)).toEqual(['/api/me', '/api/auth/refresh', '/api/me']);
  expect(seen[2].auth).toBe('Bearer access-2');
  expect(mockStored?.refreshToken).toBe('refresh-2'); // 새 갱신 토큰으로 바꿔 저장
});

test('동시에 여러 요청이 401이어도 갱신은 한 번', async () => {
  mockStored = tokens(1);
  let refreshCalls = 0;
  handler = serverAccepting('access-2', async () => {
    refreshCalls++;
    await new Promise((r) => setTimeout(r, 20));
    return { status: 200, data: tokens(2) };
  });

  await Promise.all([API.get('/a'), API.get('/b'), API.get('/c')]);

  expect(refreshCalls).toBe(1);
});

test('서버가 갱신을 거절하면 로그아웃된다', async () => {
  mockStored = tokens(1);
  const signedOut = jest.fn();
  onSignedOut(signedOut);
  handler = serverAccepting('never', async () => ({ status: 401 }));

  await expect(API.get('/api/me')).rejects.toMatchObject({ response: { status: 401 } });

  expect(signedOut).toHaveBeenCalledTimes(1);
  expect(mockStored).toBeNull();
  onSignedOut(null);
});

test('갱신 요청이 연결 실패면 로그인은 유지한다', async () => {
  mockStored = tokens(1);
  const signedOut = jest.fn();
  onSignedOut(signedOut);
  handler = serverAccepting('never', async () => ({ status: 503 }));

  await expect(API.get('/api/me')).rejects.toBeDefined();

  expect(signedOut).not.toHaveBeenCalled();
  expect(mockStored?.refreshToken).toBe('refresh-1');
  onSignedOut(null);
});

test('두 번째 401에서는 다시 갱신하지 않는다 (무한 반복 방지)', async () => {
  mockStored = tokens(1);
  let refreshCalls = 0;
  handler = serverAccepting('never', async () => {
    refreshCalls++;
    return { status: 200, data: tokens(2 + refreshCalls) };
  });

  await expect(API.get('/api/me')).rejects.toMatchObject({ response: { status: 401 } });
  expect(refreshCalls).toBe(1);
});

test('만료가 임박한 토큰은 요청 전에 미리 갱신한다', async () => {
  mockStored = tokens(1, new Date(Date.now() + 5_000).toISOString());
  handler = serverAccepting('access-2', async () => ({ status: 200, data: tokens(2) }));

  await API.get('/api/me');

  expect(seen.map((s) => s.url)).toEqual(['/api/auth/refresh', '/api/me']);
  expect(seen[1].auth).toBe('Bearer access-2');
});

test('로그인 요청(skipAuth)은 토큰을 붙이지 않고 401이어도 갱신하지 않는다', async () => {
  mockStored = tokens(1);
  handler = async () => ({ status: 401 });

  await expect(API.post('/api/auth/dev-login', {}, { skipAuth: true })).rejects.toBeDefined();

  expect(seen).toHaveLength(1);
  expect(seen[0].auth).toBeUndefined();
});

test('로그인 안 했으면 토큰 없이 보내고 401을 그대로 돌려준다', async () => {
  handler = async () => ({ status: 401 });
  await expect(API.get('/api/me')).rejects.toMatchObject({ response: { status: 401 } });
  expect(seen).toHaveLength(1);
});
