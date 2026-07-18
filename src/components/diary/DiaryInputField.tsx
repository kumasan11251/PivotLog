import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getColors, fonts, spacing, textBase } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { MAX_CHARS } from '../../constants/diaryEntry';

interface DiaryInputFieldProps {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (text: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  isFocused: boolean;
  isPaging: boolean;
  showCheckmark: boolean;
}

const PRESS_RETENTION_OFFSET = 8;

export interface DiaryInputFieldRef {
  focus: () => void;
  blur: () => void;
  isFocused: () => boolean;
  measureInWindow: (
    callback: (x: number, y: number, width: number, height: number) => void
  ) => void;
}

const DiaryInputField = forwardRef<DiaryInputFieldRef, DiaryInputFieldProps>(
  (
    {
      label,
      value,
      placeholder,
      onChangeText,
      onFocus,
      onBlur,
      isFocused,
      isPaging,
      showCheckmark,
    },
    ref
  ) => {
    const { isDark } = useTheme();
    const themeColors = useMemo(() => getColors(isDark), [isDark]);
    const inputRef = useRef<TextInput>(null);

    const blurInput = useCallback(() => {
      inputRef.current?.blur();
    }, []);

    const activateInput = useCallback(() => {
      if (isPaging) return;
      inputRef.current?.focus();
    }, [isPaging]);

    useImperativeHandle(ref, () => ({
      focus: activateInput,
      blur: blurInput,
      isFocused: () => inputRef.current?.isFocused() ?? false,
      measureInWindow: (callback) => inputRef.current?.measureInWindow(callback),
    }), [activateInput, blurInput]);

    return (
      <View style={styles.container}>
        <View style={styles.labelContainer}>
          <View style={styles.labelWithCheck}>
            <Text style={[styles.label, { color: themeColors.text.primary }]}>{label}</Text>
            {showCheckmark && (
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={themeColors.primary}
                style={styles.checkIcon}
              />
            )}
          </View>
          {MAX_CHARS - value.length <= 20 && (
            <Text style={[styles.charCount, { color: themeColors.text.secondary }]}>
              残り{MAX_CHARS - value.length}文字
            </Text>
          )}
        </View>
        <View
          style={[
            styles.inputContainer,
            { backgroundColor: themeColors.surface, borderColor: themeColors.border },
            isFocused && { borderColor: themeColors.primary, borderWidth: 2 },
          ]}
        >
          <TextInput
            ref={inputRef}
            style={[styles.textInput, { color: themeColors.text.primary }]}
            value={value}
            onChangeText={onChangeText}
            onFocus={onFocus}
            onBlur={onBlur}
            pointerEvents={isFocused ? 'auto' : 'none'}
            placeholder={placeholder}
            placeholderTextColor={themeColors.text.placeholder}
            multiline
            textAlignVertical="center"
            maxLength={MAX_CHARS}
          />
          {!isFocused && (
            <Pressable
              style={styles.focusOverlay}
              onPress={activateInput}
              disabled={isPaging}
              pressRetentionOffset={PRESS_RETENTION_OFFSET}
              accessible={false}
            />
          )}
        </View>
      </View>
    );
  }
);

DiaryInputField.displayName = 'DiaryInputField';

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.padding.screen,
    marginBottom: 32,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  labelWithCheck: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkIcon: {
    marginLeft: spacing.xs,
  },
  label: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  charCount: {
    fontSize: fonts.size.labelSmall,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  inputContainer: {
    borderRadius: spacing.borderRadius.medium,
    borderWidth: spacing.borderWidth,
    padding: spacing.md,
  },
  textInput: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.regular,
    lineHeight: 22,
    minHeight: 22,
    paddingTop: 0,
    paddingBottom: 0,
    includeFontPadding: false,
    ...textBase,
  },
  focusOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default DiaryInputField;
