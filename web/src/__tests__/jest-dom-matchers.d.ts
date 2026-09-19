// Bridges @testing-library/jest-dom's matcher types onto Vitest 5.
//
// jest-dom 7.0.1 ships `declare module 'vitest' { interface Assertion<T> ... }`,
// which was Vitest 4's shape. Vitest 5 widened it to `Assertion<R, T>` and moved
// third-party augmentation to the purpose-built empty `Matchers<R, T>` interface
// that `Assertion` extends. The arity mismatch means jest-dom's declaration no
// longer merges, so `toBeInTheDocument` and friends type-check as unknown even
// though they register fine at runtime via setup.ts.
//
// Delete this file once @testing-library/jest-dom augments `Matchers` itself.
// Tracked upstream: https://github.com/testing-library/jest-dom/issues
import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";

declare module "vitest" {
  // The type parameters must match Vitest's own declaration exactly or the merge
  // does not apply, which is what forces both disables below: the body is empty
  // because the supertype supplies every matcher, and `T` (the received type) is
  // unused because jest-dom types its matchers against the element, not the
  // assertion subject.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Matchers<
    R extends void | Promise<void> = void | Promise<void>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    T = unknown,
  > extends TestingLibraryMatchers<unknown, R> {}
}
