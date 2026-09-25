import AVFoundation
import DoOnceCore
import PhotosUI
import SwiftUI
import UniformTypeIdentifiers

/// Picks one video from Photos (out of process, so no library access is granted to the app) and
/// copies it into the media library as a recording's original, so it becomes an ordinary
/// `Recording`. The result carries the recording id the file was stored under.
struct VideoImportPicker: UIViewControllerRepresentable {
    struct Imported { let id: UUID; let url: URL }
    var onPicked: (Result<Imported, any Error>) -> Void
    var onCancel: () -> Void

    func makeUIViewController(context: Context) -> PHPickerViewController {
        var config = PHPickerConfiguration(photoLibrary: .shared())
        config.filter = .videos
        config.selectionLimit = 1
        config.preferredAssetRepresentationMode = .current
        let picker = PHPickerViewController(configuration: config)
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: PHPickerViewController, context: Context) {}
    func makeCoordinator() -> Coordinator { Coordinator(onPicked: onPicked, onCancel: onCancel) }

    final class Coordinator: NSObject, PHPickerViewControllerDelegate {
        let onPicked: (Result<Imported, any Error>) -> Void
        let onCancel: () -> Void
        init(onPicked: @escaping (Result<Imported, any Error>) -> Void, onCancel: @escaping () -> Void) {
            self.onPicked = onPicked
            self.onCancel = onCancel
        }

        func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
            guard let provider = results.first?.itemProvider, provider.hasItemConformingToTypeIdentifier(UTType.movie.identifier) else {
                onCancel()
                return
            }
            let id = UUID()
            let destination = RecordingFiles.movieURL(id)
            let onPicked = onPicked
            // The provider's file is temporary; copy it before the completion returns.
            provider.loadFileRepresentation(forTypeIdentifier: UTType.movie.identifier) { url, error in
                let result: Result<Imported, any Error>
                if let url {
                    do {
                        try RecordingFiles.library.ensureDirectories(for: id)
                        try FileManager.default.copyItem(at: url, to: destination)
                        result = .success(Imported(id: id, url: destination))
                    } catch { result = .failure(error) }
                } else {
                    result = .failure(error ?? CocoaError(.fileNoSuchFile))
                }
                DispatchQueue.main.async { onPicked(result) }
            }
        }
    }
}

extension Recording {
    /// A `Recording` for a video file already in the media library, with its real size and duration.
    static func imported(from url: URL, id: UUID, householdID: UUID) async -> Recording {
        let bytes = (try? FileManager.default.attributesOfItem(atPath: url.path)[.size] as? Int64) ?? 0
        let duration = (try? await AVURLAsset(url: url).load(.duration).seconds) ?? 0
        return Recording(id: id, householdID: householdID, localURL: url, byteCount: bytes, duration: duration)
    }
}
