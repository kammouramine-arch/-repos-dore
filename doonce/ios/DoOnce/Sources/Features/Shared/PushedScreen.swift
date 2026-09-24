import SwiftUI

/// The frame every pushed page shares: the system bar is hidden by `MainView`, so the page draws
/// its own floating `DSTopBar` over a scroll view and leaves room under the floating tab bar.
/// `onMedia` pages (a photographic hero) let the scroll content run under the status bar.
@MainActor
struct PushedScreen<Content: View, Trailing: View>: View {
    var onMedia = false
    var close = false
    var onBack: (() -> Void)? = nil
    @ViewBuilder var content: () -> Content
    @ViewBuilder var trailing: () -> Trailing

    @Environment(Router.self) private var router

    var body: some View {
        ZStack(alignment: .top) {
            DSColor.backgroundPrimary.ignoresSafeArea()
            if onMedia {
                ScrollView(showsIndicators: false) {
                    content().padding(.bottom, DS.Size.tabBarClearance)
                }
                .ignoresSafeArea(edges: .top)
            } else {
                ScrollView(showsIndicators: false) {
                    content()
                        .dsTopBarInset()
                        .padding(.bottom, DS.Size.tabBarClearance)
                }
            }
            DSTopBar(leading: close ? .close : .back, onMedia: onMedia, onLeading: { (onBack ?? router.pop)() }, trailing: trailing)
        }
        .toolbar(.hidden, for: .navigationBar)
    }
}

extension PushedScreen where Trailing == EmptyView {
    init(onMedia: Bool = false, close: Bool = false, onBack: (() -> Void)? = nil, @ViewBuilder content: @escaping () -> Content) {
        self.init(onMedia: onMedia, close: close, onBack: onBack, content: content, trailing: { EmptyView() })
    }
}

/// Page title used at the top of list pages (Spaces, People, Settings…).
@MainActor
struct PageTitle: View {
    var text: String
    var body: some View {
        Text(text).dsText(.largeTitle).foregroundStyle(DSColor.textPrimary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .accessibilityAddTraits(.isHeader)
    }
}

/// Horizontal, snapping row of cards with the page gutter as padding.
@MainActor
struct HScroll<Content: View>: View {
    @ViewBuilder var content: () -> Content
    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DS.Space.s3) { content() }
                .scrollTargetLayout()
                .padding(.horizontal, DS.Space.gutter)
                .padding(.vertical, DS.Space.s1)
        }
        .scrollTargetBehavior(.viewAligned)
        .scrollClipDisabled()
    }
}
