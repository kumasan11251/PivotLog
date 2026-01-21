import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getColors, fonts, spacing, textBase } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { getProgressMessage } from '../../constants/diaryEntry';

interface ProgressIndicatorProps {
  progress: number;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ progress }) => {
  const { isDark } = useTheme();
  const themeColors = useMemo(() => getColors(isDark), [isDark]);

  return (
    <View style={styles.container}>
      <View style={styles.dots}>
        {[0, 1, 2].map((index) => (
          <Ionicons
            key={index}
            name={index < progress ? 'checkmark-circle' : 'checkmark-circle-outline'}
            size={24}
            color={index < progress ? themeColors.primary : themeColors.border}
            style={styles.icon}
          />
        ))}
      </View>
      <Text style={[styles.text, { color: themeColors.text.secondary }]}>{getProgressMessage(progress)}</Text>
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
    fontFamily: fonts.family.regular,
    ...textBase,
  },
});

export default ProgressIndicator;
