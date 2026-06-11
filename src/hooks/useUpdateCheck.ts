import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { fetchAppVersionConfig } from '../services/firebase/appConfig';
import { isValidVersion, compareVersions } from '../utils/version';
import { loadSkippedUpdateVersion, saveSkippedUpdateVersion } from '../utils/storage';
import type { UpdateCheckResult } from '../types/appVersion';

/**
 * アプリアップデートの要否を起動時に1回だけチェックするフック
 *
 * 判定:
 * - 強制（先に評価）: 現在バージョン < minimumVersion（スキップ記録は無視）
 * - 任意: 現在バージョン < latestVersion かつ未スキップ
 *
 * 既知の制限: チェックはコールドスタート時のみ。アプリを何日もバックグラウンドに
 * 残したままだと強制アップデートが効かない。AppState の active 復帰時の再チェック
 * （24時間スロットル付き）は初版スコープ外とし、必要になったら追加する。
 */
export const useUpdateCheck = (): {
  result: UpdateCheckResult | null;
  dismissOptional: () => Promise<void>;
} => {
  const [result, setResult] = useState<UpdateCheckResult | null>(null);
  // マウント時1回だけ実行するガード
  const didCheckRef = useRef(false);

  useEffect(() => {
    if (didCheckRef.current) return;
    didCheckRef.current = true;

    // unmount 後の setState を避ける
    let cancelled = false;

    const check = async () => {
      // ストア配布された実バイナリの値を優先（OTAで上書きされる expoConfig より確実）
      const currentVersion =
        Constants.nativeApplicationVersion ?? Constants.expoConfig?.version;
      if (!currentVersion || !isValidVersion(currentVersion)) {
        return;
      }

      const config = await fetchAppVersionConfig();
      if (!config || cancelled) return;

      // プラットフォーム設定を選択（ios / android 以外、または該当設定なしならスキップ）
      const platformConfig =
        Platform.OS === 'ios' ? config.ios : Platform.OS === 'android' ? config.android : undefined;
      if (!platformConfig) return;

      // 強制判定（先に評価。minimum > latest という設定ミスでも安全側に倒れる）
      if (compareVersions(currentVersion, platformConfig.minimumVersion) < 0) {
        if (!cancelled) {
          setResult({
            status: 'forced',
            latestVersion: platformConfig.latestVersion,
            storeUrl: platformConfig.storeUrl,
            message: config.forcedMessage,
          });
        }
        return;
      }

      // 任意判定（スキップ済みの同バージョンには再表示しない）
      if (compareVersions(currentVersion, platformConfig.latestVersion) < 0) {
        const skippedVersion = await loadSkippedUpdateVersion();
        if (cancelled) return;
        if (skippedVersion !== platformConfig.latestVersion) {
          setResult({
            status: 'optional',
            latestVersion: platformConfig.latestVersion,
            storeUrl: platformConfig.storeUrl,
            message: config.message,
          });
        }
      }
    };

    check();

    return () => {
      cancelled = true;
    };
  }, []);

  // 「あとで」: スキップ記録を保存してから閉じる
  const dismissOptional = useCallback(async () => {
    if (result?.status === 'optional') {
      try {
        await saveSkippedUpdateVersion(result.latestVersion);
      } catch (error) {
        // 保存に失敗しても閉じる（「あとで」で閉じられない状態を避ける）
        console.error('[UpdateCheck] スキップ記録の保存に失敗しました:', error);
      }
    }
    setResult(null);
  }, [result]);

  return { result, dismissOptional };
};
