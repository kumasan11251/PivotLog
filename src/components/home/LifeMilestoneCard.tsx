import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getColors, fonts, spacing, textBase } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { getLifeMilestoneCopy, formatMilestoneNumber } from '../../utils/lifeMilestones';
import type { LifeMilestone } from '../../utils/lifeMilestones';
import { loadLifeMilestoneSeen, saveLifeMilestoneSeen } from '../../utils/storage';
import { logAnalyticsEvent } from '../../services/firebase/analytics';

interface LifeMilestoneCardProps {
  /** 今日該当した節目 */
  milestone: LifeMilestone;
  /** 1日の開始時刻を考慮した基準日（YYYY-MM-DD形式） */
  date: string;
}

type Phase = 'loading' | 'static' | 'animate';

/** 数字のカウントアップにかける時間 */
const COUNT_UP_DURATION_MS = 1100;

/**
 * 人生の節目カード
 * 生後○日・残り○日・進捗○%などのきりのいい日だけ、視点メッセージの枠に差し替えて表示する。
 * その日の初回表示ではハプティクスと数字のカウントアップで「今日は違う」を伝え、
 * 2回目以降は静かに表示だけ残す。
 */
const LifeMilestoneCard: React.FC<LifeMilestoneCardProps> = ({ milestone, date }) => {
  const { isDark } = useTheme();
  const themeColors = useMemo(() => getColors(isDark), [isDark]);
  const reduceMotion = useReduceMotion();
  const copy = useMemo(() => getLifeMilestoneCopy(milestone), [milestone]);

  const [phase, setPhase] = useState<Phase>('loading');
  const [displayNumber, setDisplayNumber] = useState(copy.number);
  const opacityAnim = useMemo(() => new Animated.Value(0), []);
  const scaleAnim = useMemo(() => new Animated.Value(0.94), []);
  const countAnim = useMemo(() => new Animated.Value(0), []);

  const seenKey = `${date}:${milestone.key}`;

  // その日の初回表示かどうかを判定する
  useEffect(() => {
    let isCancelled = false;
    const decide = async () => {
      const seen = await loadLifeMilestoneSeen();
      if (isCancelled) return;
      if (seen === seenKey) {
        setPhase('static');
        return;
      }
      setPhase('animate');
      logAnalyticsEvent('life_milestone_shown', { kind: milestone.kind, value: milestone.value });
      await saveLifeMilestoneSeen(seenKey);
    };
    void decide();
    return () => {
      isCancelled = true;
    };
  }, [milestone.kind, milestone.value, seenKey]);

  // 判定結果に応じて表示・演出を行う
  useEffect(() => {
    if (phase === 'loading') return;

    if (phase === 'static' || reduceMotion) {
      // 静かに表示だけ残す（初回でも「視差効果を減らす」設定ではハプティクスのみ）
      if (phase === 'animate') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      opacityAnim.setValue(1);
      scaleAnim.setValue(1);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const listenerId = countAnim.addListener(({ value }) => {
      setDisplayNumber(formatMilestoneNumber(value));
    });
    countAnim.setValue(0);
    opacityAnim.setValue(0);
    scaleAnim.setValue(0.94);

    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(countAnim, {
        toValue: milestone.value,
        duration: COUNT_UP_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start(({ finished }) => {
      if (finished) setDisplayNumber(copy.number);
    });

    return () => {
      countAnim.removeListener(listenerId);
    };
  }, [phase, reduceMotion, copy.number, milestone.value, opacityAnim, scaleAnim, countAnim]);

  const nextText = milestone.daysUntilNext !== null
    ? `次の節目は ${formatMilestoneNumber(milestone.daysUntilNext)} 日後`
    : null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: themeColors.card,
          borderColor: themeColors.primary,
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerTitleWrapper}>
          <View style={styles.headerIconWrapper}>
            <MaterialCommunityIcons
              name="flag-outline"
              size={16}
              color={themeColors.primaryDark}
            />
          </View>
          <Text style={[styles.headerText, { color: themeColors.primaryDark }]}>今日の節目</Text>
        </View>
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.emoji}>{copy.emoji}</Text>
        <Text style={[styles.leadText, { color: themeColors.text.primary }]}>{copy.lead}</Text>
        <View style={styles.numberRow}>
          <Text style={[styles.numberText, { color: themeColors.text.primary }]}>{displayNumber}</Text>
          <Text style={[styles.unitText, { color: themeColors.text.primary }]}>{copy.unit}</Text>
        </View>
        <Text style={[styles.subtext, { color: themeColors.text.secondary }]}>{copy.subtext}</Text>
        {nextText && (
          <Text style={[styles.nextText, { color: themeColors.text.secondary }]}>{nextText}</Text>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: spacing.borderRadius.large,
    padding: spacing.lg,
    borderWidth: 1.5,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    // Android shadow
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  headerTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconWrapper: {
    position: 'absolute',
    right: '100%',
    marginRight: spacing.xs,
  },
  headerText: {
    ...textBase,
    fontSize: 13,
    fontFamily: fonts.family.regular,
  },
  contentContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  emoji: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  leadText: {
    ...textBase,
    fontSize: 15,
    fontFamily: fonts.family.regular,
    textAlign: 'center',
    lineHeight: 22,
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  numberText: {
    ...textBase,
    fontSize: 36,
    fontFamily: fonts.family.bold,
    lineHeight: 44,
    fontVariant: ['tabular-nums'],
  },
  unitText: {
    ...textBase,
    fontSize: 16,
    fontFamily: fonts.family.regular,
    marginLeft: spacing.xs,
    lineHeight: 24,
  },
  subtext: {
    ...textBase,
    fontSize: 13,
    fontFamily: fonts.family.regular,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.sm,
  },
  nextText: {
    ...textBase,
    fontSize: 12,
    fontFamily: fonts.family.regular,
    textAlign: 'center',
    marginTop: spacing.md,
    opacity: 0.8,
  },
});

export default LifeMilestoneCard;
