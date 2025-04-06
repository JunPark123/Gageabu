//add화면 소스

import { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createTransaction } from '../../src/api/transactions';

export default function AddScreen() {
    const [cost, setCost] = useState('');
    const [date, setDate] = useState(new Date());
    const [type, setType] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);

    const handleSubmit = async () => {
        if (!cost || !type) {
            Alert.alert('입력 오류', '모든 항목을 입력해주세요.');
            return;
        }
        const payload = {
            cost: parseFloat(cost),
            date: date.toISOString(),
            type,
        };
        console.log('📤 전송할 데이터:', {
            cost: parseFloat(cost),
            date: date.toISOString(),
            type,
        });

        try {
            const response = await createTransaction(payload);
            console.log('✅ 서버 응답:', response);
      
            Alert.alert('완료', '지출이 등록되었습니다.');
            setCost('');
            setType('');
            setDate(new Date());
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
            <Text style={styles.title}>➕ 지출 등록</Text>

            {/* <TextInput
        style={styles.input}
        placeholder="설명"
        value={description}
        onChangeText={setDescription}
      /> */}
            <TextInput
                style={styles.input}
                placeholder="금액"
                keyboardType="numeric"
                value={cost}
                onChangeText={setCost}
            />
            <TextInput
                style={styles.input}
                placeholder="분류 (예: 식비, 교통)"
                value={type}
                onChangeText={setType}
            />

            <Button title="날짜 선택" onPress={() => setShowDatePicker(true)} />
            <Text style={styles.dateText}>{date.toLocaleDateString()}</Text>

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

            <View style={styles.submitButton}>
                <Button title="등록하기" onPress={handleSubmit} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 80, // ⬅️ 기존보다 여유 있게
        backgroundColor: '#ffffff',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        borderWidth: 1,
        borderColor: '#999',
        borderRadius: 8,
        padding: 10,
        marginBottom: 15,
    },
    dateText: {
        marginTop: 10,
        marginBottom: 20,
        fontSize: 16,
        color: '#333',
        textAlign: 'center',
    },
    submitButton: {
        marginTop: 10,
    },
    centerEmpty: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});