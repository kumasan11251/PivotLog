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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import type { WidgetSettingsScreenNavigationProp } from '../types/navigation';
import { getColors, fonts, spacing } from '../theme';
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

const WidgetSettingsScreen: React.FC = () => {
  const navigation = useNavigation<WidgetSettingsScreenNavigationProp>();
  const { isDark } = useTheme();
  const themeColors = useMemo(() => getColors(isDark), [isDark]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [customText, setCustomText] = useState('');
  const [originalCustomText, setOriginalCustomText] = useState('');
  const [isHelpExpanded, setIsHelpExpanded] = useState(true); // デフォルトは開いた状態

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
    // 状態を保存
    try {
      await AsyncStorage.setItem(HELP_EXPANDED_KEY, String(newState));
    } catch (error) {
      console.error('折りたたみ状態の保存に失敗:', error);
    }
  }, [isHelpExpanded]);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const loadedSettings = await loadWidgetSettings();
      setCustomText(loadedSettings.customText);
      setOriginalCustomText(loadedSettings.customText);
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

  const hasChanges = customText !== originalCustomText;

  const handleSave = async () => {
    if (!hasChanges) {
      navigation.goBack();
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await saveWidgetSettings({ customText });
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
        {/* カスタムメッセージ */}
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
    marginBottom: spacing.lg,
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
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
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
  textInput: {
    borderWidth: 1,
    borderRadius: spacing.borderRadius.medium,
    padding: spacing.md,
    fontSize: 14,
    fontFamily: fonts.family.regular,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    fontFamily: fonts.family.regular,
    marginRight: spacing.xs,
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
  },
  bottomSpacer: {
    height: 40,
  },
});

export default WidgetSettingsScreen;
