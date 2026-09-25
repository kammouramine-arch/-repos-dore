import SwiftUI
import DoOnceCore

/// Find anything: a keyboard-first field (voice and camera are one tap away), suggestions while
/// empty, and grouped results as you type. Cancel returns to Memory.
@MainActor
struct SearchView: View {
    var initialQuery: String

    @Environment(AppState.self) private var app
    @Environment(Router.self) private var router
    @State private var model: SearchViewModel?
    @FocusState private var focused: Bool

    var body: some View {
        ZStack(alignment: .top) {
            DSColor.backgroundPrimary.ignoresSafeArea()
            if let model {
                @Bindable var model = model
                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 0) {
                        field(model: model)
                        Group {
                            if model.query.trimmingCharacters(in: .whitespaces).isEmpty {
                                suggestions(model: model)
                            } else {
                                SearchResultsView(results: model.results)
                            }
                        }
                        .padding(.top, DS.Space.s6)
                    }
                    .padding(.horizontal, DS.Space.gutter)
                    .padding(.top, DS.Space.s1)
                    .padding(.bottom, DS.Space.s8)
                }
                .scrollDismissesKeyboard(.interactively)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .onAppear {
            if model == nil {
                model = SearchViewModel(query: initialQuery, memories: app.memories, objects: app.objects, people: app.people, spaces: app.spaces)
            }
            focused = true
        }
    }

    private func field(model: SearchViewModel) -> some View {
        @Bindable var model = model
        return HStack(spacing: 10) {
            HStack(spacing: 2) {
                TextField(L10n.string("memory.search.placeholder"), text: $model.query, axis: .vertical)
                    .font(.ds(.body))
                    .foregroundStyle(DSColor.textPrimary)
                    .lineLimit(1...2)
                    .focused($focused)
                    .submitLabel(.search)
                    .padding(.leading, 18)
                    .frame(minHeight: DS.Size.touchComfort)
                    .accessibilityLabel(L10n.string("memory.search.placeholder"))
                Button { model.query = L10n.list("search.suggestions").dropFirst(2).first ?? model.query } label: {
                    Image(systemName: "mic").font(.system(size: 18, weight: .medium))
                }
                .buttonStyle(.ds(.ghost, size: .icon)).foregroundStyle(DSColor.textSecondary)
                .accessibilityLabel(L10n.string("search.voice"))
                Button { router.present(.look) } label: {
                    Image(systemName: "camera").font(.system(size: 18, weight: .medium))
                }
                .buttonStyle(.ds(.ghost, size: .icon)).foregroundStyle(DSColor.textSecondary)
                .accessibilityLabel(L10n.string("center.look"))
                .padding(.trailing, 4)
            }
            .background(DSColor.fillSubtle, in: RoundedRectangle(cornerRadius: DS.Radius.large, style: .continuous))
            Button(L10n.string("common.cancel")) { focused = false; router.pop() }
                .buttonStyle(.dsGhost)
        }
    }

    private func suggestions(model: SearchViewModel) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            DSEyebrow(text: L10n.string("search.try")).padding(.bottom, 10)
            ForEach(L10n.list("search.suggestions"), id: \.self) { suggestion in
                Button {
                    HapticsService.shared.play(.selection)
                    model.query = suggestion
                } label: {
                    HStack(spacing: DS.Space.s3) {
                        Image(systemName: "sparkles").font(.system(size: 15, weight: .medium)).foregroundStyle(DSColor.textTertiary)
                        Text(suggestion).dsText(.body).fontWeight(.medium).foregroundStyle(DSColor.textPrimary)
                        Spacer(minLength: 0)
                    }
                    .frame(minHeight: 48)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.dsRowPressable)
            }
        }
    }
}
