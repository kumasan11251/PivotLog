import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getColors, fonts, spacing, textBase } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';

const EmptyList: React.FC = () => {
  const { isDark } = useTheme();
  const themeColors = useMemo(() => getColors(isDark), [isDark]);

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: themeColors.text.primary }]}>この月の記録はありません</Text>
      <Text style={[styles.description, { color: themeColors.text.secondary }]}>
        日記を記録して、毎日を振り返りましょう
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  title: {
    fontSize: fonts.size.body,
    fontWeight: fonts.weight.semibold,
    fontFamily: fonts.family.bold,
    marginBottom: spacing.sm,
    ...textBase,
  },
  description: {
    fontSize: fonts.size.labelSmall,
    fontFamily: fonts.family.regular,
    textAlign: 'center',
    ...textBase,
  },
});

export default EmptyList;
