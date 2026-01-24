/**
 * MonthlyInsightScreen - 月次インサイト詳細画面
 *
 * 月選択ナビゲーションと履歴表示機能を持つフル機能のインサイト画面
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, spacing, getColors } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { useMonthlyInsight, MIN_ENTRIES_FOR_MONTHLY_INSIGHT, getMonthDisplayFull } from '../hooks/useMonthlyInsight';
import { MonthlyInsightCard, MonthSelector } from '../components/insight';
import type { RootStackParamList } from '../types/navigation';
import type { MonthlyInsightDocument } from '../services/firebase/firestore';

// 開発用カラー定数
const DEV_COLORS = {
  regenerate: '#FFA726',
  delete: '#F44336',
} as const;

type MonthlyInsightScreenRouteProp = RouteProp<RootStackParamList, 'MonthlyInsight'>;

const MonthlyInsightScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<MonthlyInsightScreenRouteProp>();
  const { isDark } = useTheme();
  const themeColors = getColors(isDark);

  const { monthKey: initialMonthKey } = route.params || {};
  const [historyVisible, setHistoryVisible] = useState(false);

  const {
    insight,
    recentInsights,
    state,
    error,
    currentMonthEntryCount,
    canGenerateInsight,
    loadOrGenerateCurrentMonthInsight,
    loadInsightForMonth,
    loadRecentInsights,
    currentMonthInfo,
    selectMonth,
    goToPreviousMonth,
    goToNextMonth,
    canGoToNextMonth,
    isCurrentMonthCached,
    regenerateCurrentMonthInsight,
    deleteCurrentMonthCache,
    canRegenerate,
  } = useMonthlyInsight({ initialMonthKey });

  // 初期化時にインサイト履歴を読み込み
  useEffect(() => {
    loadRecentInsights();
  }, [loadRecentInsights]);

  // 月が変更されたらキャッシュを確認して読み込み
  useEffect(() => {
    if (isCurrentMonthCached && !insight && state === 'idle') {
      loadInsightForMonth(currentMonthInfo.monthKey);
    }
  }, [isCurrentMonthCached, insight, loadInsightForMonth, currentMonthInfo.monthKey, state]);

  // 閉じるハンドラ
  const handleClose = () => {
    navigation.goBack();
  };

  // 生成ハンドラ
  const handleGenerate = () => {
    loadOrGenerateCurrentMonthInsight();
  };

  // [開発用] 再生成ハンドラ
  const handleRegenerate = () => {
    regenerateCurrentMonthInsight();
  };

  // [開発用] キャッシュ削除ハンドラ
  const handleDeleteCache = () => {
    deleteCurrentMonthCache();
  };

  // 履歴から月を選択
  const handleSelectFromHistory = useCallback((monthKey: string) => {
    selectMonth(monthKey);
    loadInsightForMonth(monthKey);
    setHistoryVisible(false);
  }, [selectMonth, loadInsightForMonth]);

  // 履歴を開く
  const handleOpenHistory = useCallback(() => {
    loadRecentInsights();
    setHistoryVisible(true);
  }, [loadRecentInsights]);

  // コンテンツ表示
  const renderContent = () => {
    // ローディング中
    if (state === 'loading') {
      const isLoadingFromCache = isCurrentMonthCached;
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={[styles.loadingText, { color: themeColors.text.secondary }]}>
            {isLoadingFromCache
              ? '保存されたインサイトを読み込み中...'
              : 'AIが1ヶ月の記録を分析しています...'}
          </Text>
          {!isLoadingFromCache && (
            <Text style={[styles.loadingSubtext, { color: themeColors.text.secondary }]}>
              月間のパターンと成長を発見中
            </Text>
          )}
        </View>
      );
    }

    // エラー
    if (state === 'error' && error) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle" size={48} color={themeColors.error} />
          <Text style={[styles.errorText, { color: themeColors.text.primary }]}>
            インサイトの生成に失敗しました
          </Text>
          <Text style={[styles.errorSubtext, { color: themeColors.text.secondary }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: themeColors.primary }]}
            onPress={handleGenerate}
          >
            <Text style={[styles.retryButtonText, { color: themeColors.text.inverse }]}>
              再試行
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    // データ不足（ただし記録数が増えて生成可能になった場合は生成画面を表示）
    if (state === 'insufficient_data' && !canGenerateInsight) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="calendar-outline" size={48} color={themeColors.text.secondary} />
          <Text style={[styles.emptyTitle, { color: themeColors.text.primary }]}>
            記録が足りません
          </Text>
          <Text style={[styles.emptyText, { color: themeColors.text.secondary }]}>
            月間インサイトを生成するには、{'\n'}
            1ヶ月に最低{MIN_ENTRIES_FOR_MONTHLY_INSIGHT}日分の記録が必要です。
          </Text>
          <Text style={[styles.emptySubtext, { color: themeColors.text.secondary }]}>
            この月の記録: {currentMonthEntryCount}日分
          </Text>

          {recentInsights.length > 0 && (
            <TouchableOpacity
              style={[styles.historyButton, { borderColor: themeColors.primary }]}
              onPress={handleOpenHistory}
            >
              <Ionicons name="time-outline" size={18} color={themeColors.primary} />
              <Text style={[styles.historyButtonText, { color: themeColors.primary }]}>
                履歴から選ぶ
              </Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    // インサイトあり
    if (insight) {
      return (
        <View style={styles.insightContainer}>
          <MonthlyInsightCard insight={insight} />

          {/* 開発用: 再生成・削除ボタン */}
          {canRegenerate && (
            <View style={styles.devButtonRow}>
              <TouchableOpacity
                style={styles.devRegenerateButtonOrange}
                onPress={handleRegenerate}
              >
                <Ionicons name="refresh" size={18} color={DEV_COLORS.regenerate} />
                <Text style={styles.devRegenerateTextOrange}>
                  [DEV] 再生成
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.devRegenerateButtonRed}
                onPress={handleDeleteCache}
              >
                <Ionicons name="trash" size={18} color={DEV_COLORS.delete} />
                <Text style={styles.devRegenerateTextRed}>
                  [DEV] 削除
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    }

    // 生成待ち（キャッシュがない場合）
    if (canGenerateInsight && !isCurrentMonthCached) {
      return (
        <View style={styles.centerContainer}>
          <View style={[styles.sparkleIcon, { backgroundColor: `${themeColors.primary}20` }]}>
            <Ionicons name="sparkles" size={40} color={themeColors.primary} />
          </View>
          <Text style={[styles.readyTitle, { color: themeColors.text.primary }]}>
            月間インサイトを生成
          </Text>
          <Text style={[styles.readyText, { color: themeColors.text.secondary }]}>
            {currentMonthInfo.startDate.replace(/-/g, '/')} 〜 {currentMonthInfo.endDate.replace(/-/g, '/')}
          </Text>
          <Text style={[styles.readySubtext, { color: themeColors.text.secondary }]}>
            {currentMonthEntryCount}日分の記録をAIが分析し、{'\n'}
            1ヶ月の傾向と成長をレポートします
          </Text>
          <TouchableOpacity
            style={[styles.generateButton, { backgroundColor: themeColors.primary }]}
            onPress={handleGenerate}
          >
            <Ionicons name="analytics" size={20} color={themeColors.text.inverse} />
            <Text style={[styles.generateButtonText, { color: themeColors.text.inverse }]}>
              インサイトを生成
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    // デフォルト（データなし・生成不可）
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="analytics-outline" size={48} color={themeColors.text.secondary} />
        <Text style={[styles.emptyTitle, { color: themeColors.text.primary }]}>
          この月のインサイトはありません
        </Text>
        <Text style={[styles.emptyText, { color: themeColors.text.secondary }]}>
          インサイトを生成するには{'\n'}
          {MIN_ENTRIES_FOR_MONTHLY_INSIGHT}日以上の記録が必要です
        </Text>
        <Text style={[styles.emptySubtext, { color: themeColors.text.secondary }]}>
          この月の記録: {currentMonthEntryCount}日分
        </Text>

        {recentInsights.length > 0 && (
          <TouchableOpacity
            style={[styles.historyButton, { borderColor: themeColors.primary }]}
            onPress={handleOpenHistory}
          >
            <Ionicons name="time-outline" size={18} color={themeColors.primary} />
            <Text style={[styles.historyButtonText, { color: themeColors.primary }]}>
              履歴から選ぶ
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // 履歴アイテムのレンダリング
  const renderHistoryItem = ({ item }: { item: MonthlyInsightDocument }) => (
    <TouchableOpacity
      style={[styles.historyItem, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
      onPress={() => handleSelectFromHistory(item.monthKey)}
    >
      <View style={styles.historyItemContent}>
        <Text style={[styles.historyItemMonth, { color: themeColors.text.primary }]}>
          {getMonthDisplayFull(item.monthKey)}
        </Text>
        <Text style={[styles.historyItemCount, { color: themeColors.text.secondary }]}>
          {item.entryCount}日分の記録
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={themeColors.text.secondary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
      {/* ヘッダー */}
      <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={themeColors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeColors.text.primary }]}>
          月間インサイト
        </Text>
        <TouchableOpacity onPress={handleOpenHistory} style={styles.historyIconButton}>
          <Ionicons name="time-outline" size={22} color={themeColors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* 月セレクター */}
      <MonthSelector
        monthInfo={currentMonthInfo}
        onPrevious={goToPreviousMonth}
        onNext={goToNextMonth}
        canGoNext={canGoToNextMonth}
      />

      {/* コンテンツ */}
      <View style={styles.content}>
        {renderContent()}
      </View>

      {/* 履歴モーダル */}
      <Modal
        visible={historyVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setHistoryVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: themeColors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
            <Text style={[styles.modalTitle, { color: themeColors.text.primary }]}>
              インサイト履歴
            </Text>
            <TouchableOpacity onPress={() => setHistoryVisible(false)}>
              <Ionicons name="close" size={24} color={themeColors.text.primary} />
            </TouchableOpacity>
          </View>

          {recentInsights.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Ionicons name="calendar-outline" size={48} color={themeColors.text.secondary} />
              <Text style={[styles.emptyHistoryText, { color: themeColors.text.secondary }]}>
                まだインサイト履歴がありません
              </Text>
            </View>
          ) : (
            <FlatList
              data={recentInsights}
              renderItem={renderHistoryItem}
              keyExtractor={(item) => item.monthKey}
              contentContainerStyle={styles.historyList}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: fonts.family.regular,
    fontWeight: '600',
  },
  historyIconButton: {
    padding: spacing.xs,
  },
  content: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 15,
    fontFamily: fonts.family.regular,
    textAlign: 'center',
  },
  loadingSubtext: {
    marginTop: spacing.xs,
    fontSize: 13,
    fontFamily: fonts.family.regular,
    textAlign: 'center',
  },
  errorText: {
    marginTop: spacing.md,
    fontSize: 17,
    fontFamily: fonts.family.regular,
    fontWeight: '500',
    textAlign: 'center',
  },
  errorSubtext: {
    marginTop: spacing.xs,
    fontSize: 13,
    fontFamily: fonts.family.regular,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    fontWeight: '500',
  },
  emptyTitle: {
    marginTop: spacing.md,
    fontSize: 17,
    fontFamily: fonts.family.regular,
    fontWeight: '500',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: spacing.sm,
    fontSize: 14,
    fontFamily: fonts.family.regular,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptySubtext: {
    marginTop: spacing.xs,
    fontSize: 13,
    fontFamily: fonts.family.regular,
    textAlign: 'center',
  },
  historyButton: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
  },
  historyButtonText: {
    marginLeft: spacing.xs,
    fontSize: 14,
    fontFamily: fonts.family.regular,
    fontWeight: '500',
  },
  sparkleIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  readyTitle: {
    fontSize: 20,
    fontFamily: fonts.family.bold,
    fontWeight: '700',
    textAlign: 'center',
  },
  readyText: {
    marginTop: spacing.xs,
    fontSize: 14,
    fontFamily: fonts.family.regular,
    textAlign: 'center',
  },
  readySubtext: {
    marginTop: spacing.sm,
    fontSize: 14,
    fontFamily: fonts.family.regular,
    textAlign: 'center',
    lineHeight: 20,
  },
  generateButton: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 25,
  },
  generateButtonText: {
    marginLeft: spacing.sm,
    fontSize: 16,
    fontFamily: fonts.family.regular,
    fontWeight: '600',
  },
  insightContainer: {
    flex: 1,
  },
  devButtonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  devRegenerateButtonOrange: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFA726',
  },
  devRegenerateButtonRed: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  devRegenerateTextOrange: {
    marginLeft: spacing.xs,
    fontSize: 12,
    fontFamily: fonts.family.regular,
    fontWeight: '500',
    color: '#FFA726',
  },
  devRegenerateTextRed: {
    marginLeft: spacing.xs,
    fontSize: 12,
    fontFamily: fonts.family.regular,
    fontWeight: '500',
    color: '#F44336',
  },
  // モーダル関連
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: fonts.family.regular,
    fontWeight: '600',
  },
  historyList: {
    padding: spacing.md,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  historyItemContent: {
    flex: 1,
  },
  historyItemMonth: {
    fontSize: 15,
    fontFamily: fonts.family.regular,
    fontWeight: '500',
  },
  historyItemCount: {
    fontSize: 12,
    fontFamily: fonts.family.regular,
    marginTop: 2,
  },
  emptyHistory: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyHistoryText: {
    marginTop: spacing.md,
    fontSize: 14,
    fontFamily: fonts.family.regular,
    textAlign: 'center',
  },
});

export default MonthlyInsightScreen;
