//
//  WidgetData.swift
//  PivotLogWidget
//
//  データモデル定義
//

import Foundation

/// ウィジェットで使用するデータ構造
struct WidgetData: Codable {
  let birthday: String
  let targetLifespan: Int
  let lifeProgress: Double
  let remainingYears: Double
  let remainingDays: Int
  let currentAge: Double
  let customText: String
  let lastUpdated: String

  /// デフォルト値（データがない場合に使用）
  static let placeholder = WidgetData(
    birthday: "1990-01-01",
    targetLifespan: 80,
    lifeProgress: 42.5,
    remainingYears: 37.5,
    remainingDays: 13687,
    currentAge: 35.0,
    customText: "",
    lastUpdated: ISO8601DateFormatter().string(from: Date())
  )
}

/// App Groups からデータを読み込むマネージャー
class WidgetDataManager {
  static let shared = WidgetDataManager()

  // App Groups の identifier
  // Note: これはアプリと Widget Extension で共有される
  private let appGroupIdentifier = "group.com.kumasan11251.pivotlog"
  private let dataKey = "widgetData"

  private init() {}

  /// UserDefaults からウィジェットデータを読み込む
  func loadData() -> WidgetData {
    guard let userDefaults = UserDefaults(suiteName: appGroupIdentifier) else {
      print("[WidgetDataManager] Failed to access App Groups")
      return WidgetData.placeholder
    }

    guard let data = userDefaults.data(forKey: dataKey) else {
      print("[WidgetDataManager] No data found in UserDefaults")
      return WidgetData.placeholder
    }

    do {
      let decoder = JSONDecoder()
      let widgetData = try decoder.decode(WidgetData.self, from: data)
      return widgetData
    } catch {
      print("[WidgetDataManager] Failed to decode data: \(error)")
      return WidgetData.placeholder
    }
  }

  /// ウィジェットデータを保存（React Native から呼ばれる）
  func saveData(_ widgetData: WidgetData) -> Bool {
    guard let userDefaults = UserDefaults(suiteName: appGroupIdentifier) else {
      print("[WidgetDataManager] Failed to access App Groups")
      return false
    }

    do {
      let encoder = JSONEncoder()
      let data = try encoder.encode(widgetData)
      userDefaults.set(data, forKey: dataKey)
      return true
    } catch {
      print("[WidgetDataManager] Failed to encode data: \(error)")
      return false
    }
  }
}
