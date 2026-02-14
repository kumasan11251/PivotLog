import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Linking,
  ScrollView,
} from 'react-native';
import { useMemo } from 'react';
import { getColors, fonts, spacing, textBase } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';

interface AIConsentModalProps {
  visible: boolean;
  onConsent: () => void;
  onCancel: () => void;
}

/**
 * AI機能の同意モーダル
 * Apple App Storeガイドライン対応：AIへのデータ送信前に明示的な同意を取得
 */
const AIConsentModal: React.FC<AIConsentModalProps> = ({
  visible,
  onConsent,
  onCancel,
}) => {
  const { isDark } = useTheme();
  const themeColors = useMemo(() => getColors(isDark), [isDark]);

  const handlePrivacyPolicy = () => {
    // プライバシーポリシーのURLを開く
    Linking.openURL('https://pivotlog.app/privacy');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: themeColors.surface }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* ヘッダー */}
            <View style={styles.header}>
              <Text style={styles.headerIcon}>{'AI'}</Text>
              <Text style={[styles.title, { color: themeColors.text.primary }]}>
                今日の気づき機能について
              </Text>
            </View>

            {/* 説明文 */}
            <View style={styles.content}>
              <Text style={[styles.description, { color: themeColors.text.primary }]}>
                この機能では、あなたの日記の内容をAI（Google Gemini）で分析し、気づきを生成します。
              </Text>

              <View style={[styles.infoBox, { backgroundColor: `${themeColors.primary}10` }]}>
                <Text style={[styles.infoTitle, { color: themeColors.primary }]}>
                  データの取り扱いについて
                </Text>
                <View style={styles.infoList}>
                  <Text style={[styles.infoItem, { color: themeColors.text.primary }]}>
                    {'  '}日記の内容はリフレクション生成のみに使用されます
                  </Text>
                  <Text style={[styles.infoItem, { color: themeColors.text.primary }]}>
                    {'  '}AIの学習目的には使用されません
                  </Text>
                  <Text style={[styles.infoItem, { color: themeColors.text.primary }]}>
                    {'  '}生成された内容は参考情報であり、専門家のアドバイスではありません
                  </Text>
                </View>
              </View>

              <TouchableOpacity onPress={handlePrivacyPolicy} style={styles.privacyLink}>
                <Text style={[styles.privacyLinkText, { color: themeColors.primary }]}>
                  プライバシーポリシーを確認
                </Text>
              </TouchableOpacity>
            </View>

            {/* ボタン */}
            <View style={styles.buttons}>
              <TouchableOpacity
                onPress={onCancel}
                style={[styles.button, styles.cancelButton]}
              >
                <Text style={[styles.buttonText, { color: themeColors.text.secondary }]}>
                  キャンセル
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onConsent}
                style={[styles.button, styles.consentButton, { backgroundColor: themeColors.primary }]}
              >
                <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
                  同意して利用
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  container: {
    borderRadius: spacing.borderRadius.large,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 360,
    maxHeight: '80%',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: fonts.size.title,
    fontFamily: fonts.family.bold,
    flex: 1,
    ...textBase,
  },
  content: {
    marginBottom: spacing.lg,
  },
  description: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.regular,
    lineHeight: 24,
    marginBottom: spacing.md,
    ...textBase,
  },
  infoBox: {
    borderRadius: spacing.borderRadius.medium,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoTitle: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.bold,
    marginBottom: spacing.sm,
    ...textBase,
  },
  infoList: {
    gap: spacing.xs,
  },
  infoItem: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.regular,
    lineHeight: 22,
    ...textBase,
  },
  privacyLink: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  privacyLinkText: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.regular,
    textDecorationLine: 'underline',
    ...textBase,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
  },
  button: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: spacing.borderRadius.medium,
    minWidth: 100,
  },
  cancelButton: {
    backgroundColor: 'transparent',
  },
  consentButton: {
    // backgroundColor is set dynamically
  },
  buttonText: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.bold,
    textAlign: 'center',
    ...textBase,
  },
});

export default AIConsentModal;
