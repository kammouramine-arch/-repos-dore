// swift-tools-version: 6.0
// Type-checks and tests the app's Apple-free logic on Linux against DoOnceCore.
// `./sync.sh` links the files in; see README.md. Not shipped.
import PackageDescription

let package = Package(
    name: "LinuxTypecheck",
    platforms: [.macOS(.v14)],
    dependencies: [.package(path: "../DoOnceCore")],
    targets: [
        .target(name: "AppLogic", dependencies: ["DoOnceCore"], swiftSettings: [.swiftLanguageMode(.v5)]),
        .testTarget(name: "AppLogicTests", dependencies: ["AppLogic", "DoOnceCore"], swiftSettings: [.swiftLanguageMode(.v5)]),
    ]
)
