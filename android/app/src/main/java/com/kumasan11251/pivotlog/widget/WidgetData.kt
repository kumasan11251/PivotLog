package com.kumasan11251.pivotlog.widget

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.*

/**
 * ウィジェットデータを管理するクラス
 */
data class WidgetData(
    val birthday: String,
    val targetLifespan: Int,
    val lifeProgress: Double,
    val remainingYears: Double,
    val remainingDays: Int,
    val currentAge: Double,
    val customText: String,
    val lastUpdated: String
) {
    companion object {
        val PLACEHOLDER = WidgetData(
            birthday = "1990-01-01",
            targetLifespan = 80,
            lifeProgress = 42.5,
            remainingYears = 37.5,
            remainingDays = 13687,
            currentAge = 35.0,
            customText = "",
            lastUpdated = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(Date())
        )

        fun fromJson(json: String): WidgetData {
            return try {
                val obj = JSONObject(json)
                WidgetData(
                    birthday = obj.optString("birthday", PLACEHOLDER.birthday),
                    targetLifespan = obj.optInt("targetLifespan", PLACEHOLDER.targetLifespan),
                    lifeProgress = obj.optDouble("lifeProgress", PLACEHOLDER.lifeProgress),
                    remainingYears = obj.optDouble("remainingYears", PLACEHOLDER.remainingYears),
                    remainingDays = obj.optInt("remainingDays", PLACEHOLDER.remainingDays),
                    currentAge = obj.optDouble("currentAge", PLACEHOLDER.currentAge),
                    customText = obj.optString("customText", PLACEHOLDER.customText),
                    lastUpdated = obj.optString("lastUpdated", PLACEHOLDER.lastUpdated)
                )
            } catch (e: Exception) {
                PLACEHOLDER
            }
        }
    }

    fun toJson(): String {
        val obj = JSONObject()
        obj.put("birthday", birthday)
        obj.put("targetLifespan", targetLifespan)
        obj.put("lifeProgress", lifeProgress)
        obj.put("remainingYears", remainingYears)
        obj.put("remainingDays", remainingDays)
        obj.put("currentAge", currentAge)
        obj.put("customText", customText)
        obj.put("lastUpdated", lastUpdated)
        return obj.toString()
    }

    /**
     * 残り時間のフォーマット済み文字列を取得
     */
    fun getFormattedRemainingTime(): String {
        val years = remainingYears.toInt()
        val months = ((remainingYears - years) * 12).toInt()

        return when {
            years > 0 -> "残り ${years}年 ${months}ヶ月"
            months > 0 -> "残り ${months}ヶ月"
            else -> "残り ${remainingDays}日"
        }
    }

    /**
     * 現在の進捗を再計算（リアルタイム更新用）
     */
    fun calculateCurrentProgress(): Double {
        return try {
            val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)
            val birthdayDate = dateFormat.parse(birthday) ?: return lifeProgress

            val calendar = Calendar.getInstance()
            val now = calendar.time

            calendar.time = birthdayDate
            calendar.add(Calendar.YEAR, targetLifespan)
            val targetDate = calendar.time

            val totalLifespan = targetDate.time - birthdayDate.time
            val lived = now.time - birthdayDate.time

            if (totalLifespan <= 0) {
                100.0
            } else {
                val progress = (lived.toDouble() / totalLifespan.toDouble()) * 100.0
                progress.coerceIn(0.0, 100.0)
            }
        } catch (e: Exception) {
            lifeProgress
        }
    }
}

/**
 * SharedPreferences を使ってウィジェットデータを管理
 */
object WidgetDataManager {
    private const val PREFS_NAME = "widget_data"
    private const val KEY_DATA = "widgetData"

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    /**
     * ウィジェットデータを読み込む
     */
    fun loadData(context: Context): WidgetData {
        val prefs = getPrefs(context)
        val json = prefs.getString(KEY_DATA, null)
        return if (json != null) {
            WidgetData.fromJson(json)
        } else {
            WidgetData.PLACEHOLDER
        }
    }

    /**
     * ウィジェットデータを保存
     */
    fun saveData(context: Context, data: WidgetData): Boolean {
        return try {
            val prefs = getPrefs(context)
            prefs.edit().putString(KEY_DATA, data.toJson()).apply()
            true
        } catch (e: Exception) {
            false
        }
    }

    /**
     * JSONからウィジェットデータを保存
     */
    fun saveDataFromJson(context: Context, json: String): Boolean {
        return try {
            val prefs = getPrefs(context)
            prefs.edit().putString(KEY_DATA, json).apply()
            true
        } catch (e: Exception) {
            false
        }
    }
}
