import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import TabBar from '../components/common/TabBar';
import HomeContent from '../components/HomeContent';
import DiaryListContent from '../components/DiaryListContent';
import HabitContent from '../components/HabitContent';
import { colors, getColors } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import type { RootStackParamList, MainTabType } from '../types/navigation';
import { useSyncOnReconnect } from '../hooks/useSyncOnReconnect';
import { logAnalyticsEvent } from '../services/firebase';

type MainTabScreenRouteProp = RouteProp<RootStackParamList, 'Home'>;

const MainTabScreen: React.FC = () => {
  const route = useRoute<MainTabScreenRouteProp>();
  const initialTab = route.params?.initialTab ?? 'home';
  const [activeTab, setActiveTab] = useState<MainTabType>(initialTab);
  const { isDark } = useTheme();
  const themeColors = getColors(isDark);
  useSyncOnReconnect();

  const [shouldRefresh, setShouldRefresh] = useState(false);

  // 計測用に現在のタブを参照で持つ（handleTabChangeを再生成せずに切り替え元を知るため）
  const activeTabRef = useRef<MainTabType>(initialTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const handleTabChange = useCallback((tab: MainTabType) => {
    // 入力中のキーボードを閉じてからタブを切り替える
    Keyboard.dismiss();
    const from = activeTabRef.current;
    if (from !== tab) {
      logAnalyticsEvent('tab_selected', { tab, from });
    }
    setActiveTab(tab);
  }, []);

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
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.contentContainer}>
        {/* 両コンテンツを常にマウントしておき、表示/非表示を切り替える */}
        {/* これによりDiaryListのキャッシュが保持され、タブ切り替えが高速化される */}
        <View style={[styles.tabContent, activeTab !== 'home' && styles.hidden]}>
          <HomeContent isActive={activeTab === 'home'} />
        </View>
        <View style={[styles.tabContent, activeTab !== 'diaryList' && styles.hidden]}>
          <DiaryListContent shouldRefresh={shouldRefresh} />
        </View>
        <View style={[styles.tabContent, activeTab !== 'habit' && styles.hidden]}>
          <HabitContent isActive={activeTab === 'habit'} />
        </View>
      </View>
      <TabBar activeTab={activeTab} onTabChange={handleTabChange} />
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
  tabContent: {
    flex: 1,
  },
  hidden: {
    display: 'none',
  },
});

export default MainTabScreen;
