import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Ionicons, Feather } from '@expo/vector-icons';
import type { HomeScreenNavigationProp } from '../types/navigation';
import { colors, fonts, spacing, textBase } from '../theme';
import ScreenHeader from './common/ScreenHeader';
import CountdownSection from './home/CountdownSection';
import ProgressSection from './home/ProgressSection';
import PerspectiveSection from './home/PerspectiveSection';
import { useTimeCalculation } from '../hooks/useTimeCalculation';
import { useProgressAnimation } from '../hooks/useProgressAnimation';
import { useDisplaySettings } from '../hooks/useDisplaySettings';
import { useTodayDiary } from '../hooks/useTodayDiary';
import { useHomeAnimations } from '../hooks/useHomeAnimations';
import { loadUserSettings } from '../utils/storage';
import { getTodayDateString, getStreakInfo } from '../utils/homeHelpers';
import { getEffectiveToday } from '../utils/dateUtils';

// アイコンコンポーネント
const EditIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 20,
  color = colors.text.inverse
}) => (
  <Feather name="edit-3" size={size} color={color} />
);

const CheckIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 20,
  color = colors.text.inverse
}) => (
  <Ionicons name="checkmark" size={size} color={color} />
);

/**
 * ホーム画面のメインコンテンツ
 * 残り時間のカウントダウンと人生の進捗を表示
 */
const HomeContent: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();

  // 1日の開始時刻（設定から読み込み）
  const [dayStartHour, setDayStartHour] = useState(0);

  // カスタムフックで状態管理を分離
  const { timeLeft, lifeProgress, targetLifespan, birthday, currentAge } = useTimeCalculation();
  const { countdownMode, progressMode, isLoading: isSettingsLoading, toggleCountdownMode, toggleProgressMode } = useDisplaySettings();
  const { animatedValues, triggerAnimation } = useProgressAnimation(lifeProgress);
  const {
    hasTodayEntry,
    streakDays,
    totalDays,
    isLoading: isStreakLoading,
    justCompleted,
    achievedMilestone,
    achievedTotalMilestone,
    isRestarting,
    clearJustCompleted,
    refresh: refreshTodayDiary
  } = useTodayDiary({ dayStartHour });

  // アニメーション管理をカスタムフックに委譲
  const {
    celebrationAnim,
    milestoneAnim,
    milestoneScaleAnim,
    pulseAnim,
    countdownFadeAnim,
    progressFadeAnim,
    celebrationMessage,
    activeMilestone,
    milestoneMessage,
    handleToggleProgressMode,
    handleToggleCountdownMode,
    triggerFocusAnimation,
  } = useHomeAnimations({
    justCompleted,
    achievedMilestone,
    achievedTotalMilestone,
    isRestarting,
    clearJustCompleted,
    isSettingsLoading,
    hasTodayEntry,
    triggerProgressAnimation: triggerAnimation,
    toggleCountdownMode,
    toggleProgressMode,
  });

  // 設定読み込み（dayStartHour）
  useEffect(() => {
    const loadSettings = async () => {
      const settings = await loadUserSettings();
      if (settings) {
        setDayStartHour(settings.dayStartHour ?? 0);
      }
    };
    loadSettings();
  }, []);

  // 画面フォーカス時にデータを再読み込み＆フェードインアニメーション＆設定再読み込み
  useFocusEffect(
    useCallback(() => {
      // 設定を再読み込み（dayStartHourの変更を反映）
      const reloadSettings = async () => {
        const settings = await loadUserSettings();
        if (settings) {
          setDayStartHour(settings.dayStartHour ?? 0);
        }
      };
      reloadSettings();
      refreshTodayDiary();
      triggerFocusAnimation();

      // 画面を離れる時に祝福メッセージをクリア（再表示防止）
      return () => {
        clearJustCompleted();
      };
    }, [refreshTodayDiary, triggerFocusAnimation, clearJustCompleted])
  );

  // ナビゲーションハンドラ
  const handleNavigateToSettings = useCallback(() => {
    navigation.navigate('Settings');
  }, [navigation]);

  const handleNavigateToDiaryEntry = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // dayStartHour を考慮した「今日」の日付を渡す
    const effectiveToday = getEffectiveToday(dayStartHour);
    navigation.navigate('DiaryEntry', { initialDate: effectiveToday });
  }, [navigation, dayStartHour]);

  // 今日の日付とストリーク情報
  const todayDate = getTodayDateString();

  // ストリーク情報（連続記録があればストリーク、なければ総記録日数を表示）
  const streakInfo = streakDays > 0
    ? getStreakInfo(streakDays)
    : totalDays > 0
      ? { message: `これまで${totalDays}日記録`, emoji: '📖' }
      : null;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="ホーム"
        rightAction={{
          type: 'settings',
          onPress: handleNavigateToSettings,
        }}
      />

      {/* 記録完了の祝福メッセージ（マイルストーン達成時は表示しない、再開時は励ましメッセージ） */}
      {justCompleted && !activeMilestone && (
        <Animated.View
          style={[
            styles.celebrationContainer,
            { opacity: celebrationAnim },
          ]}
        >
          <View style={styles.celebrationContent}>
            <Text style={styles.celebrationEmoji}>{celebrationMessage.emoji}</Text>
            <Text style={styles.celebrationText}>{celebrationMessage.text}</Text>
            <Text style={styles.celebrationSubtext}>{celebrationMessage.subtext}</Text>
          </View>
        </Animated.View>
      )}

      {/* マイルストーン達成の特別演出（連続記録または総記録） */}
      {activeMilestone && milestoneMessage && (
        <Animated.View
          style={[
            styles.milestoneOverlay,
            { opacity: milestoneAnim },
          ]}
        >
          <Animated.View
            style={[
              styles.milestoneContent,
              { transform: [{ scale: milestoneScaleAnim }] },
            ]}
          >
            <Text style={styles.milestoneEmoji}>{milestoneMessage.emoji}</Text>
            <Text style={styles.milestoneTitle}>{milestoneMessage.title}</Text>
            <Text style={styles.milestoneSubtitle}>{milestoneMessage.subtitle}</Text>
          </Animated.View>
        </Animated.View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* 日付 */}
        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>{todayDate}</Text>
        </View>

        {/* 上部セクション：残り時間カウントダウン */}
        <View style={styles.sectionWrapper}>
          <CountdownSection
            timeLeft={timeLeft}
            countdownMode={countdownMode}
            onToggleMode={handleToggleCountdownMode}
            contentOpacity={countdownFadeAnim}
            birthday={birthday ?? undefined}
          />
        </View>

        {/* 中央セクション：人生の進捗 */}
        <View style={styles.sectionWrapper}>
          <ProgressSection
            lifeProgress={lifeProgress}
            targetLifespan={targetLifespan}
            currentAge={currentAge}
            progressMode={progressMode}
            animatedValues={animatedValues}
            onToggleMode={handleToggleProgressMode}
            contentOpacity={progressFadeAnim}
          />
        </View>

        {/* 日替わり視点メッセージ */}
        <View style={styles.sectionWrapper}>
          <PerspectiveSection
            remainingYears={timeLeft.totalYears}
            remainingDays={timeLeft.totalDays}
            remainingWeeks={timeLeft.totalWeeks}
            currentAge={currentAge}
            progressPercent={lifeProgress}
          />
        </View>

        {/* 下部セクション：記録ボタンとストリーク */}
        <View style={styles.bottomSection}>
          {/* 連続記録日数（ストリーク）- 固定高さでガタつき防止 */}
          <View style={styles.streakContainer}>
            {!isStreakLoading && streakInfo && (
              <>
                <Text style={styles.streakEmoji}>{streakInfo.emoji}</Text>
                <Text style={styles.streakText}>{streakInfo.message}</Text>
              </>
            )}
          </View>

          {/* 記録ボタン（パルスアニメーション付き） */}
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={[
                styles.recordButton,
                hasTodayEntry && styles.recordButtonCompleted,
              ]}
              onPress={handleNavigateToDiaryEntry}
              activeOpacity={0.8}
            >
              <View style={styles.recordButtonContent}>
                {hasTodayEntry ? <CheckIcon /> : <EditIcon />}
                <Text style={styles.recordButtonText}>
                  {hasTodayEntry ? '今日の記録を見る' : '今日を記録する'}
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.padding.screen,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  sectionWrapper: {
    width: '100%',
  },
  celebrationContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    zIndex: 100,
    alignItems: 'center',
  },
  celebrationContent: {
    backgroundColor: colors.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: spacing.borderRadius.large,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  celebrationEmoji: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  celebrationText: {
    fontSize: fonts.size.body,
    color: colors.primary,
    fontFamily: fonts.family.bold,
    ...textBase,
  },
  celebrationSubtext: {
    fontSize: fonts.size.label,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    marginTop: 2,
    ...textBase,
  },
  milestoneOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  milestoneContent: {
    backgroundColor: colors.card,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl * 1.5,
    borderRadius: spacing.borderRadius.large * 1.5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 16,
    maxWidth: '85%',
  },
  milestoneEmoji: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  milestoneTitle: {
    fontSize: fonts.size.title,
    color: colors.primary,
    fontFamily: fonts.family.bold,
    textAlign: 'center',
    marginBottom: spacing.sm,
    ...textBase,
  },
  milestoneSubtitle: {
    fontSize: fonts.size.body,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    textAlign: 'center',
    lineHeight: 24,
    ...textBase,
  },
  dateContainer: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dateText: {
    fontSize: fonts.size.body,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    letterSpacing: 0.5,
    ...textBase,
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
    height: 36,
  },
  streakEmoji: {
    fontSize: 18,
  },
  streakText: {
    fontSize: fonts.size.label,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
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
