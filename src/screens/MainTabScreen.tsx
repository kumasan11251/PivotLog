import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TabBar from '../components/common/TabBar';
import HomeContent from '../components/HomeContent';
import DiaryListContent from '../components/DiaryListContent';
import { colors } from '../theme';

type TabType = 'home' | 'diaryList';

const MainTabScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('home');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.contentContainer}>
        {activeTab === 'home' ? <HomeContent /> : <DiaryListContent />}
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
