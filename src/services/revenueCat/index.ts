/**
 * RevenueCatサービス
 * サブスクリプション購入・復元・状態管理を提供
 */

import { Platform } from 'react-native';
import Purchases, {
  type CustomerInfo,
  type PurchasesOfferings,
  type PurchasesPackage,
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
} from 'react-native-purchases';
import { getRevenueCatApiKey, ENTITLEMENT_ID } from '../../constants/revenueCat';

let isInitialized = false;
let initializationPromise: Promise<void> | null = null;

/**
 * 初期化完了を待つ（他の関数からのフォールバック用）
 * initializeRevenueCat()が呼ばれていなければ自動で開始する
 */
export async function ensureInitialized(): Promise<boolean> {
  if (isInitialized) return true;
  if (initializationPromise) {
    await initializationPromise;
    return isInitialized;
  }
  // まだ誰も初期化を開始していない場合
  await initializeRevenueCat();
  return isInitialized;
}

/**
 * RevenueCat SDKを初期化
 * APIキーが空の場合はスキップする（環境変数未設定時のクラッシュ防止）
 * 複数箇所から呼ばれても安全（同一Promiseを返す）
 */
export function initializeRevenueCat(): Promise<void> {
  if (isInitialized) return Promise.resolve();
  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    console.log(`[RevenueCat] SDK初期化開始 (Platform: ${Platform.OS}, Version: ${Platform.Version})`);

    const apiKey = getRevenueCatApiKey();

    if (!apiKey) {
      console.warn('[RevenueCat] APIキーが設定されていません。SDK初期化をスキップします。');
      console.warn(`[RevenueCat] Platform: ${Platform.OS}, __DEV__: ${__DEV__}`);
      return;
    }

    try {
      if (__DEV__) {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      }

      console.log(`[RevenueCat] Purchases.configure() 呼び出し (APIキー先頭: ${apiKey.substring(0, 8)}...)`);
      Purchases.configure({
        apiKey,
      });

      isInitialized = true;
      console.log('[RevenueCat] SDK初期化完了');
    } catch (error) {
      console.error(`[RevenueCat] SDK初期化に失敗しました (Platform: ${Platform.OS}):`, error);
    } finally {
      // 初期化失敗時はPromiseをリセットして再試行可能にする
      if (!isInitialized) {
        initializationPromise = null;
      }
    }
  })();

  return initializationPromise;
}

/**
 * Firebase Auth UIDでRevenueCatユーザーを特定
 */
export async function identifyUser(userId: string): Promise<void> {
  if (!(await ensureInitialized())) return;

  try {
    await Purchases.logIn(userId);
  } catch (error) {
    console.error('[RevenueCat] ユーザー特定に失敗しました:', error);
    throw error;
  }
}

/**
 * CustomerInfoキャッシュを無効化
 * 次回getCustomerInfo()呼び出し時にサーバーから最新情報を取得する
 */
export async function invalidateCustomerInfoCache(): Promise<void> {
  if (!(await ensureInitialized())) return;

  try {
    Purchases.invalidateCustomerInfoCache();
    console.log('[RevenueCat] CustomerInfoキャッシュを無効化しました');
  } catch (error) {
    console.error('[RevenueCat] キャッシュ無効化に失敗しました:', error);
  }
}

/**
 * 現在のサブスクリプション状態を取得
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!(await ensureInitialized())) return null;

  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    console.error('[RevenueCat] 顧客情報の取得に失敗しました:', error);
    throw error;
  }
}

/**
 * 利用可能なプラン（月額・年額）を取得
 */
export async function getOfferings(): Promise<PurchasesOfferings | null> {
  if (!(await ensureInitialized())) return null;

  try {
    const offerings = await Purchases.getOfferings();
    if (__DEV__ && offerings && !offerings.current) {
      console.warn(
        '[RevenueCat] Offeringsは取得できましたが、currentがnullです。' +
        'RevenueCatダッシュボードで「Default」Offeringがcurrentに設定されているか確認してください。'
      );
    }
    return offerings;
  } catch (error) {
    console.error('[RevenueCat] Offering取得に失敗しました:', error);
    throw error;
  }
}

/**
 * パッケージ購入
 * @returns 購入成功時のCustomerInfo、キャンセル時はnull
 */
export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo | null> {
  if (!(await ensureInitialized())) {
    throw new Error('RevenueCat SDKが初期化されていません');
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  } catch (error: unknown) {
    // ユーザーキャンセルの場合はnullを返す
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
    ) {
      return null;
    }
    throw error;
  }
}

/**
 * 購入復元
 */
export async function restorePurchases(): Promise<CustomerInfo | null> {
  if (!(await ensureInitialized())) return null;

  try {
    return await Purchases.restorePurchases();
  } catch (error) {
    console.error('[RevenueCat] 購入復元に失敗しました:', error);
    throw error;
  }
}

/**
 * premiumエンタイトルメントのアクティブ判定
 */
export function isSubscriptionActive(info: CustomerInfo): boolean {
  return info.entitlements.active[ENTITLEMENT_ID] !== undefined;
}

/**
 * CustomerInfoからSubscriptionStatus用の情報を抽出
 */
export function extractSubscriptionDetails(info: CustomerInfo): {
  expiresAt?: string;
  isAutoRenewEnabled?: boolean;
  platform?: 'ios' | 'android';
} {
  const entitlement = info.entitlements.active[ENTITLEMENT_ID];
  if (!entitlement) return {};

  return {
    expiresAt: entitlement.expirationDate ?? undefined,
    isAutoRenewEnabled: !entitlement.willRenew ? false : true,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
  };
}

/**
 * ログアウト時のRevenueCatリセット
 */
export async function logoutRevenueCat(): Promise<void> {
  if (!isInitialized) return;

  try {
    await Purchases.logOut();
  } catch (error) {
    console.error('[RevenueCat] ログアウトに失敗しました:', error);
    throw error;
  }
}

/**
 * CustomerInfo更新リスナーの登録
 * @returns リスナー解除関数
 */
export function addCustomerInfoUpdateListener(
  listener: (info: CustomerInfo) => void,
): () => void {
  if (!isInitialized) {
    console.warn('[RevenueCat] SDK未初期化のためリスナー登録をスキップしました');
    return () => {};
  }
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => {
    Purchases.removeCustomerInfoUpdateListener(listener);
  };
}

// 型の再エクスポート
export type { CustomerInfo, PurchasesOfferings, PurchasesPackage } from 'react-native-purchases';
export { PURCHASES_ERROR_CODE } from 'react-native-purchases';
