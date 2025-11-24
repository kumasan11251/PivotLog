import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import TabBar from '../components/common/TabBar';
import HomeContent from '../components/HomeContent';
import DiaryListContent from '../components/DiaryListContent';
import { colors } from '../theme';

type TabType = 'home' | 'diaryList';

const MainTabScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [shouldRefresh, setShouldRefresh] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      // 画面がフォーカスされたら再読み込み（設定画面から戻った時など）
      setShouldRefresh(true);
      // すぐにリセットして次回のトリガーに備える
      const timer = setTimeout(() => setShouldRefresh(false), 100);
      return () => clearTimeout(timer);
    }, [])
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.contentContainer}>
        {activeTab === 'home' ? (
          <HomeContent />
        ) : (
          <DiaryListContent shouldRefresh={shouldRefresh} />
        )}
      </View>
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    flex: 1,
  },
});

export default MainTabScreen;
