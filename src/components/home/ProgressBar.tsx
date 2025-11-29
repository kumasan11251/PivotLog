import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, fonts, spacing, textBase } from '../../theme';

interface ProgressBarProps {
  lifeProgress: number;
  targetLifespan: number;
  animatedWidth: Animated.AnimatedInterpolation<string | number>;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  lifeProgress,
  targetLifespan,
  animatedWidth
}) => {
  return (
    <View style={styles.progressSection}>
      <View style={styles.progressLabelContainer}>
        <Text style={styles.progressLabel}>誕生</Text>
        <Text style={styles.progressLabel}>{targetLifespan}歳</Text>
      </View>
      <View style={styles.progressBarContainer}>
        <Animated.View
          style={[
            styles.progressBar,
            { width: animatedWidth },
          ]}
        />
      </View>
      <Text style={styles.progressText}>
        {lifeProgress.toFixed(1)}<Text style={styles.percentSign}>%</Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  progressSection: {
    width: '100%',
    maxWidth: 320,
    justifyContent: 'center',
  },
  progressLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  progressLabel: {
    fontSize: fonts.size.label,
    color: colors.text.secondary,
    letterSpacing: 0.5,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  progressBarContainer: {
    height: spacing.progressBar.height,
    backgroundColor: colors.progress.background,
    borderRadius: spacing.borderRadius.small,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.progress.bar,
    borderRadius: spacing.borderRadius.small,
  },
  progressText: {
    fontSize: fonts.size.progressLarge,
    color: colors.text.primary,
    textAlign: 'center',
    fontWeight: fonts.weight.light,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  percentSign: {
    fontSize: 24,
    fontWeight: fonts.weight.light,
    color: colors.text.primary,
  },
});

export default ProgressBar;
