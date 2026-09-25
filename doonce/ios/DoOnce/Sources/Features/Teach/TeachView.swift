import DoOnceCore
import SwiftUI

/// Teach: show DoOnce how it's done. Camera, one record control, and while recording the live
/// intelligence layer (captions, chips, ribbon). Stop freezes the last frame and hands off to
/// Processing with a crossfade (the frozen frame becomes the hero, so continuity is kept).
@MainActor
struct TeachView: View {
    var objectID: UUID?

    @Environment(AppState.self) private var app
    @Environment(Router.self) private var router
    @State private var model = TeachModel()

    var body: some View {
        @Bindable var model = model
        ZStack {
            if case .handoff(let recording) = model.phase {
                ProcessingView(recordingID: recording.id, hero: model.frozenFrame, objectID: model.selectedObjectID)
                    .transition(.opacity)
            } else {
                cameraStage
                    .transition(.opacity)
            }
        }
        .background(DSColor.backgroundPrimary)
        .task { await model.attach(app: app, router: router, objectID: objectID) }
        .onDisappear { model.detach() }
        .sheet(isPresented: $model.showsImporter) {
            VideoImportPicker(onPicked: { model.imported($0) }, onCancel: { model.showsImporter = false })
                .ignoresSafeArea()
        }
        .sheet(isPresented: $model.showsObjectPicker) {
            ObjectPickerSheet(selected: $model.selectedObjectID)
                .presentationDetents([.medium, .large])
                .presentationCornerRadius(DS.Radius.sheet)
        }
    }

    // MARK: Camera stage

    private var cameraStage: some View {
        GeometryReader { geo in
            ZStack(alignment: .top) {
                CameraSurface(session: model.camera, onRetry: { model.recover() })
                if let frame = model.frozenFrame, model.phase == .stopping {
                    Image(uiImage: frame).resizable().aspectRatio(contentMode: .fill)
                        .frame(width: geo.size.width, height: geo.size.height).clipped()
                        .clipShape(RoundedRectangle(cornerRadius: DS.Radius.large, style: .continuous))
                        .scaleEffect(0.9)
                        .ignoresSafeArea()
                        .transition(.identity)
                }
                bottomShade(height: geo.size.height * 0.46)
                LiveIntelligenceLayer(observations: model.observations)
                    .opacity(model.isRecording ? 1 : 0)
                controls
                    .opacity(model.phase == .stopping ? 0 : 1)
                DSTopBar(leading: .close, onMedia: true, onLeading: { router.dismissFullScreen() }) {
                    if model.isRecording {
                        RecordingTimerPill(elapsed: model.elapsed).transition(.opacity)
                    }
                }
                .opacity(model.phase == .stopping ? 0 : 1)
                if case .error(let title, let sub) = model.phase {
                    TeachErrorView(title: title, sub: sub, onRetry: { model.recover() }, onClose: { router.dismissFullScreen() })
                        .transition(.opacity)
                }
            }
            .dsAnimation(DSMotion.gentle, value: model.phase)
        }
        .ignoresSafeArea(.keyboard)
    }

    private func bottomShade(height: CGFloat) -> some View {
        VStack {
            Spacer()
            LinearGradient(colors: [.black.opacity(0), .black.opacity(0.7)], startPoint: .top, endPoint: .bottom)
                .frame(height: height)
        }
        .ignoresSafeArea()
        .allowsHitTesting(false)
    }

    private var controls: some View {
        VStack(spacing: 0) {
            Spacer()
            if model.isRecording {
                HStack {
                    Spacer()
                    Button { model.markMoment() } label: { Label(L10n.string("teach.rememberThis"), systemImage: "sparkle") }
                        .buttonStyle(.dsOnMediaSmall)
                }
                .padding(.horizontal, DS.Space.gutter)
                .padding(.bottom, DS.Space.s6)
                TranscriptCaption(text: model.live.partialText, highlights: model.live.highlights)
                    .padding(.horizontal, DS.Space.gutter)
                    .padding(.bottom, DS.Space.s5)
                TimelineRibbon(progress: model.elapsed / model.ribbonSpan, ticks: model.ticks, duration: model.ribbonSpan)
                    .padding(.horizontal, DS.Space.gutter)
                    .padding(.bottom, DS.Space.s8)
            } else {
                VStack(spacing: 6) {
                    Text(L10n.string("teach.instruction")).dsText(.title2).foregroundStyle(DSColor.textOnMedia)
                    Text(L10n.string("teach.hint")).dsText(.subheadline).foregroundStyle(DSColor.textOnMedia.opacity(0.8))
                }
                .multilineTextAlignment(.center)
                .shadow(color: .black.opacity(0.5), radius: 12, y: 1)
                .padding(.horizontal, DS.Space.gutter)
                .padding(.bottom, 18)
                .transition(.opacity)
            }
            HStack {
                Button { importTapped() } label: { Image(systemName: "photo.on.rectangle").font(.system(size: 20, weight: .medium)) }
                    .buttonStyle(.dsOnMediaIcon)
                    .frame(width: 48, height: 48)
                    .accessibilityLabel(L10n.string("teach.import"))
                    .opacity(model.isRecording ? 0 : 1)
                Spacer()
                RecordButton(isRecording: model.isRecording, level: model.audioLevel) { model.toggleRecording(router: router) }
                Spacer()
                Button { app.haptics.play(.light); model.showsObjectPicker = true } label: {
                    if let object = app.object(model.selectedObjectID) {
                        MediaView(ref: app.heroMedia(for: object)).frame(width: 48, height: 48).clipShape(Circle())
                    } else {
                        Image(systemName: "plus.square").font(.system(size: 20, weight: .medium))
                    }
                }
                .buttonStyle(.dsOnMediaIcon)
                .frame(width: 48, height: 48)
                .accessibilityLabel(L10n.string("teach.existingObject"))
                .opacity(model.isRecording ? 0 : 1)
            }
            .padding(.horizontal, DS.Space.gutter)
            .padding(.bottom, 46)
        }
        .dsAnimation(DSMotion.standard(0.2), value: model.isRecording)
    }

    private func importTapped() {
        app.haptics.play(.light)
        Task {
            if await PermissionsService.status(.photos) == .undetermined {
                router.dismissFullScreen()
                router.show(.permission(.photos, then: .teach(objectID: model.selectedObjectID)))
            } else {
                model.showsImporter = true
            }
        }
    }
}

/// Pick an existing object to teach against, so the memory lands on it without a guess later.
@MainActor
struct ObjectPickerSheet: View {
    @Binding var selected: UUID?
    @Environment(AppState.self) private var app
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                Text(L10n.string("teach.existingObject")).dsText(.title2).foregroundStyle(DSColor.textPrimary).padding(.bottom, DS.Space.s3)
                ForEach(app.objects) { object in
                    Button {
                        app.haptics.play(.selection)
                        selected = object.id
                        dismiss()
                    } label: {
                        DSRow(title: object.name, subtitle: object.makeAndModel == object.name ? nil : object.makeAndModel, leading: {
                            MediaView(ref: app.heroMedia(for: object)).frame(width: 48, height: 48).clipShape(RoundedRectangle(cornerRadius: DS.Radius.small, style: .continuous))
                        }, trailing: {
                            if selected == object.id { Image(systemName: "checkmark").font(.system(size: 15, weight: .semibold)).foregroundStyle(DSColor.signalText) }
                        })
                    }
                    .buttonStyle(.dsRowPressable)
                    DSSeparator()
                }
            }
            .padding(.horizontal, DS.Space.gutter)
            .padding(.top, DS.Space.s6)
        }
        .background(DSColor.backgroundElevated)
    }
}

/// A calm failure layer drawn over the camera (the page-style `ErrorStateView` is for after a
/// recording exists). Same copy, same tone.
@MainActor
struct TeachErrorView: View {
    var title: String
    var sub: String
    var onRetry: () -> Void
    var onClose: () -> Void

    var body: some View {
        VStack(spacing: DS.Space.s3) {
            Spacer()
            Text(title).dsText(.title2).foregroundStyle(DSColor.textOnMedia).multilineTextAlignment(.center)
            Text(sub).dsText(.callout).foregroundStyle(DSColor.textOnMedia.opacity(0.8)).multilineTextAlignment(.center)
            Button(L10n.string("error.retry"), action: onRetry).buttonStyle(.dsOnMediaSmall).padding(.top, DS.Space.s2)
            Button(L10n.string("common.close"), action: onClose).buttonStyle(.ds(.ghost, size: .small)).foregroundStyle(DSColor.textOnMedia)
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(DS.Space.gutter)
        .background(DSColor.scrimMedia.ignoresSafeArea())
    }
}
