import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, spacing, textBase } from '../../theme';
import type { TimeLeft } from '../../utils/timeCalculations';

export type CountdownMode = 'detailed' | 'daysOnly' | 'weeksOnly' | 'yearsOnly';

interface CountdownDisplayProps {
  timeLeft: TimeLeft;
  mode: CountdownMode;
}

const CountdownDisplay: React.FC<CountdownDisplayProps> = ({ timeLeft, mode }) => {
  if (mode === 'detailed') {
    return (
      <View style={styles.detailedContainer}>
        {/* 数字の行 */}
        <View style={styles.valuesRow}>
          <Text style={styles.timeValue}>{String(timeLeft.years).padStart(2, '0')}</Text>
          <Text style={styles.timeValue}>{String(timeLeft.months).padStart(2, '0')}</Text>
          <Text style={styles.timeValue}>{String(timeLeft.days).padStart(2, '0')}</Text>
          <Text style={styles.timeValueSmall}>{String(timeLeft.hours).padStart(2, '0')}</Text>
          <Text style={styles.timeValueSmall}>{String(timeLeft.minutes).padStart(2, '0')}</Text>
          <Text style={styles.timeValueSmall}>{String(timeLeft.seconds).padStart(2, '0')}</Text>
        </View>
        {/* ラベルの行 */}
        <View style={styles.labelsRow}>
          <Text style={styles.timeLabel}>年</Text>
          <Text style={styles.timeLabel}>月</Text>
          <Text style={styles.timeLabel}>日</Text>
          <Text style={styles.timeLabelSmall}>時</Text>
          <Text style={styles.timeLabelSmall}>分</Text>
          <Text style={styles.timeLabelSmall}>秒</Text>
        </View>
      </View>
    );
  }

  if (mode === 'yearsOnly') {
    return (
      <View style={styles.countdownContainer}>
        <View style={styles.timeBlock}>
          <Text style={styles.timeValue}>
            {Math.floor(timeLeft.totalYears)}
            <Text style={styles.decimalPart}>
              {(timeLeft.totalYears % 1).toFixed(8).substring(1)}
            </Text>
          </Text>
          <Text style={styles.timeLabel}>年</Text>
        </View>
      </View>
    );
  }

  if (mode === 'weeksOnly') {
    return (
      <View style={styles.countdownContainer}>
        <View style={styles.timeBlock}>
          <Text style={styles.timeValue}>
            {Math.floor(timeLeft.totalWeeks).toLocaleString('ja-JP')}
            <Text style={styles.decimalPart}>
              {(timeLeft.totalWeeks % 1).toFixed(6).substring(1)}
            </Text>
          </Text>
          <Text style={styles.timeLabel}>週</Text>
        </View>
      </View>
    );
  }

  // daysOnly
  return (
    <View style={styles.countdownContainer}>
      <View style={styles.timeBlock}>
        <Text style={styles.timeValue}>
          {Math.floor(timeLeft.totalDays).toLocaleString('ja-JP')}
          <Text style={styles.decimalPart}>
            {(timeLeft.totalDays % 1).toFixed(5).substring(1)}
          </Text>
        </Text>
        <Text style={styles.timeLabel}>日</Text>
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
    color: colors.text.primary,
    fontFamily: fonts.family.regular,
    minWidth: spacing.countdown.blockWidthLarge,
    textAlign: 'center',
    ...textBase,
  },
  timeLabel: {
    fontSize: fonts.size.label,
    color: colors.text.secondary,
    letterSpacing: 1,
    fontFamily: fonts.family.regular,
    minWidth: spacing.countdown.blockWidthLarge,
    textAlign: 'center',
    ...textBase,
  },
  decimalPart: {
    fontSize: fonts.size.countdownSmall,
    fontWeight: fonts.weight.light,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  timeValueSmall: {
    fontSize: fonts.size.countdownSmall,
    fontWeight: fonts.weight.light,
    color: colors.text.primary,
    fontFamily: fonts.family.regular,
    minWidth: spacing.countdown.blockWidthSmall,
    textAlign: 'center',
    ...textBase,
  },
  timeLabelSmall: {
    fontSize: fonts.size.label,
    color: colors.text.secondary,
    letterSpacing: 1,
    fontFamily: fonts.family.regular,
    minWidth: spacing.countdown.blockWidthSmall,
    textAlign: 'center',
    ...textBase,
  },
});

export default CountdownDisplay;
