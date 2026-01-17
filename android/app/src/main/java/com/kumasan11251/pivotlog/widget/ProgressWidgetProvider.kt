package com.kumasan11251.pivotlog.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import com.kumasan11251.pivotlog.R
import java.text.DecimalFormat

/**
 * 人生の進捗ウィジェット
 */
class ProgressWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        // 各ウィジェットインスタンスを更新
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)

        // カスタムアクションでウィジェットを更新
        if (intent.action == ACTION_UPDATE_WIDGET) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(
                android.content.ComponentName(context, ProgressWidgetProvider::class.java)
            )
            onUpdate(context, appWidgetManager, appWidgetIds)
        }
    }

    override fun onEnabled(context: Context) {
        // ウィジェットが初めて作成されたとき
    }

    override fun onDisabled(context: Context) {
        // 最後のウィジェットが削除されたとき
    }

    companion object {
        const val ACTION_UPDATE_WIDGET = "com.kumasan11251.pivotlog.ACTION_UPDATE_WIDGET"

        /**
         * ウィジェットを更新
         */
        internal fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            // データを読み込む
            val widgetData = WidgetDataManager.loadData(context)

            // 進捗を再計算
            val progress = widgetData.calculateCurrentProgress()
            val progressFormat = DecimalFormat("0.0")

            // RemoteViews を構築
            val views = RemoteViews(context.packageName, R.layout.widget_progress)

            // テキストを設定
            views.setTextViewText(R.id.widget_progress_text, "${progressFormat.format(progress)}%")
            views.setTextViewText(R.id.widget_remaining_text, widgetData.getFormattedRemainingTime())

            // プログレスバーを設定
            views.setProgressBar(R.id.widget_progress_bar, 100, progress.toInt(), false)

            // カスタムテキストがある場合は表示
            if (widgetData.customText.isNotEmpty()) {
                views.setTextViewText(R.id.widget_custom_text, widgetData.customText)
                views.setViewVisibility(R.id.widget_custom_text, android.view.View.VISIBLE)
            } else {
                views.setViewVisibility(R.id.widget_custom_text, android.view.View.GONE)
            }

            // クリック時にアプリを起動
            val pendingIntent = android.app.PendingIntent.getActivity(
                context,
                0,
                context.packageManager.getLaunchIntentForPackage(context.packageName),
                android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_container, pendingIntent)

            // ウィジェットを更新
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }

        /**
         * すべてのウィジェットを更新
         */
        fun updateAllWidgets(context: Context) {
            val intent = Intent(context, ProgressWidgetProvider::class.java).apply {
                action = ACTION_UPDATE_WIDGET
            }
            context.sendBroadcast(intent)
        }
    }
}
