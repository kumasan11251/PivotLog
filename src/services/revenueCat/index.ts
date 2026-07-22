/**
 * RevenueCatサービス
 * サブスクリプション購入・復元・状態管理を提供
 */

import { Platform } from 'react-native';
import Purchases, {
  type CustomerInfo,
  type PurchasesOfferings,
  type PurchasesPackage,
  INTRO_ELIGIBILITY_STATUS,
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
} from 'react-native-purchases';
import { getRevenueCatApiKey, ENTITLEMENT_ID } from '../../constants/revenueCat';

/** purchasePackageの戻り値型 */
export type PurchasePackageResult = {
  customerInfo: CustomerInfo;
  source: 'purchase' | 'restored_from_receipt';
} | null;

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
    const { customerInfo, created } = await Purchases.logIn(userId);
    if (__DEV__) {
      console.log(`[RevenueCat] identifyUser完了: userId=${userId}, created=${created}`);
      console.log('[RevenueCat] identifyUser customerInfo:', {
        activeSubscriptions: customerInfo.activeSubscriptions,
        activeEntitlements: Object.keys(customerInfo.entitlements.active),
        allEntitlements: Object.keys(customerInfo.entitlements.all),
      });
    }
    if (created) {
      console.warn('[RevenueCat] 新規RevenueCatユーザーが作成されました。匿名時の購入が引き継がれていない可能性があります。');
    }
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

/** トライアル資格ステータスの生値（表示判定とアナリティクス記録の両方に使う） */
export type TrialEligibilityStatus =
  | 'eligible'
  | 'ineligible'
  | 'unknown'
  | 'no_intro_offer'
  | 'error';

/** 資格チェックのタイムアウト（ms）。超過時は全product 'error'＝非表示にフォールバック */
const ELIGIBILITY_CHECK_TIMEOUT_MS = 5000;

/** 指定時間内に解決しなければrejectするヘルパー */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`タイムアウト（${ms}ms）`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * product IDごとのトライアル資格ステータスを返す（iOS専用）
 * Androidの場合のみnullを返し、呼び出し側でintroPriceベースの判定に
 * フォールバックさせる。iOSでは失敗・タイムアウト時も必ずマップを返す
 * （全product 'error' ＝ トライアル文言は非表示に倒す）
 */
export async function getTrialEligibility(
  productIdentifiers: string[],
): Promise<Record<string, TrialEligibilityStatus> | null> {
  if (Platform.OS !== 'ios') return null;
  const errorResult = (): Record<string, TrialEligibilityStatus> =>
    Object.fromEntries(productIdentifiers.map((id) => [id, 'error']));
  if (!(await ensureInitialized())) return errorResult();
  try {
    const result = await withTimeout(
      Purchases.checkTrialOrIntroductoryPriceEligibility(productIdentifiers),
      ELIGIBILITY_CHECK_TIMEOUT_MS,
    );
    const statuses: Record<string, TrialEligibilityStatus> = {};
    for (const id of productIdentifiers) {
      switch (result[id]?.status) {
        case INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE:
          statuses[id] = 'eligible';
          break;
        case INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_INELIGIBLE:
          statuses[id] = 'ineligible';
          break;
        case INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_NO_INTRO_OFFER_EXISTS:
          statuses[id] = 'no_intro_offer';
          break;
        default:
          // UNKNOWN(0) と「結果にproductが含まれない」場合の両方をここで吸収
          statuses[id] = 'unknown';
      }
    }
    if (__DEV__) {
      console.log('[RevenueCat] トライアル資格チェック結果:', statuses);
    }
    return statuses;
  } catch (error) {
    console.error('[RevenueCat] トライアル資格チェックに失敗しました:', error);
    return errorResult();
  }
}

/**
 * パッケージ購入
 * @returns 購入成功時の { customerInfo, source }、キャンセル時はnull
 * RECEIPT_ALREADY_IN_USE_ERROR 発生時は自動でrestorePurchasesを試みる
 */
export async function purchasePackage(pkg: PurchasesPackage): Promise<PurchasePackageResult> {
  if (!(await ensureInitialized())) {
    throw new Error('RevenueCat SDKが初期化されていません');
  }

  try {
    if (__DEV__) {
      console.log('[RevenueCat] purchasePackage開始:', {
        packageId: pkg.identifier,
        productId: pkg.product.identifier,
        packageType: pkg.packageType,
        price: pkg.product.priceString,
      });
    }

    const { customerInfo } = await Purchases.purchasePackage(pkg);

    if (__DEV__) {
      console.log('[RevenueCat] purchasePackage完了:', {
        activeSubscriptions: customerInfo.activeSubscriptions,
        allPurchasedProductIdentifiers: customerInfo.allPurchasedProductIdentifiers,
        activeEntitlements: Object.keys(customerInfo.entitlements.active),
        allEntitlements: Object.keys(customerInfo.entitlements.all),
      });
    }

    return { customerInfo, source: 'purchase' };
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

    // レシートが別ユーザーに紐付いている場合、restorePurchasesで移転を試みる
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      ((error as { code: string }).code === PURCHASES_ERROR_CODE.RECEIPT_ALREADY_IN_USE_ERROR ||
       (error as { code: string }).code === PURCHASES_ERROR_CODE.RECEIPT_IN_USE_BY_OTHER_SUBSCRIBER_ERROR)
    ) {
      console.warn('[RevenueCat] レシートが別ユーザーに紐付いています。restorePurchasesで復元を試みます...');
      try {
        const restoredInfo = await Purchases.restorePurchases();
        console.log('[RevenueCat] restorePurchasesによる復元成功');
        return { customerInfo: restoredInfo, source: 'restored_from_receipt' };
      } catch (restoreError) {
        console.error('[RevenueCat] restorePurchasesによる復元も失敗:', restoreError);
        throw error; // 元のエラーをthrow
      }
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
 *
 * Entitlement `Premium` を単一の真実の情報源として使用する。
 * かつて activeSubscriptions によるフォールバックがあったが、
 * Sandbox で失効後も product ID が残ることがあり誤検知の温床だったため削除（不具合#3対応）
 */
export function isSubscriptionActive(info: CustomerInfo): boolean {
  if (__DEV__) {
    console.log('[RevenueCat] isSubscriptionActive判定:', {
      activeEntitlementKeys: Object.keys(info.entitlements.active),
      allEntitlementKeys: Object.keys(info.entitlements.all),
      activeSubscriptions: info.activeSubscriptions,
    });
  }

  return info.entitlements.active[ENTITLEMENT_ID] !== undefined;
}

/**
 * CustomerInfoからSubscriptionStatus用の情報を抽出
 * Entitlement未検出なら空オブジェクトを返す（不具合#3対応でフォールバック削除）
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
