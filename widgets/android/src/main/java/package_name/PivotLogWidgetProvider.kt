package com.kumasan11251.pivotlog

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import org.json.JSONException
import org.json.JSONObject
import android.util.Log
import android.app.PendingIntent
import android.content.Intent
import android.net.Uri

/**
 * PivotLog ウィジェット
 * 残りの人生時間を表示するウィジェット
 */
class PivotLogWidgetProvider : AppWidgetProvider() {

    companion object {
        private const val TAG = "PivotLogWidget"

        // ライトモードの色
        const val LIGHT_PRIMARY = "#8B9D83"
        const val LIGHT_TEXT_PRIMARY = "#1C1C1E"
        const val LIGHT_TEXT_SECONDARY = "#8A8A8E"

        // ダークモードの色
        const val DARK_PRIMARY = "#A3B899"
        const val DARK_TEXT_PRIMARY = "#F5F5F5"
        const val DARK_TEXT_SECONDARY = "#A0A0A0"
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
    val TAG = "PivotLogWidget"
    Log.d(TAG, "updateAppWidget called for widget ID: $appWidgetId")
    try {
        // SharedPreferencesからデータを取得
        val prefsName = "${context.packageName}.widgetdata"
        Log.d(TAG, "Reading from SharedPreferences: $prefsName")

        val jsonData = context
            .getSharedPreferences(prefsName, Context.MODE_PRIVATE)
            .getString("widgetdata", "{}")

        Log.d(TAG, "JSON data: $jsonData")

        val data = JSONObject(jsonData)

        // RemoteViewsを構築
        val views = RemoteViews(context.packageName, R.layout.pivot_log_widget)

        // colorSchemeを取得してダークモードか判定
        val colorScheme = if (data.has("colorScheme")) data.getString("colorScheme") else "light"
        val isDarkMode = colorScheme == "dark"
        Log.d(TAG, "colorScheme: $colorScheme, isDarkMode: $isDarkMode")

        // テーマに応じた色を設定
        val primaryColor = Color.parseColor(if (isDarkMode) PivotLogWidgetProvider.DARK_PRIMARY else PivotLogWidgetProvider.LIGHT_PRIMARY)
        val textPrimaryColor = Color.parseColor(if (isDarkMode) PivotLogWidgetProvider.DARK_TEXT_PRIMARY else PivotLogWidgetProvider.LIGHT_TEXT_PRIMARY)
        val textSecondaryColor = Color.parseColor(if (isDarkMode) PivotLogWidgetProvider.DARK_TEXT_SECONDARY else PivotLogWidgetProvider.LIGHT_TEXT_SECONDARY)

        // 背景を設定（ダークモード用とライトモード用）
        val backgroundRes = if (isDarkMode) R.drawable.widget_background_dark else R.drawable.widget_background_light
        views.setInt(R.id.widget_root, "setBackgroundResource", backgroundRes)

        // データが存在する場合
        if (data.has("remainingYears")) {
            val remainingYears = data.getDouble("remainingYears").toInt()
            val remainingDays = data.getInt("remainingDays")
            val lifeProgress = data.getDouble("lifeProgress")

            Log.d(TAG, "Data found: remainingYears=$remainingYears, remainingDays=$remainingDays, lifeProgress=$lifeProgress")

            // 残り年数を設定（数字のみ）
            views.setTextViewText(R.id.remaining_years_number, "$remainingYears")
            views.setTextColor(R.id.remaining_years_number, primaryColor)

            // 年ラベルの色を設定
            views.setTextColor(R.id.remaining_years_label, textPrimaryColor)

            // 残り日数を設定（年の残り、数字のみ）
            views.setTextViewText(R.id.remaining_days_number, "${remainingDays % 365}")
            views.setTextColor(R.id.remaining_days_number, primaryColor)

            // 日ラベルの色を設定
            views.setTextColor(R.id.remaining_days_label, textPrimaryColor)

            // 進捗率を設定
            views.setTextViewText(R.id.life_progress, String.format("%.1f%%", lifeProgress))
            views.setTextColor(R.id.life_progress, primaryColor)

            // プログレスバーを設定（max=1000で0.1%単位の精度）
            views.setProgressBar(R.id.progress_bar, 1000, (lifeProgress * 10).toInt(), false)

            // 表示要素フラグの読み取り（デフォルト=true）
            val showDateHeader = !data.has("showDateHeader") || data.getBoolean("showDateHeader")
            val showDiaryStatus = !data.has("showDiaryStatus") || data.getBoolean("showDiaryStatus")
            val showStreak = !data.has("showStreak") || data.getBoolean("showStreak")
            val todayDateLabel = data.optString("todayDateLabel", "")
            val streakDays = if (data.has("streakDays")) data.getInt("streakDays") else 0

            // ヘッダー行の表示条件（日付 OR 連続記録のいずれかが表示される場合）
            val showHeaderRow = (showDateHeader && todayDateLabel.isNotEmpty()) ||
                                (showStreak && streakDays > 0)

            if (showHeaderRow) {
                views.setViewVisibility(R.id.date_header_row, android.view.View.VISIBLE)

                // 日付テキスト
                if (showDateHeader && todayDateLabel.isNotEmpty()) {
                    views.setTextViewText(R.id.date_header_text, todayDateLabel)
                    views.setTextColor(R.id.date_header_text, textSecondaryColor)
                } else {
                    views.setTextViewText(R.id.date_header_text, "")
                }

                // 日記記入状態アイコン（日付ヘッダー表示時のみ）
                if (showDateHeader && todayDateLabel.isNotEmpty() && showDiaryStatus) {
                    val hasTodayEntry = data.has("hasTodayEntry") && data.getBoolean("hasTodayEntry")
                    if (hasTodayEntry) {
                        views.setImageViewResource(R.id.diary_status_icon, R.drawable.ic_diary_status_completed)
                        views.setInt(R.id.diary_status_icon, "setColorFilter", primaryColor)
                        views.setContentDescription(R.id.diary_status_icon, "日記記入済み")
                    } else {
                        views.setImageViewResource(R.id.diary_status_icon, R.drawable.ic_diary_status_pending)
                        val pendingColor = Color.argb(
                            128, Color.red(textSecondaryColor),
                            Color.green(textSecondaryColor), Color.blue(textSecondaryColor)
                        )
                        views.setInt(R.id.diary_status_icon, "setColorFilter", pendingColor)
                        views.setContentDescription(R.id.diary_status_icon, "日記未記入")
                    }
                    views.setViewVisibility(R.id.diary_status_icon, android.view.View.VISIBLE)
                } else {
                    views.setViewVisibility(R.id.diary_status_icon, android.view.View.GONE)
                }

                // 連続記録（ヘッダー行内）
                if (showStreak && streakDays > 0) {
                    views.setTextViewText(R.id.streak_emoji, data.optString("streakEmoji", "📝"))
                    views.setTextViewText(R.id.streak_text, "${streakDays}日連続")
                    views.setTextColor(R.id.streak_text, textSecondaryColor)
                    views.setViewVisibility(R.id.streak_emoji, android.view.View.VISIBLE)
                    views.setViewVisibility(R.id.streak_text, android.view.View.VISIBLE)
                } else {
                    views.setViewVisibility(R.id.streak_emoji, android.view.View.GONE)
                    views.setViewVisibility(R.id.streak_text, android.view.View.GONE)
                }
            } else {
                views.setViewVisibility(R.id.date_header_row, android.view.View.GONE)
            }

            // メッセージソースに応じて表示テキストを決定
            val messageSource = data.optString("messageSource", "custom")
            val perspectiveMainText = data.optString("perspectiveMainText", "")
            val perspectiveEmoji = data.optString("perspectiveEmoji", "")
            val dailyMessage = data.optString("dailyMessage", "")
            val customTextValue = data.optString("customText", "")

            val displayText = when (messageSource) {
                "perspective" -> {
                    if (perspectiveEmoji.isNotEmpty()) "$perspectiveEmoji $perspectiveMainText"
                    else perspectiveMainText
                }
                "daily" -> dailyMessage
                else -> { // "custom"
                    if (customTextValue.isEmpty()) {
                        if (perspectiveEmoji.isNotEmpty()) "$perspectiveEmoji $perspectiveMainText"
                        else perspectiveMainText
                    } else customTextValue
                }
            }

            if (displayText.isNotEmpty()) {
                views.setTextViewText(R.id.custom_text, displayText)
                views.setTextColor(R.id.custom_text, textSecondaryColor)
                views.setViewVisibility(R.id.custom_text, android.view.View.VISIBLE)
            } else {
                views.setViewVisibility(R.id.custom_text, android.view.View.GONE)
            }

            // PendingIntent: ウィジェットタップでアプリにディープリンク
            val hasTodayEntry = data.has("hasTodayEntry") && data.getBoolean("hasTodayEntry")
            val deepLinkUri = if (hasTodayEntry) {
                Uri.parse("pivotlog://home")
            } else {
                val effectiveTodayDate = data.optString("effectiveTodayDate", "")
                if (effectiveTodayDate.isNotEmpty()) {
                    Uri.parse("pivotlog://diary/$effectiveTodayDate")
                } else {
                    Uri.parse("pivotlog://home")
                }
            }

            val intent = Intent(Intent.ACTION_VIEW, deepLinkUri).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingIntent = PendingIntent.getActivity(
                context,
                appWidgetId,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)

        } else {
            Log.d(TAG, "No data found in JSON, showing placeholder")
            // データがない場合は新しいビューを非表示
            views.setViewVisibility(R.id.date_header_row, android.view.View.GONE)
            // データがない場合はプレースホルダーを表示
            views.setTextViewText(R.id.remaining_years_number, "--")
            views.setTextColor(R.id.remaining_years_number, primaryColor)
            views.setTextColor(R.id.remaining_years_label, textPrimaryColor)
            views.setTextViewText(R.id.remaining_days_number, "--")
            views.setTextColor(R.id.remaining_days_number, primaryColor)
            views.setTextColor(R.id.remaining_days_label, textPrimaryColor)
            views.setTextViewText(R.id.life_progress, "--%")
            views.setTextColor(R.id.life_progress, primaryColor)
            views.setProgressBar(R.id.progress_bar, 100, 0, false)
            views.setTextViewText(R.id.custom_text, "アプリを開いて設定を完了してください")
            views.setTextColor(R.id.custom_text, textSecondaryColor)
            views.setViewVisibility(R.id.custom_text, android.view.View.VISIBLE)

            // データがない場合もアプリを開くPendingIntent
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("pivotlog://home")).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingIntent = PendingIntent.getActivity(
                context,
                appWidgetId,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)
        }

        // ウィジェットを更新
        appWidgetManager.updateAppWidget(appWidgetId, views)
        Log.d(TAG, "Widget updated successfully")

    } catch (e: JSONException) {
        Log.e(TAG, "Error parsing widget JSON: ${e.message}")
    }
}
