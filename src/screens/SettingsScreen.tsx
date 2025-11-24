import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { SettingsScreenNavigationProp } from '../types/navigation';
import { colors, fonts, spacing } from '../theme';
import { loadUserSettings } from '../utils/storage';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>設定</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => navigation.navigate('EditBirthday')}
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
          onPress={() => navigation.navigate('EditLifespan')}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.padding.screen,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  backIcon: {
    fontSize: 32,
    color: colors.text.primary,
    fontWeight: fonts.weight.light,
  },
  placeholder: {
    width: 32 + spacing.xs * 2,
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
