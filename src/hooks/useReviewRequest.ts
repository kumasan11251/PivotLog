/**
 * アプリ内評価リクエスト（純正 StoreReview）の発火を管理するフック。
 *
 * 設計方針（plans/dl-growth/phase1-store-cvr-aso/phase1-review-prompt-spec-2026-07-03.md）:
 * - 純正 API（expo-store-review）のみを使用。独自UI・事前フィルタリングはしない。
 * - 呼び出しは「試行」であり表示保証はない。試行した事実のみ記録する。
 * - ホームのマイルストーン演出完了コールバック起点でのみ呼ぶ。
 * - 条件評価 → 1〜2秒遅延 → 遅延後に再度 isActive / isOffline を確認 → 履歴保存 →
 *   requestReview() の順で処理する。stale closure を避けるため最新値は ref で見る。
 */

import { useCallback, useEffect, useRef } from 'react';
import * as StoreReview from 'expo-store-review';
import Constants from 'expo-constants';
import { loadReviewPromptHistory, saveReviewPromptAttempt } from '../utils/storage';
import {
  isReviewPromptHistoryEligible,
  type ReviewPromptTrigger,
} from '../utils/reviewPrompt';

interface UseReviewRequestParams {
  /** ホームタブがアクティブか */
  isActive: boolean;
  /** オフラインか */
  isOffline: boolean;
}

interface UseReviewRequestReturn {
  /** 条件を満たせばレビュー依頼を試行する（マイルストーン演出完了コールバックから呼ぶ） */
  requestReviewIfEligible: (trigger: ReviewPromptTrigger) => Promise<void>;
}

/** 演出完了からダイアログ表示までの遅延（ミリ秒） */
const REQUEST_DELAY_MS = 1500;

const getCurrentAppVersion = (): string =>
  Constants.nativeApplicationVersion ?? Constants.expoConfig?.version ?? 'unknown';

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const useReviewRequest = ({
  isActive,
  isOffline,
}: UseReviewRequestParams): UseReviewRequestReturn => {
  // 遅延後の再チェックで stale closure を避けるため、最新値を ref に同期する
  const isActiveRef = useRef(isActive);
  const isOfflineRef = useRef(isOffline);
  // 同じ演出完了コールバックが短時間に複数回呼ばれても二重実行しないためのガード
  const inFlightRef = useRef(false);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    isOfflineRef.current = isOffline;
  }, [isOffline]);

  const requestReviewIfEligible = useCallback(
    async (trigger: ReviewPromptTrigger): Promise<void> => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      try {
        // --- 遅延前チェック ---
        if (!isActiveRef.current || isOfflineRef.current) return;

        // StoreReview の利用可否
        const isAvailable = await StoreReview.isAvailableAsync();
        if (!isAvailable) return;

        // 可能なら hasAction も確認（false なら呼ばない）
        try {
          const hasAction = await StoreReview.hasAction();
          if (!hasAction) return;
        } catch {
          // hasAction が使えない環境では isAvailable の結果で続行する
        }

        // 履歴ベースの eligibility（30日間隔・年3回・同一トリガー抑制）
        const history = await loadReviewPromptHistory();
        if (!isReviewPromptHistoryEligible(history, trigger, new Date())) return;

        // --- 1〜2秒遅延 ---
        await delay(REQUEST_DELAY_MS);

        // --- 遅延後の再チェック（タブ非アクティブ化・オフライン化を拾う） ---
        if (!isActiveRef.current || isOfflineRef.current) return;

        // 履歴を最新化して再評価（遅延中に別経路で試行された可能性に備える）
        const latestHistory = await loadReviewPromptHistory();
        if (!isReviewPromptHistoryEligible(latestHistory, trigger, new Date())) return;

        // 全ガード通過。requestReview() の直前に試行履歴を保存する。
        await saveReviewPromptAttempt({
          at: new Date().toISOString(),
          trigger,
          appVersion: getCurrentAppVersion(),
        });

        // 試行（表示保証なし・throw してもその場でリトライ連打しない）
        try {
          await StoreReview.requestReview();
        } catch (error) {
          console.error('[ReviewRequest] requestReview に失敗しました:', error);
        }
      } catch (error) {
        console.error('[ReviewRequest] レビュー依頼処理でエラー:', error);
      } finally {
        inFlightRef.current = false;
      }
    },
    [],
  );

  return { requestReviewIfEligible };
};
