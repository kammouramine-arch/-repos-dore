import SwiftUI
import Observation
import DoOnceCore

/// App-wide state and service container. One instance, injected through the environment.
///
/// Everything persistent goes through one `FileStore` (`Application Support/DoOnce/store`) in
/// both service modes, so a household survives relaunches whether the services around it are
/// live or demo. `ServiceConfiguration` (Info.plist / environment) decides the rest of the
/// wiring in `init`; `serviceStatus` reports that choice honestly to Settings. Views read the
/// `snapshot` read model and write through `save(_:)`, which refreshes it.
@MainActor
@Observable
final class AppState {
    // MARK: Lifecycle
    enum Phase: Equatable { case launching, onboarding, auth, firstRun, main }
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
    /// True once the store, the identity and the session have been loaded.
    private(set) var isBootstrapped = false
    private var launchFinished = false

    // MARK: Configuration
    let configuration: ServiceConfiguration
    let directories: AppDirectories
    let media: MediaLibrary
    /// What each service is really doing on this build, for Settings → Services.
    let serviceStatus: [ServiceStatusEntry]

    // MARK: Identity
    private(set) var currentUser: User
    private(set) var household: Household
    /// The device's sign-in. Nil in live mode means the auth page.
    private(set) var session: AuthSession?
    var needsSignIn: Bool { configuration.isLive && session == nil }

    // MARK: Snapshot cache (read model for views; the store is the source of truth)
    private(set) var snapshot: MemoryStoreSnapshot
    var objects: [PhysicalObject] { snapshot.objects }
    /// Memories the user has remembered. Drafts (generated, not yet reviewed) are kept out.
    var memories: [Memory] { snapshot.memories.filter { !$0.isDraft } }
    var people: [Person] { snapshot.people }
    var spaces: [Space] { snapshot.spaces }
    var progress: [MemoryProgress] { snapshot.progress }
    /// Recordings still on their way to a memory (see `PendingProcessingSection`).
    private(set) var pendingJobs: [ProcessingJob] = []

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
        var auth: AuthService
        var analytics: Analytics
    }
    let services: Services
    let progressStore: any ProgressStore
    let jobs: any ProcessingJobStore
    let sessionStore: any SessionStore
    let haptics = HapticsService.shared
    private let store: FileStore

    init(
        configuration: ServiceConfiguration = .resolve(environment: ProcessInfo.processInfo.environment, info: Bundle.main.infoDictionary ?? [:]),
        directories requested: AppDirectories = .default
    ) {
        self.configuration = configuration

        // Directories and the store. A phone whose Application Support cannot be written is
        // broken in ways this app cannot fix; it still runs, on a temporary directory, and says so.
        var directories = requested
        var onDisk = true
        if (try? directories.prepare()) == nil {
            directories = .temporary()
            try? directories.prepare()
            onDisk = false
        }
        var opened: FileStore?
        for candidate in [directories, AppDirectories.temporary()] {
            try? candidate.prepare()
            if let store = try? FileStore(directory: candidate.store) {
                opened = store
                if candidate.root != directories.root { directories = candidate; onDisk = false }
                break
            }
        }
        guard let store = opened else { fatalError("DoOnce cannot open a store directory, even a temporary one") }
        self.store = store
        self.directories = directories
        RecordingFiles.directories = directories
        media = directories.library
        snapshot = MemoryStoreSnapshot()
        currentUser = User(displayName: "You")
        household = Household(name: "Home")
        progressStore = store
        jobs = store

        let sessions: any SessionStore = configuration.isLive ? KeychainSessionStore() : FileSessionStore(directory: directories.session)
        sessionStore = sessions

        if configuration.isLive {
            let generation: ProcedureGenerationService
            if let gateway = configuration.gatewayURL {
                let analysis = GatewayProcedureAnalysisService(baseURL: gateway, transport: URLSessionTransport(), credentials: SessionCredentials(store: sessions))
                generation = AnalysisBackedGenerationService(analysis: analysis)
            } else {
                // Never the deterministic assembler behind a live label: Teach fails at
                // "Understanding" with `GatewayError.notConfigured` instead.
                generation = AnalysisBackedGenerationService(analysis: UnconfiguredProcedureAnalysisService())
            }
            services = Services(
                memories: store, objects: store, people: store, spaces: store, recordings: store,
                transcription: SpeechTranscriptionService(),
                generation: generation,
                recognition: VisionRecognitionService(),
                subscription: StoreKitSubscriptionService(productIDs: configuration.subscriptionProductIDs),
                auth: AppleSignInService(sessions: sessions, gatewayURL: configuration.gatewayURL),
                analytics: InMemoryAnalytics()
            )
        } else {
            services = Services(
                memories: store, objects: store, people: store, spaces: store, recordings: store,
                transcription: MockTranscriptionService(),
                generation: AnalysisBackedGenerationService(analysis: DeterministicProcedureAnalysisService()),
                recognition: MockObjectRecognitionService(),
                subscription: MockSubscriptionService(tier: .free),
                auth: MockAuthService(),
                analytics: InMemoryAnalytics()
            )
        }
        serviceStatus = ServiceStatusEntry.table(for: configuration, storageOnDisk: onDisk)
    }

    // MARK: Bootstrap

    /// Seeds sample content (demo mode, empty store only), restores the session, loads who the
    /// user is and fills the read model. Called once from `RootView`; safe to call again.
    func bootstrap() async {
        guard !isBootstrapped else { return }
        if !configuration.isLive, configuration.sampleContent {
            _ = try? await store.seedIfEmpty(SampleData.snapshot)
        }
        await restoreSession()
        await loadIdentity()
        await refresh()
        isBootstrapped = true
        enterIfReady()
    }

    /// The launch animation is over; enter the app once the store is loaded too.
    func finishLaunch() {
        launchCount += 1
        launchFinished = true
        enterIfReady()
    }

    private func enterIfReady() {
        guard isBootstrapped, launchFinished, phase == .launching else { return }
        withDSAnimation(DSMotion.gentle) { phase = phaseAfterLaunch }
    }

    /// Where a launch lands: onboarding, the auth page (live mode without a session), the first
    /// run, or the shell.
    var phaseAfterLaunch: Phase {
        if !isOnboarded { return .onboarding }
        if needsSignIn { return .auth }
        return hasSavedFirstMemory ? .main : .firstRun
    }

    private func restoreSession() async {
        if let apple = services.auth as? AppleSignInService {
            session = await apple.restoreSession()
        } else {
            session = try? await sessionStore.load()
        }
    }

    /// The account holder and household from the store, created on first use. With a session,
    /// the user record follows it (same id, or the same provider id from an earlier install).
    private func loadIdentity() async {
        let users = await store.users()
        var user: User
        if let session {
            user = users.first { $0.id == session.userID }
                ?? users.first { $0.appleUserID == session.providerUserID }
                ?? User(id: session.userID, displayName: session.displayName, email: session.email, appleUserID: session.provider == "apple" ? session.providerUserID : nil)
            if !session.displayName.isEmpty, session.displayName != "You" { user.displayName = session.displayName }
            if let email = session.email { user.email = email }
        } else {
            user = users.first ?? User(displayName: "You")
        }
        if !users.contains(user) { try? await store.save(user) }
        currentUser = user

        let households = await store.households()
        var home = households.first ?? Household(name: "Home")
        if home.role(of: user.id) == nil {
            home.members.append(HouseholdMember(userID: user.id, role: households.isEmpty ? .owner : .member))
        }
        if !households.contains(home) { try? await store.save(home) }
        household = home
    }

    // MARK: Auth

    /// A session was established (Apple, email or demo); the store's user follows it.
    func didSignIn(_ session: AuthSession) async {
        self.session = session
        try? await sessionStore.save(session)
        await loadIdentity()
        await refresh()
    }

    /// Demo mode: the mock accepts anything and a session is written so relaunches remember it.
    func signInDemo(displayName: String?) async throws {
        let user = try await services.auth.signInWithApple(identityToken: "demo", displayName: displayName)
        await didSignIn(AuthSession(userID: user.id, provider: "demo", providerUserID: user.appleUserID ?? user.id.uuidString, displayName: user.displayName, email: user.email))
    }

    func signOut() async {
        await services.auth.signOut()
        try? await sessionStore.clear()
        session = nil
    }

    /// Deletes the account through the auth service, then signs out locally. Throws
    /// `GatewayError.notConfigured` (live, no gateway) or `AuthError.unsupported` (demo).
    func deleteAccount() async throws {
        try await services.auth.deleteAccount()
        await signOut()
    }

    // MARK: Queries
    func object(_ id: UUID?) -> PhysicalObject? { id.flatMap { snapshot.object(id: $0) } }
    func person(_ id: UUID?) -> Person? { id.flatMap { snapshot.person(id: $0) } }
    func space(_ id: UUID?) -> Space? { id.flatMap { snapshot.space(id: $0) } }
    /// Any memory by id, drafts included (Review and See original need the draft).
    func memory(_ id: UUID) -> Memory? { snapshot.memory(id: id) }
    func memories(for object: PhysicalObject) -> [Memory] { memories.filter { $0.objectID == object.id } }
    func memories(taughtBy person: Person) -> [Memory] { memories.filter { $0.demonstratorID == person.id } }
    func objects(in space: Space) -> [PhysicalObject] { objects.filter { $0.spaceID == space.id } }
    var inProgress: (memory: Memory, progress: MemoryProgress)? {
        guard let p = progress.sorted(by: { $0.lastActiveAt > $1.lastActiveAt }).first, let m = memory(p.memoryID), !m.isDraft else { return nil }
        return (m, p)
    }

    // MARK: Mutations (write through the repository, then refresh the read model)
    func save(_ memory: Memory) async throws {
        try await services.memories.save(memory)
        await refresh()
        guard !memory.isDraft else { return }
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

    /// Review's "Remember": the draft becomes a real memory and its processing job is over.
    func remember(_ draft: Memory) async throws {
        var memory = draft
        memory.tags.removeAll { $0 == Memory.draftTag }
        try await save(memory)
        if let recordingID = memory.sourceRecordingID {
            try? await jobs.deleteJob(id: recordingID)
            await refresh()
        }
    }

    func setProgress(_ p: MemoryProgress) {
        snapshot.progress.removeAll { $0.memoryID == p.memoryID }
        snapshot.progress.append(p)
        let store = progressStore
        Task { try? await store.setProgress(p) }
    }
    func clearProgress(memoryID: UUID) {
        snapshot.progress.removeAll { $0.memoryID == memoryID }
        let store = progressStore
        Task { try? await store.clearProgress(memoryID: memoryID) }
    }

    func refresh() async {
        do {
            snapshot.memories = try await services.memories.allMemories()
            snapshot.objects = try await services.objects.allObjects()
            snapshot.people = try await services.people.allPeople()
            snapshot.spaces = try await services.spaces.allSpaces()
            snapshot.progress = try await progressStore.allProgress()
            pendingJobs = try await jobs.allJobs().filter { $0.stage != .done }.sorted { $0.updatedAt > $1.updatedAt }
        } catch {
            // Read model keeps its last good state; the failure is surfaced by the caller.
        }
    }

    /// Free tier: 5 memories. Returns false (and the caller shows the paywall) when the gate is closed.
    func canCreateMemory() async -> Bool {
        await services.subscription.canCreateMemory(existingCount: memories.count).isAllowed
    }
}

extension Memory {
    /// Tag carried by a memory the pipeline generated but the user has not reviewed yet.
    static let draftTag = "draft"
    var isDraft: Bool { tags.contains(Self.draftTag) }
}
