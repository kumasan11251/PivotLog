/**
 * ウィジェットブリッジ
 * React Native からネイティブウィジェットを制御するためのブリッジ
 * @bacons/apple-targets の ExtensionStorage を使用
 */

import { Platform } from 'react-native';
import type { WidgetData } from '../types/widget';

// @bacons/apple-targets モジュールを動的にインポート
let ExtensionStorage: {
  new (groupId: string): {
    set: (key: string, value: string | number | Record<string, string | number> | undefined) => void;
    get: (key: string) => string | null;
    remove: (key: string) => void;
  };
  reloadWidget: (name?: string) => void;
} | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const appleTargets = require('@bacons/apple-targets');
  ExtensionStorage = appleTargets.ExtensionStorage;
} catch {
  console.log('[WidgetBridge] @bacons/apple-targets module not available');
}

// App Group ID
const APP_GROUP_ID = 'group.com.kumasan11251.pivotlog.expowidgets';

// ネイティブモジュールの型定義
interface WidgetBridgeInterface {
  /**
   * ウィジェットデータを更新
   * @param data ウィジェットに表示するデータ
   */
  updateWidgetData(data: WidgetData): Promise<void>;

  /**
   * すべてのウィジェットをリロード
   */
  reloadAllWidgets(): Promise<void>;

  /**
   * ウィジェットが利用可能かチェック
   */
  isWidgetAvailable(): Promise<boolean>;
}

/**
 * ウィジェットブリッジのラッパー
 * @bacons/apple-targets の ExtensionStorage を使用してネイティブウィジェットと通信
 */
class WidgetBridgeWrapper implements WidgetBridgeInterface {
  private isAvailable: boolean;
  private storage: InstanceType<NonNullable<typeof ExtensionStorage>> | null = null;

  constructor() {
    this.isAvailable = !!ExtensionStorage && Platform.OS === 'ios';
    if (this.isAvailable && ExtensionStorage) {
      this.storage = new ExtensionStorage(APP_GROUP_ID);
    } else {
      console.log('[WidgetBridge] ExtensionStorage not available or not iOS.');
    }
  }

  async updateWidgetData(data: WidgetData): Promise<void> {
    if (!this.isAvailable || !this.storage || !ExtensionStorage) {
      console.log('[WidgetBridge] updateWidgetData called (mock):', data.lastUpdated);
      return;
    }

    try {
      // JSONデータをExtensionStorageに保存
      const jsonData = JSON.stringify(data);
      this.storage.set('widgetData', jsonData);

      // ウィジェットをリロード
      ExtensionStorage.reloadWidget();

      console.log('[WidgetBridge] Widget data updated successfully');
    } catch (error) {
      console.error('[WidgetBridge] Failed to update widget data:', error);
      throw error;
    }
  }

  async reloadAllWidgets(): Promise<void> {
    if (!this.isAvailable || !ExtensionStorage) {
      console.log('[WidgetBridge] reloadAllWidgets called (mock)');
      return;
    }

    try {
      ExtensionStorage.reloadWidget();
      console.log('[WidgetBridge] Widgets reloaded successfully');
    } catch (error) {
      console.error('[WidgetBridge] Failed to reload widgets:', error);
      throw error;
    }
  }

  async isWidgetAvailable(): Promise<boolean> {
    // iOSのみウィジェットをサポート（@bacons/apple-targetsはiOSのみ）
    return this.isAvailable && Platform.OS === 'ios';
  }
}

// シングルトンインスタンス
export const WidgetBridge = new WidgetBridgeWrapper();

/**
 * ウィジェットブリッジが利用可能かどうか
 */
export const isWidgetBridgeAvailable = (): boolean => {
  return !!ExtensionStorage && Platform.OS === 'ios';
};
