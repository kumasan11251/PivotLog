import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, textBase } from '../../theme';

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
  return (
    <View style={styles.container}>
      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={onPreviousMonth} style={styles.arrowButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onMonthPress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          disabled={!onMonthPress}
          style={styles.monthButton}
        >
          <Text style={styles.monthText}>
            {selectedYear}年{selectedMonth}月
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onNextMonth}
          style={styles.arrowButton}
          disabled={isNextDisabled}
        >
          <Ionicons
            name="chevron-forward"
            size={24}
            color={isNextDisabled ? colors.text.secondary : colors.text.primary}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.viewModeToggle}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            viewMode === 'list' && styles.toggleButtonActive,
          ]}
          onPress={() => onViewModeChange('list')}
        >
          <Ionicons
            name="list"
            size={20}
            color={viewMode === 'list' ? colors.text.inverse : colors.text.secondary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            viewMode === 'calendar' && styles.toggleButtonActive,
          ]}
          onPress={() => onViewModeChange('calendar')}
        >
          <Ionicons
            name="calendar"
            size={20}
            color={
              viewMode === 'calendar' ? colors.text.inverse : colors.text.secondary
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
    backgroundColor: colors.surface,
    borderBottomWidth: spacing.borderWidth,
    borderBottomColor: colors.border,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrowButton: {
    padding: spacing.xs,
  },
  monthButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: spacing.borderRadius.small,
    borderWidth: spacing.borderWidth,
    borderColor: colors.border,
    backgroundColor: colors.background,
    marginHorizontal: spacing.sm,
  },
  monthText: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    minWidth: 90,
    textAlign: 'center',
    ...textBase,
  },
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: spacing.borderRadius.small,
    padding: 2,
  },
  toggleButton: {
    padding: spacing.sm,
    borderRadius: spacing.borderRadius.small,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
  },
});

export default MonthSelector;
