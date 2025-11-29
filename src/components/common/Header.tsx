import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { HomeScreenNavigationProp } from '../../types/navigation';
import { colors, fonts, spacing, textBase } from '../../theme';

interface HeaderProps {
  title: string;
  showSettings?: boolean;
}

const Header: React.FC<HeaderProps> = ({ title, showSettings = true }) => {
  const navigation = useNavigation<HomeScreenNavigationProp>();

  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
      {showSettings && (
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={20} color={colors.text.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.padding.screen,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fonts.size.body,
    fontWeight: fonts.weight.regular,
    color: colors.text.primary,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  settingsButton: {
    padding: spacing.sm,
  },
});

export default Header;
