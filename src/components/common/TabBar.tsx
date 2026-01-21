import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, textBase, getColors } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';

type TabType = 'home' | 'diaryList';

interface TabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export default function TabBar({ activeTab, onTabChange }: TabBarProps) {
  const { isDark } = useTheme();
  const themeColors = getColors(isDark);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.surface, borderTopColor: themeColors.border }]}>
      <TouchableOpacity
        style={styles.tab}
        onPress={() => onTabChange('home')}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, activeTab === 'home' && { backgroundColor: themeColors.primary + '15' }]}>
          <Ionicons
            name={activeTab === 'home' ? 'home' : 'home-outline'}
            size={20}
            color={activeTab === 'home' ? themeColors.primary : themeColors.text.secondary}
          />
        </View>
        <Text style={[styles.label, { color: themeColors.text.secondary }, activeTab === 'home' && { color: themeColors.primary }]}>
          ホーム
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tab}
        onPress={() => onTabChange('diaryList')}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, activeTab === 'diaryList' && { backgroundColor: themeColors.primary + '15' }]}>
          <Ionicons
            name={activeTab === 'diaryList' ? 'list' : 'list-outline'}
            size={20}
            color={activeTab === 'diaryList' ? themeColors.primary : themeColors.text.secondary}
          />
        </View>
        <Text style={[styles.label, { color: themeColors.text.secondary }, activeTab === 'diaryList' && { color: themeColors.primary }]}>
          記録一覧
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: spacing.xl,
    paddingTop: spacing.xs,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  iconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  activeIcon: {
    backgroundColor: colors.primary + '15', // 15% opacity
    borderRadius: 16,
  },
  label: {
    fontSize: 10,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  activeLabel: {
    color: colors.primary,
    fontFamily: fonts.family.bold,
  },
});
