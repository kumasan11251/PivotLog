/**
 * Firebase Analytics サービス
 *
 * 計測イベントの型定義とロギングヘルパー。
 * D1/D7/D30継続率・DAUはFirebase Analyticsが自動計測するため、
 * ここではプロダクト固有の行動イベントのみを定義する。
 *
 * 方針:
 * - 日記の本文など、ユーザーが書いた内容は絶対に送信しない
 * - 計測失敗がアプリ動作に影響しないよう、エラーは握りつぶしてログのみ出す
 * - GA4はboolean型パラメータの扱いが不安定なため、フラグは 0 | 1 の数値で送る
 */
import analytics from '@react-native-firebase/analytics';

// アプリ内で使用するカスタムイベントの一覧。
// イベントを追加するときは必ずここに型を足すこと（呼び出し側で型チェックが効く）。
export type AnalyticsEventParams = {
  /** 日記の保存成功（自動保存含む）。is_new: その日の初回保存かどうか */
  diary_saved: { is_new: 0 | 1; filled_fields: number };
  /** AIリフレクションの生成リクエスト */
  ai_reflection_requested: undefined;
  /** ペイウォール表示。source: どの導線から来たか */
  paywall_viewed: { source: string };
  /** インサイトのチラ見せ（ぼかしプレビュー）表示 */
  insight_teaser_viewed: { type: 'weekly' | 'monthly' };
  /** 購入ボタンタップ */
  purchase_started: { plan: 'monthly' | 'annual' };
  /** 購入完了 */
  purchase_completed: { plan: 'monthly' | 'annual' };
  /** 購入キャンセル */
  purchase_cancelled: { plan: 'monthly' | 'annual' };
  /** オンボーディング完了。skipped: スキップボタン経由かどうか */
  onboarding_completed: { skipped: 0 | 1 };
  /** 初期設定（誕生日・目標寿命）完了 */
  initial_setup_completed: undefined;
  /** 通知タップでアプリを開いた。personalized: 前日の言葉の引用付き通知かどうか */
  notification_opened: { type: string; personalized: 0 | 1 };
  /**
   * リマインダーの再スケジュール（1回の再スケジュール＝1イベント）。
   * 発火前に組み直されて消える通知が分母に混ざるため、
   * 開封率は絶対値ではなく personalized 0/1 間の相対比較として読む
   */
  reminder_scheduled: { personalized: 0 | 1 };
  /** マイルストーン祝福演出の表示 */
  milestone_celebrated: { kind: 'streak' | 'total'; days: number };
  /** タイムホップ（あの日の自分）カードの展開 */
  timehop_viewed: { distance: 'week' | 'month' | 'year' };
};

/**
 * カスタムイベントを送信する（fire-and-forget）
 */
export function logAnalyticsEvent<K extends keyof AnalyticsEventParams>(
  name: K,
  ...args: AnalyticsEventParams[K] extends undefined ? [] : [AnalyticsEventParams[K]]
): void {
  const params = args[0];
  analytics()
    .logEvent(name, params)
    .catch(error => {
      console.error(`[analytics] イベント送信に失敗: ${name}`, error);
    });
}

/**
 * 画面表示を記録する（NavigationContainerのonStateChangeから呼ぶ）
 */
export function logScreenView(screenName: string): void {
  analytics()
    .logScreenView({ screen_name: screenName, screen_class: screenName })
    .catch(error => {
      console.error(`[analytics] screen_view送信に失敗: ${screenName}`, error);
    });
}

/**
 * ユーザープロパティを設定する（例: premium = 'true' | 'false'）
 * 継続率・イベントをセグメント比較するときの軸になる
 */
export function setAnalyticsUserProperty(name: string, value: string | null): void {
  analytics()
    .setUserProperty(name, value)
    .catch(error => {
      console.error(`[analytics] ユーザープロパティ設定に失敗: ${name}`, error);
    });
}
