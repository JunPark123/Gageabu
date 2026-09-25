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
  Pressable,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import {
  useFocusEffect,
  useNavigation
} from '@react-navigation/native';
import { Modal } from 'react-native';
import { Calendar } from 'react-native-calendars';

import {
  deleteTransaction,
  getTransactions,
  getTransactionsSummary,
  TransactionQueryParams,
} from '../../src/api/transactions';
import { Transaction, TransactionSummary, TransactionQueryType, PayType } from '../../src/models/Transaction';
import dayjs from 'dayjs';
import { formatKst, kstDateRange, kstMonthRange, kstTodayRange } from '../../src/lib/date';

//Swipe Function
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// EdigView.tsx
import EditView from '@/components/ui/EditView';

// MonthlyCalendarView.tsx
import MonthlyCalendarView from '@/components/ui/MonthlyCalendarView';

export default function HomeScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsummaries, setTransactionSummary] = useState<TransactionSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // 열려 있는 스와이프 항목을 추적할 ref
  const openedSwipeRef = useRef<Swipeable | null>(null);
  const openedItemIdRef = useRef<number | null>(null);

  // 편집 버튼 관련
  const [editMode, setEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const navigation = useNavigation();

  enum eCategoryType {
    지출, 수입, 합계
  }
  const totalCost = (type: eCategoryType): number => {

    return 100;
  }



  const currentQueryTypeRef = useRef(TransactionQueryType.Monthly);

  // 조회 버튼 → 조회 구간 (KST 기준으로 계산해서 UTC로 보냄). 구간이 없으면 전체
  const getQueryRange = (selectedButton: TransactionQueryType) => {
    const { startDate, endDate, selectedMonth } = paramsRef.current;
    switch (selectedButton) {
      case TransactionQueryType.Today:
        return kstTodayRange();
      case TransactionQueryType.DateRange:
        return startDate && endDate ? kstDateRange(startDate, endDate) : undefined;
      case TransactionQueryType.Monthly:
        return kstMonthRange(selectedMonth.getFullYear(), selectedMonth.getMonth());
    }
  };

  const fetchDataWithFilter = async (selectedButton: TransactionQueryType, filterValue: string = 'all') => {
    try {
      closeSwipeIfOpen();
      const params: TransactionQueryParams = { ...getQueryRange(selectedButton) };

      if (filterValue === 'deposit') {
        params.payType = PayType.Income; // 수입
      } else if (filterValue === 'withdrawal') {
        params.payType = PayType.Expense; // 지출
      }

      const data = await getTransactionsSummary(params);
      setTransactionSummary(data);
    } catch (error) {
      console.error('fetchData API 호출 실패:', error);
    }
  }

  // 현재 콤보박스 필터를 유지한 채 다시 조회
  const fetchData = async (selectedButton: TransactionQueryType) => {
    const currentFilter = options.find(opt => opt.label === selectedValue)?.value || 'all';
    await fetchDataWithFilter(selectedButton, currentFilter);
  };
  // try {
  //   closeSwipeIfOpen();

  //   let params = {};

  //   if (selectedButton === 'today') {
  //     const today = new Date().toISOString().split('T')[0];
  //     params = { startDate: today, endDate: today };
  //   } else if (selectedButton === 'date' && startDate && endDate) {
  //     params = { startDate, endDate };
  //   } else if (selectedButton === 'month') {
  //     const year = selectedMonth.getFullYear();
  //     const month = selectedMonth.getMonth();
  //     const monthStart = new Date(year, month, 1).toISOString().split('T')[0];
  //     const monthEnd = new Date(year, month + 1, 0).toISOString().split('T')[0];
  //     params = { startDate: monthStart, endDate: monthEnd };
  //   }

  //   const data = await getTransactions();
  //   setTransactions(data);
  // } catch (error) {
  //   console.error('API 호출 실패:', error);
  // }


  //SwipeRef 목록 있으면 닫기(삭제 버튼 열린 목록)
  const closeSwipeIfOpen = () => {
    //console.log('closeSwipeIfOpen 호출됨, openedItemId:', openedItemIdRef.current);

    if (openedSwipeRef.current) {
      openedSwipeRef.current.close();
      openedSwipeRef.current = null;
      openedItemIdRef.current = null;
    }
  };

  // 새로고침 기능
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData(currentQueryTypeRef.current);//(activeButton === 'date' ? TransactionQueryType.DateRange : (activeButton === 'month' ? TransactionQueryType.Monthly : TransactionQueryType.Today));
    setRefreshing(false);
  };


  //삭제
  const handleDelete = async (id: number) => {
    try {
      await deleteTransaction(id);
    } catch (error) {
      console.error('deleteTransaction API 호출 실패:', error);
    }
  };

  // 스와이프 닫기 처리 함수
  // const closeOpened = () => {
  //   if (openedSwipeRef.current) {
  //     openedSwipeRef.current.close(); // 열려 있는 스와이프 닫기
  //     openedSwipeRef.current = null;
  //   }
  // };


  // 검색 날들 라디오 버튼처럼
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState({});
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showPeriod, setShowPeriod] = useState(true);

  const getTodayText = () => {
    const today = new Date();
    return `${today.getFullYear()}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getDate().toString().padStart(2, '0')}`;
  }

  const getInitialMonthText = () => {
    const today = new Date();
    return `${today.getFullYear()}년 ${today.getMonth() + 1}월`;
  };
  const [displayPeriodText, setDisplayPeriodText] = useState(getInitialMonthText);

  function SetDisplayText(params: string = getTodayText()) {
    setDisplayPeriodText(params);
  }

  const paramsRef = useRef({
    startDate: '',
    endDate: '',
    selectedMonth: new Date()
  });

  // 콤보박스 관련
  const [selectedValue, setSelectedValue] = useState('전체');
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const options = [
    { label: '전체', value: 'all' },
    { label: '입금', value: 'deposit' },
    { label: '출금', value: 'withdrawal' },
  ];

  // 앱 실행 시 최초 로드
  useEffect(() => {
    //  fetchData(TransactionQueryType.Today);
    paramsRef.current = { startDate, endDate, selectedMonth };
  }, [startDate, endDate, selectedMonth]);

  // 다른 화면에서 돌아올 때 자동 로드
  useFocusEffect(
    useCallback(() => {
      const currentFilter = options.find(opt => opt.label === selectedValue)?.value || 'all';
      fetchDataWithFilter(currentQueryTypeRef.current, currentFilter);
      return () => {
        closeSwipeIfOpen(); // 👈 함수 호출
      };
    }, [selectedValue])
  );

  const previousQueryTypeRef = useRef(TransactionQueryType.Today);
  const handleButtonPress = async (buttonId: TransactionQueryType) => {

    previousQueryTypeRef.current = currentQueryTypeRef.current;
    currentQueryTypeRef.current = buttonId; // 색상은 바로 변경  
    switch (buttonId) {
      case TransactionQueryType.DateRange:
        setShowDatePicker(true);
        break;
      case TransactionQueryType.Monthly:
        setShowMonthPicker(true);
        break;
      case TransactionQueryType.Today:
        setShowCalendarView(false);
        setSelectedValue('전체');
        SetDisplayText();
        setShowPeriod(true);
        fetchDataWithFilter(TransactionQueryType.Today, 'all');
        break;
    }
  };

  const selectDateRange = (day: any) => {
    const dateString = day.dateString;

    if (!startDate || (startDate && endDate)) {
      // 새로운 시작일 선택
      setStartDate(dateString);
      setEndDate('');
      setSelectedDates({
        [dateString]: { startingDay: true, color: '#50cebb', textColor: 'white' }
      });
    } else if (startDate && !endDate) {
      // 종료일 선택
      if (dateString < startDate) {
        // 시작일보다 이전 날짜면 새로운 시작일로
        setStartDate(dateString);
        setEndDate('');
        setSelectedDates({
          [dateString]: { startingDay: true, color: '#50cebb', textColor: 'white' }
        });
      } else {
        // 정상적인 종료일
        setEndDate(dateString);

        const range: { [key: string]: any } = {};
        let currentDate = dayjs(startDate);
        const endDateObj = dayjs(dateString);

        while (!currentDate.isAfter(endDateObj, 'day')) {
          const current = currentDate.format('YYYY-MM-DD');

          if (current === startDate && current === dateString) {
            range[current] = { startingDay: true, endingDay: true, color: '#50cebb', textColor: 'white' };
          } else if (current === startDate) {
            range[current] = { startingDay: true, color: '#50cebb', textColor: 'white' };
          } else if (current === dateString) {
            range[current] = { endingDay: true, color: '#50cebb', textColor: 'white' };
          } else {
            range[current] = { color: '#70d7c7', textColor: 'white' };
          }

          currentDate = currentDate.add(1, 'day');
        }

        setSelectedDates(range);
      }
    }
  };

  const buttons = [
    { id: TransactionQueryType.Today, label: '오늘만 보끄얌' },
    { id: TransactionQueryType.DateRange, label: '날짜 선택' },
    { id: TransactionQueryType.Monthly, label: '달 검색' },
  ];


  // EditView.tsx 관련
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // MonthlyCalendarView.tsx 관련
  const [showCalendarView, setShowCalendarView] = useState(true);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const insets = useSafeAreaInsets();
  return (
    <TouchableWithoutFeedback onPress={() => {
      closeSwipeIfOpen();
      setDropdownVisible(false);
    }}>
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
                    await handleDelete(id);
                  }
                  setSelectedIds([]);
                  setEditMode(false);

                  await fetchData(currentQueryTypeRef.current);//activeButton === 'date' ? TransactionQueryType.DateRange : (activeButton === 'month' ? TransactionQueryType.Monthly : TransactionQueryType.Today));
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
              onPress={() => {
                handleButtonPress(button.id);
              }
              }
            >
              <Text style={[
                styles.buttonText,
                currentQueryTypeRef.current === button.id && styles.selectedButtonText // 선택된 텍스트 스타일
              ]}>
                {button.label}
              </Text>
            </Pressable>
          ))}
          {/* 날짜 선택 모달 */}
          <Modal
            visible={showDatePicker}
            transparent={true}
            animationType="slide"
          >
            <TouchableWithoutFeedback onPress={() => {
              setShowDatePicker(false);
              currentQueryTypeRef.current = previousQueryTypeRef.current;
            }}>
              <View style={styles.modalBackground}>
                <TouchableWithoutFeedback onPress={() => { }}>
                  <View style={styles.modalContainer}>
                    <Calendar
                      markingType={'period'}
                      markedDates={selectedDates}
                      onDayPress={selectDateRange}
                      theme={{ todayTextColor: '#007bff' }}
                    />
                    <Pressable
                      style={styles.TodayButton}
                      onPress={() => {
                        setShowDatePicker(false);
                        setShowCalendarView(false);
                        if (startDate && endDate) {
                          const dateText = `${dayjs(startDate).format('YYYY.MM.DD')} ~ ${dayjs(endDate).format('YYYY.MM.DD')}`;
                          SetDisplayText(dateText);
                          setShowPeriod(true);

                          setSelectedValue('전체');
                          fetchDataWithFilter(TransactionQueryType.DateRange, 'all');
                        }
                      }}
                    >
                      <Text style={styles.buttonSelectDateOK}>확인</Text>
                    </Pressable>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
          {/* 월 선택 모달 (년도 + 월 선택기) */}
          <Modal
            visible={showMonthPicker}
            transparent={true}
            animationType="slide"
          >
            <TouchableWithoutFeedback onPress={() => {
              setShowMonthPicker(false);
              currentQueryTypeRef.current = previousQueryTypeRef.current;
            }}>
              <View style={styles.modalBackground}>
                <TouchableWithoutFeedback onPress={() => { }}>
                  <View style={styles.modalContainer}>
                    {/* 년도 선택 */}
                    <View style={[styles.select_between, { marginBottom: 20 }]}>
                      <Pressable
                        style={styles.TodayButton}
                        onPress={() => {
                          const newYear = selectedMonth.getFullYear() - 1;
                          setSelectedMonth(new Date(newYear, selectedMonth.getMonth(), 1));
                        }}
                      >
                        <Text style={styles.buttonText}>◀</Text>
                      </Pressable>

                      <Text style={[styles.buttonText, { fontSize: 18, fontWeight: 'bold' }]}>
                        {selectedMonth.getFullYear()}년
                      </Text>

                      <Pressable
                        style={styles.TodayButton}
                        onPress={() => {
                          const newYear = selectedMonth.getFullYear() + 1;
                          setSelectedMonth(new Date(newYear, selectedMonth.getMonth(), 1));
                        }}
                      >
                        <Text style={styles.buttonText}>▶</Text>
                      </Pressable>
                    </View>

                    {/* 월 선택 그리드 */}
                    <View style={styles.monthGrid}>
                      {Array.from({ length: 12 }, (_, index) => {
                        const month = index + 1;
                        const isSelected = selectedMonth.getMonth() + 1 === month;
                        return (
                          <Pressable
                            key={month}
                            style={[
                              styles.TodayButton,
                              {
                                width: '30%',
                                margin: 5,
                                padding: 15,
                                borderWidth: 1,
                                borderColor: isSelected ? '#0000cd' : '#ddd',
                                backgroundColor: isSelected ? '#f0f0ff' : '#fff'
                              }
                            ]}
                            onPress={() => {
                              const newDate = new Date(selectedMonth.getFullYear(), month - 1, 1);
                              setSelectedMonth(newDate);
                              // 바로 닫지 않고 선택만 함
                            }}
                          >
                            <Text style={[
                              styles.buttonText,
                              isSelected && styles.selectedButtonText
                            ]}>
                              {month}월
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    <Pressable
                      style={styles.TodayButton}
                      onPress={() => {
                        setShowMonthPicker(false);
                        // MonthlyCalendarView.tsx 관련
                        setShowCalendarView(true);
                        setCalendarMonth(selectedMonth);

                        const monthText = `${selectedMonth.getFullYear()}년 ${(selectedMonth.getMonth() + 1)}월`;
                        SetDisplayText(monthText);
                        setShowPeriod(true);

                        setSelectedValue('전체');
                        fetchDataWithFilter(TransactionQueryType.Monthly, 'all');
                      }}
                    >
                      <Text style={styles.buttonSelectDateOK}>확인</Text>
                    </Pressable>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>

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

                      fetchDataWithFilter(currentQueryTypeRef.current, item.value);
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
            <Text style={styles.totaltext}>
              {transactionsummaries?.statistics.totalCount || 0}건
            </Text>

            <View style={styles.total_item_group}>
              <Text style={styles.totaltext}>입금</Text>
              <Text style={[styles.totaltext, styles.desc_in]}>
                {transactionsummaries?.statistics.totalIncome?.toLocaleString() || 0}
              </Text>
            </View>

            <View style={styles.total_item_group}>
              <Text style={styles.totaltext}>출금</Text>
              <Text style={[styles.totaltext, styles.desc_out]}>
                {transactionsummaries?.statistics.totalExpense?.toLocaleString() || 0}
              </Text>
            </View>

            <View style={styles.total_item_group}>
              <Text style={styles.totaltext}>합계</Text>
              <Text style={[styles.totaltext,
              (transactionsummaries?.statistics.netAmount ?? 0) > 0 ? styles.desc_in :
                (transactionsummaries?.statistics.netAmount ?? 0) < 0 ? styles.desc_out :
                  null
              ]}>
                {(() => {
                  const amount = transactionsummaries?.statistics.netAmount ?? 0;
                  if (amount > 0) {
                    return `+${amount.toLocaleString()}`;
                  } else if (amount < 0) {
                    return `${amount.toLocaleString()}`;
                  } else {
                    return '0';
                  }
                })()}
              </Text>
            </View>
          </View>
        </View>


        {/* 선택된 기간 표시 추가 */}
        {showPeriod && !showCalendarView && (
          <View style={styles.periodContainer}>
            <Text style={styles.periodText}>📅    {displayPeriodText}</Text>
          </View>
        )}

        {/*MonthlyCalendarView.tsx 관련*/}
        {showCalendarView ? (
          <MonthlyCalendarView
            data={transactionsummaries}
            selectedMonth={calendarMonth}

            onMonthChange={(newMonth) => {
              setCalendarMonth(newMonth);
              setSelectedMonth(newMonth); // Home의 날짜 표시도 업데이트

              // 현재 선택된 필터 가져오기
              const currentFilter = options.find(opt => opt.label === selectedValue)?.value || 'all';

              // 데이터 새로 가져오기
              paramsRef.current.selectedMonth = newMonth;
              fetchDataWithFilter(TransactionQueryType.Monthly, currentFilter);
            }}
          />
        ) : (
          <FlatList style={styles.flatList}
            onScrollBeginDrag={() => { closeSwipeIfOpen(); setDropdownVisible(false); }}
            onMomentumScrollBegin={() => { closeSwipeIfOpen(); setDropdownVisible(false); }} // 관성 스크롤 시작할 때도
            data={transactionsummaries?.transactions}
            keyExtractor={(item) => item.id.toString()}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            renderItem={({ item }) => {
              let swipeableRef: Swipeable | null = null;

              return (
                <Swipeable
                  overshootRight={false}
                  ref={(ref) => { swipeableRef = ref; }}
                  onSwipeableWillOpen={(direction) => {
                    // ✅ 기존 열린 스와이프 닫기
                    if (openedSwipeRef.current && openedItemIdRef.current !== item.id) {
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
                    // ✅ 이미 WillOpen에서 설정했으므로 중복 제거
                  }}

                  onSwipeableClose={(direction) => {
                    // ✅ 현재 열린 아이템이 맞을 때만 초기화
                    if (openedItemIdRef.current === item.id) {
                      openedSwipeRef.current = null;
                      openedItemIdRef.current = null;
                    }
                  }}

                  renderRightActions={() => (
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress=
                      {async () => {
                        await handleDelete(item.id);
                        await fetchData(currentQueryTypeRef.current);
                      }
                      }
                    >
                      <Text style={styles.deleteText}>삭제</Text>
                    </TouchableOpacity>
                  )
                  }>
                  <TouchableOpacity
                    activeOpacity={1}  // 터치 피드백
                    onPress={() => {
                      if (editMode) {
                        setSelectedIds((prev) =>
                          prev.includes(item.id)
                            ? prev.filter((id) => id !== item.id)
                            : [...prev, item.id]
                        );
                      } else {
                        closeSwipeIfOpen();
                        setDropdownVisible(false);
                      }
                    }}
                    // EditView.tsx 관련
                    // 꾹 눌렀을 때 처리하는 부분
                    onLongPress={() => {
                      setEditingTransaction(item);
                      setEditModalVisible(true);
                    }}
                  >

                    <View style={styles.cardRow}>
                      {editMode && (
                        <View style={[
                          styles.checkbox,
                          selectedIds.includes(item.id) && styles.checked,
                        ]}>
                          {selectedIds.includes(item.id) &&
                            (<Text style={styles.checked}>✓</Text>)}
                        </View>
                      )}
                      <View style={styles.cardContent}>
                        <View style={styles.card}>
                          <View style={styles.card_between}>
                            <Text style={styles.text}>
                              {item.cost.toLocaleString()}원
                            </Text>
                            <Text style={[styles.desc, item.paytype === 0 || item.paytype === 1 ? styles.desc_out : styles.desc_in]}>
                              {item.paytype === 0 || item.paytype === 1 ? '지출' : '수입'}
                            </Text>
                          </View>
                          <View style={styles.card_between}>
                            <Text style={styles.desc}>{item.type}</Text>
                            <Text style={styles.date}>
                              {formatKst(item.date)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                </Swipeable >
              );
            }}
            ListEmptyComponent={
              < Text style={{ marginTop: 20 }}>🐟 굴비 보고 산 날</Text >
            }
            contentContainerStyle={
              transactionsummaries?.transactions.length === 0 ? styles.centerEmpty : undefined
            }
          />
        )}

        {/* EditView.tsx 관련 부분 */}
        <EditView
          visible={editModalVisible}
          transaction={editingTransaction}
          onClose={() => {
            setEditModalVisible(false);
            setEditingTransaction(null);
          }}
          onSuccess={async () => {
            await fetchDataWithFilter(currentQueryTypeRef.current, 'all');
          }}
        />

      </View >
    </TouchableWithoutFeedback>
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
  periodContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    marginVertical: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  periodText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  desc_out: {
    color: '#ff6464',
  },
  desc_in: {
    color: '#007AFF',
  },
  flatList: {
    flex: 0.3, // 뭔지 모름 나중에 리스트 많이 추가/확인 후 필요 없으면 지우기
    marginTop: -10,
  },
  card: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    //borderStyle: 'dashed',
    //borderWidth: 1,
    padding: 10,
    //borderRadius: 20,
    //marginBottom: 3,
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
    width: 60,         // Swipeable 이 이 폭만큼 열립니다
    backgroundColor: '#ff6464',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    //borderRadius: 20,
    //marginLeft: -30,
    //paddingLeft: 25,
    //paddingRight: 5,
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
    borderRadius: 12,
    marginRight: 12,
    marginLeft: 4,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checked: {
    backgroundColor: '#333',
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
  buttonSelectDateOK: {
    color: '#828282',
    marginTop: 15,
    fontSize: 20,
    fontWeight: 'bold',
  },
  selectedButtonText: {
    color: '#0000cd',
    fontWeight: 'bold',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
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
