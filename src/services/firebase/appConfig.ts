/**
 * アプリ設定（appConfig）の取得サービス
 * Firestore の公開ドキュメント appConfig/version から最新バージョン情報を取得する
 * 認証不要・起動時に1回だけ呼ばれる想定（失敗時は静かに諦める）
 */
import firestore from '@react-native-firebase/firestore';
import { COLLECTIONS } from './config';
import { isValidVersion } from '../../utils/version';
import type { AppVersionConfig, PlatformVersionConfig } from '../../types/appVersion';

// フェッチのタイムアウト（起動時チェックでアプリ利用をブロックしないため）
const FETCH_TIMEOUT_MS = 5000;

/**
 * 文字列フィールドを正規化する（文字列以外・空文字は undefined 扱い）
 */
const normalizeString = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  return undefined;
};

/**
 * プラットフォーム設定をバリデーションする
 * latestVersion / minimumVersion が妥当なバージョン文字列でなければ無効（undefined）
 */
const validatePlatformConfig = (value: unknown): PlatformVersionConfig | undefined => {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const { latestVersion, minimumVersion, storeUrl } = value as Record<string, unknown>;
  if (
    typeof latestVersion !== 'string' ||
    !isValidVersion(latestVersion) ||
    typeof minimumVersion !== 'string' ||
    !isValidVersion(minimumVersion)
  ) {
    return undefined;
  }
  return {
    latestVersion,
    minimumVersion,
    storeUrl: normalizeString(storeUrl),
  };
};

/**
 * 最新バージョン情報を取得する
 * タイムアウト・エラー・ドキュメント不在・バリデーション全滅時は null（throw しない）
 *
 * RN Firebase はオフライン永続化がデフォルト有効のため、オフライン時は
 * キャッシュにフォールバックする（一度フェッチ済みなら機内モードでも判定が動く）。
 * キャッシュなし＋オフラインのときだけエラー → null → スキップ。
 */
export const fetchAppVersionConfig = async (): Promise<AppVersionConfig | null> => {
  try {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('appConfig フェッチがタイムアウトしました')), FETCH_TIMEOUT_MS);
    });

    const doc = await Promise.race([
      firestore().collection(COLLECTIONS.APP_CONFIG).doc('version').get(),
      timeout,
    ]);

    const data = doc.data();
    if (typeof data !== 'object' || data === null) {
      return null;
    }

    const ios = validatePlatformConfig(data.ios);
    const android = validatePlatformConfig(data.android);

    // 両プラットフォームとも有効でない場合は設定なし扱い
    if (!ios && !android) {
      return null;
    }

    return {
      ios,
      android,
      message: normalizeString(data.message),
      forcedMessage: normalizeString(data.forcedMessage),
      updatedAt: normalizeString(data.updatedAt),
    };
  } catch (error) {
    // 起動時チェックは1回失敗したら静かに諦める（リトライで起動を遅らせない）
    console.warn('[AppConfig] バージョン情報の取得に失敗しました:', error);
    return null;
  }
};
