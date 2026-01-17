package com.kumasan11251.pivotlog.widget

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import org.json.JSONObject

/**
 * React Native からウィジェットを制御するためのネイティブモジュール
 */
class WidgetBridgeModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "WidgetBridge"

    /**
     * ウィジェットデータを更新
     */
    @ReactMethod
    fun updateWidgetData(data: ReadableMap, promise: Promise) {
        try {
            // ReadableMap を JSON に変換
            val json = JSONObject().apply {
                put("birthday", data.getString("birthday") ?: "")
                put("targetLifespan", data.getInt("targetLifespan"))
                put("lifeProgress", data.getDouble("lifeProgress"))
                put("remainingYears", data.getDouble("remainingYears"))
                put("remainingDays", data.getInt("remainingDays"))
                put("currentAge", data.getDouble("currentAge"))
                put("customText", data.getString("customText") ?: "")
                put("lastUpdated", data.getString("lastUpdated") ?: "")
            }

            // データを保存
            val success = WidgetDataManager.saveDataFromJson(reactApplicationContext, json.toString())

            if (success) {
                // ウィジェットを更新
                ProgressWidgetProvider.updateAllWidgets(reactApplicationContext)
                promise.resolve(true)
            } else {
                promise.reject("ERROR", "Failed to save widget data")
            }
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to update widget data: ${e.message}", e)
        }
    }

    /**
     * すべてのウィジェットをリロード
     */
    @ReactMethod
    fun reloadAllWidgets(promise: Promise) {
        try {
            ProgressWidgetProvider.updateAllWidgets(reactApplicationContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to reload widgets: ${e.message}", e)
        }
    }

    /**
     * ウィジェットが利用可能かチェック
     */
    @ReactMethod
    fun isWidgetAvailable(promise: Promise) {
        promise.resolve(true)
    }
}
