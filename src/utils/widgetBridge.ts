/**
 * ウィジェットブリッジ
 * React Native からネイティブウィジェットを制御するためのブリッジ
 */

import { NativeModules, Platform } from 'react-native';
import type { WidgetData } from '../types/widget';

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

// ネイティブモジュールの取得（未実装の場合はモック）
const { WidgetBridge: NativeWidgetBridge } = NativeModules;

/**
 * ウィジェットブリッジのラッパー
 * ネイティブモジュールが未実装の場合でもエラーにならないようにする
 */
class WidgetBridgeWrapper implements WidgetBridgeInterface {
  private isAvailable: boolean;

  constructor() {
    this.isAvailable = !!NativeWidgetBridge;
    if (!this.isAvailable) {
      console.log('[WidgetBridge] ネイティブモジュールが見つかりません。');
    }
  }

  async updateWidgetData(data: WidgetData): Promise<void> {
    if (!this.isAvailable) {
      console.log('[WidgetBridge] updateWidgetData called (mock):', data.lastUpdated);
      return;
    }

    try {
      await NativeWidgetBridge.updateWidgetData(data);
      console.log('[WidgetBridge] Widget data updated successfully');
    } catch (error) {
      console.error('[WidgetBridge] Failed to update widget data:', error);
      throw error;
    }
  }

  async reloadAllWidgets(): Promise<void> {
    if (!this.isAvailable) {
      console.log('[WidgetBridge] reloadAllWidgets called (mock)');
      return;
    }

    try {
      await NativeWidgetBridge.reloadAllWidgets();
      console.log('[WidgetBridge] Widgets reloaded successfully');
    } catch (error) {
      console.error('[WidgetBridge] Failed to reload widgets:', error);
      throw error;
    }
  }

  async isWidgetAvailable(): Promise<boolean> {
    if (!this.isAvailable) {
      return false;
    }

    try {
      if (typeof NativeWidgetBridge.isWidgetAvailable === 'function') {
        return await NativeWidgetBridge.isWidgetAvailable();
      }
      // メソッドが存在しない場合はプラットフォームに基づいて判断
      return Platform.OS === 'ios' || Platform.OS === 'android';
    } catch (error) {
      console.error('[WidgetBridge] Failed to check widget availability:', error);
      return false;
    }
  }
}

// シングルトンインスタンス
export const WidgetBridge = new WidgetBridgeWrapper();

/**
 * ウィジェットブリッジが利用可能かどうか
 */
export const isWidgetBridgeAvailable = (): boolean => {
  return !!NativeWidgetBridge;
};
