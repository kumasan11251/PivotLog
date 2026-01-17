import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  ScrollView,
  Switch,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import type { WidgetSettingsScreenNavigationProp } from '../types/navigation';
import { colors, fonts, spacing } from '../theme';
import ScreenHeader from '../components/common/ScreenHeader';
import {
  loadWidgetSettings,
  saveWidgetSettings,
  syncWidgetData,
} from '../utils/widgetStorage';
import type { WidgetSettings } from '../types/widget';

const MAX_CUSTOM_TEXT_LENGTH = 100;

const WidgetSettingsScreen: React.FC = () => {
  const navigation = useNavigation<WidgetSettingsScreenNavigationProp>();
  const [settings, setSettings] = useState<WidgetSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [customText, setCustomText] = useState('');
  const [showProgress, setShowProgress] = useState(true);
  const [showRemainingTime, setShowRemainingTime] = useState(true);
  const [showCustomText, setShowCustomText] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const loadedSettings = await loadWidgetSettings();
      setSettings(loadedSettings);
      setCustomText(loadedSettings.customText);
      setShowProgress(loadedSettings.showProgress);
      setShowRemainingTime(loadedSettings.showRemainingTime);
      setShowCustomText(loadedSettings.showCustomText);
    } catch (error) {
      console.error('ウィジェット設定の読み込みに失敗:', error);
      Alert.alert('エラー', '設定の読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings])
  );

  // 変更検出
  useEffect(() => {
    if (settings) {
      const changed =
        customText !== settings.customText ||
        showProgress !== settings.showProgress ||
        showRemainingTime !== settings.showRemainingTime ||
        showCustomText !== settings.showCustomText;
      setHasChanges(changed);
    }
  }, [customText, showProgress, showRemainingTime, showCustomText, settings]);

  const handleSave = async () => {
    if (!hasChanges) {
      navigation.goBack();
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const newSettings: WidgetSettings = {
        customText,
        showProgress,
        showRemainingTime,
        showCustomText,
      };

      await saveWidgetSettings(newSettings);

      // ウィジェットデータを同期
      const syncSuccess = await syncWidgetData();

      if (syncSuccess) {
        Alert.alert(
          '保存完了',
          'ウィジェット設定を保存しました。ホーム画面のウィジェットに反映されます。',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert(
          '保存完了',
          'ウィジェット設定を保存しました。\n\nウィジェットを追加するには、ホーム画面を長押しして「ウィジェット」から「PivotLog」を選択してください。',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('保存エラー:', error);
      Alert.alert('エラー', '設定の保存に失敗しました。もう一度お試しください。');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      Alert.alert(
        '変更を破棄',
        '保存されていない変更があります。破棄しますか？',
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '破棄',
            style: 'destructive',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScreenHeader
          title="ウィジェット設定"
          leftAction={{
            type: 'backIcon',
            onPress: handleCancel,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title="ウィジェット設定"
        leftAction={{
          type: 'backIcon',
          onPress: handleCancel,
        }}
        rightAction={{
          type: 'text',
          label: isSaving ? '保存中...' : '保存',
          onPress: handleSave,
          color: hasChanges ? colors.primary : colors.text.secondary,
        }}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* プラットフォーム情報 */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons
              name={Platform.OS === 'ios' ? 'logo-apple' : 'logo-android'}
              size={20}
              color={colors.primary}
            />
            <Text style={styles.infoText}>
              {Platform.OS === 'ios' ? 'iOS' : 'Android'} ウィジェット対応
            </Text>
          </View>
          <Text style={styles.infoHint}>
            ホーム画面を長押しして「ウィジェット」から追加できます
          </Text>
        </View>

        {/* カスタムテキスト入力 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>表示テキスト</Text>
          <View style={styles.sectionCard}>
            <Text style={styles.inputLabel}>カスタムメッセージ</Text>
            <TextInput
              style={styles.textInput}
              value={customText}
              onChangeText={(text) => {
                if (text.length <= MAX_CUSTOM_TEXT_LENGTH) {
                  setCustomText(text);
                }
              }}
              placeholder="例: 今日も1日を大切に"
              placeholderTextColor={colors.text.secondary}
              multiline
              numberOfLines={3}
              maxLength={MAX_CUSTOM_TEXT_LENGTH}
            />
            <Text style={styles.charCount}>
              {customText.length} / {MAX_CUSTOM_TEXT_LENGTH}
            </Text>
          </View>
          <Text style={styles.sectionHint}>
            ウィジェットに表示するメッセージを入力してください
          </Text>
        </View>

        {/* 表示設定 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>表示項目</Text>
          <View style={styles.sectionCard}>
            <View style={styles.toggleItem}>
              <View style={styles.toggleInfo}>
                <Ionicons name="pie-chart-outline" size={20} color={colors.primary} />
                <Text style={styles.toggleLabel}>進捗率を表示</Text>
              </View>
              <Switch
                value={showProgress}
                onValueChange={(value) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowProgress(value);
                }}
                trackColor={{ false: colors.text.secondary, true: colors.primary }}
                thumbColor={colors.background}
              />
            </View>

            <View style={styles.separator} />

            <View style={styles.toggleItem}>
              <View style={styles.toggleInfo}>
                <Ionicons name="time-outline" size={20} color={colors.primary} />
                <Text style={styles.toggleLabel}>残り時間を表示</Text>
              </View>
              <Switch
                value={showRemainingTime}
                onValueChange={(value) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowRemainingTime(value);
                }}
                trackColor={{ false: colors.text.secondary, true: colors.primary }}
                thumbColor={colors.background}
              />
            </View>

            <View style={styles.separator} />

            <View style={styles.toggleItem}>
              <View style={styles.toggleInfo}>
                <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
                <Text style={styles.toggleLabel}>カスタムテキストを表示</Text>
              </View>
              <Switch
                value={showCustomText}
                onValueChange={(value) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowCustomText(value);
                }}
                trackColor={{ false: colors.text.secondary, true: colors.primary }}
                thumbColor={colors.background}
              />
            </View>
          </View>
        </View>

        {/* プレビュー */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>プレビュー</Text>
          <View style={styles.previewCard}>
            <View style={styles.previewWidget}>
              <Text style={styles.previewTitle}>人生の進捗</Text>
              {showProgress && (
                <Text style={styles.previewProgress}>42.5%</Text>
              )}
              {showProgress && (
                <View style={styles.previewProgressBar}>
                  <View style={styles.previewProgressFill} />
                </View>
              )}
              {showRemainingTime && (
                <Text style={styles.previewRemaining}>残り 37年 6ヶ月</Text>
              )}
              {showCustomText && customText ? (
                <Text style={styles.previewCustomText} numberOfLines={2}>
                  {customText}
                </Text>
              ) : null}
            </View>
            <Text style={styles.previewHint}>※実際の表示はウィジェットサイズにより異なります</Text>
          </View>
        </View>

        {/* ウィジェット追加方法 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ウィジェットの追加方法</Text>
          <View style={styles.sectionCard}>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepText}>ホーム画面を長押しします</Text>
            </View>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.stepText}>
                {Platform.OS === 'ios'
                  ? '左上の「+」ボタンをタップ'
                  : '「ウィジェット」を選択'}
              </Text>
            </View>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.stepText}>「PivotLog」を検索して選択</Text>
            </View>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <Text style={styles.stepText}>好みのサイズを選んで追加</Text>
            </View>
          </View>
        </View>

        {/* 余白 */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: spacing.borderRadius.large,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoText: {
    fontSize: 14,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
  },
  infoHint: {
    marginTop: spacing.xs,
    fontSize: 12,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    marginLeft: 28,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: fonts.family.bold,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: spacing.borderRadius.large,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  sectionHint: {
    marginTop: spacing.xs,
    fontSize: 12,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.background,
    borderRadius: spacing.borderRadius.medium,
    padding: spacing.md,
    fontSize: 14,
    fontFamily: fonts.family.regular,
    color: colors.text.primary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    marginTop: spacing.xs,
    fontSize: 11,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    textAlign: 'right',
  },
  toggleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  toggleLabel: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    color: colors.text.primary,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    marginVertical: spacing.sm,
  },
  previewCard: {
    backgroundColor: colors.card,
    borderRadius: spacing.borderRadius.large,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    alignItems: 'center',
  },
  previewWidget: {
    backgroundColor: colors.background,
    borderRadius: spacing.borderRadius.medium,
    padding: spacing.md,
    width: '100%',
    maxWidth: 200,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  previewTitle: {
    fontSize: 11,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  previewProgress: {
    fontSize: 28,
    fontFamily: fonts.family.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  previewProgressBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(139, 157, 131, 0.2)',
    borderRadius: 3,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  previewProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
    width: '42.5%',
  },
  previewRemaining: {
    fontSize: 12,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  previewCustomText: {
    fontSize: 11,
    fontFamily: fonts.family.regular,
    color: colors.text.primary,
    textAlign: 'center',
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  previewHint: {
    marginTop: spacing.sm,
    fontSize: 11,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 12,
    fontFamily: fonts.family.bold,
    color: colors.background,
  },
  stepText: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    color: colors.text.primary,
    flex: 1,
  },
  bottomSpacer: {
    height: 40,
  },
});

export default WidgetSettingsScreen;
