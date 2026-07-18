import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import {
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { DIARY_QUESTIONS } from '../../constants/diary';
import { useDiaryEntry, DiaryFieldKey, DiaryFormState } from '../../hooks/useDiaryEntry';
import { spacing } from '../../theme';
import DiaryInputField, { DiaryInputFieldRef } from './DiaryInputField';
import DateNavigator from './DateNavigator';
import DiaryAIReflectionSection from './DiaryAIReflectionSection';
import EncouragementHeader from './EncouragementHeader';
import PreviousDayFocusHint from './PreviousDayFocusHint';
import ProgressIndicator from './ProgressIndicator';
import { usePreviousDayFocus } from '../../hooks/usePreviousDayFocus';

export interface DiaryEntryPageHandle {
  flushPendingSave: () => Promise<boolean>;
  dismissKeyboard: () => void;
}

interface Props {
  dateString: string;
  initialFormState?: DiaryFormState;
  onFormStateChange: (dateString: string, formState: DiaryFormState) => void;
  initialPreviousFocus?: string | null;
  onPreviousFocusChange?: (dateString: string, previousFocus: string | null) => void;
  isActive: boolean;
  isPaging: boolean;
  canNavigateNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onOpenDatePicker: () => void;
  onNavigateToPaywall: () => void;
}

const DiaryEntryPage = forwardRef<DiaryEntryPageHandle, Props>(({
  dateString,
  initialFormState,
  onFormStateChange,
  initialPreviousFocus,
  onPreviousFocusChange,
  isActive,
  isPaging,
  canNavigateNext,
  onPrevious,
  onNext,
  onOpenDatePicker,
  onNavigateToPaywall,
}, ref) => {
  const cacheFormState = useCallback(
    (nextFormState: DiaryFormState) => onFormStateChange(dateString, nextFormState),
    [dateString, onFormStateChange]
  );
  const cachePreviousFocus = useCallback(
    (nextPreviousFocus: string | null) => onPreviousFocusChange?.(dateString, nextPreviousFocus),
    [dateString, onPreviousFocusChange]
  );
  const {
    formState,
    setFieldValue,
    focusedField,
    setFocusedField,
    isLoading,
    progress,
    encouragement,
    placeholders,
    flushPendingSave,
  } = useDiaryEntry(dateString, initialFormState, cacheFormState);
  const previousFocus = usePreviousDayFocus(
    dateString,
    initialPreviousFocus,
    cachePreviousFocus
  );

  const scrollViewRef = useRef<ScrollView>(null);
  const scrollContentRef = useRef<View>(null);
  const goodTimeRef = useRef<DiaryInputFieldRef>(null);
  const wastedTimeRef = useRef<DiaryInputFieldRef>(null);
  const tomorrowRef = useRef<DiaryInputFieldRef>(null);
  const goodTimeContainerRef = useRef<View>(null);
  const wastedTimeContainerRef = useRef<View>(null);
  const tomorrowContainerRef = useRef<View>(null);
  const scrollToFieldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissKeyboard = useCallback(() => {
    if (scrollToFieldTimerRef.current) {
      clearTimeout(scrollToFieldTimerRef.current);
      scrollToFieldTimerRef.current = null;
    }
    goodTimeRef.current?.blur();
    wastedTimeRef.current?.blur();
    tomorrowRef.current?.blur();
    setFocusedField(null);
    Keyboard.dismiss();
  }, [setFocusedField]);

  useImperativeHandle(
    ref,
    () => ({ flushPendingSave, dismissKeyboard }),
    [dismissKeyboard, flushPendingSave]
  );

  useEffect(() => {
    if (isPaging) dismissKeyboard();
  }, [dismissKeyboard, isPaging]);

  useEffect(() => () => {
    if (scrollToFieldTimerRef.current) clearTimeout(scrollToFieldTimerRef.current);
  }, []);

  // フォーカスされたフィールドを常に画面上部へスクロールし、キーボードに隠れないようにする。
  const scrollToField = useCallback((fieldRef: React.RefObject<View | null>, inputRef: React.RefObject<DiaryInputFieldRef | null>) => {
    if (scrollToFieldTimerRef.current) clearTimeout(scrollToFieldTimerRef.current);
    scrollToFieldTimerRef.current = setTimeout(() => {
      scrollToFieldTimerRef.current = null;
      if (!inputRef.current?.isFocused()) return;
      if (!fieldRef.current || !scrollContentRef.current) return;
      fieldRef.current.measureLayout(
        scrollContentRef.current as unknown as React.ElementRef<typeof View>,
        (_fx, fy) => scrollViewRef.current?.scrollTo({ y: Math.max(0, fy - spacing.lg), animated: true }),
        () => undefined
      );
    }, Platform.OS === 'ios' ? 50 : 150);
  }, []);

  const fields = [
    { key: 'goodTime' as DiaryFieldKey, ref: goodTimeRef, container: goodTimeContainerRef },
    { key: 'wastedTime' as DiaryFieldKey, ref: wastedTimeRef, container: wastedTimeContainerRef },
    { key: 'tomorrow' as DiaryFieldKey, ref: tomorrowRef, container: tomorrowContainerRef },
  ];

  return (
    <View
      style={styles.page}
      pointerEvents={isActive && !isPaging ? 'auto' : 'none'}
      accessibilityElementsHidden={!isActive}
      importantForAccessibility={isActive ? 'auto' : 'no-hide-descendants'}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View ref={scrollContentRef}>
          <EncouragementHeader {...encouragement} />
          <ProgressIndicator progress={progress} />
          <DateNavigator
            dateString={dateString}
            isToday={!canNavigateNext}
            onPrevious={onPrevious}
            onNext={onNext}
            onOpenPicker={onOpenDatePicker}
          />
          <PreviousDayFocusHint text={previousFocus} />
          {fields.map(field => (
            <View key={field.key} ref={field.container}>
              <DiaryInputField
                ref={field.ref}
                label={DIARY_QUESTIONS[field.key].label}
                value={formState[field.key]}
                placeholder={placeholders[field.key]}
                onChangeText={text => setFieldValue(field.key, text)}
                onFocus={() => {
                  setFocusedField(field.key);
                  scrollToField(field.container, field.ref);
                }}
                onBlur={() => setFocusedField(null)}
                isFocused={focusedField === field.key}
                isPaging={isPaging || isLoading}
                showCheckmark={focusedField !== field.key && !!formState[field.key].trim()}
              />
            </View>
          ))}
          {isActive && !isLoading && (
            <DiaryAIReflectionSection
              dateString={dateString}
              formState={formState}
              onNavigateToPaywall={onNavigateToPaywall}
            />
          )}
          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>
    </View>
  );
});

DiaryEntryPage.displayName = 'DiaryEntryPage';

const styles = StyleSheet.create({
  page: { width: '100%', height: '100%' },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  bottomSpacer: { height: spacing.xxl * 2 },
});

export default DiaryEntryPage;
