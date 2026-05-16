/**
 * Smoke test for the Vite + Vitest wiring. Confirms three things:
 *   1. The TS toolchain compiles a .tsx test file (Sprint 2 baseline).
 *   2. @testing-library/react renders a real DOM through jsdom.
 *   3. The `@/` alias from vite.config.ts is honored at test time.
 *
 * Once Sprint 3 lands real component tests, this file can be deleted —
 * but for now it is the canary that proves the toolchain still works
 * after every refactor.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

function Hello({ name }: { name: string }) {
  return <h1>Hello, {name}</h1>;
}

describe("toolchain smoke", () => {
  it("renders a TSX component through @testing-library", () => {
    render(<Hello name="Pronokif" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Hello, Pronokif");
  });
});
