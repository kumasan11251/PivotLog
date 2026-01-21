import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getColors, fonts, spacing, textBase } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';

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
  const { isDark } = useTheme();
  const themeColors = useMemo(() => getColors(isDark), [isDark]);

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.title, { color: themeColors.text.primary }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: themeColors.text.secondary }]}>{subtitle}</Text>
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
    fontFamily: fonts.family.bold,
    marginBottom: spacing.xs,
    ...textBase,
  },
  subtitle: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
});

export default EncouragementHeader;
