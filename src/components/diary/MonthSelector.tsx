import React from 'react';
import PeriodSelectorBar, { type PeriodSelectorSegment } from '../common/PeriodSelectorBar';

type ViewMode = 'list' | 'calendar';

interface MonthSelectorProps {
  selectedYear: number;
  selectedMonth: number;
  viewMode: ViewMode;
  isNextDisabled: boolean;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onViewModeChange: (mode: ViewMode) => void;
  onMonthPress?: () => void;
}

const SEGMENTS: PeriodSelectorSegment<ViewMode>[] = [
  { value: 'list', icon: 'list', accessibilityLabel: 'リスト表示' },
  { value: 'calendar', icon: 'calendar', accessibilityLabel: 'カレンダー表示' },
];

/**
 * 記録一覧のヘッダー下バー（月ナビ ＋ リスト/カレンダー切り替え）
 * 見た目は習慣タブと共通の PeriodSelectorBar に委ねる
 */
const MonthSelector: React.FC<MonthSelectorProps> = ({
  selectedYear,
  selectedMonth,
  viewMode,
  isNextDisabled,
  onPreviousMonth,
  onNextMonth,
  onViewModeChange,
  onMonthPress,
}) => (
  <PeriodSelectorBar
    selectedYear={selectedYear}
    selectedMonth={selectedMonth}
    isNextDisabled={isNextDisabled}
    onPrevious={onPreviousMonth}
    onNext={onNextMonth}
    onMonthPress={onMonthPress}
    segments={SEGMENTS}
    value={viewMode}
    onChange={onViewModeChange}
  />
);

export default MonthSelector;
