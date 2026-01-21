/* eslint-disable react-hooks/refs */
'use no memo';
import React, { useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { getColors, fonts, spacing, textBase } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { DiaryEntry, deleteDiaryEntry } from '../../utils/storage';
import { DIARY_QUESTIONS } from '../../constants/diary';

const CARD_HEIGHT = 140;
const DELETE_BUTTON_WIDTH = 80;

interface DateParts {
  day: string;
  weekday: string;
  dayOfWeek: number;
}

interface DiaryCardProps {
  entry: DiaryEntry;
  onPress: () => void;
  onDelete?: (id: string) => void;
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

const DiaryCard: React.FC<DiaryCardProps> = ({ entry, onPress, onDelete }) => {
  const { isDark } = useTheme();
  const themeColors = useMemo(() => getColors(isDark), [isDark]);
  const dateParts = formatDateParts(entry.date);
  const filledQuestions = getFilledQuestions(entry);

  // スワイプ用のアニメーション値（useMemoで安定化）
  const swipeAnim = useMemo(() => new Animated.Value(0), []);
  // スワイプ状態は ref で管理（PanResponder コールバック内で使用）
  const isSwipeOpenRef = useRef(false);
  // 現在スワイプ中かどうか
  const isSwipingRef = useRef(false);

  // スワイプジェスチャー（useMemoで安定化）
  const panResponder = useMemo(() => PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // 水平方向のスワイプのみ検知（垂直より水平が大きい場合）
        const { dx, dy } = gestureState;
        const isHorizontalSwipe = Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10;
        return isHorizontalSwipe;
      },
      // 親（FlatList）より先にジェスチャーをキャプチャするかどうか
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        const { dx, dy } = gestureState;
        // 明確に水平スワイプの場合のみキャプチャ
        return Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) > 15;
      },
      // 他のレスポンダー（FlatList）にジェスチャーを奪われないようにする
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        // スワイプ開始
        isSwipingRef.current = true;
        swipeAnim.stopAnimation();
        Haptics.selectionAsync();
      },
      onPanResponderMove: (_, gestureState) => {
        const { dx } = gestureState;
        if (isSwipeOpenRef.current) {
          // 開いている状態：左右どちらにも動かせる
          const newValue = Math.max(Math.min(-DELETE_BUTTON_WIDTH + dx, 0), -DELETE_BUTTON_WIDTH);
          swipeAnim.setValue(newValue);
        } else {
          // 閉じている状態：左にのみ動かせる
          if (dx < 0) {
            const newValue = Math.max(dx, -DELETE_BUTTON_WIDTH);
            swipeAnim.setValue(newValue);
          }
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        isSwipingRef.current = false;
        const { vx } = gestureState;

        // 現在のアニメーション値を取得してから判定
        swipeAnim.stopAnimation((currentValue) => {
          // スワイプの速度または距離で開閉を決定
          const shouldOpen = currentValue < -DELETE_BUTTON_WIDTH / 2 || vx < -0.5;

          if (shouldOpen) {
            // 削除ボタンを表示
            isSwipeOpenRef.current = true;
            Animated.spring(swipeAnim, {
              toValue: -DELETE_BUTTON_WIDTH,
              useNativeDriver: true,
              damping: 20,
              stiffness: 200,
            }).start();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } else {
            // 閉じる
            isSwipeOpenRef.current = false;
            Animated.spring(swipeAnim, {
              toValue: 0,
              useNativeDriver: true,
              damping: 20,
              stiffness: 200,
            }).start();
          }
        });
      },
      onPanResponderTerminate: () => {
        // ジェスチャーがキャンセルされた場合
        isSwipingRef.current = false;
        // 現在の状態に基づいて位置を決定
        const targetValue = isSwipeOpenRef.current ? -DELETE_BUTTON_WIDTH : 0;
        Animated.spring(swipeAnim, {
          toValue: targetValue,
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
        }).start();
      },
    }), [swipeAnim]);

  // 削除確認ダイアログ
  const handleDeletePress = () => {
    Alert.alert(
      '記録を削除',
      'この記録を削除しますか？\nこの操作は取り消せません。',
      [
        {
          text: 'キャンセル',
          style: 'cancel',
          onPress: () => {
            // スワイプを閉じる
            Animated.spring(swipeAnim, {
              toValue: 0,
              useNativeDriver: true,
              damping: 15,
              stiffness: 150,
            }).start();
            isSwipeOpenRef.current = false;
          },
        },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDiaryEntry(entry.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onDelete?.(entry.id);
            } catch (error) {
              console.error('日記の削除に失敗しました:', error);
              Alert.alert('エラー', '削除に失敗しました。もう一度お試しください。');
            }
          },
        },
      ]
    );
  };

  // カードタップ時にスワイプが開いていれば閉じる
  const handleCardPress = () => {
    if (isSwipeOpenRef.current) {
      // 先にフラグを更新してから、アニメーションを実行
      isSwipeOpenRef.current = false;
      swipeAnim.stopAnimation();
      Animated.spring(swipeAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 200,
      }).start();
    } else {
      onPress();
    }
  };

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
    <View style={styles.swipeContainer}>
      {/* 削除ボタン（背景に配置） */}
      <TouchableOpacity
        style={[styles.deleteButton, { backgroundColor: themeColors.error }]}
        onPress={handleDeletePress}
        activeOpacity={0.8}
      >
        <Ionicons name="trash-outline" size={24} color={themeColors.text.inverse} />
        <Text style={[styles.deleteButtonText, { color: themeColors.text.inverse }]}>削除</Text>
      </TouchableOpacity>

      {/* カード本体（スワイプ対象） */}
      <Animated.View
        style={[
          styles.cardAnimatedWrapper,
          { backgroundColor: themeColors.background, transform: [{ translateX: swipeAnim }] },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity style={[styles.container, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]} onPress={handleCardPress}>
          <View style={[styles.dateSection, dateSectionStyle]}>
            <Text style={[styles.weekdayText, { color: themeColors.text.secondary }, dateTextStyle]}>
              {dateParts.weekday}
            </Text>
            <Text style={[styles.dayText, { color: themeColors.text.primary }, dateTextStyle]}>{dateParts.day}</Text>
          </View>
          <View style={styles.contentWrapper}>
            <View style={styles.contentSection}>
              {filledQuestions.length > 0 ? (
                filledQuestions.map((q, qIndex) => (
                  <View key={qIndex} style={styles.questionItem}>
                    <Text style={[styles.questionLabel, { color: themeColors.primary, backgroundColor: `${themeColors.primary}26` }]}>{q.label}</Text>
                    <Text style={[styles.questionContent, { color: themeColors.text.primary }]}>{q.content}</Text>
                  </View>
                ))
              ) : (
                <Text style={[styles.emptyContent, { color: themeColors.text.secondary }]}>内容がありません</Text>
              )}
            </View>
            <LinearGradient
              colors={isDark ? ['rgba(30,30,30,0)', 'rgba(30,30,30,1)'] : ['rgba(255,255,255,0)', 'rgba(255,255,255,1)']}
              style={styles.fadeOverlay}
            />
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  swipeContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  deleteButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DELETE_BUTTON_WIDTH,
    borderRadius: spacing.borderRadius.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 12,
    fontFamily: fonts.family.bold,
    marginTop: 4,
    ...textBase,
  },
  cardAnimatedWrapper: {},
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: spacing.borderRadius.medium,
    borderWidth: spacing.borderWidth,
    padding: spacing.sm,
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
    fontFamily: fonts.family.bold,
    ...textBase,
  },
  weekdayText: {
    fontSize: 10,
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
    fontFamily: fonts.family.bold,
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
    fontFamily: fonts.family.regular,
    lineHeight: 18,
    ...textBase,
  },
  emptyContent: {
    fontSize: 12,
    fontFamily: fonts.family.regular,
    fontStyle: 'italic',
    ...textBase,
  },
});

export default DiaryCard;
