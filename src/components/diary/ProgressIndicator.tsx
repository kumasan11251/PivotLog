import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, textBase } from '../../theme';
import { getProgressMessage } from '../../constants/diaryEntry';

interface ProgressIndicatorProps {
  progress: number;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ progress }) => {
  return (
    <View style={styles.container}>
      <View style={styles.dots}>
        {[0, 1, 2].map((index) => (
          <Ionicons
            key={index}
            name={index < progress ? 'checkmark-circle' : 'checkmark-circle-outline'}
            size={24}
            color={index < progress ? colors.primary : colors.border}
            style={styles.icon}
          />
        ))}
      </View>
      <Text style={styles.text}>{getProgressMessage(progress)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  icon: {
    marginHorizontal: spacing.xs,
  },
  text: {
    fontSize: fonts.size.labelSmall,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
});

export default ProgressIndicator;
