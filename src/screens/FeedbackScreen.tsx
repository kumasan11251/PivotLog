import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import type { FeedbackScreenNavigationProp } from '../types/navigation';
import { colors, fonts, spacing, textBase } from '../theme';
import ScreenHeader from '../components/common/ScreenHeader';

// Google FormsのURL
const FEEDBACK_FORM_URL = 'https://forms.gle/jAxfCEiMS9As6EtC7';

const FeedbackScreen: React.FC = () => {
  const navigation = useNavigation<FeedbackScreenNavigationProp>();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
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
            <Text style={styles.errorText}>
              フォームの読み込みに失敗しました
            </Text>
            <Text style={styles.errorSubtext}>
              インターネット接続を確認してください
            </Text>
          </View>
        ) : (
          <>
            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>読み込み中...</Text>
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
    backgroundColor: colors.background,
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
    backgroundColor: colors.background,
    zIndex: 1,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fonts.size.body,
    color: colors.text.secondary,
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
    color: colors.text.primary,
    fontFamily: fonts.family.bold,
    textAlign: 'center',
    marginBottom: spacing.sm,
    ...textBase,
  },
  errorSubtext: {
    fontSize: fonts.size.label,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    textAlign: 'center',
    ...textBase,
  },
});

export default FeedbackScreen;
