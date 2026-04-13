import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getColors, fonts, spacing, textBase } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';

type ViewMode = 'list' | 'calendar';

interface MonthSelectorProps {
  selectedYear: number;
  selectedMonth: number;
  viewMode: ViewMode;
  isNextDisabled: boolean;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onViewModeChange: (mode: ViewMode) => void;
  onMonthPress?: () => void;
}

const MonthSelector: React.FC<MonthSelectorProps> = ({
  selectedYear,
  selectedMonth,
  viewMode,
  isNextDisabled,
  onPreviousMonth,
  onNextMonth,
  onViewModeChange,
  onMonthPress,
}) => {
  const { isDark } = useTheme();
  const themeColors = useMemo(() => getColors(isDark), [isDark]);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={onPreviousMonth} style={styles.arrowButton}>
          <Ionicons name="chevron-back" size={24} color={themeColors.text.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onMonthPress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          disabled={!onMonthPress}
          style={[styles.monthButton, { borderColor: themeColors.border, backgroundColor: themeColors.background }]}
        >
          <Text style={[styles.monthText, { color: themeColors.text.primary }]}>
            {selectedYear}年{selectedMonth}月
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onNextMonth}
          style={[styles.arrowButton, isNextDisabled && styles.arrowButtonDisabled]}
          disabled={isNextDisabled}
        >
          <Ionicons
            name="chevron-forward"
            size={24}
            color={isNextDisabled ? themeColors.text.secondary : themeColors.text.primary}
          />
        </TouchableOpacity>
      </View>
      <View style={[styles.viewModeToggle, { backgroundColor: themeColors.background }]}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            viewMode === 'list' && [styles.toggleButtonActive, { backgroundColor: themeColors.primary }],
          ]}
          onPress={() => onViewModeChange('list')}
        >
          <Ionicons
            name="list"
            size={20}
            color={viewMode === 'list' ? themeColors.text.inverse : themeColors.text.secondary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            viewMode === 'calendar' && [styles.toggleButtonActive, { backgroundColor: themeColors.primary }],
          ]}
          onPress={() => onViewModeChange('calendar')}
        >
          <Ionicons
            name="calendar"
            size={20}
            color={
              viewMode === 'calendar' ? themeColors.text.inverse : themeColors.text.secondary
            }
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.padding.screen,
    paddingVertical: spacing.md,
    borderBottomWidth: spacing.borderWidth,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrowButton: {
    padding: spacing.xs,
  },
  arrowButtonDisabled: {
    opacity: 0.3,
  },
  monthButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: spacing.borderRadius.small,
    borderWidth: spacing.borderWidth,
    marginHorizontal: spacing.sm,
  },
  monthText: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.bold,
    minWidth: 90,
    textAlign: 'center',
    ...textBase,
  },
  viewModeToggle: {
    flexDirection: 'row',
    borderRadius: spacing.borderRadius.small,
    padding: 2,
  },
  toggleButton: {
    padding: spacing.sm,
    borderRadius: spacing.borderRadius.small,
  },
  toggleButtonActive: {},
});

export default MonthSelector;
