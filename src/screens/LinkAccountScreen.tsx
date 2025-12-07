import React, { useState, useCallback } from 'react';
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
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { colors, fonts, spacing, textBase } from '../theme';
import Button from '../components/common/Button';
import ScreenHeader from '../components/common/ScreenHeader';
import {
  linkAccountWithEmail,
  linkAccountWithGoogle,
  getLinkedProviders,
  isAnonymousUser,
  getErrorMessage,
  signInWithEmail,
  signInWithGoogle,
} from '../services/firebase';
import type { AuthProvider } from '../services/firebase';
import type { LinkAccountScreenNavigationProp } from '../types/navigation';

// Googleアイコン
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

// Appleアイコン - Apple Developer Program登録後に有効化
// const AppleIcon: React.FC<{ size?: number; color?: string }> = ({
//   size = 24,
//   color = '#000000',
// }) => (
//   <Svg width={size} height={size} viewBox="0 0 24 24">
//     <Path
//       d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
//       fill={color}
//     />
//   </Svg>
// );

const LinkAccountScreen: React.FC = () => {
  const navigation = useNavigation<LinkAccountScreenNavigationProp>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkedProviders, setLinkedProviders] = useState<AuthProvider[]>([]);
  const [isAnonymous, setIsAnonymous] = useState(true);

  // 既存アカウントログイン用のstate
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [isGoogleLoginLoading, setIsGoogleLoginLoading] = useState(false);

  const isAnyLoading = isLoading || isGoogleLoading || isLoginLoading || isGoogleLoginLoading;

  // 連携状態を更新
  const updateLinkedProviders = useCallback(() => {
    setLinkedProviders(getLinkedProviders());
    setIsAnonymous(isAnonymousUser());
  }, []);

  // 画面がフォーカスされた時に連携状態を更新
  useFocusEffect(
    useCallback(() => {
      updateLinkedProviders();
    }, [updateLinkedProviders])
  );

  // 連携済みかどうかを確認
  const isLinkedWith = (provider: AuthProvider): boolean => {
    return linkedProviders.includes(provider);
  };

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
      await linkAccountWithEmail(email, password);
      updateLinkedProviders();
      Alert.alert(
        'アカウント連携完了',
        'メールアドレスで連携されました。今後はこのメールアドレスでもログインできます。',
        [
          {
            text: 'OK',
          },
        ]
      );
      // フォームをクリア
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkWithGoogle = async () => {
    setError(null);
    setIsGoogleLoading(true);

    try {
      await linkAccountWithGoogle();
      updateLinkedProviders();
      Alert.alert(
        'アカウント連携完了',
        'Googleアカウントと連携されました。今後はGoogleアカウントでもログインできます。',
        [
          {
            text: 'OK',
          },
        ]
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Apple連携は Apple Developer Program 登録後に有効化
  // const handleLinkWithApple = async () => { ... };

  // 既存アカウントでログイン（メール）
  const handleLoginWithEmail = async () => {
    setLoginError(null);

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError('メールアドレスとパスワードを入力してください');
      return;
    }

    setIsLoginLoading(true);

    try {
      await signInWithEmail(loginEmail, loginPassword);
      setShowLoginModal(false);
      setLoginEmail('');
      setLoginPassword('');
      Alert.alert(
        'ログイン成功',
        'アカウントにログインしました。データが復元されました。',
        [{ text: 'OK' }]
      );
    } catch (err) {
      setLoginError(getErrorMessage(err));
    } finally {
      setIsLoginLoading(false);
    }
  };

  // 既存アカウントでログイン（Google）
  const handleLoginWithGoogle = async () => {
    setLoginError(null);
    setIsGoogleLoginLoading(true);

    try {
      await signInWithGoogle();
      setShowLoginModal(false);
      Alert.alert(
        'ログイン成功',
        'Googleアカウントでログインしました。データが復元されました。',
        [{ text: 'OK' }]
      );
    } catch (err) {
      setLoginError(getErrorMessage(err));
    } finally {
      setIsGoogleLoginLoading(false);
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
              アカウントを連携すると、機種変更時やアプリの再インストール時にデータを復元できます。
              {'\n'}複数の認証方法を追加することで、どちらでもログインできるようになります。
            </Text>
          </View>

          {/* 連携状態 */}
          {!isAnonymous && (
            <View style={styles.statusContainer}>
              <Text style={styles.statusTitle}>連携済みの認証方法</Text>
              <View style={styles.statusList}>
                {isLinkedWith('google.com') && (
                  <View style={styles.statusItem}>
                    <GoogleIcon size={16} />
                    <Text style={styles.statusText}>Google</Text>
                    <Text style={styles.statusBadge}>連携済み</Text>
                  </View>
                )}
                {isLinkedWith('password') && (
                  <View style={styles.statusItem}>
                    <Text style={styles.statusIcon}>✉️</Text>
                    <Text style={styles.statusText}>メールアドレス</Text>
                    <Text style={styles.statusBadge}>連携済み</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* ソーシャルログイン */}
          <View style={styles.socialContainer}>
            {!isLinkedWith('google.com') ? (
              <>
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={handleLinkWithGoogle}
                  disabled={isAnyLoading}
                  activeOpacity={0.7}
                >
                  {isGoogleLoading ? (
                    <ActivityIndicator color={colors.text.primary} size="small" />
                  ) : (
                    <>
                      <GoogleIcon size={20} />
                      <Text style={styles.socialButtonText}>Googleで連携</Text>
                    </>
                  )}
                </TouchableOpacity>
                <View style={styles.googleNoteContainer}>
                  <Text style={styles.googleNoteText}>
                    ⚠️ 現在テスト版のため、Googleで連携するには事前に開発者へGoogleアカウントのメールアドレスをお知らせください。
                  </Text>
                </View>
              </>
            ) : (
              <View style={[styles.socialButton, styles.linkedButton]}>
                <GoogleIcon size={20} />
                <Text style={styles.linkedButtonText}>Google連携済み</Text>
              </View>
            )}

            {/* Apple連携は Apple Developer Program 登録後に有効化 */}
          </View>

          {/* 区切り線 - メール未連携の場合のみ表示 */}
          {!isLinkedWith('password') && (
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>または</Text>
              <View style={styles.dividerLine} />
            </View>
          )}

          {/* メールフォーム - メール未連携の場合のみ表示 */}
          {!isLinkedWith('password') ? (
            <View style={styles.form}>
              <View style={styles.emailFormHeader}>
                <Text style={styles.emailFormNote}>
                  💡 メールアドレスで連携後も、同じGoogleアカウントであれば後からGoogle連携を追加できます。
                </Text>
              </View>
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
                  editable={!isAnyLoading}
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
                  editable={!isAnyLoading}
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
                  editable={!isAnyLoading}
                />
              </View>

              {error && <Text style={styles.errorText}>{error}</Text>}

              <View style={styles.buttonContainer}>
                <Button
                  title={isLoading ? '' : 'メールアドレスで連携'}
                  onPress={handleLinkAccount}
                  disabled={isAnyLoading}
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
          ) : (
            <View style={styles.linkedEmailContainer}>
              <Text style={styles.linkedEmailText}>✉️ メールアドレス連携済み</Text>
            </View>
          )}

          {/* 全て連携済みの場合のメッセージ */}
          {isLinkedWith('google.com') && isLinkedWith('password') && (
            <View style={styles.allLinkedContainer}>
              <Text style={styles.allLinkedText}>
                ✅ すべての認証方法が連携されています
              </Text>
            </View>
          )}

          {/* 注意書き */}
          <View style={styles.noteContainer}>
            <Text style={styles.noteText}>
              ※ 連携後も現在のデータはそのまま引き継がれます
            </Text>
          </View>

          {/* 既存アカウントでログインセクション - 匿名ユーザーのみ表示 */}
          {isAnonymous && (
            <View style={styles.existingAccountContainer}>
              <View style={styles.existingAccountDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>既にアカウントをお持ちの方</Text>
                <View style={styles.dividerLine} />
              </View>
              <Text style={styles.existingAccountDescription}>
                以前登録したアカウントがある場合は、そのアカウントでログインできます。
                現在のデータは破棄され、既存アカウントのデータに切り替わります。
              </Text>
              <TouchableOpacity
                style={styles.existingAccountButton}
                onPress={() => setShowLoginModal(true)}
                disabled={isAnyLoading}
                activeOpacity={0.7}
              >
                <Text style={styles.existingAccountButtonText}>
                  既存アカウントでログイン
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 既存アカウントログインモーダル */}
      <Modal
        visible={showLoginModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowLoginModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowLoginModal(false);
                setLoginEmail('');
                setLoginPassword('');
                setLoginError(null);
              }}
              disabled={isLoginLoading || isGoogleLoginLoading}
            >
              <Text style={styles.modalCloseButton}>キャンセル</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>既存アカウントでログイン</Text>
            <View style={styles.modalHeaderSpacer} />
          </View>

          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalWarning}>
              <Text style={styles.modalWarningText}>
                ⚠️ ログインすると現在のデータは破棄され、選択したアカウントのデータに切り替わります。
              </Text>
            </View>

            {/* Googleログイン */}
            <TouchableOpacity
              style={styles.socialButton}
              onPress={handleLoginWithGoogle}
              disabled={isLoginLoading || isGoogleLoginLoading}
              activeOpacity={0.7}
            >
              {isGoogleLoginLoading ? (
                <ActivityIndicator color={colors.text.primary} size="small" />
              ) : (
                <>
                  <GoogleIcon size={20} />
                  <Text style={styles.socialButtonText}>Googleでログイン</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>または</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* メールログインフォーム */}
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>メールアドレス</Text>
                <TextInput
                  style={styles.input}
                  value={loginEmail}
                  onChangeText={setLoginEmail}
                  placeholder="example@email.com"
                  placeholderTextColor={colors.text.secondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!isLoginLoading && !isGoogleLoginLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>パスワード</Text>
                <TextInput
                  style={styles.input}
                  value={loginPassword}
                  onChangeText={setLoginPassword}
                  placeholder="パスワード"
                  placeholderTextColor={colors.text.secondary}
                  secureTextEntry
                  autoComplete="password"
                  editable={!isLoginLoading && !isGoogleLoginLoading}
                />
              </View>

              {loginError && <Text style={styles.errorText}>{loginError}</Text>}

              <View style={styles.buttonContainer}>
                <Button
                  title={isLoginLoading ? '' : 'ログイン'}
                  onPress={handleLoginWithEmail}
                  disabled={isLoginLoading || isGoogleLoginLoading}
                  style={styles.submitButton}
                />
                {isLoginLoading && (
                  <ActivityIndicator
                    color={colors.text.inverse}
                    style={styles.loadingIndicator}
                  />
                )}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
    marginBottom: spacing.lg,
  },
  description: {
    fontSize: fonts.size.body,
    color: colors.text.primary,
    fontFamily: fonts.family.regular,
    lineHeight: 24,
    ...textBase,
  },
  socialContainer: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.borderRadius.medium,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  // Apple連携は Apple Developer Program 登録後に有効化
  // appleButton: {
  //   backgroundColor: '#000000',
  //   borderColor: '#000000',
  // },
  socialButtonText: {
    fontSize: fonts.size.body,
    color: colors.text.primary,
    fontFamily: fonts.family.bold,
    ...textBase,
  },
  linkedButton: {
    backgroundColor: colors.background,
    borderColor: colors.primary,
    borderWidth: 2,
  },
  linkedButtonText: {
    fontSize: fonts.size.body,
    color: colors.primary,
    fontFamily: fonts.family.bold,
    ...textBase,
  },
  // Apple連携は Apple Developer Program 登録後に有効化
  // appleButtonText: {
  //   color: '#FFFFFF',
  // },
  statusContainer: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.medium,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  statusTitle: {
    fontSize: fonts.size.label,
    color: colors.text.secondary,
    fontFamily: fonts.family.bold,
    marginBottom: spacing.sm,
    ...textBase,
  },
  statusList: {
    gap: spacing.xs,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusIcon: {
    fontSize: 16,
  },
  statusText: {
    fontSize: fonts.size.body,
    color: colors.text.primary,
    fontFamily: fonts.family.regular,
    flex: 1,
    ...textBase,
  },
  statusBadge: {
    fontSize: fonts.size.labelSmall,
    color: colors.primary,
    fontFamily: fonts.family.bold,
    backgroundColor: `${colors.primary}20`,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: spacing.borderRadius.small,
    ...textBase,
  },
  linkedEmailContainer: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.medium,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  linkedEmailText: {
    fontSize: fonts.size.body,
    color: colors.primary,
    fontFamily: fonts.family.bold,
    ...textBase,
  },
  allLinkedContainer: {
    backgroundColor: `${colors.primary}10`,
    borderRadius: spacing.borderRadius.medium,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  allLinkedText: {
    fontSize: fonts.size.body,
    color: colors.primary,
    fontFamily: fonts.family.bold,
    ...textBase,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
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
  // Google連携の注意書き
  googleNoteContainer: {
    backgroundColor: '#FFF8E1',
    borderRadius: spacing.borderRadius.medium,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  googleNoteText: {
    fontSize: fonts.size.labelSmall,
    color: '#F57C00',
    fontFamily: fonts.family.regular,
    lineHeight: 18,
    ...textBase,
  },
  // メールフォームのヘッダー
  emailFormHeader: {
    marginBottom: spacing.md,
  },
  emailFormNote: {
    fontSize: fonts.size.labelSmall,
    color: colors.primary,
    fontFamily: fonts.family.regular,
    lineHeight: 18,
    backgroundColor: `${colors.primary}10`,
    padding: spacing.sm,
    borderRadius: spacing.borderRadius.medium,
    ...textBase,
  },
  // 既存アカウントログインセクション
  existingAccountContainer: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
  },
  existingAccountDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  existingAccountDescription: {
    fontSize: fonts.size.label,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 20,
    ...textBase,
  },
  existingAccountButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.text.secondary,
    borderRadius: spacing.borderRadius.medium,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  existingAccountButtonText: {
    fontSize: fonts.size.body,
    color: colors.text.secondary,
    fontFamily: fonts.family.bold,
    ...textBase,
  },
  // モーダル
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalCloseButton: {
    fontSize: fonts.size.body,
    color: colors.primary,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  modalTitle: {
    fontSize: fonts.size.body,
    color: colors.text.primary,
    fontFamily: fonts.family.bold,
    ...textBase,
  },
  modalHeaderSpacer: {
    width: 80,
  },
  modalContent: {
    flex: 1,
  },
  modalScrollContent: {
    paddingHorizontal: spacing.padding.screen,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  modalWarning: {
    backgroundColor: '#FFF3E0',
    borderRadius: spacing.borderRadius.medium,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  modalWarningText: {
    fontSize: fonts.size.label,
    color: '#E65100',
    fontFamily: fonts.family.regular,
    lineHeight: 20,
    ...textBase,
  },
});

export default LinkAccountScreen;
