import React from 'react';
import { View, StyleSheet } from 'react-native';
import CountdownDisplay from './CountdownDisplay';
import SectionHeader from './SectionHeader';
import type { CountdownMode } from '../../hooks/useDisplaySettings';
import type { TimeLeft } from '../../utils/timeCalculations';

interface CountdownSectionProps {
  /** 残り時間データ */
  timeLeft: TimeLeft;
  /** 表示モード */
  countdownMode: CountdownMode;
  /** 表示モード切替ハンドラ */
  onToggleMode: () => void;
}

/**
 * カウントダウン表示セクション
 * 残り時間の表示と表示モード切替を担当
 */
const CountdownSection: React.FC<CountdownSectionProps> = ({
  timeLeft,
  countdownMode,
  onToggleMode,
}) => {
  return (
    <View style={styles.container}>
      <SectionHeader title="残りの時間" onToggle={onToggleMode} />
      <CountdownDisplay timeLeft={timeLeft} mode={countdownMode} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
});

export default CountdownSection;
