import { isAxiosError } from 'axios';

export type ApiErrorKind = 'network' | 'timeout' | 'server' | 'unknown';

export interface ApiErrorInfo {
  kind: ApiErrorKind;
  title: string;
  message: string;
}

// 요청 실패를 사용자에게 보여줄 문구로. 연결 문제와 서버 오류를 구분한다
export function describeError(error: unknown): ApiErrorInfo {
  if (isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return { kind: 'timeout', title: '서버 응답이 없어요', message: '와이파이와 서버가 켜져 있는지 확인해 주세요' };
    }
    if (!error.response) {
      return { kind: 'network', title: '서버에 연결할 수 없어요', message: '와이파이와 서버가 켜져 있는지 확인해 주세요' };
    }
    if (error.response.status >= 500) {
      return { kind: 'server', title: '서버에 문제가 생겼어요', message: '잠시 후 다시 시도해 주세요' };
    }
    // 4xx: 서버가 보낸 이유(문자열)가 있으면 그대로
    const reason = typeof error.response.data === 'string' ? error.response.data : '';
    return { kind: 'server', title: '요청을 처리하지 못했어요', message: reason || '입력한 내용을 확인해 주세요' };
  }
  return { kind: 'unknown', title: '문제가 생겼어요', message: '잠시 후 다시 시도해 주세요' };
}
