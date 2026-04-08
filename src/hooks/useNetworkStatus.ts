import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

/**
 * ネットワーク接続状態を監視するフック
 * isInternetReachable === null（初回取得前）はオンライン扱い
 */
export const useNetworkStatus = (): { isOffline: boolean } => {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // isInternetReachable が null の場合（初回取得前）はオンライン扱い
      const offline = state.isConnected === false || state.isInternetReachable === false;
      setIsOffline(offline);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return { isOffline };
};
