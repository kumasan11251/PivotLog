import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { getColors, fonts, spacing, textBase } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { STORE_URLS } from '../../constants/store';

interface UpdateModalProps {
  visible: boolean;
  /** optional: 任意アップデート（あとで可）/ forced: 強制アップデート（閉じられない） */
  mode: 'optional' | 'forced';
  latestVersion: string;
  /** Firestore 側で指定されたストアURL（非空なら最優先） */
  storeUrl?: string;
  /** 追加メッセージ（省略可） */
  message?: string;
  onLater: () => void;
}

/**
 * アプリアップデート促進モーダル
 * 任意モードは「あとで」で閉じられる。強制モードは閉じる手段を持たない
 */
const UpdateModal: React.FC<UpdateModalProps> = ({
  visible,
  mode,
  latestVersion,
  storeUrl,
  message,
  onLater,
}) => {
  const { isDark } = useTheme();
  const themeColors = useMemo(() => getColors(isDark), [isDark]);
  // Linking.openURL の多重起動防止
  const [isOpening, setIsOpening] = useState<boolean>(false);

  const isForced = mode === 'forced';

  const handleUpdate = async () => {
    if (isOpening) return;
    setIsOpening(true);
    try {
      const primary = Platform.OS === 'ios' ? STORE_URLS.IOS : STORE_URLS.ANDROID;
      const fallback = Platform.OS === 'ios' ? STORE_URLS.IOS_FALLBACK : STORE_URLS.ANDROID_FALLBACK;
      // Firestore の storeUrl が非空なら最優先 → 失敗したら primary → 最後に https フォールバック
      const urls = storeUrl ? [storeUrl, primary, fallback] : [primary, fallback];

      let opened = false;
      for (const url of urls) {
        try {
          await Linking.openURL(url);
          opened = true;
          break;
        } catch {
          // 次の候補URLを試す
        }
      }
      if (!opened) {
        // 全て失敗してもアプリ利用・モーダル状態は壊さない
        console.error('[UpdateModal] ストアURLを開けませんでした');
      }
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      // 強制モードでは Android back を無効化、任意モードは「あとで」扱い
      onRequestClose={isForced ? () => {} : onLater}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: themeColors.surface }]}>
          {/* ヘッダー */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: themeColors.text.primary }]}>
              {isForced ? 'アップデートが必要です' : '新しいバージョンがあります'}
            </Text>
          </View>

          {/* 説明文 */}
          <View style={styles.content}>
            <Text style={[styles.description, { color: themeColors.text.primary }]}>
              {isForced
                ? 'このバージョンはご利用いただけなくなりました。お手数ですが、最新バージョンへのアップデートをお願いします。'
                : `PivotLog ${latestVersion} が利用可能です。新機能や改善が含まれています。`}
            </Text>
            {message ? (
              <Text style={[styles.message, { color: themeColors.text.secondary }]}>
                {message}
              </Text>
            ) : null}
          </View>

          {/* ボタン */}
          <View style={styles.buttons}>
            {!isForced && (
              <TouchableOpacity
                onPress={onLater}
                style={[styles.button, styles.laterButton]}
              >
                <Text style={[styles.buttonText, { color: themeColors.text.secondary }]}>
                  あとで
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleUpdate}
              disabled={isOpening}
              style={[
                styles.button,
                styles.updateButton,
                { backgroundColor: themeColors.primary },
                isOpening && styles.updateButtonDisabled,
              ]}
            >
              <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
                アップデート
              </Text>
            </TouchableOpacity>
          </View>
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
    ...textBase,
  },
  message: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.regular,
    lineHeight: 22,
    marginTop: spacing.md,
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
  laterButton: {
    backgroundColor: 'transparent',
  },
  updateButton: {
    // backgroundColor is set dynamically
  },
  updateButtonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.bold,
    textAlign: 'center',
    ...textBase,
  },
});

export default UpdateModal;
