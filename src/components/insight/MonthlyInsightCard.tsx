/**
 * MonthlyInsightCard - 月次インサイト詳細表示カード（新構造対応）
 *
 * 週間インサイトとの差別化：
 * - 人生の中のこの月（Life Context）
 * - 月のストーリーライン（Narrative Arc）
 * - 価値観の発見（Value Discovery）
 * - 未来の自分への手紙（Letter to Future Self）
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, spacing, getColors } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { MonthlyHighlightCard } from './MonthlyHighlightCard';
import type { MonthlyInsightData, StorylineMood } from '../../types/monthlyInsight';

// スタイル用の固定カラー
const COLORS = {
  // 基本
  improvement: '#10B981',
  improvementBg: '#10B98115',
  challenge: '#6366F1',
  challengeBg: '#6366F115',
  highlight: '#F59E0B',
  // 背景
  summaryBgLight: '#FDF8F3',
  summaryBgDark: '#2A2520',
  letterBgLight: '#F0F7FF',
  letterBgDark: '#1A2530',
  transformationBgLight: '#F8F8F8',
  transformationBgDark: '#2A2A2A',
  // ストーリーライン
  storylineConnector: '#D1D5DB',
  // 手紙セクション
  letterAccent: '#6366F1',
  letterBorder: '#D6DEFF',
  letterBorderDark: '#2A3A5A',
  letterRuleLight: '#E8E8F0',
  letterRuleDark: '#2A3550',
} as const;

// ムードに対応するアイコンと色
const MOOD_CONFIG: Record<StorylineMood, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  busy: { icon: 'time-outline', color: '#EF4444' },
  peaceful: { icon: 'leaf-outline', color: '#10B981' },
  challenging: { icon: 'fitness-outline', color: '#F59E0B' },
  growing: { icon: 'trending-up-outline', color: '#8B5CF6' },
  joyful: { icon: 'happy-outline', color: '#EC4899' },
  reflective: { icon: 'bulb-outline', color: '#6366F1' },
};

interface MonthlyInsightCardProps {
  insight: MonthlyInsightData;
  /** 再生成コールバック */
  onRegenerate?: () => void;
  /** 再生成可能かどうか */
  canRegenerate?: boolean;
}

/**
 * 日付範囲を読みやすい形式に変換
 */
function formatDateRange(startDate: string, _endDate: string): string {
  const [startYear, startMonth] = startDate.split('-').map(Number);
  return `${startYear}年${startMonth}月`;
}

export const MonthlyInsightCard: React.FC<MonthlyInsightCardProps> = ({
  insight,
  onRegenerate,
  canRegenerate = false,
}) => {
  const { isDark } = useTheme();
  const themeColors = getColors(isDark);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // 再生成ボタン押下時
  const handleRegeneratePress = () => {
    setShowConfirmModal(true);
  };

  // 再生成確認
  const handleConfirmRegenerate = () => {
    setShowConfirmModal(false);
    onRegenerate?.();
  };

  const summaryBgColor = isDark ? COLORS.summaryBgDark : COLORS.summaryBgLight;
  const letterBgColor = isDark ? COLORS.letterBgDark : COLORS.letterBgLight;
  const letterBorderColor = isDark ? COLORS.letterBorderDark : COLORS.letterBorder;
  const letterRuleColor = isDark ? COLORS.letterRuleDark : COLORS.letterRuleLight;
  const transformationBgColor = isDark ? COLORS.transformationBgDark : COLORS.transformationBgLight;

  // 新構造かどうかを判定（lifeContextSummaryがあれば新構造）
  const isNewStructure = !!insight.lifeContextSummary;

  // サマリーテキスト（後方互換性対応）
  const summaryText = insight.lifeContextSummary || insight.summary || '';

  // --- 手紙セクション用ヘルパー関数 ---

  /** ヘッダーテキスト生成（例: 「1年後の自分へ -- 2025年1月の手紙」） */
  const formatLetterHeader = (): string => {
    const [startYear, startMonth] = insight.monthStartDate.split('-').map(Number);
    return `1年後の自分へ ── ${startYear}年${startMonth}月の手紙`;
  };

  /** 差出人検出用の正規表現 */
  const senderPattern = /(\d{4}年\d{1,2}月の[自分あなた私わたし]+より)[。\s]*$/m;
  const fallbackSenderPattern = /^.{1,30}より[。\s]*$/;

  /** 本文を改行で分割し、罫線付き段落としてレンダリング */
  const renderLetterLines = (text: string): React.ReactNode => {
    // 差出人行を除外したテキストを取得
    const senderMatch = text.match(senderPattern);
    let bodyText = text;
    if (senderMatch) {
      bodyText = text.slice(0, senderMatch.index).trimEnd();
    } else {
      const lines = text.split('\n').filter(l => l.trim());
      const lastLine = lines[lines.length - 1]?.trim() || '';
      if (fallbackSenderPattern.test(lastLine)) {
        bodyText = lines.slice(0, -1).join('\n').trimEnd();
      }
    }

    // 空行をフィルタリング
    const lines = bodyText.split('\n').filter(l => l.trim());

    // 改行なし・1行のみ・20行超の場合は罫線なしで通常表示
    if (lines.length <= 1 || lines.length > 20) {
      return (
        <Text style={[styles.letterBodyText, { color: themeColors.text.primary }]}>
          {bodyText}
        </Text>
      );
    }

    return lines.map((line, idx) => (
      <View
        key={idx}
        style={[
          styles.letterLine,
          idx < lines.length - 1 && {
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: letterRuleColor,
          },
        ] as ViewStyle[]}
      >
        <Text style={[styles.letterBodyText, { color: themeColors.text.primary }]}>
          {line.trim()}
        </Text>
      </View>
    ));
  };

  /** 差出人を正規表現で抽出し、右寄せ表示 */
  const renderLetterFooter = (text: string): React.ReactNode => {
    const senderMatch = text.match(senderPattern);
    if (senderMatch) {
      return (
        <Text style={[styles.letterSender, { color: themeColors.text.secondary }]}>
          {senderMatch[1]}
        </Text>
      );
    }
    // フォールバック: 最終行が短く「より」で終わる場合
    const lines = text.split('\n').filter(l => l.trim());
    const lastLine = lines[lines.length - 1]?.trim() || '';
    if (fallbackSenderPattern.test(lastLine)) {
      return (
        <Text style={[styles.letterSender, { color: themeColors.text.secondary }]}>
          {lastLine.replace(/[。\s]+$/, '')}
        </Text>
      );
    }
    return null;
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
          <Ionicons name="calendar" size={24} color={themeColors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: themeColors.text.primary }]}>
            月間ふりかえり
          </Text>
          <Text style={[styles.dateRange, { color: themeColors.text.secondary }]}>
            {formatDateRange(insight.monthStartDate, insight.monthEndDate)}
          </Text>
        </View>
        {/* 再生成ボタン */}
        {canRegenerate && onRegenerate && (
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

      {/* セクション1: 人生の中のこの月 */}
      <View style={[styles.lifeContextContainer, { backgroundColor: summaryBgColor }]}>
        <View style={styles.lifeContextHeader}>
          <Ionicons name="hourglass-outline" size={18} color={themeColors.primary} />
          <Text style={[styles.lifeContextLabel, { color: themeColors.primary }]}>
            人生の中のこの月
          </Text>
        </View>
        <Text style={[styles.summaryText, { color: themeColors.text.primary }]}>
          {summaryText}
        </Text>
      </View>

      {/* セクション2: 月のストーリーライン（新構造のみ・3時期） */}
      {isNewStructure && insight.storyline && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="git-branch-outline" size={18} color={themeColors.primary} />
            <Text style={[styles.sectionTitle, { color: themeColors.text.primary }]}>
              この月のストーリー
            </Text>
          </View>
          <View style={styles.storylineContainer}>
            {/* Beginning/Opening - 月初 (後方互換性: openingもサポート) */}
            <StorylinePhaseItem
              phase={insight.storyline.beginning || (insight.storyline as unknown as { opening?: typeof insight.storyline.beginning }).opening}
              label="初"
              sublabel="月初"
              isLast={false}
              themeColors={themeColors}
              isDark={isDark}
            />
            {/* Middle/Development - 月中 (後方互換性: developmentもサポート) */}
            <StorylinePhaseItem
              phase={insight.storyline.middle || (insight.storyline as unknown as { development?: typeof insight.storyline.middle }).development}
              label="中"
              sublabel="月中"
              isLast={false}
              themeColors={themeColors}
              isDark={isDark}
            />
            {/* End/Conclusion - 月末 (後方互換性: conclusionもサポート) */}
            <StorylinePhaseItem
              phase={insight.storyline.end || (insight.storyline as unknown as { conclusion?: typeof insight.storyline.end }).conclusion}
              label="末"
              sublabel="月末"
              isLast={true}
              themeColors={themeColors}
              isDark={isDark}
            />
          </View>
        </View>
      )}

      {/* セクション3: 価値観の発見（新構造のみ） */}
      {isNewStructure && insight.valueDiscovery && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="heart-outline" size={18} color="#EC4899" />
            <Text style={[styles.sectionTitle, { color: themeColors.text.primary }]}>
              価値観の発見
            </Text>
          </View>

          {/* 主要な価値観（パーセンテージ・プログレスバー廃止） */}
          <View style={[styles.primaryValueContainer, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}>
            <View style={styles.primaryValueHeader}>
              <View style={styles.primaryValueRank}>
                <Text style={[styles.rankNumber, { color: themeColors.primary }]}>1</Text>
              </View>
              <Text style={[styles.primaryValueName, { color: themeColors.text.primary }]}>
                {insight.valueDiscovery.primaryValue.name}
              </Text>
            </View>
            <Text style={[styles.primaryValueInsight, { color: themeColors.text.secondary }]}>
              {insight.valueDiscovery.primaryValue.insight}
            </Text>
            {insight.valueDiscovery.primaryValue.evidence.length > 0 && (
              <View style={styles.evidenceContainer}>
                {insight.valueDiscovery.primaryValue.evidence.slice(0, 2).map((ev, idx) => (
                  <Text key={idx} style={[styles.evidenceText, { color: themeColors.text.secondary }]}>
                    「{ev}」
                  </Text>
                ))}
              </View>
            )}
          </View>

          {/* 副次的な価値観（パーセンテージ・プログレスバー廃止） */}
          {insight.valueDiscovery.secondaryValues.length > 0 && (
            <View style={styles.secondaryValuesContainer}>
              {insight.valueDiscovery.secondaryValues.map((value, idx) => (
                <View key={idx} style={[styles.secondaryValueItem, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}>
                  <View style={styles.secondaryValueHeader}>
                    <View style={styles.secondaryValueRank}>
                      <Text style={[styles.smallRankNumber, { color: themeColors.text.secondary }]}>{idx + 2}</Text>
                    </View>
                    <Text style={[styles.secondaryValueName, { color: themeColors.text.primary }]}>
                      {value.name}
                    </Text>
                  </View>
                  <Text style={[styles.secondaryValueEvidence, { color: themeColors.text.secondary }]}>
                    {value.briefEvidence}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* 隠れた発見 */}
          {insight.valueDiscovery.hiddenInsight && (
            <View style={[styles.hiddenInsightContainer, { backgroundColor: isDark ? '#2D2D3A' : '#FEF3C7' }]}>
              <Ionicons name="bulb" size={16} color="#F59E0B" />
              <Text style={[styles.hiddenInsightText, { color: themeColors.text.primary }]}>
                {insight.valueDiscovery.hiddenInsight}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* セクション4: ハイライト */}
      {insight.highlights && insight.highlights.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="star" size={18} color={COLORS.highlight} />
            <Text style={[styles.sectionTitle, { color: themeColors.text.primary }]}>
              この月のハイライト
            </Text>
          </View>
          {insight.highlights.map((highlight, index) => (
            <MonthlyHighlightCard key={index} highlight={highlight} />
          ))}
        </View>
      )}

      {/* セクション5: 未来の自分への手紙（新構造のみ） */}
      {isNewStructure && insight.letterToFutureSelf?.trim() && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="mail-outline" size={18} color={COLORS.letterAccent} />
            <Text style={[styles.sectionTitle, { color: themeColors.text.primary }]}>
              未来の自分への手紙
            </Text>
          </View>
          <View style={[styles.letterContainer, { backgroundColor: letterBgColor, borderColor: letterBorderColor }]}>
            {/* ヘッダー装飾 */}
            <View style={styles.letterHeader}>
              <Ionicons name="mail-open-outline" size={16} color={COLORS.letterAccent} />
              <Text style={[styles.letterHeaderText, { color: COLORS.letterAccent }]}>
                {formatLetterHeader()}
              </Text>
            </View>
            {/* 本文（罫線付き段落） */}
            <View style={styles.letterBody}>
              {renderLetterLines(insight.letterToFutureSelf)}
            </View>
            {/* 差出人（右寄せ） */}
            {renderLetterFooter(insight.letterToFutureSelf)}
          </View>
        </View>
      )}

      {/* セクション6: 成長と課題 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="trending-up" size={18} color={COLORS.improvement} />
          <Text style={[styles.sectionTitle, { color: themeColors.text.primary }]}>
            成長と課題
          </Text>
        </View>

        {/* 成長した点 */}
        <View style={styles.improvementBox}>
          <Text style={styles.improvementLabel}>
            成長した点
          </Text>
          {insight.growth.improvements.map((item, index) => (
            <View key={index} style={styles.growthItem}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.improvement} />
              <Text style={[styles.growthText, { color: themeColors.text.primary }]}>
                {item}
              </Text>
            </View>
          ))}
        </View>

        {/* 次の月の課題 */}
        <View style={styles.challengeBox}>
          <Text style={styles.challengeLabel}>
            次の月の課題
          </Text>
          {insight.growth.challenges.map((item, index) => (
            <View key={index} style={styles.growthItem}>
              <Ionicons name="flag" size={16} color={COLORS.challenge} />
              <Text style={[styles.growthText, { color: themeColors.text.primary }]}>
                {item}
              </Text>
            </View>
          ))}
        </View>

        {/* 変化 */}
        {insight.growth.transformation && (
          <View style={[styles.transformationBox, { backgroundColor: transformationBgColor }]}>
            <Text style={[styles.transformationLabel, { color: themeColors.text.secondary }]}>
              月初→月末の変化
            </Text>
            <Text style={[styles.transformationText, { color: themeColors.text.primary }]}>
              {insight.growth.transformation}
            </Text>
          </View>
        )}
      </View>

      {/* セクション7: 問いかけ */}
      <View style={[styles.questionContainer, { backgroundColor: `${themeColors.primary}15`, borderColor: themeColors.primary }]}>
        <View style={styles.questionHeader}>
          <Ionicons name="chatbubble-ellipses" size={18} color={themeColors.primary} />
          <Text style={[styles.questionLabel, { color: themeColors.primary }]}>
            次の月への問いかけ
          </Text>
        </View>
        <Text style={[styles.questionText, { color: themeColors.text.primary }]}>
          {insight.question}
        </Text>
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
              新しい視点で月間ふりかえりを生成します。
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

    </ScrollView>
  );
};

/**
 * ストーリーラインの各フェーズを表示するコンポーネント
 */
interface StorylinePhaseItemProps {
  phase: {
    period: string;
    summary: string;
    keyQuote?: string;
    mood: StorylineMood;
  };
  label: string;
  sublabel: string;
  isLast: boolean;
  themeColors: ReturnType<typeof getColors>;
  isDark: boolean;
}

const StorylinePhaseItem: React.FC<StorylinePhaseItemProps> = ({
  phase,
  label,
  sublabel,
  isLast,
  themeColors,
  isDark,
}) => {
  // phaseがundefinedの場合は何も表示しない
  if (!phase) {
    return null;
  }

  const moodConfig = MOOD_CONFIG[phase.mood] || MOOD_CONFIG.reflective;

  return (
    <View style={styles.storylinePhaseContainer}>
      {/* 左側: ラベルと接続線 */}
      <View style={styles.storylineLeft}>
        <View style={[styles.storylineLabel, { backgroundColor: moodConfig.color }]}>
          <Text style={styles.storylineLabelText}>{label}</Text>
        </View>
        {!isLast && <View style={[styles.storylineConnector, { backgroundColor: COLORS.storylineConnector }]} />}
      </View>

      {/* 右側: コンテンツ */}
      <View style={[styles.storylineContent, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}>
        <View style={styles.storylineContentHeader}>
          <Text style={[styles.storylinePeriod, { color: themeColors.text.secondary }]}>
            {phase.period || sublabel}
          </Text>
          <View style={[styles.moodBadge, { backgroundColor: `${moodConfig.color}20` }]}>
            <Ionicons name={moodConfig.icon} size={12} color={moodConfig.color} />
          </View>
        </View>
        <Text style={[styles.storylineSummary, { color: themeColors.text.primary }]}>
          {phase.summary}
        </Text>
        {phase.keyQuote && (
          <Text style={[styles.storylineQuote, { color: themeColors.text.secondary }]}>
            「{phase.keyQuote}」
          </Text>
        )}
      </View>
    </View>
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

  // セクション1: 人生の中のこの月
  lifeContextContainer: {
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
  lifeContextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  lifeContextLabel: {
    fontSize: 13,
    fontFamily: fonts.family.regular,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
  summaryText: {
    fontSize: 15,
    fontFamily: fonts.family.regular,
    lineHeight: 24,
  },

  // 共通セクション
  section: {
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
    fontWeight: '500',
    marginLeft: spacing.xs,
  },

  // セクション2: ストーリーライン
  storylineContainer: {
    marginLeft: spacing.xs,
  },
  storylinePhaseContainer: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  storylineLeft: {
    alignItems: 'center',
    width: 32,
    marginRight: spacing.sm,
  },
  storylineLabel: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storylineLabelText: {
    fontSize: 14,
    fontFamily: fonts.family.bold,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  storylineConnector: {
    flex: 1,
    width: 2,
    minHeight: 20,
    marginTop: 4,
  },
  storylineContent: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: 8,
  },
  storylineContentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  storylinePeriod: {
    fontSize: 12,
    fontFamily: fonts.family.regular,
  },
  moodBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storylineSummary: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    lineHeight: 20,
  },
  storylineQuote: {
    fontSize: 12,
    fontFamily: fonts.family.regular,
    fontStyle: 'italic',
    marginTop: 4,
  },

  // セクション3: 価値観の発見
  primaryValueContainer: {
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  primaryValueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  primaryValueName: {
    fontSize: 16,
    fontFamily: fonts.family.regular,
    fontWeight: '600',
  },
  primaryValueRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8B9D8320',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  rankNumber: {
    fontSize: 14,
    fontFamily: fonts.family.bold,
    fontWeight: '700',
  },
  primaryValueInsight: {
    fontSize: 13,
    fontFamily: fonts.family.regular,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  evidenceContainer: {
    marginTop: spacing.xs,
  },
  evidenceText: {
    fontSize: 12,
    fontFamily: fonts.family.regular,
    fontStyle: 'italic',
    marginBottom: 2,
  },
  secondaryValuesContainer: {
    gap: spacing.xs,
  },
  secondaryValueItem: {
    padding: spacing.sm,
    borderRadius: 8,
  },
  secondaryValueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  secondaryValueRank: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#A8B5A020',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  smallRankNumber: {
    fontSize: 12,
    fontFamily: fonts.family.regular,
    fontWeight: '600',
  },
  secondaryValueName: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    fontWeight: '500',
  },
  secondaryValueEvidence: {
    fontSize: 12,
    fontFamily: fonts.family.regular,
    marginLeft: 28, // rank width + margin
  },
  hiddenInsightContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.sm,
    borderRadius: 8,
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  hiddenInsightText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.family.regular,
    lineHeight: 20,
  },

  // セクション5: 未来の自分への手紙（便箋風）
  letterContainer: {
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    // Android shadow
    elevation: 3,
  },
  letterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D6DEFF',
  },
  letterHeaderText: {
    fontSize: 13,
    fontFamily: fonts.family.regular,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
  letterBody: {
    marginBottom: spacing.sm,
  },
  letterLine: {
    paddingVertical: 6,
  },
  letterBodyText: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    lineHeight: 26,
    letterSpacing: 0.3,
  },
  letterSender: {
    fontSize: 13,
    fontFamily: fonts.family.regular,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  // セクション6: 成長と課題
  improvementBox: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.sm,
    backgroundColor: '#10B98115',
    borderColor: '#10B981',
  },
  challengeBox: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.sm,
    backgroundColor: '#6366F115',
    borderColor: '#6366F1',
  },
  improvementLabel: {
    fontSize: 13,
    fontFamily: fonts.family.regular,
    fontWeight: '500',
    marginBottom: spacing.sm,
    color: '#10B981',
  },
  challengeLabel: {
    fontSize: 13,
    fontFamily: fonts.family.regular,
    fontWeight: '500',
    marginBottom: spacing.sm,
    color: '#6366F1',
  },
  growthItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  growthText: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    marginLeft: spacing.xs,
    flex: 1,
    lineHeight: 20,
  },
  transformationBox: {
    padding: spacing.md,
    borderRadius: 12,
    marginTop: spacing.xs,
  },
  transformationLabel: {
    fontSize: 12,
    fontFamily: fonts.family.regular,
    marginBottom: spacing.xs,
  },
  transformationText: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    lineHeight: 20,
  },

  // セクション7: 問いかけ
  questionContainer: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  questionLabel: {
    fontSize: 13,
    fontFamily: fonts.family.regular,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
  questionText: {
    fontSize: 15,
    fontFamily: fonts.family.regular,
    lineHeight: 22,
  },

  // 再生成ボタン
  regenerateButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  regenerateIcon: {
    fontSize: 20,
    fontWeight: '300',
  },

  // 再生成確認モーダル
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
