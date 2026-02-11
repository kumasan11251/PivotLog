package com.kumasan11251.pivotlog

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.net.Uri
import android.widget.RemoteViews
import android.graphics.Color
import org.json.JSONException
import org.json.JSONObject
import android.util.Log
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

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

        /**
         * システムのダークモード設定を取得
         */
        fun isSystemDarkMode(context: Context): Boolean {
            val nightModeFlags = context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK
            return nightModeFlags == Configuration.UI_MODE_NIGHT_YES
        }
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onEnabled(context: Context) {
        Log.d(TAG, "Widget enabled")
    }

    override fun onDisabled(context: Context) {
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
        val prefsName = "${context.packageName}.widgetdata"
        val jsonData = context
            .getSharedPreferences(prefsName, Context.MODE_PRIVATE)
            .getString("widgetdata", "{}")

        val data = JSONObject(jsonData)
        val views = RemoteViews(context.packageName, R.layout.pivot_log_widget)

        // themeMode判定（後方互換性のためcolorSchemeもフォールバックとして使用）
        val themeMode = if (data.has("themeMode")) data.getString("themeMode") else null
        val colorScheme = if (data.has("colorScheme")) data.getString("colorScheme") else "light"
        val isDarkMode = when (themeMode) {
            "light" -> false
            "dark" -> true
            "system" -> PivotLogWidgetProvider.isSystemDarkMode(context)
            else -> colorScheme == "dark"  // themeModeがない場合は後方互換性のためcolorSchemeを使用
        }

        val primaryColor = Color.parseColor(if (isDarkMode) PivotLogWidgetProvider.DARK_PRIMARY else PivotLogWidgetProvider.LIGHT_PRIMARY)
        val textPrimaryColor = Color.parseColor(if (isDarkMode) PivotLogWidgetProvider.DARK_TEXT_PRIMARY else PivotLogWidgetProvider.LIGHT_TEXT_PRIMARY)
        val textSecondaryColor = Color.parseColor(if (isDarkMode) PivotLogWidgetProvider.DARK_TEXT_SECONDARY else PivotLogWidgetProvider.LIGHT_TEXT_SECONDARY)

        val backgroundRes = if (isDarkMode) R.drawable.widget_background_dark else R.drawable.widget_background_light
        views.setInt(R.id.widget_root, "setBackgroundResource", backgroundRes)

        if (data.has("remainingYears")) {
            val remainingYears = data.getDouble("remainingYears").toInt()
            val remainingDays = data.getInt("remainingDays")
            val lifeProgress = data.getDouble("lifeProgress")

            // --- ヘッダー行: 日付 + 日記状態 + ストリーク ---
            val showDateHeader = !data.has("showDateHeader") || data.getBoolean("showDateHeader")
            val showDiaryStatus = !data.has("showDiaryStatus") || data.getBoolean("showDiaryStatus")
            val showStreak = !data.has("showStreak") || data.getBoolean("showStreak")

            // 日付ラベル
            if (showDateHeader && data.has("todayDateLabel")) {
                views.setTextViewText(R.id.date_label, data.getString("todayDateLabel"))
                views.setTextColor(R.id.date_label, textSecondaryColor)
                views.setViewVisibility(R.id.date_label, android.view.View.VISIBLE)
            } else {
                views.setViewVisibility(R.id.date_label, android.view.View.GONE)
            }

            // 日記状態インジケーター
            if (showDiaryStatus && data.has("hasTodayEntry")) {
                val hasTodayEntry = data.getBoolean("hasTodayEntry")
                views.setTextViewText(R.id.diary_status, if (hasTodayEntry) "✓" else "○")
                views.setTextColor(R.id.diary_status, if (hasTodayEntry) primaryColor else textSecondaryColor)
                views.setViewVisibility(R.id.diary_status, android.view.View.VISIBLE)
            } else {
                views.setViewVisibility(R.id.diary_status, android.view.View.GONE)
            }

            // ストリーク表示
            if (showStreak && data.has("streakDays") && data.getInt("streakDays") > 0) {
                val streakDays = data.getInt("streakDays")
                val streakEmoji = if (data.has("streakEmoji")) data.getString("streakEmoji") else "📝"
                views.setTextViewText(R.id.streak_text, "$streakEmoji ${streakDays}日連続")
                views.setTextColor(R.id.streak_text, textSecondaryColor)
                views.setViewVisibility(R.id.streak_text, android.view.View.VISIBLE)
            } else {
                views.setViewVisibility(R.id.streak_text, android.view.View.GONE)
            }

            // --- カウントダウン表示（モード対応） ---
            val countdownMode = if (data.has("countdownMode")) data.getString("countdownMode") else "detailed"

            when (countdownMode) {
                "daysOnly" -> {
                    val numberFormat = NumberFormat.getNumberInstance(Locale.getDefault())
                    views.setTextViewText(R.id.remaining_years_number, numberFormat.format(remainingDays))
                    views.setTextColor(R.id.remaining_years_number, primaryColor)
                    views.setTextViewText(R.id.remaining_years_label, "日")
                    views.setTextColor(R.id.remaining_years_label, textPrimaryColor)
                    views.setViewVisibility(R.id.remaining_days_number, android.view.View.GONE)
                    views.setViewVisibility(R.id.remaining_days_label, android.view.View.GONE)
                }
                "weeksOnly" -> {
                    val totalWeeks = if (data.has("totalWeeks")) data.getInt("totalWeeks") else remainingDays / 7
                    val numberFormat = NumberFormat.getNumberInstance(Locale.getDefault())
                    views.setTextViewText(R.id.remaining_years_number, numberFormat.format(totalWeeks))
                    views.setTextColor(R.id.remaining_years_number, primaryColor)
                    views.setTextViewText(R.id.remaining_years_label, "週")
                    views.setTextColor(R.id.remaining_years_label, textPrimaryColor)
                    views.setViewVisibility(R.id.remaining_days_number, android.view.View.GONE)
                    views.setViewVisibility(R.id.remaining_days_label, android.view.View.GONE)
                }
                "yearsOnly" -> {
                    views.setTextViewText(R.id.remaining_years_number, "$remainingYears")
                    views.setTextColor(R.id.remaining_years_number, primaryColor)
                    views.setTextViewText(R.id.remaining_years_label, "年")
                    views.setTextColor(R.id.remaining_years_label, textPrimaryColor)
                    views.setViewVisibility(R.id.remaining_days_number, android.view.View.GONE)
                    views.setViewVisibility(R.id.remaining_days_label, android.view.View.GONE)
                }
                else -> { // "detailed"
                    views.setTextViewText(R.id.remaining_years_number, "$remainingYears")
                    views.setTextColor(R.id.remaining_years_number, primaryColor)
                    views.setTextViewText(R.id.remaining_years_label, "年")
                    views.setTextColor(R.id.remaining_years_label, textPrimaryColor)
                    views.setTextViewText(R.id.remaining_days_number, "${remainingDays % 365}")
                    views.setTextColor(R.id.remaining_days_number, primaryColor)
                    views.setTextViewText(R.id.remaining_days_label, "日")
                    views.setTextColor(R.id.remaining_days_label, textPrimaryColor)
                    views.setViewVisibility(R.id.remaining_days_number, android.view.View.VISIBLE)
                    views.setViewVisibility(R.id.remaining_days_label, android.view.View.VISIBLE)
                }
            }

            // 進捗率
            views.setTextViewText(R.id.life_progress, String.format("%.1f%%", lifeProgress))
            views.setTextColor(R.id.life_progress, primaryColor)

            // プログレスバー
            views.setProgressBar(R.id.progress_bar, 1000, (lifeProgress * 10).toInt(), false)

            // --- メッセージ表示（messageSourceに基づく） ---
            val messageSource = if (data.has("messageSource")) data.getString("messageSource") else "custom"
            var displayText = ""

            when (messageSource) {
                "perspective" -> {
                    if (data.has("perspectiveEmoji") && data.has("perspectiveMainText")) {
                        val emoji = data.getString("perspectiveEmoji")
                        val mainText = data.getString("perspectiveMainText")
                        displayText = "$emoji $mainText"
                        if (data.has("perspectiveSubtext") && data.getString("perspectiveSubtext").isNotEmpty()) {
                            displayText += "\n${data.getString("perspectiveSubtext")}"
                        }
                    }
                }
                "daily" -> {
                    if (data.has("dailyMessage")) {
                        displayText = data.getString("dailyMessage")
                    }
                }
                else -> { // "custom"
                    if (data.has("customText") && data.getString("customText").isNotEmpty()) {
                        displayText = data.getString("customText")
                    } else if (data.has("perspectiveEmoji") && data.has("perspectiveMainText")) {
                        // カスタムテキストが空の場合はperspectiveにフォールバック
                        val emoji = data.getString("perspectiveEmoji")
                        val mainText = data.getString("perspectiveMainText")
                        displayText = "$emoji $mainText"
                    }
                }
            }

            // メッセージ表示（収まる分だけ表示・上下中央配置はXMLで設定済み）
            if (displayText.isNotEmpty()) {
                views.setTextViewText(R.id.custom_text, displayText)
                views.setTextColor(R.id.custom_text, textSecondaryColor)
                views.setViewVisibility(R.id.custom_text, android.view.View.VISIBLE)
            } else {
                views.setViewVisibility(R.id.custom_text, android.view.View.GONE)
            }

            // --- ディープリンク設定 ---
            val hasTodayEntry = data.has("hasTodayEntry") && data.getBoolean("hasTodayEntry")
            val deepLinkUri = if (hasTodayEntry) {
                "pivotlog://home"
            } else {
                // effectiveTodayDate があればそれを使用（dayStartHour考慮済み）、なければフォールバック
                val effectiveTodayDate = if (data.has("effectiveTodayDate") && !data.isNull("effectiveTodayDate")) {
                    data.getString("effectiveTodayDate")
                } else {
                    val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
                    dateFormat.format(Date())
                }
                "pivotlog://diary/$effectiveTodayDate"
            }

            val intent = Intent(Intent.ACTION_VIEW).apply {
                this.data = Uri.parse(deepLinkUri)
                setPackage(context.packageName)
            }
            val pendingIntent = PendingIntent.getActivity(
                context, appWidgetId, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)

        } else {
            Log.d(TAG, "No data found in JSON, showing placeholder")
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
            views.setViewVisibility(R.id.date_label, android.view.View.GONE)
            views.setViewVisibility(R.id.diary_status, android.view.View.GONE)
            views.setViewVisibility(R.id.streak_text, android.view.View.GONE)
        }

        appWidgetManager.updateAppWidget(appWidgetId, views)
        Log.d(TAG, "Widget updated successfully")

    } catch (e: JSONException) {
        Log.e(TAG, "Error parsing widget JSON: ${e.message}")
    }
}
