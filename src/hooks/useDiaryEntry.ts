import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  saveDiaryEntry,
  getDiaryByDate,
  deleteDiaryEntry,
  DiaryEntry,
  loadUserSettings,
} from '../utils/storage';
import { PLACEHOLDERS, ENCOURAGEMENT_MESSAGES, getDailyElement } from '../constants/diaryEntry';
import { getEffectiveToday } from '../utils/dateUtils';
import { cancelTodayReminderAndReschedule, clearBadge } from '../services/notification';

export type DiaryFieldKey = 'goodTime' | 'wastedTime' | 'tomorrow';
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface DiaryFormState {
  goodTime: string;
  wastedTime: string;
  tomorrow: string;
}

const EMPTY_FORM: DiaryFormState = { goodTime: '', wastedTime: '', tomorrow: '' };
const normalized = (form: DiaryFormState): DiaryFormState => ({
  goodTime: form.goodTime.trim(),
  wastedTime: form.wastedTime.trim(),
  tomorrow: form.tomorrow.trim(),
});
const formsEqual = (a: DiaryFormState, b: DiaryFormState) =>
  a.goodTime === b.goodTime && a.wastedTime === b.wastedTime && a.tomorrow === b.tomorrow;
const isEmpty = (form: DiaryFormState) => !form.goodTime && !form.wastedTime && !form.tomorrow;

export const useDiaryEntry = (
  dateString: string,
  initialFormState?: DiaryFormState,
  onFormStateChange?: (formState: DiaryFormState) => void
) => {
  const [formState, setFormState] = useState<DiaryFormState>(() => (
    initialFormState ? { ...initialFormState } : { ...EMPTY_FORM }
  ));
  const [focusedField, setFocusedField] = useState<DiaryFieldKey | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [isLoaded, setIsLoaded] = useState(initialFormState !== undefined);

  const formRef = useRef(formState);
  const savedRef = useRef<DiaryFormState>(normalized(formState));
  const mountedRef = useRef(true);
  const loadGenerationRef = useRef(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightSaveRef = useRef<Promise<boolean> | null>(null);
  const isLoadedRef = useRef(initialFormState !== undefined);
  const initializedFromCacheRef = useRef(initialFormState !== undefined);
  const onFormStateChangeRef = useRef(onFormStateChange);

  useEffect(() => {
    onFormStateChangeRef.current = onFormStateChange;
  }, [onFormStateChange]);

  const encouragement = useMemo(() => getDailyElement(ENCOURAGEMENT_MESSAGES, new Date()), []);
  const placeholders = useMemo(() => ({
    goodTime: getDailyElement(PLACEHOLDERS.goodTime, new Date(), 0),
    wastedTime: getDailyElement(PLACEHOLDERS.wastedTime, new Date(), 1),
    tomorrow: getDailyElement(PLACEHOLDERS.tomorrow, new Date(), 2),
  }), []);

  const progress = useMemo(() => {
    let count = 0;
    if (focusedField !== 'goodTime' && formState.goodTime.trim()) count++;
    if (focusedField !== 'wastedTime' && formState.wastedTime.trim()) count++;
    if (focusedField !== 'tomorrow' && formState.tomorrow.trim()) count++;
    return count;
  }, [formState, focusedField]);

  const setFieldValue = useCallback((field: DiaryFieldKey, value: string) => {
    setFormState(prev => {
      const next = { ...prev, [field]: value };
      formRef.current = next;
      onFormStateChangeRef.current?.(next);
      return next;
    });
  }, []);

  useEffect(() => {
    // 同じ画面内で読み込み済みの日付は、そのスナップショットをそのまま引き継ぐ。
    // 再取得すると、切替直後の入力を遅れて返ったデータで上書きする可能性がある。
    if (initializedFromCacheRef.current) return;

    const generation = ++loadGenerationRef.current;
    setIsLoaded(false);
    setSaveStatus('idle');

    void getDiaryByDate(dateString).then(existingDiary => {
      if (!mountedRef.current || generation !== loadGenerationRef.current) return;
      const loaded = existingDiary ? {
        goodTime: existingDiary.goodTime || '',
        wastedTime: existingDiary.wastedTime || '',
        tomorrow: existingDiary.tomorrow || '',
      } : { ...EMPTY_FORM };
      formRef.current = loaded;
      savedRef.current = normalized(loaded);
      setFormState(loaded);
      onFormStateChangeRef.current?.(loaded);
      isLoadedRef.current = true;
      setIsLoaded(true);
    }).catch(() => {
      if (!mountedRef.current || generation !== loadGenerationRef.current) return;
      setSaveStatus('error');
    });
  }, [dateString]);

  const saveLatest = useCallback(async (): Promise<boolean> => {
    if (!isLoadedRef.current) return true;
    if (inFlightSaveRef.current) await inFlightSaveRef.current;

    const run = async (): Promise<boolean> => {
      while (true) {
        const snapshot = normalized(formRef.current);
        if (formsEqual(snapshot, savedRef.current)) return true;
        if (mountedRef.current) setSaveStatus('saving');

        try {
          if (isEmpty(snapshot)) {
            await deleteDiaryEntry(dateString);
          } else {
            const now = new Date().toISOString();
            const entry: DiaryEntry = { id: dateString, date: dateString, ...snapshot, createdAt: now, updatedAt: now };
            await saveDiaryEntry(entry);

            const userSettings = await loadUserSettings();
            if (dateString === getEffectiveToday(userSettings?.dayStartHour ?? 0)) {
              try {
                await cancelTodayReminderAndReschedule();
                await clearBadge();
              } catch (notificationError) {
                console.error('日記保存後の通知更新に失敗しました', notificationError);
              }
            }
          }

          savedRef.current = snapshot;
          if (mountedRef.current) {
            setSaveStatus('saved');
            if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
            statusTimerRef.current = setTimeout(() => {
              if (mountedRef.current) setSaveStatus('idle');
            }, 2000);
          }
          if (formsEqual(normalized(formRef.current), snapshot)) return true;
        } catch (error) {
          console.error('日記の保存に失敗しました', error);
          if (mountedRef.current) setSaveStatus('error');
          return false;
        }
      }
    };

    const promise = run();
    inFlightSaveRef.current = promise;
    try {
      return await promise;
    } finally {
      if (inFlightSaveRef.current === promise) inFlightSaveRef.current = null;
    }
  }, [dateString]);

  const flushPendingSave = useCallback(async (): Promise<boolean> => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    return saveLatest();
  }, [saveLatest]);

  useEffect(() => {
    if (!isLoaded || formsEqual(normalized(formState), savedRef.current)) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void saveLatest();
    }, 800);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [formState, isLoaded, saveLatest]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    };
  }, []);

  return {
    formState,
    setFieldValue,
    focusedField,
    setFocusedField,
    saveStatus,
    isLoading: !isLoaded,
    isLoaded,
    progress,
    encouragement,
    placeholders,
    flushPendingSave,
  };
};
