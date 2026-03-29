// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "ConceptMCP",
    platforms: [.macOS(.v14)],
    targets: [
        .target(
            name: "ConceptMCP",
            path: "Sources/ConceptMCP"
        ),
        .executableTarget(
            name: "ConceptMCPMain",
            dependencies: ["ConceptMCP"],
            path: "Sources/ConceptMCPMain"
        ),
        .testTarget(
            name: "ConceptMCPTests",
            dependencies: ["ConceptMCP"],
            path: "Tests/ConceptMCPTests"
        ),
    ]
)
