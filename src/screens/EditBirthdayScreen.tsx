import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import type { EditBirthdayScreenNavigationProp } from '../types/navigation';
import { loadUserSettings, saveUserSettings } from '../utils/storage';
import { syncWidgetData } from '../utils/widgetStorage';
import { colors, fonts, spacing, textBase } from '../theme';
import ScreenHeader from '../components/common/ScreenHeader';

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

const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month, 0).getDate();
};

const generateDays = (daysCount: number) => Array.from({ length: daysCount }, (_, i) => i + 1);

const YEARS = generateYears();
const MONTHS = generateMonths();

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

// ピッカーアイテムの幅（paddingHorizontal: 16 * 2 + 最小幅56の概算）
const YEAR_ITEM_WIDTH = 72;
const YEAR_ITEM_GAP = 4; // spacing.xs

const EditBirthdayScreen: React.FC = () => {
  const navigation = useNavigation<EditBirthdayScreenNavigationProp>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [targetLifespan, setTargetLifespan] = useState<number>(0);

  // 誕生日の状態
  const [selectedYear, setSelectedYear] = useState<number>(1990);
  const [selectedMonth, setSelectedMonth] = useState<number>(1);
  const [selectedDay, setSelectedDay] = useState<number>(1);

  // 年選択ScrollViewのref
  const yearScrollRef = useRef<ScrollView>(null);
  const [initialScrollDone, setInitialScrollDone] = useState(false);

  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    loadCurrentSettings();
  }, []);

  // 設定読み込み完了後に選択中の年までスクロール
  useEffect(() => {
    if (!isLoading && !initialScrollDone && yearScrollRef.current) {
      const yearIndex = YEARS.findIndex((y) => y === selectedYear);
      if (yearIndex > 0) {
        // アイテムの位置を計算（中央寄せ）
        const scrollX = yearIndex * (YEAR_ITEM_WIDTH + YEAR_ITEM_GAP) - 100;
        setTimeout(() => {
          yearScrollRef.current?.scrollTo({ x: Math.max(0, scrollX), animated: false });
        }, 50);
      }
      setInitialScrollDone(true);
    }
  }, [isLoading, initialScrollDone, selectedYear]);

  const loadCurrentSettings = async () => {
    setIsLoading(true);
    try {
      const settings = await loadUserSettings();
      if (settings) {
        const [y, m, d] = settings.birthday.split('-').map(Number);
        setSelectedYear(y);
        setSelectedMonth(m);
        setSelectedDay(d);
        setTargetLifespan(settings.targetLifespan);
      }
    } catch (error) {
      console.error('設定の読み込みに失敗しました:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 選択された年・月に応じた日数を計算
  const daysInMonth = useMemo(
    () => getDaysInMonth(selectedYear, selectedMonth),
    [selectedYear, selectedMonth]
  );

  const DAYS = useMemo(() => generateDays(daysInMonth), [daysInMonth]);

  const adjustedDay = useMemo(() => {
    return selectedDay > daysInMonth ? daysInMonth : selectedDay;
  }, [selectedDay, daysInMonth]);

  // 選択された日付が未来かどうかをチェック
  const isFutureDate = useMemo(() => {
    const selectedDate = new Date(selectedYear, selectedMonth - 1, adjustedDay);
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

  // ハプティックフィードバック付きのセッター
  const handleYearSelect = useCallback((year: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedYear(year);
    const newDaysInMonth = getDaysInMonth(year, selectedMonth);
    if (selectedDay > newDaysInMonth) {
      setSelectedDay(newDaysInMonth);
    }
  }, [selectedMonth, selectedDay]);

  const handleMonthSelect = useCallback((month: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMonth(month);
    const newDaysInMonth = getDaysInMonth(selectedYear, month);
    if (selectedDay > newDaysInMonth) {
      setSelectedDay(newDaysInMonth);
    }
  }, [selectedYear, selectedDay]);

  const handleDaySelect = useCallback((day: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDay(day);
  }, []);

  const handleSave = async () => {
    if (isFutureDate) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('エラー', '誕生日は今日より前の日付を選択してください');
      return;
    }

    // 現在の年齢が目標寿命を超えていないかチェック
    if (targetLifespan <= currentAge) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('エラー', `目標寿命（${targetLifespan}歳）は現在の年齢（${currentAge}歳）より大きい必要があります`);
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const birthdayString = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(adjustedDay).padStart(2, '0')}`;

      await saveUserSettings({
        birthday: birthdayString,
        targetLifespan: targetLifespan,
      });

      // ウィジェットデータを同期
      await syncWidgetData();

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
          title="誕生日"
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
        title="誕生日"
        leftAction={{
          type: 'backIcon',
          onPress: () => navigation.goBack(),
        }}
        rightAction={{
          type: 'text',
          label: isSaving ? '保存中...' : '保存',
          onPress: handleSave,
          color: isFutureDate ? colors.text.secondary : colors.primary,
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
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

export default EditBirthdayScreen;
