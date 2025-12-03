import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
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
import { loadUserSettings } from '../utils/storage';

// 曜日の日本語表記
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

// 今日の日付を取得
const getTodayDateString = (): string => {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  const weekday = WEEKDAYS[today.getDay()];
  return `${month}月${day}日（${weekday}）`;
};

// 誕生日かどうかをチェック
const isBirthday = (birthday: string): boolean => {
  const today = new Date();
  const [, birthMonth, birthDay] = birthday.split('-').map(Number);
  return today.getMonth() + 1 === birthMonth && today.getDate() === birthDay;
};

// 日替わりメッセージ（日付ベースで同じ日は同じメッセージ）
const DAILY_MESSAGES = [
  // 温かみ・ほっこり系
  '今日もあなたらしく',
  '今日の小さな幸せを見つけよう',
  '自分を褒めてあげよう',
  'あなたは十分頑張っている',
  '深呼吸して、今日も一歩',
  'ゆっくりでも大丈夫',
  '無理せず、自分のペースで',
  '今日もお疲れさま',
  'あなたの毎日に拍手',
  '笑顔になれる瞬間がありますように',
  '今日の自分にありがとう',
  'そのままのあなたで大丈夫',
  // 前向き・応援系
  '今日もいい一日になる',
  '新しい一日の始まり',
  '今日という日を楽しもう',
  'きっとうまくいく',
  '今日も素敵な一日を',
  '今日はどんな発見があるかな',
  'いいことが起きる予感',
  '今日のあなたを応援してる',
  'ワクワクする一日に',
  '今日もチャンスがいっぱい',
  // 気づき・内省系（優しめ）
  '今この瞬間を大切に',
  '一日一日を丁寧に',
  '今日の自分を大切に',
  '今日という贈り物',
  '小さな一歩が大きな変化に',
  '今日も成長の一日',
  '心穏やかに過ごそう',
  '今日できることを楽しもう',
  '感謝の気持ちを忘れずに',
];

const getGreeting = (isBirthdayToday: boolean): string => {
  // 誕生日なら特別メッセージ
  if (isBirthdayToday) {
    return '🎂 お誕生日おめでとうございます！';
  }

  // 日付から一貫したインデックスを生成
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );
  const index = dayOfYear % DAILY_MESSAGES.length;
  return DAILY_MESSAGES[index];
};

// ストリークのマイルストーン情報を取得
const getStreakInfo = (days: number): { message: string; emoji: string } => {
  if (days >= 365) {
    return { message: `${days}日連続！1年達成`, emoji: '🏆' };
  } else if (days >= 100) {
    return { message: `${days}日連続！100日突破`, emoji: '💎' };
  } else if (days >= 30) {
    return { message: `${days}日連続！1ヶ月達成`, emoji: '🌟' };
  } else if (days >= 14) {
    return { message: `${days}日連続！2週間達成`, emoji: '✨' };
  } else if (days >= 7) {
    return { message: `${days}日連続！1週間達成`, emoji: '🎉' };
  } else if (days >= 3) {
    return { message: `${days}日連続で記録中`, emoji: '🔥' };
  } else {
    return { message: `${days}日連続で記録中`, emoji: '📝' };
  }
};

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
  const { hasTodayEntry, streakDays, refresh: refreshTodayDiary } = useTodayDiary();

  // 誕生日チェック用
  const [isBirthdayToday, setIsBirthdayToday] = useState(false);

  // パルスアニメーション用（useMemoで安定した参照を維持）
  const pulseAnim = useMemo(() => new Animated.Value(1), []);

  // カード切り替えアニメーション用
  const countdownFadeAnim = useMemo(() => new Animated.Value(1), []);
  const progressFadeAnim = useMemo(() => new Animated.Value(1), []);

  // 誕生日チェック
  useEffect(() => {
    const checkBirthday = async () => {
      const settings = await loadUserSettings();
      if (settings?.birthday) {
        setIsBirthdayToday(isBirthday(settings.birthday));
      }
    };
    checkBirthday();
  }, []);

  // 記録ボタンのパルスアニメーション（未記録時のみ）
  useEffect(() => {
    if (!hasTodayEntry) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.03,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [hasTodayEntry, pulseAnim]);

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
    // フェードアウト
    Animated.timing(progressFadeAnim, {
      toValue: 0.3,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      triggerAnimation();
      toggleProgressMode();
      // フェードイン
      Animated.timing(progressFadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  }, [triggerAnimation, toggleProgressMode, progressFadeAnim]);

  // カウントダウンモード切替（フェードアニメーション付き）
  const handleToggleCountdownMode = useCallback(async () => {
    // フェードアウト
    Animated.timing(countdownFadeAnim, {
      toValue: 0.3,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      toggleCountdownMode();
      // フェードイン
      Animated.timing(countdownFadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  }, [toggleCountdownMode, countdownFadeAnim]);

  // 挨拶メッセージとストリーク情報
  const greeting = getGreeting(isBirthdayToday);
  const todayDate = getTodayDateString();
  const streakInfo = streakDays > 0 ? getStreakInfo(streakDays) : null;

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
        {/* 日付と挨拶メッセージ */}
        <View style={styles.greetingContainer}>
          <Text style={styles.dateText}>{todayDate}</Text>
          <Text style={[
            styles.greetingText,
            isBirthdayToday && styles.birthdayText
          ]}>{greeting}</Text>
        </View>

        {/* 上部セクション：残り時間カウントダウン */}
        <CountdownSection
          timeLeft={timeLeft}
          countdownMode={countdownMode}
          onToggleMode={handleToggleCountdownMode}
          contentOpacity={countdownFadeAnim}
        />

        {/* 中央セクション：人生の進捗 */}
        <ProgressSection
          lifeProgress={lifeProgress}
          targetLifespan={targetLifespan}
          progressMode={progressMode}
          animatedValues={animatedValues}
          onToggleMode={handleToggleProgressMode}
          contentOpacity={progressFadeAnim}
        />

        {/* 下部セクション：記録ボタンとストリーク */}
        <View style={styles.bottomSection}>
          {/* 連続記録日数（ストリーク） */}
          {streakInfo && (
            <View style={styles.streakContainer}>
              <Text style={styles.streakEmoji}>{streakInfo.emoji}</Text>
              <Text style={styles.streakText}>{streakInfo.message}</Text>
            </View>
          )}

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
                {hasTodayEntry ? <CheckIcon /> : <PenIcon />}
                <Text style={styles.recordButtonText}>
                  {hasTodayEntry ? '今日の記録を見る' : '今日を記録する'}
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
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
  greetingContainer: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dateText: {
    fontSize: fonts.size.labelSmall,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    marginBottom: spacing.xs,
    ...textBase,
  },
  greetingText: {
    fontSize: fonts.size.body,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    letterSpacing: 1,
    ...textBase,
  },
  birthdayText: {
    fontSize: fonts.size.body,
    color: colors.primary,
    fontFamily: fonts.family.bold,
    letterSpacing: 1,
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
    paddingVertical: spacing.sm,
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
