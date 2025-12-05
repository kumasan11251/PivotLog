import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, spacing, textBase } from '../../theme';

interface EncouragementHeaderProps {
  emoji: string;
  title: string;
  subtitle: string;
}

const EncouragementHeader: React.FC<EncouragementHeaderProps> = ({
  emoji,
  title,
  subtitle,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  emoji: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fonts.size.title,
    color: colors.text.primary,
    fontFamily: fonts.family.bold,
    marginBottom: spacing.xs,
    ...textBase,
  },
  subtitle: {
    fontSize: fonts.size.body,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
});

export default EncouragementHeader;
