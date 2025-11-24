import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableWithoutFeedback,
  Alert,
  TouchableOpacity,
  Platform,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { DiaryEntryScreenNavigationProp, RootStackParamList } from '../types/navigation';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, fonts, spacing } from '../theme';
import Button from '../components/common/Button';
import { saveDiaryEntry, getDiaryByDate, DiaryEntry } from '../utils/storage';
import { DIARY_QUESTIONS } from '../constants/diary';

const MAX_CHARS = 100;

type DiaryEntryScreenRouteProp = RouteProp<RootStackParamList, 'DiaryEntry'>;

const DiaryEntryScreen: React.FC = () => {
  const navigation = useNavigation<DiaryEntryScreenNavigationProp>();
  const route = useRoute<DiaryEntryScreenRouteProp>();
  const { initialDate } = route.params || {};

  const [goodTime, setGoodTime] = useState('');
  const [wastedTime, setWastedTime] = useState('');
  const [tomorrow, setTomorrow] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    if (initialDate) {
      return new Date(initialDate);
    }
    return new Date();
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  // 初期値を保持（変更検出用）
  const [initialGoodTime, setInitialGoodTime] = useState('');
  const [initialWastedTime, setInitialWastedTime] = useState('');
  const [initialTomorrow, setInitialTomorrow] = useState('');

  // ScrollViewのref
  const scrollViewRef = React.useRef<ScrollView>(null);

  // 選択された日付をYYYY-MM-DD形式に変換
  const dateString = selectedDate.toISOString().split('T')[0];

  useEffect(() => {
    // 選択された日付の日記を読み込む
    const loadDiary = async () => {
      const existingDiary = await getDiaryByDate(dateString);
      if (existingDiary) {
        setGoodTime(existingDiary.goodTime || '');
        setWastedTime(existingDiary.wastedTime || '');
        setTomorrow(existingDiary.tomorrow || '');
        setInitialGoodTime(existingDiary.goodTime || '');
        setInitialWastedTime(existingDiary.wastedTime || '');
        setInitialTomorrow(existingDiary.tomorrow || '');
      } else {
        setGoodTime('');
        setWastedTime('');
        setTomorrow('');
        setInitialGoodTime('');
        setInitialWastedTime('');
        setInitialTomorrow('');
      }
    };
    loadDiary();
  }, [dateString]);

  const handleSave = async () => {
    if (!goodTime.trim() && !wastedTime.trim() && !tomorrow.trim()) {
      Alert.alert('エラー', '少なくとも1つの質問に回答してください');
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const entry: DiaryEntry = {
        id: dateString,
        date: dateString,
        goodTime: goodTime.trim(),
        wastedTime: wastedTime.trim(),
        tomorrow: tomorrow.trim(),
        createdAt: now,
        updatedAt: now,
      };

      await saveDiaryEntry(entry);
      Alert.alert('保存完了', '記録を保存しました', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('エラー', '保存に失敗しました。もう一度お試しください。');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDateChange = (_event: unknown, date?: Date) => {
    if (date) {
      setSelectedDate(date);
      // Android以外では自動的に閉じない
      if (Platform.OS === 'android') {
        setShowDatePicker(false);
      }
    }
  };

  const handleBack = () => {
    // 初期値と現在の値を比較して変更があるかチェック
    const hasChanges =
      goodTime.trim() !== initialGoodTime.trim() ||
      wastedTime.trim() !== initialWastedTime.trim() ||
      tomorrow.trim() !== initialTomorrow.trim();

    if (hasChanges) {
      Alert.alert(
        '確認',
        '保存せずに戻りますか？',
        [
          { text: 'キャンセル', style: 'cancel' },
          { text: '戻る', onPress: () => navigation.goBack(), style: 'destructive' },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[date.getDay()];
    return `${year}年${month}月${day}日（${weekday}）`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.innerContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.innerContainer}>
          {/* 戻るボタン */}
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>← 戻る</Text>
          </TouchableOpacity>

          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollViewContent}
            keyboardShouldPersistTaps="handled"
          >
          {/* 記録日 */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>記録日</Text>
            <TouchableOpacity
              style={styles.dateInputContainer}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.calendarIcon}>📅</Text>
              <Text style={styles.dateInputText}>{formatDate(dateString)}</Text>
            </TouchableOpacity>
          </View>

          {/* 日記入力エリア */}
          <View style={styles.fieldContainer}>
            <View style={styles.labelContainer}>
              <Text style={styles.label}>{DIARY_QUESTIONS.goodTime.label}</Text>
              <Text style={styles.charCount}>{goodTime.length}/{MAX_CHARS}</Text>
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={goodTime}
                onChangeText={setGoodTime}
                onFocus={() => scrollViewRef.current?.scrollTo({ y: 50, animated: true })}
                placeholder="例：朝の運動、集中した作業時間など"
                placeholderTextColor={colors.text.secondary}
                multiline
                textAlignVertical="top"
                maxLength={MAX_CHARS}
              />
            </View>
          </View>

          {/* 無駄にした時間 */}
          <View style={styles.fieldContainer}>
            <View style={styles.labelContainer}>
              <Text style={styles.label}>{DIARY_QUESTIONS.wastedTime.label}</Text>
              <Text style={styles.charCount}>{wastedTime.length}/{MAX_CHARS}</Text>
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={wastedTime}
                onChangeText={setWastedTime}
                onFocus={() => scrollViewRef.current?.scrollTo({ y: 230, animated: true })}
                placeholder="例：SNSの見すぎ、意味のない会議など"
                placeholderTextColor={colors.text.secondary}
                multiline
                textAlignVertical="top"
                maxLength={MAX_CHARS}
              />
            </View>
          </View>

          {/* 明日の予定 */}
          <View style={styles.fieldContainer}>
            <View style={styles.labelContainer}>
              <Text style={styles.label}>{DIARY_QUESTIONS.tomorrow.label}</Text>
              <Text style={styles.charCount}>{tomorrow.length}/{MAX_CHARS}</Text>
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={tomorrow}
                onChangeText={setTomorrow}
                onFocus={() => scrollViewRef.current?.scrollTo({ y: 410, animated: true })}
                placeholder="例：早起きして読書、重要な仕事に取り組むなど"
                placeholderTextColor={colors.text.secondary}
                multiline
                textAlignVertical="top"
                maxLength={MAX_CHARS}
              />
            </View>
          </View>

          {/* 保存ボタン */}
          <Button
            title={isSaving ? '保存中...' : '記録する'}
            onPress={handleSave}
            disabled={isSaving}
            style={styles.saveButton}
          />
          </ScrollView>

          {/* カレンダーモーダル */}
          {showDatePicker && (
            Platform.OS === 'ios' ? (
            <Modal
              visible={showDatePicker}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowDatePicker(false)}
            >
              <TouchableWithoutFeedback onPress={() => setShowDatePicker(false)}>
                <View style={styles.modalOverlay}>
                  <TouchableWithoutFeedback>
                    <View style={styles.modalContent}>
                      <DateTimePicker
                        value={selectedDate}
                        mode="date"
                        display="inline"
                        onChange={handleDateChange}
                        maximumDate={new Date()}
                        locale="ja-JP"
                      />
                    </View>
                  </TouchableWithoutFeedback>
                </View>
              </TouchableWithoutFeedback>
            </Modal>
          ) : (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
              maximumDate={new Date()}
              locale="ja"
            />
          )
        )}
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
  innerContainer: {
    flex: 1,
  },
  backButton: {
    paddingTop: spacing.md,
    paddingLeft: spacing.padding.screen,
    paddingBottom: spacing.md,
  },
  backButtonText: {
    fontSize: fonts.size.body,
    color: colors.text.primary,
    fontFamily: fonts.family.regular,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  fieldContainer: {
    paddingHorizontal: spacing.padding.screen,
    marginBottom: spacing.xl,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: fonts.size.body,
    color: colors.text.primary,
    fontFamily: fonts.family.regular,
  },
  charCount: {
    fontSize: fonts.size.labelSmall,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.medium,
    borderWidth: spacing.borderWidth,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  calendarIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  dateInputText: {
    fontSize: fonts.size.body,
    color: colors.text.primary,
    fontFamily: fonts.family.regular,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.medium,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inputContainer: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.medium,
    borderWidth: spacing.borderWidth,
    borderColor: colors.border,
    minHeight: 120,
    padding: spacing.md,
  },
  textInput: {
    flex: 1,
    fontSize: fonts.size.body,
    color: colors.text.primary,
    fontFamily: fonts.family.regular,
    lineHeight: 22,
  },
  saveButton: {
    marginHorizontal: spacing.padding.screen,
    marginBottom: spacing.xxl * 2,
  },
});

export default DiaryEntryScreen;
