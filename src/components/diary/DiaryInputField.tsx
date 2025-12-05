import React, { forwardRef, useRef, useImperativeHandle } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, textBase } from '../../theme';
import { MAX_CHARS } from '../../constants/diaryEntry';

interface DiaryInputFieldProps {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (text: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  isFocused: boolean;
  showCheckmark: boolean;
}

export interface DiaryInputFieldRef {
  focus: () => void;
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
      showCheckmark,
    },
    ref
  ) => {
    const inputRef = useRef<TextInput>(null);

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      measureInWindow: (callback) => inputRef.current?.measureInWindow(callback),
    }));

    return (
      <View style={styles.container}>
        <View style={styles.labelContainer}>
          <View style={styles.labelWithCheck}>
            <Text style={styles.label}>{label}</Text>
            {showCheckmark && (
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={colors.primary}
                style={styles.checkIcon}
              />
            )}
          </View>
          <Text style={styles.charCount}>
            {value.length}/{MAX_CHARS}
          </Text>
        </View>
        <View style={[styles.inputContainer, isFocused && styles.inputContainerFocused]}>
          <TextInput
            ref={inputRef}
            style={styles.textInput}
            value={value}
            onChangeText={onChangeText}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder={placeholder}
            placeholderTextColor={colors.text.secondary}
            multiline
            textAlignVertical="top"
            maxLength={MAX_CHARS}
          />
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
    color: colors.text.primary,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  charCount: {
    fontSize: fonts.size.labelSmall,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  inputContainer: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.medium,
    borderWidth: spacing.borderWidth,
    borderColor: colors.border,
    padding: spacing.md,
  },
  inputContainerFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  textInput: {
    fontSize: fonts.size.body,
    color: colors.text.primary,
    fontFamily: fonts.family.regular,
    lineHeight: 22,
    minHeight: 22,
    paddingTop: 0,
    paddingBottom: 0,
    ...textBase,
  },
});

export default DiaryInputField;
