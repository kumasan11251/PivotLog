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
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  Easing,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { DiaryDetailScreenNavigationProp, RootStackParamList } from '../types/navigation';
import { colors, fonts, spacing, textBase } from '../theme';
import { getDiaryByDate, loadDiaryEntries, DiaryEntry, deleteDiaryEntry } from '../utils/storage';
import { DIARY_QUESTIONS } from '../constants/diary';
import ScreenHeader from '../components/common/ScreenHeader';

type DiaryDetailScreenRouteProp = RouteProp<RootStackParamList, 'DiaryDetail'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ANIMATION_DURATION = 300; // 少し長めにして滑らかに
const CARD_ANIMATION_DURATION = 300; // 記録一覧と同じ速度
const CARD_STAGGER_DELAY = 50;
const SWIPE_THRESHOLD = 50; // スワイプと認識する最小距離
const SWIPE_VELOCITY_THRESHOLD = 0.3; // スワイプと認識する最小速度
const SWIPE_PREVIEW_FACTOR = 0.4; // スワイプ中のプレビュー移動係数

const DiaryDetailScreen: React.FC = () => {
  const navigation = useNavigation<DiaryDetailScreenNavigationProp>();
  const route = useRoute<DiaryDetailScreenRouteProp>();
  const { date: initialDate, fromList } = route.params;

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
  const [transitionAdjacentDates, setTransitionAdjacentDates] = useState<
    { prev: string | null; next: string | null } | null
  >(null);

  // アニメーション用（現在のコンテンツ）
  const currentSlideAnim = useRef(new Animated.Value(0)).current;
  const currentFadeAnim = useRef(new Animated.Value(1)).current;
  // アニメーション用（次のコンテンツ）
  const nextSlideAnim = useRef(new Animated.Value(0)).current;
  const nextFadeAnim = useRef(new Animated.Value(0)).current;

  // PanResponderが最新の状態にアクセスするためのref
  const adjacentDatesRef = useRef(adjacentDates);
  const isTransitioningRef = useRef(isTransitioning);
  const hasPlayedEntryAnimationRef = useRef(false);

  // refを最新の状態に同期
  useEffect(() => {
    adjacentDatesRef.current = adjacentDates;
  }, [adjacentDates]);

  useEffect(() => {
    isTransitioningRef.current = isTransitioning;
  }, [isTransitioning]);

  // navigateToDate関数の参照を保持
  const navigateToDateRef = useRef<((targetDate: string, direction: 'prev' | 'next') => void) | undefined>(undefined);

  // カードのスタガードアニメーション用
  const cardAnimations = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;

  useEffect(() => {
    // 記録一覧から遷移した初回のみスタガードアニメーション
    if (isLoading || !fromList || hasPlayedEntryAnimationRef.current || !diary) {
      return;
    }

    // 対象となるカード（空でない回答）だけを抽出
    const filledAnimations = cardAnimations.slice(0, 3);
    filledAnimations.forEach((anim) => anim.setValue(0));

    const sequences = [] as Animated.CompositeAnimation[];
    const contents = [diary.goodTime, diary.wastedTime, diary.tomorrow];
    contents.forEach((content, idx) => {
      if (content && content.trim()) {
        sequences.push(
          Animated.timing(cardAnimations[idx], {
            toValue: 1,
            duration: CARD_ANIMATION_DURATION,
            delay: CARD_STAGGER_DELAY * sequences.length,
            useNativeDriver: true,
          })
        );
      }
    });

    Animated.parallel(sequences).start(() => {
      hasPlayedEntryAnimationRef.current = true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, fromList, diary]);

  // スワイプジェスチャー用のPanResponder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (
        _evt: GestureResponderEvent,
        gestureState: PanResponderGestureState
      ) => {
        // 水平方向のスワイプのみ検知（垂直スクロールを妨げない）
        const { dx, dy } = gestureState;
        return Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10;
      },
      onPanResponderGrant: () => {
        // スワイプ開始時の軽いフィードバック
        Haptics.selectionAsync();
      },
      onPanResponderMove: (
        _evt: GestureResponderEvent,
        gestureState: PanResponderGestureState
      ) => {
        // スワイプ中のプレビュー（追従効果）
        if (!isTransitioningRef.current) {
          const { dx } = gestureState;
          // 移動可能な方向のみプレビューを表示
          const canGoNext = adjacentDatesRef.current.next && dx < 0;
          const canGoPrev = adjacentDatesRef.current.prev && dx > 0;
          if (canGoNext || canGoPrev) {
            // より自然な追従（指の動きの40%を追従）
            currentSlideAnim.setValue(dx * SWIPE_PREVIEW_FACTOR);
          } else if (dx !== 0) {
            // 移動できない方向は抵抗感を出す（10%のみ追従）
            currentSlideAnim.setValue(dx * 0.1);
          }
        }
      },
      onPanResponderRelease: (
        _evt: GestureResponderEvent,
        gestureState: PanResponderGestureState
      ) => {
        const { dx, vx } = gestureState;
        const isSwipeLeft = dx < -SWIPE_THRESHOLD || vx < -SWIPE_VELOCITY_THRESHOLD;
        const isSwipeRight = dx > SWIPE_THRESHOLD || vx > SWIPE_VELOCITY_THRESHOLD;

        if (isSwipeLeft && adjacentDatesRef.current.next) {
          // 左スワイプ → 新しい日記へ
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          navigateToDateRef.current?.(adjacentDatesRef.current.next, 'next');
        } else if (isSwipeRight && adjacentDatesRef.current.prev) {
          // 右スワイプ → 古い日記へ
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          navigateToDateRef.current?.(adjacentDatesRef.current.prev, 'prev');
        } else {
          // スワイプが閾値に達しなかった場合、滑らかに元に戻す
          Animated.spring(currentSlideAnim, {
            toValue: 0,
            useNativeDriver: true,
            damping: 15,
            stiffness: 150,
            mass: 0.8,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        // ジェスチャーがキャンセルされた場合、滑らかに元に戻す
        Animated.spring(currentSlideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 15,
          stiffness: 150,
          mass: 0.8,
        }).start();
      },
    })
  ).current;

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
  // ただし、日記切り替え中やトランジション直後は再読み込みをスキップ
  const isInternalNavigationRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      // 内部遷移フラグがセットされていれば再読み込みをスキップ
      if (isInternalNavigationRef.current) {
        isInternalNavigationRef.current = false; // リセット
        return;
      }

      // トランジション中は再読み込みしない
      if (isTransitioning) {
        return;
      }

      // 外部から戻ってきた場合のみ再読み込み（編集画面から戻った場合など）
      loadDiary(currentDate);
    }, [currentDate, isTransitioning])
  );

  const formatDate = (dateString: string): string => {
    const [year, month, day] = dateString.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[dateObj.getDay()];
    return `${year}年${month}月${day}日（${weekday}）`;
  };

  // 削除確認ダイアログを表示
  const handleDelete = useCallback(() => {
    Alert.alert(
      '記録を削除',
      'この記録を削除しますか？\nこの操作は取り消せません。',
      [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDiaryEntry(currentDate);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              navigation.goBack();
            } catch (error) {
              console.error('日記の削除に失敗しました:', error);
              Alert.alert('エラー', '削除に失敗しました。もう一度お試しください。');
            }
          },
        },
      ]
    );
  }, [currentDate, navigation]);

  const navigateToDate = async (targetDate: string, direction: 'prev' | 'next') => {
    if (isTransitioning) return;

    // 内部遷移をマーク（useFocusEffectでの再読み込みをスキップするため）
    // アニメーション開始前にセット
    isInternalNavigationRef.current = true;

    setIsTransitioning(true);

    // 次のコンテンツを先にロード
    const nextEntry = await getDiaryByDate(targetDate);
    setNextDiary(nextEntry);

    // 前後の日記情報を先に取得
    const allDiaries = await loadDiaryEntries();
    const nextIndex = allDiaries.findIndex((d) => d.date === targetDate);
    const newAdjacentDates = {
      prev: nextIndex < allDiaries.length - 1 ? allDiaries[nextIndex + 1]?.date : null,
      next: nextIndex > 0 ? allDiaries[nextIndex - 1]?.date : null,
    };

    // 次のコンテンツ用のナビゲーションを先にセットしておく
    setTransitionAdjacentDates(newAdjacentDates);

    // スライド方向を決定（次→左へ、前→右へ）
    const slideOutValue = direction === 'next' ? -SCREEN_WIDTH : SCREEN_WIDTH;
    const slideInStartValue = direction === 'next' ? SCREEN_WIDTH : -SCREEN_WIDTH;

    // 次のコンテンツの初期位置を設定
    nextSlideAnim.setValue(slideInStartValue);
    nextFadeAnim.setValue(0.3); // 最初から少し見える状態でスタート

    // カスタムイージング：滑らかな加速・減速
    const easing = Easing.bezier(0.25, 0.1, 0.25, 1); // cubic-bezier(ease)

    // 同時アニメーション：現在のコンテンツがスライドアウト + 次のコンテンツがスライドイン
    Animated.parallel([
      // 現在のコンテンツ: スライドアウト
      Animated.timing(currentSlideAnim, {
        toValue: slideOutValue,
        duration: ANIMATION_DURATION,
        easing,
        useNativeDriver: true,
      }),
      // 現在のコンテンツ: フェードアウト（少し速く）
      Animated.timing(currentFadeAnim, {
        toValue: 0,
        duration: ANIMATION_DURATION * 0.7,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      // 次のコンテンツ: スライドイン
      Animated.timing(nextSlideAnim, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        easing,
        useNativeDriver: true,
      }),
      // 次のコンテンツ: フェードイン（少し遅らせて開始）
      Animated.sequence([
        Animated.delay(ANIMATION_DURATION * 0.15),
        Animated.timing(nextFadeAnim, {
          toValue: 1,
          duration: ANIMATION_DURATION * 0.85,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      // アニメーション値を先にリセット
      currentSlideAnim.setValue(0);
      currentFadeAnim.setValue(1);
      nextSlideAnim.setValue(0);
      nextFadeAnim.setValue(0);

      // 状態を一括更新（バッチ処理される）
      setDiary(nextEntry);
      setAdjacentDates(newAdjacentDates);
      setCurrentDate(targetDate);
      setNextDiary(null);
      setIsTransitioning(false);
      setTransitionAdjacentDates(null);
    });
  };

  // navigateToDateの参照をrefに保存
  useEffect(() => {
    navigateToDateRef.current = navigateToDate;
  });

  const renderAnswerCard = (
    label: string,
    content: string,
    anim?: Animated.Value,
  ) => {
    if (!content || !content.trim()) return null;

    const animatedStyle = anim
      ? {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [15, 0],
              }),
            },
          ],
        }
      : undefined;

    return (
      <View style={styles.section}>
        <Animated.View style={[styles.card, animatedStyle]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardLabelTag}>
              <Text style={styles.cardLabel}>{label}</Text>
            </View>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardText}>{content.trim()}</Text>
          </View>
        </Animated.View>
      </View>
    );
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

  const nextNavigationDates = transitionAdjacentDates ?? adjacentDates;

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
        rightActions={[
          {
            type: 'icon',
            iconName: 'trash-outline',
            onPress: handleDelete,
            color: colors.error,
          },
          {
            type: 'icon',
            iconName: 'create-outline',
            onPress: () => navigation.navigate('DiaryEntry', { initialDate: currentDate }),
          },
        ]}
      />

      <View style={styles.contentContainer} {...panResponder.panHandlers}>
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
            scrollEventThrottle={16}
          >
            {/* 日付表示とナビゲーション */}
            <View style={styles.dateNavigation}>
              {adjacentDates.prev ? (
                <TouchableOpacity
                  style={styles.dateNavButton}
                  onPress={() => navigateToDate(adjacentDates.prev!, 'prev')}
                  disabled={isTransitioning}
                >
                  <Ionicons
                    name="caret-back"
                    size={18}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              ) : (
                <View style={styles.dateNavButtonPlaceholder} />
              )}
              <View style={styles.dateTextContainer}>
                <Text style={styles.dateText}>{formatDate(diary.date)}</Text>
              </View>
              {adjacentDates.next ? (
                <TouchableOpacity
                  style={styles.dateNavButton}
                  onPress={() => navigateToDate(adjacentDates.next!, 'next')}
                  disabled={isTransitioning}
                >
                  <Ionicons
                    name="caret-forward"
                    size={18}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              ) : (
                <View style={styles.dateNavButtonPlaceholder} />
              )}
            </View>

            {[diary.goodTime, diary.wastedTime, diary.tomorrow]
              .map((content, idx) => {
                const labels = [
                  DIARY_QUESTIONS.goodTime.label,
                  DIARY_QUESTIONS.wastedTime.label,
                  DIARY_QUESTIONS.tomorrow.label,
                ];
                return content && content.trim()
                  ? renderAnswerCard(labels[idx], content, cardAnimations[idx])
                  : null;
              })}
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
                {nextNavigationDates.prev ? (
                  <TouchableOpacity
                    style={styles.dateNavButton}
                    onPress={() => navigateToDate(nextNavigationDates.prev!, 'prev')}
                    disabled={isTransitioning}
                  >
                    <Ionicons
                      name="caret-back"
                      size={18}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.dateNavButtonPlaceholder} />
                )}
                <View style={styles.dateTextContainer}>
                  <Text style={styles.dateText}>{formatDate(nextDiary.date)}</Text>
                </View>
                {nextNavigationDates.next ? (
                  <TouchableOpacity
                    style={styles.dateNavButton}
                    onPress={() => navigateToDate(nextNavigationDates.next!, 'next')}
                    disabled={isTransitioning}
                  >
                    <Ionicons
                      name="caret-forward"
                      size={18}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.dateNavButtonPlaceholder} />
                )}
              </View>

              {[nextDiary.goodTime, nextDiary.wastedTime, nextDiary.tomorrow]
                .map((content, idx) => {
                  const labels = [
                    DIARY_QUESTIONS.goodTime.label,
                    DIARY_QUESTIONS.wastedTime.label,
                    DIARY_QUESTIONS.tomorrow.label,
                  ];
                  return content && content.trim()
                    ? renderAnswerCard(labels[idx], content)
                    : null;
                })}
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
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
    paddingHorizontal: spacing.sm,
  },
  dateNavButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(139, 157, 131, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateNavButtonPlaceholder: {
    width: 36,
    height: 36,
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(139, 157, 131, 0.12)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  cardLabelTag: {
    backgroundColor: 'rgba(139, 157, 131, 0.15)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  cardLabel: {
    fontSize: 12,
    color: colors.primary,
    fontFamily: fonts.family.bold,
    ...textBase,
  },
  cardBody: {
    flexDirection: 'column',
  },
  cardText: {
    flex: 1,
    fontSize: fonts.size.body,
    color: colors.text.primary,
    fontFamily: fonts.family.regular,
    lineHeight: fonts.size.body * 1.6,
    ...textBase,
  },
});

export default DiaryDetailScreen;
