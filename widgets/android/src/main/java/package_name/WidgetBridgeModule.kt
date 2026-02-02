package com.kumasan11251.pivotlog

import android.content.Context
import android.content.SharedPreferences
import android.content.Intent
import android.content.ComponentName
import android.appwidget.AppWidgetManager
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class WidgetBridgeModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "WidgetBridge"
    }

    override fun getName(): String = "WidgetBridge"

    @ReactMethod
    fun setWidgetData(json: String, packageName: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            Log.d(TAG, "setWidgetData called with packageName: $packageName")

            // SharedPreferencesに保存
            val prefs = context.getSharedPreferences("$packageName.widgetdata", Context.MODE_PRIVATE)
            prefs.edit().putString("widgetdata", json).apply()
            Log.d(TAG, "Data saved to SharedPreferences")

            // ウィジェットを直接更新
            val widgetManager = AppWidgetManager.getInstance(context)
            val componentName = ComponentName(context, PivotLogWidgetProvider::class.java)
            val widgetIds = widgetManager.getAppWidgetIds(componentName)

            Log.d(TAG, "Found ${widgetIds.size} widget(s)")

            if (widgetIds.isNotEmpty()) {
                // 各ウィジェットを更新
                for (widgetId in widgetIds) {
                    updateAppWidget(context, widgetManager, widgetId)
                    Log.d(TAG, "Updated widget ID: $widgetId")
                }
            }

            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error updating widget: ${e.message}", e)
            promise.reject("WIDGET_ERROR", e.message, e)
        }
    }
}
