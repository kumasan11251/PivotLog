import { useState, useCallback, useMemo } from 'react';
import { Animated, Alert } from 'react-native';
import type { AIReflectionData, AIReflectionState } from '../types/aiReflection';
import type { UsageLimitReason } from '../types/subscription';
import { getDiaryByDate, saveDiaryEntry, DiaryEntry, loadUserSettings } from '../utils/storage';
import { generateReflection } from '../services/ai';
import { calculateCurrentAge, calculateTimeLeft } from '../utils/timeCalculations';

interface UseAIReflectionProps {
  dateString: string;
  formState: {
    goodTime: string;
    wastedTime: string;
    tomorrow: string;
  };
  /** 利用制限チェック後のコールバック */
  onLimitReached?: (reason: UsageLimitReason) => void;
}

/** 拡張されたAIリフレクションの状態 */
export type ExtendedAIReflectionState = AIReflectionState | 'limit_reached';

interface UseAIReflectionReturn {
  /** AIリフレクションの状態 */
  reflectionState: ExtendedAIReflectionState;
  /** AIリフレクションのデータ */
  reflection: AIReflectionData | null;
  /** フェードインアニメーション用の値 */
  fadeAnim: Animated.Value;
  /** AIリフレクションを取得する */
  getReflection: () => Promise<void>;
  /** 保存済みのリフレクションを読み込む */
  loadSavedReflection: () => Promise<void>;
  /** リフレクションをリセットする */
  resetReflection: () => void;
  /** 最後に発生した利用制限の理由 */
  lastLimitReason: UsageLimitReason | null;
}

/**
 * AIリフレクション機能を管理するカスタムフック
 */
export const useAIReflection = ({
  dateString,
  formState,
  onLimitReached,
}: UseAIReflectionProps): UseAIReflectionReturn => {
  const [reflectionState, setReflectionState] = useState<ExtendedAIReflectionState>('idle');
  const [reflection, setReflection] = useState<AIReflectionData | null>(null);
  const [lastLimitReason, setLastLimitReason] = useState<UsageLimitReason | null>(null);
  const fadeAnim = useMemo(() => new Animated.Value(0), []);

  // リフレクションをリセット
  const resetReflection = useCallback(() => {
    setReflection(null);
    setReflectionState('idle');
    fadeAnim.setValue(0);
  }, [fadeAnim]);

  // 保存済みのリフレクションを読み込む
  const loadSavedReflection = useCallback(async () => {
    try {
      const diary = await getDiaryByDate(dateString);
      if (diary?.aiReflection) {
        setReflection(diary.aiReflection);
        setReflectionState('loaded');
        fadeAnim.setValue(1); // 保存済みは即座に表示
      } else {
        resetReflection();
      }
    } catch (error) {
      console.error('リフレクションの読み込みに失敗:', error);
      resetReflection();
    }
  }, [dateString, fadeAnim, resetReflection]);

  // AIリフレクションを取得する
  const getReflection = useCallback(async () => {
    setReflectionState('loading');
    fadeAnim.setValue(0);

    try {
      // ユーザー設定を読み込んで年齢と残り時間を計算
      const settings = await loadUserSettings();
      let currentAge = 30; // デフォルト値
      let remainingYears = 50;
      let remainingDays = 18250;

      if (settings) {
        currentAge = calculateCurrentAge(settings.birthday);
        const timeLeft = calculateTimeLeft(settings.birthday, settings.targetLifespan);
        remainingYears = Math.floor(timeLeft.totalYears);
        remainingDays = Math.floor(timeLeft.totalDays);
      }

      // AIサービスを使ってリフレクションを生成
      const newReflection = await generateReflection({
        goodTime: formState.goodTime,
        wastedTime: formState.wastedTime,
        tomorrow: formState.tomorrow,
        currentAge,
        remainingYears,
        remainingDays,
        diaryDate: dateString, // 利用制限チェック用に日付を追加
      });

      // 先にリフレクションを表示（保存に失敗しても表示はする）
      setReflection(newReflection);
      setReflectionState('loaded');

      // フェードインアニメーション
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

      // 日記にリフレクションを保存（バックグラウンドで実行、エラーでも続行）
      try {
        const existingDiary = await getDiaryByDate(dateString);
        if (existingDiary) {
          const updatedDiary: DiaryEntry = {
            ...existingDiary,
            aiReflection: newReflection,
            updatedAt: new Date().toISOString(),
          };
          await saveDiaryEntry(updatedDiary);
        } else {
          // 日記がまだ保存されていない場合は新規作成
          const newDiary: DiaryEntry = {
            id: dateString,
            date: dateString,
            goodTime: formState.goodTime.trim(),
            wastedTime: formState.wastedTime.trim(),
            tomorrow: formState.tomorrow.trim(),
            aiReflection: newReflection,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await saveDiaryEntry(newDiary);
        }
      } catch (saveError) {
        // 保存エラーはログに記録するが、ユーザーにはエラーを表示しない
        console.error('リフレクションの保存に失敗（表示は継続）:', saveError);
      }
    } catch (error) {
      console.error('リフレクションの取得に失敗:', error);

      // エラーの種類に応じた処理
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorObj = error as { details?: { code?: UsageLimitReason } };

      // 利用制限エラーの検出
      if (errorObj.details?.code) {
        const limitReason = errorObj.details.code;
        setLastLimitReason(limitReason);
        setReflectionState('limit_reached');

        // コールバックを呼び出し
        if (onLimitReached) {
          onLimitReached(limitReason);
        }

        // 利用制限エラーの場合は特別なハンドリング
        switch (limitReason) {
          case 'MONTHLY_LIMIT_REACHED':
            Alert.alert(
              '今月の利用上限に達しました',
              '無料プランでは月5回までAIリフレクションを利用できます。プレミアムプランで無制限にご利用いただけます。',
              [
                { text: '閉じる', style: 'cancel' },
                // TODO: プレミアムプランへの導線を追加
                // { text: '詳しく見る', onPress: () => navigation.navigate('Premium') },
              ]
            );
            break;

          case 'REGENERATE_NOT_ALLOWED':
            Alert.alert(
              '再生成はプレミアム機能です',
              '無料プランでは同じ日記のAIリフレクションを再生成することはできません。',
              [{ text: '閉じる', style: 'cancel' }]
            );
            break;

          case 'DIARY_REGENERATE_LIMIT':
            Alert.alert(
              '再生成の上限に達しました',
              'この日記のAIリフレクションは3回まで生成できます。',
              [{ text: '閉じる', style: 'cancel' }]
            );
            break;

          case 'FEATURE_NOT_AVAILABLE':
            Alert.alert(
              'プレミアム機能',
              'AIリフレクションはプレミアムプランでご利用いただけます。',
              [{ text: '閉じる', style: 'cancel' }]
            );
            break;

          default:
            Alert.alert('エラー', errorMessage);
        }

        return;
      }

      // その他のエラー
      // resource-exhausted エラーメッセージをパースして利用制限を検出
      if (errorMessage.includes('今月のAIリフレクション利用上限')) {
        setLastLimitReason('MONTHLY_LIMIT_REACHED');
        setReflectionState('limit_reached');
        Alert.alert(
          '今月の利用上限に達しました',
          '無料プランでは月5回までAIリフレクションを利用できます。',
          [{ text: '閉じる', style: 'cancel' }]
        );
        return;
      }

      if (errorMessage.includes('同じ日記の再生成')) {
        setLastLimitReason('REGENERATE_NOT_ALLOWED');
        setReflectionState('limit_reached');
        Alert.alert(
          '再生成はプレミアム機能です',
          '無料プランでは同じ日記のAIリフレクションを再生成することはできません。',
          [{ text: '閉じる', style: 'cancel' }]
        );
        return;
      }

      if (errorMessage.includes('3回まで')) {
        setLastLimitReason('DIARY_REGENERATE_LIMIT');
        setReflectionState('limit_reached');
        Alert.alert(
          '再生成の上限に達しました',
          'この日記のAIリフレクションは3回まで生成できます。',
          [{ text: '閉じる', style: 'cancel' }]
        );
        return;
      }

      // 通常のエラー
      Alert.alert('エラーが発生しました', 'AIの生成に失敗しました。もう一度お試しください。');
      setReflectionState('error');
    }
  }, [dateString, formState, fadeAnim, onLimitReached]);

  return {
    reflectionState,
    reflection,
    fadeAnim,
    getReflection,
    loadSavedReflection,
    resetReflection,
    lastLimitReason,
  };
};
