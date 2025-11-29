import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, fonts, spacing, textBase } from '../../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CircleProgressProps {
  lifeProgress: number;
  targetLifespan: number;
  animatedStrokeDashoffset: Animated.AnimatedInterpolation<string | number>;
}

const CircleProgress: React.FC<CircleProgressProps> = ({
  lifeProgress,
  targetLifespan,
  animatedStrokeDashoffset
}) => {
  const radius = 90;
  const circumference = 2 * Math.PI * radius;

  return (
    <View style={styles.circleProgressSection}>
      <View style={styles.circleProgressContainer}>
        <Svg width="200" height="200" style={styles.circleSvg}>
          {/* 背景円 */}
          <Circle
            cx="100"
            cy="100"
            r={radius}
            stroke={colors.progress.background}
            strokeWidth="12"
            fill="none"
          />
          {/* プログレス円 */}
          <AnimatedCircle
            cx="100"
            cy="100"
            r={radius}
            stroke={colors.progress.bar}
            strokeWidth="12"
            fill="none"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={animatedStrokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 100 100)"
          />
        </Svg>
        <View style={styles.circleProgressTextContainer}>
          <Text style={styles.circleProgressText}>
            {lifeProgress.toFixed(1)}%
          </Text>
          <Text style={styles.circleProgressSubText}>
            {targetLifespan}歳まで
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  circleProgressSection: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleProgressContainer: {
    position: 'relative',
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleSvg: {
    position: 'absolute',
  },
  circleProgressTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleProgressText: {
    fontSize: fonts.size.countdownLarge,
    fontWeight: fonts.weight.light,
    color: colors.text.primary,
    fontFamily: fonts.family.regular,
    marginBottom: spacing.xs,
    ...textBase,
  },
  circleProgressSubText: {
    fontSize: fonts.size.label,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    letterSpacing: 1,
    ...textBase,
  },
});

export default CircleProgress;
