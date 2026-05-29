package com.kumasan11251.pivotlog

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.util.Log
import android.widget.RemoteViews
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import java.text.NumberFormat
import java.util.Calendar
import java.util.Locale
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min

/**
 * PivotLog ウィジェット
 * 残りの人生時間を表示するウィジェット
 *
 * 0:00 跨ぎ自動更新のため、AlarmManager + system broadcast + updatePeriodMillis(30分)
 * の三重で表示更新の収束を保証する。アラームは `PivotLogWidgetAlarmReceiver`
 * (exported=false) で受け、外部から独自 action を叩かれない設計。
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

        // 独自 alarm action。exported=false の receiver で受ける
        const val ACTION_DISPLAY_UPDATE_ALARM =
            "com.kumasan11251.pivotlog.WIDGET_DISPLAY_UPDATE_ALARM"
        private const val REQUEST_CODE_DISPLAY_UPDATE_ALARM = 1001

        private fun displayUpdatePendingIntent(context: Context): PendingIntent {
            val intent = Intent(context, PivotLogWidgetAlarmReceiver::class.java).apply {
                action = ACTION_DISPLAY_UPDATE_ALARM
            }
            return PendingIntent.getBroadcast(
                context.applicationContext,
                REQUEST_CODE_DISPLAY_UPDATE_ALARM,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }

        /**
         * 次の表示更新境界（次の 0:00 と次の dayStartHour 境界の早い方）に
         * setAndAllowWhileIdle で alarm を登録する。
         * ウィジェット未設置時は登録せず終了し、alarm が自己ループし続けるのを防ぐ。
         */
        fun scheduleNextDisplayUpdateAlarm(context: Context) {
            val appContext = context.applicationContext
            val mgr = AppWidgetManager.getInstance(appContext)
            val ids = mgr.getAppWidgetIds(
                ComponentName(appContext, PivotLogWidgetProvider::class.java)
            )
            if (ids.isEmpty()) {
                cancelDisplayUpdateAlarm(appContext)
                Log.d(TAG, "No widget instances; skip alarm scheduling")
                return
            }

            val dayStartHour = readDayStartHour(appContext)
            val now = System.currentTimeMillis()
            val triggerAtMillis = WidgetDateHelpers.nextDisplayUpdateMillis(now, dayStartHour)

            val pendingIntent = displayUpdatePendingIntent(appContext)
            val alarmManager = appContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager?
            if (alarmManager == null) {
                Log.w(TAG, "AlarmManager unavailable; cannot schedule display update")
                return
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerAtMillis,
                    pendingIntent
                )
            } else {
                alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
            }
            Log.d(
                TAG,
                "Scheduled display update alarm at $triggerAtMillis (dayStartHour=$dayStartHour)"
            )
        }

        fun cancelDisplayUpdateAlarm(context: Context) {
            val appContext = context.applicationContext
            val pendingIntent = displayUpdatePendingIntent(appContext)
            val alarmManager = appContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager?
            alarmManager?.cancel(pendingIntent)
            Log.d(TAG, "Cancelled display update alarm")
        }

        private fun readDayStartHour(context: Context): Int {
            return try {
                val prefsName = "${context.packageName}.widgetdata"
                val jsonString = context
                    .getSharedPreferences(prefsName, Context.MODE_PRIVATE)
                    .getString("widgetdata", "{}") ?: "{}"
                val data = JSONObject(jsonString)
                val raw = if (data.has("dayStartHour")) data.optInt("dayStartHour", 0) else 0
                max(0, min(12, raw))
            } catch (e: JSONException) {
                0
            }
        }

        fun updateAllWidgets(context: Context) {
            val appContext = context.applicationContext
            val mgr = AppWidgetManager.getInstance(appContext)
            val ids = mgr.getAppWidgetIds(
                ComponentName(appContext, PivotLogWidgetProvider::class.java)
            )
            ids.forEach { updateAppWidget(appContext, mgr, it) }
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        // 注意: super.onReceive を必ず呼ぶ。呼ばないと onUpdate / onEnabled が dispatch されない
        super.onReceive(context, intent)
        when (intent.action) {
            Intent.ACTION_DATE_CHANGED,
            Intent.ACTION_TIMEZONE_CHANGED,
            Intent.ACTION_LOCALE_CHANGED,
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED -> {
                updateAllWidgets(context)
                if (intent.action == Intent.ACTION_TIMEZONE_CHANGED) {
                    // 古いアラームは旧 TZ ベースの絶対時刻なので明示的に cancel して新規登録
                    cancelDisplayUpdateAlarm(context)
                }
                scheduleNextDisplayUpdateAlarm(context)
            }
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
        // 既存ユーザーがアップデート後にアプリを開かず、onEnabled も再発火しないケースを拾うため冪等に登録
        scheduleNextDisplayUpdateAlarm(context)
    }

    override fun onEnabled(context: Context) {
        Log.d(TAG, "Widget enabled")
        scheduleNextDisplayUpdateAlarm(context)
    }

    override fun onDisabled(context: Context) {
        Log.d(TAG, "Widget disabled")
        cancelDisplayUpdateAlarm(context)
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
        if (data.has("birthday") && data.optString("birthday", "").isNotEmpty() && data.has("targetLifespan")) {
            // --- 0:00 跨ぎ自動更新用: 現在時刻ベースで再計算 ---
            val nowMillis = System.currentTimeMillis()
            val dayStartHour = max(0, min(12, data.optInt("dayStartHour", 0)))
            val birthday = data.optString("birthday", "")
            val targetLifespan = data.optInt("targetLifespan", 0)
            val recentDiaryDates = WidgetDateHelpers.jsonArrayToStringList(data, "recentDiaryDates")

            val effectiveTodayDate = WidgetDateHelpers.effectiveToday(nowMillis, dayStartHour)
            val computedTodayDateLabel = WidgetDateHelpers.todayDateLabel(nowMillis, dayStartHour)
            val fallbackHasTodayEntry = data.optBoolean("hasTodayEntry", false)
            val computedHasTodayEntry = WidgetDateHelpers.hasTodayEntry(
                recentDates = recentDiaryDates,
                fallback = fallbackHasTodayEntry,
                effectiveToday = effectiveTodayDate
            )
            val streakAlive = WidgetDateHelpers.isStreakAlive(
                recentDates = recentDiaryDates,
                effectiveToday = effectiveTodayDate
            )
            val fallbackStreakDays = if (data.has("streakDays")) data.getInt("streakDays") else 0
            // A案: 旧 widget data (recentDiaryDates==null) は fallback をそのまま使う
            val computedStreakDays = if (recentDiaryDates == null) {
                fallbackStreakDays
            } else {
                if (streakAlive) fallbackStreakDays else 0
            }
            val computedStreakEmoji = if (computedStreakDays > 0) {
                data.optString("streakEmoji", "📝")
            } else {
                ""
            }

            val fallbackRemainingDays = if (data.has("remainingDays")) data.getInt("remainingDays") else 0
            val fallbackRemainingYears = if (data.has("remainingYears")) data.getDouble("remainingYears") else 0.0
            val fallbackLifeProgress = if (data.has("lifeProgress")) data.getDouble("lifeProgress") else 0.0
            val fallbackTotalWeeks = if (data.has("totalWeeks")) data.getInt("totalWeeks") else 0

            val computedRemainingDays = WidgetDateHelpers.computeRemainingDays(
                birthday, targetLifespan, nowMillis, fallbackRemainingDays
            )
            val computedRemainingYears = WidgetDateHelpers.computeRemainingYears(
                birthday, targetLifespan, nowMillis, fallbackRemainingYears
            )
            val computedLifeProgress = WidgetDateHelpers.computeLifeProgress(
                birthday, targetLifespan, nowMillis, fallbackLifeProgress
            )
            val computedTotalWeeks = WidgetDateHelpers.computeTotalWeeks(
                birthday, targetLifespan, nowMillis, fallbackTotalWeeks
            )

            val remainingYearsInt = computedRemainingYears.toInt()
            val countdownMode = data.optString("countdownMode", "detailed")
            val numberFormat = NumberFormat.getNumberInstance()

            Log.d(TAG, "Data found: remainingYears=$remainingYearsInt, remainingDays=$computedRemainingDays, lifeProgress=$computedLifeProgress, countdownMode=$countdownMode, dayStartHour=$dayStartHour")

            when (countdownMode) {
                "yearsOnly" -> {
                    views.setTextViewText(R.id.remaining_years_number, "$remainingYearsInt")
                    views.setTextColor(R.id.remaining_years_number, primaryColor)
                    views.setTextViewText(R.id.remaining_years_label, "年")
                    views.setTextColor(R.id.remaining_years_label, textPrimaryColor)
                    views.setViewVisibility(R.id.remaining_days_number, android.view.View.GONE)
                    views.setViewVisibility(R.id.remaining_days_label, android.view.View.GONE)
                }
                "weeksOnly" -> {
                    views.setTextViewText(R.id.remaining_years_number, numberFormat.format(computedTotalWeeks.toLong()))
                    views.setTextColor(R.id.remaining_years_number, primaryColor)
                    views.setTextViewText(R.id.remaining_years_label, "週")
                    views.setTextColor(R.id.remaining_years_label, textPrimaryColor)
                    views.setViewVisibility(R.id.remaining_days_number, android.view.View.GONE)
                    views.setViewVisibility(R.id.remaining_days_label, android.view.View.GONE)
                }
                "daysOnly" -> {
                    views.setTextViewText(R.id.remaining_years_number, numberFormat.format(computedRemainingDays.toLong()))
                    views.setTextColor(R.id.remaining_years_number, primaryColor)
                    views.setTextViewText(R.id.remaining_years_label, "日")
                    views.setTextColor(R.id.remaining_years_label, textPrimaryColor)
                    views.setViewVisibility(R.id.remaining_days_number, android.view.View.GONE)
                    views.setViewVisibility(R.id.remaining_days_label, android.view.View.GONE)
                }
                else -> { // "detailed"
                    views.setTextViewText(R.id.remaining_years_number, "$remainingYearsInt")
                    views.setTextColor(R.id.remaining_years_number, primaryColor)
                    views.setTextViewText(R.id.remaining_years_label, "年")
                    views.setTextColor(R.id.remaining_years_label, textPrimaryColor)
                    views.setTextViewText(R.id.remaining_days_number, "${computedRemainingDays % 365}")
                    views.setTextColor(R.id.remaining_days_number, primaryColor)
                    views.setTextColor(R.id.remaining_days_label, textPrimaryColor)
                    views.setViewVisibility(R.id.remaining_days_number, android.view.View.VISIBLE)
                    views.setViewVisibility(R.id.remaining_days_label, android.view.View.VISIBLE)
                }
            }

            // 進捗率を設定
            views.setTextViewText(R.id.life_progress, String.format("%.1f%%", computedLifeProgress))
            views.setTextColor(R.id.life_progress, primaryColor)

            // プログレスバーを設定（max=1000で0.1%単位の精度）
            views.setProgressBar(R.id.progress_bar, 1000, (computedLifeProgress * 10).toInt(), false)

            // プログレスバーの色をテーマに合わせて設定
            // Android 12+（API 31+）ではMaterial Youがシステムtintを適用してカスタムdrawableの色を上書きするため、
            // アプリ独自のcolorScheme設定に基づいて動的にtintを設定する
            val progressBgColor = Color.parseColor(if (isDarkMode) "#4A4A4A" else "#D5D5D5")
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
                views.setColorStateList(
                    R.id.progress_bar,
                    "setProgressBackgroundTintList",
                    android.content.res.ColorStateList.valueOf(progressBgColor)
                )
                views.setColorStateList(
                    R.id.progress_bar,
                    "setProgressTintList",
                    android.content.res.ColorStateList.valueOf(primaryColor)
                )
            }

            // 表示要素フラグの読み取り（デフォルト=true）
            val showDateHeader = !data.has("showDateHeader") || data.getBoolean("showDateHeader")
            val showDiaryStatus = !data.has("showDiaryStatus") || data.getBoolean("showDiaryStatus")
            val showStreak = !data.has("showStreak") || data.getBoolean("showStreak")

            // ヘッダー行の表示条件（日付 OR 連続記録のいずれかが表示される場合）
            val showHeaderRow = (showDateHeader && computedTodayDateLabel.isNotEmpty()) ||
                                (showStreak && computedStreakDays > 0)

            if (showHeaderRow) {
                views.setViewVisibility(R.id.date_header_row, android.view.View.VISIBLE)

                // 日付テキスト
                if (showDateHeader && computedTodayDateLabel.isNotEmpty()) {
                    views.setTextViewText(R.id.date_header_text, computedTodayDateLabel)
                    views.setTextColor(R.id.date_header_text, textSecondaryColor)
                } else {
                    views.setTextViewText(R.id.date_header_text, "")
                }

                // 日記記入状態アイコン（日付ヘッダー表示時のみ）
                if (showDateHeader && computedTodayDateLabel.isNotEmpty() && showDiaryStatus) {
                    if (computedHasTodayEntry) {
                        views.setTextViewText(R.id.diary_status_icon, "✔")
                        views.setTextColor(R.id.diary_status_icon, primaryColor)
                    } else {
                        views.setTextViewText(R.id.diary_status_icon, "○")
                        views.setTextColor(R.id.diary_status_icon, textSecondaryColor)
                    }
                    views.setViewVisibility(R.id.diary_status_icon, android.view.View.VISIBLE)
                } else {
                    views.setViewVisibility(R.id.diary_status_icon, android.view.View.GONE)
                }

                // 連続記録（ヘッダー行内）
                if (showStreak && computedStreakDays > 0) {
                    views.setTextViewText(R.id.streak_emoji, computedStreakEmoji)
                    views.setTextViewText(R.id.streak_text, "${computedStreakDays}日連続")
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
            val deepLinkUri = if (computedHasTodayEntry) {
                Uri.parse("pivotlog://home")
            } else {
                Uri.parse("pivotlog://diary/$effectiveTodayDate")
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
            views.setTextViewText(R.id.remaining_years_label, "年")
            views.setTextColor(R.id.remaining_years_label, textPrimaryColor)
            views.setTextViewText(R.id.remaining_days_number, "--")
            views.setTextColor(R.id.remaining_days_number, primaryColor)
            views.setTextColor(R.id.remaining_days_label, textPrimaryColor)
            views.setViewVisibility(R.id.remaining_days_number, android.view.View.VISIBLE)
            views.setViewVisibility(R.id.remaining_days_label, android.view.View.VISIBLE)
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

/**
 * Widget 側で「今日」「途切れ判定」「残日数/年/進捗率」を再計算するための日付ヘルパー。
 * TS 側の `calculateTimeLeftAt` / `calculateLifeProgressAt` と挙動を一致させる。
 * 端末 TimeZone + 日本語ロケールを明示。
 */
object WidgetDateHelpers {

    private fun jaCalendar(): Calendar = Calendar.getInstance(Locale.JAPAN)

    private val weekdayLabels = arrayOf("日", "月", "火", "水", "木", "金", "土")

    fun effectiveToday(referenceMillis: Long, dayStartHour: Int): String {
        val cal = jaCalendar()
        cal.timeInMillis = referenceMillis
        val hour = cal.get(Calendar.HOUR_OF_DAY)
        if (hour < dayStartHour) {
            cal.add(Calendar.DAY_OF_MONTH, -1)
        }
        val y = cal.get(Calendar.YEAR)
        val m = cal.get(Calendar.MONTH) + 1
        val d = cal.get(Calendar.DAY_OF_MONTH)
        return String.format(Locale.JAPAN, "%04d-%02d-%02d", y, m, d)
    }

    fun todayDateLabel(referenceMillis: Long, dayStartHour: Int): String {
        val todayStr = effectiveToday(referenceMillis, dayStartHour)
        val parts = todayStr.split("-").mapNotNull { it.toIntOrNull() }
        if (parts.size != 3) return ""
        val cal = jaCalendar()
        cal.clear()
        cal.set(parts[0], parts[1] - 1, parts[2], 0, 0, 0)
        val weekday = cal.get(Calendar.DAY_OF_WEEK) // 1 = Sunday
        val idx = max(0, min(6, weekday - 1))
        return "${parts[1]}月${parts[2]}日(${weekdayLabels[idx]})"
    }

    /** 引数より厳密に未来の次のローカル 0:00 */
    fun nextMidnightMillis(referenceMillis: Long): Long {
        val cal = jaCalendar()
        cal.timeInMillis = referenceMillis
        cal.set(Calendar.HOUR_OF_DAY, 0)
        cal.set(Calendar.MINUTE, 0)
        cal.set(Calendar.SECOND, 0)
        cal.set(Calendar.MILLISECOND, 0)
        if (cal.timeInMillis <= referenceMillis) {
            cal.add(Calendar.DAY_OF_MONTH, 1)
        }
        return cal.timeInMillis
    }

    /** 引数より厳密に未来の次の dayStartHour 境界 */
    fun nextDayBoundaryMillis(referenceMillis: Long, dayStartHour: Int): Long {
        val cal = jaCalendar()
        cal.timeInMillis = referenceMillis
        cal.set(Calendar.HOUR_OF_DAY, dayStartHour)
        cal.set(Calendar.MINUTE, 0)
        cal.set(Calendar.SECOND, 0)
        cal.set(Calendar.MILLISECOND, 0)
        if (cal.timeInMillis <= referenceMillis) {
            cal.add(Calendar.DAY_OF_MONTH, 1)
        }
        return cal.timeInMillis
    }

    /** 次の表示更新境界（次の 0:00 と次の dayStartHour 境界の早い方） */
    fun nextDisplayUpdateMillis(referenceMillis: Long, dayStartHour: Int): Long {
        val midnight = nextMidnightMillis(referenceMillis)
        val boundary = nextDayBoundaryMillis(referenceMillis, dayStartHour)
        return min(midnight, boundary)
    }

    fun hasTodayEntry(
        recentDates: List<String>?,
        fallback: Boolean,
        effectiveToday: String
    ): Boolean {
        if (recentDates == null) return fallback
        return recentDates.contains(effectiveToday)
    }

    /** A案の途切れ判定: effectiveToday もしくは effectiveToday-1 が含まれていれば streak alive */
    fun isStreakAlive(recentDates: List<String>?, effectiveToday: String): Boolean {
        if (recentDates == null) return true
        if (recentDates.contains(effectiveToday)) return true
        val parts = effectiveToday.split("-").mapNotNull { it.toIntOrNull() }
        if (parts.size != 3) return false
        val cal = jaCalendar()
        cal.clear()
        cal.set(parts[0], parts[1] - 1, parts[2], 0, 0, 0)
        cal.add(Calendar.DAY_OF_MONTH, -1)
        val yStr = String.format(
            Locale.JAPAN,
            "%04d-%02d-%02d",
            cal.get(Calendar.YEAR),
            cal.get(Calendar.MONTH) + 1,
            cal.get(Calendar.DAY_OF_MONTH)
        )
        return recentDates.contains(yStr)
    }

    /**
     * JS の `new Date(year + targetLifespan, month - 1, day)` 互換の target date。
     * 2/29 + 81年 → 2081/3/1 のような繰り上がりを Calendar の lenient=true (デフォルト) で再現する。
     */
    private fun computeTargetMillis(birthday: String, targetLifespan: Int): Long? {
        val parts = birthday.split("-").mapNotNull { it.toIntOrNull() }
        if (parts.size != 3) return null
        val cal = jaCalendar()
        cal.clear()
        // lenient=true がデフォルト。set(year, month-1, day) は範囲外の月日を自動繰り上げる
        cal.set(parts[0] + targetLifespan, parts[1] - 1, parts[2], 0, 0, 0)
        cal.set(Calendar.MILLISECOND, 0)
        return cal.timeInMillis
    }

    private fun computeBirthdayMillis(birthday: String): Long? {
        val parts = birthday.split("-").mapNotNull { it.toIntOrNull() }
        if (parts.size != 3) return null
        val cal = jaCalendar()
        cal.clear()
        cal.set(parts[0], parts[1] - 1, parts[2], 0, 0, 0)
        cal.set(Calendar.MILLISECOND, 0)
        return cal.timeInMillis
    }

    fun computeRemainingDays(
        birthday: String,
        targetLifespan: Int,
        referenceMillis: Long,
        fallback: Int
    ): Int {
        if (birthday.isEmpty() || targetLifespan <= 0) return fallback
        val target = computeTargetMillis(birthday, targetLifespan) ?: return fallback
        val diffMs = target - referenceMillis
        if (diffMs <= 0) return 0
        val totalDays = diffMs.toDouble() / (1000.0 * 60 * 60 * 24)
        return floor(totalDays).toInt()
    }

    fun computeRemainingYears(
        birthday: String,
        targetLifespan: Int,
        referenceMillis: Long,
        fallback: Double
    ): Double {
        if (birthday.isEmpty() || targetLifespan <= 0) return fallback
        val target = computeTargetMillis(birthday, targetLifespan) ?: return fallback
        val diffMs = target - referenceMillis
        if (diffMs <= 0) return 0.0
        return diffMs.toDouble() / (1000.0 * 60 * 60 * 24 * 365.25)
    }

    fun computeLifeProgress(
        birthday: String,
        targetLifespan: Int,
        referenceMillis: Long,
        fallback: Double
    ): Double {
        if (birthday.isEmpty() || targetLifespan <= 0) return fallback
        val birth = computeBirthdayMillis(birthday) ?: return fallback
        val target = computeTargetMillis(birthday, targetLifespan) ?: return fallback
        val totalLifeMs = target - birth
        if (totalLifeMs <= 0) return fallback
        val livedMs = referenceMillis - birth
        val progress = (livedMs.toDouble() / totalLifeMs.toDouble()) * 100.0
        return min(max(progress, 0.0), 100.0)
    }

    fun computeTotalWeeks(
        birthday: String,
        targetLifespan: Int,
        referenceMillis: Long,
        fallback: Int
    ): Int {
        if (birthday.isEmpty() || targetLifespan <= 0) return fallback
        val target = computeTargetMillis(birthday, targetLifespan) ?: return fallback
        val diffMs = target - referenceMillis
        if (diffMs <= 0) return 0
        val totalWeeks = diffMs.toDouble() / (1000.0 * 60 * 60 * 24 * 7)
        return floor(totalWeeks).toInt()
    }

    fun jsonArrayToStringList(data: JSONObject, key: String): List<String>? {
        if (!data.has(key)) return null
        val arr: JSONArray = data.optJSONArray(key) ?: return null
        val result = ArrayList<String>(arr.length())
        for (i in 0 until arr.length()) {
            val s = arr.optString(i, null)
            if (s != null) result.add(s)
        }
        return result
    }
}
