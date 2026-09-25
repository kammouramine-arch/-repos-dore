import AVFoundation
import Photos
import Speech
import UserNotifications

/// Permission state and requests. The UI always shows `PermissionEducationView` first, then the
/// system prompt; nothing is requested at launch.
enum PermissionsService {
    enum Status { case granted, denied, undetermined }

    static func status(_ kind: PermissionKind) async -> Status {
        switch kind {
        case .camera: map(AVCaptureDevice.authorizationStatus(for: .video))
        case .microphone: map(AVCaptureDevice.authorizationStatus(for: .audio))
        case .photos:
            switch PHPhotoLibrary.authorizationStatus(for: .readWrite) { case .authorized, .limited: .granted; case .notDetermined: .undetermined; default: .denied }
        case .notifications:
            switch await UNUserNotificationCenter.current().notificationSettings().authorizationStatus { case .authorized, .provisional, .ephemeral: .granted; case .notDetermined: .undetermined; default: .denied }
        }
    }

    /// Shows the system prompt. Returns the resulting status.
    static func request(_ kind: PermissionKind) async -> Status {
        switch kind {
        case .camera: return await AVCaptureDevice.requestAccess(for: .video) ? .granted : .denied
        case .microphone: return await AVCaptureDevice.requestAccess(for: .audio) ? .granted : .denied
        case .photos:
            let s = await PHPhotoLibrary.requestAuthorization(for: .readWrite)
            return (s == .authorized || s == .limited) ? .granted : .denied
        case .notifications:
            let ok = (try? await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge])) ?? false
            return ok ? .granted : .denied
        }
    }

    /// Speech recognition is asked together with the microphone when teaching or going hands-free.
    static func requestSpeech() async -> Bool {
        await withCheckedContinuation { cont in
            SFSpeechRecognizer.requestAuthorization { cont.resume(returning: $0 == .authorized) }
        }
    }

    private static func map(_ s: AVAuthorizationStatus) -> Status {
        switch s { case .authorized: .granted; case .notDetermined: .undetermined; default: .denied }
    }
}
