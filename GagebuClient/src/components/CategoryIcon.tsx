import { View } from 'react-native';
import { Category, tint } from '../lib/categories';
import { useTheme } from '../theme/ThemeProvider';
import { AppIcon } from './AppIcon';

// 카테고리 색이 옅게 깔린 둥근 사각형 + 컬러 아이콘
export function CategoryIcon({ category, size = 40 }: { category: Category; size?: number }) {
  const { scheme } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: tint(category.color, scheme === 'dark' ? 0.22 : 0.13),
      }}
    >
      <AppIcon name={category.art} size={size * 0.72} />
    </View>
  );
}
