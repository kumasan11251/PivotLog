import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import InitialSetupScreen from './src/screens/InitialSetupScreen';
import { loadUserSettings } from './src/utils/storage';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSetupComplete, setIsSetupComplete] = useState(false);

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

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#8B9D83" />
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
    <View style={styles.container}>
      {/* ここに後でホーム画面を追加 */}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
