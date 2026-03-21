// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "ConceptMCP",
    platforms: [.macOS(.v14)],
    targets: [
        .executableTarget(
            name: "ConceptMCP",
            path: "Sources/ConceptMCP"
        )
    ]
)
