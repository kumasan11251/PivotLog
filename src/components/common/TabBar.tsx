import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../../theme';

type TabType = 'home' | 'diaryList' | 'settings';

interface TabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export default function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.tab}
        onPress={() => onTabChange('home')}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, activeTab === 'home' && styles.activeIcon]}>
          <Text style={[styles.icon, activeTab === 'home' && styles.activeIconText]}>
            ◷
          </Text>
        </View>
        <Text style={[styles.label, activeTab === 'home' && styles.activeLabel]}>
          ホーム
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tab}
        onPress={() => onTabChange('diaryList')}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, activeTab === 'diaryList' && styles.activeIcon]}>
          <Text style={[styles.icon, activeTab === 'diaryList' && styles.activeIconText]}>
            ◫
          </Text>
        </View>
        <Text style={[styles.label, activeTab === 'diaryList' && styles.activeLabel]}>
          記録一覧
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tab}
        onPress={() => onTabChange('settings')}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, activeTab === 'settings' && styles.activeIcon]}>
          <Text style={[styles.icon, activeTab === 'settings' && styles.activeIconText]}>
            ⚙︎
          </Text>
        </View>
        <Text style={[styles.label, activeTab === 'settings' && styles.activeLabel]}>
          設定
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
    marginBottom: 4,
  },
  activeIcon: {
    backgroundColor: colors.primary + '15', // 15% opacity
    borderRadius: 16,
  },
  icon: {
    fontSize: 20,
    color: colors.text.secondary,
  },
  activeIconText: {
    color: colors.primary,
  },
  label: {
    fontSize: 11,
    color: colors.text.secondary,
    fontFamily: 'NotoSansJP_400Regular',
  },
  activeLabel: {
    color: colors.primary,
    fontFamily: 'NotoSansJP_700Bold',
  },
});
