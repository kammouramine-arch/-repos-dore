import SwiftUI

/// The 82 pt record control (motion spec §6). Idle: white ring, red core. Recording: the ring has
/// turned 90°, the core has become a rounded square, and a thin signal ring outside breathes with
/// the microphone level. Haptics are played by the owner when recording really starts or stops.
@MainActor
struct RecordButton: View {
    var isRecording: Bool
    /// 0…1 microphone level; drives the outer ring's scale (1.00–1.04, capped).
    var level: Double = 0
    /// White core for still capture (Add object).
    var capture = false
    var action: () -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var breathe = false

    private var size: CGFloat { DS.Size.recordButton }

    var body: some View {
        Button(action: action) {
            ZStack {
                // Outer signal ring, breathing with amplitude while recording.
                Circle()
                    .strokeBorder(DSColor.signal, lineWidth: 1.5)
                    .frame(width: size + 16, height: size + 16)
                    .scaleEffect(isRecording ? 1 + min(0.04, level * 0.04) + (breathe && !reduceMotion ? 0.015 : 0) : 0.9)
                    .opacity(isRecording ? 0.9 : 0)
                    .animation(.linear(duration: 0.06), value: level)
                    .animation(reduceMotion ? nil : .easeInOut(duration: 1.1).repeatForever(autoreverses: true), value: breathe)
                // Ring: rotates a quarter turn on start.
                Circle()
                    .strokeBorder(DSColor.textOnMedia, lineWidth: 3.5)
                    .frame(width: size, height: size)
                    .rotationEffect(.degrees(isRecording ? 90 : 0))
                // Core: circle → rounded square (stop glyph).
                RoundedRectangle(cornerRadius: isRecording ? 8 : 32, style: .continuous)
                    .fill(capture ? DSColor.textOnMedia : DSColor.recording)
                    .frame(width: 64, height: 64)
                    .scaleEffect(isRecording ? 0.44 : 1)
            }
            .frame(width: size, height: size)
            .contentShape(Circle())
            .dsAnimation(DSMotion.gentle, value: isRecording)
        }
        .buttonStyle(RecordPressStyle())
        .accessibilityLabel(capture ? L10n.string("addObject.capture") : (isRecording ? L10n.string("teach.stop") : L10n.string("teach.record")))
        .onAppear { breathe = true }
    }
}

/// Compresses to 0.92 on press (spec), without the light haptic `DSButtonStyle` would add: the
/// owner plays `.medium` on start and `.light` on stop when the state really changes.
private struct RecordPressStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.92 : 1)
            .animation(configuration.isPressed ? DSMotion.standard(0.12) : DSMotion.snappy, value: configuration.isPressed)
    }
}

/// Elapsed time over the camera, top-right: recording dot and monospaced digits.
@MainActor
struct RecordingTimerPill: View {
    var elapsed: TimeInterval
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var dim = false

    var body: some View {
        HStack(spacing: 8) {
            Circle().fill(DSColor.recording).frame(width: 8, height: 8)
                .opacity(dim ? 0.35 : 1)
                .animation(reduceMotion ? nil : .easeInOut(duration: 0.6).repeatForever(autoreverses: true), value: dim)
            Text(DSFormat.clock(elapsed))
                .font(.system(size: 15, weight: .semibold)).monospacedDigit().tracking(0.15)
                .foregroundStyle(DSColor.textOnMedia)
        }
        .padding(.horizontal, 14).frame(height: 36)
        .background(DSGlass(style: .onMedia)).clipShape(Capsule())
        .onAppear { dim = true }
        .accessibilityLabel(DSFormat.clock(elapsed))
    }
}
