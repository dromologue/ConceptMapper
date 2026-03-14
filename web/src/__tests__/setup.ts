import "@testing-library/jest-dom";

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
