import { useState, useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * OSの「視差効果を減らす」設定を監視する
 * 有効な場合は装飾的なアニメーションを省略する判断に使う
 */
export const useReduceMotion = (): boolean => {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(enabled);
      })
      .catch(() => {
        // 取得できない環境では通常どおりアニメーションする
      });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
};
