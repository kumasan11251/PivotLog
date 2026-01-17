//
//  ProgressWidget.swift
//  PivotLogWidget
//
//  人生の進捗を表示するウィジェット
//

import SwiftUI
import WidgetKit

// MARK: - Timeline Entry

struct ProgressEntry: TimelineEntry {
  let date: Date
  let widgetData: WidgetData

  // 現在時刻を基に進捗を再計算
  var calculatedProgress: Double {
    return calculateCurrentProgress()
  }

  var formattedRemainingTime: String {
    let years = Int(widgetData.remainingYears)
    let months = Int((widgetData.remainingYears - Double(years)) * 12)

    if years > 0 {
      return "残り \(years)年 \(months)ヶ月"
    } else if months > 0 {
      return "残り \(months)ヶ月"
    } else {
      return "残り \(widgetData.remainingDays)日"
    }
  }

  private func calculateCurrentProgress() -> Double {
    // 誕生日をパース
    let dateFormatter = DateFormatter()
    dateFormatter.dateFormat = "yyyy-MM-dd"

    guard let birthday = dateFormatter.date(from: widgetData.birthday) else {
      return widgetData.lifeProgress
    }

    let now = Date()
    let targetDate =
      Calendar.current.date(
        byAdding: .year,
        value: widgetData.targetLifespan,
        to: birthday
      ) ?? now

    let totalLifespan = targetDate.timeIntervalSince(birthday)
    let lived = now.timeIntervalSince(birthday)

    if totalLifespan <= 0 {
      return 100.0
    }

    let progress = (lived / totalLifespan) * 100.0
    return min(max(progress, 0), 100)
  }
}

// MARK: - Timeline Provider

struct ProgressProvider: TimelineProvider {
  func placeholder(in context: Context) -> ProgressEntry {
    ProgressEntry(date: Date(), widgetData: WidgetData.placeholder)
  }

  func getSnapshot(in context: Context, completion: @escaping (ProgressEntry) -> Void) {
    let data = WidgetDataManager.shared.loadData()
    let entry = ProgressEntry(date: Date(), widgetData: data)
    completion(entry)
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<ProgressEntry>) -> Void) {
    let data = WidgetDataManager.shared.loadData()
    let currentDate = Date()

    // 15分ごとに更新
    var entries: [ProgressEntry] = []
    for hourOffset in 0..<24 {
      let entryDate =
        Calendar.current.date(
          byAdding: .minute,
          value: hourOffset * 15,
          to: currentDate
        ) ?? currentDate
      let entry = ProgressEntry(date: entryDate, widgetData: data)
      entries.append(entry)
    }

    // 次の更新は15分後
    let nextUpdate =
      Calendar.current.date(
        byAdding: .minute,
        value: 15,
        to: currentDate
      ) ?? currentDate

    let timeline = Timeline(entries: entries, policy: .after(nextUpdate))
    completion(timeline)
  }
}

// MARK: - Widget Views

struct ProgressWidgetSmallView: View {
  let entry: ProgressEntry

  // セージグリーン
  private let primaryColor = Color(red: 139 / 255, green: 157 / 255, blue: 131 / 255)

  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      // 進捗率
      Text(String(format: "%.1f%%", entry.calculatedProgress))
        .font(.system(size: 26, weight: .bold, design: .rounded))
        .foregroundColor(primaryColor)

      // 残り時間
      Text(entry.formattedRemainingTime)
        .font(.system(size: 11))
        .foregroundColor(Color.primary.opacity(0.6))

      // プログレスバー
      GeometryReader { geometry in
        ZStack(alignment: .leading) {
          Rectangle()
            .fill(primaryColor.opacity(0.2))
            .frame(height: 4)
            .cornerRadius(2)

          Rectangle()
            .fill(primaryColor)
            .frame(width: geometry.size.width * CGFloat(entry.calculatedProgress / 100), height: 4)
            .cornerRadius(2)
        }
      }
      .frame(height: 4)

      // カスタムテキスト（上下中央配置、最大行数）
      if !entry.widgetData.customText.isEmpty {
        Spacer(minLength: 4)
        VStack {
          Spacer(minLength: 0)
          Text(entry.widgetData.customText)
            .font(.system(size: 14))
            .foregroundColor(Color.primary.opacity(0.6))
            .lineLimit(3)
            .minimumScaleFactor(0.8)
            .multilineTextAlignment(.leading)
            .frame(maxWidth: .infinity, alignment: .leading)
          Spacer(minLength: 0)
        }
      } else {
        Spacer()
      }
    }
    .padding(8)
  }
}

struct ProgressWidgetMediumView: View {
  let entry: ProgressEntry

  // セージグリーン
  private let primaryColor = Color(red: 139 / 255, green: 157 / 255, blue: 131 / 255)

  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      // 上部: 進捗率と残り時間
      HStack(alignment: .firstTextBaseline) {
        Text(String(format: "%.1f%%", entry.calculatedProgress))
          .font(.system(size: 28, weight: .bold, design: .rounded))
          .foregroundColor(primaryColor)

        Spacer()

        Text(entry.formattedRemainingTime)
          .font(.caption)
          .foregroundColor(Color.primary.opacity(0.6))
      }

      // プログレスバー
      GeometryReader { geometry in
        ZStack(alignment: .leading) {
          Rectangle()
            .fill(primaryColor.opacity(0.2))
            .frame(height: 5)
            .cornerRadius(2.5)

          Rectangle()
            .fill(primaryColor)
            .frame(
              width: geometry.size.width * CGFloat(entry.calculatedProgress / 100), height: 5
            )
            .cornerRadius(2.5)
        }
      }
      .frame(height: 5)

      // カスタムテキスト（上下中央配置、最大行数）
      if !entry.widgetData.customText.isEmpty {
        Spacer(minLength: 4)
        VStack {
          Spacer(minLength: 0)
          Text(entry.widgetData.customText)
            .font(.system(size: 14))
            .foregroundColor(Color.primary.opacity(0.6))
            .lineLimit(4)
            .minimumScaleFactor(0.8)
            .multilineTextAlignment(.leading)
            .frame(maxWidth: .infinity, alignment: .leading)
          Spacer(minLength: 0)
        }
      } else {
        Spacer()
      }
    }
    .padding(10)
  }
}

struct ProgressWidgetLargeView: View {
  let entry: ProgressEntry

  // セージグリーン
  private let primaryColor = Color(red: 139 / 255, green: 157 / 255, blue: 131 / 255)

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      // 進捗率
      HStack(alignment: .firstTextBaseline) {
        Text(String(format: "%.1f", entry.calculatedProgress))
          .font(.system(size: 40, weight: .bold, design: .rounded))
          .foregroundColor(primaryColor)
        Text("%")
          .font(.system(size: 20, weight: .medium, design: .rounded))
          .foregroundColor(primaryColor.opacity(0.7))

        Spacer()

        Text(entry.formattedRemainingTime)
          .font(.subheadline)
          .foregroundColor(Color.primary.opacity(0.6))
      }

      // プログレスバー
      GeometryReader { geometry in
        ZStack(alignment: .leading) {
          Rectangle()
            .fill(primaryColor.opacity(0.2))
            .frame(height: 8)
            .cornerRadius(4)

          Rectangle()
            .fill(primaryColor)
            .frame(width: geometry.size.width * CGFloat(entry.calculatedProgress / 100), height: 8)
            .cornerRadius(4)
        }
      }
      .frame(height: 8)

      // カスタムテキスト（上下中央配置、最大行数）
      if !entry.widgetData.customText.isEmpty {
        Divider()
          .padding(.vertical, 2)
        VStack {
          Spacer(minLength: 0)
          Text(entry.widgetData.customText)
            .font(.system(size: 14))
            .foregroundColor(Color.primary.opacity(0.6))
            .lineLimit(12)
            .minimumScaleFactor(0.8)
            .multilineTextAlignment(.leading)
            .frame(maxWidth: .infinity, alignment: .leading)
          Spacer(minLength: 0)
        }
      }

      Spacer()
    }
    .padding(12)
  }
}

// MARK: - Widget Configuration

struct ProgressWidget: Widget {
  let kind: String = "ProgressWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: ProgressProvider()) { entry in
      if #available(iOS 17.0, *) {
        ProgressWidgetEntryView(entry: entry)
          .containerBackground(.fill.tertiary, for: .widget)
      } else {
        ProgressWidgetEntryView(entry: entry)
          .padding()
          .background()
      }
    }
    .configurationDisplayName("人生の進捗")
    .description("目標寿命までの進捗率を表示します")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
  }
}

struct ProgressWidgetEntryView: View {
  @Environment(\.widgetFamily) var family
  let entry: ProgressEntry

  var body: some View {
    switch family {
    case .systemSmall:
      ProgressWidgetSmallView(entry: entry)
    case .systemMedium:
      ProgressWidgetMediumView(entry: entry)
    case .systemLarge:
      ProgressWidgetLargeView(entry: entry)
    default:
      ProgressWidgetSmallView(entry: entry)
    }
  }
}

// MARK: - Previews

#Preview(as: .systemSmall) {
  ProgressWidget()
} timeline: {
  ProgressEntry(date: .now, widgetData: WidgetData.placeholder)
}

#Preview(as: .systemMedium) {
  ProgressWidget()
} timeline: {
  ProgressEntry(date: .now, widgetData: WidgetData.placeholder)
}

#Preview(as: .systemLarge) {
  ProgressWidget()
} timeline: {
  ProgressEntry(
    date: .now,
    widgetData: WidgetData(
      birthday: "1990-01-01",
      targetLifespan: 80,
      lifeProgress: 42.5,
      remainingYears: 37.5,
      remainingDays: 13687,
      currentAge: 35.0,
      customText: "今日も1日を大切に過ごしましょう",
      showProgress: true,
      showRemainingTime: true,
      showCustomText: true,
      lastUpdated: ISO8601DateFormatter().string(from: Date())
    ))
}
