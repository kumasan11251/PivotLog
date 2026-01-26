import React, { useMemo } from 'react';
import { Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { getColors, fonts, spacing, textBase } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';

interface AIReflectionButtonProps {
  onPress: () => void;
  disabled?: boolean;
  hasReflection?: boolean;
}

/**
 * AIリフレクション取得ボタン
 * 日記入力後にPivotLogからの気づきを受け取るためのボタン
 */
const AIReflectionButton: React.FC<AIReflectionButtonProps> = ({
  onPress,
  disabled = false,
  hasReflection = false,
}) => {
  const { isDark } = useTheme();
  const themeColors = useMemo(() => getColors(isDark), [isDark]);

  // 既にリフレクションがある場合は「もう一度受け取る」表示
  const buttonText = hasReflection
    ? 'もう一度気づきを受け取る'
    : 'PivotLogからの気づきを受け取る';

  const buttonBackgroundColor = disabled
    ? themeColors.border
    : hasReflection
    ? 'transparent'
    : `${themeColors.primary}20`;

  const buttonBorderColor = disabled ? themeColors.border : themeColors.primary;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: buttonBackgroundColor,
            borderColor: buttonBorderColor,
          },
          hasReflection && styles.buttonSecondary,
        ]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text style={styles.icon}>✨</Text>
        <Text
          style={[
            styles.buttonText,
            { color: themeColors.primary },
            disabled && { color: themeColors.text.secondary },
            hasReflection && styles.buttonTextSecondary,
          ]}
        >
          {buttonText}
        </Text>
      </TouchableOpacity>

      {disabled && (
        <Text style={[styles.hintText, { color: themeColors.text.secondary }]}>
          日記を入力すると気づきを受け取れます
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.padding.screen,
  },
  button: {
    borderRadius: spacing.borderRadius.medium,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  buttonSecondary: {
    borderStyle: 'dashed',
  },
  icon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  buttonText: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.bold,
    ...textBase,
  },
  buttonTextSecondary: {
    fontFamily: fonts.family.regular,
  },
  hintText: {
    fontSize: fonts.size.labelSmall,
    fontFamily: fonts.family.regular,
    textAlign: 'center',
    marginTop: spacing.sm,
    ...textBase,
  },
});

export default AIReflectionButton;
