import DoOnceCore
import Foundation
import Security

/// The device session in the Keychain: one generic-password item under service
/// `app.doonce.session`, readable after the first unlock so a background relaunch (upload
/// completion, Live Activity) can still present the token.
///
/// Why the Keychain and not `FileSessionStore`: the session carries the Apple identity token,
/// and the Keychain is the one place iOS keeps secrets encrypted at rest and out of backups
/// made to another device (`ThisDeviceOnly`).
struct KeychainSessionStore: SessionStore {
    static let service = "app.doonce.session"
    static let account = "session"

    enum Failure: Error { case status(OSStatus) }

    func load() async throws -> AuthSession? {
        var query = Self.baseQuery()
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        switch status {
        case errSecSuccess:
            guard let data = item as? Data else { return nil }
            return try StoreCoding.decoder().decode(AuthSession.self, from: data)
        case errSecItemNotFound:
            return nil
        default:
            throw Failure.status(status)
        }
    }

    func save(_ session: AuthSession) async throws {
        let data = try StoreCoding.encoder().encode(session)
        let attributes: [String: Any] = [
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
        ]
        let update = SecItemUpdate(Self.baseQuery() as CFDictionary, attributes as CFDictionary)
        if update == errSecItemNotFound {
            var add = Self.baseQuery()
            attributes.forEach { add[$0.key] = $0.value }
            let status = SecItemAdd(add as CFDictionary, nil)
            guard status == errSecSuccess else { throw Failure.status(status) }
        } else if update != errSecSuccess {
            throw Failure.status(update)
        }
    }

    func clear() async throws {
        let status = SecItemDelete(Self.baseQuery() as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else { throw Failure.status(status) }
    }

    private static func baseQuery() -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
    }
}
