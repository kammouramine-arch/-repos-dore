import SwiftUI
import WidgetKit

/// Small Home Screen widget: the memory you started, with a "Continue" that deep-links straight
/// into Do mode (`doonce://do/<memoryID>`). Reads `ContinueMemoryStore`; shows a quiet empty state
/// when nothing is in progress.
struct ContinueMemoryWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: ContinueMemoryStore.widgetKind, provider: Provider()) { entry in
            ContinueMemoryView(entry: entry)
                .containerBackground(DSColor.backgroundElevated, for: .widget)
        }
        .configurationDisplayName("DoOnce")
        .description(String(localized: "widget.continue"))
        .supportedFamilies([.systemSmall])
    }

    struct TimelineEntryValue: TimelineEntry {
        var date: Date
        var memory: ContinueMemoryStore.Entry?
    }

    struct Provider: TimelineProvider {
        func placeholder(in context: Context) -> TimelineEntryValue {
            TimelineEntryValue(date: .now, memory: ContinueMemoryStore.Entry(memoryID: UUID(), title: "Repressurise boiler", nextStep: 3, total: 5, updatedAt: .now))
        }
        func getSnapshot(in context: Context, completion: @escaping (TimelineEntryValue) -> Void) {
            completion(TimelineEntryValue(date: .now, memory: ContinueMemoryStore.shared.entry))
        }
        func getTimeline(in context: Context, completion: @escaping (Timeline<TimelineEntryValue>) -> Void) {
            completion(Timeline(entries: [TimelineEntryValue(date: .now, memory: ContinueMemoryStore.shared.entry)], policy: .never))
        }
    }
}

private struct ContinueMemoryView: View {
    var entry: ContinueMemoryWidget.TimelineEntryValue

    var body: some View {
        if let memory = entry.memory {
            VStack(alignment: .leading, spacing: 6) {
                Circle().fill(DSColor.signal).frame(width: 8, height: 8)
                Spacer(minLength: 0)
                Text(memory.title).font(.system(size: 17, weight: .bold)).lineLimit(2).foregroundStyle(DSColor.textPrimary)
                Text("\(memory.nextStep) / \(memory.total)").font(.system(size: 13, weight: .semibold)).monospacedDigit().foregroundStyle(DSColor.textSecondary)
                Text(String(localized: "widget.continue")).font(.system(size: 13, weight: .semibold)).foregroundStyle(DSColor.signalText)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            .widgetURL(memory.deepLink)
        } else {
            VStack(alignment: .leading, spacing: 6) {
                Circle().fill(DSColor.textTertiary).frame(width: 8, height: 8)
                Spacer(minLength: 0)
                Text(String(localized: "widget.nothing")).font(.system(size: 15, weight: .semibold)).foregroundStyle(DSColor.textSecondary)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        }
    }
}
