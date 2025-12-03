import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import CountdownDisplay from './CountdownDisplay';
import SectionHeader from './SectionHeader';
import { colors, spacing } from '../../theme';
import type { CountdownMode } from '../../hooks/useDisplaySettings';
import type { TimeLeft } from '../../utils/timeCalculations';

interface CountdownSectionProps {
  /** 残り時間データ */
  timeLeft: TimeLeft;
  /** 表示モード */
  countdownMode: CountdownMode;
  /** 表示モード切替ハンドラ */
  onToggleMode: () => void;
  /** コンテンツ部分の透明度（アニメーション用） */
  contentOpacity?: Animated.Value;
}

/**
 * カウントダウン表示セクション
 * 残り時間の表示と表示モード切替を担当
 */
const CountdownSection: React.FC<CountdownSectionProps> = ({
  timeLeft,
  countdownMode,
  onToggleMode,
  contentOpacity,
}) => {
  const ContentWrapper = contentOpacity ? Animated.View : View;
  const contentStyle = contentOpacity
    ? [styles.contentContainer, { opacity: contentOpacity }]
    : styles.contentContainer;

  return (
    <View style={styles.container}>
      <SectionHeader
        title="残りの時間"
        onToggle={onToggleMode}
        icon="hourglass"
      />
      <ContentWrapper style={contentStyle}>
        <CountdownDisplay timeLeft={timeLeft} mode={countdownMode} />
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
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CountdownSection;
