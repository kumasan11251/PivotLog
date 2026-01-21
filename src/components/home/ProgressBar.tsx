import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { getColors, fonts, spacing, textBase } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';

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
  const { isDark } = useTheme();
  const themeColors = useMemo(() => getColors(isDark), [isDark]);

  return (
    <View style={styles.progressSection}>
      <View style={styles.progressLabelContainer}>
        <Text style={[styles.progressLabel, { color: themeColors.text.secondary }]}>誕生</Text>
        <Text style={[styles.progressLabel, { color: themeColors.text.secondary }]}>{targetLifespan}歳</Text>
      </View>
      <View style={[styles.progressBarContainer, { backgroundColor: themeColors.progress.background }]}>
        <Animated.View
          style={[
            styles.progressBar,
            { width: animatedWidth, backgroundColor: themeColors.progress.bar },
          ]}
        />
      </View>
      <Text style={[styles.progressText, { color: themeColors.text.primary }]}>
        {lifeProgress.toFixed(1)}<Text style={[styles.percentSign, { color: themeColors.text.primary }]}>%</Text>
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
    letterSpacing: 0.5,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  progressBarContainer: {
    height: spacing.progressBar.height,
    borderRadius: spacing.borderRadius.small,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressBar: {
    height: '100%',
    borderRadius: spacing.borderRadius.small,
  },
  progressText: {
    fontSize: fonts.size.progressLarge,
    textAlign: 'center',
    fontWeight: fonts.weight.light,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  percentSign: {
    fontSize: 24,
    fontWeight: fonts.weight.light,
  },
});

export default ProgressBar;
