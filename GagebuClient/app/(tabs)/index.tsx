//HomeScreen 부분

import {
  useEffect,
  useState,
  useCallback,
  useRef,
  useLayoutEffect
} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Button,
  Pressable,
  TouchableWithoutFeedback,
  GestureResponderEvent,
  TouchableOpacity
} from 'react-native';
import {
  useFocusEffect,
  useNavigation
} from '@react-navigation/native';
import { getTransactions } from '../../src/api/transactions';
import { Transaction } from '../../src/models/Transaction';

//Swipe Function
import { Swipeable } from 'react-native-gesture-handler';
import axios from 'axios';
import { Stack } from 'expo-router';


export default function HomeScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // 열려 있는 스와이프 항목을 추적할 ref
  const openedSwipeRef = useRef<Swipeable | null>(null);

  // 편집 버튼 관련
  const [editMode, setEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          style={[
            styles.customButton, // 버튼 스타일
            // 필요하면 editMode에 따라 다른 스타일 추가 가능
          ]}
          onPress={() => {
            console.log('🟢 편집 버튼 클릭됨');
            setEditMode((prev) => !prev);
            setSelectedIds([]);
          }}
        > <Text style={styles.customButtonTextB}>
            {editMode ? '취소' : '편집'}
          </Text>
        </Pressable>
      ),
      headerLeft: () =>
        editMode ? (

          <Pressable
            style={styles.customButton}
            onPress={async () => {
              if (selectedIds.length === 0) {
                console.log('⚠️ 선택된 항목 없음');
                return;
              }
              // 항목 삭제
              for (const id of selectedIds) {
                await axios.delete(`http://192.168.219.108:5067/api/transactions/${id}`);
              }
              setSelectedIds([]);
              setEditMode(false);
              await fetchData();
            }}
          >
            <Text style={styles.customButtonTextR}>삭제</Text>
          </Pressable>

        ) : null,
    });
  }, [navigation, editMode, selectedIds]);


  const fetchData = async () => {
    try {
      closeSwipeIfOpen();

      const data = await getTransactions();
      setTransactions(data);
    } catch (error) {
      console.error('❌ API 호출 실패:', error);
    }
  };

  //SwipeRef 목록 있으면 닫기(삭제 버튼 열린 목록)
  const closeSwipeIfOpen = () => {

    if (openedSwipeRef.current) {
      openedSwipeRef.current.close();
      openedSwipeRef.current = null;
    }
    else {
    }
  };

  // 새로고침 기능
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };


  //삭제
  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`http://192.168.219.108:5067/api/transactions/${id}`);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      //openedSwipeRef.current = null; // 삭제 후 닫힘 처리
    } catch (error) {
      console.error('❌ 삭제 실패:', error);
    }
  };

  // 스와이프 닫기 처리 함수
  const closeOpened = () => {
    if (openedSwipeRef.current) {
      openedSwipeRef.current.close(); // 열려 있는 스와이프 닫기
      openedSwipeRef.current = null;
    }
  };

  // 앱 실행 시 최초 로드
  useEffect(() => {
    fetchData();
  }, []);

  // 다른 화면에서 돌아올 때 자동 로드
  useFocusEffect(
    useCallback(() => {
      fetchData();
      return () => {
        closeSwipeIfOpen(); // 👈 함수 호출
      };
    }, [])
  );


  return (
    <TouchableWithoutFeedback onPress={closeSwipeIfOpen}>
      <View style={styles.container}>
        <Text style={styles.title}>🐷💰 지출 목록</Text>
        {/* 👉 새로고침 버튼을 Pressable로 교체 */}
        <Pressable style={styles.smallButton} onPress={fetchData}>
          <Text style={styles.buttonText}>새로고침</Text>
        </Pressable>
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => {
            let swipeableRef: Swipeable | null = null;

            return (
              <Swipeable
                ref={(ref) => (swipeableRef = ref)}
                onSwipeableWillOpen={() => {
                  if (
                    openedSwipeRef.current &&
                    openedSwipeRef.current !== swipeableRef
                  ) {
                    openedSwipeRef.current.close();
                  }
                }}
                onSwipeableOpen={() => {
                  openedSwipeRef.current = swipeableRef;
                }}
                renderRightActions={() => (
                  <Pressable
                    style={styles.deleteButton}
                    onPress={() => handleDelete(item.id)}
                    onStartShouldSetResponder={(e: GestureResponderEvent) => true}
                  >
                    <Text style={styles.deleteText}>삭제</Text>
                  </Pressable>
                )}
              >
                <View style={styles.cardRow}>
                  {editMode && (
                    <Pressable
                      style={[
                        styles.checkbox,
                        selectedIds.includes(item.id) && styles.checked,
                      ]}
                      onPress={() => {
                        setSelectedIds((prev) =>
                          prev.includes(item.id)
                            ? prev.filter((id) => id !== item.id)
                            : [...prev, item.id]
                        );
                      }}
                    />
                  )}
                  <View style={styles.cardContent}>
                    <View style={styles.card}>
                      <Text style={styles.desc}>{item.type}</Text>
                      <Text style={styles.text}>
                        {item.cost.toLocaleString()}원
                      </Text>
                      <Text style={styles.date}>
                        {new Date(item.date).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </View>
              </Swipeable>
            );
          }}
          ListEmptyComponent={
            <Text style={{ marginTop: 20 }}>📭 지출 내역이 없습니다.</Text>
          }
          contentContainerStyle={
            transactions.length === 0 ? styles.centerEmpty : undefined
          }
        />
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  desc: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  text: {
    fontSize: 16,
    marginTop: 4,
  },
  date: {
    fontSize: 12,
    marginTop: 4,
    color: '#666',
  },
  deleteButton: {
    backgroundColor: '#ff4d4d',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    width: 80,
    borderRadius: 8,
    marginBottom: 12,
  },
  deleteText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#555',
    borderRadius: 4,
    marginRight: 12,
    marginLeft: 4,
    backgroundColor: '#fff',
  },
  checked: {
    backgroundColor: '#333',
  },
  cardContent: {
    flex: 1,
  },
  centerEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 4,
    marginBottom: 4,
    alignSelf: 'flex-end', // 필요 시 가운데 정렬
  },
  buttonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  customButton: {
    backgroundColor: '#fff',       // 버튼 배경 흰색
    borderColor: '#fff',
    borderWidth: 2,
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10
  },
  customButtonTextB: {
    color: '#007AFF',      // 글씨 파란색
    fontWeight: '600',
    fontSize: 16,
  },
  customButtonTextR: {
    color: '#ff4d4d',      // 글씨 파란색
    fontWeight: '600',
    fontSize: 16,
  },
});
