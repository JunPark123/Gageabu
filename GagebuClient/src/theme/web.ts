import { Platform, TextStyle } from 'react-native';

// 웹 미리보기에서 입력칸 포커스 테두리 제거 (RN 타입에 outlineStyle 'none'이 없어서 캐스팅). 폰에는 영향 없음
export const noWebOutline = (Platform.OS === 'web' ? { outlineStyle: 'none', outlineWidth: 0 } : {}) as unknown as TextStyle;
