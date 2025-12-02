import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, fonts, spacing, textBase } from '../theme';
import Button from '../components/common/Button';
import ScreenHeader from '../components/common/ScreenHeader';
import {
  linkAnonymousAccountWithEmail,
  getErrorMessage,
} from '../services/firebase';
import type { LinkAccountScreenNavigationProp } from '../types/navigation';

const LinkAccountScreen: React.FC = () => {
  const navigation = useNavigation<LinkAccountScreenNavigationProp>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLinkAccount = async () => {
    setError(null);

    // バリデーション
    if (!email.trim() || !password.trim()) {
      setError('メールアドレスとパスワードを入力してください');
      return;
    }

    if (password !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    if (password.length < 6) {
      setError('パスワードは6文字以上で入力してください');
      return;
    }

    setIsLoading(true);

    try {
      await linkAnonymousAccountWithEmail(email, password);
      Alert.alert(
        'アカウント連携完了',
        'メールアドレスでアカウントが作成されました。今後はこのメールアドレスでログインできます。',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="アカウント連携"
        leftAction={{
          type: 'backIcon',
          onPress: () => navigation.goBack(),
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* 説明 */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.description}>
              メールアドレスを登録すると、機種変更時やアプリの再インストール時にデータを復元できます。
            </Text>
          </View>

          {/* フォーム */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>メールアドレス</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="example@email.com"
                placeholderTextColor={colors.text.secondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>パスワード</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="6文字以上"
                placeholderTextColor={colors.text.secondary}
                secureTextEntry
                autoComplete="new-password"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>パスワード（確認）</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="もう一度入力"
                placeholderTextColor={colors.text.secondary}
                secureTextEntry
                autoComplete="new-password"
                editable={!isLoading}
              />
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <View style={styles.buttonContainer}>
              <Button
                title={isLoading ? '' : 'アカウントを連携'}
                onPress={handleLinkAccount}
                disabled={isLoading}
                style={styles.submitButton}
              />
              {isLoading && (
                <ActivityIndicator
                  color={colors.text.inverse}
                  style={styles.loadingIndicator}
                />
              )}
            </View>
          </View>

          {/* 注意書き */}
          <View style={styles.noteContainer}>
            <Text style={styles.noteText}>
              ※ 連携後も現在のデータはそのまま引き継がれます
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.padding.screen,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  descriptionContainer: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.medium,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  description: {
    fontSize: fonts.size.body,
    color: colors.text.primary,
    fontFamily: fonts.family.regular,
    lineHeight: 24,
    ...textBase,
  },
  form: {
    marginBottom: spacing.lg,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fonts.size.label,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.borderRadius.medium,
    padding: spacing.md,
    fontSize: fonts.size.body,
    color: colors.text.primary,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: fonts.size.label,
    textAlign: 'center',
    marginBottom: spacing.md,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  buttonContainer: {
    marginTop: spacing.md,
    position: 'relative',
  },
  submitButton: {
    marginTop: spacing.sm,
  },
  loadingIndicator: {
    position: 'absolute',
    top: spacing.sm + 14,
    alignSelf: 'center',
  },
  noteContainer: {
    alignItems: 'center',
  },
  noteText: {
    fontSize: fonts.size.labelSmall,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
});

export default LinkAccountScreen;
