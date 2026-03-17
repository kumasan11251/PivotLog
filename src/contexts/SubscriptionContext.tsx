/**
 * サブスクリプションコンテキスト
 *
 * アプリ全体でサブスクリプション状態を共有するためのContext
 * RevenueCat SDKと連携してサブスクリプション状態を管理
 * 開発時は手動でティアを切り替えてテスト可能
 */
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import type {
  SubscriptionTier,
  SubscriptionStatus,
  AIUsageLimits,
  RestoreResult,
} from '../types/subscription';
import { DEFAULT_AI_USAGE_LIMITS } from '../types/subscription';
import { useAuth } from './AuthContext';
import { COLLECTIONS } from '../services/firebase/config';
import {
  initializeRevenueCat,
  identifyUser,
  getCustomerInfo,
  isSubscriptionActive,
  extractSubscriptionDetails,
  restorePurchases as restorePurchasesService,
  addCustomerInfoUpdateListener,
} from '../services/revenueCat';

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
  /** 購入復元 */
  restorePurchases: () => Promise<RestoreResult>;
  /** 復元処理中かどうか */
  isRestoring: boolean;

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
  restorePurchases: async () => 'unavailable' as const,
  isRestoring: false,
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
  const [isRestoring, setIsRestoring] = useState(false);
  const [devOverrideTier, setDevOverrideTier] = useState<SubscriptionTier | null>(null);

  // stale closure防止用のref
  const devOverrideTierRef = useRef<SubscriptionTier | null>(null);
  // Firestore同期の冪等性チェック用
  const lastSyncedTierRef = useRef<SubscriptionTier | null>(null);

  /**
   * Firestoreにサブスクリプション状態を同期
   * 開発用オーバーライド中はスキップ（devSetTierが管理するため）
   * tier未変化時もスキップ（冪等性）
   */
  const syncSubscriptionToFirestore = useCallback(async (userId: string, newStatus: SubscriptionStatus): Promise<void> => {
    // 開発用オーバーライド中はFirestore同期をスキップ（devSetTierが管理するため）
    // ※ stale closure防止のため、stateではなくrefから読み取る
    if (__DEV_MODE__ && devOverrideTierRef.current !== null) return;
    if (lastSyncedTierRef.current === newStatus.tier) return;

    try {
      await firestore()
        .collection(COLLECTIONS.USERS)
        .doc(userId)
        .collection(COLLECTIONS.SUBSCRIPTION)
        .doc('status')
        .set({
          tier: newStatus.tier,
          isPremium: newStatus.isPremium,
          ...(newStatus.expiresAt && { expiresAt: newStatus.expiresAt }),
          ...(newStatus.isAutoRenewEnabled !== undefined && { isAutoRenewEnabled: newStatus.isAutoRenewEnabled }),
          ...(newStatus.platform && { platform: newStatus.platform }),
          updatedAt: newStatus.updatedAt || new Date().toISOString(),
        }, { merge: true });
      lastSyncedTierRef.current = newStatus.tier;
    } catch (error) {
      console.error('[Subscription] Firestoreへの同期に失敗:', error);
    }
  }, []);

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
            devOverrideTierRef.current = tier;
          }
        }
      } catch (error) {
        console.error('[Subscription] 開発用オーバーライドの読み込みに失敗:', error);
      }
    };

    loadDevOverride();
  }, []);

  // サブスクリプション状態を読み込み（RevenueCat連携）
  useEffect(() => {
    let cancelled = false;
    let removeListener: (() => void) | null = null;

    const loadSubscriptionStatus = async () => {
      if (!isAuthenticated || !user) {
        setStatus(defaultStatus);
        setIsLoading(false);
        return;
      }

      try {
        // SDK初期化（冪等。既に初期化済みなら即リターン）
        await initializeRevenueCat();

        // Firebase Auth UIDでRevenueCatユーザーを特定
        await identifyUser(user.uid);

        // サブスクリプション状態を取得
        const customerInfo = await getCustomerInfo();

        // SDK未初期化（APIキー未設定等）→ 無料ティアのまま、リスナー登録もスキップ
        if (!customerInfo) {
          if (!cancelled) {
            const freeStatus: SubscriptionStatus = {
              tier: 'free',
              isPremium: false,
              updatedAt: new Date().toISOString(),
            };
            setStatus(freeStatus);
            setIsLoading(false);
          }
          return;
        }

        if (cancelled) return;

        // プレミアム判定と状態構築
        const isPremium = isSubscriptionActive(customerInfo);
        const details = extractSubscriptionDetails(customerInfo);
        const newStatus: SubscriptionStatus = {
          tier: isPremium ? 'premium' : 'free',
          isPremium,
          ...details,
          updatedAt: new Date().toISOString(),
        };

        setStatus(newStatus);
        setIsLoading(false);

        // Firestoreに同期
        await syncSubscriptionToFirestore(user.uid, newStatus);

        // 初期化・identify完了後にリスナー登録
        removeListener = addCustomerInfoUpdateListener((info) => {
          if (cancelled) return;

          const listenerIsPremium = isSubscriptionActive(info);
          const listenerDetails = extractSubscriptionDetails(info);
          const listenerStatus: SubscriptionStatus = {
            tier: listenerIsPremium ? 'premium' : 'free',
            isPremium: listenerIsPremium,
            ...listenerDetails,
            updatedAt: new Date().toISOString(),
          };

          setStatus(listenerStatus);

          // Firestoreに同期（user.uidはクロージャでキャプチャ済み）
          syncSubscriptionToFirestore(user.uid, listenerStatus);
        });
      } catch (error) {
        console.error('[Subscription] サブスクリプション状態の取得に失敗:', error);
        if (!cancelled) {
          setStatus(defaultStatus);
          setIsLoading(false);
        }
      }
    };

    loadSubscriptionStatus();

    return () => {
      cancelled = true;
      removeListener?.();
    };
  }, [isAuthenticated, user, syncSubscriptionToFirestore]);

  // 購入復元
  const restorePurchases = useCallback(async (): Promise<RestoreResult> => {
    setIsRestoring(true);
    try {
      const customerInfo = await restorePurchasesService();
      if (!customerInfo) return 'unavailable';
      if (!isSubscriptionActive(customerInfo)) return 'not_found';

      const details = extractSubscriptionDetails(customerInfo);
      const newStatus: SubscriptionStatus = {
        tier: 'premium',
        isPremium: true,
        ...details,
        updatedAt: new Date().toISOString(),
      };

      setStatus(newStatus);

      // Firestoreに同期
      if (user) {
        await syncSubscriptionToFirestore(user.uid, newStatus);
      }

      return 'restored';
    } catch (error) {
      console.error('[Subscription] 購入復元に失敗:', error);
      return 'unavailable';
    } finally {
      setIsRestoring(false);
    }
  }, [user, syncSubscriptionToFirestore]);

  // 開発用: ティアを手動で設定（Firestoreも更新）
  const devSetTier = useCallback(async (tier: SubscriptionTier) => {
    if (!__DEV_MODE__) {
      console.warn('[Subscription] 開発モードでのみ使用可能です');
      return;
    }

    setDevOverrideTier(tier);
    devOverrideTierRef.current = tier;

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
    devOverrideTierRef.current = null;

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
    restorePurchases,
    isRestoring,
    isDevMode: __DEV_MODE__,
    devSetTier,
    devResetOverride,
    isDevOverrideActive: __DEV_MODE__ && devOverrideTier !== null,
  }), [status, effectiveTier, isLoading, restorePurchases, isRestoring, devSetTier, devResetOverride, devOverrideTier]);

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
