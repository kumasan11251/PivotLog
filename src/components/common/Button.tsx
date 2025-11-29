import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, fonts, spacing, textBase } from '../../theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
  textStyle,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        variant === 'primary' ? styles.primaryButton : styles.secondaryButton,
        disabled && styles.disabledButton,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text
        style={[
          styles.buttonText,
          variant === 'primary' ? styles.primaryButtonText : styles.secondaryButtonText,
          disabled && styles.disabledButtonText,
          textStyle,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: spacing.borderRadius.medium,
    padding: spacing.padding.button,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: spacing.shadow.offset,
    shadowOpacity: spacing.shadow.opacity,
    shadowRadius: spacing.shadow.radius,
    elevation: spacing.shadow.elevation,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderWidth: spacing.borderWidth,
    borderColor: colors.border,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: fonts.size.body,
    fontWeight: fonts.weight.semibold,
    letterSpacing: 1,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  primaryButtonText: {
    color: colors.text.inverse,
  },
  secondaryButtonText: {
    color: colors.text.primary,
  },
  disabledButtonText: {
    opacity: 0.6,
  },
});

export default Button;
