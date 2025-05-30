//add화면 소스

import { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createTransaction, getFakeUTCISOStringFromKST } from '../../src/api/transactions';
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

    const handleSubmit = async () => {
        if (!cost || !type) {
            Alert.alert('입력 오류', '모든 항목을 입력해주세요.');
            return;
        }
        const payload = {
            cost: parseFloat(cost),
            date: getFakeUTCISOStringFromKST(date),
            type,
            paytype: paytype,
        };
        console.log('📤 전송할 데이터:', {
            cost: parseFloat(cost),
            date: getFakeUTCISOStringFromKST(date),
            type,
            paytype: paytype,
        });


        try {
            const response = await createTransaction(payload);
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
                    onPress={() => setShowDatePicker(true)}
                >
                    <Text style={styles.dateText}>{date.toLocaleDateString()}</Text>
                </TouchableOpacity>

                {showDatePicker && (
                    <DateTimePicker
                        value={date}
                        mode="date"
                        display="default"
                        onChange={(_, selectedDate) => {
                            setShowDatePicker(false);
                            if (selectedDate) setDate(selectedDate);
                        }}
                    />
                )}
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                <Text style={styles.submitButtonText}>등록하기</Text>
            </TouchableOpacity>
        </View>
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
});