/**
 * WeeklyInsightCardV2 - 週次インサイトV2詳細表示カード
 * 3セクション構成：意図追跡 + パターン + アクション
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, spacing, getColors } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { IntentionToActionCard } from './IntentionToActionCard';
import { InsightPatternCard } from './InsightPatternCard';
import { ActionSuggestionCard } from './ActionSuggestionCard';
import type { WeeklyInsightDataV2 } from '../../types/weeklyInsight';

interface WeeklyInsightCardV2Props {
  insight: WeeklyInsightDataV2;
  /** 再生成コールバック */
  onRegenerate?: () => void;
  /** 再生成可能かどうか */
  canRegenerate?: boolean;
  /** 再生成中かどうか */
  isRegenerating?: boolean;
}

/**
 * 日付範囲を読みやすい形式に変換
 */
function formatDateRange(startDate: string, endDate: string): string {
  const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
  const [, endMonth, endDay] = endDate.split('-').map(Number);

  return `${startYear}年${startMonth}月${startDay}日 〜 ${endMonth}月${endDay}日`;
}

export const WeeklyInsightCardV2: React.FC<WeeklyInsightCardV2Props> = ({
  insight,
  onRegenerate,
  canRegenerate = false,
  isRegenerating = false,
}) => {
  const { isDark } = useTheme();
  const themeColors = getColors(isDark);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // 意図追跡で達成があるかどうか
  const hasAchievements = insight.intentionToAction.achieved.length > 0;

  // 再生成ボタン押下時
  const handleRegeneratePress = () => {
    setShowConfirmModal(true);
  };

  // 再生成確認
  const handleConfirmRegenerate = () => {
    setShowConfirmModal(false);
    onRegenerate?.();
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      {/* ヘッダー */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: `${themeColors.primary}20` }]}>
          <Ionicons name="analytics" size={24} color={themeColors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: themeColors.text.primary }]}>
            週間ふりかえり
          </Text>
          <Text style={[styles.dateRange, { color: themeColors.text.secondary }]}>
            {formatDateRange(insight.weekStartDate, insight.weekEndDate)}
          </Text>
        </View>
        {/* 再生成ボタン */}
        {canRegenerate && onRegenerate && !isRegenerating && (
          <TouchableOpacity
            onPress={handleRegeneratePress}
            style={styles.regenerateButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.regenerateIcon, { color: themeColors.text.secondary }]}>
              ↻
            </Text>
          </TouchableOpacity>
        )}
        <View style={[styles.entryCountBadge, { backgroundColor: themeColors.primary }]}>
          <Text style={[styles.entryCountText, { color: themeColors.text.inverse }]}>
            {insight.entryCount}日分
          </Text>
        </View>
      </View>

      {/* 再生成確認モーダル */}
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
              新しい視点で週間ふりかえりを生成します。
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

      {/* セクション1: 想いを行動に変えた瞬間（達成がある場合のみ） */}
      {hasAchievements && (
        <IntentionToActionCard intentionToAction={insight.intentionToAction} />
      )}

      {/* セクション2: 発見されたパターン */}
      <View style={styles.patternsSection}>
        <View style={styles.sectionHeader}>
          <Ionicons name="bulb" size={18} color={themeColors.primary} />
          <Text style={[styles.sectionTitle, { color: themeColors.text.primary }]}>
            見つかったパターン
          </Text>
        </View>
        {insight.patterns.map((pattern, index) => (
          <InsightPatternCard key={index} pattern={pattern} />
        ))}
      </View>

      {/* セクション3: 来週へのアクション */}
      <ActionSuggestionCard actionSuggestion={insight.actionSuggestion} />

      {/* 生成情報 */}
      <Text style={[styles.generatedAt, { color: themeColors.text.secondary }]}>
        {new Date(insight.generatedAt).toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}に生成
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontFamily: fonts.family.bold,
    fontWeight: '700',
    marginBottom: 2,
  },
  dateRange: {
    fontSize: 13,
    fontFamily: fonts.family.regular,
  },
  entryCountBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 16,
  },
  entryCountText: {
    fontSize: 12,
    fontFamily: fonts.family.regular,
    fontWeight: '500',
  },
  patternsSection: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.family.regular,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  generatedAt: {
    fontSize: 11,
    fontFamily: fonts.family.regular,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  regenerateButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  regenerateIcon: {
    fontSize: 20,
    fontWeight: '300',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: fonts.family.bold,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  modalMessage: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: 'transparent',
  },
  modalButtonConfirm: {
    // backgroundColor is set dynamically
  },
  modalButtonText: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    fontWeight: '600',
  },
});
