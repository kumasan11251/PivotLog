import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import ProgressBar from './ProgressBar';
import CircleProgress from './CircleProgress';
import GridProgress from './GridProgress';
import SectionHeader from './SectionHeader';
import { colors, spacing } from '../../theme';
import type { ProgressMode } from '../../hooks/useDisplaySettings';

interface AnimatedValues {
  width: Animated.AnimatedInterpolation<string | number>;
  strokeDashoffset: Animated.AnimatedInterpolation<string | number>;
}

interface ProgressSectionProps {
  /** 人生の進捗率（0〜100） */
  lifeProgress: number;
  /** 目標寿命 */
  targetLifespan: number;
  /** 現在の年齢（小数点以下含む） */
  currentAge: number;
  /** 表示モード */
  progressMode: ProgressMode;
  /** アニメーション値 */
  animatedValues: AnimatedValues;
  /** 表示モード切替ハンドラ */
  onToggleMode: () => void;
  /** コンテンツ部分の透明度（アニメーション用） */
  contentOpacity?: Animated.Value;
}

/**
 * プログレス表示セクション
 * バー/円/グリッドの切替とアニメーション表示を担当
 */
const ProgressSection: React.FC<ProgressSectionProps> = ({
  lifeProgress,
  targetLifespan,
  currentAge,
  progressMode,
  animatedValues,
  onToggleMode,
  contentOpacity,
}) => {
  const ContentWrapper = contentOpacity ? Animated.View : View;
  const contentStyle = contentOpacity
    ? [styles.contentContainer, { opacity: contentOpacity }]
    : styles.contentContainer;

  const renderProgress = () => {
    switch (progressMode) {
      case 'bar':
        return (
          <ProgressBar
            lifeProgress={lifeProgress}
            targetLifespan={targetLifespan}
            animatedWidth={animatedValues.width}
          />
        );
      case 'circle':
        return (
          <CircleProgress
            lifeProgress={lifeProgress}
            targetLifespan={targetLifespan}
            animatedStrokeDashoffset={animatedValues.strokeDashoffset}
          />
        );
      case 'grid':
        return (
          <GridProgress
            targetLifespan={targetLifespan}
            currentAge={currentAge}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <SectionHeader
        title="人生の進捗"
        onToggle={onToggleMode}
        icon="sprout"
      />

      <ContentWrapper style={contentStyle}>
        {renderProgress()}
      </ContentWrapper>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: spacing.borderRadius.large,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    // Android shadow
    elevation: 4,
  },
  contentContainer: {
    width: '100%',
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ProgressSection;
