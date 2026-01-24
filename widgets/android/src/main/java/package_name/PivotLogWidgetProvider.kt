package com.kumasan11251.pivotlog

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import android.graphics.Color
import org.json.JSONException
import org.json.JSONObject
import android.util.Log

/**
 * PivotLog ウィジェット
 * 残りの人生時間を表示するウィジェット
 */
class PivotLogWidgetProvider : AppWidgetProvider() {

    companion object {
        private const val TAG = "PivotLogWidget"
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        // 全てのウィジェットインスタンスを更新
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onEnabled(context: Context) {
        // 最初のウィジェットが作成された時
        Log.d(TAG, "Widget enabled")
    }

    override fun onDisabled(context: Context) {
        // 最後のウィジェットが削除された時
        Log.d(TAG, "Widget disabled")
    }
}

internal fun updateAppWidget(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetId: Int
) {
    try {
        // SharedPreferencesからデータを取得
        val jsonData = context
            .getSharedPreferences("${context.packageName}.widgetdata", Context.MODE_PRIVATE)
            .getString("widgetdata", "{}")

        val data = JSONObject(jsonData)

        // RemoteViewsを構築
        val views = RemoteViews(context.packageName, R.layout.pivot_log_widget)

        // データが存在する場合
        if (data.has("remainingYears")) {
            val remainingYears = data.getDouble("remainingYears").toInt()
            val remainingDays = data.getInt("remainingDays")
            val lifeProgress = data.getDouble("lifeProgress")

            // 残り年数を設定
            views.setTextViewText(R.id.remaining_years, "${remainingYears}年")

            // 残り日数を設定（年の残り）
            views.setTextViewText(R.id.remaining_days, "${remainingDays % 365}日")

            // 進捗率を設定
            views.setTextViewText(R.id.life_progress, String.format("%.1f%%", lifeProgress))

            // プログレスバーを設定
            views.setProgressBar(R.id.progress_bar, 100, lifeProgress.toInt(), false)

            // カスタムテキストがあれば設定
            if (data.has("customText") && data.getString("customText").isNotEmpty()) {
                views.setTextViewText(R.id.custom_text, data.getString("customText"))
                views.setViewVisibility(R.id.custom_text, android.view.View.VISIBLE)
            } else {
                views.setViewVisibility(R.id.custom_text, android.view.View.GONE)
            }
        } else {
            // データがない場合はプレースホルダーを表示
            views.setTextViewText(R.id.remaining_years, "--年")
            views.setTextViewText(R.id.remaining_days, "--日")
            views.setTextViewText(R.id.life_progress, "--%")
            views.setProgressBar(R.id.progress_bar, 100, 0, false)
            views.setTextViewText(R.id.custom_text, "アプリを開いて設定を完了してください")
            views.setViewVisibility(R.id.custom_text, android.view.View.VISIBLE)
        }

        // ウィジェットを更新
        appWidgetManager.updateAppWidget(appWidgetId, views)

    } catch (e: JSONException) {
        Log.e(TAG, "Error parsing widget JSON: ${e.message}")
    }
}
