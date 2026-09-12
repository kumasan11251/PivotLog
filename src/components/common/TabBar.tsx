import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, textBase, getColors } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import type { MainTabType } from '../../types/navigation';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface TabDefinition {
  key: MainTabType;
  label: string;
  activeIcon: IoniconName;
  inactiveIcon: IoniconName;
}

// タブ定義（表示順もこの配列の順序に従う）
const TABS: TabDefinition[] = [
  { key: 'home', label: 'ホーム', activeIcon: 'home', inactiveIcon: 'home-outline' },
  { key: 'diaryList', label: '記録一覧', activeIcon: 'list', inactiveIcon: 'list-outline' },
  { key: 'habit', label: '習慣', activeIcon: 'checkmark-circle', inactiveIcon: 'checkmark-circle-outline' },
];

interface TabBarProps {
  activeTab: MainTabType;
  onTabChange: (tab: MainTabType) => void;
}

export default function TabBar({ activeTab, onTabChange }: TabBarProps) {
  const { isDark } = useTheme();
  const themeColors = getColors(isDark);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.surface, borderTopColor: themeColors.border }]}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => onTabChange(tab.key)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, isActive && { backgroundColor: themeColors.primary + '15' }]}>
              <Ionicons
                name={isActive ? tab.activeIcon : tab.inactiveIcon}
                size={20}
                color={isActive ? themeColors.primary : themeColors.text.secondary}
              />
            </View>
            <Text style={[styles.label, { color: themeColors.text.secondary }, isActive && { color: themeColors.primary }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
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
  label: {
    fontSize: 10,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
});
