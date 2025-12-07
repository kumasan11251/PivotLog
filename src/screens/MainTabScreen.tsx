import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import TabBar from '../components/common/TabBar';
import HomeContent from '../components/HomeContent';
import DiaryListContent from '../components/DiaryListContent';
import { colors } from '../theme';
import type { RootStackParamList } from '../types/navigation';

type TabType = 'home' | 'diaryList';
type MainTabScreenRouteProp = RouteProp<RootStackParamList, 'Home'>;

const MainTabScreen: React.FC = () => {
  const route = useRoute<MainTabScreenRouteProp>();
  const initialTab = route.params?.initialTab ?? 'home';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  const [shouldRefresh, setShouldRefresh] = useState(false);

  useFocusEffect(
    useCallback(() => {
      // 画面がフォーカスされたら再読み込み（設定画面から戻った時など）
      setShouldRefresh(true);
      // すぐにリセットして次回のトリガーに備える
      const timer = setTimeout(() => setShouldRefresh(false), 100);

      // パラメータで指定されたタブに切り替え
      if (route.params?.initialTab) {
        setActiveTab(route.params.initialTab);
      }

      return () => clearTimeout(timer);
    }, [route.params])
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
