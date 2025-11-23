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
import { loadUserSettings, saveUserSettings } from '../utils/storage';
import { colors, fonts, spacing } from '../theme';
import Button from '../components/common/Button';

interface EditLifespanScreenProps {
  onComplete: () => void;
  onBack: () => void;
}

const EditLifespanScreen: React.FC<EditLifespanScreenProps> = ({ onComplete, onBack }) => {
  const [targetLifespan, setTargetLifespan] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [birthday, setBirthday] = useState<string>('');

  useEffect(() => {
    loadCurrentSettings();
  }, []);

  const loadCurrentSettings = async () => {
    setIsLoading(true);
    try {
      const settings = await loadUserSettings();
      if (settings) {
        setTargetLifespan(String(settings.targetLifespan));
        setBirthday(settings.birthday);
      }
    } catch (error) {
      console.error('設定の読み込みに失敗しました:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    // 入力値のバリデーション
    if (!targetLifespan) {
      Alert.alert('エラー', '目標寿命を入力してください');
      return;
    }

    const lifespanNum = parseInt(targetLifespan, 10);

    // 現在の年齢を計算
    const [year] = birthday.split('-').map(Number);
    const currentAge = new Date().getFullYear() - year;
    const minLifespan = currentAge + 1;
    const maxLifespan = 130;

    if (isNaN(lifespanNum) || lifespanNum < minLifespan || lifespanNum > maxLifespan) {
      Alert.alert('エラー', `目標寿命は${minLifespan}〜${maxLifespan}の範囲で入力してください`);
      return;
    }

    try {
      await saveUserSettings({
        birthday: birthday,
        targetLifespan: lifespanNum,
      });

      onComplete();
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
          <Text style={styles.title}>目標寿命の変更</Text>
        </View>

        <View style={styles.content}>
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
              <Text style={styles.lifespanUnit}>歳</Text>
            </View>
            <Text style={styles.hint}>
              現在の年齢より大きい値を入力してください
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <Button title="保存" onPress={handleSave} />
            <Button title="キャンセル" onPress={onBack} variant="secondary" />
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
  lifespanInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  lifespanInput: {
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
  lifespanUnit: {
    fontSize: fonts.size.body,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
  },
  hint: {
    fontSize: fonts.size.labelSmall,
    color: colors.text.secondary,
    marginTop: spacing.sm,
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

export default EditLifespanScreen;
