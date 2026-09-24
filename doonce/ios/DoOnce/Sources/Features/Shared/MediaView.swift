import SwiftUI
import DoOnceCore

/// Renders a `MediaRef`: a local file, a remote URL, or a bundled sample image (`sample:<name>`
/// in the asset catalog). Placeholder is a quiet sunken surface, never a spinner.
struct MediaView: View {
    var ref: MediaRef?
    var contentMode: ContentMode = .fill

    var body: some View {
        Group {
            if let image = bundledImage {
                Image(uiImage: image).resizable().aspectRatio(contentMode: contentMode)
            } else if let url = ref?.localURL ?? ref?.remoteURL {
                AsyncImage(url: url, transaction: Transaction(animation: DSMotion.crossfade)) { phase in
                    if let img = phase.image { img.resizable().aspectRatio(contentMode: contentMode) } else { placeholder }
                }
            } else {
                placeholder
            }
        }
        .clipped()
    }

    /// Sample content points at files that only exist on device after a real Teach; in sample
    /// mode the file name (e.g. "boiler-front", "boiler-repressurise/22") resolves to the asset catalog.
    private var bundledImage: UIImage? {
        guard let url = ref?.localURL ?? ref?.remoteURL else { return nil }
        if url.scheme == "sample" { return UIImage(named: url.host ?? url.lastPathComponent) }
        if url.isFileURL, !FileManager.default.fileExists(atPath: url.path) {
            let stem = url.deletingPathExtension().lastPathComponent
            let parent = url.deletingLastPathComponent().lastPathComponent
            return UIImage(named: SamplePhotos.names[stem] ?? SamplePhotos.names[parent] ?? stem) ?? UIImage(named: SamplePhotos.fallback(for: parent))
        }
        return nil
    }

    private var placeholder: some View { DSColor.backgroundSunken }
}

extension MediaRef {
    /// A reference to a bundled sample photo (Assets.xcassets/SamplePhotos).
    static func sample(_ name: String, kind: Kind = .image) -> MediaRef {
        MediaRef(kind: kind, localURL: nil, remoteURL: URL(string: "sample://\(name)"))
    }
}

/// Maps sample-content names to bundled placeholder photographs (Assets.xcassets/SamplePhotos).
enum SamplePhotos {
    static let names: [String: String] = [
        "boiler-front": "pipes-gauges", "boiler-gauge": "vintage-gauge", "linea-mini": "coffee-kitchen", "nest": "thermostat",
        "router": "router", "washing-machine": "washing", "car": "car", "boiler-repressurise": "pipes-gauges",
        "kitchen": "coffee-kitchen", "utility-room": "pipes-valves", "garage": "garage",
    ]
    static func fallback(for key: String) -> String { names[key] ?? "pipes-gauges" }
}
