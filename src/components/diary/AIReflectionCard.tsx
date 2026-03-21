import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Modal } from 'react-native';
import { getColors, fonts, spacing, textBase } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import type { AIReflectionData, AIReflectionDataV1, AIReflectionDataV2 } from '../../types/aiReflection';
import { isV2Reflection, getV2SectionCount } from '../../types/aiReflection';

// 共通の型を再エクスポート
export type { AIReflectionData, AIReflectionDataV2 } from '../../types/aiReflection';

interface AIReflectionCardProps {
  reflection: AIReflectionData;
  fadeAnim?: Animated.Value;
  /** 再生成コールバック */
  onRegenerate?: () => void;
  /** 再生成可能かどうか */
  canRegenerate?: boolean;
  /** 再生成中かどうか */
  isRegenerating?: boolean;
  /** プレミアムユーザーかどうか */
  isPremium?: boolean;
}

/**
 * セクションコンポーネント
 * 各リフレクションセクションの共通レイアウト
 */
interface SectionProps {
  icon: string;
  label: string;
  children: React.ReactNode;
  backgroundColor: string;
  labelColor: string;
}

const Section: React.FC<SectionProps> = ({
  icon,
  label,
  children,
  backgroundColor,
  labelColor,
}) => (
  <View style={[styles.sectionBox, { backgroundColor }]}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionIcon}>{icon}</Text>
      <Text style={[styles.sectionLabel, { color: labelColor }]}>{label}</Text>
    </View>
    {children}
  </View>
);

/**
 * AIリフレクションカード（拡張版）
 * 日記に対するPivotLogからの気づきと問いかけを表示
 *
 * 拡張フィールドがある場合:
 * - 感情の洞察（emotionInsight）
 * - 共感メッセージ（content）
 * - 人生の文脈（lifeContext）
 * - アクション提案（actionSuggestion）
 * - 問いかけ（question）
 *
 * 拡張フィールドがない場合（後方互換）:
 * - 共感メッセージ（content）
 * - 問いかけ（question）
 */
const AIReflectionCard: React.FC<AIReflectionCardProps> = ({
  reflection,
  fadeAnim,
  onRegenerate,
  canRegenerate = false,
  isRegenerating = false,
  isPremium = false,
}) => {
  const { isDark } = useTheme();
  const themeColors = useMemo(() => getColors(isDark), [isDark]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // 再生成ボタン押下時
  const handleRegeneratePress = () => {
    if (!isPremium) {
      // 無料ユーザーは確認モーダルを出さず直接onRegenerateを呼ぶ（Paywall遷移）
      onRegenerate?.();
      return;
    }
    setShowConfirmModal(true);
  };

  // 再生成確認
  const handleConfirmRegenerate = () => {
    setShowConfirmModal(false);
    onRegenerate?.();
  };

  // V2形式かどうかチェック
  const isV2 = isV2Reflection(reflection);

  // V1の場合: 拡張フィールドが存在するかチェック
  const hasEnhancedFields = !isV2 && !!(
    (reflection as AIReflectionDataV1).emotionInsight ||
    (reflection as AIReflectionDataV1).lifeContext ||
    (reflection as AIReflectionDataV1).actionSuggestion ||
    (reflection as AIReflectionDataV1).continuity
  );

  // 日付ラベルをフォーマット（Phase 2）
  const formatDateLabel = (dateString: string): string => {
    const today = new Date();
    const [year, month, day] = dateString.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day);
    const diffTime = today.getTime() - targetDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return '昨日';
    if (diffDays === 2) return '一昨日';
    if (diffDays <= 7) return `${diffDays}日前`;
    return `${month}月${day}日`;
  };

  const containerStyle = fadeAnim
    ? [
        styles.container,
        {
          backgroundColor: themeColors.surface,
          borderLeftColor: themeColors.primary,
          shadowColor: themeColors.shadow,
          opacity: fadeAnim,
        },
      ]
    : [
        styles.container,
        {
          backgroundColor: themeColors.surface,
          borderLeftColor: themeColors.primary,
          shadowColor: themeColors.shadow,
        },
      ];

  // V2形式のレンダリング（動的セクション）
  if (isV2) {
    const v2Data = reflection as AIReflectionDataV2;
    const sectionCount = getV2SectionCount(v2Data);
    const showLabels = sectionCount > 1;

    return (
      <Animated.View style={containerStyle}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerIcon}>✨</Text>
            <Text style={[styles.headerText, { color: themeColors.primary }]}>
              今日の気づき
            </Text>
          </View>
          <View style={styles.headerRight}>
            {canRegenerate && onRegenerate && !isRegenerating && (
              <TouchableOpacity
                onPress={handleRegeneratePress}
                style={styles.headerButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[styles.headerButtonIcon, { color: themeColors.text.secondary }]}>
                  ↻
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 確認モーダル */}
        <Modal
          visible={showConfirmModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowConfirmModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: themeColors.surface }]}>
              <Text style={[styles.modalTitle, { color: themeColors.text.primary }]}>
                再生成しますか？
              </Text>
              <Text style={[styles.modalMessage, { color: themeColors.text.secondary }]}>
                新しい視点で気づきを生成します。
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  onPress={() => setShowConfirmModal(false)}
                  style={[styles.modalButton, styles.modalButtonCancel]}
                >
                  <Text style={[styles.modalButtonText, { color: themeColors.text.secondary }]}>
                    キャンセル
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleConfirmRegenerate}
                  style={[styles.modalButton, styles.modalButtonConfirm, { backgroundColor: themeColors.primary }]}
                >
                  <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                    再生成する
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* 今日のあなたへ（必須） */}
        {showLabels ? (
          <Section
            icon="💭"
            label="今日のあなたへ"
            backgroundColor={`${themeColors.primary}10`}
            labelColor={themeColors.text.secondary}
          >
            <Text style={[styles.v2MessageText, { color: themeColors.text.primary }]}>
              {v2Data.understanding}
            </Text>
          </Section>
        ) : (
          // 1セクションのみの場合はラベルなし
          <Text style={[styles.contentText, { color: themeColors.text.primary }]}>
            {v2Data.understanding}
          </Text>
        )}

        {/* 人生という視点で（任意） */}
        {v2Data.perspective && (
          <Section
            icon="⏳"
            label="人生という視点で"
            backgroundColor={`${themeColors.primary}08`}
            labelColor={themeColors.text.secondary}
          >
            <Text style={[styles.v2MessageText, { color: themeColors.text.primary }]}>
              {v2Data.perspective}
            </Text>
          </Section>
        )}

        {/* 明日へのヒント（任意） */}
        {v2Data.tomorrow && (
          <Section
            icon="🌅"
            label="明日へのヒント"
            backgroundColor={`${themeColors.primary}12`}
            labelColor={themeColors.text.secondary}
          >
            <Text style={[styles.v2MessageText, { color: themeColors.text.primary }]}>
              {v2Data.tomorrow}
            </Text>
          </Section>
        )}
      </Animated.View>
    );
  }

  // V1拡張版のレンダリング（後方互換）
  if (hasEnhancedFields) {
    const v1Data = reflection as AIReflectionDataV1;
    return (
      <Animated.View style={containerStyle}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerIcon}>✨</Text>
            <Text style={[styles.headerText, { color: themeColors.primary }]}>
              今日の気づき
            </Text>
          </View>
          <View style={styles.headerRight}>
            {canRegenerate && onRegenerate && !isRegenerating && (
              <TouchableOpacity
                onPress={handleRegeneratePress}
                style={styles.headerButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[styles.headerButtonIcon, { color: themeColors.text.secondary }]}>
                  ↻
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 確認モーダル */}
        <Modal
          visible={showConfirmModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowConfirmModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: themeColors.surface }]}>
              <Text style={[styles.modalTitle, { color: themeColors.text.primary }]}>
                再生成しますか？
              </Text>
              <Text style={[styles.modalMessage, { color: themeColors.text.secondary }]}>
                新しい視点で気づきを生成します。
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  onPress={() => setShowConfirmModal(false)}
                  style={[styles.modalButton, styles.modalButtonCancel]}
                >
                  <Text style={[styles.modalButtonText, { color: themeColors.text.secondary }]}>
                    キャンセル
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleConfirmRegenerate}
                  style={[styles.modalButton, styles.modalButtonConfirm, { backgroundColor: themeColors.primary }]}
                >
                  <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                    再生成する
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* 感情の洞察セクション */}
        {v1Data.emotionInsight && (
          <Section
            icon="🎯"
            label="感じ取れたこと"
            backgroundColor={`${themeColors.primary}10`}
            labelColor={themeColors.text.secondary}
          >
            <Text style={[styles.emotionDetected, { color: themeColors.primary }]}>
              {v1Data.emotionInsight.detected}
            </Text>
            <Text style={[styles.emotionDepth, { color: themeColors.text.primary }]}>
              {v1Data.emotionInsight.depth}
            </Text>
          </Section>
        )}

        {/* 共感メッセージ */}
        <Text style={[styles.contentText, { color: themeColors.text.primary }]}>
          {v1Data.content}
        </Text>

        {/* 過去との繋がりセクション（Phase 2） */}
        {v1Data.continuity?.connectionToPast && (
          <Section
            icon="🔗"
            label="過去との繋がり"
            backgroundColor={`${themeColors.primary}08`}
            labelColor={themeColors.text.secondary}
          >
            <Text style={[styles.connectionDate, { color: themeColors.text.secondary }]}>
              {formatDateLabel(v1Data.continuity.connectionToPast.referenceDate)}の日記より
            </Text>
            <Text style={[styles.connectionText, { color: themeColors.text.primary }]}>
              {v1Data.continuity.connectionToPast.connection}
            </Text>
          </Section>
        )}

        {/* 成長の観察セクション（Phase 2） */}
        {v1Data.continuity?.growthObservation && (
          <Section
            icon="📈"
            label="成長の軌跡"
            backgroundColor={`${themeColors.primary}0A`}
            labelColor={themeColors.text.secondary}
          >
            <Text style={[styles.growthText, { color: themeColors.text.primary }]}>
              {v1Data.continuity.growthObservation.observation}
            </Text>
          </Section>
        )}

        {/* 人生の文脈セクション */}
        {v1Data.lifeContext && (
          <Section
            icon="⏳"
            label="人生の中で"
            backgroundColor={`${themeColors.primary}08`}
            labelColor={themeColors.text.secondary}
          >
            <Text style={[styles.lifeContextText, { color: themeColors.text.primary }]}>
              {v1Data.lifeContext.perspective}
            </Text>
          </Section>
        )}

        {/* アクション提案セクション */}
        {v1Data.actionSuggestion && (
          <Section
            icon="🚀"
            label="明日への一歩"
            backgroundColor={`${themeColors.primary}12`}
            labelColor={themeColors.text.secondary}
          >
            <Text style={[styles.actionMicro, { color: themeColors.text.primary }]}>
              {v1Data.actionSuggestion.micro}
            </Text>
            <Text style={[styles.actionReason, { color: themeColors.text.secondary }]}>
              → {v1Data.actionSuggestion.reason}
            </Text>
          </Section>
        )}

        {/* 問いかけセクション */}
        {v1Data.question && (
          <Section
            icon="💭"
            label="考えてみませんか"
            backgroundColor={`${themeColors.primary}15`}
            labelColor={themeColors.text.secondary}
          >
            <Text style={[styles.questionText, { color: themeColors.text.primary }]}>
              {v1Data.question}
            </Text>
          </Section>
        )}
      </Animated.View>
    );
  }

  // 後方互換: V1の拡張フィールドがない場合は従来のレイアウト
  const basicV1Data = reflection as AIReflectionDataV1;
  return (
    <Animated.View style={containerStyle}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerIcon}>✨</Text>
          <Text style={[styles.headerText, { color: themeColors.primary }]}>
            PivotLogからの気づき
          </Text>
        </View>
        <View style={styles.headerRight}>
          {canRegenerate && onRegenerate && !isRegenerating && (
            <TouchableOpacity
              onPress={handleRegeneratePress}
              style={styles.headerButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.headerButtonIcon, { color: themeColors.text.secondary }]}>
                ↻
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 確認モーダル */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.surface }]}>
            <Text style={[styles.modalTitle, { color: themeColors.text.primary }]}>
              再生成しますか？
            </Text>
            <Text style={[styles.modalMessage, { color: themeColors.text.secondary }]}>
              新しい視点で気づきを生成します。
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setShowConfirmModal(false)}
                style={[styles.modalButton, styles.modalButtonCancel]}
              >
                <Text style={[styles.modalButtonText, { color: themeColors.text.secondary }]}>
                  キャンセル
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmRegenerate}
                style={[styles.modalButton, styles.modalButtonConfirm, { backgroundColor: themeColors.primary }]}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                  再生成する
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* メッセージ本文 */}
      <Text style={[styles.contentText, { color: themeColors.text.primary }]}>
        {basicV1Data.content}
      </Text>

      {/* 問いかけボックス */}
      {basicV1Data.question && (
        <View style={[styles.sectionBox, { backgroundColor: `${themeColors.primary}15` }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>💭</Text>
            <Text style={[styles.sectionLabel, { color: themeColors.text.secondary }]}>
              明日へのヒント
            </Text>
          </View>
          <Text style={[styles.questionText, { color: themeColors.text.primary }]}>
            {basicV1Data.question}
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: spacing.borderRadius.large,
    padding: spacing.lg,
    marginTop: spacing.lg,
    marginHorizontal: spacing.padding.screen,
    borderLeftWidth: 4,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerIcon: {
    fontSize: 18,
  },
  headerText: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.bold,
    marginLeft: spacing.sm,
    ...textBase,
  },
  headerButton: {
    padding: spacing.xs,
  },
  headerButtonIcon: {
    fontSize: 18,
    fontWeight: '300',
  },
  // モーダル
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    borderRadius: spacing.borderRadius.large,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 320,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: fonts.size.title,
    fontFamily: fonts.family.bold,
    textAlign: 'center',
    marginBottom: spacing.sm,
    ...textBase,
  },
  modalMessage: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.regular,
    textAlign: 'center',
    marginBottom: spacing.lg,
    ...textBase,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
  },
  modalButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: spacing.borderRadius.medium,
    minWidth: 100,
  },
  modalButtonCancel: {
    backgroundColor: 'transparent',
  },
  modalButtonConfirm: {
    // backgroundColor is set dynamically
  },
  modalButtonText: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.bold,
    textAlign: 'center',
    ...textBase,
  },
  contentText: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.regular,
    lineHeight: 26,
    marginVertical: spacing.sm,
    ...textBase,
  },
  // セクション共通スタイル
  sectionBox: {
    borderRadius: spacing.borderRadius.medium,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionIcon: {
    fontSize: 16,
  },
  sectionLabel: {
    fontSize: fonts.size.labelSmall,
    fontFamily: fonts.family.regular,
    marginLeft: spacing.xs,
    ...textBase,
  },
  // 感情の洞察セクション
  emotionDetected: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.bold,
    marginBottom: spacing.xs,
    ...textBase,
  },
  emotionDepth: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.regular,
    lineHeight: 22,
    ...textBase,
  },
  // 人生の文脈セクション
  lifeContextText: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.regular,
    lineHeight: 24,
    fontStyle: 'italic',
    ...textBase,
  },
  // アクション提案セクション
  actionMicro: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.bold,
    marginBottom: spacing.xs,
    ...textBase,
  },
  actionReason: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.regular,
    lineHeight: 22,
    ...textBase,
  },
  // 問いかけセクション
  questionText: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.regular,
    lineHeight: 24,
    fontStyle: 'italic',
    ...textBase,
  },
  // Phase 2: 過去との繋がりセクション
  connectionDate: {
    fontSize: fonts.size.labelSmall,
    fontFamily: fonts.family.regular,
    marginBottom: spacing.xs,
    ...textBase,
  },
  connectionText: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.regular,
    lineHeight: 24,
    ...textBase,
  },
  // Phase 2: 成長の観察セクション
  growthText: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.regular,
    lineHeight: 24,
    fontStyle: 'italic',
    ...textBase,
  },
  // V2用スタイル
  v2MessageText: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.regular,
    lineHeight: 26,
    ...textBase,
  },
});

export default AIReflectionCard;
