import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { saveUserSettings } from '../utils/storage';

interface InitialSetupScreenProps {
  onComplete: () => void;
}

const InitialSetupScreen: React.FC<InitialSetupScreenProps> = ({ onComplete }) => {
  const [year, setYear] = useState<string>('');
  const [month, setMonth] = useState<string>('');
  const [day, setDay] = useState<string>('');
  const [targetLifespan, setTargetLifespan] = useState<string>('');

  const handleComplete = async () => {
    // 入力値のバリデーション
    if (!year || !month || !day) {
      Alert.alert('エラー', '誕生日を入力してください');
      return;
    }

    if (!targetLifespan) {
      Alert.alert('エラー', '目標寿命を入力してください');
      return;
    }

    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);
    const dayNum = parseInt(day, 10);
    const lifespanNum = parseInt(targetLifespan, 10);

    if (isNaN(yearNum) || yearNum < 1900 || yearNum > new Date().getFullYear()) {
      Alert.alert('エラー', '正しい年を入力してください（1900年〜現在）');
      return;
    }

    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      Alert.alert('エラー', '正しい月を入力してください（1〜12）');
      return;
    }

    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      Alert.alert('エラー', '正しい日を入力してください（1〜31）');
      return;
    }

    // 現在の年齢を計算
    const currentAge = new Date().getFullYear() - yearNum;
    const minLifespan = currentAge + 1;
    const maxLifespan = 130;

    if (isNaN(lifespanNum) || lifespanNum < minLifespan || lifespanNum > maxLifespan) {
      Alert.alert('エラー', `目標寿命は${minLifespan}〜${maxLifespan}の範囲で入力してください`);
      return;
    }

    // 日付の妥当性チェック
    const birthdayDate = new Date(yearNum, monthNum - 1, dayNum);
    if (
      birthdayDate.getFullYear() !== yearNum ||
      birthdayDate.getMonth() !== monthNum - 1 ||
      birthdayDate.getDate() !== dayNum
    ) {
      Alert.alert('エラー', '有効な日付を入力してください');
      return;
    }

    if (birthdayDate > new Date()) {
      Alert.alert('エラー', '誕生日は現在より前の日付である必要があります');
      return;
    }

    try {
      const birthdayString = birthdayDate.toISOString().split('T')[0];

      await saveUserSettings({
        birthday: birthdayString,
        targetLifespan: lifespanNum,
      });

      onComplete();
    } catch {
      Alert.alert('エラー', '設定の保存に失敗しました。もう一度お試しください。');
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <Text style={styles.title}>初期設定</Text>

        <View style={styles.section}>
          <Text style={styles.label}>誕生日</Text>
          <View style={styles.birthdayInputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={year}
                onChangeText={setYear}
                keyboardType="number-pad"
                placeholder="1990"
                maxLength={4}
              />
              <Text style={styles.inputLabel}>年</Text>
            </View>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={month}
                onChangeText={setMonth}
                keyboardType="number-pad"
                placeholder="1"
                maxLength={2}
              />
              <Text style={styles.inputLabel}>月</Text>
            </View>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={day}
                onChangeText={setDay}
                keyboardType="number-pad"
                placeholder="1"
                maxLength={2}
              />
              <Text style={styles.inputLabel}>日</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>目標寿命</Text>
          <View style={styles.lifespanInputContainer}>
            <TextInput
              style={styles.lifespanInput}
              value={targetLifespan}
              onChangeText={setTargetLifespan}
              keyboardType="number-pad"
              placeholder="80"
              maxLength={3}
            />
            <Text style={styles.inputLabel}>歳</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
          <Text style={styles.completeButtonText}>設定完了</Text>
        </TouchableOpacity>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '300',
    color: '#2C2C2C',
    marginBottom: 48,
    textAlign: 'center',
    letterSpacing: 1,
    fontFamily: 'NotoSansJP_400Regular',
  },
  section: {
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    letterSpacing: 0.5,
    fontFamily: 'NotoSansJP_400Regular',
  },
  birthdayInputContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  input: {
    flex: 1,
    fontSize: 18,
    color: '#2C2C2C',
    padding: 0,
    fontFamily: 'NotoSansJP_400Regular',
  },
  inputLabel: {
    fontSize: 16,
    color: '#666',
    marginLeft: 4,
    fontFamily: 'NotoSansJP_400Regular',
  },
  lifespanInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  lifespanInput: {
    flex: 1,
    fontSize: 18,
    color: '#2C2C2C',
    padding: 0,
    fontFamily: 'NotoSansJP_400Regular',
  },
  completeButton: {
    backgroundColor: '#8B9D83', // Sage green accent color
    borderRadius: 8,
    padding: 18,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
    fontFamily: 'NotoSansJP_400Regular',
  },
});

export default InitialSetupScreen;
