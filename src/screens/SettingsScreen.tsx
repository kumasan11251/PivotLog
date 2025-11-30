import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { SettingsScreenNavigationProp } from '../types/navigation';
import { colors, fonts, spacing, textBase } from '../theme';
import { loadUserSettings } from '../utils/storage';
import ScreenHeader from '../components/common/ScreenHeader';

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
    onPress={onPress}
    activeOpacity={0.6}
  >
    <View style={styles.settingIconContainer}>
      <Ionicons name={icon} size={20} color={colors.primary} />
    </View>
    <View style={styles.settingContent}>
      <Text style={styles.settingLabel}>{label}</Text>
      {isLoading ? (
        <View style={styles.loadingPlaceholder} />
      ) : value ? (
        <Text style={styles.settingValue}>{value}</Text>
      ) : null}
    </View>
    <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} />
  </TouchableOpacity>
);

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const [birthday, setBirthday] = useState<string>('');
  const [targetLifespan, setTargetLifespan] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const settings = await loadUserSettings();
      if (settings) {
        setBirthday(settings.birthday);
        setTargetLifespan(settings.targetLifespan);
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

  const formatBirthday = (dateString: string): string => {
    const [year, month, day] = dateString.split('-');
    return `${year}年${parseInt(month)}月${parseInt(day)}日`;
  };

  const calculateAge = (birthdayString: string): number => {
    const [year, month, day] = birthdayString.split('-').map(Number);
    const birthday = new Date(year, month - 1, day);
    const today = new Date();
    let age = today.getFullYear() - birthday.getFullYear();
    const monthDiff = today.getMonth() - birthday.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthday.getDate())) {
      age--;
    }
    return age;
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

        {/* 現在のステータス */}
        {!isLoading && birthday && targetLifespan > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>現在のステータス</Text>
            <View style={styles.statusCard}>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>現在の年齢</Text>
                <Text style={styles.statusValue}>{calculateAge(birthday)}歳</Text>
              </View>
              <View style={styles.statusDivider} />
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>残りの目標年数</Text>
                <Text style={styles.statusValue}>
                  {targetLifespan - calculateAge(birthday)}年
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* アプリ情報 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>アプリ情報</Text>
          <View style={styles.sectionCard}>
            <View style={[styles.infoItem, styles.settingItemLast]}>
              <View style={styles.settingIconContainer}>
                <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>バージョン</Text>
                <Text style={styles.settingValue}>1.0.0</Text>
              </View>
            </View>
          </View>
        </View>

        {/* フッター */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>PivotLog</Text>
          <Text style={styles.footerSubtext}>人生の時間を可視化する</Text>
        </View>
      </ScrollView>
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
    ...textBase,
  },
  loadingPlaceholder: {
    width: 80,
    height: 14,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginTop: 2,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    borderRadius: spacing.borderRadius.medium,
    flexDirection: 'row',
    paddingVertical: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: spacing.shadow.offset,
    shadowOpacity: spacing.shadow.opacity,
    shadowRadius: spacing.shadow.radius,
    elevation: spacing.shadow.elevation,
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
  },
  statusDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  statusLabel: {
    fontSize: fonts.size.labelSmall,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    marginBottom: spacing.xs,
    ...textBase,
  },
  statusValue: {
    fontSize: fonts.size.title,
    fontWeight: fonts.weight.semibold,
    color: colors.primary,
    fontFamily: fonts.family.bold,
    ...textBase,
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
});

export default SettingsScreen;
