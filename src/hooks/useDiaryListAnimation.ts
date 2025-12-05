import { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';

interface UseDiaryListAnimationReturn {
  /** FlatListの再レンダリング用キー */
  listKey: number;
  /** アニメーションを実行すべきかどうかを返す */
  getShouldAnimate: () => boolean;
  /** 詳細画面への遷移を記録 */
  markNavigatedToDetail: () => void;
  /** 月変更時のアニメーショントリガー */
  triggerMonthChangeAnimation: () => void;
  /** ビューモード変更時のアニメーショントリガー */
  triggerViewModeChangeAnimation: () => void;
  /** 最初のアイテムレンダリング後にアニメーションフラグをリセット */
  resetAnimationFlag: () => void;
}

/**
 * 記録一覧のカードアニメーションを制御するフック
 *
 * アニメーションが発生するケース:
 * - 初回表示時
 * - ホーム画面からの遷移時
 * - カレンダー表示からリスト表示への切り替え時
 * - 月の切り替え時
 *
 * アニメーションをスキップするケース:
 * - 記録詳細画面から戻った時
 */
export const useDiaryListAnimation = (): UseDiaryListAnimationReturn => {
  // FlatListを強制的に再レンダリングするためのキー
  const [listKey, setListKey] = useState(0);

  // アニメーションを実行すべきかどうかのフラグ（初回表示時はアニメーションあり）
  const shouldAnimateRef = useRef(true);

  // 詳細画面に遷移したかどうかを追跡
  const navigatedToDetailRef = useRef(false);

  // 画面フォーカス時の処理（詳細画面から戻った時はアニメーションをスキップ）
  useFocusEffect(
    useCallback(() => {
      if (navigatedToDetailRef.current) {
        // 詳細画面から戻ってきた場合はアニメーションをスキップ
        navigatedToDetailRef.current = false;
        shouldAnimateRef.current = false;
        return;
      }
      // その他の場合はアニメーションを実行
      shouldAnimateRef.current = true;
      setListKey(prev => prev + 1);
    }, [])
  );

  /** アニメーションを実行すべきかどうかを返す */
  const getShouldAnimate = useCallback(() => {
    return shouldAnimateRef.current;
  }, []);

  /** 詳細画面への遷移を記録 */
  const markNavigatedToDetail = useCallback(() => {
    navigatedToDetailRef.current = true;
  }, []);

  /** 月変更時のアニメーショントリガー */
  const triggerMonthChangeAnimation = useCallback(() => {
    shouldAnimateRef.current = true;
    setListKey(prev => prev + 1);
  }, []);

  /** ビューモード変更時のアニメーショントリガー */
  const triggerViewModeChangeAnimation = useCallback(() => {
    shouldAnimateRef.current = true;
    setListKey(prev => prev + 1);
  }, []);

  /** 最初のアイテムレンダリング後にアニメーションフラグをリセット */
  const resetAnimationFlag = useCallback(() => {
    setTimeout(() => {
      shouldAnimateRef.current = false;
    }, 0);
  }, []);

  return {
    listKey,
    getShouldAnimate,
    markNavigatedToDetail,
    triggerMonthChangeAnimation,
    triggerViewModeChangeAnimation,
    resetAnimationFlag,
  };
};
