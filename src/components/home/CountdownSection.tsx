import React, { useMemo, useCallback } from 'react';
import { View, StyleSheet, PanResponder, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import CountdownDisplay from './CountdownDisplay';
import SectionHeader from './SectionHeader';
import type { CountdownMode } from '../../hooks/useDisplaySettings';
import type { TimeLeft } from '../../utils/timeCalculations';

const COUNTDOWN_MODES: CountdownMode[] = ['detailed', 'daysOnly', 'weeksOnly', 'yearsOnly'];
const SWIPE_THRESHOLD = 50;

interface CountdownSectionProps {
  /** 残り時間データ */
  timeLeft: TimeLeft;
  /** 表示モード */
  countdownMode: CountdownMode;
  /** 表示モード切替ハンドラ */
  onToggleMode: () => void;
  /** 特定のモードに設定するハンドラ */
  onSetMode?: (mode: CountdownMode) => void;
}

/**
 * カウントダウン表示セクション
 * 残り時間の表示と表示モード切替を担当
 * スワイプでモード切替に対応
 */
const CountdownSection: React.FC<CountdownSectionProps> = ({
  timeLeft,
  countdownMode,
  onToggleMode,
  onSetMode,
}) => {
  const translateX = useMemo(() => new Animated.Value(0), []);
  const currentModeIndex = COUNTDOWN_MODES.indexOf(countdownMode);

  const handleSwipe = useCallback((direction: 'left' | 'right') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (onSetMode) {
      const currentIndex = COUNTDOWN_MODES.indexOf(countdownMode);
      let newIndex: number;
      
      if (direction === 'left') {
        newIndex = (currentIndex + 1) % COUNTDOWN_MODES.length;
      } else {
        newIndex = (currentIndex - 1 + COUNTDOWN_MODES.length) % COUNTDOWN_MODES.length;
      }
      
      onSetMode(COUNTDOWN_MODES[newIndex]);
    } else {
      onToggleMode();
    }
  }, [countdownMode, onSetMode, onToggleMode]);

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
        if (gestureState.dx < -SWIPE_THRESHOLD) {
          handleSwipe('left');
        } else if (gestureState.dx > SWIPE_THRESHOLD) {
          handleSwipe('right');
        }
        
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
        }).start();
      },
    }),
    [translateX, handleSwipe]
  );

  return (
    <View style={styles.container}>
      <SectionHeader 
        title="残りの時間" 
        onToggle={onToggleMode}
        currentModeIndex={currentModeIndex}
        totalModes={COUNTDOWN_MODES.length}
      />
      <Animated.View 
        style={[styles.contentContainer, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <CountdownDisplay timeLeft={timeLeft} mode={countdownMode} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  contentContainer: {
    width: '100%',
    alignItems: 'center',
  },
});

export default CountdownSection;
