import React, { useMemo } from 'react';
import { View, StyleSheet, Animated, PanResponder } from 'react-native';
import * as Haptics from 'expo-haptics';
import ProgressBar from './ProgressBar';
import CircleProgress from './CircleProgress';
import SectionHeader from './SectionHeader';
import type { ProgressMode } from '../../hooks/useDisplaySettings';

const PROGRESS_MODES: ProgressMode[] = ['bar', 'circle'];
const SWIPE_THRESHOLD = 50;

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
 * スワイプでモード切替に対応
 */
const ProgressSection: React.FC<ProgressSectionProps> = ({
  lifeProgress,
  targetLifespan,
  progressMode,
  animatedValues,
  onToggleMode,
}) => {
  const translateX = useMemo(() => new Animated.Value(0), []);
  const currentModeIndex = PROGRESS_MODES.indexOf(progressMode);

  const panResponder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        translateX.setValue(gestureState.dx * 0.3);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > SWIPE_THRESHOLD) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onToggleMode();
        }
        
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
        }).start();
      },
    }),
    [translateX, onToggleMode]
  );

  return (
    <View style={styles.container}>
      <SectionHeader 
        title="人生の進捗" 
        onToggle={onToggleMode}
        currentModeIndex={currentModeIndex}
        totalModes={PROGRESS_MODES.length}
      />

      <Animated.View 
        style={[styles.contentContainer, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
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
      </Animated.View>
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
