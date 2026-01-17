import { useState, useEffect, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { DiaryEntryScreenNavigationProp, RootStackParamList } from '../types/navigation';
import { saveDiaryEntry, getDiaryByDate, DiaryEntry } from '../utils/storage';
import {
  PLACEHOLDERS,
  ENCOURAGEMENT_MESSAGES,
  getDailyElement,
} from '../constants/diaryEntry';
import { formatDateToString } from '../utils/dateUtils';
import * as Haptics from 'expo-haptics';

type DiaryEntryScreenRouteProp = RouteProp<RootStackParamList, 'DiaryEntry'>;

export type DiaryFieldKey = 'goodTime' | 'wastedTime' | 'tomorrow';

interface DiaryFormState {
  goodTime: string;
  wastedTime: string;
  tomorrow: string;
}

interface UseDiaryEntryReturn {
  // フォーム状態
  formState: DiaryFormState;
  setFieldValue: (field: DiaryFieldKey, value: string) => void;

  // 日付
  selectedDate: Date;
  dateString: string;
  changeDate: (days: number) => void;
  setSelectedDate: (date: Date) => void;
  isToday: boolean;

  // UI状態
  focusedField: DiaryFieldKey | null;
  setFocusedField: (field: DiaryFieldKey | null) => void;
  isSaving: boolean;
  showDatePicker: boolean;
  setShowDatePicker: (show: boolean) => void;

  // 計算値
  progress: number;
  encouragement: { emoji: string; title: string; subtitle: string };
  placeholders: Record<DiaryFieldKey, string>;

  // アクション
  handleSave: () => Promise<void>;
  handleBack: () => void;
  handleDateChange: (event: unknown, date?: Date) => void;
}

export const useDiaryEntry = (): UseDiaryEntryReturn => {
  const navigation = useNavigation<DiaryEntryScreenNavigationProp>();
  const route = useRoute<DiaryEntryScreenRouteProp>();
  const { initialDate } = route.params || {};

  // フォーム状態
  const [formState, setFormState] = useState<DiaryFormState>({
    goodTime: '',
    wastedTime: '',
    tomorrow: '',
  });

  // 初期値（変更検出用）
  const [initialFormState, setInitialFormState] = useState<DiaryFormState>({
    goodTime: '',
    wastedTime: '',
    tomorrow: '',
  });

  // 日付状態
  const [selectedDate, setSelectedDate] = useState(() => {
    if (initialDate) {
      return new Date(initialDate);
    }
    return new Date();
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  // UI状態
  const [focusedField, setFocusedField] = useState<DiaryFieldKey | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 選択された日付をYYYY-MM-DD形式に変換（ローカル時間基準）
  const dateString = formatDateToString(selectedDate);

  // 今日かどうか
  const isToday = new Date(selectedDate).toDateString() === new Date().toDateString();

  // 励ましメッセージ（今日の日付ベースで固定 - 同じ日なら常に同じメッセージ）
  const encouragement = useMemo(() => {
    const today = new Date();
    return getDailyElement(ENCOURAGEMENT_MESSAGES, today);
  }, []);

  // ランダムプレースホルダー（今日の日付ベースで固定 - 同じ日なら常に同じプレースホルダー）
  const placeholders = useMemo(() => {
    const today = new Date();
    return {
      goodTime: getDailyElement(PLACEHOLDERS.goodTime, today, 0),
      wastedTime: getDailyElement(PLACEHOLDERS.wastedTime, today, 1),
      tomorrow: getDailyElement(PLACEHOLDERS.tomorrow, today, 2),
    };
  }, []);

  // 進捗計算
  const progress = useMemo(() => {
    let count = 0;
    if (focusedField !== 'goodTime' && formState.goodTime.trim()) count++;
    if (focusedField !== 'wastedTime' && formState.wastedTime.trim()) count++;
    if (focusedField !== 'tomorrow' && formState.tomorrow.trim()) count++;
    return count;
  }, [formState, focusedField]);

  // フィールド値の更新
  const setFieldValue = useCallback((field: DiaryFieldKey, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  }, []);

  // 日付を前日/翌日に変更
  const changeDate = useCallback((days: number) => {
    setSelectedDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(newDate.getDate() + days);

      // 未来の日付は選択できない
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (newDate > today) return prevDate;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return newDate;
    });
  }, []);

  // 日付変更ハンドラー
  const handleDateChange = useCallback((_event: unknown, date?: Date) => {
    if (date) {
      setSelectedDate(date);
    }
  }, []);

  // 日記データの読み込み
  useEffect(() => {
    const loadDiary = async () => {
      const existingDiary = await getDiaryByDate(dateString);
      if (existingDiary) {
        const loadedState = {
          goodTime: existingDiary.goodTime || '',
          wastedTime: existingDiary.wastedTime || '',
          tomorrow: existingDiary.tomorrow || '',
        };
        setFormState(loadedState);
        setInitialFormState(loadedState);
      } else {
        const emptyState = { goodTime: '', wastedTime: '', tomorrow: '' };
        setFormState(emptyState);
        setInitialFormState(emptyState);
      }
    };
    loadDiary();
  }, [dateString]);

  // 保存処理
  const handleSave = useCallback(async () => {
    if (!formState.goodTime.trim() && !formState.wastedTime.trim() && !formState.tomorrow.trim()) {
      Alert.alert('エラー', '少なくとも1つの質問に回答してください');
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const entry: DiaryEntry = {
        id: dateString,
        date: dateString,
        goodTime: formState.goodTime.trim(),
        wastedTime: formState.wastedTime.trim(),
        tomorrow: formState.tomorrow.trim(),
        createdAt: now,
        updatedAt: now,
      };

      await saveDiaryEntry(entry);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('保存完了', '記録を保存しました', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('エラー', '保存に失敗しました。もう一度お試しください。');
    } finally {
      setIsSaving(false);
    }
  }, [formState, dateString, navigation]);

  // 戻るボタン処理
  const handleBack = useCallback(() => {
    const hasChanges =
      formState.goodTime.trim() !== initialFormState.goodTime.trim() ||
      formState.wastedTime.trim() !== initialFormState.wastedTime.trim() ||
      formState.tomorrow.trim() !== initialFormState.tomorrow.trim();

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
  }, [formState, initialFormState, navigation]);

  return {
    formState,
    setFieldValue,
    selectedDate,
    dateString,
    changeDate,
    setSelectedDate,
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
  };
};
