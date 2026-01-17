//
//  WidgetBridge.swift
//  pivotlog
//
//  React Native から Widget を制御するためのネイティブモジュール
//

import Foundation
import WidgetKit

@objc(WidgetBridge)
class WidgetBridge: NSObject {

  private let appGroupIdentifier = "group.com.kumasan11251.pivotlog"
  private let dataKey = "widgetData"

  /// ウィジェットデータを更新
  @objc
  func updateWidgetData(
    _ data: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let userDefaults = UserDefaults(suiteName: appGroupIdentifier) else {
      reject("ERROR", "Failed to access App Groups", nil)
      return
    }

    // NSDictionary を JSON Data に変換
    do {
      let jsonData = try JSONSerialization.data(withJSONObject: data, options: [])
      userDefaults.set(jsonData, forKey: dataKey)

      // ウィジェットをリロード
      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadAllTimelines()
      }

      resolve(true)
    } catch {
      reject("ERROR", "Failed to save widget data: \(error.localizedDescription)", error)
    }
  }

  /// すべてのウィジェットをリロード
  @objc
  func reloadAllWidgets(
    _ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
      resolve(true)
    } else {
      reject("ERROR", "Widgets are not supported on this iOS version", nil)
    }
  }

  /// ウィジェットが利用可能かチェック
  @objc
  func isWidgetAvailable(
    _ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    if #available(iOS 14.0, *) {
      resolve(true)
    } else {
      resolve(false)
    }
  }

  /// React Native のメインキューを使用するかどうか
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
