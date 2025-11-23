import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, spacing } from '../theme';
import { loadUserSettings } from '../utils/storage';

interface SettingsScreenProps {
  onBack: () => void;
  onEditBirthday: () => void;
  onEditLifespan: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onBack,
  onEditBirthday,
  onEditLifespan,
}) => {
  const [birthday, setBirthday] = useState<string>('');
  const [targetLifespan, setTargetLifespan] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
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
  };

  const formatBirthday = (dateString: string): string => {
    const [year, month, day] = dateString.split('-');
    return `${year}年${parseInt(month)}月${parseInt(day)}日`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>設定</Text>
      </View>

      <ScrollView style={styles.content}>
        <TouchableOpacity
          style={styles.settingItem}
          onPress={onEditBirthday}
        >
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>誕生日</Text>
            {!isLoading && birthday && (
              <Text style={styles.settingValue}>
                {formatBirthday(birthday)}
              </Text>
            )}
          </View>
          <Text style={styles.arrowIcon}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={onEditLifespan}
        >
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>目標寿命</Text>
            {!isLoading && targetLifespan > 0 && (
              <Text style={styles.settingValue}>
                {targetLifespan}歳
              </Text>
            )}
          </View>
          <Text style={styles.arrowIcon}>›</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.padding.screen,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  backButtonText: {
    fontSize: fonts.size.body,
    color: colors.primary,
    fontFamily: fonts.family.regular,
  },
  headerTitle: {
    fontSize: fonts.size.heading,
    fontWeight: fonts.weight.regular,
    color: colors.text.primary,
    fontFamily: fonts.family.regular,
  },
  content: {
    flex: 1,
    paddingTop: spacing.md,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.padding.screen,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: fonts.size.body,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    marginBottom: spacing.xs,
  },
  settingValue: {
    fontSize: fonts.size.body,
    color: colors.text.primary,
    fontFamily: fonts.family.bold,
  },
  arrowIcon: {
    fontSize: fonts.size.title,
    color: colors.text.secondary,
    fontWeight: fonts.weight.light,
  },
});

export default SettingsScreen;
