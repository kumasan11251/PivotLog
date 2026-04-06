import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  ScrollView,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
  LayoutAnimation,
  UIManager,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import type { WidgetSettingsScreenNavigationProp } from '../types/navigation';
import type { MessageSource, WidgetCountdownMode } from '../types/widget';
import { getColors, fonts, spacing, textBase } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import ScreenHeader from '../components/common/ScreenHeader';
import {
  loadWidgetSettings,
  saveWidgetSettings,
  syncWidgetData,
} from '../utils/widgetStorage';

const MAX_CUSTOM_TEXT_LENGTH = 100;
const HELP_EXPANDED_KEY = '@pivot_log_widget_help_expanded';

// AndroidでLayoutAnimationを有効にする
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// メッセージソースの選択肢
const MESSAGE_SOURCE_OPTIONS: { value: MessageSource; label: string; description: string }[] = [
  { value: 'custom', label: 'カスタム', description: '自分で入力したメッセージ' },
  { value: 'perspective', label: '視点', description: '日替わりの視点メッセージ' },
  { value: 'daily', label: 'ひとこと', description: '温かい日替わりメッセージ' },
];

// カウントダウンモードの選択肢
const COUNTDOWN_MODE_OPTIONS: { value: WidgetCountdownMode; label: string; preview: string; icon: string }[] = [
  { value: 'detailed', label: '年+日', preview: '46年 128日', icon: '📅' },
  { value: 'yearsOnly', label: '年数のみ', preview: '46年', icon: '⏳' },
  { value: 'weeksOnly', label: '週数のみ', preview: '2,418週', icon: '📆' },
  { value: 'daysOnly', label: '日数のみ', preview: '16,928日', icon: '🔢' },
];

const WidgetSettingsScreen: React.FC = () => {
  const navigation = useNavigation<WidgetSettingsScreenNavigationProp>();
  const { isDark } = useTheme();
  const themeColors = useMemo(() => getColors(isDark), [isDark]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isHelpExpanded, setIsHelpExpanded] = useState(true);

  // 設定値
  const [customText, setCustomText] = useState('');
  const [messageSource, setMessageSource] = useState<MessageSource>('custom');
  const [countdownMode, setCountdownMode] = useState<WidgetCountdownMode>('detailed');
  const [showDateHeader, setShowDateHeader] = useState(true);
  const [showDiaryStatus, setShowDiaryStatus] = useState(true);
  const [showStreak, setShowStreak] = useState(true);

  // 元の値（変更検知用）
  const [originalValues, setOriginalValues] = useState({
    customText: '',
    messageSource: 'custom' as MessageSource,
    countdownMode: 'detailed' as WidgetCountdownMode,
    showDateHeader: true,
    showDiaryStatus: true,
    showStreak: true,
  });

  // 折りたたみ状態を読み込み
  useEffect(() => {
    const loadHelpExpandedState = async () => {
      try {
        const stored = await AsyncStorage.getItem(HELP_EXPANDED_KEY);
        if (stored !== null) {
          setIsHelpExpanded(stored === 'true');
        }
      } catch (error) {
        console.error('折りたたみ状態の読み込みに失敗:', error);
      }
    };
    loadHelpExpandedState();
  }, []);

  const toggleHelp = useCallback(async () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newState = !isHelpExpanded;
    setIsHelpExpanded(newState);
    try {
      await AsyncStorage.setItem(HELP_EXPANDED_KEY, String(newState));
    } catch (error) {
      console.error('折りたたみ状態の保存に失敗:', error);
    }
  }, [isHelpExpanded]);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const s = await loadWidgetSettings();
      setCustomText(s.customText);
      setMessageSource(s.messageSource);
      setCountdownMode(s.countdownMode);
      setShowDateHeader(s.showDateHeader);
      setShowDiaryStatus(s.showDiaryStatus);
      setShowStreak(s.showStreak);
      setOriginalValues({
        customText: s.customText,
        messageSource: s.messageSource,
        countdownMode: s.countdownMode,
        showDateHeader: s.showDateHeader,
        showDiaryStatus: s.showDiaryStatus,
        showStreak: s.showStreak,
      });
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

  const hasChanges =
    customText !== originalValues.customText ||
    messageSource !== originalValues.messageSource ||
    countdownMode !== originalValues.countdownMode ||
    showDateHeader !== originalValues.showDateHeader ||
    showDiaryStatus !== originalValues.showDiaryStatus ||
    showStreak !== originalValues.showStreak;

  const handleSave = async () => {
    if (!hasChanges) {
      navigation.goBack();
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await saveWidgetSettings({
        customText,
        messageSource,
        countdownMode,
        showDateHeader,
        showDiaryStatus,
        showStreak,
      });
      await syncWidgetData();
      navigation.goBack();
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
        '変更内容が保存されていません。破棄してもよろしいですか？',
        [
          { text: 'キャンセル', style: 'cancel' },
          { text: '破棄', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  const handleMessageSourceChange = (source: MessageSource) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMessageSource(source);
  };

  const handleCountdownModeChange = (mode: WidgetCountdownMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCountdownMode(mode);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top', 'left', 'right']}>
        <ScreenHeader
          title="ウィジェット設定"
          leftAction={{
            type: 'backIcon',
            onPress: handleCancel,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top', 'left', 'right']}>
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
          color: hasChanges ? themeColors.primary : themeColors.text.secondary,
        }}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* メッセージ表示ソース */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.text.secondary }]}>メッセージ</Text>
          <View style={[styles.segmentContainer, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
            {MESSAGE_SOURCE_OPTIONS.map((option) => {
              const isSelected = messageSource === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.segmentItem,
                    isSelected && [styles.segmentItemSelected, { backgroundColor: themeColors.primary }],
                  ]}
                  onPress={() => handleMessageSourceChange(option.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.segmentLabel,
                      { color: isSelected ? '#FFFFFF' : themeColors.text.primary },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[styles.segmentDescription, { color: themeColors.text.secondary }]}>
            {MESSAGE_SOURCE_OPTIONS.find((o) => o.value === messageSource)?.description}
          </Text>
        </View>

        {/* カスタムメッセージ入力（カスタム選択時のみ） */}
        {messageSource === 'custom' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: themeColors.text.secondary }]}>カスタムメッセージ</Text>
              <Text style={[styles.charCount, { color: themeColors.text.secondary }]}>
                {customText.length} / {MAX_CUSTOM_TEXT_LENGTH}
              </Text>
            </View>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: themeColors.surface,
                  borderColor: themeColors.border,
                  color: themeColors.text.primary,
                },
              ]}
              value={customText}
              onChangeText={(text) => {
                if (text.length <= MAX_CUSTOM_TEXT_LENGTH) {
                  setCustomText(text);
                }
              }}
              placeholder="ウィジェットに表示するメッセージを入力..."
              placeholderTextColor={themeColors.text.secondary}
              multiline
              maxLength={MAX_CUSTOM_TEXT_LENGTH}
            />
            <Text style={[styles.inputHint, { color: themeColors.text.secondary }]}>
              空欄の場合は日替わり視点メッセージが表示されます
            </Text>
          </View>
        )}

        {/* カウントダウン表示モード */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.text.secondary }]}>カウントダウン表示</Text>
          <View style={styles.countdownGrid}>
            {COUNTDOWN_MODE_OPTIONS.map((option) => {
              const isSelected = countdownMode === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.countdownCard,
                    {
                      backgroundColor: themeColors.surface,
                      borderColor: isSelected ? themeColors.primary : themeColors.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  onPress={() => handleCountdownModeChange(option.value)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.countdownCardIcon}>{option.icon}</Text>
                  <Text
                    style={[
                      styles.countdownCardLabel,
                      { color: isSelected ? themeColors.primary : themeColors.text.primary },
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text
                    style={[
                      styles.countdownCardPreview,
                      { color: themeColors.text.secondary },
                    ]}
                    numberOfLines={1}
                  >
                    {option.preview}
                  </Text>
                  {isSelected && (
                    <View style={[styles.selectedIndicator, { backgroundColor: themeColors.primary }]}>
                      <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 表示要素 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.text.secondary }]}>表示要素</Text>
          <View style={[styles.toggleCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
            <View style={[styles.toggleItem, { borderBottomColor: themeColors.border }]}>
              <View style={styles.toggleLabelContainer}>
                <Text style={[styles.toggleLabel, { color: themeColors.text.primary }]}>日付</Text>
                <Text style={[styles.toggleDescription, { color: themeColors.text.secondary }]}>
                  今日の日付と曜日を表示
                </Text>
              </View>
              <Switch
                value={showDateHeader}
                onValueChange={(value) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowDateHeader(value);
                }}
                trackColor={{ false: themeColors.border, true: themeColors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
            <View style={[styles.toggleItem, { borderBottomColor: themeColors.border }]}>
              <View style={styles.toggleLabelContainer}>
                <Text style={[styles.toggleLabel, { color: themeColors.text.primary }]}>日記の記入状態</Text>
                <Text style={[styles.toggleDescription, { color: themeColors.text.secondary }]}>
                  今日の日記を書いたか表示
                </Text>
              </View>
              <Switch
                value={showDiaryStatus}
                onValueChange={(value) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowDiaryStatus(value);
                }}
                trackColor={{ false: themeColors.border, true: themeColors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
            <View style={styles.toggleItemLast}>
              <View style={styles.toggleLabelContainer}>
                <Text style={[styles.toggleLabel, { color: themeColors.text.primary }]}>連続記録</Text>
                <Text style={[styles.toggleDescription, { color: themeColors.text.secondary }]}>
                  連続記録日数を表示
                </Text>
              </View>
              <Switch
                value={showStreak}
                onValueChange={(value) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowStreak(value);
                }}
                trackColor={{ false: themeColors.border, true: themeColors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* ウィジェット追加方法 */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.accordionHeader}
            onPress={toggleHelp}
            activeOpacity={0.7}
          >
            <Text style={[styles.sectionTitle, { color: themeColors.text.secondary }]}>ウィジェットの追加方法</Text>
            <Ionicons
              name={isHelpExpanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={themeColors.text.secondary}
            />
          </TouchableOpacity>
          {isHelpExpanded && (
            <View style={[styles.sectionCard, { backgroundColor: themeColors.card, borderColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)' }]}>
              <View style={styles.stepItem}>
                <View style={[styles.stepNumber, { backgroundColor: themeColors.primary }]}>
                  <Text style={[styles.stepNumberText, { color: themeColors.background }]}>1</Text>
                </View>
                <Text style={[styles.stepText, { color: themeColors.text.primary }]}>ホーム画面を長押しします</Text>
              </View>
              <View style={styles.stepItem}>
                <View style={[styles.stepNumber, { backgroundColor: themeColors.primary }]}>
                  <Text style={[styles.stepNumberText, { color: themeColors.background }]}>2</Text>
                </View>
                <Text style={[styles.stepText, { color: themeColors.text.primary }]}>
                  {Platform.OS === 'ios'
                    ? '左上の「編集」→「ウィジェットを追加」をタップ'
                    : '「ウィジェット」を選択'}
                </Text>
              </View>
              <View style={styles.stepItem}>
                <View style={[styles.stepNumber, { backgroundColor: themeColors.primary }]}>
                  <Text style={[styles.stepNumberText, { color: themeColors.background }]}>3</Text>
                </View>
                <Text style={[styles.stepText, { color: themeColors.text.primary }]}>「PivotLog」を検索して選択</Text>
              </View>
              <View style={styles.stepItem}>
                <View style={[styles.stepNumber, { backgroundColor: themeColors.primary }]}>
                  <Text style={[styles.stepNumberText, { color: themeColors.background }]}>4</Text>
                </View>
                <Text style={[styles.stepText, { color: themeColors.text.primary }]}>好みのサイズを選んで追加</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingTop: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: fonts.family.bold,
    marginLeft: spacing.xs,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    ...textBase,
  },

  // --- セグメントコントロール ---
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: spacing.borderRadius.medium,
    borderWidth: 1,
    padding: 3,
    gap: 2,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: spacing.borderRadius.small,
  },
  segmentItemSelected: {
    borderRadius: spacing.borderRadius.small,
  },
  segmentLabel: {
    fontSize: 12,
    fontFamily: fonts.family.bold,
    ...textBase,
  },
  segmentDescription: {
    fontSize: 12,
    fontFamily: fonts.family.regular,
    marginTop: spacing.sm,
    marginLeft: spacing.xs,
    ...textBase,
  },

  // --- カスタムテキスト入力 ---
  textInput: {
    borderWidth: 1,
    borderRadius: spacing.borderRadius.medium,
    padding: spacing.md,
    fontSize: 14,
    fontFamily: fonts.family.regular,
    minHeight: 80,
    textAlignVertical: 'top',
    includeFontPadding: false,
  },
  charCount: {
    fontSize: 12,
    fontFamily: fonts.family.regular,
    marginRight: spacing.xs,
    ...textBase,
  },
  inputHint: {
    fontSize: 11,
    fontFamily: fonts.family.regular,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
    ...textBase,
  },

  // --- カウントダウンモード ---
  countdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  countdownCard: {
    width: '48%',
    flexGrow: 1,
    flexBasis: '47%',
    borderRadius: spacing.borderRadius.large,
    padding: spacing.md,
    alignItems: 'center',
    position: 'relative',
    minHeight: 90,
    justifyContent: 'center',
  },
  countdownCardIcon: {
    fontSize: 20,
    marginBottom: spacing.xs,
  },
  countdownCardLabel: {
    fontSize: 12,
    fontFamily: fonts.family.bold,
    marginBottom: 2,
    textAlign: 'center',
    ...textBase,
  },
  countdownCardPreview: {
    fontSize: 9,
    fontFamily: fonts.family.regular,
    textAlign: 'center',
    ...textBase,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // --- トグル ---
  toggleCard: {
    borderRadius: spacing.borderRadius.large,
    borderWidth: 1,
    overflow: 'hidden',
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  toggleItemLast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  toggleLabelContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  toggleLabel: {
    fontSize: 15,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  toggleDescription: {
    fontSize: 11,
    fontFamily: fonts.family.regular,
    marginTop: 2,
    ...textBase,
  },

  // --- アコーディオン・ヘルプ ---
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionCard: {
    borderRadius: spacing.borderRadius.large,
    padding: spacing.md,
    borderWidth: 1,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 12,
    fontFamily: fonts.family.bold,
    lineHeight: 24,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  stepText: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    flex: 1,
    ...textBase,
  },
  bottomSpacer: {
    height: 40,
  },
});

export default WidgetSettingsScreen;
