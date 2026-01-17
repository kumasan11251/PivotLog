/**
 * ウィジェット同期フック
 * アプリの状態変更時にウィジェットデータを自動同期
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { syncWidgetData } from '../utils/widgetStorage';

interface UseWidgetSyncOptions {
  /** 画面フォーカス時に同期するか（デフォルト: true） */
  syncOnFocus?: boolean;
  /** アプリがアクティブになった時に同期するか（デフォルト: true） */
  syncOnAppActive?: boolean;
  /** 手動同期のトリガー */
  syncTrigger?: number;
}

/**
 * ウィジェット同期フック
 * 画面フォーカス時やアプリアクティブ時に自動でウィジェットデータを同期
 */
export const useWidgetSync = (options: UseWidgetSyncOptions = {}): {
  syncNow: () => Promise<boolean>;
  lastSyncTime: Date | null;
} => {
  const {
    syncOnFocus = true,
    syncOnAppActive = true,
    syncTrigger,
  } = options;

  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // 同期実行
  const syncNow = useCallback(async (): Promise<boolean> => {
    try {
      const success = await syncWidgetData();
      if (success) {
        setLastSyncTime(new Date());
      }
      return success;
    } catch (error) {
      console.error('[useWidgetSync] Sync failed:', error);
      return false;
    }
  }, []);

  // 画面フォーカス時の同期
  useFocusEffect(
    useCallback(() => {
      if (syncOnFocus) {
        syncNow();
      }
    }, [syncOnFocus, syncNow])
  );

  // アプリ状態変更時の同期
  useEffect(() => {
    if (!syncOnAppActive) return;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // バックグラウンドからアクティブに戻った時に同期
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        syncNow();
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [syncOnAppActive, syncNow]);

  // 外部トリガーによる同期
  useEffect(() => {
    if (syncTrigger !== undefined && syncTrigger > 0) {
      // 非同期で実行してカスケードレンダーを防ぐ
      const doSync = async () => {
        try {
          const success = await syncWidgetData();
          if (success) {
            setLastSyncTime(new Date());
          }
        } catch (error) {
          console.error('[useWidgetSync] Sync failed:', error);
        }
      };
      doSync();
    }
  }, [syncTrigger]);

  return {
    syncNow,
    lastSyncTime,
  };
};

/**
 * 設定変更時にウィジェットを同期するフック
 * saveUserSettings などの後に呼び出す
 */
export const useSyncWidgetOnSettingsChange = (): {
  triggerSync: () => void;
} => {
  const triggerSync = useCallback(async () => {
    try {
      await syncWidgetData();
    } catch (error) {
      console.error('[useSyncWidgetOnSettingsChange] Sync failed:', error);
    }
  }, []);

  return { triggerSync };
};
