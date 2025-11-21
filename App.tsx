import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import InitialSetupScreen from './src/screens/InitialSetupScreen';
import HomeScreen from './src/screens/HomeScreen';
import { loadUserSettings } from './src/utils/storage';
import { useFonts, NotoSansJP_400Regular, NotoSansJP_700Bold } from '@expo-google-fonts/noto-sans-jp';
import { colors } from './src/theme';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [fontsLoaded] = useFonts({
    NotoSansJP_400Regular,
    NotoSansJP_700Bold,
  });

  useEffect(() => {
    const checkUserSettings = async () => {
      const settings = await loadUserSettings();
      setIsSetupComplete(settings !== null);
      setIsLoading(false);
    };

    checkUserSettings();
  }, []);

  const handleSetupComplete = () => {
    setIsSetupComplete(true);
  };

  if (!fontsLoaded || isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isSetupComplete) {
    return (
      <>
        <InitialSetupScreen onComplete={handleSetupComplete} />
        <StatusBar style="auto" />
      </>
    );
  }

  return (
    <>
      <HomeScreen />
      <StatusBar style="auto" />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
