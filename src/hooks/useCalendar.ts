import { useMemo, useCallback } from 'react';
import { DiaryEntry } from '../utils/storage';

interface CalendarDay {
  day: number | null;
  hasDiary: boolean;
  dateString: string | null;
  isToday: boolean;
  isFuture: boolean;
  dayOfWeek: number;
}

interface CalendarWeek {
  days: CalendarDay[];
}

interface UseCalendarOptions {
  selectedYear: number;
  selectedMonth: number;
  filteredDiaries: DiaryEntry[];
  selectedDate: string | null;
  onSelectedDateChange: (date: string | null) => void;
}

interface UseCalendarReturn {
  weeks: CalendarWeek[];
  selectedDiary: DiaryEntry | null;
  handleDayPress: (day: number) => void;
  diaryCount: number;
}

export const useCalendar = ({
  selectedYear,
  selectedMonth,
  filteredDiaries,
  selectedDate,
  onSelectedDateChange,
}: UseCalendarOptions): UseCalendarReturn => {

  const weeks = useMemo(() => {
    const firstDay = new Date(selectedYear, selectedMonth - 1, 1);
    const lastDay = new Date(selectedYear, selectedMonth, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const diaryDates = new Set(
      filteredDiaries.map((d) => parseInt(d.date.split('-')[2], 10))
    );

    const today = new Date();
    const isCurrentMonth =
      selectedYear === today.getFullYear() && selectedMonth === today.getMonth() + 1;
    const todayDate = today.getDate();
    const todayEnd = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59,
      999,
    );

    const result: CalendarWeek[] = [];
    let currentWeek: CalendarDay[] = [];

    // 最初の週の空白
    for (let i = 0; i < startDayOfWeek; i++) {
      currentWeek.push({
        day: null,
        hasDiary: false,
        dateString: null,
        isToday: false,
        isFuture: false,
        dayOfWeek: i,
      });
    }

    // 日にちを埋める
    for (let day = 1; day <= daysInMonth; day++) {
      const dayOfWeek = (startDayOfWeek + day - 1) % 7;
      const monthStr = String(selectedMonth).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dateString = `${selectedYear}-${monthStr}-${dayStr}`;
      const target = new Date(selectedYear, selectedMonth - 1, day, 0, 0, 0, 0);

      currentWeek.push({
        day,
        hasDiary: diaryDates.has(day),
        dateString,
        isToday: isCurrentMonth && day === todayDate,
        isFuture: target > todayEnd,
        dayOfWeek,
      });

      if (currentWeek.length === 7) {
        result.push({ days: currentWeek });
        currentWeek = [];
      }
    }

    // 最後の週の空白
    if (currentWeek.length > 0) {
      let dayOfWeek = currentWeek.length;
      while (currentWeek.length < 7) {
        currentWeek.push({
          day: null,
          hasDiary: false,
          dateString: null,
          isToday: false,
          isFuture: false,
          dayOfWeek,
        });
        dayOfWeek++;
      }
      result.push({ days: currentWeek });
    }

    return result;
  }, [selectedYear, selectedMonth, filteredDiaries]);

  const selectedDiary = useMemo(() => {
    if (!selectedDate) return null;
    return filteredDiaries.find((d) => d.date === selectedDate) || null;
  }, [selectedDate, filteredDiaries]);

  const handleDayPress = useCallback((day: number) => {
    const monthStr = String(selectedMonth).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${selectedYear}-${monthStr}-${dayStr}`;

    // 未来日は選択不可
    const target = new Date(selectedYear, selectedMonth - 1, day, 0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    if (target > todayEnd) return;

    onSelectedDateChange(selectedDate === dateStr ? null : dateStr);
  }, [selectedYear, selectedMonth, selectedDate, onSelectedDateChange]);

  return {
    weeks,
    selectedDiary,
    handleDayPress,
    diaryCount: filteredDiaries.length,
  };
};
