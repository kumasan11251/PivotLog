/**
 * アプリバージョン情報の型定義
 * Firestore の appConfig/version ドキュメントとアップデートチェック結果
 */

/**
 * プラットフォーム別のバージョン設定
 */
export interface PlatformVersionConfig {
  /** 最新バージョン（任意アップデート告知の基準） */
  latestVersion: string;
  /** 最低バージョン（これ未満は強制アップデート） */
  minimumVersion: string;
  /** ストアURL（省略時はアプリ内定数を使用） */
  storeUrl?: string;
}

/**
 * Firestore appConfig/version ドキュメントの構造
 */
export interface AppVersionConfig {
  ios?: PlatformVersionConfig;
  android?: PlatformVersionConfig;
  /** 任意アップデート時の追加メッセージ */
  message?: string;
  /** 強制アップデート時の追加メッセージ */
  forcedMessage?: string;
  updatedAt?: string;
}

/**
 * アップデートチェックの判定結果ステータス
 */
export type UpdateCheckStatus = 'none' | 'optional' | 'forced';

/**
 * アップデートチェックの結果
 * 'none' の場合は result 自体を null で表現するため、ここには含めない
 */
export interface UpdateCheckResult {
  status: Exclude<UpdateCheckStatus, 'none'>;
  latestVersion: string;
  storeUrl?: string;
  message?: string;
}
