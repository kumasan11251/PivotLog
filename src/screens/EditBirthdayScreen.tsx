import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { EditBirthdayScreenNavigationProp } from '../types/navigation';
import { loadUserSettings, saveUserSettings } from '../utils/storage';
import { colors, fonts, spacing } from '../theme';
import Button from '../components/common/Button';

const EditBirthdayScreen: React.FC = () => {
  const navigation = useNavigation<EditBirthdayScreenNavigationProp>();
  const [year, setYear] = useState<string>('');
  const [month, setMonth] = useState<string>('');
  const [day, setDay] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [targetLifespan, setTargetLifespan] = useState<number>(0);

  useEffect(() => {
    loadCurrentSettings();
  }, []);

  const loadCurrentSettings = async () => {
    setIsLoading(true);
    try {
      const settings = await loadUserSettings();
      if (settings) {
        const [y, m, d] = settings.birthday.split('-');
        setYear(y);
        setMonth(String(parseInt(m)));
        setDay(String(parseInt(d)));
        setTargetLifespan(settings.targetLifespan);
      }
    } catch (error) {
      console.error('設定の読み込みに失敗しました:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    // 入力値のバリデーション
    if (!year || !month || !day) {
      Alert.alert('エラー', '誕生日を入力してください');
      return;
    }

    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);
    const dayNum = parseInt(day, 10);

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

    // 現在の年齢を計算
    const currentAge = new Date().getFullYear() - yearNum;
    if (targetLifespan < currentAge + 1) {
      Alert.alert('エラー', `目標寿命は現在の年齢（${currentAge}歳）より大きい必要があります`);
      return;
    }

    try {
      const birthdayString = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

      await saveUserSettings({
        birthday: birthdayString,
        targetLifespan: targetLifespan,
      });

      navigation.goBack();
    } catch {
      Alert.alert('エラー', '設定の保存に失敗しました。もう一度お試しください。');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>誕生日の変更</Text>
        </View>

        <View style={styles.content}>
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

          <View style={styles.buttonContainer}>
            <Button title="保存" onPress={handleSave} />
            <Button title="キャンセル" onPress={() => navigation.goBack()} variant="secondary" />
          </View>
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.padding.screen,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fonts.size.heading,
    fontWeight: fonts.weight.regular,
    color: colors.text.primary,
    fontFamily: fonts.family.regular,
  },
  content: {
    flex: 1,
    padding: spacing.padding.screen,
    justifyContent: 'space-between',
  },
  section: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: fonts.size.body,
    fontWeight: fonts.weight.medium,
    color: colors.text.primary,
    marginBottom: spacing.md,
    fontFamily: fonts.family.regular,
  },
  birthdayInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: spacing.borderWidth,
    borderColor: colors.border,
    borderRadius: spacing.borderRadius.medium,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fonts.size.body,
    color: colors.text.primary,
    fontFamily: fonts.family.regular,
  },
  inputLabel: {
    fontSize: fonts.size.body,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
  },
  buttonContainer: {
    gap: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: fonts.size.body,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
  },
});

export default EditBirthdayScreen;
