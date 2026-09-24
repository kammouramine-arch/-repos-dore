// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "DoOnceCore",
    defaultLocalization: "en",
    platforms: [
        .iOS(.v17),
        .macOS(.v14),
    ],
    products: [
        .library(name: "DoOnceCore", targets: ["DoOnceCore"]),
    ],
    targets: [
        .target(
            name: "DoOnceCore",
            resources: [
                .copy("Resources/strings.json"),
            ],
            swiftSettings: [
                .swiftLanguageMode(.v6),
            ]
        ),
        .testTarget(
            name: "DoOnceCoreTests",
            dependencies: ["DoOnceCore"],
            swiftSettings: [
                .swiftLanguageMode(.v6),
            ]
        ),
    ]
)
