import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { loadDiaryEntriesByMonth, DiaryEntry } from '../utils/storage';

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
  setYearMonth: (year: number, month: number) => void;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  loadDiaries: () => Promise<void>;
  removeDiaryFromCache: (id: string) => void;
}

// 月別キャッシュの型
interface MonthCache {
  [key: string]: DiaryEntry[]; // key: "2025-12" format
}

export const useDiaryList = ({ shouldRefresh }: UseDiaryListOptions = {}): UseDiaryListReturn => {
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // 月別キャッシュ（コンポーネントのライフサイクル中保持）
  const cacheRef = useRef<MonthCache>({});

  // キャッシュキーを生成
  const getCacheKey = useCallback((year: number, month: number) => {
    return `${year}-${String(month).padStart(2, '0')}`;
  }, []);

  // 現在の月のキャッシュキー
  const currentCacheKey = useMemo(() => getCacheKey(selectedYear, selectedMonth), [getCacheKey, selectedYear, selectedMonth]);

  // 現在表示中の日記（キャッシュから取得）
  const filteredDiaries = useMemo(() => {
    return cacheRef.current[currentCacheKey] || diaries;
  }, [currentCacheKey, diaries]);

  const isNextDisabled = useMemo(() => {
    const now = new Date();
    return selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1;
  }, [selectedYear, selectedMonth]);

  // 月別データを読み込む（キャッシュ優先）
  const loadMonthData = useCallback(async (year: number, month: number, forceRefresh = false) => {
    const cacheKey = getCacheKey(year, month);

    // キャッシュがあり、強制リフレッシュでなければキャッシュを使用
    if (!forceRefresh && cacheRef.current[cacheKey]) {
      setDiaries(cacheRef.current[cacheKey]);
      return;
    }

    setIsLoading(true);
    try {
      const entries = await loadDiaryEntriesByMonth(year, month);
      // キャッシュに保存
      cacheRef.current[cacheKey] = entries;
      setDiaries(entries);
    } catch (error) {
      console.error('日記の読み込みに失敗しました:', error);
    } finally {
      setIsLoading(false);
    }
  }, [getCacheKey]);

  // 現在の月を再読み込み（pull-to-refresh用）
  const loadDiaries = useCallback(async () => {
    await loadMonthData(selectedYear, selectedMonth, true);
  }, [loadMonthData, selectedYear, selectedMonth]);

  // キャッシュから特定の日記を削除（UI即時反映用）
  const removeDiaryFromCache = useCallback((id: string) => {
    // 全てのキャッシュから該当IDを削除
    Object.keys(cacheRef.current).forEach((key) => {
      cacheRef.current[key] = cacheRef.current[key].filter((diary) => diary.id !== id);
    });

    // 現在表示中のdiariesも更新
    setDiaries((prev) => prev.filter((diary) => diary.id !== id));
  }, []);

  const setYearMonth = useCallback(
    (year: number, month: number) => {
      if (Number.isNaN(year) || Number.isNaN(month)) return;
      if (month < 1 || month > 12) return;

      const today = new Date();
      const target = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);
      if (target > thisMonth) {
        setSelectedYear(today.getFullYear());
        setSelectedMonth(today.getMonth() + 1);
        setSelectedDate(null);
        return;
      }

      setSelectedDate(null);
      setSelectedYear(year);
      setSelectedMonth(month);
    },
    []
  );

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

  // 月が変わったらその月のデータを読み込む
  useEffect(() => {
    loadMonthData(selectedYear, selectedMonth);
  }, [loadMonthData, selectedYear, selectedMonth]);

  // shouldRefresh が true になったら現在の月のキャッシュを無効化して再読み込み
  useEffect(() => {
    if (shouldRefresh) {
      // 現在の月のキャッシュを無効化
      const cacheKey = getCacheKey(selectedYear, selectedMonth);
      delete cacheRef.current[cacheKey];
      loadMonthData(selectedYear, selectedMonth, true);
    }
  }, [shouldRefresh, getCacheKey, loadMonthData, selectedYear, selectedMonth]);

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
    setYearMonth,
    removeDiaryFromCache,
  };
};
