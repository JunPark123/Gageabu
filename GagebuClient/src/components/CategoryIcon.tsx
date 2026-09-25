import { View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Category, tint } from '../lib/categories';
import { useTheme } from '../theme/ThemeProvider';

// 카테고리 색이 옅게 깔린 둥근 사각형 아이콘
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
      <MaterialCommunityIcons name={category.icon} size={size * 0.5} color={category.color} />
    </View>
  );
}
