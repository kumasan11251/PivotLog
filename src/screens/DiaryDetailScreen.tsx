import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
  Dimensions,
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ANIMATION_DURATION = 250;

const DiaryDetailScreen: React.FC = () => {
  const navigation = useNavigation<DiaryDetailScreenNavigationProp>();
  const route = useRoute<DiaryDetailScreenRouteProp>();
  const { date: initialDate } = route.params;

  // 現在表示中の日付をstateで管理
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [diary, setDiary] = useState<DiaryEntry | null>(null);
  const [nextDiary, setNextDiary] = useState<DiaryEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [adjacentDates, setAdjacentDates] = useState<{ prev: string | null; next: string | null }>({
    prev: null,
    next: null,
  });

  // アニメーション用（現在のコンテンツ）
  const currentSlideAnim = useRef(new Animated.Value(0)).current;
  const currentFadeAnim = useRef(new Animated.Value(1)).current;
  // アニメーション用（次のコンテンツ）
  const nextSlideAnim = useRef(new Animated.Value(0)).current;
  const nextFadeAnim = useRef(new Animated.Value(0)).current;

  const loadDiary = async (targetDate: string) => {
    try {
      const entry = await getDiaryByDate(targetDate);
      setDiary(entry);

      // 前後の日記を取得
      const allDiaries = await loadDiaryEntries();
      const currentIndex = allDiaries.findIndex((d) => d.date === targetDate);
      setAdjacentDates({
        prev: currentIndex < allDiaries.length - 1 ? allDiaries[currentIndex + 1]?.date : null,
        next: currentIndex > 0 ? allDiaries[currentIndex - 1]?.date : null,
      });
    } catch (error) {
      console.error('日記の読み込みに失敗しました:', error);
    }
  };

  // 初回読み込み
  useEffect(() => {
    const initialLoad = async () => {
      setIsLoading(true);
      await loadDiary(initialDate);
      setIsLoading(false);
    };
    initialLoad();
  }, [initialDate]);

  // 画面フォーカス時に日記を再読み込み（編集後の反映用）
  useFocusEffect(
    useCallback(() => {
      if (!isLoading) {
        loadDiary(currentDate);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentDate])
  );

  const formatDate = (dateString: string): string => {
    const [year, month, day] = dateString.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[dateObj.getDay()];
    return `${year}年${month}月${day}日（${weekday}）`;
  };

  const navigateToDate = async (targetDate: string, direction: 'prev' | 'next') => {
    if (isTransitioning) return;

    setIsTransitioning(true);

    // 次のコンテンツを先にロード
    const nextEntry = await getDiaryByDate(targetDate);
    setNextDiary(nextEntry);

    // スライド方向を決定（次→左へ、前→右へ）
    const slideOutValue = direction === 'next' ? -SCREEN_WIDTH : SCREEN_WIDTH;
    const slideInStartValue = direction === 'next' ? SCREEN_WIDTH : -SCREEN_WIDTH;

    // 次のコンテンツの初期位置を設定
    nextSlideAnim.setValue(slideInStartValue);
    nextFadeAnim.setValue(0);

    // 同時アニメーション：現在のコンテンツがスライドアウト + 次のコンテンツがスライドイン
    Animated.parallel([
      // 現在のコンテンツ: スライドアウト + フェードアウト
      Animated.timing(currentSlideAnim, {
        toValue: slideOutValue,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(currentFadeAnim, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      // 次のコンテンツ: スライドイン + フェードイン
      Animated.timing(nextSlideAnim, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(nextFadeAnim, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start(async () => {
      // アニメーション完了後、状態を更新
      setCurrentDate(targetDate);
      setDiary(nextEntry);
      setNextDiary(null);

      // 前後の日記情報を更新
      const allDiaries = await loadDiaryEntries();
      const currentIndex = allDiaries.findIndex((d) => d.date === targetDate);
      setAdjacentDates({
        prev: currentIndex < allDiaries.length - 1 ? allDiaries[currentIndex + 1]?.date : null,
        next: currentIndex > 0 ? allDiaries[currentIndex - 1]?.date : null,
      });

      // アニメーション値をリセット
      currentSlideAnim.setValue(0);
      currentFadeAnim.setValue(1);
      nextSlideAnim.setValue(0);
      nextFadeAnim.setValue(0);

      setIsTransitioning(false);
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
          onPress: () => navigation.navigate('DiaryEntry', { initialDate: currentDate }),
        }}
      />

      <View style={styles.contentContainer}>
        <Animated.View
          style={[
            styles.contentWrapper,
            {
              transform: [{ translateX: currentSlideAnim }],
              opacity: currentFadeAnim,
            },
          ]}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
          >
            {/* 日付表示とナビゲーション */}
            <View style={styles.dateNavigation}>
              <TouchableOpacity
                style={[styles.dateNavButton, !adjacentDates.prev && styles.dateNavButtonHidden]}
                onPress={() => adjacentDates.prev && navigateToDate(adjacentDates.prev, 'prev')}
                disabled={!adjacentDates.prev || isTransitioning}
              >
                <Ionicons
                  name="chevron-back"
                  size={24}
                  color={adjacentDates.prev && !isTransitioning ? colors.text.secondary : 'transparent'}
                />
              </TouchableOpacity>
              <View style={styles.dateTextContainer}>
                <Text style={styles.dateText}>{formatDate(diary.date)}</Text>
              </View>
              <TouchableOpacity
                style={[styles.dateNavButton, !adjacentDates.next && styles.dateNavButtonHidden]}
                onPress={() => adjacentDates.next && navigateToDate(adjacentDates.next, 'next')}
                disabled={!adjacentDates.next || isTransitioning}
              >
                <Ionicons
                  name="chevron-forward"
                  size={24}
                  color={adjacentDates.next && !isTransitioning ? colors.text.secondary : 'transparent'}
                />
              </TouchableOpacity>
            </View>

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
        </Animated.View>

        {/* 次のコンテンツ（トランジション中のみ表示） */}
        {nextDiary && (
          <Animated.View
            style={[
              styles.contentWrapper,
              styles.nextContentWrapper,
              {
                transform: [{ translateX: nextSlideAnim }],
                opacity: nextFadeAnim,
              },
            ]}
          >
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.content}
            >
              {/* 日付表示とナビゲーション */}
              <View style={styles.dateNavigation}>
                <TouchableOpacity
                  style={[styles.dateNavButton, !adjacentDates.prev && styles.dateNavButtonHidden]}
                  onPress={() => adjacentDates.prev && navigateToDate(adjacentDates.prev, 'prev')}
                  disabled={!adjacentDates.prev || isTransitioning}
                >
                  <Ionicons
                    name="chevron-back"
                    size={24}
                    color={adjacentDates.prev && !isTransitioning ? colors.text.secondary : 'transparent'}
                  />
                </TouchableOpacity>
                <View style={styles.dateTextContainer}>
                  <Text style={styles.dateText}>{formatDate(nextDiary.date)}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.dateNavButton, !adjacentDates.next && styles.dateNavButtonHidden]}
                  onPress={() => adjacentDates.next && navigateToDate(adjacentDates.next, 'next')}
                  disabled={!adjacentDates.next || isTransitioning}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={24}
                    color={adjacentDates.next && !isTransitioning ? colors.text.secondary : 'transparent'}
                  />
                </TouchableOpacity>
              </View>

              {nextDiary.goodTime && (
                <View style={styles.section}>
                  <Text style={styles.questionLabel}>
                    {DIARY_QUESTIONS.goodTime.label}
                  </Text>
                  <View style={styles.answerContainer}>
                    <Text style={styles.answerText}>
                      {nextDiary.goodTime}
                    </Text>
                  </View>
                </View>
              )}

              {nextDiary.wastedTime && (
                <View style={styles.section}>
                  <Text style={styles.questionLabel}>
                    {DIARY_QUESTIONS.wastedTime.label}
                  </Text>
                  <View style={styles.answerContainer}>
                    <Text style={styles.answerText}>
                      {nextDiary.wastedTime}
                    </Text>
                  </View>
                </View>
              )}

              {nextDiary.tomorrow && (
                <View style={styles.section}>
                  <Text style={styles.questionLabel}>
                    {DIARY_QUESTIONS.tomorrow.label}
                  </Text>
                  <View style={styles.answerContainer}>
                    <Text style={styles.answerText}>
                      {nextDiary.tomorrow}
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>
          </Animated.View>
        )}
      </View>
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
  contentContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  contentWrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  nextContentWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.padding.screen,
    paddingBottom: spacing.xxl,
  },
  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  dateNavButton: {
    padding: spacing.sm,
    borderRadius: 20,
  },
  dateNavButtonHidden: {
    opacity: 0,
  },
  dateTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  dateText: {
    fontSize: fonts.size.body,
    color: colors.text.primary,
    fontFamily: fonts.family.bold,
    textAlign: 'center',
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
});

export default DiaryDetailScreen;
