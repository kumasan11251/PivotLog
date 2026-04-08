import React, { useEffect, useMemo } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { getColors, fonts, spacing } from '../../theme';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

export const OfflineBanner: React.FC = () => {
  const { isDark } = useTheme();
  const themeColors = getColors(isDark);
  const insets = useSafeAreaInsets();
  const { isOffline } = useNetworkStatus();
  const animatedOpacity = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    Animated.timing(animatedOpacity, {
      toValue: isOffline ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOffline, animatedOpacity]);

  if (!isOffline) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top,
          backgroundColor: themeColors.error,
          opacity: animatedOpacity,
        },
      ]}
      pointerEvents="none"
    >
      <Text style={styles.text}>インターネットに接続されていません</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 999,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontFamily: fonts.notoSansJP.medium,
    fontSize: 13,
  },
});
