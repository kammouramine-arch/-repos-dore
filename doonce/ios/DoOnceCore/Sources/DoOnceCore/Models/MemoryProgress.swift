import Foundation

/// Where a user got to in a memory they started in Do mode ("2 of 7 steps done").
public struct MemoryProgress: Codable, Identifiable, Hashable, Sendable {
    public var id: UUID
    public var memoryID: UUID
    public var userID: UUID
    /// Orders of the steps completed so far.
    public var completedStepOrders: Set<Int>
    public var totalSteps: Int
    public var lastActiveAt: Date

    public init(
        id: UUID = UUID(),
        memoryID: UUID,
        userID: UUID,
        completedStepOrders: Set<Int>,
        totalSteps: Int,
        lastActiveAt: Date = Date()
    ) {
        self.id = id
        self.memoryID = memoryID
        self.userID = userID
        self.completedStepOrders = completedStepOrders
        self.totalSteps = totalSteps
        self.lastActiveAt = lastActiveAt
    }

    public var completedCount: Int { completedStepOrders.count }
    public var isComplete: Bool { completedCount >= totalSteps }

    /// The first step not yet done, 1-based.
    public var nextStepOrder: Int {
        (1...max(totalSteps, 1)).first { !completedStepOrders.contains($0) } ?? totalSteps
    }
}
