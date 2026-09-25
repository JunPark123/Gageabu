import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { PayType } from '../models/Transaction';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export interface Category {
  name: string;       // 서버 Category 값 그대로
  icon: IconName;
  color: string;      // 아이콘·차트 색 (라이트/다크 공통)
}

// 카테고리 관리 화면이 생기기 전까지 고정 목록 (추가·순서 변경은 3단계)
export const EXPENSE_CATEGORIES: Category[] = [
  { name: '식비', icon: 'silverware-fork-knife', color: '#E8603C' },
  { name: '교통', icon: 'bus', color: '#6B63D8' },
  { name: '카페', icon: 'coffee-outline', color: '#A0694A' },
  { name: '쇼핑', icon: 'shopping-outline', color: '#DB6E93' },
  { name: '생활', icon: 'home-outline', color: '#E3A13A' },
  { name: '기타', icon: 'dots-horizontal', color: '#9A928A' },
];

export const INCOME_CATEGORIES: Category[] = [
  { name: '월급', icon: 'cash-multiple', color: '#2F66E0' },
  { name: '용돈', icon: 'gift-outline', color: '#3E9C8F' },
  { name: '판매', icon: 'tray-arrow-down', color: '#5B8DEF' },
  { name: '기타', icon: 'dots-horizontal', color: '#9A928A' },
];

export const categoriesFor = (payType: PayType) =>
  payType === PayType.Income ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

// 저장된 값이 목록에 없으면(옛 데이터의 빈 문자열 등) '기타'로 본다
export function findCategory(name: string | undefined, payType: PayType): Category {
  const list = categoriesFor(payType);
  return list.find((c) => c.name === name) ?? list[list.length - 1];
}

// 아이콘 타일 배경 등 옅은 색 (#RRGGBB + 알파)
export const tint = (hex: string, alpha = 0.14) =>
  hex + Math.round(alpha * 255).toString(16).padStart(2, '0');
