import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, spacing } from '../theme';
import { getDiaryByDate, DiaryEntry } from '../utils/storage';
import { DIARY_QUESTIONS } from '../constants/diary';

interface DiaryDetailScreenProps {
  date: string; // YYYY-MM-DD形式
  onBack: () => void;
  onEdit: (date: string) => void;
}

const DiaryDetailScreen: React.FC<DiaryDetailScreenProps> = ({ date, onBack, onEdit }) => {
  const [diary, setDiary] = useState<DiaryEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDiary = async () => {
    setIsLoading(true);
    try {
      const entry = await getDiaryByDate(date);
      setDiary(entry);
    } catch (error) {
      console.error('日記の読み込みに失敗しました:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDiary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const formatDate = (dateString: string): string => {
    const dateObj = new Date(dateString);
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth() + 1;
    const day = dateObj.getDate();
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[dateObj.getDay()];
    return `${year}年${month}月${day}日（${weekday}）`;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!diary) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← 戻る</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>記録が見つかりませんでした</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← 戻る</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onEdit(date)} style={styles.editButton}>
          <Text style={styles.editButtonText}>編集</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.dateTitle}>{formatDate(diary.date)}</Text>

        {diary.goodTime && (
          <View style={styles.section}>
            <Text style={styles.questionLabel}>
              {DIARY_QUESTIONS.goodTime.label}
            </Text>
            <Text style={styles.answerText}>
              {diary.goodTime}
            </Text>
          </View>
        )}

        {diary.wastedTime && (
          <View style={styles.section}>
            <Text style={styles.questionLabel}>
              {DIARY_QUESTIONS.wastedTime.label}
            </Text>
            <Text style={styles.answerText}>
              {diary.wastedTime}
            </Text>
          </View>
        )}

        {diary.tomorrow && (
          <View style={styles.section}>
            <Text style={styles.questionLabel}>
              {DIARY_QUESTIONS.tomorrow.label}
            </Text>
            <Text style={styles.answerText}>
              {diary.tomorrow}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.padding.screen,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    paddingVertical: spacing.md,
  },
  backButtonText: {
    fontSize: fonts.size.body,
    color: colors.primary,
    fontFamily: fonts.family.regular,
  },
  editButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  editButtonText: {
    fontSize: fonts.size.body,
    color: colors.primary,
    fontFamily: fonts.family.regular,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.padding.screen,
  },
  emptyText: {
    fontSize: fonts.size.body,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.padding.screen,
  },
  dateTitle: {
    fontSize: fonts.size.title,
    fontWeight: fonts.weight.medium,
    color: colors.text.primary,
    fontFamily: fonts.family.bold,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing.xl,
  },
  questionLabel: {
    fontSize: fonts.size.label,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    marginBottom: spacing.sm,
  },
  answerText: {
    fontSize: fonts.size.body,
    color: colors.text.primary,
    fontFamily: fonts.family.regular,
    lineHeight: fonts.size.body * 1.6,
  },
});

export default DiaryDetailScreen;
