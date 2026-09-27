import { Alert, Platform } from 'react-native';

// 예/아니오 확인 창. 폰은 기본 알림창, 웹 미리보기는 브라우저 confirm (RN-web에는 Alert 버튼이 없음)
export function confirm(title: string, message: string, okLabel = '확인', destructive = false): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: '취소', style: 'cancel', onPress: () => resolve(false) },
      { text: okLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}

// 알림만 (확인 버튼 하나)
export function notify(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}
