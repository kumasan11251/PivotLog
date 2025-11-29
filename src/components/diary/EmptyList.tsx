import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, spacing, textBase } from '../../theme';

const EmptyList: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>この月の記録はありません</Text>
      <Text style={styles.description}>
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
    fontSize: fonts.size.title,
    fontWeight: fonts.weight.semibold,
    color: colors.text.primary,
    fontFamily: fonts.family.bold,
    marginBottom: spacing.sm,
    ...textBase,
  },
  description: {
    fontSize: fonts.size.body,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    textAlign: 'center',
    ...textBase,
  },
});

export default EmptyList;
