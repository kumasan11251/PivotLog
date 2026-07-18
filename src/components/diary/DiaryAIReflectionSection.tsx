import React, { useCallback, useEffect, useState } from 'react';
import { Keyboard, View } from 'react-native';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { useAIReflection, showLimitAlert } from '../../hooks/useAIReflection';
import { useAIReflectionLimit } from '../../hooks/useAIReflectionLimit';
import type { DiaryFormState } from '../../hooks/useDiaryEntry';
import { DEFAULT_AI_USAGE_LIMITS } from '../../types/subscription';
import { hasValidAIConsent, recordAIConsent } from '../../utils/storage';
import AIConsentModal from '../common/AIConsentModal';
import AIReflectionCard from './AIReflectionCard';
import AIReflectionButton from './AIReflectionButton';
import AIReflectionLoading from './AIReflectionLoading';

interface Props {
  dateString: string;
  formState: DiaryFormState;
  onNavigateToPaywall: () => void;
}

const DiaryAIReflectionSection: React.FC<Props> = ({ dateString, formState, onNavigateToPaywall }) => {
  const { isPremium } = useSubscription();
  const [showConsentModal, setShowConsentModal] = useState(false);
  const {
    reflectionState,
    reflection,
    fadeAnim,
    getReflection,
    loadSavedReflection,
    errorMessage,
    reflectionError,
  } = useAIReflection({ dateString, formState, onUpgrade: onNavigateToPaywall });
  const hasLocalReflection = reflectionState === 'loaded' && reflection !== null;
  const {
    remainingThisMonth,
    canRegenerate,
    canGenerate,
    limitReason,
    isLoading: isLimitLoading,
    refreshUsage,
  } = useAIReflectionLimit({ diaryDate: dateString, hasLocalReflection });

  useEffect(() => { loadSavedReflection(); }, [loadSavedReflection]);

  const executeGetReflection = useCallback(async () => {
    await getReflection();
    refreshUsage();
  }, [getReflection, refreshUsage]);

  const handleGetReflection = useCallback(async () => {
    Keyboard.dismiss();
    if (!(await hasValidAIConsent())) {
      setShowConsentModal(true);
      return;
    }
    if (!isPremium && hasLocalReflection) {
      onNavigateToPaywall();
      return;
    }
    if (!canGenerate && limitReason) {
      showLimitAlert(limitReason, {
        monthlyLimit: !isPremium ? DEFAULT_AI_USAGE_LIMITS.freeMonthlyReflectionLimit : undefined,
        onUpgrade: onNavigateToPaywall,
      });
      return;
    }
    await executeGetReflection();
  }, [canGenerate, executeGetReflection, hasLocalReflection, isPremium, limitReason, onNavigateToPaywall]);

  const handleConsent = useCallback(async () => {
    await recordAIConsent();
    setShowConsentModal(false);
    await executeGetReflection();
  }, [executeGetReflection]);

  const hasDiaryContent = !!(
    formState.goodTime.trim() || formState.wastedTime.trim() || formState.tomorrow.trim()
  );

  return (
    <View>
      {reflectionState === 'loading' && <AIReflectionLoading />}
      {reflectionState === 'loaded' && reflection && (
        <AIReflectionCard
          reflection={reflection}
          fadeAnim={fadeAnim}
          onRegenerate={handleGetReflection}
          canRegenerate={canRegenerate}
          isRegenerating={false}
          isPremium={isPremium}
        />
      )}
      {reflectionState === 'error' && (
        <AIReflectionButton
          onPress={handleGetReflection}
          disabled={!hasDiaryContent}
          remainingThisMonth={remainingThisMonth}
          isPremium={isPremium}
          isLimitReached={!canGenerate}
          isFeatureLocked={!isPremium && !isLimitLoading && !canGenerate}
          errorMessage={errorMessage}
          retryable={reflectionError?.retryable ?? true}
        />
      )}
      {(reflectionState === 'idle' || reflectionState === 'limit_reached') && (
        <AIReflectionButton
          onPress={handleGetReflection}
          disabled={!hasDiaryContent}
          remainingThisMonth={remainingThisMonth}
          isPremium={isPremium}
          isLimitReached={!canGenerate}
          isFeatureLocked={!isPremium && !isLimitLoading && !canGenerate}
        />
      )}
      <AIConsentModal
        visible={showConsentModal}
        onConsent={handleConsent}
        onCancel={() => setShowConsentModal(false)}
      />
    </View>
  );
};

export default DiaryAIReflectionSection;
