import { useState, useEffect, useMemo, useCallback } from 'react';
import { loadDiaryEntries, DiaryEntry } from '../utils/storage';

interface UseDiaryListOptions {
  shouldRefresh?: boolean;
}

interface UseDiaryListReturn {
  diaries: DiaryEntry[];
  isLoading: boolean;
  selectedYear: number;
  selectedMonth: number;
  filteredDiaries: DiaryEntry[];
  isNextDisabled: boolean;
  selectedDate: string | null;
  setSelectedDate: (date: string | null) => void;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  loadDiaries: () => Promise<void>;
}

export const useDiaryList = ({ shouldRefresh }: UseDiaryListOptions = {}): UseDiaryListReturn => {
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const filteredDiaries = useMemo(() => {
    const monthStr = String(selectedMonth).padStart(2, '0');
    const prefix = `${selectedYear}-${monthStr}`;
    return diaries.filter((diary) => diary.date.startsWith(prefix));
  }, [diaries, selectedYear, selectedMonth]);

  const isNextDisabled = useMemo(() => {
    const now = new Date();
    return selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1;
  }, [selectedYear, selectedMonth]);

  const goToPreviousMonth = useCallback(() => {
    setSelectedDate(null);
    if (selectedMonth === 1) {
      setSelectedYear((prev) => prev - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  }, [selectedMonth]);

  const goToNextMonth = useCallback(() => {
    if (isNextDisabled) return;

    setSelectedDate(null);
    if (selectedMonth === 12) {
      setSelectedYear((prev) => prev + 1);
      setSelectedMonth(1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  }, [selectedMonth, isNextDisabled]);

  const loadDiaries = useCallback(async () => {
    setIsLoading(true);
    try {
      const entries = await loadDiaryEntries();
      setDiaries(entries);
    } catch (error) {
      console.error('日記の読み込みに失敗しました:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDiaries();
  }, [loadDiaries]);

  useEffect(() => {
    if (shouldRefresh) {
      loadDiaries();
    }
  }, [shouldRefresh, loadDiaries]);

  return {
    diaries,
    isLoading,
    selectedYear,
    selectedMonth,
    filteredDiaries,
    isNextDisabled,
    selectedDate,
    setSelectedDate,
    goToPreviousMonth,
    goToNextMonth,
    loadDiaries,
  };
};
