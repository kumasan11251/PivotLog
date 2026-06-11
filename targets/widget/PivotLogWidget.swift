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

// ホーム画面ウィジェット用: contentMarginsDisabled() で消えたシステム既定の余白を、
// iOS 17+ の widgetContentMargins（「本来適用されるはずだった余白」）から読み戻し、
// ホーム画面ファミリーにだけ再適用する。ロック画面(accessoryRectangular)は
// 余白なしのままにしたいので、ここを通さない。
@available(iOS 17.0, *)
private struct HomeWidgetContentMargins<Content: View>: View {
    @Environment(\.widgetContentMargins) private var margins
    let content: Content

    var body: some View {
        content.padding(margins)
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
struct WidgetDiaryTomorrow: Codable {
    var date: String
    var text: String
}

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
    var recentDiaryTomorrows: [WidgetDiaryTomorrow]?

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

    // 0:00 跨ぎ自動更新用: widget 側で「今日」「途切れ判定」を再計算するための入力
    var recentDiaryDates: [String]?
    var dayStartHour: Int?

    var isDarkMode: Bool {
        return colorScheme == "dark"
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

struct ResolvedWidgetMessage {
    let text: String
    let emoji: String?
    let subtext: String?
}

// MARK: - 日付・残時間ヘルパー (0:00跨ぎ自動更新用)
//
// すべて日本語ロケール (ja_JP) + 端末 TimeZone を明示。
// `Calendar(identifier: .gregorian)` のデフォルトは GMT になるため、
// 海外在住者の日付境界が UTC ベースになるバグを防ぐ目的で TimeZone.current を毎回設定する。
enum WidgetDateHelpers {
    private static var jaCalendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.locale = Locale(identifier: "ja_JP")
        calendar.timeZone = TimeZone.current
        return calendar
    }

    private static let weekdayLabels = ["日", "月", "火", "水", "木", "金", "土"]

    /// dayStartHour を考慮した「今日」の YYYY-MM-DD 文字列
    static func effectiveToday(referenceDate: Date, dayStartHour: Int) -> String {
        let calendar = jaCalendar
        var date = referenceDate
        let hour = calendar.component(.hour, from: date)
        if hour < dayStartHour {
            date = calendar.date(byAdding: .day, value: -1, to: date) ?? date
        }
        let components = calendar.dateComponents([.year, .month, .day], from: date)
        let y = components.year ?? 1970
        let m = components.month ?? 1
        let d = components.day ?? 1
        return String(format: "%04d-%02d-%02d", y, m, d)
    }

    /// "5月23日(土)" 形式。dayStartHour=9 の 00:01〜08:59 は前日ラベルを維持するため
    /// referenceDate ではなく effectiveToday を format する。
    static func todayDateLabel(referenceDate: Date, dayStartHour: Int) -> String {
        let calendar = jaCalendar
        let todayStr = effectiveToday(referenceDate: referenceDate, dayStartHour: dayStartHour)
        let parts = todayStr.split(separator: "-").map { Int($0) ?? 0 }
        guard parts.count == 3 else { return "" }
        var comps = DateComponents()
        comps.year = parts[0]
        comps.month = parts[1]
        comps.day = parts[2]
        guard let date = calendar.date(from: comps) else { return "" }
        let weekday = calendar.component(.weekday, from: date) // 1 = Sunday
        let weekdayIndex = max(0, min(6, weekday - 1))
        return "\(parts[1])月\(parts[2])日(\(weekdayLabels[weekdayIndex]))"
    }

    /// 引数より厳密に未来の「次のローカル0:00」
    static func nextMidnight(after date: Date) -> Date {
        let calendar = jaCalendar
        var components = calendar.dateComponents([.year, .month, .day], from: date)
        components.hour = 0
        components.minute = 0
        components.second = 0
        guard let startOfDay = calendar.date(from: components) else {
            return date.addingTimeInterval(86400)
        }
        if startOfDay > date {
            return startOfDay
        }
        return calendar.date(byAdding: .day, value: 1, to: startOfDay) ?? date.addingTimeInterval(86400)
    }

    /// 引数より厳密に未来の「次の dayStartHour 境界」
    static func nextDayBoundary(after date: Date, dayStartHour: Int) -> Date {
        let calendar = jaCalendar
        var components = calendar.dateComponents([.year, .month, .day], from: date)
        components.hour = dayStartHour
        components.minute = 0
        components.second = 0
        guard let boundary = calendar.date(from: components) else {
            return date.addingTimeInterval(86400)
        }
        if boundary > date {
            return boundary
        }
        return calendar.date(byAdding: .day, value: 1, to: boundary) ?? date.addingTimeInterval(86400)
    }

    /// `.atEnd` 用の終端（2回先の dayStartHour 境界 + 1分）
    static func nextTimelineEnd(after date: Date, dayStartHour: Int) -> Date {
        let calendar = jaCalendar
        let first = nextDayBoundary(after: date, dayStartHour: dayStartHour)
        let second = nextDayBoundary(after: first, dayStartHour: dayStartHour)
        return calendar.date(byAdding: .minute, value: 1, to: second) ?? second.addingTimeInterval(60)
    }

    static func hasTodayEntry(recentDates: [String]?, fallback: Bool, effectiveToday: String) -> Bool {
        guard let dates = recentDates else { return fallback }
        return Set(dates).contains(effectiveToday)
    }

    /// A案の途切れ判定: effectiveToday もしくは effectiveToday-1 が含まれていれば streak alive
    static func isStreakAlive(recentDates: [String]?, effectiveToday: String) -> Bool {
        guard let dates = recentDates else { return true }
        let set = Set(dates)
        if set.contains(effectiveToday) { return true }
        let parts = effectiveToday.split(separator: "-").map { Int($0) ?? 0 }
        guard parts.count == 3 else { return false }
        var comps = DateComponents()
        comps.year = parts[0]
        comps.month = parts[1]
        comps.day = parts[2]
        let calendar = jaCalendar
        guard let today = calendar.date(from: comps),
              let yesterday = calendar.date(byAdding: .day, value: -1, to: today) else {
            return false
        }
        let yc = calendar.dateComponents([.year, .month, .day], from: yesterday)
        let yStr = String(format: "%04d-%02d-%02d", yc.year ?? 0, yc.month ?? 0, yc.day ?? 0)
        return set.contains(yStr)
    }

    static func previousDateString(from dateString: String) -> String? {
        let parts = dateString.split(separator: "-").map { Int($0) ?? 0 }
        guard parts.count == 3 else { return nil }
        var comps = DateComponents()
        comps.year = parts[0]
        comps.month = parts[1]
        comps.day = parts[2]
        let calendar = jaCalendar
        guard let date = calendar.date(from: comps),
              let previousDate = calendar.date(byAdding: .day, value: -1, to: date) else {
            return nil
        }
        let previousComponents = calendar.dateComponents([.year, .month, .day], from: previousDate)
        return String(
            format: "%04d-%02d-%02d",
            previousComponents.year ?? 0,
            previousComponents.month ?? 0,
            previousComponents.day ?? 0
        )
    }

    /// JS の `new Date(year + targetLifespan, month - 1, day)` 互換の target date 生成。
    /// 2/29 + 81年 → 2081/3/1 のような繰り上がりを再現する。
    private static func computeTargetDate(birthday: String, targetLifespan: Int) -> Date? {
        let parts = birthday.split(separator: "-").map { Int($0) ?? 0 }
        guard parts.count == 3 else { return nil }
        let year = parts[0] + targetLifespan
        let month = parts[1]
        let day = parts[2]
        let calendar = jaCalendar
        // JS Date は month/day が範囲外なら自動繰り上げするので、lenient=true (デフォルト) のまま date(from:) を使う
        var comps = DateComponents()
        comps.year = year
        comps.month = month
        comps.day = day
        comps.hour = 0
        comps.minute = 0
        comps.second = 0
        return calendar.date(from: comps)
    }

    private static func computeBirthdayDate(birthday: String) -> Date? {
        let parts = birthday.split(separator: "-").map { Int($0) ?? 0 }
        guard parts.count == 3 else { return nil }
        let calendar = jaCalendar
        var comps = DateComponents()
        comps.year = parts[0]
        comps.month = parts[1]
        comps.day = parts[2]
        comps.hour = 0
        comps.minute = 0
        comps.second = 0
        return calendar.date(from: comps)
    }

    /// TS の `calculateTimeLeftAt(...).totalDays` を移植し floor したもの
    static func computeRemainingDays(birthday: String, targetLifespan: Int, referenceDate: Date, fallback: Int) -> Int {
        guard !birthday.isEmpty, targetLifespan > 0,
              let targetDate = computeTargetDate(birthday: birthday, targetLifespan: targetLifespan)
        else { return fallback }
        let diffMs = targetDate.timeIntervalSince(referenceDate)
        if diffMs <= 0 { return 0 }
        let totalDays = diffMs / (60 * 60 * 24)
        return Int(floor(totalDays))
    }

    /// TS の `calculateTimeLeftAt(...).totalYears` (小数年) を移植
    static func computeRemainingYears(birthday: String, targetLifespan: Int, referenceDate: Date, fallback: Double) -> Double {
        guard !birthday.isEmpty, targetLifespan > 0,
              let targetDate = computeTargetDate(birthday: birthday, targetLifespan: targetLifespan)
        else { return fallback }
        let diffMs = targetDate.timeIntervalSince(referenceDate)
        if diffMs <= 0 { return 0 }
        return diffMs / (60 * 60 * 24 * 365.25)
    }

    /// TS の `calculateLifeProgressAt(...)` を移植 (0〜100 にクランプ)
    static func computeLifeProgress(birthday: String, targetLifespan: Int, referenceDate: Date, fallback: Double) -> Double {
        guard !birthday.isEmpty, targetLifespan > 0,
              let birthdayDate = computeBirthdayDate(birthday: birthday),
              let targetDate = computeTargetDate(birthday: birthday, targetLifespan: targetLifespan)
        else { return fallback }
        let totalLifeMs = targetDate.timeIntervalSince(birthdayDate)
        guard totalLifeMs > 0 else { return fallback }
        let livedMs = referenceDate.timeIntervalSince(birthdayDate)
        let progress = (livedMs / totalLifeMs) * 100.0
        return min(max(progress, 0), 100)
    }

    /// TS の `calculateTimeLeftAt(...).totalWeeks` を移植し floor したもの
    static func computeTotalWeeks(birthday: String, targetLifespan: Int, referenceDate: Date, fallback: Int) -> Int {
        guard !birthday.isEmpty, targetLifespan > 0,
              let targetDate = computeTargetDate(birthday: birthday, targetLifespan: targetLifespan)
        else { return fallback }
        let diffMs = targetDate.timeIntervalSince(referenceDate)
        if diffMs <= 0 { return 0 }
        let totalWeeks = diffMs / (60 * 60 * 24 * 7)
        return Int(floor(totalWeeks))
    }
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
        let now = Date()
        let data = getWidgetData()
        let dayStartHour = max(0, min(12, data?.dayStartHour ?? 0))

        // Timeline 終端は「2回先の dayStartHour 境界 + 1分」
        let endDate = WidgetDateHelpers.nextTimelineEnd(after: now, dayStartHour: dayStartHour)

        // ローカル ja_JP + 端末 TZ で 0:00 / dayStartHour 境界 / 朝6:00 を列挙する
        var calendar = Calendar(identifier: .gregorian)
        calendar.locale = Locale(identifier: "ja_JP")
        calendar.timeZone = TimeZone.current

        var dates: [Date] = [now, endDate]

        // 終端までの 0:00 をすべて追加（残日数 / lifeProgress 更新用）
        var midnight = WidgetDateHelpers.nextMidnight(after: now)
        while midnight <= endDate {
            dates.append(midnight)
            midnight = WidgetDateHelpers.nextMidnight(after: midnight)
        }

        // 終端までの dayStartHour 境界をすべて追加（hasTodayEntry / todayDateLabel 更新用）
        var boundary = WidgetDateHelpers.nextDayBoundary(after: now, dayStartHour: dayStartHour)
        while boundary <= endDate {
            dates.append(boundary)

            // dayStartHour < 6 のとき、同じ日の朝6:00 にもエントリを追加（早朝の表示更新の保険）
            let boundaryHour = calendar.component(.hour, from: boundary)
            if boundaryHour < 6,
               let sixAM = calendar.date(bySettingHour: 6, minute: 0, second: 0, of: boundary),
               sixAM <= endDate {
                dates.append(sixAM)
            }

            boundary = WidgetDateHelpers.nextDayBoundary(after: boundary, dayStartHour: dayStartHour)
        }

        // 重複削除（秒丸め）+ 現在以前を除外 + 昇順ソート
        var seen = Set<Int>()
        let uniqueSorted = dates
            .filter { $0 >= now }
            .filter { date in
                let key = Int(date.timeIntervalSince1970)
                if seen.contains(key) { return false }
                seen.insert(key)
                return true
            }
            .sorted()

        let entries = uniqueSorted.map { PivotLogEntry(date: $0, widgetData: data) }
        let timeline = Timeline(entries: entries, policy: .atEnd)
        completion(timeline)
    }
}

// MARK: - プログレスバー

struct WidgetProgressBar: View {
    var progress: Double
    var primaryColor: Color
    var trackColor: Color = Color.gray.opacity(0.2)
    var height: CGFloat = 6

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: height / 2)
                    .fill(trackColor)
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
        isDarkMode
            ? Color(red: 245 / 255, green: 245 / 255, blue: 245 / 255)  // #F5F5F5（darkColors.text.primary）
            : Color(red: 44 / 255, green: 44 / 255, blue: 44 / 255)     // #2C2C2C（lightColors.text.primary）
    }

    var textSecondaryColor: Color {
        isDarkMode
            ? Color(red: 184 / 255, green: 184 / 255, blue: 184 / 255)  // #B8B8B8（darkColors.text.secondary、WCAG AAA準拠）
            : Color(red: 119 / 255, green: 119 / 255, blue: 119 / 255)  // #777777（lightColors.text.secondary、WCAG AAA準拠）
    }

    // 日付・連続記録・メッセージ用の強調テキスト色（視認性改善）
    var textEmphasisColor: Color {
        isDarkMode
            ? Color.white                                            // #FFFFFF
            : Color(red: 51 / 255, green: 51 / 255, blue: 51 / 255)  // #333333
    }

    // MARK: - 0:00 跨ぎ自動更新用の computed values
    // すべて `entry.date` ベースで再計算する。widget data 更新を待たずに日付境界で表示が切り替わる。

    var dayStartHour: Int {
        max(0, min(12, entry.widgetData?.dayStartHour ?? 0))
    }

    var effectiveTodayDate: String {
        WidgetDateHelpers.effectiveToday(referenceDate: entry.date, dayStartHour: dayStartHour)
    }

    var computedTodayDateLabel: String {
        WidgetDateHelpers.todayDateLabel(referenceDate: entry.date, dayStartHour: dayStartHour)
    }

    var computedHasTodayEntry: Bool {
        WidgetDateHelpers.hasTodayEntry(
            recentDates: entry.widgetData?.recentDiaryDates,
            fallback: entry.widgetData?.hasTodayEntry ?? false,
            effectiveToday: effectiveTodayDate
        )
    }

    var streakAlive: Bool {
        WidgetDateHelpers.isStreakAlive(
            recentDates: entry.widgetData?.recentDiaryDates,
            effectiveToday: effectiveTodayDate
        )
    }

    /// A案: 途切れていれば 0、生きていれば事前計算値をそのまま使う（100日💎・365日🏆 維持のため）。
    /// 旧 widget data（recentDiaryDates なし）は fallback としてそのまま使う。
    var computedStreakDays: Int {
        guard let data = entry.widgetData else { return 0 }
        if data.recentDiaryDates == nil {
            return data.streakDays ?? 0
        }
        return streakAlive ? (data.streakDays ?? 0) : 0
    }

    var computedStreakEmoji: String {
        guard computedStreakDays > 0 else { return "" }
        return entry.widgetData?.streakEmoji ?? "📝"
    }

    var computedRemainingDays: Int {
        guard let data = entry.widgetData else { return 0 }
        return WidgetDateHelpers.computeRemainingDays(
            birthday: data.birthday,
            targetLifespan: data.targetLifespan,
            referenceDate: entry.date,
            fallback: data.remainingDays
        )
    }

    var computedRemainingYears: Double {
        guard let data = entry.widgetData else { return 0 }
        return WidgetDateHelpers.computeRemainingYears(
            birthday: data.birthday,
            targetLifespan: data.targetLifespan,
            referenceDate: entry.date,
            fallback: data.remainingYears
        )
    }

    var computedLifeProgress: Double {
        guard let data = entry.widgetData else { return 0 }
        return WidgetDateHelpers.computeLifeProgress(
            birthday: data.birthday,
            targetLifespan: data.targetLifespan,
            referenceDate: entry.date,
            fallback: data.lifeProgress
        )
    }

    var computedTotalWeeks: Int {
        guard let data = entry.widgetData else { return 0 }
        return WidgetDateHelpers.computeTotalWeeks(
            birthday: data.birthday,
            targetLifespan: data.targetLifespan,
            referenceDate: entry.date,
            fallback: data.totalWeeks ?? 0
        )
    }

    // ディープリンクURL
    func widgetDeepLink(data: PivotLogWidgetData) -> URL {
        if computedHasTodayEntry {
            return URL(string: "pivotlog://home")!
        }
        // 0:00 跨ぎ後も entry.date ベースで「今日」を組み立てる
        return URL(string: "pivotlog://diary/\(effectiveTodayDate)")!
    }

    var body: some View {
        Group {
            if let data = entry.widgetData {
                if widgetFamily == .accessoryRectangular {
                    lockScreenRectangularWidgetView(data: data)
                        .widgetURL(widgetDeepLink(data: data))
                } else {
                    homeWidgetWithDefaultMargins {
                        homeWidgetContent(data: data)
                    }
                    .widgetURL(widgetDeepLink(data: data))
                    // ウィジェット内のシステムカラー（Color.primary 等）が端末colorSchemeに追従するのを抑止し、
                    // アプリ内テーマ設定に強制同期する
                    .environment(\.colorScheme, isDarkMode ? .dark : .light)
                }
            } else {
                if widgetFamily == .accessoryRectangular {
                    lockScreenPlaceholderView()
                        .widgetURL(URL(string: "pivotlog://home")!)
                } else {
                    homeWidgetWithDefaultMargins {
                        placeholderView()
                    }
                    .widgetURL(URL(string: "pivotlog://home")!)
                    // ウィジェット内のシステムカラー（Color.primary 等）が端末colorSchemeに追従するのを抑止し、
                    // アプリ内テーマ設定に強制同期する
                    .environment(\.colorScheme, isDarkMode ? .dark : .light)
                }
            }
        }
    }

    // ホーム画面ファミリーにだけ、システム既定の余白を再適用するためのラッパー。
    // iOS 16 では contentMarginsDisabled() が実質 no-op で既定余白が残るため、
    // iOS 17+ のときだけ widgetContentMargins を読み戻して padding を補う。
    @ViewBuilder
    func homeWidgetWithDefaultMargins<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        if #available(iOS 17.0, *) {
            HomeWidgetContentMargins(content: content())
        } else {
            content()
        }
    }

    @ViewBuilder
    func homeWidgetContent(data: PivotLogWidgetData) -> some View {
        switch widgetFamily {
        case .systemSmall:
            smallWidgetView(data: data)
        case .systemMedium:
            mediumWidgetView(data: data)
        case .systemLarge:
            // 大ウィジェットは中ウィジェットと同じデザイン（メッセージエリアが縦に広がる）
            mediumWidgetView(data: data)
        default:
            smallWidgetView(data: data)
        }
    }

    // MARK: - カウントダウン表示

    @ViewBuilder
    func countdownDisplay(data: PivotLogWidgetData, primarySize: CGFloat, secondarySize: CGFloat) -> some View {
        let mode = data.countdownMode ?? "detailed"
        let remainingDays = computedRemainingDays
        let remainingYears = computedRemainingYears
        let totalWeeks = computedTotalWeeks

        switch mode {
        case "daysOnly":
            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text(formatNumber(remainingDays))
                    .font(.system(size: primarySize, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundColor(primaryColor)
                Text("日")
                    .font(.system(size: secondarySize * 0.7, weight: .medium))
                    .foregroundColor(textPrimaryColor)
            }

        case "weeksOnly":
            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text(formatNumber(totalWeeks))
                    .font(.system(size: primarySize, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundColor(primaryColor)
                Text("週")
                    .font(.system(size: secondarySize * 0.7, weight: .medium))
                    .foregroundColor(textPrimaryColor)
            }

        case "yearsOnly":
            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text("\(Int(remainingYears))")
                    .font(.system(size: primarySize, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundColor(primaryColor)
                Text("年")
                    .font(.system(size: secondarySize * 0.7, weight: .medium))
                    .foregroundColor(textPrimaryColor)
            }

        default: // "detailed"
            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text("\(Int(remainingYears))")
                    .font(.system(size: primarySize, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundColor(primaryColor)
                    .minimumScaleFactor(0.8)
                Text("年")
                    .font(.system(size: secondarySize * 0.7, weight: .medium))
                    .foregroundColor(textPrimaryColor)
                Text("\(remainingDays % 365)")
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

    // 数字(15pt)と単位「年・週・日」(12pt)でサイズを分けたカウントダウン表示
    func lockScreenCountdownSegment(number: String, unit: String) -> Text {
        Text(number)
            .font(.system(size: 15, weight: .semibold, design: .rounded).monospacedDigit())
        + Text(unit)
            .font(.system(size: 12, weight: .semibold, design: .rounded))
    }

    func lockScreenCountdownText(data: PivotLogWidgetData) -> Text {
        let mode = data.countdownMode ?? "detailed"
        switch mode {
        case "daysOnly":
            return lockScreenCountdownSegment(number: formatNumber(computedRemainingDays), unit: "日")
        case "weeksOnly":
            return lockScreenCountdownSegment(number: formatNumber(computedTotalWeeks), unit: "週")
        case "yearsOnly":
            return lockScreenCountdownSegment(number: "\(Int(computedRemainingYears))", unit: "年")
        default:
            return lockScreenCountdownSegment(number: "\(Int(computedRemainingYears))", unit: "年")
                + lockScreenCountdownSegment(number: "\(computedRemainingDays % 365)", unit: "日")
        }
    }

    func normalizedMessageSource(_ source: String?) -> String {
        switch source {
        case "daily":
            return "perspective"
        case "custom", "perspective", "todayFocus":
            return source ?? "custom"
        default:
            return "custom"
        }
    }

    func perspectiveDisplayMessage(data: PivotLogWidgetData) -> ResolvedWidgetMessage? {
        guard let text = data.perspectiveMainText, !text.isEmpty else {
            return nil
        }
        return ResolvedWidgetMessage(
            text: text,
            emoji: data.perspectiveEmoji?.isEmpty == false ? data.perspectiveEmoji : nil,
            subtext: data.perspectiveSubtext?.isEmpty == false ? data.perspectiveSubtext : nil
        )
    }

    func todayFocusMessageText(data: PivotLogWidgetData) -> String? {
        guard let sourceDate = WidgetDateHelpers.previousDateString(from: effectiveTodayDate) else {
            return nil
        }
        return data.recentDiaryTomorrows?
            .first(where: { $0.date == sourceDate })?
            .text
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }

    func resolvedDisplayMessage(data: PivotLogWidgetData) -> ResolvedWidgetMessage? {
        switch normalizedMessageSource(data.messageSource) {
        case "perspective":
            return perspectiveDisplayMessage(data: data)
        case "todayFocus":
            if let text = todayFocusMessageText(data: data), !text.isEmpty {
                return ResolvedWidgetMessage(text: text, emoji: nil, subtext: nil)
            }
            return perspectiveDisplayMessage(data: data)
        default:
            let customText = data.customText.trimmingCharacters(in: .whitespacesAndNewlines)
            if customText.isEmpty {
                return perspectiveDisplayMessage(data: data)
            }
            return ResolvedWidgetMessage(text: customText, emoji: nil, subtext: nil)
        }
    }

    func lockScreenMessageText(data: PivotLogWidgetData) -> String {
        guard let message = resolvedDisplayMessage(data: data), !message.text.isEmpty else {
            return ""
        }
        if let emoji = message.emoji, !emoji.isEmpty {
            return "\(emoji) \(message.text)"
        }
        return message.text
    }

    // MARK: - メッセージ表示

    @ViewBuilder
    func messageView(data: PivotLogWidgetData, fontSize: CGFloat = 12) -> some View {
        if let message = resolvedDisplayMessage(data: data), !message.text.isEmpty {
            VStack(alignment: .leading, spacing: 2) {
                HStack(alignment: .top, spacing: 4) {
                    if let emoji = message.emoji {
                        Text(emoji)
                            .font(.system(size: fontSize))
                    }
                    Text(message.text)
                        .font(.system(size: fontSize, weight: .regular))
                        .foregroundColor(textEmphasisColor)
                        .multilineTextAlignment(.leading)
                }
                if let subtext = message.subtext, !subtext.isEmpty {
                    Text(subtext)
                        .font(.system(size: fontSize - 1, weight: .light))
                        .foregroundColor(textEmphasisColor.opacity(0.8))
                        .lineLimit(1)
                        .padding(.leading, message.emoji != nil ? 20 : 0)
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
                    Text(computedTodayDateLabel)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(textEmphasisColor)
                    Spacer()
                    if data.showDiaryStatus != false {
                        DiaryStatusIndicator(
                            hasTodayEntry: computedHasTodayEntry,
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
                WidgetProgressBar(progress: computedLifeProgress, primaryColor: primaryColor)

                Text("\(String(format: "%.1f", computedLifeProgress))%")
                    .font(.system(size: 10, weight: .medium, design: .rounded))
                    .monospacedDigit()
                    .foregroundColor(textSecondaryColor)
            }

            // ストリーク（表示時のみ）
            if data.showStreak != false, computedStreakDays > 0 {
                HStack(spacing: 3) {
                    Text(computedStreakEmoji)
                        .font(.system(size: 12))
                    Text("\(computedStreakDays)日連続")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(textEmphasisColor)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }

            // 残りのスペースをすべてメッセージに使用（上下中央・左揃え）
            messageView(data: data, fontSize: 13)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        }
        .padding(4)
        .widgetBackground(WidgetGradientBackground(isDarkMode: isDarkMode))
    }

    // MARK: - Medium ウィジェット

    @ViewBuilder
    func mediumWidgetView(data: PivotLogWidgetData) -> some View {
        VStack(spacing: 6) {
            // 上部: 日付 + ストリーク（表示時のみスペースを取る）
            if data.showDateHeader != false || data.showDiaryStatus != false || (data.showStreak != false && computedStreakDays > 0) {
                HStack {
                    if data.showDateHeader != false {
                        Text(computedTodayDateLabel)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(textEmphasisColor)
                    }
                    Spacer()
                    if data.showDiaryStatus != false {
                        DiaryStatusIndicator(
                            hasTodayEntry: computedHasTodayEntry,
                            primaryColor: primaryColor,
                            textSecondaryColor: textSecondaryColor
                        )
                    }
                    if data.showStreak != false, computedStreakDays > 0 {
                        HStack(spacing: 3) {
                            Text(computedStreakEmoji)
                                .font(.system(size: 13))
                            Text("\(computedStreakDays)日連続")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(textEmphasisColor)
                        }
                    }
                }
            }

            // カウントダウン + 進捗率
            HStack {
                countdownDisplay(data: data, primarySize: 32, secondarySize: 24)

                Spacer()

                Text("\(String(format: "%.1f", computedLifeProgress))%")
                    .font(.system(size: 18, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundColor(primaryColor)
            }

            // プログレスバー
            WidgetProgressBar(progress: computedLifeProgress, primaryColor: primaryColor)

            // 残りのスペースをすべてメッセージに使用（上下中央・左揃え）
            messageView(data: data, fontSize: 14)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        }
        .padding(4)
        .widgetBackground(WidgetGradientBackground(isDarkMode: isDarkMode))
    }

    // MARK: - Lock Screen ウィジェット

    @ViewBuilder
    func lockScreenRectangularWidgetView(data: PivotLogWidgetData) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                lockScreenCountdownText(data: data)
                    .lineLimit(1)
                    .minimumScaleFactor(0.72)
                    .foregroundColor(.primary)

                Spacer(minLength: 4)

                Text("\(String(format: "%.1f", computedLifeProgress))%")
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                    .monospacedDigit()
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
                    .foregroundColor(.primary)
            }

            WidgetProgressBar(
                progress: computedLifeProgress,
                primaryColor: Color.primary,
                trackColor: Color.primary.opacity(0.25),
                height: 4
            )

            let message = lockScreenMessageText(data: data)
            if !message.isEmpty {
                Text(message)
                    .font(.system(size: 12, weight: .regular))
                    .foregroundColor(.primary)
                    .lineLimit(2, reservesSpace: true)
                    .minimumScaleFactor(0.85)
                    .multilineTextAlignment(.leading)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .layoutPriority(1)
            }
        }
        .widgetBackground(Color.clear)
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

    @ViewBuilder
    func lockScreenPlaceholderView() -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text("PivotLog")
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(.primary)
                .lineLimit(1)
            Text("アプリで設定してください")
                .font(.system(size: 12, weight: .regular))
                .foregroundColor(.primary)
                .lineLimit(2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .widgetBackground(Color.clear)
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
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryRectangular])
        .contentMarginsDisabled()
    }
}

// プレビュー
struct PivotLogWidget_Previews: PreviewProvider {
    static var previews: some View {
        let todayFocusPreviewDate: Date = {
            var calendar = Calendar(identifier: .gregorian)
            calendar.locale = Locale(identifier: "ja_JP")
            calendar.timeZone = TimeZone.current
            return calendar.date(from: DateComponents(year: 2026, month: 6, day: 10, hour: 9)) ?? Date()
        }()

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

        let sampleDataTodayFocus = PivotLogWidgetData(
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
            lastUpdated: "2026-06-10T00:00:00Z",
            perspectiveEmoji: "🌸",
            perspectiveMainText: "あと46回の桜を見届けられる",
            perspectiveSubtext: "今年の桜は、今年だけのもの",
            dailyMessage: "今日もあなたらしく",
            messageSource: "todayFocus",
            recentDiaryTomorrows: [
                WidgetDiaryTomorrow(date: "2026-06-09", text: "朝に散歩して、最初の一歩を軽くする")
            ],
            hasTodayEntry: false,
            streakDays: 15,
            totalDays: 42,
            streakEmoji: "🔥",
            todayDateLabel: "6月10日(水)",
            countdownMode: "detailed",
            totalWeeks: 2400,
            showStreak: true,
            showDiaryStatus: true,
            showDateHeader: true,
            recentDiaryDates: ["2026-06-09"],
            dayStartHour: 5
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

            PivotLogWidgetEntryView(entry: PivotLogEntry(date: todayFocusPreviewDate, widgetData: sampleDataTodayFocus))
                .previewContext(WidgetPreviewContext(family: .systemMedium))
                .previewDisplayName("Medium - Today Focus")

            PivotLogWidgetEntryView(entry: PivotLogEntry(date: todayFocusPreviewDate, widgetData: sampleDataTodayFocus))
                .previewContext(WidgetPreviewContext(family: .accessoryRectangular))
                .previewDisplayName("Lock Screen - Today Focus")

            PivotLogWidgetEntryView(entry: PivotLogEntry(date: Date(), widgetData: PivotLogWidgetData(
                birthday: "1990-01-01",
                targetLifespan: 80,
                lifeProgress: 42.5,
                remainingYears: 46.0,
                remainingDays: 16800,
                currentAge: 34.0,
                customText: "長いメッセージが入っても二行で読みやすく収まるか確認するためのテキスト",
                showProgress: true,
                showRemainingTime: true,
                showCustomText: true,
                colorScheme: "light",
                lastUpdated: "2024-01-01T00:00:00Z",
                perspectiveEmoji: "🌸",
                perspectiveMainText: "あと46回の桜を見届けられる",
                perspectiveSubtext: "今年の桜は、今年だけのもの",
                dailyMessage: "今日もあなたらしく",
                messageSource: "custom",
                hasTodayEntry: false,
                streakDays: 15,
                totalDays: 42,
                streakEmoji: "🔥",
                todayDateLabel: "2月4日(火)",
                countdownMode: "daysOnly",
                totalWeeks: 2400,
                showStreak: true,
                showDiaryStatus: true,
                showDateHeader: true
            )))
                .previewContext(WidgetPreviewContext(family: .accessoryRectangular))
                .previewDisplayName("Lock Screen - Days")
        }
    }
}
