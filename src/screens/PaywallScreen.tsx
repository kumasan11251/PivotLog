import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { PaywallScreenNavigationProp } from '../types/navigation';
import { fonts, spacing, textBase, getColors } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { getOfferings } from '../services/revenueCat';
import type { PurchasesPackage } from '../services/revenueCat';
import { LEGAL_URLS } from '../constants/legal';

const FEATURES = [
  { icon: 'sparkles-outline' as const, text: '今日の気づき 無制限' },
  { icon: 'bar-chart-outline' as const, text: '週間ふりかえり 無制限' },
  { icon: 'calendar-outline' as const, text: '月間ふりかえり 無制限' },
  { icon: 'refresh-outline' as const, text: '今日の気づき再生成' },
];

export default function PaywallScreen() {
  const navigation = useNavigation<PaywallScreenNavigationProp>();
  const { isDark } = useTheme();
  const themeColors = getColors(isDark);
  const {
    purchasePackage,
    isPurchasing,
    restorePurchases,
    isRestoring,
    isRevenueCatReady,
  } = useSubscription();

  const [monthlyPackage, setMonthlyPackage] = useState<PurchasesPackage | null>(null);
  const [annualPackage, setAnnualPackage] = useState<PurchasesPackage | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');
  const [isLoadingOfferings, setIsLoadingOfferings] = useState(true);
  const [offeringError, setOfferingError] = useState(false);

  const loadOfferings = useCallback(async () => {
    setIsLoadingOfferings(true);
    setOfferingError(false);
    try {
      const offerings = await getOfferings();
      if (offerings?.current) {
        const monthly = offerings.current.availablePackages.find(
          (pkg) => pkg.packageType === 'MONTHLY',
        );
        const annual = offerings.current.availablePackages.find(
          (pkg) => pkg.packageType === 'ANNUAL',
        );
        setMonthlyPackage(monthly ?? null);
        setAnnualPackage(annual ?? null);
      } else {
        setOfferingError(true);
      }
    } catch {
      setOfferingError(true);
    } finally {
      setIsLoadingOfferings(false);
    }
  }, []);

  useEffect(() => {
    if (isRevenueCatReady) {
      loadOfferings();
    }
  }, [isRevenueCatReady, loadOfferings]);

  // 年額の割引率を動的に計算
  const discountPercent = (() => {
    if (!monthlyPackage || !annualPackage) return null;
    const monthlyPrice = monthlyPackage.product.price;
    const annualPrice = annualPackage.product.price;
    if (monthlyPrice <= 0) return null;
    return Math.round((1 - annualPrice / (monthlyPrice * 12)) * 100);
  })();

  const handlePurchase = async () => {
    const pkg = selectedPlan === 'annual' ? annualPackage : monthlyPackage;
    if (!pkg) return;

    try {
      const success = await purchasePackage(pkg);
      if (success) {
        navigation.goBack();
      }
      // false = キャンセル → 何もしない
    } catch {
      Alert.alert(
        '購入エラー',
        '購入処理中にエラーが発生しました。しばらくしてから再度お試しください。',
      );
    }
  };

  const handleRestore = async () => {
    const result = await restorePurchases();
    switch (result) {
      case 'restored':
        navigation.goBack();
        break;
      case 'not_found':
        Alert.alert(
          '復元結果',
          '復元できるサブスクリプションが見つかりませんでした。',
        );
        break;
      case 'unavailable':
        Alert.alert(
          '復元エラー',
          '現在サブスクリプションの確認ができません。しばらくしてから再度お試しください。',
        );
        break;
    }
  };

  const isProcessing = isPurchasing || isRestoring;
  const canPurchase = !isProcessing && !isLoadingOfferings && (monthlyPackage || annualPackage);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.closeButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="close" size={28} color={themeColors.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* タイトル */}
        <Text style={[styles.title, { color: themeColors.text.primary }, textBase]}>
          PivotLog Premium
        </Text>
        <Text style={[styles.subtitle, { color: themeColors.text.secondary }, textBase]}>
          すべてのAI機能を制限なく使えます
        </Text>

        {/* 機能一覧 */}
        <View style={[styles.featureCard, { backgroundColor: themeColors.surface }]}>
          {FEATURES.map((feature, index) => (
            <View
              key={feature.text}
              style={[
                styles.featureRow,
                index < FEATURES.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: themeColors.border },
              ]}
            >
              <Ionicons name={feature.icon} size={22} color={themeColors.primary} />
              <Text style={[styles.featureText, { color: themeColors.text.primary }, textBase]}>
                {feature.text}
              </Text>
            </View>
          ))}
        </View>

        {/* プラン選択 */}
        {isLoadingOfferings ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeColors.primary} />
            <Text style={[styles.loadingText, { color: themeColors.text.secondary }, textBase]}>
              プランを読み込み中...
            </Text>
          </View>
        ) : offeringError ? (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: themeColors.text.secondary }, textBase]}>
              プランの読み込みに失敗しました。{'\n'}再度お試しください。
            </Text>
            {__DEV__ && (
              <Text style={[styles.errorText, { color: themeColors.text.placeholder, fontSize: 11 }, textBase]}>
                SDK初期化: {isRevenueCatReady ? 'OK' : 'NG'} / コンソールログを確認してください
              </Text>
            )}
            <TouchableOpacity
              style={[styles.retryButton, { borderColor: themeColors.primary }]}
              onPress={loadOfferings}
            >
              <Text style={[styles.retryButtonText, { color: themeColors.primary }, textBase]}>
                再試行
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.planContainer}>
            {/* 月額プラン */}
            {monthlyPackage && (
              <TouchableOpacity
                style={[
                  styles.planCard,
                  { borderColor: selectedPlan === 'monthly' ? themeColors.primary : themeColors.border, backgroundColor: themeColors.surface },
                  selectedPlan === 'monthly' && styles.planCardSelected,
                ]}
                onPress={() => setSelectedPlan('monthly')}
                disabled={isProcessing}
              >
                <View style={styles.planRadio}>
                  <View style={[
                    styles.radioOuter,
                    { borderColor: selectedPlan === 'monthly' ? themeColors.primary : themeColors.border },
                  ]}>
                    {selectedPlan === 'monthly' && (
                      <View style={[styles.radioInner, { backgroundColor: themeColors.primary }]} />
                    )}
                  </View>
                </View>
                <View style={styles.planInfo}>
                  <Text style={[styles.planName, { color: themeColors.text.primary }, textBase]}>
                    月額プラン
                  </Text>
                  <Text style={[styles.planPrice, { color: themeColors.text.primary }, textBase]}>
                    {monthlyPackage.product.priceString}/月
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {/* 年額プラン */}
            {annualPackage && (
              <TouchableOpacity
                style={[
                  styles.planCard,
                  { borderColor: selectedPlan === 'annual' ? themeColors.primary : themeColors.border, backgroundColor: themeColors.surface },
                  selectedPlan === 'annual' && styles.planCardSelected,
                ]}
                onPress={() => setSelectedPlan('annual')}
                disabled={isProcessing}
              >
                <View style={styles.planRadio}>
                  <View style={[
                    styles.radioOuter,
                    { borderColor: selectedPlan === 'annual' ? themeColors.primary : themeColors.border },
                  ]}>
                    {selectedPlan === 'annual' && (
                      <View style={[styles.radioInner, { backgroundColor: themeColors.primary }]} />
                    )}
                  </View>
                </View>
                <View style={styles.planInfo}>
                  <Text style={[styles.planName, { color: themeColors.text.primary }, textBase]}>
                    年額プラン
                  </Text>
                  <Text style={[styles.planPrice, { color: themeColors.text.primary }, textBase]}>
                    {annualPackage.product.priceString}/年
                  </Text>
                  {discountPercent !== null && discountPercent > 0 && (
                    <Text style={[styles.discountBadge, { color: themeColors.primary }, textBase]}>
                      {discountPercent}%お得
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* 購入ボタン */}
        <TouchableOpacity
          style={[
            styles.purchaseButton,
            { backgroundColor: themeColors.primary },
            !canPurchase && styles.purchaseButtonDisabled,
          ]}
          onPress={handlePurchase}
          disabled={!canPurchase}
        >
          {isPurchasing ? (
            <ActivityIndicator size="small" color={themeColors.text.inverse} />
          ) : (
            <Text style={[styles.purchaseButtonText, { color: themeColors.text.inverse }, textBase]}>
              プレミアムを始める
            </Text>
          )}
        </TouchableOpacity>

        {/* 復元・利用規約 */}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={isProcessing}
        >
          {isRestoring ? (
            <ActivityIndicator size="small" color={themeColors.text.secondary} />
          ) : (
            <Text style={[styles.restoreText, { color: themeColors.text.secondary }, textBase]}>
              購入を復元する
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.legalContainer}>
          <TouchableOpacity onPress={() => Linking.openURL(LEGAL_URLS.TERMS)}>
            <Text style={[styles.legalText, { color: themeColors.text.placeholder }, textBase]}>
              利用規約
            </Text>
          </TouchableOpacity>
          <Text style={[styles.legalSeparator, { color: themeColors.text.placeholder }]}>・</Text>
          <TouchableOpacity onPress={() => Linking.openURL(LEGAL_URLS.PRIVACY)}>
            <Text style={[styles.legalText, { color: themeColors.text.placeholder }, textBase]}>
              プライバシーポリシー
            </Text>
          </TouchableOpacity>
          <Text style={[styles.legalSeparator, { color: themeColors.text.placeholder }]}>・</Text>
          <TouchableOpacity onPress={() => Linking.openURL(LEGAL_URLS.TOKUSHOHO)}>
            <Text style={[styles.legalText, { color: themeColors.text.placeholder }, textBase]}>
              特定商取引法に基づく表記
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.padding.screen,
    paddingTop: spacing.sm,
  },
  closeButton: {
    padding: spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: spacing.padding.screen,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontSize: fonts.size.heading,
    fontFamily: fonts.family.bold,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  subtitle: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.regular,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  featureCard: {
    borderRadius: spacing.borderRadius.large,
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  featureText: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.regular,
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.regular,
    marginTop: spacing.md,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  errorText: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.regular,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    borderWidth: 1,
    borderRadius: spacing.borderRadius.medium,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  retryButtonText: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.bold,
  },
  planContainer: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: spacing.borderRadius.large,
    padding: spacing.lg,
  },
  planCardSelected: {
    borderWidth: 2,
  },
  planRadio: {
    marginRight: spacing.md,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.regular,
  },
  planPrice: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.bold,
    marginTop: 2,
  },
  discountBadge: {
    fontSize: fonts.size.labelSmall,
    fontFamily: fonts.family.bold,
    marginTop: 2,
  },
  purchaseButton: {
    borderRadius: spacing.borderRadius.large,
    paddingVertical: spacing.padding.button,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  purchaseButtonDisabled: {
    opacity: 0.5,
  },
  purchaseButtonText: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.bold,
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    minHeight: 48,
    justifyContent: 'center',
  },
  restoreText: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.regular,
  },
  legalContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: spacing.lg,
  },
  legalText: {
    fontSize: fonts.size.labelSmall,
    fontFamily: fonts.family.regular,
  },
  legalSeparator: {
    fontSize: fonts.size.labelSmall,
    marginHorizontal: spacing.xs,
  },
});
