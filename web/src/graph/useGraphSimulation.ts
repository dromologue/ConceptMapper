// REQ-114: D3 force-simulation lifecycle, extracted from GraphCanvas.
// Owns the simulation ref and the `applyLayoutForces` function. The tick
// handler (which reads several runtime refs and drives canvas drawing) stays
// in GraphCanvas; this hook simply hands back the simulation so the
// coordinator can attach handlers and feed it nodes/links.

import { useRef } from "react";
import * as d3 from "d3";
import type { Classifier, LayoutPreset, NodeTypeConfig, SimLink, SimNode } from "../types/graph-ir";
import { computeFlowDepths, computeFlowPositions, computeRadialTargets } from "./layout-presets";
import { getNodeTypeConfig, getConfigNodeRadius } from "../migration";
import {
  computeAxisPositions,
  computeRegionCentroids,
  computeRegionColumns,
  X_LAYOUT_START,
  X_LAYOUT_RANGE,
  Y_LAYOUT_START,
  Y_LAYOUT_RANGE,
} from "./layout/regions";

// ---- Force tuning constants ----

export const CHARGE_STRENGTH_NORMAL = -400;
export const CHARGE_STRENGTH_EXPLODED = -1500;
export const CHARGE_DISTANCE_MAX_NORMAL = 800;
export const CHARGE_DISTANCE_MAX_EXPLODED = 3000;
export const COLLISION_PADDING_NORMAL = 12;
export const COLLISION_PADDING_EXPLODED = 40;
export const LINK_DISTANCE_BASE = 120;
export const LINK_FORCE_STRENGTH = 0.2;
export const ALPHA_DECAY = 0.015;
export const ALPHA_RESTART = 0.8;
export const ALPHA_RESTART_MILD = 0.3;
export const ALPHA_DRAG_TARGET = 0.3;

export const X_AXIS_CLASSIFIER_STRENGTH = 0.3;
export const X_AXIS_CENTER_STRENGTH = 0.05;
export const Y_AXIS_CLASSIFIER_STRENGTH = 0.5;
export const Y_AXIS_CENTER_STRENGTH = 0.05;

export const FLOW_Y_STRENGTH = 0.8;
export const FLOW_X_STRENGTH = 0.5;
export const RADIAL_POSITION_STRENGTH = 0.4;
export const RADIAL_CHARGE = -350;

// Region pin caches written by applyLayoutForces and read by the GraphCanvas tick handler.
export interface RegionLayoutCaches {
  columnPositions: Map<string, number>;
  columnWidths: Map<string, number>;
  columnLeftEdges: Map<string, number>;
  centroids: Map<string, { x: number; y: number }>;
}

export function emptyRegionCaches(): RegionLayoutCaches {
  return {
    columnPositions: new Map(),
    columnWidths: new Map(),
    columnLeftEdges: new Map(),
    centroids: new Map(),
  };
}

function legacyRadius(node: SimNode): number {
  return node.node_type === "concept" ? 8 : 10;
}

function nodeRadius(node: SimNode, configs: NodeTypeConfig[]): number {
  const config = getNodeTypeConfig(configs, node.node_type);
  if (config) return getConfigNodeRadius(config, node.properties);
  return legacyRadius(node);
}

export interface ApplyForcesArgs {
  simulation: d3.Simulation<SimNode, SimLink>;
  vw: number;
  vh: number;
  classifiers: Classifier[];
  isExploded: boolean;
  preset: LayoutPreset;
  /** Live node and edge data used by flow/radial preset layouts. */
  nodes: SimNode[];
  edges: { from: string; to: string; directed: boolean }[];
  nodeTypeConfigs: NodeTypeConfig[];
  /** Extra collision padding applied when the user has scaled the font up. */
  fontCollideExtra: number;
  /** Caches written by this call and consumed by the tick handler in GraphCanvas. */
  regionCaches: RegionLayoutCaches;
}

/**
 * Apply all layout forces to a D3 simulation.
 *
 * This is the single place where classifier-driven axes, flow/radial presets,
 * charge/collide, and region pinning are configured. The function mutates
 * `simulation` in place and writes the region caches so the tick handler can
 * pin column / centroid positions.
 */
export function applyLayoutForces(args: ApplyForcesArgs): void {
  const {
    simulation, vw, vh, classifiers, isExploded, preset,
    nodes, edges, nodeTypeConfigs, fontCollideExtra, regionCaches,
  } = args;

  const xCls = classifiers.find((c) => c.layout === "x");
  const yCls = classifiers.find((c) => c.layout === "y");

  // Preset overlays (only when there's no explicit axis classifier).
  let radialTargets: Map<string, { x: number; y: number }> | null = null;
  let flowPositions: Map<string, { x: number; y: number }> | null = null;
  if (preset === "radial" && !xCls && !yCls) {
    radialTargets = computeRadialTargets(nodes, edges, vw / 2, vh / 2);
  }
  if (preset === "flow" && (!xCls || !yCls)) {
    const edgeDirected = new Map<string, boolean>();
    let hasAnyDirected = false;
    for (const e of edges) {
      edgeDirected.set(e.from + "→" + e.to, e.directed);
      if (e.directed) hasAnyDirected = true;
    }
    if (!hasAnyDirected) {
      for (const e of edges) edgeDirected.set(e.from + "→" + e.to, true);
    }
    const depths = computeFlowDepths(nodes, edges, edgeDirected);
    flowPositions = computeFlowPositions(nodes, edges, edgeDirected, depths);
  }

  // X-axis.
  if (xCls) {
    const xPos = computeAxisPositions(xCls, vw, X_LAYOUT_START, X_LAYOUT_RANGE);
    simulation.force(
      "x",
      d3
        .forceX<SimNode>((d) => {
          const val = d.classifiers?.[xCls.id];
          return val ? xPos.get(String(val)) ?? vw / 2 : vw / 2;
        })
        .strength(X_AXIS_CLASSIFIER_STRENGTH),
    );
  } else if (radialTargets) {
    simulation.force(
      "x",
      d3.forceX<SimNode>((d) => radialTargets!.get(d.id)?.x ?? vw / 2).strength(RADIAL_POSITION_STRENGTH),
    );
  } else if (flowPositions) {
    simulation.force(
      "x",
      d3.forceX<SimNode>((d) => flowPositions!.get(d.id)?.x ?? vw / 2).strength(FLOW_X_STRENGTH),
    );
  } else {
    simulation.force("x", d3.forceX<SimNode>(vw / 2).strength(X_AXIS_CENTER_STRENGTH));
  }

  // Y-axis.
  if (yCls) {
    const yPos = computeAxisPositions(yCls, vh, Y_LAYOUT_START, Y_LAYOUT_RANGE);
    simulation.force(
      "y",
      d3
        .forceY<SimNode>((d) => {
          const val = d.classifiers?.[yCls.id];
          return val ? yPos.get(String(val)) ?? vh / 2 : vh / 2;
        })
        .strength(Y_AXIS_CLASSIFIER_STRENGTH),
    );
  } else if (flowPositions) {
    simulation.force(
      "y",
      d3.forceY<SimNode>((d) => flowPositions!.get(d.id)?.y ?? vh / 2).strength(FLOW_Y_STRENGTH),
    );
  } else if (radialTargets) {
    simulation.force(
      "y",
      d3.forceY<SimNode>((d) => radialTargets!.get(d.id)?.y ?? vh / 2).strength(RADIAL_POSITION_STRENGTH),
    );
  } else {
    simulation.force("y", d3.forceY<SimNode>(vh / 2).strength(Y_AXIS_CENTER_STRENGTH));
  }

  // Charge & collide.
  const chargeStrength = isExploded
    ? CHARGE_STRENGTH_EXPLODED
    : preset === "radial" && !xCls && !yCls
      ? RADIAL_CHARGE
      : CHARGE_STRENGTH_NORMAL;
  const collideExtra = isExploded ? COLLISION_PADDING_EXPLODED : COLLISION_PADDING_NORMAL;
  simulation.force(
    "charge",
    d3
      .forceManyBody()
      .strength(chargeStrength)
      .distanceMax(isExploded ? CHARGE_DISTANCE_MAX_EXPLODED : CHARGE_DISTANCE_MAX_NORMAL),
  );
  simulation.force(
    "collide",
    d3.forceCollide<SimNode>(
      (d) => nodeRadius(d, nodeTypeConfigs) + collideExtra + Math.max(0, fontCollideExtra),
    ),
  );

  // Region / column pinning is applied in the tick handler, not via D3 forces.
  // We just compute the caches here.
  simulation.force("regionX", null);
  simulation.force("regionY", null);

  const regionCls = classifiers.find((c) => c.layout === "region" || c.layout === "region-column");
  if (regionCls) {
    if (regionCls.layout === "region-column") {
      const counts = new Map<string, number>();
      for (const n of nodes) {
        const v = n.classifiers?.[regionCls.id];
        if (v) counts.set(String(v), (counts.get(String(v)) ?? 0) + 1);
      }
      const { positions, widths, leftEdges } = computeRegionColumns(regionCls, vw, counts);
      regionCaches.columnPositions = positions;
      regionCaches.columnWidths = widths;
      regionCaches.columnLeftEdges = leftEdges;
      regionCaches.centroids = new Map();
    } else {
      regionCaches.centroids = computeRegionCentroids(regionCls, vw, vh);
      regionCaches.columnPositions = new Map();
      regionCaches.columnWidths = new Map();
      regionCaches.columnLeftEdges = new Map();
    }
  } else {
    regionCaches.columnPositions = new Map();
    regionCaches.columnWidths = new Map();
    regionCaches.columnLeftEdges = new Map();
    regionCaches.centroids = new Map();
  }
}

/**
 * Compute the "exploded" virtual-canvas factor — when REQ-088's "explode"
 * mode is on, the simulation runs on a much larger logical canvas so nodes
 * spread out before being fit-to-view.
 */
export function explodedFactor(isExploded: boolean, nodeCount: number): number {
  return isExploded ? Math.max(3, Math.ceil(Math.sqrt(nodeCount) / 3)) : 1;
}

export interface UseGraphSimulationResult {
  simRef: React.MutableRefObject<d3.Simulation<SimNode, SimLink> | null>;
  simInitializedRef: React.MutableRefObject<boolean>;
  regionCachesRef: React.MutableRefObject<RegionLayoutCaches>;
}

/**
 * Hook owning the simulation ref, its init flag, and the region-cache slot
 * that `applyLayoutForces` writes into. The simulation itself is created and
 * configured by the coordinator (so it can wire up the tick callback that
 * reads canvas refs), but the lifecycle slot lives here.
 */
export function useGraphSimulation(): UseGraphSimulationResult {
  const simRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);
  const simInitializedRef = useRef(false);
  const regionCachesRef = useRef<RegionLayoutCaches>(emptyRegionCaches());
  return { simRef, simInitializedRef, regionCachesRef };
}
