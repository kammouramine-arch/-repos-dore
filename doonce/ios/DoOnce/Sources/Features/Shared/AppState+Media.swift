import Foundation
import DoOnceCore

/// Which photograph stands for a space, an object or a memory. Photography is the UI, so every
/// card and row needs one even when the model carries none (a space without a cover uses the
/// first object that lives in it; a memory uses its first key frame, then its object).
extension AppState {
    func coverMedia(for space: Space) -> MediaRef? {
        if let cover = space.coverImage { return cover }
        if let image = objects(in: space).first?.images.first { return image }
        let slug = space.name.lowercased().replacingOccurrences(of: " ", with: "-")
        return .sample(SamplePhotos.fallback(for: slug))
    }

    func heroMedia(for object: PhysicalObject) -> MediaRef? {
        object.images.first ?? .sample(SamplePhotos.fallback(for: object.category.lowercased()))
    }

    func thumbnail(for memory: Memory) -> MediaRef? {
        if let frame = memory.orderedSteps.first?.keyFrame { return frame }
        if let object = object(memory.objectID) { return heroMedia(for: object) }
        return nil
    }

    func media(for step: Step, in memory: Memory) -> MediaRef? {
        step.keyFrame ?? object(memory.objectID).flatMap { heroMedia(for: $0) }
    }

    /// "Julien Martin" for a memory, the account holder when the demonstrator is the user.
    func demonstratorName(for memory: Memory) -> String {
        if let person = person(memory.demonstratorID) {
            return person.isSelf ? currentUser.displayName : person.displayName
        }
        return currentUser.displayName
    }

    func objectsDownloaded() -> Int {
        objects.filter { object in object.images.contains { $0.isAvailableOffline } }.count
    }
}
