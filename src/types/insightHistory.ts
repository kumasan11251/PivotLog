import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

export interface InsightHistoryItem {
  key: string;           // weekKey or monthKey
  title: string;         // "2026年 第5週" / "2026年2月"
  dateRange?: string;    // "1/27 〜 2/2"（週間のみ）
  summary?: string;      // 2行まで表示（ない場合は非表示）
  entryCount: number;
  tags?: Array<{ title: string }>;  // 週間のパターンタグ（月間はなし）
  iconName: IoniconsName;           // Ionicons名（型安全）
}
