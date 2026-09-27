import { Image, ImageSourcePropType, Text } from 'react-native';

const ASSET_AVATARS: Record<string, { label: string; source: ImageSourcePropType }> = {
  'icon:cat': { label: '복숭아 고양이', source: require('../../assets/images/avatars/cat.png') },
  'icon:dog': { label: '크림 강아지', source: require('../../assets/images/avatars/dog.png') },
  'icon:rabbit': { label: '하얀 토끼', source: require('../../assets/images/avatars/rabbit.png') },
  'icon:bear': { label: '꿀빛 곰', source: require('../../assets/images/avatars/bear.png') },
};

export const PROFILE_AVATARS = [
  ...['🐷', '🐰', '🐻', '🐱', '🐶', '🦊', '🐼', '🐥'].map(value => ({ value, label: value })),
  ...Object.entries(ASSET_AVATARS).map(([value, asset]) => ({ value, label: asset.label })),
];

// 서버에는 이미지 파일 대신 짧은 식별자를 저장한다. 기존 이모지도 그대로 표시한다.
export function ProfileAvatar({ value, size, emojiSize = size * 0.8 }: { value: string; size: number; emojiSize?: number }) {
  const asset = ASSET_AVATARS[value];
  if (asset) {
    return <Image source={asset.source} style={{ width: size, height: size }} resizeMode="contain" accessibilityLabel={asset.label} />;
  }
  return <Text style={{ fontSize: emojiSize }}>{value.startsWith('icon:') ? '👤' : value}</Text>;
}
