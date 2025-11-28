import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { HomeScreenNavigationProp } from '../types/navigation';
import { colors, fonts, spacing } from '../theme';
import { loadDiaryEntries, DiaryEntry } from '../utils/storage';
import { DIARY_QUESTIONS } from '../constants/diary';
import ScreenHeader from './common/ScreenHeader';

const CARD_HEIGHT = 140; // 固定カードの高さ

interface DiaryListContentProps {
  shouldRefresh?: boolean;
}

const DiaryListContent: React.FC<DiaryListContentProps> = ({ shouldRefresh }) => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDiaries = async () => {
    setIsLoading(true);
    try {
      const entries = await loadDiaryEntries();
      setDiaries(entries);
    } catch (error) {
      console.error('日記の読み込みに失敗しました:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDiaries();
  }, []);

  useEffect(() => {
    if (shouldRefresh) {
      loadDiaries();
    }
  }, [shouldRefresh]);

  const formatDateParts = (dateString: string): { day: string; weekday: string; month: string } => {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    return {
      day: String(day),
      weekday: weekdays[date.getDay()],
      month: `${month}月`,
    };
  };

  const getFilledQuestions = (item: DiaryEntry): { label: string; content: string }[] => {
    const questions: { label: string; content: string }[] = [];
    const questionKeys: (keyof typeof DIARY_QUESTIONS)[] = ['goodTime', 'wastedTime', 'tomorrow'];

    for (const key of questionKeys) {
      const content = item[key];
      if (content && content.trim()) {
        questions.push({
          label: DIARY_QUESTIONS[key].label,
          content: content.trim(),
        });
      }
    }

    // 入力されたすべての質問を返す（カードの高さで自然にクリップ）
    return questions;
  };

  const renderDiaryItem = ({ item }: { item: DiaryEntry }) => {
    const dateParts = formatDateParts(item.date);
    const filledQuestions = getFilledQuestions(item);

    return (
      <TouchableOpacity
        style={styles.diaryItem}
        onPress={() => navigation.navigate('DiaryDetail', { date: item.date })}
      >
        <View style={styles.dateSection}>
          <Text style={styles.weekdayText}>{dateParts.weekday}</Text>
          <Text style={styles.dayText}>{dateParts.day}</Text>
          <Text style={styles.monthText}>{dateParts.month}</Text>
        </View>
        <View style={styles.contentWrapper}>
          <View style={styles.contentSection}>
            {filledQuestions.length > 0 ? (
              filledQuestions.map((q, index) => (
                <View key={index} style={styles.questionItem}>
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
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>まだ記録がありません</Text>
      <Text style={styles.emptyDescription}>
        日記を記録して、毎日を振り返りましょう
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="記録一覧"
        rightAction={{
          type: 'settings',
          onPress: () => navigation.navigate('Settings'),
        }}
      />

      <FlatList
        data={diaries}
        renderItem={renderDiaryItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={!isLoading ? renderEmptyList : null}
        refreshing={isLoading}
        onRefresh={loadDiaries}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.padding.screen,
    flexGrow: 1,
  },
  diaryItem: {
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
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    paddingVertical: spacing.xs,
  },
  dayText: {
    fontSize: 20,
    fontWeight: fonts.weight.semibold,
    color: colors.text.primary,
    fontFamily: fonts.family.bold,
  },
  weekdayText: {
    fontSize: 10,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    marginBottom: 2,
  },
  monthText: {
    fontSize: 10,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    marginTop: 2,
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
    fontSize: 12,
    color: colors.primary,
    fontFamily: fonts.family.bold,
    marginBottom: 3,
  },
  questionContent: {
    fontSize: 13,
    color: colors.text.primary,
    fontFamily: fonts.family.regular,
    lineHeight: 18,
  },
  emptyContent: {
    fontSize: 12,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyTitle: {
    fontSize: fonts.size.title,
    fontWeight: fonts.weight.semibold,
    color: colors.text.primary,
    fontFamily: fonts.family.bold,
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    fontSize: fonts.size.body,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    textAlign: 'center',
  },
});

export default DiaryListContent;
