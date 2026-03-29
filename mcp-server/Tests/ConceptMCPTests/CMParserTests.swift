import XCTest
@testable import ConceptMCP

final class CMParserTests: XCTestCase {

    // MARK: - Parse Tests

    func testParseTitleFromH1() {
        let input = "# My Concept Map\n\n## Concept Nodes\n"
        let map = parseCMFile(input)
        XCTAssertEqual(map.title, "My Concept Map")
    }

    func testParseNodeFromFencedBlock() {
        let input = """
        # Test

        ## Concept Nodes

        ```
        id: test1
        name: Test Node
        generation: 1
        stream: main
        notes: Some notes here
        ```
        """
        let map = parseCMFile(input)
        XCTAssertEqual(map.nodes.count, 1)
        XCTAssertEqual(map.nodes[0].id, "test1")
        XCTAssertEqual(map.nodes[0].name, "Test Node")
        XCTAssertEqual(map.nodes[0].nodeType, "concept")
        XCTAssertEqual(map.nodes[0].generation, 1)
        XCTAssertEqual(map.nodes[0].stream, "main")
        XCTAssertEqual(map.nodes[0].notes, "Some notes here")
    }

    func testParseMultipleNodes() {
        let input = """
        # Test

        ## Thinker Nodes

        ```
        id: a
        name: Alice
        ```

        ```
        id: b
        name: Bob
        ```
        """
        let map = parseCMFile(input)
        XCTAssertEqual(map.nodes.count, 2)
        XCTAssertEqual(map.nodes[0].id, "a")
        XCTAssertEqual(map.nodes[1].id, "b")
    }

    func testParseEdges() {
        let input = """
        # Test

        ## Edges

        ### Concept-to-Concept

        ```
        from: a    to: b    type: chain
          note: A leads to B
        ```
        """
        let map = parseCMFile(input)
        XCTAssertEqual(map.edges.count, 1)
        XCTAssertEqual(map.edges[0].from, "a")
        XCTAssertEqual(map.edges[0].to, "b")
        XCTAssertEqual(map.edges[0].edgeType, "chain")
    }

    func testParseEmptyDocument() {
        let map = parseCMFile("")
        XCTAssertNil(map.title)
        XCTAssertTrue(map.nodes.isEmpty)
        XCTAssertTrue(map.edges.isEmpty)
    }

    // MARK: - Round-trip Tests

    func testRoundTripPreservesNodes() {
        let input = """
        # Test Map

        ## Concept Nodes

        ```
        id: test1
        name: Test Node
        generation: 1
        stream: main
        ```
        """
        let map = parseCMFile(input)
        let output = writeCMFile(map)
        let reparsed = parseCMFile(output)
        XCTAssertEqual(reparsed.nodes.count, 1)
        XCTAssertEqual(reparsed.nodes[0].id, "test1")
        XCTAssertEqual(reparsed.nodes[0].name, "Test Node")
    }

    func testRoundTripPreservesEdges() {
        let input = """
        # Test

        ## Concept Nodes

        ```
        id: a
        name: A
        ```

        ```
        id: b
        name: B
        ```

        ## Edges

        ### Concept-to-Concept

        ```
        from: a    to: b    type: chain
        ```
        """
        let map = parseCMFile(input)
        let output = writeCMFile(map)
        let reparsed = parseCMFile(output)
        XCTAssertEqual(reparsed.edges.count, 1)
        XCTAssertEqual(reparsed.edges[0].from, "a")
        XCTAssertEqual(reparsed.edges[0].to, "b")
    }

    func testRoundTripPreservesTitle() {
        let input = "# My Map\n"
        let map = parseCMFile(input)
        let output = writeCMFile(map)
        let reparsed = parseCMFile(output)
        XCTAssertEqual(reparsed.title, "My Map")
    }

    // MARK: - Write Tests

    func testWriteProducesValidMarkdown() {
        let map = ConceptMap(
            title: "Test",
            generations: [],
            streams: [],
            nodes: [CMNode(id: "x", nodeType: "concept", name: "X Node", generation: nil, stream: nil, fields: [:], notes: nil)],
            edges: [],
            externalShocks: [],
            structuralObservations: []
        )
        let output = writeCMFile(map)
        XCTAssertTrue(output.contains("# Test"))
        XCTAssertTrue(output.contains("id:"))
        XCTAssertTrue(output.contains("X Node"))
    }
}
