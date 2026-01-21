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
        <TouchableOpacity style={styles.arrowButton} onPress={onPrevious}>
          <Ionicons name="chevron-back" size={24} color={themeColors.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.dateButton,
            { backgroundColor: themeColors.surface, borderColor: themeColors.border },
          ]}
          onPress={onOpenPicker}
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

        <TouchableOpacity
          style={[styles.arrowButton, isToday && styles.arrowButtonDisabled]}
          onPress={onNext}
          disabled={isToday}
        >
          <Ionicons
            name="chevron-forward"
            size={24}
            color={isToday ? themeColors.border : themeColors.primary}
          />
        </TouchableOpacity>
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
  arrowButtonDisabled: {
    opacity: 0.3,
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
