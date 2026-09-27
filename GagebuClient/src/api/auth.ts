import { API } from './client';
import { Household, Invite, InvitePreview, LoginResponse, Me, Session } from '../models/Auth';

// 개발용 로그인 (개발 서버에서만. 운영 서버는 404) — 같은 key = 같은 사용자
export async function devLogin(key: string, nickname: string | undefined, deviceName: string): Promise<LoginResponse> {
  const res = await API.post<LoginResponse>('/api/auth/dev-login', { key, nickname, deviceName }, { skipAuth: true });
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
