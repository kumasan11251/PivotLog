import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getColors, fonts, spacing, textBase } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { getTodayPerspectiveMessage, formatPerspectiveMessage } from '../../utils/perspectiveHelpers';
import { PERSPECTIVE_MESSAGES } from '../../constants/perspectives';
import {
  loadPerspectiveHistory,
  savePerspectiveHistoryEntry,
} from '../../utils/storage';

interface PerspectiveSectionProps {
  /** 残り年数 */
  remainingYears: number;
  /** 残り日数 */
  remainingDays: number;
  /** 残り週数 */
  remainingWeeks: number;
  /** 現在の年齢 */
  currentAge: number;
  /** 人生の進捗% */
  progressPercent: number;
  /** 誕生日（YYYY-MM-DD形式）*/
  birthday?: string;
  /** 連続記録日数 */
  streakDays?: number;
  /** 今日の日記記入済みか */
  hasTodayEntry?: boolean;
  /** 1日の開始時刻を考慮した基準日（YYYY-MM-DD形式） */
  date: string;
  /** 誕生日・日記状態・基準日の読み込みが完了しているか */
  isReady: boolean;
}

/**
 * 日替わり視点メッセージセクション
 * 毎日異なる視点で残り時間の有限性を伝える
 */
const PerspectiveSection: React.FC<PerspectiveSectionProps> = ({
  remainingYears,
  remainingDays,
  remainingWeeks,
  currentAge,
  progressPercent,
  birthday,
  streakDays,
  hasTodayEntry,
  date,
  isReady,
}) => {
  const { isDark } = useTheme();
  const themeColors = useMemo(() => getColors(isDark), [isDark]);

  // 誕生日月を抽出（1-12）
  const birthdayMonth = birthday
    ? parseInt(birthday.split('-')[1], 10)
    : undefined;

  const perspectiveDate = useMemo(() => {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day);
  }, [date]);

  // 履歴の読み込み前にも表示できる、日付ベースのフォールバック
  const fallbackMessage = useMemo(() => getTodayPerspectiveMessage(
    birthdayMonth,
    { streakDays, hasTodayEntry },
    { date: perspectiveDate },
  ), [birthdayMonth, hasTodayEntry, perspectiveDate, streakDays]);
  const [todayMessage, setTodayMessage] = useState(fallbackMessage);

  useEffect(() => {
    let isCancelled = false;

    const selectMessage = async () => {
      if (!isReady) return;

      const history = await loadPerspectiveHistory();
      const todaysHistory = history.find(entry => entry.date === date);
      const storedMessage = todaysHistory
        ? PERSPECTIVE_MESSAGES.find(message => message.id === todaysHistory.messageId)
        : undefined;

      // 同じ日は日記記入状態などが変わっても、最初に表示した文言を維持する
      if (storedMessage) {
        if (!isCancelled) setTodayMessage(storedMessage);
        return;
      }

      const sixDaysAgo = new Date(perspectiveDate);
      sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
      const recentMessageIds = history
        .filter(entry => {
          const entryDate = new Date(`${entry.date}T00:00:00`);
          return entryDate >= sixDaysAgo && entryDate < perspectiveDate;
        })
        .map(entry => entry.messageId);

      const selectedMessage = getTodayPerspectiveMessage(
        birthdayMonth,
        { streakDays, hasTodayEntry },
        { date: perspectiveDate, excludedMessageIds: recentMessageIds },
      );

      if (!isCancelled) setTodayMessage(selectedMessage);
      await savePerspectiveHistoryEntry({ date, messageId: selectedMessage.id });
    };

    void selectMessage();
    return () => {
      isCancelled = true;
    };
  }, [birthdayMonth, date, hasTodayEntry, isReady, perspectiveDate, streakDays]);
  const formattedMessage = formatPerspectiveMessage(todayMessage, {
    remainingYears,
    remainingDays,
    remainingWeeks,
    currentAge,
    progressPercent,
    streakDays,
  });

  return (
    <View style={[styles.container, { backgroundColor: themeColors.card, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0, 0, 0, 0.04)' }]}>
      <View style={styles.headerRow}>
        <View style={styles.headerTitleWrapper}>
          <View style={styles.headerIconWrapper}>
            <MaterialCommunityIcons
              name="lightbulb-outline"
              size={16}
              color={themeColors.text.secondary}
            />
          </View>
          <Text style={[styles.headerText, { color: themeColors.text.secondary }]}>今日の視点</Text>
        </View>
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.emoji}>{formattedMessage.emoji}</Text>
        <Text style={[styles.mainText, { color: themeColors.text.primary }]}>{formattedMessage.mainText}</Text>
        {formattedMessage.subtext && (
          <Text style={[styles.subtext, { color: themeColors.text.secondary }]}>{formattedMessage.subtext}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: spacing.borderRadius.large,
    padding: spacing.lg,
    borderWidth: 1,
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
  mainText: {
    ...textBase,
    fontSize: 16,
    fontFamily: fonts.family.regular,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.sm,
  },
  subtext: {
    ...textBase,
    fontSize: 13,
    fontFamily: fonts.family.regular,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
});

export default PerspectiveSection;
