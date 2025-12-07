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
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { SettingsScreenNavigationProp } from '../types/navigation';
import { colors, fonts, spacing, textBase } from '../theme';
import { loadUserSettings, saveUserSettings, resetOnboarding } from '../utils/storage';
import { getCurrentUser, deleteAccount } from '../services/firebase';
import { deleteAllUserData } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';
import ScreenHeader from '../components/common/ScreenHeader';

// 1日の開始時刻の選択肢（0時〜12時）
const DAY_START_HOUR_OPTIONS = Array.from({ length: 13 }, (_, i) => i);

interface SettingItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress: () => void;
  isLoading?: boolean;
  isLast?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({
  icon,
  label,
  value,
  onPress,
  isLoading = false,
  isLast = false,
}) => (
  <TouchableOpacity
    style={[styles.settingItem, isLast && styles.settingItemLast]}
    onPress={() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }}
    activeOpacity={0.6}
  >
    <View style={styles.settingIconContainer}>
      <Ionicons name={icon} size={20} color={colors.primary} />
    </View>
    <View style={styles.settingContent}>
      <Text style={styles.settingLabel}>{label}</Text>
      <View style={styles.settingValueContainer}>
        {isLoading ? (
          <View style={styles.loadingPlaceholder} />
        ) : (
          <Text style={styles.settingValue}>{value || ' '}</Text>
        )}
      </View>
    </View>
    <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} />
  </TouchableOpacity>
);

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const [birthday, setBirthday] = useState<string>('');
  const [targetLifespan, setTargetLifespan] = useState<number>(0);
  const [dayStartHour, setDayStartHour] = useState<number>(0);
  const [showDayStartPicker, setShowDayStartPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showDebugSection, setShowDebugSection] = useState(false);
  const user = getCurrentUser();

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

  const formatDayStartHour = (hour: number): string => {
    return hour === 0 ? '0時（深夜0時）' : `${hour}時`;
  };

  const formatBirthday = (dateString: string): string => {
    const [year, month, day] = dateString.split('-');
    return `${year}年${parseInt(month)}月${parseInt(day)}日`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
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
        {/* プロフィール設定セクション */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>プロフィール</Text>
          <View style={styles.sectionCard}>
            <SettingItem
              icon="calendar-outline"
              label="誕生日"
              value={birthday ? formatBirthday(birthday) : undefined}
              onPress={() => navigation.navigate('EditBirthday')}
              isLoading={isLoading}
            />
            <SettingItem
              icon="flag-outline"
              label="目標寿命"
              value={targetLifespan > 0 ? `${targetLifespan}歳` : undefined}
              onPress={() => navigation.navigate('EditLifespan')}
              isLoading={isLoading}
              isLast
            />
          </View>
        </View>

        {/* 記録設定セクション */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>記録設定</Text>
          <View style={styles.sectionCard}>
            <SettingItem
              icon="time-outline"
              label="1日の開始時刻"
              value={formatDayStartHour(dayStartHour)}
              onPress={() => setShowDayStartPicker(true)}
              isLoading={isLoading}
              isLast
            />
          </View>
          <Text style={styles.sectionHint}>
            深夜に前日の記録をする場合は、開始時刻を遅めに設定してください
          </Text>
        </View>

        {/* アプリ情報 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>アプリ情報</Text>
          <View style={styles.sectionCard}>
            {/* バージョン（タップで開発者メニューをトグル） */}
            <TouchableOpacity
              style={[styles.settingItem, !showDebugSection && styles.settingItemLast]}
              onPress={toggleDebugSection}
              activeOpacity={0.6}
            >
              <View style={styles.settingIconContainer}>
                <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>バージョン</Text>
                <Text style={styles.settingValue}>1.0.0</Text>
              </View>
              <Ionicons
                name={showDebugSection ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.text.secondary}
              />
            </TouchableOpacity>

            {/* 開発者メニュー（アニメーション付きトグル） */}
            {showDebugSection && (
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
                  <Ionicons name="chevron-forward" size={16} color={colors.text.secondary} />
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        </View>

        {/* アカウント */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>アカウント</Text>
          <View style={styles.sectionCard}>
            <View style={[styles.infoItem]}>
              <View style={styles.settingIconContainer}>
                <Ionicons name="person-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>ログイン状態</Text>
                <View style={styles.accountStatusRow}>
                  <Text style={styles.settingValue}>
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
              <>
                <TouchableOpacity
                  style={[styles.settingItem, styles.settingItemLast]}
                  onPress={() => navigation.navigate('LinkAccount')}
                  activeOpacity={0.6}
                >
                  <View style={[styles.settingIconContainer, styles.linkAccountIconContainer]}>
                    <Ionicons name="link-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={styles.settingLabel}>アカウントを連携</Text>
                    <Text style={styles.linkAccountSubtext}>メールアドレスでデータをバックアップ</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} />
                </TouchableOpacity>
              </>
            ) : (
              // 非匿名ユーザーの場合：ログアウトを表示
              <>
                <TouchableOpacity
                  style={[styles.settingItem, styles.settingItemLast]}
                  onPress={handleSignOut}
                  activeOpacity={0.6}
                >
                  <View style={[styles.settingIconContainer, styles.logoutIconContainer]}>
                    <Ionicons name="log-out-outline" size={20} color="#D32F2F" />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={[styles.settingLabel, styles.logoutText]}>ログアウト</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* データ削除セクション */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>データ管理</Text>
          <View style={styles.sectionCard}>
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
                <Text style={styles.deleteSubtext}>
                  {user?.isAnonymous
                    ? 'ローカルデータがすべて削除されます'
                    : 'アカウントとすべてのデータが削除されます'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* フッター */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>PivotLog</Text>
          <Text style={styles.footerSubtext}>人生の時間を可視化する</Text>
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
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDayStartPicker(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>1日の開始時刻</Text>
              <TouchableOpacity onPress={() => setShowDayStartPicker(false)}>
                <Ionicons name="close" size={24} color={colors.text.secondary} />
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
                      item === dayStartHour && styles.modalOptionSelected,
                    ]}
                    onPress={() => handleDayStartHourChange(item)}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        item === dayStartHour && styles.modalOptionTextSelected,
                      ]}
                    >
                      {item}時
                    </Text>
                    {item === dayStartHour && (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              }}
              style={styles.modalList}
              ListHeaderComponent={
                <View style={styles.modalDescription}>
                  <Text style={styles.modalDescriptionText}>
                    設定した時刻以降を「今日」として扱います。{"\n"}
                    例：4時に設定すると、3時に記録しても「昨日」の記録になります。
                  </Text>
                </View>
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>
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
  sectionHint: {
    fontSize: fonts.size.labelSmall,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    marginTop: spacing.sm,
    marginHorizontal: spacing.padding.screen,
    ...textBase,
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
});

export default SettingsScreen;
