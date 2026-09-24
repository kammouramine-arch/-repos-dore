import SwiftUI
import Observation
import DoOnceCore

/// App-wide state and service container. One instance, injected through the environment.
///
/// Repositories are DoOnceCore actors seeded from `SampleData` when `DOONCE_SAMPLE_CONTENT=1`
/// (the default scheme), so the app runs end to end without a backend. Swap the services in
/// `Services` for real implementations without touching features.
@MainActor
@Observable
final class AppState {
    // MARK: Lifecycle
    enum Phase: Equatable { case launching, onboarding, firstRun, main }
    var phase: Phase = .launching
    var isOnboarded: Bool {
        get { UserDefaults.standard.bool(forKey: "onboarded") }
        set { UserDefaults.standard.set(newValue, forKey: "onboarded") }
    }
    var hasSavedFirstMemory: Bool {
        get { UserDefaults.standard.bool(forKey: "firstMemorySaved") }
        set { UserDefaults.standard.set(newValue, forKey: "firstMemorySaved") }
    }
    var launchCount: Int {
        get { UserDefaults.standard.integer(forKey: "launchCount") }
        set { UserDefaults.standard.set(newValue, forKey: "launchCount") }
    }

    // MARK: Identity
    let currentUser: User
    let household: Household

    // MARK: Snapshot cache (read model for views; repositories are the source of truth)
    private(set) var snapshot: MemoryStoreSnapshot
    var objects: [PhysicalObject] { snapshot.objects }
    var memories: [Memory] { snapshot.memories }
    var people: [Person] { snapshot.people }
    var spaces: [Space] { snapshot.spaces }
    var progress: [MemoryProgress] { snapshot.progress }

    // MARK: Preferences
    var handsFreeDefault = false
    var soundsEnabled = true
    var isOffline = false

    // MARK: Services
    struct Services {
        var memories: MemoryRepository
        var objects: ObjectRepository
        var people: PersonRepository
        var spaces: SpaceRepository
        var recordings: RecordingStore
        var transcription: TranscriptionService
        var generation: ProcedureGenerationService
        var recognition: ObjectRecognitionService
        var subscription: SubscriptionService
        var analytics: Analytics
    }
    let services: Services
    let haptics = HapticsService.shared

    init(sample: Bool = ProcessInfo.processInfo.environment["DOONCE_SAMPLE_CONTENT"] != "0") {
        let seed = sample ? SampleData.snapshot : MemoryStoreSnapshot()
        snapshot = seed
        currentUser = seed.users.first ?? User(displayName: "You")
        household = seed.households.first ?? Household(name: "Home")
        services = Services(
            memories: InMemoryMemoryRepository(initial: seed.memories),
            objects: InMemoryObjectRepository(initial: seed.objects),
            people: InMemoryPersonRepository(initial: seed.people),
            spaces: InMemorySpaceRepository(initial: seed.spaces),
            recordings: InMemoryRecordingStore(initial: seed.recordings),
            transcription: MockTranscriptionService(),
            generation: MockProcedureGenerationService(),
            recognition: MockObjectRecognitionService(),
            subscription: MockSubscriptionService(tier: .free),
            analytics: InMemoryAnalytics()
        )
    }

    // MARK: Queries
    func object(_ id: UUID?) -> PhysicalObject? { id.flatMap { snapshot.object(id: $0) } }
    func person(_ id: UUID?) -> Person? { id.flatMap { snapshot.person(id: $0) } }
    func space(_ id: UUID?) -> Space? { id.flatMap { snapshot.space(id: $0) } }
    func memory(_ id: UUID) -> Memory? { snapshot.memory(id: id) }
    func memories(for object: PhysicalObject) -> [Memory] { snapshot.memories(forObject: object.id) }
    func memories(taughtBy person: Person) -> [Memory] { memories.filter { $0.demonstratorID == person.id } }
    func objects(in space: Space) -> [PhysicalObject] { objects.filter { $0.spaceID == space.id } }
    var inProgress: (memory: Memory, progress: MemoryProgress)? {
        guard let p = progress.sorted(by: { $0.lastActiveAt > $1.lastActiveAt }).first, let m = memory(p.memoryID) else { return nil }
        return (m, p)
    }

    // MARK: Mutations (write through the repository, then refresh the read model)
    func save(_ memory: Memory) async throws {
        try await services.memories.save(memory)
        await refresh()
        hasSavedFirstMemory = true
        if memories.count == 1 { await services.analytics.track(.firstMemory) }
    }
    func save(_ object: PhysicalObject) async throws {
        try await services.objects.save(object)
        await refresh()
    }
    func save(_ person: Person) async throws {
        try await services.people.save(person)
        await refresh()
    }
    func setProgress(_ p: MemoryProgress) {
        snapshot.progress.removeAll { $0.memoryID == p.memoryID }
        snapshot.progress.append(p)
    }
    func clearProgress(memoryID: UUID) { snapshot.progress.removeAll { $0.memoryID == memoryID } }

    func refresh() async {
        do {
            snapshot.memories = try await services.memories.allMemories()
            snapshot.objects = try await services.objects.allObjects()
            snapshot.people = try await services.people.allPeople()
            snapshot.spaces = try await services.spaces.allSpaces()
        } catch {
            // Read model keeps its last good state; the failure is surfaced by the caller.
        }
    }

    /// Free tier: 5 memories. Returns false (and the caller shows the paywall) when the gate is closed.
    func canCreateMemory() async -> Bool {
        await services.subscription.canCreateMemory(existingCount: memories.count).isAllowed
    }
}
