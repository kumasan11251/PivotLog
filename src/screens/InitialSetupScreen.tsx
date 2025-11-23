import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { saveUserSettings } from '../utils/storage';
import { colors, fonts, spacing } from '../theme';
import Button from '../components/common/Button';

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
      // タイムゾーンの影響を受けないように、年月日から直接ISO形式の文字列を作成
      const birthdayString = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

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

        <Button title="設定完了" onPress={handleComplete} style={{ marginTop: spacing.xl }} />
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.padding.screen,
    justifyContent: 'center',
  },
  title: {
    fontSize: fonts.size.heading,
    fontWeight: fonts.weight.regular,
    color: colors.text.primary,
    marginBottom: spacing.xxl,
    textAlign: 'center',
    letterSpacing: 1,
    fontFamily: fonts.family.regular,
  },
  section: {
    marginBottom: 32,
  },
  label: {
    fontSize: fonts.size.label,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    letterSpacing: 0.5,
    fontFamily: fonts.family.regular,
  },
  birthdayInputContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: spacing.borderWidth,
    borderColor: colors.border,
    borderRadius: spacing.borderRadius.medium,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.padding.input,
  },
  input: {
    flex: 1,
    fontSize: fonts.size.input,
    color: colors.text.primary,
    padding: 0,
    fontFamily: fonts.family.regular,
  },
  inputLabel: {
    fontSize: fonts.size.body,
    color: colors.text.secondary,
    marginLeft: 4,
    fontFamily: fonts.family.regular,
  },
  lifespanInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: spacing.borderWidth,
    borderColor: colors.border,
    borderRadius: spacing.borderRadius.medium,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.padding.input,
  },
  lifespanInput: {
    flex: 1,
    fontSize: fonts.size.input,
    color: colors.text.primary,
    padding: 0,
    fontFamily: fonts.family.regular,
  },
});

export default InitialSetupScreen;
