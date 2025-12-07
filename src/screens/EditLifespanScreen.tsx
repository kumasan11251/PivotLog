import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import type { EditLifespanScreenNavigationProp } from '../types/navigation';
import { loadUserSettings, saveUserSettings } from '../utils/storage';
import { colors, fonts, spacing, textBase } from '../theme';
import ScreenHeader from '../components/common/ScreenHeader';
import LifespanSlider from '../components/common/LifespanSlider';

const EditLifespanScreen: React.FC = () => {
  const navigation = useNavigation<EditLifespanScreenNavigationProp>();
  const [targetLifespan, setTargetLifespan] = useState<number>(80);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [birthday, setBirthday] = useState<string>('');

  useEffect(() => {
    loadCurrentSettings();
  }, []);

  const loadCurrentSettings = async () => {
    setIsLoading(true);
    try {
      const settings = await loadUserSettings();
      if (settings) {
        setTargetLifespan(settings.targetLifespan);
        setBirthday(settings.birthday);
      }
    } catch (error) {
      console.error('設定の読み込みに失敗しました:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 現在の年齢を計算
  const currentAge = useMemo(() => {
    if (!birthday) return 0;
    const [year, month, day] = birthday.split('-').map(Number);
    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return Math.max(0, age);
  }, [birthday]);

  // 最小寿命（現在の年齢 + 1）
  const minLifespan = useMemo(() => currentAge + 1, [currentAge]);
  const maxLifespan = 120;

  // バリデーション
  const isValid = useMemo(() => {
    return targetLifespan >= minLifespan && targetLifespan <= maxLifespan;
  }, [targetLifespan, minLifespan, maxLifespan]);

  const handleSave = async () => {
    if (!isValid) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('エラー', `目標寿命は${minLifespan}〜${maxLifespan}の範囲で設定してください`);
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await saveUserSettings({
        birthday: birthday,
        targetLifespan: targetLifespan,
      });

      navigation.goBack();
    } catch {
      Alert.alert('エラー', '設定の保存に失敗しました。もう一度お試しください。');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader
          title="目標寿命"
          leftAction={{
            type: 'backIcon',
            onPress: () => navigation.goBack(),
          }}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="目標寿命"
        leftAction={{
          type: 'backIcon',
          onPress: () => navigation.goBack(),
        }}
        rightAction={{
          type: 'text',
          label: isSaving ? '保存中...' : '保存',
          onPress: handleSave,
          color: isValid ? colors.primary : colors.text.secondary,
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 説明テキスト */}
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionText}>
            目標寿命を設定すると、残りの時間が計算されます。
          </Text>
          <Text style={styles.descriptionSubText}>
            現在の年齢: {currentAge}歳
          </Text>
        </View>

        {/* スライダー */}
        <View style={styles.sliderContainer}>
          <LifespanSlider
            value={targetLifespan}
            onValueChange={setTargetLifespan}
            minValue={minLifespan}
            maxValue={maxLifespan}
            currentAge={currentAge}
          />
        </View>

        {/* モチベーションメッセージ */}
        <View style={styles.motivationContainer}>
          <Text style={styles.motivationText}>
            この{targetLifespan - currentAge}年を、最高の時間にしよう
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.padding.screen,
    paddingBottom: spacing.xxl,
  },
  descriptionContainer: {
    marginBottom: spacing.xl,
  },
  descriptionText: {
    fontSize: 15,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    ...textBase,
  },
  descriptionSubText: {
    fontSize: 14,
    fontFamily: fonts.family.bold,
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.sm,
    ...textBase,
  },
  sliderContainer: {
    marginTop: spacing.md,
  },
  motivationContainer: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  motivationText: {
    fontSize: 16,
    fontFamily: fonts.family.regular,
    color: colors.text.primary,
    textAlign: 'center',
    lineHeight: 24,
    ...textBase,
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
    ...textBase,
  },
});

export default EditLifespanScreen;
