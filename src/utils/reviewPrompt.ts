/**
 * アプリ内評価リクエスト（純正 StoreReview）のトリガー導出と履歴ベースの
 * eligibility 判定を担う純粋関数群。
 *
 * 表示保証のない「試行」を管理する。実際に評価ダイアログが出たか・評価されたかは
 * OS からは取得できないため、ここでは「試行した事実」だけを扱う。
 */

/** レビュー依頼のトリガー種別 */
export type ReviewPromptTrigger = 'streak3' | 'total50' | 'total100';

/** レビュー依頼の試行1件 */
export interface ReviewPromptAttempt {
  /** 試行日時（ISO 8601） */
  at: string;
  /** トリガー種別 */
  trigger: ReviewPromptTrigger;
  /** 試行時のアプリバージョン（記録のみ。eligibility 除外条件には使わない） */
  appVersion: string;
}

/** レビュー依頼の試行履歴 */
export interface ReviewPromptHistory {
  attempts: ReviewPromptAttempt[];
}

/** 前回試行からの最短間隔（日） */
export const REVIEW_MIN_INTERVAL_DAYS = 30;
/** 直近365日で許容する最大試行回数 */
export const REVIEW_MAX_ATTEMPTS_PER_YEAR = 3;
/** 年次ウィンドウ（日） */
export const REVIEW_YEAR_WINDOW_DAYS = 365;

const DAY_MS = 24 * 60 * 60 * 1000;

const VALID_TRIGGERS: readonly ReviewPromptTrigger[] = ['streak3', 'total50', 'total100'];

/**
 * 達成マイルストーンからレビュー依頼トリガーを導出する。
 * 連続マイルストーンと累計マイルストーンが同時成立した場合は累計を優先する
 * （累計は通常一度しか成立しないが、streak3 は連続を切らして再開すると再成立しうるため）。
 *
 * @returns 対象トリガー、または対象外の場合 null
 */
export const deriveReviewPromptTrigger = (
  achievedMilestone: number | null,
  achievedTotalMilestone: number | null,
): ReviewPromptTrigger | null => {
  // 累計優先
  if (achievedTotalMilestone === 50) return 'total50';
  if (achievedTotalMilestone === 100) return 'total100';
  if (achievedMilestone === 3) return 'streak3';
  return null;
};

/**
 * malformed な履歴データを安全な形へ正規化する。
 * - attempts が配列でない → 空履歴
 * - 各要素は at が有効な日付・trigger が許可値・appVersion が文字列のものだけ残す
 */
export const normalizeReviewPromptHistory = (raw: unknown): ReviewPromptHistory => {
  if (!raw || typeof raw !== 'object') return { attempts: [] };
  const attemptsRaw = (raw as { attempts?: unknown }).attempts;
  if (!Array.isArray(attemptsRaw)) return { attempts: [] };

  const attempts: ReviewPromptAttempt[] = [];
  for (const item of attemptsRaw) {
    if (!item || typeof item !== 'object') continue;
    const { at, trigger, appVersion } = item as Record<string, unknown>;
    if (typeof at !== 'string' || Number.isNaN(new Date(at).getTime())) continue;
    if (typeof trigger !== 'string' || !VALID_TRIGGERS.includes(trigger as ReviewPromptTrigger)) {
      continue;
    }
    attempts.push({
      at,
      trigger: trigger as ReviewPromptTrigger,
      appVersion: typeof appVersion === 'string' ? appVersion : 'unknown',
    });
  }
  return { attempts };
};

/**
 * 履歴ベースで指定トリガーの試行が可能かを判定する。
 * すべての条件を満たす場合のみ true:
 * 1. 前回試行から REVIEW_MIN_INTERVAL_DAYS 以上経過
 * 2. 直近 REVIEW_YEAR_WINDOW_DAYS 日の試行回数が REVIEW_MAX_ATTEMPTS_PER_YEAR 未満
 * 3. 同一 trigger の試行が直近 REVIEW_YEAR_WINDOW_DAYS 日以内にない
 *
 * @param now 判定基準時刻
 */
export const isReviewPromptHistoryEligible = (
  history: ReviewPromptHistory,
  trigger: ReviewPromptTrigger,
  now: Date,
): boolean => {
  const nowMs = now.getTime();
  const attempts = history.attempts;

  // 1. 前回試行（全トリガー横断）から30日以上
  for (const attempt of attempts) {
    const atMs = new Date(attempt.at).getTime();
    if (Number.isNaN(atMs)) continue;
    if (nowMs - atMs < REVIEW_MIN_INTERVAL_DAYS * DAY_MS) {
      return false;
    }
  }

  // 直近365日ウィンドウ内の試行を抽出
  const withinYear = attempts.filter((attempt) => {
    const atMs = new Date(attempt.at).getTime();
    if (Number.isNaN(atMs)) return false;
    return nowMs - atMs < REVIEW_YEAR_WINDOW_DAYS * DAY_MS;
  });

  // 2. 年3回未満
  if (withinYear.length >= REVIEW_MAX_ATTEMPTS_PER_YEAR) {
    return false;
  }

  // 3. 同一トリガーが直近365日以内にない
  if (withinYear.some((attempt) => attempt.trigger === trigger)) {
    return false;
  }

  return true;
};
