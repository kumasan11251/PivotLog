import { useState, useCallback, useMemo } from 'react';
import { Animated, Alert } from 'react-native';
import type { AIReflectionData, AIReflectionState } from '../types/aiReflection';
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
}

interface UseAIReflectionReturn {
  /** AIリフレクションの状態 */
  reflectionState: AIReflectionState;
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
}

/**
 * AIリフレクション機能を管理するカスタムフック
 */
export const useAIReflection = ({
  dateString,
  formState,
}: UseAIReflectionProps): UseAIReflectionReturn => {
  const [reflectionState, setReflectionState] = useState<AIReflectionState>('idle');
  const [reflection, setReflection] = useState<AIReflectionData | null>(null);
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
      // デバッグ用: エラーをアラートで表示
      const errorMessage = error instanceof Error ? error.message : String(error);
      Alert.alert('AI Error (Debug)', errorMessage);
      setReflectionState('error');
    }
  }, [dateString, formState, fadeAnim]);

  return {
    reflectionState,
    reflection,
    fadeAnim,
    getReflection,
    loadSavedReflection,
    resetReflection,
  };
};
