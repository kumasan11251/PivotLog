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
  Alert,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, fonts, spacing, textBase } from '../theme';
import Button from '../components/common/Button';
import {
  signInWithEmail,
  signUpWithEmail,
  signInAnonymously,
  signInWithGoogle,
  signInWithApple,
  sendPasswordResetEmail,
  getErrorMessage,
} from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';

type AuthMode = 'login' | 'signup';

const GoogleIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <Path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <Path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <Path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </Svg>
);

const AppleIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 24,
  color = '#000000',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
      fill={color}
    />
  </Svg>
);

const AuthScreen: React.FC = () => {
  const { isReturningUser } = useAuth();
  const [mode, setMode] = useState<AuthMode>(isReturningUser ? 'login' : 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
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

  const handleGoogleLogin = async () => {
    setError(null);
    setIsGoogleLoading(true);

    try {
      await signInWithGoogle();
      // 認証成功後はAuthProviderが自動的に状態を更新
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setError(null);
    setIsAppleLoading(true);

    try {
      await signInWithApple();
      // 認証成功後はAuthProviderが自動的に状態を更新
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsAppleLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert(
        'メールアドレスを入力',
        'パスワードリセット用のメールを送信するため、メールアドレスを入力してください。'
      );
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await sendPasswordResetEmail(email);
      Alert.alert(
        'メールを送信しました',
        `${email} にパスワードリセット用のメールを送信しました。メール内のリンクからパスワードを再設定してください。`,
        [{ text: 'OK' }]
      );
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

            {mode === 'login' && (
              <TouchableOpacity
                onPress={handleForgotPassword}
                disabled={isLoading}
                style={styles.forgotPasswordButton}
              >
                <Text style={styles.forgotPasswordText}>パスワードを忘れた場合</Text>
              </TouchableOpacity>
            )}

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

          {/* その他のログイン方法 */}
          <View style={styles.anonymousContainer}>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>または</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Googleログイン */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleLogin}
              disabled={isLoading || isGoogleLoading || isAppleLoading}
            >
              {isGoogleLoading ? (
                <ActivityIndicator color={colors.text.primary} size="small" />
              ) : (
                <>
                  <GoogleIcon size={20} />
                  <Text style={styles.googleButtonText}>Googleでログイン</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Appleログイン（iOSのみ） */}
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.appleButton}
                onPress={handleAppleLogin}
                disabled={isLoading || isGoogleLoading || isAppleLoading}
              >
                {isAppleLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <AppleIcon size={20} color="#FFFFFF" />
                    <Text style={styles.appleButtonText}>Appleでログイン</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* 匿名ログイン */}
            <TouchableOpacity
              style={styles.anonymousButton}
              onPress={handleAnonymousLogin}
              disabled={isLoading || isGoogleLoading || isAppleLoading}
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
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: spacing.md,
  },
  forgotPasswordText: {
    fontSize: fonts.size.label,
    color: colors.primary,
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
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.borderRadius.medium,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    width: '100%',
    marginBottom: spacing.sm,
  },
  googleButtonText: {
    fontSize: fonts.size.body,
    color: colors.text.primary,
    fontFamily: fonts.family.regular,
    fontWeight: fonts.weight.medium,
    ...textBase,
  },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#000000',
    borderRadius: spacing.borderRadius.medium,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    width: '100%',
    marginBottom: spacing.sm,
  },
  appleButtonText: {
    fontSize: fonts.size.body,
    color: '#FFFFFF',
    fontFamily: fonts.family.regular,
    fontWeight: fonts.weight.medium,
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
