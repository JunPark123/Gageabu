import { memo } from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { APP_ICON_SVGS, AppIconName } from './appIconSvgs';

export type { AppIconName };

// 부자돼지 컬러(소프트 3D) 아이콘 — 기능·카테고리·설정 메뉴용. 장식이라 읽기 도구에서는 숨긴다
export const AppIcon = memo(function AppIcon({ name, size = 32 }: { name: AppIconName; size?: number }) {
  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <SvgXml xml={APP_ICON_SVGS[name]} width={size} height={size} />
    </View>
  );
});
