import Foundation

/// A specific thing the user owns: *their* Vaillant boiler, not "a boiler".
///
/// Objects are what Look recognises and what memories attach to.
public struct PhysicalObject: Codable, Identifiable, Hashable, Sendable {
    public var id: UUID
    public var householdID: UUID
    /// What the user calls it: "Boiler", "Espresso machine".
    public var name: String
    /// Generic category used for suggestions when the exact object is not recognised.
    public var category: String
    public var brand: String?
    public var model: String?
    public var images: [MediaRef]
    /// Visual embeddings of this object, one per reference image, used by `RecognitionMatcher`.
    public var visualEmbeddings: [Embedding]
    public var spaceID: UUID?
    /// Free-form facts shown on the object page: "Installed", "Serial", "Warranty"...
    public var metadata: [String: String]
    public var serviceContacts: [ServiceContact]
    public var createdAt: Date
    public var lastUsedAt: Date?

    public init(
        id: UUID = UUID(),
        householdID: UUID,
        name: String,
        category: String,
        brand: String? = nil,
        model: String? = nil,
        images: [MediaRef] = [],
        visualEmbeddings: [Embedding] = [],
        spaceID: UUID? = nil,
        metadata: [String: String] = [:],
        serviceContacts: [ServiceContact] = [],
        createdAt: Date = Date(),
        lastUsedAt: Date? = nil
    ) {
        self.id = id
        self.householdID = householdID
        self.name = name
        self.category = category
        self.brand = brand
        self.model = model
        self.images = images
        self.visualEmbeddings = visualEmbeddings
        self.spaceID = spaceID
        self.metadata = metadata
        self.serviceContacts = serviceContacts
        self.createdAt = createdAt
        self.lastUsedAt = lastUsedAt
    }

    /// "Vaillant ecoTEC Plus" when brand and model are known, otherwise the name.
    public var makeAndModel: String {
        let parts = [brand, model].compactMap { $0 }
        return parts.isEmpty ? name : parts.joined(separator: " ")
    }
}

/// Someone who services an object: the plumber for the boiler, the garage for the car.
public struct ServiceContact: Codable, Identifiable, Hashable, Sendable {
    public var id: UUID
    /// The `Person` this contact refers to, when they also taught a memory.
    public var personID: UUID?
    public var name: String
    public var role: String
    public var phone: String?
    public var email: String?
    public var lastServiceAt: Date?

    public init(
        id: UUID = UUID(),
        personID: UUID? = nil,
        name: String,
        role: String,
        phone: String? = nil,
        email: String? = nil,
        lastServiceAt: Date? = nil
    ) {
        self.id = id
        self.personID = personID
        self.name = name
        self.role = role
        self.phone = phone
        self.email = email
        self.lastServiceAt = lastServiceAt
    }
}
