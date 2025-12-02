import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import type { HomeScreenNavigationProp } from '../types/navigation';
import { colors, fonts, spacing, textBase } from '../theme';
import ScreenHeader from './common/ScreenHeader';
import CountdownSection from './home/CountdownSection';
import ProgressSection from './home/ProgressSection';
import { useTimeCalculation } from '../hooks/useTimeCalculation';
import { useProgressAnimation } from '../hooks/useProgressAnimation';
import { useDisplaySettings } from '../hooks/useDisplaySettings';
import { useTodayDiary } from '../hooks/useTodayDiary';

// ペンアイコン
const PenIcon: React.FC<{ size?: number; color?: string }> = ({ 
  size = 20, 
  color = colors.text.inverse 
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.4374 22.1213 4.00001C22.1213 4.56262 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// チェックアイコン
const CheckIcon: React.FC<{ size?: number; color?: string }> = ({ 
  size = 20, 
  color = colors.text.inverse 
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 6L9 17L4 12"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// 炎アイコン（ストリーク用）
const FireIcon: React.FC<{ size?: number; color?: string }> = ({ 
  size = 16, 
  color = '#FF6B35' 
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path
      d="M12 23C16.1421 23 19.5 19.6421 19.5 15.5C19.5 13.0785 17.5451 10.1735 15.6348 7.9375C14.6939 6.8359 13.7669 5.89961 13.0638 5.21484C12.7125 4.87305 12.4158 4.59766 12.1969 4.40234C12.0875 4.30469 12 4.22656 11.9375 4.17188C11.9062 4.14453 11.8816 4.12305 11.8638 4.10742L11.8441 4.09033C11.6318 3.90713 11.3682 3.90713 11.1559 4.09033L11.1362 4.10742C11.1184 4.12305 11.0938 4.14453 11.0625 4.17188C11 4.22656 10.9125 4.30469 10.8031 4.40234C10.5842 4.59766 10.2875 4.87305 9.93623 5.21484C9.2331 5.89961 8.30615 6.8359 7.36523 7.9375C5.45492 10.1735 3.5 13.0785 3.5 15.5C3.5 19.6421 6.85786 23 11 23H12ZM12 21C8.68629 21 6 18.3137 6 15C6 14.5 6.5 13 8 11C8.5 12 9.5 13 11 13C12 13 12.7843 12.3284 13.3922 11.7206C13.5267 11.586 13.6533 11.4533 13.7719 11.3281C14.1428 10.9375 14.4512 10.6094 14.7063 10.3547C14.8338 10.2275 14.9473 10.1191 15.0469 10.0313C15.0967 9.9873 15.1426 9.94873 15.1846 9.91553L15.2402 9.87158C15.2461 9.86719 15.252 9.86279 15.2578 9.8584C15.2637 9.854 15.2686 9.8501 15.2725 9.84668C15.2744 9.84521 15.2764 9.84375 15.2783 9.8418L15.291 9.83203C15.7139 9.56494 16.2461 9.78223 16.4141 10.2617C16.8037 11.377 17 12.4277 17 13.5C17 17.6421 14.3137 21 12 21Z"
    />
  </Svg>
);

/**
 * ホーム画面のメインコンテンツ
 * 残り時間のカウントダウンと人生の進捗を表示
 */
const HomeContent: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();

  // カスタムフックで状態管理を分離
  const { timeLeft, lifeProgress, targetLifespan } = useTimeCalculation();
  const { countdownMode, progressMode, toggleCountdownMode, toggleProgressMode, setCountdownMode } = useDisplaySettings();
  const { animatedValues, triggerAnimation } = useProgressAnimation(lifeProgress);
  const { hasTodayEntry, streakDays, refresh: refreshTodayDiary } = useTodayDiary();

  // 画面フォーカス時にデータを再読み込み
  useFocusEffect(
    useCallback(() => {
      refreshTodayDiary();
    }, [refreshTodayDiary])
  );

  // ナビゲーションハンドラ
  const handleNavigateToSettings = useCallback(() => {
    navigation.navigate('Settings');
  }, [navigation]);

  const handleNavigateToDiaryEntry = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
          onSetMode={setCountdownMode}
        />

        {/* 中央セクション：人生の進捗 */}
        <ProgressSection
          lifeProgress={lifeProgress}
          targetLifespan={targetLifespan}
          progressMode={progressMode}
          animatedValues={animatedValues}
          onToggleMode={handleToggleProgressMode}
        />

        {/* 下部セクション：記録ボタンとストリーク */}
        <View style={styles.bottomSection}>
          {/* 連続記録日数（ストリーク） */}
          {streakDays > 0 && (
            <View style={styles.streakContainer}>
              <FireIcon />
              <Text style={styles.streakText}>
                {streakDays}日連続で記録中！
              </Text>
            </View>
          )}
          
          {/* 記録ボタン */}
          <TouchableOpacity
            style={[
              styles.recordButton,
              hasTodayEntry && styles.recordButtonCompleted,
            ]}
            onPress={handleNavigateToDiaryEntry}
            activeOpacity={0.8}
          >
            <View style={styles.recordButtonContent}>
              {hasTodayEntry ? <CheckIcon /> : <PenIcon />}
              <Text style={styles.recordButtonText}>
                {hasTodayEntry ? '今日の記録を見る' : '今日を記録する'}
              </Text>
            </View>
          </TouchableOpacity>
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
    gap: spacing.md,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  streakText: {
    fontSize: fonts.size.label,
    color: '#FF6B35',
    fontFamily: fonts.family.regular,
    fontWeight: fonts.weight.semibold,
    ...textBase,
  },
  recordButton: {
    backgroundColor: colors.primary,
    borderRadius: spacing.borderRadius.medium,
    padding: spacing.padding.button,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: spacing.shadow.offset,
    shadowOpacity: spacing.shadow.opacity,
    shadowRadius: spacing.shadow.radius,
    elevation: spacing.shadow.elevation,
  },
  recordButtonCompleted: {
    backgroundColor: colors.primary,
    opacity: 0.9,
  },
  recordButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  recordButtonText: {
    fontSize: fonts.size.body,
    fontWeight: fonts.weight.semibold,
    color: colors.text.inverse,
    letterSpacing: 1,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
});

export default HomeContent;
