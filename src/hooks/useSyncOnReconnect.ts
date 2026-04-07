import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { processSyncQueue } from '../utils/syncQueue';

/**
 * オンライン復帰時に同期キューを処理するフック
 * - AppState変化: バックグラウンド→フォアグラウンド復帰時
 * - ネットワーク状態変化: 接続回復時
 */
export const useSyncOnReconnect = (): void => {
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    // AppState: バックグラウンド→フォアグラウンド復帰時
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        processSyncQueue().catch(() => {});
      }
      appStateRef.current = nextState;
    });

    // NetInfo: ネットワーク接続回復時
    const netInfoUnsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        processSyncQueue().catch(() => {});
      }
    });

    return () => {
      appStateSubscription.remove();
      netInfoUnsubscribe();
    };
  }, []);
};
