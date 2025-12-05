import React, { useRef, useCallback, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';
import Button from '../components/common/Button';
import ScreenHeader from '../components/common/ScreenHeader';
import {
  EncouragementHeader,
  ProgressIndicator,
  DateNavigator,
  DiaryInputField,
  DatePickerModal,
  DiaryInputFieldRef,
} from '../components/diary';
import { useDiaryEntry, DiaryFieldKey } from '../hooks/useDiaryEntry';
import { DIARY_QUESTIONS } from '../constants/diary';

const DiaryEntryScreen: React.FC = () => {
  const {
    formState,
    setFieldValue,
    dateString,
    changeDate,
    selectedDate,
    isToday,
    focusedField,
    setFocusedField,
    isSaving,
    showDatePicker,
    setShowDatePicker,
    progress,
    encouragement,
    placeholders,
    handleSave,
    handleBack,
    handleDateChange,
  } = useDiaryEntry();

  // Refs
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollContentRef = useRef<View>(null);
  const goodTimeRef = useRef<DiaryInputFieldRef>(null);
  const wastedTimeRef = useRef<DiaryInputFieldRef>(null);
  const tomorrowRef = useRef<DiaryInputFieldRef>(null);
  const goodTimeContainerRef = useRef<View>(null);
  const wastedTimeContainerRef = useRef<View>(null);
  const tomorrowContainerRef = useRef<View>(null);

  // キーボードの高さを追跡
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const keyboardWillShow = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const keyboardWillHide = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  // フィールドにフォーカスした時のスクロール処理
  const scrollToField = useCallback(
    (
      fieldRef: React.RefObject<View | null>,
      inputRef: React.RefObject<DiaryInputFieldRef | null>
    ) => {
      setTimeout(
        () => {
          if (inputRef.current) {
            inputRef.current.measureInWindow((_x, y, _width, height) => {
              const screenHeight = Dimensions.get('window').height;
              const visibleHeight = screenHeight - keyboardHeight - 100;
              const inputBottom = y + height;

              if (inputBottom > visibleHeight || fieldRef.current) {
                if (fieldRef.current && scrollContentRef.current) {
                  fieldRef.current.measureLayout(
                    scrollContentRef.current as unknown as React.ElementRef<typeof View>,
                    (_fx, fy) => {
                      const scrollOffset = Math.max(0, fy - spacing.lg);
                      scrollViewRef.current?.scrollTo({ y: scrollOffset, animated: true });
                    },
                    () => {
                      console.log('measureLayout failed');
                    }
                  );
                }
              }
            });
          }
        },
        Platform.OS === 'ios' ? 50 : 150
      );
    },
    [keyboardHeight]
  );

  // フィールドのフォーカスハンドラーを生成
  const createFocusHandler = useCallback(
    (
      field: DiaryFieldKey,
      containerRef: React.RefObject<View | null>,
      inputRef: React.RefObject<DiaryInputFieldRef | null>
    ) => {
      return () => {
        setFocusedField(field);
        scrollToField(containerRef, inputRef);
      };
    },
    [setFocusedField, scrollToField]
  );

  // 入力フィールドの設定
  const fieldConfigs = [
    {
      key: 'goodTime' as DiaryFieldKey,
      label: DIARY_QUESTIONS.goodTime.label,
      containerRef: goodTimeContainerRef,
      inputRef: goodTimeRef,
    },
    {
      key: 'wastedTime' as DiaryFieldKey,
      label: DIARY_QUESTIONS.wastedTime.label,
      containerRef: wastedTimeContainerRef,
      inputRef: wastedTimeRef,
    },
    {
      key: 'tomorrow' as DiaryFieldKey,
      label: DIARY_QUESTIONS.tomorrow.label,
      containerRef: tomorrowContainerRef,
      inputRef: tomorrowRef,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.flex}>
          <ScreenHeader
            leftAction={{
              type: 'backIcon',
              onPress: handleBack,
            }}
          />

          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollViewContent}
            keyboardShouldPersistTaps="handled"
          >
            <View ref={scrollContentRef}>
              <EncouragementHeader
                emoji={encouragement.emoji}
                title={encouragement.title}
                subtitle={encouragement.subtitle}
              />

              <ProgressIndicator progress={progress} />

              <DateNavigator
                dateString={dateString}
                isToday={isToday}
                onPrevious={() => changeDate(-1)}
                onNext={() => changeDate(1)}
                onOpenPicker={() => setShowDatePicker(true)}
              />

              {fieldConfigs.map((config) => (
                <View key={config.key} ref={config.containerRef}>
                  <DiaryInputField
                    ref={config.inputRef}
                    label={config.label}
                    value={formState[config.key]}
                    placeholder={placeholders[config.key]}
                    onChangeText={(text) => setFieldValue(config.key, text)}
                    onFocus={createFocusHandler(
                      config.key,
                      config.containerRef,
                      config.inputRef
                    )}
                    onBlur={() => setFocusedField(null)}
                    isFocused={focusedField === config.key}
                    showCheckmark={focusedField !== config.key && !!formState[config.key].trim()}
                  />
                </View>
              ))}

              <Button
                title={isSaving ? '保存中...' : '記録する'}
                onPress={handleSave}
                disabled={isSaving}
                style={styles.saveButton}
              />
            </View>
          </ScrollView>

          <DatePickerModal
            visible={showDatePicker}
            selectedDate={selectedDate}
            onDateChange={handleDateChange}
            onClose={() => setShowDatePicker(false)}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  saveButton: {
    marginHorizontal: spacing.padding.screen,
    marginTop: spacing.xxl,
    marginBottom: spacing.xxl * 2,
  },
});

export default DiaryEntryScreen;
