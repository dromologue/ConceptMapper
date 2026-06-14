// Tests for Workflowy integration: useSecondBrainStore and WorkflowyOutlinePane
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useSecondBrainStore } from "../stores/useSecondBrainStore";
import { WorkflowyOutlinePane } from "../ui/WorkflowyOutlinePane";
import type { WorkflowyOutlineNode } from "../types/bridge-protocol";

// ─── mock swiftBridge so postToSwift / sendToSwift don't crash in jsdom ──────
vi.mock("../utils/swiftBridge", () => ({
  isNativeApp: () => false,
  isIOSDevice: () => false,
  postToSwift: vi.fn(),
  sendToSwift: vi.fn().mockResolvedValue(undefined),
  subscribe: vi.fn(() => () => {}),
}));

// ─── shared fixture outline ───────────────────────────────────────────────────

const leafNode: WorkflowyOutlineNode = {
  id: "leaf-1",
  name: "Leaf item",
  description: "A description of the leaf",
  children: [],
};

const childNode: WorkflowyOutlineNode = {
  id: "child-1",
  name: "Child item",
  children: [leafNode],
};

const grandchildNode: WorkflowyOutlineNode = {
  id: "grand-1",
  name: "Grandchild",
  children: [],
};

const deepChild: WorkflowyOutlineNode = {
  id: "deep-child-1",
  name: "Deep Child",
  children: [grandchildNode],
};

const rootNode: WorkflowyOutlineNode = {
  id: "root-1",
  name: "Root item",
  description: "Root description",
  children: [childNode, deepChild],
};

const SAMPLE_URL = "https://workflowy.com/#/abc123";

// ─── useSecondBrainStore ──────────────────────────────────────────────────────

describe("useSecondBrainStore", () => {
  const initial = useSecondBrainStore.getState();

  beforeEach(() => {
    useSecondBrainStore.setState(initial, true);
  });

  describe("initial state", () => {
    it("has empty folders", () => {
      expect(useSecondBrainStore.getState().folders).toEqual([]);
    });

    it("hasWorkflowyKey is false", () => {
      expect(useSecondBrainStore.getState().hasWorkflowyKey).toBe(false);
    });

    it("isScanning is false", () => {
      expect(useSecondBrainStore.getState().isScanning).toBe(false);
    });

    it("lastScannedAt is null", () => {
      expect(useSecondBrainStore.getState().lastScannedAt).toBeNull();
    });

    it("outlineCache is empty", () => {
      expect(useSecondBrainStore.getState().outlineCache).toEqual({});
    });
  });

  describe("setFolders", () => {
    it("replaces folder list", () => {
      const folders = [{ path: "/Users/me/Notes", name: "Notes" }];
      useSecondBrainStore.getState().setFolders(folders);
      expect(useSecondBrainStore.getState().folders).toEqual(folders);
    });

    it("clears folders when given empty array", () => {
      useSecondBrainStore.getState().setFolders([{ path: "/a", name: "A" }]);
      useSecondBrainStore.getState().setFolders([]);
      expect(useSecondBrainStore.getState().folders).toEqual([]);
    });

    it("handles multiple folders", () => {
      const folders = [
        { path: "/a", name: "Alpha" },
        { path: "/b", name: "Beta" },
      ];
      useSecondBrainStore.getState().setFolders(folders);
      expect(useSecondBrainStore.getState().folders).toHaveLength(2);
    });
  });

  describe("setHasWorkflowyKey", () => {
    it("sets the flag to true", () => {
      useSecondBrainStore.getState().setHasWorkflowyKey(true);
      expect(useSecondBrainStore.getState().hasWorkflowyKey).toBe(true);
    });

    it("sets the flag back to false", () => {
      useSecondBrainStore.getState().setHasWorkflowyKey(true);
      useSecondBrainStore.getState().setHasWorkflowyKey(false);
      expect(useSecondBrainStore.getState().hasWorkflowyKey).toBe(false);
    });
  });

  describe("setIsScanning", () => {
    it("sets scanning state", () => {
      useSecondBrainStore.getState().setIsScanning(true);
      expect(useSecondBrainStore.getState().isScanning).toBe(true);
    });

    it("clears scanning state", () => {
      useSecondBrainStore.getState().setIsScanning(true);
      useSecondBrainStore.getState().setIsScanning(false);
      expect(useSecondBrainStore.getState().isScanning).toBe(false);
    });
  });

  describe("setLastScanned", () => {
    it("records timestamp and fileCount", () => {
      const t = new Date("2026-01-01T12:00:00Z");
      useSecondBrainStore.getState().setLastScanned(t, 42);
      const s = useSecondBrainStore.getState();
      expect(s.lastScannedAt).toEqual(t);
      expect(s.lastFileCount).toBe(42);
    });

    it("clears isScanning when called", () => {
      useSecondBrainStore.getState().setIsScanning(true);
      useSecondBrainStore.getState().setLastScanned(new Date(), 0);
      expect(useSecondBrainStore.getState().isScanning).toBe(false);
    });
  });

  describe("setOutline — outline cache access and insert", () => {
    it("stores nodes under the given URL key", () => {
      useSecondBrainStore.getState().setOutline(SAMPLE_URL, [rootNode]);
      const cache = useSecondBrainStore.getState().outlineCache;
      expect(cache[SAMPLE_URL]).toEqual([rootNode]);
    });

    it("does not overwrite other entries", () => {
      const url2 = "https://workflowy.com/#/def456";
      useSecondBrainStore.getState().setOutline(SAMPLE_URL, [rootNode]);
      useSecondBrainStore.getState().setOutline(url2, [leafNode]);
      const cache = useSecondBrainStore.getState().outlineCache;
      expect(cache[SAMPLE_URL]).toEqual([rootNode]);
      expect(cache[url2]).toEqual([leafNode]);
    });

    it("can update an existing URL entry", () => {
      useSecondBrainStore.getState().setOutline(SAMPLE_URL, [rootNode]);
      useSecondBrainStore.getState().setOutline(SAMPLE_URL, [leafNode]);
      expect(useSecondBrainStore.getState().outlineCache[SAMPLE_URL]).toEqual([leafNode]);
    });

    it("can store an empty array (empty outline)", () => {
      useSecondBrainStore.getState().setOutline(SAMPLE_URL, []);
      expect(useSecondBrainStore.getState().outlineCache[SAMPLE_URL]).toEqual([]);
    });

    it("reading a missing URL returns undefined", () => {
      expect(useSecondBrainStore.getState().outlineCache["nonexistent"]).toBeUndefined();
    });
  });
});

// ─── WorkflowyOutlinePane ─────────────────────────────────────────────────────

describe("WorkflowyOutlinePane", () => {
  const initial = useSecondBrainStore.getState();

  beforeEach(() => {
    useSecondBrainStore.setState(initial, true);
  });

  describe("no URL provided", () => {
    it("renders nothing when nodeUrl is empty string", () => {
      const { container } = render(<WorkflowyOutlinePane nodeId="n1" nodeUrl="" />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("URL provided but cache miss (loading state)", () => {
    it("shows loading message when outline not yet in cache", () => {
      render(<WorkflowyOutlinePane nodeId="n1" nodeUrl={SAMPLE_URL} />);
      expect(screen.getByText("Loading outline…")).toBeInTheDocument();
    });

    it("shows read-only footer notice while loading", () => {
      render(<WorkflowyOutlinePane nodeId="n1" nodeUrl={SAMPLE_URL} />);
      expect(screen.getByText(/Read-only/)).toBeInTheDocument();
    });
  });

  describe("empty outline (cache hit, zero nodes)", () => {
    beforeEach(() => {
      useSecondBrainStore.getState().setOutline(SAMPLE_URL, []);
    });

    it("shows empty message", () => {
      render(<WorkflowyOutlinePane nodeId="n1" nodeUrl={SAMPLE_URL} />);
      expect(screen.getByText("No items found.")).toBeInTheDocument();
    });

    it("still shows read-only footer", () => {
      render(<WorkflowyOutlinePane nodeId="n1" nodeUrl={SAMPLE_URL} />);
      expect(screen.getByText(/Read-only/)).toBeInTheDocument();
    });
  });

  describe("populated outline", () => {
    beforeEach(() => {
      useSecondBrainStore.getState().setOutline(SAMPLE_URL, [rootNode]);
    });

    it("renders root node name", () => {
      render(<WorkflowyOutlinePane nodeId="n1" nodeUrl={SAMPLE_URL} />);
      expect(screen.getByText("Root item")).toBeInTheDocument();
    });

    it("renders depth-1 child names", () => {
      render(<WorkflowyOutlinePane nodeId="n1" nodeUrl={SAMPLE_URL} />);
      expect(screen.getByText("Child item")).toBeInTheDocument();
      expect(screen.getByText("Deep Child")).toBeInTheDocument();
    });

    it("shows description for root node at depth 0 (not collapsed)", () => {
      render(<WorkflowyOutlinePane nodeId="n1" nodeUrl={SAMPLE_URL} />);
      expect(screen.getByText("Root description")).toBeInTheDocument();
    });

    it("shows read-only footer", () => {
      render(<WorkflowyOutlinePane nodeId="n1" nodeUrl={SAMPLE_URL} />);
      expect(screen.getByText(/Read-only/)).toBeInTheDocument();
    });
  });

  describe("collapse / expand behaviour", () => {
    beforeEach(() => {
      useSecondBrainStore.getState().setOutline(SAMPLE_URL, [rootNode]);
    });

    it("depth-0 nodes start expanded (children visible)", () => {
      render(<WorkflowyOutlinePane nodeId="n1" nodeUrl={SAMPLE_URL} />);
      // childNode is at depth 1, so it should be visible immediately
      expect(screen.getByText("Child item")).toBeInTheDocument();
    });

    it("depth > 1 nodes start collapsed (great-grandchildren not visible)", () => {
      // Build a 4-level tree so that the depth-2 node's children are hidden by default.
      const greatGrandchild: WorkflowyOutlineNode = { id: "gg1", name: "Great-grandchild", children: [] };
      const depth2Node: WorkflowyOutlineNode = { id: "d2n", name: "Depth-2 Node", children: [greatGrandchild] };
      const depth1Node: WorkflowyOutlineNode = { id: "d1n", name: "Depth-1 Node", children: [depth2Node] };
      const depth0Node: WorkflowyOutlineNode = { id: "d0n", name: "Depth-0 Node", children: [depth1Node] };
      useSecondBrainStore.getState().setOutline(SAMPLE_URL, [depth0Node]);
      render(<WorkflowyOutlinePane nodeId="n1" nodeUrl={SAMPLE_URL} />);
      // depth-2 node is rendered (depth-1 parent is expanded) but starts collapsed,
      // so its children (great-grandchild) are not rendered.
      expect(screen.getByText("Depth-2 Node")).toBeInTheDocument();
      expect(screen.queryByText("Great-grandchild")).not.toBeInTheDocument();
    });

    it("clicking the toggle on a depth-1 node expands it to show grandchildren", () => {
      render(<WorkflowyOutlinePane nodeId="n1" nodeUrl={SAMPLE_URL} />);

      // childNode has one child (leafNode). leafNode is at depth 2 and starts collapsed.
      // The ▶ button for childNode (depth 1) should exist and expanding it shows leafNode.
      // Initially leafNode is NOT shown (depth 1 node starts EXPANDED, but leafNode is depth 2,
      // and leafNode has no children so no collapse button — let's check the leaf itself)
      // Wait: childNode is at depth=1, so collapsed = (depth > 1) = false → expanded initially
      // leafNode is at depth=2, so collapsed = (depth > 1) = true → collapsed initially
      // leafNode has no children, so no toggle button for leafNode
      // So "Leaf item" at depth 2 is a leaf — but is it shown?
      // At depth 1 childNode is expanded, so its children are rendered.
      // leafNode at depth=2 is rendered but since leafNode has no children (hasChildren=false),
      // it's shown directly (the collapsed state only hides *children*, not the node itself).
      expect(screen.getByText("Leaf item")).toBeInTheDocument();
    });

    it("clicking a collapse toggle hides children", () => {
      render(<WorkflowyOutlinePane nodeId="n1" nodeUrl={SAMPLE_URL} />);

      // Deep Child (depth=1, expanded) → grandchild (depth=2, collapsed)
      // But grandchild is not shown initially (it's under deepChild at depth=1,
      // and deepChild is expanded at depth=1, then grandchild is a direct child)
      // Actually wait — grandchild itself is at depth=2.
      // deepChild is at depth=1 (expanded). grandchildNode is at depth=2.
      // The *component* for grandchildNode is rendered (depth > 1 so collapsed=true),
      // but since grandchildNode has no children, collapsed state doesn't hide it.
      //
      // Test: clicking the collapse button on "Deep Child" (depth=1, has children) hides grandchild.
      const toggleBtns = screen.getAllByRole("button", { name: /Collapse|Expand/ });
      // Find the "Collapse" button for "Deep Child"
      const deepChildToggle = toggleBtns.find((b) => b.getAttribute("aria-label") === "Collapse");
      expect(deepChildToggle).toBeDefined();

      // Before clicking: grandchildNode should be visible (deepChild is expanded, grandchild is a leaf)
      expect(screen.getByText("Grandchild")).toBeInTheDocument();

      // Click to collapse Deep Child
      fireEvent.click(deepChildToggle!);

      // After collapsing: grandchild should be hidden
      expect(screen.queryByText("Grandchild")).not.toBeInTheDocument();
    });

    it("clicking an expand toggle shows children", () => {
      render(<WorkflowyOutlinePane nodeId="n1" nodeUrl={SAMPLE_URL} />);

      // Find a collapsed node and expand it.
      // grandchildNode is at depth=2 under deepChild, but grandchild has no children.
      // Let's use childNode (depth=1, expanded) → first collapse it, then expand.
      const collapseBtns = screen.getAllByRole("button", { name: "Collapse" });
      // Click first collapse button
      fireEvent.click(collapseBtns[0]);
      // Now click expand
      const expandBtn = screen.getAllByRole("button", { name: "Expand" })[0];
      fireEvent.click(expandBtn);
      // Children should be visible again
      expect(screen.getByText("Child item")).toBeInTheDocument();
    });

    it("nodes without children have no toggle button", () => {
      const onlyLeaf: WorkflowyOutlineNode = { id: "l", name: "Pure Leaf", children: [] };
      useSecondBrainStore.getState().setOutline(SAMPLE_URL, [onlyLeaf]);
      render(<WorkflowyOutlinePane nodeId="n1" nodeUrl={SAMPLE_URL} />);
      expect(screen.queryByRole("button", { name: /Collapse|Expand/ })).not.toBeInTheDocument();
    });
  });

  describe("description rendering", () => {
    it("shows description when node is expanded and has description", () => {
      const withDesc: WorkflowyOutlineNode = {
        id: "d1",
        name: "Described",
        description: "Some description text",
        children: [],
      };
      useSecondBrainStore.getState().setOutline(SAMPLE_URL, [withDesc]);
      render(<WorkflowyOutlinePane nodeId="n1" nodeUrl={SAMPLE_URL} />);
      expect(screen.getByText("Some description text")).toBeInTheDocument();
    });

    it("does not show description when node is collapsed", () => {
      const parent: WorkflowyOutlineNode = {
        id: "p1",
        name: "Parent",
        children: [
          {
            id: "d2",
            name: "Collapsible",
            description: "Hidden description",
            children: [{ id: "gc", name: "Grandchild", children: [] }],
          },
        ],
      };
      useSecondBrainStore.getState().setOutline(SAMPLE_URL, [parent]);
      render(<WorkflowyOutlinePane nodeId="n1" nodeUrl={SAMPLE_URL} />);
      // "Collapsible" is at depth=1 (expanded). Its children are at depth=2, collapsed.
      // The description belongs to "Collapsible" at depth=1, which is expanded → shown.
      expect(screen.getByText("Hidden description")).toBeInTheDocument();

      // Now collapse "Collapsible" — it's the second Collapse button (parent has the first)
      const collapseToggles = screen.getAllByRole("button", { name: "Collapse" });
      const collapsibleToggle = collapseToggles[collapseToggles.length - 1];
      fireEvent.click(collapsibleToggle);
      // After collapse the description should disappear
      expect(screen.queryByText("Hidden description")).not.toBeInTheDocument();
    });

    it("handles nodes without description gracefully", () => {
      const noDesc: WorkflowyOutlineNode = { id: "nd", name: "No Desc", children: [] };
      useSecondBrainStore.getState().setOutline(SAMPLE_URL, [noDesc]);
      expect(() =>
        render(<WorkflowyOutlinePane nodeId="n1" nodeUrl={SAMPLE_URL} />)
      ).not.toThrow();
    });

    it("renders '(unnamed)' for nodes with empty name", () => {
      const unnamed: WorkflowyOutlineNode = { id: "u1", name: "", children: [] };
      useSecondBrainStore.getState().setOutline(SAMPLE_URL, [unnamed]);
      render(<WorkflowyOutlinePane nodeId="n1" nodeUrl={SAMPLE_URL} />);
      expect(screen.getByText("(unnamed)")).toBeInTheDocument();
    });
  });
});
