/**
 * Typed JS↔Swift bridge.
 *
 * One transport (`webkit.messageHandlers.bridge`) handles every JS→Swift
 * request; one window callback (`window.__bridge_receive`) handles every
 * Swift→JS response/event. Requests correlate to responses via a UUID. Events
 * fan out to subscribers registered via `subscribe()`. Errors reject pending
 * promises with a structured `BridgeRejection`.
 *
 * Mirror file: macos/ConceptMapper/BridgeProtocol.swift. Keep in sync.
 */

import {
  BRIDGE_PROTOCOL_VERSION,
  type BridgeErrorPayload,
  type BridgeEventMap,
  type BridgeEventMethod,
  type BridgeRequestMap,
  type BridgeRequestMethod,
  type IncomingEnvelope,
} from "../types/bridge-protocol";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export class BridgeRejection extends Error {
  readonly payload: BridgeErrorPayload;
  constructor(payload: BridgeErrorPayload) {
    super(`${payload.code}: ${payload.message}`);
    this.name = "BridgeRejection";
    this.payload = payload;
  }
}

/**
 * Send a typed request to Swift. Returns a promise that resolves on the
 * matching response or rejects with `BridgeRejection` on a matching error.
 *
 * Methods without a meaningful response (saveToPath, writeNotesFile, jsLog
 * etc.) still settle the promise once Swift acknowledges; for fire-and-forget
 * calls use `postToSwift`.
 */
export function sendToSwift<M extends BridgeRequestMethod>(
  method: M,
  payload: BridgeRequestMap[M],
): Promise<unknown> {
  const handler = getMessageHandler();
  if (!handler) {
    return Promise.reject(new BridgeRejection({
      code: "internalError",
      message: "bridge unavailable (not running inside native app)",
    }));
  }
  const id = makeRequestId();
  return new Promise<unknown>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    handler.postMessage(JSON.stringify({
      id,
      version: BRIDGE_PROTOCOL_VERSION,
      kind: "request",
      method,
      payload: payload ?? null,
    }));
  });
}

/**
 * Fire-and-forget variant. Use for one-way notifications (jsLog, autosave)
 * where the caller does not care about completion.
 */
export function postToSwift<M extends BridgeRequestMethod>(
  method: M,
  payload: BridgeRequestMap[M],
): void {
  const handler = getMessageHandler();
  if (!handler) return;
  handler.postMessage(JSON.stringify({
    id: makeRequestId(),
    version: BRIDGE_PROTOCOL_VERSION,
    kind: "request",
    method,
    payload: payload ?? null,
  }));
}

let idCounter = 0;
function makeRequestId(): string {
  // crypto.randomUUID requires a secure context; file:// URLs in WKWebView
  // don't always qualify. Fall back to a process-local counter, which is fine
  // because IDs only need to be unique within this app lifetime.
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try { return crypto.randomUUID(); } catch { /* fall through */ }
  }
  idCounter += 1;
  return `req-${idCounter}`;
}

export type EventHandler<M extends BridgeEventMethod> = (payload: BridgeEventMap[M]) => void;

/**
 * Subscribe to a Swift→JS event. Returns an unsubscribe function.
 */
export function subscribe<M extends BridgeEventMethod>(
  method: M,
  handler: EventHandler<M>,
): () => void {
  let bucket = subscribers.get(method);
  if (!bucket) {
    bucket = new Set();
    subscribers.set(method, bucket);
  }
  bucket.add(handler as EventHandler<BridgeEventMethod>);
  return () => {
    bucket?.delete(handler as EventHandler<BridgeEventMethod>);
  };
}

/**
 * Register canvas/markdown sync getters that Swift invokes via
 * `evaluateJavaScript`. They stay on the window object because Swift calls
 * them directly to get a return value; the bridge can't intermediate that.
 */
export interface SyncGetters {
  getGraphMarkdown: () => string;
  getCanvasImage: () => string;
}

export function registerSyncGetters(getters: SyncGetters): () => void {
  const win = window as unknown as Record<string, unknown>;
  win.__bridge_getGraphMarkdown = () => getters.getGraphMarkdown();
  win.__bridge_getCanvasImage = () => getters.getCanvasImage();
  return () => {
    delete win.__bridge_getGraphMarkdown;
    delete win.__bridge_getCanvasImage;
  };
}

/**
 * Install the inbound receiver. Call once during app boot. Returns an
 * uninstaller.
 */
export function installBridgeReceiver(): () => void {
  const win = window as unknown as Record<string, unknown>;
  win.__bridge_receive = (json: string) => {
    let env: IncomingEnvelope;
    try {
      env = JSON.parse(json) as IncomingEnvelope;
    } catch (err) {
      console.error("[Bridge] failed to parse envelope:", err);
      return;
    }
    if (env.version !== BRIDGE_PROTOCOL_VERSION) {
      console.error(`[Bridge] version mismatch: expected ${BRIDGE_PROTOCOL_VERSION}, got ${env.version}`);
      return;
    }
    switch (env.kind) {
      case "response": {
        const slot = pending.get(env.id);
        if (slot) {
          pending.delete(env.id);
          slot.resolve(env.result);
        }
        return;
      }
      case "error": {
        if (env.id) {
          const slot = pending.get(env.id);
          if (slot) {
            pending.delete(env.id);
            slot.reject(new BridgeRejection(env.error));
            return;
          }
        }
        console.error("[Bridge] unsolicited error:", env.error);
        return;
      }
      case "event": {
        const bucket = subscribers.get(env.method);
        if (!bucket) return;
        for (const h of bucket) {
          try {
            h(env.payload);
          } catch (err) {
            console.error(`[Bridge] subscriber for ${env.method} threw:`, err);
          }
        }
        return;
      }
    }
  };
  return () => {
    delete win.__bridge_receive;
  };
}

/** True when running inside the WKWebView host. */
export function isNativeApp(): boolean {
  return !!getMessageHandler();
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

type PendingResolver = {
  resolve: (value: unknown) => void;
  reject: (err: BridgeRejection) => void;
};

const pending = new Map<string, PendingResolver>();
const subscribers = new Map<BridgeEventMethod, Set<EventHandler<BridgeEventMethod>>>();

function getMessageHandler(): { postMessage: (msg: string) => void } | undefined {
  const webkit = (window as unknown as Record<string, unknown>).webkit as
    | { messageHandlers?: Record<string, { postMessage: (msg: string) => void }> }
    | undefined;
  return webkit?.messageHandlers?.bridge;
}
