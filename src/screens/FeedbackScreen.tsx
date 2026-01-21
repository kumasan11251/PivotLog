import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import type { FeedbackScreenNavigationProp } from '../types/navigation';
import { getColors, fonts, spacing, textBase } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import ScreenHeader from '../components/common/ScreenHeader';

// Google FormsのURL
const FEEDBACK_FORM_URL = 'https://forms.gle/jAxfCEiMS9As6EtC7';

const FeedbackScreen: React.FC = () => {
  const navigation = useNavigation<FeedbackScreenNavigationProp>();
  const { isDark } = useTheme();
  const themeColors = useMemo(() => getColors(isDark), [isDark]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title="フィードバック"
        leftAction={{
          type: 'backIcon',
          onPress: () => navigation.goBack(),
        }}
      />

      <View style={styles.content}>
        {hasError ? (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: themeColors.text.primary }]}>
              フォームの読み込みに失敗しました
            </Text>
            <Text style={[styles.errorSubtext, { color: themeColors.text.secondary }]}>
              インターネット接続を確認してください
            </Text>
          </View>
        ) : (
          <>
            {isLoading && (
              <View style={[styles.loadingContainer, { backgroundColor: themeColors.background }]}>
                <ActivityIndicator size="large" color={themeColors.primary} />
                <Text style={[styles.loadingText, { color: themeColors.text.secondary }]}>読み込み中...</Text>
              </View>
            )}
            <WebView
              source={{ uri: FEEDBACK_FORM_URL }}
              style={[styles.webview, isLoading && styles.hidden]}
              onLoadStart={() => setIsLoading(true)}
              onLoadEnd={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setHasError(true);
              }}
              startInLoadingState={false}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              scalesPageToFit={true}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  hidden: {
    opacity: 0,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fonts.size.body,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorText: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.bold,
    textAlign: 'center',
    marginBottom: spacing.sm,
    ...textBase,
  },
  errorSubtext: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.regular,
    textAlign: 'center',
    ...textBase,
  },
});

export default FeedbackScreen;
