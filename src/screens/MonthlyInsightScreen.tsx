/**
 * MonthlyInsightScreen - 月次インサイト詳細画面
 *
 * 月選択ナビゲーションと履歴表示機能を持つフル機能のインサイト画面
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSubscription } from '../contexts/SubscriptionContext';
import { Ionicons } from '@expo/vector-icons';
import { fonts, spacing, getColors } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { useMonthlyInsight, MIN_ENTRIES_FOR_MONTHLY_INSIGHT } from '../hooks/useMonthlyInsight';
import { MonthlyInsightCard, MonthSelector, InsightHistoryList } from '../components/insight';
import { monthlyToHistoryItem } from '../utils/insightHistoryAdapters';
import type { RootStackParamList } from '../types/navigation';

type MonthlyInsightScreenRouteProp = RouteProp<RootStackParamList, 'MonthlyInsight'>;

const MonthlyInsightScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<MonthlyInsightScreenRouteProp>();
  const { isDark } = useTheme();
  const themeColors = getColors(isDark);
  const { isPremium } = useSubscription();

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
    canRegenerate,
  } = useMonthlyInsight({ initialMonthKey });

  // プレミアムチェック（フォールバック保護）
  useEffect(() => {
    if (!isPremium) {
      Alert.alert(
        'プレミアム機能',
        'この機能はプレミアムプランでご利用いただけます。',
        [{ text: '閉じる', onPress: () => navigation.goBack() }]
      );
    }
  }, [isPremium, navigation]);

  // 初期化時にふりかえり履歴を読み込み
  useEffect(() => {
    loadRecentInsights();
  }, [loadRecentInsights]);

  // 月が変更されたらキャッシュを確認して読み込み
  // selectMonth 後は state === 'loading' になるので、それも含める
  useEffect(() => {
    if (isCurrentMonthCached && !insight && (state === 'idle' || state === 'loading')) {
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

  // 再生成ハンドラ
  const handleRegenerate = async () => {
    await regenerateCurrentMonthInsight();
  };

  // 履歴アイテムを変換
  const historyItems = useMemo(
    () => recentInsights.map(monthlyToHistoryItem),
    [recentInsights]
  );

  // 履歴から月を選択
  const handleSelectFromHistory = useCallback((monthKey: string) => {
    selectMonth(monthKey);
    loadInsightForMonth(monthKey);
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
      const isRegeneration = isCurrentMonthCached && insight !== null;
      const isLoadingFromCache = isCurrentMonthCached && !isRegeneration;
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={[styles.loadingText, { color: themeColors.text.secondary }]}>
            {isRegeneration
              ? 'ふりかえりを再生成中...'
              : isLoadingFromCache
                ? '保存されたふりかえりを読み込み中...'
                : 'AIが1ヶ月の記録を分析しています...'}
          </Text>
          {!isRegeneration && !isLoadingFromCache && (
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
            月間ふりかえりを生成するには、{'\n'}
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
          <MonthlyInsightCard
            insight={insight}
            onRegenerate={handleRegenerate}
            canRegenerate={canRegenerate}
          />
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
            月間ふりかえりを生成
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
          この月のふりかえりはありません
        </Text>
        <Text style={[styles.emptyText, { color: themeColors.text.secondary }]}>
          ふりかえりを生成するには{'\n'}
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
      {/* ヘッダー */}
      <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={themeColors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeColors.text.primary }]}>
          月間ふりかえり
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
      <InsightHistoryList
        visible={historyVisible}
        onClose={() => setHistoryVisible(false)}
        items={historyItems}
        onSelectItem={handleSelectFromHistory}
        currentKey={currentMonthInfo.monthKey}
        emptyDescription={'月間ふりかえりを生成すると\nここに表示されます'}
        emptyIconName="calendar-outline"
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
});

export default MonthlyInsightScreen;
