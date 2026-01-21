import React, { useMemo } from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { getColors, fonts, spacing, textBase } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';

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
  const { isDark } = useTheme();
  const themeColors = useMemo(() => getColors(isDark), [isDark]);

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { shadowColor: themeColors.shadow },
        variant === 'primary' ? { backgroundColor: themeColors.primary } : { backgroundColor: themeColors.surface, borderWidth: spacing.borderWidth, borderColor: themeColors.border },
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
          variant === 'primary' ? { color: themeColors.text.inverse } : { color: themeColors.text.primary },
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
    shadowOffset: spacing.shadow.offset,
    shadowOpacity: spacing.shadow.opacity,
    shadowRadius: spacing.shadow.radius,
    elevation: spacing.shadow.elevation,
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
  disabledButtonText: {
    opacity: 0.6,
  },
});

export default Button;
