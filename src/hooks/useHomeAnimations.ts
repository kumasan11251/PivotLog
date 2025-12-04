/**
 * ホーム画面のアニメーション管理フック
 * 祝福演出・マイルストーン演出・カード切り替えを管理
 */

import { useEffect, useMemo, useCallback } from 'react';
import { Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  CELEBRATION_MESSAGES,
  MILESTONE_MESSAGES,
  TOTAL_MILESTONE_MESSAGES,
} from '../constants/home';
import { getRandomCelebration, getRandomRestartMessage } from '../utils/homeHelpers';

// 祝福メッセージの型（定数から生成すると複雑になるので簡潔に定義）
interface CelebrationMessage {
  emoji: string;
  text: string;
  subtext: string;
}

interface UseHomeAnimationsParams {
  /** 今記録が完了したばかりか */
  justCompleted: boolean;
  /** 達成した連続記録マイルストーン */
  achievedMilestone: number | null;
  /** 達成した総記録マイルストーン */
  achievedTotalMilestone: number | null;
  /** 連続記録が途切れて再開した場合true */
  isRestarting: boolean;
  /** 祝福表示完了を通知 */
  clearJustCompleted: () => void;
  /** 設定ロード中かどうか */
  isSettingsLoading: boolean;
  /** 今日の記録があるかどうか */
  hasTodayEntry: boolean;
  /** プログレスモード切替時のアニメーション再実行関数 */
  triggerProgressAnimation: () => void;
  /** カウントダウンモード切替関数 */
  toggleCountdownMode: () => void;
  /** プログレスモード切替関数 */
  toggleProgressMode: () => void;
}

interface UseHomeAnimationsReturn {
  /** 祝福メッセージ表示用アニメーション値 */
  celebrationAnim: Animated.Value;
  /** マイルストーン演出用アニメーション値 */
  milestoneAnim: Animated.Value;
  /** マイルストーン演出のスケール */
  milestoneScaleAnim: Animated.Value;
  /** 記録ボタンのパルスアニメーション */
  pulseAnim: Animated.Value;
  /** カウントダウンカードのフェード */
  countdownFadeAnim: Animated.Value;
  /** プログレスカードのフェード */
  progressFadeAnim: Animated.Value;
  /** 祝福メッセージ内容 */
  celebrationMessage: CelebrationMessage;
  /** 表示中のマイルストーン（連続または総記録） */
  activeMilestone: number | null;
  /** マイルストーンメッセージ */
  milestoneMessage: { emoji: string; title: string; subtitle: string } | null;
  /** プログレスモード切替ハンドラ（アニメーション付き） */
  handleToggleProgressMode: () => void;
  /** カウントダウンモード切替ハンドラ（アニメーション付き） */
  handleToggleCountdownMode: () => void;
  /** 画面フォーカス時のフェードインを実行 */
  triggerFocusAnimation: () => void;
}

export const useHomeAnimations = ({
  justCompleted,
  achievedMilestone,
  achievedTotalMilestone,
  isRestarting,
  clearJustCompleted,
  isSettingsLoading,
  hasTodayEntry,
  triggerProgressAnimation,
  toggleCountdownMode,
  toggleProgressMode,
}: UseHomeAnimationsParams): UseHomeAnimationsReturn => {
  // アニメーション値（useMemoで安定した参照を維持）
  const celebrationAnim = useMemo(() => new Animated.Value(0), []);
  const milestoneAnim = useMemo(() => new Animated.Value(0), []);
  const milestoneScaleAnim = useMemo(() => new Animated.Value(0.5), []);
  const pulseAnim = useMemo(() => new Animated.Value(1), []);
  const countdownFadeAnim = useMemo(() => new Animated.Value(0), []);
  const progressFadeAnim = useMemo(() => new Animated.Value(0), []);

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

  // マイルストーン情報
  const activeMilestone = achievedMilestone || achievedTotalMilestone;
  const milestoneMessage = achievedMilestone
    ? MILESTONE_MESSAGES[achievedMilestone]
    : achievedTotalMilestone
      ? TOTAL_MILESTONE_MESSAGES[achievedTotalMilestone]
      : null;

  // 記録完了時の祝福アニメーション（マイルストーン達成時は別演出）
  useEffect(() => {
    if (justCompleted && !achievedMilestone && !achievedTotalMilestone) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Animated.timing(celebrationAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

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

  // マイルストーン達成時の特別演出
  useEffect(() => {
    if (activeMilestone && milestoneMessage) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }, 200);

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

  // プログレスモード切替（アニメーション付き）
  const handleToggleProgressMode = useCallback(() => {
    Animated.timing(progressFadeAnim, {
      toValue: 0.3,
      duration: 100,
      useNativeDriver: true,
    }).start((finished) => {
      if (!finished) return;
      triggerProgressAnimation();
      toggleProgressMode();
      Animated.timing(progressFadeAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start();
    });
  }, [triggerProgressAnimation, toggleProgressMode, progressFadeAnim]);

  // カウントダウンモード切替（アニメーション付き）
  const handleToggleCountdownMode = useCallback(() => {
    Animated.timing(countdownFadeAnim, {
      toValue: 0.3,
      duration: 100,
      useNativeDriver: true,
    }).start((finished) => {
      if (!finished) return;
      toggleCountdownMode();
      Animated.timing(countdownFadeAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start();
    });
  }, [toggleCountdownMode, countdownFadeAnim]);

  // 画面フォーカス時のフェードインアニメーション
  const triggerFocusAnimation = useCallback(() => {
    if (isSettingsLoading) return;

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
  }, [countdownFadeAnim, progressFadeAnim, isSettingsLoading]);

  return {
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
  };
};
