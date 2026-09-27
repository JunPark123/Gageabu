// 서버 응답 모양 (docs/PLAN.md 4장 "서버 API")

export enum HouseholdRole {
  Owner = 1,   // 방장: 초대·내보내기·이름 변경
  Member = 2,
}

export interface UserInfo {
  id: number;
  nickname: string;
  avatar: string;   // 이모지
}

export interface Member {
  userId: number;
  nickname: string;
  avatar: string;
  role: HouseholdRole;
  joinedAt: string;
}

export interface Household {
  id: number;
  name: string;
  myRole: HouseholdRole;
  maxMembers: number;
  members: Member[];   // 가입 순
}

export interface Me {
  user: UserInfo;
  household: Household;
}

// 토큰 한 벌. 접근 토큰(1시간)이 만료되면 갱신 토큰으로 새 한 벌을 받는다 (갱신 토큰도 매번 바뀜)
export interface AuthTokens {
  token: string;
  expiresAt: string;
  refreshToken: string;
  sessionId: number;
}

export interface LoginResponse extends AuthTokens {
  me: Me;
}

export interface Session {
  id: number;
  deviceName: string;
  createdAt: string;
  lastUsedAt: string;
  current: boolean;
}

export interface Invite {
  code: string;
  expiresAt: string;
}

export interface InvitePreview {
  householdName: string;
  inviterNickname: string;
  memberCount: number;
  expiresAt: string;
}
