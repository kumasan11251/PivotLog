import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getColors, fonts, spacing, textBase } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import type { TimeLeft } from '../../utils/timeCalculations';

export type CountdownMode = 'detailed' | 'daysOnly' | 'weeksOnly' | 'yearsOnly';

interface CountdownDisplayProps {
  timeLeft: TimeLeft;
  mode: CountdownMode;
}

const CountdownDisplay: React.FC<CountdownDisplayProps> = ({ timeLeft, mode }) => {
  const { isDark } = useTheme();
  const themeColors = useMemo(() => getColors(isDark), [isDark]);

  if (mode === 'detailed') {
    return (
      <View style={styles.detailedContainer}>
        {/* 数字の行 */}
        <View style={styles.valuesRow}>
          <Text style={[styles.timeValue, { color: themeColors.text.primary }]}>{String(timeLeft.years).padStart(2, '0')}</Text>
          <Text style={[styles.timeValue, { color: themeColors.text.primary }]}>{String(timeLeft.months).padStart(2, '0')}</Text>
          <Text style={[styles.timeValue, { color: themeColors.text.primary }]}>{String(timeLeft.days).padStart(2, '0')}</Text>
          <Text style={[styles.timeValueSmall, { color: themeColors.text.primary }]}>{String(timeLeft.hours).padStart(2, '0')}</Text>
          <Text style={[styles.timeValueSmall, { color: themeColors.text.primary }]}>{String(timeLeft.minutes).padStart(2, '0')}</Text>
          <Text style={[styles.timeValueSmall, { color: themeColors.text.primary }]}>{String(timeLeft.seconds).padStart(2, '0')}</Text>
        </View>
        {/* ラベルの行 */}
        <View style={styles.labelsRow}>
          <Text style={[styles.timeLabel, { color: themeColors.text.secondary }]}>年</Text>
          <Text style={[styles.timeLabel, { color: themeColors.text.secondary }]}>月</Text>
          <Text style={[styles.timeLabel, { color: themeColors.text.secondary }]}>日</Text>
          <Text style={[styles.timeLabelSmall, { color: themeColors.text.secondary }]}>時</Text>
          <Text style={[styles.timeLabelSmall, { color: themeColors.text.secondary }]}>分</Text>
          <Text style={[styles.timeLabelSmall, { color: themeColors.text.secondary }]}>秒</Text>
        </View>
      </View>
    );
  }

  if (mode === 'yearsOnly') {
    return (
      <View style={styles.countdownContainer}>
        <View style={styles.timeBlock}>
          <Text style={[styles.timeValue, { color: themeColors.text.primary }]}>
            {Math.floor(timeLeft.totalYears)}
            <Text style={[styles.decimalPart, { color: themeColors.text.secondary }]}>
              {(timeLeft.totalYears % 1).toFixed(8).substring(1)}
            </Text>
          </Text>
          <Text style={[styles.timeLabel, { color: themeColors.text.secondary }]}>年</Text>
        </View>
      </View>
    );
  }

  if (mode === 'weeksOnly') {
    return (
      <View style={styles.countdownContainer}>
        <View style={styles.timeBlock}>
          <Text style={[styles.timeValue, { color: themeColors.text.primary }]}>
            {Math.floor(timeLeft.totalWeeks).toLocaleString('ja-JP')}
            <Text style={[styles.decimalPart, { color: themeColors.text.secondary }]}>
              {(timeLeft.totalWeeks % 1).toFixed(6).substring(1)}
            </Text>
          </Text>
          <Text style={[styles.timeLabel, { color: themeColors.text.secondary }]}>週</Text>
        </View>
      </View>
    );
  }

  // daysOnly
  return (
    <View style={styles.countdownContainer}>
      <View style={styles.timeBlock}>
        <Text style={[styles.timeValue, { color: themeColors.text.primary }]}>
          {Math.floor(timeLeft.totalDays).toLocaleString('ja-JP')}
          <Text style={[styles.decimalPart, { color: themeColors.text.secondary }]}>
            {(timeLeft.totalDays % 1).toFixed(5).substring(1)}
          </Text>
        </Text>
        <Text style={[styles.timeLabel, { color: themeColors.text.secondary }]}>日</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  countdownContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  detailedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valuesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginTop: 4,
    gap: spacing.xs,
  },
  timeBlock: {
    alignItems: 'center',
    marginHorizontal: 2,
    minWidth: spacing.countdown.blockWidthLarge,
  },
  timeValue: {
    fontSize: fonts.size.countdownLarge,
    fontWeight: fonts.weight.light,
    fontFamily: fonts.family.regular,
    minWidth: spacing.countdown.blockWidthLarge,
    textAlign: 'center',
    ...textBase,
  },
  timeLabel: {
    fontSize: fonts.size.label,
    letterSpacing: 1,
    fontFamily: fonts.family.regular,
    minWidth: spacing.countdown.blockWidthLarge,
    textAlign: 'center',
    ...textBase,
  },
  decimalPart: {
    fontSize: fonts.size.countdownSmall,
    fontWeight: fonts.weight.light,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  timeValueSmall: {
    fontSize: fonts.size.countdownSmall,
    fontWeight: fonts.weight.light,
    fontFamily: fonts.family.regular,
    minWidth: spacing.countdown.blockWidthSmall,
    textAlign: 'center',
    ...textBase,
  },
  timeLabelSmall: {
    fontSize: fonts.size.label,
    letterSpacing: 1,
    fontFamily: fonts.family.regular,
    minWidth: spacing.countdown.blockWidthSmall,
    textAlign: 'center',
    ...textBase,
  },
});

export default CountdownDisplay;
