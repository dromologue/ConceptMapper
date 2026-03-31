import "@testing-library/jest-dom";

// Provide a working localStorage for tests (Node.js/jsdom stub may be incomplete)
const store: Record<string, string> = {};
const mockStorage: Storage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = String(value); },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { for (const key of Object.keys(store)) delete store[key]; },
  get length() { return Object.keys(store).length; },
  key: (index: number) => Object.keys(store)[index] ?? null,
};
Object.defineProperty(globalThis, "localStorage", { value: mockStorage, writable: true });

// Mock canvas for jsdom (canvas not available in jsdom)
HTMLCanvasElement.prototype.getContext = (() => {
  return {
    clearRect: () => {},
    fillRect: () => {},
    fillText: () => {},
    measureText: () => ({ width: 50 }),
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    fill: () => {},
    stroke: () => {},
    closePath: () => {},
    save: () => {},
    restore: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    setLineDash: () => {},
    roundRect: () => {},
    setTransform: () => {},
  };
}) as unknown as typeof HTMLCanvasElement.prototype.getContext;

HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,mock";

