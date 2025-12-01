import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { colors, fonts, spacing, textBase } from '../theme';
import Button from '../components/common/Button';
import {
  signInWithEmail,
  signUpWithEmail,
  signInAnonymously,
  getErrorMessage,
} from '../services/firebase';

type AuthMode = 'login' | 'signup';

const AuthScreen: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);

    // バリデーション
    if (!email.trim() || !password.trim()) {
      setError('メールアドレスとパスワードを入力してください');
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    if (password.length < 6) {
      setError('パスワードは6文字以上で入力してください');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
      // 認証成功後はAuthProviderが自動的に状態を更新し、
      // App.tsxのナビゲーションが適切な画面に遷移する
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnonymousLogin = async () => {
    setError(null);
    setIsLoading(true);

    try {
      await signInAnonymously();
      // 認証成功後はAuthProviderが自動的に状態を更新
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError(null);
    setConfirmPassword('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* ヘッダー */}
          <View style={styles.header}>
            <Text style={styles.title}>PivotLog</Text>
            <Text style={styles.subtitle}>
              {mode === 'login' ? 'おかえりなさい' : 'はじめまして'}
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
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                editable={!isLoading}
              />
            </View>

            {mode === 'signup' && (
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
            )}

            {error && <Text style={styles.errorText}>{error}</Text>}

            <Button
              title={isLoading ? '' : mode === 'login' ? 'ログイン' : 'アカウント作成'}
              onPress={handleSubmit}
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

          {/* 切り替えリンク */}
          <View style={styles.switchContainer}>
            <Text style={styles.switchText}>
              {mode === 'login' ? 'アカウントをお持ちでない方は' : 'すでにアカウントをお持ちの方は'}
            </Text>
            <TouchableOpacity onPress={toggleMode} disabled={isLoading}>
              <Text style={styles.switchLink}>
                {mode === 'login' ? '新規登録' : 'ログイン'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 匿名ログイン */}
          <View style={styles.anonymousContainer}>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>または</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.anonymousButton}
              onPress={handleAnonymousLogin}
              disabled={isLoading}
            >
              <Text style={styles.anonymousButtonText}>
                ログインせずに始める
              </Text>
            </TouchableOpacity>

            <Text style={styles.anonymousNote}>
              ※ 後からアカウントを作成してデータを引き継げます
            </Text>
          </View>
        </View>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.padding.screen,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg * 2,
  },
  title: {
    fontSize: 36,
    fontWeight: fonts.weight.semibold,
    color: colors.primary,
    fontFamily: fonts.family.bold,
    ...textBase,
  },
  subtitle: {
    fontSize: fonts.size.body,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    fontFamily: fonts.family.regular,
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
  submitButton: {
    marginTop: spacing.sm,
  },
  loadingIndicator: {
    position: 'absolute',
    bottom: spacing.md + 14,
    alignSelf: 'center',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  switchText: {
    fontSize: fonts.size.label,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  switchLink: {
    fontSize: fonts.size.label,
    color: colors.primary,
    fontWeight: fonts.weight.semibold,
    marginLeft: spacing.xs,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  anonymousContainer: {
    alignItems: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: spacing.md,
    fontSize: fonts.size.label,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  anonymousButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  anonymousButtonText: {
    fontSize: fonts.size.body,
    color: colors.text.secondary,
    textDecorationLine: 'underline',
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  anonymousNote: {
    fontSize: fonts.size.labelSmall,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
});

export default AuthScreen;
