import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import ProgressBar from './ProgressBar';
import CircleProgress from './CircleProgress';
import SectionHeader from './SectionHeader';
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
  /** 表示モード */
  progressMode: ProgressMode;
  /** アニメーション値 */
  animatedValues: AnimatedValues;
  /** 表示モード切替ハンドラ */
  onToggleMode: () => void;
}

/**
 * プログレス表示セクション
 * バー/円の切替とアニメーション表示を担当
 */
const ProgressSection: React.FC<ProgressSectionProps> = ({
  lifeProgress,
  targetLifespan,
  progressMode,
  animatedValues,
  onToggleMode,
}) => {
  return (
    <View style={styles.container}>
      <SectionHeader title="人生の進捗" onToggle={onToggleMode} />

      <View style={styles.contentContainer}>
        {progressMode === 'bar' ? (
          <ProgressBar
            lifeProgress={lifeProgress}
            targetLifespan={targetLifespan}
            animatedWidth={animatedValues.width}
          />
        ) : (
          <CircleProgress
            lifeProgress={lifeProgress}
            targetLifespan={targetLifespan}
            animatedStrokeDashoffset={animatedValues.strokeDashoffset}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    width: '100%',
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ProgressSection;
