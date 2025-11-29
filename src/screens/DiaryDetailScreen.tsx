import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { DiaryDetailScreenNavigationProp, RootStackParamList } from '../types/navigation';
import { colors, fonts, spacing, textBase } from '../theme';
import { getDiaryByDate, loadDiaryEntries, DiaryEntry } from '../utils/storage';
import { DIARY_QUESTIONS } from '../constants/diary';
import ScreenHeader from '../components/common/ScreenHeader';

type DiaryDetailScreenRouteProp = RouteProp<RootStackParamList, 'DiaryDetail'>;

const DiaryDetailScreen: React.FC = () => {
  const navigation = useNavigation<DiaryDetailScreenNavigationProp>();
  const route = useRoute<DiaryDetailScreenRouteProp>();
  const { date } = route.params;

  const [diary, setDiary] = useState<DiaryEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [adjacentDates, setAdjacentDates] = useState<{ prev: string | null; next: string | null }>({
    prev: null,
    next: null,
  });

  const loadDiary = async () => {
    setIsLoading(true);
    try {
      const entry = await getDiaryByDate(date);
      setDiary(entry);

      // 前後の日記を取得
      const allDiaries = await loadDiaryEntries();
      const currentIndex = allDiaries.findIndex((d) => d.date === date);
      setAdjacentDates({
        prev: currentIndex < allDiaries.length - 1 ? allDiaries[currentIndex + 1]?.date : null,
        next: currentIndex > 0 ? allDiaries[currentIndex - 1]?.date : null,
      });
    } catch (error) {
      console.error('日記の読み込みに失敗しました:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 画面フォーカス時に日記を再読み込み（編集後の反映用）
  useFocusEffect(
    useCallback(() => {
      loadDiary();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [date])
  );

  const formatDate = (dateString: string): string => {
    const [year, month, day] = dateString.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[dateObj.getDay()];
    return `${year}年${month}月${day}日（${weekday}）`;
  };

  const navigateToDate = (targetDate: string, direction: 'prev' | 'next') => {
    // スタックをリセットして、Home（記録一覧タブ） → DiaryDetail のみにする
    // これにより戻るボタンで記録一覧に戻れる
    navigation.reset({
      index: 1,
      routes: [
        { name: 'Home', params: { initialTab: 'diaryList' } },
        { name: 'DiaryDetail', params: { date: targetDate, direction } },
      ],
    });
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
        <ScreenHeader
          leftAction={{
            type: 'backIcon',
            onPress: () => navigation.goBack(),
          }}
        />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>記録が見つかりませんでした</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        leftAction={{
          type: 'backIcon',
          onPress: () => navigation.goBack(),
        }}
        rightAction={{
          type: 'text',
          label: '編集',
          onPress: () => navigation.navigate('DiaryEntry', { initialDate: date }),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        {/* 日付表示 */}
        <Text style={styles.dateText}>{formatDate(diary.date)}</Text>

        {diary.goodTime && (
          <View style={styles.section}>
            <Text style={styles.questionLabel}>
              {DIARY_QUESTIONS.goodTime.label}
            </Text>
            <View style={styles.answerContainer}>
              <Text style={styles.answerText}>
                {diary.goodTime}
              </Text>
            </View>
          </View>
        )}

        {diary.wastedTime && (
          <View style={styles.section}>
            <Text style={styles.questionLabel}>
              {DIARY_QUESTIONS.wastedTime.label}
            </Text>
            <View style={styles.answerContainer}>
              <Text style={styles.answerText}>
                {diary.wastedTime}
              </Text>
            </View>
          </View>
        )}

        {diary.tomorrow && (
          <View style={styles.section}>
            <Text style={styles.questionLabel}>
              {DIARY_QUESTIONS.tomorrow.label}
            </Text>
            <View style={styles.answerContainer}>
              <Text style={styles.answerText}>
                {diary.tomorrow}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* 前後の日記への移動ボタン */}
      {(adjacentDates.prev || adjacentDates.next) && (
        <View style={styles.navigationBar}>
          <TouchableOpacity
            style={[styles.navButton, !adjacentDates.prev && styles.navButtonDisabled]}
            onPress={() => adjacentDates.prev && navigateToDate(adjacentDates.prev, 'prev')}
            disabled={!adjacentDates.prev}
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={adjacentDates.prev ? colors.primary : colors.border}
            />
            <Text style={[styles.navButtonText, !adjacentDates.prev && styles.navButtonTextDisabled]}>
              前の記録
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navButton, !adjacentDates.next && styles.navButtonDisabled]}
            onPress={() => adjacentDates.next && navigateToDate(adjacentDates.next, 'next')}
            disabled={!adjacentDates.next}
          >
            <Text style={[styles.navButtonText, !adjacentDates.next && styles.navButtonTextDisabled]}>
              次の記録
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={adjacentDates.next ? colors.primary : colors.border}
            />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    ...textBase,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.padding.screen,
    paddingBottom: spacing.xxl,
  },
  dateText: {
    fontSize: fonts.size.title,
    color: colors.text.primary,
    fontFamily: fonts.family.bold,
    textAlign: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
    ...textBase,
  },
  section: {
    marginBottom: 32,
  },
  questionLabel: {
    fontSize: fonts.size.label,
    color: colors.primary,
    fontFamily: fonts.family.bold,
    backgroundColor: 'rgba(139, 157, 131, 0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
    overflow: 'hidden',
    ...textBase,
  },
  answerContainer: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingLeft: spacing.md,
    paddingVertical: spacing.xs,
  },
  answerText: {
    fontSize: fonts.size.body,
    color: colors.text.primary,
    fontFamily: fonts.family.regular,
    lineHeight: fonts.size.body * 1.6,
    ...textBase,
  },
  navigationBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.padding.screen,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: fonts.size.label,
    color: colors.primary,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  navButtonTextDisabled: {
    color: colors.text.secondary,
  },
});

export default DiaryDetailScreen;
