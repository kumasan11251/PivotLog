import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, textBase } from '../../theme';

type TabType = 'home' | 'diaryList';

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
          <Ionicons
            name={activeTab === 'home' ? 'home' : 'home-outline'}
            size={20}
            color={activeTab === 'home' ? colors.primary : colors.text.secondary}
          />
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
          <Ionicons
            name={activeTab === 'diaryList' ? 'list' : 'list-outline'}
            size={20}
            color={activeTab === 'diaryList' ? colors.primary : colors.text.secondary}
          />
        </View>
        <Text style={[styles.label, activeTab === 'diaryList' && styles.activeLabel]}>
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
