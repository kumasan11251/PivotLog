import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, usePreventRemove, useRoute, type RouteProp } from '@react-navigation/native';
import PagerView from 'react-native-pager-view';
import * as Haptics from 'expo-haptics';
import type { DiaryEntryScreenNavigationProp, RootStackParamList } from '../types/navigation';
import { getColors } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import ScreenHeader from '../components/common/ScreenHeader';
import DatePickerModal from '../components/diary/DatePickerModal';
import DiaryEntryPage, { DiaryEntryPageHandle } from '../components/diary/DiaryEntryPage';
import type { DiaryFormState } from '../hooks/useDiaryEntry';
import {
  addDaysToDateString,
  formatDateToString,
  isDateAfterToday,
  parseLocalDateString,
} from '../utils/dateUtils';

type DiaryRoute = RouteProp<RootStackParamList, 'DiaryEntry'>;
type TransitionState = 'idle' | 'dragging' | 'settling' | 'recentering';

const DiaryEntryScreen: React.FC = () => {
  const navigation = useNavigation<DiaryEntryScreenNavigationProp>();
  const route = useRoute<DiaryRoute>();
  const { isDark } = useTheme();
  const themeColors = useMemo(() => getColors(isDark), [isDark]);
  const initialDate = route.params?.initialDate;
  const [centerDate, setCenterDate] = useState(() => {
    if (initialDate && parseLocalDateString(initialDate) && !isDateAfterToday(initialDate)) return initialDate;
    return formatDateToString(new Date());
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [isPaging, setIsPaging] = useState(false);
  const [recenterBridgeDate, setRecenterBridgeDate] = useState<string | null>(null);
  const [allowNextRemoval, setAllowNextRemoval] = useState(false);
  const pagerRef = useRef<PagerView>(null);
  const pageRefs = useRef(new Map<number, DiaryEntryPageHandle>());
  const [formCache] = useState(() => new Map<string, DiaryFormState>());
  const [previousFocusCache] = useState(() => new Map<string, string | null>());
  const pagesRef = useRef<string[]>([]);
  const transitionRef = useRef<TransitionState>('idle');
  const dragSaveRef = useRef<Promise<boolean> | null>(null);
  const pagerIdleRef = useRef(true);
  const selectedPageIndexRef = useRef(1);
  const pendingRecenterDateRef = useRef<string | null>(null);
  const shouldFinishRecenterAfterRenderRef = useRef(false);
  const recenterFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyboardDismissFrameRef = useRef<number | null>(null);
  const errorAlertVisibleRef = useRef(false);
  const leavingRef = useRef(false);
  const pendingRemovalActionRef = useRef<Parameters<typeof navigation.dispatch>[0] | null>(null);
  const edgeSwipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const edgeSwipeHandledRef = useRef(false);

  const basePages = useMemo(() => {
    const result = [addDaysToDateString(centerDate, -1), centerDate];
    if (!isDateAfterToday(addDaysToDateString(centerDate, 1))) result.push(addDaysToDateString(centerDate, 1));
    return result;
  }, [centerDate]);
  const pages = useMemo(() => {
    if (!recenterBridgeDate) return basePages;
    const bridgedPages = [...basePages];
    bridgedPages[1] = recenterBridgeDate;
    return bridgedPages;
  }, [basePages, recenterBridgeDate]);
  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);

  const cacheFormState = useCallback((dateString: string, formState: DiaryFormState) => {
    formCache.set(dateString, formState);
    const nextDate = addDaysToDateString(dateString, 1);
    const tomorrow = formState.tomorrow.trim();
    previousFocusCache.set(nextDate, tomorrow || null);
  }, [formCache, previousFocusCache]);

  const cachePreviousFocus = useCallback((dateString: string, previousFocus: string | null) => {
    if (!previousFocusCache.has(dateString)) {
      previousFocusCache.set(dateString, previousFocus);
    }
  }, [previousFocusCache]);

  const showSaveError = useCallback(() => {
    if (errorAlertVisibleRef.current) return;
    errorAlertVisibleRef.current = true;
    Alert.alert(
      '保存できませんでした',
      '入力内容を保存できなかったため、日付を切り替えませんでした。もう一度お試しください。',
      [{ text: 'OK', onPress: () => { errorAlertVisibleRef.current = false; } }]
    );
  }, []);

  const flushCenter = useCallback(() => (
    pageRefs.current.get(1)?.flushPendingSave() ?? Promise.resolve(true)
  ), []);

  const dismissDiaryKeyboard = useCallback(() => {
    if (keyboardDismissFrameRef.current !== null) {
      cancelAnimationFrame(keyboardDismissFrameRef.current);
    }
    const dismiss = () => {
      pageRefs.current.forEach(page => page.dismissKeyboard());
      Keyboard.dismiss();
    };
    dismiss();
    // TextInput のフォーカス確定がPagerのdraggingイベントより後になる場合も閉じる。
    keyboardDismissFrameRef.current = requestAnimationFrame(() => {
      keyboardDismissFrameRef.current = null;
      dismiss();
    });
  }, []);

  const unlock = useCallback(() => {
    if (recenterFallbackTimerRef.current) {
      clearTimeout(recenterFallbackTimerRef.current);
      recenterFallbackTimerRef.current = null;
    }
    transitionRef.current = 'idle';
    dragSaveRef.current = null;
    pagerIdleRef.current = true;
    selectedPageIndexRef.current = 1;
    pendingRecenterDateRef.current = null;
    shouldFinishRecenterAfterRenderRef.current = false;
    setRecenterBridgeDate(null);
    setScrollEnabled(true);
    setIsPaging(false);
  }, []);

  const finishPagingIfReady = useCallback(() => {
    // 短いスワイプでは onPageSelected 後もsettlingが続くため、idleまでは入力を再有効化しない。
    const state = transitionRef.current;
    if (
      !pagerIdleRef.current ||
      selectedPageIndexRef.current !== 1 ||
      (state !== 'dragging' && state !== 'settling' && state !== 'recentering')
    ) return;

    void (dragSaveRef.current ?? Promise.resolve(true)).then(() => {
      const latestState = transitionRef.current;
      if (
        !pagerIdleRef.current ||
        selectedPageIndexRef.current !== 1 ||
        (latestState !== 'dragging' && latestState !== 'settling' && latestState !== 'recentering')
      ) return;
      dismissDiaryKeyboard();
      unlock();
    });
  }, [dismissDiaryKeyboard, unlock]);

  const recenter = useCallback((nextDate: string, announce: boolean) => {
    transitionRef.current = 'recentering';
    pendingRecenterDateRef.current = nextDate;
    setRecenterBridgeDate(nextDate);
    if (announce) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      AccessibilityInfo.announceForAccessibility(nextDate);
    }
  }, []);

  const completeRecenter = useCallback(() => {
    if (transitionRef.current !== 'recentering') return;
    const nextDate = pendingRecenterDateRef.current;
    if (!nextDate) return;

    if (recenterFallbackTimerRef.current) {
      clearTimeout(recenterFallbackTimerRef.current);
      recenterFallbackTimerRef.current = null;
    }
    pendingRecenterDateRef.current = null;
    shouldFinishRecenterAfterRenderRef.current = true;
    pagerIdleRef.current = true;
    selectedPageIndexRef.current = 1;
    setCenterDate(nextDate);
    setRecenterBridgeDate(null);
    // 再描画後のfinishPagingIfReadyが何らかの理由で走らなくても、入力ロックを必ず解除する保険。
    recenterFallbackTimerRef.current = setTimeout(() => {
      recenterFallbackTimerRef.current = null;
      if (transitionRef.current === 'recentering') {
        dismissDiaryKeyboard();
        unlock();
      }
    }, 500);
  }, [dismissDiaryKeyboard, unlock]);

  useEffect(() => {
    if (!recenterBridgeDate || transitionRef.current !== 'recentering') return;

    const frameId = requestAnimationFrame(() => {
      if (transitionRef.current !== 'recentering') return;
      pagerRef.current?.setPageWithoutAnimation(1);
      // すでに中央indexの場合など、onPageSelectedが発火しないケースも完了させる。
      recenterFallbackTimerRef.current = setTimeout(() => {
        recenterFallbackTimerRef.current = null;
        completeRecenter();
      }, 250);
    });

    return () => cancelAnimationFrame(frameId);
  }, [completeRecenter, recenterBridgeDate]);

  useEffect(() => {
    if (!shouldFinishRecenterAfterRenderRef.current) return;
    shouldFinishRecenterAfterRenderRef.current = false;

    const frameId = requestAnimationFrame(() => {
      if (transitionRef.current !== 'recentering') return;
      pagerIdleRef.current = true;
      selectedPageIndexRef.current = 1;
      finishPagingIfReady();
    });

    return () => cancelAnimationFrame(frameId);
  }, [centerDate, finishPagingIfReady, recenterBridgeDate]);

  useEffect(() => () => {
    if (recenterFallbackTimerRef.current) clearTimeout(recenterFallbackTimerRef.current);
    if (keyboardDismissFrameRef.current !== null) cancelAnimationFrame(keyboardDismissFrameRef.current);
  }, []);

  const handlePageSelected = useCallback(async (event: { nativeEvent: { position: number } }) => {
    const index = event.nativeEvent.position;
    selectedPageIndexRef.current = index;
    dismissDiaryKeyboard();
    if (transitionRef.current === 'recentering') {
      if (index === 1) completeRecenter();
      return;
    }
    if (index === 1) {
      if (transitionRef.current === 'dragging' || transitionRef.current === 'settling') {
        await dragSaveRef.current;
        finishPagingIfReady();
      }
      return;
    }
    if (transitionRef.current === 'idle') return;

    transitionRef.current = 'settling';
    setScrollEnabled(false);
    const eventPages = pagesRef.current;
    const targetDate = eventPages[index];
    const saved = await (dragSaveRef.current ?? flushCenter());
    if (!saved || !targetDate || isDateAfterToday(targetDate)) {
      transitionRef.current = 'recentering';
      pagerRef.current?.setPage(1);
      if (!saved) showSaveError();
      recenterFallbackTimerRef.current = setTimeout(() => {
        recenterFallbackTimerRef.current = null;
        if (transitionRef.current === 'recentering') {
          dismissDiaryKeyboard();
          unlock();
        }
      }, 750);
      return;
    }
    recenter(targetDate, true);
  }, [completeRecenter, dismissDiaryKeyboard, finishPagingIfReady, flushCenter, recenter, showSaveError, unlock]);

  const handlePageScrollStateChanged = useCallback((event: { nativeEvent: { pageScrollState: string } }) => {
    const state = event.nativeEvent.pageScrollState;
    if (state === 'dragging' && transitionRef.current === 'idle') {
      transitionRef.current = 'dragging';
      pagerIdleRef.current = false;
      setIsPaging(true);
      dismissDiaryKeyboard();
      dragSaveRef.current = flushCenter();
    } else if (state === 'settling' && transitionRef.current === 'dragging') {
      transitionRef.current = 'settling';
      pagerIdleRef.current = false;
    } else if (state === 'idle') {
      pagerIdleRef.current = true;
      finishPagingIfReady();
    }
  }, [dismissDiaryKeyboard, finishPagingIfReady, flushCenter]);

  const moveToIndex = useCallback(async (index: number) => {
    if (transitionRef.current !== 'idle' || !pagesRef.current[index]) return;
    dismissDiaryKeyboard();
    transitionRef.current = 'settling';
    pagerIdleRef.current = false;
    setScrollEnabled(false);
    setIsPaging(true);
    dragSaveRef.current = flushCenter();
    const saved = await dragSaveRef.current;
    if (!saved) {
      showSaveError();
      unlock();
      return;
    }
    pagerRef.current?.setPage(index);
  }, [dismissDiaryKeyboard, flushCenter, showSaveError, unlock]);

  const jumpToDate = useCallback(async (date: Date) => {
    const nextDate = formatDateToString(date);
    if (nextDate === centerDate || isDateAfterToday(nextDate) || transitionRef.current !== 'idle') return;
    dismissDiaryKeyboard();
    transitionRef.current = 'recentering';
    setScrollEnabled(false);
    setIsPaging(true);
    if (!(await flushCenter())) {
      showSaveError();
      unlock();
      return;
    }
    // Pagerは中央(index 1)に居るままなので、ブリッジやsetPageWithoutAnimationを介さず中央日付を直接差し替える。
    // 同一ページへのsetPageはネイティブ側でイベントが一切発火せず、完了通知に依存するとロック解除されないため。
    pendingRecenterDateRef.current = nextDate;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    AccessibilityInfo.announceForAccessibility(nextDate);
    completeRecenter();
  }, [centerDate, completeRecenter, dismissDiaryKeyboard, flushCenter, showSaveError, unlock]);

  usePreventRemove(!allowNextRemoval, ({ data }) => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    pendingRemovalActionRef.current = data.action;
    dismissDiaryKeyboard();
    void flushCenter().then(saved => {
      if (!saved) {
        leavingRef.current = false;
        pendingRemovalActionRef.current = null;
        showSaveError();
        return;
      }
      setAllowNextRemoval(true);
    });
  });

  useEffect(() => {
    if (!allowNextRemoval || !pendingRemovalActionRef.current) return;
    const action = pendingRemovalActionRef.current;
    pendingRemovalActionRef.current = null;
    navigation.dispatch(action);
  }, [allowNextRemoval, navigation]);

  const handleBack = useCallback(async () => {
    if (leavingRef.current) return;
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    leavingRef.current = true;
    dismissDiaryKeyboard();
    if (await flushCenter()) navigation.navigate('Home');
    else {
      leavingRef.current = false;
      showSaveError();
    }
  }, [dismissDiaryKeyboard, flushCenter, navigation, showSaveError]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScreenHeader leftAction={{ type: 'backIcon', onPress: handleBack }} />
        <View style={styles.pagerContainer}>
          <PagerView
            ref={pagerRef}
            style={styles.flex}
            initialPage={1}
            scrollEnabled={scrollEnabled}
            keyboardDismissMode="on-drag"
            offscreenPageLimit={1}
            overdrag={false}
            overScrollMode="never"
            layoutDirection="ltr"
            onPageSelected={handlePageSelected}
            onPageScrollStateChanged={handlePageScrollStateChanged}
          >
            {pages.map((dateString, index) => (
              <View
                // PagerViewの直接の子は位置を固定し、中央へ同じ日付を複製してから再配置する。
                key={`pager-slot-${index}`}
                style={styles.page}
                collapsable={false}
              >
                <DiaryEntryPage
                  key={dateString}
                  ref={page => {
                    if (page) pageRefs.current.set(index, page);
                    else pageRefs.current.delete(index);
                  }}
                  dateString={dateString}
                  initialFormState={formCache.get(dateString)}
                  onFormStateChange={cacheFormState}
                  initialPreviousFocus={previousFocusCache.get(dateString)}
                  onPreviousFocusChange={cachePreviousFocus}
                  isActive={index === 1}
                  isPaging={isPaging}
                  canNavigateNext={!isDateAfterToday(addDaysToDateString(dateString, 1))}
                  onPrevious={() => moveToIndex(0)}
                  onNext={() => moveToIndex(2)}
                  onOpenDatePicker={() => transitionRef.current === 'idle' && setShowDatePicker(true)}
                  onNavigateToPaywall={() => navigation.navigate('Paywall', { source: 'limit_reached' })}
                />
              </View>
            ))}
          </PagerView>
          <View
            // 画面左端の帯から始まった右方向スワイプはPagerの日付移動ではなく「戻る」として扱う。
            style={styles.edgeBackArea}
            onTouchStart={event => {
              edgeSwipeStartRef.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY };
              edgeSwipeHandledRef.current = false;
            }}
            onTouchMove={event => {
              const start = edgeSwipeStartRef.current;
              if (!start || edgeSwipeHandledRef.current) return;
              const dx = event.nativeEvent.pageX - start.x;
              const dy = event.nativeEvent.pageY - start.y;
              if (Math.abs(dy) > 24 && Math.abs(dy) > dx) {
                // 縦方向が優勢なジェスチャーは誤発火防止のため以降無視する
                edgeSwipeHandledRef.current = true;
                return;
              }
              if (dx > 16 && dx > Math.abs(dy) * 1.5) {
                edgeSwipeHandledRef.current = true;
                if (transitionRef.current === 'idle') void handleBack();
              }
            }}
            onTouchEnd={() => {
              edgeSwipeStartRef.current = null;
            }}
          />
        </View>
        <DatePickerModal
          visible={showDatePicker}
          selectedDate={parseLocalDateString(centerDate) ?? new Date()}
          onDateChange={(_event, date) => { if (date) void jumpToDate(date); }}
          onClose={() => setShowDatePicker(false)}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  pagerContainer: { flex: 1 },
  page: { width: '100%', height: '100%' },
  // iOSの標準エッジスワイプ領域（約20pt）に合わせる。screen padding(24)より狭くしてコンテンツのタップを塞がない。
  edgeBackArea: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 20 },
});

export default DiaryEntryScreen;
