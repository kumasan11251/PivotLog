import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
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

// 記録完了時の祝福メッセージ（バリエーション）
const CELEBRATION_MESSAGES = [
  { emoji: '🎉', text: '今日も記録できました！', subtext: '素晴らしいですね' },
  { emoji: '✨', text: '記録完了！', subtext: 'よく頑張りました' },
  { emoji: '🌟', text: 'お疲れさまでした！', subtext: '今日も一日お疲れさま' },
  { emoji: '👏', text: 'やりましたね！', subtext: '自分を褒めてあげて' },
  { emoji: '🌼', text: '今日も記録できた！', subtext: '素敵な一日でしたね' },
  { emoji: '😊', text: '記録ありがとう！', subtext: '継続は力なり' },
  { emoji: '🌱', text: '今日も一歩前進！', subtext: '小さな積み重ねが大切' },
  { emoji: '🌈', text: '記録完了です！', subtext: '明日も良い日になりますように' },
  { emoji: '📝', text: '今日の記録完了！', subtext: '振り返りは大切ですね' },
  { emoji: '🍀', text: 'お疲れさま！', subtext: '今日もよく頑張りました' },
];

// 再開時の励ましメッセージ（連続記録が途切れた時）
const RESTART_MESSAGES = [
  { emoji: '🌅', text: 'おかえりなさい！', subtext: 'また記録を始められたことが素晴らしい' },
  { emoji: '💪', text: 'また始められましたね！', subtext: '続けようとする気持ちが大切です' },
  { emoji: '🌱', text: '新しいスタート！', subtext: '何度でもやり直せます' },
  { emoji: '🤗', text: 'お帰りなさい！', subtext: '戻ってきてくれてありがとう' },
  { emoji: '✨', text: '今日から再スタート！', subtext: '休んでもまた始められる、それが強さです' },
];

// ランダムに祝福メッセージを取得
const getRandomCelebration = () => {
  const index = Math.floor(Math.random() * CELEBRATION_MESSAGES.length);
  return CELEBRATION_MESSAGES[index];
};

// ランダムに再開メッセージを取得
const getRandomRestartMessage = () => {
  const index = Math.floor(Math.random() * RESTART_MESSAGES.length);
  return RESTART_MESSAGES[index];
};

// 連続記録マイルストーン達成時のメッセージ
const MILESTONE_MESSAGES: Record<number, { emoji: string; title: string; subtitle: string }> = {
  3: { emoji: '🔥', title: '3日連続達成！', subtitle: '良いスタートです！この調子で続けましょう' },
  7: { emoji: '🎉', title: '1週間達成！', subtitle: '素晴らしい！習慣になってきましたね' },
  14: { emoji: '✨', title: '2週間達成！', subtitle: 'すごい！もう立派な習慣です' },
  30: { emoji: '🌟', title: '1ヶ月達成！', subtitle: 'おめでとうございます！継続の力を証明しました' },
  100: { emoji: '💎', title: '100日達成！', subtitle: '圧巻です！あなたは本当に素晴らしい' },
  365: { emoji: '🏆', title: '1年達成！', subtitle: '偉業達成！あなたは真のチャンピオンです' },
};

// 総記録マイルストーン達成時のメッセージ
const TOTAL_MILESTONE_MESSAGES: Record<number, { emoji: string; title: string; subtitle: string }> = {
  10: { emoji: '📚', title: '累計10日記録！', subtitle: '振り返りの習慣が始まりましたね' },
  50: { emoji: '🌿', title: '累計50日記録！', subtitle: 'たくさんの思い出が積み重なりました' },
  100: { emoji: '🎊', title: '累計100日記録！', subtitle: '100日分の大切な記録、素晴らしいです' },
  200: { emoji: '🌳', title: '累計200日記録！', subtitle: 'あなたの日記は立派な財産です' },
  365: { emoji: '📖', title: '累計365日記録！', subtitle: '1年分の人生が詰まった日記帳ですね' },
  500: { emoji: '💫', title: '累計500日記録！', subtitle: '圧倒的な記録量、尊敬します' },
  1000: { emoji: '👑', title: '累計1000日記録！', subtitle: '伝説の記録者です！' },
};

// ペンアイコン
const PenIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 20,
  color = colors.text.inverse
}) => (
  <Ionicons name="pencil" size={size} color={color} />
);

// チェックアイコン
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

  // カスタムフックで状態管理を分離
  const { timeLeft, lifeProgress, targetLifespan, birthday } = useTimeCalculation();
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
  } = useTodayDiary();

  // 祝福メッセージ表示用
  const celebrationAnim = useMemo(() => new Animated.Value(0), []);
  // マイルストーン演出用
  const milestoneAnim = useMemo(() => new Animated.Value(0), []);
  const milestoneScaleAnim = useMemo(() => new Animated.Value(0.5), []);

  // justCompletedがtrueになった時にメッセージを生成（再開時は励ましメッセージ）
  const celebrationMessage = useMemo(() => {
    if (justCompleted) {
      if (isRestarting) {
        return getRandomRestartMessage();
      }
      return getRandomCelebration();
    }
    return CELEBRATION_MESSAGES[0]; // デフォルト値
  }, [justCompleted, isRestarting]);

  // 誕生日チェック用
  const [isBirthdayToday, setIsBirthdayToday] = useState(false);

  // パルスアニメーション用（useMemoで安定した参照を維持）
  const pulseAnim = useMemo(() => new Animated.Value(1), []);

  // カード切り替えアニメーション用（初期値0で設定ロード完了後にフェードイン）
  const countdownFadeAnim = useMemo(() => new Animated.Value(0), []);
  const progressFadeAnim = useMemo(() => new Animated.Value(0), []);

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

  // 記録完了時の祝福アニメーション（マイルストーン達成時は別演出）
  useEffect(() => {
    if (justCompleted && !achievedMilestone && !achievedTotalMilestone) {
      // 通常の祝福演出（再開時も含む）
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // フェードイン
      Animated.timing(celebrationAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // 3秒後にフェードアウト
      const timer = setTimeout(() => {
        Animated.timing(celebrationAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          clearJustCompleted();
        });
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [justCompleted, achievedMilestone, achievedTotalMilestone, celebrationAnim, clearJustCompleted]);

  // マイルストーン達成時の特別演出（連続記録または総記録）
  const activeMilestone = achievedMilestone || achievedTotalMilestone;
  const milestoneMessage = achievedMilestone
    ? MILESTONE_MESSAGES[achievedMilestone]
    : achievedTotalMilestone
      ? TOTAL_MILESTONE_MESSAGES[achievedTotalMilestone]
      : null;

  useEffect(() => {
    if (activeMilestone && milestoneMessage) {
      // より強い振動フィードバック
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // 少し遅れてもう一度振動
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }, 200);

      // スケール＆フェードインアニメーション
      milestoneScaleAnim.setValue(0.5);
      Animated.parallel([
        Animated.timing(milestoneAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(milestoneScaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();

      // 4秒後にフェードアウト（マイルストーンはより長く表示）
      const timer = setTimeout(() => {
        Animated.timing(milestoneAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start(() => {
          clearJustCompleted();
        });
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [activeMilestone, milestoneMessage, milestoneAnim, milestoneScaleAnim, clearJustCompleted]);

  // 設定ロード完了時にフェードイン
  useEffect(() => {
    if (!isSettingsLoading) {
      Animated.parallel([
        Animated.timing(countdownFadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(progressFadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isSettingsLoading, countdownFadeAnim, progressFadeAnim]);

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

  // 画面フォーカス時にデータを再読み込み＆フェードインアニメーション
  useFocusEffect(
    useCallback(() => {
      refreshTodayDiary();

      // 設定ロード中はスキップ（初回表示のフェードインはuseEffectで処理）
      if (isSettingsLoading) return;

      // 画面に戻ってきた時のフェードインアニメーション（切り替えボタンと同じ速度）
      countdownFadeAnim.setValue(0.3);
      progressFadeAnim.setValue(0.3);
      Animated.parallel([
        Animated.timing(countdownFadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(progressFadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }, [refreshTodayDiary, countdownFadeAnim, progressFadeAnim, isSettingsLoading])
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
  const handleToggleProgressMode = useCallback(() => {
    // フェードアウト → モード切替 → フェードインをシーケンスで実行
    Animated.timing(progressFadeAnim, {
      toValue: 0.3,
      duration: 100,
      useNativeDriver: true,
    }).start((finished) => {
      if (!finished) return; // アニメーションが中断された場合はスキップ
      triggerAnimation();
      toggleProgressMode();
      Animated.timing(progressFadeAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start();
    });
  }, [triggerAnimation, toggleProgressMode, progressFadeAnim]);

  // カウントダウンモード切替（フェードアニメーション付き）
  const handleToggleCountdownMode = useCallback(() => {
    // フェードアウト → モード切替 → フェードインをシーケンスで実行
    Animated.timing(countdownFadeAnim, {
      toValue: 0.3,
      duration: 100,
      useNativeDriver: true,
    }).start((finished) => {
      if (!finished) return; // アニメーションが中断された場合はスキップ
      toggleCountdownMode();
      Animated.timing(countdownFadeAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start();
    });
  }, [toggleCountdownMode, countdownFadeAnim]);

  // 挨拶メッセージとストリーク情報
  const greeting = getGreeting(isBirthdayToday);
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
            <Text style={styles.milestoneEmoji}>{milestoneMessage?.emoji}</Text>
            <Text style={styles.milestoneTitle}>{milestoneMessage?.title}</Text>
            <Text style={styles.milestoneSubtitle}>{milestoneMessage?.subtitle}</Text>
          </Animated.View>
        </Animated.View>
      )}

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
          birthday={birthday ?? undefined}
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
    height: 36, // 固定高さでガタつき防止
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
