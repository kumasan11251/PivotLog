import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { DiaryEntryScreenNavigationProp, RootStackParamList } from '../types/navigation';
import { saveDiaryEntry, getDiaryByDate, deleteDiaryEntry, DiaryEntry } from '../utils/storage';
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

// 保存ステータスの型
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

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
  saveStatus: SaveStatus;
  showDatePicker: boolean;
  setShowDatePicker: (show: boolean) => void;

  // 計算値
  progress: number;
  encouragement: { emoji: string; title: string; subtitle: string };
  placeholders: Record<DiaryFieldKey, string>;

  // アクション
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
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  // 自動保存用のタイマーref
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 保存ステータス表示用のタイマーref
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 現在保存中かどうか
  const isSavingRef = useRef(false);

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
      // 日付変更時は保存ステータスをリセット
      setSaveStatus('idle');
    };
    loadDiary();
  }, [dateString]);

  // 自動保存処理
  const performAutoSave = useCallback(async (currentFormState: DiaryFormState) => {
    // 全て空欄の場合は保存しない（既存エントリがあれば削除）
    const isEmpty = !currentFormState.goodTime.trim() &&
                    !currentFormState.wastedTime.trim() &&
                    !currentFormState.tomorrow.trim();

    if (isEmpty) {
      // 既存エントリがあった場合は削除
      if (initialFormState.goodTime.trim() || initialFormState.wastedTime.trim() || initialFormState.tomorrow.trim()) {
        try {
          await deleteDiaryEntry(dateString);
          setInitialFormState({ goodTime: '', wastedTime: '', tomorrow: '' });
        } catch {
          console.error('日記の削除に失敗しました');
        }
      }
      setSaveStatus('idle');
      return;
    }

    // 変更がない場合は保存しない
    const hasChanges =
      currentFormState.goodTime.trim() !== initialFormState.goodTime.trim() ||
      currentFormState.wastedTime.trim() !== initialFormState.wastedTime.trim() ||
      currentFormState.tomorrow.trim() !== initialFormState.tomorrow.trim();

    if (!hasChanges) {
      setSaveStatus('idle');
      return;
    }

    // 保存中フラグを立てる
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setSaveStatus('saving');

    try {
      const now = new Date().toISOString();
      const entry: DiaryEntry = {
        id: dateString,
        date: dateString,
        goodTime: currentFormState.goodTime.trim(),
        wastedTime: currentFormState.wastedTime.trim(),
        tomorrow: currentFormState.tomorrow.trim(),
        createdAt: now,
        updatedAt: now,
      };

      await saveDiaryEntry(entry);

      // 保存成功後、初期値を更新
      setInitialFormState({
        goodTime: currentFormState.goodTime.trim(),
        wastedTime: currentFormState.wastedTime.trim(),
        tomorrow: currentFormState.tomorrow.trim(),
      });

      setSaveStatus('saved');

      // 2秒後に「保存済み」表示を消す
      if (statusTimerRef.current) {
        clearTimeout(statusTimerRef.current);
      }
      statusTimerRef.current = setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);

    } catch {
      setSaveStatus('error');
      console.error('自動保存に失敗しました');
    } finally {
      isSavingRef.current = false;
    }
  }, [dateString, initialFormState]);

  // フォーム変更時のデバウンス付き自動保存
  useEffect(() => {
    // 初回ロード時は自動保存しない
    if (initialFormState.goodTime === '' &&
        initialFormState.wastedTime === '' &&
        initialFormState.tomorrow === '' &&
        formState.goodTime === '' &&
        formState.wastedTime === '' &&
        formState.tomorrow === '') {
      return;
    }

    // 既存のタイマーをクリア
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // 800ms後に自動保存
    saveTimerRef.current = setTimeout(() => {
      performAutoSave(formState);
    }, 800);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [formState, performAutoSave, initialFormState]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      if (statusTimerRef.current) {
        clearTimeout(statusTimerRef.current);
      }
    };
  }, []);

  // 戻るボタン処理（自動保存なので確認不要）
  const handleBack = useCallback(() => {
    // 保存中の場合は即座に保存を実行
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      performAutoSave(formState);
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // ディープリンク経由でスタックが空の場合はHomeへ遷移
      navigation.navigate('Home');
    }
  }, [formState, navigation, performAutoSave]);

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
    saveStatus,
    showDatePicker,
    setShowDatePicker,
    progress,
    encouragement,
    placeholders,
    handleBack,
    handleDateChange,
  };
};
