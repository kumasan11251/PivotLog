import SwiftUI
import WidgetKit

// iOS 17+のcontainerBackground対応のためのModifier
extension View {
    @ViewBuilder
    func widgetBackground(_ backgroundView: some View) -> some View {
        if #available(iOS 17.0, *) {
            self.containerBackground(for: .widget) {
                backgroundView
            }
        } else {
            self.background(backgroundView)
        }
    }
}

// グラデーション背景ビュー
struct WidgetGradientBackground: View {
    var isDarkMode: Bool

    var body: some View {
        if isDarkMode {
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 30 / 255, green: 30 / 255, blue: 30 / 255),
                    Color(red: 31 / 255, green: 36 / 255, blue: 32 / 255),
                    Color(red: 37 / 255, green: 43 / 255, blue: 38 / 255),
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        } else {
            LinearGradient(
                gradient: Gradient(colors: [
                    Color.white,
                    Color(red: 248 / 255, green: 250 / 255, blue: 247 / 255),
                    Color(red: 232 / 255, green: 237 / 255, blue: 230 / 255),
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
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
    var colorScheme: String?
    var themeMode: String?  // "light" | "dark" | "system"
    var lastUpdated: String

    // 拡張フィールド（オプショナルで後方互換性維持）
    var perspectiveEmoji: String?
    var perspectiveMainText: String?
    var perspectiveSubtext: String?
    var dailyMessage: String?
    var messageSource: String?

    var hasTodayEntry: Bool?
    var streakDays: Int?
    var totalDays: Int?
    var streakEmoji: String?

    var todayDateLabel: String?
    var effectiveTodayDate: String?

    var countdownMode: String?
    var totalWeeks: Int?

    var showStreak: Bool?
    var showDiaryStatus: Bool?
    var showDateHeader: Bool?

    var isDarkMode: Bool {
        return colorScheme == "dark"
    }

    // メッセージ表示テキストを取得
    var displayMessageText: String? {
        let source = messageSource ?? "custom"
        switch source {
        case "perspective":
            return perspectiveMainText
        case "daily":
            return dailyMessage
        default:
            // "custom" - カスタムテキストが空なら視点メッセージにフォールバック
            if customText.isEmpty {
                return perspectiveMainText
            }
            return customText
        }
    }

    var displayMessageEmoji: String? {
        let source = messageSource ?? "custom"
        switch source {
        case "perspective":
            return perspectiveEmoji
        case "daily":
            return nil
        default:
            if customText.isEmpty {
                return perspectiveEmoji
            }
            return nil
        }
    }

    var displayMessageSubtext: String? {
        let source = messageSource ?? "custom"
        switch source {
        case "perspective":
            return perspectiveSubtext
        case "daily":
            return nil
        default:
            if customText.isEmpty {
                return perspectiveSubtext
            }
            return nil
        }
    }
}

// UserDefaultsからデータを取得
func getWidgetData() -> PivotLogWidgetData? {
    let widgetSuite = UserDefaults(suiteName: "group.com.kumasan11251.pivotlog.expowidgets")

    if let jsonData = widgetSuite?.string(forKey: "widgetData"),
        let data = jsonData.data(using: .utf8)
    {
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

// MARK: - プログレスバー

struct WidgetProgressBar: View {
    var progress: Double
    var primaryColor: Color
    var height: CGFloat = 6

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: height / 2)
                    .fill(Color.gray.opacity(0.2))
                    .frame(height: height)
                RoundedRectangle(cornerRadius: height / 2)
                    .fill(primaryColor)
                    .frame(
                        width: geometry.size.width * CGFloat(min(progress / 100, 1.0)),
                        height: height
                    )
            }
        }
        .frame(height: height)
    }
}

// MARK: - 日記状態インジケーター

struct DiaryStatusIndicator: View {
    var hasTodayEntry: Bool
    var primaryColor: Color
    var textSecondaryColor: Color

    var body: some View {
        if hasTodayEntry {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 10))
                .foregroundColor(primaryColor)
        } else {
            Image(systemName: "circle.dashed")
                .font(.system(size: 10))
                .foregroundColor(textSecondaryColor.opacity(0.5))
        }
    }
}

// MARK: - ウィジェットのメインビュー

struct PivotLogWidgetEntryView: View {
    var entry: PivotLogProvider.Entry
    @Environment(\.widgetFamily) var widgetFamily
    @Environment(\.colorScheme) var systemColorScheme

    var isDarkMode: Bool {
        guard let data = entry.widgetData else {
            // データがない場合はシステム設定に従う
            return systemColorScheme == .dark
        }

        // themeMode を確認（存在しない場合は後方互換性のため colorScheme を使用）
        let mode = data.themeMode ?? (data.colorScheme == "dark" ? "dark" : "light")

        switch mode {
        case "light":
            return false
        case "dark":
            return true
        default:  // "system" または未定義
            return systemColorScheme == .dark
        }
    }

    var primaryColor: Color {
        isDarkMode
            ? Color(red: 163 / 255, green: 184 / 255, blue: 153 / 255)
            : Color(red: 139 / 255, green: 157 / 255, blue: 131 / 255)
    }

    var textPrimaryColor: Color {
        isDarkMode ? Color(red: 245 / 255, green: 245 / 255, blue: 245 / 255) : Color.primary
    }

    var textSecondaryColor: Color {
        isDarkMode ? Color(red: 160 / 255, green: 160 / 255, blue: 160 / 255) : Color.secondary
    }

    // メッセージカード背景色
    var cardBackgroundColor: Color {
        isDarkMode
            ? Color.white.opacity(0.06)
            : Color.black.opacity(0.03)
    }

    // ディープリンクURL
    func widgetDeepLink(data: PivotLogWidgetData) -> URL {
        if data.hasTodayEntry == true {
            return URL(string: "pivotlog://home")!
        }
        // effectiveTodayDate があればそれを使用（dayStartHour考慮済み）、なければフォールバック
        let todayString: String
        if let effectiveDate = data.effectiveTodayDate, !effectiveDate.isEmpty {
            todayString = effectiveDate
        } else {
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"
            todayString = formatter.string(from: Date())
        }
        return URL(string: "pivotlog://diary/\(todayString)")!
    }

    var body: some View {
        if let data = entry.widgetData {
            Group {
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
            }
            .widgetURL(widgetDeepLink(data: data))
        } else {
            placeholderView()
        }
    }

    // MARK: - カウントダウン表示

    @ViewBuilder
    func countdownDisplay(data: PivotLogWidgetData, primarySize: CGFloat, secondarySize: CGFloat) -> some View {
        let mode = data.countdownMode ?? "detailed"

        switch mode {
        case "daysOnly":
            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text(formatNumber(data.remainingDays))
                    .font(.system(size: primarySize, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundColor(primaryColor)
                Text("日")
                    .font(.system(size: secondarySize * 0.7, weight: .medium))
                    .foregroundColor(textPrimaryColor)
            }

        case "weeksOnly":
            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text(formatNumber(data.totalWeeks ?? Int(Double(data.remainingDays) / 7.0)))
                    .font(.system(size: primarySize, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundColor(primaryColor)
                Text("週")
                    .font(.system(size: secondarySize * 0.7, weight: .medium))
                    .foregroundColor(textPrimaryColor)
            }

        case "yearsOnly":
            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text("\(Int(data.remainingYears))")
                    .font(.system(size: primarySize, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundColor(primaryColor)
                Text("年")
                    .font(.system(size: secondarySize * 0.7, weight: .medium))
                    .foregroundColor(textPrimaryColor)
            }

        default: // "detailed"
            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text("\(Int(data.remainingYears))")
                    .font(.system(size: primarySize, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundColor(primaryColor)
                    .minimumScaleFactor(0.8)
                Text("年")
                    .font(.system(size: secondarySize * 0.7, weight: .medium))
                    .foregroundColor(textPrimaryColor)
                Text("\(data.remainingDays % 365)")
                    .font(.system(size: secondarySize, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundColor(primaryColor)
                    .minimumScaleFactor(0.8)
                Text("日")
                    .font(.system(size: secondarySize * 0.6, weight: .medium))
                    .foregroundColor(textPrimaryColor)
            }
        }
    }

    func formatNumber(_ num: Int) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        return formatter.string(from: NSNumber(value: num)) ?? "\(num)"
    }

    // MARK: - メッセージ表示

    @ViewBuilder
    func messageView(data: PivotLogWidgetData, fontSize: CGFloat = 12) -> some View {
        if let messageText = data.displayMessageText, !messageText.isEmpty {
            VStack(alignment: .leading, spacing: 2) {
                HStack(alignment: .top, spacing: 4) {
                    if let emoji = data.displayMessageEmoji {
                        Text(emoji)
                            .font(.system(size: fontSize))
                    }
                    Text(messageText)
                        .font(.system(size: fontSize, weight: .regular))
                        .foregroundColor(textSecondaryColor)
                        .multilineTextAlignment(.leading)
                }
                if let subtext = data.displayMessageSubtext, !subtext.isEmpty {
                    Text(subtext)
                        .font(.system(size: fontSize - 1, weight: .light))
                        .foregroundColor(textSecondaryColor.opacity(0.8))
                        .lineLimit(1)
                        .padding(.leading, data.displayMessageEmoji != nil ? 20 : 0)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    // MARK: - Small ウィジェット

    @ViewBuilder
    func smallWidgetView(data: PivotLogWidgetData) -> some View {
        VStack(spacing: 4) {
            // 日付ヘッダー + 日記状態（表示時のみスペースを取る）
            if data.showDateHeader != false {
                HStack {
                    Text(data.todayDateLabel ?? "")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(textSecondaryColor)
                    Spacer()
                    if data.showDiaryStatus != false {
                        DiaryStatusIndicator(
                            hasTodayEntry: data.hasTodayEntry ?? false,
                            primaryColor: primaryColor,
                            textSecondaryColor: textSecondaryColor
                        )
                    }
                }
            }

            // カウントダウン表示
            countdownDisplay(data: data, primarySize: 26, secondarySize: 18)
                .fixedSize(horizontal: true, vertical: false)

            // プログレスバー + %
            VStack(spacing: 2) {
                WidgetProgressBar(progress: data.lifeProgress, primaryColor: primaryColor)

                Text("\(String(format: "%.1f", data.lifeProgress))%")
                    .font(.system(size: 10, weight: .medium, design: .rounded))
                    .monospacedDigit()
                    .foregroundColor(textSecondaryColor)
            }

            // ストリーク（表示時のみ）
            if data.showStreak != false, let streak = data.streakDays, streak > 0 {
                HStack(spacing: 3) {
                    Text(data.streakEmoji ?? "📝")
                        .font(.system(size: 11))
                    Text("\(streak)日連続")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(textSecondaryColor)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }

            // 残りのスペースをすべてメッセージに使用（上下中央・左揃え）
            messageView(data: data, fontSize: 11)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        }
        .padding(10)
        .widgetBackground(WidgetGradientBackground(isDarkMode: isDarkMode))
    }

    // MARK: - Medium ウィジェット

    @ViewBuilder
    func mediumWidgetView(data: PivotLogWidgetData) -> some View {
        VStack(spacing: 6) {
            // 上部: 日付 + ストリーク（表示時のみスペースを取る）
            if data.showDateHeader != false || data.showDiaryStatus != false || (data.showStreak != false && (data.streakDays ?? 0) > 0) {
                HStack {
                    if data.showDateHeader != false {
                        Text(data.todayDateLabel ?? "")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(textSecondaryColor)
                    }
                    Spacer()
                    if data.showDiaryStatus != false {
                        DiaryStatusIndicator(
                            hasTodayEntry: data.hasTodayEntry ?? false,
                            primaryColor: primaryColor,
                            textSecondaryColor: textSecondaryColor
                        )
                    }
                    if data.showStreak != false, let streak = data.streakDays, streak > 0 {
                        HStack(spacing: 3) {
                            Text(data.streakEmoji ?? "📝")
                                .font(.system(size: 11))
                            Text("\(streak)日連続")
                                .font(.system(size: 11, weight: .medium))
                                .foregroundColor(textSecondaryColor)
                        }
                    }
                }
            }

            // カウントダウン + 進捗率
            HStack {
                countdownDisplay(data: data, primarySize: 32, secondarySize: 24)

                Spacer()

                Text("\(String(format: "%.1f", data.lifeProgress))%")
                    .font(.system(size: 18, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundColor(primaryColor)
            }

            // プログレスバー
            WidgetProgressBar(progress: data.lifeProgress, primaryColor: primaryColor)

            // 残りのスペースをすべてメッセージに使用（上下中央・左揃え）
            messageView(data: data, fontSize: 12)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        }
        .padding(10)
        .widgetBackground(WidgetGradientBackground(isDarkMode: isDarkMode))
    }

    // MARK: - Large ウィジェット

    @ViewBuilder
    func largeWidgetView(data: PivotLogWidgetData) -> some View {
        VStack(spacing: 8) {
            // ヘッダー
            HStack {
                Text("PivotLog")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(primaryColor)
                Spacer()
                if data.showDateHeader != false {
                    Text(data.todayDateLabel ?? "")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(textSecondaryColor)
                }
                Text("目標: \(data.targetLifespan)歳")
                    .font(.system(size: 11, weight: .regular))
                    .foregroundColor(textSecondaryColor)
            }

            // メイン表示: カウントダウン
            countdownDisplay(data: data, primarySize: 40, secondarySize: 28)

            // プログレスバー + %
            VStack(spacing: 4) {
                HStack {
                    Spacer()
                    Text("\(String(format: "%.1f", data.lifeProgress))%")
                        .font(.system(size: 12, weight: .bold, design: .rounded))
                        .monospacedDigit()
                        .foregroundColor(primaryColor)
                }

                WidgetProgressBar(progress: data.lifeProgress, primaryColor: primaryColor, height: 8)
            }

            // ストリーク + 総記録（表示時のみスペースを取る）
            if data.showStreak != false {
                HStack(spacing: 12) {
                    if let streak = data.streakDays, streak > 0 {
                        HStack(spacing: 3) {
                            Text(data.streakEmoji ?? "📝")
                                .font(.system(size: 12))
                            Text("\(streak)日連続記録中")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(textSecondaryColor)
                        }
                    }
                    if let total = data.totalDays, total > 0 {
                        HStack(spacing: 3) {
                            Text("📝")
                                .font(.system(size: 12))
                            Text("累計\(total)日")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(textSecondaryColor)
                        }
                    }
                    Spacer()
                }
            }

            // メッセージカード（残りのスペースをすべて使用・上下中央・左揃え）
            if let messageText = data.displayMessageText, !messageText.isEmpty {
                VStack(alignment: .leading, spacing: 3) {
                    HStack(alignment: .top, spacing: 4) {
                        if let emoji = data.displayMessageEmoji {
                            Text(emoji)
                                .font(.system(size: 13))
                        }
                        Text(messageText)
                            .font(.system(size: 13, weight: .regular))
                            .foregroundColor(textPrimaryColor)
                            .multilineTextAlignment(.leading)
                    }
                    if let subtext = data.displayMessageSubtext, !subtext.isEmpty {
                        Text(subtext)
                            .font(.system(size: 11, weight: .light))
                            .foregroundColor(textSecondaryColor)
                            .lineLimit(1)
                            .padding(.leading, data.displayMessageEmoji != nil ? 21 : 0)
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
                .padding(10)
                .background(
                    RoundedRectangle(cornerRadius: 10)
                        .fill(cardBackgroundColor)
                )
            }

            // 日記状態（表示時のみ最下部に固定）
            if data.showDiaryStatus != false {
                HStack(spacing: 4) {
                    DiaryStatusIndicator(
                        hasTodayEntry: data.hasTodayEntry ?? false,
                        primaryColor: primaryColor,
                        textSecondaryColor: textSecondaryColor
                    )
                    Text("今日の日記：\(data.hasTodayEntry == true ? "記入済み" : "未記入")")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(textSecondaryColor)
                    Spacer()
                }
            }
        }
        .padding(10)
        .widgetBackground(WidgetGradientBackground(isDarkMode: isDarkMode))
    }

    // MARK: - プレースホルダー

    @ViewBuilder
    func placeholderView() -> some View {
        VStack(spacing: 12) {
            Image(systemName: "clock.fill")
                .font(.system(size: 32))
                .foregroundColor(primaryColor)

            Text("PivotLog")
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(textPrimaryColor)

            Text("アプリを開いて\n設定を完了してください")
                .font(.system(size: 12))
                .foregroundColor(textSecondaryColor)
                .multilineTextAlignment(.center)
        }
        .padding()
        .widgetBackground(WidgetGradientBackground(isDarkMode: isDarkMode))
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
        let sampleDataLight = PivotLogWidgetData(
            birthday: "1990-01-01",
            targetLifespan: 80,
            lifeProgress: 42.5,
            remainingYears: 46.0,
            remainingDays: 16800,
            currentAge: 34.0,
            customText: "",
            showProgress: true,
            showRemainingTime: true,
            showCustomText: true,
            colorScheme: "light",
            lastUpdated: "2024-01-01T00:00:00Z",
            perspectiveEmoji: "🌸",
            perspectiveMainText: "あと46回の桜を見届けられる",
            perspectiveSubtext: "今年の桜は、今年だけのもの",
            dailyMessage: "今日もあなたらしく",
            messageSource: "perspective",
            hasTodayEntry: false,
            streakDays: 15,
            totalDays: 42,
            streakEmoji: "🔥",
            todayDateLabel: "2月4日(火)",
            countdownMode: "detailed",
            totalWeeks: 2400,
            showStreak: true,
            showDiaryStatus: true,
            showDateHeader: true
        )

        let sampleDataDark = PivotLogWidgetData(
            birthday: "1990-01-01",
            targetLifespan: 80,
            lifeProgress: 42.5,
            remainingYears: 46.0,
            remainingDays: 16800,
            currentAge: 34.0,
            customText: "",
            showProgress: true,
            showRemainingTime: true,
            showCustomText: true,
            colorScheme: "dark",
            lastUpdated: "2024-01-01T00:00:00Z",
            perspectiveEmoji: "💎",
            perspectiveMainText: "残り16,800日。今日は1/16,800の価値がある",
            perspectiveSubtext: "今日という日は、もう二度と来ない",
            dailyMessage: "今日もあなたらしく",
            messageSource: "perspective",
            hasTodayEntry: true,
            streakDays: 100,
            totalDays: 150,
            streakEmoji: "💎",
            todayDateLabel: "2月4日(火)",
            countdownMode: "detailed",
            totalWeeks: 2400,
            showStreak: true,
            showDiaryStatus: true,
            showDateHeader: true
        )

        Group {
            // ライトモード
            PivotLogWidgetEntryView(entry: PivotLogEntry(date: Date(), widgetData: sampleDataLight))
                .previewContext(WidgetPreviewContext(family: .systemSmall))
                .previewDisplayName("Small - Light")

            PivotLogWidgetEntryView(entry: PivotLogEntry(date: Date(), widgetData: sampleDataLight))
                .previewContext(WidgetPreviewContext(family: .systemMedium))
                .previewDisplayName("Medium - Light")

            PivotLogWidgetEntryView(entry: PivotLogEntry(date: Date(), widgetData: sampleDataLight))
                .previewContext(WidgetPreviewContext(family: .systemLarge))
                .previewDisplayName("Large - Light")

            // ダークモード
            PivotLogWidgetEntryView(entry: PivotLogEntry(date: Date(), widgetData: sampleDataDark))
                .previewContext(WidgetPreviewContext(family: .systemSmall))
                .previewDisplayName("Small - Dark")

            PivotLogWidgetEntryView(entry: PivotLogEntry(date: Date(), widgetData: sampleDataDark))
                .previewContext(WidgetPreviewContext(family: .systemMedium))
                .previewDisplayName("Medium - Dark")

            PivotLogWidgetEntryView(entry: PivotLogEntry(date: Date(), widgetData: sampleDataDark))
                .previewContext(WidgetPreviewContext(family: .systemLarge))
                .previewDisplayName("Large - Dark")
        }
    }
}
