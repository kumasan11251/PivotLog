import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getColors, fonts, spacing, textBase } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { formatDateWithWeekday } from '../../constants/diaryEntry';

interface DateNavigatorProps {
  dateString: string;
  isToday: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onOpenPicker: () => void;
}

const DateNavigator: React.FC<DateNavigatorProps> = ({
  dateString,
  isToday,
  onPrevious,
  onNext,
  onOpenPicker,
}) => {
  const { isDark } = useTheme();
  const themeColors = useMemo(() => getColors(isDark), [isDark]);

  return (
    <View style={styles.container}>
      <View style={styles.navigationContainer}>
        <TouchableOpacity style={styles.arrowButton} onPress={onPrevious} accessibilityLabel="前の日へ移動">
          <Ionicons name="chevron-back" size={24} color={themeColors.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.dateButton,
            { backgroundColor: themeColors.surface, borderColor: themeColors.border },
          ]}
          onPress={onOpenPicker}
          accessibilityLabel="日付を選択"
        >
          <Ionicons
            name="calendar-outline"
            size={20}
            color={themeColors.primary}
            style={styles.calendarIcon}
          />
          <Text style={[styles.dateText, { color: themeColors.text.primary }]}>
            {formatDateWithWeekday(dateString)}
          </Text>
        </TouchableOpacity>

        {isToday ? (
          // 今日は未来へ進めないため「＞」を表示しない。日付ボタンの中央位置を保つための同サイズスペーサー。
          <View style={styles.arrowButton}>
            <View style={styles.arrowPlaceholder} />
          </View>
        ) : (
          <TouchableOpacity
            style={styles.arrowButton}
            onPress={onNext}
            accessibilityLabel="次の日へ移動"
          >
            <Ionicons name="chevron-forward" size={24} color={themeColors.primary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.padding.screen,
    marginTop: spacing.sm,
    marginBottom: spacing.xxl,
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowButton: {
    padding: spacing.sm,
  },
  arrowPlaceholder: {
    width: 24,
    height: 24,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: spacing.borderRadius.medium,
    borderWidth: spacing.borderWidth,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  calendarIcon: {
    marginRight: spacing.sm,
  },
  dateText: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
});

export default DateNavigator;
