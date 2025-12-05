import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, spacing, textBase } from '../../theme';
import { DiaryEntry } from '../../utils/storage';
import { DIARY_QUESTIONS } from '../../constants/diary';

const CARD_HEIGHT = 140;
const ANIMATION_DURATION = 300;
const STAGGER_DELAY = 50;

interface DateParts {
  day: string;
  weekday: string;
  dayOfWeek: number;
}

interface DiaryCardProps {
  entry: DiaryEntry;
  onPress: () => void;
  index?: number;
  shouldAnimate?: boolean;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export const formatDateParts = (dateString: string): DateParts => {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay();
  return {
    day: String(day),
    weekday: WEEKDAYS[dayOfWeek],
    dayOfWeek,
  };
};

export const getFilledQuestions = (
  entry: DiaryEntry
): { label: string; content: string }[] => {
  const questions: { label: string; content: string }[] = [];
  const questionKeys: (keyof typeof DIARY_QUESTIONS)[] = [
    'goodTime',
    'wastedTime',
    'tomorrow',
  ];

  for (const key of questionKeys) {
    const content = entry[key];
    if (content && content.trim()) {
      questions.push({
        label: DIARY_QUESTIONS[key].label,
        content: content.trim(),
      });
    }
  }

  return questions;
};

const DiaryCard: React.FC<DiaryCardProps> = ({ entry, onPress, index = 0, shouldAnimate = false }) => {
  const dateParts = formatDateParts(entry.date);
  const filledQuestions = getFilledQuestions(entry);

  // アニメーション用の値（初期値は表示状態）
  const animatedValues = useMemo(() => ({
    fade: new Animated.Value(1),
    translateY: new Animated.Value(0),
  }), []);

  useEffect(() => {
    if (shouldAnimate) {
      // アニメーション開始前に初期値にリセット
      animatedValues.fade.setValue(0);
      animatedValues.translateY.setValue(15);

      const delay = index * STAGGER_DELAY;
      Animated.parallel([
        Animated.timing(animatedValues.fade, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValues.translateY, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          delay,
          useNativeDriver: true,
        }),
      ]).start();
    }
    // shouldAnimate=falseの場合は既に初期値が表示状態なので何もしない
  }, [shouldAnimate, index, animatedValues]);

  const dateSectionStyle =
    dateParts.dayOfWeek === 0
      ? styles.dateSectionSunday
      : dateParts.dayOfWeek === 6
        ? styles.dateSectionSaturday
        : null;

  const dateTextStyle =
    dateParts.dayOfWeek === 0
      ? styles.sundayText
      : dateParts.dayOfWeek === 6
        ? styles.saturdayText
        : null;

  return (
    <Animated.View
      style={{
        opacity: animatedValues.fade,
        transform: [{ translateY: animatedValues.translateY }],
      }}
    >
      <TouchableOpacity style={styles.container} onPress={onPress}>
        <View style={[styles.dateSection, dateSectionStyle]}>
          <Text style={[styles.weekdayText, dateTextStyle]}>
            {dateParts.weekday}
          </Text>
          <Text style={[styles.dayText, dateTextStyle]}>{dateParts.day}</Text>
        </View>
        <View style={styles.contentWrapper}>
          <View style={styles.contentSection}>
            {filledQuestions.length > 0 ? (
              filledQuestions.map((q, qIndex) => (
                <View key={qIndex} style={styles.questionItem}>
                  <Text style={styles.questionLabel}>{q.label}</Text>
                  <Text style={styles.questionContent}>{q.content}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyContent}>内容がありません</Text>
            )}
          </View>
          <LinearGradient
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,1)']}
            style={styles.fadeOverlay}
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.medium,
    borderWidth: spacing.borderWidth,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.md,
    height: CARD_HEIGHT,
    overflow: 'hidden',
  },
  dateSection: {
    width: 44,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    borderRadius: spacing.borderRadius.small,
  },
  dateSectionSunday: {},
  dateSectionSaturday: {},
  dayText: {
    fontSize: 20,
    fontWeight: fonts.weight.semibold,
    color: colors.text.primary,
    fontFamily: fonts.family.bold,
    ...textBase,
  },
  weekdayText: {
    fontSize: 10,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    marginBottom: 2,
    ...textBase,
  },
  sundayText: {
    color: '#E57373',
  },
  saturdayText: {
    color: '#64B5F6',
  },
  contentWrapper: {
    flex: 1,
    position: 'relative',
    height: '100%',
    overflow: 'hidden',
  },
  contentSection: {
    paddingVertical: spacing.xs,
  },
  fadeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 24,
  },
  questionItem: {
    marginBottom: spacing.sm,
  },
  questionLabel: {
    fontSize: 10,
    color: colors.primary,
    fontFamily: fonts.family.bold,
    backgroundColor: 'rgba(139, 157, 131, 0.15)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
    alignSelf: 'flex-start',
    overflow: 'hidden',
    ...textBase,
  },
  questionContent: {
    fontSize: 13,
    color: colors.text.primary,
    fontFamily: fonts.family.regular,
    lineHeight: 18,
    ...textBase,
  },
  emptyContent: {
    fontSize: 12,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    fontStyle: 'italic',
    ...textBase,
  },
});

export default DiaryCard;
