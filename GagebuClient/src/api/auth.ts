import { API } from './client';
import { Household, Invite, InvitePreview, LoginResponse, Me, NotificationSettings, Session } from '../models/Auth';

// 개발용 로그인 (개발 서버에서만. 운영 서버는 404) — 같은 key = 같은 사용자
// 운영 서버에서는 testCode(서버의 Auth:TestLoginCode)가 맞을 때만 열린다
export async function devLogin(key: string, nickname: string | undefined, deviceName: string, deviceId: string, testCode?: string): Promise<LoginResponse> {
  const res = await API.post<LoginResponse>('/api/auth/dev-login', { key, nickname, deviceName, deviceId, testCode }, { skipAuth: true });
  return res.data;
}

// 카카오 로그인: 앱의 카카오 SDK가 받은 accessToken을 서버가 카카오에 확인하고 우리 토큰을 준다
export async function kakaoLogin(accessToken: string, deviceName: string, deviceId: string): Promise<LoginResponse> {
  const res = await API.post<LoginResponse>('/api/auth/kakao', { accessToken, deviceName, deviceId }, { skipAuth: true });
  return res.data;
}

export async function logout(): Promise<void> {
  await API.post('/api/auth/logout');
}

export async function getMe(): Promise<Me> {
  return (await API.get<Me>('/api/me')).data;
}

export async function updateProfile(patch: { nickname?: string; avatar?: string }): Promise<Me> {
  return (await API.patch<Me>('/api/me', patch)).data;
}

// ── 푸시 알림 ──

export async function registerPushToken(token: string, platform: string): Promise<void> {
  await API.put('/api/me/push-token', { token, platform });
}

export async function unregisterPushToken(token: string): Promise<void> {
  await API.delete('/api/me/push-token', { data: { token } });
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  return (await API.get<NotificationSettings>('/api/me/notifications')).data;
}

export async function updateNotificationSettings(settings: NotificationSettings): Promise<NotificationSettings> {
  return (await API.put<NotificationSettings>('/api/me/notifications', settings)).data;
}

export async function getSessions(): Promise<Session[]> {
  return (await API.get<Session[]>('/api/auth/sessions')).data;
}

export async function revokeSession(id: number): Promise<void> {
  await API.delete(`/api/auth/sessions/${id}`);
}

// ── 가계부 공유 ──

export async function renameHousehold(name: string): Promise<Household> {
  return (await API.patch<Household>('/api/household', { name })).data;
}

export async function leaveHousehold(): Promise<Me> {
  return (await API.delete<Me>('/api/household/members/me')).data;
}

export async function removeMember(userId: number): Promise<void> {
  await API.delete(`/api/household/members/${userId}`);
}

export async function createInvite(): Promise<Invite> {
  return (await API.post<Invite>('/api/invites')).data;
}

export async function previewInvite(code: string): Promise<InvitePreview> {
  return (await API.get<InvitePreview>(`/api/invites/${encodeURIComponent(code)}`)).data;
}

export async function acceptInvite(code: string, mergeMyTransactions: boolean): Promise<Me> {
  return (await API.post<Me>(`/api/invites/${encodeURIComponent(code)}/accept`, { mergeMyTransactions })).data;
}
