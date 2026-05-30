/**
 * Typed bridge protocol shared between the React SPA and the Swift host.
 *
 * Every JS↔Swift message rides a `BridgeEnvelope` carrying a version, kind
 * discriminator, method, and typed payload. Requests correlate to responses
 * via `id`; events are fire-and-forget; errors flow back through the same
 * channel.
 *
 * Mirror file: macos/ConceptMapper/BridgeProtocol.swift. Keep them in sync.
 */

export const BRIDGE_PROTOCOL_VERSION = 1;

export type BridgeKind = "request" | "response" | "event" | "error";

export type BridgeErrorCode =
  | "versionMismatch"
  | "unknownMethod"
  | "malformedPayload"
  | "ioFailure"
  | "userCancelled"
  | "internalError";

export interface BridgeErrorPayload {
  code: BridgeErrorCode;
  message: string;
}

// ---------------------------------------------------------------------------
// Request methods: JS → Swift, with payload type
// ---------------------------------------------------------------------------

export interface BridgeRequestMap {
  jsLog: { message: string };
  openFile: void;
  exportImage: void;
  exportMarkdown: void;
  saveToDownloads: { data: string; filename: string }; // base64 data
  saveToPath: { path: string; content: string };
  saveNewTaxonomy: { content: string; title: string };
  listTemplates: void;
  listMaps: void;
  loadMap: { path: string };
  loadTemplate: { path: string };
  saveTemplate: {
    content: string;
    title: string;
    sourceTemplate?: string;
    sourceMapPath?: string;
    silent?: boolean;
  };
  openURL: { url: string };
  attachNotesFile: { nodeId: string };
  readNotesFile: { nodeId: string; path: string };
  writeNotesFile: { path: string; content: string };
}

export type BridgeRequestMethod = keyof BridgeRequestMap;

// ---------------------------------------------------------------------------
// Event methods: Swift → JS, with payload type
// ---------------------------------------------------------------------------

export interface BridgeEventMap {
  fileLoaded: { content: string; filename: string; filePath: string | null };
  mapLoaded: {
    mapContent: string;       // base64
    templateContent: string;  // base64 (empty string if none)
    filename: string;
    filePath: string;
  };
  templatesAvailable: { templates: Array<{ name: string; path: string }> };
  templateAvailable: { content: string }; // JSON-encoded template
  mapsAvailable: { maps: Array<{ name: string; path: string }> };
  taxonomySaved: { path: string };
  showTaxonomyWizard: Record<string, never>;
  notesFileAttached: { nodeId: string; path: string; content: string };
  notesFileRead: { nodeId: string; path: string; content: string; exists: boolean };
}

export type BridgeEventMethod = keyof BridgeEventMap;

// ---------------------------------------------------------------------------
// Envelope shapes
// ---------------------------------------------------------------------------

export interface BridgeRequestEnvelope<M extends BridgeRequestMethod = BridgeRequestMethod> {
  id: string;
  version: number;
  kind: "request";
  method: M;
  payload: BridgeRequestMap[M];
}

export interface BridgeResponseEnvelope<R = unknown> {
  id: string;
  version: number;
  kind: "response";
  method: BridgeRequestMethod;
  result: R;
}

export interface BridgeEventEnvelope<M extends BridgeEventMethod = BridgeEventMethod> {
  id: null;
  version: number;
  kind: "event";
  method: M;
  payload: BridgeEventMap[M];
}

export interface BridgeErrorEnvelope {
  id: string | null;
  version: number;
  kind: "error";
  method: string;
  error: BridgeErrorPayload;
}

export type IncomingEnvelope =
  | BridgeResponseEnvelope
  | BridgeEventEnvelope
  | BridgeErrorEnvelope;
