/**
 * サブスクリプションコンテキスト
 *
 * アプリ全体でサブスクリプション状態を共有するためのContext
 * 開発時は手動でティアを切り替えてテスト可能
 */
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import type {
  SubscriptionTier,
  SubscriptionStatus,
  AIUsageLimits,
} from '../types/subscription';
import { DEFAULT_AI_USAGE_LIMITS } from '../types/subscription';
import { useAuth } from './AuthContext';
import { COLLECTIONS } from '../services/firebase/config';

// 開発モードフラグ（リリース時はfalseに）
const __DEV_MODE__ = __DEV__;

// AsyncStorageのキー（開発用オーバーライド保存用）
const DEV_SUBSCRIPTION_OVERRIDE_KEY = '@pivot_log_dev_subscription_override';

interface SubscriptionContextType {
  /** 現在のサブスクリプション状態 */
  status: SubscriptionStatus;
  /** プレミアムかどうか（ショートカット） */
  isPremium: boolean;
  /** 現在のティア */
  tier: SubscriptionTier;
  /** AI機能の利用制限設定 */
  limits: AIUsageLimits;
  /** ローディング中かどうか */
  isLoading: boolean;

  // === 開発用機能 ===
  /** 開発モードが有効かどうか */
  isDevMode: boolean;
  /** 開発用: ティアを手動で切り替え */
  devSetTier: (tier: SubscriptionTier) => void;
  /** 開発用: オーバーライドをリセット */
  devResetOverride: () => void;
  /** 開発用: 現在オーバーライドが有効か */
  isDevOverrideActive: boolean;
}

const defaultStatus: SubscriptionStatus = {
  tier: 'free',
  isPremium: false,
};

const SubscriptionContext = createContext<SubscriptionContextType>({
  status: defaultStatus,
  isPremium: false,
  tier: 'free',
  limits: DEFAULT_AI_USAGE_LIMITS,
  isLoading: true,
  isDevMode: false,
  devSetTier: () => {},
  devResetOverride: () => {},
  isDevOverrideActive: false,
});

interface SubscriptionProviderProps {
  children: React.ReactNode;
}

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({
  children,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>(defaultStatus);
  const [isLoading, setIsLoading] = useState(true);
  const [devOverrideTier, setDevOverrideTier] = useState<SubscriptionTier | null>(null);

  // 開発用オーバーライドを読み込み
  useEffect(() => {
    const loadDevOverride = async () => {
      if (!__DEV_MODE__) return;

      try {
        const stored = await AsyncStorage.getItem(DEV_SUBSCRIPTION_OVERRIDE_KEY);
        if (stored) {
          const tier = stored as SubscriptionTier;
          if (tier === 'free' || tier === 'premium') {
            setDevOverrideTier(tier);
          }
        }
      } catch (error) {
        console.error('[Subscription] 開発用オーバーライドの読み込みに失敗:', error);
      }
    };

    loadDevOverride();
  }, []);

  // サブスクリプション状態を読み込み
  useEffect(() => {
    const loadSubscriptionStatus = async () => {
      if (!isAuthenticated || !user) {
        setStatus(defaultStatus);
        setIsLoading(false);
        return;
      }

      try {
        // TODO: 本番では Firestore または RevenueCat から取得
        // 現在は開発用のデフォルト値を使用

        // 将来的な実装例:
        // const userDoc = await firestore()
        //   .collection('users')
        //   .doc(user.uid)
        //   .collection('subscription')
        //   .doc('status')
        //   .get();
        // const data = userDoc.data();

        // 現時点ではデフォルトの無料プランを設定
        setStatus({
          tier: 'free',
          isPremium: false,
          updatedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error('[Subscription] サブスクリプション状態の取得に失敗:', error);
        setStatus(defaultStatus);
      } finally {
        setIsLoading(false);
      }
    };

    loadSubscriptionStatus();
  }, [isAuthenticated, user]);

  // 開発用: ティアを手動で設定（Firestoreも更新）
  const devSetTier = useCallback(async (tier: SubscriptionTier) => {
    if (!__DEV_MODE__) {
      console.warn('[Subscription] 開発モードでのみ使用可能です');
      return;
    }

    setDevOverrideTier(tier);

    try {
      // AsyncStorageに保存（ローカル状態用）
      await AsyncStorage.setItem(DEV_SUBSCRIPTION_OVERRIDE_KEY, tier);

      // Firestoreにも保存（Cloud Functions用）
      if (user) {
        await firestore()
          .collection(COLLECTIONS.USERS)
          .doc(user.uid)
          .collection(COLLECTIONS.SUBSCRIPTION)
          .doc('status')
          .set({
            tier,
            isPremium: tier === 'premium',
            updatedAt: new Date().toISOString(),
            // 開発用フラグ
            __devOverride: true,
          }, { merge: true });
        console.log(`[Subscription] Firestoreのティアも ${tier} に更新しました`);
      }
    } catch (error) {
      console.error('[Subscription] 開発用オーバーライドの保存に失敗:', error);
    }

    console.log(`[Subscription] 開発用ティアを ${tier} に設定しました`);
  }, [user]);

  // 開発用: オーバーライドをリセット（Firestoreも更新）
  const devResetOverride = useCallback(async () => {
    if (!__DEV_MODE__) return;

    setDevOverrideTier(null);

    try {
      // AsyncStorageから削除
      await AsyncStorage.removeItem(DEV_SUBSCRIPTION_OVERRIDE_KEY);

      // Firestoreも無料プランにリセット
      if (user) {
        await firestore()
          .collection(COLLECTIONS.USERS)
          .doc(user.uid)
          .collection(COLLECTIONS.SUBSCRIPTION)
          .doc('status')
          .set({
            tier: 'free',
            isPremium: false,
            updatedAt: new Date().toISOString(),
            __devOverride: false,
          }, { merge: true });
        console.log('[Subscription] Firestoreのティアを free にリセットしました');
      }
    } catch (error) {
      console.error('[Subscription] 開発用オーバーライドの削除に失敗:', error);
    }

    console.log('[Subscription] 開発用オーバーライドをリセットしました');
  }, [user]);

  // 実効ティア（開発用オーバーライドがあればそちらを優先）
  const effectiveTier = useMemo((): SubscriptionTier => {
    if (__DEV_MODE__ && devOverrideTier !== null) {
      return devOverrideTier;
    }
    return status.tier;
  }, [status.tier, devOverrideTier]);

  const value = useMemo((): SubscriptionContextType => ({
    status: {
      ...status,
      tier: effectiveTier,
      isPremium: effectiveTier === 'premium',
    },
    isPremium: effectiveTier === 'premium',
    tier: effectiveTier,
    limits: DEFAULT_AI_USAGE_LIMITS,
    isLoading,
    isDevMode: __DEV_MODE__,
    devSetTier,
    devResetOverride,
    isDevOverrideActive: __DEV_MODE__ && devOverrideTier !== null,
  }), [status, effectiveTier, isLoading, devSetTier, devResetOverride, devOverrideTier]);

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

/**
 * サブスクリプション状態を取得するカスタムフック
 */
export const useSubscription = (): SubscriptionContextType => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export default SubscriptionContext;
