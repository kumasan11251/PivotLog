import React from 'react';
import { Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { colors, fonts, spacing, textBase } from '../../theme';

interface AIReflectionButtonProps {
  onPress: () => void;
  disabled?: boolean;
  hasReflection?: boolean;
}

/**
 * AIリフレクション取得ボタン
 * 日記入力後にAIからの気づきを受け取るためのボタン
 */
const AIReflectionButton: React.FC<AIReflectionButtonProps> = ({
  onPress,
  disabled = false,
  hasReflection = false,
}) => {
  // 既にリフレクションがある場合は「もう一度受け取る」表示
  const buttonText = hasReflection
    ? 'AIの気づきをもう一度受け取る'
    : 'AIからの気づきを受け取る';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          disabled && styles.buttonDisabled,
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
            disabled && styles.buttonTextDisabled,
            hasReflection && styles.buttonTextSecondary,
          ]}
        >
          {buttonText}
        </Text>
      </TouchableOpacity>

      {disabled && (
        <Text style={styles.hintText}>
          日記を入力するとAIの気づきを受け取れます
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
    backgroundColor: 'rgba(139, 157, 131, 0.15)', // primary の薄い背景
    borderRadius: spacing.borderRadius.medium,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  buttonDisabled: {
    backgroundColor: colors.border,
    borderColor: colors.border,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
  },
  icon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  buttonText: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.bold,
    color: colors.primary,
    ...textBase,
  },
  buttonTextDisabled: {
    color: colors.text.secondary,
  },
  buttonTextSecondary: {
    fontFamily: fonts.family.regular,
  },
  hintText: {
    fontSize: fonts.size.labelSmall,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    ...textBase,
  },
});

export default AIReflectionButton;
