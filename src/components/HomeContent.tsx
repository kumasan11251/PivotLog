import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { HomeScreenNavigationProp } from '../types/navigation';
import { colors, spacing } from '../theme';
import Button from './common/Button';
import ScreenHeader from './common/ScreenHeader';
import CountdownSection from './home/CountdownSection';
import ProgressSection from './home/ProgressSection';
import { useTimeCalculation } from '../hooks/useTimeCalculation';
import { useProgressAnimation } from '../hooks/useProgressAnimation';
import { useDisplaySettings } from '../hooks/useDisplaySettings';

/**
 * ホーム画面のメインコンテンツ
 * 残り時間のカウントダウンと人生の進捗を表示
 */
const HomeContent: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();

  // カスタムフックで状態管理を分離
  const { timeLeft, lifeProgress, targetLifespan } = useTimeCalculation();
  const { countdownMode, progressMode, toggleCountdownMode, toggleProgressMode } = useDisplaySettings();
  const { animatedValues, triggerAnimation } = useProgressAnimation(lifeProgress);

  // ナビゲーションハンドラ
  const handleNavigateToSettings = useCallback(() => {
    navigation.navigate('Settings');
  }, [navigation]);

  const handleNavigateToDiaryEntry = useCallback(() => {
    navigation.navigate('DiaryEntry', {});
  }, [navigation]);

  // プログレスモード切替（アニメーション再実行付き）
  const handleToggleProgressMode = useCallback(async () => {
    triggerAnimation();
    await toggleProgressMode();
  }, [triggerAnimation, toggleProgressMode]);

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="ホーム"
        rightAction={{
          type: 'settings',
          onPress: handleNavigateToSettings,
        }}
      />

      <View style={styles.content}>
        {/* 上部セクション：残り時間カウントダウン */}
        <CountdownSection
          timeLeft={timeLeft}
          countdownMode={countdownMode}
          onToggleMode={toggleCountdownMode}
        />

        {/* 中央セクション：人生の進捗 */}
        <ProgressSection
          lifeProgress={lifeProgress}
          targetLifespan={targetLifespan}
          progressMode={progressMode}
          animatedValues={animatedValues}
          onToggleMode={handleToggleProgressMode}
        />

        {/* 下部セクション：記録ボタン */}
        <View style={styles.bottomSection}>
          <Button title="今日を記録する" onPress={handleNavigateToDiaryEntry} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.padding.screen,
    justifyContent: 'space-between',
  },
  bottomSection: {
    width: '100%',
  },
});

export default HomeContent;
