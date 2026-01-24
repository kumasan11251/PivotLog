import WidgetKit
import SwiftUI

// iOS 17+のcontainerBackground対応のためのModifier
extension View {
    @ViewBuilder
    func widgetBackground(_ color: Color) -> some View {
        if #available(iOS 17.0, *) {
            self.containerBackground(for: .widget) {
                color
            }
        } else {
            self.background(color)
        }
    }
}

// ウィジェットデータの構造
struct PivotLogWidgetData: Codable {
    var birthday: String
    var targetLifespan: Int
    var lifeProgress: Double
    var remainingYears: Double
    var remainingDays: Int
    var currentAge: Double
    var customText: String
    var showProgress: Bool
    var showRemainingTime: Bool
    var showCustomText: Bool
    var lastUpdated: String
}

// UserDefaultsからデータを取得
func getWidgetData() -> PivotLogWidgetData? {
    let widgetSuite = UserDefaults(suiteName: "group.com.kumasan11251.pivotlog.expowidgets")

    if let jsonData = widgetSuite?.string(forKey: "widgetData"),
       let data = jsonData.data(using: .utf8) {
        do {
            let decoder = JSONDecoder()
            return try decoder.decode(PivotLogWidgetData.self, from: data)
        } catch {
            print("[PivotLog Widget] Error decoding data: \(error.localizedDescription)")
        }
    }
    return nil
}

// タイムラインエントリ
struct PivotLogEntry: TimelineEntry {
    let date: Date
    let widgetData: PivotLogWidgetData?
}

// タイムラインプロバイダー
struct PivotLogProvider: TimelineProvider {
    func placeholder(in context: Context) -> PivotLogEntry {
        PivotLogEntry(date: Date(), widgetData: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (PivotLogEntry) -> Void) {
        let entry = PivotLogEntry(date: Date(), widgetData: getWidgetData())
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PivotLogEntry>) -> Void) {
        let currentDate = Date()
        let entry = PivotLogEntry(date: currentDate, widgetData: getWidgetData())

        // 1分ごとに更新（残り時間のカウントダウン用）
        let nextUpdateDate = Calendar.current.date(byAdding: .minute, value: 1, to: currentDate)!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdateDate))
        completion(timeline)
    }
}

// ウィジェットのビュー
struct PivotLogWidgetEntryView: View {
    var entry: PivotLogProvider.Entry
    @Environment(\.widgetFamily) var widgetFamily

    // プライマリカラー (sage green)
    let primaryColor = Color(red: 139/255, green: 157/255, blue: 131/255)

    var body: some View {
        if let data = entry.widgetData {
            switch widgetFamily {
            case .systemSmall:
                smallWidgetView(data: data)
            case .systemMedium:
                mediumWidgetView(data: data)
            case .systemLarge:
                largeWidgetView(data: data)
            default:
                smallWidgetView(data: data)
            }
        } else {
            placeholderView()
        }
    }

    // 小サイズウィジェット
    @ViewBuilder
    func smallWidgetView(data: PivotLogWidgetData) -> some View {
        VStack(spacing: 4) {
            // 残り時間表示
            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text("\(Int(data.remainingYears))")
                    .font(.system(size: 26, weight: .bold))
                    .foregroundColor(primaryColor)
                    .minimumScaleFactor(0.8)
                Text("年")
                    .font(.system(size: 12))
                    .foregroundColor(.primary)
                Text("\(data.remainingDays % 365)")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(primaryColor)
                    .minimumScaleFactor(0.8)
                Text("日")
                    .font(.system(size: 10))
                    .foregroundColor(.primary)
            }
            .fixedSize(horizontal: true, vertical: false)

            // プログレスバー
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 3)
                        .fill(Color.gray.opacity(0.2))
                        .frame(height: 6)
                    RoundedRectangle(cornerRadius: 3)
                        .fill(primaryColor)
                        .frame(width: geometry.size.width * CGFloat(data.lifeProgress / 100), height: 6)
                }
            }
            .frame(height: 6)

            Text("\(String(format: "%.1f", data.lifeProgress))%")
                .font(.system(size: 10))
                .foregroundColor(.secondary)

            // カスタムテキスト（上下中央・左揃え）
            if !data.customText.isEmpty {
                VStack {
                    Spacer(minLength: 0)
                    Text(data.customText)
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    Spacer(minLength: 0)
                }
                .frame(maxHeight: .infinity)
            } else {
                Spacer()
            }
        }
        .padding()
        .widgetBackground(Color(.systemBackground))
    }

    // 中サイズウィジェット
    @ViewBuilder
    func mediumWidgetView(data: PivotLogWidgetData) -> some View {
        VStack(spacing: 6) {
            // 上部: 残り時間の詳細
            HStack {
                HStack(alignment: .firstTextBaseline, spacing: 3) {
                    Text("\(Int(data.remainingYears))")
                        .font(.system(size: 32, weight: .bold))
                        .foregroundColor(primaryColor)
                    Text("年")
                        .font(.system(size: 14))
                        .foregroundColor(.primary)

                    Text("\(data.remainingDays % 365)")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(primaryColor)
                    Text("日")
                        .font(.system(size: 12))
                        .foregroundColor(.primary)
                }

                Spacer()

                // 進捗率表示
                Text("\(String(format: "%.1f", data.lifeProgress))%")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(primaryColor)
            }

            // プログレスバー
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 3)
                        .fill(Color.gray.opacity(0.2))
                        .frame(height: 6)
                    RoundedRectangle(cornerRadius: 3)
                        .fill(primaryColor)
                        .frame(width: geometry.size.width * CGFloat(data.lifeProgress / 100), height: 6)
                }
            }
            .frame(height: 6)

            // カスタムテキスト（上下中央・左揃え）
            if !data.customText.isEmpty {
                VStack {
                    Spacer(minLength: 0)
                    Text(data.customText)
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                        .lineLimit(3)
                        .multilineTextAlignment(.leading)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    Spacer(minLength: 0)
                }
                .frame(maxHeight: .infinity)
            } else {
                Spacer()
            }
        }
        .padding(12)
        .widgetBackground(Color(.systemBackground))
    }

    // 大サイズウィジェット
    @ViewBuilder
    func largeWidgetView(data: PivotLogWidgetData) -> some View {
        VStack(spacing: 8) {
            // ヘッダー
            HStack {
                Text("PivotLog")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(primaryColor)
                Spacer()
                Text("目標: \(data.targetLifespan)歳")
                    .font(.system(size: 11))
                    .foregroundColor(.secondary)
            }

            // メイン表示: 残り時間
            HStack(spacing: 12) {
                VStack(spacing: 2) {
                    Text("\(Int(data.remainingYears))")
                        .font(.system(size: 40, weight: .bold))
                        .foregroundColor(primaryColor)
                    Text("年")
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                }

                VStack(spacing: 2) {
                    Text("\(data.remainingDays % 365)")
                        .font(.system(size: 40, weight: .bold))
                        .foregroundColor(primaryColor)
                    Text("日")
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                }
            }

            // プログレスバーセクション
            VStack(spacing: 4) {
                HStack {
                    Spacer()
                    Text("\(String(format: "%.1f", data.lifeProgress))%")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(primaryColor)
                }

                // プログレスバー
                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color.gray.opacity(0.2))
                            .frame(height: 8)
                        RoundedRectangle(cornerRadius: 4)
                            .fill(primaryColor)
                            .frame(width: geometry.size.width * CGFloat(data.lifeProgress / 100), height: 8)
                    }
                }
                .frame(height: 8)
            }

            // カスタムテキスト（上下中央・左揃え）
            if !data.customText.isEmpty {
                VStack {
                    Spacer(minLength: 0)
                    Text(data.customText)
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                        .lineLimit(10)
                        .multilineTextAlignment(.leading)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    Spacer(minLength: 0)
                }
                .frame(maxHeight: .infinity)
            } else {
                Spacer()
            }
        }
        .padding(12)
        .widgetBackground(Color(.systemBackground))
    }

    // プレースホルダービュー（データがない場合）
    @ViewBuilder
    func placeholderView() -> some View {
        VStack(spacing: 12) {
            Image(systemName: "clock.fill")
                .font(.system(size: 32))
                .foregroundColor(primaryColor)

            Text("PivotLog")
                .font(.system(size: 16, weight: .bold))

            Text("アプリを開いて\n設定を完了してください")
                .font(.system(size: 12))
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
        .widgetBackground(Color(.systemBackground))
    }
}

// ウィジェット定義
struct PivotLogWidget: Widget {
    let kind: String = "PivotLogWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: PivotLogProvider()) { entry in
            PivotLogWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("PivotLog")
        .description("残りの人生時間を表示します")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

// プレビュー
struct PivotLogWidget_Previews: PreviewProvider {
    static var previews: some View {
        let sampleData = PivotLogWidgetData(
            birthday: "1990-01-01",
            targetLifespan: 80,
            lifeProgress: 42.5,
            remainingYears: 46.0,
            remainingDays: 16800,
            currentAge: 34.0,
            customText: "今日も一日を大切に",
            showProgress: true,
            showRemainingTime: true,
            showCustomText: true,
            lastUpdated: "2024-01-01T00:00:00Z"
        )

        Group {
            PivotLogWidgetEntryView(entry: PivotLogEntry(date: Date(), widgetData: sampleData))
                .previewContext(WidgetPreviewContext(family: .systemSmall))

            PivotLogWidgetEntryView(entry: PivotLogEntry(date: Date(), widgetData: sampleData))
                .previewContext(WidgetPreviewContext(family: .systemMedium))

            PivotLogWidgetEntryView(entry: PivotLogEntry(date: Date(), widgetData: sampleData))
                .previewContext(WidgetPreviewContext(family: .systemLarge))
        }
    }
}
