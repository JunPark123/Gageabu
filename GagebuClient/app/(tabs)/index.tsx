//HomeScreen 부분

import {
  useEffect,
  useState,
  useCallback,
  useRef,
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
import { Double } from 'react-native/Libraries/Types/CodegenTypes';


export default function HomeScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // 열려 있는 스와이프 항목을 추적할 ref
  const openedSwipeRef = useRef<Swipeable | null>(null);

  // 편집 버튼 관련
  const [editMode, setEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const navigation = useNavigation();
  const [showTodayOnly, setShowTodayOnly] = useState(false);

  //오늘 날짜 필터링 함수
  const isToday = (dateStr: string): boolean => {
    const itemDate = new Date(dateStr);
    const now = new Date();
    return (
      itemDate.getFullYear() === now.getFullYear() &&
      itemDate.getMonth() === now.getMonth() &&
      itemDate.getDate() === now.getDate()
    );
  };

  enum eCategoryType {
    지출, 수입, 합계
  }
  const totalCost = (type: eCategoryType): number => {

    return 100;
  }




  const fetchData = async () => {
    try {
      closeSwipeIfOpen();

      const data = await getTransactions();
      setTransactions(data);
    } catch (error) {
      console.error('API 호출 실패:', error);
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
      console.error('삭제 실패:', error);
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
        {/* 
          ✅ 수정: 헤더 대신 화면 내에 편집/삭제 버튼 + 오늘/새로고침 버튼
          buttonRow: 왼쪽 "오늘만 보기"/오른쪽 "새로고침" + 편집/삭제 
        */}
        <View style={styles.buttonRowA}>
          {/* 
      편집 전( editMode === false ): 오른쪽에 "편집" 버튼만 
      왼쪽은 여백(placeholder)으로 공간 확보 
  */}
          {!editMode && (
            <>
              <View style={{ flex: 1 }} />
              <Pressable
                style={styles.customButton}
                onPress={() => {
                  setEditMode(true);
                  setSelectedIds([]);
                }}
              >
                <Text style={styles.customButtonTextB}>편집</Text>
              </Pressable>
            </>
          )}

          {/* 
      편집 모드( editMode === true ): 
      왼쪽 = "삭제", 오른쪽 = "취소" 
  */}
          {editMode && (
            <>
              <Pressable
                style={[styles.customButton, { marginLeft: 0, marginRight: 'auto' }]}
                onPress={async () => {
                  if (selectedIds.length === 0) {
                    // console.log('선택된 항목 없음');
                    return;
                  }
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

              <Pressable
                style={styles.customButton}
                onPress={() => {
                  setEditMode(false);
                  setSelectedIds([]);
                }}
              >
                <Text style={styles.customButtonTextB}>취소</Text>
              </Pressable>
            </>
          )}
        </View>
        <Text style={styles.title}>💰 지출 목록 🐷</Text>
        {/* 👉 새로고침 버튼을 Pressable로 교체 */}

        {/* 
          ✅ 수정: 헤더 대신 화면 내에 편집/삭제 버튼 + 오늘/새로고침 버튼
          buttonRow: 왼쪽 "오늘만 보기"/오른쪽 "새로고침" + 편집/삭제 
        */}
        <View style={styles.buttonRow}>

          {/* 오늘/전체 */}
          <Pressable
            style={styles.smallRefreshButton}
            onPress={() => setShowTodayOnly(prev => !prev)}
          >
            <Text style={styles.buttonText}>
              {showTodayOnly ? '다보끄얌' : '오늘만 보끄얌'}
            </Text>
          </Pressable>

          {/* 새로고침 */}
          <Pressable style={styles.smallShowTodayButton} onPress={fetchData}>
            <Text style={styles.buttonText}>새로고침</Text>
          </Pressable>




        </View>

        <FlatList
          data={
            showTodayOnly
              ? transactions.filter((item) => isToday(item.date))
              : transactions
          }
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
            <Text style={{ marginTop: 20 }}>🐟 굴비 보고 산 날</Text>
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
    paddingTop: 60,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    position: 'relative',
    top: -5, // 10px 위로 올림
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
  smallRefreshButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 4,
    marginBottom: 4,
    alignSelf: 'flex-end', // 필요 시 가운데 정렬
  },
  smallShowTodayButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 4,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },

  buttonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonRowA: {
    flexDirection: 'row',
    alignItems: 'center',
    // 버튼들 가로로 배치
    // 필요하면 justifyContent: 'space-between' 대신
    // 개별 컴포넌트에 marginLeft, marginRight 로 조정
    position: 'relative',
    top: -20, // 10px 위로 올림
  },

  customButton: {
    backgroundColor: '#fff',
    borderColor: '#fff',
    borderWidth: 2,
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    // 굳이 alignItems: 'center'나 flexDirection: 'row'가 필요 없으면 제거
    // alignItems: 'center',
    // flexDirection: 'row',
    marginLeft: 10,  // 기본 왼쪽 여백
  },

  customButtonTextB: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 16,
  },

  customButtonTextR: {
    color: '#ff4d4d',
    fontWeight: '600',
    fontSize: 16,
  },
});
