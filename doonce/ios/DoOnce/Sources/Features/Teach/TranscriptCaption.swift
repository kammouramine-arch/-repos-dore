import SwiftUI

/// Colours the phrases that matter inside a run of speech: values with units and the words that
/// flag an important statement. Case-insensitive, first occurrence of each phrase.
enum KeyPhraseHighlighter {
    static func attributed(_ text: String, phrases: [String], color: Color, weight: Font.Weight = .bold) -> AttributedString {
        var result = AttributedString(text)
        for phrase in phrases where !phrase.isEmpty {
            guard let range = result.range(of: phrase, options: [.caseInsensitive]) else { continue }
            result[range].foregroundColor = color
            result[range].font = .system(size: 17, weight: weight)
        }
        return result
    }
}

/// The live caption near the bottom of the camera while recording. Only the latest utterance,
/// key phrases in signal, a shadow so it reads on any scene.
@MainActor
struct TranscriptCaption: View {
    var text: String
    var highlights: [String]

    var body: some View {
        Text(KeyPhraseHighlighter.attributed(text, phrases: highlights, color: DSColor.signal))
            .font(.system(size: 17, weight: .medium))
            .lineSpacing(5)
            .foregroundStyle(DSColor.textOnMedia)
            .shadow(color: .black.opacity(0.7), radius: 8, y: 1)
            .frame(maxWidth: .infinity, minHeight: 48, alignment: .bottomLeading)
            .lineLimit(3)
            .animation(DSMotion.standard(0.2), value: text)
            .accessibilityLabel(text)
    }
}
