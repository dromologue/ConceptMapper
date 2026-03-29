import XCTest
@testable import ConceptMCP

final class PathValidationTests: XCTestCase {

    func testRelativePathResolvesWithinDir() throws {
        let tmpDir = NSTemporaryDirectory() + "concept-mcp-test-\(UUID().uuidString)"
        try FileManager.default.createDirectory(atPath: tmpDir, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(atPath: tmpDir) }

        let config = MCPConfig(mapsDir: tmpDir, templatesDir: tmpDir)
        let resolved = try config.resolvePath("test-map", ext: ".cm", dir: tmpDir)
        XCTAssertTrue(resolved.hasPrefix(tmpDir))
        XCTAssertTrue(resolved.hasSuffix("test-map.cm"))
    }

    func testPathTraversalRejected() throws {
        let tmpDir = NSTemporaryDirectory() + "concept-mcp-test-\(UUID().uuidString)"
        try FileManager.default.createDirectory(atPath: tmpDir, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(atPath: tmpDir) }

        let config = MCPConfig(mapsDir: tmpDir, templatesDir: tmpDir)

        XCTAssertThrowsError(
            try config.resolvePath("../../../etc/passwd", ext: ".cm", dir: tmpDir)
        ) { error in
            let nsError = error as NSError
            XCTAssertEqual(nsError.code, 403)
        }
    }

    func testAbsolutePathOutsideDirRejected() throws {
        let tmpDir = NSTemporaryDirectory() + "concept-mcp-test-\(UUID().uuidString)"
        try FileManager.default.createDirectory(atPath: tmpDir, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(atPath: tmpDir) }

        let config = MCPConfig(mapsDir: tmpDir, templatesDir: tmpDir)

        XCTAssertThrowsError(
            try config.resolvePath("/etc/passwd", ext: ".cm", dir: tmpDir)
        )
    }

    func testExtensionAppendedWhenMissing() throws {
        let tmpDir = NSTemporaryDirectory() + "concept-mcp-test-\(UUID().uuidString)"
        try FileManager.default.createDirectory(atPath: tmpDir, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(atPath: tmpDir) }

        let config = MCPConfig(mapsDir: tmpDir, templatesDir: tmpDir)
        let resolved = try config.resolvePath("mymap", ext: ".cm", dir: tmpDir)
        XCTAssertTrue(resolved.hasSuffix(".cm"))
    }

    func testExtensionNotDuplicated() throws {
        let tmpDir = NSTemporaryDirectory() + "concept-mcp-test-\(UUID().uuidString)"
        try FileManager.default.createDirectory(atPath: tmpDir, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(atPath: tmpDir) }

        let config = MCPConfig(mapsDir: tmpDir, templatesDir: tmpDir)
        let resolved = try config.resolvePath("mymap.cm", ext: ".cm", dir: tmpDir)
        XCTAssertFalse(resolved.hasSuffix(".cm.cm"))
    }

    func testResolveMapPathUsesMapDir() throws {
        let tmpMaps = NSTemporaryDirectory() + "concept-mcp-maps-\(UUID().uuidString)"
        let tmpTemplates = NSTemporaryDirectory() + "concept-mcp-tmpl-\(UUID().uuidString)"
        try FileManager.default.createDirectory(atPath: tmpMaps, withIntermediateDirectories: true)
        try FileManager.default.createDirectory(atPath: tmpTemplates, withIntermediateDirectories: true)
        defer {
            try? FileManager.default.removeItem(atPath: tmpMaps)
            try? FileManager.default.removeItem(atPath: tmpTemplates)
        }

        let config = MCPConfig(mapsDir: tmpMaps, templatesDir: tmpTemplates)
        let resolved = try config.resolveMapPath("test")
        XCTAssertTrue(resolved.hasPrefix(tmpMaps))
    }
}
