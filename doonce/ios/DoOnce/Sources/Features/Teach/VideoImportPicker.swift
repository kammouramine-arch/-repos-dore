import AVFoundation
import DoOnceCore
import PhotosUI
import SwiftUI
import UniformTypeIdentifiers

/// Picks one video from Photos (out of process, so no library access is granted to the app) and
/// copies it into Recordings so it becomes an ordinary `Recording`.
struct VideoImportPicker: UIViewControllerRepresentable {
    var onPicked: (Result<URL, any Error>) -> Void
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
        let onPicked: (Result<URL, any Error>) -> Void
        let onCancel: () -> Void
        init(onPicked: @escaping (Result<URL, any Error>) -> Void, onCancel: @escaping () -> Void) {
            self.onPicked = onPicked
            self.onCancel = onCancel
        }

        func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
            guard let provider = results.first?.itemProvider, provider.hasItemConformingToTypeIdentifier(UTType.movie.identifier) else {
                onCancel()
                return
            }
            let destination = RecordingFiles.movieURL(UUID())
            let onPicked = onPicked
            // The provider's file is temporary; copy it before the completion returns.
            provider.loadFileRepresentation(forTypeIdentifier: UTType.movie.identifier) { url, error in
                let result: Result<URL, any Error>
                if let url {
                    do {
                        try FileManager.default.createDirectory(at: destination.deletingLastPathComponent(), withIntermediateDirectories: true)
                        try FileManager.default.copyItem(at: url, to: destination)
                        result = .success(destination)
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
    /// A `Recording` for a video file already in Recordings/, with its real size and duration.
    static func imported(from url: URL, householdID: UUID) async -> Recording {
        let id = UUID(uuidString: url.deletingPathExtension().lastPathComponent) ?? UUID()
        let bytes = (try? FileManager.default.attributesOfItem(atPath: url.path)[.size] as? Int64) ?? 0
        let duration = (try? await AVURLAsset(url: url).load(.duration).seconds) ?? 0
        return Recording(id: id, householdID: householdID, localURL: url, byteCount: bytes, duration: duration)
    }
}
