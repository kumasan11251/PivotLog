import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { HomeScreenNavigationProp } from '../types/navigation';
import { colors, spacing } from '../theme';
import Button from './common/Button';
import Header from './common/Header';
import CountdownDisplay from './home/CountdownDisplay';
import ProgressBar from './home/ProgressBar';
import CircleProgress from './home/CircleProgress';
import SectionHeader from './home/SectionHeader';
import { useTimeCalculation } from '../hooks/useTimeCalculation';
import { useProgressAnimation } from '../hooks/useProgressAnimation';
import { useDisplaySettings } from '../hooks/useDisplaySettings';

const HomeContent: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();

  // カスタムフックで状態管理を分離
  const { timeLeft, lifeProgress, targetLifespan } = useTimeCalculation();
  const { countdownMode, progressMode, toggleCountdownMode, toggleProgressMode } = useDisplaySettings();
  const { progressAnim, triggerAnimation } = useProgressAnimation(lifeProgress);

  const handleRecordToday = () => {
    navigation.navigate('DiaryEntry', {});
  };

  const handleToggleProgressMode = async () => {
    triggerAnimation(); // アニメーション再実行
    await toggleProgressMode();
  };

  // アニメーション用の幅とストローク計算
  const animatedWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const animatedStrokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <View style={styles.container}>
      <Header title="ホーム" />

      <View style={styles.content}>
        {/* 上部セクション：タイトルとカウントダウン */}
        <View style={styles.topSection}>
          <SectionHeader title="残りの時間" onToggle={toggleCountdownMode} />
          <CountdownDisplay timeLeft={timeLeft} mode={countdownMode} />
        </View>

        {/* 中央セクション:プログレスエリア */}
        <View style={styles.centerSection}>
          <SectionHeader title="人生の進捗" onToggle={handleToggleProgressMode} />

          <View style={styles.progressContentContainer}>
            {progressMode === 'bar' ? (
              <ProgressBar
                lifeProgress={lifeProgress}
                targetLifespan={targetLifespan}
                animatedWidth={animatedWidth}
              />
            ) : (
              <CircleProgress
                lifeProgress={lifeProgress}
                targetLifespan={targetLifespan}
                animatedStrokeDashoffset={animatedStrokeDashoffset}
              />
            )}
          </View>
        </View>

        {/* 下部セクション：ボタン */}
        <View style={styles.bottomSection}>
          <Button title="今日を記録する" onPress={handleRecordToday} />
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
  topSection: {
    alignItems: 'center',
  },
  centerSection: {
    width: '100%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSection: {
    width: '100%',
  },
  progressContentContainer: {
    width: '100%',
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default HomeContent;
