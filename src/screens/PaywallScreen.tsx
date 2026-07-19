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
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { PaywallScreenNavigationProp, RootStackParamList } from '../types/navigation';
import { logAnalyticsEvent } from '../services/firebase';
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

// 「今日の気づき」の価値を具体的に伝えるサンプル文
const SAMPLE_REFLECTION =
  '「家族と夕食をゆっくり食べられた」ことを良かったこととして挙げた日は、後悔の記述が少ない傾向があります。あなたにとって、誰かと過ごす食事の時間が1日の満足度を支えているのかもしれません。';

// 無料トライアル期間のラベルを返す（ストア側でIntro Offer未設定 or 有料Introの場合はnull）
const getFreeTrialLabel = (pkg: PurchasesPackage | null): string | null => {
  const intro = pkg?.product.introPrice;
  if (!intro || intro.price !== 0) return null;
  const units = intro.periodNumberOfUnits;
  switch (intro.periodUnit) {
    case 'DAY':
      return `${units}日間`;
    case 'WEEK':
      return `${units * 7}日間`;
    case 'MONTH':
      return units === 1 ? '1ヶ月間' : `${units}ヶ月間`;
    case 'YEAR':
      return units === 1 ? '1年間' : `${units}年間`;
    default:
      return null;
  }
};

export default function PaywallScreen() {
  const navigation = useNavigation<PaywallScreenNavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'Paywall'>>();
  const { isDark } = useTheme();

  useEffect(() => {
    logAnalyticsEvent('paywall_viewed', { source: route.params?.source ?? 'unknown' });
    // マウント時に1回だけ記録する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const themeColors = getColors(isDark);
  const {
    purchasePackage,
    isPurchasing,
    restorePurchases,
    isRestoring,
    isRevenueCatReady,
    isLoading: isSubscriptionLoading,
    retryInitialization,
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
    } else if (!isSubscriptionLoading) {
      // Context初期化は完了したがSDK準備不可 → エラー表示
      setIsLoadingOfferings(false);
      setOfferingError(true);
    }
  }, [isRevenueCatReady, isSubscriptionLoading, loadOfferings]);

  // タイムアウト（安全策: 15秒でローディング強制終了）
  useEffect(() => {
    if (!isLoadingOfferings) return;
    const timeout = setTimeout(() => {
      setIsLoadingOfferings(false);
      setOfferingError(true);
    }, 15000);
    return () => clearTimeout(timeout);
  }, [isLoadingOfferings]);

  // 年額の割引率を動的に計算
  const discountPercent = (() => {
    if (!monthlyPackage || !annualPackage) return null;
    const monthlyPrice = monthlyPackage.product.price;
    const annualPrice = annualPackage.product.price;
    if (monthlyPrice <= 0) return null;
    return Math.round((1 - annualPrice / (monthlyPrice * 12)) * 100);
  })();

  // 無料トライアル表示（ストア側でIntro Offerを設定すると自動で反映される）
  const monthlyTrialLabel = getFreeTrialLabel(monthlyPackage);
  const annualTrialLabel = getFreeTrialLabel(annualPackage);
  const selectedTrialLabel = selectedPlan === 'annual' ? annualTrialLabel : monthlyTrialLabel;

  // 年額プランの1日あたり換算（日本円のみ表示）
  const annualPerDayLabel = (() => {
    if (!annualPackage) return null;
    const { price, currencyCode } = annualPackage.product;
    if (price <= 0 || currencyCode !== 'JPY') return null;
    return `1日あたり約${Math.round(price / 365)}円`;
  })();

  const handlePurchase = async () => {
    const pkg = selectedPlan === 'annual' ? annualPackage : monthlyPackage;
    if (!pkg) return;

    logAnalyticsEvent('purchase_started', { plan: selectedPlan });
    try {
      const result = await purchasePackage(pkg);
      switch (result) {
        case 'purchased':
          logAnalyticsEvent('purchase_completed', { plan: selectedPlan });
          navigation.goBack();
          break;
        case 'pending':
          Alert.alert(
            '処理中',
            '購入は完了しましたが、プレミアム機能の反映に時間がかかっています。「購入を復元」ボタンをお試しください。',
            [
              { text: '購入を復元', onPress: handleRestore },
              { text: 'OK', onPress: () => navigation.goBack() },
            ],
          );
          break;
        case 'restored':
          Alert.alert(
            '復元完了',
            '以前のサブスクリプションが復元されました。',
            [{ text: 'OK', onPress: () => navigation.goBack() }],
          );
          break;
        case 'cancelled':
          logAnalyticsEvent('purchase_cancelled', { plan: selectedPlan });
          break;
      }
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
      case 'transfer_blocked':
        Alert.alert(
          '別のアカウントに紐付いています',
          'このサブスクリプションは別のアカウントで購入されています。購入時に使用したアカウントでログインし直してください。',
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

  // 再試行ボタン: SDK未初期化ならretryInitialization、初期化済みならloadOfferings
  const handleRetry = useCallback(async () => {
    if (!isRevenueCatReady) {
      setIsLoadingOfferings(true);
      setOfferingError(false);
      await retryInitialization();
      // 成功すれば isRevenueCatReady=true → useEffectが loadOfferings() を自動発火
    } else {
      loadOfferings();
    }
  }, [isRevenueCatReady, retryInitialization, loadOfferings]);

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

        {/* AIリフレクションのサンプル */}
        <View style={[styles.sampleCard, { backgroundColor: themeColors.surface }]}>
          <View style={styles.sampleHeader}>
            <Ionicons name="sparkles" size={16} color={themeColors.primary} />
            <Text style={[styles.sampleLabel, { color: themeColors.primary }, textBase]}>
              今日の気づき（サンプル）
            </Text>
          </View>
          <Text style={[styles.sampleText, { color: themeColors.text.secondary }, textBase]}>
            {SAMPLE_REFLECTION}
          </Text>
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
              {isRevenueCatReady
                ? 'プランの読み込みに失敗しました。'
                : 'ストアとの接続に失敗しました。'}
              {'\n'}再度お試しください。
            </Text>
            {__DEV__ && (
              <Text style={[styles.errorText, { color: themeColors.text.placeholder, fontSize: 11 }, textBase]}>
                SDK初期化: {isRevenueCatReady ? 'OK' : 'NG'}
              </Text>
            )}
            <TouchableOpacity
              style={[
                styles.retryButton,
                { borderColor: themeColors.primary },
                isLoadingOfferings && styles.retryButtonDisabled,
              ]}
              onPress={handleRetry}
              disabled={isLoadingOfferings}
            >
              {isLoadingOfferings ? (
                <ActivityIndicator size="small" color={themeColors.primary} />
              ) : (
                <Text style={[styles.retryButtonText, { color: themeColors.primary }, textBase]}>
                  再試行
                </Text>
              )}
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
                  {monthlyTrialLabel && (
                    <Text style={[styles.discountBadge, { color: themeColors.primary }, textBase]}>
                      {monthlyTrialLabel}無料トライアル付き
                    </Text>
                  )}
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
                  {annualTrialLabel && (
                    <Text style={[styles.discountBadge, { color: themeColors.primary }, textBase]}>
                      {annualTrialLabel}無料トライアル付き
                    </Text>
                  )}
                  {discountPercent !== null && discountPercent > 0 && (
                    <Text style={[styles.discountBadge, { color: themeColors.primary }, textBase]}>
                      {discountPercent}%お得{annualPerDayLabel ? `・${annualPerDayLabel}` : ''}
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
              {selectedTrialLabel ? `まずは${selectedTrialLabel}無料で試す` : 'プレミアムを始める'}
            </Text>
          )}
        </TouchableOpacity>

        {selectedTrialLabel && (
          <Text style={[styles.trialNote, { color: themeColors.text.secondary }, textBase]}>
            無料期間中はいつでも解約できます
          </Text>
        )}

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
  sampleCard: {
    borderRadius: spacing.borderRadius.large,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  sampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  sampleLabel: {
    fontSize: fonts.size.labelSmall,
    fontFamily: fonts.family.bold,
  },
  sampleText: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.regular,
    lineHeight: 22,
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
  retryButtonDisabled: {
    opacity: 0.5,
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
  trialNote: {
    fontSize: fonts.size.labelSmall,
    fontFamily: fonts.family.regular,
    textAlign: 'center',
    marginTop: spacing.sm,
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
