package com.kumasan11251.pivotlog

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * 独自 alarm action 専用の receiver。exported=false で外部からの起動を防ぐ。
 *
 * - 受信時に widget を更新
 * - 次の表示更新境界に向けて alarm を再登録（自己ループ）
 */
class PivotLogWidgetAlarmReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != PivotLogWidgetProvider.ACTION_DISPLAY_UPDATE_ALARM) return
        Log.d("PivotLogWidget", "Alarm fired: ${intent.action}")
        PivotLogWidgetProvider.updateAllWidgets(context)
        PivotLogWidgetProvider.scheduleNextDisplayUpdateAlarm(context)
    }
}
