/**
 * WeeklyInsightScreen - 週次インサイト詳細画面
 *
 * 週選択ナビゲーションと履歴表示機能を持つフル機能のインサイト画面
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, spacing, getColors } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { useWeeklyInsight, isLastWeek, MIN_ENTRIES_FOR_INSIGHT } from '../hooks/useWeeklyInsight';
import { WeeklyInsightCard, WeekSelector, InsightHistoryList } from '../components/insight';
import { WeeklyInsightCardV2 } from '../components/insight/WeeklyInsightCardV2';
import { isWeeklyInsightV2 } from '../types/weeklyInsight';
import type { RootStackParamList } from '../types/navigation';

type WeeklyInsightScreenRouteProp = RouteProp<RootStackParamList, 'WeeklyInsight'>;

const WeeklyInsightScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<WeeklyInsightScreenRouteProp>();
  const { isDark } = useTheme();
  const themeColors = getColors(isDark);

  const { weekKey: initialWeekKey } = route.params || {};
  const [historyVisible, setHistoryVisible] = useState(false);

  const {
    insight,
    recentInsights,
    state,
    error,
    currentWeekEntryCount,
    canGenerateInsight,
    loadOrGenerateCurrentWeekInsight,
    loadInsightForWeek,
    loadRecentInsights,
    currentWeekInfo,
    selectWeek,
    goToPreviousWeek,
    goToNextWeek,
    canGoToNextWeek,
    isCurrentWeekCached,
    regenerateCurrentWeekInsight,
    deleteCurrentWeekCache,
    canRegenerate,
  } = useWeeklyInsight({ initialWeekKey });

  // 初期化時にインサイト履歴を読み込み
  useEffect(() => {
    loadRecentInsights();
  }, [loadRecentInsights]);

  // 週が変更されたらキャッシュを確認して読み込み
  // state === 'idle' の場合のみ実行（二重実行防止）
  // バックグラウンド生成中の場合はhookのuseEffectで状態が同期される
  useEffect(() => {
    if (isCurrentWeekCached && !insight && state === 'idle') {
      loadInsightForWeek(currentWeekInfo.weekKey);
    }
  }, [isCurrentWeekCached, insight, loadInsightForWeek, currentWeekInfo.weekKey, state]);

  // 閉じるハンドラ
  const handleClose = () => {
    navigation.goBack();
  };

  // 生成ハンドラ
  const handleGenerate = () => {
    loadOrGenerateCurrentWeekInsight();
  };

  // [開発用] 再生成ハンドラ
  const handleRegenerate = () => {
    regenerateCurrentWeekInsight();
  };

  // [開発用] キャッシュ削除ハンドラ
  const handleDeleteCache = () => {
    deleteCurrentWeekCache();
  };

  // 履歴から週を選択
  const handleSelectFromHistory = useCallback((weekKey: string) => {
    selectWeek(weekKey);
    // 選択した週のインサイトを読み込み
    loadInsightForWeek(weekKey);
  }, [selectWeek, loadInsightForWeek]);

  // 履歴を開く
  const handleOpenHistory = useCallback(() => {
    loadRecentInsights();
    setHistoryVisible(true);
  }, [loadRecentInsights]);

  // コンテンツ表示
  const renderContent = () => {
    // ローディング中
    if (state === 'loading') {
      // キャッシュからの読み込みか新規生成かで表示を変える
      const isLoadingFromCache = isCurrentWeekCached;
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={[styles.loadingText, { color: themeColors.text.secondary }]}>
            {isLoadingFromCache
              ? '保存されたふりかえりを読み込み中...'
              : 'AIが1週間の記録を分析しています...'}
          </Text>
          {!isLoadingFromCache && (
            <Text style={[styles.loadingSubtext, { color: themeColors.text.secondary }]}>
              時間の使い方のパターンを発見中
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
            ふりかえりの生成に失敗しました
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
            週間ふりかえりを生成するには、{'\n'}
            1週間に最低{MIN_ENTRIES_FOR_INSIGHT}日分の記録が必要です。
          </Text>
          <Text style={[styles.emptySubtext, { color: themeColors.text.secondary }]}>
            この週の記録: {currentWeekEntryCount}日分
          </Text>

          {/* 他の週を選択する提案 */}
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
      // V2かV1かで表示を分岐
      const InsightCard = isWeeklyInsightV2(insight)
        ? () => <WeeklyInsightCardV2 insight={insight} />
        : () => <WeeklyInsightCard insight={insight} />;

      return (
        <View style={{ flex: 1 }}>
          <InsightCard />

          {/* 開発用: 再生成・削除ボタン */}
          {canRegenerate && (
            <View style={styles.devButtonRow}>
              <TouchableOpacity
                style={[styles.devRegenerateButton, { borderColor: '#FFA726' }]}
                onPress={handleRegenerate}
              >
                <Ionicons name="refresh" size={18} color="#FFA726" />
                <Text style={[styles.devRegenerateText, { color: '#FFA726' }]}>
                  [DEV] 再生成
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.devRegenerateButton, { borderColor: '#F44336' }]}
                onPress={handleDeleteCache}
              >
                <Ionicons name="trash" size={18} color="#F44336" />
                <Text style={[styles.devRegenerateText, { color: '#F44336' }]}>
                  [DEV] 削除
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    }

    // 生成待ち（キャッシュがない場合）
    if (canGenerateInsight && !isCurrentWeekCached) {
      return (
        <View style={styles.centerContainer}>
          <View style={[styles.sparkleIcon, { backgroundColor: `${themeColors.primary}20` }]}>
            <Ionicons name="sparkles" size={40} color={themeColors.primary} />
          </View>
          <Text style={[styles.readyTitle, { color: themeColors.text.primary }]}>
            週間ふりかえりを生成
          </Text>
          <Text style={[styles.readyText, { color: themeColors.text.secondary }]}>
            {currentWeekInfo.startDate.replace(/-/g, '/')} 〜 {currentWeekInfo.endDate.replace(/-/g, '/')}
          </Text>
          <Text style={[styles.readySubtext, { color: themeColors.text.secondary }]}>
            {currentWeekEntryCount}日分の記録をAIが分析し、{'\n'}
            あなたの時間の使い方の傾向をレポートします
          </Text>
          <TouchableOpacity
            style={[styles.generateButton, { backgroundColor: themeColors.primary }]}
            onPress={handleGenerate}
          >
            <Ionicons name="analytics" size={20} color={themeColors.text.inverse} />
            <Text style={[styles.generateButtonText, { color: themeColors.text.inverse }]}>
              ふりかえりを生成
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
          この週のふりかえりはありません
        </Text>
        <Text style={[styles.emptyText, { color: themeColors.text.secondary }]}>
          ふりかえりを生成するには{'\n'}
          {MIN_ENTRIES_FOR_INSIGHT}日以上の記録が必要です
        </Text>
        <Text style={[styles.emptySubtext, { color: themeColors.text.secondary }]}>
          この週の記録: {currentWeekEntryCount}日分
        </Text>

        {/* 他の週を選択する提案 */}
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
      {/* ヘッダー */}
      <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={themeColors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeColors.text.primary }]}>
          週間ふりかえり
        </Text>
        <TouchableOpacity onPress={handleOpenHistory} style={styles.historyIconButton}>
          <Ionicons name="time-outline" size={22} color={themeColors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* 週選択ナビゲーション */}
      <WeekSelector
        startDate={currentWeekInfo.startDate}
        endDate={currentWeekInfo.endDate}
        weekNumber={currentWeekInfo.weekNumber}
        year={currentWeekInfo.year}
        onPreviousWeek={goToPreviousWeek}
        onNextWeek={goToNextWeek}
        canGoToNextWeek={canGoToNextWeek}
        isLastWeek={isLastWeek(currentWeekInfo.weekKey)}
      />

      {/* コンテンツ */}
      <View style={styles.content}>
        {renderContent()}
      </View>

      {/* 履歴モーダル */}
      <InsightHistoryList
        visible={historyVisible}
        onClose={() => setHistoryVisible(false)}
        insights={recentInsights}
        onSelectInsight={handleSelectFromHistory}
        currentWeekKey={currentWeekInfo.weekKey}
      />
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
    paddingHorizontal: spacing.xl,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: fonts.family.regular,
    fontWeight: '500',
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    fontFamily: fonts.family.regular,
    fontWeight: '500',
    marginTop: spacing.md,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  retryButtonText: {
    fontSize: 15,
    fontFamily: fonts.family.regular,
    fontWeight: '500',
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: fonts.family.regular,
    fontWeight: '500',
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    marginTop: spacing.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: fonts.family.regular,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
  },
  historyButtonText: {
    fontSize: 15,
    fontFamily: fonts.family.regular,
    fontWeight: '500',
    marginLeft: spacing.xs,
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
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  readyText: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  readySubtext: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    marginTop: spacing.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 24,
  },
  generateButtonText: {
    fontSize: 16,
    fontFamily: fonts.family.regular,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  devButtonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
  },
  devRegenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  devRegenerateText: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
});

export default WeeklyInsightScreen;
