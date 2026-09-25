//add화면 소스

import { useState } from 'react';
import { Modal, View, Text, TextInput, Button, ScrollView, StyleSheet, Alert, TouchableOpacity, Keyboard, Pressable, TouchableWithoutFeedback } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useCreateTransaction } from '../../src/hooks/useTransactions';
import { toApiDate, toYmd, withYmd } from '../../src/lib/date';
import { red } from 'react-native-reanimated/lib/typescript/Colors';



export default function AddScreen() {
    const [cost, setCost] = useState('');
    const [date, setDate] = useState(new Date());
    const [type, setType] = useState('');
    const [paytype, setPayType] = useState(1); // 1: 출금, 2: 입금 (기본값: 출금)
    const [showDatePicker, setShowDatePicker] = useState(false);

    // 화면 표시용 텍스트 변환 함수
    const getTransactionTypeText = (value: number): string => {
        return value === 1 ? '출금' : '입금';
    };

    const [showTimePicker, setShowTimePicker] = useState(false);
    const [tempDate, setTempDate] = useState(new Date());
    const createMutation = useCreateTransaction();

    const handleSubmit = async () => {
        if (!cost || !type) {
            Alert.alert('입력 오류', '모든 항목을 입력해주세요.');
            return;
        }
        const payload = {
            cost: parseFloat(cost),
            date: toApiDate(date),
            type,
            paytype: paytype,
            content: '',
            category: ''
        };
        console.log('📤 전송할 데이터:', {
            cost: parseFloat(cost),
            date: toApiDate(date),
            type,
            paytype: paytype,
        });


        try {
            const response = await createMutation.mutateAsync(payload);
            console.log('✅ 서버 응답:', response);

            Alert.alert('완료', '지출이 등록되었습니다.');
            setCost('');
            setType('');
            setDate(new Date());
            setPayType(1); // 기본값으로 리셋 (출금)
        } catch (error: any) {
            console.error('❌ 등록 실패:', error);
            if (error.response) {
                console.error('🔴 응답 상태:', error.response.status);
                console.error('🔴 응답 데이터:', error.response.data);
                Alert.alert('오류', `응답 실패 (${error.response.status})`);
            } else if (error.request) {
                console.error('🔴 요청 자체가 실패:', error.request);
                Alert.alert('오류', '서버에 연결할 수 없습니다.');
            } else {
                Alert.alert('오류', `예외 발생: ${error.message}`);
            }
        }
    };

    return (
        <Pressable
            style={{ flex: 1 }}             // 화면 전체 차지
            onPress={Keyboard.dismiss}      // 배경 터치 시 키보드 내리기
        >
            <View style={styles.container}>
                <Text style={styles.title}>지출 등록</Text>
                {
                    /* <TextInput
                    style={styles.input}
                    placeholder="설명"
                    value={description}
                    onChangeText={setDescription}
                    /> */
                }
                {/* 입금/출금 선택 세그먼트 컨트롤 */}
                <View style={styles.segmentContainer}>
                    <TouchableOpacity
                        style={[
                            styles.segmentButton,
                            styles.segmentLeft,
                            paytype === 1 && styles.segmentActive
                        ]}
                        onPress={() => setPayType(1)}
                    >
                        <Text style={[
                            styles.segmentText,
                            paytype === 1 && styles.segmentTextActive
                        ]}>
                            출금
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.segmentButton,
                            styles.segmentRight,
                            paytype === 2 && styles.segmentActive
                        ]}
                        onPress={() => setPayType(2)}
                    >
                        <Text style={[
                            styles.segmentText,
                            paytype === 2 && styles.segmentTextActive
                        ]}>
                            입금
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.between}>
                    <Text style={styles.inputText}> 금액 : </Text>
                    <TextInput
                        style={styles.input}
                        //placeholder="금액"
                        keyboardType="numeric"
                        value={cost}
                        onChangeText={setCost}
                    />
                </View>

                <View style={styles.between}>
                    <Text style={styles.inputText}> 내용 : </Text>
                    <TextInput
                        style={styles.input}
                        //placeholder="분류 (예: 식비, 교통)"
                        value={type}
                        onChangeText={setType}
                    />
                </View>

                <View style={styles.between}>
                    <Text style={styles.inputText}> 날짜 : </Text>
                    <TouchableOpacity style={styles.dateTextButton}
                        onPress={() => {
                            setTempDate(date);
                            setShowDatePicker(true);
                        }}
                    >
                        <Text style={styles.dateText}>
                            {date.toLocaleDateString('ko-KR')} {date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </TouchableOpacity>
                </View>
                {/* 날짜 선택 모달 */}
                <Modal visible={showDatePicker} transparent={true} animationType="slide">
                    <TouchableWithoutFeedback onPress={() => setShowDatePicker(false)}>
                        <View style={styles.modalBackground}>
                            <TouchableWithoutFeedback onPress={() => { }}>
                                <View style={styles.calendarContainer}>
                                    <Text style={styles.pickerTitle}>날짜 선택</Text>
                                    <Calendar
                                        current={toYmd(tempDate)}
                                        onDayPress={(day) => {
                                            setTempDate(withYmd(tempDate, day.dateString));
                                        }}
                                        markedDates={{
                                            [toYmd(tempDate)]: {
                                                selected: true,
                                                selectedColor: '#007AFF'
                                            }
                                        }}
                                        theme={{ todayTextColor: '#007bff' }}
                                    />
                                    <View style={styles.pickerButtons}>
                                        <TouchableOpacity
                                            style={styles.pickerButton}
                                            onPress={() => {
                                                // 달력에서 고른 날짜(tempDate)를 유지한 채 시간 선택으로
                                                setShowTimePicker(true);
                                                setShowDatePicker(false);
                                            }}
                                        >
                                            <Text style={styles.pickerButtonText}>시간 선택</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.pickerConfirmButton}
                                            onPress={() => {
                                                setDate(tempDate);
                                                setShowDatePicker(false);
                                            }}
                                        >
                                            <Text style={styles.pickerConfirmText}>확인</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>
                {/* 시간 선택 모달 */}
                <Modal visible={showTimePicker} transparent={true} animationType="slide">
                    <TouchableWithoutFeedback onPress={() => setShowTimePicker(false)}>
                        <View style={styles.modalBackground}>
                            <TouchableWithoutFeedback onPress={() => { }}>
                                <View style={styles.timeContainer}>
                                    <Text style={styles.pickerTitle}>시간 선택</Text>

                                    {/* 현재 선택된 시간 표시 */}
                                    <View style={styles.selectedTimeDisplay}>
                                        <Text style={styles.selectedTimeText}>
                                            {tempDate.getHours().toString().padStart(2, '0')}:
                                            {tempDate.getMinutes().toString().padStart(2, '0')}
                                        </Text>
                                    </View>

                                    {/* 시간/분 선택 휠 */}
                                    <View style={styles.timeWheelContainer}>
                                        <View style={styles.hourColumn}>
                                            <Text style={styles.timeLabel}>시</Text>
                                            <ScrollView style={styles.timeScroll} showsVerticalScrollIndicator={false}>
                                                {Array.from({ length: 24 }, (_, i) => (
                                                    <TouchableOpacity
                                                        key={i}
                                                        style={[
                                                            styles.timeItem,
                                                            tempDate.getHours() === i && styles.selectedTimeItem
                                                        ]}
                                                        onPress={() => {
                                                            const newDate = new Date(tempDate);
                                                            newDate.setHours(i);
                                                            setTempDate(newDate);
                                                        }}
                                                    >
                                                        <Text style={[
                                                            styles.timeItemText,
                                                            tempDate.getHours() === i && styles.selectedTimeItemText
                                                        ]}>
                                                            {i.toString().padStart(2, '0')}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </ScrollView>
                                        </View>

                                        <View style={styles.minuteColumn}>
                                            <Text style={styles.timeLabel}>분</Text>
                                            <ScrollView style={styles.timeScroll} showsVerticalScrollIndicator={false}>
                                                {Array.from({ length: 60 }, (_, i) => (
                                                    <TouchableOpacity
                                                        key={i}
                                                        style={[
                                                            styles.timeItem,
                                                            tempDate.getMinutes() === i && styles.selectedTimeItem
                                                        ]}
                                                        onPress={() => {
                                                            const newDate = new Date(tempDate);
                                                            newDate.setMinutes(i);
                                                            setTempDate(newDate);
                                                        }}
                                                    >
                                                        <Text style={[
                                                            styles.timeItemText,
                                                            tempDate.getMinutes() === i && styles.selectedTimeItemText
                                                        ]}>
                                                            {i.toString().padStart(2, '0')}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </ScrollView>
                                        </View>
                                    </View>

                                    <View style={styles.pickerButtons}>
                                        <TouchableOpacity
                                            style={styles.pickerButton}
                                            onPress={() => setShowTimePicker(false)}
                                        >
                                            <Text style={styles.pickerButtonText}>취소</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.pickerConfirmButton}
                                            onPress={() => {
                                                setDate(tempDate);
                                                setShowTimePicker(false);
                                            }}
                                        >
                                            <Text style={styles.pickerConfirmText}>확인</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>
                <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                    <Text style={styles.submitButtonText}>등록하기</Text>
                </TouchableOpacity>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20, // ⬅️ 기존보다 여유 있게
        backgroundColor: '#ffffff',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginTop: 50,
        marginBottom: 20,
        textAlign: 'center',
    },
    // 세그먼트 컨트롤 스타일
    segmentContainer: {
        flexDirection: 'row',
        marginBottom: 20,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#585c70',
        overflow: 'hidden',
    },
    segmentButton: {
        flex: 1,
        paddingVertical: 12,
        backgroundColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
    },
    segmentLeft: {
        borderRightWidth: 0.5,
        borderRightColor: '#585c70',
    },
    segmentRight: {
        borderLeftWidth: 0.5,
        borderLeftColor: '#585c70',
    },
    segmentActive: {
        backgroundColor: '#585c70',
    },
    segmentText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#585c70',
    },
    segmentTextActive: {
        color: '#ffffff',
    },
    between: {
        flexDirection: 'row',
        justifyContent: 'center',//'space-between',
        marginTop: 10,
    },
    inputText: {
        fontSize: 18,
        color: '#666',
        marginTop: 10,
    },
    input: {
        flex: 1,
        borderBottomWidth: 1,
        borderBottomColor: '#999',
        padding: 10,
        marginBottom: 15,
        marginLeft: 10,
        fontSize: 15,
    },
    dateTextButton: {
        flex: 1,
        borderBottomWidth: 1,
        borderBottomColor: '#999',
        padding: 8,
        marginBottom: 15,
        marginLeft: 10,
    },
    dateText: {
        color: '#333',
        textAlign: 'center',
        textAlignVertical: 'center',// 세로 중앙 정렬 (Android)
        lineHeight: 20,             // iOS에서 세로 중앙 정렬
        fontSize: 15,
    },
    submitButton: {
        padding: 10,
        borderWidth: 1,
        borderRadius: 15,
        borderColor: '#6c87f5',
        backgroundColor: '#6c87f5',
        alignSelf: 'center',
        marginTop: 70,
        width: 200,
    },
    submitButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',          // 굵은 글씨
        textAlign: 'center',
        textAlignVertical: 'center',// 세로 중앙 정렬 (Android)
        lineHeight: 20,             // iOS에서 세로 중앙 정렬
    },
    centerEmpty: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // 달력
    modalBackground: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    calendarContainer: {
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 20,
        width: '90%',
        maxWidth: 350,
    },
    pickerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
    },
    pickerButtons: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 20,
    },
    pickerButton: {
        flex: 1,
        backgroundColor: '#f0f0f0',
        padding: 12,
        borderRadius: 8,
    },
    pickerButtonText: {
        textAlign: 'center',
        fontSize: 16,
        color: '#333',
    },
    pickerConfirmButton: {
        flex: 1,
        backgroundColor: '#007AFF',
        padding: 12,
        borderRadius: 8,
    },
    pickerConfirmText: {
        textAlign: 'center',
        fontSize: 16,
        color: 'white',
    },
    // 시간 선택 관련 스타일들
    timeContainer: {
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 20,
        width: '90%',
        maxWidth: 350,
        maxHeight: 500,
    },
    selectedTimeDisplay: {
        backgroundColor: '#f0f8ff',
        borderRadius: 10,
        padding: 15,
        marginBottom: 20,
        alignItems: 'center',
    },
    selectedTimeText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#007AFF',
    },
    timeWheelContainer: {
        flexDirection: 'row',
        marginBottom: 5,
    },
    hourColumn: {
        flex: 1,
        marginRight: 10,
    },
    minuteColumn: {
        flex: 1,
        marginLeft: 10,
    },
    timeLabel: {
        textAlign: 'center',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    timeScroll: {
        maxHeight: 150,
    },
    timeItem: {
        padding: 10,
        alignItems: 'center',
        borderRadius: 5,
        marginVertical: 2,
    },
    selectedTimeItem: {
        backgroundColor: '#007AFF',
    },
    timeItemText: {
        fontSize: 16,
        color: '#333',
    },
    selectedTimeItemText: {
        color: 'white',
        fontWeight: 'bold',
    },
});