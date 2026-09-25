import Foundation

/// What the generator needs to know besides the recording.
public struct GenerationContext: Hashable, Sendable {
    public var householdID: UUID
    public var creatorID: UUID
    public var objectID: UUID?
    public var spaceID: UUID?
    public var demonstratorID: UUID?
    /// A title the user typed, if any. Otherwise one is derived.
    public var preferredTitle: String?

    public init(
        householdID: UUID,
        creatorID: UUID,
        objectID: UUID? = nil,
        spaceID: UUID? = nil,
        demonstratorID: UUID? = nil,
        preferredTitle: String? = nil
    ) {
        self.householdID = householdID
        self.creatorID = creatorID
        self.objectID = objectID
        self.spaceID = spaceID
        self.demonstratorID = demonstratorID
        self.preferredTitle = preferredTitle
    }
}

/// Builds a `Memory` from a recording, its transcript and analysis.
///
/// Implementations must keep provenance on every step and never add steps the recording
/// does not support. See `ProcedureAssembler`.
public protocol ProcedureGenerationService: Sendable {
    func generateMemory(from recording: Recording, transcript: Transcript, analysis: Analysis?, context: GenerationContext) async throws -> Memory
}
