import Foundation

/// Edits to memories that keep the previous steps around.
///
/// Every edit snapshots the current steps into `versionHistory`, then bumps `version`. Nothing is
/// ever thrown away, so a bad edit can be reverted.
public enum MemoryVersioning {
    public enum Error: Swift.Error, Equatable {
        case stepNotFound(UUID)
        case versionNotFound(Int)
    }

    /// Replaces one step, keeping its position, and records the previous version.
    public static func updateStep(_ step: Step, in memory: Memory, by userID: UUID, note: String? = nil, at date: Date = Date()) throws -> Memory {
        guard let index = memory.steps.firstIndex(where: { $0.id == step.id }) else {
            throw Error.stepNotFound(step.id)
        }
        var steps = memory.steps
        var replacement = step
        replacement.order = memory.steps[index].order
        steps[index] = replacement
        return commit(steps: steps, title: memory.title, to: memory, by: userID, note: note ?? "Edited step \(replacement.order)", at: date)
    }

    /// Replaces all steps (reorder, split, combine, remove) and records the previous version.
    public static func replaceSteps(_ steps: [Step], in memory: Memory, by userID: UUID, note: String? = nil, at date: Date = Date()) -> Memory {
        let renumbered = steps.enumerated().map { index, step in
            var step = step
            step.order = index + 1
            return step
        }
        return commit(steps: renumbered, title: memory.title, to: memory, by: userID, note: note ?? "Edited steps", at: date)
    }

    /// Renames the memory and records the previous version.
    public static func rename(_ memory: Memory, to title: String, by userID: UUID, at date: Date = Date()) -> Memory {
        commit(steps: memory.steps, title: title, to: memory, by: userID, note: "Renamed", at: date)
    }

    /// Restores the steps and title of an earlier version as a new version (history is preserved).
    public static func revert(_ memory: Memory, to version: Int, by userID: UUID, at date: Date = Date()) throws -> Memory {
        guard let snapshot = memory.versionHistory.first(where: { $0.version == version }) else {
            throw Error.versionNotFound(version)
        }
        return commit(steps: snapshot.steps, title: snapshot.title, to: memory, by: userID, note: "Reverted to version \(version)", at: date)
    }

    /// Records that the user confirmed the memory is still accurate. Not a new version.
    public static func confirmAccurate(_ memory: Memory, at date: Date = Date()) -> Memory {
        var confirmed = memory
        confirmed.lastConfirmedAt = date
        return confirmed
    }

    private static func commit(steps: [Step], title: String, to memory: Memory, by userID: UUID, note: String, at date: Date) -> Memory {
        var updated = memory
        updated.versionHistory.append(MemoryVersion(
            version: memory.version,
            steps: memory.steps,
            title: memory.title,
            editedBy: userID,
            editedAt: date,
            note: note
        ))
        updated.version = memory.version + 1
        updated.steps = steps
        updated.title = title
        updated.duration = memory.duration
        return updated
    }
}
