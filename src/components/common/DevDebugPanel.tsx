/**
 * 開発用デバッグパネル
 *
 * サブスクリプション状態の切り替えや利用状況のリセットを行うためのコンポーネント
 * __DEV__モードでのみ表示される
 */
import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { getColors, fonts, spacing, textBase } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import {
  resetAIReflectionUsage,
  resetMonthlyUsage,
  resetReflectionHistory,
  getAIReflectionUsage,
} from '../../services/firebase/aiUsage';
import type { AIReflectionUsage } from '../../types/subscription';

interface DevDebugPanelProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * 開発用デバッグパネルコンポーネント
 */
const DevDebugPanel: React.FC<DevDebugPanelProps> = ({ visible, onClose }) => {
  const { isDark } = useTheme();
  const themeColors = useMemo(() => getColors(isDark), [isDark]);
  const {
    tier,
    isPremium,
    isDevMode,
    isDevOverrideActive,
    devSetTier,
    devResetOverride,
    limits,
  } = useSubscription();

  const [usage, setUsage] = useState<AIReflectionUsage | null>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);

  // 利用状況を読み込み
  const loadUsage = useCallback(async () => {
    setIsLoadingUsage(true);
    try {
      const data = await getAIReflectionUsage();
      setUsage(data);
    } catch (_error) {
      console.error('利用状況の読み込みに失敗:', _error);
    } finally {
      setIsLoadingUsage(false);
    }
  }, []);

  // パネルが開いたら利用状況を読み込む
  React.useEffect(() => {
    if (visible) {
      loadUsage();
    }
  }, [visible, loadUsage]);

  // プレミアムに切り替え
  const handleSetPremium = useCallback(async () => {
    await devSetTier('premium');
    Alert.alert('変更完了', 'プレミアムプランに切り替えました（Firestoreも更新済み）');
  }, [devSetTier]);

  // 無料プランに切り替え
  const handleSetFree = useCallback(async () => {
    await devSetTier('free');
    Alert.alert('変更完了', '無料プランに切り替えました（Firestoreも更新済み）');
  }, [devSetTier]);

  // オーバーライドをリセット
  const handleResetOverride = useCallback(async () => {
    await devResetOverride();
    Alert.alert('リセット完了', '無料プランに戻りました（Firestoreも更新済み）');
  }, [devResetOverride]);

  // 全ての利用状況をリセット
  const handleResetAllUsage = useCallback(async () => {
    Alert.alert(
      '利用状況をリセット',
      '全てのAIリフレクション利用履歴をリセットします。よろしいですか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'リセット',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetAIReflectionUsage();
              await loadUsage();
              Alert.alert('完了', '利用状況をリセットしました');
            } catch {
              Alert.alert('エラー', 'リセットに失敗しました');
            }
          },
        },
      ]
    );
  }, [loadUsage]);

  // 今月の利用回数のみリセット
  const handleResetMonthlyUsage = useCallback(async () => {
    Alert.alert(
      '今月の利用回数をリセット',
      '今月の利用回数のみリセットします。よろしいですか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'リセット',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetMonthlyUsage();
              await loadUsage();
              Alert.alert('完了', '今月の利用回数をリセットしました');
            } catch {
              Alert.alert('エラー', 'リセットに失敗しました');
            }
          },
        },
      ]
    );
  }, [loadUsage]);

  // 生成履歴のみリセット（月間利用回数は維持）
  const handleResetReflectionHistory = useCallback(async () => {
    Alert.alert(
      '生成履歴をリセット',
      '日記ごとの生成履歴をリセットします。\n（月間利用回数は維持されます）\n\n日記を削除したのに「再生成できない」エラーが出る場合に使用してください。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'リセット',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetReflectionHistory();
              await loadUsage();
              Alert.alert('完了', '生成履歴をリセットしました');
            } catch {
              Alert.alert('エラー', 'リセットに失敗しました');
            }
          },
        },
      ]
    );
  }, [loadUsage]);

  // 今月の利用回数を取得
  const currentMonthUsage = useMemo(() => {
    if (!usage) return 0;
    const currentMonth = new Date().toISOString().slice(0, 7);
    return usage.monthlyUsage?.[currentMonth]?.count || 0;
  }, [usage]);

  // 動的スタイル（テーマ依存）
  const dynamicStyles = useMemo(() => ({
    premiumButtonBg: {
      backgroundColor: isPremium ? themeColors.primary : themeColors.surface,
      borderColor: themeColors.primary,
    },
    premiumButtonText: {
      color: isPremium ? '#fff' : themeColors.primary,
    },
    freeButtonBg: {
      backgroundColor: !isPremium ? themeColors.primary : themeColors.surface,
      borderColor: themeColors.primary,
    },
    freeButtonText: {
      color: !isPremium ? '#fff' : themeColors.primary,
    },
    resetButtonBorder: {
      borderColor: themeColors.border,
    },
  }), [isPremium, themeColors]);

  // 全日記の生成履歴数を取得
  const totalDiaryReflections = useMemo(() => {
    if (!usage) return 0;
    return Object.keys(usage.reflectionHistory || {}).length;
  }, [usage]);

  if (!isDevMode) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: themeColors.text.primary }]}>
            🛠 開発用デバッグパネル
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={[styles.closeButtonText, { color: themeColors.primary }]}>
              閉じる
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* サブスクリプション状態 */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeColors.text.primary }]}>
              📦 サブスクリプション状態
            </Text>

            <View style={[styles.infoCard, { backgroundColor: themeColors.surface }]}>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: themeColors.text.secondary }]}>
                  現在のティア
                </Text>
                <Text style={[styles.infoValue, { color: themeColors.text.primary }]}>
                  {isPremium ? '🌟 Premium' : '🆓 Free'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: themeColors.text.secondary }]}>
                  オーバーライド
                </Text>
                <Text style={[styles.infoValue, { color: themeColors.text.primary }]}>
                  {isDevOverrideActive ? `有効 (${tier})` : '無効'}
                </Text>
              </View>
            </View>

            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[styles.actionButton, dynamicStyles.premiumButtonBg]}
                onPress={handleSetPremium}
              >
                <Text style={[styles.actionButtonText, dynamicStyles.premiumButtonText]}>
                  Premium に設定
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, dynamicStyles.freeButtonBg]}
                onPress={handleSetFree}
              >
                <Text style={[styles.actionButtonText, dynamicStyles.freeButtonText]}>
                  Free に設定
                </Text>
              </TouchableOpacity>
            </View>

            {isDevOverrideActive && (
              <TouchableOpacity
                style={[styles.resetButton, dynamicStyles.resetButtonBorder]}
                onPress={handleResetOverride}
              >
                <Text style={[styles.resetButtonText, { color: themeColors.text.secondary }]}>
                  オーバーライドをリセット
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 利用制限設定 */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeColors.text.primary }]}>
              ⚙️ 利用制限設定
            </Text>

            <View style={[styles.infoCard, { backgroundColor: themeColors.surface }]}>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: themeColors.text.secondary }]}>
                  無料ユーザー月間上限
                </Text>
                <Text style={[styles.infoValue, { color: themeColors.text.primary }]}>
                  {limits.freeMonthlyReflectionLimit}回/月
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: themeColors.text.secondary }]}>
                  Premium 再生成上限
                </Text>
                <Text style={[styles.infoValue, { color: themeColors.text.primary }]}>
                  {limits.premiumDiaryRegenerateLimit}回/日記
                </Text>
              </View>
            </View>
          </View>

          {/* 利用状況 */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeColors.text.primary }]}>
              📊 利用状況
            </Text>

            <View style={[styles.infoCard, { backgroundColor: themeColors.surface }]}>
              {isLoadingUsage ? (
                <Text style={[styles.infoLabel, { color: themeColors.text.secondary }]}>
                  読み込み中...
                </Text>
              ) : (
                <>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: themeColors.text.secondary }]}>
                      今月の利用回数
                    </Text>
                    <Text style={[styles.infoValue, { color: themeColors.text.primary }]}>
                      {currentMonthUsage}回
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: themeColors.text.secondary }]}>
                      生成済み日記数
                    </Text>
                    <Text style={[styles.infoValue, { color: themeColors.text.primary }]}>
                      {totalDiaryReflections}件
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: themeColors.text.secondary }]}>
                      最終更新
                    </Text>
                    <Text style={[styles.infoValue, { color: themeColors.text.primary }]}>
                      {usage?.updatedAt
                        ? new Date(usage.updatedAt).toLocaleString('ja-JP')
                        : 'なし'}
                    </Text>
                  </View>
                </>
              )}
            </View>

            <TouchableOpacity
              style={[styles.reloadButton, { borderColor: themeColors.primary }]}
              onPress={loadUsage}
            >
              <Text style={[styles.reloadButtonText, { color: themeColors.primary }]}>
                🔄 再読み込み
              </Text>
            </TouchableOpacity>
          </View>

          {/* リセットアクション */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeColors.text.primary }]}>
              🗑️ リセット
            </Text>

            <TouchableOpacity
              style={styles.dangerButton}
              onPress={handleResetReflectionHistory}
            >
              <Text style={styles.dangerButtonText}>
                生成履歴をリセット（利用回数は維持）
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dangerButton, styles.dangerButtonMargin]}
              onPress={handleResetMonthlyUsage}
            >
              <Text style={styles.dangerButtonText}>
                今月の利用回数をリセット
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dangerButton, styles.dangerButtonMargin]}
              onPress={handleResetAllUsage}
            >
              <Text style={styles.dangerButtonText}>
                全ての利用履歴をリセット
              </Text>
            </TouchableOpacity>
          </View>

          {/* 余白 */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.padding.screen,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: fonts.size.title,
    fontFamily: fonts.family.bold,
    ...textBase,
  },
  closeButton: {
    padding: spacing.sm,
  },
  closeButtonText: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.bold,
    ...textBase,
  },
  content: {
    flex: 1,
    padding: spacing.padding.screen,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.bold,
    marginBottom: spacing.md,
    ...textBase,
  },
  infoCard: {
    borderRadius: spacing.borderRadius.medium,
    padding: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  infoLabel: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  infoValue: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.bold,
    ...textBase,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.borderRadius.medium,
    borderWidth: 1,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.bold,
    ...textBase,
  },
  resetButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.borderRadius.medium,
    borderWidth: 1,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: fonts.size.labelSmall,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  reloadButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.borderRadius.medium,
    borderWidth: 1,
    alignItems: 'center',
  },
  reloadButtonText: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.bold,
    ...textBase,
  },
  dangerButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.borderRadius.medium,
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
  },
  dangerButtonMargin: {
    marginTop: spacing.sm,
  },
  dangerButtonText: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.bold,
    color: '#DC2626',
    ...textBase,
  },
  bottomSpacer: {
    height: spacing.xxl * 2,
  },
});

export default DevDebugPanel;
