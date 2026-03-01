// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "Tau",
    platforms: [.macOS(.v13)],
    targets: [
        .executableTarget(
            name: "Tau",
            path: "Tau",
            exclude: ["Info.plist"]
        )
    ]
)
