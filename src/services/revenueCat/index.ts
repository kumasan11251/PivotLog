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
import { REVENUECAT_API_KEY, ENTITLEMENT_ID } from '../../constants/revenueCat';

let isInitialized = false;

/**
 * RevenueCat SDKを初期化
 * APIキーが空の場合はスキップする（環境変数未設定時のクラッシュ防止）
 */
export async function initializeRevenueCat(): Promise<void> {
  if (isInitialized) return;

  if (!REVENUECAT_API_KEY) {
    console.warn('[RevenueCat] APIキーが設定されていません。SDK初期化をスキップします。');
    return;
  }

  try {
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    Purchases.configure({
      apiKey: REVENUECAT_API_KEY,
    });

    isInitialized = true;
  } catch (error) {
    console.error('[RevenueCat] SDK初期化に失敗しました:', error);
  }
}

/**
 * Firebase Auth UIDでRevenueCatユーザーを特定
 */
export async function identifyUser(userId: string): Promise<void> {
  if (!isInitialized) return;

  try {
    await Purchases.logIn(userId);
  } catch (error) {
    console.error('[RevenueCat] ユーザー特定に失敗しました:', error);
    throw error;
  }
}

/**
 * 現在のサブスクリプション状態を取得
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!isInitialized) return null;

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
  if (!isInitialized) return null;

  try {
    return await Purchases.getOfferings();
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
  if (!isInitialized) {
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
  if (!isInitialized) return null;

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
  if (!isInitialized) return () => {};
  return Purchases.addCustomerInfoUpdateListener(listener);
}

// 型の再エクスポート
export type { CustomerInfo, PurchasesOfferings, PurchasesPackage } from 'react-native-purchases';
export { PURCHASES_ERROR_CODE } from 'react-native-purchases';
