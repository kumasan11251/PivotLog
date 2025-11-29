import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, fonts, spacing, textBase } from '../../theme';

interface SectionHeaderProps {
  title: string;
  onToggle: () => void;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, onToggle }) => {
  return (
    <View style={styles.titleContainer}>
      <Text style={styles.title}>{title}</Text>
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <Text style={styles.toggleButtonText}>切替</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  titleContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
    position: 'relative',
  },
  title: {
    fontSize: fonts.size.sectionTitle,
    fontWeight: fonts.weight.semibold,
    color: colors.text.primary,
    textAlign: 'center',
    letterSpacing: 3,
    fontFamily: fonts.family.bold,
    ...textBase,
  },
  toggleButton: {
    position: 'absolute',
    right: 0,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(139, 157, 131, 0.1)',
    borderRadius: spacing.borderRadius.small,
  },
  toggleButtonText: {
    fontSize: fonts.size.labelSmall,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    letterSpacing: 0.5,
    ...textBase,
  },
});

export default SectionHeader;
