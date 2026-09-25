import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert,
    TouchableWithoutFeedback,
    ScrollView,
    Keyboard,
} from 'react-native';
import { Transaction } from '../../src/models/Transaction';
import { updateTransaction } from '../../src/api/transactions';
import { toApiDate, toYmd, withYmd } from '../../src/lib/date';
import { Calendar } from 'react-native-calendars';

interface EditViewProps {
    visible: boolean;
    transaction: Transaction | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function EditView({ visible, transaction, onClose, onSuccess }: EditViewProps) {
    const [cost, setCost] = useState('');
    const [type, setType] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState('');
    const [paytype, setPaytype] = useState(1);
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [tempDate, setTempDate] = useState(new Date());
    const [keyboardVisible, setKeyboardVisible] = useState(false);

    // 트랜잭션 데이터로 폼 초기화
    useEffect(() => {
        if (transaction) {
            setCost(transaction.cost.toString());
            setType(transaction.type || '');
            setContent(transaction.content || '');
            setCategory(transaction.category || '');
            setPaytype(transaction.paytype);
            setDate(new Date(transaction.date));
        }

        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
            setKeyboardVisible(true);
        });
        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardVisible(false);
        });

        return () => {
            keyboardDidShowListener?.remove();
            keyboardDidHideListener?.remove();
        };
    }, [transaction]);

    const handleSave = async () => {
        if (!transaction) return;

        if (!cost || !type) {
            Alert.alert('오류', '모든 항목을 입력해주세요.');
            return;
        }

        try {
            const updatedTransaction: Transaction = {
                id: transaction.id,
                cost: parseFloat(cost),
                type: type,
                content: content,
                category: category,
                paytype: paytype,
                date: toApiDate(date),
            };
            console.log('📤 수정할 데이터:', updatedTransaction);
            await updateTransaction(updatedTransaction);
            onSuccess();
            onClose();
        } catch (error) {
            Alert.alert('오류', '수정에 실패했습니다.');
        }
    };

    if (!transaction) return null;

    return (
        <Modal visible={visible} transparent={true} animationType="slide">
            <TouchableWithoutFeedback onPress={() => {
                if (keyboardVisible) {
                    Keyboard.dismiss();
                } else {
                    onClose();
                }
            }}>
                <View style={styles.modalBackground}>
                    <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss() }}>
                        <View style={styles.modalContainer}>
                            <Text style={styles.title}>거래 내역 편집</Text>


                            {/* 날짜*/}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>📅 날짜 및 시간</Text>

                                {/* 현재 설정된 날짜/시간 표시
                                <View style={styles.currentDateTime}>
                                    <Text style={styles.currentLabel}>현재 설정</Text>
                                    <Text style={styles.currentValue}>
                                        {date.toLocaleDateString('ko-KR')} {date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>
                                */}
                                <View style={styles.currentDateTime}>
                                    <Text style={styles.currentLabel}>현재 설정된 시간</Text>
                                    <Text style={styles.currentValue}>
                                        {new Date(transaction.date).toLocaleDateString('ko-KR')} {new Date(transaction.date).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>

                                {/* 날짜/시간 선택 버튼들 */}
                                <View style={styles.datetimeContainer}>
                                    <TouchableOpacity style={styles.datetimeButton} onPress={() => {
                                        setTempDate(date);
                                        setShowDatePicker(true);
                                    }}>
                                        <Text style={styles.datetimeLabel}>날짜</Text>
                                        <Text style={styles.datetimeText}>{date.toLocaleDateString('ko-KR')}</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.datetimeButton} onPress={() => {
                                        setTempDate(date);
                                        setShowTimePicker(true);
                                    }}>
                                        <Text style={styles.datetimeLabel}>시간</Text>
                                        <Text style={styles.datetimeText}>
                                            {date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
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
                                                            style={styles.pickerCancelButton}
                                                            onPress={() => setShowDatePicker(false)}
                                                        >
                                                            <Text style={styles.pickerCancelText}>취소</Text>
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
                                                            style={styles.pickerCancelButton}
                                                            onPress={() => setShowTimePicker(false)}
                                                        >
                                                            <Text style={styles.pickerCancelText}>취소</Text>
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
                                {/* {showTimePicker && (
                                    <DateTimePicker
                                        value={date}
                                        mode="time"
                                        display="default"
                                        onChange={(_, selectedTime) => {
                                            setShowTimePicker(false);
                                            if (selectedTime) setDate(selectedTime);
                                        }}
                                    />
                                )} */}
                            </View>

                            {/* 입금/출금 선택 */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>💳 거래 구분</Text>
                                <View style={styles.segmentContainer}>
                                    <TouchableOpacity
                                        style={[styles.segmentButton, styles.segmentLeft, paytype === 1 && styles.segmentActive]}
                                        onPress={() => setPaytype(1)}
                                    >
                                        <Text style={[styles.segmentText, paytype === 1 && styles.segmentTextActive]}>출금</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.segmentButton, styles.segmentRight, paytype === 2 && styles.segmentActive]}
                                        onPress={() => setPaytype(2)}
                                    >
                                        <Text style={[styles.segmentText, paytype === 2 && styles.segmentTextActive]}>입금</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* 금액 */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>💰 금액</Text>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="numeric"
                                    value={cost}
                                    onChangeText={setCost}
                                    placeholder="금액을 입력하세요"
                                />
                            </View>

                            {/* 내용 */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>📝 내용</Text>
                                <TextInput
                                    style={styles.input}
                                    value={type}
                                    onChangeText={setType}
                                    placeholder="내용을 입력하세요"
                                />
                            </View>



                            {/* 버튼 */}
                            <View style={styles.buttonContainer}>
                                <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                                    <Text style={styles.cancelButtonText}>취소</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                                    <Text style={styles.saveButtonText}>변경</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalBackground: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 25,
        width: '90%',
        maxWidth: 400,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 25,
        color: '#333',
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        marginBottom: 8,
        color: '#333',
        fontWeight: '600',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        padding: 15,
        fontSize: 16,
        backgroundColor: '#f9f9f9',
    },
    calendarContainer: {
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 20,
        width: '90%',
        maxWidth: 350,
    },
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
        backgroundColor: '#509ef2',
    },
    timeItemText: {
        fontSize: 16,
        color: '#333',
    },
    selectedTimeItemText: {
        color: 'white',
        fontWeight: 'bold',
    },
    pickerContainer: {
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 20,
        width: '90%',
        maxWidth: 320,
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
    pickerCancelButton: {
        flex: 1,
        backgroundColor: '#f0f0f0',
        padding: 12,
        borderRadius: 8,
    },
    pickerConfirmButton: {
        flex: 1,
        backgroundColor: '#007AFF', // 확인 버튼 색깔 수정할라면 여기하셈
        padding: 12,
        borderRadius: 8,
    },
    pickerCancelText: {
        textAlign: 'center',
        fontSize: 16,
        color: '#333',
    },
    pickerConfirmText: {
        textAlign: 'center',
        fontSize: 16,
        color: 'white',
    },
    segmentContainer: {
        flexDirection: 'row',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#75798f',
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
        borderRightColor: '#75798f',
    },
    segmentRight: {
        borderLeftWidth: 0.5,
        borderLeftColor: '#75798f',
    },
    segmentActive: {
        backgroundColor: '#75798f',
    },
    segmentText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#75798f',
    },
    segmentTextActive: {
        color: '#ffffff',
    },

    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    cancelButton: {
        flex: 1,
        backgroundColor: '#f0f0f0',
        padding: 15,
        borderRadius: 10,
        marginRight: 10,
    },
    saveButton: {
        flex: 1,
        backgroundColor: '#6c87f5',
        padding: 15,
        borderRadius: 10,
        marginLeft: 10,
    },
    cancelButtonText: {
        textAlign: 'center',
        fontSize: 16,
        color: '#333',
        fontWeight: '600',
    },
    saveButtonText: {
        textAlign: 'center',
        fontSize: 16,
        color: '#fff',
        fontWeight: '600',
    },
    currentDateTime: {
        backgroundColor: '#e8f4fd',
        borderWidth: 1,
        borderColor: '#007AFF',
        borderRadius: 8,
        padding: 8,
        marginBottom: 10,
        alignItems: 'center',
    },
    currentLabel: {
        fontSize: 12,
        color: '#007AFF',
        marginBottom: 3,
    },
    currentValue: {
        fontSize: 15,
        color: '#333',
        fontWeight: '600',
    },
    datetimeContainer: {
        flexDirection: 'row',
        gap: 10,
    },
    datetimeButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        padding: 8,
        backgroundColor: '#f9f9f9',
        alignItems: 'center',
    },
    datetimeLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 5,
    },
    datetimeText: {
        fontSize: 16,
        color: '#333',
    },
});