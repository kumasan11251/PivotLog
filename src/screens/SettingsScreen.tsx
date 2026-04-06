import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  Animated,
  Linking,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { SettingsScreenNavigationProp } from '../types/navigation';
import { colors, fonts, spacing, textBase, getColors, Colors } from '../theme';
import { loadUserSettings, saveUserSettings, resetOnboarding } from '../utils/storage';
import { getCurrentUser, deleteAccount } from '../services/firebase';
import { deleteAllUserData } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useTheme, ThemeMode } from '../contexts/ThemeContext';
import ScreenHeader from '../components/common/ScreenHeader';
import DevDebugPanel from '../components/common/DevDebugPanel';
import { LEGAL_URLS } from '../constants/legal';

// 1日の開始時刻の選択肢（0時〜12時）
const DAY_START_HOUR_OPTIONS = Array.from({ length: 13 }, (_, i) => i);

// テーマの選択肢
const THEME_OPTIONS: { value: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'light', label: 'ライト', icon: 'sunny-outline' },
  { value: 'dark', label: 'ダーク', icon: 'moon-outline' },
  { value: 'system', label: 'システム設定に従う', icon: 'phone-portrait-outline' },
];

interface SettingItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  isLoading?: boolean;
  isLast?: boolean;
  themeColors?: Colors;
}

const SettingItem: React.FC<SettingItemProps> = ({
  icon,
  label,
  value,
  onPress,
  isLoading = false,
  isLast = false,
  themeColors: tc = colors,
}) => (
  <TouchableOpacity
    style={[styles.settingItem, { borderBottomColor: tc.border }, isLast && styles.settingItemLast]}
    onPress={onPress ? () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    } : undefined}
    activeOpacity={onPress ? 0.6 : 1}
    disabled={!onPress}
  >
    <View style={[styles.settingIconContainer, { backgroundColor: `${tc.primary}15` }]}>
      <Ionicons name={icon} size={20} color={tc.primary} />
    </View>
    <View style={styles.settingContent}>
      <Text style={[styles.settingLabel, { color: tc.text.primary }]}>{label}</Text>
      {(value || isLoading) && (
        <View style={styles.settingValueContainer}>
          {isLoading ? (
            <View style={[styles.loadingPlaceholder, { backgroundColor: tc.border }]} />
          ) : (
            <Text style={[styles.settingValue, { color: tc.text.secondary }]}>{value}</Text>
          )}
        </View>
      )}
    </View>
    <Ionicons name="chevron-forward" size={18} color={tc.text.secondary} />
  </TouchableOpacity>
);

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const [birthday, setBirthday] = useState<string>('');
  const [targetLifespan, setTargetLifespan] = useState<number>(0);
  const [dayStartHour, setDayStartHour] = useState<number>(0);
  const [showDayStartPicker, setShowDayStartPicker] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showPremiumInfoModal, setShowPremiumInfoModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showDebugSection, setShowDebugSection] = useState(false);
  const [showDevDebugPanel, setShowDevDebugPanel] = useState(false);
  const user = getCurrentUser();
  const { isPremium, status } = useSubscription();
  const { themeMode, setThemeMode, isDark } = useTheme();
  const themeColors = getColors(isDark);

  // デバッグセクションのアニメーション
  const debugHeightAnim = useRef(new Animated.Value(0)).current;

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const settings = await loadUserSettings();
      if (settings) {
        setBirthday(settings.birthday);
        setTargetLifespan(settings.targetLifespan);
        setDayStartHour(settings.dayStartHour ?? 0);
      }
    } catch (error) {
      console.error('設定の読み込みに失敗しました:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 画面がフォーカスされるたびに設定を再読み込み
  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings])
  );

  // デバッグセクションのトグルアニメーション
  useEffect(() => {
    Animated.timing(debugHeightAnim, {
      toValue: showDebugSection ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [showDebugSection, debugHeightAnim]);

  const toggleDebugSection = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowDebugSection(!showDebugSection);
  };

  const { logout } = useAuth();

  const handleSignOut = () => {
    Alert.alert(
      'ログアウト',
      'ログアウトしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'ログアウト',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              // AuthProviderが自動的に状態を更新し、ログイン画面に遷移
            } catch {
              Alert.alert('エラー', 'ログアウトに失敗しました');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'アカウント削除',
      'アカウントを削除すると、すべてのデータが完全に削除され、復元できません。本当に削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除する',
          style: 'destructive',
          onPress: () => {
            // 二重確認
            Alert.alert(
              '最終確認',
              'この操作は取り消せません。アカウントとすべてのデータを削除してもよろしいですか？',
              [
                { text: 'キャンセル', style: 'cancel' },
                {
                  text: '完全に削除',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      // Firestoreのユーザーデータを削除
                      await deleteAllUserData();
                      // Firebaseアカウントを削除
                      await deleteAccount();
                      // AuthProviderが自動的に状態を更新し、ログイン画面に遷移
                    } catch (error) {
                      const errorMessage = error instanceof Error ? error.message : 'アカウントの削除に失敗しました';
                      Alert.alert('エラー', errorMessage);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleDayStartHourChange = async (hour: number) => {
    setShowDayStartPicker(false);
    try {
      const settings = await loadUserSettings();
      if (settings) {
        await saveUserSettings({
          ...settings,
          dayStartHour: hour,
        });
        setDayStartHour(hour);
      }
    } catch (error) {
      console.error('開始時刻の保存に失敗:', error);
      Alert.alert('エラー', '設定の保存に失敗しました');
    }
  };

  const handleThemeChange = async (mode: ThemeMode) => {
    setShowThemePicker(false);
    try {
      await setThemeMode(mode);
    } catch (error) {
      console.error('テーマの保存に失敗:', error);
      Alert.alert('エラー', '設定の保存に失敗しました');
    }
  };

  const PREMIUM_FEATURES = [
    { text: '今日の気づき 無制限' },
    { text: '週間ふりかえり 無制限' },
    { text: '月間ふりかえり 無制限' },
    { text: '今日の気づき再生成' },
  ];

  // expiresAt は時刻付き ISO 8601 文字列のため new Date() で直接パースして問題なし。
  // getFullYear/getMonth/getDate はローカル時刻で返す。本アプリは日本向けのため
  // UTC との差異が表示上の問題になることはないが、意図を明示するため getDate() を使用。
  const formatExpiresAt = (isoString?: string): string => {
    if (!isoString) return '―';
    const d = new Date(isoString);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  };

  const formatDayStartHour = (hour: number): string => {
    return hour === 0 ? '0時（深夜0時）' : `${hour}時`;
  };

  const formatBirthday = (dateString: string): string => {
    const [year, month, day] = dateString.split('-');
    return `${year}年${parseInt(month)}月${parseInt(day)}日`;
  };

  const getThemeLabel = (mode: ThemeMode): string => {
    const option = THEME_OPTIONS.find((opt) => opt.value === mode);
    return option?.label || 'システム設定に従う';
  };

  // 動的なスタイル
  const dynamicStyles = {
    container: {
      backgroundColor: themeColors.background,
    },
    sectionTitle: {
      color: themeColors.text.secondary,
    },
    sectionCard: {
      backgroundColor: themeColors.surface,
      shadowColor: themeColors.shadow,
    },
    settingItem: {
      borderBottomColor: themeColors.border,
    },
    settingIconContainer: {
      backgroundColor: `${themeColors.primary}15`,
    },
    settingLabel: {
      color: themeColors.text.primary,
    },
    settingValue: {
      color: themeColors.text.secondary,
    },
    footerText: {
      color: themeColors.primary,
    },
    footerSubtext: {
      color: themeColors.text.secondary,
    },
    modalOverlay: {
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
      backgroundColor: themeColors.surface,
      shadowColor: themeColors.shadow,
    },
    modalHeader: {
      borderBottomColor: themeColors.border,
    },
    modalTitle: {
      color: themeColors.text.primary,
    },
    modalOption: {
      borderBottomColor: themeColors.border,
    },
    modalOptionText: {
      color: themeColors.text.primary,
    },
    premiumIconCircle: {
      backgroundColor: `${themeColors.primary}15`,
    },
    premiumFeaturesCard: {
      backgroundColor: `${themeColors.primary}08`,
    },
    premiumFeatureRowBorder: {
      borderBottomColor: `${themeColors.primary}15`,
    },
    premiumSubscriptionCard: {
      backgroundColor: themeColors.surface,
      borderColor: themeColors.border,
    },
  };

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title="設定"
        leftAction={{
          type: 'backIcon',
          onPress: () => navigation.goBack(),
        }}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* ⓪ プランセクション */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>プラン</Text>
          <View style={[styles.sectionCard, dynamicStyles.sectionCard]}>
            <SettingItem
              icon="diamond-outline"
              label="プレミアムプラン"
              value={isPremium ? '利用中' : 'アップグレード'}
              onPress={isPremium
                ? () => setShowPremiumInfoModal(true)
                : () => navigation.navigate('Paywall', { source: 'settings' })}
              isLast
              themeColors={themeColors}
            />
          </View>
        </View>

        {/* ① ウィジェット・通知セクション */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>ウィジェット・通知</Text>
          <View style={[styles.sectionCard, dynamicStyles.sectionCard]}>
            <SettingItem
              icon="apps-outline"
              label="ウィジェット設定"
              value="ホーム画面に追加"
              onPress={() => navigation.navigate('WidgetSettings')}
              themeColors={themeColors}
            />
            <SettingItem
              icon="notifications-outline"
              label="リマインダー"
              value="毎日の振り返りを習慣に"
              onPress={() => navigation.navigate('ReminderSettings')}
              isLast
              themeColors={themeColors}
            />
          </View>
        </View>

        {/* ② 一般設定セクション（外観 + 記録設定を統合） */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>一般設定</Text>
          <View style={[styles.sectionCard, dynamicStyles.sectionCard]}>
            <SettingItem
              icon="contrast-outline"
              label="テーマ"
              value={getThemeLabel(themeMode)}
              onPress={() => setShowThemePicker(true)}
              themeColors={themeColors}
            />
            <SettingItem
              icon="time-outline"
              label="1日の開始時刻"
              value={formatDayStartHour(dayStartHour)}
              onPress={() => setShowDayStartPicker(true)}
              isLoading={isLoading}
              isLast
              themeColors={themeColors}
            />
          </View>
        </View>

        {/* ③ プロフィール設定セクション */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>プロフィール</Text>
          <View style={[styles.sectionCard, dynamicStyles.sectionCard]}>
            <SettingItem
              icon="calendar-outline"
              label="誕生日"
              value={birthday ? formatBirthday(birthday) : undefined}
              onPress={() => navigation.navigate('EditBirthday')}
              isLoading={isLoading}
              themeColors={themeColors}
            />
            <SettingItem
              icon="flag-outline"
              label="目標寿命"
              value={targetLifespan > 0 ? `${targetLifespan}歳` : undefined}
              onPress={() => navigation.navigate('EditLifespan')}
              isLoading={isLoading}
              isLast
              themeColors={themeColors}
            />
          </View>
        </View>

        {/* ④ アカウントセクション（フィードバックを統合） */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>アカウント</Text>
          <View style={[styles.sectionCard, dynamicStyles.sectionCard]}>
            <View style={[styles.infoItem, dynamicStyles.settingItem]}>
              <View style={[styles.settingIconContainer, dynamicStyles.settingIconContainer]}>
                <Ionicons name="person-outline" size={20} color={themeColors.primary} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, dynamicStyles.settingLabel]}>ログイン状態</Text>
                <View style={styles.accountStatusRow}>
                  <Text style={[styles.settingValue, dynamicStyles.settingValue, { flexShrink: 1 }]} numberOfLines={1} ellipsizeMode="middle">
                    {user?.isAnonymous ? 'ゲストユーザー' : user?.email || '不明'}
                  </Text>
                  <View style={[
                    styles.accountBadge,
                    user?.isAnonymous ? styles.guestBadge : styles.linkedBadge
                  ]}>
                    <Ionicons
                      name={user?.isAnonymous ? 'warning-outline' : 'checkmark-circle'}
                      size={12}
                      color={user?.isAnonymous ? '#FF9800' : '#4CAF50'}
                    />
                    <Text style={[
                      styles.badgeText,
                      user?.isAnonymous ? styles.guestBadgeText : styles.linkedBadgeText
                    ]}>
                      {user?.isAnonymous ? '未連携' : '連携済み'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            {user?.isAnonymous ? (
              // 匿名ユーザーの場合：アカウント連携を表示
              <TouchableOpacity
                style={[styles.settingItem, dynamicStyles.settingItem]}
                onPress={() => navigation.navigate('LinkAccount')}
                activeOpacity={0.6}
              >
                <View style={[styles.settingIconContainer, styles.linkAccountIconContainer, dynamicStyles.settingIconContainer]}>
                  <Ionicons name="link-outline" size={20} color={themeColors.primary} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingLabel, dynamicStyles.settingLabel]}>アカウントを連携</Text>
                  <Text style={[styles.linkAccountSubtext, dynamicStyles.settingValue]}>メールアドレスでデータをバックアップ</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={themeColors.text.secondary} />
              </TouchableOpacity>
            ) : (
              // 非匿名ユーザーの場合：ログアウトを表示
              <TouchableOpacity
                style={[styles.settingItem, dynamicStyles.settingItem]}
                onPress={handleSignOut}
                activeOpacity={0.6}
              >
                <View style={[styles.settingIconContainer, styles.logoutIconContainer]}>
                  <Ionicons name="log-out-outline" size={20} color="#D32F2F" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingLabel, styles.logoutText]}>ログアウト</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={themeColors.text.secondary} />
              </TouchableOpacity>
            )}
            {/* フィードバック */}
            <SettingItem
              icon="chatbubble-ellipses-outline"
              label="ご意見・ご要望を送る"
              value="不具合報告や機能改善など"
              onPress={() => navigation.navigate('Feedback')}
              isLast
              themeColors={themeColors}
            />
          </View>
        </View>

        {/* ⑤ その他セクション（アプリ情報 + データ管理を統合） */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>その他</Text>
          <View style={[styles.sectionCard, dynamicStyles.sectionCard]}>
            {/* バージョン（タップで開発者メニューをトグル） */}
            {__DEV__ ? (
              <TouchableOpacity
                style={[styles.settingItem, dynamicStyles.settingItem]}
                onPress={toggleDebugSection}
                activeOpacity={0.6}
              >
                <View style={[styles.settingIconContainer, dynamicStyles.settingIconContainer]}>
                  <Ionicons name="information-circle-outline" size={20} color={themeColors.primary} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingLabel, dynamicStyles.settingLabel]}>バージョン</Text>
                  <Text style={[styles.settingValue, dynamicStyles.settingValue]}>1.0.0</Text>
                </View>
                <Ionicons
                  name={showDebugSection ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={themeColors.text.secondary}
                />
              </TouchableOpacity>
            ) : (
              <View style={[styles.settingItem, dynamicStyles.settingItem]}>
                <View style={[styles.settingIconContainer, dynamicStyles.settingIconContainer]}>
                  <Ionicons name="information-circle-outline" size={20} color={themeColors.primary} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingLabel, dynamicStyles.settingLabel]}>バージョン</Text>
                  <Text style={[styles.settingValue, dynamicStyles.settingValue]}>1.0.0</Text>
                </View>
              </View>
            )}

            {/* 開発者メニュー（アニメーション付きトグル） */}
            {__DEV__ && showDebugSection && (
              <Animated.View
                style={[
                  styles.debugSection,
                  {
                    opacity: debugHeightAnim,
                  },
                ]}
              >
                {/* 開発者メニューヘッダー */}
                <View style={styles.debugHeader}>
                  <Ionicons name="construct-outline" size={14} color="#FF9800" />
                  <Text style={styles.debugHeaderText}>開発者メニュー</Text>
                </View>

                <TouchableOpacity
                  style={[styles.debugItem]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    Alert.alert(
                      'オンボーディング再表示',
                      'オンボーディング画面を表示しますか？',
                      [
                        { text: 'キャンセル', style: 'cancel' },
                        {
                          text: '表示する',
                          onPress: async () => {
                            try {
                              await resetOnboarding();
                              navigation.reset({
                                index: 0,
                                routes: [{ name: 'Onboarding' }],
                              });
                            } catch {
                              Alert.alert('エラー', 'リセットに失敗しました。');
                            }
                          },
                        },
                      ]
                    );
                  }}
                  activeOpacity={0.6}
                >
                  <Ionicons name="refresh-outline" size={18} color="#FF9800" />
                  <Text style={styles.debugItemText}>オンボーディングを再表示</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.text.secondary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.debugItem, styles.debugItemLast]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    Alert.alert(
                      '初期設定を再表示',
                      '初期設定画面を表示しますか？',
                      [
                        { text: 'キャンセル', style: 'cancel' },
                        {
                          text: '表示する',
                          onPress: () => {
                            navigation.navigate('InitialSetup');
                          },
                        },
                      ]
                    );
                  }}
                  activeOpacity={0.6}
                >
                  <Ionicons name="settings-outline" size={18} color="#FF9800" />
                  <Text style={styles.debugItemText}>初期設定を再表示</Text>
                  <Ionicons name="chevron-forward" size={16} color={themeColors.text.secondary} />
                </TouchableOpacity>

                {/* サブスクリプション・利用状況デバッグ */}
                <TouchableOpacity
                  style={[styles.debugItem, styles.debugItemLast]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowDevDebugPanel(true);
                  }}
                  activeOpacity={0.6}
                >
                  <Ionicons name="bug-outline" size={18} color="#9C27B0" />
                  <Text style={[styles.debugItemText, { color: '#9C27B0' }]}>
                    課金・利用状況デバッグ
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={themeColors.text.secondary} />
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* アカウント削除 */}
            <TouchableOpacity
              style={[styles.settingItem, styles.settingItemLast]}
              onPress={handleDeleteAccount}
              activeOpacity={0.6}
            >
              <View style={[styles.settingIconContainer, styles.deleteIconContainer]}>
                <Ionicons name="trash-outline" size={20} color="#D32F2F" />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, styles.deleteText]}>
                  {user?.isAnonymous ? 'すべてのデータを削除' : 'アカウントを削除'}
                </Text>
                <Text style={[styles.deleteSubtext, dynamicStyles.settingValue]}>
                  {user?.isAnonymous
                    ? 'ローカルデータがすべて削除されます'
                    : 'アカウントとすべてのデータが削除されます'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={themeColors.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ⑥ 法的書類セクション */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>法的情報</Text>
          <View style={[styles.sectionCard, dynamicStyles.sectionCard]}>
            <SettingItem
              icon="shield-checkmark-outline"
              label="プライバシーポリシー"
              onPress={() => Linking.openURL(LEGAL_URLS.PRIVACY)}
              themeColors={themeColors}
            />
            <SettingItem
              icon="document-text-outline"
              label="利用規約"
              onPress={() => Linking.openURL(LEGAL_URLS.TERMS)}
              themeColors={themeColors}
            />
            <SettingItem
              icon="storefront-outline"
              label="特定商取引法に基づく表記"
              onPress={() => Linking.openURL(LEGAL_URLS.TOKUSHOHO)}
              isLast
              themeColors={themeColors}
            />
          </View>
        </View>

        {/* フッター */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, dynamicStyles.footerText]}>PivotLog</Text>
          <Text style={[styles.footerSubtext, dynamicStyles.footerSubtext]}>人生の時間を可視化する</Text>
        </View>
      </ScrollView>

      {/* 1日の開始時刻ピッカーモーダル */}
      <Modal
        visible={showDayStartPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDayStartPicker(false)}
      >
        <TouchableOpacity
          style={[styles.modalOverlay, dynamicStyles.modalOverlay]}
          activeOpacity={1}
          onPress={() => setShowDayStartPicker(false)}
        >
          <View style={[styles.modalContent, dynamicStyles.modalContent]}>
            <View style={[styles.modalHeader, dynamicStyles.modalHeader]}>
              <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>1日の開始時刻</Text>
              <TouchableOpacity onPress={() => setShowDayStartPicker(false)}>
                <Ionicons name="close" size={24} color={themeColors.text.secondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={DAY_START_HOUR_OPTIONS}
              keyExtractor={(item) => item.toString()}
              renderItem={({ item }) => {
                return (
                  <TouchableOpacity
                    style={[
                      styles.modalOption,
                      dynamicStyles.modalOption,
                      item === dayStartHour && { backgroundColor: `${themeColors.primary}10` },
                    ]}
                    onPress={() => handleDayStartHourChange(item)}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        dynamicStyles.modalOptionText,
                        item === dayStartHour && { color: themeColors.primary, fontWeight: fonts.weight.medium },
                      ]}
                    >
                      {item}時
                    </Text>
                    {item === dayStartHour && (
                      <Ionicons name="checkmark" size={20} color={themeColors.primary} />
                    )}
                  </TouchableOpacity>
                );
              }}
              style={styles.modalList}
              ListHeaderComponent={
                <View style={[styles.modalDescription, { backgroundColor: `${themeColors.primary}08`, borderBottomColor: themeColors.border }]}>
                  <Text style={[styles.modalDescriptionText, dynamicStyles.settingValue]}>
                    設定した時刻以降を「今日」として扱います。{"\n"}
                    例：4時に設定すると、3時に記録しても「昨日」の記録になります。
                  </Text>
                </View>
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* テーマピッカーモーダル */}
      <Modal
        visible={showThemePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowThemePicker(false)}
      >
        <TouchableOpacity
          style={[styles.modalOverlay, dynamicStyles.modalOverlay]}
          activeOpacity={1}
          onPress={() => setShowThemePicker(false)}
        >
          <View style={[styles.modalContent, dynamicStyles.modalContent]}>
            <View style={[styles.modalHeader, dynamicStyles.modalHeader]}>
              <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>テーマ</Text>
              <TouchableOpacity onPress={() => setShowThemePicker(false)}>
                <Ionicons name="close" size={24} color={themeColors.text.secondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={THEME_OPTIONS}
              keyExtractor={(item) => item.value}
              renderItem={({ item, index }) => {
                const isSelected = item.value === themeMode;
                const isLast = index === THEME_OPTIONS.length - 1;
                return (
                  <TouchableOpacity
                    style={[
                      styles.modalOption,
                      dynamicStyles.modalOption,
                      isSelected && { backgroundColor: `${themeColors.primary}10` },
                      isLast && { borderBottomWidth: 0 },
                    ]}
                    onPress={() => handleThemeChange(item.value)}
                  >
                    <View style={styles.themeOptionContent}>
                      <Ionicons name={item.icon} size={20} color={isSelected ? themeColors.primary : themeColors.text.secondary} />
                      <Text
                        style={[
                          styles.modalOptionText,
                          dynamicStyles.modalOptionText,
                          isSelected && { color: themeColors.primary, fontWeight: fonts.weight.medium },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark" size={20} color={themeColors.primary} />
                    )}
                  </TouchableOpacity>
                );
              }}
              style={styles.modalList}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* プレミアム情報モーダル */}
      <Modal
        visible={showPremiumInfoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPremiumInfoModal(false)}
      >
        <TouchableOpacity
          style={[styles.modalOverlay, dynamicStyles.modalOverlay]}
          activeOpacity={1}
          onPress={() => setShowPremiumInfoModal(false)}
        >
          <TouchableOpacity
            style={[styles.modalContent, styles.premiumModalContent, dynamicStyles.modalContent]}
            activeOpacity={1}
            onPress={() => {}}
          >
            <ScrollView style={styles.premiumModalBody} showsVerticalScrollIndicator={false}>
              {/* セクション1: プレミアムヘッダー */}
              <View style={styles.premiumHeader}>
                <TouchableOpacity
                  style={styles.premiumCloseIcon}
                  onPress={() => setShowPremiumInfoModal(false)}
                  hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
                >
                  <Ionicons name="close" size={22} color={themeColors.text.secondary} />
                </TouchableOpacity>
                <View style={[styles.premiumIconCircle, dynamicStyles.premiumIconCircle]}>
                  <Ionicons name="diamond" size={36} color={themeColors.primary} />
                </View>
                <Text style={[styles.premiumHeaderTitle, { color: themeColors.text.primary }]}>
                  PivotLog Premium
                </Text>
                <View style={[styles.premiumActiveBadge, { backgroundColor: `${themeColors.primary}20` }]}>
                  <Ionicons name="checkmark-circle" size={14} color={themeColors.primary} />
                  <Text style={[styles.premiumActiveBadgeText, { color: themeColors.primary }]}>利用中</Text>
                </View>
                <Text style={[styles.premiumThankYouText, { color: themeColors.text.secondary }]}>
                  ご利用ありがとうございます
                </Text>
              </View>

              {/* セクション2: 特典一覧カード */}
              <View style={[styles.premiumFeaturesCard, dynamicStyles.premiumFeaturesCard]}>
                {PREMIUM_FEATURES.map((feature, index) => (
                  <View
                    key={feature.text}
                    style={[
                      styles.premiumFeatureRow,
                      index < PREMIUM_FEATURES.length - 1 && [
                        { borderBottomWidth: StyleSheet.hairlineWidth },
                        dynamicStyles.premiumFeatureRowBorder,
                      ],
                    ]}
                  >
                    <Ionicons name="checkmark-circle" size={18} color={themeColors.primary} />
                    <Text style={[styles.premiumFeatureText, { color: themeColors.text.primary }]}>
                      {feature.text}
                    </Text>
                  </View>
                ))}
              </View>

              {/* セクション3: サブスクリプション情報カード */}
              <View style={[styles.premiumSubscriptionCard, dynamicStyles.premiumSubscriptionCard]}>
                <View style={styles.premiumSubInfoRow}>
                  <Text style={[styles.premiumSubInfoLabel, { color: themeColors.text.secondary }]}>有効期限</Text>
                  <Text style={[styles.premiumSubInfoValue, { color: themeColors.text.primary }]}>
                    {formatExpiresAt(status.expiresAt)}
                  </Text>
                </View>
                {status.isAutoRenewEnabled !== undefined && (
                  <View style={styles.premiumSubInfoRow}>
                    <Text style={[styles.premiumSubInfoLabel, { color: themeColors.text.secondary }]}>自動更新</Text>
                    <Text style={[styles.premiumSubInfoValue, { color: themeColors.text.primary }]}>
                      {status.isAutoRenewEnabled ? 'オン' : 'オフ'}
                    </Text>
                  </View>
                )}
              </View>

              {/* セクション4: App Store管理ボタン（iOSのみ） */}
              {/* Android向けは market://subscriptions または https://play.google.com/store/account/subscriptions を将来対応 */}
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={[styles.premiumManageButton, { borderColor: themeColors.primary }]}
                  onPress={() => Linking.openURL('itms-apps://apps.apple.com/account/subscriptions')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="storefront-outline" size={16} color={themeColors.primary} />
                  <Text style={[styles.premiumManageButtonText, { color: themeColors.primary }]}>
                    App Storeでサブスクを管理
                  </Text>
                </TouchableOpacity>
              )}

              {/* セクション5: 閉じるボタン */}
              <TouchableOpacity
                style={[styles.premiumCloseButton, { backgroundColor: themeColors.primary }]}
                onPress={() => setShowPremiumInfoModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.premiumCloseButtonText}>閉じる</Text>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* 開発用デバッグパネル */}
      {__DEV__ && (
        <DevDebugPanel
          visible={showDevDebugPanel}
          onClose={() => setShowDevDebugPanel(false)}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fonts.size.label,
    fontWeight: fonts.weight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.padding.screen,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    borderRadius: spacing.borderRadius.medium,
    shadowColor: colors.shadow,
    shadowOffset: spacing.shadow.offset,
    shadowOpacity: spacing.shadow.opacity,
    shadowRadius: spacing.shadow.radius,
    elevation: spacing.shadow.elevation,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingItemLast: {
    borderBottomWidth: 0,
  },
  settingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: fonts.size.body,
    color: colors.text.primary,
    fontFamily: fonts.family.regular,
    marginBottom: 2,
    ...textBase,
  },
  settingValue: {
    fontSize: fonts.size.label,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    lineHeight: 18,
    ...textBase,
  },
  settingValueContainer: {
    height: 18,
    justifyContent: 'center',
  },
  loadingPlaceholder: {
    width: 80,
    height: 14,
    backgroundColor: colors.border,
    borderRadius: 4,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingVertical: spacing.xl,
  },
  footerText: {
    fontSize: fonts.size.body,
    fontWeight: fonts.weight.medium,
    color: colors.primary,
    fontFamily: fonts.family.regular,
    marginBottom: spacing.xs,
    ...textBase,
  },
  footerSubtext: {
    fontSize: fonts.size.labelSmall,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  deleteIconContainer: {
    backgroundColor: '#D32F2F15',
  },
  deleteText: {
    color: '#D32F2F',
  },
  deleteSubtext: {
    fontSize: fonts.size.labelSmall,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    marginTop: 2,
    ...textBase,
  },
  logoutIconContainer: {
    backgroundColor: '#D32F2F15',
  },
  logoutText: {
    color: '#D32F2F',
  },
  linkAccountIconContainer: {
    backgroundColor: `${colors.primary}15`,
  },
  linkAccountSubtext: {
    fontSize: fonts.size.labelSmall,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    marginTop: 2,
    ...textBase,
  },
  debugSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: '#FFF8E1',
    borderBottomLeftRadius: spacing.borderRadius.medium,
    borderBottomRightRadius: spacing.borderRadius.medium,
    overflow: 'hidden',
  },
  debugHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#FFE0B2',
  },
  debugHeaderText: {
    fontSize: fonts.size.labelSmall,
    color: '#E65100',
    fontFamily: fonts.family.bold,
    ...textBase,
  },
  debugItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE0B2',
  },
  debugItemLast: {
    borderBottomWidth: 0,
  },
  debugItemText: {
    flex: 1,
    fontSize: fonts.size.label,
    color: colors.text.primary,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  accountStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  accountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  guestBadge: {
    backgroundColor: '#FF980015',
  },
  linkedBadge: {
    backgroundColor: '#4CAF5015',
  },
  badgeText: {
    fontSize: 10,
    fontFamily: fonts.family.bold,
    ...textBase,
  },
  guestBadgeText: {
    color: '#FF9800',
  },
  linkedBadgeText: {
    color: '#4CAF50',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.large,
    width: '80%',
    maxHeight: '60%',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fonts.size.body,
    fontWeight: fonts.weight.semibold,
    color: colors.text.primary,
    fontFamily: fonts.family.bold,
    ...textBase,
  },
  modalList: {
    maxHeight: 300,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalOptionSelected: {
    backgroundColor: `${colors.primary}10`,
  },
  modalOptionText: {
    fontSize: fonts.size.body,
    color: colors.text.primary,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  modalOptionTextSelected: {
    color: colors.primary,
    fontWeight: fonts.weight.medium,
  },
  modalDescription: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: `${colors.primary}08`,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalDescriptionText: {
    fontSize: fonts.size.labelSmall,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    lineHeight: 18,
    ...textBase,
  },
  themeOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  premiumModalContent: {
    width: '88%',
    maxHeight: '80%',
  },
  premiumModalBody: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  premiumHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  premiumIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  premiumHeaderTitle: {
    fontSize: fonts.size.title,
    fontFamily: fonts.family.bold,
    marginBottom: spacing.sm,
    ...textBase,
  },
  premiumActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: spacing.sm,
  },
  premiumActiveBadgeText: {
    fontSize: fonts.size.labelSmall,
    fontFamily: fonts.family.bold,
    ...textBase,
  },
  premiumThankYouText: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  premiumCloseIcon: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 1,
  },
  premiumFeaturesCard: {
    borderRadius: spacing.borderRadius.medium,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  premiumFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  premiumFeatureText: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  premiumSubscriptionCard: {
    borderRadius: spacing.borderRadius.medium,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  premiumSubInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  premiumSubInfoLabel: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  premiumSubInfoValue: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.bold,
    ...textBase,
  },
  premiumManageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.medium,
    borderWidth: 1,
  },
  premiumManageButtonText: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  premiumCloseButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.medium,
    alignItems: 'center',
  },
  premiumCloseButtonText: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.bold,
    color: '#FFFFFF',
    ...textBase,
  },
});

export default SettingsScreen;
