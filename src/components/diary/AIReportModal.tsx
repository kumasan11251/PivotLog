import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { getColors, fonts, spacing, textBase } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import type { AIReportType } from '../../types/aiReport';

interface AIReportModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reportType: AIReportType, detail?: string) => Promise<void>;
}

interface ReportOption {
  type: AIReportType;
  label: string;
  description: string;
}

const REPORT_OPTIONS: ReportOption[] = [
  {
    type: 'inappropriate',
    label: '不適切な表現',
    description: '攻撃的、差別的、または不快な表現が含まれている',
  },
  {
    type: 'inaccurate',
    label: '事実と異なる',
    description: '誤った情報や誤解を招く内容が含まれている',
  },
  {
    type: 'harmful',
    label: '有害な提案',
    description: '危険な行動や不健康な考え方を助長する内容',
  },
  {
    type: 'other',
    label: 'その他',
    description: '上記以外の問題がある',
  },
];

/**
 * AI生成コンテンツのレポートモーダル
 * Google Play必須要件：不適切なAI応答をユーザーが報告できる機能
 */
const AIReportModal: React.FC<AIReportModalProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const { isDark } = useTheme();
  const themeColors = useMemo(() => getColors(isDark), [isDark]);

  const [selectedType, setSelectedType] = useState<AIReportType | null>(null);
  const [detail, setDetail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedType) {
      Alert.alert('選択してください', '問題の種類を選択してください。');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(selectedType, detail.trim() || undefined);
      Alert.alert(
        '報告を送信しました',
        'ご報告いただきありがとうございます。内容を確認し、サービス改善に活用させていただきます。',
        [{ text: 'OK', onPress: handleClose }]
      );
    } catch (error) {
      console.error('レポート送信エラー:', error);
      Alert.alert('エラー', '報告の送信に失敗しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedType(null);
    setDetail('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: themeColors.surface }]}>
          {/* ヘッダー */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: themeColors.text.primary }]}>
              不適切な内容を報告
            </Text>
          </View>

          {/* 説明 */}
          <Text style={[styles.description, { color: themeColors.text.secondary }]}>
            どのような問題がありましたか？
          </Text>

          {/* 選択肢 */}
          <View style={styles.options}>
            {REPORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.type}
                style={[
                  styles.option,
                  {
                    backgroundColor: selectedType === option.type
                      ? `${themeColors.primary}15`
                      : themeColors.background,
                    borderColor: selectedType === option.type
                      ? themeColors.primary
                      : themeColors.border,
                  },
                ]}
                onPress={() => setSelectedType(option.type)}
              >
                <View style={styles.radioOuter}>
                  {selectedType === option.type && (
                    <View style={[styles.radioInner, { backgroundColor: themeColors.primary }]} />
                  )}
                </View>
                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, { color: themeColors.text.primary }]}>
                    {option.label}
                  </Text>
                  <Text style={[styles.optionDescription, { color: themeColors.text.secondary }]}>
                    {option.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* 詳細入力 */}
          <View style={styles.detailSection}>
            <Text style={[styles.detailLabel, { color: themeColors.text.secondary }]}>
              詳細（任意）
            </Text>
            <TextInput
              style={[
                styles.detailInput,
                {
                  backgroundColor: themeColors.background,
                  borderColor: themeColors.border,
                  color: themeColors.text.primary,
                },
              ]}
              placeholder="具体的な問題点があればお書きください"
              placeholderTextColor={themeColors.text.tertiary}
              value={detail}
              onChangeText={setDetail}
              multiline
              numberOfLines={3}
              maxLength={500}
            />
          </View>

          {/* ボタン */}
          <View style={styles.buttons}>
            <TouchableOpacity
              onPress={handleClose}
              style={[styles.button, styles.cancelButton]}
              disabled={isSubmitting}
            >
              <Text style={[styles.buttonText, { color: themeColors.text.secondary }]}>
                キャンセル
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              style={[
                styles.button,
                styles.submitButton,
                {
                  backgroundColor: selectedType ? themeColors.primary : themeColors.border,
                },
              ]}
              disabled={!selectedType || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
                  報告する
                </Text>
              )}
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
    maxHeight: '90%',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fonts.size.title,
    fontFamily: fonts.family.bold,
    ...textBase,
  },
  description: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.regular,
    marginBottom: spacing.md,
    ...textBase,
  },
  options: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: spacing.borderRadius.medium,
    borderWidth: 1,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    marginTop: 2,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.bold,
    marginBottom: 2,
    ...textBase,
  },
  optionDescription: {
    fontSize: fonts.size.labelSmall,
    fontFamily: fonts.family.regular,
    lineHeight: 18,
    ...textBase,
  },
  detailSection: {
    marginBottom: spacing.lg,
  },
  detailLabel: {
    fontSize: fonts.size.labelSmall,
    fontFamily: fonts.family.regular,
    marginBottom: spacing.xs,
    ...textBase,
  },
  detailInput: {
    borderWidth: 1,
    borderRadius: spacing.borderRadius.medium,
    padding: spacing.md,
    fontSize: fonts.size.body,
    fontFamily: fonts.family.regular,
    minHeight: 80,
    textAlignVertical: 'top',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
  },
  submitButton: {
    minHeight: 40,
  },
  buttonText: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.bold,
    textAlign: 'center',
    ...textBase,
  },
});

export default AIReportModal;
