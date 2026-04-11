import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import type { InitialSetupScreenNavigationProp } from '../types/navigation';
import { saveUserSettings } from '../utils/storage';
import { colors, fonts, spacing, textBase } from '../theme';
import LifespanSlider from '../components/common/LifespanSlider';
import {
  AnimatedHourglassIcon,
  AnimatedSparkleIcon,
} from '../components/icons/AnimatedOnboardingIcons';

// 年月日の選択肢を生成
const generateYears = () => {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear; y >= 1920; y--) {
    years.push(y);
  }
  return years;
};

const generateMonths = () => Array.from({ length: 12 }, (_, i) => i + 1);

// 月と年に応じた日数を取得
const getDaysInMonth = (year: number, month: number): number => {
  // monthは1-12形式なので、Date APIでは翌月の0日目を取得することでその月の最終日を得る
  return new Date(year, month, 0).getDate();
};

const generateDays = (daysCount: number) => Array.from({ length: daysCount }, (_, i) => i + 1);

const YEARS = generateYears();
const MONTHS = generateMonths();

// ステップの定義
type Step = 'birthday' | 'lifespan';

interface StepConfig {
  id: Step;
  title: string;
  subtitle: string;
  icon: 'hourglass' | 'sparkle';
}

const STEPS: StepConfig[] = [
  {
    id: 'birthday',
    title: 'あなたのことを教えてください',
    subtitle: '誕生日はいつですか？',
    icon: 'hourglass',
  },
  {
    id: 'lifespan',
    title: '何歳まで生きたいですか？',
    subtitle: 'この目標に向かって、一日を大切に',
    icon: 'sparkle',
  },
];

// ピッカーアイテムコンポーネント
interface PickerItemProps {
  value: number;
  isSelected: boolean;
  onPress: () => void;
  suffix: string;
}

const PickerItem: React.FC<PickerItemProps> = ({ value, isSelected, onPress, suffix }) => (
  <TouchableOpacity
    style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={[styles.pickerItemText, isSelected && styles.pickerItemTextSelected]}>
      {value}
    </Text>
    <Text style={[styles.pickerItemSuffix, isSelected && styles.pickerItemSuffixSelected]}>
      {suffix}
    </Text>
  </TouchableOpacity>
);

// アイコンレンダラー
const renderStepIcon = (iconType: StepConfig['icon'], isActive: boolean) => {
  const iconSize = 48;
  switch (iconType) {
    case 'hourglass':
      return <AnimatedHourglassIcon size={iconSize} isActive={isActive} />;
    case 'sparkle':
      return <AnimatedSparkleIcon size={iconSize} isActive={isActive} />;
    default:
      return <AnimatedHourglassIcon size={iconSize} isActive={isActive} />;
  }
};

const InitialSetupScreen: React.FC = () => {
  const navigation = useNavigation<InitialSetupScreenNavigationProp>();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // 誕生日の状態
  const [selectedYear, setSelectedYear] = useState<number>(1990);
  const [selectedMonth, setSelectedMonth] = useState<number>(1);
  const [selectedDay, setSelectedDay] = useState<number>(1);

  // 年選択ScrollViewのref
  const yearScrollRef = useRef<ScrollView>(null);
  const initialScrollDone = useRef(false);

  // 目標寿命の状態
  const [targetLifespan, setTargetLifespan] = useState<number>(80);

  // 保存中の状態
  const [isSaving, setIsSaving] = useState(false);

  // アニメーション
  const fadeAnim = useMemo(() => new Animated.Value(1), []);
  const slideAnim = useMemo(() => new Animated.Value(0), []);
  const celebrationScale = useMemo(() => new Animated.Value(1), []);

  const currentStep = STEPS[currentStepIndex];

  // 今日の日付
  const today = useMemo(() => new Date(), []);

  // 選択された年・月に応じた日数を計算
  const daysInMonth = useMemo(
    () => getDaysInMonth(selectedYear, selectedMonth),
    [selectedYear, selectedMonth]
  );

  // 日の選択肢を動的に生成
  const DAYS = useMemo(() => generateDays(daysInMonth), [daysInMonth]);

  // 選択された日を、現在の月の日数に収まるように調整した値
  const adjustedDay = useMemo(() => {
    return selectedDay > daysInMonth ? daysInMonth : selectedDay;
  }, [selectedDay, daysInMonth]);

  // 選択された日付が未来かどうかをチェック
  const isFutureDate = useMemo(() => {
    const selectedDate = new Date(selectedYear, selectedMonth - 1, adjustedDay);
    // 時間を無視して日付だけで比較
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return selectedDate > todayDate;
  }, [selectedYear, selectedMonth, adjustedDay, today]);

  // 現在の年齢を計算
  const currentAge = useMemo(() => {
    if (isFutureDate) return 0;
    const birthDate = new Date(selectedYear, selectedMonth - 1, adjustedDay);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return Math.max(0, age);
  }, [selectedYear, selectedMonth, adjustedDay, today, isFutureDate]);

  // 目標寿命の最小値を計算
  const minLifespan = useMemo(() => Math.max(currentAge + 1, 50), [currentAge]);

  // 目標寿命の調整済み値
  const adjustedLifespan = useMemo(() => {
    return targetLifespan < minLifespan ? minLifespan : targetLifespan;
  }, [targetLifespan, minLifespan]);

  // 年選択の初期スクロール位置設定（初回のみ）
  useEffect(() => {
    if (yearScrollRef.current && currentStepIndex === 0 && !initialScrollDone.current) {
      const yearIndex = YEARS.findIndex((y) => y === selectedYear);
      if (yearIndex > 0) {
        const itemWidth = 72; // pickerItemの幅 + gap
        const scrollX = yearIndex * itemWidth - 100;
        setTimeout(() => {
          yearScrollRef.current?.scrollTo({ x: Math.max(0, scrollX), animated: false });
        }, 100);
      }
      initialScrollDone.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- 初回表示時のみスクロールするため、selectedYearは意図的に除外
  }, [currentStepIndex]);

  // ハプティックフィードバック付きのセッター
  const handleYearSelect = useCallback((year: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedYear(year);
    // 新しい年月での日数を計算し、選択中の日が範囲外なら調整
    const newDaysInMonth = getDaysInMonth(year, selectedMonth);
    if (selectedDay > newDaysInMonth) {
      setSelectedDay(newDaysInMonth);
    }
  }, [selectedMonth, selectedDay]);

  const handleMonthSelect = useCallback((month: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMonth(month);
    // 新しい年月での日数を計算し、選択中の日が範囲外なら調整
    const newDaysInMonth = getDaysInMonth(selectedYear, month);
    if (selectedDay > newDaysInMonth) {
      setSelectedDay(newDaysInMonth);
    }
  }, [selectedYear, selectedDay]);

  const handleDaySelect = useCallback((day: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDay(day);
  }, []);

  const handleLifespanChange = useCallback((value: number) => {
    setTargetLifespan(value);
  }, []);

  // ステップ遷移アニメーション
  const animateStepChange = (toIndex: number) => {
    const direction = toIndex > currentStepIndex ? 1 : -1;

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -50 * direction,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentStepIndex(toIndex);
      slideAnim.setValue(50 * direction);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleNext = () => {
    // 誕生日ステップで未来の日付が選択されている場合はエラー
    if (currentStep.id === 'birthday' && isFutureDate) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('エラー', '誕生日は今日より前の日付を選択してください');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (currentStepIndex < STEPS.length - 1) {
      animateStepChange(currentStepIndex + 1);
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStepIndex > 0) {
      animateStepChange(currentStepIndex - 1);
    }
  };

  const handleComplete = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsSaving(true);

    // セレブレーションアニメーション
    Animated.sequence([
      Animated.spring(celebrationScale, {
        toValue: 1.1,
        friction: 3,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.spring(celebrationScale, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      const birthdayString = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(adjustedDay).padStart(2, '0')}`;

      await saveUserSettings({
        birthday: birthdayString,
        targetLifespan: adjustedLifespan,
      });

      // 少し待ってから遷移（アニメーション完了を待つ）
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      }, 500);
    } catch {
      setIsSaving(false);
      // エラーハンドリングは省略（実際にはAlertなどで通知）
    }
  };

  const isLastStep = currentStepIndex === STEPS.length - 1;

  // 誕生日ステップのレンダリング
  const renderBirthdayStep = () => (
    <ScrollView
      style={styles.stepScrollView}
      contentContainerStyle={styles.stepScrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* 年選択 */}
      <View style={styles.pickerSection}>
        <Text style={styles.pickerLabel}>年</Text>
        <ScrollView
          ref={yearScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pickerScrollContainer}
        >
          {YEARS.map((year) => (
            <PickerItem
              key={year}
              value={year}
              isSelected={selectedYear === year}
              onPress={() => handleYearSelect(year)}
              suffix="年"
            />
          ))}
        </ScrollView>
      </View>

      {/* 月選択 */}
      <View style={styles.pickerSection}>
        <Text style={styles.pickerLabel}>月</Text>
        <View style={styles.pickerGrid}>
          {MONTHS.map((month) => (
            <PickerItem
              key={month}
              value={month}
              isSelected={selectedMonth === month}
              onPress={() => handleMonthSelect(month)}
              suffix="月"
            />
          ))}
        </View>
      </View>

      {/* 日選択 */}
      <View style={styles.pickerSection}>
        <Text style={styles.pickerLabel}>日</Text>
        <View style={styles.pickerGrid}>
          {DAYS.map((day) => (
            <PickerItem
              key={day}
              value={day}
              isSelected={adjustedDay === day}
              onPress={() => handleDaySelect(day)}
              suffix="日"
            />
          ))}
        </View>
      </View>

      {/* 選択結果表示 */}
      <View style={[styles.selectedDateContainer, isFutureDate && styles.selectedDateContainerError]}>
        <Text style={styles.selectedDateLabel}>選択中：</Text>
        <Text style={[styles.selectedDateValue, isFutureDate && styles.errorText]}>
          {selectedYear}年{selectedMonth}月{adjustedDay}日
        </Text>
        {isFutureDate ? (
          <Text style={styles.errorText}>（未来の日付です）</Text>
        ) : (
          <Text style={styles.ageText}>（{currentAge}歳）</Text>
        )}
      </View>
    </ScrollView>
  );

  // 目標寿命ステップのレンダリング
  const renderLifespanStep = () => (
    <ScrollView
      style={styles.lifespanScrollView}
      contentContainerStyle={styles.lifespanScrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={{ transform: [{ scale: celebrationScale }] }}>
        <LifespanSlider
          value={adjustedLifespan}
          onValueChange={handleLifespanChange}
          minValue={minLifespan}
          maxValue={120}
          currentAge={currentAge}
          forceLightMode
        />

        <View style={styles.motivationContainer}>
          <Text style={styles.motivationText}>
            この{adjustedLifespan - currentAge}年を、最高の時間にしよう
          </Text>
        </View>
      </Animated.View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* 進捗インジケーター */}
        <View style={styles.progressContainer}>
          {STEPS.map((step, index) => (
            <View
              key={step.id}
              style={[
                styles.progressDot,
                index === currentStepIndex && styles.progressDotActive,
                index < currentStepIndex && styles.progressDotCompleted,
              ]}
            />
          ))}
        </View>

        {/* メインコンテンツ */}
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {/* アイコン */}
          <View style={styles.iconContainer}>
            {renderStepIcon(currentStep.icon, true)}
          </View>

          {/* タイトル */}
          <Text style={styles.title}>{currentStep.title}</Text>
          <Text style={styles.subtitle}>{currentStep.subtitle}</Text>

          {/* ステップコンテンツ */}
          {currentStep.id === 'birthday' && renderBirthdayStep()}
          {currentStep.id === 'lifespan' && renderLifespanStep()}
        </Animated.View>

        {/* ボタン */}
        <View style={styles.buttonContainer}>
          {currentStepIndex > 0 && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backButtonText}>戻る</Text>
            </TouchableOpacity>
          )}

          {isLastStep ? (
            <TouchableOpacity
              style={[styles.completeButton, currentStepIndex === 0 && styles.buttonFull]}
              onPress={handleComplete}
              disabled={isSaving}
            >
              <Text style={styles.completeButtonText}>
                {isSaving ? '保存中...' : 'はじめる'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.nextButton, currentStepIndex === 0 && styles.buttonFull]}
              onPress={handleNext}
            >
              <Text style={styles.nextButtonText}>次へ</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  progressDotActive: {
    width: 24,
    backgroundColor: colors.primary,
  },
  progressDotCompleted: {
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
    ...textBase,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: fonts.family.regular,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    ...textBase,
  },
  stepScrollView: {
    flex: 1,
  },
  stepScrollContent: {
    paddingBottom: spacing.lg,
  },
  lifespanScrollView: {
    flex: 1,
  },
  lifespanScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: spacing.lg,
  },
  pickerSection: {
    marginBottom: spacing.lg,
  },
  pickerLabel: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    ...textBase,
  },
  pickerScrollContainer: {
    gap: spacing.xs,
    paddingRight: spacing.lg,
  },
  pickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 56,
    justifyContent: 'center',
  },
  pickerItemSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pickerItemText: {
    fontSize: 15,
    fontFamily: fonts.family.regular,
    color: colors.text.primary,
    ...textBase,
  },
  pickerItemTextSelected: {
    color: colors.text.inverse,
    fontFamily: fonts.family.bold,
  },
  pickerItemSuffix: {
    fontSize: 11,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    marginLeft: 2,
    ...textBase,
  },
  pickerItemSuffixSelected: {
    color: colors.text.inverse,
  },
  selectedDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: `${colors.primary}10`,
    borderRadius: 12,
  },
  selectedDateContainerError: {
    backgroundColor: '#FEE2E2',
  },
  selectedDateLabel: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    ...textBase,
  },
  selectedDateValue: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginLeft: spacing.xs,
    ...textBase,
  },
  ageText: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    color: colors.primary,
    marginLeft: spacing.xs,
    ...textBase,
  },
  errorText: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    color: '#DC2626',
    marginLeft: spacing.xs,
    ...textBase,
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
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  buttonFull: {
    flex: 1,
  },
  backButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    ...textBase,
  },
  nextButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.primary,
    ...textBase,
  },
  completeButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  completeButtonText: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.text.inverse,
    ...textBase,
  },
});

export default InitialSetupScreen;
