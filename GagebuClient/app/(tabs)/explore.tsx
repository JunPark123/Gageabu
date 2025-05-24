import 'react-native-gesture-handler';            // 앱 진입점에서 최상단
import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

export default function DemoRow() {
  return (
    <View style={styles.rowWrapper}>
      <Swipeable
        overshootRight={false}
        renderRightActions={() => (
          <View style={styles.right}>
            <Text style={styles.delete}>삭제</Text>
          </View>
        )}
      >
        <View style={styles.card}>
          <Text>스와이프 테스트</Text>
        </View>
      </Swipeable>
    </View>
  );
}

const BORDER_RADIUS = 20;
const BUTTON_WIDTH = 80;

const styles = StyleSheet.create({
  /* 한 줄 전체(여백 전용) */
  rowWrapper: {
    marginBottom: 8,
  },

  /* 카드(앞 레이어) */
  card: {
    backgroundColor: '#ffffff',
    borderStyle: 'dashed',
    borderWidth: 1,
    padding: 30,
    borderRadius: BORDER_RADIUS,
    overflow: 'hidden',          // 버튼 모서리 삐져나오는 것 방지
    marginTop: 80,
  },

  /* 삭제 버튼 컨테이너(뒤 레이어) */
  right: {
    width: BUTTON_WIDTH,         // Swipeable 이 이 폭만큼 열립니다
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ff3b30',
    marginTop: 80,
    borderTopRightRadius: BORDER_RADIUS,
    borderBottomRightRadius: BORDER_RADIUS,
  },
  delete: {
    color: '#fff',
    fontWeight: 'bold',
  },
});