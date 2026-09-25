import Foundation

/// A realistic household to seed previews, demos and tests.
///
/// Amine and Alex share "Home". The boiler in the utility room was serviced by Julien the plumber,
/// Dad has opinions about the espresso machine, and a cleaning memory is half done.
public enum SampleData {
    public static let snapshot = MemoryStoreSnapshot(
        users: users,
        households: [household],
        spaces: spaces,
        objects: objects,
        people: people,
        memories: memories,
        recordings: [boilerRecording],
        progress: [espressoProgress],
        exportedAt: SampleDates.date(2026, 9, 24)
    )

    // MARK: Users and household

    public static let users = [
        User(id: SampleIDs.amine, displayName: "Amine", email: "amine@example.com", createdAt: SampleDates.date(2025, 6, 1)),
        User(id: SampleIDs.alex, displayName: "Alex", email: "alex@example.com", createdAt: SampleDates.date(2025, 6, 3)),
    ]

    public static let household = Household(
        id: SampleIDs.household,
        name: "Home",
        members: [
            HouseholdMember(userID: SampleIDs.amine, role: .owner, joinedAt: SampleDates.date(2025, 6, 1)),
            HouseholdMember(userID: SampleIDs.alex, role: .member, joinedAt: SampleDates.date(2025, 6, 3)),
        ],
        createdAt: SampleDates.date(2025, 6, 1)
    )

    // MARK: Spaces

    public static let spaces = [
        Space(id: SampleIDs.kitchen, householdID: SampleIDs.household, name: "Kitchen", createdAt: SampleDates.date(2025, 6, 1)),
        Space(id: SampleIDs.utilityRoom, householdID: SampleIDs.household, name: "Utility room", createdAt: SampleDates.date(2025, 6, 1)),
        Space(id: SampleIDs.garage, householdID: SampleIDs.household, name: "Garage", createdAt: SampleDates.date(2025, 6, 2)),
    ]

    // MARK: People

    public static let people = [
        Person(id: SampleIDs.dad, householdID: SampleIDs.household, displayName: "Dad", relationship: "Father", createdAt: SampleDates.date(2025, 7, 20)),
        Person(
            id: SampleIDs.julien,
            householdID: SampleIDs.household,
            displayName: "Julien Martin",
            relationship: "Plumber",
            contact: ContactDetails(phone: "+33 6 12 34 56 78", email: "julien@martin-plomberie.fr", company: "Martin Plomberie"),
            createdAt: SampleDates.date(2026, 3, 18)
        ),
        Person(id: SampleIDs.me, householdID: SampleIDs.household, displayName: "Me", relationship: nil, isSelf: true, userID: SampleIDs.amine, createdAt: SampleDates.date(2025, 6, 1)),
        Person(id: SampleIDs.alexPerson, householdID: SampleIDs.household, displayName: "Alex", relationship: "Partner", userID: SampleIDs.alex, createdAt: SampleDates.date(2025, 6, 3)),
    ]

    // MARK: Objects

    public static let objects = [
        PhysicalObject(
            id: SampleIDs.boiler,
            householdID: SampleIDs.household,
            name: "Boiler",
            category: "Boiler",
            brand: "Vaillant",
            model: "ecoTEC Plus 832",
            images: [image("boiler-front"), image("boiler-gauge")],
            visualEmbeddings: [SampleEmbeddings.boilerFront, SampleEmbeddings.boilerGauge],
            spaceID: SampleIDs.utilityRoom,
            metadata: ["Installed": "October 2019", "Serial": "21182300100345678", "Warranty": "Until March 2027"],
            serviceContacts: [
                ServiceContact(personID: SampleIDs.julien, name: "Julien Martin", role: "Plumber", phone: "+33 6 12 34 56 78", email: "julien@martin-plomberie.fr", lastServiceAt: SampleDates.date(2026, 3, 18)),
            ],
            createdAt: SampleDates.date(2025, 11, 12),
            lastUsedAt: SampleDates.date(2026, 9, 20)
        ),
        PhysicalObject(
            id: SampleIDs.espressoMachine,
            householdID: SampleIDs.household,
            name: "Espresso machine",
            category: "Espresso machine",
            brand: "La Marzocco",
            model: "Linea Mini",
            images: [image("linea-mini")],
            visualEmbeddings: [SampleEmbeddings.espressoMachine],
            spaceID: SampleIDs.kitchen,
            metadata: ["Installed": "September 2024", "Serial": "LM-MINI-2024-4471"],
            createdAt: SampleDates.date(2025, 6, 2),
            lastUsedAt: SampleDates.date(2026, 9, 23)
        ),
        PhysicalObject(
            id: SampleIDs.thermostat,
            householdID: SampleIDs.household,
            name: "Thermostat",
            category: "Thermostat",
            brand: "Google Nest",
            model: "Learning Thermostat, 3rd gen",
            images: [image("nest")],
            visualEmbeddings: [SampleEmbeddings.thermostat],
            spaceID: SampleIDs.kitchen,
            createdAt: SampleDates.date(2025, 7, 20)
        ),
        PhysicalObject(
            id: SampleIDs.washingMachine,
            householdID: SampleIDs.household,
            name: "Washing machine",
            category: "Washing machine",
            brand: "Bosch",
            model: "Serie 6",
            images: [image("washing-machine")],
            visualEmbeddings: [SampleEmbeddings.washingMachine],
            spaceID: SampleIDs.utilityRoom,
            createdAt: SampleDates.date(2025, 10, 8)
        ),
        PhysicalObject(
            id: SampleIDs.router,
            householdID: SampleIDs.household,
            name: "Router",
            category: "Router",
            brand: "Netgear",
            model: "Orbi RBK752",
            images: [image("router")],
            visualEmbeddings: [SampleEmbeddings.router],
            spaceID: SampleIDs.kitchen,
            createdAt: SampleDates.date(2026, 6, 2)
        ),
        PhysicalObject(
            id: SampleIDs.car,
            householdID: SampleIDs.household,
            name: "Car",
            category: "Car",
            brand: "Peugeot",
            model: "3008",
            images: [image("car")],
            visualEmbeddings: [SampleEmbeddings.car],
            spaceID: SampleIDs.garage,
            metadata: ["Registration": "GH-482-KL", "Next service": "January 2027"],
            createdAt: SampleDates.date(2025, 9, 14)
        ),
    ]

    // MARK: Memories

    public static let memories: [Memory] =
        SampleMemories.boiler + SampleMemories.espressoMachine + SampleMemories.aroundTheHouse

    /// "Clean espresso machine", 2 of 7 steps done.
    public static let espressoProgress = MemoryProgress(
        id: SampleIDs.espressoProgress,
        memoryID: SampleIDs.cleanEspressoMachine,
        userID: SampleIDs.amine,
        completedStepOrders: [1, 2],
        totalSteps: 7,
        lastActiveAt: SampleDates.date(2026, 9, 23, 18, 40)
    )

    // MARK: Recordings

    /// Julien's recording, already uploaded, with transcript and analysis attached.
    public static let boilerRecording = Recording(
        id: SampleIDs.boilerRecording,
        householdID: SampleIDs.household,
        localURL: recordingURL("boiler-repressurise.mov"),
        byteCount: 187_432_960,
        duration: 118,
        recordedAt: SampleDates.date(2026, 3, 18, 14, 12),
        uploadState: .uploaded(remoteURL: URL(string: "https://media.doonce.app/recordings/\(SampleIDs.boilerRecording.uuidString)")!),
        transcript: SampleTranscripts.boilerRepressurise,
        analysis: SampleTranscripts.boilerRepressuriseAnalysis,
        userMarkers: [35.0]
    )

    // MARK: Helpers

    static func image(_ name: String) -> MediaRef {
        MediaRef(kind: .image, localURL: URL(string: "file:///var/mobile/Containers/Data/Application/DoOnce/Images/\(name).jpg")!)
    }

    static func recordingURL(_ name: String) -> URL {
        URL(string: "file:///var/mobile/Containers/Data/Application/DoOnce/Recordings/\(name)")!
    }

    /// A key frame from the boiler recording at a given second.
    static func frame(_ recording: String, at seconds: TimeInterval) -> MediaRef {
        MediaRef(kind: .image, localURL: URL(string: "file:///var/mobile/Containers/Data/Application/DoOnce/Frames/\(recording)/\(Int(seconds)).jpg")!, sourceOffset: seconds)
    }

    /// A clip cut from a recording.
    static func clip(_ recording: String, _ range: ClosedRange<TimeInterval>) -> MediaRef {
        MediaRef(
            kind: .video,
            localURL: URL(string: "file:///var/mobile/Containers/Data/Application/DoOnce/Clips/\(recording)/\(Int(range.lowerBound))-\(Int(range.upperBound)).mov")!,
            sourceOffset: range.lowerBound,
            duration: range.upperBound - range.lowerBound
        )
    }
}
