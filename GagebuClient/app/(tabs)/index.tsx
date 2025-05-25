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
  TouchableOpacity,
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
import { red } from 'react-native-reanimated/lib/typescript/Colors';
import { useSafeAreaFrame, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // 열려 있는 스와이프 항목을 추적할 ref
  const openedSwipeRef = useRef<Swipeable | null>(null);
  const openedItemIdRef = useRef<number | null>(null);

  // 편집 버튼 관련
  const [editMode, setEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const navigation = useNavigation();

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
    console.log('closeSwipeIfOpen 호출됨, openedItemId:', openedItemIdRef.current);

    if (openedSwipeRef.current) {
      openedSwipeRef.current.close();
      console.log(`[${openedItemIdRef.current}] 스와이프 강제 닫기`);
      openedSwipeRef.current = null;
      openedItemIdRef.current = null;
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
      await axios.delete(`http://192.168.219.105:5067/api/transactions/${id}`);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      //openedSwipeRef.current = null; // 삭제 후 닫힘 처리
    } catch (error) {
      console.error('삭제 실패:', error);
    }
  };

  // 스와이프 닫기 처리 함수
  // const closeOpened = () => {
  //   if (openedSwipeRef.current) {
  //     openedSwipeRef.current.close(); // 열려 있는 스와이프 닫기
  //     openedSwipeRef.current = null;
  //   }
  // };

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

  // 검색 날들 라디오 버튼처럼
  const [selectedButton, setSelectedButton] = useState('today'); // 기본 선택
  const buttons = [
    { id: 'today', label: '오늘만 보끄얌' },
    { id: 'date', label: '날짜 선택' },
    { id: 'month', label: '달 검색' },
  ];

  // 콤보박스 관련
  const [selectedValue, setSelectedValue] = useState('전체');
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const options = [
    { label: '전체', value: 'all' },
    { label: '입금', value: 'deposit' },
    { label: '출금', value: 'withdrawal' },
  ];

  const insets = useSafeAreaInsets();
  return (
    //<TouchableWithoutFeedback onPress={closeSwipeIfOpen}>
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      {/* 
          ✅ 수정: 헤더 대신 화면 내에 편집/삭제 버튼 + 오늘/새로고침 버튼
          buttonRow: 왼쪽 "오늘만 보기"/오른쪽 "새로고침" + 편집/삭제 
        */}
      <View style={styles.edit_del_between}>
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
                  await axios.delete(`http://192.168.219.105:5067/api/transactions/${id}`);
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

      {/* 새로고침 
        <Pressable style={styles.smallShowTodayButton} onPress={fetchData}>
          <Ionicons name="refresh" size={23} color="black" />
        </Pressable>
        */
      }
      {/* 👉 새로고침 버튼을 Pressable로 교체 */}
      {/* 
          ✅ 수정: 헤더 대신 화면 내에 편집/삭제 버튼 + 오늘/새로고침 버튼
          buttonRow: 왼쪽 "오늘만 보기"/오른쪽 "새로고침" + 편집/삭제 
      */}

      <View style={styles.select_between}>
        {buttons.map((button) => (
          <Pressable
            key={button.id}
            style={styles.TodayButton}
            onPress={() => setSelectedButton(button.id)}
          >
            <Text style={[
              styles.buttonText,
              selectedButton === button.id && styles.selectedButtonText // 선택된 텍스트 스타일
            ]}>
              {button.label}
            </Text>
          </Pressable>
        ))}
        <View style={styles.comboContainer}>
          {/* 콤보박스 버튼 */}
          <TouchableOpacity
            style={styles.comboButton}
            onPress={() => setDropdownVisible(!dropdownVisible)}
          >
            <Text>{selectedValue} ▼</Text>
          </TouchableOpacity>

          {/* 드롭다운 목록 */}
          {dropdownVisible && (
            <View style={styles.dropdown}>
              {options.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedValue(item.label);
                    setDropdownVisible(false);
                  }}
                >
                  <Text>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={styles.total_container}>
        <View style={styles.total_between}>
          <Text style={styles.totaltext}> 3건 </Text>

          <View style={styles.total_item_group}>
            <Text style={styles.totaltext}>입금</Text>
            <Text style={[styles.totaltext, styles.desc_in]}>121321</Text>
          </View>

          <View style={styles.total_item_group}>
            <Text style={styles.totaltext}>출금</Text>
            <Text style={[styles.totaltext, styles.desc_out]}>121321</Text>
          </View>

          <View style={styles.total_item_group}>
            <Text style={styles.totaltext}>합계</Text>
            <Text style={styles.totaltext}>121321</Text>
          </View>
        </View>
      </View>

      <FlatList style={styles.flatList}
        onScrollBeginDrag={closeSwipeIfOpen}
        onMomentumScrollBegin={closeSwipeIfOpen} // 관성 스크롤 시작할 때도
        data={transactions}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => {
          let swipeableRef: Swipeable | null = null;

          return (
            <Swipeable
              overshootRight={false}
              ref={(ref) => { swipeableRef = ref; }}
              onSwipeableWillOpen={(direction) => {
                console.log(`[${item.id}] 스와이프 시작`);
                console.log(`[${item.id}] 기존 열린 아이템:`, openedItemIdRef.current);

                // ✅ 기존 열린 스와이프 닫기
                if (openedSwipeRef.current && openedItemIdRef.current !== item.id) {
                  console.log(`[${item.id}] 기존 ${openedItemIdRef.current} 스와이프 닫기`);
                  openedSwipeRef.current.close();

                  // ✅ 즉시 상태 초기화 (애니메이션 완료를 기다리지 않음)
                  openedSwipeRef.current = null;
                  openedItemIdRef.current = null;
                }

                // ✅ 새로운 스와이프 정보 즉시 설정
                openedSwipeRef.current = swipeableRef;
                openedItemIdRef.current = item.id;
              }}
              // ✅ 스와이프가 완전히 열렸을 때
              onSwipeableOpen={(direction) => {
                console.log(`[${item.id}] 스와이프 열림 ✅`);
                // ✅ 이미 WillOpen에서 설정했으므로 중복 제거
              }}

              onSwipeableClose={(direction) => {
                console.log(`[${item.id}] 스와이프 닫힘 ❌`);
                // ✅ 현재 열린 아이템이 맞을 때만 초기화
                if (openedItemIdRef.current === item.id) {
                  openedSwipeRef.current = null;
                  openedItemIdRef.current = null;
                }
              }}

              renderRightActions={() => (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(item.id)}
                >
                  <Text style={styles.deleteText}>삭제</Text>
                </TouchableOpacity>
              )}>
              <TouchableOpacity
                activeOpacity={1}  // 터치 피드백
                onPress={() => {
                  console.log('터치됨!!', item.id);

                  if (editMode) {
                    setSelectedIds((prev) =>
                      prev.includes(item.id)
                        ? prev.filter((id) => id !== item.id)
                        : [...prev, item.id]
                    );
                  } else {
                    closeSwipeIfOpen();
                  }
                }}
              >
                <View style={styles.cardRow}>
                  {editMode && (
                    <View style={[
                      styles.checkbox,
                      selectedIds.includes(item.id) && styles.checked,
                    ]} />
                  )}
                  <View style={styles.cardContent}>
                    <View style={styles.card}>
                      <View style={styles.card_between}>
                        <Text style={styles.text}>
                          {item.cost.toLocaleString()}원
                        </Text>
                        <Text style={styles.desc}/*style={[item.paytype === 0 || item.paytype === 1 ? styles.desc_out : styles.desc_in]}*/>
                          {item.paytype === 0 || item.paytype === 1 ? '지출' : '수입'}
                        </Text>
                      </View>
                      <View style={styles.card_between}>
                        <Text style={styles.desc}>{item.type}</Text>
                        <Text style={styles.date}>
                          {new Date(item.date).toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
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
    //</TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    position: 'relative',
    top: -10, // 10px 위로 올림
  },
  /*smallShowTodayButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    position: 'absolute',
    right: 0,
    marginTop: 4,
  },*/
  total_container: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: '#ddd',
    borderBottomColor: '#ddd',
    paddingVertical: 10,
  },
  total_between: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: 5,
  },
  totaltext: {
    fontSize: 18,
    color: '#666',
    marginTop: 5,
  },
  total_item_group: {
    flex: 1, // 입금, 출금, 합계 영역을 동일하게
    marginLeft: 10, // n건과의 간격
    alignItems: 'center', // 각 그룹 내에서 중앙 정렬
  },
  totalmoneytext: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  desc_out: {
    color: '#ff6464',
  },
  desc_in: {
    color: '#007AFF',
  },
  flatList: {
    flex: 0.3,
    marginTop: 15,
  },
  card: {
    backgroundColor: '#ffffff',
    borderStyle: 'dashed',
    borderWidth: 1,
    padding: 16,
    borderRadius: 20,
    marginBottom: 8,
  },
  card_between: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
    marginLeft: 5,
  },
  desc: {
    fontSize: 16,
    color: '#666'
  },
  text: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  date: {
    fontSize: 12,
    color: '#666',
  },
  deleteButton: {
    width: 100,         // Swipeable 이 이 폭만큼 열립니다
    backgroundColor: '#ff6464',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    marginBottom: 8,
    marginLeft: -30,
    paddingLeft: 25,
    paddingRight: 5,
  },
  deleteText: {
    fontSize: 15,
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
  select_between: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  TodayButton: {
    paddingHorizontal: 8,
    marginBottom: 4,
    alignSelf: 'flex-end', // 필요 시 가운데 정렬
  },
  buttonText: {
    color: '#828282',
    fontSize: 16,
    fontWeight: 'normal',
  },
  selectedButtonText: {
    color: '#0000cd',
    fontWeight: 'bold',
  },
  edit_del_between: {
    flexDirection: 'row',
    alignItems: 'center',
    // 버튼들 가로로 배치
    // 필요하면 justifyContent: 'space-between' 대신
    // 개별 컴포넌트에 marginLeft, marginRight 로 조정
    position: 'relative',
    top: -10, // 10px 위로 올림
  },

  customButton: {
    backgroundColor: '#fff',
    borderColor: '#fff',
    borderWidth: 2,
    borderRadius: 6,
    paddingHorizontal: 8,
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
  comboContainer: {
    position: 'relative',
    zIndex: 1000, // 다른 요소들 위에 표시
  },
  comboButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  dropdown: {
    position: 'absolute',
    top: '100%', // 버튼 바로 아래
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderTopWidth: 0, // 위쪽 테두리 제거
    borderRadius: 5,
    elevation: 3, // Android 그림자
    shadowColor: '#000', // iOS 그림자
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  dropdownItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
});
